// Piezas gráficas propias (SVG) y utilidades de animación para el video.
import React from "react";
import {
  AbsoluteFill,
  Img,
  continueRender,
  delayRender,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// Fuentes de Google Fonts guardadas en public/fuentes: el navegador del render no tiene acceso a internet.
const LATIN = "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215";
const LATIN_EXT = "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+1E00-1E9F, U+2020, U+20A0-20AB, U+2113";
if (typeof document !== "undefined") {
  for (const [fam, archivo] of [["Bricolage Grotesque", "BricolageGrotesque"], ["JetBrains Mono", "JetBrainsMono"]]) {
    for (const [sub, rango] of [["latin", LATIN], ["latin-ext", LATIN_EXT]]) {
      const h = delayRender(`fuente ${fam} ${sub}`);
      new FontFace(fam, `url(${staticFile(`fuentes/${archivo}-${sub}.woff2`)})`, { weight: "100 900", unicodeRange: rango })
        .load().then((ff) => { document.fonts.add(ff); continueRender(h); });
    }
  }
}
export const TITULO = "Bricolage Grotesque";
export const MONO = "JetBrains Mono";

export const C = {
  tinta: "#0A1A2F",
  noche: "#0E2A47",
  sangre: "#C8102E",
  sangreViva: "#E8344A",
  naranja: "#D74E17",
  naranjaViva: "#FF7A2F",
  azul: "#1B6092",
  azulViva: "#3FA7E0",
  crema: "#F4EEE3",
  blanco: "#FFFFFF",
  lila: "#8A6BC1",
};

export const FPS = 30;
export const f = (s: number) => Math.round(s * FPS);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const lerp = (fr: number, a: number, b: number, from: number, to: number) => interpolate(fr, [a, b], [from, to], clamp);

/** Resorte desde el segundo `s` (en frames globales de la secuencia actual). */
export const usePop = (s: number, damping = 11, mass = 0.7) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - f(s), fps, config: { damping, mass, stiffness: 160 } });
};

/** Glóbulo rojo: disco bicóncavo con sombreado; `giro` inclina el disco en 3D. */
export const GloboRojo: React.FC<{ size: number; giro?: number; style?: React.CSSProperties }> = ({ size, giro = 0, style }) => (
  <div style={{ width: size, height: size, perspective: 800, ...style }}>
    <svg viewBox="0 0 200 200" width={size} height={size} style={{ transform: `rotateX(${giro}deg)`, overflow: "visible" }}>
      <defs>
        <radialGradient id="gr-borde" cx="45%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FF6B6B" />
          <stop offset="55%" stopColor={C.sangreViva} />
          <stop offset="100%" stopColor="#8E0A1F" />
        </radialGradient>
        <radialGradient id="gr-centro" cx="50%" cy="55%" r="50%">
          <stop offset="0%" stopColor="#A3112A" />
          <stop offset="100%" stopColor="#D52A40" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="92" fill="url(#gr-borde)" />
      <circle cx="100" cy="104" r="48" fill="url(#gr-centro)" />
      <ellipse cx="70" cy="58" rx="28" ry="12" fill="#FFFFFF" opacity="0.35" transform="rotate(-30 70 58)" />
    </svg>
  </div>
);

const blob = (seed: string, n = 14, amp = 0.09) => {
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const r = 80 * (1 + (random(seed + i) - 0.5) * 2 * amp);
    return [100 + Math.cos(a) * r, 100 + Math.sin(a) * r];
  });
  // curva suave: de punto medio a punto medio usando cada vértice como control
  const mid = (p: number[], q: number[]) => `${((p[0] + q[0]) / 2).toFixed(1)},${((p[1] + q[1]) / 2).toFixed(1)}`;
  return `M${mid(pts[n - 1], pts[0])} ` + pts.map((p, i) => `Q${p[0].toFixed(1)},${p[1].toFixed(1)} ${mid(p, pts[(i + 1) % n])}`).join(" ") + "Z";
};

/** Glóbulo blanco (neutrófilo teñido): membrana irregular y núcleo lobulado. */
export const GloboBlanco: React.FC<{ size: number; t?: number }> = ({ size, t = 0 }) => (
  <svg viewBox="0 0 200 200" width={size} height={size} style={{ overflow: "visible" }}>
    <defs>
      <radialGradient id="gb-cito" cx="45%" cy="40%" r="65%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#D9CCEB" />
      </radialGradient>
    </defs>
    <path d={blob("gb", 16, 0.07)} fill="url(#gb-cito)" stroke="#B9A6D9" strokeWidth="3" transform={`rotate(${t * 20} 100 100)`} />
    {[[78, 92, 22], [104, 80, 20], [122, 106, 21], [96, 118, 18]].map(([x, y, r], i) => (
      <circle key={i} cx={x + Math.sin(t * 2 + i) * 2} cy={y + Math.cos(t * 2 + i) * 2} r={r} fill={C.lila} opacity={0.92} />
    ))}
    {Array.from({ length: 18 }, (_, i) => (
      <circle key={"g" + i} cx={40 + random("gx" + i) * 120} cy={40 + random("gy" + i) * 120} r={2.2} fill="#C9B6E6" />
    ))}
  </svg>
);

/** Plaqueta: fragmento pequeño e irregular. */
export const Plaqueta: React.FC<{ size: number; seed: string }> = ({ size, seed }) => (
  <svg viewBox="0 0 200 200" width={size} height={size}>
    <path d={blob(seed, 9, 0.22)} fill="#B48ACF" stroke="#7E57A8" strokeWidth="8" />
    <circle cx="96" cy="98" r="22" fill="#7E57A8" opacity="0.6" />
  </svg>
);

/** Fondo: degradado nocturno con glóbulos desenfocados flotando y grano. */
export const Fondo: React.FC<{ tono?: "noche" | "ring" | "sangre" }> = ({ tono = "noche" }) => {
  const frame = useCurrentFrame();
  const bg =
    tono === "sangre"
      ? `radial-gradient(circle at 50% 40%, #B3122D 0%, #6E0716 70%, #3A0410 100%)`
      : tono === "ring"
        ? `radial-gradient(ellipse at 50% 20%, #1E4C7A 0%, ${C.noche} 45%, #050D18 100%)`
        : `radial-gradient(circle at 30% 20%, #16385C 0%, ${C.tinta} 60%, #050D18 100%)`;
  return (
    <AbsoluteFill style={{ background: bg, overflow: "hidden" }}>
      {Array.from({ length: 14 }, (_, i) => {
        const x = random("fx" + i) * 1080;
        const y = ((random("fy" + i) * 2200 - frame * (0.6 + random("fv" + i) * 1.2)) % 2200 + 2200) % 2200 - 140;
        const s = 60 + random("fs" + i) * 160;
        return (
          <GloboRojo key={i} size={s} giro={frame * 0.8 + i * 30}
            style={{ position: "absolute", left: x, top: y, opacity: tono === "sangre" ? 0.35 : 0.14, filter: `blur(${4 + random("fb" + i) * 8}px)` }} />
        );
      })}
      <AbsoluteFill style={{ background: "radial-gradient(circle, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />
      <svg width="1080" height="1920" style={{ position: "absolute", opacity: 0.07, mixBlendMode: "overlay" }}>
        <filter id="grano"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 6} /></filter>
        <rect width="1080" height="1920" filter="url(#grano)" />
      </svg>
    </AbsoluteFill>
  );
};

/** Supergabito: aparece con rebote desde los pies, respira y sale encogiéndose. Coordenadas: centro-abajo. */
export const Mascota: React.FC<{ pose: string; desde: number; hasta: number; x: number; y: number; alto: number; giro?: number }> = ({
  pose, desde, hasta, x, y, alto, giro = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = f(desde), b = f(hasta);
  if (frame < a || frame > b + 10) return null;
  const entra = spring({ frame: frame - a, fps, config: { damping: 9, mass: 0.6, stiffness: 170 } });
  const sale = frame > b ? interpolate(frame, [b, b + 8], [1, 0], clamp) : 1;
  const resp = Math.sin((frame - a) / 9) * 0.012;
  const s = entra * sale;
  return (
    <Img src={staticFile(`${pose}.png`)} style={{
      position: "absolute", left: x, top: y, height: alto,
      transform: `translate(-50%, -100%) scale(${s * (1 - resp)}, ${s * (1 + resp)}) rotate(${giro + Math.sin((frame - a) / 14) * 1.5}deg)`,
      transformOrigin: "50% 100%", filter: "drop-shadow(0 24px 30px rgba(0,0,0,0.45))",
    }} />
  );
};

/** Texto grande que entra con golpe (escala desde grande + desenfoque). */
export const Golpe: React.FC<{ s: number; children: React.ReactNode; style?: React.CSSProperties; desde?: number }> = ({ s, children, style, desde = 1.9 }) => {
  const p = usePop(s, 13, 0.6);
  const frame = useCurrentFrame();
  if (frame < f(s)) return null;
  return (
    <div style={{ fontFamily: TITULO, fontWeight: 800, color: C.blanco, lineHeight: 0.92, letterSpacing: -2,
      transform: `scale(${interpolate(p, [0, 1], [desde, 1])})`, opacity: Math.min(1, p * 2),
      filter: `blur(${(1 - Math.min(p, 1)) * 10}px)`, ...style }}>
      {children}
    </div>
  );
};

/** Etiqueta tipo "ficha de laboratorio" (mono, borde). */
export const Ficha: React.FC<{ s: number; children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({ s, children, color = C.naranjaViva, style }) => {
  const p = usePop(s, 12, 0.6);
  const frame = useCurrentFrame();
  if (frame < f(s)) return null;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 14, padding: "14px 26px", borderRadius: 18,
      background: "rgba(10,26,47,0.78)", border: `3px solid ${color}`, color: C.blanco, fontFamily: MONO, fontWeight: 700,
      fontSize: 40, letterSpacing: 1, transform: `translateY(${(1 - p) * 60}px) scale(${0.6 + p * 0.4})`, opacity: Math.min(1, p * 1.5),
      boxShadow: `0 0 40px ${color}55`, ...style }}>
      {children}
    </div>
  );
};

/** Transición con las franjas diagonales naranja/azul del arte del logo. */
export const Franjas: React.FC<{ s: number }> = ({ s }) => {
  const frame = useCurrentFrame();
  const a = f(s) - 7;
  if (frame < a || frame > a + 16) return null;
  const x = interpolate(frame, [a, a + 16], [-2200, 1400]);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {[C.naranja, C.azul, C.naranjaViva].map((col, i) => (
        <div key={i} style={{ position: "absolute", top: -400, left: x + i * 260, width: 520, height: 2800, background: col,
          transform: "rotate(18deg)", boxShadow: "0 0 60px rgba(0,0,0,0.35)" }} />
      ))}
    </AbsoluteFill>
  );
};

/** Sacudida de cámara breve desde el segundo s. */
export const useSacudida = (momentos: number[], fuerza = 18) => {
  const frame = useCurrentFrame();
  let dx = 0, dy = 0;
  for (const m of momentos) {
    const d = frame - f(m);
    if (d >= 0 && d < 12) {
      const k = (1 - d / 12) * fuerza;
      dx += Math.sin(d * 2.7) * k;
      dy += Math.cos(d * 3.3) * k;
    }
  }
  return `translate(${dx}px, ${dy}px)`;
};

export type Palabra = { t: string; s: number; e: number };
// grupos de hasta 3 palabras, cortando en puntuación
const agrupar = (palabras: Palabra[]) => {
  const grupos: Palabra[][] = [];
  let g: Palabra[] = [];
  for (const w of palabras) {
    g.push(w);
    if (g.length >= 3 || /[.,:!?]$/.test(w.t)) { grupos.push(g); g = []; }
  }
  if (g.length) grupos.push(g);
  return grupos;
};

/** Subtítulos estilo TikTok: grupo actual, palabra activa resaltada y con pequeño rebote. */
export const Subtitulos: React.FC<{ palabras: Palabra[]; top?: number; acento?: string }> = ({ palabras, top = 1400, acento = C.naranjaViva }) => {
  const GRUPOS = React.useMemo(() => agrupar(palabras), [palabras]);
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const g = GRUPOS.find((gr, i) => t >= gr[0].s - 0.05 && t < (GRUPOS[i + 1]?.[0].s ?? gr[gr.length - 1].e + 0.6) - 0.05);
  if (!g) return null;
  const inicio = f(g[0].s);
  const pop = interpolate(frame - inicio, [0, 4, 8], [0.85, 1.06, 1], clamp);
  return (
    <div style={{ position: "absolute", top, left: 70, right: 170, display: "flex", flexWrap: "wrap", justifyContent: "center",
      gap: "0 26px", transform: `scale(${pop})` }}>
      {g.map((w, i) => {
        const activa = t >= w.s - 0.03 && t < (g[i + 1]?.s ?? w.e + 0.4);
        const limpio = w.t.replace(/[¿¡]/g, "");
        return (
          <span key={i} style={{ fontFamily: TITULO, fontWeight: 800, fontSize: 82, textTransform: "uppercase", letterSpacing: -1,
            color: activa ? acento : C.blanco, WebkitTextStroke: "10px #050D18", paintOrder: "stroke fill",
            transform: activa ? "scale(1.07) rotate(-2deg)" : "none", display: "inline-block",
            textShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
            {limpio}
          </span>
        );
      })}
    </div>
  );
};

/** Barra de progreso superior (retención). */
export const Progreso: React.FC<{ total: number }> = ({ total }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", top: 0, left: 0, height: 10, width: `${(frame / total) * 100}%`,
      background: `linear-gradient(90deg, ${C.naranja}, ${C.naranjaViva})`, boxShadow: `0 0 20px ${C.naranjaViva}` }} />
  );
};

export const Escena: React.FC<{ desde: number; hasta: number; children: React.ReactNode }> = ({ desde, hasta, children }) => {
  const frame = useCurrentFrame();
  if (frame < f(desde) || frame >= f(hasta)) return null;
  // micro zoom continuo: la escena nunca está quieta
  const z = interpolate(frame, [f(desde), f(hasta)], [1, 1.045]);
  return <AbsoluteFill style={{ transform: `scale(${z})` }}>{children}</AbsoluteFill>;
};

export const Centro: React.FC<{ top: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ top, children, style }) => (
  <div style={{ position: "absolute", top, left: 60, right: 60, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", ...style }}>
    {children}
  </div>
);
