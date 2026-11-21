// La calle en 2D: cielo con ciclo de día y noche, edificios que crecen con cada nivel,
// peatones, clientes que entran a tus negocios, autos y monedas. Solo lee el estado; no lo cambia.
const Escena = (function () {
  const LW = 170, MARGEN = 90, ALTO = 300, BASE = 220, BANQ = 250, CALLE = 255;
  const NOCHE = '#0d1030';
  const ROPA = ['#E07A5F', '#3D405B', '#81B29A', '#F2CC8F', '#5E6BAF', '#D1495B', '#2A9D8F', '#EDAE49', '#7D5BA6', '#4A4E69', '#C9CBA3', '#F4F1DE'];
  const PANTALON = ['#2F3E46', '#3D3A4B', '#5C4B51', '#1D3557', '#6B705C', '#7A5C3E'];
  const PIEL = ['#F1C7A6', '#D9A07B', '#B07A55', '#8D5A3B', '#5E3B2A'];
  const PELO = ['#2B2118', '#5A3A22', '#1A1A1A', '#B88A4A', '#8C8C8C', '#7A2E1E'];
  const AUTOS = ['#D1495B', '#2A9D8F', '#EDAE49', '#3D5A80', '#F4F1DE', '#6D597A', '#264653'];
  const CIELO = [ // hora, arriba, abajo
    [0, '#0B1026', '#1E2448'], [5, '#141A3D', '#3A3566'], [6.5, '#3E4A86', '#F2A477'], [8, '#5FA8D9', '#BFE2F2'],
    [12, '#4C9BD6', '#B8E0F5'], [17, '#5A9FD4', '#CFE4EE'], [18.6, '#5B4C8A', '#F08F5C'], [20, '#1F2350', '#433A6B'], [24, '#0B1026', '#1E2448'],
  ];
  const FUENTE = "'Bricolage Grotesque', 'Arial Black', system-ui, sans-serif";

  let D, S = null, cv, cx, dpr = 1, escala = 1, vistaW = 0;
  let camX = 0, velCam = 0, camMeta = null, arr = null, hover = null, sel = null, alSel = () => {};
  let hora = 8, msHora = 1500, t = 0, prev = 0, oscuro = 0, siguienteAuto = 2;
  const peatones = [], monedas = [], autos = [], alturas = [], humo = [], chimeneas = [];
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const r = (a, b) => a + Math.random() * (b - a);
  const elige = l => l[Math.floor(Math.random() * l.length)];
  const anchoMundo = () => MARGEN * 2 + D.lotes.length * LW;
  const maxCam = () => Math.max(0, anchoMundo() - vistaW / escala);

  // ---- Color ----
  const cache = new Map();
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  function mezcla(a, b, k) {
    const x = rgb(a), y = rgb(b);
    return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, '0')).join('');
  }
  function tinte(c) { // oscurece todo lo que no emite luz según la hora
    const k = Math.round(oscuro * 50) / 50, clave = c + k;
    if (!cache.has(clave)) { if (cache.size > 4000) cache.clear(); cache.set(clave, mezcla(c, NOCHE, k * 0.62)); }
    return cache.get(clave);
  }
  const oscuridad = h => (h >= 7.5 && h <= 17.5 ? 0 : h > 17.5 && h < 20 ? (h - 17.5) / 2.5 : h >= 5 && h < 7.5 ? 1 - (h - 5) / 2.5 : 1);
  function cielo(h) {
    let i = 0;
    while (CIELO[i + 1][0] < h) i++;
    const [h0, a0, b0] = CIELO[i], [h1, a1, b1] = CIELO[i + 1], k = (h - h0) / (h1 - h0);
    return [mezcla(a0, a1, k), mezcla(b0, b1, k)];
  }

  // ---- Fondo fijo (estrellas y horizonte), generado una vez ----
  const estrellas = Array.from({ length: 70 }, () => [Math.random(), Math.random() * 0.6, Math.random() * 1.2 + 0.3]);
  const horizonte = [0.3, 0.55].map((par, capa) => {
    const lista = [];
    for (let x = 0; x < 900;) { const w = r(28, 70); lista.push({ x, w, h: capa ? r(55, 140) : r(35, 105), v: Array.from({ length: 12 }, () => Math.random() < 0.35) }); x += w + r(0, 8); }
    return { par, lista };
  });

  // ---- Primitivas ----
  const rect = (x, y, w, h, c) => { cx.fillStyle = tinte(c); cx.fillRect(x, y, w, h); };
  function texto(s, x, y, tam, c, alin = 'center', peso = 800) {
    cx.font = `${peso} ${tam}px ${FUENTE}`;
    cx.textAlign = alin;
    cx.textBaseline = 'middle';
    cx.fillStyle = c;
    cx.fillText(s, x, y);
  }
  function brillo(x, y, rad, color, a) {
    const g = cx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, color + Math.round(a * 255).toString(16).padStart(2, '0'));
    g.addColorStop(1, color + '00');
    cx.fillStyle = g;
    cx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  function toldo(x, y, w, h, color) { // rayas y borde festoneado
    const n = Math.max(4, Math.round(w / 12)), paso = w / n;
    for (let i = 0; i < n; i++) rect(x + i * paso, y, paso + 0.5, h, i % 2 ? '#F6F1E7' : color);
    for (let i = 0; i < n; i++) {
      cx.fillStyle = tinte(i % 2 ? '#F6F1E7' : color);
      cx.beginPath();
      cx.arc(x + i * paso + paso / 2, y + h, paso / 2, 0, Math.PI);
      cx.fill();
    }
    rect(x - 2, y - 2, w + 4, 3, mezcla(color, '#000000', 0.35));
  }

  // ---- Lotes ----
  function loteVacio(x, L, propio) {
    rect(x + 8, BASE - 4, LW - 16, 4, '#7E9A5A');
    for (let i = 0; i < 6; i++) rect(x + 14 + i * 26, BASE - 8 - (i % 3) * 2, 3, 6, '#6F8B4C');
    const madera = '#8A6F55';
    for (let px = x + 10; px <= x + LW - 12; px += 15) rect(px, BASE - 26, 4, 26, madera);
    rect(x + 8, BASE - 21, LW - 16, 3, madera);
    rect(x + 8, BASE - 11, LW - 16, 3, madera);
    if (propio === null) return; // un puesto ocupa el lote: sin letrero
    const cxl = x + LW / 2;
    rect(cxl - 2, BASE - 62, 4, 40, '#5B4636');
    rect(cxl - 36, BASE - 92, 72, 36, '#1B1A2E');
    rect(cxl - 34, BASE - 90, 68, 32, propio ? '#2F8F5B' : '#F4EFE4');
    const c = tinte(propio ? '#F4EFE4' : '#1B1A2E');
    texto(propio ? 'TERRENO' : 'SE RENTA', cxl, BASE - 80, 10, c);
    texto(propio ? 'PROPIO' : `$${L.renta}/día`, cxl, BASE - 67, 9, c, 'center', 600);
  }

  function puesto(x, N, T, luz) {
    const c = x + LW / 2, col = T.color;
    if (!luz) {
      loteVacio(x, null, null);
      // vendedor detrás del mostrador
      rect(c - 6, BASE - 34, 12, 16, '#F6F1E7');
      cx.fillStyle = tinte(PIEL[N.id.charCodeAt(1) % PIEL.length]);
      cx.beginPath(); cx.arc(c, BASE - 40, 6, 0, Math.PI * 2); cx.fill();
      rect(c - 6, BASE - 47, 12, 4, '#2B2118');
      // carrito
      rect(c - 44, BASE - 18, 88, 30, col);
      rect(c - 44, BASE - 6, 88, 5, mezcla(col, '#000000', 0.25));
      rect(c - 48, BASE - 22, 96, 5, '#A0794F');
      rect(c - 30, BASE - 14, 60, 9, '#1B1A2E');
      texto(T.corto.toUpperCase(), c, BASE - 9.5, 7, tinte('#F6F1E7'));
      for (const dx of [-28, 28]) {
        cx.fillStyle = tinte('#23222F'); cx.beginPath(); cx.arc(c + dx, BASE + 14, 8, 0, Math.PI * 2); cx.fill();
        cx.fillStyle = tinte('#9A98A8'); cx.beginPath(); cx.arc(c + dx, BASE + 14, 3, 0, Math.PI * 2); cx.fill();
      }
      // mercancía según el tipo
      if (N.tipo === 'limonada') {
        rect(c + 14, BASE - 40, 16, 18, '#F7E27A');
        rect(c + 14, BASE - 42, 16, 3, '#E8E2C9');
        for (let i = 0; i < 3; i++) { cx.fillStyle = tinte('#9BCB3C'); cx.beginPath(); cx.arc(c + 18 + i * 5, BASE - 30, 2.5, 0, Math.PI * 2); cx.fill(); }
        for (let i = 0; i < 4; i++) rect(c - 32 + i * 2, BASE - 28 - i * 3, 9, 3, '#F6F1E7');
      } else if (N.tipo === 'hotdogs') {
        rect(c + 8, BASE - 28, 30, 6, '#4A4A55');
        for (let i = 0; i < 3; i++) rect(c + 10 + i * 9, BASE - 31, 7, 4, '#B5532E');
        rect(c - 34, BASE - 34, 6, 12, '#F2C230');
        rect(c - 26, BASE - 34, 6, 12, '#D1495B');
      } else {
        for (let i = 0; i < 4; i++) {
          const bx = c - 36 + i * 9 + (i > 1 ? 44 : 0);
          rect(bx, BASE - 30, 8, 8, '#6A7A8C');
          for (let k = 0; k < 3; k++) { cx.fillStyle = tinte(['#E05780', '#F2C230', '#F4F1DE', '#C2588F'][(i + k) % 4]); cx.beginPath(); cx.arc(bx + 2 + k * 2, BASE - 34 - (k % 2) * 3, 3, 0, Math.PI * 2); cx.fill(); }
        }
      }
      // sombrilla
      rect(c - 1.5, BASE - 92, 3, 72, '#4A4A55');
      const n = 8, rx = 58 + N.nivel * 3, ry = 24, cy = BASE - 88;
      for (let i = 0; i < n; i++) {
        cx.fillStyle = tinte(i % 2 ? '#F6F1E7' : col);
        cx.beginPath();
        cx.moveTo(c, cy - ry);
        cx.ellipse(c, cy, rx, ry, 0, Math.PI + (i / n) * Math.PI, Math.PI + ((i + 1) / n) * Math.PI);
        cx.closePath();
        cx.fill();
      }
      rect(c - rx, cy - 1, rx * 2, 3, mezcla(col, '#000000', 0.3));
      if (N.nivel >= 3) { rect(c + 46, BASE - 46, 4, 26, '#4A4A55'); rect(c + 38, BASE - 62, 22, 18, '#1B1A2E'); texto('$' + N.precio.toFixed(2), c + 49, BASE - 53, 6, tinte('#F2C230')); }
    } else if (oscuro > 0.2) { // foquitos en el borde de la sombrilla
      const rx = 58 + N.nivel * 3;
      if (N.nivel >= 2) for (let i = 0; i <= 8; i++) { const bx = c - rx + (i / 8) * rx * 2; brillo(bx, BASE - 86, 9, '#FFD98A', oscuro * 0.9); }
      brillo(c, BASE - 30, 50, '#FFC870', oscuro * 0.35);
    }
    return BASE - 120;
  }

  function hashLuz(id, i) { let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0; return ((h ^ (i * 2654435761)) >>> 0) % 100; }

  function local(x, N, T, luz) {
    const w = LW - 20, x0 = x + 10, pisos = N.nivel, altoPB = 74, altoPiso = 34;
    const top = BASE - altoPB - pisos * altoPiso;
    const fachada = mezcla(T.color, '#E9E4DA', 0.62), oscuroF = mezcla(T.color, '#1B1A2E', 0.25);
    if (!luz) {
      rect(x0, top, w, BASE - top, fachada);
      rect(x0 - 4, top - 8, w + 8, 9, mezcla(fachada, '#1B1A2E', 0.4));
      for (let p = 0; p < pisos; p++) {
        const y = top + 8 + p * altoPiso;
        rect(x0, y + altoPiso - 4, w, 2, mezcla(fachada, '#1B1A2E', 0.15));
        for (let i = 0; i < 3; i++) {
          const wx = x0 + 14 + i * ((w - 28 - 24) / 2);
          rect(wx - 2, y + 3, 28, 24, mezcla(fachada, '#1B1A2E', 0.35));
          rect(wx, y + 5, 24, 20, '#9CC3DA');
          rect(wx, y + 15, 24, 2, mezcla(fachada, '#1B1A2E', 0.35));
          cx.fillStyle = tinte('#C9E2EE');
          cx.beginPath(); cx.moveTo(wx + 4, y + 25); cx.lineTo(wx + 12, y + 5); cx.lineTo(wx + 16, y + 5); cx.lineTo(wx + 8, y + 25); cx.fill();
        }
      }
      // planta baja: aparador, puerta, toldo y letrero
      rect(x0, BASE - altoPB, w, altoPB, oscuroF);
      const vw = w - 50;
      rect(x0 + 8, BASE - 50, vw, 44, '#26304A');
      for (let i = 0; i < 3; i++) rect(x0 + 12, BASE - 40 + i * 12, vw - 8, 2, '#3B4566');
      for (let i = 0; i < 6; i++) rect(x0 + 16 + i * ((vw - 20) / 6), BASE - 46 + (i % 3) * 12, 8, 6, mezcla(T.color, '#F6F1E7', 0.4));
      rect(x0 + w - 36, BASE - 52, 26, 52, '#2A2A3A');
      rect(x0 + w - 33, BASE - 49, 20, 46, '#40516E');
      rect(x0 + w - 17, BASE - 28, 2, 6, '#F2C230');
      toldo(x0 + 4, BASE - 66, w - 8, 12, T.color);
      rect(x0 + 10, BASE - altoPB - 4, w - 20, 16, '#1B1A2E');
      texto(T.corto.toUpperCase(), x0 + w / 2, BASE - altoPB + 4, 10, tinte('#F6F1E7'));
      // pizarrón con el precio en la banqueta
      rect(x0 + w - 4, BASE + 4, 2, 16, '#5B4636');
      rect(x0 + w - 16, BASE + 2, 26, 16, '#2C4A3E');
      texto('$' + N.precio.toFixed(N.precio < 10 ? 2 : 0), x0 + w - 3, BASE + 10, 7, tinte('#F4EFE4'), 'center', 700);
      if (N.nivel >= 4) {
        rect(x0 + 20, top - 34, 3, 26, '#3B3A4D'); rect(x0 + w - 23, top - 34, 3, 26, '#3B3A4D');
        rect(x0 + 8, top - 50, w - 16, 22, '#1B1A2E');
        texto((S.empresa || '').toUpperCase().slice(0, 18), x0 + w / 2, top - 39, 9, tinte('#F2C230'));
      }
      if (N.tipo === 'restaurante') for (let i = 0; i < 2; i++) { rect(x0 + 14 + i * 40, BASE + 6, 22, 3, '#5B4636'); rect(x0 + 24 + i * 40, BASE + 9, 2, 10, '#5B4636'); }
    } else if (oscuro > 0.15) {
      cx.fillStyle = `rgba(255, 214, 140, ${0.85 * oscuro})`;
      cx.fillRect(x0 + 8, BASE - 50, w - 50, 44);
      cx.fillStyle = `rgba(90, 55, 30, ${0.55 * oscuro})`;
      for (let i = 0; i < 3; i++) cx.fillRect(x0 + 12, BASE - 40 + i * 12, w - 58, 2);
      for (let i = 0; i < 6; i++) { cx.fillStyle = `rgba(${i % 2 ? '200, 90, 60' : '70, 110, 150'}, ${0.6 * oscuro})`; cx.fillRect(x0 + 16 + i * ((w - 70) / 6), BASE - 46 + (i % 3) * 12, 8, 6); }
      brillo(x0 + w / 2 - 10, BASE - 26, 70, '#FFC870', oscuro * 0.45);
      for (let p = 0; p < pisos; p++) for (let i = 0; i < 3; i++) {
        if (hashLuz(N.id, p * 3 + i) < 45) continue;
        const wx = x0 + 14 + i * ((w - 28 - 24) / 2), y = top + 8 + p * altoPiso;
        cx.fillStyle = `rgba(255, 210, 120, ${0.8 * oscuro})`;
        cx.fillRect(wx, y + 5, 24, 20);
      }
      texto(T.corto.toUpperCase(), x0 + w / 2, BASE - altoPB + 4, 10, `rgba(255, 230, 170, ${oscuro})`);
      if (N.nivel >= 4) { brillo(x0 + w / 2, top - 39, 60, '#F2C230', oscuro * 0.4); texto((S.empresa || '').toUpperCase().slice(0, 18), x0 + w / 2, top - 39, 9, '#FFE08A'); }
      if (N.tipo === 'restaurante') for (let i = 0; i <= 10; i++) brillo(x0 + 4 + i * ((w - 8) / 10), BASE - 70 + Math.sin(i / 10 * Math.PI) * 6, 7, '#FFE0A0', oscuro);
    }
    return N.nivel >= 4 ? top - 52 : top - 10;
  }

  function estudio(x, N, T, luz) {
    const w = LW - 20, x0 = x + 10, top = BASE - 150 - N.nivel * 22, cols = 4, filas = Math.floor((BASE - 40 - top) / 22);
    if (!luz) {
      rect(x0, top, w, BASE - top, '#24485F');
      for (let f = 0; f < filas; f++) for (let c = 0; c < cols; c++) rect(x0 + 6 + c * ((w - 12) / cols), top + 8 + f * 22, (w - 12) / cols - 4, 18, '#4F87A6');
      cx.fillStyle = tinte('#8FC2DA');
      cx.beginPath(); cx.moveTo(x0 + 10, BASE - 40); cx.lineTo(x0 + 50, top + 8); cx.lineTo(x0 + 70, top + 8); cx.lineTo(x0 + 30, BASE - 40); cx.fill();
      rect(x0, BASE - 40, w, 40, '#1B2F3D');
      rect(x0 + w / 2 - 22, BASE - 34, 44, 34, '#5E93B0');
      rect(x0 + w / 2 - 1, BASE - 34, 2, 34, '#1B2F3D');
      rect(x0 + 6, BASE - 38, 38, 12, '#F2C230');
      texto('ESTUDIO', x0 + 25, BASE - 32, 7, tinte('#1B1A2E'));
      rect(x0 + w - 30, top - 26, 2, 26, '#3B3A4D');
      rect(x0 + w - 34, top - 28, 10, 4, '#3B3A4D');
    } else {
      for (let f = 0; f < filas; f++) for (let c = 0; c < cols; c++) {
        if (hashLuz(N.id, f * cols + c) < (oscuro > 0.2 ? 55 : 101)) continue;
        cx.fillStyle = `rgba(158, 230, 255, ${0.75 * oscuro})`;
        cx.fillRect(x0 + 6 + c * ((w - 12) / cols), top + 8 + f * 22, (w - 12) / cols - 4, 18);
      }
      if (oscuro > 0.2) brillo(x0 + w - 29, top - 28, 8, '#FF5A5A', 0.6 + 0.4 * Math.sin(t * 3));
      if (S.proyecto) brillo(x0 + w / 2, BASE - 18, 60, '#9EE6FF', 0.35);
    }
    return top - 34;
  }

  // Fábrica: nave de ladrillo con techo de dientes de sierra, cortina metálica y chimenea.
  const trabajando = (N, T) => Motor.lineasActivas(N) > 0 && hora % 24 >= T.horario[0] && hora % 24 < T.horario[1];
  function fabrica(x, N, T, luz) {
    const w = LW - 20, x0 = x + 10, alto = 88 + N.nivel * 16, top = BASE - alto, dientes = 3, dw = (w - 30) / dientes;
    const ladrillo = T.color, junta = mezcla(T.color, '#1B1A2E', 0.3), chx = x0 + w - 24, chTop = top - 46 - N.nivel * 10;
    const activa = trabajando(N, T);
    if (!luz) {
      rect(chx, chTop, 16, BASE - chTop, mezcla(ladrillo, '#1B1A2E', 0.15));
      rect(chx - 2, chTop - 4, 20, 6, '#2D2F45');
      rect(chx, chTop + 14, 16, 4, '#E9E4DA'); rect(chx, chTop + 26, 16, 4, '#E9E4DA');
      rect(x0, top, w - 30, alto, ladrillo);
      for (let y = top + 8; y < BASE - 50; y += 7) for (let bx = x0 + ((y / 7) % 2) * 6; bx < x0 + w - 32; bx += 12) rect(bx, y, 1.2, 7, junta);
      for (let i = 0; i < dientes; i++) { // dientes de sierra con vidrio
        const dx = x0 + i * dw;
        cx.fillStyle = tinte(mezcla(ladrillo, '#1B1A2E', 0.35));
        cx.beginPath(); cx.moveTo(dx, top); cx.lineTo(dx + dw, top); cx.lineTo(dx + dw, top - 20); cx.closePath(); cx.fill();
        rect(dx + dw - 6, top - 18, 5, 18, '#9CC3DA');
      }
      for (let i = 0; i < 4; i++) rect(x0 + 8 + i * ((w - 46) / 4), top + 14, (w - 46) / 4 - 6, 16, '#2B3150');
      rect(x0 + 6, BASE - 70, w - 42, 14, '#1B1A2E');
      texto((T.corto === 'Planta' ? 'ALIMENTOS' : 'ENSAMBLE'), x0 + (w - 30) / 2, BASE - 63, 8, tinte('#F2C230'));
      // cortina metálica medio abierta mientras trabaja
      const cw = 54, cxp = x0 + 10, abierta = activa ? 18 : 0;
      rect(cxp - 2, BASE - 50, cw + 4, 50, '#2D2F45');
      rect(cxp, BASE - 48, cw, 48, '#3C3A52');
      rect(cxp, BASE - 48, cw, 48 - abierta, '#8E95A3');
      for (let y = BASE - 46; y < BASE - abierta; y += 4) rect(cxp, y, cw, 1, '#6E7584');
      rect(cxp + cw + 8, BASE - 40, 18, 40, '#40516E');
      if (activa) for (let k = 0; k < 2 + N.nivel; k++) { // tarimas con cajas en la banqueta
        const bx = x0 + w - 30 - k * 13;
        rect(bx, BASE + 14, 12, 3, '#8A6F55');
        rect(bx + 1, BASE + 5, 10, 9, '#C9A46A');
        rect(bx + 1, BASE + 8, 10, 1.5, '#A38251');
      }
    } else if (oscuro > 0.15) {
      for (let i = 0; i < 4; i++) { if (!activa && i % 2) continue; cx.fillStyle = `rgba(255, 205, 120, ${(activa ? 0.85 : 0.35) * oscuro})`; cx.fillRect(x0 + 8 + i * ((w - 46) / 4), top + 14, (w - 46) / 4 - 6, 16); }
      if (activa) { cx.fillStyle = `rgba(255, 190, 110, ${0.8 * oscuro})`; cx.fillRect(x0 + 10, BASE - 18, 54, 18); brillo(x0 + 37, BASE - 10, 55, '#FFB860', oscuro * 0.4); }
      brillo(chx + 8, chTop - 2, 7, '#FF5A5A', 0.5 + 0.5 * Math.sin(t * 2.5));
    }
    if (!luz && activa) chimeneas.push([chx + 8, chTop - 4]);
    return Math.min(chTop, top - 22) - 6;
  }

  // ---- Gente y autos ----
  function nuevaPersona(x, dir, extra = {}) {
    return { x, y: r(229, 247), dir, vel: r(24, 40), fase: r(0, 6), ropa: elige(ROPA), pantalon: elige(PANTALON), piel: elige(PIEL), pelo: elige(PELO), alto: r(0.88, 1.05), a: 1, ...extra };
  }
  function persona(p) {
    const s = p.alto, x = p.x, y = p.y, mov = p.estado === 'compra' ? 0 : Math.sin(p.fase) * 4 * s;
    cx.lineCap = 'round';
    cx.globalAlpha = p.a;
    cx.strokeStyle = tinte(p.pantalon);
    cx.lineWidth = 2.8 * s;
    cx.beginPath(); cx.moveTo(x, y - 11 * s); cx.lineTo(x + mov, y); cx.moveTo(x, y - 11 * s); cx.lineTo(x - mov, y); cx.stroke();
    cx.fillStyle = tinte(p.ropa);
    cx.fillRect(x - 4.2 * s, y - 24 * s, 8.4 * s, 14 * s);
    cx.strokeStyle = tinte(p.ropa);
    cx.lineWidth = 2.2 * s;
    cx.beginPath(); cx.moveTo(x, y - 21 * s); cx.lineTo(x - mov * 0.7, y - 13 * s); cx.stroke();
    cx.fillStyle = tinte(p.piel);
    cx.beginPath(); cx.arc(x, y - 28.5 * s, 4.2 * s, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = tinte(p.pelo);
    cx.beginPath(); cx.arc(x - p.dir * 0.6 * s, y - 29.5 * s, 4.4 * s, Math.PI * 1.05, Math.PI * 1.95); cx.fill();
    if (p.bolsa) { cx.fillStyle = tinte(p.bolsa); cx.fillRect(x - mov * 0.7 - 2.5 * s, y - 13 * s, 5 * s, 6 * s); }
    cx.globalAlpha = 1;
  }
  function auto(a) {
    const y = a.carril ? 292 : 270, d = a.dir;
    rect(a.x - 28, y - 14, 56, 12, a.color);
    cx.fillStyle = tinte(a.color);
    cx.beginPath(); cx.moveTo(a.x - 16, y - 14); cx.lineTo(a.x - 10 + d * 2, y - 24); cx.lineTo(a.x + 10 + d * 2, y - 24); cx.lineTo(a.x + 18, y - 14); cx.fill();
    rect(a.x - 9 + d * 2, y - 22, 8, 7, '#A9D3E8');
    rect(a.x + 2 + d * 2, y - 22, 8, 7, '#A9D3E8');
    for (const dx of [-17, 17]) { cx.fillStyle = tinte('#1B1A2E'); cx.beginPath(); cx.arc(a.x + dx, y - 1, 5, 0, Math.PI * 2); cx.fill(); }
  }

  // ---- Mundo ----
  const puertaDe = (i, N) => MARGEN + i * LW + (N && D.negocios[N.tipo].clase === 'puesto' ? LW / 2 : LW - 31);

  function dibujar() {
    const w = vistaW / escala;
    oscuro = oscuridad(hora % 24);
    cx.setTransform(dpr * escala, 0, 0, dpr * escala, 0, 0);
    const [arriba, abajo] = cielo(hora % 24);
    const g = cx.createLinearGradient(0, 0, 0, BASE);
    g.addColorStop(0, arriba); g.addColorStop(1, abajo);
    cx.fillStyle = g; cx.fillRect(0, 0, w + 2, BASE + 2);
    if (oscuro > 0) for (const [sx, sy, sr] of estrellas) { cx.fillStyle = `rgba(255,255,240,${oscuro * (0.5 + 0.5 * Math.sin(t * 2 + sx * 40))})`; cx.fillRect(sx * w, sy * BASE, sr, sr); }
    const hd = hora % 24, astro = hd >= 6 && hd <= 19 ? (hd - 6) / 13 : ((hd + 24 - 19) % 24) / 11;
    const ax = w * (0.1 + 0.8 * astro), ay = 170 - Math.sin(astro * Math.PI) * 140;
    if (hd >= 6 && hd <= 19) { brillo(ax, ay, 46, '#FFE7A3', 0.5); cx.fillStyle = '#FFE7A3'; cx.beginPath(); cx.arc(ax, ay, 13, 0, Math.PI * 2); cx.fill(); }
    else { cx.fillStyle = '#EDEBDF'; cx.beginPath(); cx.arc(ax, ay, 10, 0, Math.PI * 2); cx.fill(); cx.fillStyle = arriba; cx.beginPath(); cx.arc(ax + 5, ay - 3, 9, 0, Math.PI * 2); cx.fill(); }
    // horizonte con paralaje
    horizonte.forEach(({ par, lista }, capa) => {
      const color = capa ? mezcla('#7F97AE', '#151933', oscuro) : mezcla('#A9BED1', '#1B2042', oscuro);
      const off = -((camX * par) % 900);
      for (let rep = -1; rep * 900 + off < w + 900; rep++) for (const e of lista) {
        const bx = off + rep * 900 + e.x;
        if (bx > w || bx + e.w < 0) continue;
        cx.fillStyle = color; cx.fillRect(bx, BASE - e.h, e.w, e.h);
        if (capa && oscuro > 0.3) e.v.forEach((on, k) => { if (on) { cx.fillStyle = `rgba(255,214,140,${oscuro * 0.6})`; cx.fillRect(bx + 6 + (k % 3) * 9, BASE - e.h + 8 + Math.floor(k / 3) * 12, 4, 5); } });
      }
    });

    cx.save();
    cx.translate(-camX, 0);
    const ini = Math.max(0, Math.floor((camX - MARGEN) / LW) - 1), fin = Math.min(D.lotes.length - 1, Math.ceil((camX + w - MARGEN) / LW));
    rect(camX - 2, BASE, w + 4, BANQ - BASE, '#B9B4A9');
    for (let x = Math.floor(camX / 34) * 34; x < camX + w; x += 34) rect(x, BASE, 1.5, BANQ - BASE, '#A5A095');
    rect(camX - 2, BASE, w + 4, 2, '#8E8A82');
    const dibujarLotes = luz => {
      for (let i = ini; i <= fin; i++) {
        const L = D.lotes[i], x = MARGEN + i * LW, N = S && S.negocios.find(n => n.lote === L.id);
        if (!N) { if (!luz) loteVacio(x, L, S ? S.lotes[L.id].propio : false); alturas[i] = BASE - 110; continue; }
        const T = D.negocios[N.tipo];
        alturas[i] = T.clase === 'puesto' ? puesto(x, N, T, luz) : T.clase === 'estudio' ? estudio(x, N, T, luz) : T.clase === 'fabrica' ? fabrica(x, N, T, luz) : local(x, N, T, luz);
      }
    };
    chimeneas.length = 0;
    dibujarLotes(false);
    for (const h of humo) { cx.fillStyle = tinte('#D9DCE3'); cx.globalAlpha = h.a; cx.beginPath(); cx.arc(h.x, h.y, h.r, 0, Math.PI * 2); cx.fill(); }
    cx.globalAlpha = 1;
    // gente de atrás hacia adelante
    peatones.sort((a, b) => a.y - b.y);
    for (const p of peatones) if (p.x > camX - 20 && p.x < camX + w + 20) persona(p);
    // faroles
    for (let i = ini; i <= fin + 1; i++) {
      const fx = MARGEN + i * LW;
      rect(fx - 1.5, BASE - 74, 3, 76 + 26, '#2D2F45');
      rect(fx - 1.5, BASE - 76, 12, 3, '#2D2F45');
      rect(fx + 6, BASE - 74, 9, 5, '#3E4060');
    }
    // calle
    rect(camX - 2, BANQ, w + 4, 5, '#8E8A82');
    rect(camX - 2, CALLE, w + 4, ALTO - CALLE, '#3B3D4A');
    for (let x = Math.floor(camX / 40) * 40; x < camX + w; x += 40) rect(x, 279, 22, 2.5, '#E8E2C9');
    D.lotes.forEach((L, i) => { if (!L.esquina) return; const zx = MARGEN + i * LW + LW / 2 - 30; for (let k = 0; k < 6; k++) rect(zx + k * 11, CALLE + 3, 6, ALTO - CALLE - 6, '#D8D3C0'); });
    for (const a of autos) if (a.x > camX - 60 && a.x < camX + w + 60) auto(a);
    // segunda pasada: todo lo que emite luz
    dibujarLotes(true);
    if (oscuro > 0.15) {
      for (let i = ini; i <= fin + 1; i++) {
        const fx = MARGEN + i * LW + 10;
        brillo(fx, BASE - 70, 26, '#FFE6A8', oscuro * 0.9);
        const cono = cx.createLinearGradient(0, BASE - 70, 0, BANQ);
        cono.addColorStop(0, `rgba(255,220,150,${0.22 * oscuro})`); cono.addColorStop(1, 'rgba(255,220,150,0)');
        cx.fillStyle = cono;
        cx.beginPath(); cx.moveTo(fx - 4, BASE - 70); cx.lineTo(fx + 4, BASE - 70); cx.lineTo(fx + 34, BANQ); cx.lineTo(fx - 34, BANQ); cx.fill();
      }
      for (const a of autos) brillo(a.x + a.dir * 30, a.carril ? 286 : 264, 24, '#FFF2C0', oscuro * 0.7);
    }
    // selección y paso del cursor
    for (const [i, color, dash] of [[hover, 'rgba(255,255,255,0.55)', [3, 4]], [sel, '#F4B41A', [7, 5]]]) {
      if (i == null || i < ini - 1 || i > fin + 1) continue;
      const x = MARGEN + i * LW;
      cx.setLineDash(dash); cx.lineWidth = 2; cx.strokeStyle = color;
      cx.strokeRect(x + 4, Math.max(8, alturas[i] - 6), LW - 8, BASE + 30 - Math.max(8, alturas[i] - 6));
      cx.setLineDash([]);
      if (color === '#F4B41A') {
        const by = Math.max(14, alturas[i] - 16) + (reducido ? 0 : Math.sin(t * 4) * 3);
        cx.fillStyle = '#F4B41A'; cx.strokeStyle = '#1B1A2E'; cx.lineWidth = 2;
        cx.beginPath(); cx.moveTo(x + LW / 2 - 8, by - 10); cx.lineTo(x + LW / 2 + 8, by - 10); cx.lineTo(x + LW / 2, by); cx.closePath(); cx.fill(); cx.stroke();
      }
    }
    // monedas
    for (const m of monedas) {
      const k = m.t / 1.3, y = m.y - k * 34, a = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
      cx.globalAlpha = Math.max(0, a);
      cx.fillStyle = '#F4B41A'; cx.strokeStyle = '#1B1A2E'; cx.lineWidth = 1.5;
      cx.beginPath(); cx.arc(m.x - 14, y, 5.5, 0, Math.PI * 2); cx.fill(); cx.stroke();
      texto('$', m.x - 14, y + 0.5, 7, '#1B1A2E');
      cx.font = `800 11px ${FUENTE}`; cx.textAlign = 'left'; cx.lineWidth = 3; cx.strokeStyle = '#1B1A2E';
      cx.strokeText(m.texto, m.x - 6, y); cx.fillStyle = '#FFE08A'; cx.fillText(m.texto, m.x - 6, y);
      cx.globalAlpha = 1;
    }
    cx.restore();
  }

  function mover(dt) {
    const w = vistaW / escala, h = Math.floor(hora) % 24;
    // peatones de paso: más gente cuando hay más tráfico
    const flujo = (D.trafico[h] / 160) * (S ? Motor.mult(S, 'trafico') : 1) * (reducido ? 0.5 : 1.1);
    const ambiente = peatones.filter(p => !p.cliente).length;
    if (Math.random() < flujo * dt && ambiente < 70) { const dir = Math.random() < 0.5 ? 1 : -1; peatones.push(nuevaPersona(dir > 0 ? -20 : anchoMundo() + 20, dir)); }
    for (let i = peatones.length - 1; i >= 0; i--) {
      const p = peatones[i];
      if (p.espera > 0) { p.espera -= dt; continue; }
      if (p.estado === 'entra') {
        p.a -= dt * 2.2; p.y -= dt * 18;
        if (p.a <= 0) { monedas.push({ x: p.meta, y: BASE - 20, texto: p.monto, t: 0 }); peatones.splice(i, 1); }
        continue;
      }
      if (p.estado === 'compra') {
        p.t -= dt;
        if (p.t <= 0) { p.estado = null; p.bolsa = elige(['#F6F1E7', '#F2C230', '#E07A5F']); monedas.push({ x: p.x, y: BASE - 40, texto: p.monto, t: 0 }); p.meta = null; }
        continue;
      }
      p.x += p.dir * p.vel * dt;
      p.fase += p.vel * dt * 0.28;
      if (p.meta != null && Math.abs(p.x - p.meta) < 3) {
        if (p.puesto) { p.estado = 'compra'; p.t = 0.6; } else { p.estado = 'entra'; p.x = p.meta; }
        continue;
      }
      if (p.x < -40 || p.x > anchoMundo() + 40) peatones.splice(i, 1);
    }
    for (let i = monedas.length - 1; i >= 0; i--) { monedas[i].t += dt; if (monedas[i].t > 1.3) monedas.splice(i, 1); }
    for (const [hx, hy] of chimeneas) if (Math.random() < dt * (reducido ? 1 : 3) && humo.length < 80) humo.push({ x: hx + r(-2, 2), y: hy, r: r(3, 5), a: 0.75, vx: r(4, 12), vy: r(-16, -10) });
    for (let i = humo.length - 1; i >= 0; i--) { const h = humo[i]; h.x += h.vx * dt; h.y += h.vy * dt; h.r += dt * 5; h.a -= dt * 0.22; if (h.a <= 0 || h.y < 0) humo.splice(i, 1); }
    siguienteAuto -= dt;
    if (siguienteAuto <= 0) {
      const carril = Math.random() < 0.5 ? 0 : 1, dir = carril ? -1 : 1;
      autos.push({ x: dir > 0 ? camX - 60 : camX + w + 60, carril, dir, vel: r(110, 170), color: elige(AUTOS) });
      siguienteAuto = r(2, 7) * (h < 6 ? 2.5 : 1);
    }
    for (let i = autos.length - 1; i >= 0; i--) { const a = autos[i]; a.x += a.dir * a.vel * dt; if (a.x < camX - 200 || a.x > camX + w + 200) autos.splice(i, 1); }
    // cámara: inercia y enfoque suave
    if (!arr) {
      if (camMeta != null) { camX += (camMeta - camX) * Math.min(1, dt * 6); if (Math.abs(camMeta - camX) < 1) camMeta = null; }
      else if (Math.abs(velCam) > 5) { camX -= velCam * dt; velCam *= Math.pow(0.04, dt); }
    }
    camX = Math.max(0, Math.min(maxCam(), camX));
  }

  function bucle(ahora) {
    const dt = Math.min(0.05, (ahora - prev) / 1000 || 0);
    prev = ahora; t += dt;
    if (D) { mover(dt); dibujar(); }
    requestAnimationFrame(bucle);
  }

  function medir() {
    const caja = cv.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    vistaW = caja.width;
    escala = caja.height / ALTO;
    cv.width = Math.round(caja.width * dpr);
    cv.height = Math.round(caja.height * dpr);
  }
  function loteEn(px) { const i = Math.floor((camX + px / escala - MARGEN) / LW); return i >= 0 && i < D.lotes.length ? i : null; }

  function iniciar(canvas, datos, opciones) {
    cv = canvas; cx = cv.getContext('2d'); D = datos; alSel = opciones.alSeleccionar;
    medir();
    new ResizeObserver(medir).observe(cv);
    for (let i = 0; i < 26; i++) peatones.push(nuevaPersona(r(0, anchoMundo()), Math.random() < 0.5 ? 1 : -1));
    camX = Math.max(0, (anchoMundo() - vistaW / escala) / 2 - 200);
    cv.addEventListener('pointerdown', e => { arr = { x: e.clientX, cam: camX, mov: false, ult: e.clientX, tu: performance.now() }; velCam = 0; camMeta = null; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => {
      const caja = cv.getBoundingClientRect();
      if (!arr) { hover = e.pointerType === 'mouse' ? loteEn(e.clientX - caja.left) : null; return; }
      const dx = e.clientX - arr.x;
      if (Math.abs(dx) > 6) arr.mov = true;
      if (arr.mov) {
        camX = Math.max(0, Math.min(maxCam(), arr.cam - dx / escala));
        const ahora = performance.now();
        velCam = ((e.clientX - arr.ult) / escala) / Math.max(0.008, (ahora - arr.tu) / 1000);
        arr.ult = e.clientX; arr.tu = ahora;
      }
    });
    const soltar = e => {
      if (arr && !arr.mov) { const i = loteEn(e.clientX - cv.getBoundingClientRect().left); if (i != null) alSel(D.lotes[i].id); }
      if (arr && performance.now() - arr.tu > 80) velCam = 0;
      if (reducido) velCam = 0;
      arr = null;
    };
    cv.addEventListener('pointerup', soltar);
    cv.addEventListener('pointercancel', () => { arr = null; });
    cv.addEventListener('pointerleave', () => { hover = null; });
    cv.addEventListener('wheel', e => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) { e.preventDefault(); camMeta = null; camX = Math.max(0, Math.min(maxCam(), camX + (e.deltaX || e.deltaY) / escala)); } }, { passive: false });
    cv.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); desplazar(e.key === 'ArrowLeft' ? -1 : 1); }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alSel(D.lotes[sel ?? loteEn(vistaW / 2) ?? 0].id); }
    });
    requestAnimationFrame(bucle);
  }

  function desplazar(lados) { camMeta = Math.max(0, Math.min(maxCam(), (camMeta ?? camX) + lados * LW * 2)); }
  function enfocar(id) {
    const i = D.lotes.findIndex(l => l.id === id);
    const x = MARGEN + i * LW + LW / 2 - vistaW / escala / 2;
    if (x < camX - LW * 0.4 || x > camX + LW * 0.4) camMeta = Math.max(0, Math.min(maxCam(), x));
  }

  // Ventas de la última hora: algunas se ven como clientes que caminan hasta tu negocio.
  function ventas(lista) {
    for (const v of lista) {
      const i = D.lotes.findIndex(l => l.id === v.lote), N = S.negocios.find(n => n.lote === v.lote);
      const k = Math.min(v.n, msHora < 500 ? 1 : msHora < 1000 ? 2 : 3);
      for (let j = 0; j < k; j++) {
        const dir = Math.random() < 0.5 ? 1 : -1, meta = puertaDe(i, N) + r(-6, 6);
        const monto = '+$' + (v.monto / k >= 10 ? Math.round(v.monto / k) : (v.monto / k).toFixed(2));
        peatones.push(nuevaPersona(meta - dir * r(70, 200), dir, { meta, cliente: true, puesto: D.negocios[N.tipo].clase === 'puesto', monto, vel: r(40, 56), espera: (j / k) * msHora / 1000 * 0.8 }));
      }
    }
  }

  return {
    iniciar, ventas, enfocar, desplazar,
    estado(s) { S = s; },
    reloj(h, ms) { hora = h; msHora = ms; },
    seleccion(id) { sel = id ? D.lotes.findIndex(l => l.id === id) : null; },
  };
})();
