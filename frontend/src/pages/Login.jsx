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
          ? 'Please enter your mobile phone number.'
          : 'Please enter your admin email address.'
      );
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-10">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Icon */}
        <div className="w-16 h-16 rounded-2xl bg-brand-700 text-white flex items-center justify-center mx-auto shadow-md">
          <Package className="w-9 h-9" />
        </div>
        <h2 className="mt-4 text-2xl font-black text-slate-900 tracking-tight">
          Makhana Hub
        </h2>
        <p className="mt-1 text-xs text-slate-500 font-medium">
          Inventory, Sales & Delivery Management
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-7 px-6 sm:px-8 rounded-3xl border border-slate-200/80 shadow-xl space-y-5">
          {/* Role Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setRole('SALESMAN');
                setErrorMessage('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition ${
                role === 'SALESMAN'
                  ? 'bg-white text-brand-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Truck className="w-4 h-4 text-brand-600" />
              <span>Salesman</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRole('ADMIN');
                setErrorMessage('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition ${
                role === 'ADMIN'
                  ? 'bg-white text-brand-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-brand-600" />
              <span>Administrator</span>
            </button>
          </div>

          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-base font-bold text-slate-800">
              {role === 'SALESMAN' ? 'Salesman Sign In' : 'Administrator Sign In'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {role === 'SALESMAN'
                ? 'Sign in using your 10-digit mobile number'
                : 'Sign in using your admin email address'}
            </p>
          </div>

          {(errorMessage || authError) && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{errorMessage || authError}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {role === 'SALESMAN' ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Mobile Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    placeholder="e.g. 8849699787"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono tracking-wide focus:ring-2 focus:ring-brand-600 focus:outline-none"
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Enter registered 10-digit mobile number
                </span>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Admin Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    autoComplete="email"
                    placeholder="admin@makhanabiz.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Password
              </label>

              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-brand-700 hover:bg-brand-800 active:scale-98 text-white font-extrabold text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : `Sign In as ${role === 'SALESMAN' ? 'Salesman' : 'Admin'}`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-center text-[11px] text-slate-400 font-medium pt-1">
            Forgot your password? Please contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
