// frontend/src/components/BottomNav.jsx
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Users,
  BarChart3,
  Settings,
  Home,
  PlusCircle,
  Truck,
  TrendingUp,
  FileText
} from 'lucide-react';

export default function BottomNav({ activeTab, onSelectTab }) {
  const { isAdmin, isSalesman } = useAuth();
  const { totalUnits } = useCart();

  const salesmanNavItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'catalogue', label: 'Add Items', icon: PlusCircle },
    { id: 'cart', label: 'Place Order', icon: ShoppingCart, badge: totalUnits > 0 ? totalUnits : null, highlight: totalUnits > 0 },
    { id: 'orders', label: 'My Orders', icon: FileText },
    { id: 'deliveries', label: 'Deliveries', icon: Truck },
  ];

  const adminNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'inventory', label: 'Inventory', icon: Boxes },
    { id: 'salesmen', label: 'Salesmen', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const items = isAdmin ? adminNavItems : salesmanNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-lg no-print">
      <div className="max-w-7xl mx-auto flex justify-around items-center h-16 px-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 transition-all relative ${
                isActive ? 'text-brand-700 font-bold' : 'text-slate-500 hover:text-slate-900 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2.5 bg-brand-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] sm:text-xs mt-1 truncate max-w-[65px] sm:max-w-none">
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-brand-600 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
