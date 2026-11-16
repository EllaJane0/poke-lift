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
const SPR = (sp, back) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${back ? "back/" : ""}${sp}.png`;
function Sprite({ sp, size = 64, back = false }) {
  const [bad, setBad] = useState(!SPRITES_OK);
  const m = PL.mon(sp); const t = m.t;
  const bg = t.length > 1 ? `linear-gradient(135deg,${TYPE_COL[t[0]]} 50%,${TYPE_COL[t[1]]} 50%)` : TYPE_COL[t[0]];
  return html`<span class="spr" style=${`width:${size}px;height:${size}px`} title=${m.n}>
    ${bad ? html`<span class="fb" style=${`background:${bg};font-size:${Math.round(size * .3)}px`}>${m.n.replace(/[^A-Za-z]/g, "").slice(0, 2)}</span>`
          : html`<img src=${SPR(sp, back)} alt=${m.n} loading="lazy" onError=${() => { SPRITES_OK = false; setBad(true); }} />`}</span>`;
}
const TypePill = ({ t }) => html`<span class="tp" style=${`background:${TYPE_COL[t] || "#888"}`}>${t}</span>`;
const Bar = ({ pct, cls = "" }) => html`<div class=${"bar " + cls}><i style=${`width:${Math.max(0, Math.min(100, pct * 100))}%`}></i></div>`;
const Egg = ({ tier, size = 1 }) => html`<span class=${"egg " + tier} style=${`transform:scale(${size})`}></span>`;

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
  const egg = g.eggs.find(e => e.id === g.incub);
  const gi = currentGym(); const gym = PL.GYMS[gi]; const allBadges = g.badges.g7;
  let nextOpp = 0; while (nextOpp < 3 && oppUnlocked(gi, nextOpp + 1)) nextOpp++;
  return html`<div class="wrap">
    <div class="top"><div class="grow"><div class="sub">${fmtDate(Date.now(), { weekday: "long", month: "long", day: "numeric" })}</div><h1>PokéLift</h1></div>
      <button aria-label="Settings" class="btn sm" onClick=${() => openSheet(Settings)}>${IC.gear}</button></div>
    ${a && html`<button class="card row" style="width:100%;text-align:left;gap:14px" onClick=${() => openSheet(MonSheet, { uid: a.uid })}>
      <${Sprite} sp=${a.sp} size=${84} />
      <div class="grow"><div class="tiny faint b" style="text-transform:uppercase;letter-spacing:.06em">Active · gets full XP</div>
        <div class="row" style="gap:8px;margin:2px 0 6px"><span style="font-size:20px;font-weight:700">${monName(a)}</span><span class="muted num">Lv ${a.lv}</span></div>
        <${Bar} pct=${PL.xpProgress(a).pct} /><div class="tiny muted num" style="margin-top:4px">${a.lv >= 100 ? "Max level" : PL.xpProgress(a).toNext.toLocaleString() + " XP to Lv " + (a.lv + 1)}</div></div></button>`}
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
        <div class="grow"><div class="b">${s.name} <span class="pill-ok small">· Done</span></div><div class="small muted num">${fmtVol(s.vol)} lb · +${s.xp.toLocaleString()} XP</div></div><span class="chev">›</span></button>`)}
    </div>
    <h2 class="sec">Progress</h2>
    <div class="stack">
      <button class="card row" style="width:100%;text-align:left" onClick=${() => { U.tab = "team"; U.teamSeg = "eggs"; go(); }}>
        ${egg ? html`<${Egg} tier=${egg.tier} />` : html`<span class="egg" style="background:var(--sunk);border-style:dashed"></span>`}
        <div class="grow">${egg ? html`<div class="b">${PL.EGG[egg.tier].label}</div><${Bar} pct=${egg.steps / egg.need} /><div class="tiny muted num" style="margin-top:4px">${Math.max(0, egg.need - egg.steps).toLocaleString()} steps to hatch</div>`
          : html`<div class="b">Incubator empty</div><div class="small muted">${g.eggs.length ? `You have ${g.eggs.length} egg${g.eggs.length > 1 ? "s" : ""}. Steps only count while one is incubating.` : "Win battles to earn eggs."}</div>`}</div><span class="chev">›</span></button>
      <button class="card row" style="width:100%;text-align:left" onClick=${() => { U.tab = "gyms"; go(); openSheet(GymSheet, { i: gi }); }}>
        <span class="badge" style=${`background:${TYPE_COL[gym.type]}`}>${gym.badge.slice(0, 2)}</span>
        <div class="grow"><div class="b">${allBadges ? "All 8 badges earned" : gym.name}</div><div class="small muted">${allBadges ? "Rematch any gym anytime" : `Next: ${gym.ladder[nextOpp].cls} · ${PL.TIER[gym.ladder[nextOpp].tier].label}`}</div></div><span class="chev">›</span></button>
      ${g.bank > 0 && html`<button class="card row" style="width:100%;text-align:left" onClick=${() => { U.tab = "team"; U.teamSeg = "party"; go(); }}><div class="grow"><div class="b">XP Bank</div><div class="small muted num">${g.bank.toLocaleString()} XP ready to give to any Pokémon</div></div><span class="chev">›</span></button>`}
    </div>
  </div>`;
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
  const [q, setQ] = useState(""); const [creating, setCreating] = useState(false);
  const all = Object.values(S.core.exercises).sort((a, b) => a.name.localeCompare(b.name));
  const list = all.filter(e => e.name.toLowerCase().includes(q.toLowerCase()));
  if (creating) return html`<${NewExercise} name=${q} onDone=${id => { closeSheet(); onPick(id); }} />`;
  return html`<${Sheet} title=${title}>
    <input class="f" placeholder="Search exercises" value=${q} onInput=${e => setQ(e.target.value)} aria-label="Search exercises" />
    <div class="list" style="margin-top:10px;max-height:50vh;overflow-y:auto">${list.map(e => html`<button class="li" onClick=${() => { closeSheet(); onPick(e.id); }}><div class="grow"><div class="b">${e.name}</div><div class="tiny muted">${e.muscle || ""}${e.kind === "bw" ? ` · bodyweight ${Math.round(e.mod * 100)}%` : e.kind === "time" ? " · timed" : e.kind === "distance" ? " · distance" : ""}</div></div></button>`)}
      ${!list.length && html`<div class="empty small">No match for “${q}”.</div>`}</div>
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
  const W = 320, H = 120, P = 6;
  const mn = pts.length ? Math.min(...pts.map(p => p.v)) : 0, mx = pts.length ? Math.max(...pts.map(p => p.v)) : 1;
  const xy = (p, i) => [P + (pts.length > 1 ? i / (pts.length - 1) : .5) * (W - 2 * P), H - P - (mx === mn ? .5 : (p.v - mn) / (mx - mn)) * (H - 2 * P)];
  const path = pts.map((p, i) => (i ? "L" : "M") + xy(p, i).map(n => n.toFixed(1)).join(" ")).join("");
  const isLoad = e.kind === "weight" || e.kind === "bw";
  return html`<${Sheet} title=${e.name}>
    <div class="row" style="gap:8px;margin-top:-6px;margin-bottom:12px"><span class="chip">${e.muscle || "Exercise"}</span>${e.kind === "bw" && html`<span class="chip">Bodyweight ${Math.round(e.mod * 100)}%</span>`}
      <span class="grow"></span><button class="btn sm" onClick=${() => openSheet(NewExercise, { id })}>Edit</button></div>
    ${isLoad && best && html`<div class="stat-grid" style="grid-template-columns:1fr 1fr"><div class="tile"><div class="k">Best set</div><div class="v">${setStr(e, best.s)}</div><div class="tiny muted">${fmtDate(best.d)}</div></div>
      <div class="tile"><div class="k">Est. 1-rep max</div><div class="v">${Math.round(best.v)}<span class="small muted"> lb</span></div><div class="tiny muted">Epley formula</div></div></div>`}
    ${isLoad && pts.length > 1 && html`<h2 class="sec">Est. 1RM over time</h2><div class="card" style="padding:10px"><svg viewBox=${`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Estimated one-rep max trend">
      <path d=${path + `L${xy(pts[pts.length - 1], pts.length - 1)[0]} ${H}L${P} ${H}Z`} fill="var(--blue)" opacity=".1"/><path d=${path} fill="none" stroke="var(--blue)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      ${(() => { const [x, y] = xy(pts[pts.length - 1], pts.length - 1); return html`<circle cx=${x} cy=${y} r="4" fill="var(--blue)" stroke="var(--card)" stroke-width="2"/>`; })()}</svg>
      <div class="row tiny muted num"><span class="grow">${fmtDate(pts[0].d, { month: "short", day: "numeric" })} · ${Math.round(mn)} lb</span><span>${Math.round(mx)} lb</span></div></div>`}
    <h2 class="sec">History</h2>
    ${rows.length ? html`<div class="list">${rows.map(r => html`<div class="li" style="align-items:flex-start"><div class="small b" style="width:84px;flex:none">${fmtDate(r.date, { month: "short", day: "numeric" })}</div>
      <div class="grow small num">${r.all.map(s => html`<span class="chip" style=${"margin:0 4px 4px 0;" + (s.warm ? "opacity:.6" : "")}>${s.warm ? "W " : ""}${setStr(e, s)}</span>`)}</div></div>`)}</div>`
      : html`<div class="card empty small">No sets logged yet.</div>`}<//>`;
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
    <div class="stat-grid"><div class="tile"><div class="k">Time</div><div class="v">${fmtDur(s.end - s.start)}</div></div><div class="tile"><div class="k">Volume</div><div class="v">${fmtVol(s.vol)}</div></div><div class="tile"><div class="k">XP</div><div class="v">${s.xp.toLocaleString()}</div></div></div>
    <div class="stack" style="margin-top:12px">${s.items.map(it => { const e = ex(it.ex); return html`<div class="card"><div class="b" style="margin-bottom:6px">${e.name}</div>
      ${it.sets.map((x, i) => html`<div class="row small num" style="height:24px"><span class="faint" style="width:24px">${x.warm ? "W" : i + 1 - it.sets.slice(0, i).filter(y => y.warm).length}</span><span class="grow">${setStr(e, x)}</span>${x.pr && html`<span class="tiny b" style="color:var(--pr)">PR</span>`}</div>`)}</div>`; })}</div>
    <button class="btn wide" style="margin-top:14px" onClick=${() => setDraft({ name: s.name, bw: String(s.bw), items: JSON.parse(JSON.stringify(s.items)) })}>Edit workout</button>
    <button class="btn wide danger" style="margin-top:10px" onClick=${() => openSheet(Confirm, { title: "Delete this workout?", body: `It leaves your history and “last time” numbers, and its ${s.xp.toLocaleString()} XP is taken back from the Pokémon that earned it. Levels can drop; evolutions and learned moves stay.`, yes: "Delete", onYes: () => deleteWorkout(id) })}>Delete workout</button><//>`;
}
function SessionEditor({ s, draft, setDraft }) {
  const upd = fn => { fn(draft); setDraft({ ...draft }); };
  const exMap = {}; draft.items.forEach(it => { exMap[it.ex] = ex(it.ex); });
  const vol = PL.sessionVolume({ bw: +draft.bw || s.bw, items: draft.items.map(it => ({ ...it, sets: it.sets.filter(x => +x.r > 0).map(x => ({ ...x, done: true })) })) }, exMap);
  const newXP = Math.round(vol * (s.rate ?? S.core.settings.rate)); const d = newXP - s.xp;
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
    <div class="card small" style="margin-top:12px">New volume <b class="num">${fmtVol(vol)} lb</b> · XP <b class="num">${newXP.toLocaleString()}</b>${d ? html` <span style=${`color:${d > 0 ? "var(--ok)" : "var(--red)"}`} class="num">(${d > 0 ? "+" : "−"}${Math.abs(d).toLocaleString()})</span>` : ""}. Your Pokémon's XP adjusts to match.</div>
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
    <label class="l" for="set-bw" style="margin-top:0">Bodyweight (lb)</label>
    <div class="row"><input id="set-bw" class="f num" inputmode="decimal" value=${bw} onInput=${e => setBw(e.target.value)} />
      <button class="btn" onClick=${() => { const n = parseFloat(bw); if (n > 0) { mutate(() => { st.bw = n; S.core.bwlog.push({ d: Date.now(), w: n }); }); toast("Bodyweight saved"); } }}>Save</button></div>
    <p class="tiny muted">Pull-ups count 100% of this per rep, push-ups 65%. Each workout uses the latest value.</p>
    <label class="l" for="set-rate">XP per pound lifted</label><input id="set-rate" class="f num" inputmode="decimal" value=${st.rate} onChange=${e => num("rate", e.target.value)} />
    <label class="l" for="set-share">Party XP share (%)</label><input id="set-share" class="f num" inputmode="numeric" value=${Math.round(st.share * 100)} onChange=${e => num("share", e.target.value, v => parseFloat(v) / 100)} />
    <label class="l" for="set-rest">Default rest timer (seconds)</label><input id="set-rest" class="f num" inputmode="numeric" value=${st.rest} onChange=${e => num("rest", e.target.value, v => parseInt(v))} />
    <h2 class="sec">Steps to hatch</h2>
    <div class="row">${["common","uncommon","rare"].map(t => html`<div class="grow"><label class="l" for=${"es-" + t} style="margin-top:0;text-transform:capitalize">${t}</label><input id=${"es-" + t} class="f num" inputmode="numeric" value=${st.eggSteps[t]} onChange=${e => mutate(() => { const n = parseInt(e.target.value); if (n > 0) st.eggSteps[t] = n; })} /></div>`)}</div>
    <h2 class="sec">Data</h2>
    <div class="card small muted" style="margin-bottom:10px">${S.sync === "synced" ? "Saved to your Claude account and this device." : S.sync === "error" ? "Couldn't reach your account just now. Saved on this device; it will retry." : "Saved on this device."} ${S.sessions.length} workouts logged.</div>
    <button class="btn wide" onClick=${exportCsv}>Export workouts as CSV</button>
    ${csv && html`<textarea class="f" style="margin-top:10px;height:140px;font:12px var(--mono)" readonly value=${csv} onFocus=${e => e.target.select()}></textarea><p class="tiny muted">Select all and copy into Numbers, Sheets, or a file.</p>`}
    <button class="btn wide danger" style="margin-top:10px" onClick=${() => openSheet(Confirm, { title: "Erase everything?", body: "This deletes all workouts, templates, and Pokémon on every device. It can't be undone.", yes: "Erase all data", onYes: () => { const ids = S.sessions.map(s => s.id); ids.forEach(deleteSession); S.core = defaultCore(); S.active = null; saveActive(); saveCore(); closeAll(); U.tab = "home"; go(); } })}>Erase all data</button><//>`;
}
