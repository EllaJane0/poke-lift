/* ================= UI: team, walking, gyms, battle, shell ================= */
function Team() {
  const seg = U.teamSeg || "party"; const setSeg = s => { U.teamSeg = s; go(); };
  const g = G_();
  return html`<div class="wrap">
    <div class="top"><h1>Team</h1>${g.bank > 0 && html`<span class="chip num">Bank ${fmtLv(g.bank)}</span>`}</div>
    <div class="seg" style="margin-bottom:14px">${[["party","Party"],["box","Box"],["dex","Pokédex"]].map(([k, l]) => html`<button class=${seg === k ? "on" : ""} onClick=${() => setSeg(k)}>${l}</button>`)}</div>
    ${seg === "party" ? html`<${Party} />` : seg === "box" ? html`<${Box} />` : html`<${Dex} />`}
  </div>`;
}
function MonRow({ m, active }) {
  const p = PL.xpProgress(m);
  return html`<button class="li" onClick=${() => openSheet(MonSheet, { uid: m.uid })}><${Sprite} sp=${m.sp} size=${56} shiny=${m.shiny} />
    <div class="grow"><div class="row" style="gap:6px"><span class="b">${monName(m)}<${ShinyTag} m=${m} /></span>${active && html`<span class="tp" style="background:var(--red)">Active</span>`}<span class="grow"></span><span class="small muted num">Lv ${m.lv}</span></div>
    <div class="row" style="gap:4px;margin:4px 0 6px">${PL.mon(m.sp).t.map(t => html`<${TypePill} t=${t} />`)}</div><${Bar} pct=${p.pct} /></div></button>`;
}
function Party() {
  const g = G_(); const ms = partyMons();
  return html`<div class="list">${ms.map(m => html`<${MonRow} m=${m} active=${m.uid === g.active} />`)}
    ${Array.from({ length: 6 - ms.length }, () => html`<div class="li faint small" style="justify-content:center">Empty slot</div>`)}</div>
    <p class="small muted">Your active Pokémon gets 100% of workout XP. Everyone else in the party gets ${Math.round(S.core.settings.share * 100)}%. Only the party battles.</p>`;
}
function Box() {
  const g = G_(); const ms = Object.values(g.mons).filter(m => !g.party.includes(m.uid)).sort((a, b) => b.lv - a.lv);
  if (!ms.length) return html`<div class="card empty">Pokémon hatched while your party is full land here.</div>`;
  return html`<div class="list">${ms.map(m => html`<${MonRow} m=${m} />`)}</div>`;
}
function Dex() {
  const seen = new Set(G_().dex);
  return html`<div class="small muted" style="margin-bottom:10px">${seen.size} of 151 registered</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:6px">${Array.from({ length: 151 }, (_, i) => i + 1).map(n => html`<div class="card center" style="padding:6px 2px">
      ${seen.has(n) ? html`<${Sprite} sp=${n} size=${48} />` : html`<div style="height:48px;display:flex;align-items:center;justify-content:center" class="faint b">?</div>`}
      <div class="tiny ${seen.has(n) ? "" : "faint"}" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${seen.has(n) ? PL.mon(n).n : "#" + String(n).padStart(3, "0")}</div></div>`)}</div>`;
}
const STAT_L = ["HP", "Attack", "Defense", "Sp. Atk", "Sp. Def", "Speed"];
function MonSheet({ uid }) {
  const g = G_(); const m = monOf(uid); if (!m) return null;
  const sp = PL.mon(m.sp); const st = PL.calcStats(m.sp, m.lv, m.iv); const p = PL.xpProgress(m);
  const inParty = g.party.includes(uid); const idx = g.party.indexOf(uid);
  const evo = sp.e;
  return html`<${Sheet}>
    <div class="row" style="gap:14px"><${Sprite} sp=${m.sp} size=${110} shiny=${m.shiny} /><div class="grow">
      <div style="font-size:22px;font-weight:700">${monName(m)}<${ShinyTag} m=${m} /></div>${m.nick && html`<div class="small muted">${sp.n}</div>`}
      <div class="row" style="gap:4px;margin:6px 0">${sp.t.map(t => html`<${TypePill} t=${t} />`)}</div>
      <div class="small num">Lv ${m.lv} · ${PL.growthName[sp.g]}</div></div></div>
    <div style="margin-top:12px"><${Bar} pct=${p.pct} /><div class="tiny muted num" style="margin-top:4px">${m.xp.toLocaleString()} XP total${m.lv < 100 ? ` · ${p.toNext.toLocaleString()} to Lv ${m.lv + 1}` : ""}</div></div>
    ${evo.length > 0 && html`<div class="small muted" style="margin-top:8px">${evo.length > 1 ? `Evolves at Lv ${evo[0].lv} into your choice of ${evo.map(e => PL.mon(e.to).n).join(", ")}` : `Evolves at Lv ${evo[0].lv} into ${PL.mon(evo[0].to).n}`}${m.evoNo != null && m.lv >= evo[0].lv ? " · asks again next level-up" : ""}</div>`}
    <div class="row" style="flex-wrap:wrap;gap:8px;margin-top:14px">
      ${inParty && g.active !== uid && html`<button class="btn sm pri" onClick=${() => { mutate(() => { g.active = uid; }); toast(`${monName(m)} is now active`); }}>Make active</button>`}
      ${g.bank > 0 && m.lv < 100 && html`<button class="btn sm" onClick=${() => openSheet(GiveXP, { uid })}>Give bank levels</button>`}
      <button class="btn sm" onClick=${() => openSheet(RenameSheet, { value: m.nick || sp.n, onSave: v => mutate(() => { m.nick = v === sp.n ? "" : v; }) })}>Nickname</button>
      ${inParty && idx > 0 && html`<button class="btn sm" onClick=${() => mutate(() => { g.party.splice(idx, 1); g.party.splice(idx - 1, 0, uid); })}>Move up</button>`}
      ${inParty ? (g.party.length > 1 && html`<button class="btn sm" onClick=${() => { mutate(() => { g.party.splice(idx, 1); if (g.active === uid) g.active = g.party[0]; }); closeSheet(); toast("Moved to box"); }}>Send to box</button>`)
        : html`<button class="btn sm" disabled=${g.party.length >= 6} onClick=${() => { mutate(() => g.party.push(uid)); toast("Added to party"); }}>${g.party.length >= 6 ? "Party full" : "Add to party"}</button>`}
    </div>
    <h2 class="sec">Moves</h2>
    <div class="list">${m.moves.map(id => { const mv = PL.move(id); return html`<div class="li"><${TypePill} t=${mv.t} /><div class="grow b">${mv.n}</div><span class="tiny muted num">${mv.p ? "Pow " + mv.p : "Status"} · ${mv.a ? mv.a + "%" : "—"} · ${mv.pp} PP</span></div>`; })}</div>
    ${PL.relearnable(m).length > 0 && html`<button class="btn sm" style="margin-top:8px" onClick=${() => openSheet(Menu, { title: "Move Reminder", items: PL.relearnable(m).map(id => [`${PL.move(id).n} · ${PL.move(id).t}${PL.move(id).p ? " · " + PL.move(id).p : ""}`, () => { U.queue.unshift({ k: "learn", uid, move: id }); closeAll(); }]) })}>Move Reminder</button>`}
    <h2 class="sec">Stats</h2>
    <div class="list">${st.map((v, i) => html`<div class="li" style="min-height:40px;padding:8px 14px"><span class="grow small">${STAT_L[i]}</span><span class="tiny faint num" style="width:56px">IV ${m.iv[i]}</span><span class="b num" style="width:40px;text-align:right">${v}</span></div>`)}</div><//>`;
}
function GiveXP({ uid }) {
  const g = G_(); const m = monOf(uid); const p = PL.xpProgress(m);
  const toNext = Math.round((1 - p.pct) * 100) / 100;
  const [v, setV] = useState(String(Math.min(g.bank, toNext)));
  const give = () => { const n = Math.min(g.bank, Math.max(0, parseFloat(v) || 0)); if (!n) return;
    const r = PL.awardXP(m, PL.levelsToXP(m, n)); g.bank = Math.round((g.bank - n) * 100) / 100; g.bankLog.push({ d: Date.now(), amt: -n, why: "Gave to " + monName(m) });
    queueGrowth(m, r); saveCore(); closeAll(); toast(r.to > r.from ? `${monName(m)} grew to Lv ${r.to}!` : `+${r.gained.toLocaleString()} XP`); };
  return html`<${Sheet} title=${"Give levels to " + monName(m)}><div class="small muted" style="margin-top:-6px">Bank balance ${fmtLv(g.bank)}. This can't be undone.</div>
    <label class="l" for="gx">Levels to give</label><input id="gx" class="f num" inputmode="decimal" value=${v} onInput=${e => setV(e.target.value.replace(/[^0-9.]/g, ""))} />
    <div class="row" style="gap:8px;margin-top:8px"><button class="btn sm" onClick=${() => setV(String(Math.min(g.bank, toNext)))}>To Lv ${m.lv + 1}</button><button class="btn sm" onClick=${() => setV(String(g.bank))}>All</button></div>
    <button class="btn pri wide" style="margin-top:14px" onClick=${give}>Give levels</button><//>`;
}
/* ---------------- Gyms ---------------- */
function Gyms() {
  const g = G_();
  return html`<div class="wrap">
    <div class="top"><h1>Gyms</h1><span class="small muted">${Object.keys(g.badges).length} / 12 badges</span></div>
    <div class="card"><div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;justify-items:center">
      ${PL.GYMS.map((gy, i) => html`<span class=${"badge" + (g.badges["g" + i] ? "" : " off")} style=${`background:${TYPE_COL[gy.type]}`} title=${gy.badge + " Badge"}>${gy.badge.slice(0, 2)}</span>`)}
      ${PL.MILESTONES.map(ms => html`<span class=${"badge" + (g.badges[ms.id] ? "" : " off")} style="background:var(--pr)" title=${ms.name}>${ms.n}</span>`)}</div>
      <div class="tiny muted center" style="margin-top:8px">${S.sessions.length} workouts logged · next session badge at ${(PL.MILESTONES.find(x => !g.badges[x.id]) || { n: "—" }).n}</div></div>
    <div class="stack" style="margin-top:14px">${PL.GYMS.map((gy, i) => { const open = gymUnlocked(i); const beat = [0, 1, 2, 3].filter(j => (g.beaten[i + "-" + j] || 0) > 0).length;
      return html`<button class="card row" style=${"width:100%;text-align:left;" + (open ? "" : "opacity:.55")} onClick=${() => open ? openSheet(GymSheet, { i }) : toast(`Beat ${PL.GYMS[i - 1].leader} to unlock`)}>
        <span class=${"badge" + (g.badges["g" + i] ? "" : " off")} style=${`background:${TYPE_COL[gy.type]}`}>${gy.badge.slice(0, 2)}</span>
        <div class="grow"><div class="b">${gy.name}</div><div class="small muted">${gy.leader} · ${gy.type} · ${open ? `${beat}/4 beaten` : "Locked"}</div></div><span class="chev">›</span></button>`; })}</div>
  </div>`;
}
function GymSheet({ i }) {
  const gy = PL.GYMS[i]; const g = G_();
  return html`<${Sheet} title=${gy.name}>
    <div class="small muted" style="margin:-8px 0 12px">${gy.type}-type gym · ${gy.badge} Badge · first leader win adds ${fmtLv(gy.lv)} to your XP Bank</div>
    <div class="stack">${gy.ladder.map((o, j) => { const open = oppUnlocked(i, j); const wins = g.beaten[i + "-" + j] || 0; const tier = PL.TIER[o.tier];
      return html`<div class="card" style=${open ? "" : "opacity:.55"}>
        <div class="row"><div class="grow"><div class="b">${o.cls}</div><div class="small muted">${tier.label} · ${wins ? `beaten ×${wins} · rematches are practice` : `first win: +${fmtLv(PL.TRAINER_LV[o.tier])}${o.tier === "leader" ? " + badge" : ""}`}</div></div>
          ${open ? html`<button class="btn sm pri" onClick=${() => startBattle(i, j)}>${wins ? "Rematch" : "Battle"}</button>` : html`<span class="chip">Locked</span>`}</div>
        <div class="row" style="gap:6px;margin-top:8px;flex-wrap:wrap">${o.team.map(([sp, lv]) => html`<div class="center"><${Sprite} sp=${sp} size=${44} /><div class="tiny muted num">Lv ${lv}</div></div>`)}</div></div>`; })}</div><//>`;
}
function startBattle(i, j) {
  const g = G_(); const order = [g.active, ...g.party.filter(u => u !== g.active)].map(monOf).filter(Boolean);
  if (!order.length) { toast("Add a Pokémon to your party first"); return; }
  const B = PL.newBattle(order, i, j);
  U.battle = { B, view: snapOf(B), msg: `${B.foe} wants to battle! ${B.foe.split(" ").slice(-1)[0]} sent out ${B.theirs[0].name}.`, playing: false, phase: "choose", sub: null };
  U.layer = "battle"; closeAll();
}
const snapOf = B => ({ a: B.a, b: B.b, mine: B.mine.map(m => [m.hp, m.status]), theirs: B.theirs.map(m => [m.hp, m.status]) });
let playT = null;
function playEvents(ev) {
  const bt = U.battle; bt.playing = true; bt.phase = "play"; bt.q = ev.slice();
  const step = () => { if (!U.battle) return; const e = bt.q.shift();
    if (!e) { bt.playing = false; bt.view = snapOf(bt.B); afterTurn(); go(); return; }
    bt.view = e.snap; bt.msg = e.msg; go(); playT = setTimeout(step, 900); };
  bt.skip = () => { clearTimeout(playT); step(); };
  step();
}
function afterTurn() {
  const bt = U.battle, B = bt.B;
  if (B.over) { bt.phase = "over"; rewardBattle(); return; }
  if (B.mine[B.a].fainted) { bt.phase = "switch"; bt.msg = "Choose your next Pokémon."; return; }
  bt.phase = "choose"; bt.msg = `What will ${B.mine[B.a].name} do?`;
}
function rewardBattle() {
  const bt = U.battle, B = bt.B; if (bt.rewarded) return; bt.rewarded = true;
  const g = G_(); const gy = PL.GYMS[B.gymIdx]; const opp = gy.ladder[B.oppIdx];
  if (B.over === "win") {
    const key = B.gymIdx + "-" + B.oppIdx; const first = !g.beaten[key]; const lv = PL.TRAINER_LV[opp.tier]; const res = [];
    mutate(() => { g.beaten[key] = (g.beaten[key] || 0) + 1;
      /* first win only: a little XP, split like a workout (active gets it all, party gets the share) */
      if (first) for (const uid of g.party) { const m = monOf(uid); if (!m) continue;
        const frac = uid === g.active ? 1 : S.core.settings.share; const r = PL.awardXP(m, PL.levelsToXP(m, lv * frac)); queueGrowth(m, r); res.push({ m, lv: lv * frac, r }); }
      if (opp.tier === "leader" && !g.badges["g" + B.gymIdx]) { g.badges["g" + B.gymIdx] = Date.now(); g.bank += gy.lv; g.bankLog.push({ d: Date.now(), amt: gy.lv, why: gy.badge + " Badge" }); bt.badge = true; } });
    bt.reward = { first, res };
  } else bt.insight = PL.lossInsight(B);
}
function Battle() {
  const bt = U.battle; if (!bt) return null; const B = bt.B, v = bt.view;
  const me = B.mine[v.a], foe = B.theirs[v.b];
  const [mhp, mst] = v.mine[v.a], [fhp, fst] = v.theirs[v.b];
  const hpCls = p => p > .5 ? "hp" : p > .2 ? "hp mid" : "hp low";
  const stTag = s => s ? html`<span class="tp" style="background:#777;margin-left:6px">${{ par: "PAR", slp: "SLP", frz: "FRZ", brn: "BRN", psn: "PSN" }[s]}</span>` : null;
  const act = a => { const ev = PL.runTurn(B, a); playEvents(ev); };
  const exit = () => { clearTimeout(playT); U.battle = null; U.layer = null; go(); };
  const cur = B.mine[B.a]; const forced = cur.recharge || cur.charging; const usable = cur.moves.filter(x => x.pp > 0);
  const party = (arr, side) => html`<div class="row" style="gap:3px">${arr.map((m, i) => html`<i style=${`width:8px;height:8px;border-radius:50%;display:inline-block;background:${(side === "me" ? v.mine : v.theirs)[i][0] > 0 ? "var(--ok)" : "var(--fg3)"}`}></i>`)}</div>`;
  return html`<div class="layer"><div class="inner wrap" style="padding-top:10px">
    <div class="row" style="margin-bottom:10px"><div class="grow"><div class="b">${B.foe}</div><div class="tiny muted">${PL.GYMS[B.gymIdx].name} · ${PL.TIER[B.tier].label}</div></div>
      ${bt.phase !== "over" && html`<button class="btn sm" onClick=${() => openSheet(Confirm, { title: "Forfeit?", body: "It counts as a loss. Nothing is lost; train and come back.", yes: "Forfeit", onYes: () => { B.over = "loss"; bt.msg = "You forfeited."; bt.phase = "over"; rewardBattle(); go(); } })}>Forfeit</button>`}</div>
    <div class="arena">
      <div class="plate"><div class="row"><span class="b grow" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${foe.name}</span><span class="small num">Lv ${foe.lv}</span></div>
        <div class="row" style="margin:5px 0 3px"><span class="tiny b" style="margin-right:6px">HP</span><div class="grow"><${Bar} cls=${hpCls(fhp / foe.maxhp)} pct=${fhp / foe.maxhp} /></div>${stTag(fst)}</div>${party(B.theirs, "foe")}</div>
      <div style="position:absolute;right:16px;top:14px"><${Sprite} sp=${foe.sp} size=${104} /></div>
      <div style="position:absolute;left:12px;bottom:4px"><${Sprite} sp=${me.sp} size=${116} back=${true} shiny=${me.shiny} /></div>
      <div class="plate" style="position:absolute;right:12px;bottom:12px"><div class="row"><span class="b grow" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${me.name}</span><span class="small num">Lv ${me.lv}</span></div>
        <div class="row" style="margin:5px 0 3px"><span class="tiny b" style="margin-right:6px">HP</span><div class="grow"><${Bar} cls=${hpCls(mhp / me.maxhp)} pct=${mhp / me.maxhp} /></div>${stTag(mst)}</div>
        <div class="row"><span class="tiny num muted grow">${mhp} / ${me.maxhp}</span>${party(B.mine, "me")}</div></div>
    </div>
    <button class="msg" style="width:100%;text-align:left" onClick=${() => bt.playing && bt.skip()}>${bt.msg}</button>
    ${bt.phase === "choose" && (forced ? html`<button class="btn pri wide" style="margin-top:10px" onClick=${() => act({ kind: "move", id: cur.charging || "__recharge" })}>Continue</button>`
      : bt.sub === "switch" ? html`<${SwitchGrid} B=${B} onPick=${i => { bt.sub = null; act({ kind: "switch", to: i }); }} onBack=${() => { bt.sub = null; go(); }} />`
      : html`<div class="mvg">${usable.length ? cur.moves.map(x => { const mv = PL.move(x.id); const e = mv.p ? PL.eff(mv.t, foe.types) : 1;
          return html`<button class="mv" disabled=${x.pp <= 0} onClick=${() => act({ kind: "move", id: x.id })}><div class="b">${mv.n}</div><div class="row tiny" style="gap:6px;margin-top:4px"><${TypePill} t=${mv.t} /><span class="muted num grow">${x.pp}/${mv.pp}</span>${e > 1 ? html`<span class="pill-ok">Strong</span>` : e === 0 ? html`<span class="faint">No effect</span>` : e < 1 ? html`<span class="faint">Weak</span>` : null}</div></button>`; })
          : html`<button class="mv" style="grid-column:1/-1" onClick=${() => act({ kind: "move", id: "struggle" })}><div class="b">Struggle</div><div class="tiny muted">Out of PP</div></button>`}</div>
        <div class="row" style="margin-top:8px"><button class="btn grow" disabled=${B.mine.filter(m => !m.fainted).length < 2} onClick=${() => { bt.sub = "switch"; go(); }}>Switch Pokémon</button></div>`)}
    ${bt.phase === "switch" && html`<${SwitchGrid} B=${B} forced=${true} onPick=${i => { const old = B.mine[B.a]; B.a = i; bt.view = snapOf(B); bt.msg = `Go, ${B.mine[i].name}!`; bt.phase = "choose"; go(); setTimeout(() => { if (U.battle === bt && bt.phase === "choose") { bt.msg = `What will ${B.mine[B.a].name} do?`; go(); } }, 900); }} />`}
    ${bt.phase === "over" && html`<div class="card" style="margin-top:12px">${B.over === "win" ? html`
        <div class="b" style="font-size:18px">You won!</div>
        ${bt.reward && (bt.reward.first ? html`<div class="list" style="margin-top:10px">${bt.reward.res.map(x => html`<div class="li" style="min-height:44px;padding:8px 12px"><${Sprite} sp=${x.m.sp} size=${36} shiny=${x.m.shiny} /><span class="grow small b">${monName(x.m)}</span><span class="small num">+${fmtLv(x.lv)}${x.r.to > x.r.from ? ` · Lv ${x.r.to}` : ""}</span></div>`)}</div>`
          : html`<div class="small muted" style="margin-top:6px">Rematch win. Trainers give XP only the first time you beat them.</div>`)}
        ${bt.badge && html`<div class="row" style="margin-top:10px"><span class="badge" style=${`background:${TYPE_COL[PL.GYMS[B.gymIdx].type]}`}>${PL.GYMS[B.gymIdx].badge.slice(0, 2)}</span><div class="grow small">You earned the <b>${PL.GYMS[B.gymIdx].badge} Badge</b> and ${fmtLv(PL.GYMS[B.gymIdx].lv)} for your XP Bank.${B.gymIdx < 7 ? ` ${PL.GYMS[B.gymIdx + 1].name} is now open.` : ""}</div></div>`}`
      : html`<div class="b" style="font-size:18px">Not this time.</div><div class="small muted" style="margin:4px 0 10px">${bt.insight || ""} Train, level up, and try again.</div>
        <div class="row" style="gap:8px;flex-wrap:wrap">${B.theirs.map(m => html`<div class="center"><${Sprite} sp=${m.sp} size=${44} /><div class="tiny muted num">Lv ${m.lv}</div></div>`)}</div>`}
      <button class="btn pri wide" style="margin-top:12px" onClick=${exit}>Done</button></div>`}
  </div></div>`;
}
function SwitchGrid({ B, forced, onPick, onBack }) {
  return html`<div class="list" style="margin-top:10px">${B.mine.map((m, i) => html`<button class="li" disabled=${m.fainted || i === B.a} style=${m.fainted || i === B.a ? "opacity:.45" : ""} onClick=${() => onPick(i)}>
    <${Sprite} sp=${m.sp} size=${40} shiny=${m.shiny} /><div class="grow"><div class="b">${m.name} <span class="small muted num">Lv ${m.lv}</span></div><div style="margin-top:4px"><${Bar} cls="hp" pct=${m.hp / m.maxhp} /></div></div><span class="tiny muted num">${m.fainted ? "Fainted" : i === B.a ? "In battle" : `${m.hp}/${m.maxhp}`}</span></button>`)}</div>
    ${!forced && html`<button class="btn wide" style="margin-top:8px" onClick=${onBack}>Back</button>`}`;
}

/* ---------------- onboarding + shell ---------------- */
function Onboard() {
  const [bw, setBw] = useState(""); const [pick, setPick] = useState(null);
  const ok = parseFloat(bw) > 0 && pick;
  return html`<div class="wrap" style="padding-top:28px;padding-bottom:40px;max-width:520px;margin:0 auto">
    <h1 style="font-size:32px;margin:0 0 6px">PokéLift</h1>
    <p class="muted" style="margin:0 0 20px">Log your lifts. Every pound you move becomes XP for your team, and every 10,000-step day finds you a wild Pokémon.</p>
    <label class="l" for="ob-bw">Your bodyweight (lb)</label><input id="ob-bw" class="f num" inputmode="decimal" placeholder="180" value=${bw} onInput=${e => setBw(e.target.value)} />
    <p class="tiny muted">Used for pull-ups (100% per rep) and push-ups (65%). Change it anytime in settings.</p>
    <h2 class="sec">Choose your partner</h2>
    <div class="row" style="gap:8px">${[1, 4, 7].map(sp => html`<button class=${"card grow center"} style=${pick === sp ? "border-color:var(--red);box-shadow:inset 0 0 0 1px var(--red)" : ""} onClick=${() => setPick(sp)}>
      <${Sprite} sp=${sp} size=${80} /><div class="b">${PL.mon(sp).n}</div><div class="row" style="justify-content:center;gap:3px;margin-top:4px;flex-wrap:wrap">${PL.mon(sp).t.map(t => html`<${TypePill} t=${t} />`)}</div></button>`)}</div>
    <p class="small muted">It starts at level 5. Three example templates (Push, Pull, Legs) are ready for you to edit into your own rotation.</p>
    <button class="btn pri wide" style="margin-top:8px" disabled=${!ok} onClick=${() => mutate(() => { S.core.settings.bw = parseFloat(bw); S.core.bwlog.push({ d: Date.now(), w: parseFloat(bw) }); addMon(PL.newMon(pick, 5)); G_().started = true; })}>Start training</button>
  </div>`;
}
function Loading({ text = "Loading" }) {
  return html`<div class="wrap center" style="padding-top:40vh;color:var(--fg2)">${text}…</div>`;
}
function AuthScreen() {
  const [email, setEmail] = useState(""); const [code, setCode] = useState(""); const [step, setStep] = useState("email");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const send = async () => { if (!validEmail) { setErr("Enter a valid email address."); return; }
    setBusy(true); setErr(""); try { await sendCode(email.trim()); setStep("code"); } catch (e) { setErr(e.status === 429 || /rate limit/i.test(e.message || "") ? "Too many sign-in emails were sent recently. Wait a bit, then try again. If you already got a code, enter it instead." : (e.message || "Couldn't send the email. Try again in a minute.")); } setBusy(false); };
  const verify = async () => { const t = code.replace(/\D/g, ""); if (t.length < 6) { setErr("Enter the code from the email."); return; }
    setBusy(true); setErr(""); try { await verifyCode(email.trim(), t); } catch (e) { setErr("That code didn't work. Check it, or send a new one."); } setBusy(false); };
  return html`<div class="wrap" style="padding-top:48px;max-width:520px;margin:0 auto">
    <h1 style="font-size:32px;margin:0 0 6px">PokéLift</h1>
    <p class="muted" style="margin:0 0 22px">Sign in to keep your workouts, Pokémon, and progress on every device.</p>
    ${step === "email" ? html`<form onSubmit=${e => { e.preventDefault(); send(); }}>
        <label class="l" for="au-email">Email</label><input id="au-email" class="f" type="email" autocomplete="email" inputmode="email" placeholder="you@example.com" value=${email} onInput=${e => { setEmail(e.target.value); setErr(""); }} />
        ${err && html`<div class="small" style="color:var(--red);margin-top:8px">${err}</div>`}
        <button class="btn pri wide" style="margin-top:14px" disabled=${busy}>${busy ? "Sending…" : "Email me a sign-in code"}</button></form>
        <p class="tiny muted">New here? The same code creates your account.</p>`
    : html`<form onSubmit=${e => { e.preventDefault(); verify(); }}>
        <p class="small">We sent a code to <b>${email.trim()}</b>.</p>
        <label class="l" for="au-code">Sign-in code</label><input id="au-code" class="f num" style="font-size:22px;letter-spacing:.2em;text-align:center" inputmode="numeric" autocomplete="one-time-code" placeholder="123456" value=${code} onInput=${e => { setCode(e.target.value); setErr(""); }} />
        ${err && html`<div class="small" style="color:var(--red);margin-top:8px">${err}</div>`}
        <button class="btn pri wide" style="margin-top:14px" disabled=${busy}>${busy ? "Checking…" : "Sign in"}</button></form>
        <div class="row" style="justify-content:space-between;margin-top:10px"><button class="btn ghost" onClick=${() => { setStep("email"); setCode(""); setErr(""); }}>Use a different email</button><button class="btn ghost" disabled=${busy} onClick=${send}>Send a new code</button></div>
        <p class="tiny muted">Opening the link in the email works too, if you open it in the same browser.</p>`}
  </div>`;
}
/* ---------------- walking ---------------- */
const pct = x => (x * 100).toFixed(x < 0.1 ? 2 : 1).replace(/\.0+$/, "") + "%";
function oddsText(t) { const o = PL.STREAK_TIERS[t].odds; return ["common", "uncommon", "rare"].filter(k => o[k]).map(k => `${Math.round(o[k] * 100)}% ${k}`).join(" · "); }
function nextTierText(st) {
  const t = st.tier; if (t >= PL.STREAK_TIERS.length - 1) return "Top tier";
  const need = PL.STREAK_TIERS[t + 1].at - st.streak; return `${need} more 10k day${need === 1 ? "" : "s"} to ${PL.STREAK_TIERS[t + 1].label}`;
}
function StepsCard() {
  const st = walkStatus(); const w = W_();
  return html`<button class="card" style="width:100%;text-align:left" onClick=${() => openSheet(WalkSheet)}>
    <div class="row"><div class="grow"><div class="tiny faint b" style="text-transform:uppercase;letter-spacing:.06em">Today's steps</div>
      <div class="num" style="font-size:22px;font-weight:700">${st.steps.toLocaleString()}<span class="small muted" style="font-weight:500"> / ${PL.STEP_GOAL.toLocaleString()}</span></div></div>
      ${st.hit ? html`<span class="chip" style="background:var(--ok-bg);color:var(--ok)">Encounter found</span>` : html`<span class="chev">›</span>`}</div>
    <div style="margin:6px 0"><${Bar} cls="hp" pct=${st.steps / PL.STEP_GOAL} /></div>
    <div class="small"><b>${st.streak}-day streak</b> · ${PL.STREAK_TIERS[st.tier].label} <span class="muted">(${oddsText(st.tier)})</span></div>
    <div class="tiny muted num" style="margin-top:3px">Shiny chance ${pct(st.shiny)} · ${MODE === "cloud" ? (w.lastSync ? "iPhone sync " + new Date(w.lastSync).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" }) : "iPhone sync not set up") : "steps entered by hand"}</div>
  </button>`;
}
function WalkSheet() {
  const st = walkStatus(); const w = W_();
  const [day, setDay] = useState(st.today); const [val, setVal] = useState("");
  const yest = PL.addDay(st.today, -1);
  const recent = Array.from({ length: 14 }, (_, i) => PL.addDay(st.today, -i)).filter(d => d >= w.start);
  const save = () => { const n = parseInt(String(val).replace(/\D/g, "")); if (!(n >= 0)) return; setSteps(day, n); setVal(""); toast(`${n.toLocaleString()} steps saved`); };
  return html`<${Sheet} title="Steps">
    <p class="small muted" style="margin-top:-6px">Every day you reach ${PL.STEP_GOAL.toLocaleString()} steps, a wild Pokémon appears near your team's level. Each 10k day in a row raises your streak. A day under 10k drops you one tier.</p>
    <div class="list">${PL.STREAK_TIERS.map((t, i) => html`<div class=${"li tier-row" + (i === st.tier ? " on" : "")} style="min-height:44px;padding:8px 12px">
      <span class="b" style="width:56px">${t.label}</span><span class="grow small">${t.at === 0 ? "Days 1–2" : `${t.at}+ days`}</span><span class="small muted">${oddsText(i)}</span></div>`)}</div>
    <div class="small" style="margin-top:8px"><b>${st.streak}-day streak</b> · ${nextTierText(st)}.${!st.hit && st.tier > 0 ? html` <span class="muted">Miss today and you drop to ${PL.STREAK_TIERS[st.tier - 1].label}.</span>` : ""}</div>
    <h2 class="sec">Shiny chance</h2>
    <div class="card small"><b class="num">${pct(st.shiny)}</b> per encounter. It starts at 2% (1 in 50) and every PR adds ${pct(0.0025)}, up to 25%. ${st.prs ? `${st.prs} PR${st.prs > 1 ? "s" : ""} since your last shiny.` : "No PRs since your last shiny yet."} Catching a shiny resets it to 2%.</div>
    <h2 class="sec">Last 14 days</h2>
    <div class="list">${recent.map(d => { const n = w.days[d] || 0; return html`<div class="li" style="min-height:40px;padding:8px 12px"><span class="small" style="width:96px">${d === st.today ? "Today" : d === yest ? "Yesterday" : fmtDate(PL.addDay(d, 0).replace(/-/g, "/"), { weekday: "short", month: "short", day: "numeric" })}</span>
      <div class="grow"><${Bar} cls=${n >= PL.STEP_GOAL ? "hp" : "hp mid"} pct=${n / PL.STEP_GOAL} /></div><span class="small num" style="width:64px;text-align:right">${n.toLocaleString()}</span>${n >= PL.STEP_GOAL ? html`<span class="pill-ok small" style="width:18px">✓</span>` : html`<span style="width:18px"></span>`}</div>`; })}</div>
    <h2 class="sec">Automatic steps</h2>
    ${MODE === "cloud" ? html`<div class="card small">${w.lastSync ? html`Last synced from your iPhone: <b>${new Date(w.lastSync).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</b>.` : "Not set up yet. A Shortcut on your iPhone can send your Apple Health steps here automatically."}
        <button class="btn sm pri" style="margin-top:10px" onClick=${() => openSheet(ShortcutSheet)}>${w.lastSync ? "View setup" : "Set up iPhone sync"}</button></div>`
      : html`<div class="card small muted">Automatic iPhone sync works in the PokéLift web app at poke-lift.vercel.app. Here, enter steps by hand.</div>`}
    <h2 class="sec">Enter steps by hand</h2>
    <div class="seg" style="margin-bottom:8px"><button class=${day === st.today ? "on" : ""} onClick=${() => setDay(st.today)}>Today</button><button class=${day === yest ? "on" : ""} onClick=${() => setDay(yest)}>Yesterday</button></div>
    <div class="row"><input id="steps-in" class="f num" inputmode="numeric" aria-label="Steps" placeholder=${String(w.days[day] || 8500)} value=${val} onInput=${e => setVal(e.target.value.replace(/[^0-9,]/g, ""))} /><button class="btn" onClick=${save}>Save</button></div>
    <p class="tiny muted">Use this if a sync was missed. It replaces that day's total.</p><//>`;
}
function CopyRow({ label, text }) {
  const copy = async e => { try { await navigator.clipboard.writeText(text); toast(label + " copied"); } catch (err) { const c = e.target.closest(".copy").querySelector("code"); const r = document.createRange(); r.selectNodeContents(c); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); toast("Selected. Tap Copy."); } };
  return html`<div class="tiny muted b" style="margin:8px 0 4px">${label}</div><div class="copy"><code>${text}</code><button class="btn sm" onClick=${copy}>Copy</button></div>`;
}
function ShortcutSheet() {
  const [tok, setTok] = useState(null); const [err, setErr] = useState("");
  useEffect(() => { stepToken(false).then(setTok).catch(() => setErr("Couldn't load your sync code. Check your connection and try again.")); }, []);
  const url = (window.PL_CONFIG || {}).supabaseUrl + "/rest/v1/rpc/pokelift_report_steps";
  const key = (window.PL_CONFIG || {}).supabaseKey;
  return html`<${Sheet} title="iPhone step sync">
    <p class="small muted" style="margin-top:-6px">A Shortcut reads today's steps from Apple Health and sends them to your account. Set it up once; automations then run it for you.</p>
    ${err ? html`<div class="small" style="color:var(--red)">${err}</div>` : !tok ? html`<div class="small muted">Loading your sync code…</div>` : html`
    <${CopyRow} label="URL" text=${url} />
    <${CopyRow} label="apikey header" text=${key} />
    <${CopyRow} label="Your sync code (keep it private)" text=${tok} />
    <h2 class="sec">1. Build the shortcut</h2>
    <div class="card small"><div class="muted">In the Shortcuts app, tap + and add these actions in order:</div><ol class="steps">
      <li><b>Find Health Samples</b>: Type is <b>Steps</b>, Start Date is <b>Today</b>, Group By <b>Day</b>.</li>
      <li><b>Calculate Statistics</b>: <b>Sum</b> of Health Samples.</li>
      <li><b>Format Date</b>: Current Date, Date Format <b>Custom</b>, format <code>yyyy-MM-dd</code>.</li>
      <li><b>Get Contents of URL</b>: paste the URL. Tap <b>Show More</b>, set Method to <b>POST</b>. Under Headers add <code>apikey</code> with the apikey value. Request Body <b>JSON</b> with three fields:
        <code>token</code> (Text) = your sync code, <code>day</code> (Text) = Formatted Date, <code>steps</code> (Number) = Statistics.</li>
      <li>Name it <b>PokéLift Steps</b> and tap ▶ once. Allow Health access when asked. It should show <code>{"ok": true, …}</code>.</li></ol></div>
    <h2 class="sec">2. Make it run automatically</h2>
    <div class="card small"><div class="muted">In Shortcuts, open <b>Automation</b> → <b>+</b> → <b>Time of Day</b>. Set the time, <b>Daily</b>, choose <b>Run Immediately</b>, and pick PokéLift Steps. Make one for each time:</div>
      <div class="row" style="flex-wrap:wrap;gap:6px;margin:8px 0">${["12:00 PM", "3:00 PM", "6:00 PM", "9:00 PM", "11:30 PM"].map(t => html`<span class="chip num">${t}</span>`)}</div>
      <div class="muted">iPhone only lets Shortcuts read Health while the phone is unlocked, so a run fails if the phone is locked at that moment. For extra coverage, add one more automation: <b>App</b> → <b>Is Opened</b> → pick an app you open often (like Messages), Run Immediately, PokéLift Steps.</div></div>
    <p class="tiny muted">Steps show up here within two minutes of a sync, or when you reopen PokéLift. If your step counts look about double the Health app's, change step 1 to also filter <b>Source</b> is your iPhone.</p>
    <button class="btn wide" style="margin-top:6px" onClick=${() => openSheet(Confirm, { title: "Make a new sync code?", body: "Your current Shortcut stops working until you paste the new code into it.", yes: "Make new code", onYes: () => stepToken(true).then(t => { setTok(t); toast("New sync code made"); }).catch(() => toast("Couldn't make a new code. Try again.")) })}>Make a new sync code</button>`}<//>`;
}
function EncounterPrompt() {
  const w = W_(); const m = w.pending[0]; if (!m) return null; const sp = PL.mon(m.sp);
  const when = m.fromEgg ? "Your saved egg hatched." : m.day ? `You walked ${(m.steps || 0).toLocaleString()} steps ${m.day === dk() ? "today" : "on " + fmtDate(m.day.replace(/-/g, "/"), { weekday: "long", month: "short", day: "numeric" })}.` : "";
  const take = () => { const r = acceptEncounter(); if (r) toast(`${PL.mon(r.m.sp).n} ${r.full ? "went to your box" : "joined your party"}`); go(); };
  return html`<div class="scrim" style="z-index:80"><div class="sheet"><div class="grab"></div><div class="center">
    <${Sprite} sp=${m.sp} size=${128} shiny=${m.shiny} />
    <h3 style="margin-bottom:4px">${m.shiny ? "✦ A shiny " : "A wild "}${sp.n} appeared!</h3>
    <div class="row" style="justify-content:center;gap:6px;margin-bottom:8px">${sp.t.map(t => html`<${TypePill} t=${t} />`)}<span class="small num b">Lv ${m.lv}</span>${m.pool && m.pool !== "common" ? html`<span class="chip" style="text-transform:capitalize">${m.pool}</span>` : null}</div>
    <p class="muted small" style="margin-top:0">${when}${w.pending.length > 1 ? ` ${w.pending.length - 1} more waiting.` : ""}</p></div>
    <button class="btn pri wide" onClick=${take}>Add to team</button>
    <div class="tiny muted center" style="margin-top:8px">${G_().party.length >= 6 ? "Your party is full, so it goes to your box." : "It joins your party."}</div></div></div>`;
}
function App() {
  const [, setT] = useState(0);
  useEffect(() => { setRerender(() => setT(t => t + 1)); connect(); refreshSteps();
    const iv = setInterval(refreshSteps, 120000); const vis = () => { if (document.visibilityState === "visible") refreshSteps(); };
    document.addEventListener("visibilitychange", vis); return () => { clearInterval(iv); document.removeEventListener("visibilitychange", vis); }; }, []);
  if (MODE === "cloud" && S.auth.state !== "in") return S.auth.state === "loading" ? html`<${Loading} />` : html`<${AuthScreen} />`;
  if (MODE === "cloud" && !S.auth.ready && !G_().started) return html`<${Loading} text="Loading your data" />`;
  if (!G_().started) return html`<${Onboard} />${U.sheets.length > 0 && html`<${SheetHost} />`}`;
  const tabs = [["home", "Home", IC.home], ["plan", "Plan", IC.plan], ["lifts", "Workouts", IC.lift], ["team", "Team", IC.team], ["gyms", "Gyms", IC.gym]];
  const View = { home: Home, plan: Plan, lifts: Lifts, team: Team, gyms: Gyms }[U.tab];
  return html`<div class="app"><${View} /></div>
    ${S.active && U.layer !== "logger" && html`<div class="resume"><button onClick=${() => { U.layer = "logger"; go(); }}><span>Resume ${S.active.name}</span><span class="num">${fmtDur(Date.now() - S.active.start)}</span></button></div>`}
    <nav class="tabs"><div class="in">${tabs.map(([k, l, ic]) => html`<button class=${U.tab === k ? "on" : ""} aria-current=${U.tab === k ? "page" : null} onClick=${() => { U.tab = k; window.scrollTo(0, 0); go(); }}>${ic}<span>${l}</span></button>`)}</div></nav>
    ${U.layer === "logger" && html`<${Logger} />`}
    ${U.layer === "finish" && html`<${Finish} />`}
    ${U.layer === "battle" && html`<${Battle} />`}
    <${PromptLayer} />
    ${U.sheets.length > 0 && html`<${SheetHost} />`}
    ${U.toast && html`<div class="toast" role="status">${U.toast}</div>`}`;
}
function SheetHost() {
  const top = U.sheets[U.sheets.length - 1]; const C = top.C;
  return html`<div class="scrim" onClick=${e => { if (e.target === e.currentTarget) closeSheet(); }}><div class="sheet" role="dialog"><${C} key=${top.id} ...${top.p} /></div></div>`;
}
render(html`<${App} />`, document.getElementById("root"));
