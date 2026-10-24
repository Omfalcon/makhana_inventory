// frontend/src/pages/salesman/SalesmanCatalogue.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useCart } from '../../context/CartContext';
import { useWebSocketEvent } from '../../context/WebSocketContext';
import { formatPaise } from '../../lib/formatters';
import { StockStatusBadge } from '../../components/Badge';
import { Search, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';

export default function SalesmanCatalogue({ onNavigate }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);

  const { items, addToCart, updateQuantity, totalUnits, subtotalPaise } = useCart();

  const loadCatalogue = async () => {
    try {
      setLoading(true);
      const res = await api.inventory.getProducts();
      setProducts(res.products || []);
    } catch (err) {
      setError(err.message || 'Failed to load catalogue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalogue();
  }, []);

  // Realtime live sync for stock changes
  useWebSocketEvent('STOCK_UPDATED', () => loadCatalogue());
  useWebSocketEvent('STOCK_DEDUCTED', () => loadCatalogue());
  useWebSocketEvent('STOCK_RESTORED', () => loadCatalogue());
  useWebSocketEvent('PRODUCT_CREATED', () => loadCatalogue());
  useWebSocketEvent('PRODUCT_UPDATED', () => loadCatalogue());

  const filteredProducts = products.filter(p => {
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });

  const getItemQuantityInCart = (productId) => {
    const itm = items.find(i => i.product.id === productId);
    return itm ? itm.quantity : 0;
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Search Header */}
      <div className="sticky top-16 z-20 bg-slate-50 pt-2 pb-2">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by makhana name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 shadow-xs"
          />
        </div>
      </div>


      {/* Catalogue List */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 text-sm">Loading catalogue...</div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
          No products found matching "{search}"
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredProducts.map((product) => {
            const qtyInCart = getItemQuantityInCart(product.id);
            const isOutOfStock = product.stock_quantity <= 0;

            return (
              <div
                key={product.id}
                className={`p-4 rounded-xl border transition-all ${
                  qtyInCart > 0
                    ? 'bg-brand-50/40 border-brand-300 shadow-xs'
                    : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                      {product.name}
                    </h3>
                    <span className="font-mono text-xs text-slate-400 block mt-0.5">
                      {product.sku}
                    </span>
                  </div>
                  <StockStatusBadge stock={product.stock_quantity} threshold={product.low_stock_threshold} />
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Selling Price</span>
                    <span className="text-base font-extrabold text-slate-900 font-mono">
                      {formatPaise(product.selling_price_paise)}
                    </span>
                  </div>

                  {/* Quantity Controller */}
                  {isOutOfStock ? (
                    <button
                      disabled
                      className="px-3 py-2 bg-slate-100 text-slate-400 rounded-lg text-xs font-semibold cursor-not-allowed"
                    >
                      Out of Stock
                    </button>
                  ) : qtyInCart === 0 ? (
                    <button
                      onClick={() => addToCart(product, 1)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-brand-700 hover:bg-brand-800 active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add</span>
                    </button>
                  ) : (
                    <div className="flex items-center bg-white border border-brand-400 rounded-xl shadow-xs overflow-hidden">
                      <button
                        onClick={() => updateQuantity(product.id, qtyInCart - 1)}
                        className="w-9 h-9 flex items-center justify-center text-brand-800 hover:bg-brand-50 active:bg-brand-100 font-bold transition"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-9 text-center font-bold text-sm text-slate-900">
                        {qtyInCart}
                      </span>
                      <button
                        onClick={() => {
                          if (qtyInCart < product.stock_quantity) {
                            updateQuantity(product.id, qtyInCart + 1);
                          }
                        }}
                        disabled={qtyInCart >= product.stock_quantity}
                        className="w-9 h-9 flex items-center justify-center text-brand-800 hover:bg-brand-50 active:bg-brand-100 font-bold transition disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Persistent Place Order Bar */}
      {totalUnits > 0 && (
        <div className="fixed bottom-20 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-40">
          <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl flex items-center justify-between border border-slate-700 animate-slide-up">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium block">
                  {totalUnits} {totalUnits === 1 ? 'item' : 'items'} selected
                </span>
                <span className="font-bold text-sm sm:text-base font-mono">
                  {formatPaise(subtotalPaise)}
                </span>
              </div>
            </div>

            <button
              onClick={() => onNavigate('cart')}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm px-4 py-2.5 rounded-xl transition active:scale-95 shadow-md"
            >
              <span>Review Cart</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
