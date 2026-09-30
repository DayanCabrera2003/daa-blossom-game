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
```

## License

Code is released under the [MIT License](LICENSE). Third-party art, music and sound assets keep their own licenses, listed in `CREDITS.md`.
