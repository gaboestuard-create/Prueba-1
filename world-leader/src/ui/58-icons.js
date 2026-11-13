/* =====================================================================
   INTERFAZ · ICONOS DIBUJADOS (siluetas SVG, sin emoji) y menús con
   imagen: fuerzas en tarjetas, acciones diplomáticas en pestañas,
   ocupación y restitución, operaciones de guerra y gestos.
   ===================================================================== */
const ring = (x, y, r) => `M${x - r} ${y}a${r} ${r} 0 10${r * 2} 0 ${r} ${r} 0 10-${r * 2} 0z`;
const blade = a => { const p = (r, t) => (12 + r * Math.cos(t)).toFixed(1) + ' ' + (12 + r * Math.sin(t)).toFixed(1), a0 = a - .52, a1 = a + .52; return `M${p(3.6, a0)}L${p(10, a0)}A10 10 0 01${p(10, a1)}L${p(3.6, a1)}A3.6 3.6 0 00${p(3.6, a0)}z`; };
const GI = {
  // unidades
  inf: 'M6.5 8.5a5.5 5.5 0 0111 0h1V10h-13V8.5zM8 11h8v1a4 4 0 01-8 0zM4 22c0-4 3-6 8-6s8 2 8 6zM19.2 2.5l1.3.7-4.2 8-1.3-.7z',
  tan: 'M2.5 14h19l1 2.5a3 3 0 01-3 3.5h-15a3 3 0 01-3-3.5zM5 10.5h12l2 2.5H4zM8 6.5h6l1.5 3H7zM14.5 7.2H23v1.5h-8z' + ring(6, 17, 1.2) + ring(10, 17, 1.2) + ring(14, 17, 1.2) + ring(18, 17, 1.2),
  art: ring(8, 16, 5.5) + ring(8, 16, 2.5) + 'M9.5 11l12-6.5 1.4 2.6-11.5 6.4zM4 19.5l-3 1.2V22h3.5z',
  caz: 'M12 1.5l1.5 6.5 7.5 6v2.2l-7.5-2.2.3 4.2 2.2 1.8v1.5l-4-1-4 1V20l2.2-1.8.3-4.2L3 16.2V14l7.5-6z',
  bom: 'M12 3c1 0 1.6 2 2 4.500l9 6.500v2.500l-9-2 -.5 3 2.5 1.500V21h-8v-2l2.5-1.500-.5-3-9 2V14l9-6.500C10.400 5 11 3 12 3zM5.500 9h1.600v3.500H5.500zM16.900 9h1.600v3.500h-1.600z',
  dro: 'M9.5 9.500h5v5h-5zM6.200 5.100l4.300 4.300-1.100 1.100-4.300-4.300zM17.800 5.100l1.100 1.100-4.300 4.300-1.100-1.100zM5.100 17.800l4.300-4.300 1.100 1.100-4.300 4.300zM14.600 13.500l4.300 4.300-1.100 1.100-4.300-4.300z' + ring(5, 5, 3.3) + ring(5, 5, 1.9) + ring(19, 5, 3.3) + ring(19, 5, 1.9) + ring(5, 19, 3.3) + ring(5, 19, 1.9) + ring(19, 19, 3.3) + ring(19, 19, 1.9),
  fra: 'M1.5 14.500h21l-3 5.500h-15zM7 10.500h8v3H7zM10.400 4h1.400v5.500h-1.400zM8.500 6h5.200v1.200H8.500zM16.500 12h4.500v1.300h-4.500zM3.500 12.500h2.500v1.200H3.500z',
  sub: 'M3 15.500c0-2 3-3.500 8-3.500h5c4 0 6.500 1.500 6.500 3.500S20 19 16 19h-5c-5 0-8-1.500-8-3.500zM10 8h4.500l1 3h-6zM12 4h3.500v1.300h-2.200V7H12zM1 11.500l2.500 2.500v3L1 19.500z',
  por: 'M.5 12h23l-.8 2.200H1.300zM3 15h18.500l-2.500 5H5zM14.500 6.500h4.500V11h-4.500zM16 3h1.400v3H16zM3.500 10l5-.01 1 1.200H3.500z',
  // bases
  cuartel: 'M3 21V11.500l9-5 9 5V21h-6.500v-5.500h-5V21zM11.300 1.500h6.200l-1.300 1.800 1.300 1.800h-4.800V6.500h-1.400z',
  aerea: 'M9 2h6l4 20H5zM11.400 4h1.200v3h-1.200zM11.400 9.500h1.200v3.500h-1.200zM11.400 15.500h1.200V20h-1.200z',
  naval: 'M12 2a2.600 2.600 0 00-1.100 5V9H8v2h2.900v8.200A6 6 0 016.200 15H8l-3-4-3 4h2.100a8 8 0 0015.800 0H22l-3-4-3 4h1.800a6 6 0 01-4.700 4.200V11H16V9h-2.900V7A2.600 2.600 0 0012 2z',
  // materias primas
  pet: 'M12 2c4 5 7 8.500 7 12a7 7 0 01-14 0c0-3.500 3-7 7-12z',
  gas: 'M12 2c1 4 6 6 6 12a6 6 0 01-12 0c0-2.500 1-4 2.500-5.500 0 2 .8 3 2 3.500C10 9 10.500 5 12 2z',
  car: 'M2 21l2.500-6.500 5-2 3.500 4-1 4.500zM12.500 21l1.500-7 5-1.500 3.500 5-1.500 3.500zM7.500 11.500l2-5.500h5l2.500 4.500-4.500 2.500z',
  oro: 'M2.500 13.500h7.500l1.800 6H.700zM14 13.500h7.500l1.800 6H12.200zM8.200 5h7.600l1.800 6.500H6.400z',
  cob: 'M4 3.500h16v3H4zM4 17.500h16v3H4zM7 8h10v1.600H7zM7 11.200h10v1.600H7zM7 14.400h10V16H7z',
  lit: 'M3 7h16v10H3zM19.500 10H22v4h-2.500zM12 8.500l-4 4.200h2.600l-1.100 3 4.200-4.400h-2.700z',
  hie: 'M4 4h16v3.500h-6v9h6V20H4v-3.500h6v-9H4z',
  ura: ring(12, 12, 2) + blade(-Math.PI / 2) + blade(Math.PI / 6) + blade(Math.PI * 5 / 6),
  tie: 'M7 3h10l5 6H2zM2.800 10.500h18.400L12 21.500z',
  tri: 'M11.400 9h1.200v13h-1.200zM12 1.500c1.600 1.600 1.600 3.900 0 5.500-1.600-1.600-1.600-3.900 0-5.500zM6.500 5.500c2.200.2 3.900 1.600 4.500 3.800-2.200-.2-3.900-1.600-4.500-3.800zM17.500 5.500c-2.200.2-3.900 1.600-4.500 3.800 2.200-.2 3.900-1.600 4.500-3.800zM6.500 10.500c2.200.2 3.900 1.600 4.500 3.800-2.200-.2-3.900-1.600-4.500-3.800zM17.500 10.500c-2.200.2-3.900 1.600-4.500 3.800 2.200-.2 3.900-1.600 4.500-3.800zM6.500 15.500c2.200.2 3.900 1.600 4.500 3.800-2.200-.2-3.900-1.600-4.500-3.800zM17.500 15.500c-2.200.2-3.900 1.600-4.500 3.800 2.200-.2 3.900-1.600 4.500-3.800z',
  caf: 'M18 4.500c3.200 3.200 2.700 8.900-1 12.600s-9.400 4.200-12.600 1S1.700 9.200 5.400 5.500 14.800 1.300 18 4.500zM16.300 6c-3 2-2 5-4 7s-5 2-6.300 5l1 .7c1-2.600 4-2.600 6-4.600s1.200-5 4.200-7.200z',
  pla: 'M4 8c0-2 3.600-3.500 8-3.500s8 1.500 8 3.500-3.600 3.500-8 3.500S4 10 4 8zM4 11.500v2c0 2 3.600 3.500 8 3.500s8-1.500 8-3.500v-2c0 2-3.600 3.500-8 3.500s-8-1.500-8-3.500zM4 16.500v2c0 2 3.600 3.500 8 3.500s8-1.500 8-3.500v-2c0 2-3.600 3.500-8 3.500s-8-1.500-8-3.500z',
  niq: 'M7 3.300h10l5 8.700-5 8.700H7L2 12z' + ring(12, 12, 4),
  // sectores sociales
  obr: 'M21 7a5 5 0 01-6.700 4.700L6.500 19.500a2.100 2.100 0 01-3-3l7.800-7.800A5 5 0 0117 2l-3 3 .8 3.200L18 9z',
  emp: 'M3 8h18v4H3zM3 13.500h18V20H3zM9 7V4.500h6V7h-1.600V6h-2.800v1z',
  jov: 'M12 4L1 9.500 12 15l11-5.500zM5.500 13.500V17c2 2 4 3 6.500 3s4.500-1 6.500-3v-3.500L12 16.800zM20.800 11.500H22V16h-1.200z',
  rel: 'M9 11h6v10.500H9zM12 2.500c1.500 2 2.600 3.200 2.600 4.800a2.600 2.600 0 01-5.200 0c0-1.600 1.100-2.800 2.600-4.800z',
  rur: 'M3 21V10l4.500-5.500h9L21 10v11h-6v-6.500H9V21zM10.500 7.500h3v3h-3z',
  mil: 'M8 2h8l-2.500 6.500h-3z' + ring(12, 15, 6.500) + ring(12, 15, 2.600),
  med: 'M12 3l10 9h-3v9h-5v-6h-4v6H5v-9H2z',
  jub: 'M6 2h12v2.500c0 3-2.500 5-4.300 7.500 1.800 2.500 4.300 4.500 4.300 7.500V22H6v-2.500c0-3 2.500-5 4.300-7.500C8.500 9.500 6 7.500 6 4.500z',
  sin: 'M2.500 9.500h4l10-5.500v16l-10-5.500h-4zM18 8.500a4 4 0 010 7zM6 16h3.200l1.300 5h-3.200z',
  pre: 'M3 4h15v16H5a2 2 0 01-2-2zM19 9h2.500v9.500A1.500 1.500 0 0119 19.500zM5.500 6.500h10v3.200h-10zM5.500 11.500h10v1.300h-10zM5.500 14.500h10v1.300h-10z',
  tec: 'M7 7h10v10H7zM10 10h4v4h-4zM9 3h1.500v3H9zM13.500 3H15v3h-1.500zM9 18h1.500v3H9zM13.500 18H15v3h-1.500zM3 9h3v1.500H3zM3 13.500h3V15H3zM18 9h3v1.500h-3zM18 13.500h3V15h-3z',
  min: ring(12, 7, 3.200) + 'M6.500 21c0-5 2-8 5.500-8s5.500 3 5.500 8z' + ring(4.800, 9.500, 2.200) + ring(19.200, 9.500, 2.200) + 'M.800 19c0-3 1.500-5.500 4-5.500.800 0 1.500.2 2 .7-1.100 1.300-1.700 3-1.900 4.800zM23.200 19c0-3-1.500-5.500-4-5.500-.800 0-1.500.2-2 .7 1.100 1.300 1.700 3 1.900 4.800z',
  // categorías de leyes
  edu: 'M2.500 5c3-1 6-1 8.700.6v14C8.500 18 5.500 18 2.500 19zM21.500 5c-3-1-6-1-8.700.6v14c2.700-1.600 5.700-1.600 8.700-.6z',
  eco: 'M3 20h18v1.500H3zM5 12h3.200v7H5zM10.400 7h3.200v12h-3.200zM15.800 3H19v16h-3.200z',
  imp: 'M18 3.500l2 1.500L6 20.500 4 19z' + ring(7, 7, 3.400) + ring(7, 7, 1.500) + ring(17, 17, 3.400) + ring(17, 17, 1.500),
  com: 'M1.500 4h3.700l1 3H22l-2.500 8.500H8L5 5.800H1.500z' + ring(9.500, 19, 1.900) + ring(17.500, 19, 1.900),
  ext: 'M12 2.500l9 4-9 4-9-4zM2.500 8.500l8.700 3.900v9.100l-8.700-4zM21.500 8.500l-8.700 3.900v9.100l8.700-4z',
  net: ring(12, 19, 2) + 'M5.600 13.400a9 9 0 0112.800 0l-1.800 1.800a6.500 6.500 0 00-9.200 0zM1.800 9.600a14.400 14.400 0 0120.400 0l-1.800 1.800a11.900 11.900 0 00-16.800 0z',
  vj: 'M7 7h10a5 5 0 015 5v2a4 4 0 01-7.500 2h-5A4 4 0 012 14v-2a5 5 0 015-5zM7 10h1.500v1.500H10V13H8.500v1.500H7V13H5.500v-1.500H7z' + ring(15.500, 11, 1) + ring(18, 13.500, 1),
  sal: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',
  seg: 'M12 2l8 3v6c0 5-3.500 9-8 11-4.500-2-8-6-8-11V5zM11 14.600l-2.600-2.600-1.300 1.300 3.900 3.900 6-6-1.300-1.300z',
  obras: 'M6 3h2.500v18H6zM2 4.500h20v2H2zM2 6.500h3V10H2zM18.500 6.500h1.200v6h-1.200zM17.300 12.500h3.600v3.200h-3.600zM3 20.500h9V22H3z',
  // misiones, operaciones y gestos
  frontera: 'M3 5h2.600v16.500H3zM6.500 8l15 1.500v3.500l-15-1zM9 8.300l1.800.2-1.300 3.600-1.700-.1zM14 8.800l1.800.2-1.300 3.600-1.700-.1zM19 9.300l1.800.2-1.300 3.600-1.700-.1z',
  paz: 'M4.500 2h1.900v20H4.500zM7.500 3.500c4-2 7 2 12 0v9.500c-5 2-8-2-12 0z',
  ejercicio: ring(12, 12, 10) + ring(12, 12, 7.300) + ring(12, 12, 4),
  bomb: ring(11, 14, 7.500) + 'M9.500 4h3v3.500h-3zM12.500 4.800c2-1.800 4.500-1.500 6 .5l-1.100.9c-1-1.300-2.600-1.500-3.900-.4zM18.500 2l.5 1.500 1.500.5-1.500.5-.5 1.500-.5-1.500-1.500-.5 1.500-.5z',
  ofensiva: 'M2.500 9.500h10.500V4.500l8.500 7.500-8.500 7.500v-5H2.500z',
  cultural: 'M9 4.500l11-2.500v13.300a3 3 0 11-2-2.800V6.600L11 8.200V18a3 3 0 11-2-2.800z',
  ultimatum: 'M12 2l11 19.500H1zM11 9h2v6.500h-2zM11 17h2v2.200h-2z',
  // grupos de acciones
  acuerdo: 'M5 2h10l4 4v16H5zM8 9h8v1.400H8zM8 12.500h8v1.400H8zM8 16h5v1.400H8z',
  regalo: 'M3 8h8v4H3zM13 8h8v4h-8zM4.500 13.500H11V21H4.500zM13 13.500h6.500V21H13zM12 7.500C10 2.500 5 4.500 8 7.500zM12 7.500c2-5 7-3 4 0z',
  presion: ring(12, 12, 10) + 'M12 5a7 7 0 015.700 11L8 6.300A7 7 0 0112 5zM6.300 8l9.700 9.700A7 7 0 016.300 8z',
  ojo: 'M1 12c3-5 7-7.500 11-7.500S20 7 23 12c-3 5-7 7.500-11 7.500S4 17 1 12z' + ring(12, 12, 4),
  pin: 'M12 2a7 7 0 00-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 00-7-7z' + ring(12, 9, 2.600),
  puerta: 'M5 2h10v20H5zM11.500 11h1.800v2.200h-1.800zM16.500 9.500l5 2.500-5 2.500v-1.700H14v-1.600h2.500z'
};
Object.assign(GI, { tierra: GI.tan, aire: GI.caz, mar: GI.fra, interior: GI.seg, ayuda: GI.sal, bloqueo: GI.naval, denuncia: GI.sin, soc: GI.min, obr2: GI.obras });
const gi = (k, cls) => `<svg class="gi ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="${GI[k] || GI.pin}"/></svg>`;
/* pone un icono delante de cada nombre conocido (en negritas, títulos y etiquetas) */
const tagIcons = (html, map) => { for (const n in map) for (const pre of ['<b>', '<h3>', '<span class="chip">']) for (const post of ['<', ' ']) html = html.split(pre + n + post).join(pre + gi(map[n]) + ' ' + n + post); return html; };
const nameMap = (O, f) => { const m = {}; for (const k in O) m[O[k].n || O[k]] = f ? f(k) : k; return m; };
const LAWIC = k => k === 'obr' ? 'obras' : k === 'mil' ? 'mil' : k;

/* ---------- paneles: iconos en recursos, sectores, leyes, bases y misiones ---------- */
{ const eco0 = PANELS.eco, pol0 = PANELS.pol, mil0 = PANELS.mil;
  PANELS.eco = t => t === 'rec' ? tagIcons(eco0(t), nameMap(D.COMMODITIES)) : eco0(t);
  PANELS.pol = t => { let h = pol0(t);
    if (t === 'sec') { h = tagIcons(h, nameMap(D.SECTORS)); for (const k in D.SECTORS) h = h.split(`data-k="${k}" >`).join(`data-k="${k}" >${gi(k)} `).split(`data-k="${k}" disabled>`).join(`data-k="${k}" disabled>${gi(k)} `); }
    if (t === 'ley') { for (const k in D.LAWCATS) h = h.split(`<span class="chip">${D.LAWCATS[k]}</span>`).join(`<span class="chip">${gi(LAWIC(k))} ${D.LAWCATS[k]}</span>`); for (const k in D.LAWCATS) h = h.split(`data-c="${k}">`).join(`data-c="${k}">${gi(LAWIC(k))} `); }
    return h; };
  PANELS.mil = t => t === 'fue' ? forcesHTML() : t === 'bas' ? tagIcons(mil0(t), nameMap(D.BASES)) : t === 'mis' ? tagIcons(mil0(t), nameMap(D.MISSIONS)) : mil0(t);
}
const resNeed = u => Object.keys(u.res).map(r => `<span class="need" title="${D.COMMODITIES[r].n}">${gi(r)}${u.res[r]}</span>`).join('') || '<span class="mut">sin materiales</span>';
function forcesHTML() {
  const s = S(), p = me(), c = CC(p), rank = Object.keys(s.c).filter(i => CC(i).alive).sort((a, b) => Q.power(b) - Q.power(a)).indexOf(p) + 1, tot = Q.catPow(p, 'tierra') + Q.catPow(p, 'aire') + Q.catPow(p, 'mar') || 1;
  return `<div class="kvs big">${kv('Fuerza total', Math.round(Q.power(p)))}${kv('Puesto mundial', '#' + rank)}${kv('Tropas', num(Q.troops(p)))}${kv('Mantenimiento', money(Q.upkeep(p)) + ' /turno')}</div>
    <div class="mix" title="Reparto de tu fuerza entre tierra, aire y mar">${Object.keys(D.CATS).map(k => `<i class="m-${k}" style="flex:${Math.max(.02, Q.catPow(p, k) / tot)}">${gi(k)} ${Math.round(Q.catPow(p, k) / tot * 100)}%</i>`).join('')}</div>
    ${s.flags.oilShort ? '<p class="warn-box">Sin petróleo ni crédito para importarlo: tus fuerzas rinden un 25% menos.</p>' : ''}
    ${Object.keys(D.CATS).map(cat => { const cap = Q.capacity(cat); return `<h4>${gi(cat)} ${D.CATS[cat]} <small class="mut">puedes formar ${Math.max(0, cap)} unidades más este turno</small></h4><div class="ucards">${Object.keys(D.UNITS).filter(k => D.UNITS[k].cat === cat).map(k => { const u = D.UNITS[k];
      return `<article class="ucard u-${cat}">${gi(k, 'xl')}<div class="grow"><div class="row"><h3>${u.n}</h3><b class="cnt num">${num(c.u[k] || 0)}</b></div><small class="mut">Fuerza ${u.pow} · ${money(Q.unitCost(k))} · mant. ${money(u.up * Q.costLvl(p))}</small><div class="needs">${resNeed(u)}</div>
        <div class="row"><button class="btn sm gold" data-a="recruit" data-k="${k}" data-n="1" ${cap < 1 ? 'disabled' : ''}>+1</button><button class="btn sm" data-a="recruit" data-k="${k}" data-n="5" ${cap < 5 ? 'disabled' : ''}>+5</button><button class="btn sm ghost" data-a="disband" data-k="${k}" ${c.u[k] ? '' : 'disabled'} aria-label="Disolver una unidad de ${u.n}">−1</button></div></div></article>`; }).join('')}</div>`; }).join('')}`;
}

/* ---------- guerras: fuerzas a la vista y operaciones ---------- */
const armyStrip = iso => `<div class="army">${Object.keys(D.UNITS).filter(k => CC(iso).u[k]).map(k => `<span title="${D.UNITS[k].n}">${gi(k)}${num(CC(iso).u[k])}</span>`).join('') || '<span class="mut">sin fuerzas</span>'}</div>`;
{ const w0 = warCard;
  warCard = w => { const p = me(), mine = w.att.includes(p) || w.def.includes(p); let h = w0(w).replace('<div class="chips">', armyStrip(w.att[0]) + '<div class="chips">'); const i = h.lastIndexOf('<div class="chips">'); h = h.slice(0, i) + armyStrip(w.def[0]) + h.slice(i);
    return mine ? h.replace('</article>', `<small class="mut">Operaciones de este turno</small><div class="row wrap">${opsHTML(w)}</div></article>`) : h; };
}
const opsHTML = w => Object.keys(D.WAROPS).map(k => `<button class="btn sm" data-a="warOp" data-w="${w.id}" data-k="${k}" title="${esc(D.WAROPS[k].d)}" ${(w.ops || {})[k] === S().turn ? 'disabled' : ''} ${k === 'bomb' ? 'data-confirm' : ''}>${gi(k)} ${D.WAROPS[k].n} · ${D.WAROPS[k].cp} CP</button>`).join('');
H.warOp = d => { const iso = UI.sheet; act('warOp', { w: +d.w, k: d.k }); if (iso && S() && !S().over && $('#modal .sheet')) { openModal(sheetHTML(iso), true, 'wide'); UI.sheet = iso; } };

/* ---------- ficha de acciones: pestañas con icono, gestos y restitución ---------- */
const SHT = [['acu', 'Acuerdos', 'acuerdo', ['Tratados', 'Cumbre bilateral', 'Encuentros', 'Gestos']], ['ayu', 'Ayuda y comercio', 'regalo', ['Dar ayuda', 'Pedir ayuda', 'Comercio']], ['pre', 'Presión', 'presion', ['Presión y presencia', 'Denuncias y amenazas', 'Operaciones encubiertas']], ['ter', 'Territorio', 'pin', ['Restitución', 'Territorio por tratado']], ['gue', 'Guerra', 'tan', ['Guerra', 'Salida personal']]];
const ROWIC = { 'Viaje diplomático': 'caz', 'Invitar a su líder': 'min', 'Ayuda económica': 'oro', 'Ayuda material': 'ext', 'Ayuda militar': 'tan', 'Solicitar ayuda': 'regalo', 'Contrato de exportación': 'com', 'Sanciones': 'presion', 'Base estratégica': 'cuartel', 'Comprar territorio': 'pin', 'Ceder territorio': 'pin', 'Declarar la guerra': 'ofensiva', 'Convocar una cumbre': 'min', 'Embargo total': 'naval', 'Pedir asilo': 'puerta', 'Marcador de la guerra': 'ejercicio' };
function occHTML(iso) {
  const o = Q.occOf(iso); if (!o.length) return ''; const pol = Q.occPol(iso), c = CC(iso);
  return `<h4>Restitución <small class="mut">ocupas ${o.length} de sus ${c.terr.length} regiones</small></h4>
    <p class="mut">Viven con miedo y rencor: cada región que retienes envenena la relación, cuesta bajas por insurgencia y nunca termina de ser tuya. Devolverla mejora mucho el trato, aunque los años de ocupación no se olvidan.</p>
    <div class="arow"><div class="grow"><b>${gi('seg')} Política de ocupación</b><small>Mano dura: menos atentados, más odio y peor imagen. Reconstrucción: pagas por región y el rencor baja.</small></div>${[['normal', 'Sin política'], ['dura', 'Mano dura'], ['blanda', 'Reconstrucción']].map(x => `<button class="btn sm ${pol === x[0] ? 'gold' : ''}" data-a="occPol" data-iso="${iso}" data-k="${x[0]}">${x[1]}</button>`).join('')}</div>
    <div class="arow"><div class="grow"><b>${gi('acuerdo')} Tratado de restitución</b><small>Como gesto (máxima gratitud), a cambio de un pacto de no agresión, o cobrando una compensación (te lo agradecen la mitad).</small></div>${sel('sh:rd', [['gesto', 'Como gesto'], ['pna', 'Por no agresión'], ['pago', 'Por compensación']], 'gesto')}${sel('sh:ri', o.map(x => [x[1], x[0].n]), o[0][1])}<button class="btn sm gold" data-a="retTerr" data-iso="${iso}">Devolver región</button><button class="btn sm" data-a="retTerr" data-iso="${iso}" data-all="1" data-confirm>Devolver todo (${o.length})</button></div>`;
}
const gestHTML = (iso, ks) => ks.map(k => { const G = D.GESTURES[k]; return `<div class="arow"><div class="grow"><b>${gi(k)} ${G.n}</b><small>${G.d}</small></div><button class="btn sm ${k === 'cultural' ? '' : 'red'}" data-a="gesture" data-iso="${iso}" data-k="${k}" ${k === 'ultimatum' ? 'data-confirm' : ''}>${k === 'cultural' ? 'Lanzar · ' + money(.2) : G.n + ' · ' + G.cp + ' CP'}</button></div>`; }).join('');
{ const s0 = sheetHTML;
  sheetHTML = iso => {
    let h = tagIcons(tagIcons(tagIcons(s0(iso), ROWIC), nameMap(Q.TNAME, () => 'acuerdo')), nameMap(D.SPYOPS, () => 'ojo')); const mk = '<div class="sheet scroll" data-sc="sheet">', i = h.indexOf(mk), end = h.lastIndexOf('</div>'), head = h.slice(0, i), body = h.slice(i + mk.length, end);
    if (Q.atWar(me(), iso)) { const w = S().wars.find(w => (w.att.includes(me()) && w.def.includes(iso)) || (w.def.includes(me()) && w.att.includes(iso))); return head + mk + body + `<h4>Operaciones de este turno</h4><div class="row wrap">${opsHTML(w)}</div>${armyStrip(iso)}</div>`; }
    const secs = (body + `<h4>Gestos</h4>${gestHTML(iso, ['cultural'])}<h4>Denuncias y amenazas</h4>${gestHTML(iso, ['denuncia', 'ultimatum'])}` + occHTML(iso)).split('<h4>').slice(1), tab = SHT.some(x => x[0] === UI.shTab) ? UI.shTab : 'acu', T = SHT.find(x => x[0] === tab);
    const part = T[3].map(n => secs.filter(x => x.startsWith(n + '</h4>') || x.startsWith(n + ' <')).map(x => '<h4>' + x).join('')).join('');
    return `${head}<nav class="itabs" role="tablist">${SHT.map(x => `<button role="tab" class="${x[0] === tab ? 'on' : ''}" data-a="shTab" data-t="${x[0]}">${gi(x[2])}<span>${x[1]}</span>${x[0] === 'ter' && Q.occOf(iso).length ? '<i class="pip"></i>' : ''}</button>`).join('')}</nav><div class="sheet scroll" data-sc="sheet-${tab}">${part || '<p class="mut pad">Nada que negociar aquí: ni ocupas territorio suyo ni hay regiones que comprar o ceder.</p>'}</div>`;
  };
}
const reSheet = iso => { if (iso && S() && !S().over && $('#modal .sheet')) { openModal(sheetHTML(iso), true, 'wide'); UI.sheet = iso; } };
H.shTab = d => { const iso = UI.sheet; UI.shTab = d.t; openModal(sheetHTML(iso), true, 'wide'); UI.sheet = iso; };
H.gesture = d => sheetAct('gesture', { iso: d.iso, k: d.k });
H.occPol = d => { const iso = UI.sheet; act('occPolicy', { iso: d.iso, k: d.k }); reSheet(iso); };
H.retTerr = d => { const iso = UI.sheet; act('returnTerr', { iso: d.iso, all: d.all ? 1 : 0, i: +fv('sh:ri', (Q.occOf(d.iso)[0] || [0, 0])[1]), deal: fv('sh:rd', 'gesto') }); delete UI.form['sh:ri']; refreshMap(); reSheet(iso); };
H.restore = d => { act('restore', { iso: d.iso, ally: d.ally ? 1 : 0 }); refreshMap(); };
H.occOpen = d => { UI.shTab = 'ter'; H.dipOpen(d); };

/* ---------- Diplomacia · Ocupación ---------- */
PTABS.dip.push(['ocu', 'Ocupación']);
{ const d0 = PANELS.dip;
  PANELS.dip = t => { if (t !== 'ocu') return d0(t); const occ = Q.occList(), an = Q.annexedList(), p = me();
    return `<p class="mut">Lo que tomas por la fuerza no se vuelve tuyo sin más: insurgencia, rencor y disturbios. Aquí decides si lo retienes, cómo lo gobiernas o si lo devuelves por tratado.</p>
      <h4>${gi('pin')} Territorio ocupado</h4>${occ.map(z => { const o = Q.occOf(z), r = Q.rel(p, z); return `<div class="arow">${fl(z)}<div class="grow"><b>${cname(z)}</b><small>${o.length} región${o.length > 1 ? 'es' : ''}: ${o.slice(0, 4).map(x => esc(x[0].n)).join(', ')}${o.length > 4 ? '…' : ''} · relación <span class="${relCls(r)}">${sgn(r)}</span> · ${{ normal: 'sin política', dura: 'mano dura', blanda: 'reconstrucción' }[Q.occPol(z)]}</small></div><button class="btn sm gold" data-a="occOpen" data-iso="${z}">Negociar</button></div>`; }).join('') || '<p class="mut">No ocupas territorio de ningún país vivo.</p>'}
      <h4>${gi('paz')} Naciones anexionadas</h4>${an.map(z => `<div class="arow">${fl(z)}<div class="grow"><b>${cname(z)}</b><small>Ya no existe: es parte de tu país y lo resiente. Devolverle la independencia te da mucha reputación y un vecino agradecido; pierdes su economía y enfadas a tus militares.</small></div><button class="btn sm" data-a="restore" data-iso="${z}" data-confirm>Restaurar</button><button class="btn sm gold" data-a="restore" data-iso="${z}" data-ally="1" data-confirm>Restaurar como aliado</button></div>`).join('') || '<p class="mut">No has borrado a ninguna nación del mapa.</p>'}`; };
}
