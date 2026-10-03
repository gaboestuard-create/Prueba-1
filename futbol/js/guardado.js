'use strict';
/* Pelotazo · guardado protegido */
/* =====================================================================
   guardado protegido
   - 'save': los datos (texto 'js:' + JSON). 'save_meta': versión y fecha.
   - 'bak_index' y 'bak_*': copias de seguridad. 'danado_*': datos dañados apartados.
   - Si cambia la forma de DATOS: subir SAVE_VERSION y añadir MIGR[nueva].
   ===================================================================== */
const SAVE_VERSION = 1;
const AJUSTES_DEF = { cam: 'diag', modelo: 'real', estilo: 'dia', calidad: 'auto', dif: 1, dur: 5, tactil: 'auto', vibrar: true };
const ESTAD_CLAVES = ['jugados', 'ganados', 'empatados', 'perdidos', 'gf', 'gc'];
const MIGR = {
  // 1: datos sin número de versión (versión 0) → 1
  1: d => { d.v = 1; return d; },
};
function datosNuevos() { return { v: SAVE_VERSION, creado: Date.now(), guardado: 0, ajustes: { ...AJUSTES_DEF }, estad: { jugados: 0, ganados: 0, empatados: 0, perdidos: 0, gf: 0, gc: 0 }, historial: [] }; }
let DATOS = datosNuevos();
// completa lo que falte y corrige ajustes con valores que no existen
function arreglarDatos(d) {
  if (!d.ajustes || typeof d.ajustes !== 'object') d.ajustes = {};
  for (const k in AJUSTES_DEF) {
    const op = OPCIONES.find(o => o.k === k);
    if (!(k in d.ajustes) || (op && !op.o.some(([v]) => v === d.ajustes[k]))) d.ajustes[k] = AJUSTES_DEF[k];
  }
  if (!Array.isArray(d.historial)) d.historial = [];
  if (!d.creado) d.creado = Date.now();
  return d;
}
function validarDatos(d) {
  const grave = [], aviso = [];
  if (!d || typeof d !== 'object' || Array.isArray(d)) return { ok: false, grave: ['no son datos del juego'], aviso };
  if (!Number.isInteger(d.v) || d.v < 1) grave.push('versión no válida');
  if (!d.estad || typeof d.estad !== 'object') grave.push('faltan las estadísticas');
  else {
    for (const k of ESTAD_CLAVES) if (!Number.isInteger(d.estad[k]) || d.estad[k] < 0) grave.push('estadística dañada: ' + k);
    if (!grave.length && d.estad.jugados !== d.estad.ganados + d.estad.empatados + d.estad.perdidos) aviso.push('los totales no cuadran');
  }
  if (!d.ajustes || typeof d.ajustes !== 'object') grave.push('faltan los ajustes');
  if (!Array.isArray(d.historial)) grave.push('historial dañado');
  else if (d.historial.some(h => !h || !Number.isInteger(h.gf) || !Number.isInteger(h.gc))) grave.push('partido del historial dañado');
  return { ok: grave.length === 0, grave, aviso };
}
// almacenamiento: IndexedDB; si no se puede, localStorage; si tampoco, solo en memoria
const KV = (() => {
  let db = null, modo = 'memoria'; const mem = new Map(), P = 'pelotazo.';
  async function abrir() {
    try {
      db = await new Promise((res, rej) => {
        const r = indexedDB.open('pelotazo', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); r.onblocked = () => rej(new Error('bloqueado'));
        setTimeout(() => rej(new Error('tiempo')), 4000);
      });
      modo = 'idb'; return;
    } catch (e) { db = null; }
    try { localStorage.setItem(P + '_', '1'); localStorage.removeItem(P + '_'); modo = 'local'; } catch (e) { modo = 'memoria'; }
  }
  const tx = (m, f) => new Promise((res, rej) => { const t = db.transaction('kv', m), s = t.objectStore('kv'); const r = f(s); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); });
  return {
    abrir, get modo() { return modo; },
    async get(k) { if (modo === 'idb') return tx('readonly', s => s.get(k)); if (modo === 'local') { const v = localStorage.getItem(P + k); return v == null ? undefined : JSON.parse(v); } return mem.get(k); },
    async set(k, v) { if (modo === 'idb') return tx('readwrite', s => { s.put(v, k); }); if (modo === 'local') return localStorage.setItem(P + k, JSON.stringify(v)); mem.set(k, v); },
    async del(k) { if (modo === 'idb') return tx('readwrite', s => { s.delete(k); }); if (modo === 'local') return localStorage.removeItem(P + k); mem.delete(k); },
    async keys() { if (modo === 'idb') return tx('readonly', s => s.getAllKeys()); if (modo === 'local') return Object.keys(localStorage).filter(k => k.startsWith(P)).map(k => k.slice(P.length)); return [...mem.keys()]; },
  };
})();
const SAVE = { estado: 'nuevo', dueno: true, soloLectura: false, ultimoOk: 0, id: Math.random().toString(36).slice(2) };
function leerTexto(raw) {
  if (typeof raw !== 'string') throw new Error('formato desconocido');
  return JSON.parse(raw.startsWith('js:') ? raw.slice(3) : raw);
}
// convierte datos guardados en datos válidos de esta versión (o lanza un error)
function prepararDatos(raw) {
  let d = leerTexto(raw);
  if (!d || typeof d !== 'object') throw new Error('no son datos del juego');
  const v = Number.isInteger(d.v) ? d.v : 0;
  if (v > SAVE_VERSION) { const e = new Error('versión futura'); e.futuro = true; e.datos = d; throw e; }
  for (let n = v + 1; n <= SAVE_VERSION; n++) d = MIGR[n](d);
  arreglarDatos(d);
  const r = validarDatos(d);
  if (!r.ok) throw new Error('datos dañados: ' + r.grave.join(', '));
  return d;
}
async function cargarGuardado() {
  await KV.abrir();
  let raw;
  try { raw = await KV.get('save'); } catch (e) { raw = undefined; }
  if (raw === undefined || raw === null) { DATOS = datosNuevos(); SAVE.estado = 'nuevo'; return; }
  try { DATOS = prepararDatos(raw); SAVE.estado = 'ok'; }
  catch (e) {
    if (e.futuro) { // de una versión más nueva: se usa sin tocarla
      DATOS = datosNuevos(); try { arreglarDatos(Object.assign(DATOS, { ajustes: { ...AJUSTES_DEF, ...(e.datos.ajustes || {}) } })); } catch (er) { }
      SAVE.estado = 'futuro'; SAVE.soloLectura = true; return;
    }
    await recuperar(raw, e.message);
  }
}
async function recuperar(raw, motivo) {
  const t = Date.now();
  try { await KV.set('danado_' + t, raw); } catch (e) { }
  const L = await bakList();
  for (const b of L) {
    try { const d = prepararDatos(await KV.get(b.k)); DATOS = d; SAVE.estado = 'recuperado'; await KV.set('save', 'js:' + JSON.stringify(DATOS)); return; } catch (e) { }
  }
  DATOS = datosNuevos(); SAVE.estado = 'reiniciado';
  try { await KV.set('save', 'js:' + JSON.stringify(DATOS)); } catch (e) { }
}
async function bakList() {
  let idx = [];
  try { idx = (await KV.get('bak_index')) || []; } catch (e) { }
  return idx.slice().sort((a, b) => b.t - a.t);
}
async function bakPut(tipo, texto) {
  const t = Date.now(), k = 'bak_' + t + '_' + Math.floor(Math.random() * 1e4);
  let jugados = 0; try { jugados = leerTexto(texto).estad.jugados; } catch (e) { }
  await KV.set(k, texto);
  let idx = (await KV.get('bak_index')) || [];
  idx.push({ k, t, tipo, jugados, v: SAVE_VERSION });
  // se conservan las 5 copias más recientes de cada tipo
  const borrar = [];
  for (const ti of new Set(idx.map(b => b.tipo))) { const de = idx.filter(b => b.tipo === ti).sort((a, b) => b.t - a.t); borrar.push(...de.slice(5)); }
  idx = idx.filter(b => !borrar.includes(b));
  await KV.set('bak_index', idx);
  for (const b of borrar) { try { await KV.del(b.k); } catch (e) { } }
}
// copia lo que hay guardado ahora antes de sustituirlo
async function bakCurrent(tipo) { const raw = await KV.get('save'); if (typeof raw === 'string') await bakPut(tipo, raw); }
// los guardados van en fila, uno detrás de otro, para que dos a la vez no se pisen la lista de copias
let colaGuardado = Promise.resolve();
function enCola(f) { const p = colaGuardado.then(f, f); colaGuardado = p.catch(() => { }); return p; }
const guardarAhora = tipoCopia => enCola(() => guardarYa(tipoCopia));
async function guardarYa(tipoCopia) {
  if (SAVE.soloLectura || !SAVE.dueno) return false;
  arreglarDatos(DATOS);
  const r = validarDatos(DATOS);
  if (!r.ok) { console.warn('No se guarda: datos con daños graves', r.grave); return false; }
  DATOS.guardado = Date.now();
  const texto = 'js:' + JSON.stringify(DATOS);
  try {
    await KV.set('save', texto);
    await KV.set('save_meta', { v: SAVE_VERSION, t: DATOS.guardado, juego: JUEGO_VERSION, bytes: texto.length });
    if (tipoCopia) await bakPut(tipoCopia, texto);
    else { const L = await bakList(); const ult = L.find(b => b.tipo === 'auto'); if (!ult || Date.now() - ult.t > 10 * 60 * 1000) await bakPut('auto', texto); }
    SAVE.ultimoOk = Date.now(); return true;
  } catch (e) { console.warn('Error al guardar', e); return false; }
}
let guardarT = null;
function guardarPronto() { clearTimeout(guardarT); guardarT = setTimeout(() => guardarAhora(), 400); }
function bakRestore(k) {
  return enCola(async () => {
    let d; try { d = prepararDatos(await KV.get(k)); } catch (e) { return false; }
    if (SAVE.soloLectura || !SAVE.dueno) return false;
    await bakCurrent('reemplazo');
    DATOS = d; const ok = await guardarYa();
    aplicarEstilo(); aplicarModelo(); ajustarTamano(); aplicarTactil();
    return ok;
  });
}
async function registrarPartido(gf, gc) {
  const s = DATOS.estad;
  s.jugados++; s.gf += gf; s.gc += gc;
  if (gf > gc) s.ganados++; else if (gf < gc) s.perdidos++; else s.empatados++;
  DATOS.historial.push({ t: Date.now(), local: G.eqs[0].id, visita: G.eqs[1].id, gf, gc });
  if (DATOS.historial.length > 30) DATOS.historial.splice(0, DATOS.historial.length - 30);
  return guardarAhora('partido');
}
// una sola pestaña guarda a la vez: la última que se abre toma el control
function vigilarPestanas() {
  try {
    const bc = new BroadcastChannel('pelotazo');
    bc.onmessage = e => {
      if (e.data && e.data.tipo === 'hola' && e.data.id !== SAVE.id && SAVE.dueno) {
        SAVE.dueno = false; toast('Abriste el juego en otra pestaña. Esta ya no guarda tu progreso.', 6000);
      }
    };
    bc.postMessage({ tipo: 'hola', id: SAVE.id });
    SAVE.canal = bc;
  } catch (e) { }
}
