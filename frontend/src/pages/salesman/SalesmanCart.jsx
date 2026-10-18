// frontend/src/pages/salesman/SalesmanCart.jsx
import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { api } from '../../lib/api';
import { formatPaise } from '../../lib/formatters';
import { Trash2, Plus, Minus, ArrowLeft, CheckCircle2, AlertCircle, ShoppingBag } from 'lucide-react';

export default function SalesmanCart({ onNavigate }) {
  const {
    items,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotalPaise,
    totalUnits,
    customerInfo,
    setCustomerInfo
  } = useCart();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [placedOrder, setPlacedOrder] = useState(null);

  // Generate an idempotency key if not already generated
  const [idempotencyKey] = useState(() => `cart_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);

  const handleInputChange = (field, value) => {
    setCustomerInfo(prev => ({ ...prev, [field]: value }));
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setError(null);

    if (items.length === 0) {
      setError('Your cart is empty. Please add products.');
      return;
    }

    if (!customerInfo.customerName.trim()) {
      setError('Please enter customer name.');
      return;
    }
    if (!customerInfo.customerPhone.trim()) {
      setError('Please enter customer phone number.');
      return;
    }
    if (!customerInfo.customerAddress.trim()) {
      setError('Please enter full delivery address.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        customerName: customerInfo.customerName.trim(),
        customerPhone: customerInfo.customerPhone.trim(),
        customerAddress: customerInfo.customerAddress.trim(),
        customerState: customerInfo.customerState || 'Bihar',
        customerStateCode: customerInfo.customerStateCode || '10',
        customerGstin: customerInfo.customerGstin ? customerInfo.customerGstin.trim().toUpperCase() : null,
        items: items.map(i => ({
          productId: i.product.id,
          quantity: i.quantity
        })),
        idempotencyKey
      };

      const res = await api.orders.place(payload);
      if (res && res.success) {
        setPlacedOrder(res.order);
        clearCart();
      }
    } catch (err) {
      console.error('Failed to place order:', err);
      setError(err.message || 'Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // If order was placed successfully, show clear confirmation screen
  if (placedOrder) {
    return (
      <div className="max-w-md mx-auto my-6 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900">Order Placed Successfully!</h2>
          <p className="text-xs text-slate-500 mt-1">Stock deducted immediately from inventory.</p>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Order Number:</span>
            <span className="font-mono font-bold text-slate-900">{placedOrder.order_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Total Amount:</span>
            <span className="font-mono font-bold text-emerald-800 text-sm">
              {formatPaise(placedOrder.total_amount_paise)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Delivery Status:</span>
            <span className="font-semibold text-amber-700">Placed (Pending Delivery)</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={() => onNavigate('deliveries')}
            className="w-full py-3 bg-brand-700 hover:bg-brand-800 text-white font-bold rounded-xl text-sm transition"
          >
            View in Deliveries
          </button>
          <button
            onClick={() => onNavigate('catalogue')}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-sm transition"
          >
            Take Another Order
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Your Cart is Empty</h2>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Add products from the catalogue to prepare a customer order.
        </p>
        <button
          onClick={() => onNavigate('catalogue')}
          className="px-6 py-2.5 bg-brand-700 text-white font-bold rounded-xl text-sm shadow-xs hover:bg-brand-800 transition"
        >
          Browse Catalogue
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24">
      {/* Top Bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onNavigate('catalogue')}
          className="p-2 bg-white rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-slate-900">Review & Place Order</h2>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs sm:text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Cart Items List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 text-xs font-bold text-slate-600 uppercase tracking-wider">
          Items ({totalUnits})
        </div>

        {items.map(({ product, quantity }) => (
          <div key={product.id} className="p-4 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-900 text-sm truncate">{product.name}</h4>
              <span className="text-xs text-slate-500 font-mono block">
                {formatPaise(product.selling_price_paise)} each
              </span>
            </div>

            {/* Stepper */}
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg">
              <button
                type="button"
                onClick={() => updateQuantity(product.id, quantity - 1)}
                className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-7 text-center font-bold text-xs text-slate-900">{quantity}</span>
              <button
                type="button"
                onClick={() => {
                  if (quantity < product.stock_quantity) {
                    updateQuantity(product.id, quantity + 1);
                  }
                }}
                disabled={quantity >= product.stock_quantity}
                className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition disabled:opacity-30"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Line Total */}
            <div className="text-right shrink-0">
              <span className="font-mono font-bold text-sm text-slate-900 block">
                {formatPaise(product.selling_price_paise * quantity)}
              </span>
              <button
                type="button"
                onClick={() => removeFromCart(product.id)}
                className="text-xs text-rose-600 hover:underline flex items-center gap-1 justify-end mt-0.5"
              >
                <Trash2 className="w-3 h-3" />
                <span>Remove</span>
              </button>
            </div>
          </div>
        ))}

        <div className="p-4 bg-slate-50 flex justify-between items-center text-sm font-bold">
          <span className="text-slate-600">Total Order Value:</span>
          <span className="font-mono text-base text-slate-900">{formatPaise(subtotalPaise)}</span>
        </div>
      </div>

      {/* Customer Information Form */}
      <form onSubmit={handlePlaceOrder} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider border-b border-slate-100 pb-2">
          Customer & Delivery Details
        </h3>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Customer / Shop Name *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Ramesh General Store"
            value={customerInfo.customerName}
            onChange={(e) => handleInputChange('customerName', e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Customer Phone Number *
          </label>
          <input
            type="tel"
            required
            placeholder="e.g. 9876543210"
            value={customerInfo.customerPhone}
            onChange={(e) => handleInputChange('customerPhone', e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Full Delivery Address *
          </label>
          <textarea
            required
            rows={2}
            placeholder="Shop no, street, landmark, area"
            value={customerInfo.customerAddress}
            onChange={(e) => handleInputChange('customerAddress', e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Place of Supply (State)
            </label>
            <select
              value={customerInfo.customerState}
              onChange={(e) => {
                const state = e.target.value;
                const stateCode = state === 'Bihar' ? '10' : state === 'Jharkhand' ? '20' : state === 'West Bengal' ? '19' : '00';
                handleInputChange('customerState', state);
                handleInputChange('customerStateCode', stateCode);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white"
            >
              <option value="Bihar">Bihar (10)</option>
              <option value="Jharkhand">Jharkhand (20)</option>
              <option value="West Bengal">West Bengal (19)</option>
              <option value="Other">Other State</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Customer GSTIN (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. 10AAAAA0000A1Z5"
              value={customerInfo.customerGstin}
              onChange={(e) => handleInputChange('customerGstin', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono uppercase"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full mt-2 py-3.5 bg-brand-700 hover:bg-brand-800 active:scale-98 text-white font-extrabold text-sm sm:text-base rounded-xl transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Placing Order & Reserving Stock...' : `Confirm & Place Order (${formatPaise(subtotalPaise)})`}
        </button>
      </form>
    </div>
  );
}
