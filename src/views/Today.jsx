import React, { useEffect, useState } from 'react';
import { useBook } from '../App.jsx';
import { Icon, Avatar, StatusPill, Swatch, Empty } from '../components/ui.jsx';
import { todayKey, keyOf, addDays, startOfWeek, toMin, fromMin, earned, sum, byStart, fmtLong, swatchHex, relDay, fromKey } from '../lib/util.js';

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  return now;
}

export function ApptRow({ a, compact, action }) {
  const { services, money, ui } = useBook();
  const svcs = (a.serviceIds || []).map((id) => services[id]).filter(Boolean);
  const hex = swatchHex(svcs[0]?.color);
  return (
    <div className={'appt-row s-' + a.status} style={{ '--c': hex }}>
      <button className="appt-row-main" onClick={() => ui.editAppt(a)}>
        <span className="ar-time"><strong>{a.start}</strong><small>{fromMin(toMin(a.start) + Number(a.duration || 0))}</small></span>
        <Swatch hex={hex} size={12} className="ar-sw" />
        <span className="ar-body">
          <strong>{a.clientName}</strong>
          <small>{svcs.map((s) => s.name).join(' + ') || 'Appointment'}{compact ? ` · ${relDay(a.date)}` : ''}</small>
        </span>
        <span className="ar-end">
          <span className="ar-price">{money(a.status === 'done' ? earned(a) : a.price)}</span>
          {a.status !== 'booked' && <StatusPill status={a.status} />}
        </span>
      </button>
      {action}
    </div>
  );
}

export default function Today() {
  const { appts, settings, money, ui, clients } = useBook();
  const now = useNow();
  const tk = keyOf(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const list = Object.values(appts);
  const todays = list.filter((a) => a.date === tk && a.status !== 'cancelled').sort(byStart);
  const earnedToday = sum(todays.map(earned));
  const stillBooked = todays.filter((a) => a.status === 'booked');
  const expected = sum(stillBooked.map((a) => a.price));
  const month = tk.slice(0, 7);
  const monthEarned = sum(list.filter((a) => a.date.startsWith(month)).map(earned));
  const isOver = (a) => a.date < tk || (a.date === tk && toMin(a.start) + Number(a.duration || 0) <= nowMin);
  const needs = list.filter((a) => a.status === 'booked' && isOver(a) && a.date >= keyOf(addDays(now, -30))).sort(byStart).reverse();
  const nextUp = stillBooked.find((a) => toMin(a.start) + Number(a.duration || 0) > nowMin);
  const tomorrowKey = keyOf(addDays(now, 1));
  const tomorrow = list.filter((a) => a.date === tomorrowKey && a.status === 'booked').sort(byStart);

  const ws = startOfWeek(now, settings.weekStart);
  const week = Array.from({ length: 7 }, (_, i) => {
    const k = keyOf(addDays(ws, i));
    return { k, v: sum(list.filter((a) => a.date === k).map(earned)), label: fromKey(k).toLocaleDateString('en-GB', { weekday: 'narrow' }) };
  });
  const weekTotal = sum(week.map((d) => d.v));
  const weekMax = Math.max(1, ...week.map((d) => d.v));

  const birthdays = Object.values(clients).filter((c) => {
    if (!c.birthday) return false;
    const md = c.birthday.slice(5);
    for (let i = 0; i < 7; i++) if (keyOf(addDays(now, i)).slice(5) === md) return true;
    return false;
  });

  const h = now.getHours();
  const hello = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const progress = todays.length ? todays.filter((a) => a.status !== 'booked').length / todays.length : 0;

  return (
    <div className="page today">
      <header className="hero">
        <p className="eyebrow">{fmtLong(tk)}</p>
        <h1 className="display">{hello}{settings.ownerName ? `, ${settings.ownerName}` : ''}</h1>
        <p className="hero-sub">
          {todays.length === 0 ? 'No appointments today. A good day for a little self-care.'
            : nextUp ? <>Next up: <strong>{nextUp.clientName}</strong> at {nextUp.start}. {stillBooked.length} still to come today.</>
              : <>All {todays.length} appointments are behind you. Lovely work.</>}
        </p>
      </header>

      <section className="kpis">
        <div className="kpi feature">
          <span className="kpi-label">Made today</span>
          <strong className="num-display">{money(earnedToday)}</strong>
          <span className="kpi-foot">{expected > 0 ? `+ ${money(expected)} still booked` : todays.length ? 'Day complete' : 'Nothing booked'}</span>
          <span className="kpi-bar" aria-hidden="true"><i style={{ width: `${progress * 100}%` }} /></span>
        </div>
        <div className="kpi"><span className="kpi-label">Appointments</span><strong className="num">{todays.length}</strong>
          <span className="kpi-foot">{todays.filter((a) => a.status === 'done').length} paid</span></div>
        <div className="kpi"><span className="kpi-label">This week</span><strong className="num">{money(weekTotal)}</strong>
          <div className="mini-bars" aria-hidden="true">{week.map((d) => (
            <span key={d.k} className={d.k === tk ? 'today' : ''}><i style={{ height: `${Math.max(4, (d.v / weekMax) * 100)}%` }} /><em>{d.label}</em></span>))}</div></div>
        <div className="kpi"><span className="kpi-label">{now.toLocaleDateString('en-GB', { month: 'long' })}</span><strong className="num">{money(monthEarned)}</strong>
          <button className="link-btn kpi-foot" onClick={() => ui.go('income')}>See income <Icon name="right" size={14} /></button></div>
      </section>

      <div className="today-grid">
        <section className="card">
          <div className="card-head">
            <h2>Today’s chair</h2>
            <button className="btn ghost sm" onClick={() => ui.newAppt({ date: tk, start: fromMin(Math.min(Math.ceil((nowMin + 1) / 15) * 15, 23 * 60)) })}><Icon name="plus" size={16} />Add</button>
          </div>
          {todays.length === 0 ? (
            <Empty icon="calendar" title="Your chair is free today">Tap Add to book someone in.</Empty>
          ) : (
            <div className="timeline">
              {todays.map((a) => {
                const past = isOver(a);
                const live = !past && toMin(a.start) <= nowMin;
                return (
                  <div key={a.id} className={'tl-item' + (past ? ' past' : '') + (live ? ' live' : '')}>
                    <ApptRow a={a} action={a.status === 'booked' && (past || live) ? (
                      <button className="btn soft sm" onClick={() => ui.checkout(a)}><Icon name="check" size={16} />Check out</button>
                    ) : null} />
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="side-stack">
          {needs.filter((a) => a.date !== tk).length > 0 && (
            <section className="card attention">
              <div className="card-head"><h2>Waiting for check-out</h2><span className="count">{needs.filter((a) => a.date !== tk).length}</span></div>
              <p className="hint">Mark these as paid so your income stays right.</p>
              <div className="stack">
                {needs.filter((a) => a.date !== tk).slice(0, 5).map((a) => (
                  <ApptRow key={a.id} a={a} compact action={<button className="btn soft sm" onClick={() => ui.checkout(a)}>Check out</button>} />
                ))}
              </div>
            </section>
          )}
          <section className="card">
            <div className="card-head"><h2>Tomorrow</h2><span className="count">{tomorrow.length}</span></div>
            {tomorrow.length === 0 ? <p className="hint">Nothing booked yet.</p> : (
              <ul className="mini-list">
                {tomorrow.map((a) => (
                  <li key={a.id}><button onClick={() => ui.editAppt(a)}><span className="t">{a.start}</span><Avatar name={a.clientName} size={26} /><span>{a.clientName}</span></button></li>
                ))}
              </ul>
            )}
          </section>
          {birthdays.length > 0 && (
            <section className="card bday">
              <div className="card-head"><h2>Birthdays this week</h2></div>
              <ul className="mini-list">{birthdays.map((c) => (
                <li key={c.id}><button onClick={() => ui.openClient(c.id)}><Avatar name={c.name} size={26} /><span>{c.name}</span>
                  <span className="t">{new Date(2000, Number(c.birthday.slice(5, 7)) - 1, Number(c.birthday.slice(8))).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span></button></li>))}</ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
