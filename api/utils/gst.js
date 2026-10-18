// api/utils/gst.js
/**
 * Exact integer paise GST calculation utility
 * Handles intra-state (CGST + SGST) and inter-state (IGST),
 * as well as GST-inclusive and GST-exclusive pricing models.
 */

function calculateItemGst({
    unitPricePaise,
    quantity,
    gstRatePercent,
    isInclusive = true,
    isInterState = false
}) {
    const qty = parseInt(quantity, 10);
    const unitPrice = BigInt(Math.round(unitPricePaise));
    const rate = Number(gstRatePercent);

    if (qty <= 0) {
        throw new Error('Quantity must be greater than zero');
    }
    if (unitPrice < 0n) {
        throw new Error('Unit price cannot be negative');
    }
    if (rate < 0) {
        throw new Error('GST rate cannot be negative');
    }

    let taxableValuePaise;
    let cgstPaise = 0n;
    let sgstPaise = 0n;
    let igstPaise = 0n;
    let totalTaxPaise = 0n;
    let lineTotalPaise;

    if (isInclusive) {
        // Price includes GST
        lineTotalPaise = unitPrice * BigInt(qty);
        // Taxable = (LineTotal * 10000) / (10000 + Rate * 100)
        const rateBasis = BigInt(Math.round(rate * 100));
        const divisor = 10000n + rateBasis;
        // BigInt round division: (num + div/2) / div
        const numerator = lineTotalPaise * 10000n;
        taxableValuePaise = (numerator + (divisor / 2n)) / divisor;
        totalTaxPaise = lineTotalPaise - taxableValuePaise;

        if (isInterState) {
            igstPaise = totalTaxPaise;
        } else {
            cgstPaise = totalTaxPaise / 2n;
            sgstPaise = totalTaxPaise - cgstPaise;
        }
    } else {
        // Price excludes GST
        taxableValuePaise = unitPrice * BigInt(qty);
        if (isInterState) {
            // IGST = round((taxable * rate) / 100)
            const rateBasis = BigInt(Math.round(rate * 100));
            igstPaise = (taxableValuePaise * rateBasis + 5000n) / 10000n;
            totalTaxPaise = igstPaise;
        } else {
            // Half rate for CGST, half for SGST
            const halfRateBasis = BigInt(Math.round((rate / 2) * 100));
            cgstPaise = (taxableValuePaise * halfRateBasis + 5000n) / 10000n;
            sgstPaise = (taxableValuePaise * halfRateBasis + 5000n) / 10000n;
            totalTaxPaise = cgstPaise + sgstPaise;
        }
        lineTotalPaise = taxableValuePaise + totalTaxPaise;
    }

    return {
        unitPricePaise: Number(unitPrice),
        quantity: qty,
        taxableValuePaise: Number(taxableValuePaise),
        cgstPaise: Number(cgstPaise),
        sgstPaise: Number(sgstPaise),
        igstPaise: Number(igstPaise),
        totalTaxPaise: Number(totalTaxPaise),
        lineTotalPaise: Number(lineTotalPaise)
    };
}

function calculateOrderTotals(items, isInclusive, isInterState) {
    let subtotalPaise = 0;
    let taxableValuePaise = 0;
    let cgstPaise = 0;
    let sgstPaise = 0;
    let igstPaise = 0;
    let totalTaxPaise = 0;
    let totalAmountPaise = 0;

    const calculatedItems = items.map(item => {
        const itemResult = calculateItemGst({
            unitPricePaise: item.unitPricePaise || item.unit_price_paise,
            quantity: item.quantity,
            gstRatePercent: item.gstRate || item.gst_rate || 12,
            isInclusive,
            isInterState
        });

        subtotalPaise += (item.unitPricePaise || item.unit_price_paise) * item.quantity;
        taxableValuePaise += itemResult.taxableValuePaise;
        cgstPaise += itemResult.cgstPaise;
        sgstPaise += itemResult.sgstPaise;
        igstPaise += itemResult.igstPaise;
        totalTaxPaise += itemResult.totalTaxPaise;
        totalAmountPaise += itemResult.lineTotalPaise;

        return {
            ...item,
            ...itemResult
        };
    });

    return {
        subtotalPaise,
        taxableValuePaise,
        cgstPaise,
        sgstPaise,
        igstPaise,
        totalTaxPaise,
        totalAmountPaise,
        items: calculatedItems
    };
}

module.exports = {
    calculateItemGst,
    calculateOrderTotals
};
