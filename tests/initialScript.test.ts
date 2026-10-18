import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FREE_MODE_MODULES, isFreeMode } from '../tools/assets/freeMode';

// What the initial script holds, read from the sources (plan 08, phase 8): the modules the entry
// reaches through static imports, as the bundler follows them; `import()` starts a deferred chunk
// and is not followed. The initial script is close to its budget, so the free mode loads on demand
// like the books: none of its modules may be reached from the entry. `import type` is erased and
// not followed; any other import, even of types only, keeps the module (verbatimModuleSyntax).

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ENTRY = join(ROOT, 'src/main.ts');

/** The path aliases of vite.config.ts and tsconfig.json. */
const ALIASES: Readonly<Record<string, string>> = {
  '@core': 'src/core',
  '@levels': 'src/levels',
  '@game': 'src/game',
  '@ui': 'src/ui',
  '@services': 'src/services',
  '@content': 'src/content',
};

/** Static `import … from` and `export … from` of a source, and its bare `import '…'`. */
const STATIC_IMPORT = /^\s*(?:import|export)\s+(?!type\s)(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/gm;

/** The file a specifier names from `from`, or null for a package (Phaser, zod…). */
function resolveSpecifier(specifier: string, from: string): string | null {
  const alias = Object.keys(ALIASES).find(
    (name) => specifier === name || specifier.startsWith(`${name}/`),
  );
  let base: string;
  if (alias !== undefined) base = join(ROOT, ALIASES[alias] ?? '', specifier.slice(alias.length));
  else if (specifier.startsWith('.')) base = resolve(dirname(from), specifier);
  else return null;
  const found = [base, `${base}.ts`, join(base, 'index.ts')].find(
    (path) => existsSync(path) && !path.endsWith('/') && /\.\w+$/.test(path),
  );
  if (found === undefined) throw new Error(`cannot resolve ${specifier} from ${from}`);
  return found;
}

/** Every module the entry reaches through static imports, as paths from the project root. */
function initialModules(): Set<string> {
  const seen = new Set<string>();
  const pending = [ENTRY];
  for (let file = pending.pop(); file !== undefined; file = pending.pop()) {
    const path = relative(ROOT, file);
    if (seen.has(path)) continue;
    seen.add(path);
    if (!file.endsWith('.ts')) continue;
    for (const [, specifier] of readFileSync(file, 'utf8').matchAll(STATIC_IMPORT)) {
      const target = resolveSpecifier(specifier ?? '', file);
      if (target !== null) pending.push(target);
    }
  }
  return seen;
}

describe('the initial script', () => {
  const modules = initialModules();

  it('is read the way the bundler reads it: static imports in, import() out', () => {
    expect(modules.has('src/main.ts')).toBe(true);
    expect(modules.has('src/levels/catalog.ts')).toBe(true);
    expect(modules.has('src/ui/shell.ts')).toBe(true);
    // The books, behind the shell's import(), load later.
    expect(modules.has('src/ui/books.ts')).toBe(false);
    // The free mode's thin gate is registered from the start; its scene loads later.
    expect(modules.has('src/game/scenes/SandboxGate.ts')).toBe(true);
    expect(modules.has('src/game/scenes/sandbox/SandboxScene.ts')).toBe(false);
  });

  it("leaves the garden-code decoder to the free mode: a shared link's code is only passed on", () => {
    expect(modules.has('src/services/startGarden.ts')).toBe(true);
    expect(modules.has('src/core/codes/gardenCode.ts')).toBe(false);
  });

  it('never holds a module of the free mode: it loads when the free mode opens', () => {
    const early = [...modules].filter(isFreeMode);
    expect(early).toEqual([]);
  });

  it("plays a free garden in the level scene without the free mode's code: the editor builds it", () => {
    expect(modules.has('src/game/scenes/LevelScene.ts')).toBe(true);
    expect(modules.has('src/game/systems/levelScreenOf.ts')).toBe(true);
    expect(modules.has('src/levels/sandbox/toLevel.ts')).toBe(false);
  });

  it("shows the free mode's orders on the level screen, but their code comes with the garden", () => {
    expect(modules.has('src/game/scenes/level/sandboxBar.ts')).toBe(true);
    for (const module of [
      'src/game/systems/sandboxOrders.ts',
      'src/game/systems/sandboxSolve.ts',
      'src/game/systems/sandboxCertificate.ts',
    ]) {
      expect({ module, initial: modules.has(module) }).toEqual({ module, initial: false });
      expect(isFreeMode(module)).toBe(true);
    }
  });

  it("counts the free mode's scenes as the free mode's, out of the initial script", () => {
    expect(isFreeMode('src/game/scenes/sandbox/SandboxScene.ts')).toBe(true);
    expect(isFreeMode('src/levels/sandbox/design.ts')).toBe(true);
    // The thin gate that loads them stays in the initial script.
    expect(isFreeMode('src/game/scenes/SandboxGate.ts')).toBe(false);
  });

  it("counts the editor's pure modules as the free mode's, each a file that exists", () => {
    for (const module of FREE_MODE_MODULES) {
      expect({ module, exists: existsSync(join(ROOT, module)) }).toEqual({ module, exists: true });
      expect(isFreeMode(module)).toBe(true);
    }
    expect(FREE_MODE_MODULES).toEqual(
      expect.arrayContaining([
        'src/game/input/designIntent.ts',
        'src/game/systems/designHistory.ts',
        'src/game/picture/designPicture.ts',
        'src/game/picture/designToolbar.ts',
      ]),
    );
    // Their neighbours of the levels' own logic stay where they are.
    expect(isFreeMode('src/game/input/intent.ts')).toBe(false);
  });
});
