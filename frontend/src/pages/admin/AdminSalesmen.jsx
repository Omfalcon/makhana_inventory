// frontend/src/pages/admin/AdminSalesmen.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/formatters';
import Modal from '../../components/Modal';
import { Users, UserPlus, Phone, Mail, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

export default function AdminSalesmen() {
  const [salesmen, setSalesmen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: ''
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadSalesmen = async () => {
    try {
      setLoading(true);
      const res = await api.auth.getSalesmen();
      setSalesmen(res.salesmen || []);
    } catch (err) {
      console.error('Failed to load salesmen:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSalesmen();
  }, []);

  const handleCreateSalesman = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.fullName.trim() || !formData.email.trim() || !formData.password) {
      setErrorMsg('Full name, email, and password are required.');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    try {
      setSaving(true);
      await api.auth.createSalesman(formData);
      setShowAddModal(false);
      setFormData({ fullName: '', email: '', password: '', phone: '' });
      await loadSalesmen();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create salesman');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (salesman) => {
    const action = salesman.is_active ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} ${salesman.full_name}?`)) {
      return;
    }

    try {
      await api.auth.toggleSalesmanStatus(salesman.id, !salesman.is_active);
      await loadSalesmen();
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">Salesman Accounts</h2>
          <p className="text-xs text-slate-500 font-medium">Provision and manage field team access</p>
        </div>

        <button
          onClick={() => {
            setErrorMsg('');
            setShowAddModal(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-xl text-xs font-bold shadow-xs transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>New Salesman</span>
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 text-sm">Loading salesmen...</div>
      ) : salesmen.length === 0 ? (
        <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
          No salesman accounts found. Click "New Salesman" to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {salesmen.map((salesman) => (
            <div
              key={salesman.id}
              className={`p-4 rounded-2xl border transition-all shadow-xs space-y-3 ${
                salesman.is_active ? 'bg-white border-slate-200' : 'bg-slate-50/60 border-slate-200 opacity-60'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{salesman.full_name}</h3>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Joined {formatDate(salesman.created_at)}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    salesman.is_active
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}
                >
                  {salesman.is_active ? 'Active' : 'Deactivated'}
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                {salesman.phone && (
                  <div className="flex items-center gap-1.5 font-mono">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{salesman.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{salesman.email || 'Email managed via auth'}</span>
                </div>
              </div>

              {/* Status Toggle Button */}
              <div className="pt-1 flex justify-end">
                <button
                  onClick={() => handleToggleStatus(salesman)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                    salesman.is_active
                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {salesman.is_active ? (
                    <>
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Deactivate</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Activate</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Salesman Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          if (!saving) setShowAddModal(false);
        }}
        title="Create Field Salesman Account"
      >
        <form onSubmit={handleCreateSalesman} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ramesh Kumar"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Login Email *
            </label>
            <input
              type="email"
              required
              placeholder="e.g. ramesh@makhanabiz.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Temporary / Initial Password *
            </label>
            <input
              type="password"
              required
              placeholder="Min 6 characters"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Mobile Phone
            </label>
            <input
              type="tel"
              placeholder="e.g. 9876543210"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
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
              {saving ? 'Creating Account...' : 'Create Salesman'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
