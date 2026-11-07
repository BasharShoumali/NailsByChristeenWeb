import React, { useMemo, useState } from 'react';
import { useBook } from '../App.jsx';
import { Sheet, Icon, Avatar, StatusPill, Swatch, Empty } from './ui.jsx';
import { uid, todayKey, earned, fmtShort, relDay, swatchHex, sum, PAYMENTS, fromKey } from '../lib/util.js';

export function ClientEditor({ client, onClose }) {
  const { actions, appts, ui } = useBook();
  const [f, setF] = useState({ name: client?.name || '', phone: client?.phone || '', birthday: client?.birthday || '', notes: client?.notes || '' });
  const [err, setErr] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);
  const set = (p) => setF((x) => ({ ...x, ...p }));
  const save = async () => {
    if (!f.name.trim()) { setErr('Add a name so you can find her later.'); return; }
    const out = { ...(client || { id: uid(), createdAt: todayKey() }), name: f.name.trim(), phone: f.phone.trim(), birthday: f.birthday, notes: f.notes.trim() };
    if (await actions.saveClient(out, client ? 'Client updated' : 'Client added')) {
      if (client) {
        // keep stored names on appointments in step with the new name
        for (const a of Object.values(appts)) if (a.clientId === client.id && a.clientName !== out.name) await actions.saveAppt({ ...a, clientName: out.name }, null);
      }
      ui.openClient(out.id);
    }
  };
  const del = async () => { if (await actions.deleteClient(client.id)) onClose(); };
  return (
    <Sheet title={client ? 'Edit client' : 'New client'} onClose={onClose}
      footer={<>
        {client && (confirmDel
          ? <span className="confirm-del">Delete {client.name}? Visits stay in your income. <button className="btn danger sm" onClick={del}>Delete</button><button className="btn ghost sm" onClick={() => setConfirmDel(false)}>Keep</button></span>
          : <button className="btn ghost danger-text" onClick={() => setConfirmDel(true)}><Icon name="trash" size={18} />Delete</button>)}
        <span className="grow" />
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={save}>Save</button>
      </>}>
      <div className="form">
        <div className="field"><label htmlFor="cl-name">Name</label>
          <input id="cl-name" value={f.name} onChange={(e) => { set({ name: e.target.value }); setErr(''); }} placeholder="Full name" />
          {err && <p className="err">{err}</p>}</div>
        <div className="grid2">
          <div className="field"><label htmlFor="cl-phone">Phone</label>
            <input id="cl-phone" value={f.phone} inputMode="tel" onChange={(e) => set({ phone: e.target.value })} placeholder="050-0000000" /></div>
          <div className="field"><label htmlFor="cl-bday">Birthday</label>
            <input id="cl-bday" type="date" value={f.birthday} onChange={(e) => set({ birthday: e.target.value })} /></div>
        </div>
        <div className="field"><label htmlFor="cl-notes">Notes</label>
          <textarea id="cl-notes" rows={4} value={f.notes} onChange={(e) => set({ notes: e.target.value })}
            placeholder="Nail shape, length, favourite colours, allergies, sensitive cuticles…" /></div>
      </div>
    </Sheet>
  );
}

export function clientStats(appts, id) {
  const visits = Object.values(appts).filter((a) => a.clientId === id).sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
  const done = visits.filter((a) => a.status === 'done');
  const t = todayKey();
  const total = sum(done.map(earned));
  return {
    visits, done, total,
    avg: done.length ? total / done.length : 0,
    last: done[0]?.date || null,
    next: visits.filter((a) => a.date >= t && a.status === 'booked').sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0] || null,
    first: done[done.length - 1]?.date || null,
    noShows: visits.filter((a) => a.status === 'noshow').length,
  };
}

export function ClientDetail({ id, onClose }) {
  const { clients, appts, services, money, ui } = useBook();
  const c = clients[id];
  const st = useMemo(() => clientStats(appts, id), [appts, id]);
  const favs = useMemo(() => {
    const m = {};
    st.done.forEach((a) => (a.serviceIds || []).forEach((s) => { m[s] = (m[s] || 0) + 1; }));
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s, n]) => ({ s: services[s], n })).filter((x) => x.s);
  }, [st, services]);
  const [copied, setCopied] = useState(false);
  if (!c) return <Sheet title="Client" onClose={onClose}><Empty title="This client was deleted" /></Sheet>;
  const copy = async () => {
    try { await navigator.clipboard.writeText(c.phone); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch (e) { const el = document.getElementById('cd-phone'); if (el) { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } }
  };
  return (
    <Sheet title="Client" onClose={onClose} wide
      footer={<>
        <button className="btn ghost" onClick={() => ui.editClient(c)}><Icon name="edit" size={18} />Edit</button>
        <span className="grow" />
        <button className="btn primary" onClick={() => ui.newAppt({ clientId: c.id, clientName: c.name, serviceIds: st.done[0]?.serviceIds })}>
          <Icon name="repeat" size={18} />Book again</button>
      </>}>
      <div className="cd">
        <div className="cd-head">
          <Avatar name={c.name} size={64} />
          <div className="cd-id">
            <h3>{c.name}</h3>
            {c.phone ? (
              <span className="cd-phone"><Icon name="phone" size={15} /><span id="cd-phone">{c.phone}</span>
                <button className="link-btn" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button></span>
            ) : <span className="muted">No phone saved</span>}
            {c.birthday && <span className="muted small">Birthday {fromKey(c.birthday).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}</span>}
          </div>
        </div>

        <div className="cd-stats">
          <div><span>Visits</span><strong>{st.done.length}</strong></div>
          <div><span>Spent</span><strong>{money(st.total)}</strong></div>
          <div><span>Average</span><strong>{money(st.avg)}</strong></div>
          <div><span>Last visit</span><strong className="sm">{st.last ? relDay(st.last) : '—'}</strong></div>
        </div>

        {st.next && (
          <button className="cd-next" onClick={() => ui.editAppt(st.next)}>
            <Icon name="calendar" size={18} />
            <span>Next visit <strong>{relDay(st.next.date)}</strong>, {fmtShort(st.next.date)} at {st.next.start}</span>
          </button>
        )}

        {(c.notes || favs.length > 0) && (
          <div className="cd-notes">
            {c.notes && <p><Icon name="note" size={16} /> {c.notes}</p>}
            {favs.length > 0 && (
              <div className="chips static">{favs.map(({ s, n }) => (
                <span key={s.id} className="chip"><Swatch hex={swatchHex(s.color)} />{s.name}<small>×{n}</small></span>))}</div>
            )}
          </div>
        )}

        <h4 className="eyebrow">Visit history{st.first ? ` · client since ${fmtShort(st.first)}` : ''}</h4>
        {st.visits.length === 0 ? <Empty icon="calendar" title="No visits yet">Book her first appointment to start her history.</Empty> : (
          <ol className="history">
            {st.visits.map((a) => (
              <li key={a.id}>
                <button onClick={() => ui.editAppt(a)}>
                  <span className="h-date"><strong>{fromKey(a.date).toLocaleDateString('en-GB', { day: 'numeric' })}</strong>
                    <small>{fromKey(a.date).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}</small></span>
                  <span className="h-main">
                    <span className="h-svcs">{(a.serviceIds || []).map((s) => services[s]).filter(Boolean).map((s) => (
                      <span key={s.id}><Swatch hex={swatchHex(s.color)} size={10} />{s.name}</span>))}
                      {!(a.serviceIds || []).length && <span>Appointment</span>}</span>
                    <small>{a.start} · {relDay(a.date)}{a.payment ? ` · ${PAYMENTS.find((p) => p.id === a.payment)?.label}` : ''}{a.notes ? ` · ${a.notes}` : ''}</small>
                  </span>
                  <span className="h-end">
                    <strong className={a.status === 'done' ? '' : 'muted'}>{money(a.status === 'done' ? earned(a) : a.price)}</strong>
                    {a.status !== 'done' && <StatusPill status={a.status} />}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Sheet>
  );
}
