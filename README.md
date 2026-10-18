# Florecer

*Working title.* A cozy pixel-art puzzle game that teaches **Edmonds' Blossom algorithm** for maximum matching in general graphs — from the first pair of sprouts to the Tutte–Berge certificate.

Built as a creative project for the course *Diseño y Análisis de Algoritmos* (DAA).

## Status

Chapters 0–7 are playable with the art and sound of the CC0 packs ([`docs/plans/06-art-and-audio.md`](docs/plans/06-art-and-audio.md)), on top of the tested algorithmic core. The books are in ([`docs/plans/07-codex-epilogue-teacher.md`](docs/plans/07-codex-epilogue-teacher.md)): the **Códex**, fourteen entries opened by playing, each with the garden's intuition and a touchable diagram, the formal definitions, statements and proofs, and the bridge between the two; the **Cuaderno**, where every statement the player writes down links to the entry that translates it; and the epilogue, *Más allá del jardín*. The free mode, the secret flowers and the hub's rewards are in too ([`docs/plans/08-sandbox-secrets-cosmetics.md`](docs/plans/08-sandbox-secrets-cosmetics.md)). The guided walk and the final polish are still to come.

### Free mode

The **Modo libre** sign appears in the hub once chapter 1 is finished (always in teacher mode), and the epilogue offers it too. There you design a garden by hand (sprouts, vines and lanterns, up to 24 sprouts and 40 vines) or grow one from a generator (a row, a ring, a star, all with all, at random, bees and flowers, a long-stemmed flower, nested flowers, a helix, many flowers), and play it with the actions already won (all of them in teacher mode). Once met in the story, the **mechanical gardener** solves the garden from where you left it, with the sun to replay each step, and the **certificate** places its proof: the Council's stones, and the scarecrows when the garden is one of bees and flowers. Nothing played there touches the progress; the last design is kept apart in the browser.

**Compartir** shows the garden's short code, a link that opens it, and its level file as JSON; the same sheet opens a garden from a pasted code or JSON, or from a chosen file. A link has the form `?garden=<code>` and works for every player (`?level=` wins when both are given). A code carries no positions, so an opened code is laid out again; the JSON keeps names and positions. The JSON is a valid level with id `9.1` and `"draft": true`: to make it a real level, give it its own id when copying it into `src/levels/data/`, and `npm run check-levels` will hold it to every rule.

### Secret flowers and the hub's rewards

Each chapter from the Prado to the Consejo hides one **secret flower** by the post of its sign in the hub: a closed bud once the chapter is finished, which opens with enough of the chapter's stars (completing it and about half its extra stars; touching the bud says how many are missing). They are optional, teach nothing new and never block anything; in teacher mode they are all open. `F` / `Shift+F` move between the flowers shown, and `Enter` touches one.

Stars (the best of each level, secret flowers included) and seeds (one per bet won, the first time) show next to the hub's title. They are thresholds, never spent: at 15, 30, 50, 70, 90, 110 and 130 stars a butterfly, a frog, a cat, a blue butterfly, two hens, fireflies and lanterns on the posts come to the hub, and every seed plants a small plant. Teacher mode shows them all.

### Teacher mode

Add `?teacher` to the address to open every chapter and every page of the Códex. In a level, `T` (or the trace button) opens a panel beside the garden with the trace in the Códex's notation: the player's day, a run of Edmonds from the lanterns the sun shows, and its Tutte–Berge certificate. `PageUp` and `PageDown` jump to the level before or after.

- `?teacher&level=4.6` starts straight in a level.
- `?teacher&codex=C8&tab=formal` opens the Códex at an entry, and optionally at one of its tabs (`intuition`, `formal`, `bridge`).
- `?teacher&level=1.10` opens a secret flower (`2.5`, `3.10`, `4.13`, `5.6`, `6.7`, `7.6` the others).

## Documentation

- [Game design document](docs/GDD.md) (Spanish)
- [Implementation plans](docs/plans/)

## Development

Requires Node.js 22+.

```sh
npm install
npm run dev        # start the dev server
npm test           # run the test suite
npm run lint       # lint the code
npm run typecheck  # type-check without emitting
npm run check-levels  # check every level file against the rules and Edmonds
npm run solve -- 4.6  # readable trace, result and proof for a level id or a garden code
npm run bench      # steps of the recipe, the fast version and Bruto per garden size
npm run test:explore  # property tests with a random seed and 2000 cases each
```

Property-based tests use a fixed seed by default, so every run (and CI) is reproducible. When a property fails, fast-check prints its seed; replay it with `FC_SEED=<seed> npm test`. `FC_RUNS=<n>` sets the number of cases per property.

### Art, music and sound

The game's art, music and sounds come from CC0 packs (listed with their authors in [`CREDITS.md`](CREDITS.md)). The zips are not committed: download them into `assets-src/packs/` (file names and sha256 checksums are in `tools/assets/selection.ts`). The files the game uses are extracted from them and committed under `public/assets/`, so building and testing never need the zips.

```sh
npm run assets        # extract the chosen files into public/assets/ and regenerate src/game/assets/manifest.json and glyphs.json
npm run assets:check  # check, without writing, that the committed files are exactly what the zips give
npm run sounds        # synthesize the chimes, the fold chords and the crickets alone, without the zips
npm run budget        # after a build: weigh the JavaScript and the assets against their budget
```

The chimes, the sparkle, the fold chords and the crickets of the prologue are not taken from a pack: they are synthesized from the parameters in `tools/synth/sounds.ts`, credited as original work, and listed in the same manifest. `npm run assets` makes them too, so both commands agree.

To use another file of a pack, add it to `tools/assets/selection.ts` (at the end of its group), run `npm run assets`, and credit it in `CREDITS.md`.

The weight of each part is capped (decimal units): JavaScript 1.8 MB, images 600 KB, the font 100 KB, effects, syllables and jingles 1.5 MB, the first load (JavaScript plus the `boot` group, with the hub's music) 5 MB, all the music 20 MB, each track loaded with its own chapter, the books (KaTeX, marked, the Códex, the Cuaderno and the teacher's panel, loaded the first time one opens) 1 MB, and the free mode (the editor and the share sheet, loaded the first time it opens) 60 KB. `tests/assetBudget.test.ts` holds the assets to it; `npm run budget`, run by CI after the build, adds the JavaScript.

## License

Code is released under the [MIT License](LICENSE). Third-party art, music and sound assets keep their own licenses, listed in `CREDITS.md`.
