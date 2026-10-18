-- supabase/seed.sql
-- Seed 12 initial products with initial stock 0 (Admin must input initial stock)
-- Default Business Settings (Placeholder marked clearly)

INSERT INTO public.business_settings (
    id,
    legal_business_name,
    trade_name,
    business_address,
    gstin,
    state,
    state_code,
    phone,
    email,
    invoice_prefix,
    next_invoice_number,
    default_gst_rate,
    prices_are_gst_inclusive,
    terms_and_conditions
) VALUES (
    1,
    'MAKHANA TRADERS & PROCESSORS PVT LTD',
    'Makhana Delight',
    'Industrial Area, Phase 2, Darbhanga, Bihar - 846004',
    '', -- Empty GSTIN: requires admin configuration before generating official invoices
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

-- Seed Products
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
