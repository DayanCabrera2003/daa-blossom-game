import { ESLint } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';

// Guards the architecture and hard rule 3 against being disabled silently: each case lints a
// virtual file at a given path and checks which rules fire. The files never exist on disk.

let eslint: ESLint;

beforeAll(() => {
  eslint = new ESLint();
});

/** Lints `code` as if it lived at `filePath` and returns the ids of the rules that fired. */
async function firedRules(filePath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).map((message) => message.ruleId ?? 'parse-error');
}

describe('core purity', () => {
  it.each([
    ["import Phaser from 'phaser';", 'Phaser'],
    ["import { x } from '@game/scene';", 'game alias'],
    ["import { x } from '../../game/scene';", 'game relative path'],
    ["import { x } from '@levels/loader';", 'levels'],
    ["import { x } from '@ui/codex';", 'ui'],
    ["import { x } from '@services/save';", 'services'],
  ])('rejects %s (%s)', async (code) => {
    expect(await firedRules('src/core/graph/virtual.ts', `${code}\nexport { x };`)).toContain(
      'no-restricted-imports',
    );
  });

  it('allows importing from core itself', async () => {
    const rules = await firedRules(
      'src/core/graph/virtual.ts',
      "import { x } from '@core/shared/result';\nexport { x };",
    );
    expect(rules).not.toContain('no-restricted-imports');
  });

  it('rejects Math.random', async () => {
    expect(await firedRules('src/core/virtual.ts', 'export const r = Math.random();')).toContain(
      'no-restricted-properties',
    );
  });

  it.each(['Date.now()', 'console.log(1)', 'window.name'])(
    'rejects the global in %s',
    async (expr) => {
      expect(await firedRules('src/core/virtual.ts', `export const v = ${expr};`)).toContain(
        'no-restricted-globals',
      );
    },
  );
});

describe('layer boundaries', () => {
  it('levels may not import game', async () => {
    expect(
      await firedRules('src/levels/virtual.ts', "import { x } from '@game/scene';\nexport { x };"),
    ).toContain('no-restricted-imports');
  });

  it('game may not import ui', async () => {
    expect(
      await firedRules('src/game/virtual.ts', "import { x } from '@ui/codex';\nexport { x };"),
    ).toContain('no-restricted-imports');
  });

  it('ui may not import game', async () => {
    expect(
      await firedRules('src/ui/virtual.ts', "import { x } from '@game/scene';\nexport { x };"),
    ).toContain('no-restricted-imports');
  });

  it('game may import Phaser', async () => {
    expect(
      await firedRules('src/game/virtual.ts', "import Phaser from 'phaser';\nexport { Phaser };"),
    ).not.toContain('no-restricted-imports');
  });
});

describe('pure game logic', () => {
  // Decisions of the game live in pure folders; only scenes and views may draw with Phaser.
  const PURE = ['input', 'systems', 'animation', 'scale', 'picture', 'assets'];

  it.each(PURE)('src/game/%s may not import Phaser', async (folder) => {
    expect(
      await firedRules(
        `src/game/${folder}/virtual.ts`,
        "import Phaser from 'phaser';\nexport { Phaser };",
      ),
    ).toContain('no-restricted-imports');
  });

  it.each(PURE)('src/game/%s still may not import ui', async (folder) => {
    expect(
      await firedRules(
        `src/game/${folder}/virtual.ts`,
        "import { x } from '@ui/codex';\nexport { x };",
      ),
    ).toContain('no-restricted-imports');
  });

  it('views and scenes may draw with Phaser', async () => {
    for (const folder of ['view', 'scenes']) {
      expect(
        await firedRules(
          `src/game/${folder}/virtual.ts`,
          "import Phaser from 'phaser';\nexport { Phaser };",
        ),
      ).not.toContain('no-restricted-imports');
    }
  });
});

describe('the view never changes the logic', () => {
  // Views and audio only read what the logic decided: they may name its types, never call it.
  const LOGIC = [
    "import { x } from '../systems/stars';",
    "import { x } from '@game/systems/stars';",
    "import { x } from '@core/rules/reducer';",
    "import { x } from '@levels/flow';",
    "import { x } from '@levels/flowInput';",
  ];

  it.each(['view', 'audio'])('src/game/%s may not import values of the logic', async (folder) => {
    for (const code of LOGIC) {
      expect(await firedRules(`src/game/${folder}/virtual.ts`, `${code}\nexport { x };`)).toContain(
        '@typescript-eslint/no-restricted-imports',
      );
    }
  });

  it.each(['view', 'audio'])('src/game/%s may import types of the logic', async (folder) => {
    for (const code of LOGIC) {
      const typeOnly = code.replace('import {', 'import type {');
      expect(
        await firedRules(`src/game/${folder}/virtual.ts`, `${typeOnly}\nexport type { x };`),
      ).not.toContain('@typescript-eslint/no-restricted-imports');
    }
  });

  it('views may import values of the pure pictures', async () => {
    expect(
      await firedRules(
        'src/game/view/virtual.ts',
        "import { x } from '../picture/garden';\nexport { x };",
      ),
    ).not.toContain('@typescript-eslint/no-restricted-imports');
  });
});

describe('the math libraries of the Códex', () => {
  // KaTeX and marked are heavy and only render the books: they live in ui/math, in the deferred chunk.
  const IMPORTS = ["import katex from 'katex';", "import { marked } from 'marked';"];
  const FORBIDDEN = [
    'src/core/virtual.ts',
    'src/levels/virtual.ts',
    'src/services/virtual.ts',
    'src/game/virtual.ts',
    'src/game/scenes/virtual.ts',
    'src/game/systems/virtual.ts',
    'src/game/view/virtual.ts',
    'src/ui/codex/virtual.ts',
    'src/ui/model/virtual.ts',
    'src/ui/shell.ts',
  ];

  it.each(FORBIDDEN)('%s may not import katex nor marked', async (filePath) => {
    for (const code of IMPORTS) {
      expect(await firedRules(filePath, `${code}\nexport {};`)).toContain('no-restricted-imports');
    }
  });

  it.each(['src/ui/math/virtual.ts', 'tests/virtual.test.ts'])(
    '%s may import katex and marked',
    async (filePath) => {
      for (const code of IMPORTS) {
        expect(await firedRules(filePath, `${code}\nexport {};`)).not.toContain(
          'no-restricted-imports',
        );
      }
    },
  );

  it('ui/math still may not import game', async () => {
    expect(
      await firedRules('src/ui/math/virtual.ts', "import { x } from '@game/scene';\nexport { x };"),
    ).toContain('no-restricted-imports');
  });
});

describe('one responsibility per file', () => {
  const lines = (count: number): string =>
    Array.from({ length: count }, (_, i) => `export const v${i} = ${i};`).join('\n');

  it('accepts a file of 1000 lines', async () => {
    expect(await firedRules('src/core/virtual.ts', lines(1000))).not.toContain('max-lines');
  });

  it('rejects a file of 1001 lines', async () => {
    expect(await firedRules('src/core/virtual.ts', lines(1001))).toContain('max-lines');
  });
});
