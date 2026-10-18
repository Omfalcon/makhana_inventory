// tests/gst.test.js
const assert = require('assert');
const { calculateItemGst, calculateOrderTotals } = require('../api/utils/gst');

console.log('--- RUNNING GST CALCULATION TESTS ---');

// Test Case 1: Intra-state, GST-Inclusive pricing (Default)
// Product: RAW MAKHANA 100GM MIX GREEN - ₹160 (16000 paise), Qty: 2, Total = ₹320 (32000 paise), Rate = 12%
// Taxable = round(32000 * 10000 / 11200) = 28571 paise (₹285.71)
// Total Tax = 32000 - 28571 = 3429 paise (₹34.29)
// Intra-state: CGST = 1714 paise, SGST = 1715 paise, IGST = 0
{
    const res = calculateItemGst({
        unitPricePaise: 16000,
        quantity: 2,
        gstRatePercent: 12.0,
        isInclusive: true,
        isInterState: false
    });

    assert.strictEqual(res.lineTotalPaise, 32000, 'Line total should be 32000 paise');
    assert.strictEqual(res.taxableValuePaise, 28571, 'Taxable value should be 28571 paise');
    assert.strictEqual(res.cgstPaise, 1714, 'CGST should be 1714 paise');
    assert.strictEqual(res.sgstPaise, 1715, 'SGST should be 1715 paise');
    assert.strictEqual(res.igstPaise, 0, 'IGST should be 0 paise');
    assert.strictEqual(res.totalTaxPaise, 3429, 'Total tax should be 3429 paise');
    console.log('✓ Test Case 1 Passed: Intra-state GST-inclusive calculation');
}

// Test Case 2: Inter-state, GST-Inclusive pricing
// Same item shipped to another state: IGST = 3429 paise, CGST = 0, SGST = 0
{
    const res = calculateItemGst({
        unitPricePaise: 16000,
        quantity: 2,
        gstRatePercent: 12.0,
        isInclusive: true,
        isInterState: true
    });

    assert.strictEqual(res.lineTotalPaise, 32000, 'Line total should be 32000 paise');
    assert.strictEqual(res.taxableValuePaise, 28571, 'Taxable value should be 28571 paise');
    assert.strictEqual(res.cgstPaise, 0, 'CGST should be 0');
    assert.strictEqual(res.sgstPaise, 0, 'SGST should be 0');
    assert.strictEqual(res.igstPaise, 3429, 'IGST should be 3429 paise');
    console.log('✓ Test Case 2 Passed: Inter-state GST-inclusive calculation');
}

// Test Case 3: Intra-state, GST-Exclusive pricing
// Product: MAGIK MASALA 70GM - ₹190 (19000 paise), Qty: 1, Rate = 12%
// Taxable = 19000 paise
// CGST = round(19000 * 6%) = 1140 paise
// SGST = round(19000 * 6%) = 1140 paise
// Total Tax = 2280 paise
// Line Total = 19000 + 2280 = 21280 paise (₹212.80)
{
    const res = calculateItemGst({
        unitPricePaise: 19000,
        quantity: 1,
        gstRatePercent: 12.0,
        isInclusive: false,
        isInterState: false
    });

    assert.strictEqual(res.taxableValuePaise, 19000, 'Taxable value should be 19000 paise');
    assert.strictEqual(res.cgstPaise, 1140, 'CGST should be 1140 paise');
    assert.strictEqual(res.sgstPaise, 1140, 'SGST should be 1140 paise');
    assert.strictEqual(res.igstPaise, 0, 'IGST should be 0');
    assert.strictEqual(res.lineTotalPaise, 21280, 'Line total should be 21280 paise');
    console.log('✓ Test Case 3 Passed: Intra-state GST-exclusive calculation');
}

// Test Case 4: Order Totals Aggregator with multi-item mix
{
    const items = [
        { unitPricePaise: 16000, quantity: 2, gstRate: 12 },
        { unitPricePaise: 50000, quantity: 1, gstRate: 12 }
    ];
    const orderRes = calculateOrderTotals(items, true, false);
    assert.strictEqual(orderRes.subtotalPaise, 82000, 'Subtotal should match sum of prices');
    assert.strictEqual(orderRes.totalAmountPaise, 82000, 'Inclusive total should match gross');
    assert(orderRes.taxableValuePaise > 0, 'Taxable value must be computed');
    assert.strictEqual(orderRes.totalTaxPaise + orderRes.taxableValuePaise, orderRes.totalAmountPaise, 'Taxable + tax must equal total amount');
    console.log('✓ Test Case 4 Passed: Order Totals Aggregation');
}

console.log('ALL GST CALCULATION TESTS PASSED SUCCESSFULLY! 🎉');
