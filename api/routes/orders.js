// api/routes/orders.js
const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { supabaseAdmin } = require('../utils/supabase');

// POST /api/orders/place
// Atomically places an order and deducts inventory
router.post('/place', authenticate, async (req, res) => {
    try {
        const {
            customerName,
            customerPhone,
            customerAddress,
            customerState = 'Bihar',
            customerStateCode = '10',
            customerGstin = null,
            items,
            idempotencyKey
        } = req.body;

        // Validation
        if (!customerName || !customerPhone || !customerAddress) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Customer name, phone number, and delivery address are required.'
            });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Order must contain at least one item.'
            });
        }

        // Clean items payload for database RPC
        const sanitizedItems = items.map(item => ({
            product_id: item.productId || item.product_id,
            quantity: parseInt(item.quantity, 10)
        }));

        for (const itm of sanitizedItems) {
            if (!itm.product_id || isNaN(itm.quantity) || itm.quantity <= 0) {
                return res.status(400).json({
                    error: 'Bad Request',
                    message: 'Each item must have a valid product ID and a positive quantity.'
                });
            }
        }

        // Execute atomic stored procedure
        const { data, error } = await supabaseAdmin.rpc('place_order_atomic', {
            p_salesman_id: req.profile.id, // Never trust frontend salesman ID!
            p_customer_name: customerName.trim(),
            p_customer_phone: customerPhone.trim(),
            p_customer_address: customerAddress.trim(),
            p_customer_state: customerState.trim(),
            p_customer_state_code: customerStateCode.trim(),
            p_customer_gstin: customerGstin ? customerGstin.trim().toUpperCase() : null,
            p_items: sanitizedItems,
            p_idempotency_key: idempotencyKey || null
        });

        if (error) {
            console.error('Order placement RPC error:', error);
            return res.status(400).json({
                error: 'Order Placement Failed',
                message: error.message
            });
        }

        return res.status(201).json({
            success: true,
            order: data
        });
    } catch (err) {
        console.error('Unexpected error placing order:', err);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: err.message
        });
    }
});

// GET /api/orders
// Returns orders list based on caller's role and filters
router.get('/', authenticate, async (req, res) => {
    try {
        const { status, salesmanId, startDate, endDate, search, limit = 100 } = req.query;

        let query = supabaseAdmin
            .from('orders')
            .select(`
                *,
                salesman:profiles!orders_salesman_id_fkey(id, full_name, phone),
                items:order_items(id, product_name_snapshot, sku_snapshot, quantity, unit_price_paise, line_total_paise)
            `)
            .order('created_at', { ascending: false })
            .limit(parseInt(limit, 10));

        // Salesman can only see their own orders!
        if (req.profile.role === 'SALESMAN') {
            query = query.eq('salesman_id', req.profile.id);
        } else if (salesmanId) {
            query = query.eq('salesman_id', salesmanId);
        }

        if (status) {
            query = query.eq('status', status);
        }

        if (startDate) {
            query = query.gte('created_at', new Date(startDate).toISOString());
        }

        if (endDate) {
            query = query.lte('created_at', new Date(endDate).toISOString());
        }

        if (search) {
            query = query.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`);
        }

        const { data: orders, error } = await query;

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        return res.json({ orders });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// GET /api/orders/:id
// Returns single order details
router.get('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const { data: order, error } = await supabaseAdmin
            .from('orders')
            .select(`
                *,
                salesman:profiles!orders_salesman_id_fkey(id, full_name, phone),
                items:order_items(*),
                events:order_events(*, actor:profiles(id, full_name)),
                invoice:invoices(*)
            `)
            .eq('id', id)
            .single();

        if (error || !order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Salesman isolation check
        if (req.profile.role === 'SALESMAN' && order.salesman_id !== req.profile.id) {
            return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this order.' });
        }

        return res.json({ order });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// PATCH /api/orders/:id/status
// Salesman and Admin delivery status transitions
router.patch('/:id/status', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { newStatus, failureReason } = req.body;

        const validStatuses = ['PLACED', 'DELIVERED', 'CANCELLED'];
        if (!validStatuses.includes(newStatus)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: `Invalid status. Allowed transitions: ${validStatuses.join(', ')}`
            });
        }

        // Fetch current order
        const { data: order, error: fetchErr } = await supabaseAdmin
            .from('orders')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchErr || !order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Salesman can only update their own orders
        if (req.profile.role === 'SALESMAN' && order.salesman_id !== req.profile.id) {
            return res.status(403).json({ error: 'Forbidden', message: 'You can only update your own orders.' });
        }

        // Prevent modification of cancelled orders
        if (order.status === 'CANCELLED') {
            return res.status(400).json({
                error: 'Invalid Action',
                message: 'Cancelled orders cannot change status.'
            });
        }

        const updatePayload = {
            status: newStatus,
            updated_at: new Date().toISOString()
        };

        if (newStatus === 'DELIVERED') {
            updatePayload.delivered_at = new Date().toISOString();
            updatePayload.delivered_by = req.profile.id;
        }

        const { data: updatedOrder, error: updateErr } = await supabaseAdmin
            .from('orders')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single();

        if (updateErr) {
            return res.status(400).json({ error: updateErr.message });
        }

        // Record order event audit log
        await supabaseAdmin.from('order_events').insert({
            order_id: id,
            previous_status: order.status,
            new_status: newStatus,
            actor_user_id: req.profile.id,
            reason: failureReason || `Status updated to ${newStatus}`
        });

        return res.json({
            success: true,
            order: updatedOrder
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// POST /api/orders/:id/cancel (Admin only)
// Safely cancels order and optionally restores inventory atomically
router.post('/:id/cancel', authenticate, requireRole('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, restock = true } = req.body;

        if (!reason || !reason.trim()) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'A cancellation reason is required.'
            });
        }

        const { data, error } = await supabaseAdmin.rpc('cancel_order_with_restock', {
            p_order_id: id,
            p_admin_id: req.profile.id,
            p_reason: reason.trim(),
            p_restock: Boolean(restock)
        });

        if (error) {
            return res.status(400).json({
                error: 'Cancellation Failed',
                message: error.message
            });
        }

        return res.json({
            success: true,
            message: 'Order cancelled successfully.',
            result: data
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
