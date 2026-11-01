// scripts/apply_18_gst_exclusive.js
/**
 * Updates business settings and products to 18% GST (Exclusive / applied over base price)
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../api/.env') });
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('--- Applying 18% GST Over Base Price (Exclusive) ---');

  // 1. Update business_settings
  const { data: setRes, error: setErr } = await supabase
    .from('business_settings')
    .update({
      default_gst_rate: 18.00,
      prices_are_gst_inclusive: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', 1)
    .select();

  if (setErr) throw setErr;
  console.log('✓ Business settings updated: default_gst_rate = 18.00, prices_are_gst_inclusive = false');
  console.log(setRes[0]);

  // 2. Update all products to 18.00% GST
  const { data: prodRes, error: prodErr } = await supabase
    .from('products')
    .update({
      gst_rate: 18.00,
      updated_at: new Date().toISOString()
    })
    .neq('id', '00000000-0000-0000-0000-000000000000')
    .select('id, name, sku, gst_rate, selling_price_paise');

  if (prodErr) throw prodErr;
  console.log(`✓ Updated ${prodRes.length} products to 18.00% GST:`);
  console.table(prodRes.map(p => ({
    name: p.name,
    sku: p.sku,
    base_price_inr: (p.selling_price_paise / 100).toFixed(2),
    gst_rate: p.gst_rate + '%',
    gst_amount_inr: ((p.selling_price_paise * 0.18) / 100).toFixed(2),
    total_with_18_gst_inr: ((p.selling_price_paise * 1.18) / 100).toFixed(2)
  })));

  console.log('\n🎉 18% GST APPLIED OVER BASE PRICE SUCCESSFULLY!');
}

main().catch(err => {
  console.error('❌ Error updating database:', err);
  process.exit(1);
});

