export const fmtCurrency = (n) =>
  n == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

export const fmtNumber = (n) =>
  n == null ? '—' : new Intl.NumberFormat('en-US').format(n);

export const fmtPercent = (n) =>
  n == null ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

export const fmtDate = (s) => {
  if (!s) return '—';
  return new Date(s).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

export const changePct = (current, ref) => {
  if (!ref || ref === 0) return 0;
  return ((current - ref) / ref) * 100;
};

export const changeClass = (n) => {
  if (n > 0) return 'text-emerald-400';
  if (n < 0) return 'text-red-400';
  return 'text-slate-400';
};
