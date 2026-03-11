import { useState, useEffect } from 'react';
import api from '../utils/api';
import { fmtCurrency, fmtDate } from '../utils/format';
import { ArrowDownLeft, ArrowUpRight, ShoppingCart, DollarSign } from 'lucide-react';

const TYPE_CONFIG = {
  deposit:    { label: 'Deposit',   icon: ArrowDownLeft, cls: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  withdrawal: { label: 'Withdraw',  icon: ArrowUpRight,  cls: 'text-red-400',     bg: 'bg-red-400/10'     },
  trade_buy:  { label: 'Buy',       icon: ShoppingCart,  cls: 'text-brand-400',   bg: 'bg-brand-400/10'   },
  trade_sell: { label: 'Sell',      icon: DollarSign,    cls: 'text-yellow-400',  bg: 'bg-yellow-400/10'  },
};

export default function History() {
  const [txs, setTxs]           = useState([]);
  const [orders, setOrders]     = useState([]);
  const [tab, setTab]           = useState('transactions');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/portfolio/transactions'),
      api.get('/orders'),
    ]).then(([txRes, ordRes]) => {
      setTxs(txRes.data.transactions);
      setOrders(ordRes.data.orders);
      setLoading(false);
    });
  }, []);

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
                {['Ticker', 'Type', 'Qty', 'Price', 'Total', 'Status', 'Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No orders yet</td></tr>
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
                  <td className="px-4 py-3 text-xs text-slate-400">{fmtDate(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
