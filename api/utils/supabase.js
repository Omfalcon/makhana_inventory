// api/utils/supabase.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// Privileged Admin Client (Used exclusively on the server for admin auth, secure RPCs, etc.)
const supabaseAdmin = (supabaseUrl && supabaseServiceKey)
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : null;

// User Context Client
function getSupabaseUserClient(authHeader) {
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase client is not configured. Missing SUPABASE_URL or SUPABASE_ANON_KEY.');
    }
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        },
        global: {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
    });
}

module.exports = {
    supabaseAdmin,
    getSupabaseUserClient,
    supabaseUrl,
    supabaseServiceKey,
    supabaseAnonKey
};
