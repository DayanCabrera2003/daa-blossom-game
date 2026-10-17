# Florecer

*Working title.* A cozy pixel-art puzzle game that teaches **Edmonds' Blossom algorithm** for maximum matching in general graphs — from the first pair of sprouts to the Tutte–Berge certificate.

Built as a creative project for the course *Diseño y Análisis de Algoritmos* (DAA).

## Status

Early development: the pure algorithmic core is being built first, with tests and validations. See [`docs/plans/01-core-foundation.md`](docs/plans/01-core-foundation.md).

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
npm run sounds        # synthesize the lantern chimes and the fold chords alone, without the zips
```

The chimes, the sparkle and the fold chords are not taken from a pack: they are synthesized from the parameters in `tools/synth/sounds.ts`, credited as original work, and listed in the same manifest. `npm run assets` makes them too, so both commands agree.

To use another file of a pack, add it to `tools/assets/selection.ts` (at the end of its group), run `npm run assets`, and credit it in `CREDITS.md`.

## License

Code is released under the [MIT License](LICENSE). Third-party art, music and sound assets keep their own licenses, listed in `CREDITS.md`.
