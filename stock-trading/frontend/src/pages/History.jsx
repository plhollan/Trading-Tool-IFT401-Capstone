import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { fmtCurrency, fmtDate } from '../utils/format';
import { ArrowDownLeft, ArrowUpRight, ShoppingCart, DollarSign, X } from 'lucide-react';

const TYPE_CONFIG = {
  deposit:    { label: 'Deposit',   icon: ArrowDownLeft, cls: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  withdrawal: { label: 'Withdraw',  icon: ArrowUpRight,  cls: 'text-red-400',     bg: 'bg-red-400/10'     },
  trade_buy:  { label: 'Buy',       icon: ShoppingCart,  cls: 'text-brand-400',   bg: 'bg-brand-400/10'   },
  trade_sell: { label: 'Sell',      icon: DollarSign,    cls: 'text-yellow-400',  bg: 'bg-yellow-400/10'  },
};

const GRACE_SECONDS = 60;

function Countdown({ createdAt }) {
  const getSecondsLeft = () => {
    const elapsed = Math.floor((Date.now() - new Date(createdAt + 'Z').getTime()) / 1000);
    return Math.max(0, GRACE_SECONDS - elapsed);
  };

  const [secondsLeft, setSecondsLeft] = useState(getSecondsLeft);

  useEffect(() => {
    const t = setInterval(() => setSecondsLeft(getSecondsLeft()), 1000);
    return () => clearInterval(t);
  }, [createdAt]);

  const pct = (secondsLeft / GRACE_SECONDS) * 100;
  const color = secondsLeft > 20 ? 'text-emerald-400' : secondsLeft > 10 ? 'text-yellow-400' : 'text-red-400';

  return (
    <span className={`font-mono text-xs ${color}`}>
      {secondsLeft}s
    </span>
  );
}

export default function History() {
  const { refreshUser } = useAuth();
  const [txs, setTxs]         = useState([]);
  const [orders, setOrders]   = useState([]);
  const [tab, setTab]         = useState('transactions');
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);

  const fetchData = useCallback(() => {
    Promise.all([
      api.get('/portfolio/transactions'),
      api.get('/orders'),
    ]).then(([txRes, ordRes]) => {
      setTxs(txRes.data.transactions);
      setOrders(ordRes.data.orders);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 10 seconds to reflect executed/cancelled status changes
    const t = setInterval(fetchData, 10000);
    return () => clearInterval(t);
  }, [fetchData]);

  const handleCancel = async (orderId) => {
    setCancelling(orderId);
    try {
      await api.delete(`/orders/${orderId}`);
      await refreshUser();
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Cancellation failed');
    } finally {
      setCancelling(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 animate-fade-in">
      <h1 className="text-2xl font-display text-white mb-6">History</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-surface-600">
        {[
          { key: 'transactions', label: 'Transactions' },
          { key: 'orders',       label: 'Orders'       },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm transition-colors -mb-px
              ${tab === t.key
                ? 'border-b-2 border-brand-500 text-brand-400'
                : 'text-slate-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-500 text-center py-8">Loading…</p>
      ) : tab === 'transactions' ? (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-600 text-xs text-slate-500">
                {['Type', 'Description', 'Amount', 'Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txs.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No transactions yet</td></tr>
              ) : txs.map(tx => {
                const cfg = TYPE_CONFIG[tx.type] || { label: tx.type, icon: DollarSign, cls: 'text-slate-400', bg: 'bg-surface-700' };
                const Icon = cfg.icon;
                return (
                  <tr key={tx.id} className="table-row">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${cfg.cls} ${cfg.bg}`}>
                        <Icon size={11} />{cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs">{tx.description}</td>
                    <td className={`px-4 py-3 font-mono font-medium ${
                      ['deposit','trade_sell'].includes(tx.type) ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {['deposit','trade_sell'].includes(tx.type) ? '+' : '−'}{fmtCurrency(tx.amount)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{fmtDate(tx.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-600 text-xs text-slate-500">
                {['Ticker', 'Type', 'Qty', 'Price', 'Total', 'Status', 'Expires In', 'Date', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left last:text-right">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">No orders yet</td></tr>
              ) : orders.map(o => (
                <tr key={o.id} className="table-row">
                  <td className="px-4 py-3 font-display text-brand-400">{o.ticker}</td>
                  <td className={`px-4 py-3 font-medium capitalize ${o.type === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {o.type}
                  </td>
                  <td className="px-4 py-3 font-mono">{o.quantity}</td>
                  <td className="px-4 py-3 font-mono text-slate-300">{fmtCurrency(o.price)}</td>
                  <td className="px-4 py-3 font-mono text-white">{fmtCurrency(o.total_amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full
                      ${o.status === 'executed'  ? 'bg-emerald-400/10 text-emerald-400' :
                        o.status === 'cancelled' ? 'bg-red-400/10 text-red-400' :
                        'bg-yellow-400/10 text-yellow-400'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {o.status === 'pending' ? <Countdown createdAt={o.created_at} /> : <span className="text-slate-600 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{fmtDate(o.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {o.status === 'pending' && (
                      <button
                        onClick={() => handleCancel(o.id)}
                        disabled={cancelling === o.id}
                        className="btn-danger text-xs px-3 py-1.5 flex items-center gap-1 ml-auto">
                        <X size={12} />
                        {cancelling === o.id ? 'Cancelling…' : 'Cancel'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
