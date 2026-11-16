# Plan 11 — El jugador que llega por primera vez

> Alcance: los defectos de la auditoría del 2026-11-14 sobre la versión 1.1.0, hecha pensando en una persona no técnica que juega por primera vez: las estrellas, los bugs de comportamiento, la fricción de la interfaz y los sitios donde el juego se puede ganar sin pensar lo que el nivel enseña. Tres tandas: **I** bugs y estrellas, **II** fricción, **III** pedagogía.
> Fuera de alcance: arte, música o sonido nuevos; la traducción al inglés; el video; los playtests con personas (solo se actualizan los hechos de los protocolos); el modo libre, salvo donde comparte código; el merge a `main` y el tag, que son del autor.
> Referencias: `docs/GDD.md` (§2, §3.3, §5.1–§5.5, §7), `docs/plans/10-pedagogy.md` (la regla de cadena por nivel, la luz, las pistas, la hoja de líneas), `docs/review/pedagogia.md`, las reglas del proyecto.

---

## 0. Criterios globales

Los del Plan 10, sin cambios: el núcleo es la única fuente de las reglas y lo que un nivel exige es dato del nivel; TDD estricto (primero el test que falla por la razón que da el inventario); cada cambio de diseño lleva antes su commit `docs:` del GDD; todo texto visible vive en `src/content/es/`; un archivo, una responsabilidad, ≤ 1000 líneas (`levelSession.ts`, `levelController.ts` y `LevelScene.ts` no crecen: lo nuevo entra en archivos pequeños y puros); sin dependencias nuevas; commits atómicos en inglés, en `develop`.

- **Toda línea nueva o cambiada pasa por la hoja del autor.** La fase 0 crea `docs/review/lineas-plan11.md` contra las copias de `v1.1.0`, como hizo la fase 0 del Plan 10. Las frases de este plan son **borradores**.
- **Cada nivel exige el gesto que enseña, probado** con el recorrido exhaustivo que ya existe (`lightChecks`, `chainChecks`, `flowerChecks`): sin el gesto no se gana; con él, sí.
- **Las fases van de una en una**, en el orden de «Orden». Las fases no abren navegador ni servidor: verifican con tests. Al cerrar cada tanda, la sesión principal revisa en pantalla la lista del hito, con **un solo** navegador headless, que apaga al terminar.
- **Si una fase descubre que algo contradice el GDD y no está en «Commits del GDD», o que un arreglo pide una decisión de diseño que este plan no tomó, se detiene y lo informa.**

Definición de «hecho» de cada fase: lint, format:check, typecheck, coverage ≥ 95 %, check-levels, build, `npm run budget` tras el build, y `npm run lines` con la hoja regenerada en el mismo commit que las líneas.

---

## 1. Inventario

**Origen:** P = visto en pantalla por la sesión que auditó (0.1, 0.2, 0.4, 1.1, 1.3, 3.1, 4.5); S = comprobado con un script contra el núcleo o el controlador; L = leído en el código o los datos.

### Tanda I — Bugs y estrellas

| # | Qué | Evidencia | Decisión | Fase |
|---|---|---|---|---|
| B1 | El panel de victoria dibuja siempre 3 huecos; 52 de 62 niveles dan 2 como mucho | P. `view/VictoryPanel.ts` `MAX_STARS = 3`; `levels/starsCeiling.ts` (2 + agua + apuesta formal) | Tantos huecos como `starsCeiling` del nivel | F2 |
| B2 | Nadie dice para qué es cada estrella; una apuesta fallada cuesta la suya y no se avisa | L. Único texto: `victory.stars`; `StarResult.noHints` y `withinWater` no se muestran | Un renglón por estrella en el panel («Jardín iluminado», «Sin pistas», «Con el agua justa», «Apuesta acertada»), ganada o no | F2 |
| B3 | `stars` admite 3 como mucho en el guardado: un nivel con agua y apuesta daría 4 y el guardado entero se descartaría | L. `services/save.ts:17` | Test `starsCeiling ≤` el máximo del esquema sobre todo el catálogo | F2 |
| B4 | El toque que cierra un cartel (última línea de un diálogo, «Entendido», una respuesta, «Siguiente jardín») también actúa sobre el jardín: apaga un farol, gasta agua, pone una piedra | S. `scenes/level/levelInput.ts:54-71` despacha `release` sin `press` previo | Solo se despacha el `release` que casa con un `press` despachado (mismo puntero) | F1 |
| B5 | Soltar un arrastre fuera del lienzo deja la cadena colgada | L. No se escucha `pointerupoutside` (el modo libre sí) | Tratarlo como soltar sin cadena | F1 |
| B6 | «Este jardín puede encender 1 faroles»: la primera frase del juego; también en `bet.revealRight/Wrong` | P. `hud.goal` no pluraliza | Texto sin plural: «Faroles que caben aquí: {count}»; revelaciones con forma singular y plural | F3 |
| B7 | Textos que no dicen la verdad: 1.4 nombra a Eli sea quien sea el apagado; 1.2 «tres pases» (son dos y una unión); 7.1 «tres espantapájaros» aunque se gane con cuatro | S, L. `ch1.4.sauce.00`, `ch1.2.sauce.00`, líneas de cierre de 7.1 | 1.4: «Alguien se quedó sin luz para que otro la tuviera…»; 1.2: «dos pases y un farol nuevo»; 7.1: la línea no cuenta, o la victoria exige el mínimo (lo que pida menos cambio) | F3 |
| B8 | Pistas falsas: 6.3 resalta h y R como «soles del mismo árbol» (h es luna; el choque es b–d); 5.2 dice «flor grande» donde es la mediana; 5.1 «¿Quién es sol dos veces?» (nadie) | S. `ch6.3.sauce.06`, `ch5.2.sauce.02`, `ch5.1.sauce.01` | 6.3 resalta b, d; 5.2 con el texto de 5.6; 5.1: «La flor pequeña ya brilla como un sol. ¿Toca a otro sol?» | F3 |
| B9 | En un paso de pregunta salen las pistas escritas para jugar (7.2: «pulsa Presentar»), cuestan la estrella, y la tarjeta invita: «Si dudas, pulsa Pista» | S. `levelSession.ts` `HINT_STEPS`; `hintContent.ts` no mira el paso | `hints` opcional por paso en el JSON; un paso que no es `play` y no trae pistas propias no ofrece Pista; la tarjeta deja de invitar | F4 |
| B10 | Tras tres pistas el botón muere para todo el nivel; en los niveles de varias rondas las pistas solo hablan del principio; los 90 s corren mientras se lee | L. `hints.ts:71` | La pista de grado 3 se puede repetir; el cupo se reinicia con cada paso del guion y tras cada cadena encendida; el reloj se para con diálogo o tarjeta abiertos | F4 |
| B11 | Salir pierde la victoria: el nivel solo se guarda al acabar el guion; Esc con diálogo, pregunta o Cuaderno abiertos abandona el nivel; «Volver» no confirma | L. `LevelScene.ts` `leave()`, `input/escape.ts` | Esc avanza o cierra primero lo abierto; «Volver» con jugadas hechas pide una segunda pulsación con un aviso | F5 |
| B12 | «Deshacer» borra la búsqueda de la luz o del jardinero (4.1, 7.4) | S. `levelSession.ts:380,387` | Suelo del historial donde empieza el `play` | F5 |
| B13 | Deshacer devuelve la niebla y no el agua, y nadie lo dice; no hay forma de reiniciar | L. `levelSession.ts:314` | Botón «Reiniciar» (en la barra si cabe; si no, en los ajustes dentro de un nivel) y una frase en `tutorial.inspect.body` | F5 |
| B14 | Dos pestañas se pisan el guardado; un guardado ilegible se sobrescribe sin copia; los avisos duran 2,6 s aunque tengan 130 caracteres | L. `saveStore.ts`, `save.ts:119-129`, `ToastView.ts:14` | Releer antes de escribir (o escuchar `storage`); copia en `florecer.save.bak`; duración según la longitud | F6 |

### Tanda II — Fricción

| # | Qué | Evidencia | Decisión | Fase |
|---|---|---|---|---|
| U1 | El diálogo solo avanza tocando dentro del cartel; fuera no pasa nada y el jardín queda bloqueado en silencio | P (1.3) | Un toque en cualquier sitio avanza el diálogo (sin actuar sobre el jardín: B4) | F7 |
| U2 | El cartel de diálogo tapa brotes de los que habla (X, Y en 1.3; d en 4.5; R en 3.1); el panel de victoria cae al instante sobre lo recién encendido (0.1) | P | El diálogo usa la colocación automática que ya existe para los paneles (`panelPlacement`), con el jardín entero como zona a respetar cuando cabe; el panel de victoria espera a que acabe la animación y se coloca fuera del jardín si cabe | F7 |
| U3 | La tarjeta de la mecánica sale antes que la historia: en 0.1, lo primero son «brote», «enredadera», «a oscuras», «vecino» sobre un jardín que aún no se ve | P | Si el nivel abre con `say`, las tarjetas salen después de ese `say` | F7 |
| U4 | Herramienta inicial siempre Faroles; nada cambia sola. En 4.5: la enredadera que brilla no responde con Faroles; tras abrir la flor con Marcas, arrastrar responde «Hoy no se puede poner soles en este jardín» | P. `levelController.ts:196`, `liftInput.ts:58`, `input/intent.ts` | En los niveles `light`, tocar el choque o una flor cerrada y arrastrar el tramo funcionan con cualquier herramienta. En los demás, el nivel empieza con la herramienta de la primera jugada de su `solution` | F8 |
| U5 | Rechazos que no nombran la herramienta que sí sirve (`vineHidden`, `notInTheDark`, `noFog`, `chainNotSeen`, `actionClosed`…) y toques que no dicen nada (Faroles sobre enredadera apagada) | L, P | Cada motivo que nace de la herramienta equivocada añade «Prueba con {tool}»; los toques mudos reciben un motivo | F8 |
| U6 | La barra acumula herramientas que el nivel no usa (Inspeccionar sin niebla, Espantapájaros fuera de los certificados, Capas, «Terminé» donde no gana nada) | P (4.5), S (`availableTools`) | La barra muestra solo lo que el nivel puede usar, derivado de sus datos (niebla, victoria, flores, `forbid`) | F8 |
| U7 | La luz se para sin señal: uno se entera pulsando otra vez y recibiendo un rechazo, con su sonido, que además cuenta para las pistas | P (4.5). `levelController.ts:247` | La parada es un estado, no un rechazo: el botón se apaga y dice por qué se paró (flor, niebla, cadena, fin). Qué se señala lo decide F12 | F9 |
| U8 | Sin título ni entrada: se aterriza en 57 botones numerados; tocar un nivel cerrado no dice nada; los botones se mueven al ganar estrellas | P. `HubScene.ts:98-99`; `hub.locked` existe y no se usa | Con el guardado vacío, una pantalla de título («Florecer», «Toca para empezar») que lleva a 0.1; en el hub, el siguiente nivel por jugar late; un nivel cerrado responde con `hub.locked`; el ancho del botón no cambia con las estrellas | F10 |
| U9 | Sauce dice Ana, Beto, Cleo, Hortensia, Sami, Elo; en pantalla solo hay letras | P, L | En 0.4 y 1.1–1.4 el rótulo es el nombre entero si las comprobaciones de disposición lo admiten; desde el capítulo 3 las líneas dicen la letra. Un check: todo nombre propio de una línea es un rótulo de su nivel | F11 |
| U10 | Vocabulario: «hilo» con dos sentidos (2.1–2.2); «agua» es el rival (cap. 2) y las gotas (cap. 3); «flor cerrada» es plegada y también no plegable (4.10, `reason.flowerClosed`); «base» se pregunta en 4.7 antes de presentarse; sol y luna nunca se explican; «el mentor», «k», «g − k», «tenéis», «solitario», «explorar» | L | «hilo» solo la pieza; el rival es «el reflejo» y el agua del cap. 3 son «gotas»; 4.10 dice «ese bucle no se pliega hoy»; «base» se presenta en 4.6; el cierre de 3.1 liga sol y luna con «mano libre» y «pidiendo»; el resto, palabra por palabra. `tests/vocabulary.test.ts` lo fija | F11 |
| U11 | 1.1: tras caer en la trampa, el gesto natural responde «Hoy no se puede pasar el farol», una mecánica que aún no existe; apagar un farol nunca hizo falta antes | P | En 1.1 ese gesto responde `alreadyLit`; la pista 1 dice que un farol encendido se puede apagar tocándolo | F11 |
| U12 | `hud.council` no dice cuándo cuadra y enseña restas falsas al recortar a 0 | L. `picture/council.ts` | «Grupos impares 3 − piedras 1 = 2 a oscuras como poco. Hay 2: cuadra.» / «…Hay 3: aún no prueba nada.» | F11 |

### Tanda III — Pedagogía

| # | Qué | Evidencia | Decisión | Fase |
|---|---|---|---|---|
| T1 | El capítulo 0 no se puede fallar: 0.2 y 0.4 acaban con el primer farol, y «un farol es para dos» lo dice Sauce | P (0.4: aposté 3 y no pude intentar el segundo) | Tras el primer farol, Sauce pregunta «¿Cabe otro? Pruébalo», y el nivel se gana con el primer intento rechazado por `alreadyLit` (dato nuevo del paso `play`) | F12a |
| T2 | El Invernadero se gana sin poner un sol: 3.1, 3.2, 3.4, 3.5, 3.9, 3.10 con vistazos y un arrastre; 3.8 sin buscar; 3.3 acaba sin vivir «ya visitado» y con niebla sin mirar. 4.3 y 4.13 se ganan arrastrando la cadena | S | `chains: seen` en 3.1, 3.2, 3.4, 3.5, 3.9, 3.10, 4.3 y 4.13 (4.13 sigue con marcas a mano); 3.8 exige la búsqueda acabada (`claim.searchNotOver`); 3.3 se gana con «Terminé» y la búsqueda agotada, y `reason.alreadyMarked` deja de dictar la respuesta | F13 |
| T3 | El agua del capítulo 3 no se puede gastar de más (presupuesto ≥ brotes, y no se inspecciona dos veces); en 4.12 y 5.5 el margen es una gota | S | Presupuesto = mínimo de vistazos que el recorrido exhaustivo encuentra con la regla nueva, + 2. Las líneas de 3.5 vuelven a ser verdad | F13 |
| T4 | En los niveles de luz el jugador obedece: el mensaje nombra los dos soles, la enredadera brilla y dice qué herramienta usar | P (4.5), L (`reason.lightAtFlower`) | La luz se para y **no señala**: «Tu luz se ha parado. ¿Dónde se tocan dos soles del mismo árbol?». El jugador toca la enredadera; el error ya tiene su motivo; el brillo pasa a la pista de grado 2. Desde 4.6, antes de avanzar, una apuesta de un toque: «¿En qué enredadera se parará tu luz?» (`pickVine`) | F12b |
| T5 | El plegado lo afirma Sauce antes de jugarlo (`ch4.4.sauce.01`) | L | 4.4 abre con una pregunta sobre el jardín de 4.2: «Si cualquiera del bucle puede ser sol, ¿desde cuáles tiene que seguir mirando la luz?» → «Desde todos», con contraejemplo jugable; la línea 01 pasa a ser la respuesta al acierto | F14 |
| T6 | Ningún nivel grande de los capítulos 4–5 acaba con alguien a oscuras: «Terminé» nunca pide fiarse de una búsqueda con flores que fracasa (solo 4.9, 5 brotes) | S (Edmonds: 4.12, 4.13, 5.4, 5.5, 5.6 son perfectos) | Un brote colgante en 4.12 y en 5.4, de modo que la última ronda acaba en «Tu luz ya miró todas las enredaderas» con alguien a oscuras | F14 |
| T7 | 3.1 estrena a la vez niebla, gotas, inspeccionar, soles, lunas y abejas/tréboles, con dos tarjetas seguidas; 2.4 pide construir a mano, dos veces, un máximo de 16 brotes | P (3.1), L | 3.1 en dos pasos de juego dentro del mismo nivel (primero solo mirar; después marcar), cada tarjeta al empezar su paso. 2.4: el borrador empieza con los faroles del jugador en plateado; el Cuaderno responde a «tres intentos»: «Tres intentos no prueban nada. Lo que lo prueba es que ya no queda ninguna cadena.» | F14 |
| T8 | La receta de 6.1 no tiene tarjeta para abrir flores; los distractores se delatan por el formato; en el capítulo 6 se mira mucho y se decide poco; las semillas de 6.5 no se explican | L | La tarjeta de cadena dice «Abre las flores que cruza, de fuera hacia dentro, por el lado que alterna»; distractores con el mismo formato; apuesta informal antes de mirar en 6.3, 6.4 y 6.7; una línea sobre las semillas | F15 |
| T9 | Redacción que confunde: 4.7 «por donde la luz sale» (la cadena sale por otro pétalo); 4.10 y 3.3 con Cuaderno que repite a Sauce; 5.1 y 5.3 «entró por…, salió por…» solo vale leyendo desde el otro extremo; 4.9 y 7.5 pasan a marcar a mano sin decirlo; 7.4 `claim.notTheMoons` da la respuesta al primer fallo | L | Las frases del Apéndice A | F15 |

---

## Fases

### Tanda I

- **Fase 0 — La hoja.** `docs/review/lineas-plan11.md`, generada por `npm run lines` contra las copias de `v1.1.0`.
- **Fase 1 — El toque fantasma (B4, B5).** Test primero sobre `bindLevelInput`: un `release` sin `press` no llega al controlador.
- **Fase 2 — Las estrellas (B1, B2, B3).** `victoryLayout` crece con los renglones; `screenFit` y `victoryLayout.test.ts` lo prueban a 480 × 270 con el caso de cuatro renglones. GDD §5.4.
- **Fase 3 — Textos y pistas que mienten (B6, B7, B8).** Un check de integridad nuevo: el brote que una pista resalta como sol es sol en el estado donde la pista se ofrece (al menos en 6.3).
- **Fase 4 — Pistas por paso (B9, B10).** Esquema, `hintContent`, `hints.ts`, `hintChecks`. GDD §5.3.
- **Fase 5 — Salir, deshacer, reiniciar (B11, B12, B13).** `panelFit` / `bottomRows` deciden dónde va «Reiniciar». GDD §5.2.
- **Fase 6 — Guardado y avisos (B14).**

**Hito I (pantalla):** 0.1 de principio a fin (estrellas, plural, toque tras el diálogo); 3.1 (deshacer y reiniciar con agua); 7.2 (Pista en la pregunta); salir a medias de 1.5.

### Tanda II

- **Fase 7 — Diálogo, tarjetas y victoria que no estorban (U1, U2, U3).**
- **Fase 8 — Herramientas (U4, U5, U6).** Recorrer con `playability` que ninguna solución de referencia deja de poder jugarse con la barra reducida.
- **Fase 9 — La parada de la luz como estado (U7).** Solo el estado y el botón; lo que se señala no cambia aún.
- **Fase 10 — Entrada y hub (U8).** GDD §6 (donde se describe el hub) y §5.11 para el orden de las tarjetas de F7. La pantalla de título no usa arte nuevo.
- **Fase 11 — Nombres y palabras (U9, U10, U11, U12).** GDD §3.3.

**Hito II (pantalla):** arranque con guardado vacío; hub; 1.1 con la trampa; 1.3 (diálogo y X, Y a la vista); 4.5 entero sin cambiar de herramienta a mano; 4.12 (barra, paradas).

### Tanda III

- **Fase 12a — Un fallo amable en el Huerto (T1).** GDD §7 0.2 y 0.4.
- **Fase 12b — Predecir la parada (T4).** GDD §5.1 y §7 4.4–4.8, 5.x. Las pistas de grado 2 de esos niveles pasan a ser el brillo.
- **Fase 13 — El Invernadero obliga a buscar (T2, T3).** GDD §7 capítulo 3, 4.3, 4.13. Si algún presupuesto de agua no se puede calcular con el recorrido en un tiempo razonable, se acota y se dice.
- **Fase 14 — Niveles que cambian (T5, T6, T7).** GDD §7 2.4, 3.1, 4.4, 4.12, 5.4. `check-levels`, `secretChecks` y los umbrales de estrellas se recalculan.
- **Fase 15 — Receta, capítulo 6 y redacción (T8, T9).** GDD §7 6.1, 6.3, 6.4, 6.7.
- **Fase 16 — Cierre.** Protocolos A, B y C con los hechos nuevos (sin tocar umbrales), README, versión `1.2.0`, «Cierre del plan» con lo hecho, la suite y lo que queda del autor. Sin merge a `main` ni tag.

**Hito III (pantalla):** 0.2 y 0.4; 3.1 en sus dos pasos; 3.5 con el agua justa; 4.4 → 4.6 con la pregunta, la parada sin señal y la apuesta; 4.12 hasta «Terminé» con un brote a oscuras; 6.1; 6.3.

---

## Orden

```
F0 → F1 → F2 → F3 → F4 → F5 → F6 → [H I] → F7 → F8 → F9 → F10 → F11 → [H II] → F12a → F12b → F13 → F14 → F15 → F16 → [H III]
```

F1 antes de F7 (un toque en cualquier sitio avanza el diálogo sin tocar el jardín). F4 antes de F12b y F13 (pistas por paso). F8 y F9 antes de F12b (la parada como estado y el toque con cualquier herramienta). F13 antes de F14 (4.12 y 5.4 recalculan agua y umbrales una sola vez, con la regla ya puesta). Cada tanda deja `develop` en verde y se puede publicar sola.

## Commits del GDD

| # | Sección | Cambio | Fase |
|---|---|---|---|
| G1 | §5.4 | Cada nivel muestra las estrellas que puede dar, y dice de qué es cada una | F2 |
| G2 | §5.3 | Pistas por paso; la de grado 3 se repite; el reloj se para al leer | F4 |
| G3 | §5.2 | Reiniciar; salir con aviso; el suelo de Deshacer | F5 |
| G4 | §5.1 | Herramienta que el nivel elige al empezar; en los niveles de luz, tocar y arrastrar no dependen de la herramienta; la barra enseña solo lo que el nivel usa | F8 |
| G5 | §5.1 (la luz) | La parada es un estado del botón; desde F12b, no señala, y desde 4.6 se apuesta dónde parará | F9, F12b |
| G6 | hub | Pantalla de título, nivel siguiente, nivel cerrado | F10 |
| G7 | §3.3 | Hilo, reflejo, gotas, bucle que no se pliega, nombres de los brotes | F11 |
| G8 | §7 | 0.2, 0.4; capítulo 3 (regla, agua, 3.1 en dos pasos, 3.3, 3.8); 2.4; 4.3, 4.4, 4.12, 4.13; 5.4; 6.1, 6.3, 6.4, 6.7 | F12a–F15 |

## Decisiones

- **Las estrellas no cambian de reglas:** cada nivel enseña las que puede dar. No se inventa una tercera para los niveles de dos.
- **El Invernadero usa la regla `seen` que ya existe**, no una nueva.
- **La predicción de la luz se apoya en `pickVine`**, que ya existe, y el error no cuesta nada: enseña la respuesta y sigue.
- **Ningún nivel nuevo.** 3.1 se parte en pasos dentro del mismo nivel, para no renumerar ni migrar guardados.
- **Una marca por pulsación sigue en pie** (decisión del autor del 2026-10-19); ver pregunta 1.

## Preguntas abiertas (no bloquean; cada una tiene su valor por defecto)

1. 4.12 y 5.5 piden unas 55 y 94 pulsaciones, la mitad paradas. ¿Que una pulsación larga, o un segundo botón, lleve la luz hasta la siguiente decisión? Por defecto: no se toca.
2. U9: ¿nombres enteros en los rótulos del Prado, o letras en las líneas? Por defecto: nombres donde quepan.
3. B7, 7.1: ¿la victoria exige el mínimo de espantapájaros, o la línea deja de contarlos? Por defecto: la línea.
4. 1.9 (maestría) va después de «Ven al estanque» (1.8). ¿Se intercambian? Por defecto: no se toca.
5. T6: el brote colgante cambia el dibujo de 4.12 y 5.4. Por defecto: se añade donde las comprobaciones de disposición lo admitan sin mover lo demás.

---

## Apéndice A — Borradores de líneas

**F2.** `victory.star.done`: «Jardín iluminado» · `victory.star.noHints`: «Sin pistas» · `victory.star.water`: «Con el agua justa» · `victory.star.bet`: «Apuesta acertada».
**F3.** `hud.goal`: «Faroles que caben aquí: {count}» · `ch1.4.sauce.00`: «Alguien se quedó sin luz para que otro la tuviera. Cambiaste una tristeza por otra. Una cadena de verdad termina en alguien que estaba a oscuras.» · `ch1.2.sauce.00`: «Mira otra forma de verlo: dos pases y un farol nuevo, y al final había sitio para uno más. Eso es una cadena.» · `ch5.1.sauce.01`: «La flor pequeña ya brilla como un sol. ¿Toca a otro sol?»
**F4.** `tutorial.question.body`: «Cuando el jardín te pregunte algo, toca la respuesta que elijas. Equivocarse no cuesta nada.»
**F5.** `hud.restart`: «Reiniciar» · `leave.confirm`: «Si sales ahora, este jardín empieza de nuevo. Pulsa otra vez para salir.» · `tutorial.inspect.body` añade: «Deshacer devuelve la niebla, pero no la gota.»
**F8.** Sufijo «Prueba con {tool}.» · `reason.darkVine`: «Esa enredadera está apagada. Para encender un farol, toca un brote a oscuras y luego a su vecino.»
**F9.** `hud.light.flower`: «Tu luz se ha parado» · `hud.light.found`: «Tu luz encontró una cadena» · `hud.light.done`: «Tu luz ya lo miró todo» · `hud.light.fog`: «La niebla para tu luz».
**F10.** `title.start`: «Toca para empezar».
**F11.** `ch1.1.sauce.01`: «Beto y Cleo ya tienen farol. Un farol encendido también se puede apagar: tócalo.» · `ch3.1.sauce.05`: «A quien sale con la mano libre le pusiste un sol. A quien llegaste pidiendo, una luna. Y al final alguien estaba solo: esa era tu cadena.» · `ch4.10.sauce.00`: «Hoy el bucle b‑c‑d no se puede plegar…» · `reason.flowerClosed`: «Hoy ese bucle no se pliega: una cadena solo puede pasar por él si empieza o acaba en su base.» · 4.6, tras ganar: «A ese pétalo, el que tiene su farol fuera de la flor, lo llamaremos base.» · `ch6.6.notebook.14`: «Sauce» en lugar de «el mentor» · 3.8: «Si unos cuantos espantapájaros…» en lugar de «k».
**F12a.** 0.2 y 0.4, tras el primer farol: «¿Cabe otro farol? Pruébalo.»
**F12b.** `reason.lightAtFlower`: «Tu luz se ha parado. ¿Dónde se tocan dos soles del mismo árbol? Toca esa enredadera.» · apuesta: «Antes de avanzar: ¿en qué enredadera se parará tu luz?»
**F13.** `reason.alreadyMarked`: «{vertex} ya tiene su marca.» · `ch3.5.sauce.00`: «Hoy las gotas vienen contadas. No mires por mirar: mira solo a quien tiene sol.» · `ch3.8.sauce.05`: «…Y aquí tu luz llegó a todos los brotes: por eso no queda enredadera sin vigilar.»
**F14.** 4.4: «Si cualquiera del bucle puede ser sol, ¿desde cuáles tiene que seguir mirando tu luz?» — «Desde todos» ✔ / «Solo desde el primero que encontró» ✘ (contraejemplo) / «Desde ninguno» ✘ · 2.4: «Tres intentos no prueban nada. Lo que lo prueba es que ya no queda ninguna cadena.»
**F15.** `recipe.card.chainRootToRoot`: «Si x es sol de otro árbol: cadena de un brote a oscuras a otro. Abre las flores que cruza, de fuera hacia dentro, por el lado que alterna; pasa los faroles y vuelve al paso 1.» · `ch4.7.sauce.00`: «…fíjate en qué pétalo tiene su farol fuera de la flor.» · Cuaderno de 4.7, correcta: «…el único pétalo sin pareja dentro de la flor: su farol va hacia fuera, o no tiene.» · `ch4.10.sauce.01`: «Cuando una flor te estorba, prueba a mover los faroles del tallo.» · 4.11, correcta: «…no cambia la respuesta: si había cadena, sigue habiéndola; si no, no aparece ninguna.» · `ch5.1.sauce.04` / `ch5.3.sauce.04`: «La cadena toca la flor pequeña en dos pétalos; entre los dos, solo una vuelta alterna.» · `ch4.9.sauce.00`: «Hoy buscas tú, con Marcas, como en el Invernadero…» · `ch7.5.sauce.01` añade «Busca tú, con Marcas.» · `claim.notTheMoons`, primer fallo: «Esas piedras todavía no prueban nada. ¿Qué te dejó la búsqueda en cada brote?»

---

## Cierre del plan

**Hecho (2026-11-16).** Las dieciocho fases, F0–F16. Se ejecutaron en este orden, que respeta las dependencias de «Orden»: F0, F1, F2, F1 bis, F6, F3, F10, F15, F4, F11, F7, F5, F12a, F8, F13, F9, F12b, F14 y F16. Versión `1.2.0` en `package.json`; el merge a `main` y el tag `v1.2.0` quedan para el autor.

- **F0.** La hoja `docs/review/lineas-plan11.md`, generada por `npm run lines` contra las copias de `v1.1.0`.
- **F1 (B4, B5).** Solo llega al jardín el `release` que casa con un `press` despachado del mismo puntero, y soltar fuera del lienzo acaba el arrastre sin cadena. **F1 bis:** el mismo arreglo en la pantalla de contraejemplo del modo libre (`CounterexampleScene`), que compartía el defecto; su entrada salió de la escena a un archivo propio.
- **F2 (B1–B3).** El panel de victoria dibuja tantos huecos como `starsCeiling` y un renglón por estrella, ganada o no («Jardín iluminado», «Sin pistas», «Con el agua justa», «Apuesta acertada»); `StarResult` dice si la apuesta formal se acertó. Un test comprueba que el guardado admite el máximo de estrellas de cualquier nivel. Desviación: **el recuento «Estrellas: N» se quitó** (los renglones lo sustituyen), recomendación del auditor sin respuesta del autor.
- **F3 (B6–B8).** «Faroles que caben aquí: {count}» y las revelaciones de apuesta con singular; las líneas de 1.2, 1.4, 5.1, 5.2 y 7.1 dicen solo lo que su jardín tiene (7.1, pregunta 3 por defecto: la línea deja de contar espantapájaros); la pista de 6.3 resalta b y d, con un check nuevo: un brote que una pista resalta como sol lo es en el estado del paso que la ofrece.
- **F4 (B9, B10).** `hints` opcional por paso en el JSON; un paso que no es de juego solo ofrece Pista si trae las suyas, y la tarjeta de preguntas dejó de invitar a pedirla; la de grado 3 se repite; los grados vuelven a empezar con cada paso y tras cada cadena encendida; el reloj de los 90 s se para con diálogo o tarjeta abiertos.
- **F5 (B11–B13).** Suelo de Deshacer donde empieza el `play`; «Reiniciar» rellena el agua del paso; según `bottomRows` no cabía en la barra y **está en el panel de ajustes del nivel**; Esc avanza el diálogo y no abandona una pregunta; «Volver» con jugadas hechas avisa y sale a la segunda pulsación; salir con el paso ya ganado guarda la victoria; la tarjeta de Inspeccionar dice que la gota no vuelve.
- **F6 (B14).** El guardado se relee y se fusiona antes de cada escritura y escucha el evento `storage` de otra pestaña; un guardado ilegible se copia a `florecer.save.bak`; los avisos duran según su longitud (**14 caracteres por segundo, 10 s como mucho**) y los del hub se espacian para leerse uno tras otro.
- **F7 (U1–U3).** Un toque en cualquier sitio fuera de botones y paneles avanza el diálogo; la caja de diálogo prefiere no tapar el jardín y, si no puede, no tapa los brotes que nombran sus líneas (antes que las enredaderas); el panel de victoria espera a la última animación y se pone en el rincón que menos tapa; las tarjetas salen tras el `say` de apertura. Desviación: la caja conserva su ancho completo, así que **en 1.3 X e Y pueden quedar tapados**.
- **F8 (U4–U6).** La barra enseña solo lo que el nivel usa, derivado de sus datos; cada nivel empieza con la herramienta de la primera jugada de su `solution`; en los niveles de luz, tocar el choque, una flor cerrada y arrastrar funcionan con cualquier herramienta; un rechazo por la herramienta equivocada añade «Prueba con {tool}.» y la enredadera apagada tiene su motivo (`reason.darkVine`).
- **F9 (U7).** La parada de la luz es un estado: el botón se apaga, dice por qué (`hud.light.*`), lo que la para se cuenta una vez, y pulsarlo apagado no hace nada (ni rechazo ni cuenta para las pistas).
- **F10 (U8).** Pantalla de título con el guardado vacío, el siguiente nivel late en el hub, un nivel cerrado dice «Todavía cerrado», y el botón de un nivel ya no se ensancha con las estrellas. Los enlaces con `?teacher`, `?level=` o `?garden=` **se saltan el título**.
- **F11 (U9–U12).** Pregunta 2 por defecto: nombres enteros en los rótulos de 0.4 y 1.1–1.4, letras desde 1.10 y el capítulo 3, con un check de que todo nombre propio de una línea es un rótulo de su nivel; «hilo» solo la pieza, el rival es «el reflejo», la niebla gasta «gotas»; el bucle de 4.10 «hoy no se pliega»; «base» al ganar 4.6; sol y luna atados a «mano libre» y «pidiendo» al cerrar 3.1; en 1.1 el gesto de la trampa responde `alreadyLit` y la pista 1 dice cómo apagar. Desviación: la cuenta del Consejo se acortó para caber («Impares 3 − piedras 1 = 2 como poco; hay 2: cuadra»), y nunca resta por debajo de cero.
- **F12a (T1).** 0.2 y 0.4 se ganan con el segundo farol rechazado (`alreadyLit`), dato nuevo del paso `play`; el recorrido de jugabilidad prueba jugadas que las reglas deben rechazar. Sauce dice «Un farol es para dos» justo después del rechazo.
- **F12b (T4).** La luz se para sin señalar; el brillo del choque es la pista de grado 2; apuesta de un toque (`pickVine`, que no cuesta nada y enseña la buena) en 4.6, 4.7, 4.8, 5.1–5.4 y 5.6, comprobada con el recorrido de la luz. No en 4.12 ni 5.5, donde la luz se para antes en la niebla.
- **F13 (T2, T3).** Regla `seen` en 3.1, 3.2, 3.4, 3.5, 3.9, 3.10, 4.3 y 4.13; una búsqueda en la niebla sigue abierta mientras quede un sol sin inspeccionar; 3.3 se gana con «Terminé» y la búsqueda agotada; 3.8 pide la búsqueda acabada (`claim.searchNotOver`). Gotas = mínimo del recorrido + 2: 3.1 → 5, 3.2 → 4, 3.3 → 7, 3.4 → 5, 3.5 → 9, 3.9 → 14, 3.10 → 6 (4.12 → 13 y 5.5 → 16). Desviaciones: el recorrido de **3.9** no acaba en tiempo razonable y su mínimo (12) se **acota**: la cota de abajo de 11 se comprueba y la gota más se argumenta, la de arriba la da la solución de referencia; y en **3.4** ganar con las gotas justas **no obliga a hacer dos árboles**.
- **F14 (T5–T7).** 4.4 abre con la pregunta (contraejemplo: el jardín de 4.1) y `ch4.4.sauce.01` es la respuesta al acierto; W colgante en 4.12 (de s) y en 5.4 (de a), sin mover los demás brotes (pregunta 5 por defecto); 3.1 en dos pasos con un paso `look` nuevo; 2.4 con el borrador en plateado y la frase (d) del Cuaderno.
- **F15 (T8, T9).** La tarjeta de cadena abre las flores; distractoras con la misma forma; apuestas informales de 6.3, 6.4 y 6.7 como pasos `ask` con todas las opciones buenas; una línea sobre las semillas en 6.5; las frases del Apéndice A para 4.7, 4.9, 4.10, 4.11, 5.1, 5.3 y 7.5; `claim.notTheMoons` ya no nombra las lunas.
- **F16.** Los protocolos A, B y C y el kit con los hechos nuevos, sin tocar umbrales; el README con lo nuevo de la 1.2.0; versión 1.2.0.

Las preguntas abiertas 1 (pulsación larga de la luz) y 4 (orden de 1.8 y 1.9) quedaron con su valor por defecto: no se tocó nada.

**Suite.** En local, al cerrar: lint, format:check, typecheck, check-levels, build y budget en verde; 6700 tests pasan (50 saltados: los de un solo nivel de luz que no aplican al resto). Con cobertura en la máquina cargada, siete tests pesados se pasan del tiempo; el CI de `develop` (con cobertura) está en verde en el último commit.

**Revisión en pantalla** (un solo navegador, 960 × 540): arranque con guardado vacío → título «Florecer / Toca para empezar» → 0.1; en 0.1 la primera línea sale antes de la tarjeta, la caja no tapa A ni B, la barra solo tiene Faroles, «Faroles que caben aquí: 1», un toque sobre A con el diálogo abierto solo avanza el diálogo, el panel de victoria tiene dos renglones y no tapa la enredadera; 0.2 pregunta «¿Cabe otro farol?», rechaza C–B y se gana tras «Un farol es para dos…»; hub con 0.3 brillando, botones de ancho fijo y «Todavía cerrado» en un nivel cerrado; 4.5 entero solo con Faroles (parada con el botón «Tu luz se ha parado» y sin brillo, pliegue tocando la enredadera, «Tu luz encontró una cadena», abrir la flor tocándola, arrastrar la cadena, «Tu luz ya lo miró todo»); aperturas de 4.4, 4.6 (tarjeta de señalar), 3.1 (paso de solo mirar con Inspeccionar y «Gotas: 0/5»), 7.2 (cuenta del Consejo «… = 1 como poco; hay 1: cuadra» cabe), 1.3 (rótulo «Sami») y 6.1. Visto de paso: el título del panel de victoria «¡Jardín iluminado!» repite el primer renglón; en 4.5 la caja de diálogo tapa d; en 1.3 la caja de arriba tapa a medias un brote de la fila de arriba; en 3.1 la caja roza el rótulo de R. No se jugaron en pantalla: 3.5, 4.12 hasta el final, 6.3, salir a medias de 1.5, Reiniciar y la pista en la pregunta de 7.2.

**Lo que es del autor:**

- Revisar `docs/review/lineas-plan11.md`: **152 casillas** (116 líneas de diálogo y 36 textos de interfaz distintos de la 1.1.0); los cambios entran en `lines.json` / `strings.json` en commits propios y la hoja se regenera.
- Confirmar o cambiar los valores por defecto de las preguntas abiertas 1–5 (arriba).
- Las preguntas que dejaron abiertas las fases:
  - **Estrellas:** cada nivel enseña solo las que puede dar y se quitó el recuento «Estrellas: N». El autor no respondió a la pregunta de las estrellas; se siguió la recomendación del auditor.
  - **B5:** soltar fuera del lienzo deja caer la cadena; es la lectura del auditor, no una decisión del autor.
  - El caso raro de una pulsación hecha durante una repetición o una carrera y soltada después de que acabe queda sin cubrir.
  - Los avisos se quedan 14 caracteres por segundo, 10 s como mucho: ¿son buenas cifras?
  - «Reiniciar» rellena el agua del paso: un posible atajo para la estrella del agua (mirar, reiniciar y jugar ya sabiendo).
  - 1.3: X e Y pueden seguir tapados por la caja de diálogo, que conserva su ancho completo.
  - El texto del Consejo se acortó para caber: «Impares 3 − piedras 1 = 2 como poco; hay 2: cuadra».
  - 0.2 y 0.4: el eco «un farol es para dos» llega justo después del rechazo, ¿sobra?
  - Las apuestas informales del capítulo 6 son pasos `ask`: el lector de pantalla dice «correcto» a cualquier respuesta.
  - 7.4: la respuesta a unas piedras que no son las lunas nunca escala hasta nombrarlas.
  - `ch4.7.sauce.04` y `.10` siguen diciendo «la luz sale».
  - 2.4: la pista de grado 1 se ofrece también en el paso de jugar.
  - 7.6: la pista de grado 3 promete un paso que el nivel no tiene.
  - Los conteos de 2.5 y 4.2 no tienen pistas.
  - 3.4: ganar con las gotas justas no obliga a hacer dos árboles.
  - 3.9: la cota del agua no es exacta (acotada, no recorrida).
  - El modo profesor se salta la pantalla de título.
  - La tarjeta `tutorial.pickVine` dice «puedes probar otra», que no es verdad en una apuesta de la luz.
  - Una apuesta de la luz acertada no dice nada.
  - 3.1: el paso de solo mirar responde a las marcas con «Hoy…» (acción cerrada), no con algo propio del paso.
  - 2.4: pulsar «Comprobar» tres veces acaba la fase (b), sea cual sea el dibujo.
- El hito III en pantalla, con todo visto: merge `develop → main` (con el CI de `develop` en verde), comprobar el despliegue y poner el tag `v1.2.0`.
- Siguen pendientes los umbrales de los playtests y los playtests con personas.
