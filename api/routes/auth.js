// api/routes/auth.js
const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { supabaseAdmin } = require('../utils/supabase');

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
    return res.json({
        user: {
            id: req.user.id,
            email: req.user.email
        },
        profile: req.profile
    });
});

// GET /api/auth/salesmen (Admin only)
router.get('/salesmen', authenticate, requireRole('ADMIN'), async (req, res) => {
    try {
        const { data: salesmen, error } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('role', 'SALESMAN')
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        // Fetch auth users to attach their login email
        const { data: { users }, error: authErr } = await supabaseAdmin.auth.admin.listUsers();
        const userMap = new Map((users || []).map(u => [u.id, u.email]));

        const salesmenWithEmail = (salesmen || []).map(s => ({
            ...s,
            email: userMap.get(s.id) || null
        }));

        return res.json({ salesmen: salesmenWithEmail });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// PATCH /api/auth/salesman/:id/password (Admin only)
router.patch('/salesman/:id/password', authenticate, requireRole('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        if (!password || typeof password !== 'string' || password.length < 6) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Password must be at least 6 characters.'
            });
        }

        // Verify salesman exists
        const { data: profile, error: profileErr } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', id)
            .eq('role', 'SALESMAN')
            .single();

        if (profileErr || !profile) {
            return res.status(404).json({ error: 'Salesman not found.' });
        }

        // Update password in Supabase Auth
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
            password: password
        });

        if (authError) {
            return res.status(400).json({
                error: 'Failed to update password',
                message: authError.message
            });
        }

        return res.json({
            success: true,
            message: `Password for ${profile.full_name} updated successfully.`
        });
    } catch (err) {
        console.error('Error changing salesman password:', err);
        return res.status(500).json({ error: err.message });
    }
});

// PATCH /api/auth/salesman/:id (Admin only)
// Update salesman name, phone, or email
router.patch('/salesman/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const { fullName, phone, email } = req.body;

        const { data: profile, error: profileErr } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', id)
            .eq('role', 'SALESMAN')
            .single();

        if (profileErr || !profile) {
            return res.status(404).json({ error: 'Salesman not found.' });
        }

        // Clean and validate phone (10 digits)
        let cleanPhone = null;
        if (phone !== undefined && phone !== null) {
            const rawDigits = String(phone).replace(/\D/g, '');
            cleanPhone = rawDigits.length >= 10 ? rawDigits.slice(-10) : rawDigits;
        }

        // Check if phone number is already taken by another salesman
        if (cleanPhone && cleanPhone.length === 10) {
            const { data: otherSalesmen } = await supabaseAdmin
                .from('profiles')
                .select('id, full_name, phone')
                .eq('role', 'SALESMAN')
                .neq('id', id);

            const conflict = (otherSalesmen || []).find(s => {
                if (!s.phone) return false;
                const pDigits = s.phone.replace(/\D/g, '');
                return pDigits.slice(-10) === cleanPhone;
            });

            if (conflict) {
                return res.status(400).json({
                    error: `Mobile number ${cleanPhone} is already registered to ${conflict.full_name}.`
                });
            }
        }

        const profileUpdates = { updated_at: new Date().toISOString() };
        if (fullName && fullName.trim()) profileUpdates.full_name = fullName.trim();
        if (phone !== undefined) profileUpdates.phone = cleanPhone || null;

        const { data: updatedProfile, error: updateErr } = await supabaseAdmin
            .from('profiles')
            .update(profileUpdates)
            .eq('id', id)
            .select()
            .single();

        if (updateErr) {
            return res.status(400).json({ error: updateErr.message });
        }

        // Fetch auth user to compare current email
        const authUserRes = await supabaseAdmin.auth.admin.getUserById(id);
        const authUser = authUserRes?.data?.user;
        const currentAuthEmail = (authUser?.email || '').toLowerCase();

        let updatedEmail = currentAuthEmail;
        if (email && email.trim()) {
            const cleanEmail = email.trim().toLowerCase();
            // Only update Supabase Auth if email actually changed
            if (cleanEmail !== currentAuthEmail) {
                const { data: authData, error: emailError } = await supabaseAdmin.auth.admin.updateUserById(id, {
                    email: cleanEmail,
                    email_confirm: true
                });
                if (emailError) {
                    return res.status(400).json({ error: `Profile updated, but email update failed: ${emailError.message}` });
                }
                updatedEmail = authData.user.email;
            }
        }

        // Keep user_metadata in sync in Supabase Auth
        await supabaseAdmin.auth.admin.updateUserById(id, {
            user_metadata: {
                ...(authUser?.user_metadata || {}),
                full_name: profileUpdates.full_name || profile.full_name,
                phone: cleanPhone || profile.phone || '',
                role: 'SALESMAN'
            }
        }).catch(metaErr => console.warn('Could not sync user_metadata:', metaErr.message));

        return res.json({
            success: true,
            message: 'Salesman updated successfully.',
            salesman: {
                ...updatedProfile,
                email: updatedEmail || email || null
            }
        });
    } catch (err) {
        console.error('Error updating salesman:', err);
        return res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/resolve-salesman-phone (Public)
// Resolves a mobile number or email to its authentication account
router.post('/resolve-salesman-phone', async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone || typeof phone !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Phone number or email is required.'
            });
        }

        const trimmed = phone.trim();

        // 1. If an email address was passed, directly pass it through!
        if (trimmed.includes('@')) {
            return res.json({
                success: true,
                email: trimmed.toLowerCase()
            });
        }

        // 2. Otherwise process as phone number
        const digits = trimmed.replace(/\D/g, '');
        if (digits.length < 5) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid mobile number.'
            });
        }

        const last10 = digits.slice(-10);

        if (!supabaseAdmin) {
            return res.status(500).json({
                success: false,
                message: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is missing from environment variables.'
            });
        }

        // Fetch profiles - check salesmen first
        const { data: profiles, error: profileErr } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, phone, role, is_active');

        if (profileErr) {
            return res.status(500).json({ success: false, message: profileErr.message });
        }

        // Match against salesman first by last 10 digits
        let matched = (profiles || []).find(p => {
            if (!p.phone || p.role !== 'SALESMAN') return false;
            const pDigits = p.phone.replace(/\D/g, '');
            return pDigits.slice(-10) === last10 || last10.endsWith(pDigits) || pDigits.endsWith(last10);
        });

        // If not matched against salesman, check any profile
        if (!matched) {
            matched = (profiles || []).find(p => {
                if (!p.phone) return false;
                const pDigits = p.phone.replace(/\D/g, '');
                return pDigits.slice(-10) === last10 || last10.endsWith(pDigits) || pDigits.endsWith(last10);
            });
        }

        if (!matched) {
            return res.status(404).json({
                success: false,
                message: `No account registered with mobile number ending in ${last10}.`
            });
        }

        if (!matched.is_active) {
            return res.status(403).json({
                success: false,
                message: 'This account has been deactivated. Please contact your administrator.'
            });
        }

        // Fetch auth user to get login email
        const userRes = await supabaseAdmin.auth.admin.getUserById(matched.id);
        const user = userRes?.data?.user;

        if (userRes?.error || !user || !user.email) {
            return res.status(404).json({
                success: false,
                message: 'Authentication record not found for this account.'
            });
        }

        return res.json({
            success: true,
            email: user.email,
            fullName: matched.full_name,
            role: matched.role
        });
    } catch (err) {
        console.error('Error resolving phone:', err);
        return res.status(500).json({ success: false, message: err.message || 'Unable to resolve phone number.' });
    }
});

// POST /api/auth/reset-password (Admin only)
// Secure password reset utility
router.post('/reset-password', authenticate, requireRole('ADMIN'), async (req, res) => {
    try {
        const { identifier, newPassword } = req.body;

        if (!identifier || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Identifier (phone/email) and new password are required.'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters.'
            });
        }

        const trimmed = identifier.trim();
        let targetUserId = null;

        if (trimmed.includes('@')) {
            const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
            const foundUser = (users || []).find(u => u.email.toLowerCase() === trimmed.toLowerCase());
            if (foundUser) targetUserId = foundUser.id;
        } else {
            const last10 = trimmed.replace(/\D/g, '').slice(-10);
            const { data: profiles } = await supabaseAdmin.from('profiles').select('id, phone');
            const foundProfile = (profiles || []).find(p => p.phone && p.phone.replace(/\D/g, '').slice(-10) === last10);
            if (foundProfile) targetUserId = foundProfile.id;
        }

        if (!targetUserId) {
            return res.status(404).json({
                success: false,
                message: 'No registered user found for this email or phone number.'
            });
        }

        const { error: resetErr } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
            password: newPassword
        });

        if (resetErr) {
            return res.status(400).json({ success: false, message: resetErr.message });
        }

        return res.json({
            success: true,
            message: 'Password updated successfully!'
        });
    } catch (err) {
        console.error('Error in reset-password:', err);
        return res.status(500).json({ success: false, message: 'Failed to reset password. Please try again.' });
    }
});

// POST /api/auth/create-salesman (Admin only)
router.post('/create-salesman', authenticate, requireRole('ADMIN'), async (req, res) => {
    try {
        const { fullName, email, password, phone } = req.body;

        if (!fullName || !password) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Full name and password are required.'
            });
        }

        const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
        if (!cleanPhone || cleanPhone.length < 10) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'A valid 10-digit mobile phone number is required for the salesman login.'
            });
        }
        const last10 = cleanPhone.slice(-10);

        if (password.length < 6) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Password must be at least 6 characters.'
            });
        }

        // Check if phone number already belongs to another salesman
        const { data: existingSalesmen } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, phone')
            .eq('role', 'SALESMAN');

        const phoneExists = (existingSalesmen || []).some(s => {
            if (!s.phone) return false;
            const pDigits = s.phone.replace(/\D/g, '');
            return pDigits.slice(-10) === last10;
        });

        if (phoneExists) {
            return res.status(400).json({
                error: 'Duplicate Phone',
                message: 'A salesman with this mobile phone number already exists.'
            });
        }

        // Use custom email if entered, otherwise generate unique login identifier
        const loginEmail = email && email.trim()
            ? email.trim().toLowerCase()
            : `sales_${last10}@makhanabiz.com`;

        // Create auth user securely on the server
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: loginEmail,
            password: password,
            email_confirm: true,
            user_metadata: {
                full_name: fullName.trim(),
                role: 'SALESMAN',
                phone: last10
            }
        });

        if (authError) {
            return res.status(400).json({
                error: 'Failed to create user',
                message: authError.message
            });
        }

        const newUserId = authData.user.id;

        // Upsert profile record
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: newUserId,
                full_name: fullName.trim(),
                role: 'SALESMAN',
                is_active: true,
                phone: last10,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (profileError) {
            return res.status(400).json({
                error: 'Failed to create profile',
                message: profileError.message
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Salesman created successfully.',
            salesman: {
                ...profile,
                email: loginEmail
            }
        });
    } catch (err) {
        console.error('Error creating salesman:', err);
        return res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
});

// PATCH /api/auth/salesman/:id/status (Admin only)
router.patch('/salesman/:id/status', authenticate, requireRole('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        if (typeof is_active !== 'boolean') {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'is_active boolean field is required.'
            });
        }

        const { data: profile, error } = await supabaseAdmin
            .from('profiles')
            .update({
                is_active,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('role', 'SALESMAN')
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        return res.json({
            success: true,
            message: `Salesman ${is_active ? 'activated' : 'deactivated'} successfully.`,
            salesman: profile
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
