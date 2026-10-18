// api/routes/settings.js
const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { supabaseAdmin } = require('../utils/supabase');

// GET /api/settings
// Retrieve current business & GST settings
router.get('/', authenticate, async (req, res) => {
    try {
        const { data: settings, error } = await supabaseAdmin
            .from('business_settings')
            .select('*')
            .eq('id', 1)
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        return res.json({ settings });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// PUT /api/settings (Admin only)
// Update business identity, GST details, invoice numbering
router.put('/', authenticate, requireRole('ADMIN'), async (req, res) => {
    try {
        const {
            legal_business_name,
            trade_name,
            business_address,
            gstin,
            state,
            state_code,
            phone,
            email,
            invoice_prefix,
            next_invoice_number,
            default_gst_rate,
            prices_are_gst_inclusive,
            bank_name,
            bank_account_no,
            bank_ifsc,
            terms_and_conditions
        } = req.body;

        const updatePayload = {
            updated_at: new Date().toISOString(),
            updated_by: req.profile.id
        };

        if (legal_business_name !== undefined) updatePayload.legal_business_name = legal_business_name.trim();
        if (trade_name !== undefined) updatePayload.trade_name = trade_name.trim();
        if (business_address !== undefined) updatePayload.business_address = business_address.trim();
        if (gstin !== undefined) updatePayload.gstin = gstin.trim().toUpperCase();
        if (state !== undefined) updatePayload.state = state.trim();
        if (state_code !== undefined) updatePayload.state_code = state_code.trim();
        if (phone !== undefined) updatePayload.phone = phone.trim();
        if (email !== undefined) updatePayload.email = email.trim();
        if (invoice_prefix !== undefined) updatePayload.invoice_prefix = invoice_prefix.trim().toUpperCase();
        if (next_invoice_number !== undefined) updatePayload.next_invoice_number = parseInt(next_invoice_number, 10);
        if (default_gst_rate !== undefined) updatePayload.default_gst_rate = parseFloat(default_gst_rate);
        if (prices_are_gst_inclusive !== undefined) updatePayload.prices_are_gst_inclusive = Boolean(prices_are_gst_inclusive);
        if (bank_name !== undefined) updatePayload.bank_name = bank_name.trim();
        if (bank_account_no !== undefined) updatePayload.bank_account_no = bank_account_no.trim();
        if (bank_ifsc !== undefined) updatePayload.bank_ifsc = bank_ifsc.trim().toUpperCase();
        if (terms_and_conditions !== undefined) updatePayload.terms_and_conditions = terms_and_conditions.trim();

        const { data: updated, error } = await supabaseAdmin
            .from('business_settings')
            .update(updatePayload)
            .eq('id', 1)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        return res.json({
            success: true,
            message: 'Business settings updated successfully.',
            settings: updated
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
