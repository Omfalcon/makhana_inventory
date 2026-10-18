// scripts/seed_initial_stock_and_demo.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function seed() {
  console.log('Seeding initial dataset...');

  // 1. Fetch Admin ID
  const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'ADMIN').limit(1);
  const adminId = admins?.[0]?.id;
  if (!adminId) {
    console.error('No admin found!');
    return;
  }

  // 2. Fetch Salesman ID
  const { data: salesmen } = await supabase.from('profiles').select('id, full_name').eq('role', 'SALESMAN').limit(1);
  const salesman = salesmen?.[0];

  // 3. Update Business Settings with valid GSTIN and details
  console.log('Updating business settings with sample valid GSTIN...');
  await supabase.from('business_settings').update({
    gstin: '10AAACM1234F1Z5',
    trade_name: 'Makhana Delight',
    legal_business_name: 'MAKHANA TRADERS & PROCESSORS PVT LTD',
    business_address: 'Industrial Area, Phase 2, Darbhanga, Bihar - 846004',
    state: 'Bihar',
    state_code: '10',
    phone: '+91 98765 43210',
    email: 'admin@makhanabiz.com',
    invoice_prefix: 'MKH',
    default_gst_rate: 12.00,
    prices_are_gst_inclusive: true,
    bank_name: 'State Bank of India',
    bank_account_no: '39485720194',
    bank_ifsc: 'SBIN0001234'
  }).eq('id', 1);

  // 4. Add initial stock for all products with 0 stock
  const { data: products } = await supabase.from('products').select('*');
  console.log(`Checking ${products.length} products for initial stock...`);

  for (const prod of products) {
    if (prod.stock_quantity === 0) {
      console.log(`Adding initial stock (100 units) to: ${prod.name}`);
      const { error } = await supabase.rpc('adjust_stock_atomic', {
        p_product_id: prod.id,
        p_quantity_change: 100,
        p_reason: 'Initial warehouse opening stock inventory count',
        p_actor_id: adminId,
        p_movement_type: 'INITIAL'
      });
      if (error) console.error(`Error adjusting stock for ${prod.name}:`, error.message);
    } else {
      console.log(`Product ${prod.name} already has ${prod.stock_quantity} units.`);
    }
  }

  // 5. Place a sample order if salesman exists and 0 orders exist
  const { data: existingOrders } = await supabase.from('orders').select('id');
  if (existingOrders.length === 0 && salesman) {
    console.log(`Placing sample order under salesman ${salesman.full_name}...`);
    const sampleItems = products.slice(0, 3).map(p => ({
      product_id: p.id,
      quantity: 5
    }));

    const { data: orderResult, error: orderErr } = await supabase.rpc('place_order_atomic', {
      p_salesman_id: salesman.id,
      p_customer_name: 'Gupta Kirana Store',
      p_customer_phone: '9835012345',
      p_customer_address: 'Main Bazaar Road, Near Tower Chowk, Darbhanga, Bihar',
      p_customer_state: 'Bihar',
      p_customer_state_code: '10',
      p_customer_gstin: '10AABCG1234A1Z1',
      p_items: sampleItems,
      p_idempotency_key: 'seed_sample_order_001'
    });

    if (orderErr) {
      console.error('Error placing sample order:', orderErr.message);
    } else {
      console.log(`✓ Sample order created: ${orderResult.order_number} for ₹${orderResult.total_amount_paise / 100}`);
      
      // Also generate invoice for this sample order
      const { data: invRes, error: invErr } = await supabase.rpc('generate_invoice_atomic', {
        p_order_id: orderResult.order_id,
        p_actor_id: adminId
      });
      if (invErr) {
        console.error('Error generating invoice:', invErr.message);
      } else {
        console.log(`✓ Sample GST invoice generated: ${invRes.invoice_number}`);
      }
    }
  }

  console.log('\n🎉 INITIAL DATASET SEEDING COMPLETE!');
}

seed().catch(console.error);
