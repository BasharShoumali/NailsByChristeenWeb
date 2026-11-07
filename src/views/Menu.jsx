import React, { useState } from 'react';
import { useBook } from '../App.jsx';
import { Icon, Swatch, Sheet, Empty, Segmented } from '../components/ui.jsx';
import { SWATCHES, swatchHex, uid, fmtDur, todayKey } from '../lib/util.js';

function ServiceEditor({ svc, onClose }) {
  const { actions } = useBook();
  const [f, setF] = useState({ name: svc?.name || '', duration: svc?.duration || 60, price: svc?.price ?? '', color: svc?.color || 'cherry' });
  const [err, setErr] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);
  const save = async () => {
    if (!f.name.trim()) { setErr('Give the service a name.'); return; }
    if (await actions.saveService({ ...(svc || { id: uid() }), name: f.name.trim(), duration: Number(f.duration) || 30, price: Number(f.price) || 0, color: f.color })) onClose();
  };
  const del = async () => { if (await actions.deleteService(svc.id)) onClose(); };
  return (
    <Sheet title={svc ? 'Edit service' : 'New service'} onClose={onClose}
      footer={<>
        {svc && (confirmDel
          ? <span className="confirm-del">Remove it? Past visits keep their price. <button className="btn danger sm" onClick={del}>Remove</button><button className="btn ghost sm" onClick={() => setConfirmDel(false)}>Keep</button></span>
          : <button className="btn ghost danger-text" onClick={() => setConfirmDel(true)}><Icon name="trash" size={18} />Remove</button>)}
        <span className="grow" /><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Save</button>
      </>}>
      <div className="form">
        <div className="field"><label htmlFor="sv-name">Name</label>
          <input id="sv-name" value={f.name} onChange={(e) => { setF({ ...f, name: e.target.value }); setErr(''); }} placeholder="e.g. Russian manicure" />
          {err && <p className="err">{err}</p>}</div>
        <div className="grid2">
          <div className="field"><label htmlFor="sv-price">Price</label>
            <input id="sv-price" type="number" min="0" inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
          <div className="field"><label htmlFor="sv-dur">Length</label>
            <select id="sv-dur" value={f.duration} onChange={(e) => setF({ ...f, duration: Number(e.target.value) })}>
              {[10, 15, 20, 30, 45, 60, 75, 90, 105, 120, 150, 180, 240].map((m) => <option key={m} value={m}>{fmtDur(m)}</option>)}
            </select></div>
        </div>
        <div className="field"><label>Colour on the calendar</label>
          <div className="swatch-pick">
            {SWATCHES.map((s) => (
              <button key={s.id} type="button" className={f.color === s.id ? 'on' : ''} onClick={() => setF({ ...f, color: s.id })} aria-label={s.name} aria-pressed={f.color === s.id}>
                <Swatch hex={s.hex} size={30} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  );
}

export default function Menu({ onStart }) {
  const book = useBook();
  const { services, settings, actions, money, demoMode, kind, appts, logout } = book;
  const [editing, setEditing] = useState(null);
  const [s, setS] = useState({ ownerName: settings.ownerName, salonName: settings.salonName, currency: settings.currency, dayStart: settings.dayStart, dayEnd: settings.dayEnd, weekStart: String(settings.weekStart) });
  const [importMsg, setImportMsg] = useState('');
  const list = Object.values(services).sort((a, b) => a.name.localeCompare(b.name));
  const used = {}; Object.values(appts).forEach((a) => (a.serviceIds || []).forEach((id) => { used[id] = (used[id] || 0) + 1; }));

  const exportBackup = async () => {
    const data = JSON.stringify({ app: 'lacquer-book', version: 1, exportedAt: new Date().toISOString(), settings, services, clients: book.clients, appts }, null, 1);
    try {
      const dl = window.claude && (await window.claude.use('downloads'));
      if (!dl) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
        a.download = `salon-backup-${todayKey()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        return;
      }
      await dl.save({ filename: `salon-backup-${todayKey()}.json`, data });
    } catch (e) { book.ui.flash('Backup not saved.'); }
  };
  const importBackup = (e) => {
    const file = e.target.files && e.target.files[0]; e.target.value = '';
    if (!file) return;
    const r = new FileReader();
    r.onload = async () => {
      try {
        const obj = JSON.parse(r.result);
        if (obj.app !== 'lacquer-book') throw new Error('x');
        setImportMsg('Restoring…');
        await actions.importAll(obj);
        setImportMsg(`Restored ${Object.keys(obj.clients || {}).length} clients and ${Object.keys(obj.appts || {}).length} appointments.`);
      } catch (err) { setImportMsg('That file isn’t a salon backup. Choose a file saved from “Save a backup”.'); }
    };
    r.readAsText(file);
  };

  return (
    <div className="page menu">
      <header className="page-head">
        <div><p className="eyebrow">Services & settings</p><h1 className="h1">Your menu</h1></div>
        <button className="btn primary" onClick={() => setEditing({})}><Icon name="plus" size={18} />New service</button>
      </header>

      {list.length === 0 ? <Empty icon="bottle" title="No services yet">Add what you offer with a price and length. They fill in automatically when you book.</Empty> : (
        <div className="svc-grid">
          {list.map((x) => (
            <button key={x.id} className="svc-card" onClick={() => setEditing(x)} style={{ '--c': swatchHex(x.color) }}>
              <span className="svc-bottle" aria-hidden="true"><Swatch hex={swatchHex(x.color)} size={34} /></span>
              <span className="svc-info"><strong>{x.name}</strong><small>{fmtDur(x.duration)}{used[x.id] ? ` · booked ${used[x.id]}×` : ''}</small></span>
              <span className="svc-price">{money(x.price)}</span>
            </button>
          ))}
        </div>
      )}

      <div className="settings-grid">
        <section className="card">
          <div className="card-head"><h2>Salon details</h2></div>
          <div className="form">
            <div className="grid2">
              <div className="field"><label htmlFor="st-owner">Your name</label><input id="st-owner" value={s.ownerName} onChange={(e) => setS({ ...s, ownerName: e.target.value })} /></div>
              <div className="field"><label htmlFor="st-salon">Salon name</label><input id="st-salon" value={s.salonName} onChange={(e) => setS({ ...s, salonName: e.target.value })} /></div>
            </div>
            <div className="grid3">
              <div className="field"><label htmlFor="st-open">Opens</label><input id="st-open" type="time" value={s.dayStart} onChange={(e) => setS({ ...s, dayStart: e.target.value })} /></div>
              <div className="field"><label htmlFor="st-close">Closes</label><input id="st-close" type="time" value={s.dayEnd} onChange={(e) => setS({ ...s, dayEnd: e.target.value })} /></div>
              <div className="field"><label htmlFor="st-cur">Currency</label>
                <select id="st-cur" value={s.currency} onChange={(e) => setS({ ...s, currency: e.target.value })}>
                  <option value="ILS">₪ Shekel</option><option value="USD">$ Dollar</option><option value="EUR">€ Euro</option><option value="GBP">£ Pound</option><option value="JOD">JOD Dinar</option>
                </select></div>
            </div>
            <div className="field"><label>Week starts on</label>
              <Segmented value={s.weekStart} onChange={(v) => setS({ ...s, weekStart: v })} label="Week starts on"
                options={[{ id: '0', label: 'Sunday' }, { id: '1', label: 'Monday' }, { id: '6', label: 'Saturday' }]} /></div>
            <div className="row-end"><button className="btn primary" onClick={() => actions.saveSettings({ ...s, weekStart: Number(s.weekStart) })}>Save details</button></div>
          </div>
        </section>

        <section className="card">
          <div className="card-head"><h2>Your data</h2></div>
          {demoMode ? (
            <>
              <p className="hint">You’re looking at an example salon. Start your own book when you’re ready; the examples disappear.</p>
              <button className="btn primary" onClick={onStart}><Icon name="sparkle" size={18} />Start my own book</button>
            </>
          ) : (
            <>
              <p className="hint">{kind === 'api' ? 'Your book is saved in your salon’s MongoDB database and syncs across your phone, iPad and computer.' : kind === 'cloud'
                ? 'Your book is private to your account and syncs across your phone, iPad and computer.'
                : 'Your book is saved in this browser. Save a backup now and then to be safe.'}</p>
              <div className="btn-row">
                <button className="btn ghost" onClick={exportBackup}><Icon name="download" size={18} />Save a backup</button>
                <label className="btn ghost file-btn"><Icon name="upload" size={18} />Restore a backup
                  <input id="st-import" type="file" accept="application/json,.json" onChange={importBackup} /></label>
              </div>
              {importMsg && <p className="hint">{importMsg}</p>}
              {kind === 'api' && <button className="btn ghost mt8" onClick={logout}>Sign out</button>}
            </>
          )}
        </section>
      </div>

      <p className="hint version">App version 1.4 · Vercel</p>

      {editing && <ServiceEditor svc={editing.id ? editing : null} onClose={() => setEditing(null)} />}
    </div>
  );
}
