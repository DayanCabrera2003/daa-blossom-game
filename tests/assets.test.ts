import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FRAMES, frameRect } from '../src/game/assets/frames';
import { ASSET_KEYS, assetEntry, packCredit, packCredits } from '../src/game/assets/keys';
import { pngSize } from '../tools/assets/pngSize';

// Integrity of the committed assets, without the pack zips (CI does not have them): the manifest
// and public/assets/ agree file for file, every named frame falls inside its sheet, and every pack
// is credited. `npm run assets:check` additionally proves, locally, that both come from the zips.

const PUBLIC = fileURLToPath(new URL('../public', import.meta.url));
const CREDITS = fileURLToPath(new URL('../CREDITS.md', import.meta.url));

const read = (path: string): Buffer => readFileSync(join(PUBLIC, path));

describe('committed assets', () => {
  it.each(ASSET_KEYS)('%s exists with the bytes the manifest records', (key) => {
    const entry = assetEntry(key);
    const path = join(PUBLIC, entry.path);
    expect(existsSync(path)).toBe(true);
    const bytes = read(entry.path);
    expect(bytes.length).toBe(entry.bytes);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(entry.sha256);
  });

  it('has no file under public/assets that the manifest does not list', () => {
    const listed = new Set(ASSET_KEYS.map((key) => assetEntry(key).path));
    const onDisk = readdirSync(join(PUBLIC, 'assets'), { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => relative(PUBLIC, join(entry.parentPath, entry.name)).split('\\').join('/'));
    expect(onDisk.filter((path) => !listed.has(path))).toEqual([]);
  });

  it('never lists one path under two keys', () => {
    const paths = ASSET_KEYS.map((key) => assetEntry(key).path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it.each(ASSET_KEYS.filter((key) => ['image', 'sheet'].includes(assetEntry(key).kind)))(
    '%s records the size its PNG header says',
    (key) => {
      const entry = assetEntry(key);
      expect(pngSize(new Uint8Array(read(entry.path)))).toEqual(entry.image);
    },
  );
});

describe('named frames', () => {
  it.each(Object.keys(FRAMES) as (keyof typeof FRAMES)[])('%s falls inside its sheet', (name) => {
    const { sheet } = FRAMES[name];
    const size = pngSize(new Uint8Array(read(assetEntry(sheet).path)));
    const rect = frameRect(name);
    expect(rect.x + rect.width).toBeLessThanOrEqual(size.width);
    expect(rect.y + rect.height).toBeLessThanOrEqual(size.height);
  });
});

describe('credits', () => {
  const credits = readFileSync(CREDITS, 'utf8');

  it.each(packCredits().map((pack) => [pack.name, pack] as const))(
    '%s is credited with its author, license and page',
    (_name, pack) => {
      // Each pack has its own section, headed by its name, that names the rest.
      const section = credits.split(/^## /m).find((part) => part.startsWith(pack.name));
      expect(section).toBeDefined();
      expect(section).toContain(pack.author);
      expect(section).toContain(pack.license);
      expect(section).toContain(pack.url);
      if (pack.version !== null) expect(section).toContain(pack.version);
    },
  );

  it.each(ASSET_KEYS)('%s is named in the section of its pack', (key) => {
    const entry = assetEntry(key);
    const { name } = packCredit(entry.pack);
    const section = credits.split(/^## /m).find((part) => part.startsWith(name));
    expect(section).toContain(entry.source);
  });

  it('credits no file the game does not ship, each under the pack it comes from', () => {
    // Every `source` → `file` line of a pack's section is one entry of the manifest, from that
    // pack: nothing credited is left over once a file leaves the selection.
    const shipped = new Set(
      ASSET_KEYS.map((key) => {
        const entry = assetEntry(key);
        return `${packCredit(entry.pack).name}: ${entry.source} → ${entry.path}`;
      }),
    );
    const credited = credits
      .split(/^## /m)
      .slice(1)
      .flatMap((section) => {
        const name = section.slice(0, section.indexOf('\n'));
        return [...section.matchAll(/^- `([^`]+)` → `([^`]+)`$/gm)].map(
          ([, source, file]) => `${name}: ${source} → assets/${file}`,
        );
      });
    expect(credited.filter((line) => !shipped.has(line))).toEqual([]);
    expect(credited).toHaveLength(ASSET_KEYS.length);
  });
});
