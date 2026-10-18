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

        return res.json({ salesmen });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/create-salesman (Admin only)
router.post('/create-salesman', authenticate, requireRole('ADMIN'), async (req, res) => {
    try {
        const { fullName, email, password, phone } = req.body;

        if (!fullName || !email || !password) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Full name, email, and password are required.'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Password must be at least 6 characters.'
            });
        }

        // Create auth user securely on the server
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email.trim().toLowerCase(),
            password: password,
            email_confirm: true,
            user_metadata: {
                full_name: fullName.trim(),
                role: 'SALESMAN'
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
                phone: phone ? phone.trim() : null,
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
            salesman: profile
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
