/* Simulador de estrés: usa al azar las acciones de Nación, seguridad y sociedad en muchos países y escenarios.
   Vigila errores, NaN, indicadores fuera de rango, decisiones atascadas y que guardar → cargar → guardar sea idéntico.
   Uso: npm run fuzz   (FUZZ_TURNS=45 FUZZ_SEED=12345 para cambiarlo). Sale con código 1 si algo falla. */
(0, eval)(require('fs').readFileSync(require('path').join(__dirname, 'dist', 'core.js'), 'utf8')); const G=WL.Game; WL.Bus.h={}; const D=WL.DATA;
const errs={}, seen={}; let games=0, turns=0, stuck=0, saveDiff=0, nanHits=0;
const oc=console.error; console.error=(...a)=>{ const k=String(a.join(' ')).slice(0,160); errs[k]=(errs[k]||0)+1; };
const ow=console.warn; console.warn=()=>{};
let rs=+process.env.FUZZ_SEED||12345; const rnd=()=>{ rs=(rs*1664525+1013904223)>>>0; return rs/4294967296; }; const pk=a=>a[Math.floor(rnd()*a.length)];
function scan(o,path,d){ if(d>6||o==null) return; if(typeof o==='number'){ if(!isFinite(o)){ nanHits++; seen['NaN '+path]=1; } return; } if(typeof o!=='object') return; for(const k in o) scan(o[k],path+'.'+k,d+1); }
const isos=['MX','CO','BR','NG','US','DE','ES','IR','IN','RU','CN','JP','ZA','TR','AR','SO','HT','UA','EG','PK'];
const scens=[undefined,'tension','caos','invierno'];
for (const iso of isos) for (const sc of scens) { const seed=Math.floor(rnd()*9999); try { G.newGame({iso,name:'F',seed,setup:sc?{scen:sc}:undefined}); } catch(e){ errs['newGame '+iso+sc+' '+e.message]=1; continue; } games++; const q=G.q;
  for (let t=0;t<(+process.env.FUZZ_TURNS||45);t++){ const S=G.S; if(S.over) break; S.pol.cp=Math.max(S.pol.cp,5);
    const N=q.natInfo(), Sc=q.secInfo(), So=q.socInfo(); const ri=n=>Math.floor(rnd()*n);
    const acts=[()=>G.act('natBud',{k:pk(['seg','edu','sal','inf','soc']),v:rnd()*2}),()=>G.act('natPay',{v:.5+rnd()*1.5}),()=>G.act('natEquip'),()=>G.act('natPurge'),
      ()=>N.army.length&&rnd()<.5?G.act('natArmy',{i:pk(N.army)}):G.act('natArmy',{i:ri(S.c[iso].terr.length)}),()=>N.cart.length&&G.act('cartel',{id:pk(N.cart).id,how:pk(['guerra','fin','pacto'])}),()=>rnd()<.1&&G.act('natLegal'),
      ()=>G.act('secSurv',{v:ri(3)}),()=>G.act('secDir'),()=>G.act('secOp',{k:pk(['inf','caza','corr']),id:N.cart.length?pk(N.cart).id:0}),()=>G.act('brMod',{k:pk(['tierra','mar','aire'])}),()=>G.act('brChief',{k:pk(['tierra','mar','aire'])}),
      ()=>G.act('socLead',{k:pk(Object.keys(D.DEBATES)),dir:rnd()<.5?1:-1}),()=>G.act('proposeLaw',{id:pk(D.LAWS).id}),()=>G.act('repealLaw',{id:pk(Object.keys(S.pol.laws).concat(['x']))})];
    for (let i=0;i<4;i++){ try{ const r=pk(acts)(); if(r&&r.ok===false&&/undefined|NaN|TypeError|Cannot/.test(r.msg||'')) errs['act msg '+r.msg]=1; }catch(e){ errs['ACT '+e.message.slice(0,120)]=(errs['ACT '+e.message.slice(0,120)]||0)+1; } }
    let j=0; while(S.pend.length&&j++<25){ const p=S.pend[0]; seen['pend '+(p.id||p.k)]=(seen['pend '+(p.id||p.k)]||0)+1; if(p.k==='summit'){ G.act('summitYear',{meet:[],topic:'clima'}); continue; } const r=G.act('decide',{i:ri(p.opts?p.opts.length:1)}); if(!r.ok){ const r2=G.act('decide',{i:0}); if(!r2.ok) S.pend.shift(); } }
    if(S.pend.length) stuck++;
    try{ const r=G.act('endTurn'); if(!r.ok&&!S.over) errs['endTurn '+r.msg]=(errs['endTurn '+r.msg]||0)+1; }catch(e){ errs['END '+e.message.slice(0,140)]=(errs['END '+e.message.slice(0,140)]||0)+1; break; } turns++;
    if(t%9===0){ scan(G.S,'S',0); const n=q.natInfo(); for(const x in n.ix) if(n.ix[x].v<0||n.ix[x].v>100) seen['rango nat '+x]=1; for(const k of n.cart) if(k.str<0||k.str>100) seen['rango cartel']=1; const so=q.socInfo(); for(const d of so.deb) if(d.op<-100||d.op>100||d.mv<0||d.mv>100) seen['rango soc']=1;
      const sv=G.save(); const ok=G.load(sv); if(!ok.ok) errs['load '+ok.msg]=1; else if(G.save()!==sv){ saveDiff++; } } } }
console.error=oc; console.log('partidas',games,'turnos',turns,'| decisiones atascadas',stuck,'| save≠load',saveDiff,'| NaN',nanHits); console.log('ERRORES',JSON.stringify(errs,null,1).slice(0,2500)); console.log('visto',JSON.stringify(seen).slice(0,1500));
process.exit(Object.keys(errs).length||stuck||saveDiff||nanHits||Object.keys(seen).some(k=>/^(NaN|rango)/.test(k))?1:0);
