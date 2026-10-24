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
  Filter
} from 'lucide-react';

export default function AdminInventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals state
  const [adjustingProduct, setAdjustingProduct] = useState(null);
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustType, setAdjustType] = useState('ADDITION'); // ADDITION or CORRECTION
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
  const [movementTab, setMovementTab] = useState('ALL'); // 'ALL' | 'ADDED' | 'SOLD'

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

  // Realtime updates via WebSocket
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

  const filteredProducts = products.filter(p => {
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4 pb-24">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900">Inventory Management</h2>
          <p className="text-xs text-slate-500 font-medium">Stock levels, pricing, adjustments & audits</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openMovements()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 shadow-xs transition"
          >
            <History className="w-4 h-4 text-slate-500" />
            <span>Audit History</span>
          </button>
          <button
            onClick={() => {
              setErrorMsg('');
              setShowAddProductModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-xl text-xs font-bold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by product name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none shadow-xs"
        />
      </div>

      {/* Products List */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 text-sm">Loading inventory...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
          No products found.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              className={`p-4 rounded-2xl border transition-all shadow-xs space-y-3 ${
                !p.is_active
                  ? 'bg-slate-50/60 border-slate-200 opacity-60'
                  : p.stock_quantity <= p.low_stock_threshold
                  ? 'bg-amber-50/20 border-amber-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">{p.name}</h3>
                    {!p.is_active && (
                      <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs text-slate-400 block mt-0.5">{p.sku}</span>
                </div>
                <StockStatusBadge stock={p.stock_quantity} threshold={p.low_stock_threshold} />
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Selling Price</span>
                  <span className="font-mono font-bold text-xs sm:text-sm text-slate-900">
                    {formatPaise(p.selling_price_paise)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Available Stock</span>
                  <span className={`font-mono font-bold text-xs sm:text-sm ${p.stock_quantity === 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                    {p.stock_quantity} pkts
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Low Threshold</span>
                  <span className="font-mono font-semibold text-xs text-slate-600">
                    {p.low_stock_threshold} pkts
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-1 flex items-center justify-between gap-2">
                <button
                  onClick={() => openMovements(p.id)}
                  className="text-xs text-slate-500 hover:text-slate-900 font-medium flex items-center gap-1"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Audit Logs</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingProduct({
                        ...p,
                        sellingPriceInr: (p.selling_price_paise / 100).toFixed(2)
                      });
                      setErrorMsg('');
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
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
                    className="px-3 py-1.5 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs rounded-xl transition flex items-center gap-1 shadow-xs"
                  >
                    <Boxes className="w-3.5 h-3.5" />
                    <span>Adjust Stock</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Adjust Stock Modal */}
      <Modal
        isOpen={Boolean(adjustingProduct)}
        onClose={() => {
          if (!saving) setAdjustingProduct(null);
        }}
        title={`Adjust Stock: ${adjustingProduct?.name || ''}`}
      >
        {adjustingProduct && (
          <form onSubmit={handleAdjustStock} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between text-xs">
              <span className="text-slate-500">Current Available:</span>
              <span className="font-mono font-bold text-slate-900">{adjustingProduct.stock_quantity} units</span>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                {errorMsg}
              </div>
            )}

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
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:ring-2 focus:ring-brand-600 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Enter quantity received to add to available stock
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Mandatory Reason *
              </label>
              <textarea
                required
                rows={2}
                placeholder="e.g. New consignment arrival, physical warehouse count discrepancy, damaged packet disposal"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-600 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdjustingProduct(null)}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs transition"
              >
                {saving ? 'Updating Stock...' : 'Save Adjustment'}
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
        title="Edit Product Details"
      >
        {editingProduct && (
          <form onSubmit={handleSaveProductEdit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Product Name
              </label>
              <input
                type="text"
                required
                value={editingProduct.name}
                onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  SKU (Unique)
                </label>
                <input
                  type="text"
                  required
                  value={editingProduct.sku}
                  onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono uppercase"
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Low Stock Warning Threshold (Units)
              </label>
              <input
                type="number"
                required
                value={editingProduct.low_stock_threshold}
                onChange={(e) => setEditingProduct({ ...editingProduct, low_stock_threshold: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
              />
            </div>

            <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={editingProduct.is_active}
                onChange={(e) => setEditingProduct({ ...editingProduct, is_active: e.target.checked })}
                className="rounded text-brand-600 focus:ring-brand-500"
              />
              <span className="font-semibold text-slate-800">
                Product is active (uncheck to deactivate without breaking historical orders)
              </span>
            </label>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs transition"
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
        title="Add New Makhana Product"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
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
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold uppercase"
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
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono uppercase"
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
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Low Stock Warning Threshold (Units)
            </label>
            <input
              type="number"
              value={newProduct.lowStockThreshold}
              onChange={(e) => setNewProduct({ ...newProduct, lowStockThreshold: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
            />
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
            <strong>Initial Stock:</strong> Product will be created with initial stock 0. Once created, use "Adjust Stock" to enter verified starting inventory.
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddProductModal(false)}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs transition"
            >
              {saving ? 'Creating...' : 'Create Product'}
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
          {/* Simple Tab Filter: All | Added | Sales */}
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setMovementTab('ALL')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                movementTab === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All ({movements.length})
            </button>
            <button
              type="button"
              onClick={() => setMovementTab('ADDED')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                movementTab === 'ADDED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Added ({addedCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setMovementTab('SOLD')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                movementTab === 'SOLD'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Sales / Sold ({soldCount})</span>
            </button>
          </div>

          {/* Movements List */}
          {movementsLoading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading audit records...</div>
          ) : displayedMovements.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
              {movementTab === 'ADDED'
                ? 'No stock addition logs recorded.'
                : movementTab === 'SOLD'
                ? 'No sales or deduction logs recorded.'
                : 'No stock movements recorded yet.'}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs max-h-[60vh] overflow-y-auto">
              {displayedMovements.map((m) => {
                const isAdded = (m.quantity_change || 0) > 0;
                return (
                  <div
                    key={m.id}
                    className={`p-3 flex justify-between items-start hover:bg-slate-50 transition border-l-4 ${
                      isAdded ? 'border-l-emerald-500' : 'border-l-rose-500'
                    }`}
                  >
                    <div className="space-y-0.5 flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 truncate">
                          {m.product?.name || 'Product'}
                        </span>
                        {m.product?.sku && (
                          <span className="font-mono text-[10px] text-slate-400 shrink-0">
                            ({m.product.sku})
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 block font-mono">
                        Reason: {m.reason}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Actor: {m.actor?.full_name || 'System'} • {formatDateTime(m.created_at)}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`font-mono font-bold text-sm block ${
                          isAdded ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isAdded ? `+${m.quantity_change}` : m.quantity_change} pkts
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono block">
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
