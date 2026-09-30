# FLORECER — Documento de diseño

*Un juego de jardín que enseña el algoritmo de Edmonds (Blossom) de principio a fin.*
*Proyecto para Diseño y Análisis de Algoritmos. Título provisional.*

---

## 0. En una frase

Eres el nuevo jardinero de un jardín donde, cada noche, los brotes se juntan de dos en dos para cargar un farol. Tu trabajo es que **el mayor número posible de brotes duerma con luz**. Para lograrlo tendrás que inventar, sin que nadie te lo diga, el algoritmo de emparejamiento máximo en grafos generales, demostrar que funciona y demostrar que es rápido.

Todo lo que el jugador hace con las manos tiene un nombre matemático exacto. El juego nunca dice ese nombre hasta que el jugador ya domina la idea; entonces el Códex se lo traduce.

---

## 1. Objetivos

### 1.1 Objetivos didácticos (lo que el jugador entiende al terminar)

1. Qué es un emparejamiento y por qué "no poder añadir más" no significa "ser el máximo".
2. Qué es un camino aumentante y por qué siempre gana exactamente una pareja.
3. **Lema de Berge:** un emparejamiento es máximo si y solo si no tiene camino aumentante.
4. Cómo buscar caminos aumentantes de forma sistemática (bosque alternante, etiquetas par/impar).
5. Por qué esa búsqueda funciona en grafos bipartitos y falla en presencia de ciclos impares.
6. Qué es una flor (blossom), qué es su base y su tallo, y por qué contraerla arregla la búsqueda.
7. **Lema de la flor:** contraer una flor no crea ni destruye caminos aumentantes (ambas direcciones).
8. Cómo se desdoblan flores anidadas.
9. El algoritmo completo de Edmonds y por qué termina y es correcto.
10. Su costo O(n³) (O(n·m) con cuidado) frente a la búsqueda exhaustiva exponencial.
11. **Fórmula de Tutte–Berge** como certificado de optimalidad, y que el propio bosque de la búsqueda fallida entrega el certificado.
12. El caso bipartito como caso particular: teorema de König.
13. Usos reales del algoritmo.

### 1.2 Objetivos de rigor (lo que exige el profesor)

| Requisito | Dónde vive en el juego |
|---|---|
| Algoritmo fuera del temario | Emparejamiento máximo en grafos generales (Edmonds, 1965) |
| Demostración de corrección didáctica | Capítulos 2, 4, 7 (Berge, lema de la flor, Tutte–Berge) jugados como puzles adversarios y certificados; Códex C3, C8, C10, C12 |
| Análisis de costo | Capítulo 6 (mediciones, carrera, gráfica) y Códex C11 |
| Ejemplos intuitivos primero, generalización después | Estructura de cada capítulo: introducir → practicar → giro → dominar |
| Narración con la voz del autor | Mentora, pistas y Paseo guiado (video) |
| Calidad audiovisual | Pixel art por estaciones, animaciones de cascada y floración, música por capítulo |
| Plan previo aprobado | Este documento |

### 1.3 Objetivos de experiencia

- Que un jugador sin ninguna formación en grafos lo entienda todo.
- Que sea disfrutable aunque no te importe la teoría: puzles satisfactorios, juice, progreso visible.
- Sesiones cortas. Sin castigos. La dificultad viene de pensar, no de repetir.

---

## 2. Principios de diseño

1. **Un solo movimiento primitivo.** Todo nace de "pasar el farol". El camino aumentante, la búsqueda y la contracción son consecuencias que el jugador descubre, no herramientas que se le dan.
2. **Mostrar antes de nombrar.** El Códex se desbloquea *después* de dominar la idea. El juego nunca usa "grafo", "arista", "vértice", "emparejamiento" ni "camino aumentante" fuera del Códex.
3. **Cuatro fases por concepto:** introducir (caso mínimo, casi obvio) → practicar (2–3 variaciones) → giro (un caso que rompe la intuición) → dominar (reto que combina todo).
4. **El fracaso enseña.** Hay niveles diseñados para que la estrategia anterior parezca funcionar y falle. El momento clave del juego es cuando la búsqueda "miente" (nivel 4.1).
5. **Predecir antes de actuar.** Las "apuestas" obligan a construir un modelo mental. Equivocarse es gratis.
6. **Formular la regla uno mismo.** El Cuaderno del Jardinero pide elegir el enunciado correcto entre varios sutilmente falsos, y refuta cada falso con un jardín contraejemplo, no con texto.
7. **Sin castigo.** Deshacer es gratis y siempre. El costo (agua, pasos) aparece cuando el jugador ya quiere ser eficiente, y es condición de estrella, no de derrota.
8. **Demostraciones como juego:** el jugador es **adversario** (intenta romper una afirmación y fracasa, y entonces ve por qué) o **constructor de certificados** (construye un objeto que prueba optimalidad y lo verifica). Las partes que no encajan en ninguno de los dos moldes se entregan como argumento guiado e interactivo, nunca como texto pasivo.
9. **Repetición espaciada.** Cada capítulo reutiliza las mecánicas de los anteriores.
10. **Toda mecánica es exacta.** Nada en el juego es una "aproximación pedagógica" del algoritmo. Si el jugador puede hacerlo, es matemáticamente válido; si es inválido, el juego lo rechaza y explica por qué.

---

## 3. El mundo

### 3.1 Premisa

En el Jardín de los Faroles vive un pueblo de brotes. Cada noche, dos brotes conectados por una enredadera pueden compartir un farol. Un brote solo puede cargar un farol. Los que se quedan sin pareja duermen a oscuras: no les pasa nada malo, pero están tristes y les cuesta crecer. El jardín florece más cuanto más luz hay.

Tú acabas de llegar como jardinero. El Abuelo Sauce te enseña el oficio a base de preguntas. Un gnomo insiste en que la única forma de estar seguro es probarlo todo. Y al final, el Consejo de los Robles te exigirá pruebas, no promesas.

El jardín pasa por las cuatro estaciones a lo largo del juego. Cada estación es un capítulo y trae una idea nueva.

### 3.2 Personajes

| Personaje | Función didáctica | Voz |
|---|---|---|
| **Abuelo Sauce** (mentor, un sauce viejo) | Hace preguntas, da pistas en tres grados, nombra las cosas *después* de que el jugador las descubre. Nunca explica antes de tiempo. | La voz del autor |
| **Bruto** (gnomo de la fuerza bruta) | Alivio cómico. Propone siempre "probar todas las combinaciones". Cada capítulo va más lento. Personifica el costo exponencial y las "recetas rotas". | Voz del autor, distorsionada/aguda |
| **El Consejo de los Robles** | Exigen certificados: "¿Cómo sabes que nadie más puede tener farol?" Personifican la demostración de optimalidad. | Voz del autor, grave y lenta |
| **Los brotes** | Los vértices. Tienen caritas: dormidos y tristes a oscuras, felices con farol. | Sonidos, sin voz |
| **Abejas y flores** (Invernadero) | La forma natural de que un jardín sea bipartito sin decir la palabra. | — |

### 3.3 Glosario jardín ↔ matemáticas

Esta tabla es la columna vertebral del proyecto: demuestra que cada mecánica es exacta. Aparece completa en el Códex (C13).

| En el jardín | En matemáticas |
|---|---|
| Brote | Vértice |
| Enredadera | Arista |
| Jardín | Grafo |
| Farol compartido | Arista del emparejamiento M |
| Brote con farol / a oscuras (solitario) | Vértice cubierto / expuesto (libre) |
| Noche bien aprovechada | Emparejamiento máximo |
| "No puedo añadir ningún farol sin mover nada" | Emparejamiento maximal |
| Pasar el farol | Intercambiar (flip) a lo largo de un camino alternante |
| Cadena (que gana un farol) | Camino aumentante |
| Cadena que no gana nada | Camino alternante de longitud par |
| El reflejo del estanque | Un emparejamiento alternativo M\*; la maraña es M ⊕ M\* |
| Caminar de noche con luz | Búsqueda de camino aumentante (BFS alternante) |
| Marca de sol / de luna | Vértice exterior (outer, par) / interior (inner, impar) |
| Cada brote solitario lanza su luz | Bosque alternante con raíces en los vértices libres |
| Abejas y flores | Grafo bipartito |
| Espantapájaros | Cobertura por vértices (König) |
| Un brote que debe ser sol y luna | Arista exterior–exterior en el mismo árbol: ciclo impar |
| Flor | Blossom (ciclo impar alternante con un tallo) |
| Base de la flor | Base del blossom (único vértice del ciclo cuyo farol sale del ciclo, o libre) |
| Tallo | Camino alternante par desde una raíz libre hasta la base |
| Plegar la flor | Contraer el blossom a un único vértice |
| Desplegar | Expandir la contracción al levantar el camino |
| Girar el tallo | Intercambiar a lo largo del tallo para dejar la base libre |
| Flor dentro de flor | Blossoms anidados |
| La receta | Algoritmo de Edmonds |
| El jardinero mecánico | Ejecución del algoritmo |
| Gotas de agua / pasos | Operaciones elementales (costo) |
| Piedras | Conjunto U de Tutte–Berge |
| Grupos impares | Componentes conexas de G − U de tamaño impar |
| "Nadie más puede tener farol, y aquí está la prueba" | Certificado de optimalidad (Tutte–Berge) |

---

## 4. Estilo visual y sonoro

### 4.1 Pixel art

- **Lienzo interno:** 480 × 270 píxeles, escalado por entero (×3 en 1440p, ×4 en 4K). Pixel perfect, sin filtrado.
- **Tiles:** 16 × 16. Brotes: 16 × 16 (cuerpo) con carita animada; flores plegadas: 32 × 32 con el número de pétalos visible como pétalos reales.
- **Paleta:** una paleta base de 32 colores (estilo Endesga o similar, elegida al inicio y respetada en todo el juego). Cada estación aplica un subconjunto y un tinte:
  - Prólogo, Huerto: verdes suaves, marrón tierra, cielo de atardecer.
  - Primavera, Prado: verdes claros, rosas, blanco de flores, cielo azul.
  - Invernadero: cristal turquesa, niebla gris-lila, madera.
  - Verano, Festival: naranjas, faroles rojos, noche cálida con banderines.
  - Otoño, Jardín Salvaje: ocres, rojos, hojas cayendo, maleza.
  - Invierno, Recetario: azules fríos, nieve, luz de vela en la cabaña.
  - Consejo: crepúsculo violeta, robles enormes.
- **Faroles:** el elemento más importante del juego. Ámbar cálido, halo de 2 tonos, parpadeo de 3 frames. Un brote a oscuras se ve en tonos azulados; con farol, en cálidos. La diferencia se debe leer a un metro de distancia.
- **Enredaderas:** curvas punteadas de 1 píxel; al iluminarse (farol) pasan a línea continua ámbar con brillo.
- **Marcas sol/luna:** insignias de 8 × 8 encima del brote. Sol amarillo con rayos, luna azul en cuarto. **Forma distinta además de color** (accesibilidad daltónica). El conflicto "sol y luna a la vez" se dibuja como una insignia partida que parpadea entre ambas.
- **Flor plegada:** animación de 8 frames en la que los brotes del ciclo se juntan hacia el centro y se cierran como pétalos; al desplegar, se abre en sentido inverso. Las flores anidadas muestran una flor más pequeña en su centro.
- **Niebla:** capa semitransparente con dithering; se disuelve en círculo alrededor de cada brote inspeccionado.
- **Espejo del estanque:** el jardín se refleja en el agua con ondas; los faroles del reflejo son azul plateado.
- **Piedras:** el brote levantado se convierte en piedra gris; el hueco deja ver la separación del jardín en grupos, cada grupo con su contorno.
- **Ciclo día/noche:** el sol en la barra superior es el slider de tiempo. Arrastrarlo tiñe la escena (amanecer → día → atardecer → noche) y reproduce los movimientos en orden.
- **Animaciones clave (las que tienen que ser perfectas):**
  1. Pasar el farol: el farol salta con squash & stretch de un brote al siguiente, con una campanita que sube de tono en cada salto. Al terminar una cadena ganadora, el último farol aparece con un destello y confeti de pétalos.
  2. Plegar/desplegar la flor.
  3. El "conflicto" de sol y luna.
  4. Levantar una piedra y ver el jardín partirse.
- **UI:** paneles de madera en 9-slice, iconos de 16 × 16, tipografía pixel legible (tamaño 8 con doble escala para texto largo). Cuaderno y Códex se abren como libros con página que pasa.
- **Jardín-hub:** una pantalla central que crece: cada capítulo terminado planta algo (un rosal, un estanque, un invernadero, banderines, robles).

### 4.2 Sonido

- **Música:** una pieza por estación, chiptune suave o lo-fi con instrumentos "de madera". Loop de 2–3 minutos. Las carreras del invierno tienen una variante más rápida.
- **Efectos:** campanitas de farol (escala pentatónica; una cadena de longitud k toca k notas ascendentes), cierre de flor (acorde), niebla (soplo), piedra (golpe sordo), error suave (nunca un buzzer).
- **Voz:** todas las líneas del mentor, el gnomo y el Consejo son grabadas por el autor, que es hombre. **Todos los personajes con voz son masculinos** y se distinguen por registro y procesado, no por actor:
  - **Abuelo Sauce:** voz natural del autor, pausada y cálida, algo de reverberación corta "de exterior".
  - **Bruto:** voz del autor acelerada y con pitch subido dos o tres semitonos, ritmo atropellado. Es el único personaje al que se le aplica un efecto cómico.
  - **El Consejo de los Robles:** voz del autor con pitch bajado, muy lenta, reverberación larga y ligero coro (tres tomas superpuestas: son varios robles hablando a la vez).
  Siempre con subtítulos. Las pistas también son de voz.

---

### 4.3 Herramientas y recursos para la calidad visual y sonora

Criterio: la calidad visual **no depende de dibujar cada píxel desde cero ni de generar arte con IA**. Se apoya en recursos con licencia libre de calidad probada, herramientas maduras, y arte original solo donde define la identidad del juego. Todo recurso ajeno se registra en `CREDITS.md` con autor y licencia.

**Qué se compra o descarga, y qué se hace a mano**

| Capa | Fuente | Licencia | Notas |
|---|---|---|---|
| Tiles de entorno (tierra, césped, agua, cercas, madera, nieve) | **Sprout Lands** (Cup Nooble, itch.io) | Gratis con atribución; el pack premium es de pago y permite uso comercial | Es exactamente la estética cozy de jardín que queremos; ahorra semanas |
| Plantas, flores, árboles decorativos, invernadero | Sprout Lands + **Kenney** (kenney.nl) | CC0 (Kenney) | Se combinan porque comparten escala 16 × 16 |
| UI (paneles 9-slice, botones, iconos, libro) | **Kenney UI Pack / Pixel UI**, más retoques propios | CC0 | Se recolorea a la paleta del juego |
| Tipografías pixel | **m5x7** y **m6x11** (Daniel Linssen) | Gratis, uso libre | Legibles a escala 1× y 2×; cubren acentos y ñ |
| Paleta | **Endesga 32** o **Resurrect 64** (Lospec) | Libre | Se elige una y se respeta en todo, incluidos los recursos ajenos recoloreados |
| Música | Packs chiptune / lo-fi con licencia (itch.io, OpenGameArt) o composición propia en **BeepBox** o **Bosca Ceoil** (gratis) | CC0 / CC-BY según pack | Un tema por estación; un loop de 2–3 min |
| Efectos de sonido | **Kenney Audio**, **jsfxr** (generador en el navegador), **freesound.org** | CC0 / CC-BY | Las campanitas de farol se sintetizan para poder afinarlas a la escala pentatónica |

**Arte original (identidad del juego, se hace a mano)**

- Los **brotes** con caritas y sus animaciones (dormido, feliz, sorprendido, insignia sol/luna).
- El **farol** y su parpadeo.
- La **flor plegada** (3, 5, 7 pétalos y "flor dentro de flor") y su animación de cierre y apertura.
- Los retratos de **Abuelo Sauce, Bruto y los Robles** para los diálogos.
- Todo lo demás se compone a partir de packs. Si un elemento de pack desentona, se recolorea o se edita, no se redibuja.

**Herramientas**

| Tarea | Herramienta | Por qué |
|---|---|---|
| Pixel art y animación | **Aseprite** (≈20 USD) o **LibreSprite** (gratis) | Onion skin, paletas indexadas, exportación de spritesheets con JSON que Phaser lee directamente |
| Diseño de niveles | **Tiled** (gratis) | Dibujar el jardín visualmente y exportar JSON; el grafo se define en capas de objetos |
| Edición de audio y voz | **Audacity** (gratis) | Reducción de ruido, pitch shift y reverb para los tres registros de voz |
| Grabación de voz | Micrófono USB de condensador de gama básica, en habitación con tela (armario, cortinas) | La calidad de la voz pesa en la evaluación; un micro de portátil se nota |
| Video del Paseo guiado | **OBS** (grabación) + **Kdenlive** o **DaVinci Resolve** (edición, gratis) | Captura del juego a resolución entera y montaje con la voz |
| Juice en el motor | Tweens, partículas, cámara y post-procesado de **Phaser** | Squash & stretch, sacudida sutil de cámara, halos y viñeta de noche sin escribir shaders propios |
| Fórmulas del Códex | **KaTeX** | Render rápido y tipografía matemática correcta |

**Reglas de uso de recursos**

1. Antes de usar un pack se lee su licencia y se anota en `CREDITS.md`.
2. Nada generado por IA entra en el arte, la música ni la voz. Es una decisión de identidad y de honestidad ante el profesor.
3. Los recursos ajenos se recolorean a la paleta del juego para que todo parezca de la misma mano.

## 5. Sistemas transversales

### 5.1 Acciones del jardinero (se desbloquean por capítulo)

| Acción | Cómo se usa | Desbloqueo |
|---|---|---|
| **Juntar** | Tocas dos brotes conectados sin farol; aparece un farol entre ellos. | 0.1 |
| **Separar / deshacer** | Tocas un farol; se apaga. Deshacer y rehacer ilimitados. | 0.1 |
| **Pasar el farol** | Un brote solitario toca a un vecino con farol: el vecino se lo da y su antigua pareja queda solitaria. Se puede encadenar a mano. | 1.1 (emerge de las reglas) |
| **Cadena** | Arrastras desde un brote solitario a lo largo de enredaderas; el juego solo permite alternar (apagada, farol, apagada…). Al soltar en un brote solitario, todos los faroles se deslizan y se enciende uno nuevo (+1). Si sueltas en un brote con farol, se aplica igual pero con ganancia 0 (el juego lo marca en gris). | 1.3 |
| **El sol (tiempo)** | Slider en la barra superior: rebobina y reproduce los movimientos propios o los del jardinero mecánico. | 0.5 |
| **Apuesta** | Antes de ciertos niveles, eliges cuántos faroles crees que se pueden encender. Acertar da semillas (cosmético). | 1.6 |
| **Inspeccionar** | En niebla, revela las enredaderas de un brote. Cuesta una gota de agua. | 3.1 |
| **Marcas sol / luna** | Colocas la marca sobre un brote; el juego solo acepta marcas coherentes con las reglas. | 3.1 |
| **Espantapájaros** | Colocas uno sobre un brote; cubre todas sus enredaderas. | 3.7 |
| **Plegar (Florecer)** | Seleccionas un ciclo impar válido (o tocas el conflicto sol–sol): se contrae en una flor. | 4.4 |
| **Desplegar** | Tocas una flor: se abre para trazar el camino por dentro. | 4.5 |
| **Girar el tallo** | Cadena de ganancia 0 hasta la base de una flor. | 4.10 |
| **Capas** | Zoom para entrar y salir de flores anidadas. | 5.2 |
| **Tarjetas de receta** | Ordenas bloques de pseudocódigo. | 6.1 |
| **Piedras** | Levantas brotes; el jardín se parte en grupos y se muestra la cuenta. | 7.2 |

### 5.2 Objetivo visible y objetivo oculto

- Capítulos 0–1: el nivel muestra "este jardín puede encender N faroles". El jugador sabe cuándo terminó.
- Desde 1.8: el objetivo se oculta en algunos niveles y el jugador declara "Terminé". El mentor pregunta "¿cómo lo sabes?". La respuesta honesta al principio es "no lo sé", y toda la teoría del juego es la respuesta a esa pregunta.
- Capítulo 7: para terminar hay que **presentar un certificado**.

### 5.3 Pistas (tres grados, siempre con voz)

Las pistas se ofrecen tras 90 segundos sin progreso o tras tres intentos fallidos. Nunca se imponen. No quitan estrellas.

1. **Empujón:** una pregunta que reorienta ("¿Quién sigue a oscuras? ¿Con quién podría hablar?").
2. **Dirección:** señala la zona o el brote clave con un brillo.
3. **Solución guiada:** el mentor ejecuta el primer paso y deja el resto.

### 5.4 Estrellas

Cada nivel da una estrella por completarlo. Estrellas extra opcionales por: sin pistas, dentro del presupuesto de agua/pasos, acertar la apuesta. Las estrellas desbloquean cosméticos del hub y las flores secretas. Nunca bloquean el avance.

### 5.5 El Cuaderno del Jardinero

Tras dominar una idea, el mentor pide "escríbelo". El jugador elige entre 3–4 enunciados. Los falsos son plausibles y **se refutan con un mini-jardín contraejemplo que el jugador puede tocar**. Al elegir el correcto, se guarda en el Cuaderno con las palabras del jardín; el Códex lo traduce después.

### 5.6 El Códex

Libro accesible desde el menú y el hub. Cada entrada tiene tres pestañas:
- **Intuición:** la explicación con las palabras del jardín y un diagrama interactivo (el mismo motor del juego, en pequeño).
- **Formal:** definiciones, enunciados y demostraciones con notación matemática (KaTeX), escritas en el nivel de un buen curso de DAA.
- **Puente:** la tabla de traducción de ese concepto y una nota histórica.

Las entradas se desbloquean con el juego, pero en modo profesor están todas abiertas. Sección 8 detalla cada entrada.

### 5.7 Modo libre (sandbox)

Diseñas tu jardín (colocas brotes y enredaderas, o generas uno aleatorio), y puedes: jugarlo, pedirle al jardinero mecánico que lo resuelva con el sol como slider, ver el bosque, las flores y el certificado final. Exporta un código de jardín para compartir.

### 5.8 Modo profesor

Todos los capítulos y el Códex abiertos, saltos directos a cualquier nivel, panel con la traza del algoritmo en notación matemática junto al jardín.

### 5.9 Paseo guiado

Video de 20–30 minutos narrado por el autor, que recorre los niveles clave y explica la teoría en cada uno. Es el entregable "video" del profesor y el tráiler didáctico del juego. Guion en sección 10.

### 5.10 Flores secretas

Puzles opcionales difíciles escondidos en el hub (uno o dos por capítulo). No enseñan nada nuevo, exigen combinar. Ejemplos en 7.9.

---

## 6. Estructura general

| Cap. | Estación / lugar | Idea central | Niveles | Duración estimada |
|---|---|---|---|---|
| 0 | Prólogo, El Huerto | Emparejar; exclusividad; el sol como tiempo | 5 | 10 min |
| 1 | Primavera, El Prado | Maximal ≠ máximo; pasar el farol; cadenas | 9 | 30 min |
| 2 | El Estanque | Lema de Berge (jugado) | 4 | 20 min |
| 3 | El Invernadero | Búsqueda sistemática; costo; König | 9 | 35 min |
| 4 | Verano, El Festival | Ciclos impares; la flor; lema de la flor | 12 | 50 min |
| 5 | Otoño, El Jardín Salvaje | Flores anidadas | 5 | 25 min |
| 6 | Invierno, El Recetario | El algoritmo completo; terminación; costo | 6 | 30 min |
| 7 | El Consejo de los Robles | Tutte–Berge; el bosque como certificado | 5 | 25 min |
| — | Epílogo, Más allá del jardín | Usos reales; sandbox | — | 10 min |

Total: unos 55 niveles y unas 4 horas de juego para un jugador nuevo. Ningún nivel debería superar los 4 minutos si no hay atasco.

Formato de cada nivel en la sección 7:

- **Jardín:** los brotes y enredaderas. Notación: `A–B` enredadera apagada, `A=B` farol ya encendido al empezar, `(libre)` brote solitario relevante.
- **Estado inicial:** qué faroles vienen encendidos "de la noche anterior".
- **Objetivo:** visible u oculto, y el valor real.
- **Enseña / Por qué aquí:** la idea y la justificación de su posición en la secuencia.
- **Guion:** líneas clave del mentor (resumen; el guion completo se escribe en producción).
- **Pistas:** 1, 2, 3.
- **Victoria:** condición exacta.
- **Desbloquea:** acción, Cuaderno o Códex.

---

## 7. Niveles

### Capítulo 0 — Prólogo: El Huerto

Tarde de verano tardío. Sin música todavía, solo grillos. Tutorial silencioso: el mentor habla poco.

#### 0.1 Dos brotes
- **Jardín:** `A–B`.
- **Objetivo:** visible, 1.
- **Enseña:** juntar. Un toque en A, otro en B, campanita, farol.
- **Guion:** Sauce: "Esos dos llevan toda la tarde mirándose. Ayúdalos."
- **Pistas:** (1) "Toca a uno y luego al otro." (2) brillan ambos. (3) el mentor junta.
- **Victoria:** 1 farol.

#### 0.2 Tres en fila
- **Jardín:** `A–B–C`.
- **Objetivo:** visible, 1.
- **Enseña:** exclusividad. Junta A–B: C se queda a oscuras con carita dormida. Prueba deshacer y juntar B–C: ahora A. **Siempre queda uno.**
- **Guion:** Sauce: "Un farol es para dos. Hoy alguien duerme sin luz. No pasa nada; mañana será otra noche."
- **Pistas:** (1) "¿Cuántos brotes hay? ¿Cuántos caben en un farol?" (2) — (3) —
- **Victoria:** 1 farol. El mentor acepta cualquiera de las dos.

#### 0.3 El cuadrado
- **Jardín:** ciclo `A–B–C–D–A`.
- **Objetivo:** visible, 2.
- **Enseña:** hay varias soluciones igual de buenas. Primer nivel donde el jugador tiene que pensar un segundo.
- **Pistas:** (1) "Si juntas a dos vecinos, ¿quién queda para los otros dos?"
- **Victoria:** 2 faroles.

#### 0.4 La estrella
- **Jardín:** `H–L1, H–L2, H–L3` (H en el centro, grande).
- **Objetivo:** primera **apuesta** (sin contar como sistema aún: el mentor pregunta "¿cuántos crees?"). Valor real: 1.
- **Enseña:** un brote muy conectado sigue valiendo un solo farol. Dos brotes quedarán a oscuras hagas lo que hagas. Primera intuición de "límite estructural", que volverá con las piedras del capítulo 7.
- **Guion:** Sauce: "Hortensia tiene muchos amigos. ¿Cuántos faroles crees que se encienden esta noche?"
- **Victoria:** 1 farol.

#### 0.5 El sol
- **Jardín:** `A–B–C–D–E`.
- **Objetivo:** visible, 2.
- **Enseña:** el slider de tiempo. Tras resolver, el mentor pide arrastrar el sol hacia atrás y ver los movimientos deshacerse y rehacerse.
- **Guion:** Sauce: "Un jardinero mira el día que pasó. Arrastra el sol."
- **Victoria:** 2 faroles y haber movido el sol al menos una vez.
- **Desbloquea:** Códex **C1 Emparejamiento** (solo la pestaña Intuición; la Formal se abre al terminar el capítulo 1). Hub: el huerto florece.

---

### Capítulo 1 — Primavera: El Prado

Música ligera. Los brotes ya tienen nombres y caritas expresivas. Aquí nace la mecánica central.

#### 1.1 La trampa
- **Jardín:** `A–B–C–D`. Dibujo con **B y C grandes y en el centro**, A y D pequeños en las esquinas. El ojo se va a B–C.
- **Objetivo:** visible, 2.
- **Enseña:** maximal ≠ máximo. Quien junta B–C obtiene 1 y no puede añadir nada. Tiene que deshacer y rehacer: A–B y C–D.
- **Por qué aquí:** es el problema entero en cuatro brotes. La solución "deshacer una pareja para hacer dos" *es* pasar el farol. El jugador lo hace sin saberlo.
- **Guion:** al lograrlo, el sol rebobina solo y Sauce: "Mira lo que hiciste. Beto le dio su farol a Ana, y Cleo tuvo que buscar a Dani. **Pasaste el farol.**"
- **Pistas:** (1) "¿Ana puede hablar con alguien?" (2) A y D brillan. (3) el mentor apaga B–C.
- **Victoria:** 2 faroles.
- **Desbloquea:** la acción **Pasar el farol** (tocar un brote solitario y luego un vecino con farol lo roba; la antigua pareja queda solitaria).

#### 1.2 Cascada
- **Jardín:** `A–B=C–D=E–F`, mismo sesgo visual. A y F libres.
- **Estado inicial:** B=C y D=E encendidos "de anoche".
- **Objetivo:** visible, 3.
- **Enseña:** la reacción en cadena de pases: A roba a B, C queda solo, C roba a D, E queda solo, E junta con F. Tres movimientos, un farol nuevo.
- **Por qué aquí:** primer nivel que empieza con faroles ya puestos. Todo el algoritmo trabaja así: mejorar una noche ya empezada.
- **Guion:** Sauce (al terminar, rebobinando): "Uno, dos, tres pases, y al final había sitio para uno más. Eso es una **cadena**."
- **Pistas:** (1) "¿Quién está a oscuras? ¿Quién tiene el farol más cercano?" (2) A brilla. (3) el mentor hace el primer pase.
- **Victoria:** 3 faroles.

#### 1.3 Brigada
- **Jardín:** cadena escondida entre distractores.
  `S–a=b–c=d–T` con S y T libres. Distractores: `b–x=y` (y sin más vecinos), `c–z` (z libre).
- **Objetivo:** visible, 3 (hay 2 al inicio).
- **Enseña:** la acción **Cadena**: arrastrar desde S por `S–a`, `a=b`, `b–c`, `c=d`, `d–T`. Al soltar, cascada automática. El distractor `c–z` es una trampa para quien cree que cualquier camino sirve: la herramienta no deja pasar de `b–c` a `c–z` porque serían dos enredaderas apagadas seguidas ("Cleo ya tiene farol: tiene que dárselo a alguien antes de pedir otro").
- **Por qué aquí:** convierte la cadena manual en herramienta. La regla de alternancia no se explica: la impone la física del jardín.
- **Guion:** Sauce: "Arrastra desde alguien a oscuras. Los faroles saben deslizarse solos."
- **Pistas:** (1) "Empieza por Sami." (2) el camino correcto se insinúa. (3) el mentor traza hasta la mitad.
- **Victoria:** 3 faroles.
- **Desbloquea:** acción **Cadena**.

#### 1.4 Callejón
- **Jardín:** A libre. Rama 1: `A–B=C–D=E`, E sin más vecinos. Rama 2: `A–F=G–H`, H libre.
- **Objetivo:** visible, 3 (hay 2).
- **Enseña:** una cadena que termina en un brote con farol y sin salida no gana nada, solo mueve la oscuridad. El jugador la prueba, el juego la aplica con **ganancia 0** en gris (A con luz, E sin ella). Debe deshacer y encontrar la rama 2.
- **Por qué aquí:** fija la condición "empieza y termina en solitario". Además establece que las cadenas de ganancia 0 son legales, lo que hará falta en 4.10 (girar el tallo).
- **Guion:** Sauce: "Eli se quedó sin luz para que Ana la tuviera. Cambiaste una tristeza por otra. Una cadena de verdad termina en alguien que estaba a oscuras."
- **Pistas:** (1) "¿La cadena terminó en alguien que ya tenía farol?" (2) H brilla. (3) —
- **Victoria:** 3 faroles.

#### 1.5 Dos solitarios
- **Jardín:** dos cadenas independientes que comparten un tramo confuso visualmente. Ejemplo: `P–a=b–Q` (P, Q libres) y `R–c=d–e=f–S` (R, S libres), con enredaderas cruzadas `b–c` y `d–Q` como distractores.
- **Objetivo:** visible, +2.
- **Enseña:** repetir. Cada cadena gana exactamente uno. Después de una cadena, el jardín cambia y hay que volver a mirar.
- **Guion:** Sauce: "Cada cadena, un farol. Ni dos ni medio. Uno."
- **Victoria:** todos con farol (perfecto).
- **Cuaderno:** "Una cadena que empieza y termina en brotes a oscuras…" (a) "…enciende exactamente un farol nuevo" ✔ (b) "…enciende tantos faroles como brotes toca" ✘ contraejemplo: cadena de 6 brotes gana 1 (c) "…solo funciona si es corta" ✘ contraejemplo: cadena de 10.

#### 1.6 Apuesta
- **Jardín:** 8 brotes, un ciclo de 6 con dos colgantes. Valor real: 4.
- **Objetivo:** **apuesta** formal antes de ver el tablero completo (se muestra 3 segundos y se pregunta), luego oculto hasta acertar.
- **Enseña:** predecir. Introduce el sistema de apuestas.
- **Victoria:** 4 faroles.

#### 1.7 El bucle par
- **Jardín:** ciclo `1–2=3–4–5=6–1`. Libres: 1 y 4.
- **Estado inicial:** 2=3, 5=6.
- **Objetivo:** visible, 3.
- **Enseña:** las cadenas pueden dar la vuelta a un bucle. Hay dos cadenas válidas (`1–2=3–4` y `1–6=5–4`). Ambas ganan.
- **Por qué aquí:** planta la semilla del contraste con el bucle impar del capítulo 4. Aquí el bucle es amable.
- **Victoria:** 3 faroles.

#### 1.8 ¿Terminé?
- **Jardín:** árbol de 9 brotes, máximo 4. Sin faroles iniciales.
- **Objetivo:** **oculto**. Aparece el botón "Terminé".
- **Enseña:** la incomodidad. El jugador llega a 4, no encuentra cadena, pulsa "Terminé". Sauce: "¿Cómo lo sabes?" Opciones: "Lo probé todo" / "No encuentro más cadenas" / "No lo sé". Cualquiera lleva al mismo sitio: "Ven al estanque".
- **Por qué aquí:** toda la teoría del juego responde a esta pregunta. Hay que dejar que el jugador se la haga solo.
- **Victoria:** 4 faroles + pulsar "Terminé".
- **Desbloquea:** Códex **C1** completo y **C2 La cadena**. Hub: el prado florece.

#### 1.9 Maestría del Prado
- **Jardín:** 14 brotes con faroles iniciales mal puestos, tres cadenas necesarias, una de ellas de longitud 7 con dos callejones.
- **Objetivo:** visible, 7. Estrella extra: sin pistas.
- **Victoria:** 7.

---

### Capítulo 2 — El Estanque (lema de Berge)

Un estanque junto al prado. El jardín se refleja en el agua. Capítulo corto y muy guiado: el jugador **juega la demostración**.

Jardín común a 2.1–2.3 (tres partes separadas en pantalla):
- Parte I (camino): `1–2–3–4–5–6`. Tuyo: `2=3, 4=5`. Reflejo: `1=2, 3=4, 5=6`.
- Parte II (bucle): `a–b–c–d–a`. Tuyo: `a=b, c=d`. Reflejo: `b=c, d=a`.
- Parte III (pareja común): `e–f`. Tuyo: `e=f`. Reflejo: `e=f`.
Tú: 5 faroles. Reflejo: 6.

#### 2.1 El reflejo
- **Enseña:** el reflejo presume de tener uno más. Se superponen: tus faroles ámbar, los del reflejo plateados, los que coinciden se desvanecen (parte III desaparece).
- **Guion:** Sauce: "El agua dice que se puede mejor. No te fíes del agua: mírala."
- **Interacción:** el jugador toca cualquier brote y ve cuántos hilos tiene. Pregunta: "¿Cuántos hilos puede tener un brote como máximo?" Respuesta esperada: 2 (uno tuyo, uno del reflejo). Consecuencia dibujada: la maraña se separa sola en hilos sueltos y bucles.
- **Victoria:** responder 2 y separar la maraña (un toque).

#### 2.2 Hilos y bucles
- **Enseña:** en cada pieza se cuenta. Bucle (parte II): 2 tuyos, 2 del reflejo, empate. Hilo (parte I): 2 tuyos, 3 del reflejo, el reflejo gana por uno. El mentor pregunta: "¿Puede un hilo ganar por dos?" El jugador intenta dibujar uno y el juego muestra que los hilos alternan, así que la diferencia es como mucho uno.
- **Victoria:** contar correctamente ambas piezas.

#### 2.3 El hilo ganador
- **Enseña:** el hilo donde el reflejo gana **empieza y termina con farol plateado**, así que sus extremos (1 y 6) están a oscuras en tu jardín: es una cadena tuya. El jugador la usa. Ahora empatas a 6. El reflejo se disuelve.
- **Guion:** Sauce: "Cuando alguien puede hacerlo mejor que tú, te ha dejado una cadena tirada en el suelo. Siempre."
- **Victoria:** usar la cadena y empatar.

#### 2.4 Reto del espejo (adversario)
- **Enseña:** ahora el jugador es el reflejo. Se le da un jardín con tu emparejamiento M (7 faroles) y debe **dibujar un emparejamiento mejor que no deje ninguna cadena para M**. Cada intento: el juego superpone, separa y señala el hilo ganador, que resulta ser una cadena. Tras tres intentos, Sauce cierra: "No se puede. Si no tienes cadena, nadie te gana."
- **Por qué aquí:** el jugador experimenta la imposibilidad, que es la dirección difícil de Berge, y ya vio el mecanismo en 2.1–2.3.
- **Cuaderno:** "Si en mi jardín no queda ninguna cadena…" (a) "…nadie puede encender más faroles que yo" ✔ (b) "…es porque lo probé todo" ✘ (c) "…puede que alguien lo haga mejor con otra disposición" ✘ contraejemplo interactivo: se le pide encontrar esa disposición y aparece la cadena. (d) "…si busco tres veces y no la encuentro, terminé" ✘ contraejemplo: cadena escondida larga.
- **Desbloquea:** Códex **C3 Lema de Berge**. Hub: el estanque.

---

### Capítulo 3 — El Invernadero (búsqueda sistemática, costo, König)

Un invernadero con niebla matinal. Viven **abejas y flores**: una abeja solo se junta con una flor. Nadie dice "bipartito". Aquí "¿queda alguna cadena?" se convierte en un procedimiento.

Mecánica: de noche solo ves las enredaderas de los brotes que **inspeccionas**. Cada inspección cuesta una gota de agua. Marcas: **sol** (llegaste "con la mano libre") y **luna** (llegaste pidiendo). Reglas que el jugador descubre y el juego impone:
- Un brote solitario desde el que empiezas es **sol**.
- Desde un sol, por una enredadera apagada, llegas a una **luna**.
- Una luna tiene farol (si no, ¡cadena!); sigues su farol y llegas a un **sol**.
- Un brote ya marcado no se vuelve a marcar.

#### 3.1 Niebla
- **Jardín:** `R–a=b–c=d–T` en niebla. R libre (abeja), T libre (flor).
- **Enseña:** inspeccionar y marcar. R sol, a luna, b sol, c luna, d sol, T luna y solitaria → cadena.
- **Guion:** Sauce: "De noche no se ve el jardín entero. Se ve lo que tu luz alcanza. Sal de alguien a oscuras y camina."
- **Pistas:** (1) "¿Dónde empieza siempre una cadena?" (2) R brilla. (3) el mentor inspecciona R y marca sol.
- **Victoria:** cadena encontrada y aplicada.
- **Desbloquea:** Inspeccionar, marcas.

#### 3.2 Ramas
- **Jardín:** desde R salen tres enredaderas a a1, a2, a3; cada ai tiene farol con bi; b2 tiene enredadera a T libre; b1 y b3 llevan a callejones.
- **Enseña:** desde un sol pueden salir varias lunas; cada luna lleva a un sol; el árbol crece. Encuentras la luna solitaria por sistema, no por suerte.
- **Victoria:** cadena.

#### 3.3 Ya visitado
- **Jardín:** un brote luna alcanzable desde dos soles distintos.
- **Enseña:** la segunda vez no se marca. Sauce: "Una luna ya tiene su camino. No necesita dos."
- **Cuaderno:** "Cuando llego a un brote que ya tiene marca…" (a) "…lo dejo como está" ✔ (b) "…le cambio la marca" ✘ (c) "…es señal de que hay cadena" ✘ contraejemplo.
- **Victoria:** completar la búsqueda con el mínimo de agua (presupuesto amable).

#### 3.4 Dos jardineros
- **Jardín:** dos brotes solitarios, R1 (abeja) y R2 (flor), cuyas búsquedas crecen a la vez; una enredadera apagada une un sol del árbol de R1 con un sol del árbol de R2.
- **Enseña:** cada solitario lanza su luz; cuando dos luces se tocan por una enredadera apagada, sol con sol de **árboles distintos**, hay cadena de raíz a raíz.
- **Por qué aquí:** establece el bosque (varias raíces) y el caso "sol–sol entre árboles distintos = cadena", que en el capítulo 4 se contrasta con "sol–sol en el mismo árbol = problema".
- **Victoria:** cadena.

#### 3.5 Agua justa
- **Jardín:** 16 brotes bipartitos en niebla.
- **Enseña:** el presupuesto de agua es exactamente el número de brotes más dos. Inspeccionar a lo loco no alcanza; seguir las reglas sí. Primera experiencia del **costo** como recurso.
- **Estrella extra:** dentro del agua.
- **Victoria:** máximo alcanzado.

#### 3.6 Sin cadena
- **Jardín:** `1–2=3–4=5` con 1 libre, más un árbol sin cadenas.
- **Enseña:** la búsqueda termina sin luna solitaria. Sauce: "No hay cadena. Por lo que aprendiste en el estanque, nadie te gana. Pero el Consejo no estuvo en el estanque. ¿Cómo se lo demuestras?"
- **Victoria:** completar la búsqueda y pulsar "Terminé".

#### 3.7 Espantapájaros
- **Jardín:** parte I: `1–2–3–4–5` (máximo 2). Parte II: estrella `H–L1, H–L2, H–L3` (máximo 1).
- **Enseña:** un espantapájaros vigila todas las enredaderas de su brote. Si k espantapájaros vigilan **todas** las enredaderas del jardín, no puede haber más de k faroles (cada farol está en una enredadera vigilada, y cada espantapájaros vigila como mucho un farol). En parte I, espantapájaros en 2 y 4; en parte II, en H. Coinciden con los faroles: **está demostrado**.
- **Por qué aquí:** primer certificado, con objeto físico, en el caso fácil. El jugador aprende qué es "una prueba corta de que no se puede más".
- **Guion:** Sauce: "El Consejo no quiere que pruebes todo. Quiere una razón que se vea."
- **Pistas:** (1) "¿Qué brote toca más enredaderas?" (2) el 2 y el 4 brillan. (3) —
- **Victoria:** cobertura completa con exactamente tantos espantapájaros como faroles.
- **Desbloquea:** Espantapájaros.

#### 3.8 El regalo de la búsqueda
- **Jardín:** `1–2=3–4=5` (1 libre), y una segunda componente con la misma estructura ramificada. Diseñado para que la búsqueda alcance a todos los brotes.
- **Enseña:** tras la búsqueda fallida, el mentor dice "pon espantapájaros en todas las lunas". Cada luna tiene exactamente un farol (con un sol), así que hay tantos espantapájaros como faroles, y vigilan todo: cada enredadera toca una luna (porque de un sol solo salen lunas y no hay sol–sol en abejas y flores). **La búsqueda que fracasó te regala la prueba.**
- **Por qué aquí:** es el ensayo general del capítulo 7. La idea "el bosque fallido es el certificado" se ve primero en el caso bipartito donde es transparente.
- **Cuaderno:** "Si k espantapájaros vigilan todas las enredaderas…" (a) "…no puede haber más de k faroles" ✔ (b) "…hay exactamente k faroles" ✘ contraejemplo: un espantapájaros de más (c) "…siempre puedo poner los espantapájaros en las lunas" ✘ (solo si la búsqueda llegó a todos; el Códex C5 lo precisa).
- **Desbloquea:** Códex **C4 La búsqueda** y **C5 Abejas, flores y espantapájaros (König)**.

#### 3.9 Maestría del Invernadero
- **Jardín:** 20 brotes bipartitos en niebla, faroles iniciales mal puestos, dos cadenas, después certificado.
- **Objetivo:** oculto. Para terminar hay que encender el máximo **y** colocar los espantapájaros.
- **Victoria:** certificado válido. Hub: el invernadero.

---

### Capítulo 4 — Verano: El Festival (ciclos impares, la flor)

Noche de festival, banderines, faroles rojos. **Ya no hay especies**: cualquier brote se junta con cualquiera. Es el capítulo más largo y el corazón del juego.

#### 4.1 El Festival empieza (la traición)
- **Jardín:** `R–a=b`, triángulo `b–c=d–b`, y `c–e` con e libre. R libre.
  Es decir: enredaderas `R–a, a=b, b–c, c=d, d–b, c–e`.
- **Objetivo:** visible, 3 (hay 2).
- **Enseña:** el jugador hace la búsqueda como aprendió: R sol, a luna, b sol, c luna (por b–c), d sol (por c=d). Desde d: `d–b` lleva a b, que ya es sol del mismo árbol; "ya marcado, lo dejo" (3.3). c es luna, así que no se exploran sus otras enredaderas. **La búsqueda declara: no hay cadena.** Pero el objetivo dice 3. El jugador busca a mano y encuentra `R–a=b–d=c–e`: da la vuelta al triángulo por el otro lado.
- **Por qué aquí:** es el momento didáctico más importante del juego. La herramienta en la que el jugador confía **miente**, y él lo comprueba con sus propias manos. No hay explicación hasta el nivel siguiente. Hay que dejar que duela.
- **Guion:** al aplicar la cadena a mano, Sauce (despacio): "Tu luz dijo que no había cadena. Y la había. ¿Qué pasó?"
- **Pistas:** (1) "El objetivo no miente. ¿Y si la luz sí?" (2) "Intenta llegar a Elo sin marcas, solo pasando faroles." (3) el mentor traza `R–a=b–d`.
- **Victoria:** 3 faroles.

#### 4.2 Sol y luna a la vez
- **Jardín:** el mismo.
- **Enseña:** el mentor pregunta dónde se equivocó la luz. El jugador señala `d–b` (sol con sol, mismo árbol). Sauce: "Rodea el bucle por el otro lado." Ahora c es sol y d es luna: **cada brote del bucle puede ser sol o luna según por dónde llegues**. La insignia partida parpadea sobre c y d. Se cuenta el bucle: 3 brotes.
- **Cuaderno:** "La luz se confunde cuando…" (a) "…encuentra un bucle con un número impar de brotes colgado de mi camino" ✔ (b) "…encuentra cualquier bucle" ✘ (se refuta en 4.3) (c) "…el jardín es muy grande" ✘.
- **Victoria:** señalar la enredadera correcta y contar el bucle.

#### 4.3 Los bucles pares no molestan
- **Jardín:** `R–a=b–c=d–e=f–c`? No: para un bucle par usar `R–a=b`, ciclo `b–c=d–e=f–b`? Ese ciclo tiene 5 brotes. Usar ciclo de 4: `b–c=d–g=b`... Diseño final: `R–a=b`, ciclo `b–c=d–e=b`: brotes b, c, d, e (4), enredaderas `b–c, c=d, d–e, e=b`. Pero `e=b` y `a=b` no pueden coexistir (b tendría dos faroles). Corregido: ciclo par `b–c=d–e–b` con `e=f` fuera del ciclo y `f–T`, T libre.
  Enredaderas: `R–a, a=b, b–c, c=d, d–e, e–b, e=f, f–T`.
- **Enseña:** búsqueda: R sol, a luna, b sol, c luna, d sol, e luna (por `d–e`; `b–e` llega a e luna desde b sol: coherente), f sol, T luna libre → cadena. Sin conflicto. El bucle b–c–d–e tiene 4 brotes. **Solo los bucles impares confunden.**
- **Por qué aquí:** refuta el distractor (b) del Cuaderno anterior con un jardín real y afina la idea.
- **Victoria:** cadena.

#### 4.4 Plegar
- **Jardín:** el de 4.1.
- **Enseña:** al tocar el conflicto `d–b`, el triángulo `b, c, d` **se pliega en una flor** con tres pétalos, marcada sol. Ahora, desde la flor, todas las enredaderas apagadas de cualquier pétalo cuentan: `c–e` se explora, e es luna y solitaria → **cadena a través de la flor**.
- **Guion:** Sauce: "Si todos pueden ser sol, trátalos como un solo sol grande. Ciérralos como una flor."
- **Victoria:** plegar y encontrar la cadena (aún sin aplicarla: eso es 4.5).
- **Desbloquea:** Plegar.

#### 4.5 Desplegar
- **Jardín:** el mismo, con la cadena `R–a=Flor–e` encontrada.
- **Enseña:** para pasar los faroles hay que abrir la flor y trazar el camino por dentro. Entras por c (desde e, enredadera apagada). Desde c hay dos lados: `c–b` (apagada) y `c=d` (farol). Como llegaste pidiendo, c tiene que dar su farol: **solo puedes salir por `c=d`**. Luego `d–b`, y b es la base: su farol va afuera (`b=a`). Camino completo: `R–a=b–d=c–e`. El jugador prueba el lado `c–b` y el juego lo rechaza: "Cleo ya tiene farol, no puede pedir otro".
- **Por qué aquí:** la alternancia decide el lado. El jugador aprende que dentro de una flor siempre hay exactamente un lado que funciona, y por qué.
- **Pistas:** (1) "Llegaste a Cleo pidiendo. ¿Qué tiene que hacer Cleo?" (2) `c=d` brilla.
- **Victoria:** cadena aplicada, 3 faroles.
- **Desbloquea:** Desplegar.

#### 4.6 Cinco pétalos
- **Jardín:** `R–a=b`, ciclo `b–c=d–f=g–b`, salida `c–e` con e libre.
  Enredaderas: `R–a, a=b, b–c, c=d, d–f, f=g, g–b, c–e`.
- **Enseña:** búsqueda: R sol, a luna, b sol, c luna, d sol, g luna, f sol; `d–f` es sol–sol mismo árbol → plegar los cinco. Desde la flor: `c–e`, e luna libre → cadena. Desplegar entrando por c: `c=d, d–f, f=g, g–b`, base b. Camino: `R–a=b–g=f–d=c–e` (7 brotes). El otro lado (`c–b`) se rechaza.
- **Por qué aquí:** el primer bucle de 5. El jugador ve que "un lado" puede ser largo, y que da la vuelta casi entera.
- **Victoria:** cadena aplicada.

#### 4.7 Flor con tallo largo
- **Jardín:** `R–a=b–c=d` (tallo de longitud 4) y triángulo `d–e=f–d`, con salida `e–T`, T libre.
- **Enseña:** la **base** es el pétalo cuyo farol sale de la flor (d, con `c=d`), y el **tallo** es el camino desde el solitario hasta la base. La cadena pasa por el tallo entero, entra por e, sale por la base.
- **Cuaderno:** "La base de una flor es…" (a) "…el pétalo cuyo farol va hacia afuera de la flor (o que está a oscuras)" ✔ (b) "…el pétalo más cercano a mí" ✘ (c) "…cualquier pétalo" ✘ contraejemplo: desplegar desde otro rompe la alternancia.
- **Victoria:** cadena aplicada.

#### 4.8 Dos flores
- **Jardín:** un árbol de búsqueda con dos ciclos impares disjuntos en ramas distintas; la cadena pasa por uno solo de ellos.
- **Enseña:** puede haber varias flores en una búsqueda; se pliegan a medida que aparecen; solo se despliegan las que la cadena atraviesa.
- **Victoria:** cadena aplicada.

#### 4.9 Flor sin cadena
- **Jardín:** `R–a=b`, triángulo `b–c=d–b`, sin salida. (5 brotes, 2 faroles, R a oscuras.)
- **Objetivo:** oculto. Valor real: 2 (ya alcanzado).
- **Enseña:** la búsqueda pliega la flor y **aun así no encuentra cadena**. Termina. Sauce: "Ahora la luz no miente. Pero, ¿por qué te fías de la flor?" El jugador pulsa "Terminé". Se abre la pregunta que responden 4.10 y 4.11.
- **Por qué aquí:** el jugador tiene que sentir la duda legítima: la búsqueda con flores dice "no hay cadena", pero antes ya mintió una vez.
- **Victoria:** pulsar "Terminé".

#### 4.10 Girar el tallo
- **Jardín:** `R–a=b`, triángulo `b–c=d–b`, más una salida `c–e` con e libre, pero el jugador **no puede usar Plegar** en este nivel (la flor está "cerrada por hoy").
- **Enseña:** una cadena de ganancia 0 (aprendida en 1.4) desde R hasta b: `R–a=b` se convierte en `R=a–b`. Mismo número de faroles, pero ahora **la base b está a oscuras**. Desde b, la cadena `b–d=c–e` es directa, sin flor.
- **Por qué aquí:** es la herramienta de la demostración difícil. Establece que se puede suponer, sin perder nada, que la base de una flor está solitaria.
- **Guion:** Sauce: "Cuando una flor te estorba, mueve la oscuridad hasta su base. No pierdes nada."
- **Cuaderno:** "Si giro el tallo hasta la base de una flor…" (a) "…tengo los mismos faroles y la base queda a oscuras" ✔ (b) "…gano un farol" ✘ (c) "…pierdo un farol" ✘.
- **Victoria:** 3 faroles sin plegar.
- **Desbloquea:** Girar el tallo (que es simplemente Cadena de ganancia 0, ahora con nombre).

#### 4.11 Reto de la flor (adversario, argumento guiado)
- **Jardín:** un jardín abierto con una flor de 5 pétalos, tallo girado (base b solitaria), varias enredaderas de salida y dos solitarios más fuera. Al lado, el mismo jardín **plegado**.
- **Enseña:** la afirmación de Sauce: "Si el jardín plegado no tiene cadena, el abierto tampoco." El jugador es el adversario: dibuja **cualquier** cadena en el jardín abierto. Cada vez, el juego:
  1. Muestra que la cadena tiene dos extremos solitarios y dentro de la flor solo la base lo es, así que **al menos un extremo está fuera**.
  2. Sigue la cadena desde ese extremo hasta **el primer pétalo que toca**. Ese tramo es alternante, empieza en solitario y llega al pétalo por una enredadera apagada (el farol de cualquier pétalo distinto de la base está dentro de la flor, y la base está a oscuras).
  3. En el jardín plegado, ese mismo tramo es una cadena desde un solitario hasta la flor, **que está solitaria**. Cadena encontrada.
  Tras dos o tres intentos, Sauce: "Da igual la que dibujes: siempre le sobra un trozo que llega a la flor. Plegar no esconde cadenas."
  Y el otro sentido ya lo vivió en 4.5–4.7: una cadena en el plegado se despliega siempre. **Plegar no crea ni destruye cadenas.**
- **Por qué aquí:** cierra la corrección del algoritmo: buscar-con-flores dice "no hay cadena" ⇒ no la hay ⇒ por Berge, es máximo. Es la parte más densa del juego y va guiada, con el jugador manipulando y comprobando, no leyendo.
- **Cuaderno:** "Plegar una flor…" (a) "…no crea ni destruye cadenas" ✔ (b) "…puede esconder una cadena" ✘ (el juego repite el reto) (c) "…solo sirve si la flor tiene 3 pétalos" ✘.
- **Victoria:** tres cadenas dibujadas y "cortadas"; elegir la opción correcta.
- **Desbloquea:** Códex **C6 Bucles impares**, **C7 La flor** y **C8 Lema de la flor**.

#### 4.12 Maestría del Festival
- **Jardín:** 18 brotes en niebla, presupuesto de agua, faroles iniciales, dos flores necesarias en distintas rondas.
- **Objetivo:** oculto. Estrella extra: dentro del agua.
- **Victoria:** máximo y "Terminé" (aún sin certificado general: eso es el capítulo 7). Hub: el festival.

---

### Capítulo 5 — Otoño: El Jardín Salvaje (flores anidadas)

Hojas cayendo, maleza. Los ciclos se enredan.

#### 5.1 Una flor dentro de otra
- **Jardín:** R libre. `R–a, a=b`, triángulo `b–c=d–b`. Además `c–g, g=h, h–R`, y salida `a–t` con t libre.
- **Enseña:** búsqueda: R sol, a luna, b sol, c luna, d sol; `d–b` sol–sol → plegar F1 = {b, c, d} (base b). Desde F1 (por c): g luna, h sol; `h–R`: R es sol del mismo árbol → **plegar F2 = {R, a, F1, g, h}**, base R. Desde F2 (por a): t luna y libre → cadena `F2–t`.
  Desplegar F2 entrando por a: `a=F1`, `F1–g` (que es `c–g`), `g=h`, `h–R` base. Ahora desplegar F1: se entra por b (base, por el farol `a=b`) y se sale por c (por `c–g`). Dentro, desde b hay que empezar con enredadera apagada y terminar con farol para poder salir por una apagada: `b–d, d=c`. El lado `b–c` directo no sirve (dos apagadas seguidas: `b–c` y `c–g`).
  Camino final: `t–a=b–d=c–g=h–R`.
- **Por qué aquí:** la flor plegada es un brote como cualquier otro y puede formar parte de otro bucle impar. Y al desplegar, la flor interior se atraviesa por un lado que depende de por dónde se entra y se sale.
- **Guion:** Sauce: "Una flor es un brote más. Y los brotes forman bucles."
- **Pistas:** (1) "¿Quién es sol dos veces?" (2) `h–R` brilla. (3) el mentor pliega F2.
- **Victoria:** cadena aplicada, 4 faroles.

#### 5.2 Capas
- **Jardín:** tres flores anidadas construidas del mismo modo.
- **Enseña:** la vista de capas: zoom para entrar en una flor, otro zoom para la interior. Al desplegar se resuelve de fuera hacia dentro.
- **Victoria:** cadena aplicada.
- **Desbloquea:** Capas.

#### 5.3 El pétalo equivocado
- **Jardín:** anidamiento donde el punto de entrada a la flor interior no es su base y el de salida tampoco; el lado correcto interior es el largo.
- **Enseña:** en una flor interior puede que entres por un pétalo y salgas por otro, y hay que ir de uno a otro alternando; sigue habiendo exactamente un lado válido.
- **Cuaderno:** "Al desplegar una flor que está dentro de otra…" (a) "…entro por un pétalo, salgo por otro y solo un lado del bucle alterna bien" ✔ (b) "…siempre salgo por la base" ✘ contraejemplo (c) "…los dos lados sirven" ✘.
- **Victoria:** cadena aplicada.

#### 5.4 Jardín salvaje
- **Jardín:** 16 brotes, dos anidamientos distintos, tres rondas de cadena.
- **Victoria:** máximo.

#### 5.5 Maestría del Jardín Salvaje
- **Jardín:** 20 brotes en niebla con presupuesto de agua.
- **Victoria:** máximo dentro del agua para la estrella.
- **Desbloquea:** Códex **C9 Flores anidadas**. Hub: el jardín salvaje.

---

### Capítulo 6 — Invierno: El Recetario (el algoritmo completo y su costo)

Nieve fuera, cabaña con chimenea. El jugador ya sabe hacerlo todo con las manos; ahora lo escribe para que otro lo haga.

#### 6.1 Tarjetas
- **Enseña:** ordenar tarjetas para formar la receta. Tarjetas correctas:
  1. Marca sol a todos los brotes a oscuras.
  2. Mientras haya soles con enredaderas apagadas sin explorar, toma una `sol–x`:
     - si x no tiene marca y está a oscuras: **cadena** (pasa los faroles, vuelve al paso 1);
     - si x no tiene marca y tiene farol: marca x luna y a su pareja sol;
     - si x es sol de otro árbol: **cadena** de raíz a raíz;
     - si x es sol del mismo árbol: **pliega la flor**;
     - si x es luna: nada.
  3. Si no queda nada que explorar: **terminaste** (y guarda las lunas para el Consejo).
  Tarjetas distractoras: "si x es luna, cámbiala a sol", "si hay bucle, pliega", "repite hasta que no queden brotes a oscuras" (falsa: puede quedar alguno para siempre).
- **Por qué aquí:** el jugador ha ejecutado esto decenas de veces. Ahora lo formaliza. Cada tarjeta corresponde a un nivel que ya jugó, y el juego lo recuerda ("esto lo hiciste en 3.4").
- **Victoria:** receta correcta.
- **Desbloquea:** Tarjetas.

#### 6.2 El autómata
- **Jardín:** un jardín del Prado.
- **Enseña:** el jardinero mecánico sigue la receta del jugador. El sol es el slider. Funciona.
- **Victoria:** ver la ejecución completa.

#### 6.3 La receta rota
- **Jardín:** el de 4.6 (cinco pétalos).
- **Enseña:** Bruto trae "una receta más corta" sin la tarjeta de plegar. El autómata la ejecuta, se detiene en 2 faroles y declara "terminé". El jugador, que ya resolvió ese jardín a mano, sabe que se puede 3. Repara la receta.
- **Por qué aquí:** el error de una receta se ve como comportamiento, no como texto. Reafirma por qué la flor es imprescindible.
- **Guion:** Bruto: "¡Menos pasos! ¡Más rápido!" Sauce: "Más rápido para equivocarse."
- **Victoria:** receta reparada y 3 faroles.

#### 6.4 La carrera I
- **Jardín:** jardines de 6, 8 y 10 brotes.
- **Enseña:** el autómata contra Bruto, que prueba todas las combinaciones. Contadores de pasos. En 6 brotes casi empatan; en 10 Bruto ya va muy por detrás.
- **Victoria:** completar las tres carreras.

#### 6.5 La carrera II
- **Jardín:** 16, 32, 64 brotes (vista alejada, brotes en miniatura).
- **Enseña:** antes de cada carrera, **apuesta**: "si el jardín se duplica, ¿cuántos pasos más dará tu receta? ¿Y Bruto?" Una gráfica se dibuja punto a punto: la del autómata sube como una curva suave, la de Bruto se sale de la pantalla y Bruto se duerme.
- **Por qué aquí:** medir antes de razonar. La intuición del costo viene de datos que el jugador vio dibujarse.
- **Victoria:** completar las carreras y las apuestas.

#### 6.6 ¿Por qué termina?
- **Enseña:** dos preguntas del Cuaderno:
  - "¿Cuántas veces como máximo puede tu receta encontrar una cadena?" (a) "Como mucho la mitad de los brotes, porque cada cadena enciende un farol y no caben más" ✔ (b) "Tantas como enredaderas" ✘ (c) "Podría no parar nunca" ✘ contraejemplo: el contador de faroles solo sube.
  - "¿Por qué termina cada búsqueda?" (a) "Cada brote se marca como mucho una vez y cada pliegue encoge el jardín" ✔ (b) "Porque se acaba el agua" ✘ (c) "Porque el mentor la para" ✘.
- **Desbloquea:** Códex **C10 La receta (algoritmo de Edmonds)** y **C11 El costo**. Hub: la cabaña.

---

### Capítulo 7 — El Consejo de los Robles (Tutte–Berge)

Crepúsculo. Robles enormes. El Consejo no acepta "la luz no encontró nada". Quiere una prueba que se vea.

#### 7.1 Los espantapájaros no bastan
- **Jardín:** ciclo de 5 brotes. Máximo: 2 faroles.
- **Enseña:** el jugador intenta certificar con espantapájaros: necesita 3 para vigilar todas las enredaderas, pero solo hay 2 faroles. El certificado del invernadero **no cierra** aquí. Sauce: "Con abejas y flores bastaba. En el Festival hace falta otra cosa."
- **Por qué aquí:** motiva el certificado general mostrando que el bipartito era un caso especial.
- **Victoria:** intentarlo y aceptar que no cierra.

#### 7.2 Piedras
- **Jardín:** el mismo ciclo de 5.
- **Enseña:** una idea nueva, sencilla: **en un grupo con un número impar de brotes, alguien duerme a oscuras seguro.** El ciclo de 5 es un grupo impar: al menos 1 a oscuras, así que como mucho 2 faroles. Tienes 2. **Demostrado.** No se levanta ninguna piedra todavía (U = ∅).
- **Guion:** Robles: "¿Por qué no tres?" Jugador (opción): "Porque son cinco, y cinco no se reparte de dos en dos."
- **Victoria:** presentar el argumento (elegir la opción y ver la cuenta).
- **Desbloquea:** Piedras.

#### 7.3 Elige tus piedras
- **Jardín:** "la hélice": un brote central C unido a un brote de cada uno de tres triángulos. 10 brotes. Máximo: 4 faroles (C con un triángulo, y un farol interno en cada triángulo; 2 a oscuras).
- **Enseña:** sin levantar nada, el jardín es un solo grupo par (10) y no prueba nada. **Levanta C como piedra:** quedan tres triángulos, tres grupos impares, así que al menos 3 brotes a oscuras entre ellos… pero la piedra puede iluminar a uno de ellos. Regla que el jugador descubre: **a oscuras ≥ grupos impares − piedras** = 3 − 1 = 2. Tienes 2 a oscuras. Demostrado.
- **Por qué aquí:** el certificado general en un jardín donde hay que elegir bien las piedras.
- **Pistas:** (1) "¿Qué brote une a todos?" (2) C brilla. (3) —
- **Cuaderno:** "Si levanto k piedras y quedan g grupos impares…" (a) "…al menos g − k brotes duermen a oscuras" ✔ (b) "…exactamente g brotes duermen a oscuras" ✘ contraejemplo (c) "…los grupos pares también dejan alguien a oscuras" ✘ contraejemplo: cuadrado.
- **Victoria:** certificado válido.

#### 7.4 El regalo de la búsqueda II
- **Jardín:** el de 4.9 (`R–a=b`, triángulo `b–c=d–b`), más otra componente parecida.
- **Enseña:** la búsqueda termina sin cadena, con lunas {a, …} y soles {R, flor, …}. Sauce: "Levanta las lunas." Al levantar a, quedan {R} (grupo de 1, impar) y {b, c, d} (grupo de 3, impar): 2 grupos impares, 1 piedra, al menos 1 a oscuras. Tienes exactamente 1. **La búsqueda que fracasó te entrega las piedras.** Y siempre pasa: de un sol solo salen lunas (si saliera a otro sol sería cadena o flor, y a un brote sin marca ya lo habrías marcado), así que al quitar las lunas cada sol o flor queda aislado, y una flor siempre es impar.
- **Por qué aquí:** cierre del círculo. El algoritmo no solo se rinde: demuestra que tenía razón. Es la misma idea de 3.8 en el caso general.
- **Victoria:** certificado válido a partir de las lunas.
- **Desbloquea:** Códex **C12 Las piedras (Tutte–Berge)**.

#### 7.5 Ante el Consejo
- **Jardín:** 22 brotes en niebla, con flores anidadas.
- **Objetivo:** oculto. Para terminar hay que presentar **los faroles y las piedras**, y la cuenta tiene que cuadrar.
- **Victoria:** certificado válido. Los Robles se inclinan. Hub: los robles florecen; amanece.

---

### Epílogo — Más allá del jardín

- Una pantalla sobria, sin puzles, que abre el Códex **C14** y el modo libre.
- **Usos reales:** intercambio cruzado de donantes de riñón (tratado con respeto y brevedad: "hay jardines donde encender un farol salva una vida"); estructuras de Kekulé en química (los dobles enlaces de una molécula forman un emparejamiento perfecto); asignación de parejas de trabajo, turnos y equipos.
- Cierre con la voz del autor.

---

### 7.9 Flores secretas (opcionales)

- **Prado:** una cadena de longitud 11 escondida entre 12 callejones.
- **Estanque:** dado M y M\*, predecir cuántos hilos ganadores hay antes de superponer.
- **Invernadero:** certificar con espantapájaros un jardín donde la búsqueda no llega a todos los brotes (obliga a añadir los no visitados de un lado; enlaza con C5).
- **Festival:** un jardín donde plegar en el orden equivocado no rompe nada (para convencerse de que el orden no importa).
- **Salvaje:** cuatro flores anidadas.
- **Invierno:** un jardín donde Bruto gana (muy pequeño) y la pregunta "¿cuándo compensa pensar?".
- **Consejo:** encontrar dos conjuntos de piedras distintos que certifican el mismo jardín.

---

## 8. El Códex (entradas)

Cada entrada: **Intuición** (palabras del jardín + diagrama interactivo), **Formal** (KaTeX), **Puente** (traducción y nota histórica). Se resume aquí el contenido de cada una; los textos completos se redactan en producción y se revisan contra un texto de referencia (Lovász–Plummer, *Matching Theory*; Korte–Vygen, *Combinatorial Optimization*; Tarjan, *Data Structures and Network Algorithms*).

- **C1 Emparejamiento.** Grafo, emparejamiento, vértice cubierto/expuesto. Maximal vs máximo, con el jardín de 1.1 como diagrama. ν(G).
- **C2 La cadena.** Camino alternante y camino aumentante. Intercambiar a lo largo de un camino aumentante da un emparejamiento de tamaño |M| + 1; a lo largo de uno alternante par, del mismo tamaño. Diagrama: la brigada de 1.2.
- **C3 Lema de Berge (1957).** Enunciado y demostración completa: M ⊕ M\* tiene grado ≤ 2 en cada vértice, luego es unión de caminos y ciclos alternantes; los ciclos aportan igual; si |M\*| > |M| algún camino tiene más aristas de M\* que de M, empieza y termina con aristas de M\*, sus extremos están expuestos en M: es aumentante para M. Diagrama: el estanque de 2.1–2.3, manipulable.
- **C4 La búsqueda.** Bosque alternante: raíces en vértices expuestos, vértices exteriores (sol, distancia par) e interiores (luna, impar). Reglas de crecimiento. Arista exterior–exterior entre árboles distintos ⇒ camino aumentante. Cada vértice se etiqueta una vez ⇒ O(m) por búsqueda en bipartitos.
- **C5 Abejas, flores y espantapájaros (König, 1931).** Grafo bipartito. Cobertura por vértices. Cota trivial ν ≤ τ. Igualdad en bipartitos: a partir del bosque final, cover = interiores ∪ (no alcanzados de un lado). Por qué no hay sol–sol en bipartitos (paridad). Diagrama: 3.8.
- **C6 Bucles impares.** Un grafo es bipartito ⇔ no tiene ciclos impares. Por qué una arista exterior–exterior en el mismo árbol cierra un ciclo impar (par + par + 1). Por qué la búsqueda ingenua falla: el vértice tendría las dos paridades. Diagrama: 4.1–4.2.
- **C7 La flor.** Definición de blossom (ciclo alternante de longitud impar 2k+1 con k aristas de M), base, tallo. Contracción G/B, M/B. Todo vértice del blossom es alcanzable desde la base por un camino alternante par (recorriendo el ciclo en el sentido adecuado), y por eso el blossom contraído se trata como exterior. Diagrama: 4.4–4.6 con desplegado paso a paso.
- **C8 Lema de la flor (Edmonds, 1965).** Enunciado: M es máximo en G ⇔ M/B es máximo en G/B. Demostración en dos partes: (i) un camino aumentante en G/B se levanta a G (si atraviesa B, se entra por un pétalo y se sale por la base recorriendo el ciclo en el sentido que alterna; siempre existe uno); (ii) suponiendo, sin pérdida de generalidad, la base expuesta (girar el tallo no cambia |M|), todo camino aumentante en G tiene un extremo fuera de B, y su prefijo hasta el primer vértice de B es un camino aumentante en G/B. Diagrama: 4.11 manipulable.
- **C9 Flores anidadas.** Contracciones sucesivas; el desplegado se hace de fuera hacia dentro; en cada flor interior el camino entra por un vértice y sale por otro y existe exactamente un recorrido alternante entre ellos por el ciclo. Diagrama: 5.1 con capas.
- **C10 La receta (algoritmo de Edmonds).** Pseudocódigo completo, correspondencia tarjeta ↔ línea. Corrección: cuando la búsqueda termina sin camino aumentante en el grafo contraído, por C8 no lo hay en G, y por C3 M es máximo. Terminación: a lo sumo n/2 aumentos; cada búsqueda etiqueta cada vértice una vez y cada contracción reduce el número de vértices.
- **C11 El costo.** Por búsqueda: O(m) etiquetados, hasta n/2 contracciones de costo O(n) cada una con la implementación sencilla ⇒ O(n²) o O(n·m) por fase según implementación; n/2 fases ⇒ O(n³) (O(n²·m) en la versión más ingenua). Comparación con la búsqueda exhaustiva: número de emparejamientos crece exponencialmente. Gráfica de 6.5 con los datos reales del jugador. Nota: Micali–Vazirani O(√n · m) existe, y por qué no se aborda.
- **C12 Las piedras (Tutte–Berge, 1958).** def(G) = |V| − 2ν(G). Para todo U ⊆ V: def(G) ≥ odd(G − U) − |U| (cada componente impar deja un vértice sin cubrir dentro o cubierto por U). Igualdad para algún U: el conjunto de vértices interiores del bosque final; las componentes de G − U son los exteriores (vértices o blossoms, impares) y los no alcanzados (perfectamente emparejados). Demuestra la optimalidad y da la fórmula ν(G) = min_U (|V| + |U| − odd(G − U)) / 2. Caso bipartito: se recupera König. Diagrama: 7.4.
- **C13 Glosario jardín ↔ matemáticas.** La tabla de 3.3 completa.
- **C14 Más allá del jardín.** Intercambio de riñones (Roth, Sönmez, Ünver; Nobel 2012 a Roth y Shapley), estructuras de Kekulé, asignaciones. Bibliografía.

---

## 9. Guion del Paseo guiado (video, 20–30 min)

1. **Apertura (1 min):** el jardín, la pregunta: "¿cuántos pueden dormir con luz?".
2. **El Huerto y la trampa (3 min):** emparejar; 1.1 en directo; nombrar la cadena.
3. **El Estanque (4 min):** jugar 2.1–2.3; enunciar Berge en palabras del jardín y luego formal.
4. **El Invernadero (3 min):** la búsqueda en niebla; el bosque; espantapájaros como certificado.
5. **La traición (4 min):** 4.1 en directo, sin cortes; el conflicto; el bucle impar.
6. **La flor (5 min):** plegar, desplegar, el lado correcto; girar el tallo; el reto de la flor. Enunciar el lema y esbozar ambas direcciones sobre el diagrama del Códex.
7. **Anidadas (2 min):** 5.1 con capas.
8. **La receta y la carrera (4 min):** tarjetas, receta rota, carrera contra Bruto, gráfica; el argumento de O(n³) y de terminación.
9. **El Consejo (3 min):** por qué los espantapájaros no bastan; las piedras; la búsqueda fallida como certificado; Tutte–Berge.
10. **Cierre (1 min):** usos reales; invitación a jugar y al modo libre.

---

## 10. Plan de playtesting

- **Hito A (greybox):** capítulos 0–2 con círculos y líneas, sin arte ni voz. Lo juegan 3–5 personas sin ayuda. Se mide: tiempo por nivel, uso de pistas, dónde pulsan "Terminé" sin razón, si describen la cadena con sus palabras al terminar el capítulo 1.
- **Hito B:** capítulos 3–4 en greybox. Métrica clave: en 4.1, ¿el jugador encuentra la cadena a mano sin pista 3? ¿En 4.2 señala la enredadera correcta? En 4.11, ¿elige la opción correcta del Cuaderno sin pistas?
- **Hito C:** capítulos 5–7. Métrica: en 7.4, ¿entiende por qué las lunas son las piedras? Se le pide explicarlo en voz alta.
- **Regla:** no se pinta ningún capítulo hasta que su greybox pasa el test. El pixel art es lo más caro de rehacer.
- **Prueba de rigor:** un compañero con buen nivel de DAA revisa el Códex contra un texto de referencia. Cada demostración se coteja línea a línea.

---

## 11. Alcance y orden de producción

1. **Núcleo:** modelo de grafo, emparejamiento, validadores (¿es cadena válida?, ¿es flor?, ¿es certificado válido?), algoritmo de Edmonds completo con traza paso a paso. Tests exhaustivos, incluido cotejo contra fuerza bruta en grafos pequeños aleatorios.
2. **Motor de niveles greybox:** cargar jardín, acciones básicas, sol/tiempo, pistas.
3. **Capítulos 0–2 greybox → playtest A.**
4. **Capítulos 3–4 greybox → playtest B.**
5. **Capítulos 5–7 greybox → playtest C.**
6. **Arte:** elegir paleta y packs (Sprout Lands, Kenney), recolorear; dibujar a mano brotes, faroles, flor y retratos; hub. Registrar licencias en `CREDITS.md`.
7. **Códex** (texto formal revisado) y Cuaderno.
8. **Voz:** guion completo, grabación, subtítulos.
9. **Música y efectos.**
10. **Modo libre, modo profesor, flores secretas.**
11. **Paseo guiado** (grabación del video).
12. **Pulido y despliegue web.**

Si hubiera que recortar, el orden de recorte es: flores secretas → modo libre → capítulo 5 reducido a 3 niveles → animaciones secundarias. **Nunca se recortan** los capítulos 2, 4.11, 6.6 ni 7.4: son la demostración.

---

## 12. Pendientes

- Confirmar con el temario oficial de DAA que el emparejamiento en grafos generales no se cubre en clase.
- Título definitivo (candidatos: *Florecer*, *Faroles*, *El Jardín de Edmonds*).
- Idioma de la interfaz (español; inglés como segundo idioma si hay tiempo). Código y commits siempre en inglés.
- Presentar este documento al profesor y ajustar el alcance según su respuesta.
