# Golazo — notas de trabajo

Juego de fútbol 3D para navegador (teléfono y PC). Todo vive en `golazo/`.

## Cómo abrirlo

- **PC**: doble clic en `golazo/index.html`. Funciona con `file://`, sin servidor ni internet.
- **Teléfono**: hay que servir la carpeta (GitHub Pages, o `npx serve golazo` en la misma red wifi) y abrir la URL. Se juega en horizontal.
- **Un solo archivo**: `node tools/build-single.js` genera `dist/golazo.html` con todo dentro (CSS, Three.js, código y el JSON de la base). Sirve para mandarlo por mensaje o subirlo a cualquier hosting. Hay que volver a ejecutarlo tras cada cambio.
- **Teléfono en vertical**: la pantalla se gira sola 90° para jugar con el teléfono de lado, aunque la app donde se abra no rote. Si el navegador sí rota, se ve normal.
- `index.html?jugar` salta el menú y entra directo al partido.
- El menú muestra un partido IA vs IA de fondo; **JUGAR** arranca con la última selección.

## Cómo se controla

| Acción | Teclado | Gamepad | Táctil |
|---|---|---|---|
| Moverse | WASD / flechas | stick izq. | joystick (mitad izquierda) |
| Sprint | Shift | RT | botón SPRINT o joystick al borde |
| Pase (sale al pulsar) | J | A | PASE |
| Pase al hueco (filtrado) | I | Y | botón AL HUECO |
| Pase largo / centro | L | X | LARGO (desde la banda en campo rival = centro) |
| Tiro (mantener = potencia) | K | B | TIRO |
| Tiro colocado | U + K | RB + B | **deslizar** sobre TIRO (hacia donde apuntas) |
| Filigrana | Espacio | stick der. / R3 | FILIGRANA |
| Proteger balón | O | LT | automático al caminar con un rival encima |
| Cambiar jugador | Q | LB | (en defensa) PASE |
| Pausa / cámara | Esc o P / C | Start / Select | botón ❚❚ |
| Panel de afinado | F2 o \` | — | 3 toques al marcador |

**El aro blanco** bajo un compañero marca a quién iría el pase raso si lo das ahora; cambia al mover el stick. El aro amarillo es tu jugador.

**Defendiendo** los botones cambian: PASE = cambiar jugador, TIRO = entrada, LARGO = barrida, I/Espacio/FILIGRANA (mantener) = un compañero va a presionar.

Filigranas según el stick respecto a donde mira el jugador: adelante o sin stick = bicicleta (amague + arranque), al lado = bola cruzada, atrás = giro rápido.

El tiro se apunta con el stick hacia un palo; sin dirección va al palo lejano al portero. Pase y tiro se pueden pedir antes de que llegue el balón: salen de primera (cabezazo o volea si viene por alto).

## Qué está hecho

**Fase 1 — el partido**
- Cancha con líneas reglamentarias, arcos con red, 4 tribunas con público que salta según la emoción, vallas, torres de luz, sombras.
- Balón: rodamiento con fricción, botes, arrastre del aire, efecto (Magnus), postes y travesaño, red por dentro y por fuera, subpasos para que los tiros rápidos no atraviesen nada.
- Jugador: inercia (acelera, frena y gira con peso), sprint con estamina y fatiga acumulada, más lento y pesado con balón, conducción a toques (toque corto al trote, largo en sprint), control orientado, protección, entrada y barrida con riesgo de falta/tarjeta.
- Animación procedural con esqueleto: carrera, paso lateral, golpeo, cabezazo, entrada, barrida, caída, festejo, filigranas, saque de banda, portero (posición, estirada, atrapada, saque).
- Acciones: pase corto, al hueco, aéreo, centro, tiro normal, colocado con comba, cabeza/volea, despeje, 3 filigranas, cambio de jugador automático y manual.
- IA: formaciones 4-4-2, 4-3-3 y 3-5-2; bloque que sube, baja y bascula; apoyos, desmarques de ruptura, laterales que doblan, llegada al área; presión, temporización, marca y repliegue; el poseedor decide entre tirar, centrar, pasar, conducir o despejar.
- Portero: colocación en el ángulo, reacción y estirada con alcance físico, salidas al balón dividido y en el mano a mano, atrapa o despeja, saque corto o largo.
- Árbitro (visible) y reglas: gol, saque de banda, de meta, de esquina, tiro libre con barrera, penal, fuera de lugar, amarillas, doble amarilla y roja (el expulsado sale), descanso con cambio de lado, final.
- 4 dificultades: cambian reacción, precisión, presión, acierto en la entrada, portero, visión y ambición ofensiva. Nunca la velocidad.
- 3 cámaras (transmisión, alta/táctica, detrás del jugador) y el stick es relativo a la cámara.
- Audio sintetizado: murmullo de estadio que sigue la emoción, rugido de gol, «uuuh», palmas, silbato, golpes, poste, red, música de menú.
- HUD: marcador con reloj, radar, nombre y estamina del jugador activo, barra de potencia, mensajes, aro de destino del pase.
- Panel de afinado en vivo (se guarda en el navegador): velocidad, aceleración, fricción y rebote del balón, fuerza de tiro y pase, efecto, largo del toque, agresividad y reacción de la IA, velocidad del juego, calidad gráfica.
- Calidad automática: 4 niveles (sombras 2048 / 1024 / sin sombras / resolución reducida). Baja sola si no llega al objetivo; nunca sube sola.

**Fase 2 — datos**
- `data/db.json`: 7 ligas, 32 equipos (21 clubes y 11 selecciones), 372 jugadores con nombre, edad, nacionalidad, posición, media, potencial, 7 atributos y estilo.
- Los atributos mueven la física: ritmo → velocidad y aceleración; tiro → potencia y precisión; pase → precisión; regate → toque y control; defensa → entradas; físico → choques, estamina y cabezazo; portero → reacción y alcance.
- 12 estilos que cambian el comportamiento (ver `G.STYLES` en `js/player.js`): el regateador encara y hace filigranas, el organizador busca el pase, el cazagoles tira antes y rompe a la espalda, el muro se queda atrás y entra mejor, el carrilero dobla, el portero líbero sale más lejos, etc.
- Escudos y avatares dibujados por código con los colores del equipo. Si los uniformes se parecen, el visitante cambia.
- Menú de partido rápido: equipos, liga, dificultad, duración, formación, cámara, plantillas.

## Cómo editar la base de datos

1. Edita `data/db.json` (un jugador por línea).
2. Ejecuta `node tools/gen-db.js --sync` para copiarlo a `data/db.js` (el que se usa al abrir con doble clic). Con servidor web se lee `db.json` directamente.
3. Para regenerar todo desde la lista compacta (recalcula atributos): edita `tools/gen-db.js` y ejecuta `node tools/gen-db.js`. **Esto pisa los cambios hechos a mano en `db.json`.**

## Estructura

```
index.html            punto de entrada
css/style.css
vendor/three.min.js   Three.js r159 (local, sin CDN)
data/db.json, db.js   base de datos
js/core.js            constantes, afinado (G.T), dificultad, eventos
js/ball.js            física del balón
js/player.js          movimiento, conducción, golpeos, entradas, filigranas, estilos
js/gk.js              portero
js/ai.js              formaciones e IA de equipo
js/match.js           reglas, árbitro, balón parado, reloj
js/data.js            carga de datos, atributos, alineaciones
js/input.js           teclado, gamepad, táctil
js/control.js         control humano y cambio de jugador
js/figure.js          esqueleto y animaciones
js/camera.js, render.js, audio.js, ui.js, main.js
tools/sim.js          partidos IA vs IA sin gráficos (prueba de humo)
tools/gen-db.js       genera la base de datos
tools/build-single.js empaqueta todo en dist/golazo.html
```

La simulación (`core, ball, player, gk, ai, match`) no toca el DOM ni Three.js; por eso corre en Node.

## Cómo se probó

- `node tools/sim.js 6 normal` juega 6 partidos IA vs IA y falla si hay un NaN, un partido que no termina o el balón queda quieto. `node tools/sim.js 8 normal rma gua` enfrenta dos equipos concretos.
- Con guiones de entrada se midió: conducción (el balón va a ~1 m al trote y ~1.4 m en sprint, sin perderse en giros), respuesta (50 % de la velocidad en 0.28 s, 90 % en 0.58 s, invertir un sprint 0.38 s) y acierto de tiro sin marca (≈60 % a 10 m, ≈40 % a 14 m, ≈15 % a 18 m, ≈5 % a 22 m).
- En Chromium sin pantalla: carga con `file://` sin errores, menú, partido, pausa, cámaras, panel de afinado, descanso, final, revancha y vuelta al menú; capturas de cada balón parado y de la interfaz táctil.
- Táctil con eventos de toque reales (emulando un Pixel 7): toque en PASE, mantener TIRO, deslizar sobre TIRO (sale colocado), deslizar sobre PASE (sale al hueco), joystick y botón a la vez.
- Render: 29 draw calls y ~14 000 triángulos por cuadro.

**No se pudo probar aquí**: jugarlo con manos humanas, el audio (solo que no da errores), un gamepad real, y el rendimiento en un teléfono real.

## Decisiones tomadas

- **Scripts clásicos en vez de módulos ES**: los módulos no cargan con `file://`. Cada archivo cuelga de `window.G`. Por lo mismo Three.js es la r159, la última con build no modular.
- **Simulación a paso fijo de 60 Hz** separada del render: mismo comportamiento a 30 o 120 fps.
- **Figuras instanciadas**: los 23 en cancha se dibujan con 9 mallas instanciadas. Costo: camisetas de color liso (las rayas solo están en el escudo).
- **El balón nunca va pegado al pie**: es un objeto libre que el dueño empuja. Solo se roba con entrada, o sin ella si el toque fue largo (más de ~1.1 m).
- **El pase sale al soltar el botón** (permite potencia y gesto). Si se siente lento en teclado, es lo primero a cambiar.
- **Fuera de lugar**: se toma la foto al golpear y se pita cuando el adelantado toca el balón.
- **Compañeros de la IA en tu equipo**: temporizan; van a quitar si estás lejos, te superaron o el balón está cerca de tu área. Tu portero es siempre automático.
- **Ayudas al jugador**: +10 % de acierto en la entrada, tiro al palo lejano si no apuntas, receptor que va solo al balón si no tocas el stick.
- **Nombres reales, sin fotos ni logos**. Las plantillas son aproximadas a 2025; las medias y estilos son estimaciones mías. Guatemala está incluida.
- **Sin expulsión del portero** (no hay cambios): la roja se le rebaja a amarilla.
- El juego no toca el `index.html` de la raíz del repositorio (es otra app).

## Segunda pasada de jugabilidad (tras la primera prueba en teléfono)

Lo pedido y lo que se cambió:

- **Cámara que estorba**: la tribuna, el techo y las torres del lado de la cámara ya no se dibujan (antes la cámara retrocedía y quedaba dentro de la tribuna). La transmisión es más abierta y sigue el balón con más suavidad.
- **HUD que tapa**: el centro-abajo queda libre. Radar pequeño arriba al centro; nombre y estamina bajo el marcador.
- **Pases que no iban a ningún lado**: el pase raso siempre elige compañero (el mejor alineado con el stick y con línea libre) y lo muestra con el aro blanco antes de darlo. Sale más firme y apuntado a donde va a estar el receptor, y el receptor ataca el balón solo hasta que lo tiene cerca. Medido con direcciones al azar: 80 % de pases completos (antes 51 %), 0 % de balones muertos.
- **Pase filtrado**: botón propio en táctil. Elige, entre varios puntos por delante del compañero, el más libre de rivales, y el compañero arranca al espacio. 65 % completos con direcciones al azar.
- **Menos frenetismo**: jugadores ~7 % más lentos, aceleración y giro más progresivos, la IA piensa un poco más cada decisión y no pasa de primera sin motivo.
- **Defensa táctica**: el que presiona aguanta a 2 m y muerde cuando el balón se separa del pie; un segundo defensor da cobertura detrás; los marcadores se ponen del lado del arco y un paso hacia el balón, y siguen al que rompe. Leer un pase rival lleva un instante (más largo en dificultades bajas).
- **Ataque**: «pasa y va» (el que pasa sale al espacio), los de arriba salen a la contra al recuperar, más desmarques de ruptura.
- **Cuerpos**: modelo nuevo con pelvis, abdomen, pecho con hombros, cuello, cabeza con mandíbula, nariz, orejas, ojos y cejas, manos, rodillas, gemelos y botines; tobillos articulados. Zancada real (la pierna que vuela recoge el talón y sube la rodilla; la de apoyo empuja de puntera), cadera y hombros en contragiro, el cuerpo se inclina al acelerar y frenar, la cabeza sigue al balón y la pierna se arma mientras cargas el tiro.

No se hizo: física de cuerpo completo (ragdoll) ni colisión del balón con cada segmento del cuerpo; el contacto sigue siendo un cilindro por jugador más la zona de manos del portero. Tampoco captura de movimiento: toda la animación es procedural.

## Tercera pasada: sensación tipo consola

- **Giros en arco**: en carrera el jugador ya no derrapa en diagonal; gira describiendo una curva, más cerrada cuanto más lento va y más regate/ritmo tiene. Para darse la vuelta planta el pie. Está en `locomote` (`js/player.js`).
- **Control cercano continuo**: sin sprint el balón acompaña al pie (a ~0.6 m, medido) en vez de ir a toques; en los giros se retrasa según el regate del jugador. En sprint siguen los toques largos, que es cuando te la pueden quitar.
- **Pase al pulsar**: PASE y LARGO salen al pulsar, no al soltar (unos 100 ms menos de espera). Solo el tiro se carga.
- **El destinatario estira la pierna** (1 m de alcance) y los pases fuertes salen rasantes con un pequeño bote.
- **Cuerpos con peso**: al chocar, el impulso se reparte según el físico; el fuerte casi no se frena.
- **Entrada automática** (se apaga en Pausa): si llegas de frente o de lado con el balón al alcance, la entrada sale sola. Nunca desde atrás.
- **IA**: el defensor entra más si el poseedor le viene de frente; los defensas con balón en campo propio no se complican; desde la línea de fondo buscan el pase atrás; si el poseedor está apretado, los cercanos se acercan a ofrecerse.

Medido tras esta pasada: 79 % de pases completos y 57 % de filtrados con direcciones al azar; IA vs IA ≈ 2 goles por partido en Normal; el jugador guionizado torpe ya gana algún partido en Normal.

## Qué falta

- Ley de ventaja, cambios, tiempo extra y tanda de penales, repeticiones.
- Controlar al portero a mano y elegir el saque del portero.
- Camisetas con rayas, dorsales y nombres en la espalda.
- Lesiones, clima, modos de carrera/torneo (fuera de alcance por ahora).

## Lo que siento flojo (para afinar)

Jugué partidos completos simulados y con un «jugador» guionizado. Lo que vi, de más a menos importante:

1. **Defender es más difícil que atacar.** Un jugador torpe guionizado pierde 0-2 en Fácil y 0-3 en Normal porque tu defensa depende mucho de ti. Si se siente injusto: baja «Agresividad de la IA» en el panel, o sube `tackle` en `G.MATE` (`js/core.js`) para que tus compañeros quiten más.
2. **La IA tira mucho de media distancia** contra una defensa humana (13–20 tiros por partido, casi todos atajables). Se regula con `att` en `G.DIFFS` y con el factor `1.9` de la decisión de tiro en `js/ai.js`.
3. **IA vs IA sale con pocos goles** (≈1 por partido en Normal): entre ellas se defienden muy bien. No afecta al partido humano, pero el demo del menú es algo trabado.
4. **El portero ataja casi todo desde más de 20 m.** Si quieres más golazos lejanos: baja `gk` de la dificultad o sube «Fuerza de tiro».
5. **Casi no hay fuera de lugar ni córners entre IA**: los delanteros se quedan siempre en línea y los tiros desviados son pocos.
6. **Balón parado**: los jugadores corren 2.4 s y luego se teletransportan a su sitio con un fundido corto. El saque de banda y el tiro libre de la IA son muy simples.
7. **Animaciones**: funcionales pero robóticas en el golpeo (el armado dura 0.1 s) y todos festejan igual. El portero se estira de lado, no hacia adelante.
8. **Cámara «detrás del jugador»**: gira 180° en el segundo tiempo y no la pude ver jugando; puede marear.
9. **Táctil**: el sprint por «joystick al borde» puede activarse sin querer en pantallas chicas (umbral en `js/input.js`, `r * 1.6`).
10. **Cambio de jugador automático en defensa**: elige al más cercano del lado del arco; a veces te cambia justo cuando ibas a entrar.
11. **Sin ley de ventaja**: una falta corta siempre la jugada.

Valores que más cambian la sensación, todos en el panel de afinado: fricción del balón, largo del toque, aceleración, fuerza de pase.
