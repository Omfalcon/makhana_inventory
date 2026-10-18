-- 20260101000001_atomic_order_rpc.sql
-- Atomic stored functions for Makhana Management System

-- 1. ATOMIC ORDER PLACEMENT
CREATE OR REPLACE FUNCTION public.place_order_atomic(
    p_salesman_id UUID,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_customer_address TEXT,
    p_customer_state TEXT DEFAULT 'Bihar',
    p_customer_state_code TEXT DEFAULT '10',
    p_customer_gstin TEXT DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::jsonb,
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_order_number TEXT;
    v_business RECORD;
    v_item RECORD;
    v_product RECORD;
    v_is_inter_state BOOLEAN;
    v_subtotal_paise BIGINT := 0;
    v_taxable_value_paise BIGINT := 0;
    v_total_tax_paise BIGINT := 0;
    v_total_amount_paise BIGINT := 0;
    v_item_taxable BIGINT;
    v_item_cgst BIGINT;
    v_item_sgst BIGINT;
    v_item_igst BIGINT;
    v_item_line_total BIGINT;
    v_unit_price BIGINT;
    v_qty INT;
    v_rate NUMERIC(5,2);
    v_existing_order_id UUID;
    v_result JSONB;
BEGIN
    -- Check Idempotency
    IF p_idempotency_key IS NOT NULL AND p_idempotency_key != '' THEN
        SELECT id INTO v_existing_order_id FROM public.orders WHERE idempotency_key = p_idempotency_key;
        IF v_existing_order_id IS NOT NULL THEN
            SELECT jsonb_build_object(
                'success', true,
                'order_id', v_existing_order_id,
                'order_number', order_number,
                'is_idempotent_replay', true,
                'total_amount_paise', total_amount_paise
            ) INTO v_result FROM public.orders WHERE id = v_existing_order_id;
            RETURN v_result;
        END IF;
    END IF;

    -- Validate items list
    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Order must contain at least one item.';
    END IF;

    -- Fetch Business Settings
    SELECT * INTO v_business FROM public.business_settings WHERE id = 1;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Business settings not configured.';
    END IF;

    -- Determine Inter-State vs Intra-State
    v_is_inter_state := (COALESCE(p_customer_state_code, '') != COALESCE(v_business.state_code, '10'));

    -- Generate unique order number (e.g. MKH-YYYYMMDD-XXXX)
    v_order_number := 'MKH-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(gen_random_uuid()::text, 1, 6));

    -- Insert order placeholder with 0 totals first to get order_id
    INSERT INTO public.orders (
        order_number, salesman_id, customer_name, customer_phone,
        customer_address, customer_state, customer_state_code, customer_gstin,
        status, subtotal_paise, taxable_value_paise, total_tax_paise, total_amount_paise,
        is_gst_inclusive, is_inter_state, currency, idempotency_key, created_by
    ) VALUES (
        v_order_number, p_salesman_id, p_customer_name, p_customer_phone,
        p_customer_address, COALESCE(p_customer_state, v_business.state),
        COALESCE(p_customer_state_code, v_business.state_code), p_customer_gstin,
        'PLACED', 0, 0, 0, 0,
        v_business.prices_are_gst_inclusive, v_is_inter_state, 'INR', p_idempotency_key, p_salesman_id
    ) RETURNING id INTO v_order_id;

    -- Process each item with row-level lock on products
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INT)
    LOOP
        IF v_item.quantity <= 0 THEN
            RAISE EXCEPTION 'Invalid quantity % for item', v_item.quantity;
        END IF;

        -- Lock product row FOR UPDATE to prevent race conditions
        SELECT * INTO v_product FROM public.products WHERE id = v_item.product_id FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product with ID % does not exist.', v_item.product_id;
        END IF;

        IF NOT v_product.is_active THEN
            RAISE EXCEPTION 'Product "%" is inactive and cannot be ordered.', v_product.name;
        END IF;

        IF v_product.stock_quantity < v_item.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for "%". Requested: %, Available: %',
                v_product.name, v_item.quantity, v_product.stock_quantity;
        END IF;

        v_unit_price := v_product.selling_price_paise;
        v_qty := v_item.quantity;
        v_rate := v_product.gst_rate;

        -- Calculate taxes based on inclusive or exclusive configuration
        IF v_business.prices_are_gst_inclusive THEN
            -- Unit price includes GST: Taxable = (Price * 100) / (100 + Rate)
            v_item_line_total := v_unit_price * v_qty;
            v_item_taxable := ROUND((v_item_line_total * 10000.0) / (10000.0 + (v_rate * 100.0)));
            IF v_is_inter_state THEN
                v_item_igst := v_item_line_total - v_item_taxable;
                v_item_cgst := 0;
                v_item_sgst := 0;
            ELSE
                v_item_igst := 0;
                v_item_cgst := (v_item_line_total - v_item_taxable) / 2;
                v_item_sgst := (v_item_line_total - v_item_taxable) - v_item_cgst;
            END IF;
        ELSE
            -- Unit price excludes GST: Taxable = Price * Qty, Tax = Taxable * Rate / 100
            v_item_taxable := v_unit_price * v_qty;
            IF v_is_inter_state THEN
                v_item_igst := ROUND((v_item_taxable * v_rate) / 100.0);
                v_item_cgst := 0;
                v_item_sgst := 0;
                v_item_line_total := v_item_taxable + v_item_igst;
            ELSE
                v_item_igst := 0;
                v_item_cgst := ROUND((v_item_taxable * (v_rate / 2.0)) / 100.0);
                v_item_sgst := ROUND((v_item_taxable * (v_rate / 2.0)) / 100.0);
                v_item_line_total := v_item_taxable + v_item_cgst + v_item_sgst;
            END IF;
        END IF;

        v_subtotal_paise := v_subtotal_paise + (v_unit_price * v_qty);
        v_taxable_value_paise := v_taxable_value_paise + v_item_taxable;
        v_total_tax_paise := v_total_tax_paise + (v_item_cgst + v_item_sgst + v_item_igst);
        v_total_amount_paise := v_total_amount_paise + v_item_line_total;

        -- Insert order item snapshot
        INSERT INTO public.order_items (
            order_id, product_id, product_name_snapshot, sku_snapshot, hsn_code_snapshot,
            quantity, unit_price_paise, price_basis, gst_rate_snapshot,
            taxable_value_paise, cgst_paise, sgst_paise, igst_paise, line_total_paise
        ) VALUES (
            v_order_id, v_product.id, v_product.name, v_product.sku, v_product.hsn_code,
            v_qty, v_unit_price,
            CASE WHEN v_business.prices_are_gst_inclusive THEN 'INCLUSIVE' ELSE 'EXCLUSIVE' END,
            v_rate, v_item_taxable, v_item_cgst, v_item_sgst, v_item_igst, v_item_line_total
        );

        -- Atomic stock deduction
        UPDATE public.products
        SET stock_quantity = stock_quantity - v_qty,
            updated_at = now()
        WHERE id = v_product.id;

        -- Record stock movement
        INSERT INTO public.stock_movements (
            product_id, movement_type, quantity_change,
            stock_before, stock_after, reference_order_id,
            reason, actor_user_id
        ) VALUES (
            v_product.id, 'ORDER_DEDUCTION', -v_qty,
            v_product.stock_quantity, v_product.stock_quantity - v_qty,
            v_order_id, 'Deducted for order ' || v_order_number, p_salesman_id
        );
    END LOOP;

    -- Update order with accurate totals
    UPDATE public.orders
    SET subtotal_paise = v_subtotal_paise,
        taxable_value_paise = v_taxable_value_paise,
        total_tax_paise = v_total_tax_paise,
        total_amount_paise = v_total_amount_paise,
        updated_at = now()
    WHERE id = v_order_id;

    -- Record initial order event
    INSERT INTO public.order_events (
        order_id, previous_status, new_status, actor_user_id, reason
    ) VALUES (
        v_order_id, NULL, 'PLACED', p_salesman_id, 'Order successfully placed'
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'order_number', v_order_number,
        'total_amount_paise', v_total_amount_paise,
        'status', 'PLACED'
    );
END;
$$;


-- 2. ATOMIC ORDER CANCELLATION & RESTOCK
CREATE OR REPLACE FUNCTION public.cancel_order_with_restock(
    p_order_id UUID,
    p_admin_id UUID,
    p_reason TEXT,
    p_restock BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_prod_stock INT;
BEGIN
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found.';
    END IF;

    IF v_order.status = 'CANCELLED' THEN
        RAISE EXCEPTION 'Order is already cancelled.';
    END IF;

    IF v_order.status = 'DELIVERED' THEN
        RAISE EXCEPTION 'Delivered orders cannot be cancelled directly without return processing.';
    END IF;

    -- Handle restock if requested and not yet restored
    IF p_restock AND NOT v_order.stock_restored THEN
        FOR v_item IN SELECT * FROM public.order_items WHERE order_id = p_order_id
        LOOP
            IF v_item.product_id IS NOT NULL THEN
                SELECT stock_quantity INTO v_prod_stock FROM public.products WHERE id = v_item.product_id FOR UPDATE;
                IF FOUND THEN
                    UPDATE public.products
                    SET stock_quantity = stock_quantity + v_item.quantity,
                        updated_at = now()
                    WHERE id = v_item.product_id;

                    INSERT INTO public.stock_movements (
                        product_id, movement_type, quantity_change,
                        stock_before, stock_after, reference_order_id,
                        reason, actor_user_id
                    ) VALUES (
                        v_item.product_id, 'ORDER_RETURN', v_item.quantity,
                        v_prod_stock, v_prod_stock + v_item.quantity,
                        p_order_id, 'Restocked from cancelled order ' || v_order.order_number || ': ' || p_reason,
                        p_admin_id
                    );
                END IF;
            END IF;
        END LOOP;

        UPDATE public.orders
        SET stock_restored = true,
            stock_restored_at = now(),
            stock_restored_by = p_admin_id
        WHERE id = p_order_id;
    END IF;

    -- Update order status
    UPDATE public.orders
    SET status = 'CANCELLED',
        cancelled_at = now(),
        cancellation_reason = p_reason,
        cancelled_by = p_admin_id,
        updated_at = now()
    WHERE id = p_order_id;

    -- Record event
    INSERT INTO public.order_events (
        order_id, previous_status, new_status, actor_user_id, reason
    ) VALUES (
        p_order_id, v_order.status, 'CANCELLED', p_admin_id, p_reason
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'status', 'CANCELLED',
        'stock_restored', p_restock
    );
END;
$$;


-- 3. ATOMIC STOCK ADJUSTMENT (Additions / Corrections)
CREATE OR REPLACE FUNCTION public.adjust_stock_atomic(
    p_product_id UUID,
    p_quantity_change INTEGER,
    p_reason TEXT,
    p_actor_id UUID,
    p_movement_type TEXT DEFAULT 'CORRECTION'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_prod RECORD;
    v_new_stock INT;
BEGIN
    IF p_quantity_change = 0 THEN
        RAISE EXCEPTION 'Quantity change cannot be zero.';
    END IF;

    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RAISE EXCEPTION 'A valid reason is required for stock adjustment.';
    END IF;

    SELECT * INTO v_prod FROM public.products WHERE id = p_product_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found.';
    END IF;

    v_new_stock := v_prod.stock_quantity + p_quantity_change;
    IF v_new_stock < 0 THEN
        RAISE EXCEPTION 'Stock cannot become negative. Current: %, Change: %', v_prod.stock_quantity, p_quantity_change;
    END IF;

    UPDATE public.products
    SET stock_quantity = v_new_stock,
        updated_at = now()
    WHERE id = p_product_id;

    INSERT INTO public.stock_movements (
        product_id, movement_type, quantity_change,
        stock_before, stock_after, reason, actor_user_id
    ) VALUES (
        p_product_id, p_movement_type, p_quantity_change,
        v_prod.stock_quantity, v_new_stock, p_reason, p_actor_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'product_id', p_product_id,
        'stock_before', v_prod.stock_quantity,
        'stock_after', v_new_stock
    );
END;
$$;


-- 4. ATOMIC GST INVOICE GENERATOR
CREATE OR REPLACE FUNCTION public.generate_invoice_atomic(
    p_order_id UUID,
    p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_business RECORD;
    v_existing_inv RECORD;
    v_inv_number TEXT;
    v_items_json JSONB;
    v_inv_id UUID;
BEGIN
    -- Check if invoice already exists
    SELECT * INTO v_existing_inv FROM public.invoices WHERE order_id = p_order_id;
    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'invoice_id', v_existing_inv.id,
            'invoice_number', v_existing_inv.invoice_number,
            'already_existed', true
        );
    END IF;

    -- Fetch order
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found.';
    END IF;

    -- Fetch business settings
    SELECT * INTO v_business FROM public.business_settings WHERE id = 1 FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Business settings not found.';
    END IF;

    -- Check mandatory GST configuration: business GSTIN must be configured
    IF v_business.gstin IS NULL OR trim(v_business.gstin) = '' OR v_business.gstin ILIKE '%placeholder%' THEN
        RAISE EXCEPTION 'Cannot generate official GST invoice: Business GSTIN is not configured in Business Settings.';
    END IF;

    -- Generate sequential invoice number atomically
    v_inv_number := COALESCE(v_business.invoice_prefix, 'MKH') || '/' ||
                    to_char(now(), 'YY') || '-' || to_char(now() + interval '1 year', 'YY') || '/' ||
                    LPAD(v_business.next_invoice_number::text, 5, '0');

    -- Increment next_invoice_number
    UPDATE public.business_settings
    SET next_invoice_number = next_invoice_number + 1,
        updated_at = now()
    WHERE id = 1;

    -- Collect items snapshot
    SELECT jsonb_agg(
        jsonb_build_object(
            'product_name', product_name_snapshot,
            'sku', sku_snapshot,
            'hsn_code', hsn_code_snapshot,
            'quantity', quantity,
            'unit_price_paise', unit_price_paise,
            'price_basis', price_basis,
            'gst_rate', gst_rate_snapshot,
            'taxable_value_paise', taxable_value_paise,
            'cgst_paise', cgst_paise,
            'sgst_paise', sgst_paise,
            'igst_paise', igst_paise,
            'line_total_paise', line_total_paise
        )
    ) INTO v_items_json FROM public.order_items WHERE order_id = p_order_id;

    -- Insert immutable invoice snapshot
    INSERT INTO public.invoices (
        order_id, invoice_number, invoice_date,
        business_name_snapshot, business_address_snapshot, business_gstin_snapshot,
        business_state_snapshot, business_state_code_snapshot,
        customer_name_snapshot, customer_address_snapshot, customer_phone_snapshot,
        customer_gstin_snapshot, customer_state_snapshot, customer_state_code_snapshot,
        is_inter_state, subtotal_paise, taxable_value_paise,
        cgst_paise, sgst_paise, igst_paise, total_tax_paise, total_amount_paise,
        invoice_items_snapshot, created_by
    ) VALUES (
        p_order_id, v_inv_number, CURRENT_DATE,
        v_business.legal_business_name, v_business.business_address, v_business.gstin,
        v_business.state, v_business.state_code,
        v_order.customer_name, v_order.customer_address, v_order.customer_phone,
        v_order.customer_gstin, v_order.customer_state, v_order.customer_state_code,
        v_order.is_inter_state, v_order.subtotal_paise, v_order.taxable_value_paise,
        (SELECT COALESCE(SUM(cgst_paise), 0) FROM public.order_items WHERE order_id = p_order_id),
        (SELECT COALESCE(SUM(sgst_paise), 0) FROM public.order_items WHERE order_id = p_order_id),
        (SELECT COALESCE(SUM(igst_paise), 0) FROM public.order_items WHERE order_id = p_order_id),
        v_order.total_tax_paise, v_order.total_amount_paise,
        COALESCE(v_items_json, '[]'::jsonb), p_actor_id
    ) RETURNING id INTO v_inv_id;

    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', v_inv_id,
        'invoice_number', v_inv_number,
        'already_existed', false
    );
END;
$$;
