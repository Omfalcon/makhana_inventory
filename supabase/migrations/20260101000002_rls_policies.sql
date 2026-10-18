-- 20260101000002_rls_policies.sql
-- Row Level Security (RLS) Policies for Makhana Management System

-- Helper function to check if current authenticated user is ADMIN
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

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES POLICIES
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

-- 2. PRODUCTS POLICIES
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

-- 3. BUSINESS SETTINGS POLICIES
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

-- 4. ORDERS POLICIES
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

-- 5. ORDER ITEMS POLICIES
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

-- 6. STOCK MOVEMENTS POLICIES
DROP POLICY IF EXISTS "Admins can view stock movements" ON public.stock_movements;
CREATE POLICY "Admins can view stock movements"
    ON public.stock_movements FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- 7. ORDER EVENTS POLICIES
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

-- 8. INVOICES POLICIES
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
