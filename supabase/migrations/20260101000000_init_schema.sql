-- 20260101000000_init_schema.sql
-- Makhana Inventory, Sales & Delivery Management System

-- Enable pgcrypto for UUIDs if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'SALESMAN')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. PRODUCTS TABLE
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

-- 3. BUSINESS SETTINGS TABLE (Single row)
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

-- 4. ORDERS TABLE
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

-- 5. ORDER ITEMS TABLE
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

-- 6. STOCK MOVEMENTS TABLE
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

-- 7. ORDER EVENTS (AUDIT LOGS) TABLE
CREATE TABLE IF NOT EXISTS public.order_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    actor_user_id UUID REFERENCES public.profiles(id),
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. INVOICES TABLE
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

-- INDEXES FOR PERFORMANCE
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

-- Enable Supabase Realtime for orders, products, stock_movements
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_movements;
