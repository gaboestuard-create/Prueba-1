/* =====================================================================
   INTERFAZ · FASE 4: PULIDO, SONIDO Y "GAME FEEL"
   Ajustes, música según el estado del mundo, capas de mapa con
   transición, efectos por suceso, modo observador, intro y momentos
   clave, números que cuentan, periódico por turno, ayuda táctil,
   glosario, asesores, diario y legado, ranuras de guardado con
   recuperación, manejo de errores y editor de pruebas.
   ===================================================================== */
const LL = iso => { const c = D.C[iso]; return c ? [c.lat, c.lon] : null; };
const fxAt = (kind, iso) => { const p = LL(iso); if (p) Globe.fx(kind, p[0], p[1]); };
const fxReg = (kind, k) => { try { const g = Q.rGeo(k); Globe.fx(kind, g.la, g.lo); } catch (e) { } };

/* ---------- arranque, errores y render a prueba de fallos ---------- */
applyCfg();
{ const qT = setInterval(() => { if (!Globe.ready) return; clearInterval(qT); applyCfg(); wrapPaint(); }, 400); }
let errT = 0;
function softError(msg) { if (Date.now() - errT < 4000) return; errT = Date.now(); console.error('[World Leader]', msg);
  const d = document.createElement('div'); d.className = 'errcard glass'; d.innerHTML = `${ic('bad')}<div><b>Algo falló, pero tu partida está a salvo.</b><small>${esc(String(msg).slice(0, 140))}</small></div><button class="btn sm gold" data-a="recover">Recuperar</button>`;
  document.body.appendChild(d); setTimeout(() => d.remove(), 12000); }
window.addEventListener('error', e => softError(e.message || 'Error desconocido'));
window.addEventListener('unhandledrejection', e => softError((e.reason && e.reason.message) || 'Promesa rechazada'));
H.recover = () => { document.querySelectorAll('.errcard').forEach(x => x.remove()); SQ.length = 0; sqRun = false; UI.busy = false; UI.turnBuf = null; UI.cineEnd = null; const c = $('#cine'); if (c) c.hidden = true; closeModal(); UI.panel = null; UI.render(); refreshMap(); if (S() && S().pend.length) showPending(); };
{ const r0 = UI.render; UI.render = () => { try { r0(); } catch (e) { softError('Pantalla: ' + e.message); } try { Sfx.refresh(); afterRender(); } catch (e) { } }; }

/* ---------- música adaptativa: el estado del mundo decide la banda sonora ---------- */
function moodNow() { const s = S(); if (!s || UI.screen !== 'game') return 'paz'; if (s.over) return 'derrota'; const p = me(), w = Q.warsOf(p);
  if (w.length) return Q.warScoreFor(p) > 40 ? 'victoria' : 'guerra'; const c = CC(p), a = Q.alerts();
  if ((s.eco && s.eco.cri) || c.stab < 30 || Q.approval() < 28 || c.tr < -c.gdp * .1) return 'crisis';
  if (a.some(x => x.p >= 4) || (s.war3 && s.war3.alert >= 2) || Q.deterrence().some(d => d.risk === 'alto')) return 'tension'; return 'paz'; }
let moodLock = 0; const setMood = () => { if (Date.now() > moodLock) Sfx.mood(moodNow()); };
Bus.on('turn', setMood); Bus.on('state', () => { clearTimeout(UI.moodT); UI.moodT = setTimeout(setMood, 400); });
Bus.on('peace', p => { if (S() && (p.a === me() || p.d === me())) { Sfx.mood('victoria'); moodLock = Date.now() + 20000; } });
Bus.on('over', () => { Sfx.mood('derrota'); Sfx.play('over'); moodLock = Date.now() + 1e9; });
Bus.on('election', e => Sfx.play(e.win ? 'elecWin' : 'elecLose'));

/* ---------- capas del mapa: recursos y estabilidad, transición animada, leyenda, países sancionados apagados ---------- */
Object.assign(MODES, { rec: 'Recursos', est: 'Estabilidad' });
Object.assign(LEGEND, { rec: 'Riqueza en materias primas: de gris (nada) a ámbar (potencia minera)', est: 'Estabilidad: rojo (al borde del colapso) → verde (sólido)' });
{ const c0 = colorOf; colorOf = (iso, mode, ctx) => { const c = CC(iso);
  let col = mode === 'rec' ? ramp([[60, 64, 76], [96, 92, 70], [196, 150, 60], [255, 206, 90]], Object.values(c.rec || {}).reduce((a, b) => a + b, 0) / 14)
    : mode === 'est' ? ramp([[200, 40, 40], [220, 150, 60], [200, 200, 90], [70, 190, 120]], c.stab / 100) : c0(iso, mode, ctx);
  if ((mode === 'pol' || mode === 'rel') && iso !== me() && S()) { const n = S().sanc.filter(x => x.on === iso).length; if (Q.sanctioned(me(), iso) || n >= 3) col = col.map(v => v * (Q.sanctioned(me(), iso) ? .42 : .65)); } // sancionados: «apagados»
  return col; }; }
function wrapPaint() { const gp = Globe.paint; let last = null, lastMode = null, raf = 0;
  Globe.paint = (cols, wars, over) => { cancelAnimationFrame(raf); if (CFG.rm || !last || lastMode === UI.mode) { gp(cols, wars, over); last = cols; lastMode = UI.mode; return; }
    const from = last, t0 = performance.now(); lastMode = UI.mode; last = cols;
    const step = now => { const k = Math.min(1, (now - t0) / 420), e = k * (2 - k), mix = {}; for (const i in cols) { const a = from[i] || cols[i], b = cols[i]; mix[i] = [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e]; } gp(mix, wars, over); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); };
  refreshMap(); }
const LGRAD = { pol: 'linear-gradient(90deg,#6a7aa0,#a0768a,#7aa08a,#e2b43a)', rel: 'linear-gradient(90deg,#cd342c,#d6963e,#b0aa60,#46be78)', mil: 'linear-gradient(90deg,#2c285c,#783c96,#d6546e,#ffa03c)', eco: 'linear-gradient(90deg,#1a3442,#24787c,#46c4a0,#d6fad0)', blo: 'linear-gradient(90deg,#3f72dc,#e0564a,#5fe3a1,#545c6c)', rec: 'linear-gradient(90deg,#3c404c,#605c46,#c4963c,#ffce5a)', est: 'linear-gradient(90deg,#c82828,#dc963c,#c8c85a,#46be78)' };
{ const h0 = hudHTML; hudHTML = () => { const s = S(), c = CC(me()), f = s.fin || Q.finance(), g = Q.govInfo(), pol = s.pol, top = (o, N) => Object.keys(o).filter(k => o[k] > .05).sort((a, b) => o[b] - o[a]).slice(0, 3).map(k => `${N[k] || k} ${money(o[k])}`).join(', ');
  const worst = Object.keys(pol.sec).sort((a, b) => pol.sec[a].a - pol.sec[b].a).slice(0, 3).map(k => `${D.SECTORS[k].n} ${Math.round(pol.sec[k].a)}`).join(', ');
  const T = { 'Caja del Estado y saldo por turno': `Caja del Estado. Este turno entra ${money(f.ti)} (${top(f.inc, INN)}) y sale ${money(f.te)} (${top(f.exp, EXN)}).`,
    'Capital político: lo gastas en casi todo': `Capital político: ${pol.cp} de 12. Cada turno: ${g.parts.map(x => x[0] + ' ' + sgn(x[1])).join(', ')}.`,
    'Aprobación ponderada de los sectores': `Aprobación ponderada por el peso de cada sector. Los que menos te quieren: ${worst}. Mira Política → Sectores para ver por qué.`,
    'Estabilidad: por debajo de 30 hay ruido de sables': `Estabilidad ${Math.round(c.stab)} (tiende a ${Math.round(c.stab0)}). ${Q.inWar(me()) ? 'La guerra la erosiona. ' : ''}${s.sanc.filter(x => x.on === me()).length ? 'Las sanciones la erosionan. ' : ''}Por debajo de 30 hay ruido de sables.` };
  let h = h0(); for (const k in T) h = h.split(`title="${k}"`).join(`title="${esc(T[k])}"`);
  return h.replace('<small class="legend">', `<small class="legend"><i class="lg" style="background:${LGRAD[UI.mode] || LGRAD.pol}"></i>`).replace('<div class="hud-date">', `<button class="sndbtn hud-adv" data-a="open" data-p="adv" aria-label="Asesores" title="Consejo de asesores">${gi('min')}</button><div class="hud-date">`); }; }

/* ---------- efectos en el globo para cada tipo de suceso ---------- */
Bus.on('war', w => { fxAt('exp', w.d); setTimeout(() => fxAt('humo', w.d), 600); });
Bus.on('battle', () => { const L = S().blog.filter(b => b.t === S().turn).slice(-3); L.forEach((b, i) => setTimeout(() => { fxReg('exp', b.k); fxReg('humo', b.k); }, i * 500)); });
Bus.on('coup', c => fxAt('rev', c.iso)); Bus.on('treaty', t => { fxAt('tratado', t.a); fxAt('tratado', t.b); }); Bus.on('annex', a => { fxAt('exp', a.v); fxAt('rev', a.v); });
Bus.on('news', n => { if (!n.i || !S()) return; const x = n.x;
  if (/ayuda humanitaria|voluntarios|acogerlos|rescate/i.test(x)) fxAt('ayuda', n.i); else if (/sanciona|embargo/i.test(x)) fxAt('sanc', n.i);
  else if (/huracán|tormenta|inundaci|ola de calor|sequía|monzón/i.test(x)) fxAt('tormenta', n.i); else if (/terremoto|erupción|plaga|pandemia|apagón|ciberataque/i.test(x)) fxAt('des', n.i);
  else if (/protestas|huelga|revoluci|motín|disturbios|levantamiento|golpe/i.test(x)) fxAt('rev', n.i);
  if (n.i === me() && n.p >= 3 && n.k === 'eco' && /crisis|corralito|quiebra|colapso|recesión/i.test(x)) { Sfx.play('crisis'); scene(cineScene(banner('war', 'eco', 'Crisis financiera', esc(x), 'Los mercados huyen de tu país'), 3200)); } });

/* ---------- modo observador: la cámara recorre lo que pasó en el mundo ---------- */
function observe(done) { const s = S(), t = s.turn - 1, seen = new Set(), L = [];
  for (const n of s.news.slice().reverse()) { const nt = n.tk != null ? n.tk : n.t; if (nt !== t || !n.i || n.p < 2 || seen.has(n.i) || !CC(n.i)) continue; seen.add(n.i); L.push(n); if (L.length >= 7) break; }
  if (!L.length) { if (done) done(); return toast('Un trimestre tranquilo: nada que recorrer'); }
  const box = document.createElement('div'); box.className = 'obs'; box.innerHTML = `<div class="obs-cap glass"><small class="eyebrow">Modo observador · ${esc(Q.dateStr())}</small><b></b><button class="btn sm ghost" data-a="obsStop">Saltar</button></div>`; document.body.appendChild(box);
  let i = 0, stop = false; UI.obsStop = () => { stop = true; };
  const next = () => { if (stop || i >= L.length) { box.remove(); UI.obsStop = null; Globe.focus(me(), 2.5); if (done) done(); return; }
    const n = L[i++]; Globe.focus(n.i, 2.15); box.querySelector('b').innerHTML = `${fl(n.i)} ${esc(n.x)}`; box.classList.remove('in'); void box.offsetWidth; box.classList.add('in');
    setTimeout(() => { fxAt(n.k === 'war' ? 'exp' : n.k === 'peace' || n.k === 'dip' ? 'tratado' : n.k === 'coup' ? 'rev' : 'ayuda', n.i); }, 700); if (n.p >= 3) Sfx.play('news'); setTimeout(next, CFG.rm ? 1800 : 2800); };
  next(); }
H.observe = () => observe(); H.obsStop = () => UI.obsStop && UI.obsStop();
Bus.on('turn', () => { if (CFG.observer) scene(done => observe(done)); });

/* ---------- intro cinematográfica y toma de posesión ---------- */
function intro() { let seen = false; try { seen = !!sessionStorage.getItem('wl_intro'); } catch (e) { } if (seen || CFG.rm || UI.screen !== 'start') return;
  const d = document.createElement('div'); d.className = 'intro'; d.dataset.a = 'introEnd';
  d.innerHTML = `<div class="in-stars"></div><div class="in-t"><p class="eyebrow">Una simulación de poder mundial</p><h1>${'WORLD LEADER'.split('').map((ch, i) => `<span style="animation-delay:${.15 + i * .07}s">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('')}</h1><p class="in-sub">197 países · 1 sillón · todas las consecuencias</p><small class="in-tap">Toca para empezar</small></div>`;
  document.body.appendChild(d); setTimeout(() => H.introEnd(true), 6500); }
H.introEnd = quiet => { const d = $('.intro'); if (!d) return; try { sessionStorage.setItem('wl_intro', '1'); } catch (e) { } if (!quiet) Sfx.play('inaug'); d.classList.add('out'); setTimeout(() => d.remove(), 700); };
setTimeout(intro, 50);
{ const g0 = H.ngGo; H.ngGo = d => { g0(d); const s = S(); if (!s || UI.screen !== 'game' || s.turn !== 0) return; Sfx.play('inaug');
  let tut = false; try { tut = !localStorage.getItem('wl_tut'); } catch (e) { } if (tut) closeModal(); // el tutorial espera a que termine la ceremonia
  scene(cineScene(banner('peace', 'cp', 'Toma de posesión', esc(s.leader.n), `${fl(me())} ${cname(me())} · ${esc(Q.dateStr())} · ${esc(D.REGIMES[CC(me()).reg] || '')}`), 3600));
  if (tut) scene(done => { tutorial(0); done(); }); }; }

/* ---------- números que cuentan, periódico por turno y fin de turno ---------- */
function countUp(el, to, fmt, ms) { if (!el || CFG.rm) return; const t0 = performance.now(); const step = now => { const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(to * e); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }
let prevHud = null;
function afterRender() { if (!S() || UI.screen !== 'game') { prevHud = null; return; } const c = CC(me()), b = document.querySelectorAll('.hud-stats .stat b');
  if (prevHud && b[0] && Math.abs(prevHud.tr - c.tr) > .05 && !CFG.rm) { const from = prevHud.tr, to = c.tr, el = b[0], t0 = performance.now(); const step = now => { const k = Math.min(1, (now - t0) / 700), e = 1 - Math.pow(1 - k, 3); el.textContent = money(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); el.parentNode.parentNode.classList.add(to >= from ? 'pulse-up' : 'pulse-down'); }
  prevHud = { tr: c.tr }; }
Bus.on('turn', () => { setTimeout(() => { document.querySelectorAll('.tf-deltas b').forEach(el => { const m = el.textContent.match(/^([+−-]?)([^0-9]*)([0-9.,]+)(.*)$/); if (!m) return; const n = parseFloat(m[3].replace(',', '.')), dec = (m[3].split('.')[1] || '').length; countUp(el, n, v => m[1] + m[2] + v.toFixed(dec) + m[4], 900); }); }, 120); });
Bus.on('turn', () => { if (CFG.paper && S() && !S().over) scene(modalScene(paperHTML() + `<label class="check"><input type="checkbox" data-c="paperT" ${CFG.paper ? 'checked' : ''}> Mostrar la portada al final de cada turno</label>`, 'wide paperbox')); });
H.paperT = (d, el) => { CFG.paper = el.checked; cfgSave(); };

/* ---------- ayuda táctil: mantener pulsado muestra la explicación ---------- */
{ let tm = 0, tip = null; const kill = () => { clearTimeout(tm); if (tip) { tip.remove(); tip = null; } };
  document.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; const el = e.target.closest && e.target.closest('[title]'); kill(); if (!el || !el.title) return;
    tm = setTimeout(() => { tip = document.createElement('div'); tip.className = 'tip glass'; tip.textContent = el.title; document.body.appendChild(tip); const r = el.getBoundingClientRect(); tip.style.left = Math.max(8, Math.min(innerWidth - tip.offsetWidth - 8, r.left + r.width / 2 - tip.offsetWidth / 2)) + 'px'; tip.style.top = Math.max(8, r.top - tip.offsetHeight - 8) + 'px'; setTimeout(kill, 4500); }, 480); }, { passive: true });
  ['pointerup', 'pointercancel', 'scroll'].forEach(ev => document.addEventListener(ev, () => clearTimeout(tm), { passive: true, capture: true })); }

/* ---------- glosario ---------- */
const GLOSS = [['Capital político (CP)', 'La moneda del poder: lo gastas en leyes, tratados, viajes y operaciones. Se regenera cada turno según tu apoyo y tu gobierno.'], ['Aprobación', 'Media de la afinidad de cada sector social, ponderada por su peso electoral. Decide elecciones.'], ['Estabilidad', 'Lo sólido que es tu país. Por debajo de 30 hay riesgo de golpe; por debajo de 3, revolución.'],
  ['Relación', 'De −100 (odio) a +100 (amistad). Pulsa «¿Por qué?» en la ficha de un país para ver cada motivo.'], ['Sectores', 'Grupos sociales (obreros, jóvenes, militares…) con peso electoral y memoria de lo que haces.'], ['Tratados', 'Comercio, no agresión, alianza y defensa mutua. Romperlos cuesta reputación.'],
  ['Reputación', 'Cómo te ve el mundo: paz, confianza, generosidad y democracia. Cambia el trato que recibes.'], ['Sanciones', 'Castigo económico: frenan el crecimiento y cortan el comercio. Los países sancionados se ven apagados en el mapa.'], ['Teatro de operaciones', 'Las regiones en disputa de una guerra. Ahí luchan tus ejércitos, escuadrones y flotas.'],
  ['Moral', 'Las ganas de luchar de un grupo. Sube defendiendo tu tierra y ganando; baja perdiendo, avanzando sin pausa o sin suministro.'], ['Suministro', 'Combustible, munición, repuestos y comida que llegan al frente. Lejos de casa y bajo bloqueo, cae.'], ['Triángulo táctico', 'Blindados vencen a infantería, infantería a fuerzas especiales, fuerzas especiales a artillería y antiaéreos, antiaéreos a aviación, aviación a blindados.'],
  ['Niebla de guerra', 'Sin buenos espías, las cifras enemigas son estimaciones con error.'], ['Alerta', 'Paz, tensión, movilización o guerra: más preparación y disuasión, a cambio de dinero y crecimiento.'], ['Ocupación', 'Regiones que tomas por la fuerza: se integran despacio o se rebelan, según cómo las trates.'],
  ['Resistencia', 'Guerrilla de una nación anexionada. Al llegar a 100 se levanta y puede recuperar la independencia.'], ['Carrera tecnológica', 'Descubrimientos que todas las potencias persiguen. El primero cobra licencias y gana prestigio.'], ['I+D', 'Presupuesto de investigación: más dinero, más puntos para los grandes descubrimientos.'],
  ['Agencia de inteligencia', 'Su nivel mejora las operaciones encubiertas, la certeza de los informes y el contraespionaje.'], ['Doctrina', 'Forma de hacer la guerra de cada rama (tierra, aire, mar), con ventajas y costes.'], ['Armisticio', 'Alto el fuego largo que congela el frente y termina en paz con lo ocupado.'],
  ['Sinergia de rasgos', 'Dos rasgos de tu líder que juntos dan un bono extra. Otros son incompatibles.'], ['Diario de mi mandato', 'Registro de tus decisiones clave. Al final, la historia te juzga con él.'], ['Modo observador', 'La cámara recorre lo que pasó en el mundo el último trimestre (tecla O).']];
const glossHTML = () => `<div class="gloss">${GLOSS.map(g => `<div><b>${g[0]}</b><p>${g[1]}</p></div>`).join('')}</div>`;
H.glossary = () => openModal(`<h2>Glosario</h2>${glossHTML()}`, true, 'wide');
TUT.push(['.hud-adv', 'Tus asesores', 'Cinco asesores con carácter propio resumen lo que requiere atención y te recomiendan qué hacer. A veces no se ponen de acuerdo: la decisión es tuya.'],
  ['.dock [data-p=mil]', 'La guerra, si llega', 'En Ejército tienes la Sala de guerra (tecla G): frente, grupos, órdenes y parte de batalla. Tu Estado Mayor puede dirigirla por ti.'],
  ['.dock [data-p=sys]', 'Ajustes y glosario', 'En Partida ajustas la calidad gráfica, el movimiento y el volumen de cada canal, guardas en ranuras y consultas el glosario. Mantén pulsado cualquier número para saber qué significa.']);

/* ---------- consejo de asesores ---------- */
PT.adv = 'Consejo de asesores'; IC.adv = IC.people;
const ADV = [['eco', 'Valeria Ortega', 'Economía', 'prudente', 'eco'], ['mil', 'Gral. Arturo Basaldúa', 'Defensa', 'halcón', 'mil'], ['dip', 'Inés Ferrer', 'Exteriores', 'paloma', 'dip'], ['int', 'Mara Ilyin', 'Inteligencia', 'desconfiada', 'ojo'], ['pol', 'Tomás Rey', 'Política interna', 'cínico', 'sin']];
PANELS.adv = () => { const s = S(), p = me(), c = CC(p), f = s.fin || Q.finance(), tr = s.leader.traits, A = {};
  const add = (k, sev, x, go) => (A[k] = A[k] || []).push({ sev, x, go });
  // economía
  if (f.net < 0) add('eco', 2, `Perdemos ${money(-f.net)} por turno. Hay que recortar gasto o subir impuestos antes de que llegue la deuda.`, ['eco', 'pre']); else add('eco', 0, `Ganamos ${money(f.net)} por turno. Es buen momento para invertir en fábricas o en I+D.`, ['eco', 'pla']);
  if (s.eco && s.eco.inf > 8) add('eco', 2, `La inflación está en ${s.eco.inf.toFixed(1)}%. La gente lo nota en el súper.`, ['eco', 'ind']);
  const fl2 = Q.resFlow(), short = Object.keys(fl2).filter(k => fl2[k].net < 0 && fl2[k].stock < -fl2[k].net * 4); if (short.length) add('eco', 1, `Se nos acaba ${short.map(k => D.COMMODITIES[k].n.toLowerCase()).join(', ')}. Una fábrica lo resolvería.`, ['eco', 'pla']);
  // defensa
  const dt = Q.deterrence(), hot = dt.filter(d => d.risk === 'alto'); for (const w of Q.warsOf(p)) { const sc = Q.thSide(w, p) === 'att' ? w.score : -w.score; add('mil', sc < -15 ? 2 : 1, sc < -15 ? `Vamos perdiendo contra ${cname(w.att[0] === p ? w.def[0] : w.att[0])}. Necesito refuerzos o un alto el fuego.` : `La guerra contra ${cname(w.att[0] === p ? w.def[0] : w.att[0])} va ${sc > 15 ? 'bien' : 'estancada'}. Mantengamos la presión.`, ['mil', 'tea']); }
  if (hot.length) add('mil', 2, `${cname(hot[0].iso)} podría atacarnos. Subamos la alerta y fortifiquemos la frontera.`, ['mil', 'est']);
  const prey = Q.nb(p).filter(z => !Q.atWar(p, z) && Q.rel(p, z) < -30 && Q.power(p) > Q.power(z) * 2)[0]; if (prey && !Q.warsOf(p).length) add('mil', 1, `${cname(prey)} es hostil y débil. Una campaña corta resolvería el problema para siempre.`, ['mil', 'tea']);
  if (!A.mil) add('mil', 0, `Preparación al ${Math.round(s.mil.ready)}%. ${s.mil.ready < 40 ? 'Un ejército que no entrena se oxida: ordene maniobras.' : 'Las tropas están listas.'}`, ['mil', 'mis']);
  // exteriores
  const foes = Q.nb(p).filter(z => Q.rel(p, z) < -30); if (prey) add('dip', 2, `El general quiere guerra con ${cname(prey)}. Yo propongo una cumbre: una guerra nos costaría sanciones y reputación.`, ['dip', 'rel']); else if (foes.length) add('dip', 1, `${cname(foes[0])} nos mira mal. Una visita o una cumbre bajarían la tensión.`, ['dip', 'rel']);
  const partners = Object.keys(s.c).filter(z => z !== p && CC(z).alive && Q.hasT('com', p, z)).length; add('dip', 0, partners < 5 ? `Solo tenemos ${partners} socios comerciales. Cada tratado son ingresos y aliados.` : `Tenemos ${partners} socios comerciales. Cuidémoslos.`, ['dip', 'tra']);
  // inteligencia
  const il = Q.intelList().filter(e => e.danger >= 3).slice(0, 2); il.forEach(e => add('int', e.danger >= 4 ? 2 : 1, `${cname(e.iso)}: creemos que ${Q.planText(e.est).toLowerCase()} (${Math.round(e.conf * 100)}% de certeza).`, ['dip', 'int']));
  add('int', (s.spy.lvl || 0) < 1 ? 1 : 0, (s.spy.lvl || 0) < 1 ? 'Trabajamos a ciegas. Con más presupuesto vería lo que traman y quitaría la niebla de guerra.' : `La agencia está a nivel ${(s.spy.lvl || 0).toFixed(1)}. Nada se nos escapa… casi.`, ['dip', 'int']);
  // política
  const g = Q.govInfo(), left = s.pol.nextElec - s.turn, ap = Q.approval(), worstK = Object.keys(s.pol.sec).sort((a, b) => s.pol.sec[a].a - s.pol.sec[b].a)[0];
  if (Q.isDem() && left > 0 && left <= 4) add('pol', ap < 50 ? 2 : 1, `Elecciones en ${left} trimestres con ${Math.round(ap)}% de aprobación.${f.net < 0 ? ' Y que nadie hable de recortes ahora, diga lo que diga Economía.' : ''}`, ['pol', 'ele']);
  if (g.dem.length) add('pol', 1, `${D.SECTORS[g.dem[0].k].n} exigen una ley con plazo. Cumplir sale barato; ignorarlos, caro.`, ['pol', 'ley']);
  add('pol', 0, `Los que menos te quieren: ${D.SECTORS[worstK].n} (${Math.round(s.pol.sec[worstK].a)}). Una campaña de comunicación los ablanda.`, ['pol', 'sec']);
  const flavor = { pol: tr.includes('populista') ? 'Como buen populista, sabes que la calle manda.' : tr.includes('tecnocrata') ? 'Los números no votan, señor tecnócrata.' : '', mil: tr.includes('pacifista') ? 'Sé que usted es pacifista. Yo también… hasta que nos atacan.' : tr.includes('belicista') ? 'Por fin un líder que entiende a los militares.' : '', dip: tr.includes('diplomatico') ? 'Con su talento diplomático, esto debería ser fácil.' : '', eco: tr.includes('economista') || tr.includes('tecnocrata') ? 'Usted entiende de números: le hablaré claro.' : '', int: tr.includes('intrigante') ? 'Ah, un colega del oficio.' : '' };
  const syn = Q.synergies();
  return `<p class="mut">Cada asesor resume lo que le preocupa y te recomienda algo. No siempre están de acuerdo.${syn.length ? ` Tus rasgos combinan bien: ${syn.map(x => `<b>${x.n}</b> (${x.d})`).join(', ')}.` : ''}</p>
    <div class="advs">${ADV.map(([k, n, role, per, icn]) => { const L = (A[k] || []).sort((a, b) => b.sev - a.sev), sev = L.length ? L[0].sev : 0;
      return `<article class="adv sev${sev}"><div class="row"><span class="adv-pic">${gi(icn)}</span><div class="grow"><b>${n}</b><small class="mut">${role} · ${per}</small></div><span class="chip ${sev >= 2 ? 'bad' : sev ? 'gold' : 'good'}">${sev >= 2 ? 'Alarmado' : sev ? 'Preocupado' : 'Tranquilo'}</span></div>
        ${flavor[k] ? `<p class="adv-fl">«${flavor[k]}»</p>` : ''}${L.slice(0, 3).map(x => `<div class="adv-l"><p>«${esc(x.x)}»</p>${x.go ? `<button class="chip" data-a="advGo" data-p="${x.go[0]}" data-t="${x.go[1]}">Ir</button>` : ''}</div>`).join('')}</article>`; }).join('')}</div>
    <div class="row wrap"><button class="btn sm" data-a="glossary">Glosario</button><button class="btn sm" data-a="observe">Recorrer el mundo (O)</button></div>`; };
H.advGo = d => { UI.tab[d.p] = d.t; UI.panel = d.p; UI.render(); };

/* ---------- Partida: guardado en ranuras, ajustes, diario y legado, glosario ---------- */
PTABS.sys = [['gen', 'Partida'], ['aju', 'Ajustes'], ['dia', 'Diario y legado'], ['glo', 'Glosario']];
{ const s0 = PANELS.sys; PANELS.sys = t => t === 'aju' ? cfgHTML() : t === 'dia' ? diaryHTML() : t === 'glo' ? glossHTML() : s0(t) + slotsHTML(); }
const slotMeta = i => { try { const x = JSON.parse(localStorage.getItem('wl_slot' + i) || 'null'); return x && x.meta; } catch (e) { return null; } };
const slotsHTML = () => `<h4>${gi('acuerdo')} Ranuras de guardado</h4>${[1, 2, 3].map(i => { const m = slotMeta(i); return `<div class="arow"><div class="grow"><b>Ranura ${i}</b><small>${m ? `${esc(m.n)} · ${esc(m.c)} · ${esc(m.d)} · turno ${m.t + 1}` : 'Vacía'}</small></div><button class="btn sm gold" data-a="slotSave" data-i="${i}" ${m ? 'data-confirm' : ''}>Guardar aquí</button>${m ? `<button class="btn sm" data-a="slotLoad" data-i="${i}" data-confirm>Cargar</button><button class="btn sm ghost" data-a="slotDel" data-i="${i}" data-confirm>Borrar</button>` : ''}</div>`; }).join('')}
  <p class="mut fine">El autoguardado se hace solo; además se conserva una copia del turno anterior por si la principal se daña.</p>`;
H.slotSave = d => { try { localStorage.setItem('wl_slot' + d.i, JSON.stringify({ meta: { n: S().leader.n, c: CC(me()).n, d: Q.dateStr(), t: S().turn }, data: G.save() })); toast(`Guardado en la ranura ${d.i}`); UI.render(); } catch (e) { toast('No queda espacio en este navegador: borra una ranura o exporta a JSON', false); } };
H.slotLoad = d => { try { const x = JSON.parse(localStorage.getItem('wl_slot' + d.i)); const r = G.load(x.data); toast(r.msg, r.ok); if (r.ok) enterGame(false); } catch (e) { toast('Esa ranura está dañada y no se puede cargar', false); } };
H.slotDel = d => { try { localStorage.removeItem('wl_slot' + d.i); } catch (e) { } UI.render(); };
{ const a0 = autosave; autosave = () => { try { if (S() && UI.bakTurn !== S().turn) { const prev = localStorage.getItem('wl_save'); if (prev) localStorage.setItem('wl_save_bak', prev); UI.bakTurn = S().turn; } } catch (e) { } a0(); }; }
{ const c0 = H.continue; H.continue = d => { let s = null; try { s = localStorage.getItem('wl_save'); } catch (e) { } let ok = false; try { ok = !!(s && JSON.parse(s)); } catch (e) { }
  if (ok) { const r = G.load(s); if (r.ok) { toast(r.msg); return enterGame(false); } }
  let b = null; try { b = localStorage.getItem('wl_save_bak'); } catch (e) { } if (b) { const r = G.load(b); if (r.ok) { toast('La partida principal estaba dañada: se recuperó la copia del turno anterior', false); return enterGame(false); } }
  return c0(d); }; }
function cfgHTML() { const v = CFG.vol, sl = (k, n) => `<label class="vol"><span>${n}</span><input type="range" min="0" max="100" value="${Math.round(v[k] * 100)}" data-c="cfgVol" data-k="${k}"><b>${Math.round(v[k] * 100)}</b></label>`;
  return `<h4>${gi('estrella')} Calidad gráfica <small class="mut">ahora: ${({ low: 'Baja', med: 'Media', high: 'Alta' })[quality()]}</small></h4><div class="chips">${[['auto', 'Automática'], ['low', 'Baja · teléfonos modestos'], ['med', 'Media'], ['high', 'Alta']].map(q => `<button class="chip ${CFG.q === q[0] ? 'gold' : ''}" data-a="cfgQ" data-v="${q[0]}">${q[1]}</button>`).join('')}</div>
    <p class="mut fine">Baja: sin nubes ni auroras, 30 fps, menos partículas y sin desenfoque de los paneles. Alta: todo, con auroras y más resolución.</p>
    <label class="check"><input type="checkbox" data-c="cfgB" data-k="rm" ${CFG.rm ? 'checked' : ''}> Reducir movimiento (sin animaciones ni giros de cámara)</label>
    <label class="check"><input type="checkbox" data-c="cfgB" data-k="cine" ${CFG.cine ? 'checked' : ''}> Cámara cinematográfica en los momentos clave</label>
    <label class="check"><input type="checkbox" data-c="cfgB" data-k="paper" ${CFG.paper ? 'checked' : ''}> Portada del periódico al final de cada turno</label>
    <label class="check"><input type="checkbox" data-c="cfgB" data-k="observer" ${CFG.observer ? 'checked' : ''}> Modo observador automático tras cada turno</label>
    <h4>${gi('sin')} Sonido</h4><div class="row wrap"><button class="btn ${CFG.mute ? 'red' : ''}" data-a="sound">${CFG.mute ? 'Activar el sonido' : 'Silenciar todo'}</button><button class="btn sm" data-a="cfgTest">Probar</button><label class="check"><input type="checkbox" data-c="cfgB" data-k="hover" ${CFG.hover ? 'checked' : ''}> Sonido al pasar el ratón</label></div>
    <div class="vols">${sl('master', 'General')}${sl('music', 'Música')}${sl('sfx', 'Efectos')}${sl('amb', 'Ambiente')}${sl('ui', 'Interfaz')}</div>
    <p class="mut fine">Todo el audio se genera en tu navegador: música original que cambia con el estado del mundo (paz, tensión, crisis, guerra, victoria, derrota), ambiente del globo y efectos. Suena solo tras tu primer toque.</p>`; }
H.cfgQ = d => { CFG.q = d.v; cfgSave(); applyCfg(); UI.render(); };
H.cfgB = (d, el) => { CFG[el.dataset.k] = el.checked; cfgSave(); applyCfg(); UI.render(); };
H.cfgVol = (d, el) => { CFG.vol[el.dataset.k] = el.value / 100; cfgSave(); Sfx.mix(); Sfx.refresh(); const b = el.parentNode.querySelector('b'); if (b) b.textContent = el.value; };
H.cfgTest = () => { Sfx.play('fanfare'); };
function diaryHTML() { const s = S(), L = Q.legacy(), D2 = s.diary.slice().reverse(), byY = {};
  D2.forEach(e => (byY[tLabel(e.t).split(' ')[1]] = byY[tLabel(e.t).split(' ')[1]] || []).push(e));
  return `<div class="card legacy"><small class="eyebrow">Si tu mandato terminara hoy, la historia te recordaría como</small><h2>${esc(L.name)}</h2><div class="legacy-bar">${bar(L.score, 100, L.score >= 60 ? 'green' : L.score < 40 ? 'red' : 'gold')}<b>${L.score}/100</b></div><p>${esc(L.text)}</p></div>
    <h4>${gi('acuerdo')} Diario de mi mandato <small class="mut">${s.diary.length} entradas</small></h4>${Object.keys(byY).map(y => `<h5 class="dia-y">${y}</h5>${byY[y].map(e => `<div class="dia ${e.k}"><small>${tLabel(e.t).split(' ')[0]}</small><span>${esc(e.x)}</span></div>`).join('')}`).join('') || '<p class="mut">Aún no hay decisiones que recordar.</p>'}`; }
{ const o0 = showOver; showOver = () => { o0(); const box = $('#modal .over'), s = S(); if (!box || !s) return; const L = Q.legacy();
  box.querySelector('.kvs').insertAdjacentHTML('afterend', `<div class="card legacy"><small class="eyebrow">El juicio de la historia</small><h2>${esc(L.name)}</h2><div class="legacy-bar">${bar(L.score, 100, L.score >= 60 ? 'green' : L.score < 40 ? 'red' : 'gold')}<b>${L.score}/100</b></div><p>${esc(L.text)}</p>${L.key.length ? `<h4>Momentos clave</h4>${L.key.map(e => `<div class="dia ${e.k}"><small>${tLabel(e.t)}</small><span>${esc(e.x)}</span></div>`).join('')}` : ''}</div>`); }; }

/* ---------- rasgos: conflictos y sinergias al crear el líder ---------- */
{ const t0 = H.ngTrait; H.ngTrait = d => { if (!NG.traits.includes(d.id)) { const c = (D.TCONF || []).find(x => x.includes(d.id) && NG.traits.includes(x[0] === d.id ? x[1] : x[0])); if (c) { const o = D.TRAITS.find(t => t.id === (c[0] === d.id ? c[1] : c[0])); return toast(`Incompatible con «${o.n}»: no se puede ser ambas cosas a la vez`, false); } }
  const before = NG.traits.length; t0(d); if (NG.traits.length > before) { const s = (D.SYNERGY || []).find(x => NG.traits.includes(x.a) && NG.traits.includes(x.b) && (x.a === d.id || x.b === d.id)); if (s) toast(`Sinergia: ${s.n} · ${s.d}`); } }; }

/* ---------- editor: pruebas de sonido, cinemáticas, eventos y avance rápido ---------- */
PTABS.edit.push(['pru', 'Pruebas']);
{ const e0 = PANELS.edit; PANELS.edit = t => { if (t === 'reg') { const c = CC(edIso()), i = Math.min(c.terr.length - 1, Math.max(0, +fv('ed:reg', 0) || 0)), k = edIso() + ':' + i;
    return e0(t) + `<div class="grid2"><label>Terreno de la región<select data-c="edSet" data-k="terr.${i}.ter"><option value="">Automático (${D.TER[Q.terOf(k)].n})</option>${Object.keys(D.TER).map(x => `<option value="${x}" ${c.terr[i].ter === x ? 'selected' : ''}>${D.TER[x].n}</option>`).join('')}</select></label></div>`; }
  if (t !== 'pru') return e0(t);
  return `<h4>${gi('sin')} Sonido</h4><div class="chips">${['click', 'ok', 'bad', 'coin', 'turn', 'war', 'battle', 'treaty', 'peace', 'vote', 'coup', 'tech', 'news', 'alert', 'alertHi', 'fanfare', 'crisis', 'elecWin', 'elecLose', 'over'].map(k => `<button class="chip" data-a="tSnd" data-k="${k}">${k}</button>`).join('')}</div>
    <h4>${gi('estrella')} Música <small class="mut">ahora: ${Sfx.moodNow}</small></h4><div class="chips">${['paz', 'tension', 'crisis', 'guerra', 'victoria', 'derrota'].map(m => `<button class="chip" data-a="tMood" data-m="${m}">${m}</button>`).join('')}<button class="chip gold" data-a="tMood" data-m="">automática</button></div>
    <h4>${gi('ojo')} Cinemáticas y efectos</h4><div class="chips">${[['intro', 'Intro'], ['inaug', 'Toma de posesión'], ['war', 'Declaración de guerra'], ['treaty', 'Tratado'], ['coup', 'Golpe de Estado'], ['elec', 'Noche electoral'], ['crisis', 'Crisis financiera'], ['battle', 'Parte de batalla'], ['paper', 'Periódico'], ['legacy', 'Legado'], ['obs', 'Modo observador']].map(x => `<button class="chip" data-a="tCine" data-k="${x[0]}">${x[1]}</button>`).join('')}</div>
    <div class="chips">${['exp', 'humo', 'ayuda', 'rev', 'des', 'tormenta', 'sanc', 'tratado'].map(k => `<button class="chip" data-a="tFx" data-k="${k}">Efecto: ${k}</button>`).join('')}</div>
    <h4>${gi('pin')} Avance rápido <small class="mut">juega N turnos eligiendo siempre la primera opción, sin cinemáticas</small></h4><div class="row wrap">${inp('ed:ff', 10, 'type="number" min="1" max="200" class="w70"')}<button class="btn sm gold" data-a="tFF">Avanzar</button></div>
    <p class="mut fine">Para forzar cualquier evento usa la pestaña Eventos.</p>`; }; }
H.tSnd = d => Sfx.play(d.k); H.tMood = d => { moodLock = d.m ? Date.now() + 1e9 : 0; if (d.m) Sfx.mood(d.m); else setMood(); UI.render(); };
H.tFx = d => fxAt(d.k, UI.sel || me());
H.tCine = d => { const p = me(), z = Q.nb(p)[0] || Object.keys(S().c).find(i => i !== p && CC(i).alive), k = d.k; UI.panel = null; UI.render();
  if (k === 'intro') { try { sessionStorage.removeItem('wl_intro'); } catch (e) { } const sc = UI.screen; UI.screen = 'start'; intro(); UI.screen = sc; }
  else if (k === 'inaug') scene(cineScene(banner('peace', 'cp', 'Toma de posesión', esc(S().leader.n), `${fl(p)} ${cname(p)}`), 3000));
  else if (k === 'war') scene(cineScene(banner('war', 'war', 'Declaración de guerra', `${cname(p)} <i>contra</i> ${cname(z)}`, ''), 3000, () => Globe.focus(z, 2.3)));
  else if (k === 'treaty') Bus.emit('treaty', { t: 'ali', a: p, b: z, name: 'Alianza de prueba' }); else if (k === 'coup') Bus.emit('coup', { iso: z, near: 1 });
  else if (k === 'elec') Bus.emit('election', { win: true, share: 54.2 }); else if (k === 'crisis') { Sfx.play('crisis'); scene(cineScene(banner('war', 'eco', 'Crisis financiera', 'Prueba de cinemática', ''), 3000)); }
  else if (k === 'battle') { const L = S().blog.slice(-3); if (L.length) openModal(battleHTML(L), true, 'event wide'); else toast('Aún no hay batallas registradas', false); }
  else if (k === 'paper') H.paper(); else if (k === 'legacy') H.open({ p: 'sys' }) || (UI.tab.sys = 'dia', UI.render()); else if (k === 'obs') observe(); };
H.tFF = () => { const n = Math.max(1, Math.min(200, +fv('ed:ff', 10) || 10)), h = Bus.h; Bus.h = {}; let i = 0;
  try { for (; i < n && !S().over; i++) { let k = 0; while (S().pend.length && k++ < 40) G.act('decide', { i: 0 }); const r = G.act('endTurn'); if (!r.ok) break; } } finally { Bus.h = h; }
  UI.render(); refreshMap(); autosave(); setMood(); toast(`Avance rápido: ${i} turnos jugados${S().over ? ' (la partida terminó)' : ''}`); if (S().over) showOver(); else showPending(); };

/* ---------- atajos nuevos ---------- */
KEYS.push(['V', 'Asesores'], ['O', 'Modo observador'], ['H', 'Glosario']);
document.addEventListener('keydown', e => { if (UI.screen !== 'game' || e.ctrlKey || e.metaKey || e.altKey || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName || '')) return;
  if (e.key === 'Escape' && UI.obsStop) return UI.obsStop(); if (!$('#modal').hidden) return;
  if (e.key === 'v' || e.key === 'V') H.open({ p: 'adv' }); else if (e.key === 'o' || e.key === 'O') observe(); else if (e.key === 'h' || e.key === 'H') H.glossary(); });

/* ---------- tus rasgos se notan en las decisiones ---------- */
const TFLAV = { populista: 'Tu instinto populista te susurra: haz lo que aplauda la calle.', tecnocrata: 'Tu lado tecnócrata pide datos antes de decidir.', belicista: 'Tu instinto belicista pide mano dura.', pacifista: 'Tu pacifismo te inclina hacia la salida menos violenta.', corrupto: 'Ya calculas qué parte de esto podría quedarse en tu bolsillo.', intrigante: 'Huele a trampa. Siempre huele a trampa.', diplomatico: 'Hay una salida negociada; siempre la hay.', sereno: 'Respiras hondo: nada de decisiones en caliente.', cercano: 'Piensas en cómo se lo explicarías a tu vecina.', tribuno: 'Ya imaginas el discurso.', autoritario: 'Lo resolverías por decreto, si pudieras.', carismatico: 'Decidas lo que decidas, sabrás venderlo.', estoico: 'Ni una ceja se te mueve.', padre_patria: 'El país entero te mira como a un padre.', economista: 'Antes de nada, ¿cuánto cuesta?', visionario: 'Piensas en cómo se verá esto dentro de veinte años.' };
{ const p0 = showPending; showPending = () => { p0(); const el = $('#modal .ev-text'), tr = (S() && S().leader.traits.filter(t => TFLAV[t])) || []; if (!el || !tr.length || el.nextElementSibling && el.nextElementSibling.classList.contains('ev-trait')) return;
  el.insertAdjacentHTML('afterend', `<p class="ev-trait">${gi('estrella')} ${TFLAV[tr[S().turn % tr.length]]}</p>`); }; }
/* alertas con sonido distinto según su gravedad */
Bus.on('turn', () => setTimeout(() => { if (!S() || S().over) return; const a = Q.alerts(); if (a.some(x => x.p >= 5)) Sfx.play('alertHi'); else if (a.some(x => x.p >= 4)) Sfx.play('alert'); }, 1600));
