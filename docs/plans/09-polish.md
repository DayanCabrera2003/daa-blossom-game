# Plan 09 — Pulido y despliegue web

> Alcance: lo que queda del GDD §11 punto 12, "Pulido y despliegue web", es decir, todo lo que falta para dar el juego por terminado salvo lo que solo puede hacer el autor. Las comprobaciones de legibilidad que aún faltan (nombres sobre enredaderas) y los arreglos pendientes del modo libre y las flores secretas; las piezas y animaciones que las revisiones en pantalla de los planes 06 y 08 dejaron anotadas; la **pantalla de créditos** (`music.credits` espera en `tests/assetUse.test.ts`); el **teclado y el foco** en todo el juego; el **movimiento reducido**, el contraste y un lector de pantalla para el diálogo; las **pantallas pequeñas y el táctil**; el **audio** en todos los navegadores (formatos, respaldo, mezcla como datos); la **carga y el rendimiento**; la **compatibilidad** (Chrome, Firefox, Safari) y la **robustez de GitHub Pages** (404, fallos de red, despliegues nuevos con pestañas abiertas); el **kit del autor** para los playtests y el video; el **README** final y la versión 1.0.
> Fuera de alcance (lo hace el autor; el plan solo le prepara el material): grabar el Paseo guiado (GDD §5.9, §9; punto 11), dirigir los playtests con personas (GDD §10), escuchar y aprobar el audio, decidir las preguntas de diseño del Apéndice A, la prueba de rigor de un compañero (`docs/codex-review.md`), presentar el GDD al profesor (GDD §12). También fuera: la traducción al inglés (la estructura por idioma ya existe), un modo sin conexión con *service worker*, cualquier contenido nuevo (niveles, entradas, cosméticos).
> Referencias: `docs/GDD.md` (§2 principios, §4.1 pixel art y UI, §4.2 sonido, §4.3 recursos, §5.4, §5.7, §5.9, §5.10, §5.11, §9 guion del video, §10 playtesting, §11, §12), `docs/plans/02-greybox-engine.md` (decisión abierta 2: gesto de cadena accesible), `docs/plans/06-art-and-audio.md` (1.7 música, 1.9 balbuceo, riesgos de Safari, presupuesto), `docs/plans/07-codex-epilogue-teacher.md` (bus, capas DOM, `--zoom`, panel del profesor), `docs/plans/08-sandbox-secrets-cosmetics.md` ("Pendiente para la fase de pulido", "Comprobaciones a mano del autor", presupuesto medido), `docs/playtest/A.md`, `B.md`, `C.md`, las reglas del proyecto.

---

## 0. Criterios globales

- **El pulido no cambia el juego.** Ningún nivel cambia de solución, de óptimo ni de guion; ninguna regla del núcleo cambia. Lo que tocaría el diseño (Apéndice A) no se decide aquí: una fase que dependa de una respuesta del autor la espera, y si no ha llegado se salta esa fila y lo dice en su informe.
- **Decidir es puro; dibujar, sonar y montar el DOM, no.** Cada arreglo visual que se pueda medir se escribe primero como test sobre una función pura (`levels/`, `game/picture/`, `game/input/`, `game/systems/`, `game/scale/`, `game/assets/`, `services/`, `ui/model/`); `game/view/`, `game/scenes/`, `game/audio/` y `ui/*` solo pintan, suenan o montan. Las comprobaciones de legibilidad (nombres, cajas, filas de botones, tamaños de toque, contraste) son tests con las palabras reales, la fuente real y el catálogo real, como `tests/panelFit.test.ts` y `picture/bottomRows.test.ts`.
- **Los números que se ajustan de oído o de vista son datos.** Opacidad y deriva de la niebla, brillo del halo, distancia del espantapájaros, volúmenes por canal y por sonido, rangos del balbuceo: cada uno vive en una tabla con nombre y con un test de rango, para que el autor cambie un número y no una función.
- **Todo texto visible está en `src/content/es/`**, también el de la pantalla de créditos, el aviso de un fallo de red, la página 404 y el `<noscript>`: `index.html` y `404.html` toman sus textos de `strings.json` al construir. **Regla del vocabulario** sin excepción fuera del Códex y del panel del profesor.
- **Sin dependencias nuevas.** Si la fase de audio concluye que hace falta un formato de respaldo, el codificador es una herramienta del sistema llamada desde `tools/` (no un paquete de npm), con su versión anotada; si aun así hiciera falta un paquete, la fase se detiene y lo pregunta (cada dependencia, en su propio commit `chore: add <dep> for <reason>`).
- **El script inicial está casi lleno** (1724 de 1800 KB tras el Plan 08). Lo nuevo que no se necesita al arrancar va diferido con `import()` (la pantalla de créditos, como el modo libre con su cabo); `tests/initialScript.test.ts` lo vigila y `npm run budget` lo mide en cada fase que empaqueta.
- **Una responsabilidad por archivo, ≤ 1000 líneas.** `LevelScene.ts` (422 líneas) y `HubScene.ts` (174) no crecen con lógica: el foco, el teclado y los créditos entran por archivos pequeños y descriptores puros.
- **Las fases se ejecutan de una en una**, en el orden de "Orden y dependencias". **Ninguna fase abre un navegador**, ni un servidor de desarrollo o de vista previa, ni hace capturas: verifica con tests. Al cerrar cada hito, la **sesión principal** revisa en pantalla (un único navegador headless, cerrado al terminar) lo que necesita ojos, con la lista del hito.

Definición de "hecho" de cada fase: la del Plan 03 (lint, format:check, typecheck, coverage ≥ 95 %, check-levels, build), más `npm run budget` tras el build en las fases que cambian lo que se empaqueta (3, 4, 6, 7, 8, 9, 10) y `npm run assets:check` en local en las fases que cambian la selección de recursos (2 si cambia algún icono, 8, 9).

---

## 1. Inventario de lo pendiente

Todo lo abierto que se encontró, sin repetir, con su origen y la fase que lo cierra. "Ojos" = necesita la revisión en pantalla del hito; "oído" = el autor lo escucha (lista en la fase 8); "autor" = Apéndice A o B.

| # | Pendiente | Origen | Fase |
|---|---|---|---|
| 1 | El nombre de un brote cae sobre la línea de una enredadera (4.11: a, c, g; 7.5: j, d); las comprobaciones de nombres no miran enredaderas | Plan 08, "Pendiente para la fase de pulido" | F0 |
| 2 | La fila de abajo del modo libre se pisa 2 px con la fuente de reserva | Plan 08, F13 y pendiente | F1 |
| 3 | Un jardín abierto desde un JSON con brotes bajo la cabecera del editor (y 28–36) se desplaza hacia abajo al abrirse | Plan 08, pendiente (decisión del autor sobre la pregunta 2 de F15) | F1 |
| 4 | Las flores secretas enseñan tarjetas de mecánica en un perfil nuevo de modo profesor (el Plan 08 §1.1 dice que no hay tarjeta que mostrar) | Plan 08, pendiente | F1 |
| 5 | El icono de una flor secreta ganada podría leerse mejor | Plan 08, pendiente | F2 (ojos) |
| 6 | Los pétalos del plegado empiezan más anchos que la flor ya dibujada | Revisión de F10 del Plan 06 | F2 |
| 7 | El disco oscuro del estanque sobre el farol de un hilo con doble luz | Revisión de F3 del Plan 06 | F2 (ojos) |
| 8 | Opacidad (0,16) y deriva de la nube de niebla; brillo del halo del farol; espantapájaros a 12 px de su brote | Revisión de F3 del Plan 06 | F2 (ojos) |
| 9 | El icono de la luna no aparece en ningún sitio (la barra pasaría de 480 px); el Plan 06 §1.4 lo pedía en el HUD | Revisión de F11 del Plan 06 | F2 (Apéndice A 15: insignia en "Marcas") |
| 10 | El panel de ajustes sigue siendo un rectángulo plano; los demás paneles son de madera 9-slice | Revisión de F11 del Plan 06 | F2 |
| 11 | Duración de salto, destello, plegado y piedra; el conflicto parpadea dorado/azul | Revisión de F10 del Plan 06 | F2 (ojos) |
| 12 | Pantalla de créditos; `music.credits` en la lista de espera de `tests/assetUse.test.ts` | Plan 06 §1.7, Plan 08 (fuera de alcance), `tests/assetUse.test.ts` | F3 |
| 13 | Navegación con teclado del hub más allá de F / Mayús+F | Plan 08, pendiente | F4 |
| 14 | Teclado en niveles, paneles, preguntas, tarjetas, victoria y ajustes; anillo de foco | GDD §11.12, revisión de la sesión principal | F4 |
| 15 | Un gesto de cadena alternativo al arrastre ("se decide en el pulido") | Plan 02, decisión abierta 2 | Apéndice A 16: no; F5 descartada, el README lo dice (F12) |
| 16 | El movimiento reducido solo se respeta en los cosméticos del hub y en los libros, no en las animaciones del nivel | Código (`HubCosmetics.ts`, `book.css`, `epilogue.css`) | F6 |
| 17 | Contraste del texto sobre sus paneles; diálogo legible por un lector de pantalla | GDD §11.12 | F6 |
| 18 | Móviles: con `integerZoom` un teléfono apaisado queda a ×1 (480 × 270 px CSS, letra de 8 px); vertical, sin aviso; toques del navegador (doble toque, desplazamiento, menú) sobre el lienzo | Código (`scale/integerZoom.ts`, `index.html`), GDD §11.12 | F7 (Apéndice A 17: aviso "gira el teléfono") |
| 19 | Safari y Ogg Vorbis (31 archivos `.ogg`: toda la música y los efectos de Kenney); respaldo reproducible si hace falta | Plan 06, riesgos y decisión de copiar las músicas tal cual | F8 |
| 20 | Rangos de tono del balbuceo, Robles a tres voces al 60 %, ritmo de escritura (30 letras/s del jardinero y del Cuaderno, ×3), volúmenes | Revisión de F7 del Plan 06 | F8 (oído) |
| 21 | Primera carga de ~4,1 MB (con 1 MB de música del hub en `boot`); pantalla oscura hasta que el script de 1,7 MB arranca; sin favicon | `npm run budget` del Plan 08, `index.html`, `public/` | F9 |
| 22 | Un fallo al cargar un trozo diferido (libros, hoja de compartir, modo libre) solo se escribe en la consola; con una pestaña abierta durante un despliegue nuevo, los trozos viejos dan 404 | Código (`ui/shell.ts`, `SandboxGate.ts`) | F10 |
| 23 | Página 404 de Pages, `<noscript>`, descripción de la página; objetivo de compilación sin fijar (Vite por defecto) | `index.html`, `vite.config.ts` | F10 |
| 24 | Umbrales "propuesta" de los protocolos A–C (y los límites de 60/75/90 minutos) | `docs/playtest/A.md`, `B.md`, `C.md` | Apéndice A, B |
| 25 | Los protocolos A–C hablan de greybox "sin arte ni voz"; el juego ya tiene arte y sonido | `docs/playtest/*.md` | F11 (hechos), Apéndice A (criterio) |
| 26 | Líneas en español escritas por los planes donde el GDD no da la frase (Plan 03: "una línea provisional en el mismo tono") | Plan 03, memoria de sesiones | F11 (hoja), Apéndice A |
| 27 | Kit de playtests y guion de grabación del video | GDD §9, §10; encargo | F11 |
| 28 | `README.md` dice "The guided walk and the final polish are still to come", no enlaza el juego publicado ni dice qué navegadores ni qué teclas | `README.md` | F12 |
| 29 | GDD §5.9 dice "Guion en sección 10"; el guion es la §9 | `docs/GDD.md` | F12 |
| 30 | `package.json` en versión 0.0.0; sin tag 1.0 | `package.json`, `git tag` | F12 |
| 31 | Preguntas de diseño abiertas de niveles concretos (3.5, 1.9, 1.3, 2.4, 5.1–5.3, 6.3, 6.4–6.5, 7.4, 7.5), nombres de capítulo, título, firma | Planes 04–05 (informes de fase), GDD §12 | Apéndice A (título y firma contestados; el resto, pendiente del autor) |

---

## Fase 0 — Nombres sobre enredaderas

| Archivo | Responsabilidad |
|---|---|
| `levels/layoutChecks.ts` | Problema nuevo `labelOnVine` (`{ label, vine }`): la caja del nombre de un brote (`labelBox`) cruza el segmento de una enredadera que no sale de ese brote. Intersección segmento–caja pura (o un archivo propio `levels/segmentBox.ts` si `layoutChecks.ts` crece de su responsabilidad), con el mismo margen que `labelOnLantern` |
| `levels/integrity.ts`, `tools/describeProblem.ts` | Lo cuentan y lo describen ("the label of a sits on the vine c–g") |
| `levels/data/ch4/4-11.json`, `levels/data/ch7/7-5.json` | Posiciones movidas lo justo (unos píxeles) para que a, c, g y j, d queden libres, sin cruzar enredaderas nuevas ni tocar el HUD |
| `levels/data/**` | Cualquier otro nivel que el check nuevo señale, con el mismo criterio |

El editor del modo libre **no** recibe este motivo en esta fase (ver F1): aquí solo el catálogo.

**Tests clave:** un nombre justo encima de una enredadera horizontal es `labelOnVine` y uno a 1 px de ella no; la enredadera que sale del propio brote nunca cuenta; una enredadera vertical que atraviesa la caja por el centro sí; `check-levels` y `tests/levels.test.ts` pasan con 4.11 y 7.5 movidos; las soluciones, los óptimos y los guiones de los niveles movidos no cambian (`tests/playability.test.ts` sin tocar).

*En ejecución:* el check mide la enredadera como su trazo encendido (2 px, `PICTURE_SIZES.vineStroke`, que `GardenView.ts` usa ahora para dibujarlo) más el margen de 1 px de los nombres, en línea recta (`plane.ts`, `segmentNearBox`). Como `checkLayout` y `checkIntegrity` también los exigen las propiedades del modo libre, `labelOnVine` no entra en ellos: vive en `labelsOnVines` y lo suma `checkCatalogLevel` (`integrity.ts`), que usan `tests/levels.test.ts`, los niveles de prueba y `check-levels`; F1 lo pasa a `checkLayout` si el editor y los generadores pueden cumplirlo. En el catálogo solo lo incumplía **1.10** (el nombre de I sobre J–T): I sube 3 px. **4.11 y 7.5 no se movieron:** sus nombres (a, c, g; j, d) los cruza la enredadera **del propio brote** que baja desde él, el caso que esta fase excluye. Contando las enredaderas propias, 88 nombres de 38 niveles quedarían cruzados (toda enredadera que baja empinada atraviesa el nombre de su brote), y no se arreglan con unos píxeles. Pendiente del autor / de la revisión P1: (a) dejarlo; (b) arreglarlo en la vista (el nombre con un contorno o un fondo de 1 px sobre la enredadera, o la enredadera cortada bajo el nombre), sin mover niveles; (c) contar las propias y redisponer esos niveles.

**Decisión (sesión principal, 2026-10-18): opción (b).** Se arregla en la **vista**, para todos los nombres y sin mover ningún nivel: cada nombre de brote se dibuja con un contorno oscuro de 1 px (o un respaldo equivalente) que lo hace legible sobre cualquier enredadera, también la de su propio brote. Lo implementa la fase 2 (fila nueva en su tabla y comprobación en el hito P1). `labelsOnVines` sigue sin contar la enredadera propia.

---

## Fase 1 — Arreglos del modo libre y de las flores secretas

| Archivo | Responsabilidad |
|---|---|
| `levels/sandbox/untangle.ts`, `levels/sandbox/design.ts` | El editor y la disposición conocen `labelOnVine`: `untangle` lo evita al buscar sitio, y el reductor lo rechaza con el motivo `coversName` que ya existe. Si en los tamaños máximos de algún generador no se puede cumplir siempre, la exigencia queda solo en el catálogo y se informa (desviación anotada en el plan) |
| `levels/sandbox/fitIntoEditor.ts` | Pura: un diseño abierto desde un JSON cuyos brotes (con su corona y su nombre, `sproutExtent`) caen por encima de `editorArea` se desplaza hacia abajo lo justo, conservando las posiciones relativas; si no cabe ni así, se queda como está (se puede seguir editando) |
| `levels/sandbox/importText.ts` o `opening.ts` | Llaman a `fitIntoEditor` con lo importado (no con lo generado, que ya cabe) |
| `game/picture/bottomRows.ts`, `game/picture/orderButtons.ts` | Las dos filas del modo libre caben también con la fuente de reserva: menos hueco entre botones cuando no caben, nunca menos de 1 px, y nunca texto recortado |
| `game/systems/tutorials.ts` | Una flor secreta (`secret`) no ofrece tarjetas de mecánica, ni al empezar ni en sus pasos, en ningún perfil; el botón "?" sigue abriendo las ya vistas |

**Tests clave:** un JSON con un brote en y = 30 abre con todos los brotes dentro de `editorArea` y las mismas distancias entre ellos; uno que ya cabía no se mueve; en `bottomRows.test.ts`, con la fuente de reserva (un píxel más ancha por letra) las filas del modo libre caben **sin** pisarse (el test que hoy acepta los 2 px pasa a exigirlo); `levelCards` y `startCards` de las siete flores son vacíos con un guardado vacío y en modo profesor; las propiedades del modo libre (`toLevel` acepta todo lo generado e importado) siguen verdes con `labelOnVine`.

*En ejecución:* **`labelOnVine` entra en `checkLayout`** para todos los jardines: se pudo cumplir en el modo libre. `untangle.ts` cuenta como choque el nombre de un brote cruzado por una enredadera de otros (en las dos direcciones: el nombre de `v` sobre las enredaderas ajenas y las enredaderas de `v` sobre los nombres ajenos), y el reductor del editor lo rechaza con `coversName`. Medido antes de decidir: los 754 jardines de todos los generadores en todos sus tamaños (20 semillas para los dos al azar) y 1870 jardines al azar de hasta 24 brotes en las cuatro formas salen sin ningún problema de lectura (antes, 385 de los 754 tenían un nombre sobre una enredadera). Coste: disponer un jardín tarda como mucho ~0,3–0,4 s (abejas y flores de 20), frente a ~0,05 s antes; para no pasar de ahí, `segmentNearBox` (`plane.ts`) descarta primero por las cajas. Como `checkIntegrity` ya lo cuenta, `checkCatalogLevel` desaparece (`tests/levels.test.ts`, los niveles de prueba y `check-levels` usan `checkIntegrity`). **`fitIntoEditor`** desplaza el jardín abierto desde un JSON hacia abajo si empieza bajo la cabecera y también hacia arriba si su último nombre pisaría los botones (el mismo fallo por el otro lado; `SPROUT_AREA` llega a y = 226 y el hueco del editor a 221), y lo llama `importText` solo para los archivos de nivel. **Fila de abajo:** `bottomRow` (`bottomRows.ts`) coloca engranaje, Códex, Traza y botones y estrecha el hueco de 3 px a 2 o 1 si no caben; con la fuente de reserva (1 px más por letra) la fila de abajo del modo libre cabe con 2 px. **La fila de arriba no se puede arreglar así:** en el modo libre con todo aprendido (seis herramientas, "Jardinero" y "Certificado") sus textos solos miden 511 px con la fuente de reserva, de 472 disponibles; ni con huecos de 1 px cabe. Con la fuente del juego cabe (467 de 472). Queda para el autor (¿otra disposición de las órdenes, o aceptar que solo la fuente de reserva la desborda?); el test exige la fila de arriba con la fuente del juego. **Tarjetas:** una flor secreta no ofrece tarjetas al empezar (`startCards`) ni en sus pasos (`levelStepCard`, que usa `LevelScene`); `levelCards` no cambia porque de ella sale lo que abre "?" (`helpCards`), que sigue mostrando las de lo que el jardín tiene abierto.

**Decisiones (sesión principal, 2026-10-18), sobre las preguntas de F1:** (1) la fila de arriba del modo libre que solo se desborda con la **fuente de reserva** se acepta tal cual: el juego trae su propia fuente (monogram) y con ella cabe; el test sigue exigiéndola con la fuente del juego. (2) Los ~0,3–0,4 s que tarda disponer un jardín generado o importado con `labelOnVine` se aceptan.

---

## Fase 2 — Piezas y animaciones que se pueden medir

| Archivo | Responsabilidad |
|---|---|
| `game/picture/foldFrames.ts` | El primer fotograma del plegado sale del tamaño de la flor ya dibujada (las medidas de `levels/pictureSizes.ts` y de `picture/petals.ts` que usa `view/paintFlower.ts`), no de uno mayor |
| `game/picture/look.ts` | Pura y nueva: la tabla con nombre de los números de vista que se ajustan a ojo: opacidad y deriva de la niebla, brillo y tonos del halo, distancia del espantapájaros a su brote, duraciones de salto, destello, plegado y piedra (las que hoy están en `animation/plan.ts` siguen allí si ya son una tabla; `look.ts` solo reúne las sueltas) y los colores del parpadeo del conflicto. Cada valor con su rango permitido |
| `game/picture/pond.ts`, `game/view/MirrorView.ts` | El disco oscuro del estanque se dibuja por debajo del farol de un hilo con doble luz (orden de capas como dato, probado) |
| `game/picture/secretFlower.ts` | La flor ganada se lee mejor: una forma propia más grande dentro de la misma columna de 16 px (pétalos dorados con contorno de 1 px y la estrella encima), sin salir de su caja |
| `game/view/SettingsView.ts`, `game/picture/settingsPanelLayout.ts` | El panel de ajustes con el marco de madera 9-slice de los demás paneles (`WoodFrame`), con el mismo contenido |
| `game/picture/sproutName.ts`, `game/view/GardenView.ts` | El nombre de cada brote con un contorno oscuro de 1 px (o un respaldo equivalente) que lo despega de cualquier enredadera, incluida la de su propio brote (decisión de F0, opción (b)); pura: el color del contorno y las cajas resultantes, que siguen cabiendo donde cabía el nombre (`labelBox` crece 1 px por lado o el margen lo absorbe) |
| `game/picture/hud.ts`, `game/view/HudView.ts` | El icono de la luna (Apéndice A, pregunta 15, respuesta **(b)**): una insignia de 8 × 8 dentro del botón de la herramienta "Marcas", sin texto, junto al sol; la caja del botón no cambia y la barra sigue cabiendo en 480 px |

**Tests clave:** el contorno del nombre contrasta con el texto del nombre y con el trazo encendido y apagado de una enredadera (`picture/contrast.ts`), y la caja del nombre con contorno no pisa el HUD ni otros nombres en el catálogo; el radio del primer fotograma del plegado es el del dibujo de la flor para 3, 5 y 7 pétalos y para la anidada; cada valor de `look.ts` está en su rango y el halo nunca iguala el color de un brote a oscuras (contraste, `picture/contrast.ts`); en un estanque de prueba, el farol del hilo doblemente iluminado queda por encima del disco; la flor ganada cabe en `flowerBox` en todas las disposiciones del hub (`tests/hubFlowers.test.ts`); el panel de ajustes sigue cabiendo con el marco (`tests/panelFit.test.ts`); la insignia de la luna cabe dentro del botón "Marcas" junto al sol, sin pisar su texto, con las palabras y la fuente reales.

*En ejecución:* **Nombres.** `picture/sproutName.ts` da el contorno: el nombre copiado en `ink` (el casi negro del pack) en los ocho vecinos a 1 px, bajo las letras claras (`view/OutlinedName.ts`, también en los nombres del estanque); copias de píxel y no el trazo del lienzo, que redondea las esquinas. La caja crece 1 px por lado y la absorbe el margen de `labelClearance`. Contra la barra de herramientas real (`tests/sproutNames.test.ts`, con las herramientas de cada nivel y el botón "Traza") cuatro niveles tocaban la madera: 3.5 (M, N, O, P), 4.11 (h, x) y 4.12 (m) suben 1 px y **4.8 (j) sube 3 px** (la cola de la j ya entraba 2 px en un botón antes del contorno); sin cambiar solución, óptimo ni guion. **Plegado:** `foldPetals` (`picture/petals.ts`, no `foldFrames.ts`) da los pétalos del tamaño del dibujo en todos los fotogramas, con la flor anidada pequeña en medio (`FoldShape.inner`); los fotogramas mueven los brotes y funden la flor. **`look.ts`:** niebla (opacidad, deriva), los tres fotogramas del halo y sus tonos, el hueco del espantapájaros, el destello, la caída y el asiento de la piedra, y el parpadeo del conflicto (veces, fundido, tonos); `DURATIONS` sigue en `animation/plan.ts`. **Estanque:** el orden de capas vive en `picture/gardenDepths.ts` (no en `pond.ts`, que decide qué reflejo se ve); el disco y el trazo oscuro de un hilo con doble luz se pintan aparte, entre las enredaderas y los faroles del jardín. **Flor ganada:** una roseta dorada de 15 × 15 con contorno de 1 px y la estrella en oscuro en el centro (`picture/wonFlower.ts`); **ya no lleva debajo la estrella y el número** de estrellas (no caben con la roseta): lo dice su rótulo (`hub.secret.wonTip`). **Ajustes:** marco `WOOD_PANEL` y textos en su tinta. **Luna:** el icono `Moon.png` del pack (Meteo, el mismo juego que el sol) a 1/3 (8 × 8), sobre la esquina inferior derecha del sol, 1 px dentro del hueco antes del texto; vive en `picture/buttonIcon.ts` y `view/Button.ts` / `ToolbarView.ts` (el botón de herramienta no está en `HudView`); el botón no cambia de tamaño.

**Decisiones (sesión principal, 2026-10-18), sobre las preguntas de F2:** (1) los movimientos de 1–3 px de 3.5, 4.8, 4.11 y 4.12 se aceptan: solo cambian posiciones, no soluciones, óptimos ni guiones. (2) Se acepta que la flor secreta ganada muestre sus estrellas solo en su rótulo (`hub.secret.wonTip`) y no bajo la roseta.

**Hito P1 (F0–F2), revisión en pantalla de la sesión principal:** 4.11 y 7.5 a ×3 (los nombres se leen sobre la enredadera de su propio brote gracias al contorno de 1 px, sin que ningún nivel se haya movido); el modo libre con la fuente de reserva forzada; un JSON con brotes arriba; `?teacher&level=1.10` sin tarjetas; plegar y desplegar en 4.4 (los pétalos arrancan del tamaño de la flor); 2.3 con un hilo de doble luz; 3.1 (niebla), 3.7 (espantapájaros), 4.2 (conflicto); el hub con una flor ganada (guardado sintético de F11, o uno escrito a mano para la revisión); el panel de ajustes; la insignia de la luna en "Marcas". Lo que no convenza se ajusta en `look.ts` antes de seguir.

---

## Fase 3 — La pantalla de créditos

| Archivo | Responsabilidad |
|---|---|
| `game/assets/creditsModel.ts` (o `services/credits.ts`) | Pura: de la selección de recursos (`tools/assets/selection.ts` reducida a datos que el juego puede importar, o del manifiesto si ya lleva pack y autor), las secciones de la pantalla: el juego y su autor (firma del Apéndice A, pregunta 14: "Dayan", "Diseño y Análisis de Algoritmos (DAA)", 2026, en la única clave `credits.byline`, que el autor puede cambiar), cada pack con autor, licencia y para qué se usa, la obra propia (campanitas, acordes, grillos), la fuente monogram, KaTeX y sus fuentes (SIL OFL 1.1), Phaser, y el agradecimiento. Nombres propios tal cual; todo lo demás, claves de `strings.json` |
| `game/picture/creditsRoll.ts` | Pura: la posición de cada línea en el instante t (desplazamiento lento que dura lo que la pista `music.credits`, 68 s, y se detiene al final), y con movimiento reducido, páginas que se pasan con una tecla o un toque |
| `game/scenes/CreditsGate.ts`, `game/scenes/credits/CreditsScene.ts` | Como el modo libre: un cabo en el script inicial que carga la escena con `import()`; la escena pinta el fondo del hub al amanecer, el rollo y la música de créditos (grupo `credits` de `loadPlan`), y vuelve a donde se abrió con Esc, Intro o un toque al final |
| `game/view/SettingsView.ts`, `ui/epilogue/EpilogueScreen.ts`, `ui/model/epilogue.ts`, `services/busEvents.ts` | Entradas: un botón "Créditos" en el panel de ajustes y otro en el epílogo (evento `credits.open`, como `sandbox.open`) |
| `tools/assets/freeMode.ts` (o una lista hermana) | Las carpetas de los créditos fuera del script inicial |
| `tests/assetUse.test.ts` | `AWAITING` queda vacío: `music.credits` ya suena |
| `content/es/strings.json`, `content/keys.ts` | `credits.title`, `credits.byline`, `credits.art`, `credits.music`, `credits.sound`, `credits.font`, `credits.software`, `credits.thanks`, `credits.license`, `settings.credits`, `epilogue.credits` |

**Tests clave:** cada pack de `CREDITS.md` (leído en el test) aparece en la pantalla con su autor y su licencia, y la pantalla no nombra nada que `CREDITS.md` no tenga; el rollo dura lo que la pista y la última línea queda quieta en pantalla; con movimiento reducido no hay desplazamiento; ninguna línea pasa de 480 px con la fuente real; `tests/initialScript.test.ts` no alcanza `game/scenes/credits/`; `assetUse` sin lista de espera; el epílogo ofrece los créditos; la regla del vocabulario.

*En ejecución:* **Una sola fuente.** Los packs salen del manifiesto (que escribe `selection.ts`, la misma lista contra la que `tests/assets.test.ts` comprueba `CREDITS.md`) y las bibliotecas de `game/assets/libraryCredits.ts`, escritas palabra por palabra como las nombra `CREDITS.md`; `tests/credits.test.ts` lee el archivo y exige que cada tercero (7 packs y 5 bibliotecas) salga con su autor y su licencia, y que la pantalla no nombre a nadie más. **`CREDITS.md` no tenía Phaser ni Zod**, que van en el script inicial con licencia MIT: se añadieron a "Libraries" (commit propio). **Secciones:** cada pack aparece en cada sección donde el juego usa un archivo suyo según su tipo (Arte: imágenes y hojas; Música: músicas y jingles; Sonido: efectos y sílabas; Letras: monogram y las fuentes de KaTeX; Programas: Phaser, Zod, KaTeX, marked), así que el "para qué" lo dice el título de la sección y no una línea por pack; la obra propia va aparte ("Obra propia": qué es, autor y licencia). Nombres propios y autores tal cual (en inglés si así los firman). Claves nuevas: `credits.byline` (la firma del Apéndice A, 14), `credits.art`, `.music`, `.sound`, `.font`, `.software`, `.license`, `.own`, `.ownWork`, `.thanks`, `.back` ("Volver (Esc)"), `settings.credits`, `epilogue.credits`; `credits.title` no hizo falta (el rollo abre con el título del juego, `hub.title`). **Rollo** (`picture/creditsRoll.ts`): el título queda quieto 4 s y el rollo baja 64 s más, hasta acabar con la pista (67,8 s medidos en el `.ogg`, probado), y se queda al final; con `prefers-reduced-motion` no se mueve solo y se lee por páginas que nunca cortan una línea (F6 lo pasará al ajuste propio). Intro, Espacio o un toque pasan página y, al final, vuelven; ↑ ↓ y la rueda lo mueven a mano; RePág / AvPág pasan páginas; Esc o "Volver (Esc)" vuelven en cualquier momento. La ventana del panel la recorta una segunda cámara de la escena (no recortes de texto), así cada línea se corta limpia en el borde. **Escena:** `CreditsGate` (en el script inicial, como el del modo libre) duerme las escenas que estaban abiertas (hub, nivel o modo libre, con su panel de ajustes tal cual), pinta la hierba del hub al amanecer y carga `credits/CreditsScene.ts` con `import()`; al salir se despiertan donde estaban y vuelve su música (`MusicPlayer.track`). Ambas entradas emiten `credits.open` por el bus; el epílogo solo lo ofrece cuando el juego lo anuncia (`capabilities.credits`, como el modo libre). **Epílogo:** con cuatro botones la fila no cabía en el libro (450 de 445 px, test nuevo): `epilogue.keys` pasa de "Esc vuelve al jardín" a "Esc vuelve" (el botón de al lado ya dice "Volver al jardín"). `tools/assets/credits.ts` lista los módulos de los créditos y `tests/initialScript.test.ts` los mantiene fuera del script inicial; el presupuesto los pesa con los libros (parte `codex`, 879 de 1000 KB). Script inicial: 1734 de 1800 KB.

**Decisión (sesión principal, 2026-10-18), sobre la pregunta de F3:** los nombres de los autores se quedan exactamente como ellos mismos se acreditan (por ejemplo, "Pixel-boy and AAA"), sin traducir ni adaptar: la atribución que pide una licencia se copia palabra por palabra.

---

## Fase 4 — Teclado y foco

| Archivo | Responsabilidad |
|---|---|
| `game/input/keyBindings.ts` | Pura: la tabla de todas las teclas del juego por pantalla (hub, nivel, editor, paneles, créditos), con su acción; las que ya existen (Z/Y, Esc, M, T, RePág/AvPág, F/Mayús+F, 1–5, G, Ctrl+Z/Y) más las nuevas. Un test comprueba que ninguna tecla hace dos cosas en la misma pantalla y que ninguna choca con las del navegador que no se pueden capturar |
| `game/input/focusOrder.ts` | Pura: de las cajas pulsables de una pantalla (botones de nivel, carteles, flores, engranaje; herramientas, HUD, sol; opciones de una pregunta; botones de victoria; controles de ajustes), el orden de lectura (filas de arriba abajo, de izquierda a derecha) y el siguiente o anterior con Tab / Mayús+Tab y las flechas |
| `game/picture/focusRing.ts` | Pura: el anillo de foco de una caja (1 px de `lit` con 1 px de aire, dentro del lienzo, sin tapar el texto) |
| `game/scenes/focus/FocusController.ts` | Mantiene el foco de la escena activa, lo pinta y traduce Intro / Espacio en el mismo toque que daría el ratón; el foco solo se ve tras usar el teclado (con ratón o toque, no estorba) |
| `game/scenes/HubScene.ts`, `game/scenes/hub/*`, `game/view/HudView.ts`, `game/view/QuestionView.ts`, `game/view/VictoryPanel.ts`, `game/view/SettingsView.ts`, `game/view/TutorialView.ts`, `game/view/DialogueView.ts` | Exponen sus cajas pulsables al controlador (sin lógica nueva); el diálogo avanza con Intro / Espacio; las preguntas, además, con los números 1–4; los deslizadores, con ← → |
| `game/input/flowerFocus.ts` | Se integra en el orden general (F / Mayús+F siguen funcionando como atajo) |
| `game/view/SettingsView.ts`, `content/es/strings.json` | Una línea de "Teclas" en ajustes, o una tarjeta de ayuda con la tabla de `keyBindings` (sus textos en `strings.json`) |

El jardín en sí (juntar, pasar el farol, cadena, plegar…) **no** se juega con teclado (Apéndice A, pregunta 16, respuesta (a)): se juega con puntero o toque, y la fase 5 queda descartada.

**Tests clave:** con el catálogo y las palabras reales, cada pantalla del hub (0, mitad y todo ganado; profesor) tiene un orden de foco que recorre todas sus cajas pulsables una vez y vuelve al principio; el anillo de foco cabe en el lienzo para cada caja; no hay teclas repetidas por pantalla; Intro sobre un botón de nivel produce el mismo evento que su toque (sobre el descriptor, no sobre Phaser); con un libro abierto el juego no recibe teclas (lo de hoy, `overlay.changed`, sigue probado).

**Revisión en pantalla de F4 (sesión principal, 2026-10-18).** Dos hallazgos que se arreglan en la fase 6:

1. **El anillo de foco no contrasta lo bastante:** sobre los paneles de madera el ámbar (`lit`) solo llega a 2,45:1. Debe llegar a **3:1 o más en todo lo que tiene debajo** (por ejemplo, una línea de 1 px de `ink` por dentro o por fuera del ámbar), probado con `picture/contrast.ts` contra cada superficie sobre la que se dibuja.
2. **El rótulo de una flor secreta tapa los botones del hub:** el rótulo de pasar el puntero o el foco ("Flor secreta: tócala para entrar", y los del capullo y la flor ganada) se dibuja encima de los botones de nivel del capítulo y los oculta. Los rótulos van donde nunca cubren un botón, un título ni un cartel: decisión pura de colocación, con un test de solapes sobre el hub real en todos sus estados.

---

## Fase 5 — El jardín con teclado — **descartada por el autor**

**Descartada por el autor** (Apéndice A, pregunta 16, respuesta (a)): el jardín se juega con puntero o toque. No se ejecuta; el README (F12) dice que el jardín se juega con ratón o toque y que el teclado recorre los menús, paneles y preguntas. Se conserva abajo solo como registro de lo que se habría hecho.

| Archivo | Responsabilidad |
|---|---|
| `game/input/gardenCursor.ts` | Pura: un cursor sobre los brotes: con las flechas, el brote más cercano en esa dirección (cono de 90°, desempate por distancia); sobre una flor plegada, la flor |
| `game/input/keyGestures.ts` | Pura: traduce teclas en los **mismos** gestos que ya interpreta `input/intent.ts` (toque en un brote, toque en una enredadera, arrastre de cadena paso a paso por enredaderas, como `dragChain`), según la opción elegida por el autor; nunca una jugada que el puntero no pueda hacer |
| `game/scenes/level/levelInput.ts` | Monta el cursor y manda sus gestos por el mismo camino que el puntero |

**Tests clave:** en 1.3, con las teclas, se arma la misma cadena que con el arrastre de la solución de referencia y `applyAction` la acepta igual; el cursor nunca salta a un brote oculto por la niebla; con plegar permitido, una flor plegada recibe el foco como un brote; el recorrido de referencia de cada nivel del capítulo 0–1 se puede reproducir solo con teclas (test sobre los gestos, no sobre Phaser).

---

## Fase 6 — Movimiento reducido, contraste y lector de pantalla

| Archivo | Responsabilidad |
|---|---|
| `services/settings.ts` | Versión nueva: `motion: 'system' | 'reduced' | 'full'` (por defecto `system`); la anterior migra con `system` |
| `services/motion.ts` | Pura: si se reduce el movimiento, de la preferencia y del sistema (`prefers-reduced-motion`, inyectado) |
| `game/animation/plan.ts`, `game/picture/drift.ts`, `game/picture/squash.ts`, `game/picture/burst.ts` | Con movimiento reducido: sin squash, sin confeti, sin deriva de la niebla, sin sacudida; los saltos y plegados, cortos y con fundido. La **información** de cada paso (qué farol, qué flor) se ve igual |
| `game/view/SettingsView.ts` | Un control de tres posiciones para el movimiento |
| `game/picture/textContrast.ts` | Pura: cada estilo de texto (`view/textStyle.ts`) con el fondo sobre el que se dibuja (panel, papel, caja de diálogo, hierba del hub), y su relación de contraste |
| `ui/a11y/liveRegion.ts`, `services/busEvents.ts` | Una región DOM `aria-live="polite"` invisible que repite cada línea de diálogo completa (quién habla y qué dice), cada aviso y el resultado de cada pregunta; el juego la alimenta por el bus (`a11y.say`). El lienzo lleva `role="img"` y una etiqueta con el título (de `strings.json`) |
| `game/picture/focusRing.ts`, `game/scenes/focus/FocusController.ts` | Hallazgo 1 de la revisión de F4: el anillo de foco llega a 3:1 o más sobre todo lo que tiene debajo |
| `game/picture/secretFlower.ts`, `game/scenes/hub/HubSecrets.ts` | Hallazgo 2 de la revisión de F4: el rótulo de una flor secreta nunca cubre un botón, un título ni un cartel del hub |

**Tests clave:** sin preferencia y con el sistema pidiendo menos movimiento, se reduce; con `full`, no; el guardado de ajustes anterior migra; con movimiento reducido el plan de una cadena de 5 saltos tiene los mismos pasos en el mismo orden y dura menos; cada par texto–fondo del juego da al menos 4,5:1 (o el umbral que se fije en la fase para texto pixel grande, justificado) — los que no lleguen se corrigen dentro de la paleta de 53 colores; `a11y.say` recibe la línea completa (no letra a letra) y nada en modo de juego normal escribe en la región más de una vez por línea.

*En ejecución:* **Hallazgo 1, anillo de foco.** Ámbar más una línea de `ink` no basta: contra un color de luminancia media (el agua, un botón apagado) ninguna de las dos llega a 3:1 (el peor caso posible da 2,73). El anillo pasa a ser **dos líneas de 1 px: `litGlow` (la luz pálida del farol) a 2 px de la caja y `ink` en el píxel de aire**, sin cambiar lo que ocupa; una de las dos queda a ≥ 3,65:1 de **cualquier** color (probado por luminancia en todos los grises y con colores al azar, además de la paleta y la madera; sobre los paneles, 4,4:1). **Hallazgo 2, rótulos.** Los rótulos de las flores (y el motivo de un capullo cerrado) se escriben **a la izquierda, sobre el borde superior del bancal del hub** (`flowerTipAt`, y = `gardenTop` + 1), la única franja donde no se lee ni se pulsa nada; la flor de la que hablan lleva su anillo. `tests/hubFlowers.test.ts` lo comprueba contra todos los botones (a su ancho mayor), títulos, carteles, columnas de flor, la línea de arriba y el cartel del epílogo, de jugador y de profesor, con todos los textos de cada estado. **Movimiento.** `settings` versión 2 con `motion` (`system` por defecto; la versión 1 migra a `system`); en el panel, "Movimiento" y tres botones ("Como el sistema", "Menos", "Todo"), el elegido hundido. Con menos movimiento: el farol se funde de un brote al otro (sin squash ni vuelo), el plegado es un fundido sobre los brotes quietos, sin pétalos de confeti (el destello sigue), la niebla, las hojas y la nieve quietas; saltos 120 ms y plegados 240 ms, el resto igual, y los sonidos siguen el plan corto. `scenes/motion.ts` lo decide en el momento (cambia al instante); los bichos del hub y los créditos lo usan en vez de `prefers-reduced-motion`, y los libros y el epílogo leen `data-motion` en la raíz de la página (`ui/a11y/motionMark.ts`, que sigue al ajuste y al sistema). **Contraste.** `picture/textContrast.ts` es la tabla de cada texto del lienzo con su fondo; `tests/textContrast.test.ts` mide cada par contra los píxeles reales (madera, y el suelo de cada estación a mediodía, su hora más clara), exige que todo archivo que escribe texto esté en la tabla y que todo texto puesto directamente sobre un fondo lleve contorno (un adorno de cualquier color puede quedar debajo). Umbral único 4,5:1. Fallaban 15 pares; arreglos dentro de la paleta: **contorno de `ink`** (`view/OutlinedText.ts`, el de los nombres de brote generalizado) en el HUD, el título, la insignia y el contador del hub, los títulos de capítulo, los números de las flores, la cabecera del modo libre, los nombres plegados de 4.11 y los textos de la carrera; **letras `ink`** en las opciones de la demo de una tarjeta y en las tarjetas de la receta (como un botón en reposo); **`highlight`** en los ejes de la carrera y el encabezado de la tabla de la receta, y **`chainNone`** en el velo de una apuesta (antes `darkVine`). **Lector.** Región `aria-live="polite"` (`ui/a11y/liveRegion.ts`) que escribe cada mensaje entero una vez (si se repite el mismo, con un espacio invisible para que se lea de nuevo); el juego le habla por `a11y.say`: cada línea de diálogo al empezar ("Sauce: …", nunca letra a letra), cada aviso, cada pregunta con sus opciones numeradas (además de lo pedido) y si la respuesta era la buena, **nunca en una apuesta** (estropearía la revelación). El lienzo lleva `role="img"` y la etiqueta `hub.title`. Script inicial: 1749 de 1800 KB.

**Decisiones (sesión principal, 2026-10-18), sobre las preguntas de F6:** se aceptan (1) el anillo de foco de dos líneas, la luz pálida del farol (`litGlow`) por fuera y `ink` en el píxel de aire; (2) los rótulos de las flores escritos a la izquierda sobre el borde superior del bancal del hub; (3) los textos del control de movimiento, "Como el sistema", "Menos" y "Todo"; (4) los títulos del hub con contorno de `ink`.

**Hito P2 (F3, F4, F6), revisión en pantalla de la sesión principal:** los créditos desde ajustes y desde el epílogo (rollo, final quieto, vuelta); un recorrido solo con teclado: hub → nivel 1.3 → pregunta → victoria → ajustes → Códex → hub, con el anillo visible; un nivel con movimiento reducido (emulado por el navegador); la región `aria-live` en el árbol de accesibilidad.

---

## Fase 7 — Pantallas pequeñas y táctil

| Archivo | Responsabilidad |
|---|---|
| `game/scale/integerZoom.ts` | El zoom entero se elige en **píxeles del dispositivo** (`devicePixelRatio`): el lienzo real mide 480·z × 270·z píxeles físicos y se muestra a ese tamaño dividido por la densidad. En un teléfono de densidad 3 apaisado (844 × 390 CSS) da ×4 físico (640 × 360 CSS) en vez de ×1; en escritorio a densidad 1, lo mismo que hoy. Sigue siendo pixel perfect: cada píxel lógico son z × z píxeles físicos |
| `main.ts`, `game/view/renderZoom.ts`, `game/scale/panelRoom.ts`, `ui/book/book.css` | Usan el zoom físico; `--zoom` de los libros se expresa en píxeles CSS con la misma regla; el panel del profesor no se ofrece abierto si no cabe |
| `game/scale/orientation.ts` | Pura: si la ventana está en vertical y el lienzo quedaría por debajo de un mínimo legible, se muestra el aviso "gira el teléfono" sobre el juego (Apéndice A, pregunta 17, respuesta **(a)**): en vertical no se juega hasta girarlo, y el aviso no se puede cerrar; al girar, desaparece solo. Su texto, en `strings.json` |
| `game/input/hitPadding.ts` | Pura: agranda la zona de toque de cada botón hacia el espacio libre a su alrededor (hasta la mitad del hueco con su vecino), sin cambiar el dibujo; los brotes ya tienen tolerancia en `HitTest` |
| `index.html` | `touch-action: none` y sin selección ni resaltado de toque sobre el lienzo; sin menú contextual en el lienzo; `viewport` sin zoom accidental por doble toque |
| `game/audio/AudioBus.ts` | Comprobado el desbloqueo del audio tras el primer toque en iOS (ya existe); se anota que el interruptor de silencio del iPhone calla Web Audio |

**Tests clave:** una tabla de pantallas (360 × 640 y 640 × 360 a densidad 3, 390 × 844 y 844 × 390 a 3, 768 × 1024 a 2, 1366 × 768 a 1, 1920 × 1080 a 1, 2560 × 1440 a 1, 3840 × 2160 a 2 y a 1,5) da para cada una el zoom físico, el tamaño CSS del lienzo (nunca mayor que la ventana) y el tamaño CSS del botón más pequeño; con `hitPadding`, ninguna zona de toque de un botón del hub ni del HUD queda por debajo de un mínimo en píxeles CSS fijado en la fase (con el criterio escrito) en apaisado de teléfono, y ninguna zona pisa la de su vecino; los libros a esas medidas (`tests/pageLayout.test.ts`, `tests/bookGeometry.test.ts`) siguen cabiendo.

*En ejecución:* **Zoom físico.** `integerZoom(ancho, alto, densidad)` elige el zoom entero en píxeles del dispositivo (cada lado de la ventana cuenta los píxeles enteros que abarca) y `cssPixel` da el píxel lógico en píxeles CSS (zoom ÷ densidad); a densidad 1, lo de siempre. Phaser muestra el lienzo con su zoom de presentación 1 ÷ densidad (`scale.zoom`; al cambiar, `resize` y luego `setZoom`), y `main.ts` vuelve a disponerlo también cuando cambia la densidad sin cambiar la ventana (zoom del navegador, otra pantalla: `matchMedia('(resolution: …dppx)')`). Consecuencia: el zoom del navegador ya no cambia el tamaño del lienzo en píxeles físicos. Medido (`tests/smallScreens.test.ts`): 800 × 360, 640 × 360 y 844 × 390 a densidad 3 → ×4 (640 × 360 CSS, píxel de 4/3); 915 × 412 a 2,625 → ×4 (píxel de 1,52); 768 × 1024 a 2 → ×3 (720 × 405); 1024 × 768 a 2 → ×4; 1280 × 720 y 1366 × 768 → ×2; 1440 × 810 → ×3; 1920 × 1080 → ×4; 2560 × 1440 → ×5; 4K a densidad 2 o 1,5 → ×8 (llena la pantalla). Un teléfono de densidad 2 de 667 × 375 (iPhone SE) sigue a ×2 físico, 480 × 270 CSS, como antes: no hay zoom entero mayor que quepa. **Libros:** `--zoom` es el píxel CSS del lienzo (fraccionario en CSS, entero en dispositivo); como el libro (464 × 258) es menor que el lienzo, cabe entero en toda pantalla donde se juega. **Panel del profesor:** `panelRoom(…, densidad)` reparte en píxeles de dispositivo y dice si cabe (`fits`): solo se ofrece si el lienzo a su lado queda a ×1 CSS o más (`MIN_CSS_PIXEL`) y el panel tiene sus 320 px; si no, el lienzo se queda con toda la ventana y un panel abierto queda fuera de vista (`TeacherShell.fit`) hasta que haya sitio (al girar o ensanchar). Cabe en 800 × 360, 844 × 390 y 915 × 412 apaisados, en tabletas apaisadas y en escritorio; no en 640 × 360 ni en una tableta en vertical. Su píxel (`--teacher-unit`) sale de `panelPixel`, en píxeles enteros del dispositivo. **Aviso de girar:** `scale/orientation.ts` (`asksToTurn`) lo pide con la ventana en vertical y el píxel lógico por debajo de 1 px CSS; una tableta en vertical (×1,5) se juega. `ui/rotateNotice.ts` lo pinta sobre todo (por encima de los libros), con la tinta y el papel del juego, `role="status"`, sin forma de cerrarlo; texto `notice.turnPhone`, "Gira el teléfono para jugar". **Zonas de toque:** `input/hitPadding.ts` (`hitZone`, `touchRoom`): hasta 4 px por lado, la mitad del hueco con cada vecino (un vecino en diagonal cercano también cuenta, para que las esquinas no se crucen), nunca dentro del jardín (`view/touchZone.ts`, `keepGardenClear` en el nivel, el modo libre y el contraejemplo) y, en un panel, dentro del panel. Los vecinos son todos los pulsables de la escena (los de `focusables`), también los apagados u ocultos, para que un toque cerca de un botón apagado no pulse a su vecino. Se aplica a todo `Button` y al engranaje con el `hitAreaCallback` de Phaser; el dibujo no cambia. **Criterio del mínimo**, a la escala más pequeña de un teléfono apaisado de la tabla (4/3): en el hub, **24 px CSS** por lado (WCAG 2.5.8, tamaño mínimo de objetivo), que se cumple en todos sus estados (sin las zonas, 18,7); en el HUD de un nivel, **16 px CSS**: no se puede llegar a 24 sin otra disposición (las dos filas de 14 px están pegadas y el "?" mide 10 px con huecos de 2–3 px), así que se exige lo que la disposición permite (12 px lógicos; sin las zonas, 13,3 px CSS). **Página:** en `index.html`, el lienzo con `touch-action: none` y sin selección, menú de pulsación larga ni destello de toque; la página con `touch-action: manipulation` (sin zoom por doble toque, pero se puede pellizcar: el `viewport` no lo prohíbe), `overscroll-behavior: none`, `text-size-adjust: 100%` y `min-height: 100dvh`; el menú contextual sobre el lienzo lo quita Phaser (`disableContextMenu`). **Audio:** el desbloqueo ya funcionaba en táctil (Phaser escucha `touchstart` y `touchend` en el `body`, y el lienzo no corta su propagación); anotado en `AudioBus.ts` que el interruptor de silencio del iPhone calla Web Audio. Script inicial: 1752 de 1800 KB.

**Hito P3 (F7), revisión en pantalla de la sesión principal:** con emulación de dispositivo del mismo navegador headless (medidas y densidades de la tabla, táctil activado): hub, un nivel con cadena, un libro, el editor del modo libre; en vertical, el aviso "gira el teléfono" (y que desaparece al girar). Lo que solo un teléfono real enseña (iOS, Safari móvil, sonido) va a la lista del autor (sección "Comprobaciones a mano del autor").

*Tras P3:* el autor acepta por ahora que las zonas de toque del HUD de un nivel se queden en 16 px CSS en los teléfonos más pequeños de la tabla (por debajo de los 24 del hub); una nueva disposición del HUD que llegue a 24 queda anotada como posible mejora posterior, fuera de este plan.

---

## Fase 8 — Audio: formatos, respaldo y mezcla como datos

**Primero se mide, luego se decide.** La fase empieza comprobando, con la tabla de compatibilidad vigente de los navegadores, qué versiones de Safari (macOS e iOS) y de Firefox decodifican Ogg Vorbis por Web Audio, que es lo que usa Phaser, y deja el resultado escrito en esta sección. El soporte de Safari ha cambiado entre versiones y en iOS va con la versión del sistema, así que el plan no lo da por sabido.

*Medido (2026-10-18, datos de caniuse, `ogg-vorbis`):* Chrome, Edge y Firefox de escritorio y de Android decodifican Ogg Vorbis. **Safari no, hasta la 18.4**: de macOS 11.3 a Safari 18.3 entiende el códec Vorbis solo dentro de WebM, no el contenedor Ogg, y en iOS no hay nada hasta 17.4 y lo mismo (Vorbis sin Ogg) de 17.4 a 18.3; desde Safari 18.4 (macOS e iOS 18.4, marzo de 2025) y en Safari 26 y 27, sí. Phaser elige el archivo por `canPlayType('audio/ogg; codecs="vorbis"')`, que en esos Safari dice que no: sin respaldo, un iPhone o un iPad que no pase de iOS 18.3 (los que ya no reciben iOS 26, como el iPad de 6.ª generación con iPadOS 17) carga el juego sin música y sin la mitad de los efectos. **Hace falta respaldo**: AAC en `.m4a` (Safari lo decodifica en todas sus versiones; Phaser lo reconoce por `canPlayType('audio/x-m4a')`), el `.ogg` primero, de modo que los navegadores que entienden Ogg no cambian nada.

| Archivo | Responsabilidad |
|---|---|
| `game/assets/audioSources.ts` | Pura: para una clave de audio, la lista de archivos a ofrecer en orden (el `.ogg` o `.wav` de hoy y, si existe, su respaldo); Phaser elige el primero que el navegador dice poder reproducir (`load.audio(key, [urls])`) |
| `game/scenes/queueLoads.ts`, `game/assets/loadPlan.ts` | Pasan la lista en vez de una ruta |
| `game/audio/mix.ts` | Pura: la mezcla como datos: ganancia por canal (por defecto la de `services/settings.ts`), ganancia propia de cada efecto y de cada jingle, la bajada de la música bajo un jingle, el volumen de la repetición del sol, y la tabla del balbuceo (sílabas, rangos de velocidad, ritmo, pausas; la de `systems/babble.ts` se mueve aquí si no está ya como tabla) con sus rangos permitidos |
| `game/audio/SfxPlayer.ts`, `MusicPlayer.ts`, `BabblePlayer.ts` | Leen `mix.ts`; una clave sin sonido cargado se salta en silencio (ya es así en `SfxPlayer`; se prueba en los tres) |
| `tools/assets/transcode.ts`, `tools/assets/selection.ts`, `CREDITS.md` | **Solo si la comprobación lo exige** (pregunta abierta 3): un respaldo por cada `.ogg` (AAC en `.m4a`) hecho con una herramienta del sistema desde los mismos archivos CC0, con su versión y sus parámetros anotados; los archivos van a `public/assets/` y al manifiesto como alternativas de su clave; `CREDITS.md` dice que son copias convertidas de los mismos recursos |
| `tools/assets/budget.ts` | Con respaldos, cada parte del presupuesto pesa lo que **un** navegador descarga (el mayor de los dos formatos de cada clave), y aparte lo que ocupa el despliegue |

`assets:check` con respaldos: como un codificador no da los mismos bytes en cada versión, comprueba que cada respaldo existe, dura lo que su original (±50 ms, leyendo la cabecera) y es más reciente que él; no compara bytes.

**Tests clave:** `audioSources` de una clave sin respaldo da una sola ruta y con respaldo, dos, el original primero; cada valor de `mix.ts` está en su rango (ganancias de 0 a 1, velocidades del balbuceo dentro de las del Plan 06 §1.9) y los tests del balbuceo (`babble.test.ts`) siguen verdes leyendo la tabla nueva; un jingle baja la música a lo que dice la tabla; sin ningún archivo de audio cargado, el hub y un nivel arrancan y se juegan (sobre los reproductores con un `AudioBus` falso); el presupuesto con un manifiesto sintético con respaldos pesa el mayor de cada par.

**Lo que el autor escucha** (no lo puede decidir un test; lista para la sección "Comprobaciones a mano del autor"): cada pista en bucle, ¿se nota el corte?; el balbuceo de Sauce, Bruto y los Robles (¿graves y distintos?, ¿los Robles al 60 % con tres voces se entienden como varios?, ¿cansa?); el ritmo de escritura del jardinero y del Cuaderno (30 letras/s, sin balbuceo) y el de Sauce a ×3; volúmenes relativos de campanitas, acorde de plegado, piedra y rechazo suave; la música bajo un jingle; todo en Safari (si hay respaldo, que suene el respaldo) y en un teléfono. Cada cambio es un número de `mix.ts`.

---

## Fase 9 — Carga y rendimiento

| Archivo | Responsabilidad |
|---|---|
| `index.html`, `tools/html/loader.ts` (o un plugin de Vite en `vite.config.ts` que lo inyecta) | Antes de que llegue el script: un farol dibujado con CSS (sin texto) que late sobre el fondo, que la primera escena retira; `<link rel="preload">` de la fuente monogram; favicon |
| `tools/assets/selection.ts`, `public/assets/` | El favicon sale de un archivo de icono de un pack CC0 ya acreditado (un frame suelto, sin dibujar nada); acreditado en `CREDITS.md` |
| `game/assets/loadPlan.ts`, `game/systems/musicFor.ts`, `game/audio/MusicPlayer.ts` | **Pregunta abierta 4:** la música del hub sale del grupo `boot` y se carga detrás, empezando con su fundido cuando llega (el hub ya funciona sin ella); la primera carga baja ~1 MB |
| `tools/check-budget.ts`, `tools/assets/budget.ts` | Informa además el peso comprimido (gzip, como lo sirve Pages) de cada parte, sin límite nuevo; los límites se revisan con lo medido |
| `game/scenes/PreloadScene.ts`, `game/picture/loadingBar.ts` | La barra de carga continúa al farol del HTML sin un salto (misma posición y tono) |

**Tests clave:** `loadPlan` del grupo `boot` ya no lleva la música del hub y el hub la pide al entrar; el HTML construido tiene el preload de la fuente y el favicon con ruta relativa; `tests/assetBudget.test.ts` y `npm run budget` con los límites revisados; el farol del HTML no lleva texto (la regla de los textos).

---

## Fase 10 — Navegadores y GitHub Pages

| Archivo | Responsabilidad |
|---|---|
| `vite.config.ts` | `build.target` explícito, la lista de navegadores que el juego promete (por defecto, pregunta abierta 5: los "ampliamente disponibles" de hoy, que cubren `lib: ES2022` de `tsconfig.json` y el `await` de primer nivel de `main.ts`); un plugin que escribe en `index.html` el `<noscript>`, la descripción y el título desde `strings.json` |
| `tools/write-404.ts` (o el mismo plugin) | `dist/404.html`: una página propia, con el fondo y la fuente del juego, un texto de `strings.json` y un enlace a la raíz relativo a la ruta de Pages |
| `services/chunkFailure.ts` | Pura: de un error de `import()` (red caída, trozo que ya no existe tras un despliegue), qué aviso dar (`notice.offline`, `notice.updated`) |
| `ui/shell.ts`, `game/scenes/SandboxGate.ts`, `game/scenes/CreditsGate.ts`, `game/audio/MusicPlayer.ts` | Ante ese error, un aviso amable en la capa o en el juego ("No se pudo abrir el libro. Comprueba la conexión." / "Hay una versión nueva del jardín. Recarga para verla.") con un botón de recargar, en vez de solo la consola; la música que no llega, silencio |
| `services/saveStore.ts` | Un `setItem` que lanza (cuota llena, almacenamiento bloqueado a mitad) no rompe la partida: se avisa una vez y se sigue en memoria |
| `tests/dist.test.ts` | Sobre `dist/` cuando existe (CI construye antes de probar, o el test se salta sin build y CI lo corre tras `npm run build`): ninguna referencia absoluta a `/assets/` en HTML, CSS ni JS; cada archivo que el manifiesto nombra está en `dist/`; existe `404.html`; el `<noscript>` lleva el texto de `strings.json` |
| `.github/workflows/ci.yml` | Si `tests/dist.test.ts` necesita el build, un paso tras `npm run build` que lo corre |
| `README.md` | Navegadores probados y prometidos |

**Tests clave:** `chunkFailure` distingue un fallo de red de un trozo que falta y da el aviso de cada uno; un guardado con `setItem` que lanza sigue jugando y avisa una sola vez; el test de `dist/` del párrafo de la tabla; ningún texto de 404 ni de `<noscript>` está escrito en el HTML a mano.

**Hito P4 (F8–F10), revisión en pantalla de la sesión principal:** sobre el build de producción servido en local (la sesión principal, no una fase): carga en frío con la red limitada (farol del HTML, barra, hub sin esperar la música); abrir el Códex con la red cortada tras cargar (aviso); una ruta que no existe (404 propia); el juego con almacenamiento bloqueado. Solo Chromium está a mano: Firefox y Safari van a la lista del autor.

---

## Fase 11 — El kit del autor

| Archivo | Responsabilidad |
|---|---|
| `tools/saves/points.ts` | Pura: guardados sintéticos con nombre, derivados del catálogo (cada nivel ganado con sus estrellas, sus Cuadernos escritos en orden, tarjetas vistas, apuestas acertadas): `fresh`, `after-ch2`, `after-ch4`, `after-ch6`, `after-ch7`, `all-stars` (las 134 estrellas, todas las semillas y flores), `hub-flowers` (cada flor en un estado distinto: capullo, abierta, ganada) |
| `tools/make-save.ts`, `package.json` | `npm run save -- after-ch4`: escribe el JSON y una línea para pegar en la consola del navegador (`localStorage.setItem('florecer.save', …); location.reload()`). No añade nada al juego |
| `tools/line-sheet.ts`, `docs/review/lineas.md` | Hoja generada para que el autor revise las líneas en español: por nivel, cada id, quién habla, el texto, y si la frase está tal cual en el GDD o la escribió un plan; con casillas |
| `docs/playtest/kit.md` | El kit de una página del Apéndice B.1 |
| `docs/video/guion.md` | El guion de grabación del Apéndice B.2 |
| `docs/playtest/A.md`, `B.md`, `C.md` | Solo hechos: el juego ya tiene arte y sonido (qué cambia en la preparación: auriculares o altavoz, volumen), dónde está hoy "Exportar registro de prueba", enlace al kit. **No** cambian umbrales ni criterios (Apéndice A, preguntas 9 y 10) |

**Tests clave:** cada guardado sintético pasa el esquema de `services/save.ts` y `loadSave` lo lee igual que lo escribió; `after-ch4` deja abierto 5.1 y no 6.1 (`unlockedLevels`); `all-stars` da 134 estrellas (`totalStars`), todos los cosméticos (`openCosmetics`) y las siete flores ganadas; `hub-flowers` da los tres estados; la hoja de líneas lista todas las líneas de `lines.json` una vez; cada URL y cada nivel citados en `kit.md` y `guion.md` existen (`?teacher&level=X` con X del catálogo, `?teacher&codex=Cn&tab=…` con una entrada y pestaña reales), comprobado por un test sobre los dos documentos.

---

## Fase 12 — README, GDD, versión y cierre

| Archivo | Responsabilidad |
|---|---|
| `README.md` | Final: qué es, el enlace al juego publicado (https://dayancabrera2003.github.io/daa-blossom-game/), cómo se juega (el jardín con ratón o toque; el teclado en menús, paneles y preguntas: la tabla de `keyBindings`), navegadores, modo profesor, modo libre, flores secretas, créditos, accesibilidad (movimiento reducido, teclado, lector), cómo construir, probar, extraer recursos y medir el presupuesto, el kit del autor, licencia. Sin "still to come" |
| `CREDITS.md` | Revisión final con lo añadido (favicon, respaldos de audio si los hay) |
| `docs/GDD.md` | Arreglos menores, cada uno en su commit: §5.9 "Guion en sección 9"; lo que el autor haya decidido del Apéndice A (hoy: el icono de la luna en "Marcas", el aviso en vertical, sin jardín con teclado, la firma; el título *Florecer* se queda) |
| `docs/plans/09-polish.md` | Las decisiones tomadas en ejecución y el presupuesto medido |
| `package.json` | `"version": "1.0.0"` |
| `tools/assets/budget.ts` | Límites definitivos con lo medido |

Tras la revisión del hito final y el visto bueno del autor: merge `develop → main`, despliegue y tag `v1.0.0`.

**Tests clave:** los de siempre; un test de contenido comprueba que el README nombra cada tecla de `keyBindings` y cada parámetro de URL que `services/startLevel.ts` y `startGarden.ts` aceptan.

---

## Orden y dependencias

```
F0 → F1 → F2 → [P1] → F3 → F4 → F6 → [P2] → F7 → [P3] → F8 → F9 → F10 → [P4] → F11 → F12
```

Una fase a la vez, siempre. F1 usa el check de F0; F2 es independiente pero cierra el hito visual P1. F3 antes de F4 (el teclado incluye la pantalla de créditos); F5 está descartada por el autor; F6 añade el ajuste de movimiento al panel que F2 enmarcó y F3 amplió. F7 antes de F8 (el desbloqueo de audio en táctil se comprueba con los dispositivos de F7). F9 después de F8 (la música del hub fuera de `boot` usa `audioSources`). F10 necesita los cabos de F3 y F9 para sus avisos y su HTML. F11 necesita los guardados del juego ya definitivos (F6 cambia los ajustes, no el guardado) y las URL definitivas. F12 cierra.

**Hito P1 (F0–F2):** legibilidad y piezas. **Hito P2 (F3, F4, F6):** créditos, teclado, movimiento, lector. **Hito P3 (F7):** pantallas pequeñas. **Hito P4 (F8–F10):** audio, carga y Pages. **Hito final (F11–F12):** kit y versión. Tras el hito final y el visto bueno del autor: merge a `main` y `v1.0.0`; la sesión principal comprueba el juego publicado (carga, un nivel, un libro, la 404).

---

## Decisiones

- **El pulido no toca el núcleo ni los niveles** salvo posiciones de brotes para leer los nombres (F0); por eso `tests/playability.test.ts` no cambia en todo el plan.
- **Zoom entero en píxeles físicos** en vez de en píxeles CSS (F7, pregunta abierta 1): sigue siendo pixel perfect y es lo único que hace legible el juego en un teléfono sin escalado fraccionario.
- **La pantalla de créditos es una escena del lienzo**, diferida como el modo libre: usa la fuente, el fondo y la música del juego, y no pesa en el script inicial.
- **El teclado emula el puntero**: Intro es un toque; ninguna jugada nueva, ningún camino paralelo a `applyAction`. El jardín no se juega con teclado (Apéndice A, pregunta 16).
- **Lo que se ajusta de oído o de vista, en tablas** (`look.ts`, `mix.ts`): el autor cambia números, no código.
- **Sin *service worker***: un modo sin conexión es otro producto; aquí basta con que un fallo de red se diga y no rompa nada.
- **Los guardados del kit se cargan desde la consola**, no con un parámetro de URL nuevo: no añade superficie al juego publicado.

## Riesgos y cómo se mitigan

| Riesgo | Mitigación |
|---|---|
| El script inicial pasa de 1800 KB (teclado, foco, avisos, textos) | Créditos diferidos; `npm run budget` en cada fase que empaqueta; si aun así no cabe, la fase lo mide y pregunta antes de subir el límite |
| `labelOnVine` hace imposible disponer algún jardín generado | F1 lo comprueba con propiedades en los tamaños máximos; si falla, el check queda solo para el catálogo y se informa |
| El zoom físico rompe el panel del profesor o los libros | `panelRoom`, `pageLayout` y `bookGeometry` probados con la tabla de pantallas de F7; revisión P3 |
| Safari no reproduce la música | F8 mide primero; respaldo reproducible con herramienta del sistema; el juego nunca se rompe sin audio (probado) |
| Un respaldo de audio duplica el despliegue | El presupuesto pesa por navegador y aparte el despliegue; la música sigue cargándose por capítulo |
| El teclado choca con atajos del navegador o del lector de pantalla | Tabla única `keyBindings` con test de conflictos; el foco solo se pinta tras usar el teclado |
| Una pestaña abierta durante un despliegue nuevo pide trozos que ya no existen | `chunkFailure` distingue el caso y ofrece recargar |
| El contraste exigido obliga a salir de la paleta de 53 colores | Se busca el par dentro de la paleta; si no existe, la fase lo informa con los pares que fallan antes de cambiar nada |
| Los tests que leen `dist/` dependen del build | Se saltan sin build en local y CI los corre tras `npm run build` |
| Un ajuste visual de P1–P3 se alarga | Cada número está en `look.ts`; lo que no se cierre en su hito pasa a la lista del autor, no bloquea el plan |

## Preguntas abiertas (con el valor por defecto recomendado)

Solo las técnicas; las de diseño son del autor (Apéndice A).

1. **¿Zoom entero en píxeles físicos?** Por defecto sí (F7). Alternativa: dejar ×1 en teléfonos, o un escalado fraccionario con filtro de vecino más cercano (píxeles desiguales).
2. **¿Dónde se abren los créditos?** Por defecto desde el panel de ajustes y desde el epílogo. Alternativa: también un cartel en el hub (la línea superior está llena).
3. **¿Respaldo de audio si Safari no decodifica Ogg Vorbis?** Por defecto: medir primero (F8); si hace falta, AAC (`.m4a`) por cada `.ogg`, hecho por `tools/` con una herramienta del sistema de versión anotada, sin paquete de npm; si el autor prefiere no depender de una herramienta del sistema, la alternativa es dejar Safari sin esa música y decirlo en el README.
4. **¿Música del hub fuera de la carga inicial?** Por defecto sí: el hub arranca ~1 MB antes y la música entra con su fundido.
5. **¿Qué navegadores se prometen?** Por defecto los "ampliamente disponibles" de Vite (escritorio y móvil de los dos últimos años, más o menos), escritos en el README; Safari probado por el autor.
6. **¿Región `aria-live` con el diálogo?** Por defecto sí, solo líneas completas, avisos y respuestas.
7. **¿Ajuste propio de movimiento?** Por defecto sí, con "como el sistema" de partida.
8. **¿Guardados del kit por consola?** Por defecto sí; nada nuevo en el juego.
9. **¿Versión?** Por defecto `1.0.0` y tag `v1.0.0` tras el hito final.
10. **¿Página 404 propia?** Por defecto sí, generada al construir con textos de `strings.json`.

## Comprobaciones a mano del autor

Lo que ningún test ni el navegador headless pueden ver; antes del merge a `main`:

- [ ] Escuchar la lista de la fase 8 en el ordenador y en el teléfono; anotar cambios como números de `game/audio/mix.ts`.
- [ ] Safari en macOS y en iOS: arranca, suena la música (o el respaldo), se lee a su zoom, el táctil funciona, la cadena por arrastre no desplaza la página.
- [ ] Firefox: arranca, suena, los libros y KaTeX se ven, el teclado recorre el hub.
- [ ] Un teléfono real apaisado (y en vertical, el aviso "gira el teléfono"): hub, un nivel, un libro, el modo libre.
- [ ] Un lector de pantalla (VoiceOver, NVDA u Orca) lee el diálogo de 0.1.
- [ ] El juego publicado tras el merge: carga, la 404, un despliegue nuevo con una pestaña vieja abierta (aviso de recargar).

---

## Apéndice A — Preguntas de diseño que decide el autor

Se listan con sus opciones, sin recomendar. Las fases que dependen de una respuesta lo dicen; sin respuesta, se quedan como están.

**Respuestas del autor (2026-10-18).** Contestadas: 14, 15, 16, 17 y 18 (columna "Respuesta"). Las demás (1–13 y 19) quedan **pendientes de decisión del autor**: hasta que las conteste se aplica la opción "dejarlo" (todo sigue como está hoy). Las preguntas técnicas ("Preguntas abiertas") se aprobaron con su valor por defecto.

| # | Pregunta | Origen | Opciones | Respuesta |
|---|---|---|---|---|
| 1 | **3.5, el agua.** El GDD da agua = brotes + 2 (18 para 16), que nunca se agota | Plan 04, informe de fase | (a) dejarlo como dice el GDD; (b) agua = la búsqueda ordenada + 2, para que se pueda quedar sin agua; (c) otro valor | Pendiente del autor; se deja como está |
| 2 | **1.9 con 16 brotes** | Plan 03, informe de fase | (a) dejarlo; (b) reducirlo | Pendiente del autor; se deja como está |
| 3 | **La enredadera c–z de 1.3** | Plan 03, informe de fase | (a) dejarla; (b) quitarla | Pendiente del autor; se deja como está |
| 4 | **2.4, la rejilla demasiado regular** | Plan 03, informe de fase | (a) dejarla; (b) desordenar las posiciones (mismo jardín) | Pendiente del autor; se deja como está |
| 5 | **5.1–5.3: un orden de búsqueda poco habitual puede saltarse el anidamiento** | Plan 05, informe de fase | (a) dejarlo; (b) fijar raíces u orden (`roots`) para que el anidamiento salga siempre; (c) usar la luz automática para la búsqueda | Pendiente del autor; se deja como está |
| 6 | **6.3, la victoria pide 4; el GDD dice 3** | Plan 05, informe de fase | (a) 4 y se corrige el GDD; (b) 3 y se cambia el nivel | Pendiente del autor; se deja como está |
| 7 | **6.4–6.5, la respuesta "≈ 4 a 8 veces"** para cocientes medidos de ×3,7 a ×4,5 | Plan 05, informe de fase | (a) dejarla; (b) "≈ 3 a 5 veces"; (c) otra redacción | Pendiente del autor; se deja como está |
| 8 | **7.4, la línea `ch7.4.sauce.08` explica las lunas antes de que el protocolo C pregunte por ellas** | Plan 05, informe de fase; `docs/playtest/C.md` | (a) dejarla; (b) moverla después de la pregunta; (c) reescribirla sin la explicación | Pendiente del autor; se deja como está |
| 9 | **7.5, tres piezas sin agua** | Plan 05, informe de fase | (a) dejarlo; (b) añadir agua | Pendiente del autor; se deja como está |
| 10 | **Umbrales "propuesta" de los playtests** (A, B, C) y límites de 60 / 75 / 90 minutos | `docs/playtest/A.md`, `B.md`, `C.md` | (a) confirmarlos; (b) ajustarlos uno a uno | Pendiente del autor; se deja como está |
| 11 | **Los playtests sobre el juego con arte.** Los protocolos son de greybox y la regla "no se pinta hasta que el greybox pasa" ya no puede cumplirse | GDD §10; `docs/playtest/*.md` | (a) hacerlos sobre el juego actual y leer los resultados como prueba de comprensión, no de greybox; (b) añadir un modo sin arte para el playtest; (c) no hacerlos | Pendiente del autor; se deja como está |
| 12 | **Líneas en español escritas por los planes** (hoja `docs/review/lineas.md` de F11) | Plan 03 y siguientes | (a) aprobarlas tal cual; (b) revisarlas en la hoja y pasar los cambios | Pendiente del autor; se deja como está |
| 13 | **Nombres de capítulo en el hub**: forma corta ("El Prado") o larga ("Primavera: El Prado") | Plan 03, informe de fase | (a) corta; (b) larga; (c) larga solo en el título del capítulo | Pendiente del autor; se deja como está |
| 14 | **Firma de los créditos**: nombre del autor, asignatura, año, agradecimientos | F3 | El texto que dé el autor | Autor "Dayan", asignatura "Diseño y Análisis de Algoritmos (DAA)", año 2026; una sola clave en `strings.json` (`credits.byline`) que el autor puede cambiar luego |
| 15 | **El icono de la luna** (no cabe en la barra a 480 px) | Revisión del Plan 06 | (a) no mostrarlo y corregir el Plan 06; (b) la insignia de 8 × 8 en el botón de la herramienta, sin texto; (c) en otro sitio del HUD | **(b)** la insignia de 8 × 8 dentro del botón de la herramienta "Marcas", sin texto, junto al sol |
| 16 | **El jardín con teclado** (el gesto de cadena alternativo que el Plan 02 dejó para el pulido) | Plan 02, decisión abierta 2 | (a) no: el jardín se juega con ratón o toque; (b) cursor sobre brotes, Intro = toque, y la cadena con Mayús + flechas por enredaderas; (c) un modo "Cadena" en el que cada Intro añade el siguiente brote | **(a)** no: el jardín se juega con puntero o toque; la fase 5 queda descartada |
| 17 | **Teléfono en vertical** | GDD §11.12 | (a) un aviso "gira el teléfono" sobre el juego; (b) jugar pequeño en vertical sin aviso; (c) ambas cosas: aviso que se puede cerrar | **(a)** solo el aviso "gira el teléfono" sobre el juego; en vertical no se juega hasta girarlo |
| 18 | **Título definitivo** | GDD §12 | *Florecer*, *Faroles*, *El Jardín de Edmonds* u otro | *Florecer* (se queda) |
| 19 | **Inglés antes de la 1.0** | GDD §12 | (a) no, 1.0 en español; (b) sí, en un plan propio | Pendiente del autor; se deja como está |

## Apéndice B — Kit del autor

Lo produce la fase 11. Aquí va su contenido para que la fase lo transcriba y lo compruebe; cada URL y cada nivel se valida con un test.

### B.1 Playtests — `docs/playtest/kit.md` (una página)

**Enlaces.** El juego publicado: https://dayancabrera2003.github.io/daa-blossom-game/ (se despliega desde `main`). En local: `npm run dev`. Los protocolos: `docs/playtest/A.md` (capítulos 0–2), `B.md` (3–4), `C.md` (5–7).

**Antes de cada persona.** Perfil nuevo del navegador o borrar `florecer.save` y `florecer.playtest`; nunca `?teacher`. Para una sesión que empieza a mitad (B o C sin haber hecho la anterior): `npm run save -- after-ch2` o `after-ch4`, pegar la línea en la consola y recargar; el registro empieza vacío. Sonido: auriculares o altavoz al volumen de una conversación. Pantalla completa (F11). Probar "Exportar registro de prueba" (engranaje → ajustes) en ese equipo.

**Qué observar** (lo que el registro no ve; el detalle está en cada protocolo):

| Hito | Medida clave | Dónde |
|---|---|---|
| A | ¿Describe la cadena con sus palabras al acabar el capítulo 1? ¿Pulsa "Terminé" sin razón en 1.8? | A.md §4 |
| B | 4.1: ¿encuentra la cadena sin la pista 3? 4.2: ¿señala `d–b`? 4.11: ¿elige bien en el Cuaderno a la primera? | B.md §4 |
| C | 7.4: ¿explica en voz alta por qué las lunas son las piedras? 6.1 / 6.3: ¿ordena y repara la receta? 7.5: ¿presenta un certificado que cuenta? | C.md §4 |

Siempre: dónde duda, qué dice en voz alta, qué pistas abre, cuándo vuelve al hub sin ganar. Anotar la hora junto a cada nota.

**Al terminar.** Engranaje → "Exportar registro de prueba" → `florecer-playtest-<fecha>.json`; renombrar con el identificador de la persona (`P1-…`) y guardarlo con la plantilla rellena. Leerlo con §6 del protocolo.

**Umbrales que el autor confirma antes de la primera sesión** (todos "propuesta"; Apéndice A, pregunta 10): la tabla "Cuándo pasa" de A.md, B.md y C.md, y los límites de 60, 75 y 90 minutos.

### B.2 Video del Paseo guiado — `docs/video/guion.md`

**Preparación de la grabación.**
- [ ] Ventana del navegador a pantalla completa en 1920 × 1080 (densidad 1): el juego queda a ×4 exacto, sin bordes. Grabar con OBS a 1080p y 30 o 60 fps; editar en Kdenlive o DaVinci Resolve (GDD §4.3).
- [ ] Un perfil del navegador solo para grabar; sin extensiones ni barras; notificaciones del sistema apagadas.
- [ ] Ajustes del juego: música baja (30 %), efectos 80 %, voces 80 %; movimiento completo.
- [ ] El panel del profesor empieza plegado (no estorba); se abre con `T` solo donde el guion lo pide.
- [ ] Micrófono probado; el balbuceo no tapa la voz (bajar voces si hace falta).
- [ ] Los guardados preparados con `npm run save -- <punto>` y la línea de consola a mano.

**Por tramo** (GDD §9; tiempos aproximados, total 30 min):

| # | Tramo | Min. | Cargar | Qué enseñar |
|---|---|---|---|---|
| 1 | Apertura | 1 | `npm run save -- all-stars`, el hub | El jardín crecido, los faroles; la pregunta "¿cuántos pueden dormir con luz?" |
| 2 | El Huerto y la trampa | 3 | `?teacher&level=0.1` … `0.5`, luego `?teacher&level=1.1` y `1.3` | Juntar; 1.1 en directo (la trampa); la cadena de 1.3 y su nombre |
| 3 | El Estanque | 4 | `?teacher&level=2.1`, `2.2`, `2.3`; `?teacher&codex=C3&tab=intuition` y `&tab=formal` | El reflejo, hilos y bucles, el hilo ganador; Berge en palabras del jardín y luego formal |
| 4 | El Invernadero | 3 | `?teacher&level=3.1`, `3.2`, `3.8`; `?teacher&codex=C5` | La búsqueda en niebla, el bosque (sol y luna), los espantapájaros como certificado |
| 5 | La traición | 4 | `?teacher&level=4.1`, `4.2`; `?teacher&codex=C6` | 4.1 sin cortes; el conflicto de 4.2; el bucle impar |
| 6 | La flor | 5 | `?teacher&level=4.4`, `4.5`, `4.10`, `4.11`; `?teacher&codex=C8&tab=formal` | Plegar, desplegar por el lado correcto, girar el tallo, el reto de la flor; el lema y sus dos direcciones sobre el diagrama |
| 7 | Anidadas | 2 | `?teacher&level=5.1`, `5.2` | Capas y desplegado de fuera hacia dentro |
| 8 | La receta y la carrera | 4 | `?teacher&level=6.1`, `6.3`, `6.4`, `6.5`; `?teacher&codex=C11` | Tarjetas, la receta rota, la carrera contra Bruto, la gráfica; el $O(n^3)$ y la terminación (con el panel del profesor, `T`) |
| 9 | El Consejo | 3 | `?teacher&level=7.1`, `7.2`, `7.4`; `?teacher&codex=C12` | Por qué los espantapájaros no bastan; las piedras; la búsqueda fallida como certificado; Tutte–Berge |
| 10 | Cierre | 1 | `npm run save -- after-ch7` y ganar 7.5 (o el epílogo desde el hub), luego el modo libre | Los usos reales (C14); invitación a jugar y al modo libre |

**Durante.** Un tramo por archivo; esperar 2 s quieto al empezar y al acabar cada uno (para cortar); si una jugada sale mal, repetir el nivel entero (el tramo 5 va sin cortes). **Después.** Subtítulos en español; comprobar en el montaje que los nombres de los brotes se leen a 1080p; exportar a 1080p.
