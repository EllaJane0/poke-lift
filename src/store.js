/* ================= state + persistence ================= */
const LS = {
  get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
const pad = n => String(n).padStart(2, "0");
const dk = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const pk = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const EX_SEED = [
  ["Barbell Bench Press","weight","Chest"],["Incline Dumbbell Press","weight","Chest"],["Dumbbell Bench Press","weight","Chest"],["Cable Fly","weight","Chest"],
  ["Overhead Press","weight","Shoulders"],["Dumbbell Shoulder Press","weight","Shoulders"],["Lateral Raise","weight","Shoulders"],["Face Pull","weight","Shoulders"],
  ["Tricep Pushdown","weight","Triceps"],["Overhead Tricep Extension","weight","Triceps"],["Skull Crusher","weight","Triceps"],
  ["Barbell Row","weight","Back"],["Dumbbell Row","weight","Back"],["Lat Pulldown","weight","Back"],["Seated Cable Row","weight","Back"],["Shrug","weight","Back"],
  ["Barbell Curl","weight","Biceps"],["Dumbbell Curl","weight","Biceps"],["Hammer Curl","weight","Biceps"],
  ["Back Squat","weight","Legs"],["Front Squat","weight","Legs"],["Deadlift","weight","Legs"],["Romanian Deadlift","weight","Legs"],["Leg Press","weight","Legs"],
  ["Bulgarian Split Squat","weight","Legs"],["Walking Lunge","weight","Legs"],["Leg Extension","weight","Legs"],["Leg Curl","weight","Legs"],["Hip Thrust","weight","Legs"],["Standing Calf Raise","weight","Legs"],
  ["Pull-up","bw","Back",1],["Chin-up","bw","Back",1],["Push-up","bw","Chest",0.65],["Dip","bw","Chest",1],
  ["Plank","time","Core"],["Treadmill Run","distance","Cardio"],
];
function defaultCore() {
  const exercises = {};
  for (const [name, kind, muscle, mod] of EX_SEED) { const id = slug(name); exercises[id] = { id, name, kind, muscle, mod: mod || 0, rest: null }; }
  const it = (ex, sets, reps) => ({ ex, sets, reps });
  return {
    v: 1, updated: Date.now(),
    settings: { rate: 0.2, share: 0.5, bw: 180, rest: 90, eggSteps: { common: 5000, uncommon: 10000, rare: 20000 } },
    bwlog: [], exercises,
    templates: [
      { id: PL.uid(), name: "Push", items: [it("barbell-bench-press",4,8), it("overhead-press",3,8), it("incline-dumbbell-press",3,10), it("lateral-raise",3,12), it("tricep-pushdown",3,12), it("push-up",2,15)] },
      { id: PL.uid(), name: "Pull", items: [it("pull-up",4,8), it("barbell-row",4,8), it("lat-pulldown",3,10), it("face-pull",3,15), it("dumbbell-curl",3,12)] },
      { id: PL.uid(), name: "Legs", items: [it("back-squat",4,6), it("romanian-deadlift",3,8), it("leg-press",3,10), it("leg-curl",3,12), it("standing-calf-raise",4,12)] },
    ],
    sched: {},
    game: { started: false, mons: {}, party: [], active: null, bank: 0, bankLog: [], badges: {}, beaten: {}, eggs: [], incub: null, steps: 0, dex: [] },
  };
}

/* Three modes: "cloud" (Supabase accounts, used on Vercel), "claude" (claude.ai artifact storage), "local" (this browser only). */
const CFG = window.PL_CONFIG || {};
const MODE = CFG.supabaseUrl && CFG.supabaseKey && window.supabase ? "cloud" : "local";
let NS = "pl.";
const S = { core: null, sessions: [], active: null, sync: "device", hist: null, auth: { state: MODE === "cloud" ? "loading" : "none", email: "", uid: null } };
function loadLocal() { S.core = LS.get(NS + "core") || defaultCore(); S.sessions = LS.get(NS + "sessions") || []; S.active = LS.get(NS + "active"); S.hist = null; }
if (MODE !== "cloud") loadLocal();
let rerender = () => {};
const setRerender = f => { rerender = f; };
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}

/* ---------- write queue: one write at a time per key, latest data wins, failed writes retry ---------- */
const R = { db: null, base: null, main: null, sess: null, act: null, sb: null };
const inflight = {}, pending = {};
function put(key, write) {
  if (!write) return;
  pending[key] = write;
  if (inflight[key]) return;
  inflight[key] = (async () => {
    while (pending[key]) { const w = pending[key]; pending[key] = null;
      try { await w(); S.sync = "synced"; }
      catch (e) { S.sync = "error"; if (!pending[key]) pending[key] = w; inflight[key] = null; setTimeout(() => flushKey(key), 15000); rerender(); return; } }
    inflight[key] = null;
  })();
}
function flushKey(key) { const w = pending[key]; if (w && !inflight[key]) { pending[key] = null; put(key, w); } }
function flushAll() { Object.keys(pending).forEach(flushKey); }
window.addEventListener("online", flushAll);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") flushAll(); });
function hasPending() { return Object.values(pending).some(Boolean) || Object.values(inflight).some(Boolean); }

/* remote writers per mode */
const remote = {
  core() {
    if (R.sb) return async () => { const { error } = await R.sb.from("pokelift_state").upsert({ user_id: S.auth.uid, core: S.core, updated_at: new Date().toISOString() }); if (error) throw error; };
    if (R.main) return () => R.main.set(S.core);
  },
  active() {
    if (R.sb) return async () => { const { error } = await R.sb.from("pokelift_state").upsert({ user_id: S.auth.uid, active: S.active }); if (error) throw error; };
    if (R.act) return () => (S.active ? R.act.set({ s: S.active }) : R.act.delete());
  },
  session(s) {
    if (R.sb) return async () => { const { error } = await R.sb.from("pokelift_sessions").upsert({ user_id: S.auth.uid, id: s.id, data: s, ended_at: new Date(s.end).toISOString(), updated_at: new Date().toISOString() }); if (error) throw error; };
    if (R.sess) return () => R.sess.doc(s.id).set(s);
  },
  delSession(id) {
    if (R.sb) return async () => { const { error } = await R.sb.from("pokelift_sessions").delete().eq("id", id); if (error) throw error; };
    if (R.sess) return () => R.sess.doc(id).delete();
  },
};
let coreTimer = null, actTimer = null;
function saveCore() {
  S.core.updated = Date.now(); LS.set(NS + "core", S.core);
  clearTimeout(coreTimer); coreTimer = setTimeout(() => put("main", remote.core()), 700);
}
function saveSessionsLocal() { LS.set(NS + "sessions", S.sessions); S.hist = null; }
function saveSession(s) { saveSessionsLocal(); put("s:" + s.id, remote.session(s)); }
function deleteSession(id) { S.sessions = S.sessions.filter(s => s.id !== id); saveSessionsLocal(); put("s:" + id, remote.delSession(id)); }
function saveActive() {
  if (S.active) S.active.updated = Date.now();
  LS.set(NS + "active", S.active);
  clearTimeout(actTimer); actTimer = setTimeout(() => put("active", remote.active()), 1500);
}
function mutate(fn) { fn(); saveCore(); rerender(); }
function history() { if (!S.hist) S.hist = PL.buildHistory(S.sessions); return S.hist; }

/* merge a remote snapshot into local state: newer core/active wins, sessions are unioned */
function mergeRemote(remCore, remSessions, remActive) {
  const local = LS.get(NS + "core");
  if (remCore) { if (!local || (remCore.updated || 0) >= (local.updated || 0)) S.core = JSON.parse(JSON.stringify(remCore)); else put("main", remote.core()); }
  else if (local && local.game && local.game.started) put("main", remote.core());
  const merged = {}; remSessions.forEach(x => { merged[x.id] = JSON.parse(JSON.stringify(x)); });
  for (const s of S.sessions) if (!merged[s.id]) { merged[s.id] = s; put("s:" + s.id, remote.session(s)); }
  S.sessions = Object.values(merged); saveSessionsLocal();
  if (remActive && (!S.active || (remActive.updated || 0) > (S.active.updated || 0))) { S.active = JSON.parse(JSON.stringify(remActive)); LS.set(NS + "active", S.active); }
  else if (S.active && !remActive) put("active", remote.active());
  LS.set(NS + "core", S.core);
}

/* ---------- cloud mode (Supabase) ---------- */
async function cloudStart() {
  R.sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "pl.auth" } });
  R.sb.auth.onAuthStateChange((ev, session) => {
    if (session && session.user) { if (S.auth.uid !== session.user.id) setTimeout(() => enterUser(session.user)); }
    else if (ev === "SIGNED_OUT" || ev === "INITIAL_SESSION") { leaveUser(); }
  });
}
async function enterUser(user) {
  S.auth = { state: "in", email: user.email || "", uid: user.id };
  NS = "pl." + user.id + ".";
  // first account to sign in on this device adopts any data logged before accounts existed
  if (!LS.get(NS + "core") && LS.get("pl.core") && !LS.get("pl.legacyClaimed")) {
    LS.set(NS + "core", LS.get("pl.core")); LS.set(NS + "sessions", LS.get("pl.sessions")); LS.set(NS + "active", LS.get("pl.active")); LS.set("pl.legacyClaimed", user.id);
  }
  loadLocal(); S.sync = "device"; S.auth.ready = false; rerender();
  try {
    const st = await R.sb.from("pokelift_state").select("core,active").maybeSingle(); if (st.error) throw st.error;
    const rows = []; for (let from = 0; ; from += 1000) {
      const r = await R.sb.from("pokelift_sessions").select("data").order("ended_at", { ascending: true }).range(from, from + 999);
      if (r.error) throw r.error; rows.push(...r.data.map(x => x.data)); if (r.data.length < 1000) break; }
    if (S.auth.uid !== user.id) return;
    mergeRemote(st.data && st.data.core, rows, st.data && st.data.active);
    S.sync = "synced";
  } catch (e) { S.sync = "error"; }
  S.auth.ready = true; rerender();
}
function leaveUser() {
  S.auth = { state: "out", email: "", uid: null }; NS = "pl."; S.core = null; S.sessions = []; S.active = null; S.hist = null;
  Object.keys(pending).forEach(k => { pending[k] = null; }); rerender();
}
async function sendCode(email) {
  const { error } = await R.sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: true } });
  if (error) throw error;
}
async function verifyCode(email, token) {
  const { error } = await R.sb.auth.verifyOtp({ email, token, type: "email" });
  if (error) throw error;
}
async function signOut() { await R.sb.auth.signOut(); }
async function eraseRemote() {
  if (!R.sb) return;
  await R.sb.from("pokelift_sessions").delete().eq("user_id", S.auth.uid);
}

/* ---------- claude.ai artifact mode ---------- */
async function claudeConnect() {
  try {
    const c = window.claude; if (!c || !c.use) return;
    const [db, user] = await Promise.all([c.use("db"), c.use("user")]);
    if (!db || !user) return;
    const id = await user.id(); if (!id) return;
    R.db = db; R.base = db.collection("data/users/" + id); R.main = R.base.doc("main"); R.sess = R.main.collection("sessions"); R.act = R.base.doc("active");
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 10000));
    const [m, ss, a] = await Promise.race([Promise.all([R.main.get(), R.sess.limit(1000).get(), R.act.get()]), timeout]);
    mergeRemote(m.exists ? m.data() : null, ss.docs.map(d => d.data()), a.exists ? a.data().s : null);
    S.sync = "synced"; rerender();
  } catch (e) { rerender(); }
}
function connect() { if (MODE === "cloud") cloudStart(); else claudeConnect(); }

/* ---------- domain helpers ---------- */
const ex = id => S.core.exercises[id] || { id, name: id, kind: "weight", mod: 0 };
const tpl = id => S.core.templates.find(t => t.id === id);
const G_ = () => S.core.game;
const monOf = uid => G_().mons[uid];
const monName = m => m.nick || PL.mon(m.sp).n;
function partyMons() { return G_().party.map(monOf).filter(Boolean); }
function latestBW() { return S.core.settings.bw || 0; }
function gymUnlocked(i) { return i === 0 || !!G_().badges["g" + (i - 1)]; }
function oppUnlocked(i, j) { return gymUnlocked(i) && (j === 0 || (G_().beaten[i + "-" + (j - 1)] || 0) > 0); }
function currentGym() { let i = 0; while (i < 7 && G_().badges["g" + i]) i++; return i; }
function addMon(m) {
  const g = G_(); g.mons[m.uid] = m; if (!g.dex.includes(m.sp)) g.dex.push(m.sp);
  if (g.party.length < 6) g.party.push(m.uid);
  if (!g.active) g.active = m.uid;
}
function sessionsDone() { return S.sessions.length; }
function fmtVol(v) { return v >= 10000 ? (v / 1000).toFixed(1).replace(/\.0$/, "") + "k" : Math.round(v).toLocaleString(); }
function fmtDur(ms) { const s = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return h ? `${h}:${pad(m)}:${pad(x)}` : `${m}:${pad(x)}`; }
function fmtDate(t, opts = { weekday: "short", month: "short", day: "numeric" }) { return new Date(t).toLocaleDateString(undefined, opts); }
