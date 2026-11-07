import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { openStore, memoryStore, emptyState } from "./lib/store.js";
import { makeDemo } from "./lib/demo.js";
import {
  DEFAULT_SERVICES,
  DEFAULT_SETTINGS,
  makeMoney,
  uid,
  todayKey,
} from "./lib/util.js";
import { Icon } from "./components/ui.jsx";
import Today from "./views/Today.jsx";
import Calendar from "./views/Calendar.jsx";
import Clients from "./views/Clients.jsx";
import Income from "./views/Income.jsx";
import Menu from "./views/Menu.jsx";
import ApptEditor from "./components/ApptEditor.jsx";
import Checkout from "./components/Checkout.jsx";
import { ClientEditor, ClientDetail } from "./components/ClientSheets.jsx";
import Welcome from "./components/Welcome.jsx";
import Login from "./components/Login.jsx";

const BookCtx = createContext(null);
export const useBook = () => useContext(BookCtx);

const VIEWS = [
  { id: "today", label: "Today", icon: "home" },
  { id: "calendar", label: "Calendar", icon: "calendar" },
  { id: "clients", label: "Clients", icon: "users" },
  { id: "income", label: "Income", icon: "chart" },
  { id: "menu", label: "Services", icon: "bottle" },
];

function useHashView() {
  const read = () => {
    const h = (location.hash || "").slice(1);
    return VIEWS.some((v) => v.id === h) ? h : "today";
  };
  const [view, setView] = useState(read);
  useEffect(() => {
    const f = () => setView(read());
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  const go = useCallback((id) => {
    setView(id);
    try {
      if (location.hash !== "#" + id) location.hash = id;
    } catch (e) {}
    window.scrollTo({ top: 0 });
  }, []);
  return [view, go];
}

export default function App() {
  const [view, go] = useHashView();
  const realRef = useRef(null);
  const [real, setReal] = useState({
    state: emptyState(),
    meta: { ready: false },
  });
  const [kind, setKind] = useState(null);
  const demoRef = useRef(null);
  const [demo, setDemo] = useState(null);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [welcome, setWelcome] = useState(false);

  useEffect(() => {
    let un,
      alive = true;
    openStore().then((s) => {
      if (!alive) return;
      realRef.current = s;
      setKind(s.kind);
      un = s.subscribe((state, meta) => setReal({ state, meta }));
    });
    return () => {
      alive = false;
      un && un();
    };
  }, []);

  const rs = real.state;
  const started =
    !!(rs.settings && rs.settings.started) ||
    Object.keys(rs.appts).length > 0 ||
    Object.keys(rs.clients).length > 0;
  const demoMode = real.meta.ready && !started;

  useEffect(() => {
    if (demoMode && !demoRef.current) {
      demoRef.current = memoryStore(makeDemo());
      demoRef.current.subscribe((state) => setDemo(state));
    }
  }, [demoMode]);

  const data = demoMode ? demo || emptyState() : rs;
  const store = demoMode ? demoRef.current : realRef.current;
  const settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
  const money = useMemo(
    () => makeMoney(settings.currency),
    [settings.currency],
  );

  const flash = useCallback((msg) => {
    setToast(msg);
    clearTimeout(flash.t);
    flash.t = setTimeout(() => setToast(null), 2600);
  }, []);
  const guard = useCallback(
    async (p, ok) => {
      try {
        await p;
        if (ok) flash(ok);
        return true;
      } catch (e) {
        const code = e && e.code;
        flash(
          code === "quota_exceeded"
            ? "Storage is full. Delete old items to save new ones."
            : code === "invalid_argument"
              ? "You don’t have permission to save changes here."
              : code === "signed_out"
                ? "You were signed out. Sign in again to save."
                : "Couldn’t save. Check your connection and try again.",
        );
        return false;
      }
    },
    [flash],
  );

  const actions = useMemo(
    () => ({
      saveAppt: (a, msg = "Appointment saved") =>
        guard(store.put("appts", a), msg),
      deleteAppt: (id) =>
        guard(store.remove("appts", id), "Appointment deleted"),
      saveClient: (c, msg = "Client saved") =>
        guard(store.put("clients", c), msg),
      deleteClient: (id) =>
        guard(store.remove("clients", id), "Client deleted"),
      saveService: (s) => guard(store.put("services", s), "Service saved"),
      deleteService: (id) =>
        guard(store.remove("services", id), "Service removed"),
      saveSettings: (patch) =>
        guard(store.saveSettings({ ...settings, ...patch }), "Settings saved"),
      importAll: async (obj) => {
        for (const col of ["services", "clients", "appts"])
          for (const it of Object.values(obj[col] || {}))
            await store.put(col, it);
        await store.saveSettings({
          ...DEFAULT_SETTINGS,
          ...(obj.settings || {}),
          started: true,
        });
        flash("Backup restored");
      },
    }),
    [store, guard, settings, flash],
  );

  const startOwnBook = useCallback(
    async ({ ownerName, salonName, currency }) => {
      const s = realRef.current;
      const ok = await guard(
        s.saveSettings({
          ...DEFAULT_SETTINGS,
          ownerName,
          salonName,
          currency,
          started: true,
        }),
      );
      if (!ok) return;
      for (const svc of DEFAULT_SERVICES)
        await s.put("services", { ...svc, id: uid() });
      setWelcome(false);
      go("today");
      flash("Your book is ready");
    },
    [guard, go, flash],
  );

  const ui = useMemo(
    () => ({
      newAppt: (draft = {}) =>
        setModal({
          type: "appt",
          appt: { date: todayKey(), start: "10:00", ...draft },
        }),
      editAppt: (appt) => setModal({ type: "appt", appt }),
      checkout: (appt) => setModal({ type: "checkout", appt }),
      newClient: () => setModal({ type: "clientEdit", client: null }),
      editClient: (client) => setModal({ type: "clientEdit", client }),
      openClient: (id) => setModal({ type: "client", id }),
      close: () => setModal(null),
      go,
      flash,
    }),
    [go, flash],
  );

  const owner = (realRef.current && realRef.current.owner) || "";
  const logout = useCallback(
    () => realRef.current && realRef.current.logout && realRef.current.logout(),
    [],
  );
  const ctx = {
    ...data,
    settings,
    money,
    actions,
    ui,
    demoMode,
    kind,
    owner,
    logout,
  };

  if (real.meta.needsLogin) {
    return (
      <Login
        owner={real.meta.owner}
        onLogin={(pw) => realRef.current.login(pw)}
      />
    );
  }
  const ready = real.meta.ready && (!demoMode || demo);
  const greetingName = settings.salonName || "Your salon";

  return (
    <BookCtx.Provider value={ctx}>
      <div className="app">
        <aside className="side">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <Icon name="bottle" size={18} />
            </span>
            <span className="brand-text">
              <strong>{greetingName}</strong>
              <small>Nails Saloon</small>
            </span>
          </div>
          <nav className="side-nav" aria-label="Main">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                className={view === v.id ? "on" : ""}
                onClick={() => go(v.id)}
                aria-current={view === v.id ? "page" : undefined}
              >
                <Icon name={v.icon} />
                <span>{v.label}</span>
              </button>
            ))}
          </nav>
          <button className="btn primary side-cta" onClick={() => ui.newAppt()}>
            <Icon name="plus" size={18} />
            <span>New appointment</span>
          </button>
        </aside>

        <main className="main">
          {demoMode && (
            <div className="demo-bar">
              <span>
                <Icon name="sparkle" size={16} /> You’re exploring an example
                salon. Nothing here is saved.
              </span>
              <button
                className="btn primary sm"
                onClick={() => setWelcome(true)}
              >
                Start my own book
              </button>
            </div>
          )}
          {real.meta.stale && !real.meta.ready && (
            <div className="note warn">
              Your book can’t be reached yet. It will appear as soon as the
              connection is back.
            </div>
          )}
          {!ready ? (
            <div className="loading">
              <span className="dot-spin" />
              Opening your book…
            </div>
          ) : (
            <div className="view" key={view}>
              {view === "today" && <Today />}
              {view === "calendar" && <Calendar />}
              {view === "clients" && <Clients />}
              {view === "income" && <Income />}
              {view === "menu" && <Menu onStart={() => setWelcome(true)} />}
            </div>
          )}
        </main>

        <nav className="tabbar" aria-label="Main">
          {VIEWS.map((v, i) => (
            <React.Fragment key={v.id}>
              {i === 2 && (
                <button
                  className="tab-fab"
                  onClick={() => ui.newAppt()}
                  aria-label="New appointment"
                >
                  <Icon name="plus" size={24} stroke={2} />
                </button>
              )}
              <button
                className={view === v.id ? "on" : ""}
                onClick={() => go(v.id)}
                aria-current={view === v.id ? "page" : undefined}
              >
                <Icon name={v.icon} size={22} />
                <span>{v.label}</span>
              </button>
            </React.Fragment>
          ))}
        </nav>

        {modal && modal.type === "appt" && (
          <ApptEditor appt={modal.appt} onClose={ui.close} />
        )}
        {modal && modal.type === "checkout" && (
          <Checkout appt={modal.appt} onClose={ui.close} />
        )}
        {modal && modal.type === "clientEdit" && (
          <ClientEditor client={modal.client} onClose={ui.close} />
        )}
        {modal && modal.type === "client" && (
          <ClientDetail id={modal.id} onClose={ui.close} />
        )}
        {welcome && (
          <Welcome
            onClose={() => setWelcome(false)}
            onStart={startOwnBook}
            kind={kind}
            owner={owner}
          />
        )}
        {toast && (
          <div className="toast" role="status">
            {toast}
          </div>
        )}
      </div>
    </BookCtx.Provider>
  );
}
