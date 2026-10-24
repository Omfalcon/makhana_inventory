// frontend/src/context/WebSocketContext.jsx
import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { Bell, CheckCircle2, AlertTriangle, Package, Truck, X } from 'lucide-react';

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const { user, profile } = useAuth();
  const [connected, setConnected] = useState(false);
  const [toasts, setToasts] = useState([]);
  const wsRef = useRef(null);
  const listenersRef = useRef(new Map()); // eventType -> Set of callbacks
  const reconnectTimeoutRef = useRef(null);

  // Add toast helper
  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts(prev => [...prev.slice(-3), { ...toast, id }]); // keep last 4 max
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Connect to WebSocket
  useEffect(() => {
    if (!user || !profile) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setConnected(false);
      return;
    }

    let isMounted = true;

    function connect() {
      if (!isMounted) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // In Vite dev, proxy /ws -> ws://localhost:5000/ws. If direct host, use window.location.host
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setConnected(true);
          // Identify user and role
          ws.send(JSON.stringify({
            type: 'IDENTIFY',
            userId: profile.id,
            role: profile.role,
            fullName: profile.full_name
          }));
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            const { type, payload } = data;

            // Notify specific listeners
            if (listenersRef.current.has(type)) {
              listenersRef.current.get(type).forEach(cb => {
                try { cb(payload); } catch (e) { console.warn('WebSocket listener error:', e); }
              });
            }

            // Also notify wildcard '*' listeners
            if (listenersRef.current.has('*')) {
              listenersRef.current.get('*').forEach(cb => {
                try { cb({ type, payload }); } catch (e) { console.warn('WebSocket listener error:', e); }
              });
            }

            // Generate contextual Toasts
            if (type === 'ORDER_CREATED') {
              if (profile.role === 'ADMIN') {
                addToast({
                  type: 'order',
                  title: 'New Order Placed!',
                  message: `${payload.customer_name || 'Customer'} by ${payload.salesman?.full_name || 'Salesman'}`,
                  icon: Bell,
                  color: 'bg-emerald-50 text-emerald-800 border-emerald-200'
                });
              }
            } else if (type === 'ORDER_STATUS_CHANGED') {
              addToast({
                type: 'delivery',
                title: `Order Status: ${payload.status}`,
                message: `Order #${payload.order_number || payload.order_id?.slice(0, 8)} updated to ${payload.status}`,
                icon: Truck,
                color: 'bg-blue-50 text-blue-800 border-blue-200'
              });
            } else if (type === 'ORDER_CANCELLED') {
              addToast({
                type: 'cancel',
                title: 'Order Cancelled',
                message: `Order was cancelled. Reason: ${payload.reason}`,
                icon: AlertTriangle,
                color: 'bg-rose-50 text-rose-800 border-rose-200'
              });
            } else if (type === 'STOCK_UPDATED') {
              if (profile.role === 'SALESMAN') {
                addToast({
                  type: 'stock',
                  title: 'Stock Updated',
                  message: payload.reason || 'Inventory counts updated in real-time',
                  icon: Package,
                  color: 'bg-amber-50 text-amber-800 border-amber-200'
                });
              }
            }
          } catch (err) {
            console.warn('Failed to parse WebSocket message:', err);
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setConnected(false);
          // Reconnect with backoff
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        };

        ws.onerror = (err) => {
          console.warn('WebSocket error, will retry...', err.message);
          ws.close();
        };
      } catch (err) {
        console.warn('Could not establish WebSocket connection:', err);
        reconnectTimeoutRef.current = setTimeout(connect, 4000);
      }
    }

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [user, profile, addToast]);

  // Subscribe to specific event types
  const subscribe = useCallback((eventType, callback) => {
    if (!listenersRef.current.has(eventType)) {
      listenersRef.current.set(eventType, new Set());
    }
    listenersRef.current.get(eventType).add(callback);

    return () => {
      if (listenersRef.current.has(eventType)) {
        listenersRef.current.get(eventType).delete(callback);
      }
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ connected, subscribe, addToast }}>
      {children}

      {/* Realtime Floating Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => {
          const Icon = toast.icon || Bell;
          return (
            <div
              key={toast.id}
              className={`p-3.5 rounded-2xl border shadow-lg flex items-start gap-3 pointer-events-auto transition-all animate-fadeIn ${toast.color || 'bg-white text-slate-800 border-slate-200'}`}
            >
              <div className="shrink-0 p-1 rounded-lg bg-white/80 shadow-xs">
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold leading-tight truncate">{toast.title}</h4>
                <p className="text-[11px] opacity-90 mt-0.5 leading-snug line-clamp-2">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-700 p-0.5 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

/**
 * Hook to listen for a specific WebSocket event
 */
export function useWebSocketEvent(eventType, callback) {
  const { subscribe } = useWebSocket();

  useEffect(() => {
    if (!eventType || !callback) return;
    const unsubscribe = subscribe(eventType, callback);
    return unsubscribe;
  }, [eventType, callback, subscribe]);
}
