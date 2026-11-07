// Storage: the artifact's private per-person cloud store when available,
// otherwise this browser's localStorage.
const COLS = ['clients', 'appts', 'services'];
export const emptyState = () => ({ settings: null, clients: {}, appts: {}, services: {} });

export async function openStore() {
  const c = typeof window !== 'undefined' ? window.claude : null;
  if (c && typeof c.use === 'function') {
    try {
      const [db, user] = await Promise.all([c.use('db'), c.use('user')]);
      const id = user ? await user.id() : null;
      if (db && id) return cloudStore(db, id);
    } catch (e) { /* fall back */ }
  }
  const session = await apiSession();
  if (session) return apiStore(session);
  return localStore();
}

// ---------- MongoDB server (when the app is served by server/index.js) ----------
async function apiSession() {
  try {
    const r = await fetch('/api/session', { credentials: 'same-origin' });
    if (!r.ok) return null;
    const j = await r.json();
    return j && j.app === 'lacquer' ? j : null;
  } catch (e) { return null; }
}

function apiStore(session) {
  let state = emptyState();
  let meta = { ready: false, needsLogin: !session.authed, owner: session.owner };
  const subs = new Set();
  const emit = () => subs.forEach((f) => f(state, meta));
  const toMap = (arr) => Object.fromEntries((arr || []).map((x) => [x.id, x]));

  async function call(method, url, body) {
    let r;
    try {
      r = await fetch(url, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    } catch (e) { throw { code: 'unavailable' }; }
    if (r.status === 401) { meta = { ...meta, needsLogin: true }; emit(); throw { code: 'signed_out' }; }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw { code: r.status === 400 ? 'invalid_argument' : 'unavailable', message: j.error };
    return j;
  }
  async function load() {
    try {
      const b = await call('GET', '/api/book');
      state = { settings: b.settings, clients: toMap(b.clients), appts: toMap(b.appts), services: toMap(b.services) };
      meta = { ...meta, ready: true, needsLogin: false, stale: false };
    } catch (e) {
      if (e.code !== 'signed_out') meta = { ...meta, stale: true };
    }
    emit();
  }
  let timer = null;
  function startSync() {
    if (timer) return;
    load();
    timer = setInterval(() => { if (document.visibilityState === 'visible' && !meta.needsLogin) load(); }, 30000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !meta.needsLogin) load(); });
  }
  // optimistic change, rolled back by a reload if the server refuses
  async function change(apply, request) {
    const before = state; state = apply(state); emit();
    try { await request(); } catch (e) { state = before; emit(); load(); throw e; }
  }
  return {
    kind: 'api',
    owner: session.owner,
    subscribe(f) { subs.add(f); if (!meta.needsLogin) startSync(); f(state, meta); return () => subs.delete(f); },
    async login(password) {
      const r = await fetch('/api/login', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Couldn’t sign in.');
      meta = { ...meta, needsLogin: false }; emit(); startSync(); await load();
    },
    async logout() {
      await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
      clearInterval(timer); timer = null; state = emptyState(); meta = { ...meta, ready: false, needsLogin: true }; emit();
    },
    put: (col, item) => change((s) => ({ ...s, [col]: { ...s[col], [item.id]: item } }), () => call('PUT', `/api/${col}/${encodeURIComponent(item.id)}`, item)),
    remove: (col, id) => change((s) => { const m = { ...s[col] }; delete m[id]; return { ...s, [col]: m }; }, () => call('DELETE', `/api/${col}/${encodeURIComponent(id)}`)),
    saveSettings: (s2) => change((s) => ({ ...s, settings: s2 }), () => call('PUT', '/api/settings', s2)),
  };
}

function localStore() {
  const KEY = 'lacquer-book-v1';
  let state = emptyState();
  try { const raw = localStorage.getItem(KEY); if (raw) state = { ...state, ...JSON.parse(raw) }; } catch (e) {}
  const subs = new Set();
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    subs.forEach((f) => f(state, { ready: true }));
  };
  return {
    kind: 'local',
    subscribe(f) { subs.add(f); f(state, { ready: true }); return () => subs.delete(f); },
    async put(col, item) { state = { ...state, [col]: { ...state[col], [item.id]: item } }; save(); },
    async remove(col, id) { const m = { ...state[col] }; delete m[id]; state = { ...state, [col]: m }; save(); },
    async saveSettings(s) { state = { ...state, settings: s }; save(); },
  };
}

function cloudStore(db, userId) {
  const base = db.doc(`data/users/${userId}/salon`);
  let state = emptyState();
  const loaded = { settings: false, clients: false, appts: false, services: false };
  let stale = false, error = null;
  const subs = new Set();
  const meta = () => ({ ready: Object.values(loaded).every(Boolean), stale, error });
  const emit = () => subs.forEach((f) => f(state, meta()));
  let started = false;
  function start() {
    started = true;
    const timer = setTimeout(() => { if (!meta().ready) { stale = true; emit(); } }, 10000);
    const onErr = (e) => { error = e && e.code; clearTimeout(timer); Object.keys(loaded).forEach((k) => (loaded[k] = true)); emit(); };
    const check = () => { if (meta().ready) { clearTimeout(timer); stale = false; } };
    base.onSnapshot((s) => {
      state = { ...state, settings: s.exists ? s.data() : null };
      if (!s.metadata.fromCache || s.exists) loaded.settings = true;
      check(); emit();
    }, onErr);
    COLS.forEach((c) => base.collection(c).onSnapshot((snap) => {
      const m = {};
      snap.docs.forEach((d) => { m[d.id] = { ...d.data(), id: d.id }; });
      state = { ...state, [c]: m };
      if (!snap.metadata.fromCache || snap.size > 0) loaded[c] = true;
      check(); emit();
    }, onErr));
  }
  async function retry(fn) {
    try { return await fn(); }
    catch (e) {
      if (e && e.code === 'unavailable') { await new Promise((r) => setTimeout(r, 400 + Math.random() * 600)); return fn(); }
      throw e;
    }
  }
  return {
    kind: 'cloud',
    subscribe(f) { subs.add(f); if (!started) start(); f(state, meta()); return () => subs.delete(f); },
    put: (col, item) => retry(() => base.collection(col).doc(item.id).set(item)),
    remove: (col, id) => retry(() => base.collection(col).doc(id).delete()),
    saveSettings: (s) => retry(() => base.set(s)),
  };
}

export function memoryStore(initial) {
  let state = initial;
  const subs = new Set();
  const emit = () => subs.forEach((f) => f(state, { ready: true }));
  return {
    kind: 'demo',
    subscribe(f) { subs.add(f); f(state, { ready: true }); return () => subs.delete(f); },
    async put(col, item) { state = { ...state, [col]: { ...state[col], [item.id]: item } }; emit(); },
    async remove(col, id) { const m = { ...state[col] }; delete m[id]; state = { ...state, [col]: m }; emit(); },
    async saveSettings(s) { state = { ...state, settings: s }; emit(); },
  };
}
