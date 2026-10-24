// frontend/src/pages/Login.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import Modal from '../components/Modal';
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
  EyeOff,
  KeyRound,
  CheckCircle2
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

  // Reset Password Modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

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

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    if (!resetIdentifier.trim()) {
      setResetError('Please enter your phone number or email.');
      return;
    }

    if (!resetNewPassword || resetNewPassword.length < 6) {
      setResetError('New password must be at least 6 characters.');
      return;
    }

    try {
      setResetLoading(true);
      const res = await api.auth.resetPassword(resetIdentifier.trim(), resetNewPassword);
      setResetSuccess(res.message || 'Password updated successfully!');
      setTimeout(() => {
        setShowResetModal(false);
        setPassword(resetNewPassword);
        if (resetIdentifier.includes('@')) {
          setRole('ADMIN');
          setEmail(resetIdentifier.trim());
        } else {
          setRole('SALESMAN');
          setPhone(resetIdentifier.trim());
        }
      }, 1000);
    } catch (err) {
      setResetError(err.message || 'Failed to reset password.');
    } finally {
      setResetLoading(false);
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetIdentifier(role === 'SALESMAN' ? (phone || '8849699787') : (email || 'admin@makhanabiz.com'));
                    setResetNewPassword('');
                    setResetError('');
                    setResetSuccess('');
                    setShowResetModal(true);
                  }}
                  className="text-xs text-brand-700 hover:text-brand-800 font-semibold"
                >
                  Forgot / Reset?
                </button>
              </div>

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

          {/* Quick Fill Credentials Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-xs text-slate-600 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 text-[10px] uppercase tracking-wider">
                Quick Login Credentials
              </span>
              <span className="text-[10px] text-slate-400">Click to fill</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setRole('SALESMAN');
                  setPhone('8849699711');
                  setPassword('password123');
                  setErrorMessage('');
                }}
                className="bg-white border border-slate-200 hover:border-brand-500 hover:bg-brand-50/50 p-2.5 rounded-xl text-left transition shadow-xs group"
              >
                <span className="font-bold text-slate-800 text-xs block group-hover:text-brand-900">
                  Salesman (Om)
                </span>
                <span className="text-[11px] font-mono text-slate-600 block">8849699711</span>
                <span className="text-[10px] text-slate-400 font-mono">password123</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRole('ADMIN');
                  setEmail('admin@makhanabiz.com');
                  setPassword('password123');
                  setErrorMessage('');
                }}
                className="bg-white border border-slate-200 hover:border-brand-500 hover:bg-brand-50/50 p-2.5 rounded-xl text-left transition shadow-xs group"
              >
                <span className="font-bold text-slate-800 text-xs block group-hover:text-brand-900">
                  Admin
                </span>
                <span className="text-[11px] font-mono text-slate-600 block truncate">admin@...</span>
                <span className="text-[10px] text-slate-400 font-mono">password123</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Reset Password Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => {
          if (!resetLoading) setShowResetModal(false);
        }}
        title="Set / Reset Account Password"
      >
        <form onSubmit={handleResetSubmit} className="space-y-4">
          <p className="text-xs text-slate-500">
            Forgot your password or want to set a new one? Enter your mobile phone or email below.
          </p>

          {resetError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{resetError}</span>
            </div>
          )}

          {resetSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{resetSuccess}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Mobile Phone or Email *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 8849699787 or admin@makhanabiz.com"
              value={resetIdentifier}
              onChange={(e) => setResetIdentifier(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              New Password *
            </label>
            <input
              type="password"
              required
              placeholder="Min 6 characters"
              value={resetNewPassword}
              onChange={(e) => setResetNewPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowResetModal(false)}
              disabled={resetLoading}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={resetLoading}
              className="flex-1 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs transition disabled:opacity-50"
            >
              {resetLoading ? 'Updating...' : 'Set Password'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
