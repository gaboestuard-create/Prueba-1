# Pelotazo · fútbol de acción en 3D

Juego de fútbol de acción: `index.html` (estilos y estructura) más los scripts de `js/` (three.js r128 desde cdnjs).
Se publica como artefacto de claude.ai con su propio enlace y también se puede instalar como app (ver "Publicar" y
"Celular y app"). Todo el texto del juego está en español.

## Archivos (se cargan en este orden; todos comparten el ámbito global)

| Archivo | Qué hay |
| --- | --- |
| `js/sonido.js` | `SFX`: todos los sonidos, sintetizados con Web Audio (sin archivos) |
| `js/motor.js` | El partido: física, IA, controles, reglas, gráficos 3D. `nuevoPartido(cfg)` y `resultadoPartido()`. También la escena 3D de los menús (`construirMenu3D`, `animarMenu3D`) |
| `js/datos.js` | Las 8 ligas con sus clubes (nombres reales, colores, estadios) y los nombres para inventar jugadores |
| `js/mundo.js` | Generar el mundo, alineaciones, `equipoParaPartido`, `simularPartido`, calendarios, tablas, evolución |
| `js/interfaz.js` | Marcador, controles táctiles, pausa, ajustes |
| `js/guardado.js` | Guardado protegido y ranuras |
| `js/menus.js` | Sistema de pantallas (`pantalla()`), selector de clubes, amistoso, resultado, lista `MODOS` |
| `js/portada.js` | Portada ("Pulsa cualquier botón"), menú principal por páginas y navegación con teclado y mando |
| `js/torneos.js` | Liga, copa y Copa de Campeones |
| `js/temporada.js` | Lo común a las carreras: todas las ligas avanzan jornada a jornada |
| `js/editor.js` | Editor de la base de datos y pestaña "Editor" de las carreras (`vistaEditorCarrera`). Va antes de las carreras porque sus `ACC_*` usan `accionesEditorCarrera` al cargar |
| `js/carrera_dt.js` | Carrera de técnico (`CDT`) |
| `js/carrera_jug.js` | Carrera de jugador (`CJ`) |
| `js/cartas.js` | Base de estrellas y leyendas (`ESTRELLAS_TXT`, `LEYENDAS_TXT`), banderas, retratos, fórmula de atributos y dibujo de la carta (`cartaHTML`) |
| `js/estrella.js` | Equipo Estrella, el modo de cartas (`DATOS.estrella`): sobres, presentación de cartas, álbum |
| `js/arranque.js` | Arranque y bucle principal |

Los nombres globales no se pueden repetir entre archivos (por eso la carrera de técnico es `CDT` y no `DT`, que
es el paso del motor). Los modos **nunca** tocan el motor por dentro: le piden un partido con
`jugarPartido({ local, visita, usuario, jugadorId, inicio, alTerminar })` y reciben el resultado.

**Es un proyecto aparte de DT26.** No toques nada de `dt26/` ni compartas código, datos guardados o nombres de
almacenamiento con él. Pelotazo guarda en su propia base de datos (`pelotazo`).

## Reglas del proyecto

- Los **clubes** llevan su nombre real (lo pidió el usuario) pero sin escudos: la insignia es de colores y el usuario
  puede subir el escudo en el editor. Los jugadores de las ligas son inventados. En Equipo Estrella hay además
  estrellas actuales y leyendas con **nombres parecidos pero nunca idénticos** a los reales (también lo pidió el
  usuario: "Messio", "Halland"...) y retratos dibujados, nunca fotos ni caras reales. Nunca usar "FIFA" ni
  "Ultimate Team". El modo de cartas se llama "Equipo Estrella" y solo usa monedas del juego (nunca dinero real).
- Jugadores realistas o de caricatura (ver "Modelos de jugadores"). Tiene que ir fluido en un celular de gama media: los 22 jugadores se dibujan
  con una malla por pieza del cuerpo (`InstancedMesh`), así son pocas llamadas de dibujo. No añadas una malla por
  jugador ni sombras en tiempo real sin medir antes.
- Controles (0.13, al estilo de los juegos de fútbol de celular): 4 botones táctiles: Pase, Pase en profundidad
  (`through`: tocar = raso al hueco, mantener = bombeado; `pasarProfundidad`), Disparo (al defender manda `tackle`,
  la entrada) y Sprint y regate (mantener = sprint; deslizar el dedo sobre él = `SKILL`, un regate con `regate()`:
  adelante cambio de ritmo, a un lado recorte, atrás ruleta; al defender, barrida). Teclado: I profundidad, E regate.
  Mando: Y profundidad, stick derecho regate. Internamente siguen existiendo `long` y `tackle` (teclado, mando, pruebas).
- Cámara por defecto `tele` (de lado, baja y lejana con teleobjetivo, como la tele). Las demás quedan en Ajustes.
- Controles: pantalla táctil, teclado y mando deben hacer lo mismo. Todo pasa por `leerControles()`, que mezcla las
  tres fuentes en `ENT` (estado), `BORDE` (recién pulsado) y `SUELTO` (recién soltado). Las pulsaciones rápidas se
  guardan en `PULSO` para no perderlas aunque el juego vaya a pocos fotogramas. Los botones cambian de función al
  defender (Pase→Cambiar, Pase largo→Presión, Tiro→Barrida); ver `controlUsuario` y `actualizarBotones`.
- Ajustes de jugabilidad que se tocan a menudo:
  - Asistencia de pase: `CONO_PASE` (cuánto se aleja de donde apuntas para buscar compañero), `GUIA_PASE` (cuánto
    se curva el balón hacia el receptor) y la "recepción asistida" en `controlUsuario` (el receptor va al balón
    aunque sigas empujando el control).
  - Portero: `reaccionPortero` decide si llega al tiro (con algo de suerte) e `iaPortero` lo coloca y lo hace salir
    en los mano a mano.
  - Cambio de jugador y defensa: `puntuarDefensor`, `autoCambio` y `planEquipos` (quién presiona y quién cubre).
- Físicas del jugador y del balón (versión 0.4):
  - `moverJugador`: inercia. A más velocidad, giro más abierto; media vuelta corriendo = frena recto y luego gira;
    acelerar cuesta más cerca de la velocidad máxima (el sprint se nota). Guarda `inclLat` y `frenado` para que la
    animación se incline en las curvas y al frenar.
  - `conducir`: con el balón, este rueda de verdad y el jugador lo empuja con toques (cortos al trote, largos al
    esprintar, de giro para cambiar de dirección o arrastre con la suela). Si el balón se aleja más de 3,5 m se pierde;
    `robarToque` deja que un rival se meta en un toque largo. Cerca de las líneas el toque va hacia dentro.
  - Dirección deseada: `p.qx/p.qz` guarda hacia dónde QUIERE ir el jugador (control o IA); `p.dvx/p.dvz` es hacia
    dónde corre, que puede desviarse para ir a buscar el balón. Los toques de `conducir` usan siempre `qx/qz` (si no,
    los giros con el balón al esprintar se quedaban trabados). Para un giro cerrado con balón frena solo cuando el
    balón está al alcance del pie; antes corre más que el balón para alcanzarlo. En una media vuelta corriendo pisa
    el balón (`pisa`). Al recibir, `tomar` amortigua el balón (primer toque) según el regate y la fuerza del pase.
  - Resistencia: `p.energia` (0-1) baja al esprintar y sube al trotar; con poca energía el sprint es más lento
    (`velMax`). En el descanso se recupera la mitad. La barra aparece bajo el nombre del jugador controlado.
  - `golpear`: pases y tiros no salen al instante: la pierna se prepara (`PREPARA_GOLPE`, ~0,08 s) y el balón sale
    cuando el pie llega a él, con el pie del lado del balón (`p.pie`). Usa siempre `golpear` para golpeos nuevos.
- La simulación usa un paso fijo (`DT = 1/60`, función `paso`). La lógica del juego no depende de los fotogramas por
  segundo; el dibujo sí. El azar sale de `rng()` (con semilla) para que las pruebas se repitan igual.

## Estado y pendientes

Hecho: motor jugable (física, IA, controles, medio tiempo), 8 ligas, menús, amistoso, torneos, carrera de técnico,
carrera de jugador (controlas solo a tu jugador, puedes salir del banquillo a mitad de partido), Equipo Estrella y
editor con fotos y escudos.
Pendiente: saques con animación; repeticiones; mercado de cartas; más estrellas;
copas nacionales dentro de las carreras.

## Regla número uno: no perder el progreso

- Las carreras y la base de datos editada van en **ranuras** separadas (`guardarRanura` / `cargarRanura`):
  `r_dt`, `r_jug`, `r_mundo`, comprimidas (`gz:`) con 3 copias cada una (`r_<n>_c0..2`) y validadas con
  `VALIDAR_RANURA` antes de escribir. Si una ranura está dañada al abrir se aparta (`danado_r_*`) y se usa la copia.
  Si cambias la forma de un mundo, sube `MUNDO_VERSION`/`RANURA_VERSION` y completa lo que falte en `arreglarMundo`.
- Cada carrera tiene su propia copia del mundo: editar la base de datos no cambia las carreras empezadas.
- Los datos (`DATOS`: ajustes, estadísticas, historial) se guardan en IndexedDB con la clave `save`, como texto
  `js:` + JSON. Si no hay IndexedDB se usa localStorage, y si tampoco, solo memoria. No cambies ese formato.
- Junto a ella: `save_meta` (versión y fecha), `bak_index` y las copias `bak_*` (5 por tipo: `auto`, `partido`,
  `reemplazo`), y `danado_*` (datos dañados que se apartaron al abrir).
- Si cambias la forma de `DATOS`: sube `SAVE_VERSION` y añade la conversión en `MIGR[nueva]`. `arreglarDatos`
  completa los campos que falten.
- `guardarAhora` no guarda si `validarDatos` encuentra daños graves. Si añades datos que deban existir siempre,
  añade también su comprobación ahí.
- Los guardados van en fila (`enCola`). Cualquier cosa que sustituya los datos debe ir dentro de la fila y llamar
  antes a `bakCurrent(...)` (ver `bakRestore`).
- Datos de una versión más nueva del juego (`v > SAVE_VERSION`): se abren en modo solo lectura y nunca se escriben.
- Solo una pestaña guarda a la vez: la última que se abre toma el control (`vigilarPestanas`).

## Pruebas

```
cd futbol
npm install
npm test                 # todas (unos 3 minutos)
npm test -- guardado     # solo las que contienen "guardado" en el nombre
```

Abren el juego en Chromium sin pantalla y comprueban: arranque y dibujo, diseño en teléfono (vertical y
horizontal), pases, pase al primer toque, tiros y goles, saques, entradas, un partido entero entre la computadora,
teclado, pantalla táctil, mando, cambio de jugador, la base de datos, todas las formaciones, el modo de un solo
jugador, el amistoso desde el menú, torneos, las dos carreras, Equipo Estrella, el editor (con subida de imágenes),
las ranuras y todo el guardado (reabrir, copias, datos dañados, versión nueva, formato antiguo, restaurar, dos
pestañas) más la compatibilidad con cada versión publicada.

Para manejar el juego desde una prueba: `G.prueba` (activo, mx, mz y botones) sustituye a los controles y
`G.avanzar(n)` adelanta n pasos sin dibujar. `G.autoplay = true` hace que la computadora maneje a los dos equipos.

## Ayudas, previa e IA (0.14)

- Nombres sobre los jugadores (`actualizarEtiquetas`, `#etiquetas`): el que manejas (triángulo amarillo), el que lleva el
  balón y el compañero al que iría el pase. Ajuste "Nombres en el campo". El marcador es de tele (`#gL`, `#gV`, reloj mm:ss).
- Línea de apunte (`actualizarLineaApunte`, `R.linea`): curva azul en córners, bandas, saques de puerta, tiros libres y
  penaltis cuando sacas tú; usa `elegirReceptor` igual que el pase real.
- Pantalla previa (`previaPartido` en menus.js, ajuste "Previa del partido"): se muestra desde `jugarPartido` cuando juega
  el usuario; `equipoParaPartido`/`equipoEstrella` traen `ovr`, `banquillo` y `med`/`pos` de cada jugador. Las pruebas la
  apagan en `openGame` (tests/harness.mjs); hay una prueba aparte para ella.
- IA: los compañeros del usuario presionan solos (`planEquipos`), contrapresión 2,6 s tras perder el balón (`eq.perdioT`),
  desmarques en profundidad por pasillos libres (`iaJugador`) y la IA les pasa al hueco (`mejorPase`, `pasarA`).
  Portero más fiable en `reaccionPortero` (no se lanza al lado contrario en tiros al cuerpo).

## Editores dentro de los modos (0.12)

- Carrera de técnico y de jugador: pestaña "Editor" (`vistaEditorCarrera`, `accionesEditorCarrera` en editor.js).
  Edita solo el mundo de esa carrera (`ED.destino`) y al salir de un club vuelve a la pestaña (`ED.volver`). En las
  carreras no hay monedas: se edita el dinero del club (€), clubes, jugadores y atajos (curar, quitar sanciones...).
- Equipo Estrella: pestaña "Editor" (`vistaEditorEst`): monedas, división, puntos, buscar y añadir cualquier carta
  (estrellas, especiales o jugadores de la base de datos). En la ficha de una carta se edita media (mueve todos los
  atributos igual), habilidad, pie malo, posición y pie bueno, o se quita sin cobrar.

## Celular y app (0.11)

- Las pantallas de menú ocupan el alto exacto: la barra queda fija y solo se desplaza `.cuerpo`. Si una pantalla
  empieza con pestañas (`.chips`), `pantalla()` mete el resto en `.contenido`; en horizontal las pestañas van en
  columna a la izquierda y los `.panel` se ponen lado a lado. Hay un bloque `@media (max-height:520px)` que compacta
  todo para celulares en horizontal. La prueba "celular en horizontal" comprueba que las pantallas principales caben.
- Pantalla completa: `pantallaCompleta()` (botón en el menú principal y en la pausa; en el celular se pone sola al
  tocar la portada si el ajuste "Pantalla completa (celular)" está en Sí) e intenta girar a horizontal.
- App instalable (PWA): `manifest.webmanifest`, `icons/` y `sw.js` (guarda los archivos para jugar sin conexión;
  red primero para que lleguen las versiones nuevas). **Si añades un archivo a `js/`, añádelo también en `ARCHIVOS`
  de `sw.js`** (lo comprueba la prueba "instalable"). El registro solo se hace fuera de Claude (no en un marco).
- Exportar/importar partida (`exportarPartida`, `importarPartida`, en Copias y partida): un archivo con el guardado
  principal y las ranuras tal cual. Sirve para pasar el progreso entre el enlace de Claude, la app y otros equipos.
- **GitHub Pages** (lo que usa el usuario para instalar la app): la rama `gh-pages` tiene solo los archivos del
  juego; se ve en https://gaboestuard-create.github.io/Prueba-1/. Se actualiza con `sh futbol/publicar-pages.sh "mensaje"`
  (el usuario lo autorizó). También queda `netlify.toml` por si prefiere Netlify.

## Publicar

Artefacto: https://claude.ai/artifact/PDaxHwKVqqYsViT7qjwQKU

1. `npm test` en verde.
2. Publicar el artefacto con `futbol/index.html` y **todos** los archivos de `js/` más `manifest.webmanifest`,
   `sw.js` e `icons/` (parámetro `files`, con la misma ruta), siempre en el mismo enlace. Y actualizar la app:
   `sh futbol/publicar-pages.sh "Pelotazo x.y.z"`.
3. Hacer commit y añadir ese commit a `tests/compat.json`: desde entonces las pruebas comprueban que sus datos
   guardados se siguen abriendo en todas las versiones futuras.

## Modelos de jugadores

Hay dos, se elige en Ajustes → Jugadores (`DATOS.ajustes.modelo`):
- **Realistas** (por defecto): `construirReal` / `dibujarReal`. Proporciones humanas con articulaciones (hombro,
  codo, cadera, rodilla, tobillo) que se mueven con un ciclo de carrera; número en la espalda (una textura con los
  números y el atributo `aNum` por jugador); balón con pentágonos; sombras de verdad del sol que sigue a la cámara.
  Se dibujan un 12 % más grandes que en la realidad para que se vean en el celular.
- **Caricatura**: `construirJugadores` / `dibujarJugadores`, el modelo original de pocos polígonos.

Las sombras de verdad solo están con el modelo realista y gráficos "Alta" o "Automático"; en automático se quitan
primero si el juego va lento (`actualizarSombras`, `medirFps`). La prueba de modelos comprueba que el juego entero
se dibuja con menos de 80 llamadas de dibujo.

## Reglas del partido (0.8)

- Faltas: en `pasoEntrada`, al tocar al rival con balón se decide si es falta (más probable por detrás o con barrida
  fallida). `cometerFalta` pita, a veces saca tarjeta (`sacarTarjeta`) y pone un `G.pendiente` de tipo `falta` o
  `penalti` (si fue en el área del que defiende); `reanudar` coloca el balón, al cobrador (el que mejor tira entre los
  más cercanos) y la barrera (`prepararFalta`, a 9,4 m, 2-4 jugadores según la distancia).
- El usuario cobra con Tiro (mantener y soltar); la computadora decide una vez (`G.saque.plan`) si tira o pasa.
- Tarjetas: `p.am` amarillas; la segunda o una roja directa llama a `expulsar`: sale de `eq.pl` (no juega) pero se
  queda en `G.todos` porque los gráficos usan ese orden. Los porteros no reciben tarjeta (no hacen entradas).
  `resultadoPartido` guarda `am` y `ro` por jugador; las carreras convierten la roja en un partido de sanción.
- Faltas, amarillas y rojas están en `G.stats` y salen en la pantalla de resultado.

## Cartas (0.9)

- Una fila por jugador en `ESTRELLAS_TXT` / `LEYENDAS_TXT` (formato en el comentario). Para añadir una estrella basta
  con una fila; la prueba "cartas" comprueba país con bandera, puesto, club, que la media cuadre y nombres únicos.
- Los atributos de carta salen de `statsCarta(puesto, media, estilo)`: perfil del puesto (`PERFIL_CARTA`) + estilo
  (`ARQUETIPOS`) + un poco de ruido fijo por nombre, y luego se ajustan para que la media según el puesto
  (`PESOS_CARTA`) sea la de la carta. `atribMotor` los pasa a los atributos del partido.
- Tipos: bronce/plata/oro por media, `figura` (azul), `promesa` (verde), `flashback` (morado, una versión de hace
  años: 2 o 3 como mucho por jugador), `leyenda` y `cumbre` (negra y dorada, 97-100, rarísima). Las especiales se
  escriben en `ESPECIALES_TXT` apuntando al nombre corto de una fila de estrellas o leyendas.
- Un mismo jugador no puede estar dos veces en el once aunque sea con cartas distintas (`personaCarta`).
- La plantilla se ve en un campo (`vistaEquipoEst`): cartas pequeñas (`fc-mini`) en los puestos de la formación;
  tocar una y otra las intercambia, tocar una reserva con un puesto elegido la mete.
- Las cartas guardadas por versiones anteriores no tienen `st`, `look`, `hab`... `completarCarta` las rellena.
- `presentarCarta` es la animación de bandera → puesto → club → carta para las cartas buenas de un sobre.

## Menús y sonido

- Al abrir sale la **portada** (`mostrarPortada`): cualquier tecla, toque o botón del mando entra al menú. Ese primer
  toque es también el que desbloquea el sonido (los navegadores no dejan sonar antes).
- **Menú principal** (`menuPrincipal`, en `portada.js`): páginas `PAGINAS` (Jugar, Carreras, Estrella, Más) que se
  deslizan de lado (desplazamiento con `scroll-snap`; con ratón se arrastra) y baldosas hechas con `tile()`. Las pruebas
  buscan `#bJugar` (partido rápido) y `[data-acc="modo"][data-id=...]`: no les quites esos atributos.
- Detrás de los menús no se dibuja el partido sino `R.menu`: un jugador haciendo toques en un estadio de noche
  (reutiliza las piezas del modelo realista). En pantallas anchas se corre a la derecha con `setViewOffset`.
- Navegación de todos los menús: `navegar(dx, dy)` mueve el foco al botón más cercano en esa dirección; Esc/B pulsa
  el botón "volver" de la pantalla (`data-acc="__atras"`). El mando se lee en `navMando`, llamado desde el bucle.
  En los menús el teclado del partido (`iniciarTeclado`) no hace nada.
- Sonido: `SFX.patada`, `bote`, `silbato`, `gol`, `ocasion`, `palo`, `ambiente` (público que sube con el peligro) y los
  de menú (`mover`, `aceptar`, `atras`, `inicio`). El motor llama a `suena(...)`, que no hace nada en los menús.
  `pantalla()` ya suena al tocar botones. Volumen en Ajustes → Sonido.

## Estética

Fuentes Lilita One (títulos y marcador) y Nunito (texto). Colores en variables CSS de `:root` (un solo tema oscuro,
porque es un juego a pantalla completa). Estilos del estadio en `ESTILOS` (día, atardecer, noche): para un estilo
gráfico nuevo, añade una entrada ahí y una opción en `OPCIONES`.
