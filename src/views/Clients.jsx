import React, { useMemo, useState } from 'react';
import { useBook } from '../App.jsx';
import { Icon, Avatar, Segmented, Empty } from '../components/ui.jsx';
import { clientStats } from '../components/ClientSheets.jsx';
import { relDay, addDays, keyOf } from '../lib/util.js';

export default function Clients() {
  const { clients, appts, money, ui } = useBook();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('recent');
  const rows = useMemo(() => Object.values(clients).map((c) => ({ c, s: clientStats(appts, c.id) })), [clients, appts]);
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase(); const digits = t.replace(/\D/g, '');
    let r = rows.filter(({ c }) => !t || c.name.toLowerCase().includes(t) || (digits && (c.phone || '').replace(/\D/g, '').includes(digits)) || (c.notes || '').toLowerCase().includes(t));
    if (sort === 'az') r.sort((a, b) => a.c.name.localeCompare(b.c.name));
    else if (sort === 'top') r.sort((a, b) => b.s.total - a.s.total);
    else r.sort((a, b) => (b.s.last || b.c.createdAt || '').localeCompare(a.s.last || a.c.createdAt || ''));
    return r;
  }, [rows, q, sort]);

  const cutoff = keyOf(addDays(new Date(), -60));
  const regulars = rows.filter(({ s }) => s.done.length >= 4).length;
  const missing = rows.filter(({ s }) => s.done.length >= 2 && s.last && s.last < cutoff && !s.next);

  return (
    <div className="page clients">
      <header className="page-head">
        <div>
          <p className="eyebrow">Clients</p>
          <h1 className="h1">{rows.length} {rows.length === 1 ? 'client' : 'clients'}<span className="h1-sub"> · {regulars} regulars</span></h1>
        </div>
        <button className="btn primary" onClick={ui.newClient}><Icon name="plus" size={18} />New client</button>
      </header>

      <div className="toolbar">
        <div className="input-ico grow"><Icon name="search" size={18} />
          <input id="cl-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, phone or note" /></div>
        <Segmented value={sort} onChange={setSort} label="Sort clients"
          options={[{ id: 'recent', label: 'Recent' }, { id: 'az', label: 'A–Z' }, { id: 'top', label: 'Top' }]} />
      </div>

      {missing.length > 0 && !q && (
        <section className="card missing">
          <div className="card-head"><h2>Haven’t been back in a while</h2><span className="count">{missing.length}</span></div>
          <div className="missing-row">
            {missing.slice(0, 8).map(({ c, s }) => (
              <button key={c.id} className="missing-chip" onClick={() => ui.openClient(c.id)}>
                <Avatar name={c.name} size={30} /><span><strong>{c.name.split(' ')[0]}</strong><small>{relDay(s.last)}</small></span>
              </button>
            ))}
          </div>
        </section>
      )}

      {filtered.length === 0 ? (
        <Empty icon="users" title={q ? 'No one matches that search' : 'No clients yet'}>
          {q ? 'Try part of a name or phone number.' : 'Clients you book are added here automatically, or add one now.'}
        </Empty>
      ) : (
        <div className="client-list card flush">
          <div className="cl-head" aria-hidden="true"><span>Client</span><span>Last visit</span><span>Visits</span><span>Spent</span></div>
          {filtered.map(({ c, s }) => (
            <button key={c.id} className="cl-row" onClick={() => ui.openClient(c.id)}>
              <span className="cl-who"><Avatar name={c.name} size={40} />
                <span><strong>{c.name}</strong><small>{c.phone || 'No phone'}{s.next ? ' · booked ' + relDay(s.next.date).toLowerCase() : ''}</small></span></span>
              <span className="cl-last">{s.last ? relDay(s.last) : <em>New</em>}</span>
              <span className="cl-visits">{s.done.length}</span>
              <span className="cl-spent">{money(s.total)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
