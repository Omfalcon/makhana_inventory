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
  const [passwordTarget, setPasswordTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Edit Salesman Modal state
  const [editTarget, setEditTarget] = useState(null);
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
      alert(err.message || 'Failed to update salesman status');
    }
  };

  const openPasswordModal = (salesman) => {
    setPasswordTarget(salesman);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordSuccess('');
    setShowNewPassword(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      setPasswordSaving(true);
      await api.auth.changeSalesmanPassword(passwordTarget.id, newPassword);
      setPasswordSuccess(`Password updated successfully for ${passwordTarget.full_name}!`);
      setTimeout(() => {
        setPasswordTarget(null);
      }, 1500);
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password.');
    } finally {
      setPasswordSaving(false);
    }
  };

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
    <div className="space-y-4 pb-12">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            Salesmen Accounts
          </h2>
          <p className="text-xs font-semibold text-slate-500">Provision and manage field team access & credentials</p>
        </div>

        <button
          onClick={() => {
            setErrorMsg('');
            setShowAddModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold uppercase transition shadow-xs"
        >
          <UserPlus className="w-4 h-4 text-amber-300" />
          <span>+ Add Salesman</span>
        </button>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs flex items-center gap-2 font-bold rounded-xl shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="p-8 text-center text-slate-500 font-semibold bg-white border border-slate-200 rounded-2xl shadow-xs">
          Loading salesmen...
        </div>
      ) : salesmen.length === 0 ? (
        <div className="p-8 text-center text-slate-700 bg-white border border-slate-200 rounded-2xl font-semibold shadow-xs">
          No salesman accounts found. Click "Add Salesman" to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {salesmen.map((salesman) => (
            <div
              key={salesman.id}
              className={`p-5 rounded-2xl border transition-all space-y-3 shadow-xs ${
                salesman.is_active ? 'bg-white border-slate-200/90 hover:border-slate-300' : 'bg-slate-50 border-slate-200 opacity-70'
              }`}
            >
              <div className="flex justify-between items-start border-b border-slate-100 pb-2.5">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{salesman.full_name}</h3>
                  <span className="text-xs font-medium text-slate-500 block mt-0.5">
                    Joined {formatDate(salesman.created_at)}
                  </span>
                </div>
                <span
                  className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    salesman.is_active
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {salesman.is_active ? 'Active' : 'Deactivated'}
                </span>
              </div>

              {/* Contact and Auth Details */}
              <div className="space-y-1.5 text-xs bg-slate-50/70 p-3 rounded-xl border border-slate-200/70 font-semibold">
                <div className="flex items-center gap-2 text-slate-900">
                  <Phone className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="font-mono text-sm font-bold">
                    Phone: {salesman.phone || <span className="text-slate-400 italic font-normal">No phone</span>}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-mono font-medium">
                    Email: {salesman.email || <span className="text-slate-400 italic">No email</span>}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openPasswordModal(salesman)}
                    className="px-3 py-1.5 text-xs font-bold uppercase transition flex items-center gap-1.5 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs"
                    title="Change or reset password"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                    <span>Password</span>
                  </button>

                  <button
                    onClick={() => openEditModal(salesman)}
                    className="px-3 py-1.5 text-xs font-bold uppercase transition flex items-center gap-1.5 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs"
                    title="Edit name, phone, or email"
                  >
                    <Pencil className="w-3.5 h-3.5 text-slate-500" />
                    <span>Edit</span>
                  </button>
                </div>

                <button
                  onClick={() => handleToggleStatus(salesman)}
                  className={`px-3 py-1.5 text-xs font-bold uppercase transition flex items-center gap-1 rounded-xl border shadow-xs ${
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
            <div className="bg-slate-100 p-3 border border-slate-300 text-xs space-y-1">
              <span className="text-slate-600 font-black block uppercase text-[11px]">
                Target Account:
              </span>
              <p className="font-black text-slate-900 text-sm">{passwordTarget.full_name}</p>
              <p className="text-slate-700 font-mono">Login Phone: {passwordTarget.phone}</p>
            </div>

            {passwordError && (
              <div className="p-3 bg-rose-100 border border-rose-600 text-rose-950 text-xs font-bold">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 bg-emerald-100 border border-emerald-600 text-emerald-950 text-xs font-black">
                {passwordSuccess}
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
                  className="w-full px-3.5 py-2.5 pr-10 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
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
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPasswordTarget(null)}
                disabled={passwordSaving}
                className="py-3 bg-white border border-slate-200 text-slate-700 font-bold text-xs uppercase rounded-xl hover:bg-slate-50 transition shadow-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={passwordSaving}
                className="py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase rounded-xl transition shadow-xs disabled:opacity-50"
              >
                {passwordSaving ? 'Saving...' : 'Save Password'}
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
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-950 text-xs font-semibold rounded-xl">
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
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Login Phone * (10 Digits)
              </label>
              <input
                type="tel"
                required
                maxLength={10}
                placeholder="10-digit mobile number"
                value={editFormData.phone}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '');
                  const trimmed = digits.length > 10 ? digits.slice(-10) : digits;
                  setEditFormData({ ...editFormData, phone: trimmed });
                }}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-mono font-bold focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Login Email (Optional)
              </label>
              <input
                type="email"
                placeholder="e.g. ramesh@makhanabiz.com"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                disabled={editSaving}
                className="py-3 bg-white border border-slate-200 text-slate-700 font-bold text-xs uppercase rounded-xl hover:bg-slate-50 transition shadow-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editSaving}
                className="py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase rounded-xl transition shadow-xs"
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
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-950 text-xs font-semibold rounded-xl">
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
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
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
              maxLength={10}
              placeholder="e.g. 9876543210 (10 digits)"
              value={formData.phone}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '');
                const trimmed = digits.length > 10 ? digits.slice(-10) : digits;
                setFormData({ ...formData, phone: trimmed });
              }}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-mono font-bold focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Initial Password *
            </label>
            <div className="relative">
              <input
                type={showAddPassword ? 'text' : 'password'}
                required
                placeholder="Min 6 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3.5 py-2.5 pr-10 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
              <button
                type="button"
                onClick={() => setShowAddPassword(!showAddPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
              >
                {showAddPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
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
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              disabled={saving}
              className="py-3 bg-white border border-slate-200 text-slate-700 font-bold text-xs uppercase rounded-xl hover:bg-slate-50 transition shadow-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase rounded-xl transition shadow-xs"
            >
              {saving ? 'Creating...' : 'Create Salesman'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
