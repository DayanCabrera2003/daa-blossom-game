// check-levels: the level integrity checks, and the walkthrough of each level played through the
// interface, as a readable report for authors and for CI.
// Usage: npm run check-levels. Exits with code 1 if any level has a problem.
import { playWalkthrough } from '@game/systems/walkthrough';
import { checkIntegrity } from '@levels/integrity';
import { loadLevel } from '@levels/loader';
import { describeLoadError, describeProblem, describeWalkthroughProblem } from './describeProblem';
import { expectedPath, readLevelFiles } from './levelFiles';

const files = readLevelFiles();
const seen = new Map<string, string>();
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
if (failing > 0) process.exitCode = 1;
