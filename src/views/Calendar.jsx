import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useBook } from '../App.jsx';
import { Icon, Segmented } from '../components/ui.jsx';
import { keyOf, fromKey, addDays, startOfWeek, toMin, fromMin, todayKey, swatchHex, earned, sum, addMonths, daysInMonth } from '../lib/util.js';

const HOUR = 64;

function layout(items) {
  // assign side-by-side lanes for overlapping appointments
  const sorted = [...items].sort((a, b) => toMin(a.start) - toMin(b.start));
  const out = []; let cluster = []; let clusterEnd = -1;
  const flush = () => {
    const lanes = [];
    cluster.forEach((a) => {
      const s = toMin(a.start);
      let i = lanes.findIndex((end) => end <= s);
      if (i === -1) { i = lanes.length; lanes.push(0); }
      lanes[i] = s + Number(a.duration || 30);
      out.push({ a, lane: i });
    });
    out.slice(out.length - cluster.length).forEach((o) => { o.lanes = lanes.length; });
    cluster = [];
  };
  sorted.forEach((a) => {
    const s = toMin(a.start);
    if (cluster.length && s >= clusterEnd) flush();
    cluster.push(a); clusterEnd = Math.max(clusterEnd, s + Number(a.duration || 30));
  });
  if (cluster.length) flush();
  return out;
}

function MiniMonth({ selected, onPick, appts, weekStart }) {
  const [cursor, setCursor] = useState(() => { const d = fromKey(selected); return new Date(d.getFullYear(), d.getMonth(), 1); });
  useEffect(() => { const d = fromKey(selected); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); }, [selected]);
  const counts = useMemo(() => {
    const m = {}; Object.values(appts).forEach((a) => { if (a.status !== 'cancelled') m[a.date] = (m[a.date] || 0) + 1; }); return m;
  }, [appts]);
  const first = startOfWeek(cursor, weekStart);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(first, i));
  const tk = todayKey();
  return (
    <div className="mini-month">
      <div className="mm-head">
        <strong>{cursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</strong>
        <span>
          <button className="icon-btn sm" onClick={() => setCursor(addMonths(cursor, -1))} aria-label="Previous month"><Icon name="left" size={16} /></button>
          <button className="icon-btn sm" onClick={() => setCursor(addMonths(cursor, 1))} aria-label="Next month"><Icon name="right" size={16} /></button>
        </span>
      </div>
      <div className="mm-grid">
        {cells.slice(0, 7).map((d) => <span key={'h' + d} className="mm-dow">{d.toLocaleDateString('en-GB', { weekday: 'narrow' })}</span>)}
        {cells.map((d) => {
          const k = keyOf(d); const n = counts[k] || 0;
          return (
            <button key={k} onClick={() => onPick(k)}
              className={(d.getMonth() !== cursor.getMonth() ? 'out ' : '') + (k === selected ? 'sel ' : '') + (k === tk ? 'today ' : '')}>
              {d.getDate()}{n > 0 && <i className={n >= 5 ? 'busy' : ''} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Calendar() {
  const { appts, services, settings, money, ui } = useBook();
  const [date, setDate] = useState(todayKey());
  const [mode, setMode] = useState(() => (window.matchMedia('(min-width: 1000px)').matches ? 'week' : 'day'));
  const scroller = useRef(null);

  const startH = Math.floor(toMin(settings.dayStart) / 60);
  const endH = Math.ceil(toMin(settings.dayEnd) / 60);
  const byDate = useMemo(() => {
    const m = {}; Object.values(appts).forEach((a) => { (m[a.date] = m[a.date] || []).push(a); }); return m;
  }, [appts]);
  const items = (k) => (byDate[k] || []).filter((a) => a.status !== 'cancelled');
  const days = mode === 'week'
    ? Array.from({ length: 7 }, (_, i) => keyOf(addDays(startOfWeek(fromKey(date), settings.weekStart), i)))
    : [date];
  const dayMin = Math.min(startH, ...days.flatMap((k) => items(k).map((a) => Math.floor(toMin(a.start) / 60))));
  const dayMax = Math.max(endH, ...days.flatMap((k) => items(k).map((a) => Math.ceil((toMin(a.start) + Number(a.duration || 0)) / 60))));
  const hours = Array.from({ length: Math.max(1, dayMax - dayMin) }, (_, i) => dayMin + i);
  const tk = todayKey();

  const [nowMin, setNowMin] = useState(() => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); });
  useEffect(() => { const t = setInterval(() => { const n = new Date(); setNowMin(n.getHours() * 60 + n.getMinutes()); }, 60000); return () => clearInterval(t); }, []);

  useEffect(() => {
    if (scroller.current) {
      const target = days.includes(tk) ? nowMin - 90 : (Math.min(...days.flatMap((k) => items(k).map((a) => toMin(a.start))), 10 * 60) - 30);
      scroller.current.scrollTop = Math.max(0, ((target - dayMin * 60) / 60) * HOUR);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, mode]);

  const step = (n) => setDate(keyOf(addDays(fromKey(date), mode === 'week' ? 7 * n : n)));
  const d0 = fromKey(days[0]), d1 = fromKey(days[days.length - 1]);
  const title = mode === 'week'
    ? (d0.getMonth() === d1.getMonth()
      ? `${d0.getDate()} – ${d1.getDate()} ${d1.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`
      : `${d0.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${d1.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`)
    : fromKey(date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  const strip = Array.from({ length: 7 }, (_, i) => keyOf(addDays(startOfWeek(fromKey(date), settings.weekStart), i)));
  const onGridClick = (k, e) => {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mins = dayMin * 60 + Math.floor(((e.clientY - rect.top) / HOUR) * 60 / 15) * 15;
    ui.newAppt({ date: k, start: fromMin(Math.max(0, Math.min(mins, 23 * 60 + 45))) });
  };
  const dayTotal = (k) => sum((byDate[k] || []).map(earned));
  const dayBooked = (k) => sum((byDate[k] || []).filter((a) => a.status === 'booked').map((a) => a.price));

  return (
    <div className="page cal">
      <header className="page-head">
        <div>
          <p className="eyebrow">Calendar</p>
          <h1 className="h1">{title}</h1>
        </div>
        <div className="cal-tools">
          <div className="nav-group">
            <button className="icon-btn" onClick={() => step(-1)} aria-label="Previous"><Icon name="left" /></button>
            <button className="btn ghost sm" onClick={() => setDate(tk)}>Today</button>
            <button className="icon-btn" onClick={() => step(1)} aria-label="Next"><Icon name="right" /></button>
          </div>
          <Segmented value={mode} onChange={setMode} label="Calendar view" options={[{ id: 'day', label: 'Day' }, { id: 'week', label: 'Week' }]} />
        </div>
      </header>

      <div className="cal-layout">
        <aside className="cal-aside">
          <MiniMonth selected={date} onPick={(k) => setDate(k)} appts={appts} weekStart={settings.weekStart} />
          <div className="cal-sum">
            <div><span>{mode === 'week' ? 'Week' : 'Day'} paid</span><strong>{money(sum(days.map(dayTotal)))}</strong></div>
            <div><span>Still booked</span><strong>{money(sum(days.map(dayBooked)))}</strong></div>
            <div><span>Appointments</span><strong>{sum(days.map((k) => items(k).length))}</strong></div>
          </div>
        </aside>

        <div className="cal-main card flush">
          {mode === 'day' && (
            <div className="week-strip">
              {strip.map((k) => {
                const d = fromKey(k); const n = items(k).length;
                return (
                  <button key={k} onClick={() => setDate(k)} className={(k === date ? 'sel ' : '') + (k === tk ? 'today' : '')}>
                    <small>{d.toLocaleDateString('en-GB', { weekday: 'short' })}</small>
                    <strong>{d.getDate()}</strong>
                    <span className="dots">{Array.from({ length: Math.min(n, 4) }, (_, i) => <i key={i} />)}</span>
                  </button>
                );
              })}
            </div>
          )}
          {mode === 'week' && (
            <div className="grid-head" style={{ '--cols': days.length }}>
              <span />
              {days.map((k) => {
                const d = fromKey(k);
                return (
                  <button key={k} className={'gh-day' + (k === tk ? ' today' : '')} onClick={() => { setDate(k); setMode('day'); }}>
                    <small>{d.toLocaleDateString('en-GB', { weekday: 'short' })}</small><strong>{d.getDate()}</strong>
                    <em>{dayTotal(k) ? money(dayTotal(k)) : items(k).length ? `${items(k).length} booked` : ''}</em>
                  </button>
                );
              })}
            </div>
          )}
          <div className="grid-scroll" ref={scroller}>
            <div className="grid" style={{ '--cols': days.length, height: hours.length * HOUR }}>
              <div className="hours">{hours.map((h) => <span key={h} style={{ top: (h - dayMin) * HOUR }}>{String(h).padStart(2, '0')}:00</span>)}</div>
              {days.map((k) => (
                <div key={k} className={'col' + (k === tk ? ' today' : '')} onClick={(e) => onGridClick(k, e)}
                  style={{ backgroundSize: `100% ${HOUR}px` }} role="presentation">
                  {k === tk && nowMin >= dayMin * 60 && nowMin <= dayMax * 60 && (
                    <span className="now-line" style={{ top: ((nowMin - dayMin * 60) / 60) * HOUR }} />
                  )}
                  {layout(items(k)).map(({ a, lane, lanes }) => {
                    const svcs = (a.serviceIds || []).map((id) => services[id]).filter(Boolean);
                    const top = ((toMin(a.start) - dayMin * 60) / 60) * HOUR;
                    const h = Math.max(26, (Number(a.duration || 30) / 60) * HOUR - 3);
                    return (
                      <button key={a.id} className={'ev s-' + a.status + (h < 46 ? ' tiny' : '')}
                        style={{ top, height: h, left: `calc(${(lane / lanes) * 100}% + 3px)`, width: `calc(${100 / lanes}% - 6px)`, '--c': swatchHex(svcs[0]?.color) }}
                        onClick={() => ui.editAppt(a)}>
                        <span className="ev-top"><strong>{a.clientName}</strong>{a.status === 'done' && <span className="ev-paid">✓</span>}</span>
                        <small>{a.start} · {svcs.map((s) => s.name).join(' + ') || 'Appointment'}</small>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <p className="grid-hint">Tap an empty slot to book it.</p>
        </div>
      </div>
    </div>
  );
}
