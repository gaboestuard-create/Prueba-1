# Storytelling «Juntos»: guion del video

**Empresa (ficticia):** NEXO, en lugar de Nintendo
**Emoción que evoca:** nostalgia
**Duración:** 60 s · 1280×720 · `video_storytelling.mp4`

## Sustitución de elementos con copyright

| Original (boceto) | En el video (genérico) |
|---|---|
| Nintendo | **NEXO**, logotipo de píldora roja con letras blancas |
| Nintendo Switch 2 | **NEXO Duo**, consola híbrida con controles laterales azul y rojo |
| Super Mario Kart World | **Súper Kart Mundial**, juego de carreras de karts |
| Mario | Piloto con gorra roja y bigote (lo usa Papá) |
| Donkey Kong | Piloto gorila (lo usa Leo) |
| Otros personajes | Piloto de cabello rosa (Mamá) y piloto de gorra verde (Sofi) |
| Música de la marca | Melodía original sintetizada (`musica.py`) |
| «Nintendo une familias» | **«NEXO une familias.»** |

## Escenas

| Tiempo | Escena | Texto en pantalla (narración) |
|---|---|---|
| 0–4 s | Logotipo de NEXO y título «Juntos» | — |
| 4–12 s | Casa dividida en tres cuartos. Papá y Mamá trabajan en sus laptops y los niños están en la cama con el celular. Cada uno aparece dentro de su propia burbuja, entre notificaciones. | *Una familia como cualquiera… cada quien en su propio mundo.* |
| 12–16 s | Leo tiene el celular al 5 % y va al armario a buscar su cargador. | *Hasta que Leo buscó su cargador en el armario…* |
| 16–20 s | Cae una caja con la etiqueta «RECUERDOS» y aparece la consola entre destellos. | *…y encontró algo que todos habían olvidado.* |
| 20–27 s | Leo conecta la consola a la TV de la sala, aparece «Súper Kart Mundial» y se sienta a jugar. | *Un control, la pantalla grande… y la sala volvió a encenderse.* |
| 27–34 s | Papá, Mamá y Sofi se sorprenden (!), se acercan y toman un control. | *Uno a uno, la curiosidad pudo más que el celular.* |
| 34–42 s | Carrera dentro del juego, con un kart por cada integrante de la familia y cajas sorpresa. | *Ahora todos corren en la misma pista.* |
| 42–46 s | Aparece «¡META!» en la TV y todos celebran entre confeti. | *¡Y las risas también cuentan como victoria!* |
| 46–53 s | La escena se congela como una foto en tono sepia: «Noche de juegos ♥». | *A veces vivimos dentro de nuestro propio mundo… pero un poco de imaginación y tiempo en familia nos regala una gran sonrisa.* |
| 53–60 s | Cierre dorado con la consola y el logotipo. | **El tiempo en familia vale oro. NEXO une familias.** |

La nostalgia aparece en tres momentos: la consola olvidada en la caja de «recuerdos», el póster de karts en el cuarto y la foto familiar en sepia del final.

## Voz en off

Voz masculina, calmada y cálida, en español latino neutro. Se generó con ElevenLabs (voz «Carlos», modelo `eleven_v4`) en una sola toma, con indicaciones de tono por frase: nostálgico al inicio, alegre en la carrera y tierno en la reflexión final. Está en `voz.mp3`. `mezcla.sh` coloca cada frase en su escena y baja la música mientras habla el narrador.

## Volver a generar el video

```bash
python3 musica.py      # crea musica.wav
node render.js         # crea video_storytelling.mp4 con música (requiere playwright y ffmpeg)
./mezcla.sh            # agrega la voz en off
```

`animacion.html` también se puede abrir en el navegador como vista previa en bucle.
