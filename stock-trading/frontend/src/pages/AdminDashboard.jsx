import { useState, useEffect } from 'react';
import api from '../utils/api';
import { fmtCurrency, fmtNumber, fmtDate } from '../utils/format';
import { Users, TrendingUp, ShoppingCart, DollarSign } from 'lucide-react';

export default function AdminDashboard() {
  const [users, setUsers]   = useState([]);
  const [stocks, setStocks] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/admin/users'),
      api.get('/stocks'),
      api.get('/admin/orders'),
    ]).then(([u, s, o]) => {
      setUsers(u.data.users);
      setStocks(s.data.stocks);
      setOrders(o.data.orders);
    });
  }, []);

  const stats = [
    { label: 'Total Users',    val: users.length,  icon: Users,       cls: 'text-brand-400'   },
    { label: 'Active Stocks',  val: stocks.length, icon: TrendingUp,  cls: 'text-emerald-400' },
    { label: 'Total Orders',   val: orders.length, icon: ShoppingCart,cls: 'text-yellow-400'  },
    { label: 'Total Volume ($)',
      val: fmtCurrency(orders.reduce((s, o) => s + o.total_amount, 0)),
      icon: DollarSign, cls: 'text-purple-400' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-fade-in">
      <h1 className="text-2xl font-display text-white mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, val, icon: Icon, cls }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-2"><Icon size={14} />{label}</div>
            <p className={`font-mono text-2xl font-medium ${cls}`}>{val}</p>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-surface-600">
          <h2 className="font-medium text-slate-200">Recent Orders</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-600 text-xs text-slate-500">
              {['User', 'Ticker', 'Type', 'Qty', 'Total', 'Status', 'Date'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.slice(0, 20).map(o => (
              <tr key={o.id} className="table-row text-xs">
                <td className="px-4 py-2.5 text-slate-300">{o.username}</td>
                <td className="px-4 py-2.5 font-display text-brand-400">{o.ticker}</td>
                <td className={`px-4 py-2.5 capitalize ${o.type === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>{o.type}</td>
                <td className="px-4 py-2.5 font-mono">{o.quantity}</td>
                <td className="px-4 py-2.5 font-mono">{fmtCurrency(o.total_amount)}</td>
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
