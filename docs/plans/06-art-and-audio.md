# Plan 06 — Arte, balbuceo, música y efectos desde los packs CC0

> Alcance: sustituir el aspecto greybox por recursos reales (GDD §11 puntos 6, 8 y 9): paleta, tipografía, brotes, faroles, enredaderas, insignias, flores plegadas, niebla, piedras, espantapájaros, fondos por estación, hub que crece, UI de madera y retratos; el balbuceo de cada personaje al ritmo de una máquina de escribir; la música por estación y los efectos de sonido por evento; los ajustes de volumen. Todo sale de los packs CC0 ya descargados (Ninja Adventure y Kenney), compuesto y animado en el motor; nada se dibuja, compone ni graba a mano.
> Fuera de alcance: Códex y Cuaderno como libros (GDD §11 punto 7; aquí solo cambian de piel los paneles que ya existen); modo libre, modo profesor y flores secretas (punto 10); el video (punto 11); el epílogo.
> Referencias: `docs/GDD.md` (§3.2 personajes y voces, §4.1 pixel art, §4.2 sonido, §4.3 herramientas y recursos, §5 sistemas, §6 estructura, §7 niveles por capítulo), `docs/plans/05-chapters-5-7-greybox.md`, las reglas del proyecto.

---

## 0. Criterios globales

- **La vista nunca cambia la lógica del juego.** El arte y el sonido solo leen lo que ya existe: las imágenes puras de `game/picture/` y los efectos del controlador (`Effect`, `AnimationStep`). Ningún archivo de `game/view/` ni de `game/audio/` importa valores (solo tipos) de `game/systems/`, `@core/rules` ni `@levels/flow*`; una regla de ESLint lo hace cumplir y `tests/lint-rules.test.ts` la vigila. Los tests de `core/`, `levels/` y `game/systems/` no cambian en este plan salvo los de presentación de líneas (fase 5), y `check-levels` y `tests/playability.test.ts` siguen verdes sin tocarlos.
- **Decidir es puro; dibujar y sonar, no.** Qué pieza, qué color, qué nota o qué sílaba toca en cada momento se decide en carpetas puras (`game/picture/`, `game/systems/`, la nueva `game/assets/`) con tests; `game/view/` y `game/audio/` solo lo pintan o lo reproducen con Phaser. `game/assets/` se añade a la lista de carpetas puras de `eslint.config.js` en su propio commit.
- **Reproducible desde los zips.** Los zips viven en `assets-src/packs/` y no se versionan. Un script de `tools/` extrae exactamente los archivos elegidos (lista escrita a mano, con el sha256 de cada zip) a `public/assets/`, y esos archivos sí se versionan, para que CI y GitHub Pages no necesiten los zips. Ningún paso necesita dependencias nuevas: zip con `node:zlib`, WAV con código propio, tamaños de PNG leyendo su cabecera.
- **Todo recurso ajeno está en `CREDITS.md`**, con pack, autor, licencia, URL y qué se usa; un test lo comprueba contra el manifiesto.
- **Legible antes que bonito.** El farol se distingue a un metro (GDD §4.1); sol y luna difieren en forma además de color; los fondos son de bajo contraste y nunca ponen adornos bajo un brote o una enredadera. Cada fase deja el juego jugable de punta a punta.
- **Nada de assets por línea de diálogo.** Con el balbuceo (GDD §4.2) no hay un archivo de voz por id de línea: la voz es un conjunto de sílabas por personaje. Lo que las reglas del proyecto dicen de `public/assets/audio/voice/<id>.ogg` queda obsoleto (pregunta abierta para el autor).

Definición de "hecho" de cada fase: la del Plan 03, más `npm run assets:check` en local cuando la fase cambia la selección.

---

## 1. Inventario de los packs y elecciones

Los siete zips de `assets-src/packs/` son CC0 (leído en su `LICENSE.txt` / `License.txt`):

| Zip | Pack | Autor | Qué tiene de útil |
|---|---|---|---|
| `ninja-adventure.zip` | Ninja Adventure Asset Pack | Pixel-boy y AAA | Tilesets 16 × 16 (`Backgrounds/Tilesets/*`), 91 facesets 38 × 38, monstruos y animales, FX, UI (`Ui/Theme/Theme Wood`, `Ui/Dialog`, iconos), `Palette.png` (53 colores), 41 músicas OGG, jingles y sonidos WAV (incl. `Sounds/Voice/Voice1–10.wav`) |
| `kenney_tiny-town.zip` | Tiny Town 1.1 | Kenney | `Tilemap/tilemap_packed.png` (12 × 11 tiles): colmena, setas, árboles de otoño, cartel |
| `kenney_ui-pack-pixel-adventure.zip` | UI Pack – Pixel Adventure 2.0 | Kenney | Botones y paneles de madera, cintas (`Tilesheets/Small tiles/Thick outline/tilemap_packed.png`, 23 × 7) |
| `kenney_interface-sounds.zip` | Interface Sounds 1.0 | Kenney | 100 OGG cortos: click, select, open/close, pluck, glass, bong, drop, question, back |
| `kenney_rpg-audio.zip` | RPG Audio | Kenney | Libro (abrir, pasar página, cerrar), tela, cuero |
| `kenney_music-jingles.zip` | Music Jingles | Kenney | 85 jingles (Pizzicato, Steel, Sax, 8-bit, Hit) |
| `kenney_kenney-fonts.zip` | Kenney Fonts | Kenney | 12 TTF (ver **Tipografía**: no sirven tal cual) |

Las coordenadas de tiles son (columna, fila) en celdas de 16 × 16 dentro de la hoja. Todo lo que dice "recolorear" es reasignar colores a la paleta en el motor, nunca redibujar.

### 1.1 Paleta

Base: los **53 colores de `Palette.png`** de Ninja Adventure (`game/picture/ninjaPalette.ts` los lista; el extractor comprueba que coinciden con la imagen). `PALETTE` de `game/view/palette.ts` pasa a tomar solo colores de esa lista:

| Token | Color | Token | Color |
|---|---|---|---|
| `background` | `141b1b` | `lit` / `chainGain` | `ef914f` (ámbar) |
| `fog` / `fogClear` | `3b3643` / `543c52` | `litGlow` | `ffe18d` |
| `dark` (brote a oscuras) | `4a5270` (azulado) | `sun` / `moon` | `f1c471` / `79b8ce` |
| `darkVine` | `5f7160` | `flower` / `oddGroup` | `d3a2c0` / `a5608b` |
| `label` | `f2eaf1` | `stone` / `scarecrow` | `8d977f` / `c8966b` |
| `highlight` / `selected` | `fce2ca` / `ffffff` | `chainNone` / `chainWrong` | `abc2bc` / `e0394c` |
| `mirror` / `water` | `b8dce5` / `2d697b` | `panel` / `panelEdge` | `965340` / `543c52` |
| `button` / `buttonActive` / `buttonOff` | `bd7959` / `d3865f` / `695953` | | |

Tinte por estación sobre el fondo (nunca sobre el jardín): Huerto `ffcba9` (atardecer), Prado sin tinte, Estanque `b8dce5`, Invernadero `8feff1` (cristal turquesa) con niebla `d3a2c0`, Festival `ffbc75` (noche cálida), Jardín Salvaje `f2ad7d` (ocres), Recetario `b8dce5` (frío) con la vela de la cabaña en `ffe18d`, Consejo `a5608b` (crepúsculo violeta). Kenney se recolorea a la paleta al cargar (color más cercano).

### 1.2 Tipografía (problema de cobertura)

Se comprobó la tabla `cmap` de cada TTF y se renderizó una muestra en español:

| Fuente | Resultado |
|---|---|
| Ninja `Ui/Font/NormalFont.ttf` | Le faltan `ñ Í ¿ ¡ « » …` y `–`. **No sirve** |
| Ninja `Ui/Font/font8x8.png` | Hoja de 8 × 8 con acentos de otros idiomas pero sin `ñ`; no es TTF. **No sirve** |
| Kenney Pixel, Mini, Mini Square, High… (CC0) | Tienen los códigos, pero **las minúsculas acentuadas se dibujan como mayúsculas** (`á`→`Á`, `ñ`→`Ñ`, `ó`→`Ó`) y la tilde es una barra plana. Ninguna tiene `★ – − ≈ ● ⟨ ⟩ ∅ →`. **No sirven** para texto corrido |
| m5x7 / m6x11 (Daniel Linssen, citadas en GDD §4.3) | **No están en los packs descargados** y su licencia es "gratis con crédito", no CC0 |

Propuesta (pregunta abierta): **monogram** (datagoblin, CC0) para todo el texto, o m5x7 (cuerpo) y m6x11 (títulos) si el autor acepta una licencia libre no CC0 como dice la tabla del GDD. Sea cual sea, el zip se añade a `assets-src/packs/` y a la selección, y la fase 1 no se cierra hasta que el test de cobertura pase. Los símbolos que la fuente no tenga no se escriben: `★` y `●` pasan a iconos dibujados, y `− ≈ –` del texto se sustituyen por equivalentes cubiertos (`-`, "unas", `-`) en `content/es/`.

### 1.3 Personajes y retratos

| Personaje | Retrato | Notas |
|---|---|---|
| Abuelo Sauce | `Actor/Character/OldMan3/Faceset.png` (barba blanca larga, sombrero ancho) | La barba cae como ramas de sauce; si el sombrero desentona, se recolorea a verde sauce (`74a334`/`56864c`). Alternativa: `Master` |
| Bruto (gnomo) | `Actor/Character/OldMan2/Faceset.png` (gorro rojo, bigote blanco, nariz grande) | Es el único con efecto cómico: el retrato da un saltito al hablar (tween) |
| Consejo de los Robles | Compuesto: el árbol redondo de `TilesetNature` (6–7, 8–9) dentro de `Ui/Dialog/FacesetBox.png`, con ojos, cejas de musgo y boca dibujados por código | En el fondo del capítulo 7, tres robles grandes de `TilesetNature` (4–7, 2–4) con la misma cara |
| El jardinero (respuestas) y el Cuaderno | Sin retrato | El jugador no habla en voz; el Cuaderno suena a página |

Marco: `Ui/Dialog/FacesetBox.png` (48 × 48) a la izquierda de la caja de diálogo.

### 1.4 Piezas del jardín (compuestas, nunca dibujadas a mano)

| Pieza | Composición |
|---|---|
| Brote | Cuerpo redondo de 14 px dibujado por código (`dark` o `lit`, contorno de 1 px `141b1b`, como el estilo de Ninja) + el brote de dos hojas de `TilesetFloorDetail` (6, 2) encima + carita por código: ojos cerrados y boca triste a oscuras, ojos abiertos y sonrisa con farol, parpadeo ocasional |
| Abeja / flor (capítulo 3) | Abeja: cuerpo redondo con dos franjas y alas de 2 px por código. Flor: cuerpo en rombo con los pétalos del primer frame de `Backgrounds/Animated/Flower/SpriteSheet16x16.png`. La forma sigue distinguiendo la especie en escala de grises |
| Farol | Frame trasero (sin ojo, col. 1, fila 0) de `Actor/Monster/LanternRed/SpriteSheet.png` recoloreado a ámbar, en el punto medio de la enredadera encendida; halo de 2 tonos (`lit`, `litGlow`) y parpadeo de 3 frames por código |
| Enredadera | Por código: punteada de 1 px apagada, continua ámbar con brillo encendida (como hoy, con la paleta nueva) |
| Insignias sol / luna | 8 × 8 por código (disco con rayos, cuarto creciente; la partida de 4.2 igual) con contorno de 1 px. En el HUD, los iconos `Ui/Skill Icon/Meteo/Sun.png` y `Moon.png` (24 × 24) para la herramienta de marcas y el asa del sol |
| Flor plegada | 32 × 32 por código: tantos pétalos como brotes tiene el ciclo (3, 5, 7…), en `flower`; anidada, una flor más pequeña en el centro; plegado y desplegado en 8 frames calculados |
| Niebla | `FX/Environment/Fog.png` (320 × 180) en mosaico, moviéndose despacio, con claros de borde tramado (Bayer 4 × 4) alrededor de cada brote inspeccionado |
| Piedra | La roca gris pequeña de `TilesetNature` (18, 9) sobre el brote levantado; polvo de `FX/Smoke/Smoke/SpriteSheet.png`; contorno de cada grupo por código en `oddGroup` |
| Espantapájaros | El poste de `TilesetElement` (6, 4) con sombrero de paja y brazos por código |
| Destello y confeti | `FX/Particle/Spark.png` al encender el farol nuevo de una cadena; pétalos de `FX/Particle/LeafPink.png` |
| Estanque | Reflejo del jardín volteado y tintado `mirror`, con `Backgrounds/Animated/Water Ripples/SpriteSheet16x16.png`; faroles del reflejo azul plateado |

### 1.5 Fondos por capítulo y hub

El lienzo de 480 × 270 son 30 × 17 tiles: un relleno de suelo y adornos solo donde no hay brotes ni enredaderas (los brotes viven en y 28–226).

| Capítulo | Suelo | Adornos y partículas |
|---|---|---|
| 0 Huerto | Hierba clara de `TilesetFloor` (0–4, 12) con parcelas de tierra (`TilesetFloor` 0–10, 7–11) | Girasoles (`TilesetNature` 0–1, 11), valla (`TilesetHouse` 8–14, 4–6) |
| 1 Prado | Hierba clara (`TilesetFloor` 0–4, 12) | Cerezos (`TilesetNature` 14–15, 0–1), margaritas y flor roja (`TilesetNature` 3 y 6, 11), flor animada |
| 2 Estanque | Hierba con orilla (`TilesetWater` 0–10, 6–10) | Nenúfar (`TilesetWater` 11, 3), ondas animadas |
| 3 Invernadero | Baldosa salvia de `Interior/TilesetInteriorFloor.png` (11–21, 6–9) tintada a cristal | Colmena (Tiny Town 9, 7), arbustos de bayas (`TilesetNature` 4–6, 14–17), la niebla |
| 4 Festival | Hierba oscura (`TilesetFloor` 11–15, 12) | Banderines (`TilesetHouse` 22–28, 20–21) y banderas animadas (`Backgrounds/Animated/Flag/*`), faroles rojos de papel (el mismo frame del farol, sin recolorear) |
| 5 Jardín Salvaje | Tierra parda (`TilesetFloor` 11–15, 19) | Árbol de otoño (`TilesetNature` 9–11, 18–20), árboles secos (`TilesetNature` 0–3, 5–7), setas (Tiny Town 4–5, 2), hojas cayendo (`FX/Particle/Leaf.png`) |
| 6 Recetario | Nieve (`TilesetFloor` 0–4, 19) | Pinos nevados (`TilesetNature` 8–11, 5–7), la cabaña (`TilesetHouse` 25–28, 10–13) con luz de vela por código, copos (`FX/Particle/Snow.png`) |
| 7 Consejo | Hierba oscura con tinte violeta | Tres robles enormes (`TilesetNature` 4–7, 2–4) con cara |

**Hub que crece:** suelo del Huerto; cada capítulo terminado planta su pieza: 0 parcelas y girasoles, 1 un cerezo y flores, 2 el estanque, 3 un invernadero (casa de `TilesetHouse` 8–11, 0–2 recoloreada a turquesa y medio transparente), 4 los banderines, 5 el árbol de otoño, 6 la cabaña nevada, 7 los robles. Los botones de nivel pasan a carteles (Tiny Town 11, 6).

**Ciclo día/noche:** el sol del HUD tiñe el fondo de amanecer (`ffcba9`) a día (sin tinte), atardecer (`f2ad7d`) y noche (`4a5270`, multiplicado); el presente del día es la noche, así que se juega de noche y los faroles resaltan. El jardín nunca se tiñe.

### 1.6 UI

Paneles en 9-slice con `Ui/Theme/Theme Wood/nine_path_panel.png` (preguntas, Cuaderno, tarjetas, victoria, aviso) y `Ui/Dialog/DialogBox.png` para la caja de diálogo; botones con `Theme Wood/button_normal|hover|pressed|disabled.png`; deslizadores de los ajustes con `h_slidder_grabber*.png` y `slider_progress*.png`; casillas con `checked`/`unchecked`. Iconos: agua `Items/Resource/Water.png`, piedras `Items/Resource/Rock.png`, Cuaderno `Items/Object/Book.png`, semillas `Items/Food/Seed1.png`, carreras `Items/Object/Hourglass.png`; botones redondos de Kenney UI (0–2, 1) donde Ninja no tiene pieza. Las estrellas del hub y de la victoria son iconos dibujados por código, no el carácter `★`.

### 1.7 Música (provisional hasta escucharla)

Pistas de `Audio/Musics/`, elegidas por carácter y nombre; el autor las escucha y confirma en la fase 9. Duran de 19 a 154 s (casi todas 45–100 s), no los 2–3 min del GDD: se reproducen en bucle.

| Pantalla | Pista | Duración | Tamaño |
|---|---|---|---|
| Hub | `4 - Village.ogg` | 52 s | 1,0 MB |
| 0 Huerto | `5 - Peaceful.ogg` | 59 s | 1,1 MB |
| 1 Prado | `31 - Sunny.ogg` | 70 s | 1,6 MB |
| 2 Estanque | `39 - Boat.ogg` | 96 s | 2,2 MB |
| 3 Invernadero | `22 - Dream.ogg` | 96 s | 2,2 MB |
| 4 Festival | `20 - Good Time.ogg` | 64 s | 1,5 MB |
| 5 Jardín Salvaje | `11 - Clearing.ogg` | 69 s | 1,3 MB |
| 6 Recetario | `27 - Chill.ogg` | 48 s | 1,1 MB |
| 6 carreras (variante rápida) | `23 - Road.ogg` | 44 s | 1,0 MB |
| 7 Consejo | `12 - Temple.ogg` | 53 s | 1,0 MB |
| Créditos (futuro) | `15 - Credit Theme.ogg` | 68 s | 1,3 MB |

Total ≈ 16,3 MB: la música **nunca va en la carga inicial**; cada pista se carga al entrar en su capítulo. Jingles: victoria de nivel `jingles_PIZZI01.ogg` (Kenney, cuerdas en pizzicato, "de madera"), desbloqueo de herramienta o capítulo `Jingles/LevelUp1.wav` (Ninja), apuesta acertada `Sounds/Bonus/Coin.wav` (Ninja).

### 1.8 Efectos de sonido

| Evento | Sonido |
|---|---|
| Juntar / pasar el farol (`light`, `hop`) | Campanita sintetizada, escala pentatónica mayor desde Do5: el salto i de una cadena toca la nota i, así que una cadena de k saltos toca k notas ascendentes (15 notas, Do5–La7) |
| Farol nuevo al final de una cadena | Destello sintetizado (arpegio de las tres notas más altas) |
| Apagar (`putOut`) | Kenney `drop_002.ogg`, bajo |
| Marca sol / luna | Kenney `pluck_002.ogg` / `pluck_001.ogg` (la luna, más grave) |
| Conflicto sol y luna | Kenney `question_001.ogg` (curiosidad, no error) |
| Plegar / desplegar | Acorde sintetizado (tríada pentatónica) / el mismo acorde arpegiado hacia abajo |
| Inspeccionar en niebla | Soplo Ninja `Whoosh & Slash/Whoosh2.wav` + gota `Elemental/WaterDrop.wav` (cuesta agua) |
| Cadena encontrada en la búsqueda | Kenney `glass_004.ogg` |
| Búsqueda borrada | Kenney `minimize_001.ogg` |
| Piedra | Kenney `bong_001.ogg` (golpe sordo, ~230 Hz) |
| Espantapájaros | Kenney RPG `cloth2.ogg` |
| Rechazo amable | Kenney `back_002.ogg`; nunca los `error_00x` (zumbido) |
| Botón / avanzar diálogo | Kenney `click_001.ogg` / `select_001.ogg` |
| Abrir / cerrar panel | Kenney `open_002.ogg` / `close_002.ogg` |
| Cuaderno | Kenney RPG `bookOpen.ogg`, `bookFlip1–3.ogg`, `bookClose.ogg` |
| Tarjeta de mecánica | Kenney `maximize_002.ogg` |
| Bruto se duerme | Kenney `minimize_005.ogg` (descendente) |

Las campanitas, el destello y el acorde se **sintetizan por parámetros** con un script de `tools/` (síntesis aditiva tipo campana, al estilo de jsfxr): parámetros versionados, salida WAV mono determinista, sin grabar nada.

### 1.9 Balbuceo por personaje

Fuente: las sílabas `Audio/Sounds/Voice/Voice1–10.wav` de Ninja Adventure (0,11–0,36 s; fundamental medida entre ~280 y ~920 Hz, timbre agudo). Se bajan de tono en el motor (velocidad de reproducción) para los registros masculinos del GDD §3.2.

| Hablante | Sílabas | Velocidad (tono) | Ritmo del texto | Una sílaba cada | Pausas (`,` / `. ? ! …`) |
|---|---|---|---|---|---|
| Sauce | `Voice6`, `Voice10`, `Voice3` (las más graves) | 0,60–0,68 | 24 letras/s | 3 letras | 120 / 300 ms |
| Bruto | `Voice1`, `Voice2`, `Voice4` (agudas, cortas) | 1,15–1,35 | 40 letras/s | 3 letras | 60 / 120 ms |
| Robles | `Voice7` (la más grave), `Voice6` | tres voces a la vez: 0,42, 0,47 y 0,53, con 0, 35 y 70 ms de retraso | 16 letras/s | 4 letras | 250 / 500 ms |

Reglas: solo suenan las letras (no espacios ni signos); una sílaba a la vez por hablante (la nueva corta la anterior con 15 ms de fundido); qué sílaba y qué pequeña variación de tono tocan sale de una semilla del id de la línea, así que la misma línea suena siempre igual; tocar la caja completa la línea y calla el balbuceo. Las pistas también balbucean. El jardinero y el Cuaderno no balbucean.

---

## Fase 0 — Extracción reproducible, manifiesto y créditos

| Archivo | Responsabilidad |
|---|---|
| `.gitignore` | Ignora `assets-src/packs/` (el zip de Ninja pesa 94 MB); se quita la línea obsoleta de tomas de voz |
| `tools/assets/zip.ts` | Lee el directorio central de un zip y devuelve una entrada (guardada o deflate con `node:zlib`) |
| `tools/assets/wav.ts` | WAV PCM 16 bits: lee, mezcla a mono y baja de 44,1 a 22,05 kHz; escribe la cabecera |
| `tools/assets/pngSize.ts` | Ancho y alto de un PNG desde su cabecera IHDR |
| `tools/assets/selection.ts` | Escrita a mano: cada pack (zip, sha256, autor, licencia, URL) y cada archivo elegido (entrada del zip, ruta en `public/assets/`, clave, tipo, grupo de carga, conversión) |
| `tools/assets/extract.ts` | Pura salvo E/S inyectada: de la selección y los zips, los archivos de salida y el manifiesto |
| `tools/extract-assets.ts` | CLI: `npm run assets` escribe `public/assets/**` y `src/game/assets/manifest.json`; `npm run assets:check` comprueba sin escribir que lo versionado coincide con lo que dan los zips (solo en local) |
| `src/game/assets/manifest.json` | Generado: clave → ruta, tipo (`image`, `sheet`, `font`, `music`, `sfx`, `voice`, `jingle`), grupo (`boot` o un capítulo), pack, bytes, tamaño de imagen |
| `src/game/assets/keys.ts` | Tipos de las claves del manifiesto, para que el código no use cadenas sueltas |
| `src/game/assets/frames.ts` | Escrita a mano: frames con nombre (hoja, columna, fila, ancho y alto en tiles) de las tablas de la sección 1 |
| `eslint.config.js`, `tests/lint-rules.test.ts` | `game/assets/` es carpeta pura; `game/view/` y `game/audio/` solo importan tipos de `game/systems/`, `@core/rules` y `@levels/flow*` |
| `CREDITS.md` | Un apartado por pack (Ninja Adventure: Pixel-boy y AAA; Kenney: cada pack con su versión), licencia CC0, URL y lo que se usa; las campanitas sintetizadas, como trabajo propio |
| `README.md` | Cómo regenerar los recursos (`npm run assets`) |

**Tests clave:**
- Un zip construido en el test (`deflateRawSync`) devuelve sus entradas byte a byte; una entrada que no existe es un error con su nombre.
- Un WAV estéreo de 44,1 kHz sale mono, a 22,05 kHz, con la mitad de muestras y cabecera válida.
- `tests/assets.test.ts`: cada entrada del manifiesto existe en `public/assets/` con sus bytes; ningún archivo de `public/assets/` falta en el manifiesto; cada frame de `frames.ts` cae dentro de su hoja (tamaño leído del PNG); cada pack del manifiesto aparece en `CREDITS.md` con autor y licencia; ninguna ruta de salida se repite en la selección.

---

## Fase 1 — Paleta y tipografía

| Archivo | Responsabilidad |
|---|---|
| `game/picture/ninjaPalette.ts` | Los 53 colores de `Palette.png` |
| `game/picture/contrast.ts` | Luminancia relativa y contraste entre dos colores |
| `game/view/palette.ts` | `PALETTE` con los colores de la sección 1.1 |
| `tools/assets/fontGlyphs.ts` | Lee la tabla `cmap` de un TTF; el extractor escribe `src/game/assets/glyphs.json` con los caracteres de la fuente elegida |
| `index.html`, `main.ts` | `@font-face` de la fuente en `public/assets/fonts/`; el juego arranca cuando `document.fonts.load` la tiene |
| `game/view/textStyle.ts` | La familia de la fuente y su tamaño nativo (se mide en la fase; 8 lógicos como mínimo, el doble para texto largo) |
| `content/es/*.json` | Los símbolos sin glifo se sustituyen (sección 1.2) |
| `scenes/HubScene.ts`, `view/VictoryPanel.ts` | Estrellas como iconos dibujados |

**Tests clave:** todo color de `PALETTE` está en `ninjaPalette`; `lit` frente a `dark` y ambos frente a `background` superan un contraste mínimo fijado en el test (el farol se lee en gris); `tests/fontCoverage.test.ts`: cada carácter de `content/es/*.json`, de los textos de las tarjetas y de los literales que dibuja el juego está en `glyphs.json`.

---

## Fase 2 — Carga

| Archivo | Responsabilidad |
|---|---|
| `game/assets/loadPlan.ts` | Pura: qué claves carga cada escena: el grupo `boot` (imágenes, efectos, sílabas, jingles, la música del hub) y, al entrar en un nivel, la música de su capítulo si falta |
| `game/picture/nearestColour.ts` | Pura: el color de la paleta más cercano a uno dado |
| `game/scenes/PreloadScene.ts` | Carga el grupo `boot` con una barra de progreso; recolorea las hojas de Kenney a la paleta en una textura de lienzo |
| `game/scenes/BootScene.ts`, `config.ts` | Boot → Preload → hub o nivel |
| `game/scenes/LevelScene.ts` | `preload` con la música de su capítulo |

**Tests clave:** cada clave del manifiesto pertenece a un solo grupo; el grupo `boot` no lleva música de capítulo; cada capítulo tiene su pista en el manifiesto; `nearestColour` devuelve el propio color si ya está en la paleta.

---

## Fase 3 — Piezas del jardín

| Archivo | Responsabilidad |
|---|---|
| `game/picture/sproutLook.ts` | Pura: de un `SproutPicture`, la cara (dormido / feliz), la especie y si parpadea en un instante dado |
| `game/picture/lanternFlicker.ts` | Pura: los 3 frames del halo (radio y opacidad) por tiempo, desfasados por farol |
| `game/picture/petals.ts` | Pura: posiciones y ángulos de k pétalos de una flor plegada; la flor interior de una anidada, más pequeña en el centro |
| `game/picture/foldFrames.ts` | Pura: los 8 frames del plegado (los brotes del ciclo van al centro y se cierran como pétalos) y su inverso |
| `game/picture/fogDither.ts` | Pura: qué píxeles de un claro de radio r quedan abiertos con borde tramado Bayer 4 × 4 |
| `game/view/GardenView.ts` | Brotes compuestos, faroles en las enredaderas encendidas, enredaderas con la paleta |
| `game/view/MarksView.ts` | Insignias con contorno |
| `game/view/FlowerView.ts` | Flores de pétalos en vez de contornos numerados (el número de pétalos se ve como pétalos) |
| `game/view/FogView.ts`, `ObjectsView.ts`, `MirrorView.ts` | Niebla con textura y trama; piedras y espantapájaros compuestos; reflejo con ondas |
| `game/view/CardDemoView.ts`, `SideBySideView.ts`, `RaceView.ts` | Las mismas piezas en las mini demos, el lado a lado y las miniaturas |

Las piezas miden lo mismo que hoy (radio de toque `SPROUT_RADIUS`), así que `HitTest` y las disposiciones no cambian.

**Tests clave:** un brote a oscuras duerme y uno con farol sonríe; una flor de 5 brotes tiene 5 pétalos y una anidada, su flor interior; el frame 0 del plegado son las posiciones abiertas y el 7, el centro; los claros de niebla crecen con el radio sin cerrar píxeles ya abiertos y son deterministas; el parpadeo repite sus 3 frames.

---

## Fase 4 — Fondos por estación y hub que crece

| Archivo | Responsabilidad |
|---|---|
| `game/picture/seasons.ts` | Pura: capítulo → estación (suelo, adornos, partículas, tinte) según la sección 1.5 |
| `game/picture/backdrop.ts` | Pura: el mosaico de 30 × 17 tiles de un nivel y sus adornos, con semilla del id del nivel; ningún adorno a menos de 12 px de un brote o de una enredadera |
| `game/picture/dayTint.ts` | Pura: el tinte del fondo según la posición del sol (amanecer → día → atardecer → noche) |
| `game/picture/hubGarden.ts` | Pura: las piezas que plantan los capítulos terminados, sin tapar carteles ni títulos (`hubLayout.ts`) |
| `game/view/BackdropView.ts` | Pinta el fondo, sus partículas y el tinte, debajo de la niebla |
| `scenes/level/levelViews.ts`, `LevelRenderer.ts` | El fondo como primera capa; el tinte sigue al sol |
| `scenes/HubScene.ts` | El jardín del hub y los carteles |

Los fondos se componen por código desde los tiles, no con Tiled: así son deterministas, se comprueban en tests y se apartan solos de los brotes de cada nivel.

**Tests clave:** el mismo nivel da siempre el mismo fondo; en todos los niveles del catálogo ningún adorno toca un brote ni una enredadera; cada clave usada está en el manifiesto; el tinte de la noche es el del presente del día; un hub sin capítulos terminados solo tiene el Huerto y uno con el 7 terminado tiene los robles.

---

## Fase 5 — UI de madera y retratos

| Archivo | Responsabilidad |
|---|---|
| `game/systems/speaker.ts` | Pura: el hablante de un id de línea (`ch4.11.sauce.03` → `sauce`; `bruto`, `oaks`, `gardener`, `notebook`); los textos genéricos de pista y de "te dejo ir" son de Sauce |
| `game/systems/presentation.ts`, `scenes/presenter.ts`, `scenes/level/levelEffects.ts`, `CounterexampleScene.ts` | Las líneas viajan con su hablante (`{ text, speaker }`) en vez de solo texto |
| `game/picture/portrait.ts` | Pura: qué retrato lleva cada hablante (sección 1.3) o ninguno, y la cara de los Robles |
| `game/view/PortraitView.ts` | El retrato en su marco a la izquierda de la caja |
| `game/view/DialogueView.ts` | Caja 9-slice con retrato; el texto se ajusta al hueco que deja |
| `game/view/Button.ts`, `QuestionView.ts`, `NotebookView.ts`, `TutorialView.ts`, `VictoryPanel.ts`, `ToastView.ts`, `HudView.ts`, `ToolbarView.ts`, `SunSliderView.ts` | Paneles y botones de madera, iconos de la sección 1.6, el asa del sol con `Sun.png` |

**Tests clave:** el hablante de cada línea de `lines.json` es uno de los cinco; cada hablante con voz tiene retrato; la línea más larga de cada hablante cabe en la caja con retrato (presupuesto de caracteres por renglón y renglones).

---

## Fase 6 — Ajustes y bus de audio

| Archivo | Responsabilidad |
|---|---|
| `services/settings.ts` | Pura y versionada con zod (`florecer.settings`): volúmenes de música, efectos y voces (0–1, en pasos de 0,1) y silencio; por defecto 0,5 / 0,8 / 0,8; un guardado roto vuelve a los valores por defecto |
| `scenes/context.ts`, `main.ts` | Los ajustes en el contexto compartido, cargados al arrancar |
| `game/audio/AudioBus.ts` | Un canal por tipo (música, efectos, voces) con su ganancia; silencio; desbloqueo del audio tras el primer toque; nada suena con la pestaña oculta |
| `game/view/SettingsView.ts` | Panel con tres deslizadores y la casilla de silencio; se abre con un botón de engranaje en el hub y en el HUD; `M` silencia |
| `content/es/strings.json`, `content/keys.ts` | Textos del panel |

**Tests clave:** sin guardado, los valores por defecto; ida y vuelta por el almacén; los volúmenes se acotan a 0–1; con silencio la ganancia efectiva de los tres canales es 0; un guardado de otra versión o corrupto no rompe el arranque.

---

## Fase 7 — Máquina de escribir y balbuceo

| Archivo | Responsabilidad |
|---|---|
| `game/systems/typewriter.ts` | Pura: cuántos caracteres se ven a los t ms de una línea, con el ritmo y las pausas del hablante; terminar al tocar |
| `game/systems/babble.ts` | Pura: el horario de sílabas de una línea (instante, muestra, velocidad, capa) según la tabla 1.9, con semilla del id; vacío para quien no balbucea |
| `game/view/DialogueView.ts` | El texto aparece letra a letra; el primer toque completa la línea, el segundo avanza |
| `game/audio/BabblePlayer.ts` | Reproduce el horario en el canal de voces; corta al completar o cerrar la línea |

**Tests clave:** la misma línea da el mismo horario; solo hay sílabas en letras; nunca dos sílabas de un hablante a la vez; las velocidades caen en los rangos de su hablante; los Robles suenan en tres capas; el jardinero y el Cuaderno no balbucean; tras la última letra no queda ninguna sílaba.

---

## Fase 8 — Efectos de sonido

| Archivo | Responsabilidad |
|---|---|
| `tools/synth/bell.ts` | Pura: síntesis aditiva de campana (parciales, ataque, caída) → muestras de 16 bits |
| `tools/synthesize-sounds.ts` | `npm run sounds`: escribe las 15 campanitas, el destello y el acorde en `public/assets/audio/sfx/` desde parámetros versionados |
| `game/systems/chimeScale.ts` | Pura: la nota de cada salto de una cadena de k saltos |
| `game/systems/soundCues.ts` | Pura: de un plan de animación (`animation/plan.ts`) y de los efectos del controlador, la lista de sonidos con su instante de inicio (sección 1.8) |
| `game/audio/SfxPlayer.ts` | Programa los sonidos al empezar una animación y los cancela si una jugada nueva la corta; en la repetición del sol suenan más bajos y nunca al arrastrarlo |
| `game/view/Button.ts`, `NotebookView.ts`, `TutorialView.ts` | Sonidos de interfaz |

**Tests clave:** una cadena de k ≤ 15 saltos toca k notas estrictamente ascendentes y una más larga, notas que nunca bajan; cada paso de animación y cada rechazo tiene un sonido del manifiesto; los instantes coinciden con el inicio de cada paso del plan; la campana sintetizada tiene su fundamental a menos del 1 % de la nota pedida, sus bytes son los mismos en cada ejecución y su pico no satura.

---

## Fase 9 — Música

| Archivo | Responsabilidad |
|---|---|
| `game/systems/musicFor.ts` | Pura: la pista de cada pantalla (hub, capítulo, carrera del capítulo 6) y el jingle de cada momento (victoria, desbloqueo, apuesta acertada) |
| `game/audio/MusicPlayer.ts` | Bucle de la pista, fundido cruzado de 800 ms al cambiar, la música baja mientras suena un jingle |
| `scenes/HubScene.ts`, `LevelScene.ts`, `scenes/level/levelEffects.ts` | Piden su pista y sus jingles |

La lista de escucha del autor: cada pista en bucle (¿se nota el corte?), con el balbuceo encima (¿se entiende?) y en una partida de 10 minutos (¿cansa?). Si una pista no pasa, se cambia en la selección.

**Tests clave:** cada capítulo y el hub tienen una pista del manifiesto; las carreras usan su variante; una victoria da su jingle; volver al hub desde un nivel cambia de pista y entrar en otro nivel del mismo capítulo no.

---

## Fase 10 — Animaciones clave con su sonido

| Archivo | Responsabilidad |
|---|---|
| `game/animation/plan.ts` | `DURATIONS` ajustadas a las animaciones reales |
| `game/picture/squash.ts` | Pura: la escala (squash & stretch) y la altura del farol a lo largo de un salto |
| `game/view/AnimationView.ts` | El farol salta de brote en brote con su campanita; destello y confeti al final de una cadena ganadora; el plegado de 8 frames con su acorde; el conflicto parpadeando; la piedra cae y el jardín se parte en grupos |

**Tests clave:** el squash empieza y acaba en escala 1 y el farol aterriza en el brote; los tests de `plan.ts` siguen dando el mismo orden de pasos con las duraciones nuevas.

---

## Fase 11 — Presupuesto y créditos finales

| Archivo | Responsabilidad |
|---|---|
| `tests/assetBudget.test.ts` | Suma los bytes del manifiesto por tipo y por grupo y los compara con el presupuesto |
| `CREDITS.md`, `README.md` | Revisión final: todo lo usado está acreditado; nada acreditado sobra |

**Presupuesto** (medido hoy: `dist/` pesa 1,56 MB, casi todo Phaser):

| Parte | Máximo |
|---|---|
| JavaScript | 1,8 MB |
| Imágenes | 600 KB |
| Fuentes | 100 KB |
| Efectos, sílabas y jingles | 1,5 MB |
| Carga inicial (JS + grupo `boot`, con la música del hub) | 5 MB |
| Música en total (cargada por capítulo) | 20 MB |

---

## Orden y dependencias

```
F0 ─┬─ F1 ─┬─ F3 ─────────┬─ F10
    │      ├─ F4          │
    │      └─ F5 ─┐       │
    ├─ F2 ────────┼───────┤      (F3, F4 y F5 también necesitan F2)
    └─ F6 ─┬──────┴─ F7   │      (F7 necesita F5 y F6)
           ├─ F8 ─────────┘      (F10 necesita F3 y F8)
           └─ F9                 (F9 necesita F2 y F6)
F11 al final
```

F0 va primero: todas las demás leen el manifiesto. Tras F0 pueden trabajar en paralelo F1, F2 y F6; tras F1 y F2, F3, F4 y F5 a la vez (comparten `levelViews.ts` y `LevelRenderer.ts`: cambios pequeños y aditivos); F7 toca `DialogueView.ts` después de F5. Cada fase que añade archivos a `public/assets/` lo hace a través de `selection.ts` (entradas nuevas al final, sin reordenar) y vuelve a generar el manifiesto.

**Hito F1 (F0–F5, F10):** el juego con arte. **Hito F2 (F6–F9):** el juego con sonido. **Hito F3 (F11):** presupuesto y créditos. Tras la verificación del autor (mirar cada capítulo a ×3 y escuchar la lista de la fase 9): merge `develop → main` y tag `v0.6.0-art-audio`.

---

## Decisiones

- **Se versionan los recursos extraídos, no los zips.** CI y Pages no tienen los packs; `assets:check` en local asegura que lo versionado sale de los zips con el sha256 anotado.
- **Las imágenes se copian enteras, sin recortar.** Las hojas de Ninja son pequeñas (todas las elegidas suman unos 300 KB) y Phaser lee frames por rectángulo; así el extractor no necesita decodificar PNG. Recolorear Kenney se hace al cargar, en el motor.
- **Las músicas se copian tal cual** (OGG Vorbis 44,1 kHz). Volver a codificarlas a menos bits exigiría ffmpeg en el extractor; queda como pregunta abierta si el peso molesta.
- **Fondos por código en vez de Tiled:** deterministas, comprobables y apartados de los brotes de cada nivel.
- **Las campanitas se sintetizan en `tools/` y se versionan como WAV**, en vez de afinarse en tiempo real con `detune`: suenan igual en todos los navegadores y no dependen de Web Audio.

## Preguntas abiertas para el autor

- **Fuente:** ninguna de los packs sirve en español (sección 1.2). ¿monogram (CC0) o m5x7/m6x11 (gratis con crédito, como dice la tabla del GDD §4.3, aunque el criterio de la sección pide CC0)?
- **Paleta:** el GDD §4.1 habla de 32 colores; la de Ninja Adventure tiene 53. Este plan usa los 53 como base y un subconjunto por estación.
- **Duración de la música:** las pistas duran 45–100 s, no 2–3 min. ¿Basta el bucle?
- **Las reglas del proyecto** aún describen un archivo de voz por id de línea (`audio/voice/<id>.ogg`); con el balbuceo ya no aplica.

## Riesgos y cómo se mitigan

| Riesgo | Mitigación |
|---|---|
| El fondo resta legibilidad a brotes y faroles | Fondo tintado y de bajo contraste, el jardín nunca se tiñe, test de contraste y test de "ningún adorno bajo un brote" |
| Las sílabas de Ninja suenan infantiles aun bajadas de tono | Rangos de velocidad por hablante ajustables en datos; si no convencen, se sustituyen por sílabas sintetizadas con el mismo script de las campanitas |
| El balbuceo cansa | Una sílaba cada 3–4 letras, volumen propio en los ajustes, se calla al tocar |
| Safari no reproduce OGG | Los efectos sintetizados y las sílabas son WAV; si la música falla en Safari, se añade una copia AAC por pista (pregunta del peso) |
| La música dispara la carga inicial | Solo la del hub va en `boot`; las demás se cargan por capítulo; presupuesto con test |
| Los packs de Kenney desentonan con Ninja | Se usan poco (colmena, setas, carteles, botones) y se recolorean a la paleta al cargar |
| Romper la lógica al cambiar la vista | Regla de ESLint de importaciones, y los tests de `core/`, `levels/` y `systems/` no se tocan |
| Un pack cambia de versión y la extracción da otra cosa | sha256 de cada zip en `selection.ts`; `assets:check` falla si no coincide |
