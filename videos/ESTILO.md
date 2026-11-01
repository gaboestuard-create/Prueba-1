# Estilo base de video — "Villanueva editorial"

Sale de la **prueba 1** (`prueba_01.mp4`), la que más gustó. Es el **punto de partida por defecto**, no una regla:
si el usuario pide otra cosa para un video (otro tono, otras fuentes, sin mascota, sin voz…), se sigue lo que pida
y se ignora la parte de esta guía que choque. Cualquier punto se puede quitar o cambiar por video.

## Formato
- Vertical 1080×1920, 30 fps, 30–40 s. Video informativo corto con voz en off + música.
- Una idea por escena, 4–7 s cada una. Alternar escenas **editoriales** con escenas de **cuaderno de laboratorio**.

## Paleta
| Uso | Color |
|---|---|
| Papel (fondo base) | `#F2E9D6` con textura de fibras |
| Tinta (texto) | `#1d1a17` |
| Naranja marca | `#D74E17` |
| Azul marca | `#1B6092` |
| Rojo de sello / límite | `#b3261e` |

Fondos por escena (variar el orden): papel crema · papel cuadriculado azul · naranja lleno · plano azul con cuadrícula
blanca · panel azul con borde rasgado · cierre claro con franjas diagonales naranja/azul (como el logo).

## Tipografías (todas libres, de `@fontsource` en npm)
- **Fraunces 900 itálica**: titulares enormes ("¿Cada / cuánto?", el "1" gigante).
- **Special Elite**: máquina de escribir para títulos de las escenas de laboratorio ("FIG. 1 — …").
- **Caveat 700**: anotaciones a mano en azul o naranja ("Casi nadie lo sabe.").
- **IBM Plex Mono 700** en mayúsculas espaciadas: etiquetas pequeñas, cabecera tipo revista y avisos.
- Evitar Inter, Poppins, Montserrat y similares: son las que delatan el "video hecho con IA".

## Textura y acabado
- Papel con fibras + **grano** animado a 12 fps (multiply) + viñeta suave. Nada se ve "limpio de computadora".
- Sombras **duras** desplazadas (sin difuminar), como recortes de papel pegados.

## Motion graphics (lenguaje)
- Titulares que suben desde una máscara con un pequeño rebote.
- **Sellos** que caen con escala 2.4→1 y golpe sonoro ("¡SIN AVISO!", "CHEQUEO").
- Subrayados, tachones y gráficas **dibujados a mano** (trazo que avanza).
- Texto que se teclea en máquina de escribir; números gigantes que golpean con una pequeña vibración.
- Fichas y etiquetas tipo tarjeta que entran deslizando, ligeramente giradas.
- **Transiciones**: barrido de papel rasgado en dos colores de la marca. Sin fundidos ni cortes con destello.

## Mascota
- Una pose por escena, elegida con `mascota/LEEME.md`. Se ve como **sticker**: contorno blanco y sombra dura.
- Entra al inicio de la escena y hace su animación de salida justo antes del barrido.
- Deja espacio para el texto: normalmente va abajo y el texto arriba o a un lado.

## Audio
- Voz: ElevenLabs, **"Daniel Virgen"** (`7QXA3lh7d25G1SzsIJdv`, acento mexicano). `eleven_v4` suena mejor
  (~1 crédito por carácter). `eleven_turbo_v2_5` cuesta la mitad, pero suena más plano. Cotizar antes con `estimate_only`.
- Música lo-fi suave y cálida que baja cuando habla la voz (ducking).
- Efectos sincronizados: whoosh en cada barrido, "pop" al entrar la mascota, golpe en sellos, tecleo y campanita
  en el dato clave.
- Marcar las escenas sobre las pausas reales de la voz (`ffmpeg … silencedetect`), no sobre tiempos supuestos.

## Contenido de salud
- Hablar de "referencia general" y de "según indique tu médico", con un aviso pequeño en pantalla.
- No inventar cifras, precios, tiempos de entrega ni servicios del laboratorio. Lo que no se sepa, se pregunta.

## Recursos opcionales (solo en momentos puntuales)
- **3D** (three.js en el navegador, ver `prueba_02_fuente/`): tubo de muestra, centrífuga, analizador, reporte.
  Solo para un momento concreto que lo pida (p. ej. mostrar cómo se separa el suero). No es parte fija del estilo.
- **B-roll real**: clips del laboratorio grabados por el usuario. Siempre mejor que el 3D cuando existan.
- La prueba 2 (oscura y cinematográfica, con indicadores de paso) queda como estilo alternativo de referencia.

## Cómo rehacer o modificar la prueba 1
```
cd videos/prueba_01_fuente
./preparar.sh                                   # fuentes, cuadros de la mascota y texturas
python3 -m http.server 8765 &                   # index.html se sirve desde aquí
node render.js stills stills 1.0 13.9           # capturas sueltas para revisar
node render.js range out 0 1020 30              # todos los cuadros (34 s a 30 fps); repartir en 4 procesos acelera
python3 audio.py                                # music.wav + sfx.wav
ffmpeg -i voz.mp3 -i music.wav -i sfx.wav -filter_complex "[0:a]aresample=44100,apad=whole_dur=34.2,asplit[v1][v2];[1:a]volume=0.5[m];[m][v2]sidechaincompress=threshold=0.02:ratio=9:attack=15:release=450[md];[2:a]volume=0.8[s];[v1][md][s]amix=inputs=3:normalize=0:duration=longest,loudnorm=I=-16:TP=-1.5:LRA=9,atrim=0:34.0[a]" -map "[a]" -c:a aac -b:a 192k mix.m4a
ffmpeg -framerate 30 -i out/f%05d.jpg -i mix.m4a -c:v libx264 -preset slow -crf 25 -pix_fmt yuv420p -c:a copy -shortest prueba_01.mp4
```
Los tiempos de cada escena están en `index.html` (segundos absolutos, alineados con `voz.mp3`). Si cambia la voz,
hay que volver a medir las pausas y mover esos tiempos.
