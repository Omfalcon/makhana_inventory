// frontend/src/pages/admin/AdminSettings.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Settings, Save, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    legal_business_name: '',
    trade_name: '',
    business_address: '',
    gstin: '',
    state: 'Bihar',
    state_code: '10',
    phone: '',
    email: '',
    invoice_prefix: 'MKH',
    next_invoice_number: 1001,
    default_gst_rate: 12.00,
    prices_are_gst_inclusive: true,
    bank_name: '',
    bank_account_no: '',
    bank_ifsc: '',
    terms_and_conditions: ''
  });

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await api.settings.get();
      if (res.settings) {
        setFormData(res.settings);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    try {
      setSaving(true);
      await api.settings.update(formData);
      setSuccessMsg('Business details & GST invoice configuration saved successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const isGstinMissing = !formData.gstin || !formData.gstin.trim();

  return (
    <div className="space-y-4 pb-24 max-w-3xl mx-auto">
      <div>
        <h2 className="text-xl font-black text-slate-900">Business & Invoicing Settings</h2>
        <p className="text-xs text-slate-500 font-medium">Configure legal identity, tax treatment & GST compliance</p>
      </div>

      {/* Warning if GSTIN is not configured */}
      {isGstinMissing && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <strong>Mandatory GSTIN Configuration Missing:</strong> Official GST tax invoices cannot be issued to customers until your business GSTIN is configured and saved below.
          </div>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs sm:text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs sm:text-sm">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-slate-400 text-sm">Loading business settings...</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Business Entity */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
              Business Legal Identity
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Legal Registered Business Name *
              </label>
              <input
                type="text"
                required
                value={formData.legal_business_name}
                onChange={(e) => setFormData({ ...formData, legal_business_name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold uppercase"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Brand / Trade Name
                </label>
                <input
                  type="text"
                  value={formData.trade_name}
                  onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Business GSTIN *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 10AAAAA0000A1Z5"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono uppercase font-bold text-brand-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Full Registered Office Address *
              </label>
              <textarea
                rows={2}
                required
                value={formData.business_address}
                onChange={(e) => setFormData({ ...formData, business_address: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Supplier State
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  State Code
                </label>
                <input
                  type="text"
                  value={formData.state_code}
                  onChange={(e) => setFormData({ ...formData, state_code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Tax & Invoicing Rules */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
              GST Tax Rules & Sequential Numbering
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Invoice Prefix
                </label>
                <input
                  type="text"
                  required
                  value={formData.invoice_prefix}
                  onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono uppercase font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Next Invoice Number
                </label>
                <input
                  type="number"
                  required
                  value={formData.next_invoice_number}
                  onChange={(e) => setFormData({ ...formData, next_invoice_number: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Bank Account Details */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
              Bank Details (Printed on Invoices)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={formData.bank_name || ''}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  value={formData.bank_account_no || ''}
                  onChange={(e) => setFormData({ ...formData, bank_account_no: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={formData.bank_ifsc || ''}
                  onChange={(e) => setFormData({ ...formData, bank_ifsc: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono uppercase"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 bg-brand-700 hover:bg-brand-800 text-white font-extrabold text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Settings...' : 'Save All Settings'}</span>
          </button>
        </form>
      )}
    </div>
  );
}
