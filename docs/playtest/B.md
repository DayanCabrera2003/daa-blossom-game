# Playtest B — Protocolo

Capítulos 3–4 en greybox (círculos, rombos y líneas, sin arte ni voz). Lo dirige el autor. Fuente: GDD §10 (Hito B), §7 (capítulos 3 y 4) y §2 (principios). Todo lo que este documento no cambia sigue como en `docs/playtest/A.md` (papel del observador, qué no decir, cuándo parar, cómo clasificar hallazgos).

---

## 1. Objetivo del Hito B

Comprobar que el Invernadero (búsqueda sistemática, marcas de sol y luna, espantapájaros) y el Festival (bucles impares, la flor, plegar y desplegar, girar el tallo, el reto de la flor) se entienden **sin ayuda externa**, y sobre todo que el giro de 4.1 funciona: la luz en la que el jugador confía miente, y él lo comprueba con sus manos.

El GDD fija tres medidas clave:

1. En **4.1**, ¿el jugador encuentra la cadena a mano sin la pista 3?
2. En **4.2**, ¿señala la enredadera correcta (`d–b`)?
3. En **4.11**, ¿elige la opción correcta del Cuaderno sin pistas?

Se siguen midiendo, como en el Hito A, el tiempo por nivel, el uso de pistas y los abandonos.

**Regla:** no se pinta ningún capítulo hasta que su greybox pasa el playtest (GDD §10).

### Cuándo pasa y cuándo no

Los umbrales numéricos son **propuesta** del protocolo; el autor los confirma o ajusta antes de la primera sesión.

| Criterio | Pasa si | Origen |
|---|---|---|
| Completan sin ayuda | Todas las personas terminan los capítulos 3–4 sin que el observador intervenga | GDD §10 ("sin ayuda") |
| 4.1, la cadena a mano | Al menos 3 de cada 5 personas ganan 4.1 sin abrir la pista de grado 3 | GDD §10; umbral **propuesta** |
| 4.2, la enredadera | Al menos 3 de cada 4 personas señalan `d–b` en su primer intento | GDD §10; umbral **propuesta** |
| 4.11, el Cuaderno | Al menos 3 de cada 4 personas eligen la opción correcta a la primera | GDD §10; umbral **propuesta** |
| Pistas | Fuera de 4.1, ningún nivel necesita la pista de grado 3 en más de la mitad de las personas | **propuesta** |
| Tiempo | Mediana por nivel de 8 minutos como mucho; 3.9, 4.11 y 4.12 hasta 15 | **propuesta** |
| Atascos | Ninguna persona abandona un nivel (vuelve al hub sin ganarlo) más de dos veces | **propuesta** |

En 4.1 se espera algo de sufrimiento ("hay que dejar que duela", GDD §7): un tiempo alto en 4.1 no es un fallo por sí solo; sí lo es que la mayoría necesite la pista 3.

---

## 2. A quién invitar

**Personas nuevas que juegan los capítulos 0–4 desde el principio**, 3–5, sin formación en DAA ni en teoría de grafos, y que no hayan visto el GDD, el código ni una partida anterior.

Por qué personas nuevas y no quienes hicieron el playtest A:

- El giro de 4.1 solo funciona si la confianza en la luz se ha construido jugando: el capítulo 3 enseña la búsqueda y el capítulo 4 la traiciona. Quien juega desde cero vive ese recorrido entero.
- Sin modo profesor, el hub solo abre un nivel cuando se gana el anterior, así que en un perfil nuevo hay que pasar por 0–2 de todos modos. Quien ya hizo el playtest A los jugaría de memoria y su registro de esos capítulos no serviría para comparar.
- Quien hizo el playtest A ya sabe qué observa el autor y vio cómo reacciona.

Si faltan personas, se puede invitar a **una** del playtest A, anotándolo en su plantilla, y leer sus tiempos de 0–2 aparte.

### Sesiones

Treinta y nueve niveles no caben en una sesión. Se hacen **dos sesiones por persona** en el mismo equipo y el mismo perfil del navegador:

1. Capítulos 0–2, con el protocolo del playtest A (sirve además como nueva ronda del Hito A).
2. Capítulos 3–4, con este protocolo. Mejor otro día, pero no más de una semana después.

Entre las dos sesiones **no se borran los datos del sitio**: el progreso y el registro siguen en el navegador.

### Qué decirles (y qué no)

Igual que en el playtest A (§2 de `A.md`). En la segunda sesión, como mucho:

> "Seguimos donde lo dejaste. Recuerda pensar en voz alta."

No decir nunca nada de flores, bucles impares, Edmonds ni "algoritmo", ni avisar de que algo va a fallar en el capítulo 4.

---

## 3. Preparación

### Navegador y datos limpios

Antes de la **primera** sesión de cada persona: un perfil nuevo del navegador, o borrar estas claves de `localStorage` y recargar.

| Clave de `localStorage` | Contenido |
|---|---|
| `florecer.save` | El progreso: niveles abiertos, estrellas, Cuaderno, tarjetas vistas |
| `florecer.playtest` | El registro de la prueba (lo que se exporta) |

Antes de la **segunda** sesión: comprobar que el hub muestra abierto el nivel 3.1 y ganados los de 0–2. Una ventana privada no sirve si se cierra entre sesiones: se pierde todo.

### Cómo abrir el juego

| Forma | Comandos | Dirección |
|---|---|---|
| Servidor de desarrollo | `npm install` y `npm run dev` | La que imprime Vite (por defecto `http://localhost:5173/`) |
| Juego publicado | Ninguno | https://dayancabrera2003.github.io/daa-blossom-game/ |

El juego publicado se despliega desde `main`: solo tiene los capítulos 3–4 después de integrar `develop` en `main`. Antes, usar `npm run dev`. En ambos casos, la misma forma en las dos sesiones de una persona.

**No usar el modo profesor:** la dirección no debe llevar `?teacher` (abre todo y falsea el recorrido).

### Antes de que llegue la persona

- Pantalla completa; no hay audio en greybox.
- La plantilla de §7 impresa y un reloj a mano.
- Comprobar que "Exportar registro de prueba" descarga un archivo.

---

## 4. Durante la sesión

El papel del observador es el del playtest A: sin tocar ni señalar, sin pistas, "¿Qué crees tú?" ante cualquier pregunta. Además de lo de siempre (confusión, frases literales, hipótesis), mirar en especial:

### Capítulo 3 (3.1–3.9)

- Si distingue abejas de flores por la forma y deja de intentar juntar dos iguales.
- Si usa las marcas de sol y luna con método o al azar; si riega (inspecciona) antes de marcar.
- En 3.3 y 3.8, cómo lee el Cuaderno; en 3.7, qué dice del espantapájaros.

### 4.1 — La luz miente

La luz busca sola desde R, marca a marca, y declara que no hay cadena; el objetivo dice 3.

- Su reacción al ver que la luz se rinde: ¿mira el objetivo?, ¿desconfía de la luz o de sí mismo?
- Si vuelve a marcar a mano lo mismo que la luz, o si se olvida de las marcas y pasa faroles.
- Si intenta empezar desde otro brote (rechazo `notARoot` en el registro).
- **Si encuentra `R–a=b–d=c–e` a mano**, cuánto tarda y qué pistas abre. Anotar en qué momento "ve" que hay que rodear el triángulo por el otro lado.
- Qué dice a la línea final de Sauce ("Tu luz dijo que no había cadena. Y la había. ¿Qué pasó?").

### 4.2 — ¿Dónde se equivocó la luz?

La luz repite la búsqueda y Sauce pide señalar la enredadera donde se equivocó.

- **Si señala `d–b` a la primera** o qué enredaderas prueba antes.
- Si al ver la insignia partida dice algo parecido a "puede ser sol y luna a la vez".
- Si cuenta bien el bucle (3 brotes) y cómo lee el Cuaderno ("La luz se confunde cuando…").

### 4.3–4.10

- 4.4: si descubre el gesto de plegar a partir de la tarjeta; 4.5: si prueba el lado equivocado de la flor y entiende el rechazo.
- 4.9: si pulsa "Terminé" con confianza o duda; 4.10: si gira el tallo sin plegar.

### 4.11 — El reto de la flor

- Si entiende que es el adversario: ¿dibuja cadenas distintas para "ganar" al juego, o repite la misma?
- Cuántos dibujos rechaza el jardín por no ser cadena, y si entiende por qué.
- Si mira los tres momentos del argumento (extremo fuera, tramo hasta el primer pétalo, cadena en el jardín plegado) o los salta.
- **El Cuaderno** ("Plegar una flor…"): si lee las tres opciones y elige "…no crea ni destruye cadenas" a la primera. Mientras el Cuaderno pregunta no se ofrecen pistas, así que "sin pistas" equivale a "a la primera".

### Cuándo parar

- Al terminar 4.12.
- Si pasan **75 minutos** en la segunda sesión (**propuesta**): parar donde esté y exportar.
- Si la persona se frustra de verdad o pide parar, se para sin insistir y se anota dónde.

---

## 5. Al terminar

1. **Exportar el registro** desde el hub ("Exportar registro de prueba") al final de **cada** sesión. Renombrar con persona y sesión (`P1-S2-florecer-playtest-<fecha>.json`). El de la segunda sesión contiene también la primera.
2. **Preguntas de cierre** (abiertas, en este orden):
   - ¿Qué fue lo más confuso? ¿En qué momento?
   - En 4.1, cuando la luz dijo que no había cadena, ¿qué pensaste?
   - Con tus palabras: ¿por qué se equivocó la luz?
   - ¿Para qué sirve plegar una flor?
   - En el reto de la flor, ¿qué intentabas conseguir? ¿Lo conseguiste?
   - ¿Volverías a jugar el siguiente capítulo?
3. Borrar los datos del sitio antes de la siguiente persona.

---

## 6. Cómo leer el registro

El JSON exportado tiene `exportedAt`, `summary` (un resumen por nivel, en el orden en que se jugaron por primera vez) y `log` (cada entrada en bruto). Los campos del Hito A siguen igual (ver §6 de `A.md`); para el Hito B importan además:

| Campo | Qué significa |
|---|---|
| `hint3BeforeWin` | `true` si se abrió una pista de grado 3 antes de ganar el nivel por primera vez (en cualquier partida); si nunca se ganó, si se abrió alguna |
| `vinePicks.right` / `.wrong` | Enredaderas señaladas en 4.2 que eran el conflicto, y las que no |
| `firstPickRight` | Si la primera enredadera señalada en el nivel fue la correcta (`null` si no se señaló ninguna) |
| `notebookRightFirstTry` | Si la primera frase elegida en el Cuaderno del nivel fue verdadera (`null` si no se respondió) |
| `flowerChains.counted` / `.refused` | Cadenas dibujadas en el reto de la flor (4.11), y dibujos rechazados por no ser cadena |

Los campos "primera vez" no cambian en partidas posteriores: quien repite un nivel ya sabe la respuesta.

### Qué campo responde a cada medida del Hito B

| Medida (GDD §10) | Dónde se lee |
|---|---|
| 4.1: ¿cadena a mano sin pista 3? | Resumen de `"4.1"`: `wins` ≥ 1 y `hint3BeforeWin: false`. Los grados de cada pista, en las entradas `hint` de `log` |
| 4.2: ¿señala la enredadera correcta? | Resumen de `"4.2"`: `firstPickRight`. En `log`, cada entrada `pickVine` lleva `vine` con los nombres de sus extremos (`["d", "b"]` en cualquier orden es la correcta) |
| 4.11: ¿Cuaderno correcto sin pistas? | Resumen de `"4.11"`: `notebookRightFirstTry`. `notebookWrong` y `counterexamples` dicen cuánto costó después |

Señales complementarias: en 4.1, `refusals` con razón `notARoot` indica que intentó buscar desde otra raíz; en 4.2, `wrongAnswers` es el conteo del bucle fallado; en 4.11, `flowerChains.refused` alto indica que no se entiende qué se pide dibujar, y `counted` igual a 3 con un tiempo muy corto, que se dibujó sin mirar el argumento. `timeMs` y las entradas `left` se leen como en el Hito A.

---

## 7. Plantilla por persona

Copiar una vez por persona (segunda sesión). Tiempo en minutos, redondeado. La columna "Hito B" solo aplica en 4.1 (¿sin pista 3?), 4.2 (¿`d–b` a la primera?) y 4.11 (¿Cuaderno a la primera?).

**Persona:** P_ — **Fechas (S1 / S2):** — **Duración S2:** — **¿Hizo el playtest A?:** — **Perfil (sin datos personales):**

| Nivel | Tiempo | Pistas (grados) | Respuestas incorrectas | Hito B | Notas |
|---|---|---|---|---|---|
| 3.1 | | | — | — | |
| 3.2 | | | — | — | |
| 3.3 | | | | — | |
| 3.4 | | | — | — | |
| 3.5 | | | — | — | |
| 3.6 | | | — | — | |
| 3.7 | | | — | — | |
| 3.8 | | | | — | |
| 3.9 | | | — | — | |
| 4.1 | | | — | | |
| 4.2 | | | | | |
| 4.3 | | | — | — | |
| 4.4 | | | — | — | |
| 4.5 | | | — | — | |
| 4.6 | | | — | — | |
| 4.7 | | | | — | |
| 4.8 | | | — | — | |
| 4.9 | | | — | — | |
| 4.10 | | | | — | |
| 4.11 | | | | | |
| 4.12 | | | — | — | |

"Respuestas incorrectas" suma `wrongAnswers`, `vinePicks.wrong` y `notebookWrong`. Un guion (—) marca los niveles donde esa medida no aplica.

### Respuestas a las preguntas de cierre

| Persona | Lo más confuso | 4.1: qué pensó | Por qué se equivocó la luz | Para qué sirve plegar | Reto de la flor |
|---|---|---|---|---|---|
| P1 | | | | | |
| P2 | | | | | |
| P3 | | | | | |
| P4 | | | | | |
| P5 | | | | | |

---

## 8. Qué hacer con los hallazgos

1. **Agregar** plantillas y resúmenes en una tabla por nivel (mediana de tiempo, pistas de grado 3, abandonos) y una fila por medida del Hito B (cuántas personas la cumplen). Marcar lo que falla un criterio de §1.
2. **Clasificar** cada problema como en el playtest A: del nivel (se corrige en su JSON o en `content/es/`, un commit por cambio), de mecánica o de motor (tarea del plan siguiente) o de diseño (se discute y, si cambia, primero se actualiza el GDD en su propio commit).
3. **Si falla 4.1**, antes de tocar el jardín revisar las pistas 1 y 2 y la línea que sigue a la búsqueda de la luz: el nivel debe doler, no bloquear. **Si falla 4.2**, revisar la pregunta de Sauce y la tarjeta de señalar. **Si falla 4.11**, revisar si los tres momentos del argumento se ven y duran lo suficiente antes de cambiar el Cuaderno.
4. **Volver a probar** cada nivel corregido con al menos una persona nueva.
5. **Cerrar el hito** cuando se cumplen los criterios de §1. Solo entonces los capítulos 3–4 pueden pasar a arte.
6. Los JSON y las plantillas con notas que identifiquen a alguien se guardan fuera del repositorio; en él solo entran conclusiones anónimas.
