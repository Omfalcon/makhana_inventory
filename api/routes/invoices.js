// api/routes/invoices.js
const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { supabaseAdmin } = require('../utils/supabase');

// POST /api/invoices/generate/:orderId (Admin only)
// Generate an immutable sequential GST invoice snapshot
router.post('/generate/:orderId', authenticate, requireRole('ADMIN'), async (req, res) => {
    try {
        const { orderId } = req.params;

        const { data, error } = await supabaseAdmin.rpc('generate_invoice_atomic', {
            p_order_id: orderId,
            p_actor_id: req.profile.id
        });

        if (error) {
            return res.status(400).json({
                error: 'Invoice Generation Failed',
                message: error.message
            });
        }

        // Fetch full invoice record
        const { data: invoice, error: fetchErr } = await supabaseAdmin
            .from('invoices')
            .select('*')
            .eq('id', data.invoice_id)
            .single();

        if (fetchErr) {
            return res.status(400).json({ error: fetchErr.message });
        }

        return res.status(201).json({
            success: true,
            message: data.already_existed ? 'Invoice retrieved.' : 'GST Invoice generated successfully.',
            invoice
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// GET /api/invoices/:orderId
// Retrieve immutable invoice for an order
router.get('/:orderId', authenticate, async (req, res) => {
    try {
        const { orderId } = req.params;

        // Fetch order to check authorization
        const { data: order, error: orderErr } = await supabaseAdmin
            .from('orders')
            .select('id, salesman_id')
            .eq('id', orderId)
            .single();

        if (orderErr || !order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (req.profile.role === 'SALESMAN' && order.salesman_id !== req.profile.id) {
            return res.status(403).json({ error: 'Forbidden', message: 'You cannot view this invoice.' });
        }

        const { data: invoice, error: invErr } = await supabaseAdmin
            .from('invoices')
            .select('*')
            .eq('order_id', orderId)
            .single();

        if (invErr || !invoice) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Invoice has not been generated for this order yet.'
            });
        }

        return res.json({ invoice });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// GET /api/invoices
// List invoices (Admin only)
router.get('/', authenticate, requireRole('ADMIN'), async (req, res) => {
    try {
        const { limit = 50 } = req.query;

        const { data: invoices, error } = await supabaseAdmin
            .from('invoices')
            .select('*, order:orders(order_number, status, customer_name)')
            .order('created_at', { ascending: false })
            .limit(parseInt(limit, 10));

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        return res.json({ invoices });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
