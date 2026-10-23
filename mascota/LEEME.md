# Mascota Laboratorio Clínico Villanueva — sprites para motion graphics

8 poses del luchador con bata (`poses/*.jpg`), cada una recortada sin fondo y con animación de **entrada**,
**idle** (en bucle) y **salida**. Todo se genera con `animar.py`.

## Poses — cuándo usar cada una

| Pose | Para la escena de… |
|---|---|
| `guino_pulgar` | Saludo / cierre amable, "¡te esperamos!" |
| `dos_pulgares` | Confirmar, "¡listo!", resultados entregados |
| `senalando_frente` | Hablarle al espectador: "¿Tú ya te hiciste tu chequeo?" |
| `senalando_lado` | Señalar un texto, precio o dato que aparece **a la izquierda** (voltear el clip para la derecha) |
| `pensativo` | Plantear una duda: "¿Cada cuánto debo hacerme análisis?" |
| `dudando` | "¿Y ahora qué hago?", problema antes de la solución |
| `sorprendido` | Dato impactante, "¿sabías que…?" |
| `saltando` | Promociones, celebración, buenas noticias (brinca en bucle) |

## Archivos (`salida/`)

Por pose: `<pose>.png` (imagen fija sin fondo) y
- `<pose>_entrada` — aparece con rebote desde los pies (0.6 s)
- `<pose>_idle` — respira / se balancea; se repite sin corte (2 s). `saltando` brinca, `sorprendido` tiembla, `dudando` encoge hombros.
- `<pose>_salida` — se agacha y desaparece (0.4 s)

Cada clip en dos formatos (30 fps, lienzo 1080×1620, pies siempre en la misma línea):
- `.webm` — **transparente real** (VP9 + alfa). Remotion, web, Canva, Chrome/Edge.
- `_pantalla_verde.mp4` — H.264 con fondo `#00FF00` (540×810). Abre en Windows; quitar con croma en CapCut/DaVinci/Premiere/Clipchamp.

`demo.mp4` / `demo.gif`: todas las poses encadenadas sobre fondo azul, como referencia de ritmo.

## Cómo armar una escena (para Claude)

Secuencia típica por cada línea del guion: `entrada` → `idle` (repetir lo que dure la frase) → `salida`, o cortar
directo de un `idle` a la `entrada` de la siguiente pose (el rebote disimula el cambio). La entrada termina y la
salida empieza en la pose de reposo, así que encadenan sin salto.

ffmpeg — personaje abajo a la derecha (480 px de alto), idle repetido 3 veces:
```
ffmpeg -i escena.mp4 -stream_loop 2 -c:v libvpx-vp9 -i salida/pensativo_idle.webm \
  -filter_complex "[1]scale=-2:480[p];[0][p]overlay=W-w-40:H-h:eof_action=pass" -c:a copy out.mp4
```
(`-c:v libvpx-vp9` antes del `-i` es necesario para leer el alfa del webm; para voltear añade `hflip` antes de `scale`.)

Remotion: `<OffthreadVideo src={staticFile("pensativo_idle.webm")} transparent />` dentro de un `<Loop>` / `<Sequence>`.

## Regenerar / añadir poses

Pon la imagen nueva (fondo negro) en `poses/<nombre>.jpg` y corre:
```
pip install pillow numpy   # y ffmpeg
python3 mascota/animar.py            # todas (~7 min)
python3 mascota/animar.py pensativo  # solo una (también rehace la demo con esa)
```
Estilo de idle por pose en el diccionario `IDLE` de `animar.py`.

## Límites

- En `dudando` (manos y suelas) y `saltando` (una mano) la imagen original toca el borde, así que esas partes
  salen cortadas en recto. Una versión de la imagen con más margen lo arregla.
- Las animaciones son de escala/rebote/balanceo del sprite completo (no se mueven partes por separado).
