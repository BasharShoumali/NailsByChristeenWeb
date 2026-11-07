import React, { useMemo, useState } from 'react';
import { useBook } from '../App.jsx';
import { Sheet, Icon, Swatch, Segmented, Avatar } from './ui.jsx';
import { uid, swatchHex, toMin, fromMin, fmtDur, PAYMENTS, todayKey } from '../lib/util.js';

const STATUSES = [
  { id: 'booked', label: 'Booked' }, { id: 'done', label: 'Paid' },
  { id: 'noshow', label: 'No-show' }, { id: 'cancelled', label: 'Cancelled' },
];

export default function ApptEditor({ appt, onClose }) {
  const { clients, services, appts, actions, money } = useBook();
  const isNew = !appt.id;
  const svcList = Object.values(services).sort((a, b) => a.name.localeCompare(b.name));
  const [f, setF] = useState(() => ({
    clientId: appt.clientId || '', clientName: appt.clientName || (appt.clientId && clients[appt.clientId]?.name) || '',
    phone: '', serviceIds: appt.serviceIds || [], date: appt.date || todayKey(), start: appt.start || '10:00',
    duration: appt.duration ?? 60, price: appt.price ?? '', tip: appt.tip || '', status: appt.status || 'booked',
    payment: appt.payment || 'cash', notes: appt.notes || '',
  }));
  const [touched, setTouched] = useState({ price: !isNew, duration: !isNew });
  const [query, setQuery] = useState('');
  const [picking, setPicking] = useState(isNew && !appt.clientId);
  const [confirmDel, setConfirmDel] = useState(false);
  const [err, setErr] = useState('');
  const set = (patch) => setF((p) => ({ ...p, ...patch }));

  const toggleSvc = (id) => {
    setF((p) => {
      const ids = p.serviceIds.includes(id) ? p.serviceIds.filter((x) => x !== id) : [...p.serviceIds, id];
      const chosen = ids.map((x) => services[x]).filter(Boolean);
      const next = { ...p, serviceIds: ids };
      if (!touched.price) next.price = chosen.reduce((s, x) => s + Number(x.price || 0), 0) || '';
      if (!touched.duration) next.duration = chosen.reduce((s, x) => s + Number(x.duration || 0), 0) || 60;
      return next;
    });
  };

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = Object.values(clients);
    const list = q ? all.filter((c) => c.name.toLowerCase().includes(q) || (c.phone || '').replace(/\D/g, '').includes(q.replace(/\D/g, '') || '§')) : all;
    return list.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 6);
  }, [clients, query]);

  const overlap = useMemo(() => {
    const s = toMin(f.start), e = s + Number(f.duration || 0);
    return Object.values(appts).find((a) => a.id !== appt.id && a.date === f.date && a.status !== 'cancelled' &&
      toMin(a.start) < e && toMin(a.start) + Number(a.duration || 0) > s);
  }, [appts, f.date, f.start, f.duration, appt.id]);

  const save = async () => {
    if (!f.clientName.trim()) { setErr('Choose a client or type a new name.'); setPicking(true); return; }
    let clientId = f.clientId;
    if (!clientId) {
      clientId = uid();
      const ok = await actions.saveClient({ id: clientId, name: f.clientName.trim(), phone: f.phone.trim(), notes: '', createdAt: todayKey() }, null);
      if (!ok) return;
    }
    const out = {
      id: appt.id || uid(), clientId, clientName: f.clientName.trim(), serviceIds: f.serviceIds, date: f.date, start: f.start,
      duration: Number(f.duration) || 30, price: Number(f.price) || 0, tip: f.status === 'done' ? Number(f.tip) || 0 : 0,
      status: f.status, payment: f.status === 'done' ? f.payment : '', notes: f.notes.trim(),
    };
    if (await actions.saveAppt(out, isNew ? 'Appointment booked' : 'Appointment updated')) onClose();
  };

  const del = async () => { if (await actions.deleteAppt(appt.id)) onClose(); };
  const endTime = fromMin(toMin(f.start) + Number(f.duration || 0));

  return (
    <Sheet title={isNew ? 'New appointment' : 'Appointment'} onClose={onClose}
      footer={
        <>
          {!isNew && (confirmDel
            ? <span className="confirm-del">Delete this appointment? <button className="btn danger sm" onClick={del}>Delete</button><button className="btn ghost sm" onClick={() => setConfirmDel(false)}>Keep</button></span>
            : <button className="btn ghost danger-text" onClick={() => setConfirmDel(true)}><Icon name="trash" size={18} />Delete</button>)}
          <span className="grow" />
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save}>{isNew ? 'Book it' : 'Save'}</button>
        </>
      }>
      <div className="form">
        <div className="field">
          <label htmlFor="ap-client">Client</label>
          {f.clientName && !picking ? (
            <div className="chosen-client">
              <Avatar name={f.clientName} size={36} />
              <div><strong>{f.clientName}</strong><small>{f.clientId ? (clients[f.clientId]?.phone || 'Existing client') : 'New client'}</small></div>
              <button className="btn ghost sm" onClick={() => { setPicking(true); setQuery(''); }}>Change</button>
            </div>
          ) : (
            <div className="combo">
              <div className="input-ico"><Icon name="search" size={18} />
                <input id="ap-client" value={query} placeholder="Search or type a new name" autoComplete="off"
                  onChange={(e) => { setQuery(e.target.value); setErr(''); }} />
              </div>
              <div className="combo-list">
                {matches.map((c) => (
                  <button key={c.id} type="button" onClick={() => { set({ clientId: c.id, clientName: c.name }); setPicking(false); }}>
                    <Avatar name={c.name} size={28} /><span>{c.name}</span><small>{c.phone}</small>
                  </button>
                ))}
                {query.trim() && !matches.some((c) => c.name.toLowerCase() === query.trim().toLowerCase()) && (
                  <button type="button" className="combo-new" onClick={() => { set({ clientId: '', clientName: query.trim() }); setPicking(false); }}>
                    <span className="plus-dot"><Icon name="plus" size={16} /></span><span>Add “{query.trim()}” as a new client</span>
                  </button>
                )}
                {!query.trim() && matches.length === 0 && <p className="hint">No clients yet. Type a name to add one.</p>}
              </div>
            </div>
          )}
          {!f.clientId && f.clientName && !picking && (
            <input className="mt8" id="ap-phone" value={f.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="Phone (optional)" inputMode="tel" />
          )}
          {err && <p className="err">{err}</p>}
        </div>

        <div className="field">
          <label>Services</label>
          <div className="chips">
            {svcList.map((s) => (
              <button key={s.id} type="button" className={'chip' + (f.serviceIds.includes(s.id) ? ' on' : '')} onClick={() => toggleSvc(s.id)} aria-pressed={f.serviceIds.includes(s.id)}>
                <Swatch hex={swatchHex(s.color)} />{s.name}<small>{money(s.price)}</small>
              </button>
            ))}
            {svcList.length === 0 && <p className="hint">Add your services on the Services page to pick them here.</p>}
          </div>
        </div>

        <div className="grid3">
          <div className="field"><label htmlFor="ap-date">Date</label><input id="ap-date" type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} /></div>
          <div className="field"><label htmlFor="ap-start">Start</label><input id="ap-start" type="time" step="300" value={f.start} onChange={(e) => set({ start: e.target.value })} /></div>
          <div className="field">
            <label htmlFor="ap-dur">Length</label>
            <select id="ap-dur" value={f.duration} onChange={(e) => { setTouched((t) => ({ ...t, duration: true })); set({ duration: Number(e.target.value) }); }}>
              {[15, 20, 30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240].concat([Number(f.duration)]).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b)
                .map((m) => <option key={m} value={m}>{fmtDur(m)}</option>)}
            </select>
          </div>
        </div>
        <p className="hint row-hint"><Icon name="clock" size={15} /> {f.start} – {endTime}
          {overlap && <span className="warn-text"> · Overlaps with {overlap.clientName} at {overlap.start}</span>}</p>

        <div className="field">
          <label>Status</label>
          <Segmented value={f.status} onChange={(v) => set({ status: v })} options={STATUSES} label="Status" />
        </div>

        <div className={'grid2' + (f.status === 'done' ? '' : ' one')}>
          <div className="field">
            <label htmlFor="ap-price">Price</label>
            <input id="ap-price" type="number" inputMode="decimal" min="0" value={f.price} placeholder="0"
              onChange={(e) => { setTouched((t) => ({ ...t, price: true })); set({ price: e.target.value }); }} />
          </div>
          {f.status === 'done' && (
            <div className="field"><label htmlFor="ap-tip">Tip</label>
              <input id="ap-tip" type="number" inputMode="decimal" min="0" value={f.tip} placeholder="0" onChange={(e) => set({ tip: e.target.value })} /></div>
          )}
        </div>
        {f.status === 'done' && (
          <div className="field">
            <label>Paid with</label>
            <Segmented value={f.payment} onChange={(v) => set({ payment: v })} options={PAYMENTS} label="Payment method" />
          </div>
        )}

        <div className="field">
          <label htmlFor="ap-notes">Notes</label>
          <textarea id="ap-notes" rows={2} value={f.notes} placeholder="Colour, shape, design ideas…" onChange={(e) => set({ notes: e.target.value })} />
        </div>
      </div>
    </Sheet>
  );
}
