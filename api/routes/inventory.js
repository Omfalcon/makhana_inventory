// api/routes/inventory.js
const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { supabaseAdmin } = require('../utils/supabase');

// GET /api/inventory/products
// Returns products: active products for salesman; all products for admin
router.get('/products', authenticate, async (req, res) => {
    try {
        let query = supabaseAdmin
            .from('products')
            .select('*')
            .order('name', { ascending: true });

        if (req.profile.role !== 'ADMIN') {
            query = query.eq('is_active', true);
        }

        const { data: products, error } = await query;
        if (error) {
            return res.status(400).json({ error: error.message });
        }

        return res.json({ products });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// POST /api/inventory/adjust (Admin only)
// Add or correct stock with mandatory reason and movement audit
router.post('/adjust', authenticate, requireRole('ADMIN'), async (req, res) => {
    try {
        const { productId, quantityChange, reason, movementType = 'CORRECTION' } = req.body;

        const qtyChange = parseInt(quantityChange, 10);
        if (isNaN(qtyChange) || qtyChange === 0) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Quantity change must be a non-zero integer.'
            });
        }

        if (!reason || !reason.trim()) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'A detailed reason is required for any stock adjustment.'
            });
        }

        const { data, error } = await supabaseAdmin.rpc('adjust_stock_atomic', {
            p_product_id: productId,
            p_quantity_change: qtyChange,
            p_reason: reason.trim(),
            p_actor_id: req.profile.id,
            p_movement_type: movementType
        });

        if (error) {
            return res.status(400).json({
                error: 'Stock Adjustment Failed',
                message: error.message
            });
        }

        return res.json({
            success: true,
            message: 'Stock updated successfully.',
            result: data
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// POST /api/inventory/product (Admin only)
// Add a new product
router.post('/product', authenticate, requireRole('ADMIN'), async (req, res) => {
    try {
        const {
            name,
            sku,
            sellingPricePaise,
            lowStockThreshold = 10,
            gstRate = 12.00,
            hsnCode = '19041090'
        } = req.body;

        if (!name || !sku || sellingPricePaise === undefined) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Product name, SKU, and selling price in paise are required.'
            });
        }

        // Clean SKU
        const cleanSku = sku.trim().toUpperCase();

        // Check SKU uniqueness
        const { data: existing } = await supabaseAdmin
            .from('products')
            .select('id')
            .eq('sku', cleanSku)
            .single();

        if (existing) {
            return res.status(400).json({
                error: 'Conflict',
                message: `Product SKU "${cleanSku}" already exists. SKU must be unique.`
            });
        }

        const { data: product, error } = await supabaseAdmin
            .from('products')
            .insert({
                name: name.trim(),
                sku: cleanSku,
                selling_price_paise: parseInt(sellingPricePaise, 10),
                stock_quantity: 0, // Initial stock entered by admin through stock adjustment
                low_stock_threshold: parseInt(lowStockThreshold, 10),
                gst_rate: parseFloat(gstRate),
                hsn_code: hsnCode ? hsnCode.trim() : '19041090',
                is_active: true
            })
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        return res.status(201).json({
            success: true,
            message: 'Product created successfully.',
            product
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// PUT /api/inventory/product/:id (Admin only)
// Update product attributes, price, or active status
router.put('/product/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            sku,
            sellingPricePaise,
            lowStockThreshold,
            gstRate,
            hsnCode,
            isActive
        } = req.body;

        const updateData = {
            updated_at: new Date().toISOString()
        };

        if (name) updateData.name = name.trim();
        if (sku) updateData.sku = sku.trim().toUpperCase();
        if (sellingPricePaise !== undefined) updateData.selling_price_paise = parseInt(sellingPricePaise, 10);
        if (lowStockThreshold !== undefined) updateData.low_stock_threshold = parseInt(lowStockThreshold, 10);
        if (gstRate !== undefined) updateData.gst_rate = parseFloat(gstRate);
        if (hsnCode !== undefined) updateData.hsn_code = hsnCode.trim();
        if (isActive !== undefined) updateData.is_active = Boolean(isActive);

        const { data: product, error } = await supabaseAdmin
            .from('products')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        return res.json({
            success: true,
            message: 'Product updated successfully.',
            product
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// GET /api/inventory/movements (Admin only)
// Audit trail of all stock movements
router.get('/movements', authenticate, requireRole('ADMIN'), async (req, res) => {
    try {
        const { productId, limit = 100 } = req.query;

        let query = supabaseAdmin
            .from('stock_movements')
            .select(`
                *,
                product:products(id, name, sku),
                actor:profiles(id, full_name, role)
            `)
            .order('created_at', { ascending: false })
            .limit(parseInt(limit, 10));

        if (productId) {
            query = query.eq('product_id', productId);
        }

        const { data: movements, error } = await query;
        if (error) {
            return res.status(400).json({ error: error.message });
        }

        return res.json({ movements });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
