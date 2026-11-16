/* ================= UI: workout logger + finish flow ================= */
function startWorkout(tplId, schedId) {
  if (S.active) { openSheet(Confirm, { title: "Workout in progress", body: `Finish or discard “${S.active.name}” before starting another.`, yes: "Resume it", onYes: () => { U.layer = "logger"; go(); } }); return; }
  const t = tplId ? tpl(tplId) : null; const h = history();
  const items = (t ? t.items : []).map(it => mkItem(it.ex, { sets: it.sets, reps: it.reps }, it.note, h));
  S.active = { id: PL.uid(), tpl: tplId, sched: schedId || null, name: t ? t.name : "Workout", start: Date.now(), bw: latestBW(), items, rest: null };
  saveActive(); U.layer = "logger"; closeAll();
}
function mkItem(exId, target = {}, note = "", h = history()) {
  const last = PL.lastFor(h, exId);
  const warm = last ? last.all.filter(s => s.warm).length : 0;
  const n = target.sets || (last ? last.sets.length : 3);
  const sets = [...Array(warm).fill(0).map(() => ({ w: "", r: "", warm: true, done: false })), ...Array(n).fill(0).map(() => ({ w: "", r: "", warm: false, done: false }))];
  return { k: PL.uid(), ex: exId, target, note: note || "", sets };
}
const A = () => S.active;
function touchA() { saveActive(); go(); }

/* placeholder ("last time" or previous row) for a set row */
function rowInfo(item, idx, last) {
  const s = item.sets[idx];
  const sameKind = item.sets.slice(0, idx).filter(x => x.warm === s.warm).length;
  const pool = last ? (s.warm ? last.all.filter(x => x.warm) : last.sets) : [];
  const L = pool[sameKind] || null;
  let prev = null; for (let i = idx - 1; i >= 0; i--) if (item.sets[i].warm === s.warm) { prev = item.sets[i]; break; }
  let pi = -1; for (let i = idx - 1; i >= 0; i--) if (item.sets[i].warm === s.warm) { pi = i; break; }
  const prevPh = pi >= 0 && prev.w === "" ? rowInfo(item, pi, last).phW : "";
  const phW = L ? String(L.w ?? "") : prev ? String(prev.w !== "" ? prev.w : prevPh) : "";
  const phR = L ? String(L.r ?? "") : (!s.warm && item.target.reps ? String(item.target.reps) : prev ? String(prev.r !== "" ? prev.r : "") : "");
  return { L, phW, phR, label: s.warm ? "W" : String(idx + 1 - item.sets.slice(0, idx).filter(x => x.warm).length) };
}
function recalcPRs(item) {
  const e = ex(item.ex); if (e.kind !== "weight" && e.kind !== "bw") { item.sets.forEach(s => s.pr = false); return; }
  const prior = PL.priorSetsFor(history(), item.ex, A().id).slice(); const had = prior.length > 0;
  for (const s of item.sets) {
    if (!had || !s.done || s.warm) { s.pr = false; continue; }
    s.pr = PL.isPR(prior, s.w, +s.r);
    prior.push({ w: +s.w || 0, r: +s.r || 0 });
  }
}

function Logger() {
  const a = A(); const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick(x => x + 1), 1000); let wl = null;
    try { navigator.wakeLock?.request("screen").then(l => { wl = l; }).catch(() => {}); } catch (e) {}
    return () => { clearInterval(t); try { wl && wl.release(); } catch (e) {} }; }, []);
  if (!a) return null;
  const h = history();
  return html`<div class="layer"><div class="inner">
    <div class="lhead wrap"><button class="btn sm" aria-label="Minimize workout" onClick=${() => { U.layer = null; go(); }}>⌄</button>
      <div class="grow" style="min-width:0"><div class="b" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.name}</div><div class="tiny muted num">${fmtDur(Date.now() - a.start)} · ${a.bw} lb bodyweight</div></div>
      <button class="btn sm" aria-label="Workout options" onClick=${() => openSheet(Menu, { title: a.name, items: [
        ["Rename workout", () => openSheet(RenameSheet, { value: a.name, onSave: v => { a.name = v; touchA(); } })],
        ["Discard workout", () => openSheet(Confirm, { title: "Discard this workout?", body: "Nothing from this session will be saved.", yes: "Discard", onYes: () => { S.active = null; saveActive(); U.layer = null; go(); } }), "danger"],
      ] })}>${IC.more}</button>
      <button class="btn sm ok" onClick=${finishWorkout}>Finish</button></div>
    <div class="wrap">
      ${a.items.map((it, i) => html`<${ExerciseCard} key=${it.k} it=${it} idx=${i} last=${PL.lastFor(h, it.ex, a.id)} />`)}
      ${!a.items.length && html`<div class="card empty" style="margin-top:14px">Add your first exercise to start logging.</div>`}
      <button class="btn wide" style="margin-top:14px" onClick=${() => openSheet(ExercisePicker, { onPick: id => { a.items.push(mkItem(id)); touchA(); } })}>+ Add exercise</button>
    </div></div>
    <${RestBar} /></div>`;
}
function RenameSheet({ value, onSave }) {
  const [v, setV] = useState(value);
  return html`<${Sheet} title="Rename"><input class="f" aria-label="Name" value=${v} onInput=${e => setV(e.target.value)} /><button class="btn pri wide" style="margin-top:12px" onClick=${() => { if (v.trim()) onSave(v.trim()); closeSheet(); }}>Save</button><//>`;
}
function ExerciseCard({ it, idx, last }) {
  const a = A(); const e = ex(it.ex);
  const unit = e.kind === "weight" ? "lb" : e.kind === "bw" ? "+lb" : null;
  const repsLbl = e.kind === "time" ? "sec" : e.kind === "distance" ? "mi" : "reps";
  const t = it.target || {};
  const hitAll = last && t.reps && last.sets.length >= (t.sets || 1) && last.sets.every(s => (+s.r || 0) >= t.reps);
  const move = d => { const j = idx + d; if (j < 0 || j >= a.items.length) return; [a.items[idx], a.items[j]] = [a.items[j], a.items[idx]]; touchA(); };
  const restSec = e.rest || S.core.settings.rest;
  return html`<div class="exc">
    <div class="hd"><div class="grow" style="min-width:0"><button class="nm" onClick=${() => openSheet(ExerciseHistory, { id: it.ex })}>${e.name}</button>
      <div class="tiny muted">${t.sets ? `Target ${t.sets} × ${t.reps || "?"}` : ""}${t.sets && last ? " · " : ""}${last ? "Last " + fmtDate(last.date, { month: "short", day: "numeric" }) : t.sets ? "" : "First time"}${e.kind === "bw" ? ` · ${Math.round(e.mod * 100)}% BW` : ""} · rest ${restSec}s</div></div>
      <button class="btn sm" aria-label="Exercise options" onClick=${() => openSheet(Menu, { title: e.name, items: [
        ["View history", () => openSheet(ExerciseHistory, { id: it.ex })],
        ["Swap exercise", () => openSheet(ExercisePicker, { title: "Swap for", onPick: id => { a.items[idx] = { ...mkItem(id, it.target, it.note), k: it.k }; touchA(); } })],
        idx > 0 && ["Move up", () => move(-1)], idx < a.items.length - 1 && ["Move down", () => move(1)],
        ["Rest timer…", () => openSheet(RestPick, { exId: it.ex })],
        [it.note ? "Edit note" : "Add note", () => openSheet(RenameSheet, { value: it.note || "", onSave: v => { it.note = v; touchA(); } })],
        ["Add warm-up set", () => { const fw = it.sets.findIndex(s => !s.warm); it.sets.splice(fw < 0 ? it.sets.length : fw, 0, { w: "", r: "", warm: true, done: false }); touchA(); }],
        ["Remove exercise", () => { a.items.splice(idx, 1); touchA(); }, "danger"],
      ] })}>${IC.more}</button></div>
    ${it.note && html`<div class="small muted" style="padding:0 14px 6px">${it.note}</div>`}
    ${hitAll && html`<div class="hint">You hit every rep last time. Try +5 lb or +1 rep.</div>`}
    <div class="sr h"><span>Set</span><span>Last</span><span>${unit || ""}</span><span>${repsLbl}</span><span></span></div>
    ${it.sets.map((s, i) => html`<${SetRow} key=${it.k + ":" + i + ":" + it.sets.length} it=${it} i=${i} last=${last} e=${e} />`)}
    <button class="addset" onClick=${() => { const p = it.sets[it.sets.length - 1]; const inf = p ? rowInfo(it, it.sets.length - 1, last) : null;
      it.sets.push({ w: p ? (p.w !== "" ? p.w : inf.phW) : "", r: p ? (p.r !== "" ? p.r : inf.phR) : "", warm: false, done: false }); touchA(); }}>+ Add set</button>
  </div>`;
}
function RestPick({ exId }) {
  const e = ex(exId); const opts = [30, 45, 60, 90, 120, 150, 180, 240, 300];
  return html`<${Menu} title=${"Rest after " + e.name} items=${opts.map(o => [`${Math.floor(o / 60)}:${pad(o % 60)}${(e.rest || S.core.settings.rest) === o ? "  ✓" : ""}`, () => mutate(() => { S.core.exercises[exId] = { ...e, rest: o }; })])} />`;
}
function SetRow({ it, i, last, e }) {
  const s = it.sets[i]; const inf = rowInfo(it, i, last);
  const [dx, setDx] = useState(0); const [drag, setDrag] = useState(false); const [shake, setShake] = useState(false);
  const st = useRef(null); const repsRef = useRef(null);
  const hasW = e.kind === "weight" || e.kind === "bw";
  const lastTxt = inf.L ? (hasW ? `${e.kind === "bw" && !+inf.L.w ? "BW" : inf.L.w || 0} × ${inf.L.r}` : `${inf.L.r}${e.kind === "time" ? "s" : " mi"}`) : "—";
  const toggle = () => {
    if (s.done) { s.done = false; recalcPRs(it); touchA(); return; }
    if (hasW && s.w === "" && inf.phW !== "") s.w = inf.phW;
    if (s.r === "" && inf.phR !== "") s.r = inf.phR;
    if (s.r === "" || !(+s.r > 0)) { setShake(true); setTimeout(() => setShake(false), 350); repsRef.current?.focus(); return; }
    s.done = true; recalcPRs(it);
    const sec = e.rest || S.core.settings.rest; A().rest = { end: Date.now() + sec * 1000, dur: sec, buzzed: false };
    touchA();
  };
  const onDown = ev => { st.current = { x: ev.clientX, y: ev.clientY, base: dx, lock: null }; };
  const onMove = ev => { const c = st.current; if (!c) return; const mx = ev.clientX - c.x, my = ev.clientY - c.y;
    if (c.lock == null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) c.lock = Math.abs(mx) > Math.abs(my) ? "x" : "y";
    if (c.lock === "x") { setDrag(true); setDx(Math.max(-96, Math.min(0, c.base + mx))); } };
  const onUp = () => { const c = st.current; st.current = null; setDrag(false); if (c && c.lock === "x") setDx(dx < -44 ? -84 : 0); };
  const setVal = (k, v) => { s[k] = v.replace(/[^0-9.]/g, ""); if (s.done) recalcPRs(it); touchA(); };
  return html`<div class=${"swipe" + (drag ? " drag" : "")}>
    <button class="del" onClick=${() => { it.sets.splice(i, 1); recalcPRs(it); touchA(); }}>Delete</button>
    <div class=${"sr" + (s.done ? " done" : "") + (shake ? " shake" : "")} style=${`transform:translateX(${dx}px)`} onPointerDown=${onDown} onPointerMove=${onMove} onPointerUp=${onUp} onPointerCancel=${onUp}>
      <button class=${"sn" + (s.warm ? " w" : "")} aria-label="Toggle warm-up" onClick=${() => { s.warm = !s.warm; recalcPRs(it); touchA(); }}>${inf.label}</button>
      <span class="last num">${lastTxt}</span>
      ${hasW ? html`<input class="cell" inputmode="decimal" aria-label=${"Set " + inf.label + " weight"} placeholder=${inf.phW || (e.kind === "bw" ? "0" : "")} value=${s.w} onFocus=${ev => ev.target.select()} onInput=${ev => setVal("w", ev.target.value)} />` : html`<span></span>`}
      <input ref=${repsRef} class="cell" inputmode=${e.kind === "distance" ? "decimal" : "numeric"} aria-label=${"Set " + inf.label + " " + (e.kind === "time" ? "seconds" : e.kind === "distance" ? "miles" : "reps")} placeholder=${inf.phR} value=${s.r} onFocus=${ev => ev.target.select()} onInput=${ev => setVal("r", ev.target.value)} />
      <button class=${"ck" + (s.done ? " on" : "")} aria-label=${s.done ? "Uncheck set" : "Complete set"} onClick=${toggle}>${IC.check}</button>
      ${s.pr && html`<span class="prb">PR</span>`}
    </div></div>`;
}
function RestBar() {
  const a = A(); const [, t] = useState(0);
  useEffect(() => { const x = setInterval(() => t(n => n + 1), 250); return () => clearInterval(x); }, []);
  if (!a || !a.rest) return null;
  const left = Math.ceil((a.rest.end - Date.now()) / 1000);
  if (left <= 0 && !a.rest.buzzed) { a.rest.buzzed = true; try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {} }
  const adj = n => { a.rest.end += n * 1000; a.rest.dur = Math.max(1, a.rest.dur + n); a.rest.buzzed = false; touchA(); };
  return html`<div class=${"rest" + (left <= 0 ? " over" : "")}><div class="in">
    <div class="t">${left > 0 ? `${Math.floor(left / 60)}:${pad(left % 60)}` : "Go!"}</div>
    <div class="grow">${left > 0 ? html`<div class="tiny muted" style="margin-bottom:4px">Rest</div><${Bar} pct=${left / a.rest.dur} />` : html`<div class="b pill-ok">Rest over. Next set.</div>`}</div>
    ${left > 0 && html`<button class="btn sm" onClick=${() => adj(-15)}>−15</button><button class="btn sm" onClick=${() => adj(15)}>+15</button>`}
    <button class="btn sm" onClick=${() => { a.rest = null; touchA(); }}>${left > 0 ? "Skip" : "Dismiss"}</button></div></div>`;
}

function finishWorkout() {
  const a = A();
  const done = a.items.reduce((n, it) => n + it.sets.filter(s => s.done).length, 0);
  const open = a.items.reduce((n, it) => n + it.sets.filter(s => !s.done).length, 0);
  if (!done) { openSheet(Confirm, { title: "No sets checked", body: "Check off the sets you completed, or discard this workout.", yes: "Discard workout", no: "Keep logging", onYes: () => { S.active = null; saveActive(); U.layer = null; go(); } }); return; }
  if (open) { openSheet(Confirm, { title: `${open} unchecked set${open > 1 ? "s" : ""}`, body: "Unchecked sets won't be saved. Finish anyway?", yes: "Finish workout", no: "Keep logging", onYes: completeWorkout }); return; }
  completeWorkout();
}
function completeWorkout() {
  const a = A(); const end = Date.now();
  a.items.forEach(recalcPRs);
  const items = a.items.map(it => ({ ex: it.ex, note: it.note, sets: it.sets.filter(s => s.done).map(s => ({ w: s.w === "" ? 0 : +s.w, r: +s.r, warm: !!s.warm, done: true, pr: !!s.pr })) })).filter(it => it.sets.length);
  const exMap = {}; items.forEach(it => { exMap[it.ex] = ex(it.ex); });
  const sess = { id: a.id, tpl: a.tpl, sched: a.sched, name: a.name, start: a.start, end, bw: a.bw, items };
  sess.vol = PL.sessionVolume(sess, exMap);
  const LPL = S.core.settings.lbPerLevel; sess.lbPerLevel = LPL;
  sess.prs = items.reduce((n, it) => n + it.sets.filter(s => s.pr).length, 0);
  sess.sets = items.reduce((n, it) => n + it.sets.length, 0);
  // template diff
  const t = a.tpl ? tpl(a.tpl) : null; let diff = false;
  if (t) { const perf = items.map(it => it.ex); const orig = t.items.map(i => i.ex);
    diff = perf.join("|") !== orig.join("|") || items.some(it => { const ti = t.items.find(x => x.ex === it.ex); return ti && ti.sets && it.sets.filter(s => !s.warm).length !== ti.sets; }); }
  // game rewards
  const g = G_(); const res = []; sess.awards = []; sess.xp = 0;
  for (const uid of g.party) { const m = monOf(uid); if (!m) continue;
    const frac = uid === g.active ? 1 : S.core.settings.share; const lb = sess.vol * frac;
    const before = { sp: m.sp, lv: m.lv }; const r = PL.awardXP(m, PL.lbToXP(m, lb, LPL)); res.push({ ...r, before, share: uid !== g.active, levels: lb / LPL }); queueGrowth(m, r);
    sess.awards.push({ uid, frac, lb, amt: r.gained }); if (uid === g.active) sess.xp = r.gained; }
  S.sessions.push(sess); saveSession(sess);
  const n = sessionsDone(); const newBadges = [];
  for (const ms of PL.MILESTONES) if (n >= ms.n && !g.badges[ms.id]) { g.badges[ms.id] = end; g.bank += ms.lv; g.bankLog.push({ d: end, amt: ms.lv, why: ms.name + " badge" }); newBadges.push(ms); }
  saveCore();
  S.active = null; saveActive();
  U.finish = { sess, res, newBadges, diff: diff ? t.id : null };
  U.layer = "finish"; closeAll();
}
function queueGrowth(m, r) {
  for (const mv of r.pending) U.queue.push({ k: "learn", uid: m.uid, move: mv });
  const opts = PL.evoOptions(m); if (opts.length && !U.queue.some(q => q.k === "evo" && q.uid === m.uid)) U.queue.push({ k: "evo", uid: m.uid });
}
/* ---- editing / deleting past workouts: XP follows the change ---- */
function sessionAwards(sess) {
  if (sess.awards) return sess.awards;
  const g = G_(); return g.party.map(uid => { const frac = uid === g.active ? 1 : S.core.settings.share; return { uid, frac, lb: (sess.vol || 0) * frac, amt: Math.round((sess.xp || 0) * frac) }; });
}
/* newVol: the workout's corrected pounds (0 when deleting). More pounds adds XP at the Pokémon's current level;
   fewer pounds takes back the same share of the XP it originally earned. */
function reapplyXP(sess, newVol) {
  const out = []; const LPL = sess.lbPerLevel || S.core.settings.lbPerLevel; sess.awards = sessionAwards(sess).map(a => ({ ...a }));
  for (const a of sess.awards) { const m = monOf(a.uid); if (!m) continue;
    const newLb = newVol * a.frac; if (a.lb == null) a.lb = (sess.vol || 0) * a.frac; if (Math.abs(newLb - a.lb) < 0.5) continue;
    const lv0 = m.lv;
    if (newLb > a.lb) { const r = PL.awardXP(m, PL.lbToXP(m, newLb - a.lb, LPL)); a.amt += r.gained; queueGrowth(m, r); out.push({ m, d: r.gained, lv0 }); }
    else { const take = a.lb > 0 ? Math.round(a.amt * (1 - newLb / a.lb)) : 0; const rm = PL.removeXP(m, take); a.amt -= rm; out.push({ m, d: -rm, lv0 }); }
    a.lb = newLb; }
  const act = sess.awards.find(a => a.frac === 1); sess.xp = act ? act.amt : 0; return out;
}
function xpSummary(out) {
  if (!out.length) return "No XP change";
  return out.map(o => `${monName(o.m)} ${o.d > 0 ? "+" : "−"}${Math.abs(o.d).toLocaleString()} XP${o.m.lv !== o.lv0 ? ` (Lv ${o.m.lv})` : ""}`).join(" · ");
}
function recomputeAllPRs() {
  const prior = {}; const changed = [];
  for (const s of [...S.sessions].sort((a, b) => a.end - b.end)) { let dirty = false, n = 0;
    const start = {}; for (const it of s.items) start[it.ex] = start[it.ex] ?? (prior[it.ex] || []).length;
    for (const it of s.items) { const e = ex(it.ex); const p = prior[it.ex] = prior[it.ex] || [];
      for (const x of it.sets) { const pr = (e.kind === "weight" || e.kind === "bw") && !x.warm && start[it.ex] > 0 ? PL.isPR(p, x.w, +x.r) : false;
        if (!!x.pr !== pr) { x.pr = pr; dirty = true; } if (pr) n++; if (!x.warm) p.push({ w: +x.w || 0, r: +x.r || 0 }); } }
    if (s.prs !== n) { s.prs = n; dirty = true; } if (dirty) changed.push(s); }
  changed.forEach(saveSession); S.hist = null;
}
function deleteWorkout(id) {
  const s = S.sessions.find(x => x.id === id); if (!s) return;
  const out = reapplyXP(s, 0); deleteSession(id); recomputeAllPRs(); saveCore(); closeAll();
  toast("Workout deleted · " + xpSummary(out));
}
function saveEditedWorkout(id, draft) {
  const s = S.sessions.find(x => x.id === id); if (!s) return;
  const items = draft.items.map(it => ({ ...it, sets: it.sets.filter(x => +x.r > 0).map(x => ({ ...x, w: +x.w || 0, r: +x.r })) })).filter(it => it.sets.length);
  if (!items.length) { openSheet(Confirm, { title: "No sets left", body: "Delete this workout instead? Its XP will be taken back.", yes: "Delete workout", onYes: () => deleteWorkout(id) }); return; }
  s.items = items; s.name = draft.name.trim() || s.name; s.bw = +draft.bw > 0 ? +draft.bw : s.bw;
  const exMap = {}; items.forEach(it => { exMap[it.ex] = ex(it.ex); });
  s.vol = PL.sessionVolume(s, exMap); s.sets = items.reduce((n, it) => n + it.sets.length, 0);
  const out = reapplyXP(s, s.vol);
  saveSession(s); recomputeAllPRs(); saveCore(); closeAll();
  toast("Workout updated · " + xpSummary(out));
}
function updateTemplateFrom(sess, tplId) {
  const t = tpl(tplId); if (!t) return;
  mutate(() => { t.items = sess.items.map(it => { const old = t.items.find(x => x.ex === it.ex); const w = it.sets.filter(s => !s.warm);
    return { ex: it.ex, sets: w.length || it.sets.length, reps: old?.reps || Math.max(...w.map(s => s.r), 0) || null, note: old?.note || it.note || "" }; }); });
  toast(`Updated ${t.name}`);
}
function Finish() {
  const f = U.finish; if (!f) return null; const s = f.sess;
  const [asked, setAsked] = useState(!f.diff);
  const prs = []; s.items.forEach(it => it.sets.forEach(x => { if (x.pr) prs.push([ex(it.ex), x]); }));
  const close = () => { U.finish = null; U.layer = null; go(); };
  return html`<div class="layer"><div class="inner wrap" style="padding-top:16px">
    <div class="center" style="margin:10px 0 18px"><div class="tiny b faint" style="text-transform:uppercase;letter-spacing:.08em">Workout complete</div><div style="font-size:26px;font-weight:700">${s.name}</div></div>
    ${!asked && html`<div class="card" style="border-color:var(--blue);margin-bottom:14px"><div class="b">Update the ${tpl(f.diff)?.name} template?</div>
      <div class="small muted" style="margin:4px 0 10px">Today's exercises or set counts differ from the template.</div>
      <div class="row"><button class="btn sm pri" onClick=${() => { updateTemplateFrom(s, f.diff); setAsked(true); }}>Update template</button><button class="btn sm" onClick=${() => setAsked(true)}>Keep as one-time</button></div></div>`}
    <div class="stat-grid"><div class="tile"><div class="k">Time</div><div class="v">${fmtDur(s.end - s.start)}</div></div><div class="tile"><div class="k">Volume (lb)</div><div class="v">${fmtVol(s.vol)}</div></div><div class="tile"><div class="k">Sets</div><div class="v">${s.sets}</div></div></div>
    ${prs.length > 0 && html`<h2 class="sec">${prs.length} personal record${prs.length > 1 ? "s" : ""}</h2><div class="list">${prs.map(([e, x]) => html`<div class="li"><span class="tp" style="background:var(--pr)">PR</span><div class="grow b">${e.name}</div><span class="num">${setStr(e, x)}</span></div>`)}</div>`}
    <h2 class="sec">${fmtVol(s.vol)} lb lifted = ${fmtLv(s.vol / s.lbPerLevel)} for your active Pokémon</h2>
    <div class="list">${f.res.map(r => { const m = monOf(r.uid); if (!m) return null;
      return html`<div class="li"><${Sprite} sp=${r.before.sp} size=${48} /><div class="grow"><div class="row"><span class="b grow">${monName(m)}</span><span class="small num">+${fmtLv(r.levels)}${r.share ? " (share)" : ""}</span></div>
        <div class="small muted num" style="margin:2px 0 5px">Lv ${r.from}${r.to > r.from ? html` → <b style="color:var(--ok)">Lv ${r.to}</b>` : ""}${r.learned.length ? " · learned " + r.learned.map(x => PL.move(x).n).join(", ") : ""}</div><${Bar} pct=${PL.xpProgress(m).pct} /></div></div>`; })}
      ${!f.res.length && html`<div class="empty small">No Pokémon in your party.</div>`}</div>
    ${f.newBadges.map(b => html`<div class="card row" style="margin-top:12px"><span class="badge" style="background:var(--pr)">${b.n}</span><div class="grow"><div class="b">${b.name} badge</div><div class="small muted num">+${fmtLv(b.lv)} added to your XP Bank</div></div></div>`)}
    <button class="btn pri wide" style="margin-top:18px" onClick=${close}>${U.queue.length ? "Continue" : "Done"}</button>
  </div></div>`;
}

/* ---------------- growth prompts (learn move / evolve) ---------------- */
function PromptLayer() {
  if (U.layer === "finish" || U.layer === "battle" || U.sheets.length) return null;
  const q = U.queue[0]; if (!q) return null;
  const m = monOf(q.uid); if (!m && q.k !== "msg") { U.queue.shift(); setTimeout(go); return null; }
  const next = () => { U.queue.shift(); saveCore(); go(); };
  let body;
  if (q.k === "msg") body = html`<div class="center">${q.sp && html`<${Sprite} sp=${q.sp} size=${120} />`}<h3>${q.title}</h3><p class="muted">${q.body}</p></div><button class="btn pri wide" onClick=${next}>OK</button>`;
  else if (q.k === "learn") { const mv = PL.move(q.move);
    body = html`<div class="row" style="margin-bottom:6px"><${Sprite} sp=${m.sp} size=${56} /><h3 class="grow" style="margin:0">${monName(m)} wants to learn ${mv.n}</h3></div>
      <div class="card row small" style="margin-bottom:12px"><${TypePill} t=${mv.t} /><span class="grow">${mv.p ? `Power ${mv.p}` : "Status move"} · Acc ${mv.a || "—"} · PP ${mv.pp}</span></div>
      ${m.moves.length < 4 ? html`<button class="btn pri wide" onClick=${() => { m.moves.push(q.move); next(); }}>Learn ${mv.n}</button>` : html`
      <div class="small muted" style="margin-bottom:6px">Choose a move to forget:</div>
      <div class="list">${m.moves.map((id, i) => { const o = PL.move(id); return html`<button class="li" onClick=${() => { m.moves[i] = q.move; toast(`Forgot ${o.n}, learned ${mv.n}`); next(); }}><${TypePill} t=${o.t} /><div class="grow b">${o.n}</div><span class="small muted num">${o.p || "—"}</span></button>`; })}</div>`}
      <button class="btn wide" style="margin-top:10px" onClick=${next}>Don't learn ${mv.n}</button>`; }
  else if (q.k === "evo") { const opts = PL.evoOptions(m);
    if (!opts.length) { U.queue.shift(); setTimeout(go); return null; }
    const doEvo = to => { const from = monName(m); const nickless = !m.nick; const r = PL.evolve(m, to); U.queue.shift();
      const extra = r.pending.map(mv => ({ k: "learn", uid: m.uid, move: mv }));
      U.queue.unshift({ k: "msg", sp: to, title: "Congratulations!", body: `${from} evolved into ${PL.mon(to).n}!${r.learned.length ? " It learned " + r.learned.map(x => PL.move(x).n).join(", ") + "." : ""}` }, ...extra);
      if (PL.evoOptions(m).length) U.queue.splice(1 + extra.length, 0, { k: "evo", uid: m.uid });
      if (nickless) {} saveCore(); go(); };
    body = html`<div class="center"><${Sprite} sp=${m.sp} size=${120} /><h3>What? ${monName(m)} is evolving!</h3>
      <p class="muted small">${opts[0].how === "stone" ? "Normally a stone evolution, here it happens at Lv 30." : opts[0].how === "trade" ? "Normally a trade evolution, here it happens at Lv 40." : ""}</p></div>
      ${opts.length > 1 ? html`<div class="small muted center" style="margin-bottom:8px">Choose its evolution:</div><div class="row" style="gap:8px">${opts.map(o => html`<button class="card grow center" onClick=${() => doEvo(o.to)}><${Sprite} sp=${o.to} size=${64} /><div class="b small">${PL.mon(o.to).n}</div></button>`)}</div>`
        : html`<button class="btn pri wide" onClick=${() => doEvo(opts[0].to)}>Evolve into ${PL.mon(opts[0].to).n}</button>`}
      <button class="btn wide" style="margin-top:10px" onClick=${() => { m.evoNo = m.lv; next(); }}>Stop evolution</button>`; }
  return html`<div class="scrim" style="z-index:80"><div class="sheet"><div class="grab"></div>${body}</div></div>`;
}
