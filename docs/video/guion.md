# Guion de grabación del Paseo guiado

El video de 20–30 minutos del GDD §9 (y §5.9), tramo a tramo: qué cargar, qué enseñar y cuánto dura cada uno, y cómo preparar la grabación. Plan 09, fase 11 (Apéndice B.2). Las direcciones son del juego publicado, https://dayancabrera2003.github.io/daa-blossom-game/; en local valen igual detrás de `http://localhost:5173/` (`npm run dev`).

## Preparación de la grabación

- [ ] **Navegador:** Chrome o Firefox de escritorio en un perfil solo para grabar, sin extensiones ni barras; notificaciones del sistema apagadas.
- [ ] **Pantalla y zoom:** monitor de 1920 × 1080 a densidad 1 (escalado del sistema al 100 %) y zoom del navegador al 100 % (Ctrl+0); ventana a pantalla completa (F11). El juego queda a ×4 exacto (1920 × 1080), sin bordes.
- [ ] **Captura:** OBS a 1080p y 30 o 60 fps, capturando la ventana del navegador; editar en Kdenlive o DaVinci Resolve (GDD §4.3).
- [ ] **Audio del juego** (engranaje → ajustes): música al 30 %, efectos al 80 %, voces al 80 %; movimiento "Todo". En OBS, el audio del escritorio por debajo del micrófono.
- [ ] **Micrófono** probado; el balbuceo no tapa la voz (si la tapa, bajar las voces del juego).
- [ ] **Panel del profesor:** empieza plegado; se abre con `T` solo donde el guion lo pide (tramo 8).
- [ ] **Guardados:** en una terminal del repositorio, `npm run save -- all-stars` y `npm run save -- after-ch7`; cada uno imprime al final una línea para pegar en la consola del navegador (herramientas de desarrollo → Consola) con la página del juego abierta: guarda el progreso y recarga.
- [ ] Probar una vez cada dirección de la tabla antes de grabar.

## Por tramo

Tiempos aproximados; total, unos 30 minutos.

| # | Tramo | Min. | Cargar | Qué enseñar |
|---|---|---|---|---|
| 1 | Apertura | 1 | `npm run save -- all-stars` (línea en la consola), luego https://dayancabrera2003.github.io/daa-blossom-game/ sin `?teacher` | El hub crecido: los faroles, las flores secretas ganadas, los bichos; la pregunta "¿cuántos pueden dormir con luz?" |
| 2 | El Huerto y la trampa | 3 | `?teacher&level=0.1` (y `?teacher&level=0.5` para el sol), luego `?teacher&level=1.1` y `?teacher&level=1.3` | Juntar dos brotes; 1.1 en directo (la trampa: hay que apagar un farol para encender dos); la cadena de 1.3 y su nombre |
| 3 | El Estanque | 4 | `?teacher&level=2.1`, `?teacher&level=2.2`, `?teacher&level=2.3`; luego `?teacher&codex=C3&tab=intuition` y `?teacher&codex=C3&tab=formal` | El reflejo, hilos y bucles, el hilo ganador; Berge en palabras del jardín y luego formal |
| 4 | El Invernadero | 3 | `?teacher&level=3.1`, `?teacher&level=3.2`, `?teacher&level=3.8`; luego `?teacher&codex=C4` y `?teacher&codex=C5` | La búsqueda en la niebla, el bosque (sol y luna), los espantapájaros como certificado |
| 5 | La traición | 4 | `?teacher&level=4.1`, `?teacher&level=4.2`; luego `?teacher&codex=C6` | 4.1 en directo y **sin cortes**; el conflicto de 4.2; el bucle impar |
| 6 | La flor | 5 | `?teacher&level=4.4`, `?teacher&level=4.5`, `?teacher&level=4.10`, `?teacher&level=4.11`; luego `?teacher&codex=C8&tab=formal` | Plegar, desplegar por el lado correcto, girar el tallo, el reto de la flor (los dos jardines lado a lado); el lema y sus dos direcciones sobre el diagrama |
| 7 | Anidadas | 2 | `?teacher&level=5.1`, `?teacher&level=5.2` | Capas, y desplegar de fuera hacia dentro |
| 8 | La receta y la carrera | 4 | `?teacher&level=6.1`, `?teacher&level=6.3`, `?teacher&level=6.4`, `?teacher&level=6.5`; luego `?teacher&codex=C10` y `?teacher&codex=C11` | Las tarjetas (las dos columnas de la receta), la receta rota, la carrera contra Bruto, la gráfica; el $O(n^3)$ y la terminación con el panel del profesor abierto (`T`) |
| 9 | El Consejo | 3 | `?teacher&level=7.1`, `?teacher&level=7.2`, `?teacher&level=7.4`; luego `?teacher&codex=C12` | Por qué los espantapájaros no bastan; las piedras; la búsqueda fallida como certificado; Tutte–Berge |
| 10 | Cierre | 1 | `npm run save -- after-ch7` (línea en la consola), la dirección sin `?teacher`: el epílogo desde su cartel en el hub; luego `?teacher&codex=C14` y el modo libre desde su cartel | Los usos reales (C14); la invitación a jugar y al modo libre |

Cada dirección se escribe detrás de la del juego, p. ej. https://dayancabrera2003.github.io/daa-blossom-game/?teacher&level=4.11.

## Durante

- Un tramo por archivo; quieto 2 s al empezar y al acabar cada uno, para cortar.
- Si una jugada sale mal, repetir el nivel entero (el tramo 5 va sin cortes).
- El cursor despacio; los nombres de los brotes se dicen en voz alta al tocarlos.

## Después

- Subtítulos en español.
- Comprobar en el montaje que los nombres de los brotes se leen a 1080p.
- Exportar a 1080p.
