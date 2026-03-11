import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { fmtCurrency, fmtNumber, fmtPercent, changePct, changeClass } from '../utils/format';
import { Wallet, TrendingUp, PiggyBank, ArrowDownLeft, ArrowUpRight, X } from 'lucide-react';

function CashModal({ mode, cashBalance, onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const handleSubmit = async () => {
    setError('');
    const val = parseFloat(amount);
    if (!val || val <= 0) { setError('Enter a valid amount'); return; }
    setLoading(true);
    try {
      await api.post(`/portfolio/${mode}`, { amount: val });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="card w-full max-w-sm p-6 animate-slide-up">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-display text-white capitalize">{mode}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Cash balance: <span className="text-brand-400 font-mono">{fmtCurrency(cashBalance)}</span>
        </p>
        <label className="block text-xs text-slate-400 mb-1.5">Amount (USD)</label>
        <input type="number" min="0.01" step="0.01" className="input mb-4"
          placeholder="0.00" value={amount}
          onChange={e => setAmount(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full">
          {loading ? 'Processing…' : `Confirm ${mode}`}
        </button>
      </div>
    </div>
  );
}

export default function Portfolio() {
  const { refreshUser } = useAuth();
  const [data, setData]   = useState(null);
  const [modal, setModal] = useState(null); // 'deposit' | 'withdraw'

  const fetchPortfolio = () =>
    api.get('/portfolio').then(r => setData(r.data));

  useEffect(() => { fetchPortfolio(); }, []);

  const handleSuccess = () => { fetchPortfolio(); refreshUser(); };

  if (!data) return <div className="p-8 text-center text-slate-500">Loading portfolio…</div>;

  const { cash_balance, portfolio_value, total_value, holdings } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-fade-in">
      <h1 className="text-2xl font-display text-white mb-6">Portfolio</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Value',       val: total_value,      icon: Wallet,    cls: 'text-brand-400'   },
          { label: 'Invested (Stocks)', val: portfolio_value,  icon: TrendingUp, cls: 'text-emerald-400' },
          { label: 'Cash Balance',      val: cash_balance,     icon: PiggyBank, cls: 'text-yellow-400'  },
        ].map(({ label, val, icon: Icon, cls }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
              <Icon size={14} />{label}
            </div>
            <p className={`font-mono text-2xl font-medium ${cls}`}>{fmtCurrency(val)}</p>
          </div>
        ))}
      </div>

      {/* Cash actions */}
      <div className="flex gap-3 mb-6">
        <button onClick={() => setModal('deposit')}
          className="btn-primary flex items-center gap-2 text-sm">
          <ArrowDownLeft size={15} /> Deposit Cash
        </button>
        <button onClick={() => setModal('withdraw')}
          className="btn-secondary flex items-center gap-2 text-sm">
          <ArrowUpRight size={15} /> Withdraw Cash
        </button>
      </div>

      {/* Holdings table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-surface-600">
          <h2 className="font-medium text-slate-200">Holdings</h2>
        </div>
        {holdings.length === 0 ? (
          <p className="px-5 py-8 text-slate-500 text-sm text-center">
            You don't own any stocks yet. Head to the Market to buy some!
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-600 text-xs text-slate-500">
                {['Ticker', 'Company', 'Shares', 'Avg Cost', 'Curr. Price', 'Day Change', 'Mkt Value', 'Gain/Loss'].map(h => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {holdings.map(h => {
                const mktVal  = h.quantity * h.current_price;
                const costBasis = h.quantity * h.avg_cost;
                const gainLoss  = mktVal - costBasis;
                const gainPct   = changePct(mktVal, costBasis);
                const dayPct    = changePct(h.current_price, h.open_price);
                return (
                  <tr key={h.stock_id} className="table-row">
                    <td className="px-4 py-3 font-display text-brand-400">{h.ticker}</td>
                    <td className="px-4 py-3 text-slate-300">{h.company_name}</td>
                    <td className="px-4 py-3 font-mono">{fmtNumber(h.quantity)}</td>
                    <td className="px-4 py-3 font-mono text-slate-400">{fmtCurrency(h.avg_cost)}</td>
                    <td className="px-4 py-3 font-mono text-white">{fmtCurrency(h.current_price)}</td>
                    <td className={`px-4 py-3 font-mono ${changeClass(dayPct)}`}>{fmtPercent(dayPct)}</td>
                    <td className="px-4 py-3 font-mono text-white">{fmtCurrency(mktVal)}</td>
                    <td className={`px-4 py-3 font-mono ${changeClass(gainLoss)}`}>
                      {fmtCurrency(gainLoss)} ({fmtPercent(gainPct)})
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <CashModal
          mode={modal}
          cashBalance={cash_balance}
          onClose={() => setModal(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
