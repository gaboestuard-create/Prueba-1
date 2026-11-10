// Datos: carga la base (data/db.json, o data/db.js si se abre con file://), deriva atributos y arma alineaciones.
(function () {
  'use strict';
  const G = window.G, clamp = G.clamp;
  const Data = (G.Data = { teams: [], leagues: [] });

  // Perfil por posición (diferencia respecto a la media) y ajuste por estilo. Lo usa tools/gen-db.js.
  const BASE = {
    GK: { pac: -30, sho: -55, pas: -18, dri: -35, def: -45, phy: -8, gk: 2 },
    CB: { pac: -10, sho: -30, pas: -14, dri: -16, def: 3, phy: 3 },
    LB: { pac: 3, sho: -22, pas: -6, dri: -5, def: -2, phy: -5 },
    DM: { pac: -8, sho: -14, pas: -2, dri: -5, def: 1, phy: 2 },
    CM: { pac: -6, sho: -8, pas: 3, dri: 1, def: -10, phy: -5 },
    AM: { pac: -3, sho: -3, pas: 3, dri: 4, def: -28, phy: -14 },
    LW: { pac: 5, sho: -5, pas: -4, dri: 4, def: -32, phy: -14 },
    ST: { pac: 1, sho: 3, pas: -12, dri: -2, def: -45, phy: -3 },
  };
  BASE.RB = BASE.LB; BASE.LM = BASE.RM = BASE.RW = BASE.LW;
  const STY = { velocista: { pac: 7 }, regateador: { dri: 5, pac: 2 }, tanque: { phy: 9, pac: -4 }, organizador: { pas: 5 }, cazagoles: { sho: 3 }, muro: { def: 3, phy: 4 }, francotirador: { sho: 4 }, todoterreno: { phy: 5 }, carrilero: { pac: 3 } };
  const KEYS = ['pac', 'sho', 'pas', 'dri', 'def', 'phy', 'gk'];

  Data.attrs = function (pos, ovr, style, name) {
    const base = BASE[pos] || BASE.CM, s = STY[style] || {}, h = G.hash(name), out = {};
    KEYS.forEach((k, i) => { out[k] = clamp(Math.round(ovr + (base[k] || 0) + (s[k] || 0) + (((h >>> (i * 4)) & 7) - 3)), 15, 99); });
    if (pos !== 'GK') out.gk = 8 + (h & 7);
    return out;
  };

  // Qué posiciones sirven para cada puesto de la formación, de mejor a peor.
  const FIT = {
    GK: ['GK'], CB: ['CB', 'DM', 'LB', 'RB'], LB: ['LB', 'RB', 'CB', 'LM'], RB: ['RB', 'LB', 'CB', 'RM'], DM: ['DM', 'CM', 'CB'], CM: ['CM', 'DM', 'AM'],
    AM: ['AM', 'CM', 'LW', 'RW', 'ST'], LM: ['LM', 'LW', 'RM', 'RW', 'LB', 'CM', 'AM'], RM: ['RM', 'RW', 'LM', 'LW', 'RB', 'CM', 'AM'],
    LW: ['LW', 'LM', 'RW', 'RM', 'ST', 'AM'], RW: ['RW', 'RM', 'LW', 'LM', 'ST', 'AM'], ST: ['ST', 'LW', 'RW', 'AM'],
  };
  Data.lineup = function (team, formation) {
    const slots = G.AI.FORM[formation] || G.AI.FORM['4-4-2'], used = new Set();
    return slots.map((slot) => {
      let best = null, bs = -1e9;
      for (const pl of team.players) {
        if (used.has(pl)) continue;
        const i = FIT[slot.r].indexOf(pl.pos), s = pl.ovr - (i < 0 ? (slot.r === 'GK' || pl.pos === 'GK' ? 200 : 25) : i * 4);
        if (s > bs) { bs = s; best = pl; }
      }
      used.add(best);
      return { info: best, slot };
    });
  };

  Data.rating = function (team) { // ataque / medio / defensa / global del once
    const l = Data.lineup(team, team.formation), avg = (ln) => { const a = l.filter((x) => x.slot.l === ln || (ln === 'D' && x.slot.l === 'G')); return Math.round(a.reduce((s, x) => s + x.info.ovr, 0) / (a.length || 1)); };
    const r = { att: avg('F'), mid: avg('M'), def: avg('D') };
    r.ovr = Math.round((r.att + r.mid + r.def) / 3);
    return r;
  };

  // Equipos de respaldo por si no hay base de datos.
  function fallback(id, name, short, c1, c2, ovr) {
    const pos = ['GK', 'LB', 'CB', 'CB', 'RB', 'DM', 'CM', 'CM', 'AM', 'LW', 'RW', 'ST', 'ST', 'LM', 'RM', 'GK'];
    const sty = ['atajador', 'carrilero', 'muro', 'equilibrado', 'equilibrado', 'todoterreno', 'organizador', 'equilibrado', 'regateador', 'velocista', 'regateador', 'cazagoles', 'tanque', 'equilibrado', 'equilibrado', 'equilibrado'];
    return {
      id, name, short, type: 'club', league: 'demo', formation: '4-4-2', colors: { shirt: c1, sleeves: c1, shorts: c2, socks: c1, gk: '#e8d21d' }, crest: 'plain',
      players: pos.map((p, i) => { const n = short + ' ' + (i + 1), o = ovr + ((i * 7) % 9) - 4; return { name: n, age: 22 + (i % 9), nat: '—', pos: p, ovr: o, pot: o + 2, style: sty[i], attr: Data.attrs(p, o, sty[i], n) }; }),
    };
  }

  function use(db) {
    if (!db || !db.teams || !db.teams.length) return;
    Data.teams = db.teams; Data.leagues = db.leagues || [];
  }

  Data.load = function (done) {
    Data.teams = [fallback('rojos', 'Rojos FC', 'ROJ', '#c8102e', '#ffffff', 78), fallback('azules', 'Azules FC', 'AZU', '#1d4ed8', '#0b1b4d', 78)];
    Data.leagues = [{ id: 'demo', name: 'Demo' }];
    use(window.GOLAZO_DB);
    if (typeof fetch !== 'function' || typeof location === 'undefined' || location.protocol === 'file:') return done();
    fetch('data/db.json').then((r) => r.json()).then(use).catch(() => {}).then(done); // db.json manda si hay servidor
  };
  Data.byId = (id) => Data.teams.find((t) => t.id === id);
})();
