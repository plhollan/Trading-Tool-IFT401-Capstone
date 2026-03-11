import { useState, useEffect } from 'react';
import api from '../utils/api';
import { fmtCurrency, fmtDate } from '../utils/format';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api.get('/admin/users').then(r => setUsers(r.data.users));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-fade-in">
      <h1 className="text-2xl font-display text-white mb-6">Users ({users.length})</h1>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-600 text-xs text-slate-500">
              {['Full Name', 'Username', 'Email', 'Role', 'Cash Balance', 'Joined'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="table-row">
                <td className="px-4 py-3 text-slate-200">{u.full_name}</td>
                <td className="px-4 py-3 font-mono text-brand-400">{u.username}</td>
                <td className="px-4 py-3 text-slate-400">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full
                    ${u.role === 'admin' ? 'bg-brand-400/10 text-brand-400' : 'bg-surface-600 text-slate-400'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-emerald-400">{fmtCurrency(u.cash_balance)}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(u.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
