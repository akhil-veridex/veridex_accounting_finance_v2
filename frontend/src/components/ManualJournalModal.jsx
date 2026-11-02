import React, { useState, useEffect } from 'react';
import { authApi } from '../services/api';
import ModalClose from './ModalClose';

const emptyForm = () => ({
  posting_date: new Date().toISOString().slice(0, 10),
  memo: '',
  source_module: 'GL_MANUAL',
  reference_id: '',
  lines: [
    { account_code: '1000', debit: '', credit: '', memo: '' },
    { account_code: '3000', debit: '', credit: '', memo: '' }
  ]
});

/**
 * "Post Balanced Double-Entry Journal" dialog, shared by every page that offers
 * the Post Manual Journal action.
 */
export default function ManualJournalModal({ open, onClose, onPosted }) {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // The account dropdown needs the chart of accounts whenever the dialog opens
  useEffect(() => {
    if (!open) return;
    setError(null);
    (async () => {
      try {
        const res = await authApi.getAccounts();
        if (res.success) setAccounts(res.data);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [open]);

  // Handle New Journal Line Change and Update Live Preview
  const handleLineChange = (index, field, value) => {
    const updated = [...form.lines];
    updated[index][field] = value;
    setForm({ ...form, lines: updated });

    // Calculate totals
    let dr = 0;
    let cr = 0;
    for (const l of updated) {
      dr += parseFloat(l.debit || 0);
      cr += parseFloat(l.credit || 0);
    }
    setPreview({
      total_debit: dr.toFixed(2),
      total_credit: cr.toFixed(2),
      difference: (dr - cr).toFixed(2),
      is_balanced: Math.abs(dr - cr) < 0.0001 && dr > 0
    });
  };

  const addJournalLine = () => {
    setForm({
      ...form,
      lines: [...form.lines, { account_code: '1100', debit: '', credit: '', memo: '' }]
    });
  };

  const removeJournalLine = (index) => {
    if (form.lines.length <= 2) return;
    const updated = form.lines.filter((_, idx) => idx !== index);
    setForm({ ...form, lines: updated });
  };

  const handlePost = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...form,
        lines: form.lines.map(l => ({
          account_code: l.account_code,
          debit: l.debit || '0.00',
          credit: l.credit || '0.00',
          memo: l.memo
        }))
      };
      const res = await authApi.postJournal(payload);
      if (res.success) {
        setForm(emptyForm());
        setPreview(null);
        onClose();
        if (onPosted) await onPosted(`Journal ${res.data.journal.journal_number} posted successfully!`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
        <h3 className="text-base font-bold text-white mb-1">Post Balanced Double-Entry Journal</h3>
        <p className="text-xs text-slate-400 mb-4">
          All debits must equal credits. Backdated posting is prohibited in locked or hard-closed accounting periods.
        </p>

        <form onSubmit={handlePost} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Posting Date</label>
              <input
                type="date"
                required
                value={form.posting_date}
                onChange={(e) => setForm({ ...form, posting_date: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Source Module</label>
              <select
                value={form.source_module}
                onChange={(e) => setForm({ ...form, source_module: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="GL_MANUAL">GL_MANUAL (Manual Journal)</option>
                <option value="POLICY_BIND">POLICY_BIND (Policy Gross AR & UPR)</option>
                <option value="BILLING_AR">BILLING_AR (Billing Clearance)</option>
                <option value="TREASURY_BANK_REC">TREASURY_BANK_REC (Cash Receipt)</option>
                <option value="FINANCE_CLOSE">FINANCE_CLOSE (UPR Recognition)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Reference ID</label>
              <input
                type="text"
                placeholder="e.g. POL-TX-8821"
                value={form.reference_id}
                onChange={(e) => setForm({ ...form, reference_id: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Memo / Description</label>
            <input
              type="text"
              required
              placeholder="e.g. Initial Policy Gross Premium & UPR Reserve"
              value={form.memo}
              onChange={(e) => setForm({ ...form, memo: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Lines Table */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-300">Journal Lines (Debits & Credits)</span>
              <button
                type="button"
                onClick={addJournalLine}
                className="text-xs text-brand-400 hover:text-brand-300 font-medium"
              >
                + Add Line
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {form.lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-850 p-2 rounded-lg border border-slate-800">
                  <div className="col-span-4">
                    <select
                      required
                      value={line.account_code}
                      onChange={(e) => handleLineChange(idx, 'account_code', e.target.value)}
                      className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-white font-mono focus:border-brand-500 focus:outline-none"
                    >
                      <option value="">Select Account...</option>
                      {accounts.map((acc) => (
                        <option key={acc._id || acc.account_code} value={acc.account_code}>
                          {acc.account_code} - {acc.account_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Debit ($)"
                      value={line.debit}
                      onChange={(e) => handleLineChange(idx, 'debit', e.target.value)}
                      className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-emerald-400 font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Credit ($)"
                      value={line.credit}
                      onChange={(e) => handleLineChange(idx, 'credit', e.target.value)}
                      className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-emerald-400 font-mono"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      placeholder="Line memo"
                      value={line.memo}
                      onChange={(e) => handleLineChange(idx, 'memo', e.target.value)}
                      className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300"
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => removeJournalLine(idx)}
                      disabled={form.lines.length <= 2}
                      className="text-slate-500 hover:text-rose-400 text-xs disabled:opacity-30 cursor-pointer"
                      title={form.lines.length <= 2 ? 'Minimum 2 lines required' : 'Delete line'}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Preview Box */}
          {preview && (
            <div className="p-3 rounded-lg bg-slate-850 border border-slate-800 flex justify-between items-center text-xs font-mono">
              <div>
                <span className="text-slate-400">Total Dr: </span>
                <span className="text-white font-bold">${preview.total_debit}</span>
                <span className="text-slate-400 ml-4">Total Cr: </span>
                <span className="text-white font-bold">${preview.total_credit}</span>
              </div>
              <div className={preview.is_balanced ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {preview.is_balanced ? '✓ Balanced (Equilibrium)' : `Imbalance: $${preview.difference}`}
              </div>
            </div>
          )}


          {error && (
            <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-xs text-rose-400">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (preview && !preview.is_balanced)}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 transition disabled:opacity-50"
            >
              {submitting ? 'Posting...' : 'Post Journal'}
            </button>
          </div>
        </form>
        <ModalClose onClick={onClose} />
      </div>
    </div>
  );
}
