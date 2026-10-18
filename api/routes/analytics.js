// api/routes/analytics.js
const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { supabaseAdmin } = require('../utils/supabase');

// Helper to parse date filter
function getDateRange(preset, customStart, customEnd) {
    const now = new Date();
    // Use Asia/Kolkata timezone reference
    const kolkataNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

    let start = new Date(kolkataNow);
    let end = new Date(kolkataNow);

    if (preset === 'today') {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    } else if (preset === 'yesterday') {
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);
    } else if (preset === '7d') {
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    } else if (preset === '30d') {
        start.setDate(start.getDate() - 29);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    } else if (preset === 'custom' && customStart && customEnd) {
        start = new Date(customStart);
        end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
    } else {
        // Default to last 7 days
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    }

    return {
        startDate: start.toISOString(),
        endDate: end.toISOString()
    };
}

// GET /api/analytics/admin (Admin only)
router.get('/admin', authenticate, requireRole('ADMIN'), async (req, res) => {
    try {
        const { preset = 'today', startDate: customStart, endDate: customEnd, salesmanId } = req.query;
        const { startDate, endDate } = getDateRange(preset, customStart, customEnd);

        // 1. Fetch filtered orders for the period
        let ordersQuery = supabaseAdmin
            .from('orders')
            .select(`
                *,
                salesman:profiles!orders_salesman_id_fkey(id, full_name),
                items:order_items(*)
            `)
            .gte('created_at', startDate)
            .lte('created_at', endDate);

        if (salesmanId) {
            ordersQuery = ordersQuery.eq('salesman_id', salesmanId);
        }

        const { data: periodOrders, error: ordersErr } = await ordersQuery;
        if (ordersErr) throw ordersErr;

        // 2. Fetch all products for stock analysis
        const { data: products, error: prodErr } = await supabaseAdmin
            .from('products')
            .select('*');
        if (prodErr) throw prodErr;

        // 3. Today's snapshot metrics (specifically for today's quick bar)
        const todayRange = getDateRange('today');
        const { data: todayOrders, error: todayErr } = await supabaseAdmin
            .from('orders')
            .select('id, status, total_amount_paise')
            .gte('created_at', todayRange.startDate)
            .lte('created_at', todayRange.endDate);
        if (todayErr) throw todayErr;

        const totalOrdersToday = todayOrders.length;
        const ordersPlacedToday = todayOrders.filter(o => o.status === 'PLACED').length;
        const ordersDeliveredToday = todayOrders.filter(o => o.status === 'DELIVERED').length;
        const ordersAwaitingDelivery = periodOrders.filter(o => o.status === 'PLACED' || o.status === 'OUT_FOR_DELIVERY').length;

        // Metrics for selected period
        let deliveredRevenuePaise = 0;
        let pendingRevenuePaise = 0;
        let totalUnitsSold = 0;
        const productStats = {};
        const salesmanStats = {};

        // Prepopulate products in stats
        products.forEach(p => {
            productStats[p.id] = {
                id: p.id,
                name: p.name,
                sku: p.sku,
                stockRemaining: p.stock_quantity,
                lowStockThreshold: p.low_stock_threshold,
                isLowStock: p.stock_quantity <= p.low_stock_threshold,
                unitsSold: 0,
                deliveredUnitsSold: 0,
                deliveredRevenuePaise: 0,
                totalOrderedRevenuePaise: 0
            };
        });

        // Compute from orders
        periodOrders.forEach(order => {
            const isDelivered = order.status === 'DELIVERED';
            if (isDelivered) {
                deliveredRevenuePaise += order.total_amount_paise;
            } else if (order.status !== 'CANCELLED') {
                pendingRevenuePaise += order.total_amount_paise;
            }

            // Salesman aggregation
            const sId = order.salesman_id;
            const sName = order.salesman ? order.salesman.full_name : 'Unknown';
            if (!salesmanStats[sId]) {
                salesmanStats[sId] = {
                    id: sId,
                    name: sName,
                    totalOrders: 0,
                    deliveredOrders: 0,
                    pendingDeliveries: 0,
                    failedDeliveries: 0,
                    cancelledOrders: 0,
                    unitsSold: 0,
                    deliveredRevenuePaise: 0,
                    totalRevenuePaise: 0
                };
            }

            salesmanStats[sId].totalOrders += 1;
            if (order.status === 'DELIVERED') {
                salesmanStats[sId].deliveredOrders += 1;
                salesmanStats[sId].deliveredRevenuePaise += order.total_amount_paise;
            } else if (order.status === 'DELIVERY_FAILED') {
                salesmanStats[sId].failedDeliveries += 1;
            } else if (order.status === 'CANCELLED') {
                salesmanStats[sId].cancelledOrders += 1;
            } else {
                salesmanStats[sId].pendingDeliveries += 1;
            }
            salesmanStats[sId].totalRevenuePaise += order.total_amount_paise;

            // Items aggregation
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    if (order.status !== 'CANCELLED') {
                        totalUnitsSold += item.quantity;
                    }

                    if (item.product_id && productStats[item.product_id]) {
                        if (order.status !== 'CANCELLED') {
                            productStats[item.product_id].unitsSold += item.quantity;
                            productStats[item.product_id].totalOrderedRevenuePaise += item.line_total_paise;
                        }
                        if (isDelivered) {
                            productStats[item.product_id].deliveredUnitsSold += item.quantity;
                            productStats[item.product_id].deliveredRevenuePaise += item.line_total_paise;
                        }
                    }

                    if (order.status !== 'CANCELLED') {
                        salesmanStats[sId].unitsSold += item.quantity;
                    }
                });
            }
        });

        // Compute low stock products
        const lowStockProducts = products.filter(p => p.stock_quantity <= p.low_stock_threshold && p.is_active);

        // Best-selling product by delivered quantity, and highest revenue
        const productList = Object.values(productStats);
        const bestSellingByQuantity = [...productList].sort((a, b) => b.unitsSold - a.unitsSold)[0] || null;
        const highestRevenueProduct = [...productList].sort((a, b) => b.deliveredRevenuePaise - a.deliveredRevenuePaise)[0] || null;
        const lowestSellingProduct = [...productList].sort((a, b) => a.unitsSold - b.unitsSold)[0] || null;

        // Top salesman by delivered revenue
        const salesmanList = Object.values(salesmanStats).map(s => ({
            ...s,
            avgOrderValuePaise: s.totalOrders > 0 ? Math.round(s.totalRevenuePaise / s.totalOrders) : 0
        }));
        const topSalesman = [...salesmanList].sort((a, b) => b.deliveredRevenuePaise - a.deliveredRevenuePaise)[0] || null;

        // Daily trend
        const dailyTrends = {};
        periodOrders.forEach(order => {
            const dayKey = order.created_at.substring(0, 10);
            if (!dailyTrends[dayKey]) {
                dailyTrends[dayKey] = { date: dayKey, ordersCount: 0, deliveredRevenuePaise: 0, totalRevenuePaise: 0 };
            }
            dailyTrends[dayKey].ordersCount += 1;
            if (order.status === 'DELIVERED') {
                dailyTrends[dayKey].deliveredRevenuePaise += order.total_amount_paise;
            }
            dailyTrends[dayKey].totalRevenuePaise += order.total_amount_paise;
        });

        return res.json({
            period: {
                preset,
                startDate,
                endDate
            },
            summary: {
                totalOrdersToday,
                ordersPlacedToday,
                ordersDeliveredToday,
                ordersAwaitingDelivery,
                periodOrdersCount: periodOrders.length,
                deliveredRevenuePaise,
                pendingRevenuePaise,
                totalUnitsSold,
                lowStockCount: lowStockProducts.length,
                bestSellingProduct: bestSellingByQuantity ? {
                    name: bestSellingByQuantity.name,
                    sku: bestSellingByQuantity.sku,
                    unitsSold: bestSellingByQuantity.unitsSold
                } : null,
                topSalesman: topSalesman ? {
                    name: topSalesman.name,
                    deliveredOrders: topSalesman.deliveredOrders,
                    deliveredRevenuePaise: topSalesman.deliveredRevenuePaise
                } : null
            },
            salesmen: salesmanList,
            products: productList,
            lowStockProducts,
            dailyTrends: Object.values(dailyTrends).sort((a, b) => a.date.localeCompare(b.date)),
            orders: periodOrders
        });
    } catch (err) {
        console.error('Admin analytics error:', err);
        return res.status(500).json({ error: err.message });
    }
});

// GET /api/analytics/salesman (Salesman self performance)
router.get('/salesman', authenticate, async (req, res) => {
    try {
        const salesmanId = req.profile.id;
        const { preset = 'today' } = req.query;
        const { startDate, endDate } = getDateRange(preset);

        const { data: orders, error } = await supabaseAdmin
            .from('orders')
            .select(`
                *,
                items:order_items(quantity, line_total_paise)
            `)
            .eq('salesman_id', salesmanId)
            .gte('created_at', startDate)
            .lte('created_at', endDate);

        if (error) throw error;

        let totalOrders = orders.length;
        let deliveredOrders = 0;
        let pendingDeliveries = 0;
        let failedDeliveries = 0;
        let totalRevenuePaise = 0;
        let deliveredRevenuePaise = 0;
        let unitsSold = 0;

        // Hourly activity bucket (0 - 23)
        const hourlyActivity = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));

        orders.forEach(o => {
            totalRevenuePaise += o.total_amount_paise;
            if (o.status === 'DELIVERED') {
                deliveredOrders += 1;
                deliveredRevenuePaise += o.total_amount_paise;
            } else if (o.status === 'DELIVERY_FAILED') {
                failedDeliveries += 1;
            } else if (o.status === 'PLACED' || o.status === 'OUT_FOR_DELIVERY') {
                pendingDeliveries += 1;
            }

            if (o.items) {
                o.items.forEach(itm => {
                    unitsSold += itm.quantity;
                });
            }

            const orderDate = new Date(o.created_at);
            const hour = orderDate.getHours();
            hourlyActivity[hour].count += 1;
        });

        return res.json({
            period: { preset, startDate, endDate },
            performance: {
                totalOrders,
                deliveredOrders,
                pendingDeliveries,
                failedDeliveries,
                totalRevenuePaise,
                deliveredRevenuePaise,
                unitsSold,
                averageOrderValuePaise: totalOrders > 0 ? Math.round(totalRevenuePaise / totalOrders) : 0
            },
            hourlyActivity
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
