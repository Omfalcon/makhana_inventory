// frontend/src/components/InvoicePrint.jsx
import React from 'react';
import { formatPaise, formatDate } from '../lib/formatters';
import { Printer, Download, X } from 'lucide-react';

export default function InvoicePrint({ invoice, onClose }) {
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const isInterState = invoice.is_inter_state;
  const items = Array.isArray(invoice.invoice_items_snapshot)
    ? invoice.invoice_items_snapshot
    : [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-2 sm:p-6 flex flex-col items-center">
      {/* Action Toolbar (Hidden during print) */}
      <div className="w-full max-w-4xl bg-white px-5 py-3.5 border border-slate-200/90 rounded-2xl flex items-center justify-between shadow-lg no-print mb-3">
        <div className="flex items-center gap-2.5">
          <span className="font-bold text-slate-900 text-sm uppercase tracking-tight">GST Tax Invoice</span>
          <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-bold px-2.5 py-0.5 rounded-lg">
            {invoice.invoice_number}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase rounded-xl transition shadow-xs"
          >
            <Printer className="w-4 h-4 text-amber-300" />
            <span>Print / Save PDF</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Printable Invoice Container (A4 portrait size) */}
      <div className="w-full max-w-4xl bg-white p-6 sm:p-10 shadow-2xl border border-slate-200/90 rounded-2xl text-slate-900 text-xs sm:text-sm print:p-0 print:border-none print:shadow-none print:rounded-none">
        {/* Header: Title and Business details */}
        <div className="border-b-2 border-slate-900 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <span className="inline-block px-2 py-0.5 bg-slate-900 text-white font-bold text-xs uppercase tracking-wider mb-2">
                Tax Invoice
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase">
                {invoice.business_name_snapshot}
              </h1>
              <p className="text-slate-600 mt-1 max-w-md whitespace-pre-line leading-relaxed">
                {invoice.business_address_snapshot}
              </p>
              <div className="mt-2 text-xs font-semibold text-slate-800">
                <span>GSTIN: </span>
                <span className="font-mono text-brand-800">{invoice.business_gstin_snapshot || 'NOT CONFIGURED'}</span>
                <span className="mx-2">•</span>
                <span>State: </span>
                <span>{invoice.business_state_snapshot} ({invoice.business_state_code_snapshot})</span>
              </div>
            </div>

            {/* Invoice Meta */}
            <div className="text-right shrink-0 bg-slate-50 p-3 rounded-lg border border-slate-200 print:border print:bg-transparent">
              <div className="mb-2">
                <span className="text-[10px] uppercase text-slate-500 font-bold block">Invoice No:</span>
                <span className="font-mono font-bold text-sm sm:text-base text-slate-900">{invoice.invoice_number}</span>
              </div>
              <div className="mb-1">
                <span className="text-[10px] uppercase text-slate-500 font-bold block">Invoice Date:</span>
                <span className="font-semibold text-slate-800">{formatDate(invoice.invoice_date || invoice.created_at)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-500 font-bold block">Place of Supply:</span>
                <span className="font-semibold text-slate-800">{invoice.customer_state_snapshot} ({invoice.customer_state_code_snapshot})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bill To Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200 print:bg-transparent">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Bill To (Customer):</span>
            <h2 className="font-bold text-slate-900 text-sm sm:text-base mt-0.5">{invoice.customer_name_snapshot}</h2>
            <p className="text-slate-600 mt-0.5 whitespace-pre-line">{invoice.customer_address_snapshot}</p>
            <p className="text-slate-600 mt-1 font-medium">Phone: {invoice.customer_phone_snapshot}</p>
          </div>
          <div className="sm:text-right flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tax Type:</span>
              <p className="font-semibold text-slate-800 mt-0.5">
                {isInterState ? 'Inter-State Transaction (IGST)' : 'Intra-State Transaction (CGST + SGST)'}
              </p>
            </div>
            {invoice.customer_gstin_snapshot && (
              <div className="mt-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Customer GSTIN:</span>
                <p className="font-mono font-semibold text-slate-900">{invoice.customer_gstin_snapshot}</p>
              </div>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-left border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-800 text-[11px] uppercase tracking-wider font-bold border-b border-slate-300">
                <th className="p-2 border-r border-slate-300 text-center w-8">#</th>
                <th className="p-2 border-r border-slate-300">Item Description</th>
                <th className="p-2 border-r border-slate-300">HSN</th>
                <th className="p-2 border-r border-slate-300 text-center">Qty</th>
                <th className="p-2 border-r border-slate-300 text-right">Unit Price</th>
                <th className="p-2 border-r border-slate-300 text-right">Taxable</th>
                <th className="p-2 border-r border-slate-300 text-center">Rate</th>
                {isInterState ? (
                  <th className="p-2 border-r border-slate-300 text-right">IGST</th>
                ) : (
                  <>
                    <th className="p-2 border-r border-slate-300 text-right">CGST</th>
                    <th className="p-2 border-r border-slate-300 text-right">SGST</th>
                  </>
                )}
                <th className="p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item, index) => (
                <tr key={index} className="text-xs">
                  <td className="p-2 border-r border-slate-200 text-center font-medium text-slate-500">{index + 1}</td>
                  <td className="p-2 border-r border-slate-200">
                    <span className="font-bold text-slate-900 block">{item.product_name || item.product_name_snapshot}</span>
                    <span className="text-[10px] font-mono text-slate-500">{item.sku || item.sku_snapshot}</span>
                  </td>
                  <td className="p-2 border-r border-slate-200 font-mono text-slate-600">{item.hsn_code || '19041090'}</td>
                  <td className="p-2 border-r border-slate-200 text-center font-bold">{item.quantity}</td>
                  <td className="p-2 border-r border-slate-200 text-right font-mono">{formatPaise(item.unit_price_paise)}</td>
                  <td className="p-2 border-r border-slate-200 text-right font-mono">{formatPaise(item.taxable_value_paise)}</td>
                  <td className="p-2 border-r border-slate-200 text-center">{item.gst_rate}%</td>
                  {isInterState ? (
                    <td className="p-2 border-r border-slate-200 text-right font-mono">{formatPaise(item.igst_paise)}</td>
                  ) : (
                    <>
                      <td className="p-2 border-r border-slate-200 text-right font-mono">{formatPaise(item.cgst_paise)}</td>
                      <td className="p-2 border-r border-slate-200 text-right font-mono">{formatPaise(item.sgst_paise)}</td>
                    </>
                  )}
                  <td className="p-2 text-right font-mono font-bold">{formatPaise(item.line_total_paise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculation Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-full sm:w-72 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs print:bg-transparent">
            <div className="flex justify-between text-slate-600">
              <span>Taxable Value:</span>
              <span className="font-mono font-semibold">{formatPaise(invoice.taxable_value_paise)}</span>
            </div>
            {isInterState ? (
              <div className="flex justify-between text-slate-600">
                <span>Integrated Tax (IGST):</span>
                <span className="font-mono font-semibold">{formatPaise(invoice.igst_paise)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>Central Tax (CGST):</span>
                  <span className="font-mono font-semibold">{formatPaise(invoice.cgst_paise)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>State Tax (SGST):</span>
                  <span className="font-mono font-semibold">{formatPaise(invoice.sgst_paise)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-slate-600 border-t border-slate-200 pt-1.5">
              <span>Total Tax:</span>
              <span className="font-mono font-semibold">{formatPaise(invoice.total_tax_paise)}</span>
            </div>
            <div className="flex justify-between text-slate-900 border-t-2 border-slate-900 pt-2 font-bold text-sm">
              <span>Grand Total:</span>
              <span className="font-mono text-brand-900">{formatPaise(invoice.total_amount_paise)}</span>
            </div>
          </div>
        </div>

        {/* Statutory Declarations & Signature */}
        <div className="border-t border-slate-200 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-6 text-[11px] text-slate-500">
          <div>
            <h4 className="font-bold text-slate-700 uppercase mb-1">Declaration & Terms:</h4>
            <p className="leading-relaxed">
              We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
            </p>
            <p className="mt-1">
              Payment mode: Cash on delivery. Subject to local jurisdiction.
            </p>
          </div>
          <div className="text-right flex flex-col justify-end items-end">
            <div className="w-48 border-b border-slate-400 mb-1" />
            <span className="font-bold text-slate-800">Authorized Signatory</span>
            <span className="text-[10px]">{invoice.business_name_snapshot}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
