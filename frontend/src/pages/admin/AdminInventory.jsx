// frontend/src/pages/admin/AdminInventory.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatPaise, formatDateTime } from '../../lib/formatters';
import { StockStatusBadge } from '../../components/Badge';
import Modal from '../../components/Modal';
import { useWebSocketEvent } from '../../context/WebSocketContext';
import {
  Boxes,
  Plus,
  Edit2,
  History,
  AlertTriangle,
  Search,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  PackagePlus,
  ShoppingBag,
  ArrowRight,
  Filter,
  BarChart3,
  Layers
} from 'lucide-react';

export default function AdminInventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // ALL | LOW_STOCK | ACTIVE | INACTIVE

  // Modals state
  const [adjustingProduct, setAdjustingProduct] = useState(null);
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustType, setAdjustType] = useState('ADDITION');
  const [adjustReason, setAdjustReason] = useState('');

  const [editingProduct, setEditingProduct] = useState(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    sellingPriceInr: '',
    lowStockThreshold: 10,
    gstRate: 12.00,
    hsnCode: '19041090'
  });

  const [showMovementsModal, setShowMovementsModal] = useState(false);
  const [movements, setMovements] = useState([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementTab, setMovementTab] = useState('ALL');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await api.inventory.getProducts();
      setProducts(res.products || []);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useWebSocketEvent('STOCK_UPDATED', () => loadProducts());
  useWebSocketEvent('STOCK_DEDUCTED', () => loadProducts());
  useWebSocketEvent('STOCK_RESTORED', () => loadProducts());
  useWebSocketEvent('PRODUCT_CREATED', () => loadProducts());
  useWebSocketEvent('PRODUCT_UPDATED', () => loadProducts());
  useWebSocketEvent('ORDER_CREATED', () => loadProducts());

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const qty = parseInt(adjustQuantity, 10);
    if (isNaN(qty) || qty === 0) {
      setErrorMsg('Please enter a valid non-zero quantity.');
      return;
    }

    if (!adjustReason.trim()) {
      setErrorMsg('A detailed reason is mandatory for stock adjustment.');
      return;
    }

    try {
      setSaving(true);
      await api.inventory.adjustStock({
        productId: adjustingProduct.id,
        quantityChange: qty,
        reason: adjustReason.trim(),
        movementType: adjustType
      });

      setAdjustingProduct(null);
      setAdjustQuantity('');
      setAdjustReason('');
      await loadProducts();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to adjust stock');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProductEdit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      setSaving(true);
      await api.inventory.updateProduct(editingProduct.id, {
        name: editingProduct.name,
        sku: editingProduct.sku,
        sellingPricePaise: Math.round(parseFloat(editingProduct.sellingPriceInr) * 100),
        lowStockThreshold: parseInt(editingProduct.low_stock_threshold, 10),
        gstRate: parseFloat(editingProduct.gst_rate),
        isActive: editingProduct.is_active
      });

      setEditingProduct(null);
      await loadProducts();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!newProduct.name || !newProduct.sku || !newProduct.sellingPriceInr) {
      setErrorMsg('Product name, SKU, and selling price are required.');
      return;
    }

    try {
      setSaving(true);
      await api.inventory.createProduct({
        name: newProduct.name,
        sku: newProduct.sku,
        sellingPricePaise: Math.round(parseFloat(newProduct.sellingPriceInr) * 100),
        lowStockThreshold: parseInt(newProduct.lowStockThreshold, 10),
        gstRate: parseFloat(newProduct.gstRate),
        hsnCode: newProduct.hsnCode
      });

      setShowAddProductModal(false);
      setNewProduct({
        name: '',
        sku: '',
        sellingPriceInr: '',
        lowStockThreshold: 10,
        gstRate: 12.00,
        hsnCode: '19041090'
      });
      await loadProducts();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create product');
    } finally {
      setSaving(false);
    }
  };

  const openMovements = async (productId = null) => {
    try {
      setMovementTab('ALL');
      setShowMovementsModal(true);
      setMovementsLoading(true);
      const res = await api.inventory.getMovements(productId);
      setMovements(res.movements || []);
    } catch (err) {
      console.error('Failed to load stock movements audit:', err);
    } finally {
      setMovementsLoading(false);
    }
  };

  const addedCount = movements.filter((m) => (m.quantity_change || 0) > 0).length;
  const soldCount = movements.filter((m) => (m.quantity_change || 0) < 0).length;

  const displayedMovements = movements.filter((m) => {
    if (movementTab === 'ADDED') return (m.quantity_change || 0) > 0;
    if (movementTab === 'SOLD') return (m.quantity_change || 0) < 0;
    return true;
  });

  // KPI Calculations
  const totalUnitsOnHand = products.reduce((sum, p) => sum + (p.stock_quantity || 0), 0);
  const lowStockCount = products.filter(p => p.stock_quantity <= p.low_stock_threshold).length;
  const activeProductsCount = products.filter(p => p.is_active).length;

  const filteredProducts = products.filter(p => {
    const q = search.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    if (!matchesSearch) return false;

    if (filterType === 'LOW_STOCK') return p.stock_quantity <= p.low_stock_threshold;
    if (filterType === 'ACTIVE') return p.is_active;
    if (filterType === 'INACTIVE') return !p.is_active;
    return true;
  });

  return (
    <div className="space-y-4 pb-12">
      {/* Petpooja Inventory Terminal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <Boxes className="w-5 h-5 text-emerald-700" />
              <span>Inventory &amp; Stock Register</span>
            </h2>
            <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              LIVE SYNC
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Petpooja Retail ERP • Central warehouse stock ledger, batch reorders &amp; GST rates
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openMovements()}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-300 text-slate-700 text-xs font-bold uppercase rounded-xl hover:bg-slate-50 transition shadow-2xs"
          >
            <History className="w-4 h-4 text-slate-500" />
            <span>Audit Trail</span>
          </button>
          <button
            onClick={() => {
              setErrorMsg('');
              setShowAddProductModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold uppercase transition shadow-xs active:scale-98"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            <span>+ Add SKU</span>
          </button>
        </div>
      </div>

      {/* Petpooja 4-Metric Tiles Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Active SKUs</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black font-mono text-slate-900 tabular-nums">{activeProductsCount}</span>
            <span className="text-xs text-slate-400 font-mono">of {products.length} total</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Units on Hand</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black font-mono text-emerald-900 tabular-nums">{totalUnitsOnHand}</span>
            <span className="text-xs font-mono text-emerald-700 font-bold">Packets</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Low Stock Alerts</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className={`text-2xl font-black font-mono tabular-nums ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {lowStockCount}
            </span>
            <span className="text-xs text-amber-700 font-bold">Needs restock</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Standard Tax Class</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black font-mono text-slate-900">12%</span>
            <span className="text-xs font-mono text-slate-500">GST (Makhana)</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by product title or SKU barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5 text-xs font-bold pt-1">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-lg border transition ${
              filterType === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            All SKUs ({products.length})
          </button>
          <button
            onClick={() => setFilterType('LOW_STOCK')}
            className={`px-3 py-1.5 rounded-lg border transition ${
              filterType === 'LOW_STOCK'
                ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-50'
            }`}
          >
            ● Low Stock Breaches ({lowStockCount})
          </button>
          <button
            onClick={() => setFilterType('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg border transition ${
              filterType === 'ACTIVE'
                ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            Active Counter Items
          </button>
          <button
            onClick={() => setFilterType('INACTIVE')}
            className={`px-3 py-1.5 rounded-lg border transition ${
              filterType === 'INACTIVE'
                ? 'bg-slate-700 text-white border-slate-700 shadow-2xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Archived / Inactive
          </button>
        </div>
      </div>

      {/* Products Grid (Petpooja SKU Card Design) */}
      {loading && products.length === 0 ? (
        <div className="p-12 text-center text-slate-500 font-semibold bg-white border border-slate-200 rounded-2xl shadow-xs">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-700 mx-auto mb-2" />
          <span>Synchronizing warehouse inventory...</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-12 text-center text-slate-600 bg-white border border-slate-200 rounded-2xl font-semibold shadow-xs">
          No inventory products match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProducts.map((p) => {
            const isLowStock = p.stock_quantity <= p.low_stock_threshold;
            const isOut = p.stock_quantity === 0;

            return (
              <div
                key={p.id}
                className={`bg-white border rounded-2xl shadow-xs overflow-hidden transition relative flex flex-col justify-between ${
                  !p.is_active
                    ? 'border-slate-200 opacity-60'
                    : isOut
                    ? 'border-rose-300'
                    : isLowStock
                    ? 'border-amber-300 ring-1 ring-amber-300/40'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                {/* Petpooja Top Indicator Stripe */}
                <div
                  className={`h-1.5 w-full ${
                    !p.is_active
                      ? 'bg-slate-300'
                      : isOut
                      ? 'bg-rose-500'
                      : isLowStock
                      ? 'bg-amber-500'
                      : 'bg-emerald-600'
                  }`}
                />

                <div className="p-4 sm:p-5 space-y-3 flex-1">
                  {/* Card Header */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-slate-900 text-base leading-snug truncate">
                          {p.name}
                        </h3>
                        {!p.is_active && (
                          <span className="text-[10px] bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded uppercase">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {p.sku}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-xs text-slate-500 font-medium">
                          GST {p.gst_rate}%
                        </span>
                      </div>
                    </div>
                    <StockStatusBadge stock={p.stock_quantity} threshold={p.low_stock_threshold} />
                  </div>

                  {/* High-Density Metric Grid */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50/80 border border-slate-200/70 rounded-xl text-center">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Rate / Unit</span>
                      <span className="font-mono font-bold text-sm text-slate-900 tabular-nums">
                        {formatPaise(p.selling_price_paise)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Available</span>
                      <span className={`font-mono font-black text-sm tabular-nums ${isOut ? 'text-rose-600' : isLowStock ? 'text-amber-700' : 'text-emerald-800'}`}>
                        {p.stock_quantity} pkts
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Alert Mark</span>
                      <span className="font-mono font-semibold text-xs text-slate-600 tabular-nums">
                        {p.low_stock_threshold} pkts
                      </span>
                    </div>
                  </div>
                </div>

                {/* Petpooja Bottom Action Bar */}
                <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => openMovements(p.id)}
                    className="text-[11px] text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1 uppercase transition"
                    title="Audit History"
                  >
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    <span>Audit Log</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setEditingProduct({
                          ...p,
                          sellingPriceInr: (p.selling_price_paise / 100).toFixed(2)
                        });
                        setErrorMsg('');
                      }}
                      className="px-2.5 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-bold text-xs uppercase hover:bg-slate-100 transition shadow-2xs flex items-center gap-1"
                      title="Edit Product Master"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => {
                        setAdjustingProduct(p);
                        setAdjustQuantity('');
                        setAdjustReason('');
                        setAdjustType('ADDITION');
                        setErrorMsg('');
                      }}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase rounded-lg transition shadow-2xs flex items-center gap-1.5 active:scale-98"
                      title="Adjust Stock Quantity"
                    >
                      <Boxes className="w-3.5 h-3.5 text-amber-300" />
                      <span>Adjust</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Adjust Stock Modal */}
      <Modal
        isOpen={Boolean(adjustingProduct)}
        onClose={() => {
          if (!saving) setAdjustingProduct(null);
        }}
        title={`Petpooja Stock Adjustment: ${adjustingProduct?.name || ''}`}
      >
        {adjustingProduct && (
          <form onSubmit={handleAdjustStock} className="space-y-4">
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex justify-between items-center text-xs font-semibold">
              <span className="text-slate-500">Current Warehouse Stock:</span>
              <span className="font-mono font-bold text-slate-900 text-sm bg-white px-2.5 py-1 rounded border border-slate-200">
                {adjustingProduct.stock_quantity} units
              </span>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-950 text-xs font-semibold rounded-xl">
                {errorMsg}
              </div>
            )}

            {/* Quick Adjustment Presets */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Quantity to Add (Units) *
              </label>
              <input
                type="number"
                min="1"
                required
                placeholder="e.g. 50"
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-base font-mono font-bold focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs"
              />
              <div className="flex gap-2 mt-2">
                {[10, 25, 50, 100].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAdjustQuantity(String(amt))}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-bold text-xs rounded-lg border border-slate-300 transition"
                  >
                    +{amt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Reason / Batch Note (Mandatory) *
              </label>
              <textarea
                required
                rows={2}
                placeholder="e.g. Supplier Shipment Recd, Godown Audit, Roasting Batch #24"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdjustingProduct(null)}
                disabled={saving}
                className="py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs uppercase rounded-xl hover:bg-slate-50 transition shadow-2xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase rounded-xl transition shadow-xs disabled:opacity-50"
              >
                {saving ? 'Updating...' : 'Save Stock'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={Boolean(editingProduct)}
        onClose={() => {
          if (!saving) setEditingProduct(null);
        }}
        title="Edit SKU Master Details"
      >
        {editingProduct && (
          <form onSubmit={handleSaveProductEdit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-950 text-xs font-semibold rounded-xl">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Product Title
              </label>
              <input
                type="text"
                required
                value={editingProduct.name}
                onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  SKU Code
                </label>
                <input
                  type="text"
                  required
                  value={editingProduct.sku}
                  onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono uppercase font-bold focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Selling Price (₹ INR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editingProduct.sellingPriceInr}
                  onChange={(e) => setEditingProduct({ ...editingProduct, sellingPriceInr: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Low Stock Threshold (Units)
              </label>
              <input
                type="number"
                required
                value={editingProduct.low_stock_threshold}
                onChange={(e) => setEditingProduct({ ...editingProduct, low_stock_threshold: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <label className="flex items-center gap-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={editingProduct.is_active}
                onChange={(e) => setEditingProduct({ ...editingProduct, is_active: e.target.checked })}
                className="w-4 h-4 text-emerald-700 rounded focus:ring-emerald-600"
              />
              <span className="font-bold text-slate-800">
                Product is active on POS terminal
              </span>
            </label>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                disabled={saving}
                className="py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs uppercase rounded-xl hover:bg-slate-50 transition shadow-2xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase rounded-xl transition shadow-xs"
              >
                {saving ? 'Saving...' : 'Update Product'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Add New Product Modal */}
      <Modal
        isOpen={showAddProductModal}
        onClose={() => {
          if (!saving) setShowAddProductModal(false);
        }}
        title="Create New Makhana SKU"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-950 text-xs font-semibold rounded-xl">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Product Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. ROASTED MAKHANA 50GM SALTED"
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold uppercase focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Unique SKU *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. RM-SALT-50"
                value={newProduct.sku}
                onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono uppercase font-bold focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Selling Price (₹ INR) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="e.g. 180"
                value={newProduct.sellingPriceInr}
                onChange={(e) => setNewProduct({ ...newProduct, sellingPriceInr: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Low Stock Alert Threshold (Units)
            </label>
            <input
              type="number"
              value={newProduct.lowStockThreshold}
              onChange={(e) => setNewProduct({ ...newProduct, lowStockThreshold: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div className="p-3 bg-amber-50/80 border border-amber-200 text-amber-950 text-xs font-semibold rounded-xl">
            Product will be created with starting stock 0. You can then use "Adjust Stock" to enter warehouse inventory.
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddProductModal(false)}
              disabled={saving}
              className="py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs uppercase rounded-xl hover:bg-slate-50 transition shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase rounded-xl transition shadow-xs"
            >
              {saving ? 'Creating...' : 'Create SKU'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Stock Movements Audit Modal */}
      <Modal
        isOpen={showMovementsModal}
        onClose={() => setShowMovementsModal(false)}
        title="Stock Movements Audit Log"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-3">
          <div className="flex p-1 bg-slate-100 border border-slate-200 rounded-xl gap-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setMovementTab('ALL')}
              className={`flex-1 py-2 rounded-lg uppercase transition ${
                movementTab === 'ALL' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({movements.length})
            </button>
            <button
              type="button"
              onClick={() => setMovementTab('ADDED')}
              className={`flex-1 py-2 rounded-lg uppercase flex items-center justify-center gap-1 transition ${
                movementTab === 'ADDED' ? 'bg-emerald-700 text-white shadow-2xs' : 'text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Added ({addedCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setMovementTab('SOLD')}
              className={`flex-1 py-2 rounded-lg uppercase flex items-center justify-center gap-1 transition ${
                movementTab === 'SOLD' ? 'bg-rose-700 text-white shadow-2xs' : 'text-rose-800 hover:bg-rose-50'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              <span>Sold ({soldCount})</span>
            </button>
          </div>

          {movementsLoading ? (
            <div className="p-8 text-center text-slate-500 font-semibold text-xs">Loading audit records...</div>
          ) : displayedMovements.length === 0 ? (
            <div className="p-8 text-center text-slate-600 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold">
              No stock movements recorded in this filter.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden text-xs max-h-[60vh] overflow-y-auto bg-white shadow-xs">
              {displayedMovements.map((m) => {
                const isAdded = (m.quantity_change || 0) > 0;
                return (
                  <div
                    key={m.id}
                    className={`p-3.5 flex justify-between items-start bg-white border-l-4 transition hover:bg-slate-50/50 ${
                      isAdded ? 'border-l-emerald-600' : 'border-l-rose-500'
                    }`}
                  >
                    <div className="space-y-0.5 flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {m.product?.name || 'Product'}
                        </span>
                        {m.product?.sku && (
                          <span className="font-mono text-xs font-semibold text-slate-500">
                            ({m.product.sku})
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-700 block font-semibold">
                        Reason: {m.reason}
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        Operator: {m.actor?.full_name || 'System'} • {formatDateTime(m.created_at)}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`font-mono font-black text-base block ${
                          isAdded ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {isAdded ? `+${m.quantity_change}` : m.quantity_change} pkts
                      </span>
                      <span className="text-xs text-slate-500 font-mono font-semibold block">
                        {m.stock_before} → {m.stock_after}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
