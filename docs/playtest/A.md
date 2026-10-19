# Playtest A — Protocolo

Capítulos 0–2 en greybox (círculos y líneas, sin arte ni voz). Lo dirige el autor. Fuente: GDD §10 (Hito A) y §2 (principios).

> **Hoy (plan 09):** el protocolo se escribió para el greybox; el juego ya tiene arte, música, efectos y balbuceo. Lo que cambia en la preparación está en §3; los umbrales y criterios no cambian (Apéndice A del plan 09, preguntas 10 y 11, pendientes del autor). La hoja de una página para cada sesión es [`kit.md`](kit.md).

> **Hoy (plan 10, versión 1.1.0):** lo que cambió en los capítulos 0–2 y se ve en la sesión o en el registro. Los umbrales y criterios de §1 **no cambian**.
> - Un «Terminé» que no gana ya **recibe respuesta**: un aviso suave que no dice dónde está la cadena. En el registro, su entrada `claim` lleva `verdict` (en estos capítulos, `chainLeft`), y cuenta como un rechazo para ofrecer pistas.
> - El botón **Pista** está **siempre a mano** mientras queden grados; el juego lo hace brillar tras 90 s sin progreso real (más faroles, una búsqueda que crece…; juntar y separar en bucle no cuenta) o tras tres rechazos seguidos. Abrir una pista sin oferta cuesta la estrella "sin pistas" igual que antes. De 1.5 a 1.9 los niveles tienen tres pistas propias, y ninguna de grado 2 señala la respuesta.
> - Los Cuadernos de 1.5 y 2.4 se abren **antes** de que Sauce resuma la idea; la opción correcta no repite su frase.
> - 2.3 termina con una pregunta («¿Podría la punta de un hilo que gana el agua tener un farol tuyo?»); su respuesta queda en `log` como una entrada `answer` y una equivocada suma en `wrongAnswers`.
> - 2.4 se juega en **dos fases** sobre un jardín nuevo: primero dibuja dos reflejos que le ganan y usa la cadena que le dejan; luego, ya sin cadena, intenta ganarle tres veces y no puede (ver §6).
> - 1.1 y 1.2 dicen «Mira otra forma de ver lo que pasó…»; 1.7 tiene una línea al ganar; el último nivel de cada capítulo invita a leer su página del Códex.

---

## 1. Objetivo del Hito A

Comprobar que los capítulos 0–2 enseñan **sin ayuda externa** lo que pretenden: juntar, pasar el farol, la cadena, la incomodidad de "¿Terminé?" y, en el estanque, que sin cadena nadie gana.

El GDD fija cuatro medidas:

1. Tiempo por nivel.
2. Uso de pistas.
3. Dónde pulsan "Terminé" sin razón.
4. Si describen la cadena con sus palabras al terminar el capítulo 1.

**Regla:** no se pinta ningún capítulo hasta que su greybox pasa el playtest (GDD §10). El pixel art es lo más caro de rehacer.

### Cuándo pasa y cuándo no

Los umbrales numéricos son **propuesta** del protocolo; el autor los confirma o ajusta antes de la primera sesión.

| Criterio | Pasa si | Origen |
|---|---|---|
| Completan sin ayuda | Todas las personas terminan los capítulos 0–2 sin que el observador intervenga | GDD §10 ("sin ayuda") |
| Descripción de la cadena | Al menos 3 de cada 4 personas describen la cadena con sus palabras de forma reconocible: empieza y termina en alguien a oscuras, y los faroles se pasan a lo largo | **propuesta** |
| Pistas | Ningún nivel necesita la pista de grado 3 en más de la mitad de las personas | **propuesta** |
| Tiempo | Ningún nivel de los capítulos 0–1 pasa de 5 minutos en la mediana; ninguno del capítulo 2 pasa de 8 | **propuesta** |
| "Terminé" sin razón | En 1.8 se pulsa sin razón como mucho una vez por persona en la mediana; fuera de 1.8 no aparece | **propuesta** |
| Atascos | Ninguna persona abandona un nivel (vuelve al hub sin ganarlo) más de dos veces | **propuesta** |

Un nivel que falla un criterio no tumba el hito entero: se marca, se corrige y se vuelve a probar con una persona nueva (ver §8).

---

## 2. A quién invitar

- **3–5 personas** sin formación en DAA ni en teoría de grafos. Mejor si alguna no juega a puzles habitualmente.
- Nadie que haya visto el GDD, el código o una partida anterior.

### Qué decirles (y qué no)

Decir, como mucho:

> "Es un juego de puzles sobre un jardín. Estoy probando si se entiende solo. No te puedo ayudar mientras juegas, pero me ayuda mucho que pienses en voz alta: qué intentas, qué esperas que pase, qué te sorprende."

**No decir nunca:**

- Nada de grafos, vértices, aristas, emparejamientos, caminos aumentantes, Edmonds, Berge ni "algoritmo". El juego no nombra la matemática antes de que se descubra (GDD §2.2); el observador tampoco.
- Que el juego enseña algo de una asignatura.
- Cuántos niveles hay o cuánto "debería" tardar.
- Ninguna pista, ni con gestos. Si preguntan, responder: "¿Qué crees tú?" o "Haz lo que harías si yo no estuviera".

---

## 3. Preparación

### Navegador y datos limpios

El registro empieza vacío solo si el navegador no guarda datos del juego. Usar **un perfil nuevo** del navegador (o una ventana privada), o borrar los datos del sitio antes de cada persona.

| Clave de `localStorage` | Contenido |
|---|---|
| `florecer.playtest` | El registro de la prueba (lo que se exporta) |
| `florecer.save` | El progreso: niveles abiertos, estrellas |

Si se reutiliza el mismo perfil, borrar ambas claves (herramientas de desarrollo → Almacenamiento → Local Storage) y recargar. Comprobar que el hub solo muestra abierto el nivel 0.1.

### Cómo abrir el juego

Una de estas tres formas:

| Forma | Comandos | Dirección |
|---|---|---|
| Servidor de desarrollo | `npm install` y `npm run dev` | La que imprime Vite (por defecto `http://localhost:5173/`) |
| Build de producción | `npm run build` y `npx vite preview` | La que imprime Vite (por defecto `http://localhost:4173/`) |
| GitHub Pages | Ninguno (tras integrar `develop` en `main`) | La URL de Pages del repositorio |

Se recomienda el build de producción o Pages: es lo que verá un jugador real.

**No usar el modo profesor:** la dirección no debe llevar `?teacher`. Ese modo abre todos los niveles (incluidos los borradores de otros capítulos) y falsea el recorrido.

### Antes de que llegue la persona

- Pantalla completa. El juego tiene sonido: auriculares o altavoz al volumen de una conversación, el mismo para todas las personas; los volúmenes del juego, como vienen.
- Una copia impresa de la plantilla de §7 y un reloj a mano para anotar momentos.
- Probar en ese mismo equipo que el botón "Exportar registro de prueba" descarga un archivo: está en el panel de ajustes, que abre el engranaje (en el hub, arriba a la derecha; en un nivel, abajo a la izquierda).

---

## 4. Durante la sesión

### Papel del observador

- Sentarse detrás o al lado, sin tocar el ratón ni señalar la pantalla.
- No intervenir salvo un fallo técnico (el juego se cuelga, la página no carga).
- Si la persona se queda en silencio, recordar una sola vez: "¿Qué estás pensando?"
- Las pistas son parte del juego: el botón Pista está siempre a mano, y el juego lo hace brillar tras 90 segundos sin progreso real o tres rechazos seguidos (un «Terminé» que no gana cuenta como rechazo). El observador no las menciona; si la persona pregunta, se responde como a cualquier otra pregunta ("¿Qué crees tú?").

### Qué anotar a mano (el registro no lo ve)

| Qué | Ejemplo |
|---|---|
| Momentos de confusión | "En 1.3 arrastra desde un brote con farol, tres veces" |
| Reacciones verbales literales | "¡Ah, se pasan!", "esto es imposible", "¿y ahora qué?" |
| Dónde mira | Lee el texto de Sauce o lo salta; mira el contador de faroles; busca botones |
| Hipótesis en voz alta | "Creo que hay que encender todos" |
| Momentos de descubrimiento | Cuándo entiende pasar el farol, cuándo usa la cadena sin dudar |
| Sorpresas en el estanque | Qué dice al ver el reflejo, al separar hilos; en 2.4, al usar la cadena que le deja el reflejo y al no poder ganar en la segunda fase |
| Tras un «Terminé» que no gana | Qué hace al leer el aviso: si vuelve a buscar o cree que el juego falló |
| Lectura del Cuaderno | Si lee las opciones enteras o elige rápido; qué dice ante el contraejemplo. El Cuaderno llega antes de que Sauce resuma: lo que elija no lo acaba de oír |

Anotar la hora junto a cada nota para cruzarla después con el registro.

### Cuándo parar

- Al terminar el nivel 2.4.
- Si pasan **60 minutos** (**propuesta**): parar donde esté, exportar igualmente.
- Si la persona se frustra de verdad o pide parar: se para sin insistir. Anotar en qué nivel y por qué; es un dato, no un fracaso.

---

## 5. Al terminar

1. **Exportar el registro.** Volver al hub, abrir los ajustes (el engranaje, arriba a la derecha) y pulsar **"Exportar registro de prueba"**. Se descarga `florecer-playtest-<fecha>.json`. Renombrarlo con el identificador de la persona (p. ej. `P1-florecer-playtest-<fecha>.json`) y guardarlo junto a la plantilla rellena. Nada sale del navegador por otra vía.
2. **La pregunta de la cadena.** Si la persona llegó al final del capítulo 1, preguntar sin más contexto:

   > "Describe con tus palabras qué es una cadena."

   Escribir **sus palabras exactas**, sin corregir ni completar. Si no llegó al capítulo 2, hacer la pregunta igualmente y anotarlo.
3. **Preguntas de cierre** (abiertas, en este orden, sin sugerir respuestas):
   - ¿Qué fue lo más confuso? ¿En qué momento?
   - ¿Hubo algún nivel en el que no supieras qué se te pedía?
   - En 1.8, cuando pulsaste "Terminé", ¿cómo sabías que habías terminado?
   - El estanque: ¿qué crees que te estaba enseñando el reflejo?
   - En el reto del espejo (2.4), en la segunda parte, ¿por qué crees que no podías ganar?
   - El Cuaderno: ¿te ayudaron los jardines que refutaban las frases falsas?
   - ¿Volverías a jugar el siguiente capítulo?
4. Borrar los datos del sitio (o cerrar el perfil) antes de la siguiente persona.

---

## 6. Cómo leer el registro

El JSON exportado tiene tres partes: `exportedAt` (fecha de la exportación), `summary` (un resumen por nivel, en el orden en que se jugaron por primera vez) y `log` (cada entrada en bruto, para preguntas que el resumen no responda).

### Campos del resumen por nivel

| Campo | Qué significa |
|---|---|
| `level` | Identificador del nivel (`"1.5"`) |
| `plays` | Veces que se empezó el nivel |
| `wins` | Veces que se ganó |
| `bestStars` | Mejor número de estrellas obtenido (`null` si nunca lo ganó) |
| `timeMs` | Tiempo total dentro del nivel, en milisegundos, sumando todas las partidas. Una partida cortada (página cerrada) cuenta hasta su última entrada |
| `moves` | Movimientos aceptados (juntar, separar, pasar, cadena…) |
| `refusals` | Movimientos que el jardín rechazó; en `log` cada uno lleva su código de razón |
| `hints` | Pistas pedidas; en `log` cada una lleva su grado (1, 2 o 3) |
| `claims.right` / `claims.wrong` | "Terminé" pulsado con el máximo de faroles (`right`) o sin razón (`wrong`). En `log`, cada `claim` que no gana lleva `verdict`, el aviso que vio (`chainLeft`: el jardín aún guarda una cadena) |
| `wrongAnswers` | Respuestas incorrectas a preguntas del mentor (también la de 2.3) o a conteos |
| `bets.made` / `bets.right` | Apuestas hechas y acertadas (incluidas las informales de 0.4) |
| `notebookWrong` | Frases falsas elegidas en el Cuaderno (1.5, 2.4) |
| `counterexamples` | Jardines contraejemplo abiertos desde el Cuaderno o desde una pregunta |
| `mirrorChecks.beating` / `.notBeating` | En 2.4, reflejos dibujados que superaban al jardín, y los que no. La segunda fase no se puede ganar: cada partida que la acaba suma tres `notBeating` por diseño |

En `log`, las entradas `levelEnd` con `outcome: "left"` indican que se volvió al hub sin ganar, y las `history` (`undo`, `redo`, `seek`) cuánto se usó deshacer y el día.

### Qué campo responde a cada medida del Hito A

| Medida (GDD §10) | Dónde se lee |
|---|---|
| Tiempo por nivel | `timeMs` (dividir entre 60 000 para minutos); `plays` y las entradas `left` muestran si hubo que volver a empezar |
| Uso de pistas | `hints`; el grado de cada una en las entradas `hint` de `log` |
| "Terminé" sin razón | `claims.wrong` por nivel (el botón aparece en 1.8) |
| Descripción de la cadena | No está en el registro: notas a mano de §5 |

Señales complementarias: `refusals` alto indica una regla que no se entiende (mirar los códigos); `wrongAnswers` en 2.1–2.2 indica que el conteo de hilos no queda claro; `notebookWrong` sin `counterexamples` indica que no se abrieron los jardines que refutan; `mirrorChecks.notBeating` alto en 2.4 (más de los tres de la segunda fase por partida; en `log`, los `mirrorCheck` de antes del primer `move` del nivel son de la primera) indica que no se entiende qué se pide dibujar.

---

## 7. Plantilla por persona

Copiar una vez por persona. Tiempo en minutos, redondeado.

**Persona:** P_ — **Fecha:** — **Duración total:** — **Perfil (sin datos personales):**

| Nivel | Tiempo | Pistas (grados) | "Terminé" sin razón | Respuestas incorrectas | Notas |
|---|---|---|---|---|---|
| 0.1 | | | — | — | |
| 0.2 | | | — | — | |
| 0.3 | | | — | — | |
| 0.4 | | | — | | |
| 0.5 | | | — | — | |
| 1.1 | | | — | — | |
| 1.2 | | | — | — | |
| 1.3 | | | — | — | |
| 1.4 | | | — | — | |
| 1.5 | | | — | | |
| 1.6 | | | — | | |
| 1.7 | | | — | — | |
| 1.8 | | | | | |
| 1.9 | | | — | — | |
| 2.1 | | | — | | |
| 2.2 | | | — | | |
| 2.3 | | | — | | |
| 2.4 | | | — | | |

"Respuestas incorrectas" suma `wrongAnswers`, apuestas falladas y `notebookWrong`. Un guion (—) marca los niveles donde esa medida no aplica.

### Descripción de la cadena

| Persona | Palabras exactas | ¿Reconocible? (extremos a oscuras / faroles que se pasan) |
|---|---|---|
| P1 | | |
| P2 | | |
| P3 | | |
| P4 | | |
| P5 | | |

### Respuestas a las preguntas de cierre

| Persona | Lo más confuso | 1.8 | Estanque | 2.4 | Cuaderno |
|---|---|---|---|---|---|
| P1 | | | | | |
| P2 | | | | | |
| P3 | | | | | |
| P4 | | | | | |
| P5 | | | | | |

---

## 8. Qué hacer con los hallazgos

1. **Agregar.** Juntar las plantillas y los resúmenes en una tabla por nivel (mediana de tiempo, pistas de grado 3, "Terminé" sin razón, abandonos). Marcar cada nivel que falla un criterio de §1.
2. **Clasificar cada problema:**
   - *Del nivel* (jardín confuso, distractor que no funciona, texto de Sauce ambiguo, pista inútil): se corrige en el JSON del nivel o en `content/es/`, cada cambio en su propio commit.
   - *De mecánica o de motor* (un gesto que no se descubre, un rechazo que no se entiende): se convierte en tarea del plan siguiente.
   - *De diseño* (un concepto que no llega aunque el nivel funcione): se discute y, si cambia el diseño, se actualiza el GDD en su propio commit antes de tocar código.
3. **Volver a probar** cada nivel corregido con al menos una persona nueva que no haya jugado antes.
4. **Cerrar el hito** cuando se cumplen los criterios de §1. Solo entonces los capítulos 0–2 pueden pasar a arte; hasta que el greybox pase, no se pinta nada.
5. Guardar los JSON exportados y las plantillas fuera del repositorio si contienen notas que identifiquen a alguien; en el repositorio solo entran conclusiones anónimas.
