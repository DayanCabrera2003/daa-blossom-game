# Plan 04 — Capítulos 3–4 en greybox y playtest B

> Alcance: los 21 niveles del capítulo 3 (El Invernadero: búsqueda sistemática, costo, König) y del capítulo 4 (El Festival: ciclos impares, la flor, lema de la flor) jugables en greybox, con lo que piden y el motor aún no tiene: abejas y flores, la búsqueda completa como condición, señalar la enredadera del conflicto y contar el bucle (4.2), el reto de la flor con el jardín abierto y el plegado lado a lado (4.11), y el kit del playtest B (GDD §10, Hito B).
> Fuera de alcance: arte, sonido y voz; Códex (solo se declaran C4–C8 en `unlocks.codex`); capítulos 5–7 (sus borradores siguen como están); Bruto y las carreras (capítulo 6).
> Referencias: `docs/GDD.md` (§2 principios, §5.1 acciones, §5.11 tarjetas, §7 capítulos 3 y 4, §10 playtest), `docs/plans/03-chapters-0-2-greybox.md` (guion de nivel, preguntas, Cuaderno, tarjetas), las reglas del proyecto.

---

## 0. Criterios globales

Siguen los del Plan 03: el guion es dato, el núcleo responde las preguntas matemáticas, cada nivel lleva un recorrido de referencia completo que `check-levels` y `tests/playability.test.ts` reproducen, las tarjetas de mecánica explican el gesto y nunca la idea. Además:

- **Las condiciones nuevas son del núcleo.** "La búsqueda terminó", "esta es la enredadera del conflicto", "este bucle tiene 3 brotes" y "este trozo de cadena es una cadena en el jardín plegado" son matemática: viven en `core/` con tests de propiedades contra fuerza bruta o validadores existentes.
- **Los borradores de 4.1, 4.3, 4.6, 4.7, 4.9 y 4.10 se sustituyen** por los niveles reales con el mismo id (dejan de ser `draft`). Los tests que usaban esos borradores como datos se ajustan en commits `test:` y, si dependían de un detalle que el nivel real cambia, pasan a usar datos sintéticos.
- **Abejas y flores sin decir "bipartito".** En el capítulo 3 cada brote es abeja o flor, distinguibles por forma (no solo color) en greybox.

- **Los niveles empiezan desde cero.** El esquema no tiene marcas ni flores iniciales: cuando un nivel necesita una flor plegada (4.5), el propio jugador la hace dentro del guion (un `play` previo), y el recorrido de referencia la incluye. La búsqueda hecha de 4.1 y 4.2 la hace la luz sola (paso `autoSearch`, ver Decisiones). 4.11 declara su flor (campo `flower`).

Definición de "hecho" de cada fase: la del Plan 03.

---

## Fase P — Tests sin borradores

Antes de tocar nada, los tests que cargan los borradores (`levelById('4.1' | '4.6' | '4.9' | …)` en `levelController`, `nextMove`, `levelSession`, `playtestEntries`, `hud` y `garden`) pasan a datos sintéticos en `tests/support/` (commits `test:`), y `catalog.test.ts` deja de fijar la lista de borradores. Así, reescribir los niveles de la fase 5 solo toca sus propias expectativas de integridad y catálogo.

---

## Fase 0 — Abejas y flores

| Archivo | Responsabilidad |
|---|---|
| `levels/fields.ts` / `schema.ts` | Campo opcional `kind: 'bee' \| 'flower'` por brote; si un nivel lo usa, todos sus brotes lo llevan |
| `levels/integrity.ts` | Un nivel con abejas y flores no tiene ninguna enredadera abeja–abeja ni flor–flor (el jardín es de verdad bipartito) |
| `game/picture/garden.ts`, `view/GardenView.ts` | La abeja y la flor se dibujan con formas distintas (p. ej. círculo y rombo), también en escala de grises |

**Tests clave:** un nivel con una enredadera flor–flor es un problema de integridad; el dibujo marca la especie de cada brote.

---

## Fase 1 — La búsqueda como condición, raíces fijadas y cadenas con flores (núcleo)

| Archivo | Responsabilidad |
|---|---|
| `core/search/searchStatus.ts` | Pura y única: `searchStatus(layer, forest, { roots, foldAllowed }) → 'open' \| 'chain' \| 'conflict' \| 'exhausted'`, evaluada sobre el `layer` (con flores) y sobre el jardín **verdadero** aunque haya niebla (que el jugador no haya inspeccionado algo no termina la búsqueda). `open`: algún sol tiene enredaderas apagadas sin explorar hacia brotes sin marca (o queda una raíz permitida sin marcar). `chain`: ya hay cadena. `conflict`: solo queda un sol–sol del mismo árbol; si `foldAllowed` es falso, ese conflicto se ignora ("ya marcado, lo dejo", 4.1) y la búsqueda cuenta como agotada; si es verdadero, no está terminada: hay que plegar. `exhausted`: terminada sin cadena |
| `core/rules/state.ts`, `levels/schema.ts`, `build.ts` | Campo de nivel `roots` (nombres): las únicas raíces permitidas. `markRoot` rechaza cualquier otra con un código estable nuevo (`notARoot`, con texto amable). Por defecto, todo brote a oscuras |
| `core/rules/victory.ts` | Condiciones nuevas: `searchComplete` (3.3, 4.2: la búsqueda terminó, con cadena o sin ella) y `searchExhausted` (3.6, 4.9: agotada y "Terminé", con la misma regla de `declaredDone` que los certificados) |
| `core/rules/handlers/chain.ts`, `checks.ts` | Una cadena se acepta con flores plegadas **fuera** de su camino; al aplicarla, el jardín se abre entero (como al terminar una ronda del algoritmo). A mano solo se despliegan las flores que la cadena atraviesa (GDD 4.8) |
| `game/systems/nextMove.ts` | El mentor (pista 3) sabe avanzar las condiciones nuevas: marcar la siguiente luna o raíz para `searchComplete`/`searchExhausted`, respetando `roots`; nunca propone un paso que el nivel rechazaría |
| `levels/integrity.ts` | Con `roots` y sin plegar permitido, la búsqueda de referencia de 4.1 termina **sin** cadena (la luz "miente") |

La detección de sol–sol entre árboles distintos como cadena de raíz a raíz (3.4) ya existe (`growForest.test.ts`, `marks.test.ts`); no se reimplementa.

**Tests clave:**
- Propiedad: en jardines bipartitos aleatorios, con **todas** las raíces marcadas y sin conflictos abiertos, una búsqueda agotada implica emparejamiento máximo (contra Bruto); con cadena, la cadena es aumentante.
- 4.1 con `roots: ["R"]`: marcar `e` como raíz se rechaza con `notARoot`; la búsqueda de R termina `exhausted` aunque el objetivo diga 3.
- 4.8: una cadena que esquiva una flor plegada se aplica y deja el jardín abierto.
- El mentor completa una búsqueda de 3.3 a base de pistas de grado 3.

---

## Fase 2 — Señalar el conflicto y contar el bucle (4.2)

| Archivo | Responsabilidad |
|---|---|
| `core/search/conflict.ts` | Pura: con la búsqueda del jugador, la enredadera sol–sol del **mismo árbol** (el conflicto) y el bucle impar que cierra (`findOddCycle`), con su número de brotes |
| `levels/flow.ts`, `flowInput.ts` | Paso `pickVine` ("señala la enredadera donde la luz se equivocó"; reintento con respuesta amable) y su entrada de recorrido (`{ "type": "pickVine", "u": "d", "v": "b" }`); `count` admite `of: 'loop'` (sin `piece`) |
| `levels/flowChecks.ts` | `pickVine` y `count` de bucle exigen que el recorrido de referencia deje un conflicto en ese momento; `count` de bucle no pide reflejo |
| `game/systems/answerKey.ts` | La enredadera correcta y el número de brotes del bucle, junto a `rightCount` |
| `game/systems/flow.ts`, `levelController.ts` | El toque en una enredadera durante `pickVine` es una respuesta, no una jugada |
| `game/picture/reasonText.ts` | Mientras plegar no está permitido (4.1), el rechazo `sunMeetsSun` se muestra con el texto de "ya marcado" para no adelantar el giro de 4.2 |
| `game/view/` | La insignia partida (mitad sol, mitad luna) parpadea sobre los brotes del bucle tras señalar el conflicto |

**Tests clave:** en el jardín de 4.1 (datos sintéticos) con la búsqueda de una sola raíz, el conflicto es `d–b` y el bucle tiene 3 brotes; señalar otra enredadera no termina el paso; en 4.1, el rechazo del sol–sol no menciona nada "raro".

4.2 se escribe como `autoSearch` (la luz repite la búsqueda que miente) → `pickVine` → `count` del bucle → Cuaderno, sin `play` ni victoria.

---

## Fase 3 — El reto de la flor (4.11)

| Archivo | Responsabilidad |
|---|---|
| `levels/schema.ts`, `integrity.ts` | Campo `flower` (nombres de sus pétalos, base primero): integridad comprueba que es una flor válida (`checkBlossom`) y que su base está a oscuras |
| `core/blossom/cutAtFlower.ts` | Pura: dada una flor con la base a oscuras y una cadena del jardín abierto, el extremo que está fuera de la flor, el tramo hasta el **primer pétalo** que toca y ese tramo proyectado en el jardín plegado (con `contract(openLayer(...)).layer.nodeOf`, sin una proyección nueva), que es una cadena hasta la flor (lema de la flor, dirección difícil). Una cadena que no toca la flor ya es cadena del jardín plegado tal cual, y se muestra así |
| `levels/flow.ts` | Paso `flowerChallenge` (`attempts`): el jugador dibuja cadenas en el jardín abierto sin aplicarlas |
| `game/systems/flowerChallenge.ts` | Pura: comprueba cada cadena dibujada (debe ser cadena del jardín abierto) y devuelve los tres momentos del argumento (extremo fuera, tramo hasta el pétalo, cadena en el plegado) para animarlos; tras `attempts` cadenas, el paso termina |
| `game/picture/`, `game/view/` | El jardín abierto y el plegado lado a lado (cada uno a media anchura del lienzo lógico; en el plegado, la flor se dibuja en el centro de sus pétalos), el tramo resaltado en ambos |

**Tests clave:**
- Propiedad (núcleo): para toda flor con base a oscuras y toda cadena del jardín abierto, el tramo proyectado es cadena aumentante del jardín plegado (`checkAugmentingPath`).
- Una cadena que no es cadena del jardín abierto se rechaza con motivo amable y no cuenta.

---

## Fase 4 — Capítulo 3

Niveles 3.1–3.9 en `src/levels/data/ch3/` con sus líneas (GDD §7, capítulo 3). Niebla y agua (3.1–3.5, 3.9; 3.5 con presupuesto "brotes + 2"), abejas y flores en todo el capítulo, marcas desde 3.1, espantapájaros desde 3.7 (`coverCertificate`), Cuadernos de 3.3 y 3.8 con contraejemplos, 3.6 con `searchExhausted`, 3.9 con objetivo oculto y certificado. **3.7** es un solo jardín con dos componentes (camino de 5 y estrella; máximo 3, espantapájaros en 2, 4 y H). **3.8** usa `coverCertificate` con la búsqueda fallida en el recorrido de referencia; su integridad comprueba que las lunas de esa búsqueda (`koenigCover` de `core/certificates/vertexCover.ts`) vigilan todas las enredaderas. Desbloqueos según `UNLOCKED_AT` (inspect y marcas en 3.1, espantapájaros en 3.7) y Códex C4, C5 en 3.8.

Diseños que el GDD deja abiertos (3.2, 3.3, 3.5, 3.8, 3.9) se fijan aquí y los prueba `check-levels`. Si una ficha del GDD no cuadra con su propio jardín, se implementa la versión más cercana que conserva la lección y se informa.

---

## Fase 5 — Capítulo 4

Niveles 4.1–4.12 en `src/levels/data/ch4/` (sustituyen a los borradores con el mismo id). 4.1 con `roots: ["R"]`, la búsqueda que "miente" y la cadena encontrada a mano; 4.2 con `pickVine` y el conteo del bucle, más su Cuaderno; 4.3 bucle par; 4.4 plegar (`chainFound`); 4.5 desplegar y aplicar (el jugador vuelve a plegar dentro de su `play`, y el juego rechaza el lado equivocado de la flor); 4.6 cinco pétalos; 4.7 tallo largo con Cuaderno; 4.8 dos flores; 4.9 flor sin cadena y "Terminé" (`searchExhausted`); 4.10 girar el tallo sin plegar, con Cuaderno; 4.11 el reto de la flor (campo `flower`, tallo ya girado) con Cuaderno; 4.12 maestría en niebla con agua y dos flores en rondas distintas. Códex C6, C7, C8 en 4.11.

**Nota (la luz busca sola).** En 4.1 la búsqueda manual solo "mentía" si el jugador miraba `b–c` antes que `b–d`; mirando primero `b–d` encontraba la cadena `c–e`, y 4.2 se quedaba sin conflicto que señalar. Ningún jardín obliga a mentir a una búsqueda hecha a mano, así que la búsqueda de 4.1 y 4.2 la hace la luz sola, con las reglas del jugador en un orden fijo:

| Archivo | Responsabilidad |
|---|---|
| `core/search/autoSearch.ts` | Pura: la secuencia de `markRoot`/`markMoon` que hace la luz. Primero los soles ya marcados; después cada raíz permitida (en orden) a oscuras y sin marca, cuyo árbol se recorre en anchura; cada sol mira sus enredaderas apagadas por id de brote ascendente. Un sol–sol del mismo árbol se deja ("ya marcado": la luz nunca pliega); se para en la primera cadena o cuando no queda nada |
| `levels/flow.ts`, `flowChecks.ts` | Paso `autoSearch` sin campos; las comprobaciones siguen el jardín que deja la luz (para `pickVine` y `count` de bucle) y exigen que las reglas acepten cada movimiento de la luz (`lightRefused`) |
| `game/systems/flow.ts`, `levelSession.ts`, `lightSearch.ts` | El paso espera la señal `searched`; al llegar, los movimientos de la luz entran en el historial como jugadas aceptadas, y el guion sigue |
| `game/scenes/presenter.ts`, `LevelScene.ts` | La búsqueda se muestra paso a paso con la maquinaria de la repetición (entrada bloqueada); al anochecer, el presentador avisa y la escena envía `searched` |
| `levels/cards/cards.json`, `content/es/` | Tarjeta `autoSearch` sin gesto ("Mira cómo busca tu luz…") |

4.1 queda como `say` → `autoSearch` → `say` (la luz no encontró nada; el objetivo dice 3) → `play` (la cadena `R–a=b–d=c–e` a mano: las marcas de la luz no estorban, la cadena las borra al aplicarse, como en el capítulo 3) → `say` de Sauce. 4.2 queda como `autoSearch` → `pickVine` → `say` → `count` → `say` → Cuaderno.

---

## Fase 6 — Hub, registro y kit del playtest B

| Archivo | Responsabilidad |
|---|---|
| `content/es/strings.json`, hub | Nombres de los capítulos 3 y 4 (El Invernadero, El Festival); los 12 niveles del capítulo 4 caben en la disposición del hub |
| `services/playtestLog.ts`, `playtestSummary.ts`, `systems/playtestEntries.ts` | Entradas de `pickVine` (enredadera, correcta) y de cada cadena del reto de la flor |
| `levels/cards/cards.json`, `content/es/` | Tarjetas de mecánica para los pasos nuevos: señalar la enredadera (`pickVine`) y el reto de la flor (GDD §5.11) |
| `docs/playtest/B.md` | Protocolo del Hito B (GDD §10): en 4.1, ¿encuentra la cadena a mano sin la pista 3?; en 4.2, ¿señala la enredadera correcta?; en 4.11, ¿elige la opción correcta del Cuaderno sin pistas? |

---

## Orden y dependencias

```
FP → F0 → F1 → F2 → F3 → F4 → F5 → F6
```
FP va primero para que los tests no dependan de los borradores. F4 necesita F0–F1; F5 necesita F1–F3. Las tarjetas de mecánica de inspeccionar, marcas, espantapájaros, plegar, desplegar y girar el tallo ya existen (Plan 03, fase 12); se revisan al escribir los niveles.

**Hito D1 (F0–F1, F4):** capítulo 3 jugable. **Hito D2 (F2–F3, F5–F6):** capítulo 4 y kit del playtest B. Tras la verificación del autor: merge `develop → main` y tag `v0.4.0-chapters-3-4`.

---

## Decisiones

- **La luz busca sola en 4.1 y 4.2.** Una búsqueda a mano de 4.1 solo miente en uno de sus dos órdenes posibles, y ningún jardín obliga a mentir. La luz hace la búsqueda del jugador, automatizada y siempre en el mismo orden, así que miente siempre igual y 4.2 siempre tiene el conflicto `d–b`. Sus movimientos entran en el historial (y no solo en la animación) para que el sol pueda repetirlos y para que los pasos siguientes (`pickVine`, `count`) juzguen el jardín que se ha visto. Se añaden al historial cuando la escena termina de mostrarlos, no al abrir el paso, para que el jardín no enseñe las marcas antes de tiempo mientras se leen las líneas previas. Una nueva entrada del registro del playtest para la búsqueda de la luz no aporta nada a las métricas del Hito B (no depende del jugador), así que no se añade.

## Riesgos y cómo se mitigan

| Riesgo | Mitigación |
|---|---|
| 4.1 no "miente": la búsqueda del jugador encuentra la cadena | Campo `roots: ["R"]` impuesto por el núcleo (`notARoot`), la búsqueda la hace la luz sola en un orden fijo (`autoSearch`), y rechazo sol–sol con el texto de "ya marcado" |
| El reto de 4.11 se vuelve texto pasivo | Cada paso del argumento es una animación sobre la cadena que dibujó el propio jugador |
| Los niveles del capítulo 3 son largos por la niebla | Presupuestos de agua amables salvo en 3.5; las pistas inspeccionan por el jugador |
| Romper tests que usaban los borradores | Ajustes en commits `test:` y datos sintéticos donde el detalle importa |
