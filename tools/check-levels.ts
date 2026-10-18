// check-levels: the level integrity checks, and the walkthrough of each level played through the
// interface, as a readable report for authors and for CI.
// Usage: npm run check-levels. Exits with code 1 if any level, or how the catalog opens the Codex,
// has a problem.
import { playWalkthrough } from '@game/systems/walkthrough';
import { checkCodex, type CodexLevel } from '@levels/codexChecks';
import { checkIntegrity } from '@levels/integrity';
import { loadLevel } from '@levels/loader';
import {
  describeCodexProblem,
  describeLoadError,
  describeProblem,
  describeWalkthroughProblem,
} from './describeProblem';
import { expectedPath, readLevelFiles } from './levelFiles';

const files = readLevelFiles();
const seen = new Map<string, string>();
/** The levels that load, for the checks of the whole catalog (the Codex). */
const loaded: CodexLevel[] = [];
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
if (failing > 0 || codexProblems.length > 0) process.exitCode = 1;
