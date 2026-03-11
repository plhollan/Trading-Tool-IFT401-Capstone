import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Clock, Plus, Trash2, Check } from 'lucide-react';

export default function AdminMarket() {
  const [settings, setSettings]   = useState(null);
  const [holidays, setHolidays]   = useState([]);
  const [form, setForm]           = useState({ open_time: '', close_time: '' });
  const [newHol, setNewHol]       = useState({ date: '', name: '' });
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState('');

  const fetch = () =>
    api.get('/admin/market').then(r => {
      setSettings(r.data.settings);
      setHolidays(r.data.holidays);
      setForm({ open_time: r.data.settings.open_time, close_time: r.data.settings.close_time });
    });

  useEffect(() => { fetch(); }, []);

  const saveHours = async () => {
    setError('');
    try {
      await api.put('/admin/market', form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    }
  };

  const addHoliday = async () => {
    if (!newHol.date || !newHol.name) { setError('Date and name required'); return; }
    try {
      await api.post('/admin/holidays', newHol);
      setNewHol({ date: '', name: '' });
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add holiday');
    }
  };

  const deleteHoliday = async (id) => {
    await api.delete(`/admin/holidays/${id}`);
    fetch();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 animate-fade-in">
      <h1 className="text-2xl font-display text-white mb-6">Market Settings</h1>

      {/* Hours card */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <Clock size={16} className="text-brand-400" />
          <h2 className="font-medium text-slate-200">Trading Hours (ET)</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {['open_time', 'close_time'].map(key => (
            <div key={key}>
              <label className="block text-xs text-slate-400 mb-1.5 capitalize">
                {key.replace('_', ' ')} (HH:MM)
              </label>
              <input type="time" className="input font-mono"
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
            </div>
          ))}
        </div>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <button onClick={saveHours} className="btn-primary flex items-center gap-2">
          {saved ? <><Check size={14} /> Saved!</> : 'Save Hours'}
        </button>
      </div>

      {/* Holidays */}
      <div className="card p-6">
        <h2 className="font-medium text-slate-200 mb-4">Market Holidays</h2>

        {/* Add holiday */}
        <div className="flex gap-2 mb-5">
          <input type="date" className="input" value={newHol.date}
            onChange={e => setNewHol(h => ({ ...h, date: e.target.value }))} />
          <input type="text" className="input" placeholder="Holiday name"
            value={newHol.name}
            onChange={e => setNewHol(h => ({ ...h, name: e.target.value }))} />
          <button onClick={addHoliday} className="btn-primary shrink-0 flex items-center gap-1">
            <Plus size={14} /> Add
          </button>
        </div>

        {/* Holiday list */}
        <div className="space-y-1.5">
          {holidays.map(h => (
            <div key={h.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-700">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-slate-400">{h.date}</span>
                <span className="text-sm text-slate-200">{h.name}</span>
              </div>
              <button onClick={() => deleteHoliday(h.id)}
                className="text-slate-600 hover:text-red-400 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
