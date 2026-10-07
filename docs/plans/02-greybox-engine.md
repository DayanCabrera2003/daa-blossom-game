# Plan 02 — Motor de niveles en greybox

> Alcance: todo lo necesario para **jugar** los niveles con círculos y líneas, sin arte, sin sonido y sin voz (GDD §11, punto 2: "cargar jardín, acciones básicas, sol/tiempo, pistas"). Al terminar, los 12 niveles de prueba del Plan 01 se juegan de principio a fin en el navegador, con deshacer, el sol, pistas, estrellas, progreso guardado y un registro de playtest exportable. Es la base del Hito A (GDD §10).
> Fuera de alcance: autoría de los capítulos 0–2 (Plan 03), el reflejo del Estanque (2.1), Cuaderno, Códex, modo profesor con traza, modo libre, arte y audio.
> Referencias: `docs/GDD.md` (§2 principios, §4.1 lienzo y legibilidad, §5 sistemas, §10 playtest), `docs/plans/01-core-foundation.md` (núcleo, reglas y niveles ya hechos), las reglas del proyecto (arquitectura y reglas del repo).

---

## 0. Criterios globales

Los del Plan 01 siguen vigentes (TDD, un archivo = una responsabilidad, < 1000 líneas, commits atómicos en `develop`, comentarios en inglés). Además:

- **Phaser solo dibuja y escucha.** Toda decisión (qué acción produce un gesto, cuándo se ofrece una pista, cuántas estrellas da un nivel, qué muestra el sol) vive en módulos **puros** sin Phaser, testeados con Vitest. Las escenas y vistas de Phaser son finas: leen un estado y lo pintan, o traducen un toque en una llamada a un módulo puro.
- **La lógica es instantánea, la vista la alcanza** (reglas del proyecto): `applyAction` devuelve el estado nuevo y sus eventos; la vista pinta el estado y las animaciones solo interpolan. Una entrada nueva termina en el acto la animación en curso.
- **Cobertura:** el umbral del 95 % se extiende a `src/levels/**`, `src/services/**` y a las carpetas puras de `src/game/` (`input/`, `systems/`, `animation/`, `scale/`), donde ESLint prohíbe importar Phaser. Las escenas y vistas de Phaser (`scenes/`, `view/`) quedan fuera y se verifican jugando (fase 8).
- **Todo texto visible sale de `src/content/es/`** (reglas del proyecto), aunque en greybox muchas líneas de diálogo aún no existan: se muestran como su id entre corchetes angulares (`⟨ch4.1.sauce.01⟩`), para que el playtest vea dónde irá cada línea.
- **Accesibilidad desde el greybox:** sol y luna distintos en **forma** además de color (GDD §4.1); farol y oscuridad se distinguen en escala de grises.

Definición de "hecho" de cada fase: tests en verde, lint, formato y typecheck limpios, cobertura ≥ umbral, `check-levels` en verde, commits atómicos en `develop`.

---

## Fase 0 — Phaser, arranque y escalado entero

**Carpetas:** raíz, `src/game/`

| Archivo | Responsabilidad |
|---|---|
| `package.json` | `phaser` fijado a versión exacta, en su propio commit (`chore: add phaser for the game layer`) |
| `src/game/config.ts` | Configuración de Phaser: 480 × 270, `pixelArt: true`, sin suavizado, lista de escenas |
| `src/game/scale/integerZoom.ts` | Zoom entero máximo que cabe en la ventana (`floor(min(w/480, h/270))`, mínimo 1) |
| `src/game/scenes/BootScene.ts` | Arranca, aplica el zoom y pasa al hub |
| `src/main.ts` | Crea el juego (sustituye el placeholder) |
| `tsconfig.json` | Añade los tipos `vite/client` (lo necesita `import.meta.glob` en la fase 2) |
| `eslint.config.js` | Bloque para `src/game/{input,systems,animation,scale}/**` que prohíbe `phaser` **y también `ui/`**: en flat config, un bloque posterior con `no-restricted-imports` sustituye las opciones del anterior en vez de sumarse, así que debe repetir la prohibición de `ui/` del bloque general de `game/`. "Phaser solo dibuja" se hace cumplir, no es solo una convención. Test en `tests/lint-rules.test.ts`: importar `phaser` y `ui/` desde `src/game/input/` falla |
| `vitest.config.ts` | Cobertura ampliada según §0 (incluida `src/game/scale/`). Antes de ese commit se mide la cobertura actual de `src/levels/**`; si queda por debajo del umbral, primero se añaden los tests que falten (en commits `test:`), nunca se baja el umbral |

**Tests clave:**
- `integerZoom`: 1920×1080 → 4, 1440×810 → 3, 800×600 → 1, ventanas diminutas → 1 (nunca 0).
- Build y arranque manual: la página muestra el lienzo escalado sin filtrado.

---

## Fase 1 — Contenido e i18n mínimos

**Carpetas:** `src/content/es/`, `src/services/`

| Archivo | Responsabilidad |
|---|---|
| `content/es/strings.json` | Textos de interfaz: herramientas, HUD, motivos de rechazo (`reason.<code>`, y `reason.<code>.<subcode>` para `invalidPath` y `notAFlower`, con los nombres de los brotes del paso que falla), pistas genéricas (`hint.generic.1…3`), victoria, hub |
| `services/i18n.ts` | `t(key, params?)` con interpolación `{name}`; clave desconocida → `⟨key⟩` (nunca lanza) |
| `services/lines.ts` | Línea de diálogo por id; en greybox, `⟨id⟩` si aún no existe |
| `content/keys.ts` | Listas enumerables para la integridad: `REJECT_CODES`, `PATH_ERROR_CODES`, `BLOSSOM_ERROR_CODES` y `UI_KEYS`, escritas como `Record<Código, true>` con `satisfies`, para que TypeScript avise si falta o sobra un código; el juego solo usa claves de `UI_KEYS` |
| `tests/content.test.ts` | Integridad: cada código de esas listas, cada `ActionType` (de `UNLOCKED_AT`) y cada clave de `UI_KEYS` tiene texto |

**Tests clave:**
- Interpolación y fallback de `t`.
- **Todo motivo de rechazo tiene un texto amable**, también cada subcódigo de `PathError` y `BlossomError` (el jugador nunca ve un código crudo; el distractor de 1.3 dice qué brote ya tiene farol).
- Ningún texto de interfaz usa "grafo", "arista", "vértice", "emparejamiento" ni "camino aumentante" (GDD §2, principio 2): test que busca esas palabras en `strings.json`.

---

## Fase 2 — Catálogo de niveles, progreso y guardado

**Carpetas:** `src/levels/`, `src/services/`

| Archivo | Responsabilidad |
|---|---|
| `levels/catalog.ts` | Todos los niveles vía `import.meta.glob` (eager), cargados y ordenados por id numérico (4.10 tras 4.9) |
| `services/save.ts` | Guardado versionado en `localStorage` validado con zod: niveles completados y estrellas; datos corruptos o de otra versión → partida nueva, nunca un fallo |
| `services/progress.ts` | Qué niveles están abiertos: el primero del catálogo, y cada uno tras completar **el anterior en el orden del catálogo** (así se abre también el primero de cada capítulo, aunque falten números); todo abierto en modo profesor |
| `services/teacherMode.ts` | Lee `?teacher` de la URL (en greybox: solo abre todos los niveles) |

**Tests clave:**
- El catálogo contiene los 12 niveles del Plan 01 en orden y ninguno falla al cargar (complementa `check-levels`).
- `save`: ida y vuelta; versión desconocida o JSON roto → estado vacío; el almacenamiento se inyecta (en test, un `Map`).
- `progress`: apertura secuencial en orden de catálogo (completar 0.1 abre 1.1; completar 4.10 abre 5.1); el modo profesor abre todo.

---

## Fase 2b — Afirmaciones y momento de la victoria (núcleo)

**Carpetas:** `src/core/rules/`, `src/levels/`. Corrige dos huecos del Plan 01 que el greybox haría visibles.

- **Las certificaciones se presentan.** Hoy `isVictory` da por ganado un nivel de certificado en cuanto el certificado cierra, aunque el jugador no haya hecho nada (7.2: con U = ∅ el ciclo de 5 ya cierra). GDD §5.2: en el capítulo 7 "para terminar hay que presentar un certificado". Cambio: `maximum`, `coverCertificate` y `tutteBergeCertificate` exigen `declaredDone`; `matchingSize` y `chainFound` no (se ganan en cuanto ocurren).
- **Una afirmación caduca.** Hoy `declaredDone` nunca se borra: en 4.9, un "Terminé" equivocado seguido de un cambio de faroles que alcanza el óptimo ganaría solo. Cambio: toda acción aceptada que no sea `declareDone` devuelve `declaredDone = false` (el jugador vuelve a afirmar cuando quiera).
- **Plegar no depende del orden del toque.** Hoy `foldAt(d,f)` y `foldAt(f,d)` dan la misma flor con su ciclo en sentido contrario (`findOddCycle` recorre base → u, cruza u–x y sube desde x), y el evento `oddCycleFound` invierte su enredadera. Tocar una enredadera no tiene orden. Cambio: el manejador `foldAt` ordena los dos soles por id antes de construir el ciclo, y el evento lleva la enredadera en ese orden.
- **Integridad:** nuevo problema `wonAtStart`: ningún nivel puede cumplir su condición de victoria en el estado inicial.
- **4.3 gana al aplicar la cadena.** Su victoria era `chainFound`, pero un jugador que arrastra la cadena directamente enciende los 4 faroles y no gana (y el GDD dice "Victoria: cadena"). Pasa a `matchingSize` 4; su solución de referencia sigue siendo la búsqueda con marcas, más la cadena final.

| Archivo | Cambio |
|---|---|
| `core/rules/victory.ts` | Certificados y máximo exigen `declaredDone` |
| `core/rules/applyAction.ts` | Las acciones aceptadas distintas de `declareDone` anulan la afirmación |
| `core/rules/handlers/foldAt.ts` | Orden canónico de los dos soles (id menor primero) |
| `core/rules/handlers/folding.test.ts` | Sus expectativas de 4.4 cambian: la enredadera del evento pasa a `[2, 4]` y el ciclo a `[2, 4, 3]` |
| `levels/data/ch4/4-3.json` | Victoria `matchingSize` 4 y cadena final en la solución |
| `levels/integrity.ts` | Problema `wonAtStart` |
| `tools/describeProblem.ts` | Mensaje del nuevo problema |
| `levels/data/ch7/7-3.json`, `7-4.json` | Sus soluciones terminan en `liftStone`: se añade `declareDone` al final, en el mismo commit que el cambio de `victory.ts`, para que `check-levels` siga en verde |
| `core/rules/victory.test.ts`, `levels/integrity.test.ts` | Los casos de certificado pasan a presentar el certificado con `declaredDone` |

**Tests clave (primero, en rojo):** `foldAt(d,f)` y `foldAt(f,d)` dejan exactamente el mismo estado y el mismo evento; 7.2 sin "Terminé" no gana y con él sí; en 4.9, "Terminé" con un farol apagado no gana, y encender después el farol tampoco gana hasta volver a pulsar "Terminé"; un nivel de prueba ganado desde el inicio produce `wonAtStart`; `check-levels` sigue en verde con los 12 niveles.

**Cuándo se comprueba la victoria (regla para la sesión, fase 4):** tras cada acción aceptada, con `isVictory`. Gracias a este cambio el resultado es correcto para todas las condiciones: las que dependen de "Terminé" solo se cumplen justo después de pulsarlo.

---

## Fase 3 — Del gesto a la acción (input puro)

**Carpeta:** `src/game/input/`. El corazón de la interfaz, sin Phaser: recibe toques y arrastres sobre **brotes, enredaderas y flores** (ya resueltos por la vista) y devuelve acciones del núcleo.

| Archivo | Responsabilidad |
|---|---|
| `tools.ts` | Herramientas visibles según las acciones permitidas: **Faroles** (juntar, separar, pasar, cadena, girar el tallo), **Marcas** (sol, luna, plegar en el conflicto, desplegar), **Plegar ciclo**, **Inspeccionar**, **Espantapájaros**, **Piedras**. "Terminé", deshacer, rehacer y pista son botones del HUD, no herramientas |
| `selection.ts` | Estado de selección de dos toques (primer brote elegido, o ninguno) |
| `intent.ts` | `(estado, herramienta, selección, objetivo) → { acción \| nada, nueva selección }`. Faroles: tocar la **enredadera encendida** → `split`; primer toque en un brote a oscuras y segundo en un vecino a oscuras → `join`, o en un vecino con farol → `passLantern` (el brote a oscuras siempre va primero; empezar por un brote con farol no selecciona nada). Marcas, en este orden de prioridad: con un sol seleccionado, tocar un vecino → `markMoon` (aunque el vecino esté a oscuras y sin marca: así se encuentra la luna solitaria de 3.1, `f→T` en 4.3, `a→t` en 5.1); sin selección, tocar un sol lo selecciona y tocar un brote a oscuras sin marca → `markRoot`; tocar una enredadera sol–sol → `foldAt`; tocar el contorno de una flor → `unfold`. Etc. |
| `dragChain.ts` | Arrastre de cadena (el único gesto de cadena en greybox): solo avanza por enredaderas y alternando (GDD 1.3); devuelve el camino y su ganancia prevista (+1, 0 gris, o inválida con el motivo del núcleo). Una extensión inválida **se intenta y se rechaza con el motivo del núcleo**, que llega al mensaje (GDD 4.5: "Cleo ya tiene farol, no puede pedir otro"; el distractor de 1.3); el camino no avanza. Al soltar: ganancia +1 → `chain`; ganancia 0 → `rotateStem` si el nivel lo permite (4.10 en adelante, "cadena de ganancia 0, ahora con nombre"), si no `chain` |
| `loopSelection.ts` | Selección de un ciclo para `fold`: tocar brotes en orden y cerrar en el primero |
| `pointer.ts` | (Añadido al implementar.) Pulsar, mover y soltar → acciones: guarda herramienta, selección y cadena arrastrada; con la herramienta de faroles, pulsar un brote a oscuras empieza una cadena y soltar tras dos brotes o más la aplica, si no es un toque. La escena solo reenvía eventos del puntero aquí, así la propiedad de jugabilidad prueba el mismo camino que el jugador |
| `gestures.ts` | Inversa para tests: la secuencia de gestos (puntos reales del lienzo, que pasan por `HitTest` y `pointer`) que produce una acción dada, incluidos los botones del HUD (`declareDone`) y el toque sobre una flor (`unfold`, resuelto por `HitTest`) |
| `HitTest.ts` | Qué hay bajo el puntero: brote, enredadera o flor (geometría pura; un toque cerca de un brote gana a la enredadera, y **un brote pétalo gana a su flor**: la flor se toca en su contorno o en su centro libre; tolerancia en píxeles del lienzo de 480 × 270) |
| `flowerShape.ts` | Contorno de una flor plegada a partir de las posiciones de sus brotes; lo usan `HitTest` y `FlowerView`, así la geometría no se duplica en la vista |

**Tests clave:**
- Cada regla de `intent` con los jardines del GDD (0.2 exclusividad, 1.1 pasar el farol, 4.1 la traición con marcas).
- `dragChain` rechaza el distractor de 1.3 (`b–c` y luego `c–z`: dos apagadas seguidas) y marca en gris el callejón de 1.4.
- **Propiedad clave:** para **cada nivel del catálogo**, la solución de referencia traducida a gestos (`gestures.ts`) y pasada por `intent` produce acciones que el reducer acepta y que dejan **el mismo estado tras cada paso** que la solución original (no tienen por qué ser la misma acción literal: un `chain` de ganancia 0 llega como `rotateStem` donde está permitido). Garantiza que todo lo que la solución hace se puede hacer con la interfaz.
- `HitTest`: brote frente a enredadera, flor anidada frente a su flor exterior, toques en el borde del lienzo.

---

## Fase 4 — Sistemas de sesión (puros)

**Carpeta:** `src/game/systems/`

| Archivo | Responsabilidad |
|---|---|
| `history.ts` | Historial de `GardenState`: hacer, deshacer, rehacer; actuar tras deshacer descarta el futuro |
| `sun.ts` | El sol (GDD 0.5) **es el cursor del historial**: deshacer y rehacer lo mueven un paso; arrastrarlo lo mueve varios; actuar con el sol atrás descarta el futuro. No hay dos posiciones distintas que sincronizar |
| `hints.ts` | Cuándo ofrecer pista (90 s sin progreso o 3 rechazos seguidos, GDD §5.3) y qué grado toca; reloj inyectado; "progreso" = cualquier acción aceptada que cambia el estado (faroles, marcas, flores, piedras, espantapájaros) |
| `hintContent.ts` | Qué muestra cada grado: la entrada k del array `hints` del nivel es el grado k (línea + brotes a resaltar); si falta, `hint.generic.k` y, para el grado 2, se resaltan los brotes de `nextMove` |
| `nextMove.ts` | El paso que da el mentor en el grado 3. **Siempre devuelve una acción que `applyAction` acepta en el estado actual y que acerca a la victoria del nivel**, o nada si ya ganó. Orden: (1) si el estado coincide con el de un prefijo de la solución de referencia, su siguiente paso; (2) con flores plegadas y faroles por mover, desplegar la de fuera; (3) si faltan faroles para el óptimo (en `matchingSize`, `maximum` **y en los certificados**), seguir una cadena de Edmonds: el camino se lee del evento `augment` que `runPhase` registra en su `recorder` (no devuelve el camino), y se aplica como `chain` si está permitida; si no (antes de 1.3), se recorre **ese mismo camino fijo** con `passLantern` y un `join` final, sin recalcularlo en cada paso, para que termine; (4) con los faroles en el óptimo: para `maximum`, `declareDone`; para certificados, se calcula el conjunto objetivo (piedras = lunas del bosque final de `runPhase` en su resultado `maximum`; espantapájaros = `koenigCover`), se quitan primero los que sobran (`dropStone`, `removeScarecrow`), se ponen los que faltan y por último `declareDone`; si lo colocado ya certifica, `declareDone` directamente; (5) para `chainFound`, la siguiente marca aceptada (`markRoot`, `markMoon`, `foldAt`, en orden de ids) |
| `stars.ts` | Estrellas al ganar: completar, sin pistas, dentro del agua (si el nivel tiene presupuesto). Lectura del GDD: las pistas "no quitan estrellas" (§5.3) se refiere a la de completar, que nunca se pierde; la extra "sin pistas" (§5.4) solo se pierde si el jugador **abre** una pista, no si se le ofrece. El agua que cuenta es **la gastada en la sesión**: deshacer devuelve los faroles y la niebla, pero no el agua, porque mide cuánto miró el jugador |
| `levelSession.ts` | Orquesta una partida: aplica acciones con `applyAction`, guarda historial, evalúa `isVictory` tras cada acción aceptada (fase 2b), cuenta rechazos, pistas, agua y "Terminé"; expone un estado de solo lectura para la vista |

**Tests clave:**
- `history`: deshacer/rehacer ilimitados; el estado original nunca se modifica.
- `sun`: mover el sol de 0 al final reproduce el historial en orden; actuar con el sol atrás trunca el futuro.
- `hints`: no ofrece antes de tiempo; ofrece tras 90 s o 3 rechazos; el progreso reinicia el contador; los grados van 1 → 2 → 3 y no pasan de 3.
- `stars`: casos con y sin pistas, con y sin agua; inspeccionar y deshacer no devuelve el agua.
- `hintContent`: niveles con 0, 1 y 3 entradas de `hints`.
- `nextMove`: para **cada nivel del catálogo**, desde el inicio y tras un error típico (la trampa B–C en 1.1, un farol apagado en 4.9, un pliegue o una marca fuera de la solución en 4.6, una piedra equivocada en 7.3, un farol apagado en 7.4), aplicar `nextMove` repetidamente es siempre aceptado por el reducer y termina ganando el nivel. Como ya ningún nivel del catálogo usa `chainFound` (fase 2b), su rama se prueba con un nivel sintético. Propiedad: en jardines aleatorios con victoria `matchingSize` óptima y todas las acciones permitidas, lo mismo.
- `levelSession`: jugar 4.6 entero con su solución gana; en 4.9, tras apagar un farol, "Terminé" no gana y no castiga (la partida sigue y se puede deshacer).

---

## Fase 5 — Animación (plan puro) y vistas greybox

**Carpetas:** `src/game/animation/` (puro), `src/game/view/` (Phaser)

| Archivo | Responsabilidad |
|---|---|
| `animation/plan.ts` | Eventos → pasos con duración (pasar el farol salta brote a brote; plegar, desplegar, conflicto sol–sol, piedra); `finish()` salta al final |
| `view/palette.ts` | Colores greybox (oscuro azulado / ámbar cálido / niebla / piedra), legibles en grises |
| `view/GardenView.ts` | Brotes (círculos), etiquetas, enredaderas (punteadas apagadas, continuas encendidas) |
| `view/MarksView.ts` | Insignias de sol (círculo con rayos) y luna (cuarto creciente); conflicto sol–sol parpadeante |
| `view/FlowerView.ts` | Flor plegada: contorno que agrupa a sus miembros, con su número; anidadas, contorno dentro de contorno |
| `view/FogView.ts` | Capa de niebla con huecos en los brotes inspeccionados |
| `view/ObjectsView.ts` | Espantapájaros y piedras; con piedras levantadas, contorno de cada grupo impar (`oddComponents`) |
| `view/HudView.ts` | Objetivo (N o "?"), faroles encendidos, agua, botones Terminé / deshacer / rehacer / pista |
| `view/ToolbarView.ts` | Herramientas desbloqueadas |
| `view/SunSliderView.ts` | El sol como slider en la barra superior |
| `view/ToastView.ts` | Mensajes amables de rechazo |
| `view/DialogueView.ts` | Caja de diálogo: las líneas de `script` se muestran en orden al entrar en el nivel y avanzan con un toque (en greybox basta: solo se ven ids; el Plan 03 añade disparadores por línea al esquema, porque algunas van tras un evento, como `ch4.1.sauce.04` tras aplicar la cadena); las de las pistas, al pedirlas (texto por id, `⟨id⟩` si aún no existe) |

> **Añadido al implementar (2026-10-06):** una carpeta pura `src/game/picture/` (con las mismas reglas que `input/` y `systems/`: sin Phaser, en la cobertura) decide **qué** se dibuja, y las vistas solo pintan primitivas. `picture/garden.ts`: brotes (farol, marca, selección, pista, cadena, piedra, espantapájaros), enredaderas (encendida, oculta por la niebla, interna de una flor), contornos de flores anidadas, grupos impares con piedras levantadas, vista previa de la cadena con su ganancia. `picture/hud.ts`: el modelo del HUD. `picture/reasonText.ts`: el texto amable de cada rechazo con los nombres de los brotes (incluido el paso exacto de una cadena o un ciclo). Vistas añadidas: `AnimationView` (reproduce el plan con `stepAt`), `layout.ts`, `Button.ts`, `textStyle.ts`. `HitTest` vive en `input/` (fase 3).

**Tests clave:**
- `animation/plan`: un `augment` de k enredaderas produce k saltos en orden; `finish` deja la vista en el estado final.
- Vistas: verificación manual (fase 8), con capturas.

---

## Fase 6 — Escenas: hub y nivel

**Carpeta:** `src/game/scenes/`

| Archivo | Responsabilidad |
|---|---|
| `HubScene.ts` | Lista de niveles por capítulo (abiertos/cerrados, estrellas), botón de exportar registro de playtest |
| `LevelScene.ts` | Conecta catálogo → `levelSession` → vistas; entrada → `intent` → sesión; victoria → guarda completado y estrellas (`save`, que a su vez abre el siguiente vía `progress`) → panel → siguiente nivel; teclas: Ctrl+Z / Ctrl+Y, Esc al hub |
| `VictoryPanel.ts` | Panel de victoria con estrellas |

**Tests clave:** sin tests unitarios de escenas (son cableado); su lógica está en fases 3–4. Verificación en fase 8.

---

## Fase 7 — Registro de playtest

**Carpeta:** `src/services/`

| Archivo | Responsabilidad |
|---|---|
| `playtestLog.ts` | Modelo del registro (esquema zod): inicio de sesión, inicio y fin de nivel (ganado o abandonado), jugadas aceptadas por tipo, rechazos por código, pistas con su grado, "Terminé" correcto o sin razón, deshacer/rehacer/sol |
| `playtestSummary.ts` | Reconstruye por nivel: partidas, victorias, mejores estrellas, tiempo, jugadas, rechazos, pistas y "Terminé" (GDD §10, Hito A) |
| `playtestStore.ts` | Guarda y lee el registro en `localStorage` (`florecer.playtest`); si el navegador lo niega, el juego sigue |
| `playtestRecorder.ts` | El registro de este navegador mientras se juega: añade entradas y las guarda al instante |
| `exportLog.ts` | El archivo JSON que se envía: resumen por nivel y entradas en bruto, con fecha en el nombre |
| `download.ts` | Descarga un archivo en la máquina del jugador (enlace temporal; dependencias inyectadas) |

Además, `game/systems/playtestEntries.ts` (puro) traduce cada paso del controlador en entradas del registro; `LevelScene` las graba, y el hub tiene el botón "Exportar registro de prueba".

**Tests clave:** reloj inyectado; el registro reconstruye tiempo por nivel, pistas y "Terminé" sin razón (pulsado cuando el emparejamiento no es máximo).

Nada sale del navegador del jugador: el registro solo se comparte si él exporta el archivo.

---

## Fase 8 — Verificación jugable

**La hace el autor en persona** (decisión tomada al cerrar la fase 7): ni capturas automáticas ni scripts de navegador.

- Recorrer en el navegador los 12 niveles de prueba siguiendo su solución de referencia y con al menos un error por nivel (comprobar que el rechazo se explica bien).
- Comprobar deshacer, rehacer y el sol en 4.6 y 5.1; la niebla con un nivel de prueba temporal; piedras y grupos impares en 7.3 y 7.4.
- Capturas de cada nivel en `docs/playtest/greybox/` (no se versionan si pesan; se decide al llegar).
- Lista de problemas encontrados → issues o tareas del Plan 03.

---

## Orden y dependencias

```
F0 → F1 → F2 → F2b → F3 → F4 → F5 → F6 → F7 → F8
```
F2b toca el núcleo y va primero entre las fases puras; F3 y F4 son puras y pueden hacerse antes de dibujar nada; F5–F6 son las únicas que tocan Phaser.

**Hito G1 (F0–F4, con F2b):** el juego entero es jugable "en tests": cualquier nivel se gana mediante gestos simulados.
**Hito G2 (F5–F8):** el mismo juego, visible y jugable en el navegador. Merge `develop → main`, tag `v0.2.0-greybox`, y el Plan 03 (capítulos 0–2 en greybox y playtest A) arranca sobre esta base.

---

## Riesgos y cómo se mitigan

| Riesgo | Mitigación |
|---|---|
| La lógica se cuela en las escenas de Phaser | Escenas sin decisiones; reglas de `intent`, pistas, estrellas y sol en módulos puros con cobertura |
| Un nivel no se puede resolver con la interfaz aunque su solución sea válida | Propiedad de la fase 3: toda solución de referencia pasa por gestos |
| Texto pequeño ilegible a 480 × 270 | Greybox con fuente por defecto a escala entera; la fuente pixel definitiva se elige en la fase de arte |
| Arrastre de cadena impreciso en táctil | `HitTest` con tolerancia generosa y el camino solo avanza por enredaderas válidas |
| Tests de Phaser frágiles o lentos | No se testea Phaser; se testea todo lo que decide, y Phaser se verifica jugando |

---

## Decisiones abiertas

1. **Versión de Phaser.** Las reglas del proyecto fijan Phaser 3; la última es la 3.90.0. Ya existe Phaser 4 (4.2.1 estable). Propuesta: **Phaser 3.90.0**, como dicen las reglas del proyecto: la API está madura y documentada, y el greybox no necesita nada de la 4. Si se prefiere la 4, se actualiza la tabla de stack de las reglas del proyecto antes de la fase 0.
2. **Gesto de cadena:** en greybox, **solo arrastrar** (como el GDD). Tocar brote a brote chocaría con juntar y pasar el farol, que también son dos toques; una alternativa accesible (un modo "Cadena" aparte) se decide en el pulido.
3. **Victoria de 0.5 ("haber movido el sol")** y de 2.1 / 7.1 necesitan condiciones nuevas (`sunMoved`, reflejo, "aceptar que no cierra"). Se añaden en el Plan 03, al escribir esos niveles.
