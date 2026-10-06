// bench: the races of chapter 6 as a table of steps per garden size (Códex C11).
// Usage: npm run bench [-- --budget <Bruto's steps>]
// Gardens are G(n, ½) grown from the seed n, so every run prints the same table.
import { benchmark } from '@core/cost/benchmark';
import { randomGraph } from '@core/generators/random';
import { createRng } from '@core/shared/rng';
import { formatTable } from './formatTable';

const SIZES = [6, 8, 10, 16, 32, 64];
const budgetFlag = process.argv.indexOf('--budget');
const budget = budgetFlag === -1 ? 1_000_000 : Number(process.argv[budgetFlag + 1]);
if (!Number.isInteger(budget) || budget < 0) {
  console.log('usage: npm run bench [-- --budget <non-negative integer>]');
  process.exit(1);
}

const rows = benchmark(SIZES, (n) => randomGraph(n, 0.5, createRng(n)), budget);
console.log(`G(n, ½) gardens · Bruto's budget: ${budget.toLocaleString('en')} steps\n`);
console.log(
  formatTable(
    ['sprouts', 'vines', 'lanterns', 'recipe steps', 'fast operations', 'Bruto steps'],
    rows.map((row) => [
      String(row.n),
      String(row.edges),
      String(row.lanterns),
      String(row.didacticSteps),
      String(row.fastOperations),
      row.bruto.status === 'complete' ? String(row.bruto.steps) : `asleep at ${row.bruto.steps}`,
    ]),
  ),
);
