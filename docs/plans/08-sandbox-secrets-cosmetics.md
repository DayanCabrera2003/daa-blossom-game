# Plan 08 — El modo libre, las flores secretas y los cosméticos del hub

> Alcance: lo que queda del GDD §11 punto 10. El **modo libre** (GDD §5.7): diseñar un jardín (brotes y enredaderas a mano, o generado con `core/generators`), jugarlo con las acciones ya desbloqueadas (todas en modo profesor), pedir al jardinero mecánico que lo resuelva con el sol como deslizador, ver el bosque, las flores y el certificado final (piedras de Tutte–Berge; espantapájaros de König si es de abejas y flores), y exportar e importar un código de jardín corto y el mismo JSON de los niveles. Las **flores secretas** (GDD §5.10, §7.9): una por capítulo del Prado al Consejo, escondidas en el hub, abiertas por estrellas, opcionales y sin enseñar nada nuevo, cada una con integridad completa. Los **cosméticos del hub** (GDD §5.4): qué se gana con estrellas y semillas, dónde se ve, y el guardado v5.
> Fuera de alcance: el Paseo guiado (punto 11); la pantalla de créditos (`music.credits` sigue esperando); una carrera contra Bruto dentro del modo libre (ver preguntas); la traducción al inglés.
> Referencias: `docs/GDD.md` (§2 principios 2 y 7, §3.3, §5.1 apuesta y semillas, §5.4, §5.7, §5.8, §5.10, §6, §7 por capítulo, §7.9, §11), `docs/plans/03-chapters-0-2-greybox.md` (guion, apuestas), `docs/plans/06-art-and-audio.md` (selección de recursos, hub que crece), `docs/plans/07-codex-epilogue-teacher.md` (bus, `capabilities`, `sandbox.open`, presupuesto diferido), las reglas del proyecto (arquitectura, dependencias, "Contenido y voz").

---

## 0. Criterios globales

- **El núcleo no se reimplementa.** El modo libre, las flores secretas y el hub solo **preguntan** a `core/` (`applyAction`, `maximumSize`, `edmonds`, `runRecipe`, `stonesFromForest`, `koenigCover`, `bipartition`, `tutteBergeBound`, `decomposeSymmetricDifference`, `encodeGarden`/`decodeGarden`, `race`, los generadores). Lo que falte (un generador de abejas y flores al azar) se añade al núcleo con su test primero, en su propio commit.
- **Un jardín del modo libre es un nivel.** El diseño se convierte en el mismo JSON de `levels/data/` y pasa por `levelSchema` y `buildLevel`; se juega con el mismo controlador, la misma sesión y las mismas vistas que un nivel del catálogo. No hay un segundo motor de juego: lo único propio del modo libre es el **editor** del jardín y tres órdenes (diseñar, jardinero mecánico, certificado).
- **Una flor secreta es un nivel del catálogo** (`levels/data/chN/N-M.json`, con `secret`): `check-levels`, `tests/levels.test.ts` y `tests/playability.test.ts` la recorren sin tocarlos. Ningún test existente cambia de expectativa salvo los de progreso, que aprenden a dejar fuera las flores secretas.
- **Lo ganado se deriva; lo vivido se guarda.** Estrellas totales, flores abiertas y cosméticos se calculan de `save.levels` y del catálogo (como el Códex del Plan 07). Solo se guardan las apuestas acertadas (semillas) y los cosméticos ya anunciados. El último jardín diseñado vive aparte (`florecer.sandbox`), para que un diseño roto nunca toque el progreso.
- **Decidir es puro; dibujar no.** Lo del modo libre que se decide sin Phaser vive en `src/levels/sandbox/` (el diseño, sus límites, su JSON, la importación, la disposición de los generados: solo importa `core/`) y en `game/{systems,input,picture}/`; el estado de flores y cosméticos, en `services/`. `game/scenes/` y `game/view/` solo pintan y escuchan.
- **La lógica es instantánea y la vista la alcanza**, también en el editor: un toque produce una edición, el reductor puro responde con el diseño nuevo o un motivo de rechazo, y la escena repinta.
- **Todo texto visible está en `src/content/es/`**: interfaz en `strings.json` (con sus claves en `content/keys.ts`), guion de las flores secretas en `lines.json`. **Regla del vocabulario** sin excepción: ni "grafo", "arista", "vértice", "emparejamiento" ni "camino aumentante" en el editor, los generadores, los avisos ni las líneas de las flores secretas ("jardín al azar", no "grafo aleatorio"; "abejas y flores", no "bipartito"). La única palabra técnica que se deja es "JSON", en el botón del archivo.
- **Una responsabilidad por archivo, ≤ 1000 líneas.** `LevelScene.ts` (348 líneas) y `HubScene.ts` (244) no crecen con lógica nueva: lo nuevo entra por archivos pequeños (`level/sandboxBar.ts`, `hub/…`) y descriptores puros.
- **Sin dependencias nuevas.** Copiar al portapapeles, descargar y leer un archivo son APIs del navegador; el código de jardín ya existe.
- **Las fases se ejecutan de una en una**, en el orden de "Orden y dependencias".

Definición de "hecho" de cada fase: la del Plan 03 (lint, format:check, typecheck, coverage ≥ 95 %, check-levels, build), más `npm run budget` tras el build en las fases que cambian lo que se empaqueta (2, 3, 6, 7, 11, 14, 15) y `npm run assets:check` en local en la fase 6. **Ninguna fase abre un navegador**: al cerrar cada hito, la sesión principal revisa en pantalla (un único navegador headless, cerrado al terminar) que el hub, las flores, el editor y el modo libre se vean bien y se entiendan.

---

## 1. Diseño

### 1.1 Las flores secretas

**Identidad.** Cada una es el nivel siguiente al último de su capítulo: `1.10`, `2.5`, `3.10`, `4.13`, `5.6`, `6.7`, `7.6`. Así `compareLevelIds`, las rutas (`ch1/1-10.json`), los ids de línea (`ch1.10.sauce.00`), la música y el fondo del capítulo funcionan sin cambios, y `actionsUnlockedBy` le da exactamente las acciones de todo su capítulo (nunca una nueva: no hay tarjeta de mecánica que mostrar). Un campo nuevo del esquema la marca: `"secret": { "stars": 14 }`, las estrellas del capítulo que la abren.

**Apertura** (GDD §5.4): el capítulo terminado **y** al menos `stars` estrellas en sus niveles normales. Regla con la que se fija `stars` en cada archivo: los niveles del capítulo más la mitad (redondeada hacia arriba) de sus estrellas extra posibles; es decir, completar todo y ganar la mitad de los extras. Nunca bloquea nada: ninguna otra cosa depende de ella. En modo profesor todas están abiertas.

| Capítulo | Niveles | Máx. ★ | `stars` | Flor |
|---|---|---|---|---|
| 1 Prado | 9 | 19 | 14 | 1.10 |
| 2 Estanque | 4 | 8 | 6 | 2.5 |
| 3 Invernadero | 9 | 24 | 17 | 3.10 |
| 4 Festival | 12 | 25 | 19 | 4.13 |
| 5 Salvaje | 5 | 11 | 8 | 5.6 |
| 6 Recetario | 6 | 12 | 9 | 6.7 |
| 7 Consejo | 5 | 10 | 8 | 7.6 |

(Máximos medidos en el catálogo actual: 1 por completar, 1 sin pistas, 1 con agua donde la hay, 1 por la apuesta formal de 1.6.) El Huerto no tiene flor (§7.9 no la lista).

**Dónde está** (escondida): florece **junto al poste del cartel de su capítulo**, el que ya cuelga cada título del hub (`signBox`), en una columna de 16 px reservada en el margen antes del poste (`flowerBox`; tras la revisión en pantalla de F5, dibujada dentro del poste no se veía). La columna existe en cualquier disposición, haya flor o no, así que la flor siempre tiene sitio y nunca tapa un botón; el poste y la columna juntos reciben el toque. Estados: sin flor (capítulo sin terminar); capullo cerrado, del tamaño de un brote, con una estrella apagada y las que faltan (tocarlo dice "Esta flor se abre con 14 estrellas del Prado. Tienes 11."); flor abierta, que se mece sobre las hojas del capullo con un halo que late (toca y entras); flor dorada con una estrella dorada y las que dio (ganada). Al ganarla, el panel de victoria vuelve al hub (nunca ofrece "siguiente").

Cada diseño se comprobó al escribir el plan con el propio núcleo (`maximumSize`, `decomposeSymmetricDifference`, `tutteBergeBound`, `race`); las fases lo vuelven a comprobar con la integridad completa.

**1.10 Prado — "Doce callejones".** *Jardín:* una cadena de 12 brotes y 11 enredaderas `R–a1=b1–a2=b2–a3=b3–a4=b4–a5=b5–T` (R y T a oscuras) y cuatro parejas sin salida `c1=d1 … c4=d4` (cada `d` solo toca a su `c`); 12 enredaderas callejón, dos desde cada brote que una cadena desde R pisaría "dando" (R, b1…b5) hacia las `c`: `R–c1, R–c2, b1–c2, b1–c3, b2–c3, b2–c4, b3–c4, b3–c1, b4–c1, b4–c2, b5–c3, b5–c4`. 20 brotes, 9 faroles, óptimo 10. La cadena serpentea y cada callejón parece seguirla. *Objetivo:* visible, 10. *Mecánicas:* las del Prado (juntar, apagar, pasar, cadena). *Enseña:* nada nuevo; combina 1.4 (callejón: ganancia 0) y 1.9 (cadena larga). *Victoria:* `matchingSize` 10. *Pistas:* (1) "Doce caminos se rinden. Uno llega." (2) T brilla. (3) Sauce traza `R–a1=b1`.

**2.5 Estanque — "¿Cuántos hilos ganan?".** *Jardín:* cuatro piezas enredadas a propósito: hilo I `1–2–3–4–5–6` (tú `2=3, 4=5`; reflejo `1=2, 3=4, 5=6`: gana el reflejo), hilo II `p–q–r–s` (tú `q=r`; reflejo `p=q, r=s`: gana el reflejo), hilo III `u–v–w–x–y–z` (tú `u=v, w=x, y=z`; reflejo `v=w, x=y`: ganas tú), bucle `a–b–c–d–a` (empate). Tú 8, reflejo 9, óptimo 10. *Guion:* `mirror` (la maraña aparece) → **contar hilos ganadores antes de separar** (paso nuevo de la fase 1; respuesta del núcleo: 2; la tentación es "1", la diferencia 9 − 8) → `separate` (la maraña se abre y lo confirma) → `play`. *Victoria:* `maximum` (aplicar los dos hilos ganadores como cadenas y "Terminé": 10). *Enseña:* nada nuevo; obliga a mirar cada pieza (2.2) en vez de restar.

**3.10 Invernadero — "Los que la luz no alcanza".** *Jardín:* abejas y flores, en niebla, agua = brotes + 2 = 15. Pieza A: abejas R, S, b, d; flores a, c, e; enredaderas `R–a, S–a, a=b, b–c, c=d, d–e` (R, S y e a oscuras). Pieza B, que ninguna luz alcanza: `x=y–z=w–v=u` (abejas x, z, v). 13 brotes, 5 faroles, óptimo 6. Tras la cadena `R–a=b–c=d–e`, la búsqueda desde S solo llega a {S, a, R}: espantapájaros solo en las lunas ({a}) **no** vigilan `b–c` ni la pieza B. *Victoria:* `coverCertificate` (6 espantapájaros, todo vigilado, "Terminé"); p. ej. {a, b, d, x, z, v}. *Enseña:* nada nuevo; es el distractor (c) del Cuaderno de 3.8 y la Observación 5.5 de C5 jugados: hay que añadir los no visitados de un lado. *Estrella extra:* con el agua.

**4.13 Festival — "El orden no importa".** *Jardín:* R a oscuras con tallo `R–a=b`; de b cuelgan dos ramas, `b–x1=x2` con el triángulo `x2–x3=x4–x2` y `b–y1=y2` con el triángulo `y2–y3=y4–y2` y la salida `y3–T` (T a oscuras); de R cuelga una tercera, `R–z1=z2` con el triángulo `z2–z3=z4–z2`. 16 brotes, 7 faroles, óptimo 8, `roots: ["R"]`. Las tres flores aparecen en la misma búsqueda; solo la de la rama y lleva a T. *Guion:* Sauce: "Hay quien jura que, si pliegas en otro orden, se rompe todo. No me creas a mí: pruébalo tú." (Bruto no habla aquí: se le conoce en el capítulo 6 y esta flor se puede jugar antes.) *Victoria:* `maximum` (objetivo oculto). El recorrido de referencia pliega a propósito en el orden "equivocado" (z, x, y) y gana igual: la integridad comprueba que ese orden funciona. *Enseña:* nada nuevo; convence de que el orden de plegado no cambia el resultado.

**5.6 Salvaje — "Cuatro flores, una dentro de otra".** *Jardín:* `nestedFlowers(3)` del núcleo (un triángulo y tres capas alrededor: cuatro flores anidadas; 15 brotes, R el único a oscuras, 7 faroles) más una salida `a–t` con t a oscuras, como 5.2. 16 brotes, óptimo 8, `roots: ["R"]`. *Victoria:* `maximum` (oculto). *Enseña:* nada nuevo; capas y desplegado de fuera hacia dentro, un nivel más hondo que 5.2.

**6.7 Recetario — "¿Cuándo compensa pensar?".** Como 6.4: cuatro carreras con semilla, el autómata contra Bruto (presupuesto 1 000 000), y una pregunta. Medidas con `race` al escribir el plan (pasos del autómata / de Bruto): 4 brotes, semilla 10: **16 / 8, gana Bruto**; 5 brotes, semilla 1: **22 / 18, gana Bruto**; 6 brotes, semilla 3: 38 / 99; 8 brotes, semilla 1: 52 / 528. *Guion:* Bruto, eufórico en las dos primeras; Sauce, sin discutir, en la tercera. *Pregunta:* "¿Cuándo compensa pensar?" (a) "Cuando el jardín crece." ✔ (la respuesta tiene que caber en su botón; Sauce añade al acertar que en uno diminuto probarlo todo es más corto que pensar) (b) "Nunca: Bruto acaba de ganar" ✘ (c) "Siempre: pensar no puede perder" ✘ (las respuestas de Sauce señalan la carrera que lo refuta). *Victoria:* responder (como 6.4). *Enseña:* nada nuevo; matiza la carrera: lo asintótico no es "siempre".

**7.6 Consejo — "Otra prueba".** *Jardín:* una hilera `a–b–c` y, aparte, dos triángulos `p–q–r` y `s–t–o` unidos por un puente `r–M–s` (el brote del puente se llamaba `C`; pasó a `M` para no confundirse con `c`). 10 brotes, faroles `p=q, s=t`, óptimo 4, a oscuras al final: 2. Conjuntos de piedras que lo certifican (todos, por fuerza bruta sobre los 1024 subconjuntos): ∅, {b}, {M} y {b, M}. *Guion:* los Robles: "Una prueba nos convence. ¿Hay otra?" → `play` (encender 4 y presentar un certificado) → **otro certificado distinto** (paso nuevo de la fase 1) → los Robles se inclinan dos veces. *Victoria:* `tutteBergeCertificate`, dos veces con piedras distintas. *Enseña:* nada nuevo; el certificado no es único (las lunas de 7.4 son uno de ellos).

### 1.2 Estrellas, semillas y cosméticos

- **Estrellas totales:** la suma de las mejores estrellas de cada nivel ganado (flores secretas incluidas). Hoy el catálogo da como mínimo 55 (una por nivel) y como máximo 119; las flores añaden 15 (3.10 tiene agua): 134.
- **Semillas** (GDD §5.1: "acertar da semillas"): una por cada apuesta acertada, la primera vez: la formal de 1.6 y las seis de las carreras de 6.5 (las informales, como 0.4, no). Hoy, como mucho 7. Se guardan (`betsWon`), porque no se pueden derivar de las estrellas. Cada semilla planta una planta animada en el hub.
- **Umbrales, no gasto.** Los cosméticos llegan solos al alcanzar su umbral de estrellas y no se pierden; no hay tienda ni moneda que gastar. Es más simple, no puede "bloquear" nada y no castiga.

| ★ | Cosmético | Recurso (CC0) | Dónde |
|---|---|---|---|
| 15 | Una mariposa naranja | Ninja `Actor/Monster/Butterfly/SpriteSheet.png` | Revolotea por el hub, **detrás** de carteles y botones |
| 30 | Una rana | Ninja `Actor/Animal/Frog/SpriteSheet.png` | En el estanque del hub si está plantado; si no, en la hierba |
| 50 | Un gato | Ninja `Actor/Animal/Cat/SpriteSheet.png` | Dormita en un hueco del borde inferior y a ratos pasea |
| 70 | Una mariposa azul | Ninja `Actor/Monster/ButterflyBlue/SpriteSheet.png` | Como la naranja, con otra trayectoria |
| 90 | Dos gallinas | Ninja `Actor/Animal/Chicken/SpriteSheetWhite.png`, `SpriteSheetBrown.png` | Picotean por el borde inferior |
| 110 | Luciérnagas | Por código (puntos de 1 px en `litGlow` con el parpadeo del halo, como el farol) | Sobre el jardín del hub |
| 130 | Farolillos en los postes | El frame del farol ya extraído (`LanternRed`, Plan 06) | Un farol encendido en cada poste de capítulo |
| semillas | Una planta por semilla | Ninja `Backgrounds/Animated/Plant/SpriteSheet16x16.png` | En la franja delantera del lecho del hub |

Los umbrales salen de 55 (terminar el juego sin extras ya da los tres primeros) a 130 (casi todo). Al aparecer un cosmético por primera vez, un aviso en el hub ("Han llegado las mariposas") y se anota en `cosmeticsSeen`. En modo profesor se ven todos.

**Contador:** junto al título del hub, "★ 57" y el icono `icon.seed` con su número (el icono se usa por fin y sale de la lista de espera de `tests/assetUse.test.ts`). Para que quepa, el botón "Exportar registro de prueba" pasa al panel de ajustes (ver preguntas); así la línea superior queda: título, contador, [Modo libre], [Cuaderno], [Códex], engranaje.

### 1.3 El modo libre

**Cuándo existe.** El cartel "Modo libre" aparece en el hub al terminar el capítulo 1 (el jugador ya junta, pasa el farol, encadena y dice "Terminé"); en modo profesor, siempre; el botón del epílogo, en cuanto el juego anuncia `capabilities.sandbox` (justo después de `mountShell`). Un enlace `?garden=<código>` abre el modo libre con ese jardín.

**Diseñar** (escena nueva, `SandboxScene`): herramientas en la barra inferior, como en un nivel: **Brote** (toca la hierba: un brote nuevo con la siguiente letra libre), **Enredadera** (toca dos brotes: crece o se quita), **Farol** (toca una enredadera: se enciende o se apaga; nunca dos en un brote), **Mover** (arrastra), **Quitar** (un brote y sus enredaderas), **Generar…**, **Vaciar**, deshacer y rehacer. Límites que el reductor hace cumplir con un motivo amable: a lo sumo **24 brotes** y **40 enredaderas**, cada brote dentro de `SPROUT_AREA` y a **18 px** o más de otro (el doble del radio más aire), un farol por brote.

**Generar** (con el núcleo, deterministas por semilla, "otro al azar" cambia la semilla):

| Nombre en el juego | Núcleo | Tamaño |
|---|---|---|
| Hilera | `pathGraph` | 2–20 |
| Corro | `cycleGraph` | 3–20 |
| Estrella | `starGraph` | 2–12 hojas |
| Todos con todos | `completeGraph` | 2–8 |
| Al azar | `randomGraph(n, p)` | 4–20, p de 0,15 a 0,5 |
| Abejas y flores | `randomBipartiteGraph(a, b, p)` (nuevo, fase 8) | 4–20 |
| Flor de tallo largo | `longStemFlower` | tallo 1–6 |
| Flores anidadas | `nestedFlowers` | 1–4 |
| Hélice | `helix` | 2–5 brazos |
| Muchas flores | `manyFlowers` | 1–5 |

Los de `hardCases` traen sus faroles; el resto, a oscuras. Si una combinación pasaría de 40 enredaderas, el generador baja el tamaño hasta caber y lo dice. Las posiciones las pone `levels/sandbox/layout.ts` (pura): hilera en zigzag, corro y al azar en círculo, abejas y flores en dos columnas, los de flores por distancia a R de izquierda a derecha; y unas pasadas de separación hasta cumplir los 18 px.

**Jugar.** "Jugar" convierte el diseño en un nivel (sección 0) y lo abre en `LevelScene`: las acciones son las desbloqueadas por el nivel más avanzado ganado (todas en modo profesor); objetivo oculto con "Terminé" si ya está desbloqueado (1.8), y si no, visible con el óptimo del núcleo; sin pistas ni guion; música y fondo del hub; **no** se guarda nada en el progreso. Botones propios en el HUD:
- **Jardinero mecánico** (desde 6.2 ganado): el autómata ejecuta la receta correcta (`RIGHT_RECIPE`, `runRecipe`) desde el jardín actual, con todas sus herramientas aunque el jugador aún no las tenga (él no aprende: lo enseña); su día se añade al del jugador, se ve paso a paso (bosque, flores plegadas y desplegadas, cadenas) y el sol lo recorre.
- **Certificado** (desde 3.8 para espantapájaros y desde 7.4 para piedras): sobre el bosque de la última búsqueda sin cadena, las piedras = las lunas (`stonesFromForest`), con la cuenta del Consejo ya existente; si el jardín es de abejas y flores (`bipartition`), también los espantapájaros (`koenigCover`). Se colocan como jugadas del día, así que el sol también los recorre.
- **Diseñar** (vuelve al editor con el mismo diseño) y **Compartir**.

**Compartir** (capa DOM, porque Phaser no tiene campos de texto): el código de jardín (`encodeGarden`; lleva brotes, enredaderas y faroles, **no** posiciones ni nombres: al importarlo se disponen con `layout.ts` y se nombran A, B, C…), el enlace `?garden=…`, copiar al portapapeles, **descargar el JSON** (con posiciones y nombres) e **importar** pegando un código o un JSON, o eligiendo un archivo `.json`. Todo lo importado pasa por `levelSchema`, `buildLevel` y los límites del modo libre; un texto de más de 64 KB se rechaza sin leerlo.

**El JSON exportado** es un nivel válido: `"id": "9.1"`, `"draft": true`, los brotes con nombre y posición, enredaderas, faroles, objetivo oculto, victoria `maximum`, guion por defecto y una `solution` de referencia (las cadenas que da `edmonds` desde esos faroles y "Terminé"), de modo que `checkIntegrity` lo acepta. El capítulo 9 no existe en el juego: para convertirlo en nivel de verdad se le da su id al copiarlo a `levels/data/`. Si el jardín ya es máximo al empezar, la solución es solo "Terminé" (la victoria `maximum` no se cumple al empezar porque exige el "Terminé").

---

## Fase 0 — Las flores secretas en el catálogo

| Archivo | Responsabilidad |
|---|---|
| `levels/schema.ts` | Campo `secret: { stars: int ≥ 1 }` opcional |
| `levels/secretChecks.ts` | Pura: problemas de integridad propios de una flor secreta: que su id va después de todos los niveles normales de su capítulo, una por capítulo, sin `unlocks`, sin `notebook`, que no es borrador, y que `stars` está entre el número de niveles del capítulo (exclusivo) y su máximo de estrellas (inclusive) |
| `levels/starsCeiling.ts` | Pura: el máximo de estrellas de un nivel por lo que declara (1 + sin pistas + agua si la hay + apuesta formal), el mismo cálculo que `computeStars` con todo a favor; lo usan `secretChecks` y los servicios |
| `levels/integrity.ts`, `tools/check-levels.ts` | Llaman a `secretChecks` con el catálogo |
| `services/progress.ts` | `visibleLevels` y `unlockedLevels` dejan fuera las flores secretas (no son botones ni abren "el siguiente"); en modo profesor tampoco son botones: se abren desde su flor |
| `game/picture/hubGarden.ts` | `finishedChapters` ignora las flores secretas, como los borradores |
| `game/systems/afterVictory.ts` | Ganar una flor secreta vuelve al hub sin "siguiente" |
| `services/secretFlowers.ts` | Pura: por capítulo, el estado de su flor (`none`, `bud` con estrellas que faltan y tenidas, `open`, `won` con sus estrellas) a partir del catálogo, el guardado y el modo profesor |
| `tests/support/fixtureLevels.ts` | Un nivel secreto de prueba para los tests puros (los reales llegan en F2–F3) |

**Tests clave:** con un catálogo sintético (`1.1`, `1.2`, `1.3` secreta), ganar `1.2` no abre `1.3` como botón ni la cuenta para terminar el capítulo; la flor está `none` con el capítulo a medias, `bud` con el capítulo terminado y pocas estrellas (dice cuántas faltan), `open` al llegar, `won` al ganarla; en modo profesor, `open` sin nada ganado; `secretChecks` rechaza una flor con `stars` mayor que el máximo, otra en mitad del capítulo, dos en un capítulo, una con `unlocks`; `afterVictory` de una flor secreta no ofrece siguiente.

---

## Fase 1 — Dos pasos de guion: contar hilos ganadores y otro certificado

| Archivo | Responsabilidad |
|---|---|
| `levels/flow.ts` | `count` con `of: 'winningThreads'` (cuántas piezas de la maraña gana el reflejo); paso nuevo `certifyAgain`: el jardín sigue y el paso termina cuando la victoria del nivel vuelve a cumplirse con piedras distintas de todas las ya presentadas |
| `game/systems/answerKey.ts`, `game/systems/pond.ts` (donde hoy se responde `count`) | Pura: la respuesta de `winningThreads` con `decomposeSymmetricDifference` (piezas camino con ganancia > 0 a favor del reflejo) |
| `levels/flowChecks.ts` | `winningThreads` solo en niveles con `mirror` y antes de `separate`; `certifyAgain` solo con victoria `tutteBergeCertificate` y después de un `play`; el recorrido de referencia presenta conjuntos distintos |
| `game/systems/levelSession.ts` (o un archivo nuevo `certifyAgain.ts` si la sesión pasa de su tamaño) | Guarda los conjuntos de piedras presentados; el paso solo acaba con uno nuevo; a uno repetido le contestan los Robles con la línea que nombra el paso (`certifyAgain.repeated`) |
| `game/systems/walkthrough.ts`, `game/systems/presentation.ts` | El recorrido y la presentación conocen los dos pasos (el `count` nuevo usa la vista de números existente) |
| `levels/flow.ts`, `levels/lines.ts` | `certifyAgain` lleva `repeated`: el id de la línea de los Robles (`ch7.6.oaks.NN`) para piedras ya vistas; cuenta como línea del nivel |

"Terminé" se borra solo al mover una piedra (`applyAction` ya lo hace con cualquier jugada), así que `certifyAgain` no necesita nada del núcleo.

**Tests clave:** en el jardín de 2.5 (fixture), la respuesta es 2 y "1" se contesta como incorrecta; `winningThreads` sin `mirror` es un problema de integridad; en el jardín de 7.6, presentar ∅ y luego otra vez ∅ no termina `certifyAgain`, y {C} sí; un recorrido que repite el mismo conjunto es un problema de integridad.

---

## Fase 2 — Flores del Prado, el Invernadero, el Festival y el Salvaje

| Archivo | Responsabilidad |
|---|---|
| `levels/data/ch1/1-10.json` | Sección 1.1, objetivo visible 10, `secret.stars` 14 |
| `levels/data/ch3/3-10.json` | Abejas y flores, niebla, agua 15, `coverCertificate`, `secret.stars` 17 |
| `levels/data/ch4/4-13.json` | Tres flores, `roots: ["R"]`, oculto, `maximum`, plegado en orden z, x, y en la solución, `secret.stars` 19 |
| `levels/data/ch5/5-6.json` | `nestedFlowers(3)` + `a–t`, oculto, `maximum`, `secret.stars` 8 |
| `content/es/lines.json` | Líneas de entrada, reacciones y tres pistas de cada una (Sauce; nadie habla antes del capítulo que lo presenta, así que Bruto no aparece en 4.13); nombres de brotes con la misma inicial que su letra |
| `tests/secrets.test.ts` | Comprobaciones de diseño que la integridad general no ve (abajo) |

Las posiciones se escriben a mano dentro de `SPROUT_AREA`, con los tests de geometría ya existentes (nada fuera, nada bajo el HUD) y uno nuevo en `tests/secrets.test.ts`: dos brotes de una flor secreta nunca a menos de 18 px.

**Tests clave (`tests/secrets.test.ts`, sobre los archivos reales):** 1.10 tiene exactamente una cadena que gana desde R (enumeradas en el test por búsqueda exhaustiva y validadas con `checkAugmentingPath`) de 12 brotes, y 12 enredaderas callejón; en 3.10, tras la cadena de referencia, los espantapájaros en las lunas de la búsqueda no vigilan todo y los de la solución sí (`checkVertexCover`); en 4.13 la solución pliega primero la flor que la búsqueda encontró la última; 5.6 es `nestedFlowers(3)` más `t` (mismo jardín, por el código de jardín); y las comunes: integridad, jugabilidad, ids de línea, vocabulario (ya los dan `tests/levels.test.ts`, `tests/playability.test.ts`, `tests/content.test.ts`).

---

## Fase 3 — Flores del Estanque, el Invierno y el Consejo

| Archivo | Responsabilidad |
|---|---|
| `levels/data/ch2/2-5.json` | Las cuatro piezas, `mirror`, guion `say → mirror → count(winningThreads) → separate → play`, `maximum`, `secret.stars` 6 |
| `levels/data/ch6/6-7.json` | Cuatro carreras (4/10, 5/1, 6/3, 8/1, presupuesto 1 000 000) y la pregunta, `secret.stars` 9 |
| `levels/data/ch7/7-6.json` | Hilera y puente, `play` + `certifyAgain`, `tutteBergeCertificate`, `secret.stars` 8 |
| `content/es/lines.json` | Sus líneas (Sauce; Bruto en 6.7; Robles en 7.6, entre ellas la de `repeated`: "Esa ya nos la enseñaste. Muéstranos otras piedras.") |
| `tests/secrets.test.ts` | Lo de abajo |

**Tests clave:** en 2.5 el reflejo gana exactamente dos piezas y pierde una, y la diferencia de faroles es 1 (la trampa existe); en 6.7, con `raceOf`, Bruto termina y da menos pasos que el autómata en las dos primeras carreras y más en las dos últimas (si una semilla deja de cumplirlo, el test lo dice antes que el jugador); en 7.6 hay al menos dos conjuntos que certifican (fuerza bruta sobre los subconjuntos) y la solución usa dos distintos.

**Hito H1 (F0–F3):** las siete flores existen, se ganan con su recorrido y no alteran el progreso normal. Revisión en pantalla con `?teacher&level=1.10` … `7.6`.

---

## Fase 4 — Estrellas, semillas y guardado v5

| Archivo | Responsabilidad |
|---|---|
| `services/save.ts` | Versión 5: `betsWon: string[]` (`"1.6#3"`: nivel y paso del guion, cada apuesta una vez) y `cosmeticsSeen: string[]`; la v4 migra con las dos vacías; `recordBetsWon`, `recordCosmeticsSeen` |
| `services/starCount.ts` | Pura: estrellas totales y por capítulo (solo niveles normales, para las flores) |
| `services/seeds.ts` | Pura: semillas = apuestas acertadas guardadas |
| `services/cosmetics.ts` | Pura: la tabla de la sección 1.2 (id, umbral), los abiertos por estrellas (todos en modo profesor) y los nuevos (abiertos y no anunciados) |
| `game/systems/betsWon.ts` | Pura: de una sesión ganada, los pasos `bet` formales y `raceBet` acertados |
| `game/scenes/LevelScene.ts` | Al ganar, guarda también las apuestas acertadas (fuera del modo libre) |

**Tests clave:** un guardado v4 migra sin perder niveles, Cuaderno, tarjetas ni páginas leídas; una apuesta acertada dos veces cuenta una semilla; la informal de 0.4 no da semilla; ganar 6.5 acertando 4 de 6 apuestas da 4; con 49 estrellas hay dos cosméticos y con 50, tres; un cosmético ya anunciado deja de ser nuevo; en modo profesor, todos; los umbrales están en orden y el último no pasa del máximo posible del catálogo (calculado con `starsCeiling`).

---

## Fase 5 — La línea superior del hub, el contador y las flores en los postes

| Archivo | Responsabilidad |
|---|---|
| `game/view/SettingsView.ts`, `game/scenes/settingsPanel.ts` | El botón "Exportar registro de prueba" pasa al panel de ajustes (mismo texto y misma acción) |
| `game/picture/hubTopLine.ts` | Pura: de derecha a izquierda tras el engranaje, Códex, Cuaderno y Modo libre (los que haya), y tras el título (y la insignia del profesor) el contador; comprueba que no se tocan |
| `game/picture/hubCounter.ts` | Pura: el texto "57" con el hueco de la estrella y el del icono de semilla, como `labelStars` |
| `game/picture/secretFlower.ts` | Pura: del estado de una flor (fase 0), qué se pinta sobre el poste (nada, capullo, flor, flor con estrellas) y su caja de toque, la del poste |
| `game/scenes/hub/HubSecrets.ts` | Pinta las flores sobre los postes y escucha sus toques: abre la flor, o un aviso con las estrellas que faltan |
| `game/scenes/hub/HubTopLine.ts` | Coloca el contador (estrella dibujada, `icon.seed`) y los carteles según `hubTopLine` |
| `game/scenes/HubScene.ts` | Usa los dos de arriba; adelgaza lo que hoy coloca a mano la línea superior |
| `tests/assetUse.test.ts` | `icon.seed` sale de `AWAITING` |
| `content/es/strings.json`, `content/keys.ts` | `hub.secret.bud` ("Esta flor se abre con {need} estrellas de {chapter}. Tienes {have}."), `hub.stars`, `hub.seeds` |

**Tests clave:** con las palabras reales y el ancho de la fuente, la línea superior cabe a 480 px con todos los carteles, la insignia del profesor y un contador de tres cifras; la caja de una flor es la de su poste en todas las disposiciones del catálogo (y la de `layoutHub` no cambia); el panel de ajustes sigue cabiendo con el botón nuevo (`tests/panelFit.test.ts`); `icon.seed` ya se usa.

---

## Fase 6 — Recursos de los cosméticos

| Archivo | Responsabilidad |
|---|---|
| `tools/assets/selection.ts` | Entradas nuevas al final, grupo `boot`: `critter.butterfly`, `critter.butterflyBlue`, `critter.frog`, `critter.cat`, `critter.chickenWhite`, `critter.chickenBrown`, `deco.plant` (sección 1.2), sin reordenar |
| `src/game/assets/manifest.json`, `public/assets/images/hub/*` | Regenerados con `npm run assets` |
| `src/game/assets/frames.ts` | Frames con nombre (andar, quieto, aleteo) de cada hoja, comprobados contra el PNG |
| `game/picture/recolour…` / `PreloadScene.ts` | Solo si alguna hoja desentona con la paleta: se recolorea al cargar como Kenney (las de Ninja ya son de su paleta) |
| `CREDITS.md` | Ninja Adventure ya está acreditado; se añade a su lista de "qué se usa" lo nuevo |
| `tests/assetUse.test.ts` | Las claves nuevas esperan en `AWAITING` hasta la fase 7 ("the critters of the hub") |

Las hojas elegidas pesan juntas unos 16 KB (medido en el zip): caben de sobra en `images` (600 KB) y en `initial`.

*En ejecución:* pesan 10,1 KB. Ninguna se recolorea: la rana y la planta traen unos pocos colores fuera de `Palette.png`, como los tilesets de Ninja ya enviados, y son del mismo pack. Los frames con nombre de `frames.ts` nombran cada clave nueva, y `tests/assetUse.test.ts` cuenta eso como uso, así que las claves no pasan por `AWAITING` y la fase 7 no tiene nada que sacar de ahí.

**Tests clave:** los de `tests/assets.test.ts` (cada entrada existe, cada frame cae dentro de su hoja, cada pack acreditado), `npm run assets:check` en local, `tests/assetBudget.test.ts` en verde.

---

## Fase 7 — Los cosméticos en el hub

| Archivo | Responsabilidad |
|---|---|
| `game/picture/hubCritters.ts` | Pura: de los cosméticos abiertos y de las cajas ocupadas del hub (`taken`, las piezas plantadas), dónde vive cada uno: punto de reposo en un hueco del lecho o del estanque, o trayectoria cerrada (mariposas: una curva de Lissajous por la mitad baja del hub) y su frame en el instante t, con semilla por cosmético; el que no tiene hueco no aparece |
| `game/picture/seedlings.ts` | Pura: dónde brota cada planta de semilla en la franja delantera del lecho, sin tapar el cartel del epílogo |
| `game/picture/fireflies.ts` | Pura: posiciones y brillo de las luciérnagas en el instante t (mismo patrón de tres frames que `lanternFlicker`) |
| `game/view/HubCrittersView.ts` | Pinta y anima animales, plantas y luciérnagas en una capa por debajo de carteles y botones; sin zonas de toque |
| `game/scenes/hub/HubCosmetics.ts` | Crea la vista, muestra el aviso de cada cosmético nuevo y lo anota en el guardado |
| `game/picture/secretFlower.ts`, `HubSecrets.ts` | A los 130 ★ el farolillo del poste se dibuja junto a la flor sin tapar su caja |
| `content/es/strings.json`, `content/keys.ts` | `cosmetic.butterfly`, `cosmetic.frog`, `cosmetic.cat`, `cosmetic.butterflyBlue`, `cosmetic.chickens`, `cosmetic.fireflies`, `cosmetic.lanterns`, `cosmetic.seedling` |

**Tests clave:** el mismo instante da la misma posición; ningún punto de reposo cae sobre un cartel, título o botón en ninguna combinación de capítulos terminados; la rana va al estanque si existe; las mariposas cierran su ciclo; sin estrellas no hay nada; con 134, todo; cada aviso aparece una sola vez.

*En ejecución:* cada cosmético tiene una **casa** (`picture/hubCosmeticHomes.ts`, con el buscador de huecos `picture/freeSpot.ts`) dentro del lecho del hub, libre de todo lo que se lee o se pulsa (línea superior, postes, columnas de las flores, títulos, botones, cartel del epílogo) y de las demás casas, y se mueve solo dentro de ella: así nada tapa nada, tampoco las mariposas, que vuelan sobre el lecho y no por detrás de los carteles. Las casas se buscan en un orden fijo para todos los cosméticos posibles y luego se muestran los que hay, así que ninguna se mueve cuando llega otro. El gato, las gallinas, la rana sin estanque y las plantas viven en la franja delantera; las mariposas y las luciérnagas, encima. Los **farolillos** no usan el frame de `LanternRed`: junto a la flor no cabe un farol de 13 × 15 sin tapar el poste o la columna, así que cada poste lleva el halo parpadeante del farol (dos tonos, tres frames) dibujado por debajo. Si el sistema pide menos movimiento (`prefers-reduced-motion`), todo se dibuja quieto. Los avisos salen de uno en uno y cada uno se anota en `cosmeticsSeen` al mostrarse; el modo profesor no avisa ni guarda. `tests/hubCosmetics.test.ts` lo comprueba con el catálogo y las palabras reales, en los dos modos, con y sin el cartel del epílogo y con o sin estanque.

**Hito H2 (F4–F7):** estrellas, semillas, flores en los postes y cosméticos. Revisión en pantalla con guardados sintéticos (0, 60, 134 estrellas) cargados por la sesión principal.

---

## Fase 8 — El jardín libre como dato

| Archivo | Responsabilidad |
|---|---|
| `core/generators/bipartite.ts` | Nuevo en el núcleo (test primero): `randomBipartiteGraph(a, b, p, rng)`; cada enredadera une un lado con el otro |
| `levels/sandbox/limits.ts` | `MAX_SPROUTS` 24, `MAX_VINES` 40, `MIN_SPACING` 18 |
| `levels/sandbox/design.ts` | Pura: el diseño (`sprouts` con nombre y posición, `vines`, `lanterns`, `kinds` opcional) y su reductor: `addSprout`, `moveSprout`, `removeSprout`, `toggleVine`, `toggleLantern`, `clear` → diseño nuevo o motivo (`tooMany`, `tooClose`, `outside`, `tooManyVines`, `sproutBusy`, `notAVine`) |
| `levels/sandbox/names.ts` | Pura: la siguiente letra libre (A…Z sin Ñ ni letras dobles) |
| `levels/sandbox/toLevel.ts` | Pura: diseño → JSON de nivel (`id` `9.1`, `draft`, solución de referencia con las cadenas de `edmonds` y "Terminé") y diseño + acciones permitidas → `Level` para jugar (con `forbid` las no desbloqueadas; oculto con "Terminé" si está permitido, visible con el óptimo si no) |
| `levels/sandbox/importText.ts` | Pura: un texto → diseño o motivo: primero JSON (`levelSchema`, `buildLevel`, límites), si no, código de jardín (`decodeGarden`, `layout`, `names`); más de 64 KB, `tooLong` |
| `levels/sandbox/layout.ts` | Pura: posiciones para un jardín sin ellas (ver 1.3), deterministas, dentro del área y separadas |

**Tests clave:** propiedades (fast-check) sobre diseños al azar dentro de los límites: el JSON exportado pasa `loadLevel` **y** `checkIntegrity` sin problemas; importar el JSON exportado devuelve el mismo diseño; importar el código devuelve el mismo jardín y los mismos faroles; el reductor nunca produce un diseño fuera de límites ni dos faroles en un brote; con ≤ 10 brotes, el óptimo de `toLevel` coincide con `bruteForceMatching`; `layout` de cada generador de 1.3 en sus tamaños máximos cumple área y separación; textos rotos (JSON a medias, código con bits sobrantes, 65 KB) dan su motivo, nunca una excepción; `randomBipartiteGraph` es bipartito (`bipartition`) y determinista por semilla.

---

## Fase 9 — Generar

| Archivo | Responsabilidad |
|---|---|
| `levels/sandbox/generators.ts` | Pura: la tabla de 1.3 (id, clave de texto, rango de tamaño, función del núcleo, si trae faroles, si es de abejas y flores) y `generate(id, size, seed)` → diseño (con `layout` y `names`; abejas y flores con `kinds`), bajando el tamaño si pasaría de 40 enredaderas |
| `content/es/strings.json`, `content/keys.ts` | `sandbox.gen.path` "Hilera", `.cycle` "Corro", `.star` "Estrella", `.complete` "Todos con todos", `.random` "Al azar", `.beesFlowers` "Abejas y flores", `.longStem` "Flor de tallo largo", `.nested` "Flores anidadas", `.helix` "Hélice", `.manyFlowers` "Muchas flores", `sandbox.gen.another` "Otro al azar", `sandbox.gen.shrunk` |

**Tests clave:** cada generador en cada tamaño de su rango da un diseño dentro de límites que `toLevel` acepta; la misma semilla da el mismo jardín; "Flores anidadas 4" tiene el óptimo de `nestedFlowers(4)`; ningún nombre de generador usa el vocabulario matemático.

---

## Fase 10 — Acceso, almacén y capacidades

| Archivo | Responsabilidad |
|---|---|
| `services/sandboxAccess.ts` | Pura: qué ofrece el modo libre según el progreso: si existe (capítulo 1 terminado, o profesor), las acciones (las del nivel más avanzado ganado, o todas), y si hay jardinero mecánico (6.2), espantapájaros (3.8) y piedras (7.4) |
| `services/sandboxStore.ts` | Pura salvo el almacén: el último diseño en `florecer.sandbox`, validado con zod al leer; roto o ausente → diseño vacío; nunca toca `florecer.save` |
| `services/startGarden.ts` | Pura: `?garden=<código>` → código válido o nada (como `requestedLevel`) |
| `game/scenes/context.ts`, `main.ts` | El contexto lleva el almacén y el jardín pedido; tras `mountShell`, `bus.emit('capabilities', { sandbox: true })`; `sandbox.open` arranca `SandboxScene` desde la escena activa |
| `game/scenes/hub/HubTopLine.ts`, `game/picture/hubTopLine.ts` | El cartel "Modo libre" cuando `sandboxAccess` dice que existe |
| `game/scenes/BootScene.ts` / `PreloadScene.ts` | Con `?garden=`, empieza en el modo libre con ese jardín |

**Tests clave:** sin el capítulo 1 terminado no hay modo libre y en modo profesor sí; con 4.5 como lo más avanzado no hay piedras ni jardinero, sí plegar y desplegar; un almacén con basura da diseño vacío; `?garden=` con un código roto se ignora; `ui/shell.test.ts` recibe `capabilities` después de montarse y el epílogo ofrece entonces el botón.

---

## Fase 11 — La escena del editor

| Archivo | Responsabilidad |
|---|---|
| `game/input/designIntent.ts` | Pura: de la herramienta, el puntero (toque, arrastre) y lo que hay bajo él (`HitTest`), la edición: brote en la hierba, enredadera entre dos brotes tocados, farol en una enredadera, mover, quitar |
| `game/systems/designHistory.ts` | Pura: deshacer y rehacer de diseños (o la generalización de `history.ts`, si su tipo lo permite, en un `refactor:` aparte) |
| `game/picture/designPicture.ts` | Pura: del diseño, la imagen que ya saben pintar `GardenView` y `MarksView` (brotes, enredaderas, faroles, abejas y flores), más la selección y el aviso de "demasiado cerca" |
| `game/picture/designToolbar.ts` | Pura: los botones de herramientas y órdenes, y cuáles están activos |
| `game/scenes/SandboxScene.ts` | Monta el fondo del hub, la vista del jardín, la barra y el menú de generar; manda cada gesto al reductor y repinta; "Jugar", "Compartir" y "Volver al hub" |
| `game/view/GenerateMenu.ts` | Panel de madera con los generadores, el tamaño (− / +) y "Otro al azar" |
| `game/config.ts` | Registra `SandboxScene` |
| `content/es/strings.json`, `content/keys.ts` | `sandbox.title`, `sandbox.tool.sprout|vine|lantern|move|remove|generate|clear`, `sandbox.play`, `sandbox.share`, `sandbox.back`, y un texto por motivo de rechazo del reductor |

**Tests clave:** un toque en la hierba con la herramienta Brote añade uno donde se tocó (redondeado a píxel); dos toques en brotes con Enredadera la crean y otros dos la quitan; un toque en la hierba con Enredadera no hace nada; arrastrar mueve y soltar demasiado cerca devuelve el brote a su sitio con el motivo; deshacer tras generar vuelve al diseño anterior; cada motivo de rechazo tiene texto y ninguno usa el vocabulario matemático.

---

## Fase 12 — Jugar el jardín libre

| Archivo | Responsabilidad |
|---|---|
| `game/systems/levelScreenOf.ts` | Pura: el descriptor de pantalla de un nivel: música, fondo, si guarda progreso, si registra en el registro de prueba, a dónde vuelve, qué piezas de interfaz enseña (`isUiUnlocked` con el nivel más avanzado ganado, en el modo libre) |
| `game/scenes/LevelScene.ts` | `create` acepta `{ levelId }` o `{ sandbox: { design } }`; pide el `Level` a `toLevel` y el resto al descriptor; ninguna rama "si es el modo libre" fuera de esa entrada |
| `game/scenes/level/sandboxBar.ts` | Los botones propios del modo libre en el HUD (Jardinero mecánico, Certificado, Diseñar, Compartir), según `sandboxAccess` |
| `game/picture/hud.ts` | Sitio para esos botones sin pisar los del nivel |
| `services/busEvents.ts`, `game/systems/teacherFeed.ts`, `ui/model/teacherTrace.ts` | En modo profesor, el feed del modo libre lleva su jardín (nombres, posiciones, enredaderas), porque no está en el catálogo |

**Tests clave:** el descriptor de un nivel del catálogo es el de hoy (música del capítulo, guarda, registra) y el del modo libre usa la del hub y no guarda; jugar un diseño con las acciones de 1.8 rechaza plegar con el motivo de siempre ("aún no sabes hacerlo"); ganar en el modo libre no cambia `florecer.save`; el panel del profesor escribe la traza de un jardín libre con sus nombres.

---

## Fase 13 — El jardinero mecánico y el certificado a demanda

| Archivo | Responsabilidad |
|---|---|
| `game/systems/sandboxSolve.ts` | Pura: desde el jardín actual de la sesión, el día del autómata con `RIGHT_RECIPE` (`automatonRun` sobre una copia del estado con todas las jugadas del autómata permitidas), añadido al día del jugador para que el sol lo recorra |
| `game/systems/sandboxCertificate.ts` | Pura: sobre el último estado con una búsqueda terminada sin cadena, las jugadas del certificado: `liftStone` de cada luna (`stonesFromForest`) y, si `bipartition` lo permite, `placeScarecrow` de `koenigCover`; con "Terminé"; null si no hay búsqueda terminada |
| `game/systems/levelController.ts` | Dos eventos de interfaz nuevos, `solve` y `certify`, que llaman a los de arriba y devuelven los efectos de reproducción que ya existen para el paso `automaton` |
| `game/scenes/level/sandboxBar.ts` | Los botones mandan esos eventos; Certificado se activa solo tras una búsqueda terminada |
| `content/es/strings.json`, `content/keys.ts` | `sandbox.solve`, `sandbox.certify`, `sandbox.certify.stones`, `sandbox.certify.scarecrows`, `sandbox.certify.notYet` |

Si el último estado de `runRecipe` no conserva el bosque de la búsqueda final (lo que el certificado necesita), se añade al núcleo con su test, en su commit; no se reconstruye en `game/`.

**Tests clave:** en jardines al azar (fast-check, ≤ 16 brotes), tras `solve` los faroles son el óptimo de `maximumSize` y el sol recorre cada paso del autómata; el certificado de piedras cumple `checkTutteBerge` y el de espantapájaros `checkVertexCover` con tantos como faroles; en un jardín con bucle impar no se ofrecen espantapájaros; `certify` antes de `solve` en un jardín sin búsqueda devuelve "aún no"; el autómata usa plegar aunque el jugador no lo tenga, y el jugador sigue sin tenerlo después.

---

## Fase 14 — Compartir: código, enlace y JSON

| Archivo | Responsabilidad |
|---|---|
| `services/busEvents.ts` | `sandbox.share` (`{ code, link, json }`), `sandbox.import` (abrir la hoja de importar), `sandbox.imported` (`{ text }`, de la capa al juego) |
| `ui/model/shareSheet.ts` | Pura: qué muestra la hoja (código, enlace, botones) y el nombre del archivo (`jardin-<código>.json`, recortado) |
| `ui/sandbox/ShareSheet.ts`, `share.css` | Capa DOM con el marco común (`ui/overlay.ts`): código y enlace seleccionables, copiar (portapapeles, y si falla, deja el texto seleccionado), descargar el JSON (`services/download.ts`), importar (pegar o elegir archivo); cargada con `import()` desde `ui/shell.ts` |
| `game/scenes/SandboxScene.ts`, `level/sandboxBar.ts` | Emiten `sandbox.share` con lo que dan `encodeGarden` y `toLevel`; al recibir `sandbox.imported`, `importText` → diseño nuevo o aviso con el motivo |
| `eslint.config.js`, `tests/lint-rules.test.ts` | `ui/shell.ts` no importa estáticamente `ui/sandbox/` |
| `content/es/strings.json`, `content/keys.ts` | `share.title`, `share.code`, `share.link`, `share.copy`, `share.copied`, `share.download`, `share.import`, `share.paste`, `share.file`, y un texto por motivo de `importText` |

**Tests clave:** la hoja ofrece descargar solo si hay JSON; el nombre del archivo es seguro (sin `/`, ≤ 40 caracteres); el texto importado viaja tal cual por el bus y el juego lo valida; lint: importar `ui/sandbox/ShareSheet` estáticamente desde la capa falla.

**Hito H3 (F8–F14):** el modo libre de punta a punta. Revisión en pantalla: diseñar a mano un jardín de 4.1, jugarlo, pedir el jardinero, ver la flor, el certificado de piedras; generar "Abejas y flores" y ver los espantapájaros; exportar, abrir el enlace en otra pestaña e importar el JSON.

---

## Fase 15 — Presupuesto, documentación y cierre

| Archivo | Responsabilidad |
|---|---|
| `tools/assets/budget.ts` | Límites revisados con lo medido (abajo) |
| `README.md` | El modo libre (cuándo aparece, `?garden=`), las flores secretas y los cosméticos |
| `docs/plans/08-sandbox-secrets-cosmetics.md` | Las decisiones tomadas en ejecución, si alguna cambió |

**Presupuesto** (hoy: script inicial 1,40 MB de 1,8 MB; diferido 873 KB de 1 MB):

| Qué | Dónde | Estimado |
|---|---|---|
| `SandboxScene`, editor, generadores, `levels/sandbox/`, hub y cosméticos | Script inicial (la escena tiene que estar registrada para anunciar `capabilities`) | 50–80 KB |
| Las siete flores secretas (JSON en el catálogo) | Script inicial | ~15 KB |
| Hoja de compartir (DOM) | Trozo diferido propio, contado en la parte diferida | ~6 KB |
| Animales y plantas | Imágenes, grupo `boot` | ~16 KB |
| Música | Ninguna nueva: las flores usan la de su capítulo, el modo libre la del hub | 0 |

Si el inicial se acercara a 1,8 MB, lo primero que pasa a `import()` es el menú de generar con `levels/sandbox/generators.ts`.

---

## Orden y dependencias

```
F0 → F1 → F2 → F3 → F4 → F5 → F6 → F7 → F8 → F9 → F10 → F11 → F12 → F13 → F14 → F15
```

Una fase a la vez, siempre. F1 necesita el campo `secret` de F0 solo para sus fixtures; F2 necesita F0 (integridad de flores); F3 necesita F1 (los dos pasos nuevos). F4 es independiente de las flores pero F5 pinta su estado (F0) y el contador (F4). F6 antes de F7 (las claves del manifiesto). F8 no depende de nada del hub; F9 usa el diseño y `layout` de F8; F10 necesita F5 (la línea superior donde va el cartel); F11 usa F8–F10; F12 necesita F8 (`toLevel`) y F10 (acceso); F13 necesita F12 (los botones y el descriptor); F14 necesita F11–F12 (dónde se pulsa Compartir). F15 cierra.

**Hito H1 (F0–F3):** flores secretas. **Hito H2 (F4–F7):** estrellas, semillas y cosméticos. **Hito H3 (F8–F14):** modo libre. Tras la revisión en pantalla de los tres hitos y F15: merge `develop → main` y tag `v0.8.0-sandbox`.

---

## Decisiones

- **El jardín libre es un nivel, la flor secreta es un nivel.** Así heredan la integridad, la jugabilidad, el panel del profesor, el sol, deshacer y todas las vistas sin escribir un motor paralelo.
- **Ids numéricos para las flores secretas** (el siguiente de cada capítulo) en vez de un formato propio: no cambian la expresión regular de los ids, ni las rutas, ni las líneas, y dan las acciones justas del capítulo.
- **Umbrales en vez de gasto.** Nada se compra ni se pierde; las estrellas solo suman.
- **La flor junto al poste del capítulo**, no en el lecho del hub: el lecho ya está lleno (las ocho piezas ocupan 448 de 464 px) y el poste existe en cualquier disposición. La columna de la flor (18 px con su hueco) no añade ninguna línea de botones ni con todos los niveles a tres estrellas.
- **El jardinero mecánico usa todas sus herramientas** aunque el jugador no las tenga: no se las da al jugador, y ver algo que aún no sabe hacer en su propio jardín es el mismo papel que tuvo en 6.2.
- **El diseño se guarda aparte** (`florecer.sandbox`), sin versión de guardado compartida: un diseño a medias nunca rompe el progreso.
- **El código de jardín no lleva posiciones** (es canónico y corto, Plan 01); el JSON sí. Importar un código dispone el jardín de nuevo.

## Cambios pequeños que el GDD necesitaría (no se editan aquí)

- §5.10 dice "uno o dos por capítulo"; §7.9 lista uno por capítulo del Prado al Consejo y ninguno para el Huerto. El plan sigue §7.9.
- §5.4 no dice qué cosméticos hay ni cómo se ganan; §5.1 dice que la apuesta da semillas sin decir para qué. El plan fija la tabla de 1.2 y las semillas como plantas del hub; las apuestas de las carreras de 6.5 también dan semilla.
- §5.7 no dice cuándo se abre el modo libre (§6 lo pone en el epílogo). El plan lo abre al terminar el capítulo 1, con las herramientas ya ganadas, y lo ofrece también desde el epílogo.
- §7.9 Estanque: "antes de superponer" pasa a "antes de separar la maraña" (la maraña ya es la superposición; no hay vista de los dos jardines por separado).
- §7.9 Consejo pide dos certificados distintos: el plan añade el paso `certifyAgain`.
- El botón "Exportar registro de prueba" sale de la línea superior del hub al panel de ajustes.

## Riesgos y cómo se mitigan

| Riesgo | Mitigación |
|---|---|
| `LevelScene` se llena de "si es el modo libre" | Una sola entrada (`create`) y un descriptor puro (`levelScreenOf`); test de que el descriptor de un nivel del catálogo no cambia |
| La línea superior del hub no cabe | `hubTopLine` puro con las palabras reales y el ancho de la fuente, probado en el peor caso (profesor, contador de tres cifras, todos los carteles) |
| Una flor secreta rompe el progreso normal (abre "el siguiente", cuenta para terminar el capítulo) | `visibleLevels`, `unlockedLevels`, `finishedChapters` y `afterVictory` probados con flores en catálogos sintéticos; `secretChecks` en la integridad |
| Un jardín diseñado ilegible (brotes pegados, demasiadas enredaderas) | Límites de 24 brotes, 40 enredaderas y 18 px aplicados por el reductor, por la importación y por los generadores; probados con propiedades |
| Un JSON o código importado malicioso o enorme | zod estricto, `buildLevel`, límites, 64 KB como máximo; nunca se evalúa nada |
| Las semillas de 6.7 dejan de dar "Bruto gana" si cambia el núcleo | `tests/secrets.test.ts` lo comprueba con `raceOf` en cada ejecución |
| El jardinero mecánico tarda en un jardín grande | 24 brotes y 40 enredaderas: la receta didáctica son cientos de pasos (6.5 corre 64 brotes); el modo libre no corre a Bruto |
| Los animales tapan lo que se lee | Capa por debajo de carteles y botones, sin zonas de toque; los puntos de reposo evitan `taken`; si no hay hueco, no aparecen |
| El portapapeles está bloqueado (permiso, `http`) | El código queda seleccionado en un campo de solo lectura para copiarlo a mano |
| El JSON exportado con id `9.1` se copia tal cual a `levels/data/` | `draft: true` lo oculta fuera del modo profesor y el README dice que hay que darle id; `check-levels` lo validaría igual |
| Guardado v5 pierde algo | Migración con test desde v1–v4 |

## Preguntas abiertas (con el valor por defecto recomendado)

1. **¿Cuándo aparece el modo libre en el hub?** Por defecto al terminar el capítulo 1, con las acciones ganadas; en modo profesor, siempre; desde el epílogo, siempre. Alternativa: solo tras 7.5 (lo que sugiere §6).
2. **¿Una flor secreta por capítulo o dos?** Por defecto una (§7.9), siete en total, ninguna en el Huerto.
3. **¿Qué estrellas abren cada flor?** Por defecto las del capítulo: completarlo y la mitad de sus extras (tabla de 1.1), escritas en su JSON. Alternativa: un umbral de estrellas totales.
4. **¿Dónde se esconden?** Por defecto en el poste del cartel de su capítulo, con capullo visible mientras faltan estrellas (y el aviso de cuántas). Alternativa: invisibles hasta abrirse.
5. **¿Gastar o umbrales?** Por defecto umbrales (sección 1.2): nada se gasta ni se pierde.
6. **¿Qué cosméticos?** Por defecto los siete de 1.2 más las plantas de semilla, todos de Ninja Adventure o por código; ninguno en el lecho que ocupan las piezas de los capítulos.
7. **¿Las apuestas de las carreras de 6.5 dan semilla?** Por defecto sí (son apuestas; §5.1 no distingue). La informal de 0.4, no.
8. **¿Dónde va "Exportar registro de prueba"?** Por defecto al panel de ajustes, para dejar sitio al contador y al cartel del modo libre.
9. **¿2.5 enseña los dos jardines por separado antes de superponer?** Por defecto no: se predice sobre la maraña antes de separarla, con las vistas que ya existen. Alternativa: una vista lado a lado nueva (como 4.11).
10. **¿4.13 obliga a plegar en un orden concreto?** Por defecto no: Sauce cuenta la duda y te invita a probarla y la solución de referencia pliega en el orden "equivocado"; obligar exigiría reglas nuevas.
11. **¿Carrera contra Bruto en el modo libre?** Por defecto no (§5.7 no la pide); si se quisiera, `race` del núcleo ya la da y el límite de 24 brotes la mantendría en el presupuesto de 6.5.
12. **¿Límites del editor?** Por defecto 24 brotes (7.5 tiene 22), 40 enredaderas y 18 px entre brotes.
13. **¿Niebla o abejas y flores dibujadas en el editor?** Por defecto sin niebla; abejas y flores solo en el generador que las crea (para que se vean los espantapájaros), no como herramienta a mano.
14. **¿El modo libre escribe en el registro de prueba?** Por defecto no: el registro es para los niveles del playtest.
15. **¿Qué id lleva el JSON exportado?** Por defecto `9.1` con `draft: true` (todas las acciones, ningún capítulo real); al pasarlo a `levels/data/` se le da su id.
