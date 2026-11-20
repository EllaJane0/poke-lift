/* ================= UI: shared pieces, home, plan, workouts ================= */
const { html, render, useState, useEffect, useRef, useMemo } = htmPreact;
const U = { tab: "home", sheets: [], layer: null, queue: [], clip: null, toast: null, battle: null, finish: null, sel: dk() };
const go = () => rerender();
function openSheet(C, p = {}) { U.sheets.push({ C, p, id: PL.uid() }); go(); }
function closeSheet() { U.sheets.pop(); go(); }
function closeAll() { U.sheets = []; go(); }
let toastT;
function toast(msg) { U.toast = msg; go(); clearTimeout(toastT); toastT = setTimeout(() => { U.toast = null; go(); }, 2200); }

const TYPE_COL = { Normal:"#9a9a78", Fire:"#e8732c", Water:"#4d84e6", Electric:"#e0b600", Grass:"#5aa83a", Ice:"#6cc4c4", Fighting:"#b8322a", Poison:"#94409a",
  Ground:"#cba04c", Flying:"#8b7ae0", Psychic:"#ec4f7d", Bug:"#93a81a", Rock:"#a8902e", Ghost:"#6a5694", Dragon:"#6a3cf0", Dark:"#6b5446", Steel:"#9a9ab6" };
let SPRITES_OK = true;
const SPR = (sp, back, shiny) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${back ? "back/" : ""}${shiny ? "shiny/" : ""}${sp}.png`;
const TRIM = {}; const TRIM_WAIT = {};
function trimBox(src) {
  if (TRIM[src] !== undefined) return Promise.resolve(TRIM[src]);
  return TRIM_WAIT[src] || (TRIM_WAIT[src] = new Promise(res => {
    const im = new Image(); im.crossOrigin = "anonymous";
    im.onload = () => { try {
        const W = im.naturalWidth, H = im.naturalHeight, c = document.createElement("canvas"); c.width = W; c.height = H;
        const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, W, H).data;
        let x0 = W, y0 = H, x1 = -1, y1 = -1;
        for (let y = 0; y < H; y++) for (let k = 0; k < W; k++) if (d[(y * W + k) * 4 + 3] > 8) { if (k < x0) x0 = k; if (k > x1) x1 = k; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        TRIM[src] = x1 < 0 ? null : { W, H, x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
      } catch (e) { TRIM[src] = null; } res(TRIM[src]); };
    im.onerror = () => { TRIM[src] = null; res(null); };
    im.src = src; }));
}
// size = the square slot in px. The visible creature is scaled (in whole-ish steps) to fill it, bottom-aligned so it "stands".
function Sprite({ sp, size = 64, back = false, shiny = false, fill = .92 }) {
  const [bad, setBad] = useState(!SPRITES_OK);
  const src = SPR(sp, back, shiny);
  const [box, setBox] = useState(TRIM[src]);
  useEffect(() => { let on = true; if (TRIM[src] === undefined) trimBox(src).then(b => on && setBox(b)); else setBox(TRIM[src]); return () => { on = false; }; }, [src]);
  const m = PL.mon(sp); const t = m.t; const label = (shiny ? "Shiny " : "") + m.n;
  const bg = t.length > 1 ? `linear-gradient(135deg,${TYPE_COL[t[0]]} 50%,${TYPE_COL[t[1]]} 50%)` : TYPE_COL[t[0]];
  let body;
  if (bad) body = html`<span class="fb" style=${`background:${bg};font-size:${Math.round(size * .3)}px`}>${m.n.replace(/[^A-Za-z]/g, "").slice(0, 2)}</span>`;
  else if (box) {
    const k = size * fill / Math.max(box.w, box.h);
    const left = (size - box.w * k) / 2 - box.x0 * k, top = size - box.h * k - box.y0 * k - size * (1 - fill) / 4;
    body = html`<img src=${src} alt=${label} style=${`width:${box.W * k}px;height:${box.H * k}px;left:${left}px;top:${top}px`} onError=${() => { SPRITES_OK = false; setBad(true); }} />`;
  } else body = html`<img src=${src} alt=${label} style="opacity:0" onError=${() => { SPRITES_OK = false; setBad(true); }} />`;
  return html`<span class=${"spr" + (box && !bad ? " fit" : "")} style=${`width:${size}px;height:${size}px`} title=${label}>${body}
    ${shiny && html`<span class="star" aria-hidden="true">✦</span>`}</span>`;
}
const TypePill = ({ t }) => html`<span class="tp" style=${`background:${TYPE_COL[t] || "#888"}`}>${t}</span>`;
const Bar = ({ pct, cls = "" }) => html`<div class=${"bar " + cls}><i style=${`width:${Math.max(0, Math.min(100, pct * 100))}%`}></i></div>`;
function setTheme(t) { document.documentElement.dataset.theme = t; try { localStorage.setItem("pl.theme", t); } catch (e) {}
  const mc = document.querySelector('meta[name="theme-color"]'); if (mc) mc.setAttribute("content", t === "dark" ? "#1d1c1a" : "#e3350d"); go(); }
const curTheme = () => document.documentElement.dataset.theme === "dark" ? "dark" : "light";
const ShinyTag = ({ m }) => m && m.shiny ? html` <span class="shiny-tag" title="Shiny">✦</span>` : null;

const IC = {
  home: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>`,
  plan: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/></svg>`,
  lift: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 7v10M3.5 9.5v5M18 7v10M20.5 9.5v5M6 12h12"/></svg>`,
  team: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M17 14.5c2.3 0 4 1.4 4.5 4"/></svg>`,
  gym: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 13v4M8.5 20.5h7M10 17h4"/></svg>`,
  gear: html`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>`,
  check: html`<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>`,
  more: html`<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>`,
};

function Sheet({ title, children }) {
  return html`<div class="grab"></div>${title ? html`<h3>${title}</h3>` : null}${children}`;
}
function Confirm({ title, body, yes = "Confirm", no = "Cancel", danger, onYes }) {
  return html`<${Sheet} title=${title}><p class="muted" style="margin-top:0">${body}</p>
    <div class="stack"><button class=${"btn wide " + (danger ? "pri" : "pri")} onClick=${() => { closeSheet(); onYes(); }}>${yes}</button>
    <button class="btn wide" onClick=${closeSheet}>${no}</button></div><//>`;
}
function Menu({ title, items }) {
  return html`<${Sheet} title=${title}><div class="list">${items.filter(Boolean).map(([label, fn, cls]) =>
    html`<button class=${"li " + (cls || "")} onClick=${() => { closeSheet(); fn(); }}>${label}</button>`)}</div>
    <button class="btn wide" style="margin-top:10px" onClick=${closeSheet}>Cancel</button><//>`;
}

/* ---------------- Home ---------------- */
function Home() {
  const g = G_(); const a = monOf(g.active);
  const today = S.core.sched[dk()] || [];
  const sessToday = S.sessions.filter(s => dk(new Date(s.end)) === dk());
  const gi = currentGym(); const gym = PL.GYMS[gi]; const allBadges = g.badges.g7;
  let nextOpp = 0; while (nextOpp < 3 && oppUnlocked(gi, nextOpp + 1)) nextOpp++;
  return html`<div class="wrap">
    <div class="top"><span class="lens" aria-hidden="true"></span><div class="grow"><div class="sub">${fmtDate(Date.now(), { weekday: "long", month: "long", day: "numeric" })}</div><h1>PokéLift</h1></div>
      <span class="leds" aria-hidden="true"><i style="background:#ff5a4e"></i><i style="background:#ffd23f"></i><i style="background:#4cd07d"></i></span>
      <button aria-label="Settings" class="btn sm" onClick=${() => openSheet(Settings)}>${IC.gear}</button></div>
    ${a && html`<button class="card hero" onClick=${() => openSheet(MonSheet, { uid: a.uid })}>
      <div class="stage"><${Sprite} sp=${a.sp} size=${146} shiny=${a.shiny} /></div>
      <div style="min-width:0"><div class="tag">Active · full XP</div>
        <div class="nm">${monName(a)}<${ShinyTag} m=${a} /></div>
        <div class="row" style="gap:6px;flex-wrap:wrap"><span class="lvtag">Lv${a.lv}</span>${PL.mon(a.sp).t.map(t => html`<${TypePill} t=${t} />`)}</div>
        <div class="expl"><b>EXP</b><${Bar} pct=${PL.xpProgress(a).pct} /></div>
        <div class="tiny muted num" style="margin-top:5px">${a.lv >= 100 ? "Max level" : PL.xpProgress(a).toNext.toLocaleString() + " XP to Lv " + (a.lv + 1)}</div></div></button>
      <${PartyRow} g=${g} />`}
    <h2 class="sec">Today</h2>
    <div class="stack">
      ${today.map(e => { const t = tpl(e.tpl); const done = S.sessions.some(s => s.sched === e.id);
        return html`<div class="card row"><div class="grow"><div class="b" style="font-size:17px">${t ? t.name : "Deleted workout"}</div>
          <div class="small muted">${t ? t.items.length + " exercises" : ""}${done ? html` · <span class="pill-ok">Done</span>` : e.skip ? " · Skipped" : ""}</div></div>
          ${!done && t && html`<button class="btn pri" onClick=${() => startWorkout(t.id, e.id)}>Start</button>`}</div>`; })}
      ${!today.length && html`<div class="card"><div class="muted small" style="margin-bottom:10px">${sessToday.length ? "Nothing else scheduled. Start another workout:" : "Nothing scheduled today. Start a workout:"}</div>
        <div class="row" style="flex-wrap:wrap;gap:8px">${S.core.templates.map(t => html`<button class="btn sm" onClick=${() => startWorkout(t.id)}>${t.name}</button>`)}
        <button class="btn sm" onClick=${() => startWorkout(null)}>Empty workout</button></div></div>`}
      ${sessToday.map(s => html`<button class="card row" style="width:100%;text-align:left" onClick=${() => openSheet(SessionDetail, { id: s.id })}>
        <div class="grow"><div class="b">${s.name} <span class="pill-ok small">· Done</span></div><div class="small muted num">${fmtVol(s.vol)} lb · +${fmtLv(s.vol / (s.lbPerLevel || S.core.settings.lbPerLevel))}</div></div><span class="chev">›</span></button>`)}
    </div>
    <h2 class="sec">Progress</h2>
    <div class="stack">
      <${StepsCard} />
      <button class="card row" style="width:100%;text-align:left" onClick=${() => { U.tab = "gyms"; go(); openSheet(GymSheet, { i: gi }); }}>
        <span class="badge" style=${`background:${TYPE_COL[gym.type]}`}>${gym.badge.slice(0, 2)}</span>
        <div class="grow"><div class="b">${allBadges ? "All 8 badges earned" : gym.name}</div><div class="small muted">${allBadges ? "Rematch any gym anytime" : `Next: ${gym.ladder[nextOpp].cls} · ${PL.TIER[gym.ladder[nextOpp].tier].label}`}</div></div><span class="chev">›</span></button>
      ${g.bank > 0 && html`<button class="card row" style="width:100%;text-align:left" onClick=${() => { U.tab = "team"; U.teamSeg = "party"; go(); }}><div class="grow"><div class="b">XP Bank</div><div class="small muted num">${fmtLv(g.bank)} ready to give to any Pokémon</div></div><span class="chev">›</span></button>`}
    </div>
  </div>`;
}

function PartyRow({ g }) {
  const rest = g.party.filter(u => u !== g.active).map(monOf).filter(Boolean);
  const slots = Array.from({ length: 5 }, (_, i) => rest[i] || null);
  return html`<div class="party5">${slots.map(m => m
    ? html`<button class="pslot" aria-label=${`${monName(m)}, level ${m.lv}`} onClick=${() => openSheet(MonSheet, { uid: m.uid })}>
        <${Sprite} sp=${m.sp} size=${52} shiny=${m.shiny} /><span class="lv">Lv${m.lv}</span><${Bar} pct=${PL.xpProgress(m).pct} /></button>`
    : html`<button class="pslot empty" aria-label="Empty party slot" onClick=${() => { U.tab = "team"; U.teamSeg = "box"; go(); }}><i></i></button>`)}</div>`;
}

/* ---------------- Plan (calendar) ---------------- */
function Plan() {
  const [mode, setMode] = useState("week");
  const [anchor, setAnchor] = useState(dk());
  const sel = U.sel;
  const a = pk(anchor);
  let days;
  if (mode === "week") { const start = addDays(a, -((a.getDay() + 6) % 7)); days = Array.from({ length: 7 }, (_, i) => addDays(start, i)); }
  else { const first = new Date(a.getFullYear(), a.getMonth(), 1); const start = addDays(first, -((first.getDay() + 6) % 7)); days = Array.from({ length: 42 }, (_, i) => addDays(start, i)); }
  const shift = n => setAnchor(dk(mode === "week" ? addDays(a, 7 * n) : new Date(a.getFullYear(), a.getMonth() + n, 1)));
  const clip = U.clip;
  const tapDay = d => {
    const k = dk(d);
    if (clip) { mutate(() => { const list = S.core.sched[k] = S.core.sched[k] || [];
        if (clip.kind === "move") { const src = S.core.sched[clip.from] || []; const i = src.findIndex(e => e.id === clip.entry.id); if (i >= 0) src.splice(i, 1); if (!src.length) delete S.core.sched[clip.from]; list.push(clip.entry); U.clip = null; toast("Moved"); }
        else for (const t of clip.tpls) list.push({ id: PL.uid(), tpl: t }); });
      if (clip.kind !== "move") toast("Pasted to " + fmtDate(d)); U.sel = k; go(); return; }
    U.sel = k; go();
  };
  const entries = S.core.sched[sel] || [];
  const doneFor = e => S.sessions.some(s => s.sched === e.id);
  const sessOn = S.sessions.filter(s => dk(new Date(s.end)) === sel && !s.sched);
  return html`<div class="wrap">
    <div class="top"><h1>Plan</h1><div class="seg" style="width:150px"><button class=${mode === "week" ? "on" : ""} onClick=${() => setMode("week")}>Week</button><button class=${mode === "month" ? "on" : ""} onClick=${() => setMode("month")}>Month</button></div></div>
    ${clip && html`<div class="paste"><div class="grow">${clip.kind === "move" ? html`Tap a day to move <b>${tpl(clip.entry.tpl)?.name}</b>` : html`Tap days to paste <b>${clip.label}</b>`}</div><button class="btn sm" style="background:#fff;color:var(--blue)" onClick=${() => { U.clip = null; go(); }}>Done</button></div>`}
    <div class="row" style="margin-bottom:8px"><button class="btn sm" aria-label="Previous" onClick=${() => shift(-1)}>‹</button>
      <div class="grow center b">${mode === "week" ? `${fmtDate(days[0], { month: "short", day: "numeric" })} – ${fmtDate(days[6], { month: "short", day: "numeric" })}` : a.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</div>
      <button class="btn sm" onClick=${() => { setAnchor(dk()); U.sel = dk(); go(); }}>Today</button><button class="btn sm" aria-label="Next" onClick=${() => shift(1)}>›</button></div>
    <div class="wk" style="margin-bottom:4px">${["M","T","W","T","F","S","S"].map(x => html`<div class="center tiny faint b">${x}</div>`)}</div>
    <div class="wk">${days.map(d => { const k = dk(d); const es = S.core.sched[k] || []; const extra = S.sessions.filter(s => dk(new Date(s.end)) === k && !s.sched).length;
      return html`<button class=${`dc ${k === dk() ? "today" : ""} ${k === sel ? "sel" : ""} ${mode === "month" && d.getMonth() !== a.getMonth() ? "out" : ""}`} onClick=${() => tapDay(d)}>
        <span class="d num">${d.getDate()}</span><span class="dots">${es.map(e => html`<i class=${"dot " + (doneFor(e) ? "done" : e.skip ? "skip" : "")}></i>`)}${Array.from({ length: extra }, () => html`<i class="dot done"></i>`)}</span>
        ${mode === "week" && es[0] && html`<span class="tiny muted" style="max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 2px">${tpl(es[0].tpl)?.name || ""}</span>`}</button>`; })}</div>
    <h2 class="sec">${fmtDate(pk(sel), { weekday: "long", month: "long", day: "numeric" })}</h2>
    <div class="list">
      ${entries.map(e => { const t = tpl(e.tpl); const done = doneFor(e);
        return html`<div class="li"><div class="grow"><div class="b">${t ? t.name : "Deleted workout"}</div><div class="small muted">${done ? html`<span class="pill-ok">Done</span>` : e.skip ? "Skipped" : t ? t.items.length + " exercises" : ""}</div></div>
          ${!done && t && html`<button class="btn sm pri" onClick=${() => startWorkout(t.id, e.id)}>Start</button>`}
          <button class="btn sm" aria-label="More" onClick=${() => openSheet(Menu, { title: t?.name, items: [
            !done && ["Move to another day", () => { U.clip = { kind: "move", from: sel, entry: e }; go(); }],
            ["Copy to other days", () => { U.clip = { kind: "paste", tpls: [e.tpl], label: t?.name }; go(); }],
            ["Repeat weekly…", () => openSheet(RepeatSheet, { from: sel, tpls: [e.tpl] })],
            !done && [e.skip ? "Unmark skipped" : "Mark skipped", () => mutate(() => { e.skip = !e.skip; })],
            ["Remove from this day", () => mutate(() => { const l = S.core.sched[sel]; l.splice(l.indexOf(e), 1); if (!l.length) delete S.core.sched[sel]; }), "danger"],
          ] })}>${IC.more}</button></div>`; })}
      ${sessOn.map(s => html`<button class="li" onClick=${() => openSheet(SessionDetail, { id: s.id })}><div class="grow"><div class="b">${s.name}</div><div class="small pill-ok">Done · unscheduled</div></div><span class="chev">›</span></button>`)}
      ${!entries.length && !sessOn.length && html`<div class="empty small">No workouts on this day.</div>`}
    </div>
    <div class="row" style="margin-top:10px;flex-wrap:wrap;gap:8px">
      <button class="btn sm" onClick=${() => openSheet(Menu, { title: "Add to " + fmtDate(pk(sel)), items: S.core.templates.map(t => [t.name, () => mutate(() => { (S.core.sched[sel] = S.core.sched[sel] || []).push({ id: PL.uid(), tpl: t.id }); })]) })}>+ Add workout</button>
      ${entries.length > 0 && html`<button class="btn sm" onClick=${() => { U.clip = { kind: "paste", tpls: entries.map(e => e.tpl), label: "this day" }; go(); }}>Copy day</button>
        <button class="btn sm" onClick=${() => openSheet(RepeatSheet, { from: sel, tpls: entries.map(e => e.tpl) })}>Repeat weekly</button>`}
    </div>
  </div>`;
}
function RepeatSheet({ from, tpls }) {
  const [n, setN] = useState("4");
  return html`<${Sheet} title="Repeat weekly"><p class="muted small" style="margin-top:0">Adds ${tpls.map(t => tpl(t)?.name).join(" + ")} to every ${pk(from).toLocaleDateString(undefined, { weekday: "long" })} after this one.</p>
    <label class="l" for="rep-n">Number of weeks</label><input id="rep-n" class="f" type="number" inputmode="numeric" min="1" max="52" value=${n} onInput=${e => setN(e.target.value)} />
    <button class="btn pri wide" style="margin-top:14px" onClick=${() => { const k = Math.max(1, Math.min(52, parseInt(n) || 0)); mutate(() => { for (let i = 1; i <= k; i++) { const d = dk(addDays(pk(from), 7 * i)); const l = S.core.sched[d] = S.core.sched[d] || []; for (const t of tpls) l.push({ id: PL.uid(), tpl: t }); } }); closeSheet(); toast(`Added to the next ${k} weeks`); }}>Repeat</button><//>`;
}

/* ---------------- Workouts tab ---------------- */
function Lifts() {
  const seg = U.liftSeg || "tpl"; const setSeg = s => { U.liftSeg = s; go(); };
  return html`<div class="wrap">
    <div class="top"><h1>Workouts</h1></div>
    <div class="seg" style="margin-bottom:14px">${[["tpl","Templates"],["ex","Exercises"],["log","History"]].map(([k, l]) => html`<button class=${seg === k ? "on" : ""} onClick=${() => setSeg(k)}>${l}</button>`)}</div>
    ${seg === "tpl" ? html`<${TemplateList} />` : seg === "ex" ? html`<${ExerciseList} />` : html`<${SessionList} />`}
  </div>`;
}
function TemplateList() {
  return html`<div class="stack">
    ${S.core.templates.map(t => html`<div class="card">
      <div class="row"><div class="grow"><div class="b" style="font-size:18px">${t.name}</div><div class="small muted">${t.items.map(i => ex(i.ex).name).join(", ") || "No exercises yet"}</div></div></div>
      <div class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap"><button class="btn sm pri" onClick=${() => startWorkout(t.id)}>Start</button>
        <button class="btn sm" onClick=${() => openSheet(TemplateEditor, { id: t.id })}>Edit</button>
        <button class="btn sm" onClick=${() => { U.clip = { kind: "paste", tpls: [t.id], label: t.name }; U.tab = "plan"; go(); }}>Copy to calendar</button>
        <button class="btn sm" aria-label="More" onClick=${() => openSheet(Menu, { title: t.name, items: [
          ["Duplicate", () => mutate(() => { S.core.templates.push({ ...JSON.parse(JSON.stringify(t)), id: PL.uid(), name: t.name + " copy" }); })],
          ["Delete template", () => openSheet(Confirm, { title: `Delete ${t.name}?`, body: "Past workouts stay in your history. Scheduled days using it will show as deleted.", yes: "Delete", onYes: () => mutate(() => { S.core.templates = S.core.templates.filter(x => x.id !== t.id); }) }), "danger"],
        ] })}>${IC.more}</button></div></div>`)}
    <button class="btn wide" onClick=${() => { const t = { id: PL.uid(), name: "New workout", items: [] }; mutate(() => S.core.templates.push(t)); openSheet(TemplateEditor, { id: t.id, isNew: true }); }}>+ New template</button>
  </div>`;
}
function TemplateEditor({ id }) {
  const t = tpl(id); if (!t) return null;
  const upd = fn => mutate(fn);
  const mv = (i, d) => upd(() => { const j = i + d; if (j < 0 || j >= t.items.length) return; [t.items[i], t.items[j]] = [t.items[j], t.items[i]]; });
  return html`<${Sheet}>
    <label class="l" for="tpl-name" style="margin-top:0">Template name</label>
    <input id="tpl-name" class="f" value=${t.name} onChange=${e => upd(() => { t.name = e.target.value.trim() || t.name; })} />
    <h2 class="sec">Exercises</h2>
    <div class="list">${t.items.map((it, i) => html`<div class="li" style="gap:8px">
      <div class="grow"><div class="b">${ex(it.ex).name}</div>
        <div class="row small" style="gap:6px;margin-top:6px"><input aria-label="Target sets" class="f num" style="width:58px;height:34px;text-align:center" inputmode="numeric" value=${it.sets ?? ""} placeholder="sets" onChange=${e => upd(() => { it.sets = parseInt(e.target.value) || null; })} /><span class="muted">×</span>
        <input aria-label="Target reps" class="f num" style="width:58px;height:34px;text-align:center" inputmode="numeric" value=${it.reps ?? ""} placeholder="reps" onChange=${e => upd(() => { it.reps = parseInt(e.target.value) || null; })} />
        <input aria-label="Note" class="f" style="height:34px" value=${it.note || ""} placeholder="Note" onChange=${e => upd(() => { it.note = e.target.value; })} /></div></div>
      <div class="stack" style="gap:2px"><button class="btn sm" aria-label="Move up" style="height:26px;padding:0 9px" onClick=${() => mv(i, -1)}>↑</button><button class="btn sm" aria-label="Move down" style="height:26px;padding:0 9px" onClick=${() => mv(i, 1)}>↓</button></div>
      <button class="btn sm danger" aria-label="Remove" onClick=${() => upd(() => t.items.splice(i, 1))}>✕</button></div>`)}
      ${!t.items.length && html`<div class="empty small">Add the exercises for this workout.</div>`}</div>
    <button class="btn wide" style="margin-top:10px" onClick=${() => openSheet(ExercisePicker, { onPick: exId => upd(() => t.items.push({ ex: exId, sets: 3, reps: 10 })) })}>+ Add exercise</button>
    <button class="btn pri wide" style="margin-top:10px" onClick=${closeSheet}>Done</button><//>`;
}
function ExercisePicker({ onPick, title = "Add exercise" }) {
  const [q, setQ] = useState(""); const [creating, setCreating] = useState(false); const [mg, setMg] = useState("All");
  const all = Object.values(S.core.exercises).sort((a, b) => a.name.localeCompare(b.name));
  const ORDER = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Forearms", "Legs", "Glutes", "Calves", "Core", "Full body", "Cardio"];
  const groups = [...new Set(all.map(e => e.muscle || "Other"))].sort((a, b) => ((ORDER.indexOf(a) + 1) || 99) - ((ORDER.indexOf(b) + 1) || 99) || a.localeCompare(b));
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const list = all.filter(e => (mg === "All" || (e.muscle || "Other") === mg) && words.every(w => (e.name + " " + (e.muscle || "")).toLowerCase().includes(w)));
  if (creating) return html`<${NewExercise} name=${q} onDone=${id => { closeSheet(); onPick(id); }} />`;
  return html`<${Sheet} title=${title}>
    <input class="f" placeholder=${`Search ${all.length} exercises`} value=${q} onInput=${e => setQ(e.target.value)} aria-label="Search exercises" />
    <div class="mg-row" role="group" aria-label="Filter by muscle group">${["All", ...groups].map(g => html`<button class=${"chip" + (mg === g ? " on" : "")} aria-pressed=${mg === g} onClick=${() => setMg(g)}>${g}</button>`)}</div>
    <div class="list" style="margin-top:10px;max-height:50vh;overflow-y:auto">${list.map(e => html`<button class="li" onClick=${() => { closeSheet(); onPick(e.id); }}><div class="grow"><div class="b">${e.name}</div><div class="tiny muted">${e.muscle || ""}${e.kind === "bw" ? ` · bodyweight ${Math.round(e.mod * 100)}%` : e.kind === "time" ? " · timed" : e.kind === "distance" ? " · distance" : ""}</div></div></button>`)}
      ${!list.length && html`<div class="empty small">No match${q ? ` for “${q}”` : ""}${mg !== "All" ? ` in ${mg}` : ""}.</div>`}</div>
    <button class="btn wide" style="margin-top:10px" onClick=${() => setCreating(true)}>+ Create ${q ? `“${q}”` : "new exercise"}</button><//>`;
}
function NewExercise({ name = "", onDone, id }) {
  const e0 = id ? S.core.exercises[id] : null;
  const [f, setF] = useState(e0 ? { ...e0, mod: Math.round((e0.mod || 0) * 100) } : { name, kind: "weight", muscle: "", mod: 100 });
  const set = (k, v) => setF({ ...f, [k]: v });
  const save = () => { const nm = f.name.trim(); if (!nm) return;
    const nid = id || (S.core.exercises[slug(nm)] ? slug(nm) + "-" + PL.uid().slice(0, 4) : slug(nm));
    mutate(() => { S.core.exercises[nid] = { id: nid, name: nm, kind: f.kind, muscle: f.muscle, mod: f.kind === "bw" ? (parseFloat(f.mod) || 0) / 100 : 0, rest: e0?.rest ?? null }; });
    onDone && onDone(nid); };
  return html`<${Sheet} title=${id ? "Edit exercise" : "New exercise"}>
    <label class="l" for="nx-name">Name</label><input id="nx-name" class="f" value=${f.name} onInput=${e => set("name", e.target.value)} />
    <label class="l" for="nx-kind">Logged as</label><select id="nx-kind" class="f" value=${f.kind} onChange=${e => set("kind", e.target.value)}>
      <option value="weight">Weight × reps</option><option value="bw">Bodyweight reps (+ added weight)</option><option value="time">Time</option><option value="distance">Distance</option></select>
    ${f.kind === "bw" && html`<label class="l" for="nx-mod">Bodyweight counted per rep (%)</label><input id="nx-mod" class="f" inputmode="numeric" value=${f.mod} onInput=${e => set("mod", e.target.value)} />`}
    ${(f.kind === "time" || f.kind === "distance") && html`<p class="tiny muted">Timed and distance exercises are tracked but earn no XP in this version.</p>`}
    <label class="l" for="nx-mus">Muscle group</label><input id="nx-mus" class="f" value=${f.muscle} placeholder="Chest" onInput=${e => set("muscle", e.target.value)} />
    <button class="btn pri wide" style="margin-top:14px" disabled=${!f.name.trim()} onClick=${() => { save(); if (id) closeSheet(); }}>Save</button><//>`;
}
function ExerciseList() {
  const [q, setQ] = useState("");
  const h = history();
  const all = Object.values(S.core.exercises).filter(e => e.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => ((h[b.id]?.[0]?.date) || 0) - ((h[a.id]?.[0]?.date) || 0) || a.name.localeCompare(b.name));
  return html`<input class="f" placeholder="Search exercises" aria-label="Search exercises" value=${q} onInput=${e => setQ(e.target.value)} />
    <div class="list" style="margin-top:10px">${all.map(e => { const l = h[e.id]?.[0];
      return html`<button class="li" onClick=${() => openSheet(ExerciseHistory, { id: e.id })}><div class="grow"><div class="b">${e.name}</div><div class="tiny muted">${l ? "Last: " + fmtDate(l.date) + " · " + setStr(e, l.sets[0] || l.all[0]) : e.muscle || ""}</div></div><span class="chev">›</span></button>`; })}</div>
    <button class="btn wide" style="margin-top:10px" onClick=${() => openSheet(NewExercise, { name: q, onDone: () => closeSheet() })}>+ New exercise</button>`;
}
function setStr(e, s) {
  if (!s) return "";
  if (e.kind === "time") return `${s.r || 0}s`;
  if (e.kind === "distance") return `${s.r || 0} mi`;
  if (e.kind === "bw") return (+s.w ? `+${s.w}` : "BW") + ` × ${s.r}`;
  return `${s.w || 0} × ${s.r}`;
}
function ExerciseHistory({ id }) {
  const e = ex(id); const rows = history()[id] || [];
  const load = (s, bw) => PL.setLoad(e, s, bw);
  const pts = [...rows].reverse().map(r => ({ d: r.date, v: Math.max(0, ...r.sets.map(s => PL.e1rm(load(s, r.bw), +s.r || 0))) })).filter(p => p.v > 0);
  let best = null; for (const r of rows) for (const s of r.sets) { const v = PL.e1rm(load(s, r.bw), +s.r || 0); if (!best || v > best.v) best = { v, s, d: r.date }; }
  const isLoad = e.kind === "weight" || e.kind === "bw";
  return html`<${Sheet} title=${e.name}>
    <div class="row" style="gap:8px;margin-top:-6px;margin-bottom:12px"><span class="chip">${e.muscle || "Exercise"}</span>${e.kind === "bw" && html`<span class="chip">Bodyweight ${Math.round(e.mod * 100)}%</span>`}
      <span class="grow"></span><button class="btn sm" onClick=${() => openSheet(NewExercise, { id })}>Edit</button></div>
    ${isLoad && best && html`<div class="stat-grid" style="grid-template-columns:1fr 1fr"><div class="tile"><div class="k">Best set</div><div class="v">${setStr(e, best.s)}</div><div class="tiny muted">${fmtDate(best.d)}</div></div>
      <div class="tile"><div class="k">Est. 1-rep max</div><div class="v">${Math.round(best.v)}<span class="small muted"> lb</span></div><div class="tiny muted">Epley formula</div></div></div>`}
    ${isLoad && pts.length > 0 && html`<h2 class="sec">Strength progress</h2><${E1RMChart} pts=${pts} />`}
    <h2 class="sec">History</h2>
    ${rows.length ? html`<div class="list">${rows.map(r => html`<div class="li" style="align-items:flex-start"><div class="small b" style="width:84px;flex:none">${fmtDate(r.date, { month: "short", day: "numeric" })}</div>
      <div class="grow small num">${r.all.map(s => html`<span class="chip" style=${"margin:0 4px 4px 0;" + (s.warm ? "opacity:.6" : "")}>${s.warm ? "W " : ""}${setStr(e, s)}</span>`)}</div></div>`)}</div>`
      : html`<div class="card empty small">No sets logged yet.</div>`}<//>`;
}
/* Estimated 1RM chart: last 3 months + 3-month projection, or all time. Swipe or toggle to switch. */
const DAY = 864e5;
function niceStep(span, n) { const raw = span / n, m = Math.pow(10, Math.floor(Math.log10(raw))); for (const k of [1, 2, 2.5, 5, 10]) if (k * m >= raw) return k * m; return 10 * m; }
function fitTrend(pts) { // least squares on lb vs day; returns {a, b} with value = a + b*day
  const n = pts.length, xs = pts.map(p => p.d / DAY), mx = xs.reduce((a, b) => a + b, 0) / n, my = pts.reduce((a, p) => a + p.v, 0) / n;
  let sxx = 0, sxy = 0; xs.forEach((x, i) => { sxx += (x - mx) ** 2; sxy += (x - mx) * (pts[i].v - my); });
  const b = sxx ? sxy / sxx : 0; return { a: my - b * mx, b };
}
function E1RMChart({ pts }) {
  const [range, setRange] = useState("3m"); const [hi, setHi] = useState(null); const sw = useRef(null);
  const now = Date.now(), last = pts[pts.length - 1];
  // projection from the last ~3 months of sessions (needs 3+ sessions over 2+ weeks); weekly change capped at ±2% of the current estimate
  const recent = pts.filter(p => p.d >= now - 90 * DAY);
  let proj = null;
  if (recent.length >= 3 && recent[recent.length - 1].d - recent[0].d >= 14 * DAY) {
    const f = fitTrend(recent), cap = last.v * .02 / 7, b = Math.max(-cap, Math.min(cap, f.b));
    const v0 = f.a + f.b * (now / DAY); proj = { d0: now, v0, d1: now + 90 * DAY, v1: v0 + b * 90, perWk: b * 7 };
  }
  const show = range === "3m" ? (recent.length ? recent : [last]) : pts;
  const x0 = range === "3m" ? now - 90 * DAY : Math.min(pts[0].d, now - 30 * DAY);
  const x1 = range === "3m" ? (proj ? proj.d1 : now + 14 * DAY) : now + 7 * DAY;
  const vals = show.map(p => p.v).concat(range === "3m" && proj ? [proj.v0, proj.v1] : []);
  let lo = Math.min(...vals), up = Math.max(...vals); const pad = Math.max(5, (up - lo) * .12); lo -= pad; up += pad;
  const ys = niceStep(up - lo, 4); lo = Math.floor(lo / ys) * ys; up = Math.ceil(up / ys) * ys;
  const W = 340, H = 232, L = 46, R = 12, T = 14, B = 44;
  const X = d => L + (d - x0) / (x1 - x0) * (W - L - R), Y = v => T + (1 - (v - lo) / (up - lo)) * (H - T - B);
  const yt = []; for (let v = lo; v <= up + 1e-6; v += ys) yt.push(v);
  // month ticks, thinned so labels never collide
  const span = (x1 - x0) / (30 * DAY), every = span <= 7 ? 1 : span <= 14 ? 2 : span <= 24 ? 3 : 6;
  const xt = []; const dd = new Date(x0); dd.setDate(1); dd.setHours(0, 0, 0, 0); dd.setMonth(dd.getMonth() + 1);
  const multiYear = new Date(x0).getFullYear() !== new Date(x1).getFullYear();
  for (; dd.getTime() <= x1; dd.setMonth(dd.getMonth() + every)) xt.push(dd.getTime());
  const mlab = t => { const d = new Date(t); const m = d.toLocaleDateString(undefined, { month: "short" }); return multiYear && (d.getMonth() === 0 || t === xt[0]) ? `${m} ’${String(d.getFullYear()).slice(2)}` : m; };
  const line = show.map((p, i) => (i ? "L" : "M") + X(p.d).toFixed(1) + " " + Y(p.v).toFixed(1)).join("");
  const first = show[0]; const gain = last.v - first.v;
  const pick = ev => { const r = ev.currentTarget.getBoundingClientRect(); const px = (ev.clientX - r.left) / r.width * W;
    let best = null, bd = 1e9; show.forEach(p => { const d = Math.abs(X(p.d) - px); if (d < bd) { bd = d; best = p; } }); setHi(bd < 30 ? best : null); };
  const tStart = e => { sw.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const tEnd = e => { const s0 = sw.current; sw.current = null; if (!s0) return; const dx = e.changedTouches[0].clientX - s0.x, dy = e.changedTouches[0].clientY - s0.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { setHi(null); setRange(dx < 0 ? "all" : "3m"); } };
  const fd = (t, o = { month: "short", day: "numeric" }) => fmtDate(t, o);
  const tip = hi && (() => { const tx = Math.min(Math.max(X(hi.d), L + 58), W - R - 58), ty = Y(hi.v) - 14 < T + 30 ? Y(hi.v) + 14 : Y(hi.v) - 44;
    return html`<g pointer-events="none"><line x1=${X(hi.d)} x2=${X(hi.d)} y1=${T} y2=${H - B} stroke="var(--fg3)" stroke-width="1"/>
      <rect x=${tx - 56} y=${ty} width="112" height="34" rx="7" fill="var(--fg)"/><text x=${tx} y=${ty + 14} text-anchor="middle" class="ct-tip b">${Math.round(hi.v)} lb</text>
      <text x=${tx} y=${ty + 27} text-anchor="middle" class="ct-tip">${fd(hi.d, { month: "short", day: "numeric", year: "numeric" })}</text></g>`; })();
  return html`<div class="card ct" style="padding:12px 10px 10px">
    <div class="row" style="gap:8px;padding:0 4px 8px"><div class="grow">
        <div class="ct-big num">${Math.round(last.v)}<span> lb</span></div>
        <div class="tiny muted num">${range === "3m" ? (show.length > 1 ? `${gain >= 0 ? "+" : "−"}${Math.abs(Math.round(gain))} lb since ${fd(first.d)}` : "Latest estimate") : `${gain >= 0 ? "+" : "−"}${Math.abs(Math.round(gain))} lb since ${fd(first.d, { month: "short", year: "numeric" })}`}</div></div>
      <div class="seg" style="width:150px" role="group" aria-label="Time range"><button class=${range === "3m" ? "on" : ""} onClick=${() => { setRange("3m"); setHi(null); }}>3 months</button><button class=${range === "all" ? "on" : ""} onClick=${() => { setRange("all"); setHi(null); }}>All time</button></div></div>
    <svg viewBox=${`0 0 ${W} ${H}`} width="100%" role="img" style="touch-action:pan-y;display:block" onPointerDown=${pick} onPointerMove=${e => e.buttons || e.pointerType === "mouse" ? pick(e) : null} onPointerLeave=${() => setHi(null)} onTouchStart=${tStart} onTouchEnd=${tEnd}
      aria-label=${`Estimated one-rep max, ${range === "3m" ? "last 3 months with 3-month projection" : "all time"}. Latest ${Math.round(last.v)} pounds.`}>
      ${yt.map(v => html`<line x1=${L} x2=${W - R} y1=${Y(v)} y2=${Y(v)} stroke="var(--line)" stroke-width="1"/><text x=${L - 6} y=${Y(v) + 4} text-anchor="end" class="ct-ax">${Math.round(v)}</text>`)}
      ${xt.map(t => html`<line x1=${X(t)} x2=${X(t)} y1=${H - B} y2=${H - B + 4} stroke="var(--fg3)"/><text x=${X(t)} y=${H - B + 16} text-anchor="middle" class="ct-ax">${mlab(t)}</text>`)}
      <line x1=${L} x2=${W - R} y1=${H - B} y2=${H - B} stroke="var(--fg3)" stroke-width="1"/>
      <text transform=${`translate(11 ${(T + H - B) / 2}) rotate(-90)`} text-anchor="middle" class="ct-at">Est. 1RM (lb)</text>
      <text x=${(L + W - R) / 2} y=${H - 6} text-anchor="middle" class="ct-at">Date</text>
      ${range === "3m" && proj && html`<rect x=${X(now)} y=${T} width=${X(proj.d1) - X(now)} height=${H - B - T} fill="var(--sunk)" opacity=".6"/>
        <text x=${(X(now) + X(proj.d1)) / 2} y=${T + 11} text-anchor="middle" class="ct-ax">Projected</text>`}
      <line x1=${X(now)} x2=${X(now)} y1=${T} y2=${H - B} stroke="var(--fg3)" stroke-width="1" stroke-dasharray="2 3"/>
      <text x=${X(now)} y=${H - B - 5} text-anchor=${range === "3m" ? "end" : "end"} dx="-4" class="ct-ax">Today</text>
      ${range === "3m" && proj && html`<path d=${`M${X(last.d)} ${Y(last.v)}L${X(proj.d1)} ${Y(proj.v1)}`} fill="none" stroke="var(--red)" stroke-width="2" stroke-dasharray="5 4" stroke-linecap="round"/>
        <circle cx=${X(proj.d1)} cy=${Y(proj.v1)} r="4" fill="var(--card)" stroke="var(--red)" stroke-width="2"/>
        <text x=${X(proj.d1) - 6} y=${Y(proj.v1) + (proj.v1 >= last.v ? -9 : 17)} text-anchor="end" class="ct-lab">~${Math.round(proj.v1)}</text>`}
      ${show.length > 1 && html`<path d=${line} fill="none" stroke="var(--red)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`}
      ${(show.length <= 16 ? show : [last]).map(p => html`<circle cx=${X(p.d)} cy=${Y(p.v)} r="3.5" fill="var(--red)"/>`)}
      ${hi && html`<circle cx=${X(hi.d)} cy=${Y(hi.v)} r="5.5" fill="var(--red)" stroke="var(--card)" stroke-width="2"/>`}
      ${tip}
    </svg>
    <div class="ct-key tiny muted"><span><i class="k-solid"></i>Each workout</span>${range === "3m" && proj && html`<span><i class="k-dash"></i>Projected at your pace</span>`}</div>
    <p class="tiny muted" style="margin:8px 4px 0">${range === "3m" ? (proj ? html`At your recent pace (${proj.perWk >= 0 ? "+" : "−"}${Math.abs(proj.perWk).toFixed(1)} lb/week) you'd reach about <b class="num" style="color:var(--fg)">${Math.round(proj.v1)} lb</b> by ${fd(proj.d1)}. ` : "Log this lift 3+ times over 2+ weeks to see a projection. ") : ""}Estimated 1RM is the most you could lift for one rep, worked out from your best set each workout. Swipe the chart or tap a point for details.</p>
  </div>`;
}
function SessionList() {
  const ss = [...S.sessions].sort((a, b) => b.end - a.end);
  if (!ss.length) return html`<div class="card empty">Finished workouts show up here.</div>`;
  return html`<div class="list">${ss.map(s => html`<button class="li" onClick=${() => openSheet(SessionDetail, { id: s.id })}>
    <div class="grow"><div class="b">${s.name}</div><div class="tiny muted num">${fmtDate(s.end)} · ${fmtDur(s.end - s.start)} · ${fmtVol(s.vol)} lb${s.prs ? ` · ${s.prs} PR${s.prs > 1 ? "s" : ""}` : ""}</div></div><span class="chev">›</span></button>`)}</div>`;
}
function SessionDetail({ id }) {
  const [draft, setDraft] = useState(null);
  const s = S.sessions.find(x => x.id === id); if (!s) return html`<${Sheet} title="Workout"><p class="muted">This workout was deleted.</p><//>`;
  if (draft) return html`<${SessionEditor} s=${s} draft=${draft} setDraft=${setDraft} />`;
  return html`<${Sheet} title=${s.name}>
    <div class="muted small" style="margin:-8px 0 12px">${fmtDate(s.end, { weekday: "long", month: "long", day: "numeric" })} · bodyweight ${s.bw} lb</div>
    <div class="stat-grid"><div class="tile"><div class="k">Time</div><div class="v">${fmtDur(s.end - s.start)}</div></div><div class="tile"><div class="k">Volume</div><div class="v">${fmtVol(s.vol)}</div></div><div class="tile"><div class="k">Levels</div><div class="v">+${(s.vol / (s.lbPerLevel || S.core.settings.lbPerLevel)).toFixed(2)}</div></div></div>
    <div class="stack" style="margin-top:12px">${s.items.map(it => { const e = ex(it.ex); return html`<div class="card"><div class="b" style="margin-bottom:6px">${e.name}</div>
      ${it.sets.map((x, i) => html`<div class="row small num" style="height:24px"><span class="faint" style="width:24px">${x.warm ? "W" : i + 1 - it.sets.slice(0, i).filter(y => y.warm).length}</span><span class="grow">${setStr(e, x)}</span>${x.pr && html`<span class="tiny b" style="color:var(--pr)">PR</span>`}</div>`)}</div>`; })}</div>
    <button class="btn wide" style="margin-top:14px" onClick=${() => setDraft({ name: s.name, bw: String(s.bw), items: JSON.parse(JSON.stringify(s.items)) })}>Edit workout</button>
    <button class="btn wide danger" style="margin-top:10px" onClick=${() => openSheet(Confirm, { title: "Delete this workout?", body: `It leaves your history and “last time” numbers, and the XP it gave is taken back from the Pokémon that earned it. Levels can drop; evolutions and learned moves stay.`, yes: "Delete", onYes: () => deleteWorkout(id) })}>Delete workout</button><//>`;
}
function SessionEditor({ s, draft, setDraft }) {
  const upd = fn => { fn(draft); setDraft({ ...draft }); };
  const exMap = {}; draft.items.forEach(it => { exMap[it.ex] = ex(it.ex); });
  const vol = PL.sessionVolume({ bw: +draft.bw || s.bw, items: draft.items.map(it => ({ ...it, sets: it.sets.filter(x => +x.r > 0).map(x => ({ ...x, done: true })) })) }, exMap);
  const LPL = s.lbPerLevel || S.core.settings.lbPerLevel; const d = vol - s.vol;
  return html`<${Sheet} title="Edit workout">
    <label class="l" for="ed-name" style="margin-top:0">Name</label><input id="ed-name" class="f" value=${draft.name} onInput=${e => upd(x => { x.name = e.target.value; })} />
    <label class="l" for="ed-bw">Bodyweight that day (lb)</label><input id="ed-bw" class="f num" inputmode="decimal" value=${draft.bw} onInput=${e => upd(x => { x.bw = e.target.value.replace(/[^0-9.]/g, ""); })} />
    <div class="stack" style="margin-top:12px">${draft.items.map((it, k) => { const e = ex(it.ex); const hasW = e.kind === "weight" || e.kind === "bw";
      return html`<div class="card"><div class="row" style="margin-bottom:6px"><span class="b grow">${e.name}</span><button class="btn sm danger" onClick=${() => upd(x => x.items.splice(k, 1))}>Remove</button></div>
        ${it.sets.map((x, i) => html`<div class="row" style="gap:6px;margin-top:6px"><span class="small faint num" style="width:22px">${x.warm ? "W" : i + 1}</span>
          ${hasW ? html`<input class="cell" style="flex:1" inputmode="decimal" aria-label=${`${e.name} set ${i + 1} weight`} value=${x.w} onInput=${ev => upd(() => { x.w = ev.target.value.replace(/[^0-9.]/g, ""); })} />` : null}
          <input class="cell" style="flex:1" inputmode="decimal" aria-label=${`${e.name} set ${i + 1} ${e.kind === "time" ? "seconds" : e.kind === "distance" ? "miles" : "reps"}`} value=${x.r} onInput=${ev => upd(() => { x.r = ev.target.value.replace(/[^0-9.]/g, ""); })} />
          <button class="btn sm danger" aria-label="Delete set" onClick=${() => upd(() => it.sets.splice(i, 1))}>✕</button></div>`)}
        <button class="btn sm" style="margin-top:8px" onClick=${() => upd(() => { const p = it.sets[it.sets.length - 1]; it.sets.push({ w: p ? p.w : "", r: p ? p.r : "", warm: false, done: true }); })}>+ Set</button></div>`; })}</div>
    <div class="card small" style="margin-top:12px">New volume <b class="num">${fmtVol(vol)} lb</b> = <b class="num">${fmtLv(vol / LPL)}</b>${d ? html` <span style=${`color:${d > 0 ? "var(--ok)" : "var(--red)"}`} class="num">(${d > 0 ? "+" : "−"}${fmtVol(Math.abs(d))} lb)</span>` : ""}. Your Pokémon's XP adjusts to match.</div>
    <button class="btn pri wide" style="margin-top:12px" onClick=${() => saveEditedWorkout(s.id, draft)}>Save changes</button>
    <button class="btn wide" style="margin-top:8px" onClick=${() => setDraft(null)}>Cancel</button><//>`;
}

/* ---------------- Settings ---------------- */
function Settings() {
  const st = S.core.settings;
  const [bw, setBw] = useState(String(st.bw));
  const [csv, setCsv] = useState(null);
  const num = (k, v, f = parseFloat) => mutate(() => { const n = f(v); if (!isNaN(n) && n >= 0) st[k] = n; });
  const exportCsv = async () => {
    const rows = [["date","workout","exercise","set","warmup","weight_lb","reps","bodyweight_lb","pr"]];
    for (const s of [...S.sessions].sort((a, b) => a.end - b.end)) for (const it of s.items) it.sets.forEach((x, i) => rows.push([dk(new Date(s.end)), s.name, ex(it.ex).name, i + 1, x.warm ? 1 : 0, x.w ?? "", x.r ?? "", s.bw, x.pr ? 1 : 0]));
    const text = rows.map(r => r.map(v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v).join(",")).join("\n");
    try { const d = await window.claude?.use?.("downloads"); if (d) { await d.save({ filename: `pokelift-${dk()}.csv`, data: text }); return; } } catch (e) {}
    setCsv(text);
  };
  return html`<${Sheet} title="Settings">
    <label class="l" style="margin-top:0">Appearance</label>
    <div class="seg" role="group" aria-label="Appearance"><button class=${curTheme() === "light" ? "on" : ""} onClick=${() => setTheme("light")}>Light</button><button class=${curTheme() === "dark" ? "on" : ""} onClick=${() => setTheme("dark")}>Dark</button></div>
    <label class="l" for="set-bw">Bodyweight (lb)</label>
    <div class="row"><input id="set-bw" class="f num" inputmode="decimal" value=${bw} onInput=${e => setBw(e.target.value)} />
      <button class="btn" onClick=${() => { const n = parseFloat(bw); if (n > 0) { mutate(() => { st.bw = n; S.core.bwlog.push({ d: Date.now(), w: n }); }); toast("Bodyweight saved"); } }}>Save</button></div>
    <p class="tiny muted">Pull-ups count 100% of this per rep, push-ups 65%. Each workout uses the latest value.</p>
    <label class="l" for="set-lpl">Pounds lifted per level</label><input id="set-lpl" class="f num" inputmode="numeric" value=${st.lbPerLevel} onChange=${e => num("lbPerLevel", e.target.value, v => Math.max(1000, parseInt(String(v).replace(/\D/g, "")) || 20000))} />
    <p class="tiny muted">Every ${st.lbPerLevel.toLocaleString()} lb you lift is worth 1 level to your active Pokémon, at any level. A ${fmtVol(st.lbPerLevel * .75)} lb workout = ¾ of a level. Changing this only affects future workouts.</p>
    <label class="l" for="set-share">Party share (% of your pounds the rest of the party gets)</label><input id="set-share" class="f num" inputmode="numeric" value=${Math.round(st.share * 100)} onChange=${e => num("share", e.target.value, v => parseFloat(v) / 100)} />
    <label class="l" for="set-rest">Default rest timer (seconds)</label><input id="set-rest" class="f num" inputmode="numeric" value=${st.rest} onChange=${e => num("rest", e.target.value, v => parseInt(v))} />
    <button class="btn wide" style="margin-top:16px" onClick=${() => { closeAll(); U.prof = { pages: ["Back for a refresher? Excellent dedication! Here's how PokéLift works.", ...profRules()], i: 0 }; U.layer = "prof"; go(); }}>Replay ${PROF}'s tutorial</button>
    <h2 class="sec">Steps</h2>
    <button class="btn wide" onClick=${() => openSheet(WalkSheet)}>Steps and iPhone sync</button>
    <h2 class="sec">Data</h2>
    ${MODE === "cloud" && html`<div class="card row" style="margin-bottom:10px"><div class="grow"><div class="tiny muted">Signed in as</div><div class="b" style="word-break:break-all">${S.auth.email}</div></div>
      <button class="btn sm" onClick=${() => openSheet(Confirm, { title: "Sign out?", body: hasPending() ? "Some changes haven't synced yet. Signing out now could lose them. Reconnect to the internet first if you can." : "Your data stays in your account. Sign back in with the same email to see it.", yes: "Sign out", onYes: () => { closeAll(); U.tab = "home"; signOut(); } })}>Sign out</button></div>`}
    <div class="card small muted" style="margin-bottom:10px">${S.sync === "synced" ? (MODE === "cloud" ? "All changes saved to your account." : "Saved to your Claude account and this device.") : S.sync === "error" ? "Can't reach the server right now. Changes are saved on this device and will sync when you're back online." : MODE === "cloud" ? "Syncing…" : "Saved on this device."} ${S.sessions.length} workouts logged.</div>
    <button class="btn wide" onClick=${exportCsv}>Export workouts as CSV</button>
    ${csv && html`<textarea class="f" style="margin-top:10px;height:140px;font:12px var(--mono)" readonly value=${csv} onFocus=${e => e.target.select()}></textarea><p class="tiny muted">Select all and copy into Numbers, Sheets, or a file.</p>`}
    <button class="btn wide danger" style="margin-top:10px" onClick=${() => openSheet(Confirm, { title: "Erase everything?", body: "This deletes all workouts, templates, and Pokémon on every device. It can't be undone.", yes: "Erase all data", onYes: () => { const ids = S.sessions.map(s => s.id); ids.forEach(deleteSession); S.core = defaultCore(); S.active = null; saveActive(); saveCore(); closeAll(); U.tab = "home"; go(); } })}>Erase all data</button><//>`;
}
