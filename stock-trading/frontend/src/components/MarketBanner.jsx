import { useEffect, useState } from 'react';
import api from '../utils/api';
import { Clock } from 'lucide-react';

export default function MarketBanner() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const fetch = () => api.get('/market/status').then(r => setStatus(r.data));
    fetch();
    const t = setInterval(fetch, 60000);
    return () => clearInterval(t);
  }, []);

  if (!status) return null;

  return (
    <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full font-mono
      ${status.is_open
        ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20'
        : 'bg-red-400/10 text-red-400 border border-red-400/20'
      }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status.is_open ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
      <Clock size={11} />
      Market {status.is_open ? 'Open' : 'Closed'}
      {status.settings && (
        <span className="text-slate-500 ml-1">
          {status.settings.open_time}–{status.settings.close_time} ET
        </span>
      )}
    </div>
  );
}
