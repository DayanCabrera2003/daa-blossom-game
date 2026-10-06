# Plan 01 — Base del proyecto: núcleo, tests y validaciones

> Alcance: todo lo que el juego necesita **saber** antes de **mostrar** nada. Sin Phaser, sin arte, sin sonido.
> Al terminar este plan existe un núcleo matemático completo, verificado contra fuerza bruta, con reglas del jugador, niveles validados y herramientas de inspección por consola.
> Referencias: `docs/GDD.md` (§5 acciones, §7 niveles, §8 Códex, §11 orden de producción).

---

## 0. Criterios globales

Se aplican a **todas** las fases:

- **TDD:** primero el test que falla, después la implementación mínima, después refactor. Cada paso es un commit.
- **Un archivo = una responsabilidad**, < 1000 líneas (regla dura 3). Los nombres de archivo de este plan ya siguen esa separación.
- **Funciones puras y datos inmutables** (`readonly` en tipos). Nada en `core/` toca `Math.random`, `Date`, DOM ni consola: la aleatoriedad entra por un RNG con semilla.
- **Errores como valores:** las operaciones que pueden fallar por entrada del jugador o de datos devuelven `Result<T, E>` con códigos estables; `throw` solo para invariantes rotos (bugs).
- **Comentarios en inglés** explicando el porqué matemático (p. ej. qué lema garantiza que un paso es correcto).
- **Cobertura mínima de `core/`:** 95 % de líneas y ramas (umbral en `vitest.config.ts`; CI falla por debajo).
- **Determinismo:** todo test aleatorio usa semilla fija y, si falla, imprime la semilla y el grafo como código de jardín.

Definición de "hecho" de cada fase: tests en verde, lint y typecheck limpios, cobertura ≥ umbral, commits atómicos en `develop`.

---

## Fase 0 — Repositorio y herramientas

**Objetivo:** un repo vacío pero con todas las redes de seguridad puestas antes de la primera línea de lógica.

Pasos (cada uno, un commit):

1. `git init`, rama `main`, exclusiones locales de archivos personales en `.git/info/exclude`. Verificar con `git status` que no aparecen.
2. `docs: add game design document` → mover `GDD.md` a `docs/GDD.md`; añadir este plan.
3. `chore: add README and license` (licencia a decidir; propuesta MIT para el código, arte según `CREDITS.md`).
4. `chore: scaffold TypeScript project with Vite` → `package.json`, `tsconfig.json` (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, alias `@core`, `@levels`, …), `.gitignore`, `.editorconfig`.
5. `chore: add Vitest with coverage thresholds` → `vitest.config.ts` con alias y umbral 95 % en `src/core/**`.
6. `chore: add fast-check for property-based tests`.
7. `chore: add zod for data validation`.
8. `chore: add tsx for running tool scripts`.
9. `chore: configure ESLint and Prettier` → flat config con:
   - `max-lines: ["error", { max: 1000 }]`
   - `no-restricted-imports`: `src/core/**` no puede importar `phaser`, `@levels`, `@game`, `@ui`, `@services`; `src/levels/**` solo `@core`.
   - `no-restricted-globals` en `core/`: `Math.random`, `Date`, `window`, `document`, `console`.
10. `test: add dependency rule smoke test` → un test que compruebe que el lint rechaza un import prohibido (fixture), para que la regla no se desactive en silencio.
11. `ci: add GitHub Actions workflow` → `lint`, `typecheck`, `test --coverage`, `check-levels` (se activa en fase 10), `build`.
12. Crear `develop` desde `main`; crear el repo en GitHub con `gh repo create`; push de ambas ramas; proteger `main` (solo merge desde `develop`).

**Hecho cuando:** `npm run lint && npm run typecheck && npm test` pasan en local y en CI con un test trivial.

---

## Fase 1 — Primitivas compartidas y grafo

**Carpetas:** `src/core/shared/`, `src/core/graph/`

| Archivo | Responsabilidad |
|---|---|
| `shared/result.ts` | `Result<T, E>`, `ok`, `err`, helpers |
| `shared/rng.ts` | RNG con semilla (mulberry32), `nextInt`, `shuffle`, `pick` |
| `shared/invariant.ts` | `invariant(cond, msg)` para bugs internos |
| `graph/types.ts` | `VertexId`, `Edge`, `Graph` (n, lista de aristas normalizada `u < v`, adyacencia) |
| `graph/createGraph.ts` | Construye y valida: rango, sin lazos, sin duplicados → `Result<Graph, GraphError>` |
| `graph/queries.ts` | `neighbors`, `hasEdge`, `degree`, `edgeKey` |
| `graph/components.ts` | Componentes conexas, opcionalmente sin un conjunto `removed` (lo usará Tutte–Berge) |
| `graph/bipartition.ts` | Bipartición o ciclo impar testigo (C6: bipartito ⇔ sin ciclos impares) |
| `graph/labels.ts` | Mapa nombre de brote ↔ id (`R`, `a`, `b`… son etiquetas de nivel, no identidad) |

**Tests clave:**
- `createGraph` rechaza cada error con su código; normaliza orientación de aristas.
- Propiedad: `sum(degree) === 2 * edges.length`.
- Propiedad: `bipartition` devuelve o una 2-coloración válida o un ciclo impar que existe en el grafo.
- Propiedad: componentes forman una partición de los vértices no eliminados.

---

## Fase 2 — Emparejamientos, caminos y Berge

**Carpeta:** `src/core/matching/`

| Archivo | Responsabilidad |
|---|---|
| `types.ts` | `Matching` como `mate: readonly (VertexId \| -1)[]` |
| `createMatching.ts` | Desde lista de aristas, validando contra el grafo → `Result` |
| `queries.ts` | `size`, `isExposed`, `matchedEdges`, `exposedVertices` |
| `edit.ts` | `addEdge`, `removeEdge` (puros; rechazan si rompen exclusividad) |
| `maximal.ts` | `isMaximal` (nivel 1.1: maximal ≠ máximo) |
| `paths.ts` | `isAlternatingPath`, `isAugmentingPath`, `isEvenAlternatingPath` (tallo) con motivo del rechazo |
| `augment.ts` | `flipAlong(matching, path)` — diferencia simétrica con un camino |
| `symmetricDifference.ts` | `M ⊕ M'` y su **descomposición en caminos y ciclos alternantes** (capítulo 2, el Estanque) |

**Tests clave:**
- `flipAlong` sobre camino aumentante ⇒ tamaño +1 y sigue siendo válido; sobre alternante par ⇒ mismo tamaño.
- Propiedad (Berge, C3): para `M` y `M'` válidos aleatorios, `M ⊕ M'` tiene grado ≤ 2 y la descomposición cubre exactamente sus aristas; si `|M'| > |M|`, al menos un componente es camino aumentante para `M`.
- Fixture del Estanque (`1–2–3–4–5–6`, `M = {2=3, 4=5}`, `M* = {1=2, 3=4, 5=6}`) produce un solo camino de extremos 1 y 6.

---

## Fase 3 — Oráculo de fuerza bruta (Bruto)

**Carpeta:** `src/core/bruteforce/`. Va **antes** del algoritmo para que todo lo demás se verifique contra él desde el primer día.

| Archivo | Responsabilidad |
|---|---|
| `maximumMatching.ts` | Búsqueda exhaustiva con retroceso; devuelve un emparejamiento máximo y `steps` |
| `budget.ts` | Presupuesto de pasos: si se agota, devuelve `{ status: "gaveUp", best, steps }` (en la carrera II Bruto "se duerme") |
| `countMatchings.ts` | Número total de emparejamientos (para la gráfica de C11: crecimiento exponencial) |

**Tests clave:**
- Valores conocidos: camino P_n, ciclo C_n (`⌊n/2⌋`), K_n, estrella, hélice de 7.3 (4), C5 (2).
- `countMatchings` de caminos sigue Fibonacci; de K_{2k} coincide con la fórmula.
- Con presupuesto pequeño en un grafo grande, termina en `gaveUp` sin exceder el presupuesto.

Límite práctico documentado: exacto hasta ~14 vértices en tests.

---

## Fase 4 — Traza y búsqueda en el caso bipartito

**Carpetas:** `src/core/trace/`, `src/core/search/`, `src/core/certificates/`

Aquí nace el bosque alternante (sol/luna) en el caso sin ciclos impares. Se hace primero bipartito porque es lo que enseña el Invernadero (cap. 3) y aísla la búsqueda de la complicación de las flores.

| Archivo | Responsabilidad |
|---|---|
| `trace/events.ts` | Unión discriminada `TraceEvent`: `searchStart`, `labelOuter`, `labelInner`, `scanEdge`, `augment`, `searchFailed`, `done` (se ampliará en fase 5) |
| `trace/recorder.ts` | Acumulador de eventos + contador de pasos (inyectado, puro) |
| `search/forest.ts` | Tipo `AlternatingForest`: `label` (outer/inner/none), `parent`, `root` |
| `search/growForest.ts` | Reglas de crecimiento de un paso (sol–x sin marca con farol ⇒ x luna, pareja sol) |
| `search/pathToRoot.ts` | Reconstrucción del camino de un vértice a su raíz |
| `search/bipartiteSearch.ts` | Búsqueda completa: encuentra camino aumentante o termina con el bosque final |
| `search/bipartiteMatching.ts` | Bucle de aumentos hasta máximo |
| `certificates/vertexCover.ts` | `isVertexCover`, `koenigCover(forest)` (espantapájaros: lunas + no alcanzados de un lado) |

**Tests clave:**
- Propiedad: en grafos bipartitos aleatorios, `size(bipartiteMatching) === bruteForce` y `|koenigCover| === size` y la cobertura es válida (König, C5).
- Propiedad: cada vértice se etiqueta a lo sumo una vez por búsqueda (base del O(m) de C4).
- Invariantes del bosque tras cada evento: raíces expuestas, soles a distancia par, lunas impar, cada luna tiene exactamente un hijo (su pareja).
- Un sol–sol del mismo árbol (ciclo impar) hace que la búsqueda bipartita devuelva el error `oddCycleConflict` con la arista en conflicto, nunca un resultado falso. Caso de prueba: la flor con tallo `R–a=b, b–c=d–b` (el jardín de 4.1 sin la salida `c–e`).
- Nivel 4.1 completo (`R–a, a=b, b–c, c=d, d–b, c–e`): como el bosque crece desde **todos** los expuestos, el árbol de `e` alcanza a `d` y `b–d` une soles de árboles distintos, así que la búsqueda encuentra `R–a=b–d=c–e`. La "traición" de 4.1 es la del jugador que busca solo desde R (regla que el reducer de la fase 8 modela con una sola raíz), no la del algoritmo.
- Propiedad: en cualquier grafo, la búsqueda bipartita devuelve conflicto o un resultado correcto (camino aumentante válido, o "sin camino" solo si el emparejamiento es máximo).

---

## Fase 5 — Flores (blossoms) explícitas

**Carpeta:** `src/core/blossom/`. Es el corazón del proyecto y del lema de la flor (C7–C9). Estructura explícita porque el juego pliega, despliega, anida y gira tallos.

| Archivo | Responsabilidad |
|---|---|
| `types.ts` | `Blossom { id, base, cycle: Node[] }` con `Node = vertex \| blossom` (anidamiento como árbol) |
| `detect.ts` | Arista sol–sol en el mismo árbol ⇒ ciclo impar vía ancestro común (LCA) |
| `isBlossom.ts` | Validador: ciclo impar `2k+1` con `k` aristas de M y base con farol fuera o expuesta → motivo si no |
| `contract.ts` | `G/B`, `M/B` y mapa vértice original → supervértice |
| `liftPath.ts` | Levanta un camino de `G/B` a `G` eligiendo el lado del ciclo que alterna (C8, dirección i) |
| `expand.ts` | Desplegado recursivo de fuera hacia dentro para flores anidadas (C9) |
| `rotateStem.ts` | Invierte el tallo (alternante par raíz→base): la base queda expuesta, `|M|` igual (C8, dirección ii) |
| `hierarchy.ts` | Consultas: vértice → flor más externa, profundidad (para "Capas") |

**Tests clave (fixtures del GDD):**
- 4.4/4.6: detectar el ciclo de 5 pétalos, contraer, levantar ⇒ camino `R–a=b–g=f–d=c–e`.
- 4.7: flor con tallo largo; la base es `d`.
- 4.9: flor sin salida ⇒ tras contraer no hay camino aumentante.
- 4.10: `rotateStem` sobre `R–a=b` produce `R=a–b`, tamaño igual.
- 5.1 (anidadas): camino final `t–a=b–d=c–g=h–R`.
- Propiedad (lema de la flor, C8): en grafos aleatorios, para cada flor encontrada, `|M|` es máximo en `G` **si y solo si** `|M/B|` lo es en `G/B`, y además `ν(G/B) − |M/B| ≤ ν(G) − |M|`, usando el oráculo. La igualdad de déficits **no** se cumple en general: plegar puede esconder capacidad sobrante (contraejemplo fijado en `contract.test.ts`: triángulo con base expuesta cuyos tres pétalos tienen vecinos propios; faltan 3 faroles en `G` y solo 2 en `G/B`). Lo que nunca esconde es una cadena.
- Propiedad: `liftPath` siempre devuelve un camino aumentante válido en `G`.
- Propiedad: `expand(contract(x))` recupera el grafo original.

---

## Fase 6 — Edmonds completo (versión didáctica) y Tutte–Berge

**Carpetas:** `src/core/edmonds/`, `src/core/certificates/`

La versión que usa el juego: sigue la demostración paso a paso (buscar → plegar → recursión/continuación → desplegar → aumentar) y emite la traza que alimentará el sol, el jardinero mecánico y el modo profesor.

| Archivo | Responsabilidad |
|---|---|
| `trace/events.ts` (ampliación) | `oddCycleFound`, `contract`, `expand`, `liftPath`, `rotateStem` |
| `edmonds/search.ts` | Una búsqueda en el grafo con flores: crecer, detectar, plegar |
| `edmonds/phase.ts` | Una fase: búsqueda + desplegado + aumento |
| `edmonds/solve.ts` | Bucle de fases hasta que no hay camino; devuelve `{ matching, trace, finalForest, steps }` |
| `trace/replay.ts` | `stateAt(trace, k)`: reconstruye el estado del jardín tras k eventos (slider del sol) |
| `certificates/oddComponents.ts` | `odd(G − U)` |
| `certificates/tutteBerge.ts` | Cota `(n + |U| − odd(G−U)) / 2`, `verifyCertificate(G, M, U)` ⇒ `M` máximo demostrado |
| `certificates/fromForest.ts` | `U` = lunas del bosque final (7.4: "la búsqueda que fracasó te entrega las piedras") |

**Tests clave:**
- **Propiedad maestra:** miles de grafos aleatorios (n ≤ 12, varias densidades, semilla fija): `size(edmonds) === bruteForce`, emparejamiento válido, y el certificado del bosque final **cuadra exactamente**.
- Propiedad: `stateAt(trace, trace.length)` coincide con el resultado final; `stateAt(trace, 0)` con el estado inicial.
- Propiedad: el número de aumentos ≤ n/2; cada búsqueda etiqueta cada (super)vértice a lo sumo una vez; cada contracción reduce el número de vértices (C10, terminación).
- Fixtures: C5 ⇒ 2 con `U = ∅`; hélice 7.3 ⇒ 4 con `U = {C}`; 7.4 ⇒ certificado desde las lunas.
- Generadores dirigidos a los casos difíciles (fase 11) incluidos en la propiedad maestra: flores anidadas, tallos largos, varias flores por búsqueda.

---

## Fase 7 — Edmonds eficiente y medición de costo

**Carpetas:** `src/core/edmonds/fast/`, `src/core/cost/`

Versión clásica O(n³) (array de bases + LCA), sin traza detallada pero con contador de operaciones. Sirve para la carrera (cap. 6), para la gráfica de C11 y como **segundo oráculo** independiente en grafos grandes donde la fuerza bruta no llega.

| Archivo | Responsabilidad |
|---|---|
| `edmonds/fast/solve.ts` | Implementación O(n³) con contador |
| `cost/operationCounter.ts` | Contador inyectable (comparaciones, etiquetados, contracciones) |
| `cost/benchmark.ts` | Serie de pasos por tamaño de jardín (6, 8, 10, 16, 32, 64) para la gráfica |

**Tests clave:**
- **Triple verificación:** didáctica = rápida = fuerza bruta (n ≤ 12); didáctica = rápida (n hasta 200).
- Propiedad de costo: los pasos crecen polinomialmente (ajuste: `steps(2n) / steps(n)` acotado por ~8 en familias fijas) y los de Bruto exponencialmente.

**Decisión abierta:** la versión didáctica con contracción explícita puede costar más que O(n³). Opciones: (a) el Códex analiza la versión rápida y lo dice explícitamente, o (b) optimizar la didáctica hasta O(n³). Propuesta: (a), con una nota honesta en C11.

---

## Fase 8 — Reglas del jugador (reducer)

**Carpeta:** `src/core/rules/`. Traduce las acciones de §5.1 del GDD en transiciones validadas. Nunca castiga: cada rechazo es un `reason` estable que el juego convertirá en feedback suave o pista.

| Archivo | Responsabilidad |
|---|---|
| `state.ts` | `GardenState`: grafo, emparejamiento, marcas sol/luna, niebla revelada, agua, flores plegadas, espantapájaros, piedras |
| `actions.ts` | Unión discriminada `Action` (join, split, passLantern, chain, inspect, mark, placeScarecrow, fold, unfold, rotateStem, liftStone, declareDone) |
| `reasons.ts` | Códigos de rechazo (`notAdjacent`, `alreadyLit`, `notAlternating`, `notOddCycle`, `noWater`, `actionLocked`…) |
| `permissions.ts` | Qué acciones permite un nivel |
| `applyAction.ts` | Despachador: permisos + delega en el manejador de cada acción |
| `handlers/<action>.ts` | Un archivo por acción; cada uno usa los validadores de fases 2–6 |
| `victory.ts` | Evalúa condiciones declarativas: `matchingSize`, `maximum` (con "Terminé"), `validCover`, `validTutteBerge`, `augmentingPathShown`… |

**Tests clave:**
- Por acción: caso válido, cada `reason` de rechazo, y que el estado original no se muta.
- Propiedad: cualquier secuencia de acciones aceptadas mantiene un emparejamiento válido.
- Propiedad: `chain` solo aumenta si el camino es aumentante; con ganancia 0 (giro de tallo) mantiene el tamaño.
- `declareDone` solo gana si `|M| = ν(G)` (calculado con Edmonds, nunca guardado a mano en el nivel).

---

## Fase 9 — Recetario (algoritmo configurable)

**Carpeta:** `src/core/recipe/`. Para el capítulo 6: la receta que el jugador arma con tarjetas y que el autómata ejecuta, incluidas recetas rotas.

| Archivo | Responsabilidad |
|---|---|
| `cards.ts` | Catálogo de tarjetas (correctas y distractoras de 6.1) |
| `validateRecipe.ts` | Comprueba el orden y conjunto de tarjetas → motivo de error |
| `runRecipe.ts` | Ejecuta una receta (posiblemente incompleta, p. ej. sin "plegar") y emite traza |

**Tests clave:**
- La receta correcta coincide con Edmonds en todos los grafos de la propiedad maestra.
- 6.3: la receta sin plegar sobre el jardín de 4.6 se detiene en 2 y declara "terminé"; la correcta llega a 3.
- La distractora "repite hasta que no queden a oscuras" no termina: `runRecipe` detecta el bucle y devuelve `nonTerminating`.

Se puede posponer hasta el greybox del capítulo 6 sin bloquear nada.

---

## Fase 10 — Niveles: esquema, carga e integridad

**Carpetas:** `src/levels/`, `tests/`, `tools/`

| Archivo | Responsabilidad |
|---|---|
| `levels/schema.ts` | Esquema zod: id, capítulo, brotes (etiqueta + posición), enredaderas, faroles iniciales, objetivo (visible/oculto), acciones permitidas, agua, victoria, pistas (ids), desbloqueos, **solución de referencia** (lista de acciones) |
| `levels/toGardenState.ts` | JSON validado → `GardenState` de `core/` |
| `levels/loader.ts` | Carga + validación → `Result` con errores legibles |
| `levels/data/chN/*.json` | Fixtures iniciales: 0.1, 1.1, 2.1, 4.1, 4.3, 4.6, 4.7, 4.9, 4.10, 5.1, 7.1, 7.3, 7.4 |
| `tests/levels.test.ts` | Integridad de **todos** los niveles |
| `tools/check-levels.ts` | La misma comprobación por consola con informe legible; en CI |

**Integridad por nivel:**
1. Pasa el esquema.
2. El grafo y el emparejamiento inicial son válidos.
3. Si el objetivo declara un valor, coincide con `ν(G)` de Edmonds.
4. La solución de referencia, aplicada con el reducer, es aceptada paso a paso y cumple la condición de victoria.
5. Las acciones de la solución están permitidas en ese nivel.
6. Los ids de pistas y diálogos tienen formato válido (existencia real se comprueba cuando exista `content/`).

---

## Fase 11 — Generadores, código de jardín y herramientas de inspección

**Carpetas:** `src/core/generators/`, `src/core/graph/`, `tools/`

| Archivo | Responsabilidad |
|---|---|
| `generators/random.ts` | G(n, p) con semilla |
| `generators/families.ts` | Caminos, ciclos, estrellas, completos, bipartitos aleatorios |
| `generators/hardCases.ts` | Flor con tallo largo, flores anidadas k niveles, hélice, varias flores por búsqueda |
| `graph/gardenCode.ts` | Serialización corta y reversible (base64url) de grafo + emparejamiento |
| `tools/solve.ts` | CLI: `npm run solve -- <código>` imprime traza legible, resultado y certificado |
| `tools/bench.ts` | CLI: tabla de pasos por tamaño (didáctica, rápida, Bruto) |

**Tests clave:**
- Propiedad: `parse(serialize(x)) === x`; códigos inválidos se rechazan con motivo.
- Cada generador de `hardCases` produce realmente la estructura prometida (p. ej. la búsqueda encuentra ≥ k flores anidadas).

La CLI de trazas es la forma de "ver" el algoritmo sin interfaz: permite revisar a mano cada nivel del GDD antes del greybox.

---

## Orden y dependencias

```
F0 → F1 → F2 → F3 → F4 → F5 → F6 → F7
                          ↘          ↘
                           F8 → F10   F9 (posponible)
F11: los generadores básicos entran con F3 (para las propiedades);
     hardCases con F5; gardenCode y CLIs al final.
```

Hitos:

- **Hito N1 (F0–F3):** repo, grafo, emparejamientos, Berge y oráculo. Ya se puede verificar cualquier afirmación de los capítulos 0–2.
- **Hito N2 (F4–F6):** búsqueda, flores y Edmonds con certificado. **El núcleo está demostrado empíricamente.**
- **Hito N3 (F7–F8, F10–F11):** costo, reglas del jugador, niveles validados y CLI. **Base lista para el greybox** (plan 02).
- F9 se hace cuando se llegue al capítulo 6.

Al cerrar N3: merge `develop → main`, tag `v0.1.0-core`, y el plan 02 (motor de niveles greybox en Phaser) arranca sobre esta base.

---

## Riesgos y cómo se mitigan

| Riesgo | Mitigación |
|---|---|
| Bug sutil en flores anidadas que los ejemplos no cubren | Generadores `hardCases` + propiedad maestra con miles de casos + triple verificación |
| La traza didáctica diverge del resultado real | `replay(trace)` debe reproducir exactamente el resultado final (test) |
| Niveles del GDD mal diseñados (como pasó con 4.3) | `check-levels` recalcula el óptimo y ejecuta la solución de referencia de cada nivel |
| Archivos que crecen y mezclan responsabilidades | `max-lines` en ESLint + la tabla de responsabilidades de cada fase |
| Lógica filtrada al juego más adelante | `no-restricted-imports` + test que comprueba que la regla sigue activa |

## Decisiones abiertas

1. Costo de la versión didáctica vs. la rápida (fase 7): propuesta (a).
2. ~~Orden de exploración de la búsqueda (BFS o DFS)~~ **Decidido (fase 4): BFS**, soles en cola en orden ascendente; más predecible y fácil de narrar.
3. Licencia del código.
