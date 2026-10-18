// make-save: prints a synthetic save of the author's kit (plan 09, phase 11) for a playtest that
// starts halfway, a review on screen or the recording of the video: the save as JSON, then the
// line to paste in the browser's console on the game's page, which stores it and reloads. Nothing
// is added to the game: the save goes where the game already keeps it.
// Usage: npm run save -- <point>, with <point> one of the names it lists when given none.
import { buildCatalog } from '@levels/catalog';
import { SAVE_KEY } from '@services/save';
import { readLevelFiles } from './levelFiles';
import { consoleLine, isSavePoint, SAVE_POINTS, savePoint } from './saves/points';

const [point] = process.argv.slice(2);
if (point === undefined || !isSavePoint(point)) {
  console.error(`usage: npm run save -- <point>, one of: ${SAVE_POINTS.join(', ')}`);
  process.exit(1);
}

const levels = buildCatalog(readLevelFiles().map((file) => file.json));
if (!levels.ok) throw new Error('a level file does not load: run npm run check-levels');

const save = savePoint(levels.value, point);
console.log(`// ${point}: the save`);
console.log(JSON.stringify(save));
console.log(`// ${point}: paste this in the console of the game's page`);
console.log(consoleLine(save, SAVE_KEY));
