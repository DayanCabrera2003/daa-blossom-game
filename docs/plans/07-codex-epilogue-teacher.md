# Plan 07 — El Códex, el Cuaderno, el epílogo y el modo profesor

> Alcance: el Códex como libro (GDD §5.6, §8; GDD §11 punto 7): 14 entradas C1–C14 en Markdown con KaTeX, tres pestañas (Intuición con un diagrama interactivo, Formal con definiciones, enunciados y demostraciones completas, Puente con la traducción y la nota histórica), desbloqueo con el juego y todas abiertas en modo profesor; el Cuaderno como libro, con cada enunciado escrito enlazado a la entrada que lo traduce (GDD §5.5); el epílogo "Más allá del jardín"; y el modo profesor completo (GDD §5.8; parte del punto 10): Códex abierto, saltos directos a cualquier nivel y el panel con la traza del algoritmo en notación matemática junto al jardín.
> Fuera de alcance: el modo libre (Plan 08: aquí solo queda su botón preparado y oculto), las flores secretas, el Paseo guiado (video), una traducción al inglés (se deja la estructura por idioma, sin textos).
> Referencias: `docs/GDD.md` (§2 principio 2, §3.3 glosario, §4.1 UI, §5.5, §5.6, §5.8, §7 epílogo, §8 entradas, §10 prueba de rigor, §11), `docs/plans/06-art-and-audio.md`, las reglas del proyecto (arquitectura, reglas de dependencia, "Contenido y voz").

---

## 0. Criterios globales

- **El núcleo no se reimplementa ni se toca.** Los diagramas, el Cuaderno y el panel del profesor solo **preguntan** a `core/` (`applyAction`, `edmonds`, `stateAt`, `cutAtFlower`, `symmetricDifference`, `oddComponents`, `tutteBergeBound`, `stonesFromForest`, `race`…). Si una entrada necesita un resultado que el núcleo no da, se añade al núcleo con su test primero, en su propio commit; nunca se calcula en `ui/`.
- **`ui/` no importa `game/` ni Phaser** (ya lo impone ESLint). `game/` y `ui/` solo se hablan por un **bus de eventos tipado** que vive en `services/` (los dos pueden importar `services/`). `main.ts` es la raíz de composición: crea el bus, el juego y la capa DOM.
- **Decidir es puro; pintar el DOM, no.** Todo lo que se pueda decidir sin el DOM (qué entradas están abiertas, cómo se parte una entrada en pestañas, qué expresiones matemáticas hay, la geometría de un jardín en miniatura, la interpretación de un toque, la notación de un evento) vive en la nueva carpeta pura **`src/ui/model/`**, cubierta al 95 % y sin globals del navegador (ESLint). `ui/codex`, `ui/diagram`, `ui/notebook`, `ui/teacher`, `ui/epilogue` solo construyen DOM y SVG.
- **La lógica es instantánea y la vista la alcanza**, también en los diagramas: un toque produce una `Action`, `applyAction` responde y el SVG se redibuja desde el estado devuelto; el deslizador de un diagrama de traza muestra `stateAt(initial, trace, k)`.
- **Todo texto visible está en `src/content/es/`**: textos de interfaz en `strings.json` (y sus claves en `content/keys.ts`), las entradas en `content/es/codex/C01.md … C14.md`, el glosario en `content/es/codex/glossary.json`, las plantillas de notación del profesor en `content/es/notation.json`. La carga es por idioma (`content/<locale>/…`), sin textos ingleses aún.
- **Regla del vocabulario.** La regla del principio 2 (nunca "grafo", "arista", "vértice", "emparejamiento" ni "camino aumentante") **sigue valiendo para todo el texto del juego**: `strings.json`, `lines.json`, el Cuaderno, el epílogo **y la pestaña Intuición** de cada entrada, que habla con las palabras del jardín. La pestaña **Formal**, la pestaña **Puente**, el título formal de cada entrada, el glosario C13 y la notación del panel del profesor son **precisamente** el sitio donde ese vocabulario se usa, y los tests lo distinguen por pestaña (fase 3).
- **El lazy-loading es obligatorio, no una optimización.** Hoy `dist/` tiene un solo script de 1,65 MB frente al presupuesto `js` de 1,8 MB (plan 06, fase 11): KaTeX (~280 KB minificado) no cabe en la carga inicial. KaTeX, marked, los textos de las entradas y la UI de los libros van en un trozo (chunk) cargado con `import()` la primera vez que se abre un libro o el panel; la carga inicial solo gana el bus y el armazón (`ui/shell.ts`, unos KB). La fase 2 enseña al presupuesto a distinguirlos.
- **Dependencias nuevas:** solo `katex` y `marked` (ya en la tabla del stack), versión exacta, cada una en su commit `chore: add <dep> for <reason>`. Nada más: la extensión de `$…$` para marked se escribe en el proyecto (unas decenas de líneas puras), no se añade `marked-katex-extension`.
- **Rigor verificable.** Cada demostración se escribe contra un texto de referencia citado (sección 1), sigue la lista de rigor de su fase y nombra el test del núcleo que la "atestigua" empíricamente (p. ej. el lema de Berge contra `core/bruteforce` en grafos aleatorios). La prueba de rigor del GDD §10 (un compañero coteja línea a línea) cierra el plan (fase 14, más la revisión opcional de un compañero con `docs/codex-review.md`).
- **Las fases se ejecutan de una en una**, en el orden de la sección "Orden y dependencias". Nunca dos fases a la vez.

Definición de "hecho" de cada fase: la del Plan 03 (lint, format:check, typecheck, coverage ≥ 95 %, check-levels, build), más `npm run budget` tras el build en las fases que cambian lo que se empaqueta (2, 3, 4, 5, 13). Ninguna fase abre un navegador: al cerrar cada hito, la sesión principal revisa en pantalla (un único navegador headless, cerrado al terminar) que libros, diagramas, epílogo y panel se vean bien y se entiendan.

---

## 1. Las 14 entradas

### 1.1 Formato de un archivo de entrada

Un archivo por entrada, `src/content/es/codex/C01.md … C14.md`, con marcadores en comentarios HTML (invisibles si se lee el Markdown en GitHub, independientes del idioma):

~~~
<!-- entry: C3 -->
# El hilo ganador                       ← título del jardín (siempre visible al abrirse la entrada)
<!-- tab: intuition -->
… palabras del jardín …
```diagram
{ "kind": "pond", "level": "2.1" }
```
<!-- tab: formal -->
## Lema de Berge                        ← título formal (se ve solo cuando la pestaña Formal está abierta)
**Definición 3.1 (…).** …
**Teorema 3.2 (Berge, 1957).** …
*Demostración.* … $\blacksquare$
### Referencias
- Lovász–Plummer, cap. 1 …
<!-- tab: bridge -->
```bridge
```                                      ← tabla generada desde glossary.json (filas de esta entrada)
**Nota histórica.** …
~~~

Convenciones que los tests comprueban (fase 3): matemáticas en línea `$…$` y en bloque `$$…$$`; cada resultado empieza por `**Definición|Lema|Proposición|Teorema|Corolario N.M (nombre).**`, numerado por entrada; cada Lema, Proposición, Teorema o Corolario va seguido de `*Demostración.*` que termina en `$\blacksquare$` (salvo los marcados `(sin demostración: fuera de alcance)`, solo en C11 y C14); enlaces internos `[texto](#C8)` o `[texto](#C8-T8.2)`; bloques ` ```diagram ` (JSON validado con zod), ` ```bridge ` y ` ```glossary `. Nada de HTML crudo salvo los marcadores.

### 1.2 Desbloqueo (del GDD §7)

| Entrada | Se abre al ganar | Notas |
|---|---|---|
| C1 Emparejamiento | 0.5 (solo Intuición); 1.8 (completa) | El GDD lo pide así (0.5: "la Formal se abre al terminar el capítulo 1") |
| C2 La cadena | 1.8 | |
| C3 Lema de Berge | 2.4 | |
| C4 La búsqueda, C5 König | 3.8 | |
| C6 Bucles impares, C7 La flor, C8 Lema de la flor | 4.11 | |
| C9 Flores anidadas | 5.5 | |
| C10 La receta, C11 El costo | 6.6 | |
| C12 Las piedras | 7.4 | |
| C13 Glosario | 1.8 (crece) | Muestra las filas cuyas entradas están abiertas; completo tras 7.4. El GDD no lo fija: ver preguntas abiertas |
| C14 Más allá del jardín | 7.5 | Lo abre el epílogo |

Las declaraciones C1–C12 ya existen en los JSON (`unlocks.codex`) salvo la parcial de 0.5; esta fase añade la forma `{ "entry": "C1", "tabs": ["intuition"] }`, C13 en 1.8 y C14 en 7.5.

### 1.3 Contenido de cada entrada

Las referencias abreviadas son: **LP** = Lovász y Plummer, *Matching Theory* (North-Holland, 1986; reimpr. AMS Chelsea, 2009); **KV** = Korte y Vygen, *Combinatorial Optimization*, 6.ª ed. (Springer, 2018), cap. 10 "Maximum Matchings"; **T** = Tarjan, *Data Structures and Network Algorithms* (SIAM, 1983), cap. 9 "Matchings". Las secciones se citan por capítulo y título; el redactor confirma el número exacto de sección y de resultado en la edición que tenga a mano y lo anota en la línea de referencia. "Testigo" es el test del núcleo que comprueba el enunciado en miles de jardines.

**C1 Emparejamiento** — *Intuición:* un farol es para dos; "no puedo añadir ninguno" no es "lo mejor posible". Diagrama `play` sobre el jardín de 1.1 (juntar y apagar, contador de faroles). *Formal:* Def. 1.1 grafo simple $G=(V,E)$, $n=|V|$, $m=|E|$; Def. 1.2 emparejamiento $M$, vértice cubierto y expuesto; Def. 1.3 maximal y máximo, $\nu(G)$, emparejamiento perfecto; Prop. 1.4 $\nu(G)\le\lfloor n/2\rfloor$; Prop. 1.5 todo máximo es maximal y el recíproco es falso (contraejemplo $P_4$ = jardín de 1.1); Prop. 1.6 si $M$ es maximal, $|M|\ge\nu(G)/2$ (cada arista de un máximo $M^*$ toca un vértice cubierto por $M$, y cada uno de los $2|M|$ vértices cubiertos toca a lo sumo una de $M^*$). Ref.: LP cap. 1 (definiciones); KV cap. 10, introducción. *Puente:* brote, enredadera, jardín, farol, a oscuras, noche bien aprovechada, "no puedo añadir". Nota: el problema de la asignación y su historia antes de 1965.

**C2 La cadena** — *Intuición:* pasar el farol en cascada; cada cadena gana exactamente uno. Diagrama `play` en 1.3 (la brigada; ver preguntas abiertas sobre "1.2"), con la herramienta de cadena por toques sucesivos. *Formal:* Def. 2.1 camino, camino $M$-alternante, camino $M$-aumentante; Def. 2.2 diferencia simétrica $M\oplus E(P)$; Lema 2.3 si $P$ es $M$-aumentante, $M\oplus E(P)$ es emparejamiento y $|M\oplus E(P)|=|M|+1$ (grados internos, extremos expuestos, cuenta $k$ y $k+1$); Lema 2.4 un camino alternante de longitud par que empieza en un vértice expuesto da un emparejamiento del mismo tamaño y traslada el vértice expuesto al otro extremo (la "ganancia 0" de 1.4, base de girar el tallo en C8); Lema 2.5 lo mismo para un ciclo alternante (par). Ref.: LP cap. 1; KV cap. 10, comienzo de §10.1; T cap. 9. Testigo: `core/matching/augment.test.ts`, `paths.test.ts`. *Puente:* pasar el farol, cadena, cadena de ganancia 0.

**C3 Lema de Berge (1957)** — *Intuición:* el reflejo del estanque; los hilos alternan; el hilo que gana por uno es una cadena tuya. Diagrama `pond` sobre 2.1–2.3 (los dos juegos de faroles, tocar para superponer y separar). *Formal:* Lema 3.1 un grafo conexo de grado máximo ≤ 2 es un camino o un ciclo (demostración completa); Teorema 3.2 (Berge) $M$ es máximo ⇔ no hay camino $M$-aumentante. (⇒) por Lema 2.3. (⇐) por contrarrecíproco con $M^*$, $|M^*|>|M|$, $H=(V,M\oplus M^*)$: grados ≤ 2, componentes alternantes, ciclos pares con igual número de aristas de cada uno, un camino con más aristas de $M^*$ empieza y acaba en aristas de $M^*$, **y sus extremos están expuestos en $M$** (si un extremo $u$ estuviera cubierto por $e\in M$, como $e\notin H$, sería $e\in M\cap M^*$, y $u$ tendría dos aristas de $M^*$). Corolario 3.3 "si no queda ninguna cadena, nadie te gana" (el Cuaderno de 2.4). Ref.: LP cap. 1; KV §10.1 (teorema de Berge); Berge, *Two theorems in graph theory*, PNAS 43 (1957). Testigo: `core/matching/symmetricDifference.test.ts` y la propiedad Edmonds = Bruto. *Puente:* reflejo, maraña $=M\oplus M^*$, hilos y bucles. Nota: Berge y Norman–Rabin (1959).

**C4 La búsqueda** — *Intuición:* caminar de noche desde cada brote a oscuras; sol y luna; "ya visitado, lo dejo". Diagrama `replay` de la solución de 3.4 (dos jardineros) con el sol como deslizador. *Formal:* Def. 4.1 bosque alternante $F$ respecto de $M$: raíces = vértices expuestos, exteriores $O$ (distancia par), interiores $I$ (impar); Lema 4.2 invariantes (cada interior está cubierto y su pareja es su único hijo, exterior; el camino de la raíz a cada vértice del árbol es $M$-alternante) y su conservación al crecer; Lema 4.3 una arista exterior–exterior entre árboles distintos da un camino aumentante (concatenación de los dos caminos a la raíz); Prop. 4.4 cada vértice se etiqueta a lo sumo una vez por búsqueda y cada arista se examina a lo sumo dos veces: $O(n+m)$ por búsqueda. La corrección en el caso de abejas y flores se demuestra en C5 (con el certificado). Ref.: KV §10.1 (algoritmo para bipartitos); T cap. 9; LP cap. 1. Testigo: `core/search/growForest.test.ts`, `tests/support/forestInvariants.ts`. *Puente:* caminar de noche, sol/luna, cada solitario lanza su luz.

**C5 Abejas, flores y espantapájaros (König, 1931)** — *Intuición:* cada farol está en una enredadera vigilada; espantapájaros en todas las lunas. Diagrama `cover` en 3.8 (colocar espantapájaros, botón "en las lunas" que usa el bosque del núcleo, la cuenta). *Formal:* Def. 5.1 bipartito $(A,B)$, cobertura por vértices, $\tau(G)$; Lema 5.2 $\nu\le\tau$; Lema 5.3 en un bipartito los exteriores de un árbol están en el lado de su raíz, así que nunca hay exterior–exterior en el mismo árbol; Teorema 5.4 (König) si $G$ es bipartito, $\nu=\tau$. Demostración constructiva con el bosque final completo $F$ (ninguna arista exterior–exterior, ningún exterior con vecino sin etiqueta), $N$ = no alcanzados: $C = I\cup(N\cap A)$ es cobertura (casos por tipo de arista) y $|C|=|M|$ ($M$ empareja $I$ con exteriores no raíz, y $M$ restringido a $N$ es perfecto en $N$ con un extremo en $A$ por arista); por tanto $\tau\le|M|\le\nu\le\tau$. Observación 5.5: si la búsqueda alcanzó a todos, $C=I$ (el distractor (c) del Cuaderno de 3.8 y la flor secreta del Invernadero). Ref.: LP cap. 1 (teorema de König); KV §10.1; König (1931). Testigo: `core/certificates/vertexCover.test.ts`, `core/search/bipartiteMatching.test.ts`. *Puente:* abejas y flores, espantapájaros, "el regalo de la búsqueda". Nota: König y Egerváry (1931).

**C6 Bucles impares** — *Intuición:* la luz que miente en 4.1; un brote que debería ser sol y luna. Diagrama `replay` de la búsqueda ingenua de 4.1 (`core/search/autoSearch`) y de 4.2 con el conflicto. *Formal:* Lema 6.1 todo paseo cerrado de longitud impar contiene un ciclo impar (inducción en la longitud); Teorema 6.2 $G$ es bipartito ⇔ no tiene ciclos impares (⇐: paridad de distancias en cada componente y Lema 6.1); Lema 6.3 una arista exterior–exterior $xy$ en el mismo árbol cierra un ciclo de longitud $d(x)+d(y)-2d(w)+1$, impar, con $w$ el ancestro común más bajo, exterior; Prop. 6.4 la búsqueda que etiqueta cada vértice una sola vez y no pliega puede declarar "no hay camino aumentante" cuando sí lo hay: el contraejemplo exacto de 4.1 con su camino $R\,a\,b\,d\,c\,e$. Ref.: LP cap. 1 (bipartición) y cap. 9; KV §10.5 (motivación). Testigo: `core/graph/bipartition.test.ts`, `core/search/conflict.test.ts`. *Puente:* sol y luna a la vez, bucle impar.

**C7 La flor** — *Intuición:* si todos pueden ser sol, ciérralos en un sol grande; la base; el tallo. Diagrama `replay` de `edmonds` en 4.6 (cinco pétalos) con plegado y desplegado paso a paso. *Formal:* Def. 7.1 blossom respecto de $M$: ciclo impar $B$ de longitud $2k+1$ con $k$ aristas de $M$; base $b$; tallo (camino alternante par de un expuesto a $b$, quizá de longitud 0); flor = tallo + blossom; Lema 7.2 para cada $v\in B$ hay exactamente un sentido del ciclo que da un camino $M$-alternante de longitud par de $b$ a $v$, y termina con arista de $M$ (si $v\neq b$); Def. 7.3 contracción $G/B$ y $M/B$; Lema 7.4 $M/B$ es emparejamiento de $G/B$ y $|M/B|=|M|-k$; Lema 7.5 el blossom que encuentra la búsqueda (Lema 6.3) es un blossom con tallo, y tras contraerlo el bosque sigue cumpliendo los invariantes del Lema 4.2 con $B$ exterior. Ref.: KV §10.5; LP cap. 9; Edmonds, *Paths, trees, and flowers*, Canad. J. Math. 17 (1965). Testigo: `core/blossom/isBlossom.test.ts`, `contract.test.ts`, `walk.test.ts`. *Puente:* flor, base, tallo, plegar, desplegar.

**C8 Lema de la flor (Edmonds, 1965)** — *Intuición:* plegar no crea ni destruye cadenas; el reto de 4.11. Diagrama `cut` en 4.11: el jugador traza una cadena en el jardín abierto y ve el trozo que llega a la flor en el plegado (`core/blossom/cutAtFlower`). *Formal:* hipótesis explícita: $B$ blossom **con tallo** (como lo encuentra la búsqueda). Teorema 8.1 $G$ tiene camino $M$-aumentante ⇔ $G/B$ tiene camino $M/B$-aumentante; Corolario 8.2 $M$ es máximo en $G$ ⇔ $M/B$ es máximo en $G/B$ (con C3). (i) Levantar: casos $P'$ evita $B$; $B$ extremo de $P'$ (solo si $b$ expuesto); $B$ interior de $P'$ (se entra por una arista fuera de $M$ en un pétalo $v$ y se sale por la arista de $M$ de la base): se inserta el camino del Lema 7.2 de $v$ a $b$; comprobar la alternancia en las dos uniones. (ii) Proyectar: Lema 8.3 girar el tallo (Lema 2.4) da $M'$ con $|M'|=|M|$, $B$ blossom de $M'$ con base expuesta y $|M'/B|=|M/B|$, así que se supone $b$ expuesta sin pérdida de generalidad; un camino aumentante $P$ tiene dos extremos expuestos y en $B$ solo $b$ lo está, luego un extremo $x\notin B$; sea $y$ el primer vértice de $P$ en $B$ desde $x$; ninguna arista de $M$ sale de $B$ (la base está expuesta), así que la arista que entra en $y$ no es de $M$, y $P[x,y]$ contraído es aumentante en $G/B$ porque el nodo $B$ está expuesto. Observación 8.4: la dirección (ii) usa el tallo; sin él el enunciado puede fallar (se cita el contraejemplo de la referencia). Ref.: KV §10.5 (lema de contracción); LP cap. 9; Edmonds (1965); T cap. 9. Testigo: `core/blossom/liftPath.test.ts`, `cutAtFlower.test.ts`, `rotateStem.test.ts`. *Puente:* girar el tallo, "plegar no esconde cadenas".

**C9 Flores anidadas** — *Intuición:* una flor es un brote más, y los brotes forman bucles; desplegar de fuera hacia dentro. Diagrama `replay` de `edmonds` en 5.1 con las flores anidadas (tocar una flor la resalta por dentro, como las capas). *Formal:* Def. 9.1 sucesión de contracciones $G_0=G$, $G_{i+1}=G_i/B_i$; pseudovértices; Lema 9.2 el conjunto de vértices originales de un blossom anidado tiene cardinal impar (inducción: $2k+1$ hijos, cada uno impar); Lema 9.3 dentro de un blossom anidado, de la base a cualquier vértice original hay un camino alternante par que termina en arista de $M$ (inducción en la profundidad, con el Lema 7.2 en cada nivel); Prop. 9.4 al levantar un camino de $G_k$ a $G$ se despliega de fuera hacia dentro; en cada blossom interior el camino entra por un hijo y sale por otro, uno de los dos es la base (la única arista de $M$ que sale de un blossom es la de su base) y exactamente uno de los dos sentidos alterna; Teorema 9.5 $G$ tiene camino aumentante ⇔ $G_k$ lo tiene (inducción con el Teorema 8.1). Ref.: KV §10.5; LP cap. 9. Testigo: `core/blossom/hierarchy.test.ts`, `unfold.test.ts`, `core/generators/hardCases.test.ts` (`nestedFlowers`). *Puente:* flor dentro de flor, capas.

**C10 La receta (algoritmo de Edmonds)** — *Intuición:* la receta de 6.1 que sigue el jardinero mecánico. Diagrama `recipe`: la ejecución de `core/recipe/run` en el jardín de 6.2 con la tarjeta activa resaltada en cada paso. *Formal:* Algoritmo 10.1 en pseudocódigo (la versión didáctica de `core/edmonds/solve.ts` y `phase.ts`: fases; en cada fase el bosque crece desde todos los expuestos; cinco casos para la arista $xy$ con $x$ exterior) con la tabla tarjeta ↔ línea (ids de `core/recipe/recipe.ts`); Lema 10.2 los invariantes del bosque se conservan (Lemas 4.2 y 7.5); Lema 10.3 si una fase termina sin aumentar, en el grafo contraído $G_k$ no hay camino $M_k$-aumentante. Demostración por conteo: en un camino aumentante $P$ de $G_k$ los extremos son raíces (exteriores); al final no hay aristas exterior–exterior ni exterior–no alcanzado, así que todo vecino en $P$ de un exterior es interior; todo vértice interno de $P$ tiene su arista de $M$ en $P$, lo que empareja biyectivamente los interiores de $P$ con los exteriores internos: $|I\cap P|=|O\cap P|-2$; las aristas exterior–interior de $P$ son $2|O\cap P|-2$ por un lado y a lo sumo $2|I\cap P|$ por otro: contradicción. Teorema 10.4 (corrección) al terminar, $M$ es máximo (Lema 10.3, Teorema 9.5, Teorema 3.2). Teorema 10.5 (terminación) a lo sumo $\lfloor n/2\rfloor$ aumentos, luego a lo sumo $\lfloor n/2\rfloor+1$ fases; en cada fase cada vértice se etiqueta una vez y cada contracción quita al menos 2 nodos (los dos Cuadernos de 6.6). Ref.: KV §10.5 (algoritmo de Edmonds y su corrección); LP cap. 9; T cap. 9; Edmonds (1965). Testigo: la propiedad `edmonds(G).size === bruteForce(G)` y `core/recipe/run.test.ts`. *Puente:* la receta, el jardinero mecánico, cada tarjeta y su nivel.

**C11 El costo** — *Intuición:* la carrera contra Bruto; la curva suave y la que se sale de la pantalla. Diagrama `chart` con las carreras de 6.4–6.5 recalculadas con sus mismas familias y semillas (`levels/races.ts`): los mismos datos que vio el jugador. *Formal:* Def. 11.1 modelo de costo (operaciones elementales, el `OperationCounter` del núcleo); Prop. 11.2 costo de la versión didáctica que traza el juego (construye $G/B$ explícitamente: $O(n+m)$ por contracción, $O(n)$ contracciones por fase, $O(n)$ fases; enunciar la cota que de verdad tiene `core/edmonds/solve.ts`, medida en la fase con `npm run bench`); Lema 11.3 (una búsqueda por raíz) si no hay camino $M$-aumentante que empiece en $r$ y $P$ es $M$-aumentante, no hay camino $(M\oplus E(P))$-aumentante que empiece en $r$. Demostración completa: sea $Q$ uno; si no toca $P$ es $M$-aumentante; si no, sea $v$ su primer vértice en $P$; la arista de $Q$ que entra en $v$ no está en $P$, luego no está en $M$; si $v$ es extremo de $P$, $Q[r,v]$ es $M$-aumentante; si no, se sigue $P$ desde $v$ por su arista de $M$ hasta el extremo de ese lado: camino $M$-aumentante desde $r$. Contradicción. Teorema 11.4 la versión compacta (`core/edmonds/fast/solve.ts`, arreglo `base[]`) cuesta $O(n^3)$: $n$ búsquedas (Lema 11.3), cada una $O(m)$ exámenes más $\le n/2$ contracciones de $O(n)$ (ancestro común y rebase) más un aumento $O(n)$. Prop. 11.5 la búsqueda exhaustiva es exponencial: el camino $P_n$ tiene $F_{n+1}$ emparejamientos (recurrencia de Fibonacci) y $K_{2k}$ tiene $(2k-1)!!$ perfectos; Bruto examina al menos uno por emparejamiento. Observación 11.6 (sin demostración: fuera de alcance) Micali–Vazirani $O(\sqrt n\,m)$ (1980) y Gabow–Tarjan; por qué no se abordan. Ref.: KV §10.5 (tiempo de ejecución); T cap. 9 (implementación $O(nm)$); LP cap. 9. Testigo: `core/cost/benchmark.test.ts`, `core/bruteforce/countMatchings.test.ts`. *Puente:* gotas de agua y pasos, Bruto.

**C12 Las piedras (Tutte–Berge, 1958)** — *Intuición:* en un grupo impar alguien duerme a oscuras; a oscuras ≥ grupos impares − piedras; las lunas son las piedras. Diagrama `stones` en 7.3 (la hélice) y 7.4: levantar piedras, la cuenta viva con `oddComponents` y `tutteBergeBound`, botón "levanta las lunas". *Formal:* Def. 12.1 $\operatorname{def}(G)=|V|-2\nu(G)$, $\operatorname{odd}(H)$; Lema 12.2 (cota) para todo $U\subseteq V$, $\operatorname{def}(G)\ge\operatorname{odd}(G-U)-|U|$ (en cada componente impar algún vértice no se empareja dentro; está expuesto o emparejado con $U$; a lo sumo $|U|$ de ellos con $U$); Teorema 12.3 (Tutte–Berge) $\nu(G)=\min_{U\subseteq V}\tfrac12\,(|V|+|U|-\operatorname{odd}(G-U))$. Demostración constructiva con el bosque final: $U=I$ (los interiores son siempre vértices originales, porque los blossoms nacen exteriores); las componentes de $G-U$ son el conjunto de cada pseudonodo exterior (impar por el Lema 9.2, conexo, sin aristas a otro exterior ni a no alcanzados) y las componentes de los no alcanzados (pares: $M$ las empareja perfectamente); $\operatorname{odd}(G-U)-|U| = |O|-|I| = \#\text{raíces} = |V|-2|M| \le \operatorname{def}(G)$, y con el Lema 12.2 hay igualdad y $M$ es máximo. Corolario 12.4 (Tutte, 1947) $G$ tiene emparejamiento perfecto ⇔ $\operatorname{odd}(G-U)\le|U|$ para todo $U$. Observación 12.5 caso bipartito: el mismo bosque da a la vez $U=I$ y la cobertura $I\cup(N\cap A)$ de C5, que coinciden cuando $N=\emptyset$. Ref.: LP cap. 3 (fórmula de Tutte–Berge); KV §10.3; Tutte (1947); Berge, C. R. Acad. Sci. Paris 247 (1958). Testigo: `core/certificates/tutteBerge.test.ts`, `fromForest.test.ts`. *Puente:* piedras, grupos impares, "nadie más puede tener farol, y aquí está la prueba". Nota: Gallai–Edmonds, sin demostración.

**C13 Glosario jardín ↔ matemáticas** — *Intuición:* una línea: "cada cosa que hiciste tiene un nombre". *Formal:* tabla de notación (símbolo, significado, entrada donde se define: $M$, $\nu$, $\tau$, $O$, $I$, $G/B$, $\oplus$, $\operatorname{def}$, $\operatorname{odd}$). *Puente:* la tabla de §3.3 completa, generada desde `glossary.json`, cada fila con enlace a su entrada; las filas de entradas cerradas no se muestran.

**C14 Más allá del jardín** — *Intuición:* los usos reales en palabras del jardín (riñones: "hay jardines donde encender un farol salva una vida", con respeto y brevedad; moléculas; parejas y turnos). Diagrama `play` con el benceno como jardín de 6 brotes en anillo (código de jardín, `core/codes/gardenCode`): dos maneras de encenderlos todos. *Formal:* Modelo 14.1 intercambio cruzado de riñón por parejas: grafo de compatibilidad, un emparejamiento máximo maximiza los trasplantes por pares (no bipartito: Edmonds); Modelo 14.2 estructuras de Kekulé = emparejamientos perfectos del grafo de la molécula (el benceno tiene 2, demostración por enumeración del ciclo $C_6$); Modelo 14.3 asignaciones: bipartito (König, C5) y general; Observación 14.4 (sin demostración: fuera de alcance) emparejamiento de peso máximo (Edmonds 1965b, algoritmo húngaro), ciclos de intercambio largos. *Puente:* nota histórica (Roth, Sönmez y Ünver, *Pairwise kidney exchange*, J. Econ. Theory 125 (2005); Nobel de Economía 2012 a Roth y Shapley; Kekulé, 1865; Edmonds y la noción de "algoritmo bueno" en *Paths, trees, and flowers*) y **la bibliografía completa** del Códex.

---

## Fase 0 — Bus tipado, guardado compartido y reglas de `ui/`

| Archivo | Responsabilidad |
|---|---|
| `services/bus.ts` | Pura: un emisor de eventos tipado por un mapa de eventos (`on`, `off`, `emit`), síncrono, sin dependencias |
| `services/busEvents.ts` | El mapa de eventos entre `game/` y `ui/`: `book.open` (`{ book: 'codex' \| 'notebook', entry? }`), `overlay.changed` (`{ open }`), `sound` (`'bookOpen' \| 'bookFlip' \| 'bookClose' \| 'click'`), `epilogue.open`, `teacher.feed`, `capabilities` (`{ sandbox }`); solo tipos de `@core` |
| `services/saveStore.ts` | Pura salvo el almacén inyectado: el guardado vivo compartido por el juego y los libros (`get`, `update(fn)` que escribe con `writeSave`, `subscribe`), para que haya un solo escritor |
| `game/scenes/context.ts`, `HubScene.ts`, `LevelScene.ts`, `CounterexampleScene.ts` | `refactor: keep the save in a shared store`: `context.save` pasa a `context.saves` (el store); sin cambio de comportamiento |
| `ui/shell.ts` | Ligera: el contenedor DOM de los libros sobre el lienzo, escucha `book.open` y `epilogue.open` y carga con `import()` el trozo pesado la primera vez; emite `overlay.changed` |
| `main.ts` | Crea el bus y el store, los pasa al contexto del juego y a `mountShell`; con `overlay.changed` desactiva la entrada de Phaser (puntero y teclado) mientras un libro está abierto; con `sound` toca el sonido en el bus de audio; fija la variable CSS `--zoom` al zoom entero en cada redimensionado |
| `eslint.config.js`, `tests/lint-rules.test.ts` | `src/ui/model/**` es pura: sin `document`, `window`, `localStorage`, `katex` ni `marked`; solo `src/ui/math/**` puede importar `katex` y `marked`, y `game/`, `services/`, `levels/` y `core/` nunca; los tests de `tests/` sí pueden importarlos; `ui/shell.ts` no importa estáticamente `ui/{codex,math,notebook,teacher,epilogue,diagram}` (solo con `import()`) |
| `vitest.config.ts` | Cobertura también de `src/ui/model/**` |

Cada cambio de ESLint va en su commit con su test en `tests/lint-rules.test.ts` (`chore: …` o `test: …`), como en el Plan 06.

**Tests clave:** el bus entrega a cada oyente en orden de suscripción y `off` lo quita; un oyente que lanza no impide a los demás (se registra y sigue); el store escribe al actualizar y avisa a los suscriptores, y si el almacén se niega la partida sigue en memoria; lint: `ui/model` con `document.body` falla, `game/` importando `katex` falla, `ui/shell.ts` con `import '…/codex/CodexBook'` estático falla y con `import()` no.

---

## Fase 1 — Desbloqueo del Códex, enlaces del Cuaderno y guardado v4

| Archivo | Responsabilidad |
|---|---|
| `levels/codex.ts` | Pura: ids `C1…C14`, pestañas `intuition \| formal \| bridge`, y el esquema zod de un desbloqueo: `"C3"` (todas las pestañas) o `{ entry, tabs }` |
| `levels/schema.ts` | `unlocks.codex` acepta las dos formas |
| `levels/notebook.ts` | Cada pregunta del Cuaderno lleva `codex: "C2"`, la entrada que la traduce |
| `levels/data/…` | 0.5 → `{ "entry": "C1", "tabs": ["intuition"] }`; 1.8 añade C13; 7.5 añade C14; enlaces del Cuaderno: 1.5 → C2, 2.4 → C3, 3.3 → C4, 3.8 → C5, 4.2 → C6, 4.7 → C7, 4.10 → C8, 4.11 → C8, 5.3 → C9, 6.6 (las dos) → C10, 7.3 → C12 |
| `levels/integrity.ts`, `tools/check-levels.ts` | Toda entrada se abre completa en algún nivel del catálogo (sin borradores); ninguna se abre parcial después de completa; el enlace de cada pregunta apunta a una entrada que se abre en ese nivel o después (nunca "lee lo que ya sabías" antes de tiempo, pero sí "lo leerás") |
| `services/codexProgress.ts` | Pura, como `unlockedLevels`: de los niveles completados y sus `unlocks.codex`, qué pestañas de qué entradas están abiertas; en modo profesor, todas; cuáles son nuevas (abiertas y no leídas) |
| `services/save.ts` | Versión 4: `codexRead: string[]` (entradas ya abiertas por el jugador, para el sello "nuevo"); la v3 migra con `codexRead: []` |
| `game/scenes/LevelScene.ts`, `content/es/strings.json`, `content/keys.ts` | Al ganar un nivel que abre páginas, un aviso: "Se abrió una página del Códex" (`codex.unlocked`) |

Lo que está abierto **se deriva** de los niveles completados, no se guarda aparte: así un guardado antiguo abre exactamente lo que ya ganó y nunca se desincroniza con los JSON. Lo único nuevo que se guarda es lo leído.

**Tests clave:** sin nada completado no hay entradas; con 0.5, C1 solo con Intuición; con 1.8, C1 completa, C2 y C13; con todo, las 14 con sus tres pestañas; en modo profesor, las 14 sin completar nada; una entrada leída deja de ser nueva; un guardado v3 migra sin perder niveles, Cuaderno ni tarjetas; integridad: el catálogo real abre las 14 entradas completas y cada pregunta del Cuaderno tiene enlace válido; 4.11, 5.5, 6.6 y 7.4 siguen declarando lo que sus tests ya comprueban.

---

## Fase 2 — KaTeX, marked y el presupuesto con trozo diferido

| Archivo | Responsabilidad |
|---|---|
| `package.json`, `package-lock.json` | `chore: add katex for the formulas of the Codex` (versión exacta; hoy 0.19.0, publicada el 2026-10-01). Trae sus propios tipos |
| `package.json`, `package-lock.json` | `chore: add marked for the Markdown of the Codex` (versión exacta con al menos dos semanas; hoy 18.0.14, porque 18.1.x tiene menos de dos semanas). Se vuelve a comprobar con `npm view` al ejecutar la fase |
| `ui/model/mathSpans.ts` | Pura: parte un texto Markdown en trozos de texto, `$…$` y `$$…$$`, respetando `\$` y los bloques de código; la usan la extensión de marked y los tests |
| `ui/math/renderMath.ts` | `katex.renderToString` con `throwOnError: true` y `strict: 'error'` en tests, y en el navegador con `throwOnError: false` (un fallo se ve en rojo, nunca rompe el libro) |
| `ui/math/markdown.ts` | marked con la extensión de matemáticas y renderizadores propios para los bloques `diagram`, `bridge` y `glossary` (dejan un hueco con `data-` que el libro rellena) y para los enlaces `#C8` |
| `ui/math/katex.css.ts` | Importa la hoja de KaTeX solo desde el trozo diferido |
| `vite.config.ts` | `build.manifest: true`, para saber qué trozos son iniciales y cuáles diferidos |
| `tools/assets/budget.ts`, `tools/check-budget.ts`, `tests/budget.test.ts` | El script inicial (`js`) es la entrada y sus importaciones estáticas; una parte nueva, `codex`, suma los trozos diferidos (JS y CSS) y las fuentes `.woff2` de KaTeX; las `.woff` y `.ttf` que Vite copia porque las cita la hoja no se cuentan (ningún navegador moderno las descarga) pero se listan |
| `CREDITS.md` | KaTeX (MIT) y sus fuentes (SIL OFL 1.1), marked (MIT): qué se usa y para qué |

**Presupuesto:** `js` sigue en 1,8 MB y ahora mide solo la carga inicial; `codex` ≤ 1,2 MB (estimado: KaTeX ~280 KB, marked ~40 KB, hoja ~25 KB, `.woff2` ~300 KB, textos ~200 KB, UI de libros y diagramas ~100 KB). `initial` = `js` inicial + grupo `boot`, sin el trozo diferido. Si `codex` se pasa, primero se quita lo que no se use de KaTeX (no se cargan `contrib/`), después se sube el límite con una línea de justificación en `budget.ts`.

**Tests clave:** `mathSpans` encuentra `$a$`, `$$b$$`, ignora `\$` y lo que hay en código; una fórmula válida da HTML de KaTeX y una inválida lanza en modo test; el informe del presupuesto con un manifiesto de Vite sintético separa inicial y diferido, cuenta las importaciones estáticas transitivas y no cuenta dos veces un trozo compartido; tras `npm run build`, `npm run budget` en verde y el script de entrada no contiene `katex` (comprobado por el propio informe: el módulo de KaTeX aparece solo en un trozo diferido).

---

## Fase 3 — El libro del Códex (DOM) y el formato de las entradas

| Archivo | Responsabilidad |
|---|---|
| `content/es/codex/C01.md … C14.md` | Esqueletos con el formato de 1.1: título del jardín, las tres pestañas con una línea provisional, el título formal y la línea de referencias. El texto real llega en las fases 7–10 |
| `ui/model/codexEntry.ts` | Pura: parte un archivo en `{ id, gardenTitle, formalTitle, tabs }` por los marcadores; errores con nombre (falta un marcador, sobra uno, pestañas desordenadas) |
| `ui/model/codexStructure.ts` | Pura: lista los resultados numerados de la pestaña Formal (tipo, número, nombre) y si cada uno lleva `*Demostración.*` cerrada con `$\blacksquare$`; los enlaces internos; los bloques de diagrama |
| `ui/model/codexIndex.ts` | Pura: el índice que ve el jugador: entradas abiertas con su título (el formal solo si su pestaña Formal está abierta), las cerradas como "página cerrada" con su número y nada más, y las nuevas con sello |
| `ui/codex/entries.ts` | `import.meta.glob('@content/es/codex/*.md', { query: '?raw', eager: true })` dentro del trozo diferido; elige el idioma |
| `ui/overlay.ts` | El marco común de los libros: capa sobre el lienzo, foco atrapado dentro, Esc cierra, `overlay.changed` al abrir y cerrar, `aria-modal` |
| `ui/codex/CodexBook.ts` | El libro: índice a la izquierda, página a la derecha, las tres pestañas (solo las abiertas), flechas y teclado (← → entre entradas, 1 2 3 entre pestañas), sonido de libro por el bus, marca la entrada como leída en el store |
| `ui/codex/EntryPage.ts` | Pinta una pestaña: Markdown → HTML (`ui/math/markdown.ts`), rellena los huecos de diagrama y de tabla; un enlace `#C8` cambia de página si la entrada está abierta y, si no, dice "esta página aún está cerrada" |
| `ui/codex/codex.css` | Libro de madera con `border-image` 9-slice de `public/assets/` (el mismo panel del Plan 06), papel claro, fuente monogram a múltiplos enteros de `--zoom`, fórmulas en KaTeX; paso de página con transición CSS |
| `game/scenes/HubScene.ts`, `game/picture/hubLayout.ts` | Dos carteles nuevos en el hub: Códex y Cuaderno (el del Códex aparece cuando hay alguna entrada abierta, como el resto del hub que crece) |
| `game/view/HudView.ts`, `game/picture/hud.ts` | Botón de libro en el HUD del nivel (icono `icon.book`), que emite `book.open`; en niveles sin entradas abiertas no aparece |
| `content/es/strings.json`, `content/keys.ts` | `codex.title`, `codex.tab.intuition|formal|bridge`, `codex.closedPage`, `codex.new`, `codex.next`, `codex.previous`, `codex.close`, `hub.codex`, `hub.notebook`, `hud.book` |
| `tests/codex.test.ts` | Integridad del contenido (abajo) |

**Tests clave (`tests/codex.test.ts`, sobre los archivos reales):**
- Existen exactamente C01–C14, cada uno con su `entry` correcto, título del jardín, título formal y las tres pestañas no vacías.
- **Cada expresión matemática de cada entrada se renderiza** con `katex.renderToString(…, { throwOnError: true, strict: 'error' })`.
- Cada bloque `diagram` cumple su esquema y lo que nombra existe: el nivel en el catálogo, la tarjeta en `cards.json`, el código de jardín se decodifica; cada enlace `#Cn` y `#Cn-T…` apunta a una entrada y a un resultado que existen.
- **Vocabulario por pestaña:** el título del jardín y la pestaña Intuición no contienen las palabras de `MATHEMATICS` (el mismo patrón de `tests/content.test.ts`, movido a `tests/support/vocabulary.ts`); en Formal y Puente se permiten, y se comprueba que C1–C12 los usan (la Formal de cada una nombra su objeto con el vocabulario matemático).
- Estructura de rigor: en C1–C12, cada Lema, Proposición, Teorema y Corolario tiene `*Demostración.*` cerrada con $\blacksquare$ (salvo los marcados fuera de alcance, solo admitidos en C11 y C14); la numeración es consecutiva; cada pestaña Formal termina en `### Referencias` con al menos una de LP, KV o T.
- Ningún archivo pasa de 1000 líneas (`.md` y `.css` incluidos).
- `codexIndex` no enseña el título formal de C1 con solo 0.5 completado.

Con los esqueletos de esta fase, los tests de estructura de rigor se activan por entrada (`RIGOR_READY`, una lista en el test) a medida que las fases 7–10 escriben cada una; al final del plan la lista son las 14 y desaparece.

---

## Fase 4 — El jardín pequeño: diagramas `play` y `replay`

El diagrama interactivo es "el mismo motor, en pequeño" (GDD §5.6): **las reglas, la búsqueda y la traza son las del núcleo**; lo que cambia es quién pinta. `ui/` no puede usar Phaser ni `game/picture/`, así que pinta en SVG con una geometría pura propia y la paleta del juego copiada en tokens CSS (un test cruzado comprueba que coinciden con `PALETTE`). Así no hay una segunda instancia de Phaser dentro del libro ni un agujero en el DOM que el lienzo tenga que rellenar.

| Archivo | Responsabilidad |
|---|---|
| `ui/model/diagramSpec.ts` | Pura: esquema zod de un bloque `diagram`: `kind`, el jardín (`level`, `card` o `code`), las jugadas permitidas, el origen de la traza (`solution` del nivel, `edmonds`, `autoSearch`, `recipe`), el título y la línea de ayuda (claves de `strings.json`) |
| `ui/model/diagramGarden.ts` | Pura: del nivel, la tarjeta o el código, el `GardenState` inicial (con `levels/playStart.ts`, `levels/cards/demo.ts` y `core/codes/gardenCode.ts`) |
| `ui/model/miniGarden.ts` | Pura: la imagen de un estado en una caja: posiciones escaladas desde el área del jardín, brote a oscuras o con farol, enredadera apagada o encendida, marcas sol/luna, flores plegadas (miembros y base), piedras, espantapájaros, resaltados |
| `ui/model/diagramTouch.ts` | Pura: qué `Action` sale de un toque según las jugadas permitidas y lo ya tocado: dos brotes → juntar o pasar el farol; una enredadera encendida → apagar; una sucesión de brotes y "aplicar" → cadena; la respuesta se pide a `applyAction`, y un rechazo devuelve su `reason` para el texto amable |
| `ui/model/diagramReplay.ts` | Pura: de un origen de traza, la lista de estados (con `stateAt` o con las jugadas de la solución por `applyAction`) y el paso actual |
| `ui/diagram/GardenSvg.ts` | Pinta un `miniGarden` en SVG (círculos, punteado, farol, insignias con forma distinta además de color, pétalos) |
| `ui/diagram/PlayDiagram.ts` | Jardín tocable con deshacer, reiniciar y el contador de faroles |
| `ui/diagram/ReplayDiagram.ts` | Jardín con el sol como deslizador (`<input type="range">`), botones paso a paso y el texto del paso actual |
| `ui/diagram/diagram.css` | Tokens de color, tamaños |
| `tests/diagramPalette.test.ts` | Los tokens de `diagram.css` son exactamente los colores de `PALETTE` que usan (cruzado: `tests/` puede leer los dos) |

**Tests clave:** todos los bloques `diagram` de las 14 entradas construyen su estado inicial; en el diagrama de C1 (1.1), juntar B–C deja 1 farol y ningún toque más lo acepta el núcleo salvo apagar, y A–B + C–D da 2; cada `Action` que produce `diagramTouch` es la misma que el juego mandaría por ese gesto (comprobado contra `applyAction`, nunca reimplementado); la geometría cabe en la caja para todos los niveles del catálogo; el `replay` de `edmonds` en 4.6 termina en el estado de `stateAt(…, trace.length)` y tiene un paso `contract` con 5 pétalos.

---

## Fase 5 — Diagramas especiales: estanque, espantapájaros, corte, piedras, receta y gráfica

| Archivo | Responsabilidad |
|---|---|
| `ui/model/pondPicture.ts`, `ui/diagram/PondDiagram.ts` | C3: los faroles propios y los del reflejo (`mirror` del nivel), superponer, separar en hilos y bucles (`symmetricDifference`), contar cada pieza |
| `ui/model/coverPicture.ts`, `ui/diagram/CoverDiagram.ts` | C5: colocar y quitar espantapájaros (`placeScarecrow` por `applyAction`), "en las lunas" con el bosque de `autoSearch`, la cuenta "vigilados / faroles" con `isVertexCover` |
| `ui/model/cutPicture.ts`, `ui/diagram/CutDiagram.ts` | C8: el jardín abierto y el plegado lado a lado; el jugador traza una cadena por toques; `cutAtFlower` da el trozo que llega a la flor, que se resalta en los dos |
| `ui/model/stonesPicture.ts`, `ui/diagram/StonesDiagram.ts` | C12: levantar piedras (`liftStone`), los grupos con su contorno, la cuenta "grupos impares − piedras ≤ a oscuras" con `tutteBergeBound`, "levanta las lunas" con `stonesFromForest` |
| `ui/model/recipePicture.ts`, `ui/diagram/RecipeDiagram.ts` | C10: la ejecución de `core/recipe/run` paso a paso con la tarjeta activa resaltada (textos de las tarjetas ya en `strings.json`) |
| `ui/model/chartPicture.ts`, `ui/diagram/ChartDiagram.ts` | C11: los puntos de las carreras de 6.4–6.5 (`raceOf` de `levels/races.ts`, mismas semillas), ejes y la curva de Bruto con "dormido" en vez de su presupuesto, como `game/picture/costChart.ts` (no se importa: se reescribe la geometría pura, que es poca, y un test cruzado compara los puntos con los de `costChart`) |
| `ui/model/layersPicture.ts` | C9: tocar una flor en el `replay` la resalta por dentro (sus miembros y su flor interior), sin cambiar el estado |

Cada diagrama solo admite las jugadas que su bloque declara; el resto de toques no hacen nada.

**Tests clave:** en 2.1 la superposición da un hilo que gana por uno y un bucle empatado; en 3.8 "en las lunas" da una cobertura del tamaño del máximo; en 4.11, para cada cadena aumentante del jardín abierto (enumeradas en el test), el trozo cortado es una cadena en el plegado; en 7.3, levantar C da 3 − 1 = 2 y "levanta las lunas" en 7.4 da un certificado válido; los puntos de la gráfica son los de `costChart` para las mismas carreras; el `recipe` de 6.2 resalta en cada paso una tarjeta de la receta correcta.

---

## Fase 6 — El Cuaderno como libro

| Archivo | Responsabilidad |
|---|---|
| `ui/model/notebookPages.ts` | Pura: de los niveles de `save.notebook`, una página por pregunta escrita, en el orden en que se escribieron: el comienzo del enunciado y la terminación correcta (ids de línea de `lines.json`), el nivel y la entrada que la traduce; el enlace solo se ofrece si esa entrada está abierta, y si no, "se traducirá más adelante" |
| `ui/notebook/NotebookBook.ts` | El libro: una página por enunciado con la letra del jardín; el enlace abre el Códex en esa entrada, pestaña Formal si está abierta (si no, Intuición) |
| `ui/notebook/notebook.css` | Papel de cuaderno, monogram |
| `game/scenes/HubScene.ts`, HUD | El cartel y el botón de libro abren el Cuaderno o el Códex (el libro tiene las dos cintas) |
| `content/es/strings.json`, `content/keys.ts` | `notebook.book.title`, `notebook.book.empty`, `notebook.book.translate`, `notebook.book.later` |

6.6 escribe dos enunciados: el guardado sigue anotando el nivel una vez (`recordNotebook`), y el libro muestra las dos preguntas de un nivel anotado.

**Tests clave:** sin nada escrito, la página vacía; con 1.5 escrito y 1.8 sin ganar, el enunciado de 1.5 sin enlace ("más adelante"); con 1.8 ganado, enlace a C2; con 6.6, dos páginas; el texto mostrado es exactamente el de las líneas correctas de cada pregunta; ninguna página usa el vocabulario matemático.

---

## Fases 7–10 — El texto de las 14 entradas

Cada fase escribe, para sus entradas, las tres pestañas completas según la sección 1.3, quita la entrada de la lista `RIGOR_READY` pendiente del test (fase 3) y añade sus filas a `glossary.json`. El texto se escribe **antes** en la pestaña Formal (es lo que más cuesta y lo que el profesor revisa), después la Intuición (que no puede adelantar ni una palabra matemática) y al final el Puente.

**Lista de rigor de cada demostración.** Las casillas comprobadas se anotan en un comentario `<!-- rigor: 1 2 3 4 5 6 7 8 -->` al final de la pestaña Formal, que el test exige:
1. Hipótesis explícitas (simple, finito, $M$ emparejamiento, blossom **con tallo**…); ningún "obviamente".
2. Cada paso cita la definición o el resultado anterior por su número (dentro de la entrada o `#Cn-…`).
3. Casos límite tratados: camino de longitud 1, tallo de longitud 0, base expuesta, triángulo ($k=1$), $B$ extremo del camino, $U=\emptyset$, grafo sin aristas, componente aislada.
4. Notación igual a la de C13 (los mismos símbolos en todas las entradas).
5. Cotejada línea a línea con la referencia citada; la línea de referencia nombra capítulo, sección y número de resultado de la edición usada.
6. Un ejemplo trabajado sobre el jardín del diagrama de Intuición (los nombres de los brotes del nivel).
7. Nombra su testigo del núcleo, y el test existe.
8. Todas sus fórmulas renderizan (lo comprueba la fase 3).

### Fase 7 — C1–C4
Emparejamiento, la cadena, Berge, la búsqueda. Atención en C3 al paso "los extremos están expuestos en $M$" (sección 1.3) y al Lema 3.1, que se demuestra, no se da por sabido; en C4 los invariantes del Lema 4.2 se enuncian como en `tests/support/forestInvariants.ts`.

### Fase 8 — C5–C8
König con la cobertura construida desde el bosque (todos los tipos de arista, incluido no alcanzado–no alcanzado); bipartición ⇔ sin ciclos impares con el lema del paseo cerrado; la flor y la contracción; el lema de la flor con sus dos direcciones, la hipótesis del tallo y el giro del tallo como lema propio. Es la fase más delicada: C8 se revisa entero contra KV §10.5 antes de seguir.

### Fase 9 — C9–C12
Anidadas por inducción; la receta con su tabla tarjeta ↔ línea y el lema de conteo 10.3; el costo con la cota real de la versión didáctica (medida con `npm run bench` y escrita con su modelo), el Lema 11.3 de una búsqueda por raíz y el $O(n^3)$ de la versión compacta; Tutte–Berge con la cota, la igualdad desde el bosque y los corolarios.

### Fase 10 — C13–C14 y el glosario
`content/es/codex/glossary.json` con las filas de §3.3 (`garden`, `math` en KaTeX si hace falta, `entry`), validado con zod en `ui/model/glossary.ts` (pura: filas visibles según las entradas abiertas, tabla del Puente de cada entrada). C13 completo, C14 con los tres modelos y la bibliografía completa del Códex.

**Tests clave de las fases 7–10:** los de la fase 3 sobre las entradas ya escritas (sin lista pendiente al final de la fase 10); cada fila del glosario nombra una entrada existente y cada entrada C1–C12 tiene al menos una fila; la columna del jardín del glosario no usa el vocabulario matemático; cada testigo nombrado en las entradas es un archivo de test existente; el comentario `rigor` de cada pestaña Formal lista las 8 casillas.

---

## Fase 11 — El epílogo

| Archivo | Responsabilidad |
|---|---|
| `ui/model/epilogue.ts` | Pura: qué ofrece la pantalla: leer C14, volver al jardín, y el modo libre **solo si** el juego anunció `capabilities.sandbox = true` (hoy nadie lo anuncia: el botón no existe en la página; el Plan 08 lo enciende al registrar su escena) |
| `ui/epilogue/EpilogueScreen.ts`, `epilogue.css` | Pantalla sobria, sin puzles: sobre el hub al amanecer (el lienzo detrás, sin tocar), un papel con el título, los tres usos reales en palabras del jardín, el cierre del autor y los botones |
| `game/systems/afterVictory.ts`, `game/scenes/LevelScene.ts` | Pura: a dónde lleva una victoria (nivel siguiente, hub o epílogo); al ganar 7.5, al epílogo (`epilogue.open`) en vez de al hub |
| `game/scenes/HubScene.ts`, `game/picture/hubLayout.ts` | Tras 7.5, un cartel "Más allá del jardín" reabre el epílogo |
| `content/es/strings.json`, `content/keys.ts` | `epilogue.title`, `epilogue.kidneys`, `epilogue.molecules`, `epilogue.pairs`, `epilogue.readCodex`, `epilogue.sandbox`, `epilogue.back`, y `epilogue.author.closing` |

**El texto de cierre** (`epilogue.author.closing`) lo redacta esta fase, por encargo del autor: breve, cálido y sobrio, en primera persona del autor, sin datos biográficos inventados; agradece al jugador, recuerda que lo que encendió en el jardín es una demostración de verdad y lo invita al Códex y a seguir jugando. Los usos reales van en palabras del jardín ("los dobles enlaces de una molécula se reparten como faroles: cada brote con uno"); su versión matemática vive en C14.

**Tests clave:** sin `capabilities.sandbox`, el epílogo no ofrece el modo libre; con él, sí; ganar 7.5 abre el epílogo y C14 está abierta; ningún texto del epílogo usa el vocabulario matemático; el texto de cierre existe, no está vacío y no usa el vocabulario matemático.

---

## Fase 12 — Notación de la traza (pura)

| Archivo | Responsabilidad |
|---|---|
| `content/es/notation.json` | Plantillas TeX por tipo de `TraceEvent` (todos: los del algoritmo y las jugadas del jugador), con huecos `{v}`, `{parent}`, `{root}`, `{path}`, `{cycle}`, `{size}`…; texto en `\text{…}` en español. Exento de la regla del vocabulario, como la pestaña Formal |
| `ui/model/texName.ts` | Pura: el nombre de un brote en TeX, escapado (`\`, `{`, `}`, `_`, `^`, `#`, `%`, `&`, `$`, `~`), y el de una flor ($B_3$) |
| `ui/model/traceNotation.ts` | Pura: un evento → una línea TeX con su número de paso: $r\in O$ (raíz), $v\in O,\ p(v)=u$, $v\in I$, examen $xy$, ciclo impar, $B_i=(b;\,\dots)$, $M\leftarrow M\oplus E(P)$, $\lvert M\rvert=k$… y las jugadas del jugador (juntar, apagar, inspeccionar, piedra…) |
| `ui/model/teacherTrace.ts` | Pura: el modelo del panel: las dos listas ("tu día", de la historia del nivel; "Edmonds desde aquí", de `edmonds(graph, mate)`), el paso elegido y su `stateAt`, y al final el certificado: $U=I$, $\operatorname{odd}(G-U)$, $\lvert V\rvert$, la cuenta $\tfrac12(\lvert V\rvert+\lvert U\rvert-\operatorname{odd}(G-U))=\lvert M\rvert$ con `stonesFromForest` y `oddComponents` |
| `game/systems/teacherFeed.ts` | Pura: de la sesión del nivel, lo que el panel necesita (grafo completo, nombres, faroles, eventos del día), solo en modo profesor |

**Tests clave:** cada tipo de `TraceEvent` tiene plantilla (con `satisfies Record<TraceEventType, …>` como `content/keys.ts`); **para cada nivel del catálogo**, la traza completa de `edmonds` desde sus faroles iniciales y la de su solución de referencia, formateadas, se renderizan con KaTeX `throwOnError`; un nombre con `_` o `#` se escapa y renderiza; el certificado del panel cuadra con `|M|` final en todos los niveles.

---

## Fase 13 — El panel del profesor y los saltos

| Archivo | Responsabilidad |
|---|---|
| `ui/teacher/TeacherPanel.ts`, `teacher.css` | Panel DOM a la derecha sobre el lienzo, plegable (cerrado al empezar, para no estropear una grabación), con las dos listas en KaTeX, la línea elegida resaltada y, debajo, el jardín pequeño de la fase 4 en `stateAt` de ese paso; no captura los toques del jardín de fuera |
| `game/scenes/level/levelEffects.ts` (o un archivo nuevo `teacherBridge.ts`) | En modo profesor, emite `teacher.feed` tras cada jugada (la lógica es instantánea; el panel la alcanza) |
| `game/view/HudView.ts`, `game/picture/hud.ts` | Botón "Traza" en el HUD, solo en modo profesor; tecla `T` |
| `services/startLevel.ts`, `services/teacherJump.ts` | `?teacher&codex=C8` abre el Códex en esa entrada al arrancar; el nivel anterior y el siguiente del catálogo (borradores incluidos) para saltar con `RePág` / `AvPág` |
| `game/scenes/LevelScene.ts` | En modo profesor, `RePág` / `AvPág` saltan de nivel |
| `game/scenes/HubScene.ts` | En modo profesor, un rótulo "Modo profesor" y todos los carteles (Códex, Cuaderno, epílogo) presentes |
| `content/es/strings.json`, `content/keys.ts` | `teacher.panel`, `teacher.day`, `teacher.edmonds`, `teacher.certificate`, `teacher.badge`, `hud.trace` |

Lo que ya existe y no se rehace: el modo profesor ya abre todos los niveles en el hub (`unlockedLevels`) y salta a uno con `?teacher&level=4.6` (`requestedLevel`). El Códex abierto entero sale de `codexProgress` (fase 1). El panel en niebla enseña todas las enredaderas: es para el profesor.

**Tests clave:** `?teacher&codex=C8` da C8 y sin `teacher` nada; `?teacher&codex=C99` se ignora; el siguiente del último nivel es ninguno y el anterior del primero, ninguno; fuera del modo profesor el juego no emite `teacher.feed` (el feed es `null`); el feed tras una cadena en 1.3 lleva los faroles nuevos y un evento `augment`.

---

## Fase 14 — Revisión de rigor, presupuesto y lista del autor

| Archivo | Responsabilidad |
|---|---|
| `docs/codex-review.md` | La hoja para la prueba de rigor del GDD §10: por entrada, cada resultado con su referencia, una casilla por paso de la demostración y espacio para las notas del revisor |
| `tools/assets/budget.ts` | Límites definitivos con lo medido |
| `README.md` | El Códex, el Cuaderno, el epílogo y `?teacher&level=…&codex=…` |

Revisión en pantalla de la sesión principal (hitos): leer cada entrada en el navegador a ×2 y ×3 (pestañas, fórmulas, diagramas tocables, paso de página); jugar de 0.1 a 1.8 y ver aparecer C1 sin título formal y luego completa; abrir el Cuaderno tras 2.4 y saltar a C3; ganar 7.5 y ver el epílogo sin botón de modo libre; abrir `?teacher&level=4.6` y recorrer el panel.

---

## Orden y dependencias

```
F0 → F1 → F2 → F3 → F4 → F5 → F6 → F7 → F8 → F9 → F10 → F11 → F12 → F13 → F14
```

Una fase a la vez, siempre. F1 necesita el bus y el store de F0; F3 necesita F1 (qué está abierto) y F2 (Markdown y KaTeX); F4–F5 rellenan los huecos de diagrama que deja F3; F6 enlaza con el libro de F3; F7–F10 necesitan los tests de estructura de F3 y los diagramas de F4–F5; F11 necesita C14 (F10); F12 usa `ui/model` y KaTeX; F13 usa F12 y el jardín pequeño de F4; F14 cierra.

**Hito G1 (F0–F6):** los libros funcionan con esqueletos. **Hito G2 (F7–F10):** el Códex escrito y con cada demostración revisada línea a línea por la sesión principal contra las referencias. **Hito G3 (F11–F14):** epílogo, modo profesor y prueba de rigor. Tras la revisión en pantalla y la de rigor: merge `develop → main` y tag `v0.7.0-codex`.

---

## Decisiones

- **Diagramas en SVG desde `ui/`, con el núcleo como motor.** Una segunda instancia de Phaser en el libro duplicaría memoria y escalado, y pintar con el lienzo del juego bajo un hueco del DOM pelearía con el zoom entero. "El mismo motor" son las reglas y la traza; las piezas del SVG son pocas y su paleta se comprueba contra la del juego.
- **Lo abierto se deriva, lo leído se guarda.** Ninguna migración puede abrir de más o de menos.
- **Las matemáticas del Markdown con una extensión propia**, pura y testeada, no con un paquete más.
- **Monogram también en los libros**, a múltiplos enteros del zoom; las fórmulas, en las fuentes de KaTeX.
- **El texto de la notación del profesor está en `content/es/notation.json`**, no en `strings.json`, para que la regla del vocabulario de `strings.json` siga sin excepciones.

## Cambios pequeños que el GDD necesitaría (no se editan aquí)

- §8 C2 dice "la brigada de 1.2", pero la brigada es 1.3 (1.2 es "Cascada"). El plan usa 1.3.
- El epílogo (§7) escribe "los dobles enlaces de una molécula forman un emparejamiento perfecto": fuera del Códex eso rompe el principio 2. El epílogo lo dice con palabras del jardín y la frase matemática va a C14.
- §8 no dice cuándo se abre C13: el plan lo abre en 1.8 y lo hace crecer.
- §8 C11 no menciona el lema de "una búsqueda por raíz", que la versión compacta del núcleo usa para su $O(n^3)$: se añade como Lema 11.3. Y la cota de la versión didáctica se escribe la que mide el código, no "O(n²·m)" a ciegas.
- §8 C8 enuncia "M es máximo en G ⇔ M/B es máximo en G/B" sin la hipótesis del tallo: el plan la hace explícita.
- §5.6 dice "desde el menú": aquí es el botón de libro del HUD.

## Riesgos y cómo se mitigan

| Riesgo | Mitigación |
|---|---|
| KaTeX dispara el presupuesto inicial (hoy quedan ~150 KB) | Trozo diferido obligatorio; el presupuesto distingue inicial y diferido y lo comprueba en cada fase que empaqueta |
| Un error en una demostración | Lista de rigor de 8 casillas, referencia citada por sección, testigo del núcleo, revisión línea a línea por hito en la sesión principal (F14 deja además la hoja para un compañero, opcional) |
| El vocabulario matemático se cuela en la Intuición o en el epílogo | Test por pestaña con el mismo patrón que `strings.json` y `lines.json` |
| Los diagramas acaban reimplementando reglas | Todo toque pasa por `applyAction`; los tests comparan con el núcleo; ESLint impide a `ui/` importar `game/` |
| Libro abierto y juego recibiendo toques o teclas a la vez | `overlay.changed` apaga la entrada de Phaser; foco atrapado en el libro; Esc lo cierra |
| El zoom entero y el DOM no casan | Variable `--zoom` desde `main.ts`; tamaños de fuente y bordes en múltiplos de ella |
| Las fuentes de KaTeX no son CC0 | Son SIL OFL 1.1 de una dependencia del stack, no arte: se acreditan en `CREDITS.md` (ver preguntas) |
| Un `.md` largo pasa de 1000 líneas | Test de longitud; una entrada que crezca se parte en anexos `C11a.md` antes de llegar |

## Preguntas abiertas (con el valor por defecto recomendado)

1. **¿Cuándo se abre C13?** Por defecto: en 1.8, mostrando solo las filas de entradas ya abiertas; completo tras 7.4. Alternativa: entero en 7.5.
2. **¿C1 parcial en 0.5 con la forma `{ entry, tabs }` en el JSON?** Por defecto sí; es la única entrada parcial que pide el GDD.
3. **¿Qué ve el jugador de una entrada cerrada?** Por defecto solo "página cerrada" y su número, sin título: los títulos formales son vocabulario que aún no se ha ganado.
4. **¿Fuente del texto largo?** Por defecto monogram a 2× del zoom en todas las pestañas, fórmulas en KaTeX. Si la Formal cansa al leer, se probaría un tamaño mayor antes que otra fuente.
5. **¿Valen las fuentes de KaTeX (SIL OFL 1.1)?** Por defecto sí: KaTeX está en el stack y la regla CC0 es para arte, música y sonido; se acreditan.
6. **¿Diagrama de C2 sobre 1.3 (brigada) en vez de 1.2?** Por defecto 1.3; anotado para el GDD.
7. **¿Qué traza muestra el panel del profesor?** Por defecto las dos: "tu día" y "Edmonds desde aquí" (desde los faroles actuales), con el certificado final; en niebla, todo a la vista.
8. **¿Dónde va el panel?** Por defecto a la derecha, sobre el lienzo, plegable y cerrado al empezar.
9. **¿El texto de cierre del autor?** Decidido por el autor: lo redacta la fase 11, sin marcador pendiente.
10. **¿Quién redacta la Formal?** Decidido por el autor: las fases 7–10 la redactan según la sección 1.3 y la sesión principal revisa cada demostración línea a línea al cerrar cada fase; la hoja de F14 queda para un compañero si se quiere.
11. **¿Versiones?** Por defecto katex 0.19.0 y marked 18.0.14, exactas; se revisan con `npm view` al ejecutar F2 (con al menos dos semanas desde su publicación).
12. **¿El Cuaderno distingue las dos preguntas de 6.6 en el guardado?** Por defecto no: el nivel anotado muestra sus dos enunciados (las dos se contestan antes de ganar).
