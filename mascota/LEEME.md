# Mascota Laboratorio Clínico Villanueva — biblioteca de animaciones

Personaje animado (luchador con bata) listo para pegar en videos de la marca. Todo sale de `original.jpg`
con `animar.py` (recorte + piezas), `efectos.py` (signos, estrellas, vena…) y `biblioteca.py` (emociones).

## Catálogo (`salida/`)

| Clip | Cuándo usarlo | Duración |
|---|---|---|
| `idle` | Personaje en pantalla mientras habla la voz o sale texto | 3 s (loop) |
| `entrada` | Aparece con rebote; abrir una escena | 1.2 s |
| `pulgar` | "¡Muy bien!", confirmar un resultado | 2 s (loop) |
| `aprobado` | Dos pulgares arriba, cierre de un mensaje | 1.5 s (loop) |
| `alegre` | Buenas noticias, promociones, resultados listos | 2 s (loop) |
| `sorprendido` | Dato curioso, "¿sabías que…?", cifras llamativas | 2.5 s |
| `pensativo` | Preguntas, "¿cuándo debo hacerme este estudio?" | 3 s (loop) |
| `brazos_arriba` | Celebración, ofertas, saltando | 1.6 s (loop) |
| `molesto` | Mitos o malas prácticas ("no te automediques") | 2 s (loop) |
| `mascota_sin_fondo.png` | Imagen fija sin fondo | — |

Cada clip existe en tres formatos (30 fps):
- `<clip>.webm` — **transparente real** (VP9 con alfa), 1024×1800. Para web, Remotion, Canva y navegadores Chrome/Edge.
- `<clip>_pantalla_verde.mp4` — H.264 estándar, fondo verde `#00FF00`, 512×900. Abre en cualquier equipo; quitar con croma en CapCut, DaVinci, Premiere, Clipchamp.
- `<clip>_preview.gif` — vista previa sobre fondo azul.

> No se usa ProRes/`.mov`: Windows no lo abre (error `0xC00D5212`).

## Cómo usarlos en un video nuevo (para Claude)

1. Elige el clip por la escena (tabla de arriba) y **copia** el `.webm` o el MP4 al proyecto del video.
2. Composición con ffmpeg (sobre un fondo/escena `escena.mp4`, personaje abajo a la derecha, 40 % del alto):
   ```
   ffmpeg -i escena.mp4 -c:v libvpx-vp9 -i salida/alegre.webm \
     -filter_complex "[1]scale=-2:ih*0.4/1[p];[0][p]overlay=W-w-40:H-h-20:shortest=0" -c:a copy out.mp4
   ```
   (ajusta escala/posición; `-c:v libvpx-vp9` antes de `-i` es necesario para leer el alfa del webm).
3. En Remotion: `<OffthreadVideo src={staticFile("alegre.webm")} transparent />` dentro de una `<Sequence>`.
4. Se pueden encadenar clips (`entrada` → `idle` → `sorprendido` → `idle`) cortando en la pose neutra:
   todos empiezan y terminan en postura parecida a `idle`.

## Regenerar o crear clips nuevos

```
pip install pillow numpy   # y ffmpeg instalado
python3 mascota/animar.py        # idle, pulgar, entrada
python3 mascota/biblioteca.py    # emociones (o: python3 mascota/biblioteca.py alegre)
```
Un clip nuevo es una función `(f, n) -> imagen` en `biblioteca.py` usando `animar.frame(...)`
(rotación de cabeza/manos/brazos, saltos con `dy`, estiramiento `sx/sy`, parpadeo `blink`, efectos `fx`).
Los efectos disponibles están en `efectos.py`.

## Límites conocidos (una sola imagen de partida)

- Solo hay una pose: se anima moviendo piezas (cabeza, manos/brazos, cuerpo) y con efectos dibujados. **No** hay giros,
  caminar, ni manos con otra forma (siempre pulgar arriba; el brazo derecho es el izquierdo en espejo).
- La expresión de la cara no cambia (la máscara tapa la boca); la emoción la dan el movimiento y los efectos.
- `molesto` es el menos convincente. Para poses nuevas (señalar, saludar, sostener algo) conviene generar/dibujar
  una imagen nueva del personaje y añadirla como pieza.
- Poner el logo/colores de marca siempre desde la imagen original; no recolorear la cabeza.
