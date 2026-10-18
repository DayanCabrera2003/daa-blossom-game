# Playtest C — Protocolo

Capítulos 5–7 en greybox (círculos, rombos y líneas, sin arte ni voz). Lo dirige el autor. Fuente: GDD §10 (Hito C), §7 (capítulos 5, 6 y 7) y §2 (principios). Todo lo que este documento no cambia sigue como en `docs/playtest/A.md` y `docs/playtest/B.md` (papel del observador, qué no decir, cuándo parar, cómo clasificar hallazgos).

> **Hoy (plan 09):** el protocolo se escribió para el greybox; el juego ya tiene arte, música, efectos y balbuceo. Lo que cambia en la preparación está en §3; los umbrales y criterios no cambian (Apéndice A del plan 09, preguntas 10 y 11, pendientes del autor). La hoja de una página para cada sesión es [`kit.md`](kit.md).

---

## 1. Objetivo del Hito C

Comprobar que el Jardín Salvaje (flores anidadas, capas), el Recetario (la receta, el autómata, la receta rota, las carreras contra Bruto, por qué termina) y el Consejo de los Robles (piedras, Tutte–Berge) se entienden **sin ayuda externa**, y sobre todo que se cierra el círculo de 7.4: la búsqueda que fracasa no solo se rinde, sino que entrega la prueba.

El GDD fija una medida clave:

1. En **7.4**, ¿entiende **por qué las lunas son las piedras**? Se le pide explicarlo en voz alta.

El registro no puede oír una explicación: la medida se toma a mano (§4 y §5). El registro dice, como apoyo, si las primeras piedras que presentó en 7.4 fueron las lunas y si necesitó la pista de grado 3 (que levanta la primera piedra por él).

Se siguen midiendo, como en los Hitos A y B, el tiempo por nivel, el uso de pistas y los abandonos, y además las recetas comprobadas (6.1, 6.3), las apuestas de las carreras (6.5) y los certificados de piedras (7.2–7.5).

**Regla:** no se pinta ningún capítulo hasta que su greybox pasa el playtest (GDD §10).

### Cuándo pasa y cuándo no

Los umbrales numéricos son **propuesta** del protocolo; el autor los confirma o ajusta antes de la primera sesión.

| Criterio | Pasa si | Origen |
|---|---|---|
| Completan sin ayuda | Todas las personas terminan los capítulos 5–7 sin que el observador intervenga | GDD §10 |
| 7.4, por qué las lunas | Al menos 3 de cada 5 personas explican en voz alta, con sus palabras, los puntos 1 y 2 de la rúbrica de §4 | GDD §10; umbral **propuesta** |
| 7.4, las piedras | Al menos 3 de cada 4 personas presentan las lunas como sus primeras piedras, sin abrir la pista de grado 3 | **propuesta** |
| 6.1, la receta | Al menos 3 de cada 4 personas ordenan la receta con 3 comprobaciones como mucho | **propuesta** |
| 6.3, la receta rota | Al menos 3 de cada 4 personas reparan la receta a la primera comprobación | **propuesta** |
| 7.5, ante el Consejo | Al menos 3 de cada 4 personas presentan un certificado que cuenta en 3 intentos como mucho | **propuesta** |
| Pistas | Ningún nivel necesita la pista de grado 3 en más de la mitad de las personas | **propuesta** |
| Tiempo | Mediana por nivel de 8 minutos como mucho; 5.4, 5.5, 6.1 y 7.5 hasta 15 | **propuesta** |
| Atascos | Ninguna persona abandona un nivel (vuelve al hub sin ganarlo) más de dos veces | **propuesta** |

Las apuestas de 6.5 no son un criterio: el capítulo enseña a medir antes de razonar, y fallar la primera apuesta es parte de la lección. Sí es una señal (§6) que la última apuesta sobre Bruto siga fallando.

---

## 2. A quién invitar

3–5 personas sin formación en DAA ni en teoría de grafos, que no hayan visto el GDD ni el código. Sin modo profesor, el hub solo abre un nivel cuando se gana el anterior, así que hay que llegar a 5.1 jugando 0–4.

- **Lo preferible:** las personas del playtest B, en una **tercera sesión**, si su perfil del navegador se conservó. Los capítulos 5–7 se apoyan en todo lo anterior (la flor, plegar, la búsqueda, los espantapájaros de 3.7–3.8), y ellas lo vivieron jugando hace poco.
- **Si su perfil se borró:** una persona del playtest B tendría que repetir 0–4 de memoria. Mejor invitar a personas nuevas y hacer **tres sesiones**: capítulos 0–2 (protocolo A), 3–4 (protocolo B) y 5–7 (este protocolo), no más de una semana entre una y otra.

Anotar en la plantilla de qué grupo viene cada persona. Entre sesiones **no se borran los datos del sitio**: el progreso y el registro siguen en el navegador.

### Qué decirles (y qué no)

Igual que en el playtest A (§2 de `A.md`). Al empezar la sesión, como mucho:

> "Seguimos donde lo dejaste. Recuerda pensar en voz alta."

No decir nunca nada de Edmonds, Tutte, Berge, "algoritmo", "certificado" ni "complejidad", ni avisar de que la receta de Bruto está rota o de que la búsqueda va a dar las piedras.

---

## 3. Preparación

### Navegador y datos

Antes de la sesión: comprobar que el hub muestra abierto el nivel 5.1 y ganados los de 0–4. Si la persona es nueva, preparar el navegador como en §3 de `B.md` antes de su primera sesión. Si no trae progreso de ese navegador, `npm run save -- after-ch4` imprime una línea que, pegada en la consola del navegador con el juego abierto, deja ganados los capítulos 0–4 y abierto 5.1 (ver [`kit.md`](kit.md)).

| Clave de `localStorage` | Contenido |
|---|---|
| `florecer.save` | El progreso: niveles abiertos, estrellas, Cuaderno, tarjetas vistas |
| `florecer.playtest` | El registro de la prueba (lo que se exporta) |

### Cómo abrir el juego

Como en §3 de `B.md`: `npm run dev` o el juego publicado. El juego publicado se despliega desde `main`: solo tiene los capítulos 5–7 después de integrar `develop` en `main`. La misma forma en todas las sesiones de una persona. **No usar el modo profesor** (`?teacher`).

### Antes de que llegue la persona

- Pantalla completa. El juego tiene sonido: auriculares o altavoz al volumen de una conversación, el mismo para todas las personas; los volúmenes del juego, como vienen.
- La plantilla de §7 impresa, un reloj a mano y algo para anotar la explicación de 7.4 palabra por palabra (o, con su permiso, grabar solo el audio de ese momento; la grabación se borra al pasar las notas).
- Comprobar que "Exportar registro de prueba" descarga un archivo: está en el panel de ajustes, que abre el engranaje (en el hub, arriba a la derecha; en un nivel, abajo a la izquierda).

---

## 4. Durante la sesión

El papel del observador es el del playtest A: sin tocar ni señalar, sin pistas, "¿Qué crees tú?" ante cualquier pregunta. Además de lo de siempre (confusión, frases literales, hipótesis), mirar en especial:

### Capítulo 5 (5.1–5.5)

- 5.1: si ve que la flor plegada forma parte de otro bucle impar ("¿quién es sol dos veces?") y la pliega sin la pista 3.
- 5.2: si usa las capas para entrar y salir de las flores, o si las ignora y se pierde.
- 5.3: si prueba primero el lado corto de la flor interior; cómo lee el Cuaderno ("Al desplegar una flor que está dentro de otra…").
- 5.5: si gasta el agua mirando al azar o con método.

### Capítulo 6 (6.1–6.6)

- 6.1: cómo ordena las tarjetas; si reconoce cada caso como algo que ya hizo a mano; qué tarjetas distractoras elige y qué dice al ver la que falla.
- 6.2: si sigue al jardinero mecánico con el sol o lo deja correr.
- 6.3: su reacción cuando el autómata sigue la receta de Bruto y declara "terminé" con 3 faroles (Sauce le recuerda que él encendió 4): ¿sabe qué tarjeta falta y por qué, antes de comprobar?
- 6.4 y 6.5: si mira los contadores y la gráfica; qué dice cuando Bruto se duerme. En las apuestas de 6.5, si cambia de respuesta de una carrera a otra a la vista de los datos.
- 6.6: si las dos preguntas del Cuaderno le parecen obvias o si duda; qué contraejemplos abre.

### Capítulo 7 (7.1–7.5)

- 7.1: si acepta que los espantapájaros no cierran o insiste en buscar otra colocación.
- 7.2: qué opción elige ante "¿por qué no tres?".
- 7.3: si encuentra C sin pistas; cómo lee la regla "a oscuras ≥ grupos impares − piedras".
- **7.4 (medida clave):** ver §4.1.
- 7.5: si levanta piedras con método (las lunas de su propia búsqueda) o por tanteo; cuántas veces presenta antes de que cuente.

### 4.1 — 7.4: ¿por qué las lunas son las piedras?

El jardinero mecánico busca solo y termina sin cadena; Sauce pide levantar las lunas como piedras y presentarlas con «Terminé». Al ganar, Sauce hace la cuenta y explica por qué siempre pasa (línea `ch7.4.sauce.08`).

Mientras juega, anotar:

- Si mira dónde quedaron las lunas antes de levantar nada, o levanta brotes al azar.
- Si presenta otras piedras (en este jardín, presentar sin levantar ninguna también demuestra los faroles, pero no cuenta: no son las lunas).
- Si abre la pista 3 (Sauce levanta la primera piedra por él).

**La pregunta en voz alta.** Justo después de que termine 7.4 y **antes de abrir 7.5**, el observador dice, sin añadir nada:

> "Explícame con tus palabras: ¿por qué las lunas sirven como piedras? ¿Pasaría lo mismo en cualquier jardín donde la búsqueda termina sin cadena?"

Anotar la respuesta tal cual. No corregir, no completar, no asentir ante lo correcto; si se queda en blanco, "¿Qué crees tú?" y esperar. La línea final de Sauce acaba de dar la razón: lo que se mide es si la persona la **reconstruye**, no si la recuerda, así que una respuesta que solo repite la frase de Sauce sin poder seguir ("¿y por qué cada sol queda solo?") se anota como repetida.

**Rúbrica** (marcar cada punto que diga con sus palabras, aunque no use estos términos):

1. **Al quitar las lunas, cada sol o flor queda aislado:** de un sol solo se llega a lunas; si llegara a otro sol habría cadena o flor, y a un brote sin marca ya lo habría marcado.
2. **Cada grupo que queda es impar:** un sol suelto es un brote; una flor siempre tiene un número impar de brotes.
3. **La cuenta cierra:** grupos impares − piedras = brotes a oscuras, y eso es lo que hay; no caben más faroles.
4. **Generaliza:** dice que pasa en cualquier jardín donde la búsqueda termina sin cadena, no solo en este.

El criterio de §1 pide los puntos 1 y 2. Los puntos 3 y 4 se anotan para leer la profundidad.

### Cuándo parar

- Al terminar 7.5.
- Si pasan **90 minutos** (**propuesta**): parar donde esté y exportar. Si se para antes de 7.4, no se cuenta la medida clave de esa persona; mejor parar al final de un capítulo y seguir otro día.
- Si la persona se frustra de verdad o pide parar, se para sin insistir y se anota dónde.

---

## 5. Al terminar

1. **Exportar el registro** desde el hub: engranaje de ajustes → "Exportar registro de prueba". Renombrar con persona y sesión (`P1-S3-florecer-playtest-<fecha>.json`). Contiene también las sesiones anteriores.
2. **Preguntas de cierre** (abiertas, en este orden):
   - ¿Qué fue lo más confuso? ¿En qué momento?
   - ¿Para qué sirven las capas?
   - ¿Qué le faltaba a la receta de Bruto? ¿Cómo lo supiste?
   - Si el jardín se duplica, ¿qué le pasa a tu receta? ¿Y a Bruto?
   - Con tus palabras: ¿cómo convences al Consejo de que no caben más faroles?
   - ¿Volverías a jugar?
3. Pasar a la plantilla las notas de 7.4 y, si hubo grabación, borrarla.
4. Borrar los datos del sitio antes de la siguiente persona.

---

## 6. Cómo leer el registro

El JSON exportado tiene `exportedAt`, `summary` (un resumen por nivel, en el orden en que se jugaron por primera vez) y `log` (cada entrada en bruto). Los campos de los Hitos A y B siguen igual (§6 de `A.md` y de `B.md`); para el Hito C importan además:

| Campo | Qué significa |
|---|---|
| `recipeChecks.right` / `.wrong` | Recetas comprobadas (6.1, 6.3) que eran correctas, y las que tenían una tarjeta que falla. En `log`, cada `recipeCheck` lleva `card` (la primera tarjeta que falla) y `case` (el caso de la búsqueda al que se refiere), o ambos `null` si la receta era correcta |
| `raceBets.right` / `.wrong` | Apuestas de 6.5 que las carreras dieron por buenas, y las que no. En `log`, cada `raceBet` lleva `runner` (`automaton` o `bruto`) y `answer` (`double`, `fourToEight` o `farMore`) |
| `stoneCertificates.counted` | Piedras presentadas con «Terminé» que son el certificado que pide el nivel |
| `stoneCertificates.provingOther` | Piedras que demuestran los faroles pero no cuentan: en 7.4, las que no son las lunas de la búsqueda |
| `stoneCertificates.failing` | Piedras que no demuestran nada (la cuenta no cierra) |
| `certificateRightFirstTry` | Si las primeras piedras presentadas en el nivel contaron (`null` si nunca se presentaron) |

En `log`, cada `stoneCertificate` lleva `stones` (los nombres de los brotes levantados), `proves` y `counts`. En 7.2 se presenta sin levantar ninguna piedra: `stones: []` es correcto ahí. Los campos "primera vez" no cambian en partidas posteriores.

### Qué campo responde a cada medida

| Medida | Dónde se lee |
|---|---|
| 7.4: ¿por qué las lunas son las piedras? (GDD §10) | No está en el registro: notas de §4.1 y rúbrica |
| 7.4: ¿las lunas a la primera? | Resumen de `"7.4"`: `certificateRightFirstTry` y `hint3BeforeWin: false`. Las piedras de cada intento, en las entradas `stoneCertificate` de `log` |
| 6.1: ¿receta en 3 comprobaciones? | Resumen de `"6.1"`: `recipeChecks.wrong` ≤ 2 y `recipeChecks.right` ≥ 1 |
| 6.3: ¿reparada a la primera? | Resumen de `"6.3"`: `recipeChecks.wrong` = 0 |
| 7.5: ¿certificado en 3 intentos? | Resumen de `"7.5"`: `stoneCertificates.counted` ≥ 1 y `stoneCertificates.provingOther` + `.failing` ≤ 2 |

Señales complementarias: en 6.1, la misma `card` fallando una y otra vez indica una tarjeta que no se entiende; en 6.5, `raceBet` de Bruto con `right: false` en la última carrera indica que la gráfica no transmite el crecimiento; en 7.3 y 7.5, `failing` alto indica que no se entiende la regla de los grupos impares; en 7.4, `provingOther` indica que demostró los faroles pero no tomó las lunas (leer junto con la explicación). En 5.3, 6.6 y 7.3, `notebookRightFirstTry` y `notebookWrong` se leen como en el Hito B. `timeMs` y las entradas `left` se leen como en el Hito A.

---

## 7. Plantilla por persona

Copiar una vez por persona. Tiempo en minutos, redondeado. La columna "Registro" solo aplica donde hay una medida de §6: recetas comprobadas (6.1, 6.3), apuestas acertadas de 8 (6.5), intentos de certificado (7.2–7.5).

**Persona:** P_ — **Fecha:** — **Duración:** — **¿Del playtest B?:** — **Perfil (sin datos personales):**

| Nivel | Tiempo | Pistas (grados) | Respuestas incorrectas | Registro | Notas |
|---|---|---|---|---|---|
| 5.1 | | | — | — | |
| 5.2 | | | — | — | |
| 5.3 | | | | — | |
| 5.4 | | | — | — | |
| 5.5 | | | — | — | |
| 6.1 | | | — | | |
| 6.2 | | — | — | — | |
| 6.3 | | | — | | |
| 6.4 | | — | | — | |
| 6.5 | | — | — | | |
| 6.6 | | — | | — | |
| 7.1 | | | | — | |
| 7.2 | | | | | |
| 7.3 | | | | | |
| 7.4 | | | — | | |
| 7.5 | | | — | | |

"Respuestas incorrectas" suma `wrongAnswers` y `notebookWrong`. Un guion (—) marca los niveles donde esa medida no aplica.

### 7.4 en voz alta

| Persona | Lo que dijo (literal) | 1. Aislados | 2. Impares | 3. Cuenta | 4. Generaliza | ¿Repetida? |
|---|---|---|---|---|---|---|
| P1 | | | | | | |
| P2 | | | | | | |
| P3 | | | | | | |
| P4 | | | | | | |
| P5 | | | | | | |

### Respuestas a las preguntas de cierre

| Persona | Lo más confuso | Capas | Receta de Bruto | Jardín doble | Convencer al Consejo |
|---|---|---|---|---|---|
| P1 | | | | | |
| P2 | | | | | |
| P3 | | | | | |
| P4 | | | | | |
| P5 | | | | | |

---

## 8. Qué hacer con los hallazgos

1. **Agregar** plantillas y resúmenes en una tabla por nivel (mediana de tiempo, pistas de grado 3, abandonos) y una fila por criterio de §1 (cuántas personas lo cumplen). Marcar lo que falla.
2. **Clasificar** cada problema como en el playtest A: del nivel (se corrige en su JSON o en `content/es/`, un commit por cambio), de mecánica o de motor (tarea del plan siguiente) o de diseño (se discute y, si cambia, primero se actualiza el GDD en su propio commit).
3. **Si falla 7.4**, mirar primero qué punto de la rúbrica falta. Si falta el 1, revisar si el final de la búsqueda del autómata deja ver que de cada sol solo salen lunas (el brillo de las lunas, el tiempo que se ve el bosque terminado). Si falta el 2, revisar si 7.3 deja clara la cuenta de los grupos impares y si la flor se ve como un grupo. Si la explicación solo repite a Sauce, plantear (como pregunta de diseño) que la línea `ch7.4.sauce.08` llegue después de una pregunta del propio nivel. Antes de tocar el jardín de 7.4, revisar 4.9 y 3.8, de donde sale.
4. **Si falla 6.1 o 6.3**, revisar las tarjetas que más fallan (`card` en `log`) y su texto antes de cambiar la receta.
5. **Volver a probar** cada nivel corregido con al menos una persona nueva.
6. **Cerrar el hito** cuando se cumplen los criterios de §1. Solo entonces los capítulos 5–7 pueden pasar a arte.
7. Los JSON, las plantillas y las notas literales que identifiquen a alguien se guardan fuera del repositorio; en él solo entran conclusiones anónimas.
