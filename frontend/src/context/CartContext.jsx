// frontend/src/context/CartContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'makhana_salesman_cart_v1';

export function CartProvider({ children }) {
  // Load initial cart from sessionStorage to preserve draft cart during active session
  const [items, setItems] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [customerInfo, setCustomerInfo] = useState(() => {
    try {
      const saved = sessionStorage.getItem(`${STORAGE_KEY}_customer`);
      return saved ? JSON.parse(saved) : {
        customerName: '',
        customerPhone: '',
        customerAddress: '',
        customerState: 'Bihar',
        customerStateCode: '10',
        customerGstin: ''
      };
    } catch {
      return {
        customerName: '',
        customerPhone: '',
        customerAddress: '',
        customerState: 'Bihar',
        customerStateCode: '10',
        customerGstin: ''
      };
    }
  });

  // Sync to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Could not persist cart to sessionStorage', e);
    }
  }, [items]);

  useEffect(() => {
    try {
      sessionStorage.setItem(`${STORAGE_KEY}_customer`, JSON.stringify(customerInfo));
    } catch (e) {
      console.warn('Could not persist customer info', e);
    }
  }, [customerInfo]);

  // Add item or increment
  const addToCart = (product, quantity = 1) => {
    if (!product || product.stock_quantity <= 0) return false;

    setItems(prevItems => {
      const existingIndex = prevItems.findIndex(i => i.product.id === product.id);
      if (existingIndex > -1) {
        const currentQty = prevItems[existingIndex].quantity;
        const newQty = Math.min(currentQty + quantity, product.stock_quantity);
        const updated = [...prevItems];
        updated[existingIndex] = { ...updated[existingIndex], quantity: newQty };
        return updated;
      } else {
        const safeQty = Math.min(quantity, product.stock_quantity);
        return [...prevItems, { product, quantity: safeQty }];
      }
    });
    return true;
  };

  // Set exact quantity
  const updateQuantity = (productId, quantity) => {
    setItems(prevItems => {
      if (quantity <= 0) {
        return prevItems.filter(i => i.product.id !== productId);
      }
      return prevItems.map(i => {
        if (i.product.id === productId) {
          const maxStock = i.product.stock_quantity || 0;
          return { ...i, quantity: Math.min(quantity, maxStock) };
        }
        return i;
      });
    });
  };

  // Remove single item
  const removeFromCart = (productId) => {
    setItems(prevItems => prevItems.filter(i => i.product.id !== productId));
  };

  // Clear entire cart
  const clearCart = () => {
    setItems([]);
    setCustomerInfo({
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      customerState: 'Bihar',
      customerStateCode: '10',
      customerGstin: ''
    });
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(`${STORAGE_KEY}_customer`);
    } catch (e) {}
  };

  // Calculate totals
  const totalUnits = items.reduce((sum, item) => sum + (item?.quantity || 0), 0);
  const subtotalPaise = items.reduce((sum, item) => {
    const price = item?.product?.price_paise ?? item?.product?.selling_price_paise ?? 0;
    return sum + (price * (item?.quantity || 0));
  }, 0);

  const value = {
    items,
    totalUnits,
    subtotalPaise,
    customerInfo,
    setCustomerInfo,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
