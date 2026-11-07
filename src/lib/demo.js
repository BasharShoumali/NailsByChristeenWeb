import { DEFAULT_SERVICES, DEFAULT_SETTINGS, addDays, keyOf, fromMin } from './util.js';

// Example book shown before she starts her own. Never saved.
export function makeDemo() {
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

  const services = {};
  DEFAULT_SERVICES.forEach((s, i) => { const id = 'svc' + i; services[id] = { ...s, id }; });
  const svcIds = Object.keys(services);
  const weights = [3, 6, 3, 4, 3, 2, 2, 1];
  const pickSvc = () => { let t = rnd() * 24, i = 0; while (t > weights[i]) { t -= weights[i]; i++; } return svcIds[Math.min(i, svcIds.length - 1)]; };

  const names = ['Lina Haddad', 'Maya Cohen', 'Noor Khoury', 'Rana Saleh', 'Yara Nassar', 'Dana Levi', 'Sara Mansour', 'Rawan Daher',
    'Tala Aboud', 'Shira Katz', 'Noa Friedman', 'Hala Bishara', 'Celine Awad', 'Jana Sabbagh', 'Rim Toma', 'Aya Zoabi', 'Mira Elias', 'Lea Ben-David'];
  const notesPool = ['Almond shape, short', 'Loves nude & milky pinks', 'Sensitive cuticles, gentle push only', 'Coffin, medium length',
    'Always books gel + art', 'Allergic to HEMA, use hypo gel', 'Prefers evenings', 'Squoval, natural length', ''];
  const clients = {};
  names.forEach((n, i) => {
    const id = 'cl' + i;
    clients[id] = { id, name: n, phone: `05${Math.floor(rnd() * 9)}-${Math.floor(1000000 + rnd() * 8999999)}`, notes: notesPool[i % notesPool.length], createdAt: '2026-05-01' };
  });
  const clIds = Object.keys(clients);
  const regulars = clIds.slice(0, 7);

  const appts = {};
  const today = new Date();
  let n = 0;
  for (let d = -110; d <= 12; d++) {
    const day = addDays(today, d);
    if (day.getDay() === 0) continue; // closed Sundays in the example
    const count = d > 0 ? Math.floor(rnd() * 4) + 1 : Math.floor(rnd() * 4) + 3;
    let t = 9 * 60 + Math.floor(rnd() * 3) * 30;
    for (let k = 0; k < count && t < 18 * 60; k++) {
      const ids = [pickSvc()];
      if (rnd() < 0.25) ids.push('svc6');
      const duration = ids.reduce((s, id) => s + services[id].duration, 0);
      const price = ids.reduce((s, id) => s + services[id].price, 0);
      const clientId = rnd() < 0.55 ? pick(regulars) : pick(clIds);
      const isPast = d < 0 || (d === 0 && t + duration < today.getHours() * 60 + today.getMinutes());
      let status = 'booked';
      if (isPast) { const r = rnd(); status = r < 0.92 ? 'done' : r < 0.96 ? 'noshow' : 'cancelled'; }
      if (d === -1 && k === count - 1) status = 'booked'; // one to check out
      const id = 'ap' + n++;
      appts[id] = {
        id, clientId, clientName: clients[clientId].name, serviceIds: ids, date: keyOf(day), start: fromMin(t), duration, price,
        tip: status === 'done' && rnd() < 0.3 ? 10 * (1 + Math.floor(rnd() * 3)) : 0,
        status, payment: status === 'done' ? pick(['cash', 'cash', 'card', 'bit', 'bit']) : '', notes: '',
      };
      t += duration + (rnd() < 0.5 ? 0 : 30);
    }
  }
  return { settings: { ...DEFAULT_SETTINGS, ownerName: 'Christeen', salonName: 'Example Studio' }, clients, appts, services };
}
