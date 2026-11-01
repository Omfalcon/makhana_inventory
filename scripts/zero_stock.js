// scripts/zero_stock.js
/**
 * Zero Stock Quantities Script
 * Sets stock_quantity = 0 for all products in the catalogue.
 * Cleans stock_movements so the audit history aligns with zero stock.
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

async function zeroStock() {
  console.log('=====================================================');
  console.log(' Setting Available Stock Quantities to 0');
  console.log('=====================================================\n');

  // 1. Fetch current products
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, name, sku, stock_quantity');

  if (prodErr) {
    throw new Error(`Failed to fetch products: ${prodErr.message}`);
  }

  console.log(`Found ${products.length} products. Resetting stock quantities to 0...`);

  // 2. Update all products to stock_quantity = 0
  const { error: updateErr } = await supabase
    .from('products')
    .update({ stock_quantity: 0, updated_at: new Date().toISOString() })
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (updateErr) {
    throw new Error(`Failed to update products: ${updateErr.message}`);
  }

  // 3. Clear stock movements history
  console.log('Clearing old stock movement records...');
  await supabase
    .from('stock_movements')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  // 4. Verify updated products
  const { data: updatedProducts } = await supabase
    .from('products')
    .select('name, sku, stock_quantity')
    .order('name');

  console.log('\n--- Updated Products in Database ---');
  console.table(updatedProducts);

  console.log('\n🎉 ALL PRODUCT STOCK QUANTITIES SET TO 0 SUCCESSFULLY!');
}

zeroStock().catch(err => {
  console.error('\n❌ Error resetting stock:', err);
  process.exit(1);
});

