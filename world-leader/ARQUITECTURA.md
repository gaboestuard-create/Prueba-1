# WORLD LEADER · Guía de arquitectura

Para cambiar jugabilidad o ampliar fases sin romper el resto del juego.

## Cómo se construye

`node build.js` une todo `src/` en `world-leader.html` (jugable al abrirlo en el navegador), `dist/artifact.html` (para publicar en claude.ai) y `dist/core.js` (motor sin interfaz, para las pruebas).

| Orden | Capa | Archivos | Regla |
|---|---|---|---|
| 1 | Datos | `src/data.js` y luego `src/data-*.js` en **orden alfabético** | Solo datos. Un archivo que use `D.fx` (el lenguaje de efectos de eventos) debe ordenarse **después** de `data-events2.js`. |
| 2 | Motor | `src/engine/NN-*.js` en orden alfabético, dentro de **una sola función** | Todo el estado vive en `S` y es JSON puro. Los archivos que exportan algo en `WL.Game.q` deben ordenarse antes de `80-turn.js` (por eso existen `7a…7d`, que van detrás de `79-*` y antes de `80-turn`). |
| 3 | Globo | `src/globe.js` | Three.js. Su API pública es `WL.Globe` (`paint`, `focus`, `trip`, `setTheatre`, `fx`, `setQuality`…). |
| 4 | Interfaz | `src/ui/NN-*.js` en orden alfabético, dentro de **una sola función** | Solo lee el estado (`G.S`, `G.q`) y actúa con `act('nombre', args)`. Nunca modifica `S` directamente, salvo el editor. |

## Mapa por fase

- **Fase 1**: `10-core` (estado, `hook`, `safe`, guardado), `20-economy`, `30-politics`, `40-diplomacy`, `50-war`, `60-ai`, `70-events`, `80-turn`. Interfaz: `10-base`, `20-start`, `30-hud`, `40-panels`, `50-scenes`, `90-boot`.
- **Ampliación** previa a la Fase 2: `65-tech-spy`, `66-regions`.
- **Fase 2 y pulidos**: `67…77` en el motor; `45…59` en la interfaz.
- **Ampliaciones posteriores**: `78-conquest` (ocupación, resistencia), `79-initiative`, `79-race`, `79-world`.
- **Fase 3**: `7a-theatre` (frente y batallas), `7b-wareco` (economía y diplomacia de guerra), `7c-intel` (espionaje), `data-war.js`, `ui/5a-war.js`.
- **Fase 4**: `7d-story` (sinergias, diario, frases, legado), `data-story.js` (rasgos, 40 eventos, frases), `ui/12-cfg.js` (ajustes), `ui/15-sound.js` (audio procedural), `ui/5b-feel.js` (experiencia), y en `globe.js` auroras, partículas y calidad.

## Cómo extender sin romper

- **Ampliar en vez de reescribir.** Las funciones declaradas con `function` se pueden envolver desde un archivo posterior:
  ```js
  { const f0 = laFuncion; laFuncion = (...a) => { const r = f0(...a); /* lo nuevo */ return r; }; }
  ```
  Igual con `ACT.x`, `PANELS.x` y `H.x`. Las declaradas con `const` no se pueden envolver: hay que exportar otra cosa o editar el archivo original.
- **Fases del turno** (`hook`): `new`, `load`, `player`, `world`, `late`, `finance`. Cada hook corre dentro de `safe()`: si falla, se registra en `S.errs` y el turno continúa.
- **Partidas antiguas.** Todo campo nuevo del estado necesita su valor por defecto en `hook('load', …)`.
- **Comentarios.** No pongas `// comentario` en medio de una línea de código: anula el resto de la línea. Ya provocó dos errores de compilación.
- **Números de balance** (unidades, terreno, clima, doctrinas, leyes, eventos, descubrimientos, fábricas): están en `src/data*.js` y son editables.

## Pruebas

| Comando | Qué comprueba |
|---|---|
| `npm test` | Partidas con acciones al azar en 10 países; determinismo de guardar y cargar; una partida guardada antigua; todas las opciones de todos los eventos; recorridos completos de guerra, ocupación, carrera tecnológica, fábricas y legado. |
| `npm run soak` | 150 turnos en 3 países: errores internos, crecimiento del estado, turnos lentos y recarga idéntica. |
| `npm run balance` | Bots de estrategia única (equilibrada, dinero, comercio, pasiva, espionaje, tortuga, guerra). Ninguno debe dominar. Acepta países y bots: `node balance.js RU,CN guerra,tortuga`. |
| `npm run check` | Todo lo anterior salvo el balance. |

## Ajustes del jugador

Se guardan en el navegador (`wl_cfg`), no en la partida: calidad (auto, baja, media o alta), reducir movimiento, volúmenes por canal, silencio, portada del periódico, cámara cinematográfica y modo observador. El autoguardado está en `wl_save`, con una copia del turno anterior en `wl_save_bak`; las ranuras manuales en `wl_slot1` a `wl_slot3`.
