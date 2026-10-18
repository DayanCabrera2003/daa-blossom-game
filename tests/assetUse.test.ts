import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { catalog } from '../src/levels/catalog';
import { ASSET_KEYS, assetEntry, type AssetKey } from '../src/game/assets/keys';
import { levelScreen, trackFor } from '../src/game/systems/musicFor';

// Every file the game ships is one it uses: a key of the manifest that no code names is weight
// downloaded for nothing and a credit for nothing. The few kept for what is still to be built are
// listed below, each with its reason, and must stay unused until then.

/**
 * Keys shipped ahead of the screen that will use them, each with its reason. Empty since the
 * credits screen plays `music.credits` (plan 09, phase 3).
 */
const AWAITING: Readonly<Partial<Record<AssetKey, string>>> = {};

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** The game's own source: every TypeScript file under src/ but the tests, and the page. */
const source = [
  ...readdirSync(join(ROOT, 'src'), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .filter((entry) => !entry.name.endsWith('.test.ts'))
    .map((entry) => readFileSync(join(entry.parentPath, entry.name), 'utf8')),
  readFileSync(join(ROOT, 'index.html'), 'utf8'),
].join('\n');

/** The tracks the screens play, which the code names by chapter (`music.ch4`), not one by one. */
const tracks = new Set([
  trackFor({ kind: 'hub' }),
  ...catalog().map((level) => trackFor(levelScreen(level))),
]);

/**
 * Whether the game uses `key`: the code names it in quotes, a screen plays it, or the page loads
 * its file (the font, declared with `@font-face`).
 */
const used = (key: AssetKey): boolean =>
  ["'", '"', '`'].some((quote) => source.includes(`${quote}${key}${quote}`)) ||
  tracks.has(key) ||
  source.includes(`/${assetEntry(key).path}`);

describe('the assets the game ships', () => {
  it.each(ASSET_KEYS.filter((key) => AWAITING[key] === undefined))(
    '%s is used by the game',
    (key) => {
      expect(used(key)).toBe(true);
    },
  );

  it('every key still waiting is in the manifest and still unused', () => {
    for (const key of Object.keys(AWAITING) as AssetKey[]) {
      expect(ASSET_KEYS).toContain(key);
      expect(used(key)).toBe(false);
    }
  });
});
