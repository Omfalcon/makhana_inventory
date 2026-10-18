// scripts/create_first_admin.js
/**
 * Secure First Admin Provisioning Script
 * Run this from the server/CLI environment with Supabase Service Role Key.
 *
 * Usage:
 *   node scripts/create_first_admin.js <email> <password> "<Full Name>" "<Phone (optional)>"
 *
 * Example:
 *   node scripts/create_first_admin.js admin@makhanabiz.com SecurePass123! "Rajesh Kumar" "9876543210"
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../api/.env') });
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('\n❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables must be defined in your .env file.\n');
  process.exit(1);
}

const args = process.argv.slice(2);
const email = args[0];
const password = args[1];
const fullName = args[2] || 'System Administrator';
const phone = args[3] || null;

if (!email || !password) {
  console.log(`
Usage:
  node scripts/create_first_admin.js <email> <password> "<Full Name>" "<Phone>"

Example:
  node scripts/create_first_admin.js admin@makhanabiz.com Pass@123 "Rajesh Kumar" "+91 98765 43210"
  `);
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log(`\n⏳ Provisioning administrator account for: ${email}...`);

  // 1. Create auth user
  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password: password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName.trim(),
      role: 'ADMIN'
    }
  });

  if (authErr) {
    console.error('❌ Failed to create auth user:', authErr.message);
    process.exit(1);
  }

  const userId = authData.user.id;
  console.log(`✓ Auth user created with ID: ${userId}`);

  // 2. Upsert profile with ADMIN role
  const { data: profile, error: profErr } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: userId,
      full_name: fullName.trim(),
      role: 'ADMIN',
      is_active: true,
      phone: phone,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (profErr) {
    console.error('❌ Failed to create admin profile:', profErr.message);
    process.exit(1);
  }

  console.log(`\n🎉 FIRST ADMIN CREATED SUCCESSFULLY!`);
  console.log(`-----------------------------------`);
  console.log(`Name:  ${profile.full_name}`);
  console.log(`Role:  ${profile.role}`);
  console.log(`Email: ${email}`);
  console.log(`\nYou can now log in through the application UI at / or your deployed Vercel URL.\n`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
