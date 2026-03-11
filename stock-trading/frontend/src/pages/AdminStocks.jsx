import { useState, useEffect } from 'react';
import api from '../utils/api';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { Plus, X, ToggleLeft, ToggleRight } from 'lucide-react';

function NewStockModal({ onClose, onSuccess }) {
  const [form, setForm]   = useState({ company_name: '', ticker: '', volume: '', initial_price: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!form.company_name || !form.ticker || !form.volume || !form.initial_price) {
      setError('All fields are required'); return;
    }
    setLoading(true);
    try {
      await api.post('/stocks', {
        ...form,
        volume: parseInt(form.volume),
        initial_price: parseFloat(form.initial_price),
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create stock');
    } finally {
      setLoading(false);
    }
  };

  const field = (key, label, placeholder, type = 'text') => (
    <div>
      <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
      <input type={type} className="input" placeholder={placeholder}
        value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="card w-full max-w-md p-6 animate-slide-up">
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-display text-white">New Stock</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          {field('company_name', 'Company Name', 'Apple Inc.')}
          {field('ticker', 'Ticker Symbol', 'AAPL')}
          {field('volume', 'Total Shares', '1000000', 'number')}
          {field('initial_price', 'Initial Price ($)', '150.00', 'number')}
        </div>
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full mt-5">
          {loading ? 'Creating…' : 'Create Stock'}
        </button>
      </div>
    </div>
  );
}

export default function AdminStocks() {
  const [stocks, setStocks]     = useState([]);
  const [showModal, setShowModal] = useState(false);

  const fetchStocks = () => api.get('/stocks').then(r => setStocks(r.data.stocks));
  useEffect(() => { fetchStocks(); }, []);

  const toggleActive = async (stock) => {
    await api.patch(`/stocks/${stock.id}`, { is_active: !stock.is_active });
    fetchStocks();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display text-white">Manage Stocks</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={15} /> Add Stock
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-600 text-xs text-slate-500">
              {['Ticker', 'Company', 'Current Price', 'Init Price', 'Vol (Total)', 'Vol (Avail)', 'Mkt Cap', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stocks.map(s => (
              <tr key={s.id} className="table-row">
                <td className="px-4 py-3 font-display text-brand-400">{s.ticker}</td>
                <td className="px-4 py-3 text-slate-300">{s.company_name}</td>
                <td className="px-4 py-3 font-mono">{fmtCurrency(s.current_price)}</td>
                <td className="px-4 py-3 font-mono text-slate-400">{fmtCurrency(s.initial_price)}</td>
                <td className="px-4 py-3 font-mono text-slate-400">{fmtNumber(s.total_volume)}</td>
                <td className="px-4 py-3 font-mono">{fmtNumber(s.available_volume)}</td>
                <td className="px-4 py-3 font-mono text-slate-400">{fmtCurrency(s.current_price * s.total_volume)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full
                    ${s.is_active ? 'bg-emerald-400/10 text-emerald-400' : 'bg-slate-500/10 text-slate-500'}`}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(s)}
                    className="text-slate-400 hover:text-brand-400 transition-colors" title="Toggle active">
                    {s.is_active ? <ToggleRight size={18} className="text-emerald-400" /> : <ToggleLeft size={18} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && <NewStockModal onClose={() => setShowModal(false)} onSuccess={fetchStocks} />}
    </div>
  );
}
