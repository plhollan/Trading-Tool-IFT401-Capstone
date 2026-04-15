import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { fmtCurrency, fmtNumber, fmtPercent, changePct, changeClass } from '../utils/format';
import MarketBanner from '../components/MarketBanner';
import { Search, TrendingUp, TrendingDown, X, RefreshCw } from 'lucide-react';

function TradeModal({ stock, onClose, onSuccess }) {
  const { user, refreshUser } = useAuth();
  const [type, setType]       = useState('buy');
  const [qty, setQty]         = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const total = stock.current_price * qty;

  const handleTrade = async () => {
    setError('');
    setLoading(true);
    try {
      await api.post('/orders', { stock_id: stock.id, type, quantity: parseInt(qty) });
      await refreshUser();
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Order failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="card w-full max-w-md p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display text-lg text-white">{stock.ticker}</h2>
            <p className="text-xs text-slate-400">{stock.company_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={20} /></button>
        </div>

        {/* Buy / Sell toggle */}
        <div className="flex rounded-lg overflow-hidden border border-surface-600 mb-5">
          {['buy', 'sell'].map(t => (
            <button key={t} onClick={() => setType(t)}
              className={`flex-1 py-2 text-sm font-medium transition-colors capitalize
                ${type === t
                  ? t === 'buy' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                  : 'text-slate-400 hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Stock info row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Price',  val: fmtCurrency(stock.current_price) },
            { label: 'Open',   val: fmtCurrency(stock.open_price) },
            { label: 'Volume', val: fmtNumber(stock.available_volume) },
          ].map(({ label, val }) => (
            <div key={label} className="bg-surface-700 rounded-lg p-2.5 text-center">
              <p className="text-xs text-slate-500 mb-0.5">{label}</p>
              <p className="font-mono text-sm text-white">{val}</p>
            </div>
          ))}
        </div>

        {/* Quantity */}
        <div className="mb-4">
          <label className="block text-xs text-slate-400 mb-1.5">Shares</label>
          <div className="flex gap-2">
            <button onClick={() => setQty(q => Math.max(1, q - 1))}
              className="btn-secondary px-3">−</button>
            <input type="number" min="1" className="input text-center font-mono"
              value={qty} onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))} />
            <button onClick={() => setQty(q => q + 1)}
              className="btn-secondary px-3">+</button>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-surface-700 rounded-lg p-3 mb-4 text-sm space-y-1">
          <div className="flex justify-between text-slate-400">
            <span>Market price</span><span className="font-mono">{fmtCurrency(stock.current_price)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Shares</span><span className="font-mono">{qty}</span>
          </div>
          <div className="flex justify-between text-white font-medium border-t border-surface-600 pt-1 mt-1">
            <span>Total</span><span className="font-mono">{fmtCurrency(total)}</span>
          </div>
          {type === 'buy' && (
            <div className="flex justify-between text-xs text-slate-500">
              <span>Cash available</span>
              <span className={total > user.cash_balance ? 'text-red-400' : 'text-emerald-400'}>
                {fmtCurrency(user.cash_balance)}
              </span>
            </div>
          )}
        </div>

        {error && <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg mb-3">{error}</p>}

        <button onClick={handleTrade} disabled={loading}
          className={`w-full py-2.5 rounded-lg font-medium transition-colors
            ${type === 'buy'
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40'
              : 'bg-red-600 hover:bg-red-700 text-white disabled:opacity-40'}`}>
          {loading ? 'Placing order…' : `${type === 'buy' ? 'Buy' : 'Sell'} ${qty} share${qty > 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
}

export default function Market() {
  const [stocks, setStocks]   = useState([]);
  const [search, setSearch]   = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchStocks = useCallback(() => {
    api.get('/stocks').then(r => {
      setStocks(r.data.stocks);
      setLastUpdate(new Date());
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    fetchStocks();
    const t = setInterval(fetchStocks, 30000);
    return () => clearInterval(t);
  }, [fetchStocks]);

  const filtered = stocks.filter(s =>
    s.ticker.includes(search.toUpperCase()) ||
    s.company_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display text-white">Market</h1>
          <p className="text-sm text-slate-400">Live stock prices — updates every 30s</p>
        </div>
        <div className="flex items-center gap-3">
          <MarketBanner />
          <button onClick={fetchStocks} className="btn-secondary flex items-center gap-1.5 text-sm">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-2.5 text-slate-500" />
        <input className="input pl-9" placeholder="Search ticker or company…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-600 text-xs text-slate-500 font-medium">
              {['', 'Ticker', 'Company', 'Price', 'Change', 'Open', 'High', 'Low', 'Volume', 'Mkt Cap'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">Loading stocks…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">No stocks found</td></tr>
            ) : filtered.map(s => {
              const pct = changePct(s.current_price, s.prev_close || s.open_price);
              const cls = changeClass(pct);
              return (
                <tr key={s.id} className="table-row">
                  <td className="px-4 py-3">
                    <button onClick={() => setSelected(s)} className="btn-primary text-xs px-3 py-1.5">
                      Trade
                    </button>
                  </td>
                  <td className="px-4 py-3 font-display font-medium text-brand-400">{s.ticker}</td>
                  <td className="px-4 py-3 text-slate-300">{s.company_name}</td>
                  <td className="px-4 py-3 font-mono text-white font-medium">{fmtCurrency(s.current_price)}</td>
                  <td className={`px-4 py-3 font-mono ${cls}`}>
                    <span className="flex items-center gap-1">
                      {pct > 0 ? <TrendingUp size={12} /> : pct < 0 ? <TrendingDown size={12} /> : null}
                      {fmtPercent(pct)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400">{fmtCurrency(s.open_price)}</td>
                  <td className="px-4 py-3 font-mono text-emerald-400">{fmtCurrency(s.high_price)}</td>
                  <td className="px-4 py-3 font-mono text-red-400">{fmtCurrency(s.low_price)}</td>
                  <td className="px-4 py-3 font-mono text-slate-400">{fmtNumber(s.available_volume)}</td>
                  <td className="px-4 py-3 font-mono text-slate-400">
                    {fmtCurrency(s.current_price * s.total_volume)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {lastUpdate && (
        <p className="text-xs text-slate-600 mt-2 text-right">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </p>
      )}

      {selected && (
        <TradeModal
          stock={selected}
          onClose={() => setSelected(null)}
          onSuccess={fetchStocks}
        />
      )}
    </div>
  );
}
