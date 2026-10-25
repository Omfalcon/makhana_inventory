// frontend/src/pages/admin/AdminSalesmen.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/formatters';
import Modal from '../../components/Modal';
import {
  Users,
  UserPlus,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  KeyRound,
  Pencil,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';

export default function AdminSalesmen() {
  const [salesmen, setSalesmen] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Salesman Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: ''
  });
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Change Password Modal state
  const [passwordTarget, setPasswordTarget] = useState(null); // salesman object
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Edit Salesman Modal state
  const [editTarget, setEditTarget] = useState(null); // salesman object
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    email: '',
    phone: ''
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

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

    const cleanPhone = (formData.phone || '').replace(/\D/g, '');

    if (!formData.fullName.trim()) {
      setErrorMsg('Full name is required.');
      return;
    }

    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMsg('A valid 10-digit mobile phone number is required for salesman login.');
      return;
    }

    if (!formData.password || formData.password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    try {
      setSaving(true);
      await api.auth.createSalesman({
        ...formData,
        phone: cleanPhone.slice(-10)
      });
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

  // Open Change Password Modal
  const openPasswordModal = (salesman) => {
    setPasswordTarget(salesman);
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setPasswordError('');
    setPasswordSuccess('');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!newPassword || newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      setPasswordSaving(true);
      const res = await api.auth.changeSalesmanPassword(passwordTarget.id, newPassword);
      setPasswordSuccess(res.message || 'Password changed successfully!');
      setTimeout(() => {
        setPasswordTarget(null);
      }, 1200);
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  // Open Edit Salesman Modal
  const openEditModal = (salesman) => {
    setEditTarget(salesman);
    setEditFormData({
      fullName: salesman.full_name || '',
      email: salesman.email || '',
      phone: salesman.phone || ''
    });
    setEditError('');
  };

  const handleUpdateSalesman = async (e) => {
    e.preventDefault();
    setEditError('');

    if (!editFormData.fullName.trim()) {
      setEditError('Full name is required.');
      return;
    }

    const rawDigits = (editFormData.phone || '').replace(/\D/g, '');
    const cleanPhone = rawDigits.length >= 10 ? rawDigits.slice(-10) : rawDigits;
    if (!cleanPhone || cleanPhone.length < 10) {
      setEditError('A valid 10-digit mobile phone number is required.');
      return;
    }

    try {
      setEditSaving(true);
      const res = await api.auth.updateSalesman(editTarget.id, {
        fullName: editFormData.fullName.trim(),
        email: editFormData.email.trim(),
        phone: cleanPhone
      });
      setSuccessBanner(res.message || `Salesman updated successfully! Phone set to ${cleanPhone}.`);
      setTimeout(() => setSuccessBanner(''), 5000);
      setEditTarget(null);
      await loadSalesmen();
    } catch (err) {
      setEditError(err.message || 'Failed to update salesman details.');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">Salesman Accounts</h2>
          <p className="text-xs text-slate-500 font-medium">Provision and manage field team access & credentials</p>
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

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 font-bold shadow-xs transition-all">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

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
                salesman.is_active ? 'bg-white border-slate-200' : 'bg-slate-50/60 border-slate-200 opacity-70'
              }`}
            >
              {/* Card Header */}
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

              {/* Contact and Auth Details */}
              <div className="space-y-1.5 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 text-slate-800 font-medium">
                  <Mail className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                  <span className="font-mono text-slate-900 select-all font-semibold">
                    {salesman.email || <span className="text-slate-400 italic">No email attached</span>}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono">
                    {salesman.phone ? salesman.phone : <span className="text-slate-400 italic">No phone added</span>}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  {/* Change Password Button */}
                  <button
                    onClick={() => openPasswordModal(salesman)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
                    title="Change or reset password"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                    <span>Password</span>
                  </button>

                  {/* Edit Details Button */}
                  <button
                    onClick={() => openEditModal(salesman)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                    title="Edit name, phone, or email"
                  >
                    <Pencil className="w-3.5 h-3.5 text-slate-500" />
                    <span>Edit</span>
                  </button>
                </div>

                {/* Status Toggle Button */}
                <button
                  onClick={() => handleToggleStatus(salesman)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 border ${
                    salesman.is_active
                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
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

      {/* Change Password Modal */}
      <Modal
        isOpen={!!passwordTarget}
        onClose={() => {
          if (!passwordSaving) setPasswordTarget(null);
        }}
        title="Change Salesman Password"
      >
        {passwordTarget && (
          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* Account Summary Banner */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <span className="text-slate-500 font-semibold block uppercase tracking-wider text-[10px]">
                Target Account
              </span>
              <p className="font-bold text-slate-900 text-sm">{passwordTarget.full_name}</p>
              <p className="text-slate-600 font-mono">{passwordTarget.email}</p>
            </div>

            {passwordError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                New Password *
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Must be at least 6 characters.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Confirm New Password *
              </label>
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPasswordTarget(null)}
                disabled={passwordSaving}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={passwordSaving}
                className="flex-1 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs transition disabled:opacity-50"
              >
                {passwordSaving ? 'Updating Password...' : 'Save New Password'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Edit Salesman Details Modal */}
      <Modal
        isOpen={!!editTarget}
        onClose={() => {
          if (!editSaving) setEditTarget(null);
        }}
        title="Edit Salesman Details"
      >
        {editTarget && (
          <form onSubmit={handleUpdateSalesman} className="space-y-4">
            {editError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                {editError}
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
                value={editFormData.fullName}
                onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Login Email
              </label>
              <input
                type="email"
                required
                placeholder="e.g. ramesh@makhanabiz.com"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Mobile Phone * (Login ID)
              </label>
              <input
                type="tel"
                required
                maxLength={14}
                placeholder="10-digit mobile number"
                value={editFormData.phone}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '');
                  const trimmed = digits.length > 10 ? digits.slice(-10) : digits;
                  setEditFormData({ ...editFormData, phone: trimmed });
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:ring-2 focus:ring-brand-600 focus:outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Salesman will use this 10-digit number to log in.
              </span>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                disabled={editSaving}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editSaving}
                className="flex-1 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs transition"
              >
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </Modal>

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
              Mobile Phone * (Salesman Login ID)
            </label>
            <input
              type="tel"
              required
              inputMode="numeric"
              maxLength={14}
              placeholder="e.g. 9876543210 (10 digits)"
              value={formData.phone}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '');
                const trimmed = digits.length > 10 ? digits.slice(-10) : digits;
                setFormData({ ...formData, phone: trimmed });
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:ring-2 focus:ring-brand-600 focus:outline-none"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Salesman will use this 10-digit number to log in to their account.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Temporary / Initial Password *
            </label>
            <div className="relative">
              <input
                type={showAddPassword ? 'text' : 'password'}
                required
                placeholder="Min 6 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 pr-10 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowAddPassword(!showAddPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showAddPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              At least 6 characters. Can be changed anytime.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Login Email (Optional)
            </label>
            <input
              type="email"
              placeholder="Auto-generated if left blank"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Optional backup email. Salesman logs in with phone number.
            </span>
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
