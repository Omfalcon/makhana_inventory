// frontend/src/pages/salesman/SalesmanCatalogue.jsx
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import { useCart } from '../../context/CartContext';
import { useWebSocketEvent } from '../../context/WebSocketContext';
import { formatPaise } from '../../lib/formatters';
import { StockStatusBadge } from '../../components/Badge';
import { Search, Plus, Minus, ShoppingBag, ArrowRight, ScanBarcode, Zap, Check } from 'lucide-react';

export default function SalesmanCatalogue({ onNavigate }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const searchInputRef = useRef(null);

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

  // Keyboard Accelerators: F2 focuses search, F4 navigates to Cart
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        if (searchInputRef.current) searchInputRef.current.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (onNavigate) onNavigate('cart');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigate]);

  useWebSocketEvent('STOCK_UPDATED', () => loadCatalogue());
  useWebSocketEvent('STOCK_DEDUCTED', () => loadCatalogue());
  useWebSocketEvent('STOCK_RESTORED', () => loadCatalogue());
  useWebSocketEvent('PRODUCT_CREATED', () => loadCatalogue());
  useWebSocketEvent('PRODUCT_UPDATED', () => loadCatalogue());

  const filteredProducts = products.filter(p => {
    const q = search.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    if (!matchesSearch) return false;

    if (selectedCategory === 'FLAVOURED') {
      return !p.name.toLowerCase().includes('raw');
    }
    if (selectedCategory === 'RAW') {
      return p.name.toLowerCase().includes('raw');
    }
    if (selectedCategory === 'IN_STOCK') {
      return p.stock_quantity > 0;
    }
    return true;
  });

  const getItemQuantityInCart = (productId) => {
    const itm = items.find(i => i.product.id === productId);
    return itm ? itm.quantity : 0;
  };

  const flavouredCount = products.filter(p => !p.name.toLowerCase().includes('raw')).length;
  const rawCount = products.filter(p => p.name.toLowerCase().includes('raw')).length;
  const inStockCount = products.filter(p => p.stock_quantity > 0).length;

  return (
    <div className={`space-y-3.5 ${totalUnits > 0 ? 'pb-44 lg:pb-28' : 'pb-28'}`}>
      {/* POS Status Sub-bar / Key Shortcuts */}
      <div className="w-full bg-slate-100/80 px-3.5 py-2 rounded-xl flex flex-wrap items-center justify-between gap-2 border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200/90 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            <span className="font-bold text-[11px] uppercase tracking-wider text-emerald-800">
              TERMINAL #POS-01 ACTIVE
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-slate-600 font-semibold text-xs">
            <span className="bg-slate-200/70 px-2 py-0.5 rounded text-[11px] font-mono text-slate-800">
              {products.length} Makhana SKUs
            </span>
            <span className="bg-slate-200/70 px-2 py-0.5 rounded text-[11px] font-mono text-slate-800">
              {inStockCount} In Stock
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <span className="hidden md:inline text-[11px] text-slate-500 uppercase font-bold">Hotkeys:</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-200 font-mono text-[11px] text-slate-800 font-bold">[F2] Search</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-200 font-mono text-[11px] text-slate-800 font-bold">[F4] Cart</span>
          {totalUnits > 0 && (
            <button
              onClick={() => onNavigate('cart')}
              className="px-2 py-0.5 rounded bg-emerald-700 text-white font-mono text-[11px] font-bold shadow-xs hover:bg-emerald-800 transition"
            >
              [F9] Pay ({totalUnits})
            </button>
          )}
        </div>
      </div>

      {/* Barcode / Fast Search & Category Filter Strip */}
      <div className="bg-white p-2.5 xs:p-3.5 border border-slate-200/90 rounded-2xl shadow-xs space-y-2.5 xs:space-y-3">
        <div className="relative flex items-center">
          <div className="absolute left-3 xs:left-3.5 flex items-center pointer-events-none text-emerald-700">
            <ScanBarcode className="w-4.5 h-4.5 xs:w-5 xs:h-5" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search Makhana SKU, Flavour... [F2]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 xs:pl-11 pr-12 xs:pr-20 py-2 xs:py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs xs:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-inner transition"
          />
          <div className="absolute right-2.5 xs:right-3 flex items-center gap-1.5 pointer-events-none">
            <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-mono text-[9px] xs:text-[10px] font-bold uppercase">
              F2
            </span>
          </div>
        </div>

        {/* Category Scroll Strip */}
        <div className="flex items-center gap-1.5 xs:gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition flex items-center gap-1.5 shadow-xs ${
              selectedCategory === 'ALL'
                ? 'bg-emerald-700 text-white'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
            }`}
          >
            <span>All Products</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              selectedCategory === 'ALL' ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {products.length}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategory('FLAVOURED')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition flex items-center gap-1.5 shadow-xs ${
              selectedCategory === 'FLAVOURED'
                ? 'bg-emerald-700 text-white'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
            }`}
          >
            <span>Flavoured Makhana</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              selectedCategory === 'FLAVOURED' ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {flavouredCount}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategory('RAW')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition flex items-center gap-1.5 shadow-xs ${
              selectedCategory === 'RAW'
                ? 'bg-emerald-700 text-white'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
            }`}
          >
            <span>Raw Makhana Grade</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              selectedCategory === 'RAW' ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {rawCount}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategory('IN_STOCK')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition flex items-center gap-1.5 shadow-xs ${
              selectedCategory === 'IN_STOCK'
                ? 'bg-emerald-700 text-white'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
            }`}
          >
            <span>In Stock Only</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              selectedCategory === 'IN_STOCK' ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {inStockCount}
            </span>
          </button>
        </div>
      </div>

      {/* Catalogue List / Grid */}
      {loading ? (
        <div className="p-10 text-center text-slate-600 font-semibold bg-white border border-slate-200 rounded-2xl text-sm shadow-xs">
          Loading products...
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 text-rose-900 border border-rose-200 rounded-2xl text-sm font-semibold">{error}</div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-8 text-center text-slate-700 bg-white border border-slate-200 rounded-2xl font-semibold shadow-xs">
          No products found matching "{search}"
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredProducts.map((product) => {
            const qtyInCart = getItemQuantityInCart(product.id);
            const isOutOfStock = product.stock_quantity <= 0;
            const isLowStock = !isOutOfStock && product.stock_quantity <= product.low_stock_threshold;

            return (
              <div
                key={product.id}
                className={`p-4 rounded-2xl border transition-all shadow-xs flex flex-col justify-between group relative overflow-hidden ${
                  qtyInCart > 0
                    ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-400/40 shadow-sm'
                    : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-md'
                }`}
              >
                {/* Top Badge: Stock status pill */}
                <div className="flex justify-between items-start gap-2">
                  <span className="font-mono text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    {product.sku} • GST {product.gst_rate || 12}%
                  </span>

                  {isOutOfStock ? (
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold uppercase">
                      0 pkts
                    </span>
                  ) : isLowStock ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold uppercase">
                      {product.stock_quantity} pkts left
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase">
                      {product.stock_quantity} pkts
                    </span>
                  )}
                </div>

                {/* Product Name */}
                <div className="mt-2 flex-1">
                  <h3 className="font-bold text-slate-900 text-base group-hover:text-emerald-800 transition-colors leading-snug">
                    {product.name}
                  </h3>
                  <span className="text-xs text-slate-500 font-medium block mt-0.5">
                    Premium Foxnut Pouch
                  </span>
                </div>

                {/* Price & Fast Add Row */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 block font-bold uppercase">Rate</span>
                    <span className="text-xl font-black text-slate-900 font-mono tracking-tight">
                      {formatPaise(product.selling_price_paise)}
                    </span>
                  </div>

                  {/* Quantity Controller / Quick Add */}
                  {isOutOfStock ? (
                    <button
                      disabled
                      className="px-3 py-2 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl text-xs font-bold cursor-not-allowed uppercase"
                    >
                      Out of Stock
                    </button>
                  ) : qtyInCart === 0 ? (
                    <button
                      onClick={() => addToCart(product, 1)}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition active:scale-95 uppercase shadow-xs group-hover:scale-105"
                      title="Quick Add"
                    >
                      <Plus className="w-4 h-4 text-amber-300" />
                      <span>Add</span>
                    </button>
                  ) : (
                    <div className="flex items-center bg-white border border-emerald-300 rounded-xl overflow-hidden shadow-xs ring-1 ring-emerald-400/30">
                      <button
                        type="button"
                        onClick={() => updateQuantity(product.id, qtyInCart - 1)}
                        className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold border-r border-slate-200 transition"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <div className="w-9 text-center bg-white">
                        <span className="block font-bold text-sm text-emerald-900 font-mono">{qtyInCart}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (qtyInCart < product.stock_quantity) {
                            updateQuantity(product.id, qtyInCart + 1);
                          }
                        }}
                        disabled={qtyInCart >= product.stock_quantity}
                        className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold border-l border-slate-200 transition disabled:opacity-30"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky Bottom Billing & Settlement Trigger Bar */}
      {totalUnits > 0 && (
        <div className="fixed bottom-15 xs:bottom-16 lg:bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/90 p-2 xs:p-2.5 sm:p-4 shadow-2xl no-print">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 xs:gap-3">
            <div className="flex items-center gap-2 xs:gap-3 min-w-0">
              <div className="w-8 h-8 xs:w-10 xs:h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-xs xs:text-sm shadow-xs shrink-0">
                {totalUnits}
              </div>
              <div className="min-w-0">
                <span className="text-[9.5px] xs:text-[11px] font-bold uppercase tracking-wider text-slate-500 block truncate">
                  Total (Incl. GST)
                </span>
                <span className="text-base xs:text-xl sm:text-2xl font-black font-mono text-slate-900 truncate block">
                  {formatPaise(subtotalPaise)}
                </span>
              </div>
            </div>

            <button
              onClick={() => onNavigate('cart')}
              className="flex items-center gap-1.5 xs:gap-2 py-2 xs:py-3 px-2.5 xs:px-5 sm:px-7 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs xs:text-sm sm:text-base rounded-xl transition uppercase shadow-md active:scale-98 shrink-0"
            >
              <span className="hidden xs:inline">REVIEW BILL &amp; PAY</span>
              <span className="xs:hidden">PAY NOW</span>
              <span className="hidden sm:inline bg-emerald-800/80 px-2 py-0.5 rounded text-xs font-mono text-emerald-100">[F9]</span>
              <ArrowRight className="w-4 h-4 xs:w-5 xs:h-5 text-amber-300" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
