// scripts/remove_salesmen_data.js
/**
 * Remove All Salesmen Data Script
 * Removes:
 *   - All profiles where role = 'SALESMAN'
 *   - All corresponding auth.users accounts
 *   - Any orders, order items, events, invoices, and stock movements created by or linked to salesmen
 *
 * PRESERVES:
 *   - ADMIN profile(s) and their auth accounts
 *   - Products catalogue & current stock quantities
 *   - Business Settings
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

async function removeSalesmenData() {
  console.log('=====================================================');
  console.log(' Starting Removal of Salesmen & Their Associated Data');
  console.log('=====================================================\n');

  // 1. Find all salesmen profiles
  const { data: salesmen, error: salesErr } = await supabase
    .from('profiles')
    .select('id, full_name, role, phone')
    .eq('role', 'SALESMAN');

  if (salesErr) {
    throw new Error(`Failed to fetch salesmen profiles: ${salesErr.message}`);
  }

  if (!salesmen || salesmen.length === 0) {
    console.log('ℹ️ No salesmen profiles found in the database. Nothing to delete.');
    return;
  }

  console.log(`Found ${salesmen.length} salesman account(s) to remove:`);
  console.table(salesmen);

  const salesmanIds = salesmen.map(s => s.id);

  // 2. Find any orders linked to these salesmen
  const { data: orders, error: ordErr } = await supabase
    .from('orders')
    .select('id, order_number')
    .in('salesman_id', salesmanIds);

  if (ordErr) {
    console.warn('Warning checking orders:', ordErr.message);
  }

  const orderIds = (orders || []).map(o => o.id);

  if (orderIds.length > 0) {
    console.log(`\nFound ${orderIds.length} order(s) associated with salesmen. Cleaning up orders...`);

    // Delete invoices for these orders
    const { error: invErr } = await supabase
      .from('invoices')
      .delete()
      .in('order_id', orderIds);
    if (invErr) console.warn('Invoices deletion warning:', invErr.message);
    else console.log('   ✓ Invoices for salesmen orders deleted');

    // Delete order events
    const { error: evtErr } = await supabase
      .from('order_events')
      .delete()
      .in('order_id', orderIds);
    if (evtErr) console.warn('Order events deletion warning:', evtErr.message);
    else console.log('   ✓ Order events deleted');

    // Delete order items
    const { error: itemErr } = await supabase
      .from('order_items')
      .delete()
      .in('order_id', orderIds);
    if (itemErr) console.warn('Order items deletion warning:', itemErr.message);
    else console.log('   ✓ Order items deleted');

    // Delete stock movements linked to these orders
    const { error: smErr } = await supabase
      .from('stock_movements')
      .delete()
      .in('reference_order_id', orderIds);
    if (smErr) console.warn('Stock movements deletion warning:', smErr.message);
    else console.log('   ✓ Order stock movements deleted');

    // Delete orders
    const { error: delOrdErr } = await supabase
      .from('orders')
      .delete()
      .in('id', orderIds);
    if (delOrdErr) throw new Error(`Orders deletion failed: ${delOrdErr.message}`);
    console.log('   ✓ Orders deleted');
  }

  // 3. Clear any remaining stock movements where actor was a salesman
  await supabase
    .from('stock_movements')
    .delete()
    .in('actor_user_id', salesmanIds);

  // 4. Delete from public.profiles
  console.log('\nDeleting salesman records from public.profiles...');
  const { error: profDelErr } = await supabase
    .from('profiles')
    .delete()
    .in('id', salesmanIds);

  if (profDelErr) {
    console.warn('Warning deleting from profiles table:', profDelErr.message);
  } else {
    console.log(`   ✓ Deleted ${salesmen.length} record(s) from public.profiles`);
  }

  // 5. Delete from auth.users (Supabase Auth)
  console.log('Deleting salesman auth credentials from auth.users...');
  for (const s of salesmen) {
    const { error: authDelErr } = await supabase.auth.admin.deleteUser(s.id);
    if (authDelErr) {
      console.warn(`   ⚠️ Could not delete auth user ${s.id} (${s.full_name}):`, authDelErr.message);
    } else {
      console.log(`   ✓ Deleted auth user: ${s.full_name} (${s.id})`);
    }
  }

  // 6. Verify remaining profiles
  console.log('\n--- Remaining Profiles in Database ---');
  const { data: remainingProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, role');
  console.table(remainingProfiles);

  console.log('\n🎉 ALL SALESMAN DATA REMOVED SUCCESSFULLY!');
}

removeSalesmenData().catch(err => {
  console.error('\n❌ Error removing salesmen data:', err);
  process.exit(1);
});

