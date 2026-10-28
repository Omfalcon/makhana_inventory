// frontend/src/pages/salesman/SalesmanCart.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useCart } from '../../context/CartContext';
import { api } from '../../lib/api';
import { formatPaise } from '../../lib/formatters';
import { 
  Trash2, Plus, Minus, ArrowLeft, CheckCircle2, AlertCircle, 
  ShoppingBag, Loader2, Receipt, CreditCard, Banknote, QrCode, 
  Printer, ArrowRight, Store, Phone, MapPin, FileText
} from 'lucide-react';

const localCustomerCache = new Map();

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
  const [paymentMode, setPaymentMode] = useState('cash'); // 'cash' | 'upi' | 'credit'

  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupStatus, setLookupStatus] = useState(null);
  const lastLookupPhoneRef = useRef('');
  const formRef = useRef(null);

  // Pre-load customer cache from recent orders
  useEffect(() => {
    let mounted = true;
    api.orders.list({ limit: 50 }).then(res => {
      if (!mounted || !res?.orders) return;
      res.orders.forEach(o => {
        if (o.customer_phone) {
          const digits = o.customer_phone.replace(/\D/g, '');
          const data = {
            customerName: o.customer_name || '',
            customerPhone: o.customer_phone,
            customerAddress: o.customer_address || '',
            customerState: o.customer_state || 'Bihar',
            customerStateCode: o.customer_state_code || '10',
            customerGstin: o.customer_gstin || ''
          };
          localCustomerCache.set(digits, data);
          if (digits.length >= 10) {
            localCustomerCache.set(digits.slice(-10), data);
          }
        }
      });
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const [idempotencyKey] = useState(() => `cart_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);

  const handleInputChange = (field, value) => {
    setCustomerInfo(prev => ({ ...prev, [field]: value }));
  };

  const handlePhoneChange = (val) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 10);
    if (digitsOnly !== lastLookupPhoneRef.current) {
      setLookupStatus(null);
    }
    setCustomerInfo(prev => ({ ...prev, customerPhone: digitsOnly }));
  };

  const applyCustomer = useCallback((cust) => {
    setCustomerInfo(prev => ({
      ...prev,
      customerName: cust.customerName || prev.customerName,
      customerAddress: cust.customerAddress || prev.customerAddress,
      customerState: cust.customerState || prev.customerState,
      customerStateCode: cust.customerStateCode || prev.customerStateCode,
      customerGstin: cust.customerGstin !== undefined ? cust.customerGstin : prev.customerGstin
    }));
    setLookupStatus('found');
  }, [setCustomerInfo]);

  const performLookup = useCallback(async (phoneToLookup, force = false) => {
    if (!phoneToLookup) return;
    const cleanDigits = phoneToLookup.replace(/\D/g, '');
    if (cleanDigits.length < 10) return;

    const last10 = cleanDigits.slice(-10);

    if (localCustomerCache.has(cleanDigits) || localCustomerCache.has(last10)) {
      const cached = localCustomerCache.get(cleanDigits) || localCustomerCache.get(last10);
      lastLookupPhoneRef.current = cleanDigits;
      applyCustomer(cached);
      setLookupLoading(false);
      return;
    }

    if (!force && lastLookupPhoneRef.current === cleanDigits) {
      return;
    }

    try {
      setLookupLoading(true);
      lastLookupPhoneRef.current = cleanDigits;
      const res = await api.orders.lookupCustomer(cleanDigits);

      if (res && res.found && res.customer) {
        localCustomerCache.set(cleanDigits, res.customer);
        localCustomerCache.set(last10, res.customer);
        applyCustomer(res.customer);
      } else {
        setLookupStatus('not_found');
      }
    } catch (err) {
      console.warn('Customer lookup error:', err);
    } finally {
      setLookupLoading(false);
    }
  }, [applyCustomer]);

  const handlePlaceOrder = async (e) => {
    if (e) e.preventDefault();
    if (submitting) return;
    setError(null);

    if (items.length === 0) {
      setError('Please add products before placing an order.');
      return;
    }

    if (!customerInfo.customerPhone || customerInfo.customerPhone.length !== 10) {
      setError('Please enter a valid 10-digit customer mobile number.');
      return;
    }

    if (!customerInfo.customerName.trim()) {
      setError('Please enter the customer / shop name.');
      return;
    }

    if (!customerInfo.customerAddress.trim()) {
      setError('Please enter the delivery address.');
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
        customerGstin: customerInfo.customerGstin?.trim() || null,
        items: items.map(i => ({
          productId: i.product.id,
          quantity: i.quantity
        })),
        idempotencyKey
      };

      const res = await api.orders.create(payload);
      setPlacedOrder(res.order);
      clearCart();
    } catch (err) {
      console.error('Failed to place order:', err);
      setError(err.message || 'Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Keyboard Shortcuts (F9: Confirm & Pay, F6: Cash, F7: UPI, F8: Credit)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (placedOrder) return;
      if (e.key === 'F9') {
        e.preventDefault();
        if (formRef.current) {
          formRef.current.requestSubmit();
        } else {
          handlePlaceOrder();
        }
      } else if (e.key === 'F6') {
        e.preventDefault();
        setPaymentMode('cash');
      } else if (e.key === 'F7') {
        e.preventDefault();
        setPaymentMode('upi');
      } else if (e.key === 'F8') {
        e.preventDefault();
        setPaymentMode('credit');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [placedOrder, handlePlaceOrder]);

  // Petpooja Tax Calculations (12% GST inclusive for Makhana)
  // Taxable = Subtotal / 1.12
  const taxablePaise = Math.round(subtotalPaise / 1.12);
  const totalGstPaise = subtotalPaise - taxablePaise;
  const cgstPaise = Math.round(totalGstPaise / 2);
  const sgstPaise = totalGstPaise - cgstPaise;

  // Order Confirmation View (Petpooja Receipt Card)
  if (placedOrder) {
    return (
      <div className="max-w-xl mx-auto my-6 bg-white border border-slate-200/90 rounded-2xl shadow-xl overflow-hidden animate-fade-in">
        {/* Receipt Header */}
        <div className="bg-emerald-800 text-white p-6 text-center">
          <div className="w-12 h-12 bg-emerald-700/80 border border-emerald-500/50 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <CheckCircle2 className="w-7 h-7 text-amber-300" />
          </div>
          <span className="text-xs font-mono uppercase tracking-widest text-emerald-200 block mb-1">
            PETPOOJA BILLING SYSTEM • INVOICE GENERATED
          </span>
          <h2 className="text-2xl font-black tracking-tight">Order #{placedOrder.order_number}</h2>
          <p className="text-xs text-emerald-200 mt-1">Inventory deducted automatically. Ready for dispatch.</p>
        </div>

        {/* Receipt Content Body */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs sm:text-sm font-semibold">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Customer / Counter:</span>
              <span className="font-bold text-slate-900">{placedOrder.customer_name}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Contact Number:</span>
              <span className="font-mono font-bold text-slate-900">{placedOrder.customer_phone}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Payment Tender:</span>
              <span className="uppercase font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {paymentMode.toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-slate-700 font-bold">Total Bill Amount:</span>
              <span className="font-mono font-black text-emerald-900 text-xl tabular-nums">
                {formatPaise(placedOrder.total_amount_paise)}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => onNavigate('deliveries')}
              className="py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wide rounded-xl shadow-xs transition flex items-center justify-center gap-2"
            >
              <span>View in Deliveries</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('catalogue')}
              className="py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wide rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
            >
              <span>Next Customer [New Bill]</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty Cart View
  if (items.length === 0) {
    return (
      <div className="text-center py-16 bg-white border border-slate-200/90 rounded-2xl shadow-xs p-8 space-y-4 my-6">
        <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center mx-auto text-slate-400 shadow-inner">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Active Bill is Empty</h2>
        <p className="text-xs sm:text-sm font-semibold text-slate-500 max-w-sm mx-auto">
          Scan barcodes or tap products from the POS Catalogue to add items to this counter bill.
        </p>
        <button
          onClick={() => onNavigate('catalogue')}
          className="px-6 py-3 bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-emerald-800 transition shadow-xs inline-flex items-center gap-2"
        >
          <span>Open POS Catalogue</span>
          <span className="bg-emerald-800 px-1.5 py-0.5 rounded text-[10px] font-mono">[F2]</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-16">
      {/* Petpooja POS Subheader Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('catalogue')}
            className="p-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-slate-700 transition"
            title="Return to Catalogue [Esc]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-900 uppercase tracking-tight">
                POS Billing Counter
              </span>
              <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                COUNTER-01
              </span>
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              Tax Invoice Generation • {items.length} Line Items ({totalUnits} Units)
            </span>
          </div>
        </div>

        {/* Hotkeys reminder */}
        <div className="hidden md:flex items-center gap-2 text-xs font-mono font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <span>SHORTCUTS:</span>
          <span className="bg-white px-1.5 py-0.5 rounded border border-slate-300">[F6] Cash</span>
          <span className="bg-white px-1.5 py-0.5 rounded border border-slate-300">[F7] UPI</span>
          <span className="bg-white px-1.5 py-0.5 rounded border border-slate-300 text-emerald-700">[F9] Pay</span>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs sm:text-sm font-semibold flex items-start gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Main 2-Column POS Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (Items Ledger + Petpooja Tax Breakdown) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Running Items Ledger */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-slate-100/80 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider flex justify-between items-center">
              <span>Running Ledger ({items.length} Products)</span>
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold uppercase transition flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Void Bill</span>
              </button>
            </div>

            {/* Table layout on desktop, responsive stack on mobile */}
            <div className="divide-y divide-slate-100">
              {items.map(({ product, quantity }) => (
                <div key={product.id} className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                        {product.name}
                      </h4>
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 font-semibold">
                        GST 12%
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 font-mono font-medium block mt-0.5">
                      Rate: {formatPaise(product.selling_price_paise)} / unit • In Stock: {product.stock_quantity}
                    </span>
                  </div>

                  {/* Quantity Stepper & Line Total */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-5">
                    {/* Stepper */}
                    <div className="flex items-center bg-white border border-slate-300 rounded-lg overflow-hidden shadow-2xs">
                      <button
                        type="button"
                        onClick={() => updateQuantity(product.id, quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold border-r border-slate-200 transition"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-9 text-center font-bold text-xs font-mono text-slate-900">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (quantity < product.stock_quantity) {
                            updateQuantity(product.id, quantity + 1);
                          }
                        }}
                        disabled={quantity >= product.stock_quantity}
                        className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold border-l border-slate-200 transition disabled:opacity-30"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Subtotal */}
                    <div className="text-right min-w-[85px]">
                      <span className="font-mono font-bold text-sm sm:text-base text-slate-900 block tabular-nums">
                        {formatPaise(product.selling_price_paise * quantity)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFromCart(product.id)}
                        className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 justify-end mt-0.5 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Petpooja GST Tax Breakdown Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-700" />
                <span>GST Tax Computation (12% Included)</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500 font-semibold">
                HSN 20081940
              </span>
            </div>

            <div className="space-y-1.5 text-xs font-semibold text-slate-600">
              <div className="flex justify-between">
                <span>Taxable Value (Net):</span>
                <span className="font-mono tabular-nums text-slate-800">{formatPaise(taxablePaise)}</span>
              </div>
              <div className="flex justify-between">
                <span>CGST @ 6.0%:</span>
                <span className="font-mono tabular-nums text-slate-800">{formatPaise(cgstPaise)}</span>
              </div>
              <div className="flex justify-between">
                <span>SGST @ 6.0%:</span>
                <span className="font-mono tabular-nums text-slate-800">{formatPaise(sgstPaise)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-1.5 text-slate-700 font-bold">
                <span>Total GST Amount (12%):</span>
                <span className="font-mono tabular-nums text-emerald-800">{formatPaise(totalGstPaise)}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Rounding Adjustment:</span>
                <span className="font-mono tabular-nums">₹ 0.00</span>
              </div>
            </div>

            {/* Total Highlight */}
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
              <span className="text-xs uppercase font-extrabold text-slate-900 tracking-wide">
                Net Payable Amount:
              </span>
              <span className="font-mono font-black text-xl text-emerald-800 tabular-nums">
                {formatPaise(subtotalPaise)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column (Settlement & Customer Form) */}
        <form 
          ref={formRef}
          onSubmit={handlePlaceOrder} 
          className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4 lg:sticky lg:top-20 shadow-xs"
        >
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-900 text-sm sm:text-base uppercase tracking-tight flex items-center gap-1.5">
                <Store className="w-4 h-4 text-emerald-700" />
                <span>Customer & Settlement</span>
              </h3>
              <span className="text-[11px] font-semibold text-slate-500">Fast POS Customer Ledger Entry</span>
            </div>
            {lookupStatus === 'found' && (
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-200 rounded-full">
                ✓ Regular Khata
              </span>
            )}
          </div>

          {/* 1. Customer Phone Number */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Mobile Number *
              </label>
              {lookupLoading && (
                <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                  Fetching...
                </span>
              )}
            </div>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                required
                placeholder="10-digit mobile number"
                value={customerInfo.customerPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                onBlur={() => performLookup(customerInfo.customerPhone)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 font-mono placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs"
              />
            </div>
          </div>

          {/* 2. Customer / Shop Name */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Customer / Counter Name *
            </label>
            <div className="relative">
              <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Kirana Store"
                value={customerInfo.customerName}
                onChange={(e) => handleInputChange('customerName', e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs"
              />
            </div>
          </div>

          {/* 3. Delivery Address */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Delivery Address *
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <textarea
                required
                rows={2}
                placeholder="Shop no, market street, area"
                value={customerInfo.customerAddress}
                onChange={(e) => handleInputChange('customerAddress', e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs resize-none"
              />
            </div>
          </div>

          {/* Optional GSTIN */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              <span>Customer GSTIN (Optional)</span>
            </label>
            <input
              type="text"
              maxLength={15}
              placeholder="15-digit GSTIN (e.g. 10AAAAA0000A1Z5)"
              value={customerInfo.customerGstin || ''}
              onChange={(e) => handleInputChange('customerGstin', e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-800 placeholder:text-slate-400 uppercase focus:outline-none focus:border-emerald-600"
            />
          </div>

          {/* Petpooja Fast Payment Mode Pills */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Settlement Tender
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMode('cash')}
                className={`py-2 px-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                  paymentMode === 'cash'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-800 shadow-2xs ring-1 ring-emerald-600'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Banknote className="w-4 h-4 text-emerald-700" />
                <span>Cash [F6]</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('upi')}
                className={`py-2 px-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                  paymentMode === 'upi'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-800 shadow-2xs ring-1 ring-emerald-600'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <QrCode className="w-4 h-4 text-emerald-700" />
                <span>UPI [F7]</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('credit')}
                className={`py-2 px-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                  paymentMode === 'credit'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-800 shadow-2xs ring-1 ring-emerald-600'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-4 h-4 text-emerald-700" />
                <span>Khata [F8]</span>
              </button>
            </div>
          </div>

          {/* Master Submit Button (Petpooja style) */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-extrabold text-sm uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition shadow-md active:scale-98 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generating Bill...</span>
                </>
              ) : (
                <>
                  <Printer className="w-5 h-5 text-amber-300" />
                  <span>CONFIRM &amp; PRINT BILL</span>
                  <span className="bg-emerald-800 px-2 py-0.5 rounded text-xs font-mono text-emerald-100">[F9]</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
