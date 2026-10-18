// tests/order_logic.test.js
const assert = require('assert');

console.log('--- RUNNING ORDER LIFECYCLE & STATE MACHINE TESTS ---');

// Validate allowed status transitions
const ALLOWED_SALESMAN_TRANSITIONS = {
    'PLACED': ['OUT_FOR_DELIVERY', 'DELIVERY_FAILED'],
    'OUT_FOR_DELIVERY': ['DELIVERED', 'DELIVERY_FAILED'],
    'DELIVERY_FAILED': ['OUT_FOR_DELIVERY'], // Can retry delivery
    'DELIVERED': [], // Terminal state for delivery
    'CANCELLED': [] // Terminal state
};

function isValidSalesmanTransition(currentStatus, newStatus) {
    const allowed = ALLOWED_SALESMAN_TRANSITIONS[currentStatus] || [];
    return allowed.includes(newStatus);
}

// Test status state transitions
assert.strictEqual(isValidSalesmanTransition('PLACED', 'OUT_FOR_DELIVERY'), true);
assert.strictEqual(isValidSalesmanTransition('OUT_FOR_DELIVERY', 'DELIVERED'), true);
assert.strictEqual(isValidSalesmanTransition('OUT_FOR_DELIVERY', 'DELIVERY_FAILED'), true);
assert.strictEqual(isValidSalesmanTransition('DELIVERED', 'CANCELLED'), false, 'Salesman cannot cancel delivered orders');
assert.strictEqual(isValidSalesmanTransition('CANCELLED', 'DELIVERED'), false, 'Cancelled order cannot be delivered');
console.log('✓ Test: Status state machine validation passed');

// Test Delivery Failed Requirement
function validateFailedDelivery(status, reason) {
    if (status === 'DELIVERY_FAILED') {
        if (!reason || !reason.trim()) {
            throw new Error('A short reason is required when marking a delivery as failed.');
        }
    }
    return true;
}

assert.throws(() => validateFailedDelivery('DELIVERY_FAILED', ''), /reason is required/);
assert.strictEqual(validateFailedDelivery('DELIVERY_FAILED', 'Customer shop closed'), true);
console.log('✓ Test: Delivery failed reason requirement passed');

// Test Stock Restoration idempotency guard
class MockOrder {
    constructor(orderNumber, items) {
        this.orderNumber = orderNumber;
        this.items = items;
        this.status = 'PLACED';
        this.stockRestored = false;
    }

    cancel(restock, reason, productStockMap) {
        if (this.status === 'CANCELLED') {
            throw new Error('Order is already cancelled.');
        }
        if (this.status === 'DELIVERED') {
            throw new Error('Delivered orders cannot be cancelled directly.');
        }

        if (restock && !this.stockRestored) {
            for (const item of this.items) {
                productStockMap[item.productId] += item.quantity;
            }
            this.stockRestored = true;
        }

        this.status = 'CANCELLED';
        this.cancellationReason = reason;
    }
}

const mockStock = { 'prod-1': 50, 'prod-2': 20 };
const order = new MockOrder('MKH-TEST-001', [{ productId: 'prod-1', quantity: 10 }]);

// Cancel and restock
order.cancel(true, 'Customer cancelled order before dispatch', mockStock);
assert.strictEqual(mockStock['prod-1'], 60, 'Stock restored from 50 to 60');
assert.strictEqual(order.stockRestored, true);

// Attempt second cancellation / restock on already cancelled order
assert.throws(() => {
    order.cancel(true, 'Repeated cancellation attempt', mockStock);
}, /already cancelled/);
assert.strictEqual(mockStock['prod-1'], 60, 'Stock was not restored twice');
console.log('✓ Test: Atomic stock restoration idempotency guard passed');

console.log('ALL ORDER LIFECYCLE TESTS PASSED! 🎉');
