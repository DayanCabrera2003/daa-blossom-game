# Florecer — Revisión pedagógica independiente

Revisión de solo lectura: lo que el jugador ve, lee y hace. Fuentes: `src/levels/data/ch0…ch7/*.json`, `src/content/es/lines.json`, `src/content/es/strings.json`, `src/content/es/codex/C01–C14.md` y, para comprobar si algo se puede saltar, las reglas de `src/core/rules/`. El GDD se usó solo para comparar.

---

## 1. Veredicto

**Sí enseña el algoritmo, y algunas partes las enseña mejor que cualquier clase que conozco.** El juego hace sentir en las manos el arco Berge → búsqueda alternante → la búsqueda falla con un bucle impar → la flor → los certificados. El momento central, la luz que miente en 4.1–4.3, es un diseño de primera. El Códex es riguroso y está atado nivel a nivel a lo que se jugó.

**¿A quién?**
- **Estudiante de DAA que juega y lee el Códex:** aprende Edmonds con su corrección y su costo. **8,5/10.**
- **Novato sin grafos que solo juega:** sale con una idea sólida de camino aumentante, de Berge (por qué «sin cadena, nadie te gana»), de por qué los bucles impares rompen la búsqueda y de los certificados. Sale con una idea frágil de contraer, levantar, girar el tallo y anidar. Esas mecánicas se pueden saltar y su «por qué» lo dice Sauce, no lo descubre el jugador. **6,5/10.**

**Nota global: 7/10.**
- **Lo que suma:** la secuencia de ideas es correcta y completa. Cada mecánica es exacta. Los errores se explican con mensajes que llevan el concepto dentro. Los contraejemplos del Cuaderno se pueden jugar. Los certificados se construyen.
- **Lo que resta:**
  1. El núcleo del capítulo 4–5 (plegar, desplegar, girar) se puede ganar sin usarlo.
  2. La mitad de los Cuadernos repiten la frase que Sauce acaba de decir.
  3. Hay colisiones de vocabulario graves: «flor» con tres significados y «sol» con dos.
  4. Un «Terminé» equivocado no recibe ninguna respuesta.

---

## 2. Mapa: idea → dónde se enseña → fuerza

Leyenda: **J** = se aprende jugando; **G** = argumento guiado (manipular y comprobar); **D** = solo lo dice Sauce; **C** = solo está en el Códex.

| Idea | Dónde | Modo | Fuerza | Comentario |
|---|---|---|---|---|
| Un farol para dos (emparejamiento) | 0.1–0.4 | J | Fuerte | Bien graduado. 0.4 (la estrella) es un buen primer «no caben más». |
| Maximal ≠ máximo | 1.1, 0.3, 1.8; C1 | J | Media-fuerte | La trampa de 1.1 solo funciona si el jugador cae en B–C. Quien junta A–B y C–D a la primera no la vive, y aun así Sauce le dice «Mira lo que hiciste… Pasaste el farol» (`ch1.1.sauce.00`). |
| Pasar el farol, camino alternante | 1.1–1.3 | J | Fuerte | El validador explica la alternancia: «quien ya tiene farol tiene que darlo antes de pedir otro» (`reason.invalidPath.notAlternating`). |
| Una cadena gana exactamente uno | 1.5 y su Cuaderno; C2 | J+D | Fuerte | Los contraejemplos de 6 y 10 brotes se pueden jugar. |
| Cadena de ganancia 0 | 1.4 | J | Fuerte | La reacción `gainZeroChain` es muy buena y prepara 4.10. |
| Bucle alternante par | 1.7 | J | Débil | El nivel no tiene ni una línea. La «semilla» del GDD no la ve nadie. |
| Berge (si te ganan, hay cadena) | 2.1–2.4; C3 | G | Fuerte | Es una demostración jugada: dos hilos como mucho, maraña en hilos y bucles, «¿puede un hilo ganar por dos?». Débil: por qué las puntas del hilo ganador están a oscuras se pregunta (2.3) pero no se resuelve en el juego, solo en C3. |
| Sin cadena ⇒ máximo | 2.4 y su Cuaderno | G+D | Media | Se llega por contrarrecíproco tras un reto mal formulado (problema 10). |
| Bosque alternante sol/luna | 3.1–3.6; C4 | J | Fuerte | Qué significan sol y luna («mano libre» / «pidiendo») se dice después de usarlos (3.1.sauce.05), como pide el GDD. |
| Varias raíces; cadena entre árboles | 3.4 | J+D | Media | Que dos soles de árboles distintos den una cadena se afirma (3.4.sauce.04). El porqué, la media cadena de vuelta, solo está en C4. |
| Costo lineal de una búsqueda | 3.5 (agua) | J | Media | Una gota por brote: idea muy buena, pero el agua solo da estrella. |
| Bipartito + König | 3.7–3.10; C5 | J (certificado) | Fuerte | Lunas = espantapájaros (3.8). 7.1 muestra que falla con un bucle impar: excelente. |
| Bipartito ⇔ sin bucles impares | C6 | C | Débil | «abeja» aparece en dos líneas de todo el juego (`ch3.1.sauce.00`, `ch7.1.sauce.07`). Nadie le dice al jugador por qué la búsqueda del Invernadero no podía mentir. |
| Los bucles impares rompen la búsqueda | 4.1–4.3; C6 | J | Muy fuerte | Lo mejor del juego. La luz busca sola con las reglas del jugador, miente, y el jugador lo demuestra a mano. |
| Detectar la flor (dos soles del mismo árbol) | 4.4; `reason.sunMeetsSun` | J | Fuerte | |
| Contraer | 4.4–4.9, 5.x | J opcional | Media | Solo es obligatorio en 4.4 (`chainFound`) y 4.9 (`searchExhausted`). El resto se gana sin plegar (problema 1). |
| Levantar por el lado correcto | 4.5–4.7, 5.1–5.3 | J | Media-fuerte | El validador rechaza el lado que no alterna. Pero «levantar» es redibujar toda la cadena en el jardín abierto (problema 7). |
| Base y tallo | 4.7 y su Cuaderno | D | Media | El Cuaderno repite la frase de cierre (problema 2). |
| Girar el tallo | 4.10 | J saltable | Débil-media | Se gana arrastrando la cadena de 4.1, que el jugador ya se sabe de memoria (problema 1). |
| Lema de la flor, (⇐) levantar | 4.5–4.7 | J | Media | |
| Lema de la flor, (⇒) proyectar | 4.11; C8 | G | Media-fuerte | Buen reto guiado, pero en un solo jardín y con el tallo ya girado. El paso «tras girar sigue habiendo cadena (por Berge)» no está ni en el juego ni en la Intuición de C8. |
| Flores anidadas, orden de despliegue | 5.1–5.6; C9 | J+D | Media | Que se abren «de fuera hacia dentro» se dice (5.2.sauce.04, 5.5.sauce.04) y nunca se pone a prueba. |
| La receta (algoritmo completo) | 6.1–6.3; C10 | J (tarjetas) + ver | Media-fuerte | 6.3 (Bruto quita la tarjeta de plegar y el autómata se queda en 3 de 4) demuestra muy bien que las flores son necesarias. El texto de las tarjetas flojea (problema 9). |
| Terminación | 6.6, dos Cuadernos; C10 | D (elegir) | Media | Son elecciones razonadas y no ecos: bien. |
| Corrección de «Terminé» | 3.8, 7.4 (certificados); C10 | G + C | Media | Aquí el juego es elegante: prueba la optimalidad con certificados. El argumento general «búsqueda agotada ⇒ no hay cadena» solo está en C10. |
| Costo polinómico frente a exponencial | 6.4–6.7; C11 | Ver + apostar | Fuerte (cualitativo) | 6.7 (Bruto gana en jardines diminutos) aporta un matiz excelente. Débil: O(n³) solo está en C11, y la apuesta mete ×4 y ×8 en la misma respuesta. |
| Tutte–Berge | 7.2–7.6; C12 | J (certificado) | Fuerte | La cuenta del HUD (`hud.council`) es un andamio magnífico. Que la búsqueda fallida siempre cierra la cuenta lo explica Sauce en un monólogo (7.4.sauce.08). |
| Certificados no únicos | 7.6 (secreta) | J | Fuerte, pero opcional | |
| Aplicaciones | epílogo, C14 | D | Correcta | |

---

## 3. Los 10 problemas de más impacto

### 1. El núcleo del capítulo 4 y 5 se gana sin usarlo: plegar, desplegar y girar el tallo son opcionales

**Evidencia**
- `src/core/rules/handlers/chain.ts`: la acción `chain` solo comprueba que el camino es aumentante o alternante y que no cruza una flor cerrada. No pide marcas, ni búsqueda, ni plegar.
- Estos niveles se ganan con `matchingSize`: 4.5, 4.6, 4.7, 4.8, 4.10, 5.1, 5.2 y 5.3. Basta con ver el camino y arrastrarlo. Los niveles `maximum` (4.12, 5.4, 5.5) también.
- 4.1 entrena justo eso: la pista `ch4.1.sauce.02` dice «Intenta llegar a Elo sin marcas, solo pasando faroles».
- El trazo previsualiza la ganancia mientras se arrastra: +1, 0 en gris o ilegal (`game/picture/garden.ts:68`, `GardenView.ts:149`). Buscar cadenas se convierte en tantear con el dedo hasta que el trazo se pone dorado.
- 4.10, girar el tallo, usa **el mismo jardín** que 4.1, 4.2, 4.4 y 4.5. Solo prohíbe `fold`/`foldAt`. La cadena memorizada R‑a‑b‑d‑c‑e (la solución de 4.1) da 3 faroles sin girar nada.

**Por qué importa:** contraer y levantar son la idea de Edmonds. Si se pueden saltar, un jugador visual termina el Festival habiendo aprendido «busca caminos con los ojos», que es justo lo que no escala. El GDD (principio 10, §1.1 objetivo 6) da por hecho que el jugador pliega.

**Propuesta**
- (a) En el Festival y el Jardín Salvaje, las cadenas solo se deslizan por donde llegó la luz. Una regla de nivel: la cadena debe ser la que encontraron las marcas, o empezar en una raíz con su otro extremo ya alcanzado. Un motivo amable: «Hoy los faroles solo se deslizan por donde llegó tu luz». Alternativa: usar `chainFound` + aplicar como victoria en dos pasos.
- (b) 4.10: otro jardín. O una victoria `stemRotated` (base a oscuras con los mismos faroles) antes de aplicar la cadena. O que la cadena directa R…e se rechace hoy con una línea que lleve a girar.
- (c) Desde el capítulo 3, que el trazo indique solo si es legal, no la ganancia. El +1 se descubre al soltar.
- (d) Más niebla en el capítulo 5, que obliga a buscar.

### 2. Los Cuadernos repiten la frase que Sauce acaba de decir: se evalúa memoria a corto plazo, no comprensión

**Evidencia** (línea de Sauce justo antes → opción correcta):
- 4.11: `ch4.11.sauce.06` «Plegar no crea ni destruye cadenas. Escríbelo en tu Cuaderno.» → `ch4.11.notebook.08` «…no crea ni destruye cadenas.»
- 4.10: `ch4.10.sauce.05` «Los mismos faroles que antes, y la base quedó a oscuras» → `ch4.10.notebook.07` «…tengo los mismos faroles y la base queda a oscuras.»
- 4.7: `ch4.7.sauce.04` «…el pétalo cuyo farol salía de la flor. Esa es la base» → `ch4.7.notebook.06` «…el pétalo cuyo farol va hacia afuera de la flor».
- 2.4: `ch2.4.sauce.02` «Si no tienes cadena, nadie te gana» → `ch2.4.notebook.05`.
- 1.5: `ch1.5.sauce.00` «Cada cadena, un farol» → `ch1.5.notebook.01`.
- 5.3: `ch5.3.sauce.04` «Por el lado corto no alternaba» → `ch5.3.notebook.06`.

Son 6 de 11 Cuadernos. Los de 4.2, 6.6 y 7.3 sí piden generalizar, y se nota.

**Por qué importa:** el principio 6 del GDD («formular la regla uno mismo») queda vacío. La medida 3 del playtest B (4.11 «a la primera») no mide comprensión.

**Propuesta:** cambiar el orden en los JSON. El Cuaderno va **antes** de la línea que resume, y esa línea pasa a ser el `reply` del acierto. Mejor aún: la opción correcta usa otras palabras («…si el plegado no tiene cadena, el abierto tampoco»), y hay un distractor que copia a medias la frase de Sauce. Un primer paso sin coste: mover `ch4.11.sauce.06`, `ch4.10.sauce.05` y `ch4.7.sauce.04` detrás del `notebook`.

### 3. Colisiones de vocabulario: «flor» significa tres cosas y «sol», dos

**Evidencia**
- **«flor» como un lado del bipartito:** «Aquí viven abejas y flores, y una abeja solo se junta con una flor» (`ch3.1.sauce.00`).
- **«flor» como blossom**, desde 4.4: «Ciérralos como una flor».
- **«flor» como nivel secreto:** «Una flor escondida, solo para ti» (1.10), «Otra flor escondida en el invernadero» (`ch3.10.sauce.00`, ¡en un jardín de abejas y flores!), «Esta flor es tuya».
- **«sol» como deslizador del tiempo:** «Arrastra el sol» (0.5), `hud.prompt.sun`, y «Mueve el sol y míralo otra vez» (`ch6.2.sauce.01`), justo cuando el autómata va poniendo soles.
- **«sol» como marca de búsqueda (vértice exterior).**
- **«Terminé»** significa a la vez «no caben más» (1.8), «la búsqueda se agotó» (3.6, 4.9) y «presento el certificado» (3.7, capítulo 7). Además, `diagram.event.declareDone` dice siempre «el jardín no puede hacerlo mejor».

**Por qué importa:** el glosario (GDD §3.3) es la columna vertebral del juego. Una palabra con dos sentidos en capítulos seguidos (3 → 4) rompe el modelo mental justo en la transición más delicada: bipartito → bucle impar → flor.

**Propuesta**
- El blossom se queda con «flor»: es la metáfora central y viene de Edmonds.
- Renombrar el par bipartito a algo que no sea flor: «abejas y tréboles» o «abejas y colmenas».
- Las secretas pasan a ser «capullos» o «semillas escondidas».
- El deslizador pasa a ser «el día» o «la sombra» («Arrastra la sombra del reloj»).
- Usar «Terminé» y «Presentar» como dos botones o textos distintos en el capítulo 7.

### 4. Un «Terminé» equivocado pasa en silencio

**Evidencia**
- `game/systems/levelSession.ts` (~l. 288–313): `declareDone` se acepta siempre. Si no es máximo, solo suma `claims.wrong` para el registro del playtest, y `judgeVictory` devuelve `none` sin ningún efecto.
- Además, `afterAccepted` (`game/systems/hints.ts`) reinicia el reloj de pistas: un «Terminé» falso cuenta como progreso.
- Afecta a 1.8, 2.5, 4.12, 5.4–5.6 (`maximum`) y a todos los certificados (3.7–3.10, capítulo 7), donde un recubrimiento incompleto o unas piedras malas tampoco dicen nada.

**Por qué importa:** en 1.8 el GDD quiere «la incomodidad», no el desconcierto. Un botón que no responde se interpreta como fallo del juego, no como «todavía cabe uno». El jugador se atasca justo donde se planta la pregunta central.

**Propuesta**
- Una línea suave de Sauce para el reclamo falso, sin decir dónde: «Mmm… este jardín todavía guarda una cadena. Mírala con calma».
- Para un certificado que no cierra: «Queda una enredadera sin vigilar» y resaltarla, o «La cuenta dice al menos 1, y hay 2».
- Contarlo como rechazo para las pistas.

### 5. Las pistas casi no aparecen cuando el jugador se mueve sin rumbo, y el grado 2 a menudo es la solución

**Evidencia**
- `hints.ts`: se ofrecen tras 90 s **sin ninguna jugada aceptada** o tras 3 rechazos seguidos. Juntar y separar, marcar y desmarcar, son jugadas legales: quien tantea sin rumbo nunca recibe la oferta.
- Pistas de grado 2 que dan la respuesta:
  - 3.7 «Mira el 2 y el 4» (dos de los tres espantapájaros).
  - 3.8 resalta las cinco lunas: «Ahí van los espantapájaros».
  - 4.4 «En esa enredadera. Tócala».
  - 2.3 resalta 1 y 6 «De una punta a la otra».
  - En 7.4 la instrucción va en la línea inicial: «Levanta las lunas como piedras» (`ch7.4.sauce.03`).
- Los niveles 1.6–1.9 no tienen pistas propias.

**Propuesta**
- Medir el progreso por señales que importan (cambió el número de faroles, creció la búsqueda, se plegó algo), no por cualquier jugada aceptada.
- Que el botón Pista esté siempre disponible. Ya cuesta una estrella.
- Reescribir los grado 2 como una zona o una pregunta. Ejemplo para 3.8: «¿Qué brotes recibieron una visita pidiendo?», sin resaltar.

### 6. Los porqués más importantes los dice Sauce o el Códex, no los descubre el jugador

**Evidencia**
- **Bipartito ⇒ dos soles del mismo árbol no se tocan:** solo en C5 y C6.
- **Por qué una cadena entre dos árboles:** 3.4.sauce.04 lo afirma.
- **Las puntas del hilo ganador están a oscuras:** 2.3 lo pregunta (`ch2.3.sauce.01`) y pasa a jugar sin cerrar el porqué.
- **Por qué las lunas son siempre buenas piedras:** el monólogo `ch7.4.sauce.08`. El propio protocolo C (§8.3) prevé que el jugador lo repetirá de memoria.

**Por qué importa:** es el salto de «sé hacerlo» a «sé por qué funciona», que es lo que pide el profesor.

**Propuesta:** pasos `ask` con contraejemplo, con el mismo motor de siempre.
- 3.6 o 3.8: «¿Pueden tocarse dos soles del mismo árbol entre abejas y flores?», con un jardín para intentarlo.
- 2.3: tras jugar, «¿Podría una punta del hilo plateado tener farol tuyo?» (Sí/No + reply).
- 7.4: una pregunta antes de la línea 08, «Al quitar las lunas, ¿con quién queda conectado cada sol?», y la línea 08 pasa a ser el reply.

### 7. Levantar se vive como «redibujar toda la cadena», y el orden de despliegue no se pone a prueba

**Evidencia**
- En 4.5–4.8 y 5.1–5.5, tras `unfold` el jugador arrastra la cadena completa en el jardín abierto. Nada obliga a partir de la cadena encontrada en el plegado: el gesto de levantar no existe como tal.
- «De fuera hacia dentro» se dice (5.2.sauce.04, 5.5.sauce.04, C9). El jugador no puede equivocarse: la flor interior no se ve mientras la exterior está cerrada.
- El Cuaderno de 5.3 dice que «solo un lado alterna» y no pregunta por el orden.

**Por qué importa:** el objetivo 8 del GDD (desdoblar flores anidadas) queda como algo que pasa, no como algo que se entiende.

**Propuesta**
- Al desplegar, conservar dibujado el trozo exterior de la cadena (tallo → pétalo de entrada) y pedir al jugador solo el tramo de dentro: elegir el lado.
- En el capítulo 5, una pregunta del tipo «Esta cadena cruza la flor grande. ¿Qué abres primero?», con un contraejemplo que muestre que la pequeña no se ve.

### 8. Las herramientas no corresponden con claridad al concepto: «Plegar» no es el plegado principal

**Evidencia**
- `tutorial.fold.body`: «Con Marcas, toca la enredadera donde se tocan dos soles… Con Plegar, toca en orden los brotes de un bucle.»
- `tutorial.unfold.body`: desplegar se hace también «Con Marcas».
- Con Capas, tocar una flor sirve para entrar en ella.
- Un jugador al que Sauce dice «Ciérralos como una flor» (4.4) irá al botón **Plegar** y recibirá `reason.searchInProgress`.
- El Plegar libre (`handlers/fold.ts`) pliega cualquier blossom fuera de una búsqueda, **también sin tallo**. Eso contradice la tarjeta `recipe.wrong.foldAnyLoop` («Solo se pliega donde se tocan dos soles del mismo árbol») y la Observación 8.4 de C8 («Sin un tallo… plegar sí puede esconder una cadena»).

**Propuesta**
- En los niveles, quitar el Plegar libre y dejarlo en el modo libre. Plegar = tocar el choque sol–sol, una sola forma.
- Si se queda, renombrarlo «Plegar a mano» y rechazar los blossoms sin tallo con un motivo que enseñe algo.

### 9. El texto de la receta (6.1) tiene jerga, una tarjeta muerta y una incoherencia

**Evidencia**
- **Jerga:** `recipe.cases` dice «Mientras quede una sol–x apagada sin explorar», con el sustantivo elidido.
- **Palabra nueva sin presentar:** `recipe.card.chainRootToRoot` dice «cadena de raíz a raíz», y «raíz» no aparece en ninguna línea de diálogo.
- **Tarjeta muerta:** `recipe.card.chainToDark` («Si x no tiene marca y está a oscuras») no puede darse después de `markDarkSuns` («Marca sol a todos los brotes a oscuras»). C10 l. 39 lo reconoce («el caso (a) no ocurre nunca»).
- **Incoherencia:** `chainToDark` dice «Pasa los faroles y vuelve al paso 1»; `chainRootToRoot`, que es la que de verdad encuentra cadenas, no lo dice.

**Por qué importa:** la receta es el algoritmo. Un estudiante atento verá una tarjeta imposible y dudará de todo lo demás.

**Propuesta**
- `recipe.cases`: «Mientras algún sol tenga una enredadera apagada sin mirar (x es el brote del otro lado):».
- `chainRootToRoot`: «Si x es sol de otro árbol: cadena de un brote a oscuras a otro. Pasa los faroles y vuelve al paso 1.»
- La tarjeta muerta: quitarla, o explicarla con una línea («Si solo buscas desde un brote…»).

### 10. El reto del espejo (2.4) está mal formulado para un novato

**Evidencia**
- `ch2.4.sauce.00`: «dibuja un reflejo con más faroles que no le deje a tu jardín ninguna cadena». Es una doble negación.
- El jardín (7 faroles en una rejilla 4×4 que admite 8) **sí tiene cadenas**, y la conclusión es «No se puede. Si no tienes cadena, nadie te gana» (`ch2.4.sauce.02`): un salto por contrarrecíproco.
- `mirror.spared` («ganarle a tu jardín no es fácil») es falso aquí: dibujar 8 es fácil. Lo imposible es que no aparezca una cadena.

**Propuesta:** dos fases.
- (a) «Dibuja un reflejo que te gane» → cada vez se ilumina el hilo ganador: «quien te gana te deja una cadena» (la directa).
- (b) En un jardín sin cadena: «Ahora intenta ganarle a este» → imposible → «Sin cadena, nadie te gana». El Cuaderno se queda como está.

---

## 4. Arreglos rápidos (solo JSON o texto)

1. **1.7 sin líneas:** añadir un `say` tras ganar, por ejemplo «Seis brotes en corro, y la cadena pudo ir por cualquiera de los dos lados. Acuérdate de este bucle». Se retoma en 4.3: «¿Te acuerdas del corro del Prado?».
2. **1.1 y 1.2, la repetición fija:** cambiar «Mira lo que hiciste» por «Mira otra forma de ver lo que pasó». En 1.1, «Pasar el farol» está prohibido (`forbid: passLantern`) y el jugador no pasó nada.
3. Mover detrás del `notebook` las líneas de resumen de 4.7, 4.10 y 4.11 (problema 2).
4. Renombrar en `lines.json` las «flor escondida» a «capullo escondido» (1.10, 2.5, 3.10, 4.13, 5.6, 6.7, 7.6).
5. `ch6.2.sauce.01`: «Mueve el sol» → «Arrastra el día hacia atrás» (o el nombre nuevo del deslizador).
6. **Receta:** reescribir `recipe.cases` y `recipe.card.chainRootToRoot` (problema 9).
7. **7.4:** insertar un `ask` antes de `ch7.4.sauce.08` y quitar «Levanta las lunas como piedras» de `ch7.4.sauce.03`. Que lo intente con la pista de grado 2.
8. **Grado 2 de 3.7, 3.8 y 4.4:** convertir la respuesta en pregunta o zona.
9. **6.5:** las seis apuestas tienen la misma respuesta (receta «de 4 a 8», Bruto «muchísimo más»; `6-5.json`). Tras la primera no hay nada que pensar. Quitar la apuesta repetida de Bruto o cambiar una ronda: «¿y si se cuadruplica?».
10. **C08, pestaña Intuición:** añadir una frase entre «gira el tallo» y «dibuja una cadena»: «tienes los mismos faroles, así que por el estanque sigue habiendo una cadena». Ahora la Intuición la salta.
11. Bajar las secciones «Testigos del núcleo» del Códex a un desplegable o a la pestaña Puente. Para un estudiante, las rutas `src/core/...` rompen el libro.

---

## 5. Lo que funciona especialmente bien

1. **4.1 → 4.3, la luz miente.** La búsqueda automática usa las reglas que el jugador aprendió (`autoSearch` con `roots: [R]`), declara que no hay cadena, el objetivo dice 3, y la pista «El objetivo no miente. ¿Y si la luz sí?» es perfecta. Le siguen 4.2, señalar la enredadera y «cada brote puede ser sol o luna según por dónde llegues», un Cuaderno cuyo contraejemplo es un bucle de 4 jugable, y 4.3, que refuta «cualquier bucle». Es el mejor diseño del juego y un modelo de cambio conceptual.
2. **El Estanque como demostración jugada de Berge** (2.1–2.2): contar hilos en un brote → «dos como mucho» → separar en hilos y bucles → contar por pieza → «¿puede un hilo ganar por dos?». Cada paso del lema es un gesto.
3. **Los contraejemplos del Cuaderno se pueden jugar y están bien elegidos.**
   - 2.4 (d), «si busco tres veces y no la encuentro, terminé»: un jardín de 16 brotes con una cadena larga y tres callejones.
   - 3.3 (c): llegar dos veces a la misma luna sin que haya cadena.
   - 6.6 «podría no parar nunca»: mirar cómo el contador nunca baja.
   - 7.3 (b): A–B–C con B levantada.
4. **Mensajes de rechazo que enseñan algo.**
   - `reason.invalidPath.notAlternating`: «quien ya tiene farol tiene que darlo antes de pedir otro».
   - `reason.notAFlower.evenLength`: «los bucles pares no molestan».
   - `reason.sunMeetsSun`: «Aquí pasa algo raro…».
   - Nunca castigan y siempre llevan el concepto.
5. **El arco de certificados.**
   - 3.7 enseña la cota con un juguete.
   - 3.8: las lunas de la búsqueda fallida son los espantapájaros.
   - 7.1: los espantapájaros no cierran en un bucle de 5.
   - 7.2–7.3: la cuenta de impares menos piedras, en vivo en el HUD (`hud.council`).
   - 7.4: las lunas son las piedras.
   - 7.6: el certificado no es único.
   - El jugador construye la demostración, y así responde la pregunta de 1.8 («¿Cómo lo sabes?») con un objeto que se puede verificar.
6. **6.3, la receta rota de Bruto:** sin la tarjeta de plegar, el autómata enciende 3 donde caben 4. Hace ver que las flores son necesarias para el algoritmo, no un adorno.
7. **6.7 (secreta):** Bruto gana en jardines diminutos. Matiza el análisis de costo con honestidad: «¿cuándo compensa pensar?».
8. **El agua de 3.5,** «una gota por brote, y dos de regalo»: el costo lineal de una búsqueda convertido en presupuesto.
9. **El Códex.** Las pestañas de Intuición retoman el nivel exacto con su diagrama vivo (C6 vuelve a mostrar la búsqueda de 4.1; C8 es el reto de 4.11). La pestaña Formal es de nivel de curso serio: C8 trabaja formalmente el jardín de 4.11 y da el contraejemplo sin tallo; C11 separa los pasos de la traza de las operaciones elementales y explica el ×4 medido frente a la cota ×8.
10. **1.4 Callejón:** «Cambiaste una tristeza por otra». La cadena de ganancia 0 aparece pronto y vuelve en 4.10 como girar el tallo. Repetición espaciada bien hecha.

**Nota sobre las flores secretas.** Algunas enseñan ideas nuevas y nada menores, aunque el GDD §5.10 diga que no: el orden de plegado no importa (4.13), la parte no alcanzada también hay que vigilarla (3.10, que C5 da por esencial con «Solo las lunas no bastan»), y los certificados no son únicos (7.6). Conviene que al menos la idea de 3.10 esté también en un nivel obligatorio, o en el Cuaderno de 3.8 como contraejemplo jugable y no solo como respuesta escrita.

---

## 6. Riesgos para los playtests y qué observar

**Playtest A (cap. 0–2)**
- **Medida 3 («Terminé» sin razón):** como el botón no responde (problema 4), habrá varios «Terminé» seguidos. Observar qué hace la persona después del primero: ¿cree que el juego falló?
- **Medida 4 (describir la cadena):** es probable que repitan «cada cadena, un farol» por el eco de 1.5. Pedirles que la expliquen sobre un jardín nuevo.
- **1.1:** anotar si cayeron en la trampa B–C. Si no, la repetición de Sauce los confunde.
- **1.7:** preguntar al salir si notaron algo del bucle. Lo más probable es que no.
- **2.4:** observar si entienden la consigna del espejo o dibujan al azar hasta agotar los tres intentos.

**Playtest B (cap. 3–4)**
- **Vocabulario:** al pasar de 3 a 4, preguntar qué es «una flor». Si responden «una de las plantas del Invernadero», la colisión es real.
- **4.4:** contar en el registro los rechazos `searchInProgress`. Indican que buscaron el botón Plegar.
- **4.5–4.8 y 4.10:** registrar cuántos `foldAt`/`unfold` y cuántos `rotateStem` hay frente a cadenas directas. Si ganan sin plegar o sin girar, el capítulo no está enseñando la flor (problema 1).
- **Medida 3 (Cuaderno de 4.11 a la primera):** no la tomen como prueba de comprensión, porque la opción copia la línea anterior. Añadir una pregunta oral: «¿Por qué el trozo de la cadena llega a la flor por una enredadera apagada?».
- **Pistas:** observar a quien tantea sin pedir ayuda. Puede que nunca se le ofrezca (problema 5).

**Playtest C (cap. 5–7)**
- **7.4:** el propio protocolo prevé que repitan a Sauce. Si se adopta el arreglo rápido 7, se puede medir de verdad.
- **Capítulo 6:** 6.2, 6.4, 6.5 y 6.7 son casi solo mirar. Medir tiempo y aburrimiento. Las apuestas de 6.5 se vuelven automáticas.
- **6.1:** registrar si dudan con la tarjeta `chainToDark` o con «sol–x apagada».
- **Capítulo 5:** preguntar «¿por qué se abre primero la grande?». Si responden «porque la pequeña no se ve», es una restricción de la interfaz, no una idea.
- **Transferencia al Códex:** medir cuántos abren el Códex sin que se lo pidan. Si nadie lo abre, ningún jugador sale con las palabras «camino aumentante», «blossom» o «emparejamiento máximo». Considerar que Sauce invite a leerlo al final de cada capítulo («En el Códex esto tiene nombre»).
