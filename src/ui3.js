/* ================= UI: team, eggs, gyms, battle, shell ================= */
function Team() {
  const seg = U.teamSeg || "party"; const setSeg = s => { U.teamSeg = s; go(); };
  const g = G_();
  return html`<div class="wrap">
    <div class="top"><h1>Team</h1>${g.bank > 0 && html`<span class="chip num">Bank ${g.bank.toLocaleString()} XP</span>`}</div>
    <div class="seg" style="margin-bottom:14px">${[["party","Party"],["box","Box"],["eggs",`Eggs${g.eggs.length ? " " + g.eggs.length : ""}`],["dex","Pokédex"]].map(([k, l]) => html`<button class=${seg === k ? "on" : ""} onClick=${() => setSeg(k)}>${l}</button>`)}</div>
    ${seg === "party" ? html`<${Party} />` : seg === "box" ? html`<${Box} />` : seg === "eggs" ? html`<${Eggs} />` : html`<${Dex} />`}
  </div>`;
}
function MonRow({ m, active }) {
  const p = PL.xpProgress(m);
  return html`<button class="li" onClick=${() => openSheet(MonSheet, { uid: m.uid })}><${Sprite} sp=${m.sp} size=${56} />
    <div class="grow"><div class="row" style="gap:6px"><span class="b">${monName(m)}</span>${active && html`<span class="tp" style="background:var(--red)">Active</span>`}<span class="grow"></span><span class="small muted num">Lv ${m.lv}</span></div>
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
    <div class="row" style="gap:14px"><${Sprite} sp=${m.sp} size=${110} /><div class="grow">
      <div style="font-size:22px;font-weight:700">${monName(m)}</div>${m.nick && html`<div class="small muted">${sp.n}</div>`}
      <div class="row" style="gap:4px;margin:6px 0">${sp.t.map(t => html`<${TypePill} t=${t} />`)}</div>
      <div class="small num">Lv ${m.lv} · ${PL.growthName[sp.g]}</div></div></div>
    <div style="margin-top:12px"><${Bar} pct=${p.pct} /><div class="tiny muted num" style="margin-top:4px">${m.xp.toLocaleString()} XP total${m.lv < 100 ? ` · ${p.toNext.toLocaleString()} to Lv ${m.lv + 1}` : ""}</div></div>
    ${evo.length > 0 && html`<div class="small muted" style="margin-top:8px">${evo.length > 1 ? `Evolves at Lv ${evo[0].lv} into your choice of ${evo.map(e => PL.mon(e.to).n).join(", ")}` : `Evolves at Lv ${evo[0].lv} into ${PL.mon(evo[0].to).n}`}${m.evoNo != null && m.lv >= evo[0].lv ? " · asks again next level-up" : ""}</div>`}
    <div class="row" style="flex-wrap:wrap;gap:8px;margin-top:14px">
      ${inParty && g.active !== uid && html`<button class="btn sm pri" onClick=${() => { mutate(() => { g.active = uid; }); toast(`${monName(m)} is now active`); }}>Make active</button>`}
      ${g.bank > 0 && m.lv < 100 && html`<button class="btn sm" onClick=${() => openSheet(GiveXP, { uid })}>Give bank XP</button>`}
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
  const [v, setV] = useState(String(Math.min(g.bank, p.toNext)));
  const give = () => { const n = Math.min(g.bank, Math.max(0, parseInt(v) || 0)); if (!n) return;
    const r = PL.awardXP(m, n); g.bank -= r.gained; g.bankLog.push({ d: Date.now(), amt: -r.gained, why: "Gave to " + monName(m) });
    queueGrowth(m, r); saveCore(); closeAll(); toast(r.to > r.from ? `${monName(m)} grew to Lv ${r.to}!` : `+${r.gained.toLocaleString()} XP`); };
  return html`<${Sheet} title=${"Give XP to " + monName(m)}><div class="small muted" style="margin-top:-6px">Bank balance ${g.bank.toLocaleString()} XP. This can't be undone.</div>
    <label class="l" for="gx">Amount</label><input id="gx" class="f num" inputmode="numeric" value=${v} onInput=${e => setV(e.target.value.replace(/\D/g, ""))} />
    <div class="row" style="gap:8px;margin-top:8px"><button class="btn sm" onClick=${() => setV(String(Math.min(g.bank, p.toNext)))}>To Lv ${m.lv + 1}</button><button class="btn sm" onClick=${() => setV(String(g.bank))}>All</button></div>
    <button class="btn pri wide" style="margin-top:14px" onClick=${give}>Give XP</button><//>`;
}
function Eggs() {
  const g = G_(); const egg = g.eggs.find(e => e.id === g.incub);
  const [steps, setSteps] = useState("");
  const addSteps = () => { const n = parseInt(steps) || 0; if (n <= 0) return;
    if (!egg) { toast("Incubate an egg first"); return; }
    mutate(() => { egg.steps = Math.min(egg.need, egg.steps + n); g.steps += n; }); setSteps(""); toast(egg.steps >= egg.need ? "Your egg is ready to hatch!" : `+${n.toLocaleString()} steps`); };
  const hatch = () => { const pool = PL.POOLS[egg.tier]; const sp = pool[Math.floor(Math.random() * pool.length)];
    const m = PL.newMon(sp, 5); const full = g.party.length >= 6;
    mutate(() => { g.eggs = g.eggs.filter(e => e.id !== egg.id); g.incub = null; addMon(m); });
    U.queue.unshift({ k: "msg", sp, title: `Your egg hatched into ${PL.mon(sp).n}!`, body: full ? "Your party is full, so it went to the box." : "It joined your party." }); go(); };
  return html`<div class="card">
    ${egg ? html`<div class="row" style="gap:14px"><${Egg} tier=${egg.tier} size=${1.3} /><div class="grow"><div class="b">${PL.EGG[egg.tier].label} · incubating</div><div class="small muted num">${egg.steps.toLocaleString()} / ${egg.need.toLocaleString()} steps</div><div style="margin-top:6px"><${Bar} pct=${egg.steps / egg.need} /></div></div></div>
      ${egg.steps >= egg.need ? html`<button class="btn pri wide" style="margin-top:12px" onClick=${hatch}>Hatch it</button>` : html`
      <label class="l" for="steps">Add today's steps</label><div class="row"><input id="steps" class="f num" inputmode="numeric" placeholder="8,500" value=${steps} onInput=${e => setSteps(e.target.value.replace(/\D/g, ""))} /><button class="btn" onClick=${addSteps}>Add</button></div>
      <p class="tiny muted" style="margin-bottom:0">Copy the number from the Health app. The iPhone build reads Apple Health automatically.</p>`}`
      : html`<div class="b">Incubator empty</div><div class="small muted">Pick an egg below. Steps only count while an egg is incubating.</div>`}</div>
    <h2 class="sec">Your eggs</h2>
    ${g.eggs.length ? html`<div class="list">${g.eggs.map(e => html`<div class="li"><${Egg} tier=${e.tier} /><div class="grow"><div class="b">${PL.EGG[e.tier].label}</div><div class="tiny muted num">${e.steps.toLocaleString()} / ${e.need.toLocaleString()} steps · from ${e.from || "battle"}</div></div>
      ${e.id === g.incub ? html`<span class="chip">Incubating</span>` : html`<button class="btn sm" onClick=${() => mutate(() => { g.incub = e.id; })}>${g.incub ? "Swap in" : "Incubate"}</button>`}</div>`)}</div>`
      : html`<div class="card empty small">Beat trainers in the Gyms tab to earn eggs. Gym leaders give rare eggs.</div>`}
    <div class="tiny muted" style="margin-top:10px">Common eggs: easy and medium trainers. Uncommon: hard trainers. Rare: gym leaders.</div>`;
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
    <div class="small muted" style="margin:-8px 0 12px">${gy.type}-type gym · ${gy.badge} Badge · first leader win adds ${gy.xp.toLocaleString()} XP to your bank</div>
    <div class="stack">${gy.ladder.map((o, j) => { const open = oppUnlocked(i, j); const wins = g.beaten[i + "-" + j] || 0; const tier = PL.TIER[o.tier];
      return html`<div class="card" style=${open ? "" : "opacity:.55"}>
        <div class="row"><div class="grow"><div class="b">${o.cls}</div><div class="small muted">${tier.label} · reward: ${PL.EGG[tier.egg].label.toLowerCase()}${wins ? ` · beaten ×${wins}` : ""}</div></div>
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
    const tier = PL.TIER[opp.tier].egg;
    const egg = { id: PL.uid(), tier, steps: 0, need: S.core.settings.eggSteps[tier], from: opp.cls };
    const key = B.gymIdx + "-" + B.oppIdx; const first = !g.beaten[key];
    mutate(() => { g.eggs.push(egg); if (!g.incub) g.incub = egg.id; g.beaten[key] = (g.beaten[key] || 0) + 1;
      if (opp.tier === "leader" && !g.badges["g" + B.gymIdx]) { g.badges["g" + B.gymIdx] = Date.now(); g.bank += gy.xp; g.bankLog.push({ d: Date.now(), amt: gy.xp, why: gy.badge + " Badge" }); bt.badge = true; } });
    bt.reward = { egg, first };
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
      <div style="position:absolute;left:12px;bottom:4px"><${Sprite} sp=${me.sp} size=${116} back=${true} /></div>
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
        ${bt.reward && html`<div class="row" style="margin-top:10px"><${Egg} tier=${bt.reward.egg.tier} /><div class="grow small">You got a <b>${PL.EGG[bt.reward.egg.tier].label.toLowerCase()}</b>. Hatches in ${bt.reward.egg.need.toLocaleString()} steps.</div></div>`}
        ${bt.badge && html`<div class="row" style="margin-top:10px"><span class="badge" style=${`background:${TYPE_COL[PL.GYMS[B.gymIdx].type]}`}>${PL.GYMS[B.gymIdx].badge.slice(0, 2)}</span><div class="grow small">You earned the <b>${PL.GYMS[B.gymIdx].badge} Badge</b> and ${PL.GYMS[B.gymIdx].xp.toLocaleString()} XP for your bank.${B.gymIdx < 7 ? ` ${PL.GYMS[B.gymIdx + 1].name} is now open.` : ""}</div></div>`}`
      : html`<div class="b" style="font-size:18px">Not this time.</div><div class="small muted" style="margin:4px 0 10px">${bt.insight || ""} Train, level up, and try again.</div>
        <div class="row" style="gap:8px;flex-wrap:wrap">${B.theirs.map(m => html`<div class="center"><${Sprite} sp=${m.sp} size=${44} /><div class="tiny muted num">Lv ${m.lv}</div></div>`)}</div>`}
      <button class="btn pri wide" style="margin-top:12px" onClick=${exit}>Done</button></div>`}
  </div></div>`;
}
function SwitchGrid({ B, forced, onPick, onBack }) {
  return html`<div class="list" style="margin-top:10px">${B.mine.map((m, i) => html`<button class="li" disabled=${m.fainted || i === B.a} style=${m.fainted || i === B.a ? "opacity:.45" : ""} onClick=${() => onPick(i)}>
    <${Sprite} sp=${m.sp} size=${40} /><div class="grow"><div class="b">${m.name} <span class="small muted num">Lv ${m.lv}</span></div><div style="margin-top:4px"><${Bar} cls="hp" pct=${m.hp / m.maxhp} /></div></div><span class="tiny muted num">${m.fainted ? "Fainted" : i === B.a ? "In battle" : `${m.hp}/${m.maxhp}`}</span></button>`)}</div>
    ${!forced && html`<button class="btn wide" style="margin-top:8px" onClick=${onBack}>Back</button>`}`;
}

/* ---------------- onboarding + shell ---------------- */
function Onboard() {
  const [bw, setBw] = useState(""); const [pick, setPick] = useState(null);
  const ok = parseFloat(bw) > 0 && pick;
  return html`<div class="wrap" style="padding-top:28px;padding-bottom:40px;max-width:520px;margin:0 auto">
    <h1 style="font-size:32px;margin:0 0 6px">PokéLift</h1>
    <p class="muted" style="margin:0 0 20px">Log your lifts. Every pound you move becomes XP for your team, and every win earns an egg that your steps hatch.</p>
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
function App() {
  const [, setT] = useState(0);
  useEffect(() => { setRerender(() => setT(t => t + 1)); connect(); }, []);
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
