# TikToks de Laboratorio Clínico Villanueva (Remotion)

Un proyecto, una composición por video (1080×1920, 30 fps):

| Composición | Archivo | Resultado |
|---|---|---|
| `Biometria` | `src/Video.tsx` | `out/biometria_tiktok.mp4` (68 s): explicativo, tono enérgico |
| `DiaDelMedico` | `src/DiaMedico.tsx` | `out/dia_del_medico_tiktok.mp4` (41 s): felicitación, tono cálido |

Piezas compartidas en `src/piezas.tsx`: `Escena`, `Centro`, `Golpe` (texto con golpe), `Ficha`, `Mascota`
(Supergabito con entrada/salida), `Subtitulos` (recibe la lista de palabras), `Franjas` (transición), `Progreso`,
`useSacudida`, glóbulos y plaquetas en SVG.

## Día del Médico
- Recorrido emocional de la noche al día: reloj de madrugada y electrocardiograma, "desvelos, guardias, decisiones
  difíciles", la palabra de aliento, el "¡gracias!" con confeti, "por escuchar, explicar, acompañar", el paciente que
  vuelve a casa, "nosotros leemos la sangre, ustedes lo convierten en cuidado y vida", y el cierre con el logo.
- Audio: `medico_voz.mp3` (misma voz Luis MX), `medico_musica.mp3` (piano y cuerdas de ElevenLabs SFX, 30 s en bucle),
  `medico_beep.mp3` (monitor cardiaco). Tiempos por palabra en `src/palabras_medico.json`.

## Biometría hemática

## Qué tiene
- **Rol de Supergabito:** es el anfitrión-luchador. Presenta a los "luchadores" de la sangre como en una función de
  lucha libre: "En esta esquina…", con ring, cuerdas, reflectores y campana.
- **Gancho de entrada:** "¿Siempre cansado?" con una batería que se agota, una gota de sangre que cae y abre la escena roja.
- **Retención:** subtítulos palabra por palabra con la palabra activa resaltada, barra de progreso arriba, micro-zoom
  continuo, golpes de texto, sacudidas de cámara en momentos clave y transiciones con las franjas diagonales del logo.
- **Gráficos propios en SVG:** glóbulo rojo bicóncavo, neutrófilo con núcleo lobulado, plaquetas, tubo de muestra que se
  llena, medidor bajo/alto, herida que se sella, contador de 120 días e íconos.
- **Marca:** logo, colores naranja `#D74E17` y azul `#1B6092`, lema animado. Al final, aviso de que es información general.
- **Tipografías:** Bricolage Grotesque para títulos y JetBrains Mono para fichas tipo laboratorio, guardadas en `public/fuentes`.

## Audio (ElevenLabs)
- `public/voz.mp3`: voz "Luis MX | Spanish LATAM Professional Voice" (adulto, acento mexicano), modelo eleven_v4.
  El texto completo está en el prompt del flujo de ElevenLabs y en `src/palabras.json`.
- `src/palabras.json`: tiempos por palabra de la transcripción (Scribe). Todo el video se sincroniza con estos tiempos.
- `public/campana.mp3`, `public/whoosh.mp3`, `public/beat.mp3`: efectos y base rítmica generados con ElevenLabs SFX.
  La base dura 14 s y se repite en bucle.

## Renderizar
```
cd videos/tiktoks
npm install
npx remotion render src/index.ts Biometria out/biometria_tiktok.mp4 \   # o DiaDelMedico
  --browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
```
(`--browser-executable` solo hace falta en el contenedor de Claude Code; en una PC normal Remotion descarga su navegador.)
Vista previa interactiva: `npx remotion studio src/index.ts`.

## Para hacer otro video parecido
- Crea `src/<Video>.tsx` y regístralo en `src/Root.tsx`.
- Genera la voz, transcríbela con tiempos por palabra y guarda `public/<video>_voz.mp3` y `src/palabras_<video>.json`.
- Pon los límites de escena (`E`) y los segundos de cada `Golpe` / `Ficha` / `Mascota` según esos tiempos.
- Las piezas reutilizables (glóbulos, subtítulos, transiciones, Supergabito animado) están en `src/piezas.tsx`.

Licencia: Remotion es gratuito para personas y empresas de hasta 3 empleados; arriba de eso requiere licencia de empresa.
