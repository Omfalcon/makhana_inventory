// scripts/test_db_and_setup.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function test() {
  console.log('Testing Supabase connection...');
  // Check profiles table
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  if (error) {
    console.log('Profiles table status:', error.message);
  } else {
    console.log('Profiles table exists! Records count:', data.length);
  }
}

test();
