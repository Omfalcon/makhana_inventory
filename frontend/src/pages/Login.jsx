// frontend/src/pages/Login.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Package,
  Lock,
  Mail,
  Phone,
  AlertCircle,
  ArrowRight,
  Truck,
  ShieldCheck,
  Eye,
  EyeOff
} from 'lucide-react';

export default function Login() {
  const { login, authError } = useAuth();
  const [role, setRole] = useState('SALESMAN'); // 'SALESMAN' | 'ADMIN'
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const inputVal = role === 'SALESMAN' ? phone.trim() : email.trim();
    if (!inputVal) {
      setErrorMessage(
        role === 'SALESMAN'
          ? 'Please enter your 10-digit mobile number.'
          : 'Please enter your admin email address.'
      );
      return;
    }

    if (role === 'SALESMAN' && inputVal.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    try {
      setLoading(true);
      await login(inputVal, password, role);
    } catch (err) {
      console.error('Login error:', err);
      setErrorMessage(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center px-2.5 xs:px-4 py-6 xs:py-8 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Icon */}
        <div className="w-14 h-14 xs:w-16 xs:h-16 bg-emerald-700 text-white flex items-center justify-center mx-auto rounded-2xl shadow-md border border-emerald-600">
          <Package className="w-8 h-8 xs:w-9 xs:h-9 text-amber-300" />
        </div>
        <div className="mt-2.5 xs:mt-3 flex items-center justify-center gap-2">
          <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full uppercase">
            Retail POS Engine
          </span>
        </div>
        <h2 className="mt-2 text-xl xs:text-2xl font-black text-slate-900 tracking-tight">
          Makhana Billing Station
        </h2>
        <p className="text-xs font-semibold text-slate-500 mt-1">
          Fast POS Billing, Counter Register &amp; Inventory ERP
        </p>
      </div>

      <div className="mt-5 xs:mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white p-4 xs:p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xl space-y-4 xs:space-y-5">
          {/* Role Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 border border-slate-200 gap-1">
            <button
              type="button"
              onClick={() => {
                setRole('SALESMAN');
                setErrorMessage('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition ${
                role === 'SALESMAN'
                  ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="w-4 h-4 text-emerald-600" />
              <span>Salesman</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRole('ADMIN');
                setErrorMessage('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition ${
                role === 'ADMIN'
                  ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Admin</span>
            </button>
          </div>

          <div className="border-b border-slate-200/80 pb-2">
            <h3 className="text-base font-bold text-slate-900">
              {role === 'SALESMAN' ? 'Salesman Login' : 'Admin Login'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {role === 'SALESMAN'
                ? 'Enter your registered 10-digit mobile number'
                : 'Enter your admin email address'}
            </p>
          </div>

          {(errorMessage || authError) && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs sm:text-sm font-semibold flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage || authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {role === 'SALESMAN' ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mobile Number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="tel"
                    required
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    placeholder="10-digit number"
                    value={phone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhone(digits);
                    }}
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-300 text-base font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
                <div className="flex items-center justify-between text-xs font-medium text-slate-500 mt-1.5">
                  <span>Enter 10-digit phone number</span>
                  <span className={`font-mono ${phone.length === 10 ? 'text-emerald-700 font-bold' : ''}`}>
                    {phone.length}/10
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Admin Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="admin@makhanabiz.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password *
              </label>

              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 p-1 font-bold text-xs"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-extrabold text-sm uppercase tracking-wider rounded-xl transition shadow-md active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : `ENTER POS TERMINAL`}</span>
              <ArrowRight className="w-4 h-4 text-amber-300" />
            </button>
          </form>

          <p className="text-center text-[11px] text-slate-400 font-semibold pt-1">
            Makhana Retail ERP • Enterprise Point of Sale
          </p>
        </div>
      </div>
    </div>
  );
}
