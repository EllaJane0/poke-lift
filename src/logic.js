/* ================= PokéLift core logic (pure, testable) ================= */
const PL = (() => {
const G = window.__GAME__;
const TYPES = ["Normal","Fire","Water","Electric","Grass","Ice","Fighting","Poison","Ground","Flying","Psychic","Bug","Rock","Ghost","Dragon","Dark","Steel"];
const TC = {
Normal:{Rock:.5,Ghost:0,Steel:.5},
Fire:{Fire:.5,Water:.5,Grass:2,Ice:2,Bug:2,Rock:.5,Dragon:.5,Steel:2},
Water:{Fire:2,Water:.5,Grass:.5,Ground:2,Rock:2,Dragon:.5},
Electric:{Water:2,Electric:.5,Grass:.5,Ground:0,Flying:2,Dragon:.5},
Grass:{Fire:.5,Water:2,Grass:.5,Poison:.5,Ground:2,Flying:.5,Bug:.5,Rock:2,Dragon:.5,Steel:.5},
Ice:{Fire:.5,Water:.5,Grass:2,Ice:.5,Ground:2,Flying:2,Dragon:2,Steel:.5},
Fighting:{Normal:2,Ice:2,Poison:.5,Flying:.5,Psychic:.5,Bug:.5,Rock:2,Ghost:0,Dark:2,Steel:2},
Poison:{Grass:2,Poison:.5,Ground:.5,Rock:.5,Ghost:.5,Steel:0},
Ground:{Fire:2,Electric:2,Grass:.5,Poison:2,Flying:0,Bug:.5,Rock:2,Steel:2},
Flying:{Electric:.5,Grass:2,Fighting:2,Bug:2,Rock:.5,Steel:.5},
Psychic:{Fighting:2,Poison:2,Psychic:.5,Dark:0,Steel:.5},
Bug:{Fire:.5,Grass:2,Fighting:.5,Poison:.5,Flying:.5,Psychic:2,Ghost:.5,Dark:2,Steel:.5},
Rock:{Fire:2,Ice:2,Fighting:.5,Ground:.5,Flying:2,Bug:2,Steel:.5},
Ghost:{Normal:0,Psychic:2,Ghost:2,Dark:.5,Steel:.5},
Dragon:{Dragon:2,Steel:.5},
Dark:{Fighting:.5,Psychic:2,Ghost:2,Dark:.5,Steel:.5},
Steel:{Fire:.5,Water:.5,Electric:.5,Ice:2,Rock:2,Steel:.5}};
const eff = (t, defs) => defs.reduce((m, d) => m * ((TC[t] || {})[d] ?? 1), 1);
const PHYS = new Set(["Normal","Fighting","Flying","Poison","Ground","Rock","Bug","Ghost","Steel"]);

/* ---------- species / growth / stats ---------- */
const mon = id => G.mons[id];
const move = id => G.moves[id] || EXTRA[id];
const EXTRA = { struggle: { n:"Struggle", id:"struggle", t:"Typeless", p:50, pp:1, a:0, pr:0, tg:10, c:0, ail:0, ac:0, hi:[0,0], dr:-25, hl:0, cr:0, fc:0, sc:0, st:[] } };
const byName = {}; Object.entries(G.mons).forEach(([k, m]) => { byName[m.n.toLowerCase()] = +k; });
const sid = n => { const v = byName[n.toLowerCase()]; if (!v) throw new Error("species " + n); return v; };
const GROW = { fast:n=>Math.floor(4*n**3/5), mf:n=>n**3, ms:n=>Math.floor(6*n**3/5-15*n*n+100*n-140), slow:n=>Math.floor(5*n**3/4) };
const expFor = (g, n) => n <= 1 ? 0 : GROW[g](n);
const growthName = { fast:"Fast", mf:"Medium Fast", ms:"Medium Slow", slow:"Slow" };
function calcStats(sp, lv, iv) {
  return mon(sp).b.map((B, i) => i === 0 ? Math.floor((2*B + iv[0]) * lv / 100) + lv + 10 : Math.floor((2*B + iv[i]) * lv / 100) + 5);
}
function movesAt(sp, lv) {
  const out = [];
  for (const [L, id] of mon(sp).l) if (L <= lv) { const i = out.indexOf(id); if (i >= 0) out.splice(i, 1); out.push(id); }
  return out.slice(-4);
}
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const randIV = (rng = Math.random) => Array.from({ length: 6 }, () => Math.floor(rng() * 32));
function newMon(sp, lv = 5, iv = randIV()) {
  const xp = expFor(mon(sp).g, lv);
  return { uid: uid(), sp, lv, xp, xp0: xp, iv, moves: movesAt(sp, lv), nick: "", got: Date.now() };
}
function learnAt(m, lv, res) {
  for (const [L, id] of mon(m.sp).l) if (L === lv && !m.moves.includes(id) && !res.pending.includes(id)) {
    if (m.moves.length < 4) { m.moves.push(id); res.learned.push(id); } else res.pending.push(id);
  }
}
function awardXP(m, amt) {
  const g = mon(m.sp).g, cap = expFor(g, 100);
  const res = { uid: m.uid, from: m.lv, to: m.lv, gained: 0, learned: [], pending: [] };
  if (m.lv >= 100 || amt <= 0) return res;
  const before = m.xp; m.xp = Math.min(cap, m.xp + Math.round(amt)); res.gained = m.xp - before;
  while (m.lv < 100 && m.xp >= expFor(g, m.lv + 1)) { m.lv++; learnAt(m, m.lv, res); }
  res.to = m.lv; return res;
}
function removeXP(m, amt) {
  const g = mon(m.sp).g, floor = m.xp0 ?? expFor(g, 5);
  const before = m.xp; m.xp = Math.max(Math.min(floor, before), m.xp - Math.round(amt));
  while (m.lv > 1 && m.xp < expFor(g, m.lv)) m.lv--;
  return before - m.xp;
}
function evoOptions(m) {
  const e = mon(m.sp).e.filter(x => x.lv <= m.lv);
  if (!e.length) return [];
  if (m.evoNo != null && m.lv <= m.evoNo) return [];
  return e;
}
function evolve(m, to) { const res = { learned: [], pending: [] }; m.sp = to; m.evoNo = null; learnAt(m, m.lv, res); return res; }
function relearnable(m) { const s = new Set(); for (const [L, id] of mon(m.sp).l) if (L <= m.lv && !m.moves.includes(id)) s.add(id); return [...s]; }
function xpProgress(m) {
  const g = mon(m.sp).g; if (m.lv >= 100) return { cur: 1, need: 1, pct: 1, toNext: 0 };
  const a = expFor(g, m.lv), b = expFor(g, m.lv + 1);
  return { cur: m.xp - a, need: b - a, pct: (m.xp - a) / (b - a), toNext: b - m.xp };
}

/* ---------- workout math ---------- */
function setLoad(ex, s, bw) {
  if (!ex) return 0;
  if (ex.kind === "weight") return +s.w || 0;
  if (ex.kind === "bw") return (+s.w || 0) + (bw || 0) * (ex.mod || 0);
  return 0;
}
function sessionVolume(sess, exMap) {
  let v = 0;
  for (const it of sess.items) { const ex = exMap[it.ex]; for (const s of it.sets) if (s.done) v += setLoad(ex, s, sess.bw) * (+s.r || 0); }
  return Math.round(v);
}
const e1rm = (w, r) => r <= 0 ? 0 : r === 1 ? w : w * (1 + r / 30);
/* history index: exId -> [{sid, date, sets:[working done sets], all:[all done sets]}], newest first */
function buildHistory(sessions) {
  const h = {};
  const sorted = [...sessions].sort((a, b) => b.end - a.end);
  for (const s of sorted) for (const it of s.items) {
    const done = it.sets.filter(x => x.done);
    if (!done.length) continue;
    (h[it.ex] = h[it.ex] || []).push({ sid: s.id, date: s.end, bw: s.bw, sets: done.filter(x => !x.warm), all: done });
  }
  return h;
}
function lastFor(hist, exId, excludeSid) {
  for (const e of hist[exId] || []) if (e.sid !== excludeSid && e.sets.length) return e;
  return null;
}
/* PR: not dominated by any prior working set (w'>=w and r'>=r). Needs prior history. */
function isPR(prior, w, r) {
  if (!prior.length || !(r > 0)) return false;
  w = +w || 0;
  return !prior.some(p => (+p.w || 0) >= w && (+p.r || 0) >= r);
}
function priorSetsFor(hist, exId, excludeSid) {
  const out = [];
  for (const e of hist[exId] || []) if (e.sid !== excludeSid) out.push(...e.sets);
  return out;
}

/* ---------- gyms ---------- */
const T = (cls, tier, team) => ({ cls, tier, team: team.map(([n, l]) => [sid(n), l]) });
const GYMS = [
 { name:"Pewter Gym", leader:"Brock", type:"Rock", badge:"Boulder", xp:3000, ladder:[
  T("Camper Liam","easy",[["Geodude",9]]), T("Hiker Marcos","medium",[["Geodude",10],["Sandshrew",11]]),
  T("Picnicker Jana","hard",[["Sandshrew",12],["Diglett",12],["Geodude",13]]), T("Leader Brock","leader",[["Geodude",14],["Onix",16]])]},
 { name:"Cerulean Gym", leader:"Misty", type:"Water", badge:"Cascade", xp:8000, ladder:[
  T("Swimmer Luis","easy",[["Horsea",16],["Shellder",16]]), T("Picnicker Diana","medium",[["Goldeen",18],["Psyduck",18]]),
  T("Swimmer Parker","hard",[["Seel",19],["Poliwag",19],["Krabby",20]]), T("Leader Misty","leader",[["Staryu",20],["Starmie",23]])]},
 { name:"Vermilion Gym", leader:"Lt. Surge", type:"Electric", badge:"Thunder", xp:15000, ladder:[
  T("Sailor Dwayne","easy",[["Voltorb",20],["Pikachu",20]]), T("Engineer Baily","medium",[["Magnemite",21],["Voltorb",21]]),
  T("Gentleman Tucker","hard",[["Pikachu",23],["Magnemite",23],["Pikachu",23]]), T("Leader Lt. Surge","leader",[["Voltorb",23],["Pikachu",24],["Raichu",26]])]},
 { name:"Celadon Gym", leader:"Erika", type:"Grass", badge:"Rainbow", xp:25000, ladder:[
  T("Lass Kay","easy",[["Oddish",25],["Bellsprout",25]]), T("Beauty Bridget","medium",[["Bellsprout",26],["Weepinbell",27]]),
  T("Cooltrainer Mary","hard",[["Gloom",28],["Exeggcute",28],["Tangela",28]]), T("Leader Erika","leader",[["Tangela",30],["Victreebel",31],["Vileplume",33]])]},
 { name:"Fuchsia Gym", leader:"Koga", type:"Poison", badge:"Soul", xp:40000, ladder:[
  T("Juggler Kirk","easy",[["Grimer",34],["Koffing",34]]), T("Tamer Phil","medium",[["Ekans",35],["Arbok",36]]),
  T("Juggler Nate","hard",[["Venonat",37],["Muk",38],["Weezing",38]]), T("Leader Koga","leader",[["Koffing",39],["Muk",39],["Koffing",40],["Weezing",44]])]},
 { name:"Saffron Gym", leader:"Sabrina", type:"Psychic", badge:"Marsh", xp:55000, ladder:[
  T("Psychic Johan","easy",[["Slowpoke",38],["Drowzee",38]]), T("Psychic Tyron","medium",[["Kadabra",40],["Mr. Mime",40]]),
  T("Channeler Amanda","hard",[["Hypno",42],["Slowbro",42],["Kadabra",42]]), T("Leader Sabrina","leader",[["Kadabra",42],["Mr. Mime",43],["Venomoth",41],["Alakazam",46]])]},
 { name:"Cinnabar Gym", leader:"Blaine", type:"Fire", badge:"Volcano", xp:75000, ladder:[
  T("Burglar Quinn","easy",[["Growlithe",40],["Vulpix",40]]), T("Super Nerd Erik","medium",[["Vulpix",42],["Magmar",42]]),
  T("Burglar Ramon","hard",[["Ponyta",43],["Rapidash",44],["Ninetales",44]]), T("Leader Blaine","leader",[["Growlithe",45],["Ponyta",45],["Rapidash",47],["Arcanine",49]])]},
 { name:"Viridian Gym", leader:"Giovanni", type:"Ground", badge:"Earth", xp:100000, ladder:[
  T("Cooltrainer Samuel","easy",[["Sandslash",44],["Dugtrio",44]]), T("Tamer Jason","medium",[["Rhyhorn",46],["Nidorino",46],["Nidorina",46]]),
  T("Cooltrainer Yuji","hard",[["Nidoking",48],["Nidoqueen",48],["Rhyhorn",48]]), T("Leader Giovanni","leader",[["Rhyhorn",48],["Dugtrio",49],["Nidoqueen",50],["Nidoking",50],["Rhydon",53]])]},
];
const TIER = { easy:{ iv:0, label:"Easy", egg:"common" }, medium:{ iv:10, label:"Medium", egg:"common" }, hard:{ iv:20, label:"Hard", egg:"uncommon" }, leader:{ iv:31, label:"Very hard", egg:"rare" } };
const POOLS = {
  common: "Caterpie,Weedle,Pidgey,Rattata,Spearow,Ekans,Sandshrew,Nidoran♀,Nidoran♂,Zubat,Oddish,Paras,Venonat,Diglett,Meowth,Psyduck,Mankey,Poliwag,Bellsprout,Tentacool,Geodude,Magnemite,Doduo,Krabby,Voltorb,Horsea,Goldeen,Shellder,Magikarp".split(",").map(sid),
  uncommon: "Pikachu,Clefairy,Jigglypuff,Vulpix,Growlithe,Abra,Machop,Ponyta,Slowpoke,Seel,Grimer,Gastly,Onix,Drowzee,Exeggcute,Cubone,Koffing,Rhyhorn,Tangela,Staryu,Farfetch'd,Lickitung,Hitmonlee,Hitmonchan,Mr. Mime,Jynx,Electabuzz,Magmar,Pinsir".split(",").map(sid),
  rare: "Bulbasaur,Charmander,Squirtle,Eevee,Dratini,Lapras,Snorlax,Scyther,Kangaskhan,Chansey,Tauros,Porygon,Omanyte,Kabuto,Aerodactyl,Ditto".split(",").map(sid),
};
const EGG = { common:{ label:"Common egg", steps:5000 }, uncommon:{ label:"Uncommon egg", steps:10000 }, rare:{ label:"Rare egg", steps:20000 } };
const MILESTONES = [ { id:"s10", n:10, name:"10 Sessions", xp:5000 }, { id:"s25", n:25, name:"25 Sessions", xp:15000 }, { id:"s50", n:50, name:"50 Sessions", xp:35000 }, { id:"s100", n:100, name:"100 Sessions", xp:75000 } ];

/* ---------- battle engine (Gen 3 rules, simplified edge cases) ---------- */
const STG = n => n >= 0 ? (2 + n) / 2 : 2 / (2 - n);
const ACC = n => n >= 0 ? (3 + n) / 3 : 3 / (3 - n);
const CRIT = [1/16, 1/8, 1/4, 1/3, 1/2];
const CHARGE = new Set(["solar-beam","razor-wind","skull-bash","sky-attack","dig","fly"]);
const FIXED = { "dragon-rage":()=>40, "sonic-boom":()=>20, "seismic-toss":(u)=>u.lv, "night-shade":(u)=>u.lv, "super-fang":(u,t)=>Math.max(1,Math.floor(t.hp/2)) };
const SELF_TG = new Set([3, 4, 5, 7, 13, 15]);
const STATK = { 2:"atk", 3:"def", 4:"spa", 5:"spd", 6:"spe", 7:"acc", 8:"eva" };
const STATN = { atk:"Attack", def:"Defense", spa:"Sp. Atk", spd:"Sp. Def", spe:"Speed", acc:"accuracy", eva:"evasiveness" };
const STATUSN = { par:"paralyzed", slp:"asleep", frz:"frozen", brn:"burned", psn:"poisoned" };

function battler(src, side) {
  const st = calcStats(src.sp, src.lv, src.iv);
  return { side, uid: src.uid || uid(), sp: src.sp, name: src.nick || mon(src.sp).n, lv: src.lv, types: mon(src.sp).t.slice(),
    st, maxhp: st[0], hp: st[0], moves: src.moves.map(id => ({ id, pp: move(id).pp })), status: null, slp: 0,
    stg: { atk:0, def:0, spa:0, spd:0, spe:0, acc:0, eva:0 }, conf: 0, seeded: false, charging: null, recharge: false, focus: false, fainted: false };
}
function newBattle(myMons, gymIdx, oppIdx, rng = Math.random) {
  const opp = GYMS[gymIdx].ladder[oppIdx], iv = TIER[opp.tier].iv;
  return { gymIdx, oppIdx, tier: opp.tier, foe: opp.cls, rng, turn: 0, over: null,
    mine: myMons.map(m => battler(m, "me")), theirs: opp.team.map(([sp, lv]) => battler({ sp, lv, iv: Array(6).fill(iv), moves: movesAt(sp, lv) }, "foe")),
    a: 0, b: 0, screens: { me:{ ref:0, ls:0 }, foe:{ ref:0, ls:0 } }, dmgLog: [], switchedOnce: {} };
}
const effSpe = m => m.st[5] * STG(m.stg.spe) * (m.status === "par" ? 0.25 : 1);
function usable(m) { const u = m.moves.filter(x => x.pp > 0); return u.length ? u : null; }

function estDamage(B, u, t, mid) {
  const mv = move(mid); if (!mv) return 0;
  if (FIXED[mv.id]) return FIXED[mv.id](u, t);
  if (!mv.p) return 0;
  const p = mv.id === "low-kick" ? 60 : mv.p;
  const phys = PHYS.has(mv.t);
  const A = (phys ? u.st[1] * STG(u.stg.atk) : u.st[3] * STG(u.stg.spa)) * (phys && u.status === "brn" ? .5 : 1);
  const D = phys ? t.st[2] * STG(t.stg.def) : t.st[4] * STG(t.stg.spd);
  const base = Math.floor(Math.floor(Math.floor(2 * u.lv / 5 + 2) * p * A / D) / 50) + 2;
  const stab = u.types.includes(mv.t) ? 1.5 : 1;
  const hits = mv.hi[1] ? (mv.hi[0] + mv.hi[1]) / 2 : 1;
  return base * stab * eff(mv.t, t.types) * 0.925 * hits * ((mv.a || 100) / 100);
}
function aiChoose(B) {
  const me = B.theirs[B.b], tgt = B.mine[B.a], r = B.rng;
  const u = usable(me);
  if (!u) return { kind: "move", id: "struggle" };
  if (B.tier === "easy") return { kind: "move", id: u[Math.floor(r() * u.length)].id };
  const scored = u.map(x => {
    const mv = move(x.id); let s = estDamage(B, me, tgt, x.id);
    if (!mv.p && !FIXED[mv.id]) {
      if ([1,5].includes(mv.c) && mv.ail && !tgt.status && mv.ail !== 6) s = tgt.hp * 0.25;
      else if (mv.c === 1 && mv.ail === 6 && !tgt.conf) s = tgt.hp * 0.15;
      else if (mv.c === 2) s = me.hp > me.maxhp * 0.6 ? tgt.hp * 0.12 : 1;
      else if (mv.c === 3) s = me.hp < me.maxhp * 0.5 ? me.maxhp * 0.4 : 0;
      else s = 1;
      if (B.tier === "medium") s *= 0.5;
    }
    return { id: x.id, s };
  }).sort((a, b) => b.s - a.s);
  if (B.tier === "leader" && !B.switchedOnce[me.uid]) {
    const threat = Math.max(...tgt.moves.filter(x => x.pp > 0).map(x => move(x.id).p ? eff(move(x.id).t, me.types) : 1), 1);
    if (threat >= 2 && me.hp < me.maxhp) {
      let best = -1, bs = 0;
      B.theirs.forEach((o, i) => { if (i === B.b || o.fainted) return;
        const worst = Math.max(...tgt.moves.map(x => move(x.id).p ? eff(move(x.id).t, o.types) : 1), 0);
        if (worst <= 1 && (o.hp / o.maxhp) > 0.5) { const sc = 2 - worst + o.hp / o.maxhp; if (sc > bs) { bs = sc; best = i; } } });
      if (best >= 0 && r() < 0.6) { B.switchedOnce[me.uid] = true; return { kind: "switch", to: best }; }
    }
  }
  if (B.tier === "medium" && r() < 0.3) return { kind: "move", id: u[Math.floor(r() * u.length)].id };
  return { kind: "move", id: scored[0].id };
}

/* Run one turn. myAct: {kind:'move',id}|{kind:'switch',to}. Returns events [{msg, snap}] */
function runTurn(B, myAct) {
  const ev = [], r = B.rng;
  const snap = () => ({ a: B.a, b: B.b, mine: B.mine.map(m => [m.hp, m.status]), theirs: B.theirs.map(m => [m.hp, m.status]) });
  const say = msg => ev.push({ msg, snap: snap() });
  const foeAct = B.theirs[B.b].recharge || B.theirs[B.b].charging ? { kind: "move", id: B.theirs[B.b].charging || "__recharge" } : aiChoose(B);
  const mineCur = B.mine[B.a];
  if (mineCur.recharge || mineCur.charging) myAct = { kind: "move", id: mineCur.charging || "__recharge" };
  B.turn++;
  const acts = [{ side: "me", act: myAct }, { side: "foe", act: foeAct }];
  // switches first
  for (const x of acts) if (x.act.kind === "switch") doSwitch(B, x.side, x.act.to, say);
  const movers = acts.filter(x => x.act.kind === "move");
  movers.sort((x, y) => {
    const ux = cur(B, x.side), uy = cur(B, y.side);
    const px = move(x.act.id)?.pr || 0, py = move(y.act.id)?.pr || 0;
    if (px !== py) return py - px;
    const sx = effSpe(ux), sy = effSpe(uy);
    return sx !== sy ? sy - sx : (r() < .5 ? -1 : 1);
  });
  let firstDone = false;
  for (const x of movers) {
    const u = cur(B, x.side), t = cur(B, x.side === "me" ? "foe" : "me");
    if (u.fainted || B.over) continue;
    useMove(B, u, t, x.act.id, say, !firstDone);
    firstDone = true;
    checkFaint(B, say);
    if (B.over) break;
  }
  // end of turn
  if (!B.over) for (const side of ["me", "foe"]) {
    const m = cur(B, side); if (m.fainted) continue;
    if (m.status === "brn" || m.status === "psn") { const d = Math.max(1, Math.floor(m.maxhp / 8)); m.hp = Math.max(0, m.hp - d); say(`${pfx(m)} is hurt by its ${m.status === "brn" ? "burn" : "poison"}!`); }
    if (m.seeded && m.hp > 0) { const o = cur(B, side === "me" ? "foe" : "me"); const d = Math.max(1, Math.floor(m.maxhp / 8)); const dd = Math.min(d, m.hp); m.hp -= dd; if (!o.fainted) o.hp = Math.min(o.maxhp, o.hp + dd); say(`${pfx(m)}'s health is sapped by Leech Seed!`); }
    checkFaint(B, say);
  }
  for (const s of ["me", "foe"]) for (const k of ["ref", "ls"]) if (B.screens[s][k] > 0) B.screens[s][k]--;
  return ev;
}
const cur = (B, side) => side === "me" ? B.mine[B.a] : B.theirs[B.b];
const pfx = m => (m.side === "foe" ? "The foe's " : "") + m.name;
function doSwitch(B, side, to, say) {
  const old = cur(B, side);
  old.stg = { atk:0, def:0, spa:0, spd:0, spe:0, acc:0, eva:0 }; old.conf = 0; old.seeded = false; old.charging = null; old.recharge = false; old.focus = false;
  if (side === "me") { B.a = to; say(`Come back, ${old.name}! Go, ${B.mine[to].name}!`); }
  else { B.b = to; say(`${B.foe} sent out ${B.theirs[to].name}!`); }
}
function checkFaint(B, say) {
  for (const side of ["me", "foe"]) {
    const m = cur(B, side);
    if (m.hp <= 0 && !m.fainted) { m.hp = 0; m.fainted = true; m.status = null; say(`${pfx(m)} fainted!`); }
  }
  if (B.theirs.every(m => m.fainted)) { B.over = "win"; say(`You defeated ${B.foe}!`); return; }
  if (B.mine.every(m => m.fainted)) { B.over = "loss"; say(`You have no more Pokémon that can fight!`); return; }
  const f = B.theirs[B.b];
  if (f.fainted) { const n = B.theirs.findIndex(m => !m.fainted); B.b = n; say(`${B.foe} sent out ${B.theirs[n].name}!`); }
  // my faint handled by UI (needs choice)
}
function applyStatus(t, ail, say, srcMove) {
  if (ail === 6) { if (t.conf) { if (!srcMove.p) say(`${pfx(t)} is already confused!`); return; } t.conf = 2 + Math.floor(Math.random() * 4); say(`${pfx(t)} became confused!`); return; }
  const map = { 1:"par", 2:"slp", 3:"frz", 4:"brn", 5:"psn" }; const s = map[ail]; if (!s) return;
  if (t.status) { if (!srcMove.p) say(`${pfx(t)} is already ${STATUSN[t.status]}!`); return; }
  if ((s === "psn" && (t.types.includes("Poison") || t.types.includes("Steel"))) || (s === "brn" && t.types.includes("Fire")) || (s === "frz" && t.types.includes("Ice")) || (s === "par" && srcMove.t === "Electric" && t.types.includes("Ground"))) { if (!srcMove.p) say(`It doesn't affect ${pfx(t)}...`); return; }
  t.status = s; if (s === "slp") t.slp = 2 + Math.floor(Math.random() * 4);
  say(`${pfx(t)} ${s === "slp" ? "fell asleep" : s === "frz" ? "was frozen solid" : "is " + STATUSN[s]}!`);
}
function applyStages(m, changes, say) {
  for (const [sid_, ch] of changes) { const k = STATK[sid_]; if (!k) continue;
    const before = m.stg[k]; m.stg[k] = Math.max(-6, Math.min(6, before + ch));
    if (m.stg[k] === before) say(`${pfx(m)}'s ${STATN[k]} won't go ${ch > 0 ? "higher" : "lower"}!`);
    else say(`${pfx(m)}'s ${STATN[k]} ${ch > 0 ? (ch > 1 ? "sharply rose" : "rose") : (ch < -1 ? "harshly fell" : "fell")}!`);
  }
}
function useMove(B, u, t, mid, say, first) {
  const r = B.rng;
  if (mid === "__recharge") { u.recharge = false; say(`${pfx(u)} must recharge!`); return; }
  if (u.status === "frz") { if (r() < .2) { u.status = null; say(`${pfx(u)} thawed out!`); } else { say(`${pfx(u)} is frozen solid!`); return; } }
  if (u.status === "slp") { u.slp--; if (u.slp <= 0) { u.status = null; say(`${pfx(u)} woke up!`); } else { say(`${pfx(u)} is fast asleep.`); u.charging = null; return; } }
  if (u.flinch) { u.flinch = false; say(`${pfx(u)} flinched!`); return; }
  if (u.conf) { u.conf--; if (!u.conf) say(`${pfx(u)} snapped out of confusion!`); else { say(`${pfx(u)} is confused!`); if (r() < .5) { const d = Math.max(1, Math.floor(Math.floor(Math.floor(2*u.lv/5+2)*40*u.st[1]/u.st[2])/50)+2); u.hp = Math.max(0, u.hp - d); say(`It hurt itself in its confusion!`); return; } } }
  if (u.status === "par" && r() < .25) { say(`${pfx(u)} is fully paralyzed!`); u.charging = null; return; }
  let mv = move(mid);
  if (!u.charging) { const slot = u.moves.find(x => x.id === mid); if (slot) slot.pp = Math.max(0, slot.pp - 1); }
  if (mv.id === "metronome") { say(`${pfx(u)} used Metronome!`); const keys = Object.keys(G.moves).filter(k => G.moves[k].id !== "metronome"); mv = G.moves[keys[Math.floor(r() * keys.length)]]; }
  if (CHARGE.has(mv.id) && u.charging !== mid) { u.charging = mid; say(`${pfx(u)} is ${mv.id === "solar-beam" ? "taking in sunlight" : mv.id === "dig" ? "digging underground" : mv.id === "fly" ? "flying up high" : "charging up"}!`); return; }
  u.charging = null;
  say(`${pfx(u)} used ${mv.n}!`);
  if (t.fainted && !SELF_TG.has(mv.tg)) { say("But there was no target..."); return; }
  const selfTarget = SELF_TG.has(mv.tg);
  if (!selfTarget && mv.a && !(r() * 100 < mv.a * ACC(u.stg.acc - t.stg.eva))) { say(`${pfx(u)}'s attack missed!`); return; }
  // special no-damage moves
  switch (mv.id) {
    case "rest": if (u.hp === u.maxhp) { say("But it failed!"); return; } u.hp = u.maxhp; u.status = "slp"; u.slp = 3; say(`${pfx(u)} slept and became healthy!`); return;
    case "reflect": case "light-screen": { const k = mv.id === "reflect" ? "ref" : "ls"; if (B.screens[u.side][k]) { say("But it failed!"); return; } B.screens[u.side][k] = 5; say(`${mv.n} raised your team's ${k === "ref" ? "Defense" : "Sp. Def"}!`.replace("your", u.side === "me" ? "your" : "the foe's")); return; }
    case "haze": for (const m of [u, t]) m.stg = { atk:0, def:0, spa:0, spd:0, spe:0, acc:0, eva:0 }; say("All stat changes were eliminated!"); return;
    case "focus-energy": u.focus = true; say(`${pfx(u)} is getting pumped!`); return;
    case "leech-seed": if (t.types.includes("Grass") || t.seeded) { say(`It doesn't affect ${pfx(t)}...`); return; } t.seeded = true; say(`${pfx(t)} was seeded!`); return;
  }
  let did = 0;
  if (mv.p || FIXED[mv.id]) {
    const e = FIXED[mv.id] ? (eff(mv.t, t.types) === 0 ? 0 : 1) : (mv.t === "Typeless" ? 1 : eff(mv.t, t.types));
    if (e === 0) { say(`It doesn't affect ${pfx(t)}...`); return; }
    if (mv.c === 9) { if (t.lv > u.lv) { say("But it failed!"); return; } did = t.hp; t.hp = 0; say("It's a one-hit KO!"); }
    else {
      let hits = 1; if (mv.hi[1]) { if (mv.hi[0] === mv.hi[1]) hits = mv.hi[0]; else { const x = r(); hits = x < .375 ? 2 : x < .75 ? 3 : x < .875 ? 4 : 5; } }
      let n = 0;
      for (let i = 0; i < hits && t.hp > 0; i++) {
        let d; let crit = false;
        if (FIXED[mv.id]) d = FIXED[mv.id](u, t);
        else {
          const cs = Math.min(4, (mv.cr || 0) + (u.focus ? 2 : 0)); crit = r() < CRIT[cs];
          const p = mv.id === "low-kick" ? 60 : mv.p * (["self-destruct","explosion"].includes(mv.id) ? 2 : 1);
          const phys = mv.t === "Typeless" ? true : PHYS.has(mv.t);
          const as = phys ? u.stg.atk : u.stg.spa, ds = phys ? t.stg.def : t.stg.spd;
          const A = (phys ? u.st[1] : u.st[3]) * STG(crit ? Math.max(0, as) : as);
          const D = (phys ? t.st[2] : t.st[4]) * STG(crit ? Math.min(0, ds) : ds);
          let base = Math.floor(Math.floor(Math.floor(2 * u.lv / 5 + 2) * p * A / D) / 50);
          if (phys && u.status === "brn") base = Math.floor(base / 2);
          if (!crit && B.screens[t.side][phys ? "ref" : "ls"]) base = Math.floor(base / 2);
          base += 2;
          if (crit) base *= 2;
          base = Math.floor(base * (85 + Math.floor(r() * 16)) / 100);
          if (u.types.includes(mv.t)) base = Math.floor(base * 1.5);
          d = Math.max(1, Math.floor(base * e));
        }
        d = Math.min(d, t.hp); t.hp -= d; did += d; n++;
        if (crit) say("A critical hit!");
      }
      if (!FIXED[mv.id]) { if (e > 1) say("It's super effective!"); else if (e < 1) say("It's not very effective..."); }
      if (hits > 1) say(`Hit ${n} time${n > 1 ? "s" : ""}!`);
      if (t.status === "frz" && mv.t === "Fire") { t.status = null; say(`${pfx(t)} thawed out!`); }
    }
    if (u.side === "foe") B.dmgLog.push({ by: u.sp, move: mv.id, to: u.side === "foe" ? t.sp : null, dmg: did, eff: eff(mv.t, t.types) });
    if (mv.dr > 0 && did) { const h = Math.max(1, Math.floor(did * mv.dr / 100)); u.hp = Math.min(u.maxhp, u.hp + h); say(`${pfx(t)} had its energy drained!`); }
    if (mv.dr < 0 && did) { const h = Math.max(1, Math.floor(did * -mv.dr / 100)); u.hp = Math.max(0, u.hp - h); say(`${pfx(u)} is hit with recoil!`); }
    if (["self-destruct","explosion"].includes(mv.id)) u.hp = 0;
    if (mv.id === "hyper-beam" && t.hp > 0) u.recharge = true;
    if (t.hp > 0) {
      if (mv.c === 4 && mv.ail && mv.ail !== 8 && r() * 100 < (mv.ac || 100)) applyStatus(t, mv.ail, say, mv);
      if (mv.c === 6 && mv.st.length && r() * 100 < (mv.sc || 100)) applyStages(t, mv.st, say);
      if (mv.fc && first && r() * 100 < mv.fc) t.flinch = true;
    }
    if (mv.c === 7 && mv.st.length && r() * 100 < (mv.sc || 100)) applyStages(u, mv.st, say);
    return;
  }
  // non-damaging
  if (mv.c === 1) { if (mv.ail && [1,2,3,4,5,6].includes(mv.ail)) { if (mv.t === "Electric" && eff("Electric", t.types) === 0) { say(`It doesn't affect ${pfx(t)}...`); return; } applyStatus(t, mv.ail, say, mv); } else say("But nothing happened!"); return; }
  if (mv.c === 2 && mv.st.length) { applyStages(selfTarget ? u : t, mv.st, say); return; }
  if (mv.c === 3 && mv.hl) { if (u.hp === u.maxhp) { say("But it failed!"); return; } u.hp = Math.min(u.maxhp, u.hp + Math.floor(u.maxhp * mv.hl / 100)); say(`${pfx(u)} regained health!`); return; }
  if (mv.c === 5) { applyStages(t, mv.st, say); applyStatus(t, 6, say, mv); return; }
  say("But nothing happened!");
}
function lossInsight(B) {
  const top = [...B.dmgLog].sort((a, b) => b.dmg - a.dmg)[0];
  if (!top) return null;
  return `${mon(top.by).n}'s ${move(top.move).n} hit hardest${top.eff > 1 ? " (super effective)" : ""}.`;
}

return { G, TYPES, TC, eff, mon, move, sid, expFor, growthName, calcStats, movesAt, newMon, randIV, uid, awardXP, removeXP, evoOptions, evolve, relearnable, xpProgress,
  setLoad, sessionVolume, e1rm, buildHistory, lastFor, isPR, priorSetsFor,
  GYMS, TIER, POOLS, EGG, MILESTONES, newBattle, runTurn, aiChoose, doSwitch, effSpe, estDamage, lossInsight, battler };
})();
