// check-levels: the level integrity checks, and the walkthrough of each level played through the
// interface, as a readable report for authors and for CI.
// Usage: npm run check-levels. Exits with code 1 if any level, how the catalog opens the Codex, or a
// secret flower has a problem.
import { playWalkthrough } from '@game/systems/walkthrough';
import lines from '../src/content/es/lines.json';
import { checkCodex } from '@levels/codexChecks';
import { checkIntegrity } from '@levels/integrity';
import { vineCrossings } from '@levels/layoutChecks';
import { loadLevel } from '@levels/loader';
import { notebookEchoProblems } from '@levels/notebookEcho';
import type { LevelData } from '@levels/schema';
import { checkSecrets } from '@levels/secretChecks';
import {
  describeCodexProblem,
  describeEchoProblem,
  describeLoadError,
  describeProblem,
  describeSecretProblem,
  describeWalkthroughProblem,
} from './describeProblem';
import { expectedPath, readLevelFiles } from './levelFiles';

const files = readLevelFiles();
const seen = new Map<string, string>();
/** The levels that load, for the checks of the whole catalog (the Codex, the secret flowers). */
const loaded: LevelData[] = [];
let failing = 0;

for (const { path, json } of files) {
  const problems: string[] = [];
  const level = loadLevel(json);
  if (!level.ok) {
    problems.push(describeLoadError(level.error));
  } else {
    const { id } = level.value.data;
    if (path !== expectedPath(id)) problems.push(`level ${id} should live in ${expectedPath(id)}`);
    const twin = seen.get(id);
    if (twin !== undefined) problems.push(`level ${id} is also defined in ${twin}`);
    seen.set(id, path);
    loaded.push(level.value.data);
    const integrity = checkIntegrity(level.value);
    problems.push(...integrity.map(describeProblem));
    // The right answer of a notebook or a question is said in other words than the lines heard
    // before it.
    const text = (line: string): string | undefined => (lines as Record<string, string>)[line];
    problems.push(...notebookEchoProblems(level.value.data, text).map(describeEchoProblem));
    // A sound level must also be finished through the interface, script included.
    if (integrity.length === 0) {
      const { problem } = playWalkthrough(level.value);
      if (problem !== null) problems.push(describeWalkthroughProblem(problem));
    }
  }

  if (problems.length === 0) {
    console.log(`  ok  ${path}`);
  } else {
    failing++;
    console.log(`  !!  ${path}`);
    for (const problem of problems) console.log(`        - ${problem}`);
  }
}

console.log(`\n${files.length - failing}/${files.length} levels are sound.`);

// The Codex is opened by the catalog as a whole, so its checks run once over every level.
const codexProblems = checkCodex(loaded).map(describeCodexProblem);
if (codexProblems.length === 0) {
  console.log('The catalog opens the whole Codex.');
} else {
  console.log('\nThe catalog opens the Codex wrongly:');
  for (const problem of codexProblems) console.log(`        - ${problem}`);
}

// Crossing vines are an error only in a secret flower; elsewhere a design may need them, so they
// are reported for the author to judge.
const crossed = loaded
  .filter((level) => level.secret === undefined)
  .map((level) => ({ id: level.id, count: vineCrossings(level).length }))
  .filter(({ count }) => count > 0);
if (crossed.length === 0) {
  console.log('No vines cross in the levels of the main path.');
} else {
  console.log('\nVines cross in these levels of the main path (not an error):');
  for (const { id, count } of crossed) console.log(`        - ${id}: ${count}`);
}

// A secret flower is sound only next to its chapter, so its checks also read the whole catalog.
const secretProblems = checkSecrets(loaded).map(describeSecretProblem);
if (secretProblems.length === 0) {
  console.log('The secret flowers close their chapters.');
} else {
  console.log('\nThe secret flowers are wrong:');
  for (const problem of secretProblems) console.log(`        - ${problem}`);
}
if (failing > 0 || codexProblems.length > 0 || secretProblems.length > 0) process.exitCode = 1;
