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

const S = { core: LS.get("pl.core") || defaultCore(), sessions: LS.get("pl.sessions") || [], active: LS.get("pl.active"), sync: "device", hist: null };
let rerender = () => {};
const setRerender = f => { rerender = f; };

/* ---------- remote sync (db capability), localStorage first ---------- */
const R = { db: null, base: null, main: null, sess: null, act: null };
const inflight = {}, dirty = {};
function put(key, ref, getData) {
  if (!ref) return;
  if (inflight[key]) { dirty[key] = getData; return; }
  inflight[key] = (async () => {
    let fn = getData;
    while (fn) { dirty[key] = null; const d = fn(); try { if (d == null) await ref.delete(); else await ref.set(d); S.sync = "synced"; } catch (e) { S.sync = "error"; } fn = dirty[key]; }
    inflight[key] = null;
  })();
}
let coreTimer = null, actTimer = null;
function saveCore() {
  S.core.updated = Date.now(); LS.set("pl.core", S.core);
  clearTimeout(coreTimer); coreTimer = setTimeout(() => put("main", R.main, () => S.core), 700);
}
function saveSessionsLocal() { LS.set("pl.sessions", S.sessions); S.hist = null; }
function saveSession(s) { saveSessionsLocal(); if (R.sess) put("s:" + s.id, R.sess.doc(s.id), () => s); }
function deleteSession(id) { S.sessions = S.sessions.filter(s => s.id !== id); saveSessionsLocal(); if (R.sess) put("s:" + id, R.sess.doc(id), () => null); }
function saveActive() {
  if (S.active) S.active.updated = Date.now();
  LS.set("pl.active", S.active);
  clearTimeout(actTimer); actTimer = setTimeout(() => put("active", R.act, () => (S.active ? { s: S.active } : null)), 1500);
}
function mutate(fn) { fn(); saveCore(); rerender(); }
function history() { if (!S.hist) S.hist = PL.buildHistory(S.sessions); return S.hist; }

async function connect() {
  try {
    const c = window.claude; if (!c || !c.use) return;
    const [db, user] = await Promise.all([c.use("db"), c.use("user")]);
    if (!db || !user) return;
    const id = await user.id(); if (!id) return;
    R.db = db; R.base = db.collection("data/users/" + id); R.main = R.base.doc("main"); R.sess = R.main.collection("sessions"); R.act = R.base.doc("active");
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 10000));
    const [m, ss, a] = await Promise.race([Promise.all([R.main.get(), R.sess.limit(1000).get(), R.act.get()]), timeout]);
    const local = LS.get("pl.core");
    if (m.exists) { const rem = m.data(); if (!local || (rem.updated || 0) >= (local.updated || 0)) S.core = JSON.parse(JSON.stringify(rem)); else put("main", R.main, () => S.core); }
    else if (local) put("main", R.main, () => S.core);
    const remote = {}; ss.docs.forEach(d => { remote[d.id] = JSON.parse(JSON.stringify(d.data())); });
    const merged = { ...remote };
    for (const s of S.sessions) if (!merged[s.id]) { merged[s.id] = s; put("s:" + s.id, R.sess.doc(s.id), () => s); }
    S.sessions = Object.values(merged); saveSessionsLocal();
    if (a.exists) { const ra = a.data().s; if (ra && (!S.active || (ra.updated || 0) > (S.active.updated || 0))) { S.active = JSON.parse(JSON.stringify(ra)); LS.set("pl.active", S.active); } }
    else if (S.active) put("active", R.act, () => ({ s: S.active }));
    S.sync = "synced"; LS.set("pl.core", S.core); rerender();
  } catch (e) { S.sync = S.sync === "synced" ? "synced" : "device"; rerender(); }
}

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
