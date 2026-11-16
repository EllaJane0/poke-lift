# Usage: python3 scripts/build-data.py <folder of PokeAPI CSVs from github.com/PokeAPI/pokeapi/tree/master/data/v2/csv> [output.json]
import csv,json,sys,collections
D=sys.argv[1]
def rd(n): return list(csv.DictReader(open(f"{D}/{n}.csv")))
TYPES={int(r['id']):r['identifier'].capitalize() for r in rd('types')}
sp={int(r['id']):r for r in rd('pokemon_species') if int(r['id'])<=151}
# types (gen3)
ty=collections.defaultdict(list)
for r in rd('pokemon_types'):
  p=int(r['pokemon_id'])
  if p<=151: ty[p].append((int(r['slot']),int(r['type_id'])))
past=collections.defaultdict(list)
for r in rd('pokemon_types_past'):
  p=int(r['pokemon_id']);g=int(r['generation_id'])
  if p<=151 and g>=3: past[(p,g)].append((int(r['slot']),int(r['type_id'])))
for p in range(1,152):
  gs=sorted(g for (q,g) in past if q==p)
  if gs: ty[p]=past[(p,gs[0])]
# stats (gen3)
st=collections.defaultdict(dict)
for r in rd('pokemon_stats'):
  p=int(r['pokemon_id'])
  if p<=151: st[p][int(r['stat_id'])]=int(r['base_stat'])
pst=collections.defaultdict(dict)
for r in rd('pokemon_stats_past'):
  p=int(r['pokemon_id']);g=int(r['generation_id']);s=int(r['stat_id'])
  if p<=151 and g>=3 and s<=6: pst[(p,s)][g]=int(r['base_stat'])
for (p,s),gm in pst.items(): st[p][s]=gm[min(gm)]
GR={1:'slow',2:'mf',3:'fast',4:'ms'}
# evolutions
evo=collections.defaultdict(list)
for r in rd('pokemon_evolution'):
  t=int(r['evolved_species_id'])
  if t>151: continue
  f=int(sp[t]['evolves_from_species_id'])
  trig=int(r['evolution_trigger_id'])
  if trig==1 and r['minimum_level']: lv=int(r['minimum_level']);how='level'
  elif trig==3: lv=30;how='stone'
  elif trig==2: lv=40;how='trade'
  else: continue
  if not any(e['to']==t for e in evo[f]): evo[f].append({'to':t,'lv':lv,'how':how})
# learnsets FRLG
ls=collections.defaultdict(set)
for r in rd('pokemon_moves'):
  if r['version_group_id']=='7' and r['pokemon_move_method_id']=='1':
    p=int(r['pokemon_id'])
    if p<=151: ls[p].add((max(1,int(r['level'] or 1)),int(r['move_id'])))
used={m for s in ls.values() for _,m in s}
mv={int(r['id']):r for r in rd('moves')}
chg=collections.defaultdict(list)
for r in rd('move_changelog'): chg[int(r['move_id'])].append(r)
meta={int(r['move_id']):r for r in rd('move_meta')}
sc=collections.defaultdict(list)
for r in rd('move_meta_stat_changes'): sc[int(r['move_id'])].append([int(r['stat_id']),int(r['change'])])
def nm(s):
  return ' '.join(w.capitalize() for w in s.split('-'))
moves={}
for m in sorted(used):
  r=dict(mv[m])
  for f in ['type_id','power','pp','accuracy','priority','target_id','effect_chance']:
    rows=sorted([c for c in chg[m] if int(c['changed_in_version_group_id'])>7 and c[f]!=''],key=lambda c:int(c['changed_in_version_group_id']))
    if rows: r[f]=rows[0][f]
  mt=meta.get(m,{})
  g=lambda k:int(mt.get(k) or 0)
  moves[m]={'n':nm(r['identifier']),'id':r['identifier'],'t':TYPES[int(r['type_id'])],'p':int(r['power'] or 0),'pp':int(r['pp'] or 0),
    'a':int(r['accuracy']) if r['accuracy'] else 0,'pr':int(r['priority'] or 0),'tg':int(r['target_id']),
    'c':g('meta_category_id'),'ail':g('meta_ailment_id'),'ac':g('ailment_chance'),'hi':[g('min_hits'),g('max_hits')],
    'dr':g('drain'),'hl':g('healing'),'cr':g('crit_rate'),'fc':g('flinch_chance'),'sc':g('stat_chance'),'st':sc.get(m,[])}
def pname(s):
  return {'nidoran-f':'Nidoran♀','nidoran-m':'Nidoran♂','mr-mime':'Mr. Mime','farfetchd':"Farfetch'd"}.get(s,s.capitalize())
mons={}
for p in range(1,152):
  s=sp[p]
  mons[p]={'n':pname(s['identifier']),'t':[TYPES[t] for _,t in sorted(ty[p])],
   'b':[st[p][i] for i in range(1,7)],'g':GR[int(s['growth_rate_id'])],
   'e':evo.get(p,[]),'l':sorted([list(x) for x in ls[p]])}
json.dump({'mons':mons,'moves':moves},open(sys.argv[2] if len(sys.argv)>2 else 'data/game-data.json','w'),separators=(',',':'),ensure_ascii=False)
print(len(moves),'moves')
for p in [1,25,35,64,81,122,133,150]: print(p,mons[p]['n'],mons[p]['t'],mons[p]['b'],mons[p]['g'],mons[p]['e'],len(mons[p]['l']))
