// scripts/wipe_data.js
/**
 * Database Cleanup Script
 * Cleans all transactional / test data:
 *   - invoices
 *   - order_events
 *   - order_items
 *   - orders
 *   - stock_movements
 *   - resets next_invoice_number back to 1001 in business_settings
 *
 * PRESERVES:
 *   - auth.users (all logins)
 *   - profiles (all admins & salesmen)
 *   - products (all 12 catalogue products, prices, and existing stock quantities)
 *   - business_settings (company info, GSTIN, bank details)
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

async function wipe() {
  console.log('=====================================================');
  console.log(' Starting Database Cleanup (Preserving Users & Stock)');
  console.log('=====================================================\n');

  // 1. Delete Invoices
  console.log('1. Deleting all invoices...');
  const { error: invErr, count: invCount } = await supabase
    .from('invoices')
    .delete({ count: 'exact' })
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (invErr) throw new Error(`Invoices deletion failed: ${invErr.message}`);
  console.log(`   ✓ Invoices removed: ${invCount ?? 'done'}`);

  // 2. Delete Order Events
  console.log('2. Deleting order events...');
  const { error: evtErr, count: evtCount } = await supabase
    .from('order_events')
    .delete({ count: 'exact' })
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (evtErr) throw new Error(`Order events deletion failed: ${evtErr.message}`);
  console.log(`   ✓ Order events removed: ${evtCount ?? 'done'}`);

  // 3. Delete Order Items
  console.log('3. Deleting order items...');
  const { error: itemErr, count: itemCount } = await supabase
    .from('order_items')
    .delete({ count: 'exact' })
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (itemErr) throw new Error(`Order items deletion failed: ${itemErr.message}`);
  console.log(`   ✓ Order items removed: ${itemCount ?? 'done'}`);

  // 4. Delete Orders
  console.log('4. Deleting orders...');
  const { error: ordErr, count: ordCount } = await supabase
    .from('orders')
    .delete({ count: 'exact' })
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (ordErr) throw new Error(`Orders deletion failed: ${ordErr.message}`);
  console.log(`   ✓ Orders removed: ${ordCount ?? 'done'}`);

  // 5. Delete Stock Movements
  console.log('5. Deleting old stock movement logs...');
  const { error: stkErr, count: stkCount } = await supabase
    .from('stock_movements')
    .delete({ count: 'exact' })
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (stkErr) throw new Error(`Stock movements deletion failed: ${stkErr.message}`);
  console.log(`   ✓ Stock movements removed: ${stkCount ?? 'done'}`);

  // 6. Reset next_invoice_number in business_settings to 1001
  console.log('6. Resetting invoice counter to 1001...');
  const { error: setErr } = await supabase
    .from('business_settings')
    .update({ next_invoice_number: 1001 })
    .eq('id', 1);
  if (setErr) throw new Error(`Settings update failed: ${setErr.message}`);
  console.log('   ✓ Next invoice number reset to 1001');

  // 7. Verify preserved data
  console.log('\n--- Verifying Preserved Data ---');
  const { data: users, count: userCount } = await supabase
    .from('profiles')
    .select('id, full_name, role', { count: 'exact' });
  console.log(`✓ Profiles kept: ${userCount}`);
  if (users) console.table(users);

  const { data: products, count: prodCount } = await supabase
    .from('products')
    .select('name, sku, stock_quantity', { count: 'exact' });
  console.log(`✓ Products kept: ${prodCount}`);
  if (products) console.table(products);

  console.log('\n🎉 CLEANUP COMPLETED SUCCESSFULLY!');
}

wipe().catch((err) => {
  console.error('\n❌ Cleanup error:', err.message);
  process.exit(1);
});

