// frontend/src/lib/api.js
import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function fetchWithAuth(endpoint, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || data.error || `HTTP error ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // Auth
  auth: {
    getMe: () => fetchWithAuth('/auth/me'),
    getSalesmen: () => fetchWithAuth('/auth/salesmen'),
    createSalesman: (payload) => fetchWithAuth('/auth/create-salesman', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    toggleSalesmanStatus: (id, isActive) => fetchWithAuth(`/auth/salesman/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive })
    }),
    changeSalesmanPassword: (id, password) => fetchWithAuth(`/auth/salesman/${id}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ password })
    }),
    updateSalesman: (id, payload) => fetchWithAuth(`/auth/salesman/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),
    resolveSalesmanPhone: (phone) => fetchWithAuth('/auth/resolve-salesman-phone', {
      method: 'POST',
      body: JSON.stringify({ phone })
    }),
    resetPassword: (identifier, newPassword) => fetchWithAuth('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ identifier, newPassword })
    })
  },

  // Orders
  orders: {
    place: (orderData) => fetchWithAuth('/orders/place', {
      method: 'POST',
      body: JSON.stringify(orderData)
    }),
    list: (params = {}) => {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.append(k, v);
      });
      return fetchWithAuth(`/orders?${query.toString()}`);
    },
    getById: (id) => fetchWithAuth(`/orders/${id}`),
    updateStatus: (id, newStatus, failureReason) => fetchWithAuth(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ newStatus, failureReason })
    }),
    cancel: (id, reason, restock = true) => fetchWithAuth(`/orders/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason, restock })
    }),
    lookupCustomer: async (phone) => {
      try {
        const res = await fetchWithAuth(`/orders/customer-lookup?phone=${encodeURIComponent(phone)}`);
        return res;
      } catch (err) {
        // Fallback: If 404 (e.g. server hasn't been restarted), search via /orders?search=
        if (err.status === 404) {
          try {
            const listRes = await fetchWithAuth(`/orders?search=${encodeURIComponent(phone)}&limit=1`);
            if (listRes?.orders && listRes.orders.length > 0) {
              const o = listRes.orders[0];
              return {
                success: true,
                found: true,
                customer: {
                  customerName: o.customer_name || '',
                  customerPhone: o.customer_phone || phone,
                  customerAddress: o.customer_address || '',
                  customerState: o.customer_state || 'Bihar',
                  customerStateCode: o.customer_state_code || '10',
                  customerGstin: o.customer_gstin || ''
                }
              };
            }
          } catch {
            // ignore
          }
          return { success: true, found: false, customer: null };
        }
        throw err;
      }
    }
  },

  // Inventory
  inventory: {
    getProducts: () => fetchWithAuth('/inventory/products'),
    adjustStock: (payload) => fetchWithAuth('/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    createProduct: (payload) => fetchWithAuth('/inventory/product', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    updateProduct: (id, payload) => fetchWithAuth(`/inventory/product/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),
    getMovements: (productId, limit = 200) => fetchWithAuth(`/inventory/movements?limit=${limit}${productId ? `&productId=${productId}` : ''}`)
  },

  // Settings
  settings: {
    get: () => fetchWithAuth('/settings'),
    update: (payload) => fetchWithAuth('/settings', {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },

  // Invoices
  invoices: {
    generate: (orderId) => fetchWithAuth(`/invoices/generate/${orderId}`, {
      method: 'POST'
    }),
    get: (orderId) => fetchWithAuth(`/invoices/${orderId}`),
    list: (limit = 50) => fetchWithAuth(`/invoices?limit=${limit}`)
  },

  // Analytics
  analytics: {
    getAdmin: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetchWithAuth(`/analytics/admin?${query}`);
    },
    getSalesman: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetchWithAuth(`/analytics/salesman?${query}`);
    }
  }
};
