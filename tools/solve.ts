// solve: runs Edmonds on a garden and prints its trace, its answer and the proof.
// Usage: npm run solve -- <garden code | level id> [--scans]
//   npm run solve -- 4.6          a level, with the sprout names of the design document
//   npm run solve -- BgZ…         any garden code (from the sandbox, a test, a bug report)
// Scans (each look along a vine) are many; they are only printed with --scans.
import { stonesFromForest } from '@core/certificates/fromForest';
import { checkTutteBerge } from '@core/certificates/tutteBerge';
import { decodeGarden, encodeGarden } from '@core/codes/gardenCode';
import { edmonds } from '@core/edmonds/solve';
import { nameOf } from '@core/graph/labels';
import type { Graph, VertexId } from '@core/graph/types';
import { matchedEdges, size } from '@core/matching/queries';
import type { Matching } from '@core/matching/types';
import { loadLevel } from '@levels/loader';
import { describeEvent, type Namer } from './describeEvent';
import { readLevelFiles } from './levelFiles';

interface Garden {
  readonly title: string;
  readonly graph: Graph;
  readonly matching: Matching;
  readonly name: Namer;
}

/** The garden named on the command line: a level id, or a garden code. */
function gardenFrom(arg: string): Garden {
  if (/^\d+\.\d+$/.test(arg)) {
    const file = readLevelFiles().find((f) => (f.json as { id?: string }).id === arg);
    if (file === undefined) throw new Error(`no level ${arg} in src/levels/data`);
    const level = loadLevel(file.json);
    if (!level.ok) throw new Error(`level ${arg} does not load; run npm run check-levels`);
    const { graph, labels, start } = level.value;
    return {
      title: `level ${arg}`,
      graph,
      matching: start.matching,
      name: (v) => nameOf(labels, v),
    };
  }
  const decoded = decodeGarden(arg);
  if (!decoded.ok) throw new Error(`not a garden code: ${JSON.stringify(decoded.error)}`);
  return { title: 'garden', ...decoded.value, name: (v: VertexId) => String(v) };
}

const args = process.argv.slice(2);
const target = args.find((arg) => !arg.startsWith('--'));
if (target === undefined) {
  console.log('usage: npm run solve -- <garden code | level id> [--scans]');
  process.exit(1);
}
const { title, graph, matching, name } = gardenFrom(target);
const pairs = (m: Matching) =>
  matchedEdges(m)
    .map(([u, v]) => `${name(u)}=${name(v)}`)
    .join(', ');

console.log(
  `${title} · ${graph.n} sprouts · ${graph.edges.length} vines · code ${encodeGarden(graph, matching)}`,
);
console.log(`lanterns at the start (${size(matching)}): ${pairs(matching) || 'none'}\n`);

const run = edmonds(graph, matching);
run.trace.forEach((event, step) => {
  if (event.type !== 'scanEdge' || args.includes('--scans')) {
    console.log(`${String(step + 1).padStart(5)}. ${describeEvent(event, name)}`);
  }
});

const stones = stonesFromForest(run.finalLayer, run.finalForest);
const proof = checkTutteBerge(graph, run.matching, stones);
console.log(`\nresult: ${size(run.matching)} lanterns: ${pairs(run.matching) || 'none'}`);
console.log(`steps: ${run.steps}`);
console.log(`stones (moons of the last search): ${stones.map(name).join(', ') || 'none'}`);
console.log(
  proof.ok
    ? `proof: ${proof.value.oddGroups.length} odd groups, bound (n + |U| − odd) / 2 = ${proof.value.bound} = lanterns. Maximum, proved.`
    : `proof does not close: ${JSON.stringify(proof.error)}`,
);
if (!proof.ok) process.exitCode = 1;
