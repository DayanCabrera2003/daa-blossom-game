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

## License

Code is released under the [MIT License](LICENSE). Third-party art, music and sound assets keep their own licenses, listed in `CREDITS.md`.
