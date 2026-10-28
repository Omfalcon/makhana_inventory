// frontend/src/components/InvoicePrint.jsx
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatPaise, formatDate, paiseToWordsINR } from '../lib/formatters';
import { Printer, X } from 'lucide-react';

export default function InvoicePrint({ invoice, onClose }) {
  if (!invoice) return null;

  // Track invoice print state on document body
  useEffect(() => {
    document.body.classList.add('has-invoice-print');
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.classList.remove('has-invoice-print');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handlePrint = () => {
    window.print();
  };

  const isInterState = Boolean(invoice.is_inter_state);
  const items = Array.isArray(invoice.invoice_items_snapshot)
    ? invoice.invoice_items_snapshot
    : [];

  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  const modalContent = (
    <div
      id="invoice-print-portal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-1.5 xs:p-2 sm:p-6 flex flex-col items-center print:static print:p-0 print:bg-transparent print:overflow-visible"
    >
      {/* Action Toolbar (Hidden during print) */}
      <div className="w-full max-w-4xl bg-white px-3 xs:px-5 py-2.5 xs:py-3 border border-slate-200/90 rounded-2xl flex items-center justify-between shadow-lg no-print mb-2.5 xs:mb-3">
        <div className="flex items-center gap-1.5 xs:gap-2.5 min-w-0">
          <span className="font-bold text-slate-900 text-xs xs:text-sm uppercase tracking-tight truncate">GST Tax Invoice</span>
          <span className="text-[10px] xs:text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-bold px-2 py-0.5 rounded-lg shrink-0">
            {invoice.invoice_number}
          </span>
        </div>
        <div className="flex items-center gap-1.5 xs:gap-2 shrink-0">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 xs:px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase rounded-xl transition shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-300" />
            <span className="hidden xs:inline">Print / Save PDF</span>
            <span className="xs:hidden">Print</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 xs:p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4.5 h-4.5 xs:w-5 xs:h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Printable Invoice Container (Single A4 Page Fit) */}
      <div
        id="printable-tax-invoice"
        className="w-full max-w-4xl bg-white p-3.5 xs:p-5 sm:p-8 shadow-2xl border border-slate-300 rounded-2xl text-slate-900 text-xs sm:text-sm print:p-0 print:border print:border-slate-800 print:shadow-none print:rounded-none print:w-full print:max-w-none print:text-[11px] print:leading-snug"
      >
        {/* Header: Title and Business details */}
        <div className="border-b-2 border-slate-800 pb-3 mb-3 print:pb-2 print:mb-2">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4 print:flex-row">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 xs:gap-2 mb-1.5">
                <span className="inline-block px-2.5 py-0.5 bg-slate-900 text-white font-black text-[11px] uppercase tracking-wider rounded-xs print:rounded-none">
                  TAX INVOICE
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-500 border border-slate-300 px-2 py-0.5 rounded-xs print:border-slate-800 print:text-black">
                  Original for Recipient
                </span>
              </div>
              <h1 className="text-lg xs:text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight print:text-lg">
                {invoice.business_name_snapshot}
              </h1>
              <p className="text-slate-600 mt-0.5 max-w-md whitespace-pre-line leading-relaxed print:text-slate-800 print:text-[10.5px]">
                {invoice.business_address_snapshot}
              </p>
              <div className="mt-1.5 text-xs print:text-[10.5px] font-semibold text-slate-800 flex flex-wrap gap-x-3 gap-y-0.5">
                <div>
                  <span className="text-slate-500">GSTIN: </span>
                  <span className="font-mono font-bold text-slate-900">{invoice.business_gstin_snapshot || 'NOT CONFIGURED'}</span>
                </div>
                <div>
                  <span className="text-slate-500">State: </span>
                  <span className="font-semibold text-slate-900">{invoice.business_state_snapshot} ({invoice.business_state_code_snapshot})</span>
                </div>
              </div>
            </div>

            {/* Invoice Meta Grid */}
            <div className="w-full sm:w-64 shrink-0 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-right print:bg-transparent print:border print:border-slate-800 print:rounded-none print:p-2 print:w-64">
              <div className="grid grid-cols-2 text-left gap-y-1 text-[11px] print:text-[10px]">
                <span className="text-slate-500 uppercase font-bold">Invoice No:</span>
                <span className="font-mono font-bold text-slate-900 text-right">{invoice.invoice_number}</span>

                <span className="text-slate-500 uppercase font-bold">Date:</span>
                <span className="font-semibold text-slate-800 text-right">{formatDate(invoice.invoice_date || invoice.created_at)}</span>

                <span className="text-slate-500 uppercase font-bold">Supply Place:</span>
                <span className="font-semibold text-slate-800 text-right">{invoice.customer_state_snapshot} ({invoice.customer_state_code_snapshot})</span>

                <span className="text-slate-500 uppercase font-bold">Rev. Charge:</span>
                <span className="font-semibold text-slate-800 text-right">No</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bill To Details Box */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 p-3 bg-slate-50 rounded-xl border border-slate-200 print:bg-transparent print:border print:border-slate-800 print:rounded-none print:p-2 print:mb-2 print:grid-cols-2">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block print:text-slate-600">
              Details of Receiver / Billed To:
            </span>
            <h2 className="font-bold text-slate-900 text-sm mt-0.5 print:text-xs">{invoice.customer_name_snapshot}</h2>
            <p className="text-slate-600 mt-0.5 whitespace-pre-line text-xs print:text-[10px] print:text-slate-800">
              {invoice.customer_address_snapshot}
            </p>
            <p className="text-slate-600 mt-0.5 font-medium text-xs print:text-[10px] print:text-slate-800">
              Phone: {invoice.customer_phone_snapshot}
            </p>
          </div>
          <div className="sm:text-right flex flex-col justify-between print:text-right">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block print:text-slate-600">
                Tax Regime:
              </span>
              <p className="font-bold text-slate-800 mt-0.5 text-xs print:text-[10px]">
                {isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block print:text-slate-600">
                Customer GSTIN / UIN:
              </span>
              <p className="font-mono font-bold text-slate-900 text-xs print:text-[10px]">
                {invoice.customer_gstin_snapshot || 'URP (Unregistered Person)'}
              </p>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto print:overflow-visible mb-3 print:mb-2">
          <table className="w-full text-left border-collapse border border-slate-300 print:border-slate-800">
            <thead>
              <tr className="bg-slate-100 text-slate-800 text-[10.5px] print:text-[9.5px] uppercase tracking-wider font-bold border-b border-slate-300 print:border-slate-800 print:bg-slate-100">
                <th className="p-1.5 border-r border-slate-300 print:border-slate-800 text-center w-8">#</th>
                <th className="p-1.5 border-r border-slate-300 print:border-slate-800">Description of Goods</th>
                <th className="p-1.5 border-r border-slate-300 print:border-slate-800 text-center">HSN/SAC</th>
                <th className="p-1.5 border-r border-slate-300 print:border-slate-800 text-center">Qty</th>
                <th className="p-1.5 border-r border-slate-300 print:border-slate-800 text-right">Unit Rate</th>
                <th className="p-1.5 border-r border-slate-300 print:border-slate-800 text-right">Taxable (₹)</th>
                <th className="p-1.5 border-r border-slate-300 print:border-slate-800 text-center">Rate</th>
                {isInterState ? (
                  <th className="p-1.5 border-r border-slate-300 print:border-slate-800 text-right">IGST (₹)</th>
                ) : (
                  <>
                    <th className="p-1.5 border-r border-slate-300 print:border-slate-800 text-right">CGST (₹)</th>
                    <th className="p-1.5 border-r border-slate-300 print:border-slate-800 text-right">SGST (₹)</th>
                  </>
                )}
                <th className="p-1.5 text-right">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 print:divide-slate-800">
              {items.map((item, index) => (
                <tr key={index} className="text-xs print:text-[10px]">
                  <td className="p-1.5 border-r border-slate-200 print:border-slate-800 text-center font-medium text-slate-500 print:text-black">
                    {index + 1}
                  </td>
                  <td className="p-1.5 border-r border-slate-200 print:border-slate-800">
                    <span className="font-bold text-slate-900 block">{item.product_name || item.product_name_snapshot}</span>
                    <span className="text-[10px] font-mono text-slate-500 print:text-slate-700">{item.sku || item.sku_snapshot}</span>
                  </td>
                  <td className="p-1.5 border-r border-slate-200 print:border-slate-800 font-mono text-center text-slate-700">
                    {item.hsn_code || '19041090'}
                  </td>
                  <td className="p-1.5 border-r border-slate-200 print:border-slate-800 text-center font-bold">
                    {item.quantity}
                  </td>
                  <td className="p-1.5 border-r border-slate-200 print:border-slate-800 text-right font-mono">
                    {formatPaise(item.unit_price_paise)}
                  </td>
                  <td className="p-1.5 border-r border-slate-200 print:border-slate-800 text-right font-mono">
                    {formatPaise(item.taxable_value_paise)}
                  </td>
                  <td className="p-1.5 border-r border-slate-200 print:border-slate-800 text-center">
                    {item.gst_rate}%
                  </td>
                  {isInterState ? (
                    <td className="p-1.5 border-r border-slate-200 print:border-slate-800 text-right font-mono">
                      {formatPaise(item.igst_paise)}
                    </td>
                  ) : (
                    <>
                      <td className="p-1.5 border-r border-slate-200 print:border-slate-800 text-right font-mono">
                        {formatPaise(item.cgst_paise)}
                      </td>
                      <td className="p-1.5 border-r border-slate-200 print:border-slate-800 text-right font-mono">
                        {formatPaise(item.sgst_paise)}
                      </td>
                    </>
                  )}
                  <td className="p-1.5 text-right font-mono font-bold">
                    {formatPaise(item.line_total_paise)}
                  </td>
                </tr>
              ))}

              {/* Table Subtotals Row */}
              <tr className="bg-slate-50 print:bg-slate-50 font-bold border-t-2 border-slate-300 print:border-slate-800 text-xs print:text-[10px]">
                <td colSpan={3} className="p-1.5 border-r border-slate-300 print:border-slate-800 text-right uppercase tracking-wider">
                  Total:
                </td>
                <td className="p-1.5 border-r border-slate-300 print:border-slate-800 text-center font-mono">
                  {totalQuantity}
                </td>
                <td className="p-1.5 border-r border-slate-300 print:border-slate-800" />
                <td className="p-1.5 border-r border-slate-300 print:border-slate-800 text-right font-mono">
                  {formatPaise(invoice.taxable_value_paise)}
                </td>
                <td className="p-1.5 border-r border-slate-300 print:border-slate-800" />
                {isInterState ? (
                  <td className="p-1.5 border-r border-slate-300 print:border-slate-800 text-right font-mono">
                    {formatPaise(invoice.igst_paise)}
                  </td>
                ) : (
                  <>
                    <td className="p-1.5 border-r border-slate-300 print:border-slate-800 text-right font-mono">
                      {formatPaise(invoice.cgst_paise)}
                    </td>
                    <td className="p-1.5 border-r border-slate-300 print:border-slate-800 text-right font-mono">
                      {formatPaise(invoice.sgst_paise)}
                    </td>
                  </>
                )}
                <td className="p-1.5 text-right font-mono font-black text-slate-900">
                  {formatPaise(invoice.total_amount_paise)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Calculation Totals & Statutory Amount in Words */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 print:mb-2 print:gap-2">
          {/* Amount In Words & Terms */}
          <div className="flex flex-col justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 print:bg-transparent print:border print:border-slate-800 print:rounded-none print:p-2">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Invoice Value (In Words):
              </span>
              <p className="font-bold text-slate-900 text-xs sm:text-sm mt-0.5 leading-snug print:text-[11px]">
                {paiseToWordsINR(invoice.total_amount_paise)}
              </p>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200 print:border-slate-400 text-[10px] text-slate-500 print:text-slate-800">
              <span className="font-bold uppercase block text-slate-700 print:text-black">Terms & Conditions:</span>
              <p className="mt-0.5">1. Goods once sold will not be accepted back without inspection.</p>
              <p>2. Payment mode: Cash / UPI / On Delivery. Subject to local jurisdiction.</p>
            </div>
          </div>

          {/* Tax Calculation Summary Box */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs print:bg-transparent print:border print:border-slate-800 print:rounded-none print:p-2 print:text-[10.5px]">
            <div className="flex justify-between text-slate-600 print:text-black">
              <span>Taxable Value:</span>
              <span className="font-mono font-semibold">{formatPaise(invoice.taxable_value_paise)}</span>
            </div>
            {isInterState ? (
              <div className="flex justify-between text-slate-600 print:text-black">
                <span>Integrated Tax (IGST):</span>
                <span className="font-mono font-semibold">{formatPaise(invoice.igst_paise)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-slate-600 print:text-black">
                  <span>Central Tax (CGST):</span>
                  <span className="font-mono font-semibold">{formatPaise(invoice.cgst_paise)}</span>
                </div>
                <div className="flex justify-between text-slate-600 print:text-black">
                  <span>State Tax (SGST):</span>
                  <span className="font-mono font-semibold">{formatPaise(invoice.sgst_paise)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-slate-600 print:text-black border-t border-slate-200 print:border-slate-400 pt-1">
              <span>Total GST Tax:</span>
              <span className="font-mono font-semibold">{formatPaise(invoice.total_tax_paise)}</span>
            </div>
            <div className="flex justify-between text-slate-900 border-t-2 border-slate-900 pt-1.5 font-bold text-sm print:text-xs">
              <span className="uppercase">Grand Total:</span>
              <span className="font-mono text-emerald-950 print:text-black text-base print:text-sm font-black">
                {formatPaise(invoice.total_amount_paise)}
              </span>
            </div>
          </div>
        </div>

        {/* Declarations & Signature */}
        <div className="border-t border-slate-200 print:border-slate-800 pt-2 grid grid-cols-2 gap-4 text-[10px] text-slate-600 print:text-black">
          <div>
            <h4 className="font-bold text-slate-800 uppercase mb-0.5 print:text-black">Declaration:</h4>
            <p className="leading-tight">
              We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
            </p>
            <p className="mt-1 text-[9px] text-slate-400 print:text-slate-600 italic">
              This is a computer generated invoice issued under GST law.
            </p>
          </div>
          <div className="text-right flex flex-col justify-end items-end">
            <span className="text-[10px] text-slate-600 print:text-black mb-4">
              For <strong className="font-bold uppercase text-slate-900 print:text-black">{invoice.business_name_snapshot}</strong>
            </span>
            <div className="w-40 border-b border-slate-400 print:border-slate-800 mb-1" />
            <span className="font-bold text-slate-800 print:text-black text-[10.5px]">Authorized Signatory</span>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
