export const pad = (n) => String(n).padStart(2, '0');
export const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
export const todayKey = () => keyOf(new Date());
export const startOfWeek = (d, ws = 0) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return addDays(x, -((x.getDay() - ws + 7) % 7));
};
export const toMin = (t) => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
export const fromMin = (m) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
export const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();

export const fmtDate = (k, opts) => fromKey(k).toLocaleDateString('en-GB', opts);
export const fmtLong = (k) => fmtDate(k, { weekday: 'long', day: 'numeric', month: 'long' });
export const fmtShort = (k) => fmtDate(k, { day: 'numeric', month: 'short', year: 'numeric' });
export const fmtDur = (m) => { m = Number(m) || 0; const h = Math.floor(m / 60), r = m % 60; return h ? (r ? `${h}h ${r}m` : `${h}h`) : `${r}m`; };

export function relDay(k) {
  const diff = Math.round((fromKey(todayKey()) - fromKey(k)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff === -1) return 'Tomorrow';
  if (diff < 0) return `In ${-diff} days`;
  if (diff < 14) return `${diff} days ago`;
  if (diff < 60) return `${Math.round(diff / 7)} weeks ago`;
  if (diff < 365) return `${Math.round(diff / 30)} months ago`;
  return `${(diff / 365).toFixed(1).replace('.0', '')} years ago`;
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const sum = (arr) => arr.reduce((s, n) => s + (Number(n) || 0), 0);
export const earned = (a) => (a.status === 'done' ? (Number(a.price) || 0) + (Number(a.tip) || 0) : 0);
export const byStart = (a, b) => (a.date + a.start).localeCompare(b.date + b.start);

export function makeMoney(currency = 'ILS') {
  let f;
  try { f = new Intl.NumberFormat('en-GB', { style: 'currency', currency, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 }); }
  catch { f = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }); }
  return (n) => f.format(Math.round(Number(n) || 0));
}

export const initials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map((p) => p[0] || '').join('').toUpperCase() || '?';
const AV = ['#B0244F', '#9C6B98', '#D98A6C', '#5E8F75', '#4B5A9A', '#C9A04A', '#E58FA5', '#7A5C4F'];
export const avatarColor = (s = '') => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return AV[h % AV.length]; };

export const SWATCHES = [
  { id: 'cherry', name: 'Cherry', hex: '#B0244F' },
  { id: 'rose', name: 'Rosé', hex: '#E58FA5' },
  { id: 'nude', name: 'Nude', hex: '#CFA58E' },
  { id: 'coral', name: 'Coral', hex: '#F0694E' },
  { id: 'mauve', name: 'Mauve', hex: '#9C6B98' },
  { id: 'lilac', name: 'Lilac', hex: '#A992DB' },
  { id: 'sage', name: 'Sage', hex: '#7FA98B' },
  { id: 'midnight', name: 'Midnight', hex: '#3C4A8C' },
  { id: 'gold', name: 'Gold', hex: '#C9A04A' },
];
export const swatchHex = (id) => (SWATCHES.find((s) => s.id === id) || SWATCHES[0]).hex;

export const STATUS = {
  booked: { label: 'Booked', cls: 'st-booked' },
  done: { label: 'Paid', cls: 'st-done' },
  noshow: { label: 'No-show', cls: 'st-noshow' },
  cancelled: { label: 'Cancelled', cls: 'st-cancelled' },
};
export const PAYMENTS = [
  { id: 'cash', label: 'Cash' },
  { id: 'card', label: 'Card' },
  { id: 'bit', label: 'Bit' },
  { id: 'transfer', label: 'Transfer' },
];

export const DEFAULT_SERVICES = [
  { name: 'Classic manicure', duration: 45, price: 80, color: 'nude' },
  { name: 'Gel polish', duration: 60, price: 120, color: 'cherry' },
  { name: 'Gel extensions', duration: 120, price: 220, color: 'mauve' },
  { name: 'Extensions fill', duration: 90, price: 160, color: 'lilac' },
  { name: 'Pedicure', duration: 60, price: 140, color: 'sage' },
  { name: 'Gel pedicure', duration: 75, price: 160, color: 'coral' },
  { name: 'Nail art', duration: 20, price: 40, color: 'gold' },
  { name: 'Gel removal', duration: 20, price: 40, color: 'rose' },
];

export const DEFAULT_SETTINGS = { ownerName: '', salonName: '', currency: 'ILS', dayStart: '09:00', dayEnd: '20:00', weekStart: 0, started: false };
