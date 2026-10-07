# Plan 05 — Capítulos 5–7 en greybox y playtest C

> Alcance: los 16 niveles de los capítulos 5 (El Jardín Salvaje: flores anidadas), 6 (El Recetario: el algoritmo completo y su costo) y 7 (El Consejo de los Robles: Tutte–Berge) jugables en greybox, con lo que piden y el motor aún no tiene: la vista de capas, la receta con tarjetas, el autómata que ejecuta la receta del jugador, las carreras contra Bruto con apuestas y gráfica, el certificado de piedras con su cuenta a la vista, y el kit del playtest C (GDD §10, Hito C).
> Fuera de alcance: arte, sonido y voz; Códex (solo se declaran C9–C12 en `unlocks.codex`); el epílogo, el modo libre y las flores secretas (son "modos extra", GDD §11 punto 10).
> Referencias: `docs/GDD.md` (§2, §5.1, §5.11, §7 capítulos 5, 6 y 7, §10), `docs/plans/04-chapters-3-4-greybox.md` (búsqueda, luz automática, reto de la flor), las reglas del proyecto.

---

## 0. Criterios globales

Siguen los del Plan 04. Además:

- **El autómata no tiene un algoritmo propio.** Su ejecución es una lista de **jugadas del reductor** (`markRoot`, `markMoon`, `foldAt`, `unfold`, `chain`) que `applyAction` valida una a una, como la luz automática del Plan 04 (`game/systems/lightSearch.ts`). Así el sol las recorre como cualquier día (estados `GardenState`, no `GardenSnapshot`), y una receta mal ejecutada sería rechazada por las reglas. Lo único que cambia una receta en la ejecución es un indicador `fold` (con o sin la tarjeta de plegar): sin ella, el sol–sol del mismo árbol se ignora, como en 4.1.
- **Los pasos de las carreras son los del núcleo, y los del autómata son los que el jugador ve.** El contador del autómata son los pasos de la ejecución didáctica (`race()` de `core/cost/benchmark.ts` ya da `didacticSteps`); los del `fastEdmonds` (`fastOperations`) quedan para el Códex C11. Bruto cuenta con el presupuesto de `bruteForceMatching` y se duerme al agotarlo (ya lo hace `race`). Nada se inventa para la gráfica.
- **El núcleo no conoce los niveles.** Lo que el núcleo devuelve es un caso de la búsqueda; qué nivel lo enseñó ("esto lo hiciste en 3.4") es contenido y vive en `levels/` o en los datos de las tarjetas.
- **Los borradores 5.1, 7.2, 7.3 y 7.4 se sustituyen** por los niveles reales con el mismo id. Los tests ya usan datos sintéticos (`tests/support/fixtureLevels.ts`), así que reescribirlos no debe romper tests ajenos.

Definición de "hecho" de cada fase: la del Plan 03.

---

## Fase 0 — Capas (5.2)

| Archivo | Responsabilidad |
|---|---|
| `levels/uiUnlocks.ts` | Las capas se desbloquean en 5.2, como el sol en 0.5 |
| `game/picture/layers.ts` | Pura: qué se ve a cada profundidad de capas: fuera, las flores de primer nivel plegadas; dentro de una flor, sus pétalos (y las flores interiores, plegadas) agrandados al centro del jardín; el camino de vuelta |
| `game/view/`, HUD | Entrar en una flor (tocar con la herramienta de capas) y salir (botón o Esc); la vista amplía la flor sin cambiar el jardín ni las reglas |
| `levels/cards/cards.json` | Tarjeta de capas (gesto) |

Dentro de una capa las jugadas son las mismas que fuera (las del nivel); los toques se traducen de la posición ampliada a la real con la misma transformación que dibuja la capa (pura, testeada). Desplegar solo afecta a las flores de primer nivel, de fuera hacia dentro, como hace el núcleo.

**Tests clave:** en el jardín de 5.1 plegado dos veces, la capa exterior muestra F2, dentro de F2 se ve F1 plegada, y dentro de F1 sus tres pétalos; salir vuelve a la capa de antes; un toque en un brote ampliado llega al brote verdadero.

---

## Fase 1 — Capítulo 5

Niveles 5.1–5.5 en `src/levels/data/ch5/` (5.1 sustituye al borrador), con sus líneas (GDD §7, capítulo 5): 5.1 una flor dentro de otra (pistas del GDD); 5.2 tres flores anidadas (`nestedFlowers` de `core/generators/hardCases.ts` como guía, más una salida como la `a–t` de 5.1, porque `nestedFlowers` no tiene cadena) y las capas; 5.3 el pétalo equivocado, con Cuaderno; 5.4 16 brotes con dos anidamientos y tres rondas; 5.5 20 brotes en niebla con agua. Códex C9 en 5.5. 5.1–5.3 llevan `roots: ["R"]`, como el capítulo 4, para que la búsqueda sea la del GDD. Un test por nivel comprueba con el núcleo su lección (como `tests/festival.test.ts`): en 5.3, que entrada y salida de la flor interior no son su base y que el lado correcto es el largo.

---

## Fase 2 — La receta con tarjetas (6.1)

| Archivo | Responsabilidad |
|---|---|
| `core/recipe/recipe.ts` | Pura: el modelo de receta: `{ mark, cases, end }`. `mark` y `end` son una tarjeta cada uno (correcta o distractora); `cases` es un **conjunto** de tarjetas de caso, sin orden (los cinco casos se excluyen entre sí). Ids estables de tarjeta y de caso |
| `core/recipe/check.ts` | Pura: juzga la receta sin ejecutarla: la receta correcta, o la primera tarjeta que falla (distractora elegida, caso que falta, fin equivocado) con su **caso** de búsqueda. Las distractoras nunca se ejecutan (algunas no terminarían: "repite hasta que no queden brotes a oscuras") |
| `levels/` (datos de tarjetas) | Texto de cada tarjeta (en `content/es/`) y el nivel que enseñó cada caso, para el "esto lo hiciste en 3.4" |
| `levels/flow.ts`, `flowInput.ts`, `flowChecks.ts` | Paso `recipe` (y su entrada de recorrido: las tarjetas elegidas); con `missing: ["fold"]` (6.3) la receta llega con esas tarjetas quitadas y hay que repararla |
| `game/view/RecipeView.ts` | Las tarjetas en un panel: tocar una la mueve a la receta o la devuelve; el orden se cambia tocando y soltando en otro sitio |
| `levels/cards/cards.json` | Tarjeta de mecánica de las tarjetas de receta |

**Tests clave:** la receta del GDD es correcta en cualquier orden de sus casos; cada distractora y cada ausencia se detecta con su caso; "repite hasta que no queden brotes a oscuras" es incorrecta sin ejecutarse.

---

## Fase 3 — El autómata (6.2, 6.3)

| Archivo | Responsabilidad |
|---|---|
| `core/recipe/run.ts` | Pura: la ejecución de la receta como lista de jugadas del reductor, desde todas las raíces a oscuras, en un orden fijo documentado (como `autoSearch`), con `{ fold: boolean }`. Con `fold`, pliega (`foldAt`) los sol–sol del mismo árbol y, al encontrar cadena, despliega y la aplica; sin `fold`, los ignora. Reutiliza `growStep`/`searchStatus`; no reimplementa Edmonds |
| `levels/flow.ts` | Paso `automaton`: el jardinero mecánico ejecuta la receta del jugador; sus jugadas entran en el día (como la luz de 4.1) y el sol las recorre |
| `game/` | La ejecución se ve paso a paso con el sol como slider y la entrada bloqueada; "ver la ejecución completa" termina el paso |

**Tests clave:**
- Propiedad: la receta correcta alcanza el máximo en jardines aleatorios (contra `fastEdmonds` y Bruto en los pequeños).
- Cada jugada de la ejecución es aceptada por `applyAction` en orden.
- En el jardín de 5.1, desde sus faroles iniciales, la receta sin plegar se detiene en 3 faroles y dice "terminé"; reparada, llega a 4 (GDD 6.3, cambiado para usar el jardín de 5.1).

---

## Fase 4 — Las carreras (6.4, 6.5)

| Archivo | Responsabilidad |
|---|---|
| `core/cost/benchmark.ts` | Ya da la carrera (`race`: pasos didácticos del autómata, pasos de Bruto y si se durmió). Solo se añade lo que falte, con test |
| `core/cost/doubling.ts` | Pura: la respuesta correcta de una apuesta de duplicación, en categorías ("≈ el doble", "≈ de 4 a 8 veces", "muchísimo más / se duerme") con tolerancias fijas sobre los pasos medidos |
| `levels/flow.ts`, `flowInput.ts`, `flowChecks.ts` | Paso `race` (jardines por tamaño, familia y semilla fijas, presupuesto de Bruto) y paso `raceBet` (apuesta categórica antes de una carrera que duplica la anterior; no reutiliza `bet`, que cuenta faroles) |
| `game/picture/costChart.ts` | Pura: los puntos de la gráfica de pasos por tamaño; la curva del autómata y la de Bruto, que al dormirse se marca "dormido" (nunca su presupuesto como valor) |
| `game/view/RaceView.ts` | Contadores, vista alejada con brotes en miniatura (16, 32, 64) y la gráfica dibujándose punto a punto |

Los jardines de las carreras se generan con familia y semilla fijas (`core/generators/`) elegidas por test, para que cada partida vea la misma carrera y las razones de duplicación caigan claramente en una categoría. La carrera II empieza en 8 → 16 para que la primera apuesta tenga con qué compararse.

**Tests clave:** en 6 brotes los dos terminan con pasos parecidos; en 10, Bruto da muchos más; desde 32, Bruto se duerme; cada apuesta de 6.5 tiene una respuesta categórica estable con las semillas fijadas; el tiempo de cada carrera en tests se mantiene bajo (presupuesto de Bruto acotado).

---

## Fase 5 — Capítulo 6

Niveles 6.1–6.6 en `src/levels/data/ch6/` con sus líneas (Sauce y Bruto, `ch6.N.bruto.NN`): 6.1 tarjetas; 6.2 el autómata en un jardín del Prado; 6.3 la receta rota de Bruto en el jardín de 5.1 ("¡Menos pasos! ¡Más rápido!" / "Más rápido para equivocarse."), reparar y llegar a 4 faroles, con un test del núcleo "sin plegar < máximo, con plegar = máximo"; 6.4 la carrera I (6, 8, 10 brotes); 6.5 la carrera II (16, 32, 64) con apuestas; 6.6 los dos Cuadernos de terminación (el campo `notebook` pasa a admitir varias preguntas, y el paso `notebook` lleva el índice de la suya; se ajustan `notebookChecks`/`flowChecks` y los niveles existentes). Códex C10 y C11 en 6.6.

---

## Fase 6 — El certificado de piedras a la vista (capítulo 7)

| Archivo | Responsabilidad |
|---|---|
| `core/rules/victory.ts`, `levels/schema.ts` | Condición `coverComplete` (7.1: los espantapájaros vigilan todas las enredaderas, sean cuantos sean), para que el jugador intente el certificado del Invernadero y vea que no cierra |
| `game/picture/hud.ts`, `game/view/` | Desde 7.2 (también sin piedras, U = ∅), la cuenta del Consejo a la vista: grupos impares, piedras y "al menos g − k a oscuras" frente a los que hay (`tutteBergeBound`). En niebla (7.5) la cuenta solo se calcula al presentar el certificado con "Terminé", para no revelar enredaderas no inspeccionadas |
| `levels/flow.ts` | 7.4: la búsqueda que termina la hace el autómata de la fase 3 (`core/recipe/run.ts` con `fold`), porque la luz automática del Plan 04 no pliega; "Levanta las lunas" con las lunas resaltadas (`stonesFromForest`). La victoria de 7.4 exige que las piedras sean exactamente esas lunas (GDD: "a partir de las lunas") |

**Tests clave:** 7.1 se gana vigilando todo con 3 espantapájaros aunque solo haya 2 faroles; la cuenta de la hélice (7.3) con C levantado dice 3 − 1 = 2; en 7.4, las lunas de la búsqueda son un certificado válido.

---

## Fase 7 — Capítulo 7

Niveles 7.1–7.5 en `src/levels/data/ch7/` (7.2, 7.3 y 7.4 sustituyen a los borradores), con sus líneas (Robles: `oaks`): 7.1 los espantapájaros no bastan (`coverComplete` y una pregunta que acepta que no cierra); 7.2 piedras (U = ∅, la opción del jugador, la cuenta); 7.3 la hélice con Cuaderno; 7.4 el regalo de la búsqueda II; 7.5 ante el Consejo (22 brotes en niebla con flores anidadas, objetivo oculto, faroles y piedras). Códex C12 en 7.4.

---

## Fase 8 — Hub, registro y kit del playtest C

| Archivo | Responsabilidad |
|---|---|
| `content/es/strings.json`, hub | Nombres de los capítulos 5–7 |
| Registro | Entradas de recetas (correcta o no, tarjeta que falla), carreras (apuestas acertadas) y certificados de piedras (válido o no) |
| `docs/playtest/C.md` | Protocolo del Hito C (GDD §10): en 7.4, ¿entiende por qué las lunas son las piedras? Se le pide explicarlo en voz alta |

---

## Orden y dependencias

```
F0 → F1 → F2 → F3 → F4 → F5 → F6 → F7 → F8
```
F1 necesita F0; F5 necesita F2–F4; F6 necesita F3 (el autómata que pliega, para 7.4); F7 necesita F6.

**Hito E1 (F0–F1):** capítulo 5. **Hito E2 (F2–F5):** capítulo 6. **Hito E3 (F6–F8):** capítulo 7 y kit del playtest C. Tras la verificación del autor: merge `develop → main` y tag `v0.5.0-chapters-5-7`.

---

## Riesgos y cómo se mitigan

| Riesgo | Mitigación |
|---|---|
| El autómata se convierte en otra implementación de Edmonds | La receta solo elige qué caso del núcleo se aplica; la propiedad "receta correcta = máximo" la vigila |
| Las carreras grandes son lentas en el navegador | Jardines y presupuestos fijos medidos en tests; Bruto se duerme al agotar su presupuesto |
| Las capas confunden en vez de ayudar | La vista nunca cambia el jardín ni las reglas: solo amplía |
| El capítulo 6 se vuelve texto | Cada tarjeta se comprueba con el comportamiento del autómata, no leyendo |
