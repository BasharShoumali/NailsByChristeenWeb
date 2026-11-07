import React, { useEffect, useMemo, useRef, useState } from "react";
import { useBook } from "../App.jsx";
import { Icon, Segmented, Swatch, Avatar, Empty } from "../components/ui.jsx";
import {
  keyOf,
  fromKey,
  addDays,
  startOfWeek,
  earned,
  sum,
  todayKey,
  swatchHex,
  daysInMonth,
  PAYMENTS,
} from "../lib/util.js";

function niceMax(v) {
  if (v <= 0) return 100;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

function Bars({ data, money, avg }) {
  const ref = useRef(null);
  const [w, setW] = useState(600);
  const [hover, setHover] = useState(null);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) =>
      setW(Math.max(260, e.contentRect.width)),
    );
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  const H = 220,
    padL = 52,
    padB = 26,
    padT = 18;
  const max = niceMax(Math.max(...data.map((d) => d.v), 1));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const iw = w - padL - 6,
    ih = H - padB - padT;
  const bw = iw / data.length;
  const y = (v) => padT + ih - (v / max) * ih;
  const every = Math.ceil(data.length / Math.max(1, Math.floor(iw / 34)));
  const hv = hover != null ? data[hover] : null;
  return (
    <div className="bars" ref={ref}>
      <svg width={w} height={H} role="img" aria-label="Income chart">
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={padL}
              x2={w - 6}
              y1={y(t)}
              y2={y(t)}
              className="grid-line"
            />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" className="axis">
              {money(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const bh = Math.max(d.v > 0 ? 2 : 0, (d.v / max) * ih);
          const x = padL + i * bw + bw * 0.16;
          return (
            <g
              key={d.k}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => setHover(i)}
            >
              <rect
                x={padL + i * bw}
                y={padT}
                width={bw}
                height={ih}
                fill="transparent"
              />
              <rect
                x={x}
                y={y(0) - bh}
                width={Math.max(2, bw * 0.68)}
                height={bh}
                rx={Math.min(5, bw * 0.2)}
                className={
                  "bar" +
                  (d.today ? " now" : "") +
                  (hover === i ? " hl" : "") +
                  (d.future ? " future" : "")
                }
              />
              {i % every === 0 && (
                <text
                  x={padL + i * bw + bw / 2}
                  y={H - 8}
                  textAnchor="middle"
                  className="axis"
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
        {avg > 0 && (
          <g>
            <line
              x1={padL}
              x2={w - 6}
              y1={y(avg)}
              y2={y(avg)}
              className="avg-line"
            />
            <text
              x={w - 8}
              y={y(avg) - 6}
              textAnchor="end"
              className="axis avg"
            >
              avg {money(avg)}
            </text>
          </g>
        )}
      </svg>
      {hv && (
        <div
          className="bar-tip"
          style={{
            left: Math.min(
              w - 150,
              Math.max(0, padL + hover * bw + bw / 2 - 70),
            ),
          }}
        >
          <strong>{money(hv.v)}</strong>
          <span>
            {hv.full}
            {hv.n ? ` · ${hv.n} paid` : ""}
          </span>
        </div>
      )}
    </div>
  );
}

export default function Income() {
  const { appts, services, clients, money, settings, ui } = useBook();
  const [period, setPeriod] = useState("month");
  const [anchor, setAnchor] = useState(todayKey());
  const all = Object.values(appts);
  const tk = todayKey();

  const range = useMemo(() => {
    const d = fromKey(anchor);
    if (period === "week") {
      const s = startOfWeek(d, settings.weekStart);
      return {
        s: keyOf(s),
        e: keyOf(addDays(s, 6)),
        ps: keyOf(addDays(s, -7)),
        pe: keyOf(addDays(s, -1)),
      };
    }
    if (period === "month") {
      const s = new Date(d.getFullYear(), d.getMonth(), 1),
        e = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const ps = new Date(d.getFullYear(), d.getMonth() - 1, 1),
        pe = new Date(d.getFullYear(), d.getMonth(), 0);
      return { s: keyOf(s), e: keyOf(e), ps: keyOf(ps), pe: keyOf(pe) };
    }
    return {
      s: `${d.getFullYear()}-01-01`,
      e: `${d.getFullYear()}-12-31`,
      ps: `${d.getFullYear() - 1}-01-01`,
      pe: `${d.getFullYear() - 1}-12-31`,
    };
  }, [anchor, period, settings.weekStart]);

  const inRange = all.filter((a) => a.date >= range.s && a.date <= range.e);
  const paid = inRange.filter((a) => a.status === "done");
  const total = sum(paid.map(earned));
  const tips = sum(paid.map((a) => a.tip));
  // compare with the same stretch of the previous period, so a half-finished month is fair
  const elapsed =
    tk >= range.s && tk <= range.e
      ? Math.round((fromKey(tk) - fromKey(range.s)) / 86400000)
      : null;
  const prevEnd =
    elapsed != null ? keyOf(addDays(fromKey(range.ps), elapsed)) : range.pe;
  const prevTotal = sum(
    all
      .filter(
        (a) =>
          a.date >= range.ps &&
          a.date <= (prevEnd < range.pe ? prevEnd : range.pe),
      )
      .map(earned),
  );
  const delta = prevTotal > 0 ? (total - prevTotal) / prevTotal : null;
  const noShows = inRange.filter((a) => a.status === "noshow").length;
  const avgTicket = paid.length ? total / paid.length : 0;
  const workDays = new Set(paid.map((a) => a.date)).size;

  const chart = useMemo(() => {
    if (period === "year") {
      const y = Number(range.s.slice(0, 4));
      return Array.from({ length: 12 }, (_, m) => {
        const pre = `${y}-${String(m + 1).padStart(2, "0")}`;
        const list = paid.filter((a) => a.date.startsWith(pre));
        return {
          k: pre,
          v: sum(list.map(earned)),
          n: list.length,
          label: new Date(y, m, 1).toLocaleDateString("en-GB", {
            month: "short",
          }),
          full: new Date(y, m, 1).toLocaleDateString("en-GB", {
            month: "long",
            year: "numeric",
          }),
          today: tk.startsWith(pre),
          future: pre > tk.slice(0, 7),
        };
      });
    }
    const n =
      period === "week"
        ? 7
        : daysInMonth(
            fromKey(range.s).getFullYear(),
            fromKey(range.s).getMonth(),
          );
    return Array.from({ length: n }, (_, i) => {
      const k = keyOf(addDays(fromKey(range.s), i));
      const list = paid.filter((a) => a.date === k);
      return {
        k,
        v: sum(list.map(earned)),
        n: list.length,
        label:
          period === "week"
            ? fromKey(k).toLocaleDateString("en-GB", { weekday: "short" })
            : String(i + 1),
        full: fromKey(k).toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }),
        today: k === tk,
        future: k > tk,
      };
    });
  }, [paid, period, range.s, tk]);
  const activeBars = chart.filter((d) => d.v > 0);
  const avgBar = activeBars.length
    ? sum(activeBars.map((d) => d.v)) / activeBars.length
    : 0;

  const bySvc = useMemo(() => {
    const m = {};
    paid.forEach((a) => {
      const ids = (a.serviceIds || []).filter((id) => services[id]);
      if (!ids.length) {
        m._other = (m._other || 0) + earned(a);
        return;
      }
      const listSum = sum(ids.map((id) => services[id].price)) || ids.length;
      ids.forEach((id) => {
        m[id] =
          (m[id] || 0) +
          earned(a) * ((Number(services[id].price) || 1) / listSum);
      });
    });
    return Object.entries(m)
      .map(([id, v]) => ({ id, v, s: services[id] }))
      .sort((a, b) => b.v - a.v);
  }, [paid, services]);
  const svcMax = Math.max(1, ...bySvc.map((x) => x.v));

  const byPay = PAYMENTS.map((p) => ({
    ...p,
    v: sum(paid.filter((a) => a.payment === p.id).map(earned)),
  })).filter((p) => p.v > 0);
  const payTotal = sum(byPay.map((p) => p.v)) || 1;

  const weekdays = useMemo(() => {
    const ws = settings.weekStart;
    return Array.from({ length: 7 }, (_, i) => {
      const dow = (ws + i) % 7;
      const days = {};
      paid.forEach((a) => {
        if (fromKey(a.date).getDay() === dow)
          days[a.date] = (days[a.date] || 0) + earned(a);
      });
      const vals = Object.values(days);
      return {
        dow,
        label: new Date(2026, 0, 4 + dow).toLocaleDateString("en-GB", {
          weekday: "short",
        }),
        v: vals.length ? sum(vals) / vals.length : 0,
      };
    });
  }, [paid, settings.weekStart]);
  const wdMax = Math.max(1, ...weekdays.map((d) => d.v));
  const bestDay = [...weekdays].sort((a, b) => b.v - a.v)[0];

  const topClients = useMemo(() => {
    const m = {};
    paid.forEach((a) => {
      const k = a.clientId || a.clientName;
      m[k] = m[k] || {
        id: a.clientId,
        name: clients[a.clientId]?.name || a.clientName,
        v: 0,
        n: 0,
      };
      m[k].v += earned(a);
      m[k].n++;
    });
    return Object.values(m)
      .sort((a, b) => b.v - a.v)
      .slice(0, 5);
  }, [paid, clients]);

  const log = useMemo(() => {
    const m = {};
    inRange.forEach((a) => {
      const r = (m[a.date] = m[a.date] || {
        k: a.date,
        v: 0,
        n: 0,
        tips: 0,
        missed: 0,
      });
      if (a.status === "done") {
        r.v += earned(a);
        r.n++;
        r.tips += Number(a.tip) || 0;
      }
      if (a.status === "noshow") r.missed++;
    });
    return Object.values(m)
      .filter((r) => r.v > 0 || r.missed > 0)
      .sort((a, b) => b.k.localeCompare(a.k));
  }, [inRange]);

  const step = (n) => {
    const d = fromKey(anchor);
    if (period === "week") setAnchor(keyOf(addDays(d, 7 * n)));
    else if (period === "month")
      setAnchor(keyOf(new Date(d.getFullYear(), d.getMonth() + n, 1)));
    else setAnchor(keyOf(new Date(d.getFullYear() + n, 0, 1)));
  };
  const title =
    period === "year"
      ? range.s.slice(0, 4)
      : period === "month"
        ? fromKey(range.s).toLocaleDateString("en-GB", {
            month: "long",
            year: "numeric",
          })
        : `${fromKey(range.s).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${fromKey(range.e).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
  const prevLabel =
    period === "week"
      ? "last week"
      : period === "month"
        ? "last month"
        : "last year";

  return (
    <div className="page income">
      <header className="page-head">
        <div>
          <p className="eyebrow">Income</p>
          <h1 className="h1">{title}</h1>
        </div>
        <div className="cal-tools">
          <div className="nav-group">
            <button
              className="icon-btn"
              onClick={() => step(-1)}
              aria-label="Previous period"
            >
              <Icon name="left" />
            </button>
            <button className="btn ghost sm" onClick={() => setAnchor(tk)}>
              Now
            </button>
            <button
              className="icon-btn"
              onClick={() => step(1)}
              aria-label="Next period"
            >
              <Icon name="right" />
            </button>
          </div>
          <Segmented
            value={period}
            onChange={(p) => {
              setPeriod(p);
            }}
            label="Period"
            options={[
              { id: "week", label: "Week" },
              { id: "month", label: "Month" },
              { id: "year", label: "Year" },
            ]}
          />
        </div>
      </header>

      <section className="income-hero card">
        <div className="ih-total">
          <span className="kpi-label">Total earned</span>
          <strong className="num-display xl">{money(total)}</strong>
          {delta != null ? (
            <span className={"delta " + (delta >= 0 ? "up" : "down")}>
              <Icon
                name={delta >= 0 ? "arrowUp" : "arrowDown"}
                size={14}
                stroke={2.2}
              />
              {Math.abs(Math.round(delta * 100))}% vs{" "}
              {elapsed != null ? `same point ${prevLabel}` : prevLabel}
            </span>
          ) : (
            <span className="muted small">
              No earlier {period} to compare yet
            </span>
          )}
        </div>
        <div className="ih-stats">
          <div>
            <span>Paid visits</span>
            <strong>{paid.length}</strong>
          </div>
          <div>
            <span>Average visit</span>
            <strong>{money(avgTicket)}</strong>
          </div>
          <div>
            <span>Per working day</span>
            <strong>{money(workDays ? total / workDays : 0)}</strong>
          </div>
          <div>
            <span>Tips</span>
            <strong>{money(tips)}</strong>
          </div>
          <div>
            <span>No-shows</span>
            <strong className={noShows ? "bad-text" : ""}>{noShows}</strong>
          </div>
        </div>
        <div className="ih-chart">
          {total > 0 ? (
            <Bars data={chart} money={money} avg={avgBar} />
          ) : (
            <Empty icon="chart" title="No income in this period yet">
              Check out finished appointments to see them here.
            </Empty>
          )}
        </div>
      </section>

      <div className="income-grid">
        <section className="card">
          <div className="card-head">
            <h2>By service</h2>
          </div>
          {bySvc.length === 0 ? (
            <p className="hint">Nothing yet.</p>
          ) : (
            <ul className="hbar-list">
              {bySvc.map((x) => (
                <li key={x.id}>
                  <span className="hb-name">
                    <Swatch hex={x.s ? swatchHex(x.s.color) : "#999"} />
                    {x.s ? x.s.name : "Other"}
                  </span>
                  <span className="hb-track">
                    <i
                      style={{
                        width: `${(x.v / svcMax) * 100}%`,
                        "--c": x.s ? swatchHex(x.s.color) : "var(--muted)",
                      }}
                    />
                  </span>
                  <span className="hb-val">{money(x.v)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Busiest days</h2>
            {bestDay && bestDay.v > 0 && (
              <span className="muted small">{bestDay.label} earns most</span>
            )}
          </div>
          <div className="wd-bars">
            {weekdays.map((d) => (
              <div
                key={d.dow}
                className={d === bestDay && d.v > 0 ? "best" : ""}
              >
                <span className="wd-val">{d.v ? money(d.v) : "–"}</span>
                <span className="wd-track">
                  <i style={{ height: `${(d.v / wdMax) * 100}%` }} />
                </span>
                <span className="wd-label">{d.label}</span>
              </div>
            ))}
          </div>
          <p className="hint">Average income on each day you worked.</p>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>How clients paid</h2>
          </div>
          {byPay.length === 0 ? (
            <p className="hint">Nothing yet.</p>
          ) : (
            <>
              <div className="stack-bar">
                {byPay.map((p, i) => (
                  <i
                    key={p.id}
                    className={"p" + i}
                    style={{ width: `${(p.v / payTotal) * 100}%` }}
                  />
                ))}
              </div>
              <ul className="legend">
                {byPay.map((p, i) => (
                  <li key={p.id}>
                    <span className={"lg p" + i} />
                    {p.label}
                    <strong>{money(p.v)}</strong>
                    <small>{Math.round((p.v / payTotal) * 100)}%</small>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Top clients</h2>
          </div>
          {topClients.length === 0 ? (
            <p className="hint">Nothing yet.</p>
          ) : (
            <ol className="top-list">
              {topClients.map((c, i) => (
                <li key={c.id || c.name}>
                  <button
                    onClick={() => c.id && clients[c.id] && ui.openClient(c.id)}
                  >
                    <span className="rank">{i + 1}</span>
                    <Avatar name={c.name} size={30} />
                    <span className="tl-name">
                      <strong>{c.name}</strong>
                      <small>
                        {c.n} {c.n === 1 ? "visit" : "visits"}
                      </small>
                    </span>
                    <strong className="tl-val">{money(c.v)}</strong>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="card flush">
        <div className="card-head pad">
          <h2>Day by day</h2>
          <span className="muted small">{log.length} days</span>
        </div>
        {log.length === 0 ? (
          <p className="hint pad">No paid days in this period.</p>
        ) : (
          <div className="table-wrap">
            <table className="log">
              <thead>
                <tr>
                  <th>Day</th>
                  <th className="r">Paid visits</th>
                  <th className="r">Tips</th>
                  <th className="r">No-shows</th>
                  <th className="r">Earned</th>
                </tr>
              </thead>
              <tbody>
                {log.map((r) => (
                  <tr key={r.k} className={r.k === tk ? "today" : ""}>
                    <td>
                      {fromKey(r.k).toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                    <td className="r">{r.n}</td>
                    <td className="r">{r.tips ? money(r.tips) : "–"}</td>
                    <td className="r">{r.missed || "–"}</td>
                    <td className="r strong">{money(r.v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
