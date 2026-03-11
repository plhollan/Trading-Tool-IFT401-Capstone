import { useState, useEffect } from 'react';
import api from '../utils/api';
import { fmtCurrency, fmtDate } from '../utils/format';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.get('/admin/orders').then(r => setOrders(r.data.orders));
  }, []);

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display text-white">All Orders</h1>
        <div className="flex gap-1">
          {['all', 'executed', 'pending', 'cancelled'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-colors
                ${filter === f ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white bg-surface-700'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-600 text-xs text-slate-500">
              {['User', 'Ticker', 'Type', 'Qty', 'Price', 'Total', 'Status', 'Date'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id} className="table-row text-xs">
                <td className="px-4 py-2.5 text-slate-300">{o.username}</td>
                <td className="px-4 py-2.5 font-display text-brand-400">{o.ticker}</td>
                <td className={`px-4 py-2.5 capitalize font-medium ${o.type === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>{o.type}</td>
                <td className="px-4 py-2.5 font-mono">{o.quantity}</td>
                <td className="px-4 py-2.5 font-mono text-slate-300">{fmtCurrency(o.price)}</td>
                <td className="px-4 py-2.5 font-mono text-white">{fmtCurrency(o.total_amount)}</td>
                <td className="px-4 py-2.5">
                  <span className={`px-2 py-0.5 rounded-full
                    ${o.status === 'executed' ? 'bg-emerald-400/10 text-emerald-400' :
                      o.status === 'cancelled' ? 'bg-red-400/10 text-red-400' :
                      'bg-yellow-400/10 text-yellow-400'}`}>
                    {o.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-slate-400">{fmtDate(o.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
