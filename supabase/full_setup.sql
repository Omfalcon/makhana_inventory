-- ====================================================================
-- MAKHANA INVENTORY, SALES & DELIVERY MANAGEMENT SYSTEM
-- COMPLETE DATABASE SETUP SCRIPT (Tables, RPCs, RLS, Seed Data)
-- Run this in Supabase Dashboard -> SQL Editor -> "New query" -> "Run"
-- ====================================================================

-- 1. Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'SALESMAN')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    selling_price_paise BIGINT NOT NULL CHECK (selling_price_paise >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    low_stock_threshold INTEGER NOT NULL DEFAULT 10 CHECK (low_stock_threshold >= 0),
    gst_rate NUMERIC(5,2) NOT NULL DEFAULT 12.00 CHECK (gst_rate >= 0),
    hsn_code TEXT NOT NULL DEFAULT '19041090',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Business Settings Table
CREATE TABLE IF NOT EXISTS public.business_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    legal_business_name TEXT NOT NULL DEFAULT 'MAKHANA TRADERS & PROCESSORS PVT LTD',
    trade_name TEXT NOT NULL DEFAULT 'Makhana Delight',
    business_address TEXT NOT NULL DEFAULT 'Industrial Area, Phase 2, Darbhanga, Bihar - 846004',
    gstin TEXT NOT NULL DEFAULT '',
    state TEXT NOT NULL DEFAULT 'Bihar',
    state_code TEXT NOT NULL DEFAULT '10',
    phone TEXT NOT NULL DEFAULT '+91 98765 43210',
    email TEXT NOT NULL DEFAULT 'contact@makhanabiz.com',
    invoice_prefix TEXT NOT NULL DEFAULT 'MKH',
    next_invoice_number INTEGER NOT NULL DEFAULT 1001 CHECK (next_invoice_number > 0),
    default_gst_rate NUMERIC(5,2) NOT NULL DEFAULT 12.00 CHECK (default_gst_rate >= 0),
    prices_are_gst_inclusive BOOLEAN NOT NULL DEFAULT true,
    bank_name TEXT DEFAULT 'State Bank of India',
    bank_account_no TEXT DEFAULT '',
    bank_ifsc TEXT DEFAULT '',
    terms_and_conditions TEXT DEFAULT '1. Goods once sold will not be taken back without prior approval. 2. Subject to Darbhanga jurisdiction.',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES public.profiles(id)
);

-- 5. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    salesman_id UUID NOT NULL REFERENCES public.profiles(id),
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    customer_state TEXT NOT NULL DEFAULT 'Bihar',
    customer_state_code TEXT NOT NULL DEFAULT '10',
    customer_gstin TEXT,
    status TEXT NOT NULL DEFAULT 'PLACED' CHECK (status IN ('PLACED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_FAILED', 'CANCELLED')),
    subtotal_paise BIGINT NOT NULL CHECK (subtotal_paise >= 0),
    taxable_value_paise BIGINT NOT NULL CHECK (taxable_value_paise >= 0),
    total_tax_paise BIGINT NOT NULL CHECK (total_tax_paise >= 0),
    total_amount_paise BIGINT NOT NULL CHECK (total_amount_paise >= 0),
    is_gst_inclusive BOOLEAN NOT NULL DEFAULT true,
    is_inter_state BOOLEAN NOT NULL DEFAULT false,
    currency TEXT NOT NULL DEFAULT 'INR',
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    out_for_delivery_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    delivered_by UUID REFERENCES public.profiles(id),
    delivery_failed_at TIMESTAMPTZ,
    failure_reason TEXT,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    cancelled_by UUID REFERENCES public.profiles(id),
    stock_restored BOOLEAN NOT NULL DEFAULT false,
    stock_restored_at TIMESTAMPTZ,
    stock_restored_by UUID REFERENCES public.profiles(id),
    created_by UUID NOT NULL REFERENCES public.profiles(id)
);

-- 6. Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name_snapshot TEXT NOT NULL,
    sku_snapshot TEXT NOT NULL,
    hsn_code_snapshot TEXT NOT NULL DEFAULT '19041090',
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_paise BIGINT NOT NULL CHECK (unit_price_paise >= 0),
    price_basis TEXT NOT NULL DEFAULT 'INCLUSIVE' CHECK (price_basis IN ('INCLUSIVE', 'EXCLUSIVE')),
    gst_rate_snapshot NUMERIC(5,2) NOT NULL CHECK (gst_rate_snapshot >= 0),
    taxable_value_paise BIGINT NOT NULL CHECK (taxable_value_paise >= 0),
    cgst_paise BIGINT NOT NULL DEFAULT 0 CHECK (cgst_paise >= 0),
    sgst_paise BIGINT NOT NULL DEFAULT 0 CHECK (sgst_paise >= 0),
    igst_paise BIGINT NOT NULL DEFAULT 0 CHECK (igst_paise >= 0),
    line_total_paise BIGINT NOT NULL CHECK (line_total_paise >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Stock Movements Table
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('INITIAL', 'ADDITION', 'ORDER_DEDUCTION', 'ORDER_RETURN', 'CORRECTION')),
    quantity_change INTEGER NOT NULL,
    stock_before INTEGER NOT NULL CHECK (stock_before >= 0),
    stock_after INTEGER NOT NULL CHECK (stock_after >= 0),
    reference_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    actor_user_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Order Events Table
CREATE TABLE IF NOT EXISTS public.order_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    actor_user_id UUID REFERENCES public.profiles(id),
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE RESTRICT,
    invoice_number TEXT NOT NULL UNIQUE,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    business_name_snapshot TEXT NOT NULL,
    business_address_snapshot TEXT NOT NULL,
    business_gstin_snapshot TEXT NOT NULL,
    business_state_snapshot TEXT NOT NULL,
    business_state_code_snapshot TEXT NOT NULL,
    customer_name_snapshot TEXT NOT NULL,
    customer_address_snapshot TEXT NOT NULL,
    customer_phone_snapshot TEXT NOT NULL,
    customer_gstin_snapshot TEXT,
    customer_state_snapshot TEXT NOT NULL,
    customer_state_code_snapshot TEXT NOT NULL,
    is_inter_state BOOLEAN NOT NULL DEFAULT false,
    subtotal_paise BIGINT NOT NULL,
    taxable_value_paise BIGINT NOT NULL,
    cgst_paise BIGINT NOT NULL DEFAULT 0,
    sgst_paise BIGINT NOT NULL DEFAULT 0,
    igst_paise BIGINT NOT NULL DEFAULT 0,
    total_tax_paise BIGINT NOT NULL,
    total_amount_paise BIGINT NOT NULL,
    invoice_items_snapshot JSONB NOT NULL,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_salesman_id ON public.orders(salesman_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON public.order_events(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON public.invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number);

-- Realtime Publications
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_movements;


-- ====================================================================
-- ATOMIC STORED FUNCTIONS
-- ====================================================================

-- 1. place_order_atomic
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

    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Order must contain at least one item.';
    END IF;

    SELECT * INTO v_business FROM public.business_settings WHERE id = 1;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Business settings not configured.';
    END IF;

    v_is_inter_state := (COALESCE(p_customer_state_code, '') != COALESCE(v_business.state_code, '10'));
    v_order_number := 'MKH-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(gen_random_uuid()::text, 1, 6));

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

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INT)
    LOOP
        IF v_item.quantity <= 0 THEN
            RAISE EXCEPTION 'Invalid quantity % for item', v_item.quantity;
        END IF;

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

        IF v_business.prices_are_gst_inclusive THEN
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

        UPDATE public.products
        SET stock_quantity = stock_quantity - v_qty,
            updated_at = now()
        WHERE id = v_product.id;

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

    UPDATE public.orders
    SET subtotal_paise = v_subtotal_paise,
        taxable_value_paise = v_taxable_value_paise,
        total_tax_paise = v_total_tax_paise,
        total_amount_paise = v_total_amount_paise,
        updated_at = now()
    WHERE id = v_order_id;

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


-- 2. cancel_order_with_restock
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

    UPDATE public.orders
    SET status = 'CANCELLED',
        cancelled_at = now(),
        cancellation_reason = p_reason,
        cancelled_by = p_admin_id,
        updated_at = now()
    WHERE id = p_order_id;

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


-- 3. adjust_stock_atomic
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


-- 4. generate_invoice_atomic
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
    SELECT * INTO v_existing_inv FROM public.invoices WHERE order_id = p_order_id;
    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'invoice_id', v_existing_inv.id,
            'invoice_number', v_existing_inv.invoice_number,
            'already_existed', true
        );
    END IF;

    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found.';
    END IF;

    SELECT * INTO v_business FROM public.business_settings WHERE id = 1 FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Business settings not found.';
    END IF;

    IF v_business.gstin IS NULL OR trim(v_business.gstin) = '' OR v_business.gstin ILIKE '%placeholder%' THEN
        RAISE EXCEPTION 'Cannot generate official GST invoice: Business GSTIN is not configured in Business Settings.';
    END IF;

    v_inv_number := COALESCE(v_business.invoice_prefix, 'MKH') || '/' ||
                    to_char(now(), 'YY') || '-' || to_char(now() + interval '1 year', 'YY') || '/' ||
                    LPAD(v_business.next_invoice_number::text, 5, '0');

    UPDATE public.business_settings
    SET next_invoice_number = next_invoice_number + 1,
        updated_at = now()
    WHERE id = 1;

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


-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'ADMIN'
          AND is_active = true
    );
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Authenticated can view products" ON public.products;
CREATE POLICY "Authenticated can view products"
    ON public.products FOR SELECT
    TO authenticated
    USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
CREATE POLICY "Admins can insert products"
    ON public.products FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update products" ON public.products;
CREATE POLICY "Admins can update products"
    ON public.products FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Authenticated can view business settings" ON public.business_settings;
CREATE POLICY "Authenticated can view business settings"
    ON public.business_settings FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins can update business settings" ON public.business_settings;
CREATE POLICY "Admins can update business settings"
    ON public.business_settings FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can view relevant orders" ON public.orders;
CREATE POLICY "Users can view relevant orders"
    ON public.orders FOR SELECT
    TO authenticated
    USING (salesman_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Salesman and admin can update status" ON public.orders;
CREATE POLICY "Salesman and admin can update status"
    ON public.orders FOR UPDATE
    TO authenticated
    USING (salesman_id = auth.uid() OR public.is_admin())
    WITH CHECK (salesman_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users can view relevant order items" ON public.order_items;
CREATE POLICY "Users can view relevant order items"
    ON public.order_items FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_items.order_id
              AND (o.salesman_id = auth.uid() OR public.is_admin())
        )
    );

DROP POLICY IF EXISTS "Admins can view stock movements" ON public.stock_movements;
CREATE POLICY "Admins can view stock movements"
    ON public.stock_movements FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Users can view relevant order events" ON public.order_events;
CREATE POLICY "Users can view relevant order events"
    ON public.order_events FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_events.order_id
              AND (o.salesman_id = auth.uid() OR public.is_admin())
        )
    );

DROP POLICY IF EXISTS "Users can view relevant invoices" ON public.invoices;
CREATE POLICY "Users can view relevant invoices"
    ON public.invoices FOR SELECT
    TO authenticated
    USING (
        public.is_admin() OR
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = invoices.order_id
              AND o.salesman_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can manage invoices" ON public.invoices;
CREATE POLICY "Admins can manage invoices"
    ON public.invoices FOR ALL
    TO authenticated
    USING (public.is_admin());


-- ====================================================================
-- SEED DATA: BUSINESS SETTINGS & 12 MAKHANA PRODUCTS
-- ====================================================================

INSERT INTO public.business_settings (
    id, legal_business_name, trade_name, business_address,
    gstin, state, state_code, phone, email,
    invoice_prefix, next_invoice_number, default_gst_rate,
    prices_are_gst_inclusive, terms_and_conditions
) VALUES (
    1,
    'MAKHANA TRADERS & PROCESSORS PVT LTD',
    'Makhana Delight',
    'Industrial Area, Phase 2, Darbhanga, Bihar - 846004',
    '',
    'Bihar',
    '10',
    '+91 98765 43210',
    'admin@makhanabiz.com',
    'MKH',
    1001,
    12.00,
    true,
    '1. Goods once sold will not be returned without prior approval. 2. Subject to Darbhanga jurisdiction.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.products (name, sku, selling_price_paise, stock_quantity, low_stock_threshold, gst_rate, hsn_code, is_active)
VALUES
    ('RAW MAKHANA 100GM MIX GREEN', 'RM-MIX-100-GRM', 16000, 0, 15, 12.00, '19041090', true),
    ('RAW MAKHANA 100GM 5 SUTA SILVER', 'RM-5S-100-SLV', 19900, 0, 15, 12.00, '19041090', true),
    ('RAW MAKHANA 250GM 5/6 SUTA', 'RM-56-250-MIX', 50000, 0, 10, 12.00, '19041090', true),
    ('MAGIK MASALA 70GM', 'SM-MAG-70', 19000, 0, 20, 12.00, '19041090', true),
    ('CREAM AND ONION 70GM', 'SM-CON-70', 19000, 0, 20, 12.00, '19041090', true),
    ('CHEESE 70GM', 'SM-CHES-70', 19000, 0, 20, 12.00, '19041090', true),
    ('PUDINA 70GM', 'SM-PUD-70', 19000, 0, 20, 12.00, '19041090', true),
    ('PERI PERI 70GM', 'SM-PER-70', 19000, 0, 20, 12.00, '19041090', true),
    ('BLACK PEPPER 70GM', 'SM-BLA-70', 19000, 0, 20, 12.00, '19041090', true),
    ('RAW MAKHANA 1 KG - 5 SUTA', 'RM-SUT-5', 110000, 0, 10, 12.00, '19041090', true),
    ('RAW MAKHANA 1 KG - 6 SUTA', 'RM-SUT-6', 120000, 0, 10, 12.00, '19041090', true),
    ('RAW MAKHANA 1 KG - MIX', 'RM-MIX-1000', 90000, 0, 10, 12.00, '19041090', true)
ON CONFLICT (sku) DO NOTHING;

-- Link Provisioned Admin Account to Profiles
INSERT INTO public.profiles (id, full_name, role, is_active)
VALUES ('d794a303-0237-4a2d-882f-f79ea7343440', 'System Administrator', 'ADMIN', true)
ON CONFLICT (id) DO UPDATE SET role = 'ADMIN', is_active = true;

