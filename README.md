# Florecer

A cozy pixel-art puzzle game that teaches **Edmonds' Blossom algorithm** for maximum matching in general graphs — from the first pair of sprouts to the Tutte–Berge certificate.

**Play it at <https://dayancabrera2003.github.io/daa-blossom-game/>** (deployed from `main`). The game is in Spanish.

Built as a creative project for the course *Diseño y Análisis de Algoritmos* (DAA). The design lives in the [game design document](docs/GDD.md) (Spanish).

## What the game is

Every night the sprouts of a garden want a lantern, and a lantern is for two neighbours joined by a vine. The player lights as many as the garden allows and, chapter by chapter, discovers why that is the most: passing lanterns along a chain (augmenting paths), the pond's reflection (Berge's lemma), the night search with sun and moon marks (the alternating forest), the scarecrows (König's vertex cover), the odd loops that fool the light and the flower that folds them (blossoms, contraction and expansion, nested flowers), the recipe and its race against Bruto, the brute-force gardener (the whole algorithm and its cost), and the Council's stones (the Tutte–Berge formula).

- **Eight chapters**, 0 to 7, from the Huerto to the Consejo, with the epilogue *Más allá del jardín* on what matching is used for outside the garden.
- **The Códex**: fourteen entries opened by playing, each with the garden's intuition and a touchable diagram, the formal definitions, statements and proofs, and the bridge between the two.
- **The Cuaderno**: every statement the player writes down links to the entry that translates it.
- **The free mode**, the **secret gardens** and the hub's rewards (below).
- Art, music and sound from CC0 packs, plus a few sounds synthesized by the game; the characters speak in babble.

## How to play

The garden is played with the **mouse or a touch**: touch two neighbouring sprouts to give them a lantern, drag from a sprout in the dark to pass lanterns along a chain, drag the day (the sun at the top right) to watch it again, and use the tools each chapter adds (marks, scarecrows, folding a flower, stones…). The game never punishes a wrong move: it says, softly, why it does not fit, and each level has three hints.

Every panel over the garden (a question, the notebook, a card, the recipe, the dialogue box, a message) opens where it hides least of the garden, never over what it asks about, and can be **dragged by its frame** wherever the player likes; it opens there again for the rest of the session, and a double touch on its frame sends it back.

Menus, panels, questions and dialogue also work with the **keyboard** (the garden itself does not). The settings' gear shows the same table as a card (*Teclas*).

| Key | Where | What it does |
|---|---|---|
| `Tab` / `Shift+Tab` | everywhere | from one button to the next |
| `ArrowUp` / `ArrowDown` | everywhere | to the button above or below |
| `ArrowLeft` / `ArrowRight` | everywhere | to the side, or move a slider in focus (the day, a volume) |
| `Enter` / `Space` | everywhere | press the button in focus, or go on with the dialogue |
| `Escape` | everywhere | close what is open, or go back |
| `M` | hub, levels, settings | mute or unmute |
| `F` / `Shift+F` | hub | from one secret garden to the next |
| `0`–`9` | levels | choose an answer of a question |
| `Alt+ArrowUp` / `Alt+ArrowDown` / `Alt+ArrowLeft` / `Alt+ArrowRight` | levels, free mode | move the panel open (a question, a card, the dialogue box…) |
| `Ctrl+Z` | levels, free mode | undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | levels, free mode | redo |
| `1`–`5` | free mode's editor | choose a tool |
| `G` | free mode's editor | open or close the generator's drawer |
| `ArrowUp` / `ArrowDown`, `PageUp` / `PageDown` | credits | roll the credits |
| `T` | levels, teacher mode | open or close the trace panel |
| `PageUp` / `PageDown` | levels, teacher mode | the level before or after |

In the books (Códex, Cuaderno) `ArrowLeft` / `ArrowRight` and `PageUp` / `PageDown` turn to the previous or next entry, `Home` and `End` go to the first and the last, `1`, `2` and `3` choose a tab, and `Escape` closes the book.

### Accessibility

- **Motion:** the settings panel has *Movimiento*: *Como el sistema* (the default, following the system's reduced-motion setting), *Menos* or *Todo*.
- **Keyboard:** the table above; the focus ring is drawn only once the keyboard is used.
- **Screen reader:** a live region of the page says each line of dialogue whole as it starts, with who says it, each question with its options numbered as the digits that pick them, and whether an answer was the one.
- Sun and moon marks differ in shape as well as colour; text and focus meet the contrast checked by the tests.
- On a phone the game is played in landscape; in portrait it asks to turn the phone.

## Browsers

The game is built for (and promises) Chrome and Edge 111+, Firefox 114+, and Safari 16.4+ on macOS, iPhone and iPad (`tools/page/browsers.ts`, the `build.target` of `vite.config.ts`). It is played in Chromium while it is made; Firefox and Safari are checked by hand before a release. Safari before 18.4 plays the AAC copies of the Ogg sounds.

If the browser will not store (a private window, storage blocked or full), the game says so once and goes on: the progress lasts while the tab stays open. If a part that loads on demand cannot load (the books, the share sheet, the credits, the free mode), the page says whether the connection is down or a newer version was published, and offers to reload; the game itself goes on. An address that does not exist shows the game's own 404 page.

## Teacher mode

Add `?teacher` to the address to open every chapter, every secret garden and every page of the Códex, and to see every reward of the hub. In a level, `T` (or the trace button) opens a panel beside the garden with the trace in the Códex's notation: the player's day, a run of Edmonds from the lanterns the day shows, and its Tutte–Berge certificate. `PageUp` and `PageDown` jump to the level before or after.

- `?teacher&level=4.6` starts straight in a level (an unknown id is ignored).
- `?teacher&codex=C8` opens the Códex at an entry, and `?teacher&codex=C8&tab=formal` at one of its tabs (`intuition`, `formal`, `bridge`).
- `?teacher&level=1.10` opens a secret garden (`2.5`, `3.10`, `4.13`, `5.6`, `6.7`, `7.6` the others).

`?level=` and `?codex=` only work together with `?teacher`; players always start at the hub.

## Free mode

The **Modo libre** sign appears in the hub once chapter 1 is finished (always in teacher mode), and the epilogue offers it too. There you design a garden by hand (sprouts, vines and lanterns, up to 24 sprouts and 40 vines) or grow one from a generator (a row, a ring, a star, all with all, at random, bees and clovers, a long-stemmed flower, nested flowers, a helix, many flowers), and play it with the actions already won (all of them in teacher mode). Once met in the story, the **mechanical gardener** solves the garden from where you left it, with the day to replay each step, and the **certificate** places its proof: the Council's stones, and the scarecrows when the garden is one of bees and clovers. Nothing played there touches the progress; the last design is kept apart in the browser.

**Compartir** shows the garden's short code, a link that opens it, and its level file as JSON; the same sheet opens a garden from a pasted code or JSON, or from a chosen file. A link has the form `?garden=<code>` and works for every player (`?level=` wins when both are given). A code carries no positions, so an opened code is laid out again; the JSON keeps names and positions. The JSON is a valid level with id `9.1` and `"draft": true`: to make it a real level, give it its own id when copying it into `src/levels/data/`, and `npm run check-levels` will hold it to every rule.

## Secret gardens and the hub's rewards

Each chapter from the Prado to the Consejo hides one **secret garden** by the post of its sign in the hub: a closed bud once the chapter is finished, which opens with enough of the chapter's stars (completing it and about half its extra stars; touching the bud says how many are missing). They are optional, teach nothing new and never block anything. `F` / `Shift+F` move between the secret gardens shown, and `Enter` touches one.

Stars (the best of each level, secret gardens included) and seeds (one per bet won, the first time) show next to the hub's title. They are thresholds, never spent: at 15, 30, 50, 70, 90, 110 and 130 stars a butterfly, a frog, a cat, a blue butterfly, two hens, fireflies and lanterns on the posts come to the hub, and every seed plants a small plant.

## Credits

The credits screen opens from the settings panel and from the epilogue. Every pack, author, licence and file used is listed in [`CREDITS.md`](CREDITS.md): Ninja Adventure, Kenney's packs and the monogram font (all CC0), the sounds the game synthesizes itself, and the libraries (Phaser, zod, KaTeX, marked).

## Development

Requires Node.js 22.12+.

```sh
npm install
npm run dev           # start the dev server (Vite)
npm run build         # type-check and build into dist/
npm run preview       # serve the build locally
```

### Testing and checks

```sh
npm test              # run the whole test suite (Vitest + fast-check)
npm run test:watch    # the same, re-running on every change
npm run coverage      # the suite with coverage (thresholds: 95 %)
npm run test:explore  # property tests with a random seed and 2000 cases each
npm run lint          # ESLint, including the dependency rules between folders and the 1000-line cap
npm run format:check  # Prettier, without writing (npm run format writes)
npm run typecheck     # type-check without emitting
npm run check-levels  # check every level file against its schema, the rules and Edmonds
```

The algorithm lives in a pure core (`src/core/`) that knows nothing of Phaser or the browser; the game only asks it and animates what it answers. The core is tested unit by unit and with properties against a brute-force oracle on thousands of small random graphs (Edmonds' size equals the brute force's, the matching is valid, the Tutte–Berge certificate adds up). Each level is checked too: its schema, its graph, its initial matching, its declared optimum against Edmonds, and its reference solution against the rules. Other tests hold the content (every dialogue id, Códex entry and asset exists), the panels (nothing overlaps or leaves the canvas, with the real Spanish words), the keys and the budget.

Property-based tests use a fixed seed by default, so every run (and CI) is reproducible. When a property fails, fast-check prints its seed; replay it with `FC_SEED=<seed> npm test`. `FC_RUNS=<n>` sets the number of cases per property.

CI (GitHub Actions) runs lint, format check, typecheck, coverage, check-levels, the build, the tests of the built page and the budget on every push; `main` is also deployed to GitHub Pages.

### Tools

```sh
npm run solve -- 4.6  # readable trace, result and proof for a level id or a garden code
npm run bench         # steps of the recipe, the fast version and Bruto per garden size
npm run save -- after-ch4  # a synthetic save, and the line to paste in the browser's console
npm run lines         # write the review sheets of the Spanish lines (docs/review/lineas.md, lineas-plan10.md)
```

### Art, music and sound

The game's art, music and sounds come from CC0 packs (listed with their authors in [`CREDITS.md`](CREDITS.md)). The zips are not committed: download them into `assets-src/packs/` (file names and sha256 checksums are in `tools/assets/selection.ts`). The files the game uses are extracted from them and committed under `public/assets/`, so building and testing never need the zips.

```sh
npm run assets            # extract the chosen files into public/assets/ and regenerate src/game/assets/manifest.json and glyphs.json
npm run assets:check      # check, without writing, that the committed files are exactly what the zips give
npm run assets:fallbacks  # make the AAC (.m4a) copy of every Ogg sound with the system's ffmpeg
npm run sounds            # synthesize the chimes, the fold chords and the crickets alone, without the zips
npm run budget            # after a build: weigh the JavaScript and the assets against their budget
```

The chimes, the sparkle, the fold chords and the crickets of the prologue are not taken from a pack: they are synthesized from the parameters in `tools/synth/sounds.ts`, credited as original work, and listed in the same manifest. `npm run assets` makes them too, so both commands agree.

To use another file of a pack, add it to `tools/assets/selection.ts` (at the end of its group), run `npm run assets`, and credit it in `CREDITS.md`.

The weight of each part is capped (decimal units): JavaScript 1.8 MB, images 600 KB, the font 100 KB, effects, syllables and jingles 1.5 MB, the first load (JavaScript plus the `boot` group) 3.5 MB, all the music 20 MB, each track loaded with its own chapter, the books (KaTeX, marked, the Códex, the Cuaderno and the teacher's panel, loaded the first time one opens) 1 MB, and the free mode (the editor and the share sheet, loaded the first time it opens) 60 KB. `tests/assetBudget.test.ts` holds the assets to it; `npm run budget`, run by CI after the build, adds the JavaScript.

## The author's kit

- [Playtest kit](docs/playtest/kit.md): one page to prepare, run and close each session, with the protocols [A](docs/playtest/A.md) (chapters 0–2), [B](docs/playtest/B.md) (3–4) and [C](docs/playtest/C.md) (5–7).
- [Recording script of the guided walk](docs/video/guion.md): the ten parts of the video, with what to load for each.
- [Review sheet of the Spanish lines](docs/review/lineas.md), written by `npm run lines`.
- [Sheet of the lines changed since 1.0.1](docs/review/lineas-plan10.md), written by the same command: every new or changed line, before and after, to review before a release.
- [Rigour review of the Códex](docs/codex-review.md), for a classmate to check the proofs.
- Synthetic saves to start halfway: `npm run save -- <point>` (`fresh`, `after-ch2`, `after-ch4`, `after-ch6`, `after-ch7`, `all-stars`, `hub-flowers`).

## Documentation

- [Game design document](docs/GDD.md) (Spanish): the source of truth of levels, mechanics, Códex and style.
- [Implementation plans](docs/plans/) (Spanish), from the core to the polish.

## License

Code is released under the [MIT License](LICENSE). Third-party art, music and sound assets keep their own licenses, listed in [`CREDITS.md`](CREDITS.md).
