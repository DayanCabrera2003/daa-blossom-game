# Kit de playtests

Una página para preparar, dirigir y cerrar cada sesión. El detalle de cada hito está en su protocolo: [`A.md`](A.md) (capítulos 0–2), [`B.md`](B.md) (3–4) y [`C.md`](C.md) (5–7). Plan 09, fase 11 (Apéndice B.1).

## Enlaces

| Qué | Dónde |
|---|---|
| El juego publicado (se despliega desde `main`) | https://dayancabrera2003.github.io/daa-blossom-game/ |
| En local | `npm install` y `npm run dev` (la dirección que imprime Vite, por defecto `http://localhost:5173/`) |
| Un nivel cualquiera, para preparar o repasar (nunca con una persona) | `?teacher&level=4.11` al final de la dirección, p. ej. https://dayancabrera2003.github.io/daa-blossom-game/?teacher&level=4.11 |
| Una entrada del Códex en una pestaña, para repasar | `?teacher&codex=C8&tab=formal` |

El modo profesor (`?teacher`) abre todos los niveles y el Códex entero: sirve para preparar, **nunca** para una sesión con una persona.

## Antes de cada persona

- **Datos limpios.** Un perfil nuevo del navegador, o borrar las claves `florecer.save` y `florecer.playtest` (herramientas de desarrollo → Almacenamiento → Local Storage) y recargar. Sin `?teacher`.
- **Sesión que empieza a mitad** (B o C sin haber jugado la anterior en ese navegador): en una terminal del repositorio, `npm run save -- after-ch2` (para B) o `npm run save -- after-ch4` (para C); copiar la última línea que imprime, pegarla en la consola del navegador con la página del juego abierta (herramientas de desarrollo → Consola) y pulsar Intro: el juego se recarga en ese punto. El registro de la prueba (`florecer.playtest`) empieza vacío. Comprobar en el hub que está abierto 3.1 (o 5.1) y no el siguiente capítulo.
- **Sonido.** El juego ya tiene música, efectos y balbuceo: auriculares o altavoz al volumen de una conversación, el mismo para todas las personas. Los volúmenes se dejan como vienen.
- **Pantalla completa** (F11 en el navegador).
- **Exportar.** Probar en ese equipo que "Exportar registro de prueba" descarga un archivo: en el hub, el engranaje arriba a la derecha abre los ajustes; en un nivel, el engranaje de abajo a la izquierda.
- La plantilla de §7 del protocolo impresa y un reloj a mano.

## Qué observar

Lo que el registro no ve; el detalle está en §4 de cada protocolo.

| Hito | Medida clave | Dónde |
|---|---|---|
| A | ¿Describe la cadena con sus palabras al acabar el capítulo 1? ¿Pulsa "Terminé" sin razón en 1.8? | `A.md` §4 |
| B | 4.1: ¿encuentra la cadena sin la pista 3? 4.2: ¿señala `d–b`? 4.11: ¿elige bien en el Cuaderno a la primera? Y, al acabar 4.11, la pregunta en voz alta | `B.md` §4 |
| C | 7.4: ¿explica en voz alta por qué las lunas son las piedras? 6.1 / 6.3: ¿ordena y repara la receta? 7.5: ¿presenta un certificado que cuenta? | `C.md` §4 |

Siempre: dónde duda, qué dice en voz alta, qué pistas abre, cuándo vuelve al hub sin ganar. Anotar la hora junto a cada nota, para cruzarla con el registro.

## Al terminar

Engranaje → **"Exportar registro de prueba"** → se descarga `florecer-playtest-<fecha>.json`. Renombrarlo con el identificador de la persona (`P1-florecer-playtest-<fecha>.json`) y guardarlo con la plantilla rellena. Leerlo con §6 del protocolo.

## Umbrales que el autor confirma antes de la primera sesión

Todos son **propuesta** (Apéndice A, pregunta 10, pendiente): la tabla "Cuándo pasa y cuándo no" de §1 de [`A.md`](A.md), [`B.md`](B.md) y [`C.md`](C.md), y los límites de duración de cada sesión (**60** minutos en A, **75** en la segunda sesión de B, **90** en C, en "Cuándo parar" de §4). Confirmarlos o ajustarlos uno a uno, y anotar la decisión en el protocolo antes de la primera persona.
