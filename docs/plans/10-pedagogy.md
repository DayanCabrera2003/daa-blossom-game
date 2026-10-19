# Plan 10 — Arreglos pedagógicos

> Alcance: los diez problemas y los once arreglos rápidos de la revisión pedagógica independiente (`docs/review/pedagogia.md`, nota 7/10), con la decisión del autor: **(A)** los niveles de flor **exigen plegar**, cada uno exactamente el gesto que enseña, sin volver más estrictos los niveles anteriores ni el modo libre; **(B)** se arreglan **los diez problemas y todos los arreglos rápidos**. También la nota de la revisión sobre la flor secreta del Invernadero (§5) y dos agujeros que salieron al estudiar el código para este plan (ver inventario, filas X1 y X2).
> Fuera de alcance: niveles nuevos (2.4 cambia de jardín, no se añade ninguno), arte nuevo salvo un posible icono del deslizador del tiempo (pregunta 3), la traducción al inglés, los playtests con personas (el plan solo actualiza los hechos de los protocolos), el video. Las preguntas del Apéndice A del Plan 09 que este plan no toca siguen pendientes del autor.
> Referencias: `docs/review/pedagogia.md` (la revisión, copiada tal cual), `docs/GDD.md` (§1.1, §2 principios 1, 4, 6, 8 y 10, §3.3, §5.1–§5.5, §5.7, §5.10, §5.11, §7 capítulos 1–7, §7.9, §8, §10), `docs/plans/03-…` a `09-polish.md` (guion, Cuaderno, pistas, flores secretas, hoja de líneas de la fase 11 del Plan 09 y su Apéndice A), `docs/playtest/A.md`, `B.md`, `C.md`, las reglas del proyecto.

---

## 0. Criterios globales

- **El núcleo sigue siendo la única fuente de las reglas.** Lo que un nivel exige se escribe como **dato del nivel** (como hoy `roots`, `forbid` y `victory`) y lo hace cumplir `core/rules/`; el juego nunca decide por su cuenta si una cadena vale. El valor por defecto de todo dato nuevo deja el juego **exactamente como está** en los capítulos 0–3, 6–7, el modo libre y los contraejemplos.
- **Cada nivel exige el gesto que enseña, probado.** Para cada nivel de flor hay un test que recorre **todas** las jugadas que el nivel permite y comprueba que sin el gesto (plegar, girar el tallo, anidar) la victoria no se alcanza, y que con él sí. No basta con que la solución de referencia lo use.
- **TDD estricto.** Cada arreglo empieza por un test que falla con los datos de hoy por la razón que la revisión da (p. ej. "el Cuaderno de 4.11 repite `ch4.11.sauce.06`"): primero rojo sobre el catálogo actual, después el cambio, después verde.
- **Cada cambio de diseño, su commit del GDD.** Antes de la fase que lo implementa (o en ella, antes del código), el GDD se corrige en un commit `docs:` propio; la lista completa está en la sección "Commits del GDD". Si una fase descubre que algo contradice el GDD y no está en esa lista, se detiene y lo informa.
- **Toda línea nueva o cambiada pasa por la hoja del autor.** El autor quiere leer las líneas antes de publicar: la fase 0 crea `docs/review/lineas-plan10.md`, generada, con cada línea y texto nuevo o distinto de la versión 1.0.1 (antes / después, quién habla, casilla). Las frases de este plan (Apéndice A) son **borradores**: entran en `lines.json` / `strings.json` tal cual para que el juego funcione y los tests pasen, y el autor las corrige en la hoja antes de la versión 1.1.0.
- **Todo texto visible está en `src/content/es/`.** **Regla del vocabulario** sin excepción fuera del Códex y del panel del profesor; desde la fase 10, además, la lista de palabras retiradas (ver F10).
- **Una responsabilidad por archivo, ≤ 1000 líneas.** `levelSession.ts` (600 líneas), `levelController.ts` (497) y `LevelScene.ts` (437) no crecen con lógica nueva: lo nuevo entra por archivos pequeños y puros (`game/systems/claimVerdict.ts`, `progress.ts`, `liftGaps.ts`…).
- **Sin dependencias nuevas.**
- **Las fases se ejecutan de una en una**, en el orden de "Orden y dependencias". **Ninguna fase abre un navegador**, ni un servidor de desarrollo o de vista previa, ni hace capturas: verifica con tests. Al cerrar cada hito, la **sesión principal** revisa en pantalla lo que necesita ojos, con la lista del hito.

Definición de "hecho" de cada fase: la del Plan 03 (lint, format:check, typecheck, coverage ≥ 95 %, check-levels, build), más `npm run budget` tras el build en las fases que cambian lo que se empaqueta (2, 3, 4, 5, 7, 8, 9, 10, 12) y `npm run lines` (con `tests/lineSheet.test.ts` verde) en toda fase que toque `lines.json` o `strings.json`: la hoja regenerada va en el **mismo** commit que las líneas, porque el test falla si la hoja no está al día.

---

## 1. Inventario

Todo lo que la revisión pide, sin repetir, con su evidencia comprobada en el código, la decisión y la fase. **P** = problema de la revisión (§3), **R** = arreglo rápido (§4), **N** = nota (§5), **X** = encontrado al preparar este plan.

| # | Qué | Evidencia | Decisión | Fase |
|---|---|---|---|---|
| P1 | Plegar, desplegar y girar el tallo se pueden saltar: 4.5–4.8, 4.10, 5.1–5.3 (`matchingSize`) y 4.12, 5.4, 5.5 (`maximum`) se ganan dibujando la cadena a ojo | `core/rules/handlers/chain.ts` acepta cualquier camino aumentante o par; el trazo dice +1 / 0 / ilegal al arrastrar (`input/dragChain.ts` `chainGain`, `picture/garden.ts`); 4.10 usa el jardín de 4.1 y la cadena R–a=b–d=c–e memorizada da 3 | **Regla de cadena por nivel** (sección 2): en 4.5–4.8, 4.12, 4.13, 5.1–5.6 los faroles solo cambian por la cadena que encontraron las marcas; en 4.10 una cadena solo rodea la flor saliendo de su base a oscuras. Propuesta (c) también: desde el capítulo 3 el trazo dice solo si es legal; el +1 se ve al soltar. Propuesta (d) (más niebla en el capítulo 5) no hace falta con la regla | F1, F2 |
| X1 | Con la regla anterior sola, el agujero sigue abierto por **juntar, separar y pasar el farol**: en 4.5, separar a=b y c=d y juntar R–a, b–d, c–e da 3 faroles sin buscar; pasar el farol de e a c deja d a oscuras y la búsqueda desde R encuentra R–a=b–d sin plegar | `permissions.ts` desbloquea juntar y separar en 0.1 y pasar el farol en 1.1 para todos los niveles; nada los cierra en el capítulo 4 | Una unión (juntar) **es una cadena de una enredadera**: se juzga con la misma regla. En los niveles con la regla "por donde llegó tu luz", separar, pasar el farol, girar el tallo y las cadenas de ganancia 0 se cierran en el JSON (`forbid`), con un check de integridad que lo exige | F1 |
| X2 | En la niebla una cadena (y su trazo) puede pasar por enredaderas que la niebla todavía tapa: el arrastre "palpa" el jardín | `chain.ts` y `dragChain.ts` `extendChain` comprueban el jardín entero, no `revealed`; `markMoon` sí exige `revealed` | Una cadena en la niebla solo pasa por enredaderas visibles (motivo `vineHidden`, que ya existe) | F1 |
| P2 | 6 de 11 Cuadernos repiten la frase que Sauce acaba de decir (1.5, 2.4, 4.7, 4.10, 4.11, 5.3) | Pares de líneas en la revisión, comprobados en `lines.json`; además en 4.11 `ch4.11.sauce.01` dice tal cual la opción propuesta como reescritura | Check de integridad `notebookEcho`; el Cuaderno va **antes** de la línea que resume, que pasa a ser el `reply` del acierto; la opción correcta con otras palabras y un distractor que copia a medias a Sauce | F6 |
| P3 | «flor» con tres sentidos (lado del bipartito, blossom, nivel secreto) y «sol» con dos (deslizador, marca); «Terminé» con tres; `diagram.event.declareDone` afirma siempre que el jardín no puede mejorar | `ch3.1.sauce.00`, `ch3.10.sauce.00`, `hub.secret.*`, `hud.prompt.sun`, `ch6.2.sauce.01`, `strings.json` | La flor es solo el blossom. Nombres nuevos para el par bipartito, las flores secretas y el deslizador (preguntas 1–3); botón «Presentar» en los niveles de certificado (pregunta 4); `declareDone` dice que el jardinero lo **afirma** | F4 («Presentar», `declareDone`), F10 (nombres) |
| P4 | Un «Terminé» equivocado no recibe respuesta, y reinicia el reloj de pistas | `levelSession.ts` `act` (solo suma `claims.wrong`); `hints.ts` `afterAccepted` | Veredicto puro del reclamo, aviso suave sin decir dónde (salvo la enredadera sin vigilar de un certificado), cuenta como rechazo para las pistas | F4 |
| P5 | Las pistas no se ofrecen a quien tantea con jugadas legales; varias de grado 2 son la solución; 1.5–1.9 no tienen pistas propias | `hints.ts` (90 s sin jugada aceptada o 3 rechazos); `3-7`, `3-8`, `4-4`, `2-3`, `7-4`, `4-10` y los resaltados de la enredadera de plegar en 4.6–5.3; `1-5` … `1-9` sin `hints` | Progreso = señales que importan (récord de faroles, búsqueda que crece, flor plegada, cadena vista, niebla levantada, certificado que mejora); botón Pista siempre a mano (la oferta solo lo hace brillar); check `hintReveals` para el grado 2 y reescritura de los señalados; pistas para 1.5–1.9 | F5 |
| P6 | Los porqués los dice Sauce o el Códex: bipartito ⇒ dos soles del mismo árbol no se tocan (C5, C6); cadena entre árboles (3.4); puntas del hilo ganador a oscuras (2.3); lunas = piedras (monólogo `ch7.4.sauce.08`) | Líneas citadas; `ask` no admite contraejemplo (`levels/flow.ts`) | Preguntas `ask` con contraejemplo jugable (mismo motor que el Cuaderno) en 2.3, 3.4, 3.8 y 7.4; en 7.4 la línea 08 pasa a ser la respuesta | F7 |
| P7 | Levantar es redibujar toda la cadena; el orden de despliegue no se pone a prueba | Tras `unfold` el trazo hallado no se ve; la flor interior no se ve con la exterior cerrada | Tras desplegar, los tramos de fuera de la cadena hallada siguen dibujados y el jugador arrastra solo el tramo de dentro (elige el lado); pregunta de orden en 5.2 | F2 (gesto), F7 (pregunta) |
| P8 | La herramienta «Plegar» no es el plegado de los niveles; pliega cualquier flor fuera de una búsqueda, también sin tallo, contra `recipe.wrong.foldAnyLoop` y la Observación 8.4 de C8 | `tutorial.fold.body`, `handlers/fold.ts` | Los niveles ya no ofrecen «Plegar» (plegar = tocar el choque sol–sol); el modo libre lo conserva como «Plegar a mano» y solo con la base a oscuras (motivo que enseña) | F3 |
| P9 | La receta (6.1): «una sol–x» con el sustantivo elidido, «raíz» sin presentar, tarjeta muerta `chainToDark`, incoherencia «vuelve al paso 1» | `strings.json` `recipe.*`; C10 l. 39 | Textos reescritos; la tarjeta muerta sale de la receta (comprobado antes con una propiedad: la receta nunca usa ese caso) y su único efecto útil, «vuelve al paso 1», pasa a la tarjeta de cadena entre árboles | F9 |
| P10 | 2.4: consigna con doble negación; el jardín sí tiene cadenas; `mirror.spared` falso | `ch2.4.sauce.00`, `2-4.json`, `mirror.spared` | Dos fases: (a) «dibuja un reflejo que te gane» → cada vez, el hilo ganador es tu cadena; la usas; (b) en el mismo jardín ya sin cadena, «intenta ganarle» → imposible → «Sin cadena, nadie te gana» | F8 |
| R1 | 1.7 sin líneas | `1-7.json` sin `flow` | Un `say` tras ganar y un eco en 4.3 | F11 |
| R2 | 1.1 y 1.2: «Mira lo que hiciste» aunque el jugador no hizo eso | `ch1.1.sauce.00`, `ch1.2.sauce.00`; 1.1 prohíbe pasar el farol | «Mira otra forma de ver lo que pasó…» | F11 |
| R3 | Mover detrás del Cuaderno las líneas de resumen de 4.7, 4.10, 4.11 | P2 | En F6, para los seis Cuadernos | F6 |
| R4 | «flor escondida» en 1.10, 2.5, 3.10, 4.13, 5.6, 6.7, 7.6 | `lines.json`, `hub.secret.*` | Con el nombre de la pregunta 2 (ojo: «capullo» y «semilla» ya significan otra cosa en el juego) | F10 |
| R5 | `ch6.2.sauce.01` «Mueve el sol» | `lines.json` | Con el nombre de la pregunta 3 | F10 |
| R6 | Receta: `recipe.cases`, `recipe.card.chainRootToRoot` | P9 | F9 | F9 |
| R7 | 7.4: `ask` antes de `ch7.4.sauce.08`; quitar «Levanta las lunas como piedras» de `ch7.4.sauce.03` | Resuelve también la pregunta 8 del Apéndice A del Plan 09 | F7 | F7 |
| R8 | Grado 2 de 3.7, 3.8 y 4.4 como pregunta o zona | P5 | En F5, junto con todos los que señale `hintReveals` | F5 |
| R9 | 6.5: seis apuestas con la misma respuesta | `6-5.json` | Las apuestas de Bruto solo en la primera ronda (luego duerme); las de la receta se quedan, porque que el cociente **se mantenga** es la lección, y sus preguntas lo dicen | F9 |
| R10 | C08, Intuición: falta «tienes los mismos faroles, así que sigue habiendo una cadena» | `codex/C08.md` l. 17 | Se añade | F12 |
| R11 | «Testigos del núcleo» con rutas `src/core/...` dentro del texto del libro | Los catorce `codex/C*.md` | Pasan al final de la pestaña Puente, bajo su título | F12 |
| N1 | La idea de 3.10 (vigilar también lo no alcanzado) solo está en una flor secreta | `ch3.8.notebook.10` se refuta con una línea | La opción (c) del Cuaderno de 3.8 se refuta con un contraejemplo jugable | F6 |
| — | Riesgos de playtest de la revisión (§6) | `docs/playtest/*.md` | Los protocolos recogen los hechos nuevos (motivos registrados, pregunta oral de 4.11); sin tocar umbrales (Apéndice A del Plan 09, pregunta 10) | F13 |

---

## 2. La decisión central: la regla de cadena por nivel

### 2.1 Qué se cambia

`GardenState` gana un campo `chains: ChainRule`, que el nivel escribe en su JSON (`"chains"`) y que por defecto es `{ "rule": "any" }`:

| Regla | Qué acepta | Dónde |
|---|---|---|
| `any` | Lo de hoy: cualquier cadena aumentante o par, cualquier unión | Todo lo demás: capítulos 0–3, 6–7, 4.1–4.4, 4.9, 4.11, flores secretas 1.10–3.10, 6.7, 7.6, el modo libre, los contraejemplos |
| `seen` ("por donde llegó tu luz") | Una jugada que enciende un farol (cadena de ganancia +1 o unión) solo si es **la cadena que alcanzaron las marcas** (`chainSeen`, en cualquier sentido). Las cadenas de ganancia 0 se rechazan. | 4.5, 4.6, 4.7, 4.8, 4.12, 4.13, 5.1–5.6 |
| `fromBase` (con `flower`, base primero) | Una jugada que enciende un farol y pisa un pétalo de esa flor solo si uno de sus extremos es la base (que entonces está a oscuras) | 4.10 |

Motivos nuevos y estables (`core/rules/reasons.ts`): `chainNotSeen` («Hoy los faroles solo se mueven por donde llegó tu luz…») y `flowerClosed` («La flor está cerrada por hoy: una cadena solo la rodea saliendo de su base a oscuras…»). La regla se aplica en un único punto puro (`core/rules/chainRule.ts`), que usan `chain`, `join` y la vista previa del arrastre, para que lo que el trazo dice y lo que el núcleo acepta no se separen nunca.

**Una unión es una cadena de una enredadera** (dos brotes a oscuras unidos: un camino aumentante de longitud 1), así que obedece la misma regla sin excepción especial: con `seen`, juntar u–v solo vale si las marcas encontraron justo la cadena u–v. Y como separar, pasar el farol, girar el tallo y una cadena de ganancia 0 cambian los faroles sin la luz (y abren cadenas nuevas que se encuentran sin plegar: X1), los niveles `seen` los cierran en su `forbid`; el check de integridad `seenRuleOpen` falla si un nivel `seen` permite alguno. Deshacer sigue siendo gratis y siempre: es el historial, no una jugada.

**Niebla (X2).** Independiente de la regla: con niebla, una cadena (y una unión) solo pasa por enredaderas visibles (con un extremo inspeccionado), en el núcleo (`vineHidden`) y en el arrastre (`extendChain` no entra en una enredadera tapada). No afecta a ningún jardín sin niebla.

**Cerrado por hoy ≠ todavía no.** Hoy `reason.actionLocked` dice «Todavía no sabes {action}. Ya llegará.» también en 4.10, donde plegar está cerrado y el jugador ya sabe. Se separan: una acción **cerrada por el nivel** (`forbid`) responde `actionClosed` («Hoy no se puede {action}…»); una **aún no desbloqueada**, como ahora.

### 2.2 Por qué así (y no otra cosa)

- **Un dato del nivel, no un cambio global de la regla de cadena.** Hacer global "solo cadenas vistas desde el capítulo 4" rompería el modo libre (se juega con las acciones ganadas, sin obligar a buscar), los contraejemplos del Cuaderno (1.5 y 4.10 piden arrastrar cadenas directas) y los capítulos 6–7. El patrón ya existe: `roots` (4.1) y `forbid` (4.10) son reglas de nivel que el núcleo hace cumplir.
- **No una victoria "haber plegado".** Una condición sobre el historial ("se plegó algo") se gana plegando cualquier cosa y dibujando luego a ojo, y obliga a mirar la historia en vez del jardín. Con `seen` lo que se exige es que **la cadena encendida sea la que encontró la búsqueda con flores**, que es exactamente lo que hace la receta.
- **No `chainFound` + aplicar en dos pasos** (alternativa de la revisión): pediría dos victorias por nivel y un motor de pasos que hoy no existe; `seen` da lo mismo con el paso de juego de siempre.
- **4.10 aparte.** En 4.10 plegar está cerrado, así que `seen` no sirve: la búsqueda desde e rodea la flor sin plegar y encuentra la cadena sin girar nada. `fromBase` dice justo la hipótesis del lema («se puede suponer la base a oscuras»): antes de girar, ninguna cadena que toque la flor tiene la base por extremo; después, b–d=c–e sí. Girar a mano pasando el farol de R a a es el mismo intercambio y vale igual (el GDD: girar el tallo «es simplemente Cadena de ganancia 0»). Para que la regla no se salte por separar y juntar, 4.10 también juzga las uniones con ella (no hace falta cerrar nada más: el test exhaustivo lo comprueba).
- **Los niveles de maestría y las secretas de 4 y 5 también `seen`.** La maestría del Festival y del Jardín Salvaje es la receta a mano; 4.13 enseña que el orden de plegado no importa, y no lo enseña si se puede no plegar. En los de varias raíces, que dos árboles se encuentren sin flor sigue siendo una cadena vista y legal (es el caso «sol de otro árbol» de la receta).

### 2.3 Cada nivel, su gesto

| Nivel | Gesto que enseña | Qué exige ahora | Test exhaustivo (sin el gesto no se gana; con él sí) |
|---|---|---|---|
| 4.4 | Plegar en el choque | Ya `chainFound`; además cierra en su `forbid` todo lo que mueve faroles (juntar, separar, pasar el farol, cadena): hoy no se enciende nada, y pasar el farol de e a c deja d a oscuras y la búsqueda desde R encontraría R–a=b–d sin plegar | Sin `foldAt`, ninguna secuencia de jugadas permitidas alcanza una cadena; con él, sí |
| 4.5, 4.6, 4.7 | Plegar, desplegar, levantar (el lado) | `seen` | Sin `foldAt` ninguna secuencia de jugadas permitidas alcanza la victoria; con la solución, sí |
| 4.8 | Plegar las dos, desplegar solo la que cruza | `seen` | Sin plegar la flor cruzada no se gana; la otra puede quedarse plegada |
| 4.9 | Plegar y aun así «Terminé» | Ya `searchExhausted`; cierra en su `forbid` lo que mueve faroles (ya son los máximos: moverlos solo sirve para que la búsqueda acabe sin encontrarse la flor) | Sin `foldAt` la búsqueda desde R no se agota; con él, sí |
| 4.10 | Girar el tallo (sin plegar) | `fromBase` | Ninguna jugada que encienda un farol se acepta antes de dejar b a oscuras; después, b–d=c–e sí |
| 4.11 | El reto de la flor | Ya `flowerChallenge` | Sin cambios |
| 4.12, 5.4, 5.5 | La receta a mano, con flores | `seen` | Toda jugada que enciende un farol es una cadena vista; sin plegar no se llega al máximo (se comprueba: si en algún orden se llegara sin plegar, la fase lo informa con el jardín y el orden) |
| 5.1, 5.2, 5.3 | Flores anidadas, de fuera hacia dentro | `seen` | Sin plegar una flor **dentro** de otra no se alcanza ninguna cadena desde R. Esto contesta la pregunta 5 del Apéndice A del Plan 09 («un orden poco habitual puede saltarse el anidamiento»): si el test encuentra un orden que se salta el anidamiento, la fase se detiene y propone a la sesión principal el retoque mínimo del jardín (es un cambio de nivel) |
| 4.13, 5.6 | Combinar (orden de plegado; cuatro anidadas) | `seen` | Toda jugada que enciende un farol es una cadena vista |

El test exhaustivo es una búsqueda en anchura sobre estados del jardín (claves de `sameGarden`), con **todas** las jugadas que el nivel permite generadas por el núcleo (uniones, cadenas de todos los caminos alternantes simples, marcas, plegados, despliegues…), sin `foldAt` en la variante "sin el gesto". Los jardines de 4.5–5.3 tienen 6–12 brotes y `roots`; si alguno no cabe en un tiempo razonable (< 2 s), se acota por profundidad y se justifica en el test.

### 2.4 Cómo fue F1 y la decisión del autor (2026-10-18): en los niveles de flor busca la luz

**Lo que F1 dejó hecho.** La regla de cadena por nivel en el núcleo (`chainRule.ts`: `any`, `seen`, `fromBase`), las acciones cerradas por hoy (`actionClosed`, distinto de `actionLocked`), la regla de la niebla para cadenas, uniones, pases y tallos (X2), el campo `chains` del nivel con su check de integridad, 4.10 con la flor cerrada (`fromBase`) y 4.9 con los faroles cerrados, ambos probados con el recorrido exhaustivo (`tests/support/gardenExplorer.ts`), y el jardinero de la pista 3 y el arrastre preguntando a la regla.

**Por qué se paró.** Con las marcas elegidas por el jugador, `seen` no obliga a plegar en ningún jardín: quien marca siguiendo una cadena aumentante (cada brote impar de la cadena, luna; su pareja, sol) nunca cierra un bucle impar, porque todas sus marcas están en un solo camino, y la luz «ve» la cadena sin plegar. Es un hecho general de la búsqueda con marcas libres, no un defecto de estos jardines: ninguna regla sobre cadenas puede forzar el plegado mientras el orden de las miradas sea del jugador. Por eso el GDD se quedó solo con las reglas en uso (`0feab21`).

**La decisión.** En los niveles de flor —4.4, 4.5, 4.6, 4.7, 4.8, 4.12 y 5.1–5.6 (4.13 se pidió también; ver el resultado)— **la búsqueda la hace la luz, en un orden fijo, como el algoritmo** (como ya hace en 4.1 y 4.2):

- El jugador no elige dónde van los soles y las lunas: **avanza la luz** con el botón «Avanzar la luz» (la acción `stepLight`). Cada toque es una marca de la luz: un sol en un brote a oscuras o una mirada por una enredadera apagada, en el orden de `autoSearch` (los soles ya marcados primero, de menor a mayor; luego las raíces del nivel, en su orden). Las marcas entran en el día como cualquier jugada: se deshacen y el sol las repite.
- Cuando la luz encuentra **dos soles del mismo árbol**, se para y lo señala (`lightAtFlower`: la enredadera brilla). La única forma de seguir es **plegar** ese bucle (tocar el choque, `foldAt`); después la luz sigue en el jardín plegado.
- En la niebla, la luz se para ante un sol cuyas enredaderas todavía no se ven (`vineHidden`): hay que inspeccionarlo. Cuando encuentra la cadena (`lightFound`) o ya no le queda nada que mirar (`lightDone`), también se para.
- Cuando la luz ha visto la cadena, el jugador **la enciende** con la regla `seen` y la despliega por la flor con el gesto que enseña cada nivel (desplegar, capas, de fuera hacia dentro).
- El dato del nivel es `"light": true`: abre «Avanzar la luz» y cierra las marcas a mano (`markRoot`, `markMoon`) y el plegado a mano (`fold`: durante la búsqueda de la luz no se puede, y fuera de ella plegaría otro bucle que el que la luz señala). Siguen cerrados, como pidió X1, separar, pasar el farol y girar el tallo (con `seen`); en 4.4, que aún no enciende nada, también juntar y cadena.
- Las raíces de cada nivel son las de su diseño («desde R» donde el jardín lo dice; en 4.12, 5.4 y 5.5, todos los brotes a oscuras en orden). Para cada nivel un test comprueba que la luz, en ese orden, se encuentra con la flor (o las flores) de las que trata, y el recorrido exhaustivo comprueba que **ninguna secuencia de jugadas permitidas gana sin plegar** y que la solución de referencia gana.
- **Resultado (2026-10-18).** Con las raíces de su diseño (R en 4.4–4.8, 5.1–5.3 y 5.6; todos los brotes a oscuras, en orden, en 4.12, 5.4 y 5.5), la luz se encuentra con **las mismas flores que pliega la solución de referencia** en cada nivel (`tests/flowerLight.test.ts`), y el recorrido exhaustivo no encuentra ninguna victoria sin plegar. En 5.1, 5.2 y 5.6 la luz mira primero desde R, así que cierra las flores de fuera por otra enredadera (5.1: `c–g` en vez de `h–R`; las flores son las mismas): las pistas de grado 2 que señalaban la enredadera se movieron a la de la luz. En 5.4 y 5.5 la luz enciende las rondas en otro orden; los anidamientos son los mismos. El agua de 4.12 (10 de 11) y 5.5 (15 de 16) sigue alcanzando.
- **4.13 se queda como estaba** (marcas a mano): enseña que el orden de plegado no importa, y la luz, en su orden fijo, solo se encuentra con dos de sus tres flores (desde R; desde T no pliega ninguna) y no deja elegir el orden. Ninguna raíz lo arregla sin cambiar el jardín. **El autor decidió (2026-10-19) dejarlo a mano:** es el único nivel de flores donde el jugador pone soles y lunas, justo porque su lección es que el orden lo elige él.
- **Ritmo de la luz (decisión del autor, 2026-10-19):** cada toque de «Avanzar la luz» pone una sola marca, también en los niveles grandes (5.5 lleva unos 25 toques): se ve cada paso del algoritmo.
- **Desviación pequeña:** el check de los contraejemplos del Cuaderno aceptaba solo acciones que el nivel permite; ahora acepta también las que el nivel conoce y cierra por hoy (4.7 y 5.3 cierran las marcas a mano, pero sus contraejemplos se marcan a mano: no enseñan nada nuevo).

Esto sustituye la parte `seen` de F1 para esos niveles (sección 2.3); el resto de F1 y las fases siguientes no cambian (F2 dibuja los tramos hallados igual: la cadena vista es la de la luz).

---

## Fase 0 — La hoja de cambios de líneas

| Archivo | Responsabilidad |
|---|---|
| `tools/review/baseline/lines-1.0.1.json`, `tools/review/baseline/strings-1.0.1.json` | Copias exactas de `lines.json` y `strings.json` en el tag `v1.0.1` (`git show v1.0.1:…`), datos exportados que no se editan a mano |
| `tools/review/changeSheet.ts` | Pura: de los textos de hoy y de la base, la hoja `docs/review/lineas-plan10.md`: por nivel y en el orden del guion, cada línea **nueva**, **cambiada** o **retirada** (id, quién habla, antes, después, casilla); al final, cada texto de interfaz nuevo, cambiado o retirado (clave, antes, después) |
| `tools/line-sheet.ts` | `npm run lines` escribe también la hoja de cambios |
| `tests/lineSheet.test.ts` | Falla si `lineas-plan10.md` no está al día; con los textos de hoy la hoja dice "sin cambios" |

**Tests clave:** con una línea cambiada, otra nueva y otra retirada en unos textos de prueba, la hoja muestra las tres con su antes/después y en el orden del guion; una clave de `strings.json` cambiada sale en la sección de interfaz; los textos idénticos no salen; la base es byte a byte la del tag (test que compara con `git show` cuando git está disponible y se salta si no).

---

## Fase 1 — La regla de cadena por nivel (P1, X1, X2)

**Commits del GDD antes del código:** G1 y G2 (ver "Commits del GDD").

| Archivo | Responsabilidad |
|---|---|
| `core/rules/chainRule.ts` | Pura y nueva: `ChainRule` (`any`, `seen`, `fromBase` con `base` y `petals`) y `judgeLighting(state, path)`: si una jugada que enciende un farol (cadena +1 o unión) cumple la regla, o el motivo (`chainNotSeen`, `flowerClosed`); y si una cadena de ganancia 0 está permitida (`seen` no) |
| `core/rules/state.ts` | `chains` en `GardenState` y `GardenSetup` (por defecto `any`) |
| `core/rules/handlers/chain.ts`, `handlers/join.ts` | Consultan `judgeLighting` tras comprobar el camino; con niebla, `vineHidden` si alguna enredadera del camino está tapada |
| `core/rules/handlers/rotateStem.ts` | Con `seen`, rechazado como cadena de ganancia 0 (aunque el nivel ya lo cierre: defensa en profundidad, probada) |
| `core/rules/reasons.ts`, `core/rules/applyAction.ts` | `chainNotSeen`, `flowerClosed`; `actionClosed` (acción cerrada por el nivel) distinto de `actionLocked` (aún no desbloqueada): `GardenState` guarda las cerradas para poder distinguirlas |
| `levels/schema.ts`, `levels/build.ts` | Campo `chains` (unión discriminada estricta; `fromBase` con `flower` por nombres, base primero), traducido a ids |
| `levels/integrity.ts`, `tools/describeProblem.ts` | `seenRuleOpen` (un nivel `seen` que permite separar, pasar el farol, girar el tallo); `badChainFlower` (la flor de `fromBase` no es un bucle impar del jardín o su base no es el primero) |
| `levels/data/ch4/4-5 … 4-8, 4-12, 4-13.json`, `ch5/5-1 … 5-6.json` | `"chains": { "rule": "seen" }` y `forbid` de `split`, `passLantern`, `rotateStem` (este último solo donde está desbloqueado) |
| `levels/data/ch4/4-10.json` | `"chains": { "rule": "fromBase", "flower": ["b", "c", "d"] }` |
| `levels/data/ch4/4-4.json`, `ch4/4-9.json` | `forbid` de juntar, separar, pasar el farol y cadena (sección 2.3) |
| `game/input/dragChain.ts` | `chainGain` y `extendChain` usan `judgeLighting` y la niebla: el trazo nunca promete lo que el núcleo rechazará, ni entra en una enredadera tapada |
| `game/systems/nextMove.ts` | El jardinero de la pista 3 fuera de la solución de referencia: con `seen`, busca (con plegados) hasta ver la cadena, despliega lo que cruza y aplica la cadena vista; con `fromBase`, gira el tallo hasta la base y luego la cadena desde ella. Nunca propone una jugada que la regla rechaza |
| `content/es/strings.json`, `content/keys.ts`, `game/picture/reasonText.ts`, `ui/model/refusalText.ts` | `reason.chainNotSeen`, `reason.flowerClosed`, `reason.actionClosed` (borradores, Apéndice A) |

**Tests clave (primero en rojo con los datos de hoy):** el test exhaustivo de la sección 2.3 para cada nivel de la tabla (hoy falla en 4.5: separar y juntar, o la cadena directa, ganan sin plegar); en 4.5 la cadena R–a=b–d=c–e dibujada sin buscar se rechaza con `chainNotSeen` y tras plegar, ver la cadena y desplegar se acepta igual en los dos sentidos; en 4.10 R–a=b–d=c–e se rechaza con `flowerClosed`, separar a=b y c=d y juntar se rechaza con el mismo motivo, girar el tallo (o pasar el farol de R a a) y luego b–d=c–e gana; en un nivel de niebla, una cadena por una enredadera tapada se rechaza con `vineHidden` y el arrastre no la sigue; con `any`, **todos** los tests de reglas de hoy pasan sin tocar (propiedad: en jardines al azar sin `chains`, `applyAction` da exactamente lo mismo que antes para cada acción); `seenRuleOpen` señala un nivel de prueba `seen` que permite separar; `actionClosed` en 4.10 al tocar «plegar», `actionLocked` en 3.1; `nextMove` en 4.5, 4.10 y 5.1 desde estados fuera de la solución devuelve siempre una jugada aceptada que acerca la victoria; `tests/playability.test.ts` y `walkthrough` pasan sin cambiar ninguna solución de referencia (todas pliegan ya). Si alguna solución de un nivel de niebla pasa por una enredadera tapada, la fase añade la inspección que falta y comprueba que el agua de la estrella sigue alcanzando; si no alcanza, se detiene y lo informa.

---

## Fase 2 — El trazo y el gesto de levantar (P1 c, P7)

**Commits del GDD antes del código:** G3 y G4.

| Archivo | Responsabilidad |
|---|---|
| `game/input/previewMode.ts` | Pura: qué dice el trazo mientras se arrastra: en los capítulos 0–2, ganancia (+1, 0 en gris, ilegal), como hoy; desde el capítulo 3 y en las flores secretas desde 3.10, solo legal / ilegal (un único color neutro). El modo libre conserva la ganancia (es una herramienta, no un nivel) |
| `game/picture/garden.ts`, `game/view/GardenView.ts` | `chain.gain` pasa a `chain.preview: 'gain1' \| 'gain0' \| 'legal' \| 'illegal'`; el +1 dorado y el 0 gris siguen al soltar, con la animación de la cadena aplicada |
| `game/systems/liftGaps.ts` | Pura: de la historia, el estado donde se vio la cadena actual (`chainSeen`) con sus flores plegadas, y de ahí los **huecos**: los tramos de la cadena que estaban dentro de una flor plegada (uno por flor cruzada de primer nivel; Proposición 9.4: cada flor se cruza en un solo tramo). Lo de fuera son los **tramos hallados** |
| `game/picture/foundTrail.ts`, `game/view/FoundTrailView.ts` | Los tramos hallados se dibujan (trazo dorado punteado) desde que la luz encuentra la cadena hasta que los faroles cambian; dentro de una flor aún cerrada el tramo pasa por la flor; con la flor abierta, su hueco queda sin dibujar |
| `game/input/liftDrag.ts`, `game/scenes/level/levelInput.ts` | Pura y su montaje: con huecos abiertos, un arrastre que empieza en un extremo de un hueco (el pétalo de entrada o la base) rellena solo ese hueco; con todos rellenos se compone la cadena completa (tramos + huecos) y se manda como la acción `chain` de siempre. La alternancia se comprueba sobre la cadena compuesta, así que el lado equivocado se rechaza al instante con el motivo de hoy («Cleo ya tiene farol…»). El arrastre completo desde una punta sigue valiendo (lo usan las soluciones de referencia y quien lo prefiera) |
| `game/systems/tutorials.ts`, `content/es/strings.json` | `tutorial.unfold.body` dice el gesto: el trozo hallado sigue dibujado, arrastra el tramo de dentro (borrador) |

**Tests clave:** en 3.1 y 4.5 el trazo de una cadena legal no dice su ganancia y en 1.3 sí; en 4.5, tras encontrar la cadena y desplegar, los tramos hallados son R–a=b y c–e y el hueco es b…c; el arrastre b–d=c rellena el hueco y la acción compuesta es `chain R a b d c e`, aceptada; el arrastre b–c se rechaza con `notAlternating`; en 5.1, con las dos flores abiertas, hay un único hueco (a…g, que contiene la flor interior) y su relleno da la cadena de la solución; al deshacer hasta antes de encontrar la cadena, no hay tramos; tras aplicar la cadena, tampoco; en 4.8 la flor no cruzada no abre hueco; el modo libre conserva la ganancia.

---

## Fase 3 — Una sola forma de plegar en los niveles (P8)

**Commit del GDD antes del código:** G5.

| Archivo | Responsabilidad |
|---|---|
| `levels/build.ts` | Los niveles del catálogo no permiten `fold` (plegar un bucle elegido): plegar es tocar el choque sol–sol (`foldAt`). El modo libre sigue teniendo `fold` con las acciones ganadas (`actionsUnlockedBy`) |
| `core/rules/handlers/fold.ts`, `core/rules/reasons.ts` | Plegar a mano exige la **base a oscuras** (`baseNotDark`): con la base a oscuras, plegar no crea ni destruye cadenas (C8); sin ella puede esconder una (Observación 8.4). Exacto y sin búsqueda de tallos |
| `game/input/tools.ts`, `content/es/strings.json` | La herramienta se llama «Plegar a mano» (`tool.foldLoop`) y solo aparece en el modo libre; `tutorial.fold.body` deja solo el gesto de Marcas; tarjeta propia del modo libre para «Plegar a mano»; `reason.baseNotDark` (borradores) |
| `levels/cards/*` | La demo de la tarjeta de plegar de los niveles ya no muestra el bucle elegido |

**Tests clave:** ningún nivel del catálogo permite `fold` (y ninguna solución lo usaba: probado); en el modo libre plegar a mano un triángulo con la base iluminada se rechaza con `baseNotDark` y con la base a oscuras se acepta; propiedad: en jardines al azar, plegar a mano con la base a oscuras nunca cambia si hay cadena (con `bruteForce`); `recipe.wrong.foldAnyLoop` y C8 ya no se contradicen con nada que el jugador pueda hacer; la barra de 4.4 no tiene «Plegar» y cabe (`tests/panelFit.test.ts`, `bottomRows`).

**Hito H1 (F1–F3), revisión en pantalla de la sesión principal:** en 4.5, la cadena a ojo rechazada con su motivo; buscar, plegar, ver la cadena, desplegar: los tramos hallados dibujados y el hueco dentro; rellenar el hueco por el lado bueno y por el malo; lo mismo en 4.6 y en 5.1 (dos flores); en 4.10, la cadena de 4.1 rechazada, girar el tallo y ganar; «plegar» en 4.10 dice que hoy no se puede (no "todavía no sabes"); en 3.1 y 3.5 el trazo neutro y una enredadera tapada que no se deja recorrer; la barra de 4.4 sin «Plegar»; en el modo libre, «Plegar a mano» con la base iluminada.

---

## Fase 4 — «Terminé» equivocado y el botón «Presentar» (P4, P3 en parte)

**Commits del GDD antes del código:** G6.

| Archivo | Responsabilidad |
|---|---|
| `game/systems/claimVerdict.ts` | Pura: tras un «Terminé» que no gana, por qué, según la victoria del nivel, **sin decir dónde está la cadena**: `maximum` → `chainLeft`; `searchExhausted` → `searchOpen` (quedan enredaderas por mirar) o `chainLeft` si las marcas ya vieron una; `coverCertificate` / `coverComplete` → `unguarded` con **una** enredadera sin vigilar (la primera en orden de ids) o `countMismatch` (espantapájaros ≠ faroles); `tutteBergeCertificate` → `countShort` con la cota y los que duermen a oscuras; `moonCertificate` → `searchNotOver` o `notTheMoons`. Usa solo funciones del núcleo (`isMaximum`, `searchStatus`, `checkVertexCover`, `checkTutteBerge`, `stonesFromForest`) |
| `game/systems/levelSession.ts` | Un «Terminé» que no gana produce el efecto `claimRefused` con su veredicto, cuenta como rechazo para las pistas (`afterRejected`, no `afterAccepted`) y sigue sumando `claims.wrong` para el registro |
| `game/scenes/level/levelEffects.ts`, `game/view/NoticeView.ts` (o el aviso de rechazo que ya existe) | El aviso suave del rechazo, con el texto del veredicto y, para `unguarded`, el brillo de esa enredadera |
| `game/picture/doneButton.ts` | Pura: el texto del botón según la victoria del nivel: «Presentar» en los niveles de certificado (3.7–3.10, capítulo 7), «Terminé» en el resto |
| `content/es/strings.json`, `content/keys.ts` | `claim.chainLeft`, `claim.searchOpen`, `claim.unguarded`, `claim.countMismatch`, `claim.countShort`, `claim.searchNotOver`, `claim.notTheMoons`, `hud.present`, `tutorial.present.*`, `hud.councilHidden` («…al pulsar «Presentar»»), `diagram.event.declareDone` («El jardinero dice que el jardín no puede hacerlo mejor»; variante de certificado) (borradores) |
| `content/es/lines.json` | Las líneas que nombran el botón en los niveles de certificado dicen «Presentar»: `ch3.7.sauce.01`, `ch3.8.sauce.01`, y las del capítulo 7 que lo nombren |
| `levels/integrity.ts` | `buttonWord`: una línea de un nivel que nombra «Terminé» o «Presentar» nombra el botón que ese nivel muestra |

**Tests clave:** en 1.8 un «Terminé» con 3 faroles da `chainLeft`, cuenta como rechazo (tres seguidos ofrecen pista) y el aviso no nombra ningún brote; en 4.9 un «Terminé» con la búsqueda a medias da `searchOpen`; en 3.7 con dos espantapájaros que no vigilan todo, `unguarded` con una enredadera sin vigilar de verdad; con tres que vigilan todo y dos faroles, `countMismatch`; en 7.3 sin piedras, `countShort` con los números que da `checkTutteBerge`; en 7.4 con piedras que no son las lunas, `notTheMoons`; un «Terminé» verdadero sigue ganando como hoy; `doneButton` da «Presentar» justo en los niveles de certificado; `buttonWord` señala hoy `ch3.7.sauce.01` y queda verde tras el cambio; la fila de botones cabe con «Presentar» (`tests/panelFit.test.ts`, `bottomRows`); `diagram.event.declareDone` ya no afirma un hecho.

---

## Fase 5 — Pistas que llegan a tiempo y no regalan la solución (P5, R8)

**Commit del GDD antes del código:** G7.

| Archivo | Responsabilidad |
|---|---|
| `game/systems/progress.ts` | Pura: el **récord** de un nivel (más faroles alcanzados; más brotes marcados en la búsqueda de estos faroles; más flores plegadas; cadena vista; más brotes inspeccionados; más enredaderas vigiladas; menor diferencia entre la cota del Consejo y los que duermen a oscuras) y si un estado lo **supera**. Juntar y separar en bucle, marcar y deshacer, no superan nada |
| `game/systems/hints.ts`, `game/systems/levelSession.ts` | El reloj de 90 s se reinicia solo con progreso real (`progress.ts`), no con cualquier jugada aceptada; tres rechazos seguidos siguen ofreciendo pista. El botón Pista está **siempre** disponible en los pasos que admiten pistas mientras queden grados; la oferta solo lo hace brillar (como hoy cuesta la estrella "sin pistas") |
| `game/view/HudView.ts`, `game/picture/hud.ts` | El botón Pista visible siempre (apagado solo sin grados), con brillo cuando se ofrece |
| `levels/hintChecks.ts`, `levels/integrity.ts`, `tools/describeProblem.ts` | Pura: `hintReveals`: el resaltado del grado 2 no puede ser igual al conjunto de una jugada decisiva de la solución (la enredadera de un `foldAt`, la cadena entera, sus dos extremos, el tallo de un giro), ni estar contenido, con dos o más brotes, en el certificado final (espantapájaros, piedras, lunas). Una zona más amplia que contiene la respuesta, o un solo brote, sí vale |
| `levels/data/**` | Cada pista de grado 2 que `hintReveals` señale se reescribe como zona o pregunta (con hoy: 2.3, 3.4, 3.7, 3.8, 4.4, 4.6, 4.7, 4.8, 4.10, 5.1, 5.2, 5.3, 7.4, y las que salgan); 1.5–1.9 reciben sus tres pistas (línea, resaltado) |
| `content/es/lines.json` | Las líneas de esas pistas (borradores) |

**Tests clave:** sesión de prueba: 100 s de juntar y separar en 1.3 → pista ofrecida; un farol nuevo récord a los 80 s → el reloj vuelve a cero; deshacer y rehacer hasta el mismo récord no lo reinicia; el botón Pista abre el grado 1 a los 5 s sin oferta y la estrella "sin pistas" se pierde igual que hoy (`stars.test.ts`); `hintReveals` en rojo hoy con la lista de arriba y verde tras las reescrituras; todos los niveles de 1.5 a 1.9 tienen tres pistas y la de grado 3 la da `nextMove`; `hintContent` sigue dando las genéricas donde un nivel no tiene la suya.

**Hito H2 (F4–F5), revisión en pantalla de la sesión principal:** «Terminé» con 3 faroles en 1.8 (aviso, sin brote señalado); 3.7 con un espantapájaros de menos (enredadera que brilla) y el botón «Presentar»; 7.3 sin piedras (la cuenta en el aviso); el botón Pista visible desde el principio en 1.3 y su brillo tras tantear (con el reloj acortado en un guardado de prueba o esperando); las pistas de grado 2 nuevas de 3.8 y 4.4.

---

## Fase 6 — Cuadernos que piden pensar (P2, R3, N1)

**Commit del GDD antes del código:** G8.

| Archivo | Responsabilidad |
|---|---|
| `levels/notebookChecks.ts`, `levels/integrity.ts`, `tools/describeProblem.ts` | Pura: `notebookEcho`: la opción correcta de un Cuaderno no comparte con ninguna línea mostrada antes en ese nivel (pasos `say`, reacciones del juego, `ask`, el propio enunciado no cuenta) una racha de tres palabras seguidas con al menos dos que no sean vacías (sin tildes, minúsculas, sin puntuación; lista de palabras vacías en el propio archivo) |
| `levels/data/ch1/1-5.json`, `ch2/2-4.json`, `ch4/4-7.json`, `ch4/4-10.json`, `ch4/4-11.json`, `ch5/5-3.json` | El paso `notebook` va **antes** de la línea que resume; esa línea pasa a ser (o se funde con) el `reply` de la opción correcta; en 1.5 la reacción a los 4 faroles se queda, pero la opción correcta no la repite |
| `content/es/lines.json` | Opciones correctas con otras palabras y un distractor que copia a medias la frase de Sauce, en esos seis (borradores, Apéndice A) |
| `levels/data/ch3/3-8.json` | La opción (c) («…siempre puedo poner los espantapájaros en las lunas») se refuta con un contraejemplo jugable: un jardín de abejas y [tréboles] donde la búsqueda no llega a todos y los espantapájaros en las lunas dejan una enredadera sin vigilar (N1) |

**Tests clave:** `notebookEcho` en rojo hoy exactamente en los seis Cuadernos de la revisión (y en ninguno de 3.3, 3.8, 4.2, 6.6, 7.3), verde tras el cambio; cada Cuaderno sigue teniendo una opción correcta y cada falsa su refutación (`notebookChecks`); el contraejemplo nuevo de 3.8 es un jardín válido en el que la búsqueda deja brotes sin marca y los espantapájaros en las lunas no vigilan todo (comprobado con el núcleo); las soluciones de referencia (que contestan por índice) siguen eligiendo la correcta.

---

## Fase 7 — Los porqués, preguntados (P6, P7 en parte, R7)

**Commit del GDD antes del código:** G9.

| Archivo | Responsabilidad |
|---|---|
| `levels/flow.ts` | Las opciones de `ask` admiten `counterexample` (el mismo esquema que el Cuaderno, `counterexampleSchema`); una opción correcta no lleva contraejemplo |
| `levels/flowChecks.ts`, `levels/notebookChecks.ts` | Los contraejemplos de un `ask` pasan las mismas comprobaciones que los del Cuaderno |
| `game/systems/question.ts`, `game/systems/counterexampleController.ts`, `game/scenes/CounterexampleScene.ts` | Un `ask` con contraejemplo abre el mismo jardín que el Cuaderno; al volver, la pregunta sigue (con `retry`) |
| `levels/data/ch2/2-3.json` | Tras jugar: «¿Podría una punta del hilo plateado tener un farol tuyo?» (Sí / No, con respuesta) |
| `levels/data/ch3/3-4.json` | Tras la cadena: por qué dos soles de árboles distintos dan una cadena (las dos medias cadenas hasta cada raíz) |
| `levels/data/ch3/3-8.json` (o 3.6) | «Entre abejas y [tréboles], ¿pueden tocarse dos soles del mismo árbol?»; la opción «Sí» abre un jardín bipartito para intentarlo, donde nunca ocurre |
| `levels/data/ch5/5-2.json` | Antes de desplegar: «Esta cadena cruza la flor grande. ¿Qué abres primero, y por qué?»; la respuesta buena explica que la pequeña es un pétalo de la grande (una flor plegada es un brote más) |
| `levels/data/ch7/7-4.json` | `ch7.4.sauce.03` sin «Levanta las lunas como piedras» (la pista de grado 2, reescrita en F5, lleva hacia ahí); un `ask` antes de la explicación: «Al quitar las lunas, ¿con quién queda conectado cada sol?»; `ch7.4.sauce.08` pasa a ser el `reply` del acierto |
| `content/es/lines.json` | Las preguntas, opciones y respuestas (borradores, Apéndice A) |
| `docs/plans/09-polish.md` | Apéndice A, pregunta 8: "Resuelta en el Plan 10 (F7): opciones (b) y (c)" (commit `docs:` propio) |

**Tests clave:** el esquema acepta un `ask` con contraejemplo y rechaza uno con contraejemplo en la opción correcta; en el contraejemplo de 3.8 ninguna secuencia de marcas produce `sunMeetsSun` (bipartito, comprobado con `bipartition`); en 7.4 la línea 08 solo se dice tras acertar la pregunta y la instrucción ya no está en la línea inicial (`notebookEcho` generalizado a `ask`: la respuesta buena no está dicha antes); las soluciones de referencia contestan las preguntas nuevas (`playability`).

---

## Fase 8 — El reto del espejo en dos fases (P10)

**Commit del GDD antes del código:** G10.

| Archivo | Responsabilidad |
|---|---|
| `levels/flow.ts`, `levels/flowChecks.ts` | El paso `draw` gana `beatable` (por defecto `true`, lo de hoy). Con `false`, los faroles en ese punto del guion son máximos (integridad) y el paso termina tras `attempts` comprobaciones, que nunca ganan |
| `game/systems/mirrorChallenge.ts` | Con `beatable: false`, cada comprobación es `notBetter` y al final del cupo el paso termina con la línea de cierre; el texto de `mirror.spared` deja de decir que ganar es difícil |
| `levels/data/ch2/2-4.json` | Jardín nuevo con la misma idea (unos 15–16 brotes, cuadrícula) pero **impar o con un brote que queda a oscuras en el máximo**, para que "ganarle" no sea imposible solo por contar. Guion: `say` («dibuja un reflejo que te gane») → `draw` (cada reflejo mejor enseña su hilo ganador: «quien te gana te deja una cadena») → `play` (usa la cadena; victoria `matchingSize` con el máximo) → `say` («ahora tu jardín no tiene ninguna cadena; intenta ganarle») → `draw` con `beatable: false` → `say` («No se puede. Sin cadena, nadie te gana») → `notebook` (sin cambios de opciones; reordenado en F6) |
| `content/es/lines.json`, `content/es/strings.json` | `ch2.4.sauce.00` sin doble negación, las líneas de la segunda fase, `mirror.spared` (borradores) |

Si el autor contesta la pregunta 4 del Apéndice A del Plan 09 («la rejilla demasiado regular») con (b), las posiciones del jardín nuevo se desordenan aquí mismo; si no, se queda en cuadrícula.

**Tests clave:** el primer `draw` sigue exigiendo faroles mejorables y el segundo, máximos (`flowChecks`, en rojo con un nivel de prueba que los invierte); en el jardín nuevo el máximo deja al menos un brote a oscuras; cualquier reflejo dibujado en la segunda fase da `notBetter`; la solución de referencia recorre las dos fases (`playability`); `tests/panelPlacement.test.ts` con los carteles nuevos; la estrella de 2.4 se recalcula (`starsCeiling`) y el umbral de la flor secreta 2.5 se revisa con la regla del Plan 08 §1.1.

**Hito H3 (F6–F8), revisión en pantalla de la sesión principal:** el Cuaderno de 4.11 antes del resumen; un `ask` con contraejemplo (3.8, el jardín bipartito); la pregunta de 7.4 antes de la explicación; la pregunta de orden en 5.2; 2.4 entero, las dos fases.

---

## Fase 9 — La receta y las apuestas de la carrera (P9, R6, R9)

**Commit del GDD antes del código:** G11.

| Archivo | Responsabilidad |
|---|---|
| `core/recipe/run.test.ts` (primero) | Propiedad: en miles de jardines al azar y en los del catálogo, `runRecipe` con la receta correcta nunca responde el caso `dark` (tras «marca sol a todos los brotes a oscuras», ningún vecino sin marca está a oscuras). Si falla, la fase se detiene: la tarjeta no está muerta y se informa |
| `core/recipe/recipe.ts`, `core/recipe/runCases.ts`, `core/recipe/check.ts` | Sin el caso `dark` ni la tarjeta `chainToDark`; la cadena entre dos soles de árboles distintos es el único caso de cadena |
| `levels/data/ch6/6-1.json`, `6-3.json`, `levels/flowChecks.ts` (`TAUGHT_IN`) | Sin `chainToDark` en sus listas |
| `content/es/strings.json` | `recipe.cases` («Mientras algún sol tenga una enredadera apagada sin mirar (x es el brote del otro lado):»), `recipe.card.chainRootToRoot` («Si x es sol de otro árbol: cadena de un brote a oscuras a otro. Pasa los faroles y vuelve al paso 1.»), sin `recipe.card.chainToDark` ni `recipe.missing.dark` (borradores) |
| `content/es/lines.json` | `ch6.1.sauce.02` (hoy enumera «a oscuras» entre los vecinos) |
| `content/es/codex/C10.md` | El párrafo del caso (a) que «no ocurre nunca» explica por qué la receta no tiene esa tarjeta |
| `levels/data/ch6/6-5.json` | Las apuestas de Bruto, solo en la primera ronda; las de la receta en las tres, con preguntas que piden si el cociente se mantiene (`ch6.5.sauce.06`, `.09`) |
| `levels/data/ch6/6-7.json` | Umbral de la flor secreta recalculado si cambian las estrellas extra del capítulo (regla del Plan 08 §1.1) |

**Tests clave:** la propiedad de arriba; la receta correcta sigue llegando al máximo y la de Bruto en 5.1 sigue quedándose en 3 (`run.test.ts`); `tests/recipeFit.test.ts` y `recipeBook.test.ts` con seis tarjetas de caso menos una; ninguna tarjeta nombra «raíz» sin que una línea lo haya dicho antes (o la palabra desaparece); 6.5 tiene cuatro apuestas y la solución las contesta; `starsCeiling`, `betsWon`, `savePoints` (`all-stars`: estrellas y semillas recalculadas) y `secretChecks` al día.

---

## Fase 10 — Vocabulario: una palabra, un sentido (P3, R4, R5)

**Espera las respuestas del autor a las preguntas 1–4.** Sin respuesta, la fase no se ejecuta (las demás no dependen de ella, salvo los corchetes [tréboles] de los borradores de F6–F7, que se escriben con la opción por defecto marcada y esta fase sustituye).

**Commit del GDD antes del código:** G12.

| Archivo | Responsabilidad |
|---|---|
| `content/es/lines.json`, `content/es/strings.json`, `content/es/codex/C05.md`, `C06.md`, `C13.md`, `codex/glossary.json` | El par bipartito con su nombre nuevo (pregunta 1) en todo el Invernadero, 7.1, el modo libre (`sandbox.gen.beesFlowers`, `sandbox.certify.notBees`) y el Códex; las flores secretas con su nombre nuevo (pregunta 2: `hub.secret.*`, las líneas de 1.10, 2.5, 3.10, 4.13, 5.6, 6.7, 7.6, `keys.flowers`); el deslizador del tiempo con su nombre nuevo (pregunta 3: `hud.prompt.sun`, `tutorial.sun.*`, `diagram.help.*`, `keys.slider`, `teacher.dayHelp`, `tutorial.automaton.body`, `sandbox.solve.done`, `ch0.5.sauce.00`, `ch6.2.sauce.01`) |
| `game/view/SunSliderView.ts`, `tools/assets/selection.ts` | Si la pregunta 3 pide otro icono y el pack lo tiene (Ninja Adventure, Kenney; CC0), el deslizador deja el sol de `Meteo/Sun.png`, que es también la marca de búsqueda; si no hay icono adecuado, se queda y se informa |
| `tests/vocabulary.test.ts` | La lista de expresiones retiradas (`abejas y flores`, `flor escondida`, `flor secreta`, `el sol` referido al deslizador: «arrastra el sol», «mueve el sol»…) no aparece en ningún texto del juego ni del Códex; «flor» no aparece en ninguna línea de los capítulos 0–3 ni en un texto del hub que no hable de los niveles de flor |
| `README.md`, `docs/playtest/*.md`, `docs/video/guion.md`, `docs/review/lineas.md` | Los nombres nuevos donde se nombran (commits `docs:` propios; la hoja es generada) |

Nombres de archivo, identificadores y claves (`secret`, `SunSliderView`, `beesFlowers`) no cambian: son código en inglés, no texto del jugador.

**Tests clave:** `vocabulary.test.ts` en rojo hoy con las apariciones de la revisión, verde tras el cambio; la regla del vocabulario de siempre; `tests/dialogueFit.test.ts`, `panelFit`, `hubFlowers` (rótulos del hub con sus textos nuevos) y `fontGlyphs` (letras nuevas en la fuente) verdes; `tests/authorKit.test.ts` y `readme.test.ts` con los documentos al día.

---

## Fase 11 — Líneas sueltas del Prado (R1, R2)

**Commit del GDD antes del código:** G13.

| Archivo | Responsabilidad |
|---|---|
| `levels/data/ch1/1-7.json` | Guion: `play` y un `say` tras ganar («Seis brotes en corro, y la cadena pudo ir por cualquiera de los dos lados. Acuérdate de este bucle.») |
| `levels/data/ch4/4-3.json` | El eco: `ch4.3.sauce.00` o una línea nueva recuerda «el corro del Prado» |
| `content/es/lines.json` | `ch1.1.sauce.00` y `ch1.2.sauce.00` con «Mira otra forma de ver lo que pasó…» (vale tanto si el jugador cayó en la trampa como si no) (borradores) |

**Tests clave:** 1.7 tiene guion y su solución lo recorre; las líneas nuevas existen (`tests/content.test.ts`); `notebookEcho` sigue verde.

---

## Fase 12 — El Códex (R10, R11)

**Commit del GDD antes del código:** G14.

| Archivo | Responsabilidad |
|---|---|
| `content/es/codex/C08.md` | Intuición, tras «gira el tallo»: «tienes los mismos faroles, así que si el jardín abierto podía mejorar, sigue habiendo una cadena (lo viste en el estanque)» |
| `content/es/codex/C01–C14.md`, `levels/codex.ts` o el lector de pestañas (`ui/book/*`) | La sección «Testigos del núcleo» sale de la pestaña Formal y va al final de la pestaña Puente, con su título |
| `content/es/codex/C*.md` | Lo que el Códex dice de niveles que este plan cambió: 2.4 (dos fases), 4.10 (la flor cerrada), 4.5 (el gesto de levantar), 6.1 (sin la tarjeta muerta, ya en F9), 7.4 (la pregunta) |
| `tests/codexReview.test.ts`, `tests/codex.test.ts` | Ningún `src/` en las pestañas Intuición y Formal; cada entrada tiene sus testigos en Puente |

**Tests clave:** el test nuevo de rutas en rojo hoy en las catorce entradas; los enlaces internos (`#C8-L8.3`…) siguen resolviendo; `tests/pageLayout.test.ts` y `bookGeometry` con las páginas nuevas; `docs/codex-review.md` (la lista de la revisión de rigor) señala qué secciones cambiaron.

**Hito H4 (F9–F12), revisión en pantalla de la sesión principal:** 6.1 (receta sin la tarjeta muerta, textos nuevos, páginas); 6.5 (apuestas); el hub con el nombre nuevo de las secretas y sus rótulos; el deslizador con su nombre (e icono, si cambia); el Invernadero (líneas con el par nuevo); 1.7 y 1.1; C08 Intuición; la pestaña Puente de C05 con los testigos.

---

## Fase 13 — Protocolos, README, versión y cierre

| Archivo | Responsabilidad |
|---|---|
| `docs/playtest/A.md`, `B.md`, `C.md` | Solo hechos: los motivos nuevos que el registro cuenta (`chainNotSeen`, `flowerClosed`, `claimRefused` con su veredicto), que el Cuaderno ya no sigue al resumen, la pregunta oral de 4.11 que propone la revisión («¿Por qué el trozo de la cadena llega a la flor por una enredadera apagada?»), qué mirar en 4.5–4.10 (cuántos rechazos `chainNotSeen` antes de buscar) y en el capítulo 5 (la respuesta a la pregunta de orden). **No** cambian umbrales ni criterios |
| `README.md` | Lo que cambió para el jugador (regla de los niveles de flor, «Presentar», Pista siempre a mano) |
| `docs/review/lineas-plan10.md` | Completa; el autor la revisa (gate de la versión) |
| `package.json`, `package-lock.json` | Versión `1.1.0` (su commit); el tag `v1.1.0` y el merge a `main`, el autor tras su visto bueno |
| este plan | "Cierre del plan" con lo hecho, la suite y lo que queda del autor |

**Hito final:** la sesión principal recorre 4.1 → 4.11 seguidos y 5.1 → 5.3 con un guardado `after-ch3` / `after-ch4` (`npm run save`), y el capítulo 1 entero con 1.7 y 1.8.

---

## Orden y dependencias

```
F0 → F1 → F2 → F3 → [H1] → F4 → F5 → [H2] → F6 → F7 → F8 → [H3] → F9 → F10* → F11 → F12 → [H4] → F13
```

Una fase a la vez, siempre. F0 primero: toda línea posterior sale en la hoja. F1 antes de F2 (el trazo usa `judgeLighting`) y de F5 (`nextMove` con la regla, base de la pista 3). F3 después de F1 (las barras de 4.x cambian una vez, con F1 cerrando acciones y F3 quitando «Plegar»). F4 antes de F5 (un «Terminé» falso como rechazo entra en el progreso). F6 antes de F7 (`notebookEcho` se generaliza a `ask` en F7). F8 después de F6 (2.4 tiene su Cuaderno reordenado). F9 antes de F12 (C10). **F10\*** espera las preguntas 1–4; si no han llegado al acabar F9, se salta, se hacen F11 y F12 y F10 se ejecuta cuando lleguen (antes de F13). F13 cierra.

---

## Commits del GDD

Cada uno es un commit `docs:` propio, antes del código de su fase.

| # | Sección | Cambio | Fase |
|---|---|---|---|
| G1 | §5.1 (Cadena; nota nueva) | Regla de cadena por nivel: "en algunos jardines los faroles solo cambian por donde llegó tu luz"; una unión es una cadena de una enredadera; en la niebla, cadenas solo por enredaderas visibles | F1 |
| G2 | §7: 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.12, 5.1–5.5; §7.9 Festival y Salvaje | La victoria de cada uno con su regla (`seen` / la flor cerrada de 4.10) y las acciones que el nivel cierra (en 4.4 y 4.9, todo lo que mueve faroles) | F1 |
| G3 | §5.1 (Cadena) | Desde el capítulo 3 el trazo solo dice si es legal; la ganancia se ve al soltar (el gris de 1.4 sigue) | F2 |
| G4 | §5.1 (Desplegar), §7 4.5 | El gesto de levantar: los tramos hallados se quedan, se arrastra el de dentro | F2 |
| G5 | §5.1 (Plegar), §5.7 | En los niveles, plegar es tocar el choque sol–sol; en el modo libre, también «Plegar a mano», con la base a oscuras | F3 |
| G6 | §5.2 | Un «Terminé» equivocado recibe una respuesta suave; en los niveles de certificado el botón dice «Presentar» | F4 |
| G7 | §5.3, §5.4; §7 pistas (2) de los niveles reescritos | Progreso = señales reales; botón Pista siempre a mano; el grado 2 señala una zona o pregunta, nunca la respuesta; arregla la contradicción "no quitan estrellas" de §5.3 con la estrella "sin pistas" de §5.4 | F5 |
| G8 | §5.5; §7 Cuadernos de 1.5, 2.4, 4.7, 4.10, 4.11, 5.3 y 3.8 (c) | El Cuaderno va antes del resumen y la opción correcta no repite a Sauce; 3.8 (c) con contraejemplo | F6 |
| G9 | §7: 2.3, 3.4, 3.8, 5.2, 7.4 | Las preguntas nuevas; 7.4 sin la orden en la primera línea | F7 |
| G10 | §7 2.4 | El reto del espejo en dos fases y su jardín | F8 |
| G11 | §7 6.1, 6.5 | La receta sin la tarjeta muerta y con los textos nuevos; apuestas de 6.5 | F9 |
| G12 | §3.2, §3.3, cabecera del capítulo 3, §5.1 (El sol), §5.10, §7.9, títulos que lo nombran | Los nombres nuevos (preguntas 1–3) | F10 |
| G13 | §7 1.1, 1.2, 1.7, 4.3 | Las líneas de 1.1 y 1.2; 1.7 y su eco en 4.3 | F11 |
| G14 | §5.6 | Los testigos del núcleo en la pestaña Puente | F12 |

---

## Decisiones

- **La regla vive en el nivel y la aplica el núcleo** (sección 2.2): ni el juego ni la vista deciden si una cadena vale; el trazo pregunta a la misma función que el reductor.
- **Una unión es una cadena de una enredadera.** No es un caso especial: es la definición (camino aumentante de longitud 1), y cierra X1 sin inventar nada.
- **El arrastre completo sigue valiendo** junto al de levantar: las soluciones de referencia, los tests de jugabilidad y el jugador que prefiere arrastrar entero no cambian; la regla `seen` ya obliga a que sea la cadena hallada.
- **Los veredictos de un «Terminé» falso son avisos de la interfaz** (`strings.json`, como los motivos de rechazo), no líneas de diálogo: los ids de línea son por nivel y estos mensajes valen para todos.
- **«Plegar a mano» exige la base a oscuras**, no "un tallo": es exacto, no necesita buscar tallos (que en general pide la propia búsqueda con flores) y es justo la hipótesis del lema que el jugador vivió en 4.10–4.11.
- **La tarjeta muerta sale** solo tras probar con una propiedad que está muerta.
- **Ningún nivel nuevo**; 2.4 cambia de jardín y de guion.

## Riesgos y cómo se mitigan

| Riesgo | Mitigación |
|---|---|
| Tests que suponen el comportamiento viejo: reglas de cadena (`chain.test.ts`), `festival.test.ts`, `wildGarden.test.ts`, `nextMove.test.ts`, `levelController*.test.ts`, `walkthrough`, tests de 2.4, `mirrorChallenge`, receta | Cada fase cambia la expectativa en el mismo commit que el comportamiento y explica el porqué en el test; `playability` no cambia ninguna solución salvo 2.4 (F8) y las preguntas nuevas (F7) |
| Una solución de referencia de un nivel de niebla pasa por una enredadera tapada (X2) y la inspección que falta rompe el agua de la estrella | F1 lo mide en todos los niveles de niebla antes de decidir; si un presupuesto no alcanza, se detiene y lo informa (el agua es dato del nivel y del GDD) |
| El test exhaustivo tarda demasiado en algún jardín | Claves de estado con `sameGarden`, poda de jugadas que no cambian nada; acotado y justificado si hace falta; los de maestría solo prueban la propiedad "toda jugada que enciende es una cadena vista" |
| 5.1–5.3 se pueden resolver sin anidar en algún orden (Apéndice A del Plan 09, pregunta 5) | El test de F1 lo descubre; la fase se detiene y propone el retoque mínimo del jardín |
| El jardinero de la pista 3 queda sin jugada en un estado raro con la regla | `nextMove` probado desde estados al azar alcanzables en 4.5, 4.10, 5.1; si devuelve nada, la pista 3 dice la genérica (como hoy fuera de la solución) |
| Estrellas y umbrales: 2.4 con paso de juego, 6.5 con menos apuestas | `starsCeiling`, `betsWon`, `secretChecks` y `savePoints` recalculan; umbrales de las secretas 2.5 y 6.7 con la regla del Plan 08 §1.1; el cambio de estrellas máximas se anota en el cierre |
| Textos del Códex y documentos que citan niveles o palabras cambiadas (C05, C06, C08, C10, C13, glosario; README, guion del video, protocolos, `docs/codex-review.md`) | F10 y F12 los buscan con `tests/vocabulary.test.ts`, `codexChecks` y `authorKit`; los documentos van en commits `docs:` |
| Paneles que dejan de caber con textos nuevos («Presentar», preguntas largas, opciones reescritas) | `panelFit`, `dialogueFit`, `panelPlacement`, `bottomRows`, `recipeFit` en cada fase que cambia texto |
| El script inicial (1769 de 1800 KB) | Lo nuevo es pequeño y puro; `npm run budget` en cada fase que empaqueta; si no cabe, la fase lo mide y pregunta |
| El autor cambia muchas líneas en la hoja tras las fases | Son datos: un commit por tanda, con los tests de encaje; la hoja de cambios muestra qué falta revisar |

## Preguntas abiertas

**Del autor** (nombres y redacción; F10 espera las cuatro primeras):

1. **¿Cómo se llama la otra especie del Invernadero?** (hoy "abejas y flores"): (a) abejas y tréboles; (b) abejas y colmenas; (c) abejas y lavandas; (d) otro. Los borradores de F6–F7 la escriben como [tréboles].
2. **¿Cómo se llaman las flores secretas?** Ojo: «capullo» ya es su estado cerrado en el hub y «semilla» es el premio de las apuestas, así que las dos propuestas de la revisión chocan. (a) rincones escondidos («Un rincón escondido, solo para ti»); (b) jardines secretos; (c) tesoros del jardín; (d) capullos escondidos, y el estado cerrado pasa a decirse de otra forma («aún cerrado»); (e) otro. El dibujo del hub (capullo y roseta dorada) no cambia salvo que el autor lo pida.
3. **¿Cómo se llama el deslizador del tiempo?** (hoy "el sol"): (a) el día («Arrastra el día»); (b) la sombra; (c) el reloj; (d) la hora; (e) otro. Y su icono: (i) se queda el sol del pack; (ii) otro icono del pack si existe (F10 lo busca).
4. **¿Qué dice el botón en los niveles de certificado?** (a) «Presentar»; (b) «Presentar prueba»; (c) «Mostrar prueba». F4 usa (a) en una sola clave (`hud.present`), cambiable después.
5. **Pregunta 7 del Apéndice A del Plan 09** (la respuesta «≈ de 4 a 8 veces» para cocientes medidos de ×3,7 a ×4,5), que la revisión vuelve a señalar: (a) dejarla; (b) «≈ 3 a 5 veces»; (c) «≈ unas 4 veces». F9 toca esas apuestas: si llega la respuesta, se aplica allí.
6. **¿Sauce invita a leer el Códex al terminar cada capítulo?** (riesgo de playtest de la revisión, §6, fuera de los diez problemas): (a) no; (b) sí, una línea al final del último nivel de cada capítulo («En el Códex esto tiene nombre»).
7. **Las líneas nuevas**: revisarlas en `docs/review/lineas-plan10.md` antes de la 1.1.0 (gate de F13).

**Respuestas (2026-10-18).** Del autor: 1, 2, 3, 4 y 7. De la sesión principal, con el visto bueno del autor para decidirlas: 5 y 6. Las fases las aplican tal cual; los corchetes del Apéndice A se leen con estas respuestas.

| # | Respuesta | Dónde se aplica |
|---|---|---|
| 1 | **(a) tréboles**: «abejas y tréboles»; en singular, «un trébol» | F6, F7 (sin corchetes) y F10 |
| 2 | **(b) jardines secretos** («un jardín secreto») | F10 |
| 3 | **(a) el día** («Arrastra el día»). El icono **se queda (i)**: el sol del asa es el día que pasa; solo cambia la palabra | F10 (sin buscar icono nuevo) |
| 4 | **(a) «Presentar»** (`hud.present`) | F4 |
| 5 | **(b) «≈ 3 a 5 veces»** (cocientes medidos de ×3,7 a ×4,5) | F9 |
| 6 | **(b) sí**: al final de cada capítulo Sauce invita, en una línea corta, a leer la página del Códex que se acaba de abrir | F11 (líneas nuevas, en la hoja del autor) |
| 7 | El autor revisa las líneas nuevas en la hoja de F0 (`docs/review/lineas-plan10.md`) antes de la 1.1.0 | F13 (gate) |

Las preguntas técnicas siguen con su valor por defecto.

**Técnicas** (con el valor por defecto recomendado):

1. **¿La regla en el nivel o global?** En el nivel (sección 2.2).
2. **¿Cadenas por enredaderas tapadas en la niebla?** No (X2): es lo que dice el GDD del capítulo 3.
3. **¿Los niveles de maestría 4.12, 5.4, 5.5 y las secretas 4.13 y 5.6 también `seen`?** Sí (sección 2.2). Alternativa: solo los de introducción y práctica.
4. **¿Separar y pasar el farol cerrados en los niveles `seen`?** Sí (X1); deshacer sigue libre.
5. **¿El arrastre completo sigue valiendo tras desplegar?** Sí, junto al de levantar.
6. **¿Veredictos del «Terminé» como avisos de interfaz?** Sí, en `strings.json`.
7. **¿«Plegar a mano» con la base a oscuras?** Sí. Alternativa: quitarlo también del modo libre.
8. **¿Quitar la tarjeta muerta?** Sí, tras la propiedad. Alternativa: dejarla como distractora con la refutación «tras el paso 1, todo brote a oscuras ya tiene sol».
9. **¿Apuestas de 6.5?** Bruto solo en la primera ronda; la receta en las tres.
10. **¿Testigos del núcleo?** Al final de la pestaña Puente. Alternativa: solo en modo profesor.
11. **¿Versión?** `1.1.0`, tag `v1.1.0` tras el visto bueno del autor.

---

## Cierre del plan

**Hecho (2026-10-19).** Las catorce fases, F0–F13, en su orden (F10 con las respuestas del autor del 2026-10-18). Versión `1.1.0` en `package.json`; el merge a `main` y el tag `v1.1.0` quedan para el autor.

- **F0.** La hoja `docs/review/lineas-plan10.md`, generada por `npm run lines` contra las copias de `v1.0.1`; hoy, 148 líneas de diálogo y 56 textos de interfaz distintos de la 1.0.1.
- **F1 y la luz.** La regla de cadena por nivel (`any`, `seen`, `fromBase`), las acciones cerradas por hoy (`actionClosed`), la niebla para cadenas, uniones, pases y tallos (X2), 4.9 con los faroles cerrados y 4.10 con la flor cerrada, probados con el recorrido exhaustivo. Como con marcas libres `seen` no obliga a plegar (sección 2.4), en 4.4–4.8, 4.12 y 5.1–5.6 **la luz busca sola** («Avanzar la luz», `stepLight`) y se para en cada flor hasta que se pliega. Decisiones del autor: **4.13 se queda a mano** (su lección es que el orden lo elige el jugador) y **una marca por pulsación**, también en los niveles grandes.
- **F2.** Desde el capítulo 3 el trazo solo dice si es legal; los tramos hallados se dibujan y, tras desplegar, se arrastra solo el tramo de dentro (gesto de levantar), con el arrastre entero todavía válido.
- **F3.** En los niveles, plegar es solo tocar el choque (`foldAt`); el modo libre conserva plegar un bucle elegido, solo con la base a oscuras (`baseNotDark`) y con su tarjeta. Decisión de la sesión principal: **el botón del modo libre sigue diciendo «Plegar»** (`tool.foldLoop`); «Plegar a mano» es el nombre del GDD y de la tarjeta.
- **F4.** Veredicto puro de un «Terminé» que no gana (`claimVerdict.ts`), aviso suave, rechazo para las pistas y `verdict` en el registro; «Presentar» en los niveles de certificado, con su tarjeta; `declareDone` dice lo que el jardinero afirma. La pantalla del nivel pasó a cargarse aparte, con su propio presupuesto.
- **F5.** El récord de progreso (`progress.ts`) reinicia la espera de la pista; el botón Pista siempre a mano, con brillo cuando se ofrece; `hintReveals` en el check de integridad y 19 pistas de grado 2 reescritas como zona o pregunta; 1.5–1.9 con tres pistas propias. Decisión de la sesión principal: **las pistas de grado 2 genéricas** (un nivel sin resaltado escrito) **señalan donde empieza la jugada**, no la respuesta entera.
- **F6.** `notebookEcho`; los seis Cuadernos (1.5, 2.4, 4.7, 4.10, 4.11, 5.3) antes del resumen, con la opción correcta en otras palabras y un distractor que copia a medias; 3.8 (c) refutada con un jardín.
- **F7.** Preguntas `ask` con contraejemplo jugable: 2.3, 3.4, 3.8 (con un jardín de abejas y tréboles), 5.2 y 7.4 (la línea 08 es la respuesta al acierto). La de 5.2 se hace al final del nivel, sobre lo que el jugador ya abrió. Pregunta 8 del Apéndice A del Plan 09, resuelta.
- **F8.** 2.4 en dos fases (`beatable: false`) sobre un jardín cuyo máximo deja dos brotes a oscuras; `mirror.spared` ya no dice que ganar es difícil.
- **F9.** La tarjeta muerta fuera de la receta tras probarlo con una propiedad; textos de la receta; 6.5 con Bruto solo en la primera carrera (cuatro apuestas, cinco semillas como mucho en el hub). Respuesta 5: **«≈ 3 a 5 veces» llega hasta ×6**, para cubrir lo que dice. Umbrales de 2.5 y 6.7 sin cambios.
- **F10.** Abejas y tréboles, jardines secretos y el día (con el sol del asa), en el juego, el Códex, el GDD y los documentos; `tests/vocabulary.test.ts`.
- **F11.** 1.1 y 1.2 («Mira otra forma…»), la línea de 1.7 y su eco en 4.3, y la invitación al Códex al final de cada capítulo (respuesta 6). Decisión de la sesión principal: **7.5 acaba con el amanecer**, con la invitación justo antes.
- **F12.** C08 Intuición con la cadena que sigue tras girar el tallo; los testigos del núcleo al final de la pestaña Puente; el Códex al día con 2.4, 4.5, 4.10 y 7.4; `docs/codex-review.md` señala las secciones cambiadas.
- **F13.** Los protocolos A, B y C (y el kit) con los hechos nuevos, sin tocar umbrales ni criterios: los motivos `chainNotSeen`, `flowerClosed`, `actionClosed`, `lightAtFlower`, `lightFound`, `lightDone`, el `verdict` de los reclamos, los Cuadernos antes del resumen, las preguntas nuevas, qué mirar en 4.4–4.10 y en el capítulo 5 con la luz, y la pregunta oral tras 4.11; el README con lo nuevo de la 1.1.0; versión 1.1.0.

**Suite.** 534 archivos y 6047 tests (5379 en la 1.0.0), cobertura de líneas 99,8 % (sentencias 99,5 %, ramas 98,0 %); `test:explore` (semilla al azar, 2000 casos) verde. Lint, formato, tipos, `check-levels`, `assets:check` y build en verde.

**Presupuesto** (tras el build, KB decimales): JavaScript 1741 de 1800; carga inicial 3097 de 3500; libros 894 de 1000; modo libre 54 de 60; pantalla del nivel 72 de 100; imágenes 226 de 600; sonidos 1071 de 1500; música 15 412 de 20 000.

**Lo que es del autor:**

- Revisar `docs/review/lineas-plan10.md` (pregunta 7, gate de la versión): cada línea nueva o cambiada, con su casilla; los cambios entran en `lines.json` / `strings.json` en commits propios y la hoja se regenera.
- El hito final en pantalla: 4.1 → 4.11 seguidos y 5.1 → 5.3 con `npm run save -- after-ch3` / `after-ch4`, y el capítulo 1 entero con 1.7 y 1.8.
- Las preguntas que dejaron abiertas las fases:
  - El trébol se sigue dibujando con el sprite de una flor: ¿se busca otro en los packs CC0, o se queda?
  - La apertura de C04 («Arrastra el día y mira la noche…»): ¿suena bien el día junto a la noche?
  - 0.5 repite «día» («…mira el día que pasó. Arrastra el día.»).
  - 2.4: la pista de grado 2 (`ch2.4.sauce.15`, «Mira dónde gana el agua») se ofrece también en el paso de jugar entre las dos fases del espejo (usar la cadena), donde quizá no encaja.
  - 7.5 invita a leer «Las piedras» (C12), aunque lo que abre es C14.
  - La redacción de las Intuiciones nuevas de C7 y C3.
  - Un guardado anterior a la 1.1.0 puede tener hasta 8 semillas (6.5 tenía seis apuestas); el hub dibuja como mucho cinco plantas.
- Con todo visto: merge `develop → main` (con el CI de `develop` en verde), comprobar el despliegue y poner el tag `v1.1.0`.
- Siguen pendientes las preguntas del Apéndice A del Plan 09 que este plan no tocó, los umbrales de los playtests y los playtests con personas.

---

## Apéndice A — Borradores de líneas (para la hoja del autor)

Borradores de este plan; las fases los escriben tal cual y el autor los corrige en `docs/review/lineas-plan10.md`. Corchetes = nombre pendiente de las preguntas 1–4.

**F1 (motivos).** `reason.chainNotSeen`: «Hoy los faroles solo se mueven por donde llegó tu luz. Busca la cadena con tus marcas.» · `reason.flowerClosed`: «La flor está cerrada por hoy: una cadena solo puede rodearla saliendo de su base, y su base todavía tiene farol.» · `reason.actionClosed`: «Hoy no se puede {action} en este jardín.»

**F2 (tarjeta).** `tutorial.unfold.body`: «Con Marcas, toca una flor cerrada para abrirla. El trozo de cadena que ya encontraste sigue dibujado: arrastra solo el tramo de dentro de la flor para completarlo.»

**F3 (plegar).** `tool.foldLoop`: «Plegar a mano» · `tutorial.fold.body`: «Con Marcas, toca la enredadera donde se tocan dos soles del mismo árbol: el bucle se pliega en una flor.» · `reason.baseNotDark`: «A mano solo se pliega una flor con la base a oscuras: gira antes su tallo. Así plegar no esconde ninguna cadena.»

**F4 (reclamos).** `claim.chainLeft`: «Mmm… este jardín todavía guarda una cadena. Mírala con calma.» · `claim.searchOpen`: «Tu búsqueda aún tiene enredaderas apagadas sin mirar desde algún sol.» · `claim.unguarded`: «Queda una enredadera sin vigilar.» · `claim.countMismatch`: «Hay {scarecrows} espantapájaros y {lanterns} faroles: para que sea una prueba tienen que ser los mismos.» · `claim.countShort`: «La cuenta dice que al menos {bound} duermen a oscuras, y hay {dark}: todavía no prueba nada.» · `claim.searchNotOver`: «Primero la búsqueda tiene que acabar sin cadena.» · `claim.notTheMoons`: «Esas piedras no son las lunas de tu búsqueda.» · `hud.present`: «Presentar» · `diagram.event.declareDone`: ««Terminé»: el jardinero dice que el jardín no puede hacerlo mejor.»

**F5 (pistas de grado 2, ejemplos).** 3.7: «¿Qué brotes tocan muchas enredaderas a la vez?» (sin resaltado) · 3.8: «¿Qué brotes recibieron una visita pidiendo?» (sin resaltado) · 4.4: «Mira este bucle. ¿Dónde se tocan dos soles del mismo árbol?» (resalta el bucle b, c, d) · 4.10: «¿Qué brote tendría que quedar a oscuras?» (resalta b) · 7.4: «¿Qué te dejó la búsqueda en cada brote?» (sin resaltado). Las demás, mismo patrón: zona o pregunta.

**F6 (Cuadernos; opción correcta nueva y distractor que copia a medias).** 1.5: correcta «…gana uno, ni más ni menos, por larga que sea»; distractor «…enciende un farol por cada brote a oscuras que toca». · 2.4: correcta «…cualquier otra disposición encenderá como mucho los mismos»; distractor «…nadie gana mientras busque bien». · 4.7: correcta «…el único pétalo por el que la luz de la flor sale hacia afuera»; distractor «…el pétalo cuyo farol va hacia el tallo, sea cual sea». · 4.10: correcta «…no gano ni pierdo, y la oscuridad pasa a la base»; distractor «…los mismos faroles, y la base gana uno». · 4.11: correcta «…deja el jardín con cadena justo cuando ya la tenía»; distractor «…no crea cadenas, pero puede esconder alguna». · 5.3: correcta «…la entrada y la salida deciden un único lado bueno»; distractor «…solo alterna el lado corto». Los resúmenes de hoy (`ch4.7.sauce.04`, `ch4.10.sauce.05`, `ch4.11.sauce.06`, …) pasan a `reply` del acierto.

**F7 (preguntas).** 2.3: «¿Podría una punta del hilo plateado tener un farol tuyo?» — «No: el hilo empieza y acaba con farol plateado, y un brote solo carga un farol» ✔ / «Sí» ✘ (respuesta que lo explica). · 3.4: «Cada sol llegó desde su raíz por un camino que alterna. ¿Qué sale al unirlos por la enredadera que los toca?» — «Una cadena de una raíz a la otra» ✔ / «Un bucle» ✘ / «Nada» ✘. · 3.8: «Entre abejas y [tréboles], ¿pueden tocarse dos soles del mismo árbol?» — «No» ✔ / «Sí» ✘ (contraejemplo: inténtalo en este jardín). · 5.2: «Esta cadena cruza la flor grande. ¿Qué abres primero?» — «La grande: la pequeña es uno de sus pétalos, y hasta abrirla no tiene enredaderas propias» ✔ / «La pequeña» ✘ / «Da igual» ✘. · 7.4: «Al quitar las lunas, ¿con quién queda conectado cada sol?» — «Con nadie de fuera: de un sol solo se llega a lunas» ✔ (`reply` = `ch7.4.sauce.08`) / «Con otros soles» ✘ / «Con brotes sin marca» ✘.

**F8 (espejo).** `ch2.4.sauce.00`: «Estos faroles son tuyos. Ahora juega a ser el agua: dibuja un reflejo que encienda más faroles que tu jardín.» · tras el primer `draw`: «Quien te gana te deja una cadena. Úsala.» · antes del segundo: «Ahora tu jardín no tiene ninguna cadena. Intenta ganarle otra vez.» · cierre: «No se puede. Si no tienes cadena, nadie te gana.» · `mirror.spared`: «Prueba con más faroles plateados que los tuyos.»

**F9 (receta y carrera).** `recipe.cases` y `recipe.card.chainRootToRoot`, como en la tabla de F9 · `ch6.1.sauce.02`: «Cada tarjeta de caso habla de un vecino distinto: con farol, sol de otro árbol, sol del mismo árbol, luna. Una para cada uno.» · `ch6.5.sauce.06`: «Se duplica otra vez, de 16 a 32 brotes. ¿Se repetirá lo de antes para tu receta?»

**F11 (Prado).** `ch1.1.sauce.00`: «Mira otra forma de ver lo que pasó: si Beto le da su farol a Ana, Cleo puede buscar a Dani. Eso es pasar el farol.» · `ch1.2.sauce.00`: «Mira otra forma de verlo: uno, dos, tres pases, y al final había sitio para uno más. Eso es una cadena.» · 1.7: «Seis brotes en corro, y la cadena pudo ir por cualquiera de los dos lados. Acuérdate de este bucle.» · 4.3: «¿Te acuerdas del corro del Prado? Otro bucle. Antes de desconfiar de tu luz, busca desde R y cuéntale los brotes.»

**F12 (Códex).** C08, Intuición: «Primero gira el tallo: la base queda a oscuras y no ganas ni pierdes ningún farol (4.10). Tienes los mismos faroles, así que si el jardín abierto podía mejorar, sigue habiendo una cadena: lo viste en el estanque. Ahora dibuja una cadena cualquiera…»
