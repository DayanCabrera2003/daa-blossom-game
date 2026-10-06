# Plan 03 — Capítulos 0–2 en greybox y playtest A

> Alcance: los 18 niveles de los capítulos 0 (El Huerto), 1 (El Prado) y 2 (El Estanque) jugables en greybox, con todo lo que piden y el motor del Plan 02 aún no tiene: el **guion de nivel** (pasos después o en lugar de "jugar hasta ganar"), el sol como condición (0.5), la repetición automática del día (1.1, 1.2), preguntas y apuestas (0.4, 1.6, 1.8), reacciones durante el juego (1.4), el Cuaderno con contraejemplos tocables (1.5, 2.4) y el Estanque: reflejo, maraña, hilos y reto del espejo (2.1–2.4). Termina con el kit del playtest A (GDD §10, Hito A), que juega el autor con 3–5 personas.
> Fuera de alcance: arte, sonido y voz; Códex (solo se registran sus desbloqueos); semillas y cosméticos del hub (la apuesta da, por ahora, una estrella); capítulos 3–7 (sus niveles de prueba del Plan 01 siguen existiendo como borradores).
> Referencias: `docs/GDD.md` (§3.2 personajes, §5.1–5.5 sistemas, §7 capítulos 0–2, §10 playtest), `docs/plans/02-greybox-engine.md` (motor greybox), las reglas del proyecto.

---

## 0. Criterios globales

Siguen los del Plan 02 (TDD, un archivo = una responsabilidad, < 1000 líneas, commits atómicos en inglés en `develop`, Phaser solo dibuja y escucha, cobertura ≥ 95 % en las carpetas puras, todo texto visible en `src/content/es/`). Además:

- **El guion es dato, no código.** Lo que ocurre en un nivel (en qué orden se juega, se pregunta, se repite el día o aparece el reflejo) se declara en su JSON y lo ejecuta un motor puro. Ninguna escena contiene "si el nivel es 1.8, entonces…".
- **El núcleo responde las preguntas matemáticas.** Las respuestas correctas que dependen del jardín (cuántos faroles caben, cuántos faroles de cada lado tiene un hilo, qué hilo gana) se calculan con `core/` (`maximumSize`, `decomposeSymmetricDifference`); nunca se escriben a mano en el JSON.
- **Cada nivel lleva un recorrido de referencia completo.** La `solution` de un nivel incluye, además de las jugadas, las respuestas, apuestas, toques y movimientos del sol que piden sus pasos. `tests/playability.test.ts` y `tools/check-levels` la reproducen entera, de modo que un nivel que no se puede terminar no llega nunca al navegador.
- **Nombres de los brotes.** En el lienzo cada brote muestra su inicial (`A`, `S`…); las líneas de diálogo usan el nombre completo (Ana, Sami…), siempre con la misma inicial. Es una de las cosas que el playtest A comprueba.

Definición de "hecho" de cada fase: tests en verde, lint, formato y typecheck limpios, cobertura ≥ umbral, `check-levels` en verde, `npm run build` correcto, commits atómicos en `develop`.

---

## Fase 0 — Borradores fuera del playtest

**Carpetas:** `src/levels/`, `src/services/`, `src/game/scenes/`

| Archivo | Responsabilidad |
|---|---|
| `levels/schema.ts` | Campo `draft: boolean` (por defecto `false`): un nivel de prueba de un capítulo aún no escrito |
| `levels/data/ch4…ch7/*.json` | Los 10 niveles de prueba de los capítulos 4, 5 y 7 pasan a `"draft": true` |
| `services/progress.ts` | `unlockedLevels` ignora los borradores fuera del modo profesor: ni se abren ni abren el siguiente |
| `scenes/HubScene.ts` | No muestra los borradores fuera del modo profesor |

**Tests clave:**
- Con un catálogo sintético (`0.1`, `0.2`, `4.1` borrador, `4.2` borrador): sin modo profesor, completar `0.2` no abre `4.1`; en modo profesor se ven todos.
- `tests/levels.test.ts`: los borradores siguen pasando la integridad completa.

---

## Fase 1 — El guion de un nivel (esquema)

**Carpeta:** `src/levels/`

| Archivo | Responsabilidad |
|---|---|
| `levels/flow.ts` | Esquema zod de los pasos del guion (tabla de abajo) y del campo `flow`; por defecto `[{ "step": "play" }]`, que es exactamente el comportamiento actual |
| `levels/schema.ts` | Añade `flow`, `mirror` (los faroles del reflejo, para el capítulo 2) y amplía `solution` con las entradas de guion (sigue exigiendo al menos una entrada, jugada o no); `victory` pasa a ser opcional y obligatoria si y solo si el guion tiene un paso `play`. **`script` desaparece:** sus líneas pasan a un paso `say` inicial en los 12 niveles actuales (un commit de migración de datos aparte) |
| `levels/build.ts` | Valida que `mirror` sea un conjunto de faroles válido del jardín (`createMatching`), traduce nombres a ids en `mirror` y en las entradas de guion, y separa `solution` en `level.solution` (jugadas, como hoy) y `level.walkthrough` (todo, en orden) |
| `levels/lines.ts` | `referencedLines` incluye las líneas de los pasos del guion |
| `levels/integrity.ts` | Comprobaciones nuevas: un paso `play` exige `victory` y viceversa; cada `ask` tiene al menos una opción correcta; `count.piece` nombra un brote que está en alguna pieza de `tus faroles ⊕ reflejo` (`decomposeSymmetricDifference` del núcleo); `notebook` exige el campo `notebook`; `replay.demo` se reproduce con las reglas desde el inicio del nivel. Las jugadas de `solution` siguen reproduciéndose con las reglas reales (las entradas de guion se saltan, no cambian el jardín). `wonAtStart` y `solutionFallsShort` solo se evalúan si hay `victory` |

**Pasos del guion** (`"step"`):

| Paso | Qué hace | Termina cuando |
|---|---|---|
| `play` | Se juega con las reglas del nivel; admite `reactions` (fase 5) | Se cumple `victory` |
| `say` | El mentor dice `lines` | En el acto (la escena encola el diálogo) |
| `ask` | Pregunta `prompt` con `options` (`line`, `correct`, `reply?`); `retry: true` vuelve a preguntar tras una respuesta incorrecta | Se responde (bien, si `retry`) |
| `bet` | Apuesta: "¿cuántos faroles crees?", opciones numéricas `range`; `preview` (ms) muestra el jardín y luego lo vela mientras se pregunta; `informal: true` (0.4) no da estrella | Se apuesta |
| `sun` | Espera a que el jugador mueva el sol | El cursor del día cambia |
| `replay` | El día se rebobina y se reproduce solo. Con `demo` (lista de jugadas desde el inicio del nivel, con todas las acciones permitidas) se reproduce esa demostración en vez del día del jugador: así lo que se ve cuadra con lo que dice el mentor aunque el jugador lo resolviera de otra forma (1.1, 1.2) | En el acto (la escena lo anima y bloquea la entrada mientras dura) |
| `mirror` | Aparece el reflejo (`mirror`) superpuesto: faroles propios ámbar, del reflejo plateados, los comunes se desvanecen | En el acto |
| `explore` | Con el reflejo visible, el jugador toca brotes y cada uno muestra cuántas enredaderas suyas hay en la maraña (su grado en `tus faroles ⊕ reflejo`: 0, 1 o 2) | Un toque en un brote |
| `separate` | Espera un toque: la maraña se separa en hilos y bucles | Un toque en el jardín |
| `count` | Pregunta cuántos faroles `of` (`yours` / `mirror`) tiene la pieza que contiene el brote `piece` (un nombre de brote); opciones numéricas `0…range`; la respuesta correcta la da el núcleo | Respuesta correcta (siempre con reintento) |
| `draw` | Reto del espejo (fase 8): el jugador dibuja un reflejo mejor; `attempts` intentos válidos | Tras `attempts` comprobaciones de reflejos mejores |
| `notebook` | La pregunta del Cuaderno del nivel (fase 6) | Se elige la opción correcta |

**Qué se acepta en cada paso.** Las jugadas del jardín solo se aceptan durante `play`; fuera de él, un toque en el jardín no cambia faroles (los faroles de 2.1, 2.2 y 2.4 no pueden moverse bajo una pregunta, que dependen de ellos). Cada paso acepta solo su señal; `sun` acepta además deshacer, rehacer y el sol, que no cambian faroles nuevos. Las pistas se ofrecen en `play`, `ask`, `count` y `draw` (con el reloj de 90 s reiniciado al empezar cada paso) y nunca durante `replay`. Las estrellas cuentan las pistas abiertas en todo el nivel, hasta que el guion termina.

**Entradas de guion en `solution`** (además de las jugadas): `{ "type": "answer", "option": i }` (índice de la opción en `ask` y `notebook`; en `count` y `bet`, el número elegido), `{ "type": "bet", "value": n }`, `{ "type": "seekSun", "fraction": f }`, `{ "type": "tapGarden" }`, `{ "type": "tapSprout", "vertex": "a" }`, `{ "type": "drawMirror", "lanterns": [["a","b"], …] }`, `{ "type": "checkMirror" }`. Ningún `type` coincide con un `ActionType`; un test lo asegura.

**Tests clave:**
- Un nivel sin `flow` se lee como `[{ "step": "play" }]` y los 12 niveles actuales siguen idénticos.
- `victory` sin paso `play`, o paso `play` sin `victory`, es un error de integridad; `ask` sin opción correcta, también.
- `mirror` con un brote con dos faroles se rechaza al construir el nivel.
- `referencedLines` encuentra las líneas de `say`, `ask` (pregunta, opciones y respuestas), `bet` y `count`.
- Los niveles migrados de `script` a `say` dicen las mismas líneas en el mismo orden.

---

## Fase 2 — El motor del guion (puro)

**Carpeta:** `src/game/systems/`

| Archivo | Responsabilidad |
|---|---|
| `flow.ts` | Estado del guion (`FlowState`: índice del paso, respuestas dadas, apuesta, intentos) y `advanceFlow(flow, signal) → { flow, effects }`. Señales: `won` (el núcleo dice que se cumplió `victory`), `answer`, `bet`, `sunMoved`, `tap`, `mirrorChecked`. Efectos: `say`, `ask`, `bet`, `replay`, `mirror`, `separate`, `notebook`, `finished`. Los pasos que terminan en el acto se encadenan en la misma llamada |
| `levelSession.ts` | La sesión guarda su `FlowState`; `won` (y las estrellas) se fijan cuando el guion termina, no cuando se cumple `victory`. Con el guion por defecto, ambos momentos coinciden. Rechaza jugadas fuera de `play` (código de rechazo nuevo `notNow`, con texto amable) y guarda qué reacciones ya se dispararon. Todas las llamadas que hoy usan `level.data.victory` (`act`, `askHint` → `nextMove`) pasan a usar la del paso `play` y no se llaman sin ella |
| `stars.ts` | `computeStars` recibe `betRight: boolean \| null`: una estrella más por acertar la apuesta formal (GDD §5.4) |
| `levelController.ts` | `UiEvent` nuevos (`answer`, `bet`, `tapGarden`, `drawToggle`, `checkMirror`) y los efectos del guion; un toque en el jardín durante `separate` es `tapGarden`, no una jugada |
| `walkthrough.ts` | Reproduce la `walkthrough` de un nivel a través del controlador, sin escena: lo usan `tests/playability.test.ts` y `tools/check-levels` |

**Tests clave:**
- Guion por defecto: ganar el nivel emite `finished` en el mismo paso que hoy emite `won` (los tests del Plan 02 no cambian).
- `play → say → ask`: al ganar se emiten `say` y `ask` en ese orden; responder mal con `retry` emite la respuesta y vuelve a preguntar; responder bien termina.
- Un paso no se repite: deshacer después de ganar no reabre `play`.
- Fuera de `play`, juntar o separar se rechaza con `notNow` y no cambia el jardín; en `sun`, deshacer y el sol sí funcionan.
- `walkthrough` de cada nivel del catálogo termina el guion (sustituye el bucle actual de `playability.test.ts`).

---

## Fase 3 — El sol como paso y el día que se repite solo (0.5, 1.1, 1.2)

**Carpetas:** `src/game/systems/`, `src/game/animation/`, `src/game/scenes/`, `src/game/view/`

| Archivo | Responsabilidad |
|---|---|
| `systems/flow.ts` | `sun` termina con la señal `sunMoved`, que el controlador emite cuando `seek`, `undo` o `redo` cambian el cursor del día |
| `animation/replay.ts` | Plan puro de la repetición: rebobinar hasta el amanecer y avanzar paso a paso hasta el final, con duración por paso (`REPLAY_STEP_MS`); `replayAt(plan, t) → cursor` |
| `animation/replay.ts` (demo) | Con `demo`, la repetición recorre los estados que producen esas jugadas desde el inicio, sin tocar el historial del jugador |
| `levels/uiUnlocks.ts` | Desbloqueo de las piezas de interfaz que no son acciones: el sol desde 0.5 (GDD §5.1); antes, el HUD no lo muestra (deshacer y rehacer existen desde 0.1) |
| `picture/hud.ts` | Oculta el sol en los niveles anteriores a su desbloqueo |
| `scenes/LevelScene.ts` | Durante `replay` mueve el cursor del día según el plan, bloquea la entrada y, al terminar, deja el día en su final y sigue con la cola de efectos |

**Tests clave:**
- `replayAt`: en `t = 0` el cursor está en 0; al final, en el último paso; nunca fuera de rango; un día de un solo estado se repite en 0 ms.
- 0.5 no termina con 2 faroles: falta mover el sol; mover el sol antes de ganar no cuenta (el paso aún no ha llegado).
- La demo de 1.1 (`join B C`, `passLantern A B`, `join C D`) muestra a Beto dándole su farol a Ana aunque el jugador resolviera deshaciendo.
- 0.1–0.4 no muestran el sol; 0.5 sí.

---

## Fase 4 — Preguntas y apuestas (0.4, 1.6, 1.8)

**Carpetas:** `src/game/systems/`, `src/game/view/`, `src/game/scenes/`, `src/content/es/`

| Archivo | Responsabilidad |
|---|---|
| `systems/question.ts` | Pura: las opciones de un `ask` (líneas) o de un `bet`/`count` (números del rango), cuál es correcta (para `bet`, `maximumSize` del jardín; para `count`, fase 7) y la respuesta que sigue |
| `view/QuestionView.ts` | Panel con el enunciado y un botón por opción, encima del jardín; bloquea el jardín mientras está abierto |
| `view/VeilView.ts` | Velo sobre el jardín para la apuesta con `preview` (1.6: el jardín se ve 3 s y se cubre) |
| `picture/hud.ts` | Con una apuesta hecha y el objetivo oculto, el HUD dice "Apostaste N"; al ganar, el mentor revela el valor real |
| `content/es/strings.json` | Claves nuevas (`question.*`, `bet.*`, `hud.bet`) |

**Tests clave:**
- La opción correcta de una apuesta es el máximo del jardín calculado por el núcleo, aunque el JSON diga otra cosa.
- 1.8: las tres respuestas a "¿Cómo lo sabes?" son válidas y llevan a la misma línea.
- La pista de grado 3 durante una pregunta señala la opción correcta; en una apuesta, no (no tiene sentido regalarla).

---

## Fase 5 — Reacciones durante el juego (1.4)

**Carpeta:** `src/game/systems/`

| Archivo | Responsabilidad |
|---|---|
| `levels/flow.ts` | `play.reactions`: `[{ "on": "gainZeroChain" \| "lanterns", "value"?: n, "say": [líneas] }]` |
| `systems/reactions.ts` | Pura: qué reacciones dispara una jugada aceptada (comparando faroles antes y después: una `chain` que no suma es `gainZeroChain`); cada una se dispara una sola vez por partida |

**Tests clave:**
- 1.4: la cadena por la rama sin salida dispara la línea de Sauce una vez; repetirla tras deshacer no la repite.
- Una cadena que gana un farol no dispara `gainZeroChain`.

---

## Fase 6 — El Cuaderno y sus contraejemplos (1.5, 2.4)

**Carpetas:** `src/levels/`, `src/services/`, `src/game/`

| Archivo | Responsabilidad |
|---|---|
| `levels/schema.ts` | Cada opción incorrecta del `notebook` puede llevar `counterexample`: un mini-jardín (brotes, enredaderas, faroles, acciones permitidas, línea que lo presenta) y su `mode`: `play` (se toca con las acciones dadas) o `mirrorDraw` (2.4 c: el jugador busca "una disposición mejor" dibujando un reflejo y aparece la cadena; reutiliza `mirrorDraft` y `mirrorChallenge` de la fase 8) |
| `levels/counterexample.ts` | Construye un mini-jardín como un `GardenState` del núcleo (mismas reglas que un nivel) |
| `levels/integrity.ts` | Cada contraejemplo es un jardín válido y sus líneas son del nivel |
| `services/save.ts` | Versión 2 del guardado: añade `notebook` (ids de nivel cuyo enunciado se escribió). Un guardado v1 se migra sin perder progreso |
| `game/view/NotebookView.ts` | La pregunta del Cuaderno; elegir una opción falsa abre su contraejemplo |
| `game/scenes/CounterexampleScene.ts` | El mini-jardín, tocable con las herramientas del nivel y sin victoria; "Volver al Cuaderno" regresa a la pregunta |

**Tests clave:**
- Migración: un guardado v1 con niveles completados se lee como v2 con el mismo progreso y el Cuaderno vacío.
- Elegir la opción correcta guarda el enunciado en el Cuaderno y termina el paso; una falsa nunca lo termina.
- 1.5 (b): en el contraejemplo, la cadena de 6 brotes se aplica y enciende exactamente un farol (lo comprueba el núcleo en el test, no la vista).
- Un contraejemplo `mirrorDraw` se construye y su comprobación devuelve una cadena para el jardín dado.

---

## Fase 7 — El Estanque: reflejo, maraña e hilos (2.1–2.3)

**Carpetas:** `src/game/systems/`, `src/game/picture/`, `src/game/view/`

| Archivo | Responsabilidad |
|---|---|
| `systems/pond.ts` | Pura: las piezas de `tus faroles ⊕ reflejo` (`decomposeSymmetricDifference`), la pieza que contiene un brote (así la nombra `count.piece`), cuántos faroles de cada lado tiene cada pieza, el **grado** de un brote en la maraña (enredaderas suyas en `tus faroles ⊕ reflejo`: 0, 1 o 2; es lo que 2.1 llama "hilos") y cuál es la pieza ganadora. En el código, `strand` es una enredadera de la maraña y `piece` un hilo o bucle completo |
| `picture/pond.ts` | Pura: el dibujo del reflejo: enredaderas ámbar, plateadas o desvanecidas; con la maraña separada, el desplazamiento de cada pieza; el número de hilos sobre el brote tocado |
| `view/MirrorView.ts` | Pinta el reflejo y anima la separación |
| `picture/hud.ts` | Con reflejo, el objetivo muestra "Tú: N · Reflejo: M"; con empate, el reflejo se disuelve |

**Tests clave:**
- Jardín de 2.1: tres piezas tras quitar la pareja común (`e=f` desaparece); el hilo `1…6` tiene 2 tuyos y 3 del reflejo; el bucle `a…d`, 2 y 2.
- Ningún brote tiene grado mayor que 2 en la maraña (propiedad sobre jardines y pares de emparejamientos aleatorios).
- 2.3: el hilo ganador empieza y termina en brotes a oscuras de tu jardín, y aplicarlo como `chain` es aceptado por las reglas.

---

## Fase 8 — Reto del espejo (2.4)

**Carpeta:** `src/game/systems/`, `src/game/input/`, `src/game/view/`

| Archivo | Responsabilidad |
|---|---|
| `input/mirrorDraft.ts` | Pura: el reflejo que dibuja el jugador; tocar una enredadera la pone o la quita en plateado, y nunca deja un brote con dos faroles plateados (se rechaza con un motivo amable) |
| `systems/mirrorChallenge.ts` | Pura: comprobar un reflejo dibujado: si no tiene más faroles que tu jardín, "ese no te gana" (no cuenta como intento); si tiene más, el hilo ganador, que siempre es una cadena para tu jardín (lema de Berge). Para no atascar a nadie: la pista de grado 3 dibuja un reflejo mejor (tu jardín ⊕ una cadena que da el núcleo), y tras 6 comprobaciones que no ganan el paso cuenta igualmente como terminado con una línea de Sauce |
| `view/MirrorView.ts` | Modo dibujo y resultado de cada comprobación |

**Tests clave:**
- Propiedad: para todo jardín y todo emparejamiento M′ mayor que M, la comprobación devuelve un hilo que es camino aumentante de M (`isAugmentingPath` del núcleo).
- Tres comprobaciones válidas terminan el paso; las que no superan tu jardín no cuentan, salvo para la salida tras 6.
- La pista de grado 3 propone un reflejo que la comprobación acepta como mejor.

---

## Fase 9 — Los capítulos 0–2

Se escribe en dos tandas: **F9a** (capítulos 0 y 1, con 1.5 sin su Cuaderno) justo después de la fase 5, y **F9b** (el capítulo 2) después de la fase 8. El Cuaderno de 1.5 se escribió en la fase 6, como primer caso real de contraejemplos.

**Carpetas:** `src/levels/data/ch0`, `ch1`, `ch2`, `src/content/es/`

| Archivo | Responsabilidad |
|---|---|
| `levels/data/ch0/0-1.json … 0-5.json` | El Huerto (GDD §7, capítulo 0); 0.1 sustituye al nivel de prueba |
| `levels/data/ch1/1-1.json … 1-9.json` | El Prado; 1.1 sustituye al nivel de prueba |
| `levels/data/ch2/2-1.json … 2-4.json` | El Estanque |
| `content/es/lines.json` | Las líneas de esos niveles: guion, pistas, preguntas, opciones, respuestas y Cuaderno, tomadas del GDD; donde el GDD no da la frase, una línea provisional en el mismo tono |

Cada nivel sigue su ficha del GDD (jardín, faroles iniciales, objetivo, guion, pistas, victoria, desbloqueos). 1.1 cierra `passLantern` (`forbid`) y lo desbloquea al terminar: el jugador pasa el farol "sin saberlo", deshaciendo y rehaciendo (GDD §7, 1.1). Diseños que el GDD deja abiertos y se fijan aquí, comprobados por `check-levels`:
- **1.6:** 8 brotes, un ciclo de 6 con dos colgantes, máximo 4.
- **1.8:** árbol de 9 brotes, máximo 4.
- **1.9:** 14 brotes con faroles iniciales mal puestos; máximo 7; hacen falta tres cadenas, una de 7 brotes con dos callejones.
- **2.4:** jardín con tu emparejamiento de 7 faroles que **no** es máximo (el reflejo dibujado puede ganarle), para que cada intento muestre una cadena.

**Tests clave:**
- `check-levels` y `tests/playability.test.ts` en verde para los 18 niveles nuevos (recorrido completo).
- `tests/content.test.ts`: toda línea referida existe y ninguna nombra las matemáticas.

---

## Fase 10 — Hub y registro para el playtest A

**Carpetas:** `src/game/scenes/`, `src/services/`, `src/game/systems/`

| Archivo | Responsabilidad |
|---|---|
| `scenes/HubScene.ts` | Capítulos 0–2 con su nombre (El Huerto, El Prado, El Estanque); los 9 niveles de 1 caben en una fila |
| `services/playtestLog.ts` | Entradas nuevas: `answer` (paso, opción, correcta), `bet` (valor, correcta), `notebook` (opción, correcta), `counterexample` (opción abierta) |
| `services/playtestSummary.ts` | Por nivel: respuestas incorrectas, apuestas acertadas, contraejemplos abiertos |
| `systems/playtestEntries.ts` | Registra las respuestas, apuestas y el Cuaderno |

**Tests clave:**
- El resumen de un registro con respuestas reconstruye por nivel las incorrectas y las apuestas acertadas.

---

## Fase 11 — Kit del playtest A

**Carpeta:** `docs/playtest/`

| Archivo | Responsabilidad |
|---|---|
| `docs/playtest/A.md` | Protocolo del Hito A (GDD §10): a quién se invita (3–5 personas sin DAA), qué se les dice (nada del algoritmo), cómo abrir el juego, cuándo exportar el registro, la pregunta final ("describe con tus palabras qué es una cadena"), y una tabla para anotar por persona tiempo por nivel, pistas, "Terminé" sin razón y la descripción de la cadena |

El playtest lo dirige el autor. Sus hallazgos se convierten en cambios de niveles o en tareas del plan siguiente.

---

## Orden y dependencias

```
F0 → F1 → F2 → F3 → F4 → F5 → F9a → F6 → F7 → F8 → F9b → F10 → F11
```
F1–F2 son la base de todo lo demás. F3–F8 añaden tipos de paso; F8 usa el reflejo de F7, y el contraejemplo `mirrorDraw` de F6 se completa cuando existe F8 (hasta entonces su construcción se prueba sin la comprobación).

**Hito C1 (F0–F5, F9a):** capítulos 0 y 1 jugables salvo el Cuaderno.
**Hito C2 (F6–F8, F9b, F10–F11):** capítulos 0–2 completos y kit del playtest A. Tras la verificación del autor: merge `develop → main` y tag `v0.3.0-chapters-0-2`.

---

## Riesgos y cómo se mitigan

| Riesgo | Mitigación |
|---|---|
| El guion se convierte en un lenguaje de programación | Pasos fijos y pocos (tabla de la fase 1); nada de condiciones ni saltos. Lo que no cabe se discute antes de añadir un paso |
| Lógica de nivel en las escenas | Las escenas solo ejecutan efectos del motor puro; un test recorre cada nivel sin escena |
| Respuestas escritas a mano que contradicen el jardín | Las respuestas matemáticas las calcula el núcleo (`bet`, `count`, hilo ganador) |
| El capítulo 2 enseña lo contrario de lo que pretende si un jardín está mal diseñado | Tests de las piezas exactas de 2.1–2.3 y propiedad de Berge para 2.4 |
| La escena de nivel crece demasiado | Las vistas nuevas (pregunta, velo, reflejo, Cuaderno) son archivos propios; la escena solo encola efectos |

---

## Decisiones tomadas al escribir el plan

1. **Borradores.** Los niveles de prueba de los capítulos 4, 5 y 7 se quedan, marcados `draft`: siguen probando mecánicas, pero el playtest A no los ve.
2. **2.2, "¿puede un hilo ganar por dos?".** En greybox es una pregunta con respuesta explicada, sin dibujar el hilo; dibujarlo se valora tras el playtest.
3. **Recompensa de la apuesta.** Una estrella por acertar (GDD §5.4); las semillas llegan con los cosméticos del hub.
4. **1.6, "oculto hasta acertar".** Tras apostar, el objetivo sigue oculto y el HUD recuerda la apuesta; al ganar, el mentor dice el valor real.
5. **El sol aparece en 0.5**, como dice el GDD §5.1; deshacer y rehacer existen desde 0.1.
6. **1.1 cierra "pasar el farol"** y lo desbloquea al terminar; la repetición de 1.1 y 1.2 es una demostración fija que cuadra con lo que dice Sauce.
7. **Códex.** C1, C2 y C3 se declaran en `unlocks.codex` de 0.5, 1.8 y 2.4; el Códex los deducirá de los niveles completados cuando exista, así que no se guardan aparte.
