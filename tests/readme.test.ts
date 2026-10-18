import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  chordName,
  KEY_SCREENS,
  keyBindings,
  type KeyBinding,
} from '../src/game/input/keyBindings';

// The final README (plan 09, phase 12): it names every key of the game's table and every address
// parameter the game reads, links the published game, links only files that exist and promises
// nothing that is "still to come".

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');
const readme = read('../README.md');

/** The README's name of a key: "Space" for the space bar, the table's name for the rest. */
const shown = (binding: KeyBinding): string =>
  binding.chord.key === ' ' ? 'Space' : chordName(binding.chord);

/** The address parameters a source file reads with `params.get('x')` or `.has('x')`. */
const paramsIn = (path: string): string[] =>
  [...read(path).matchAll(/\.(?:get|has)\('([a-z]+)'\)/g)].map((match) => match[1] ?? '');

describe('the README', () => {
  it('names every key of every screen', () => {
    for (const screen of KEY_SCREENS) {
      const bindings = keyBindings(screen);
      const digits = bindings.filter((binding) => /^\d$/.test(binding.chord.key));
      for (const binding of bindings.filter((candidate) => !digits.includes(candidate)))
        expect(readme, `${screen}: ${shown(binding)}`).toContain(`\`${shown(binding)}\``);
      // A run of digits is written as its range, e.g. `1`–`5`.
      if (digits.length > 0) {
        const keys = digits.map((binding) => Number(binding.chord.key));
        expect(readme, screen).toContain(`\`${Math.min(...keys)}\`–\`${Math.max(...keys)}\``);
      }
    }
  });

  it('names every address parameter the game reads', () => {
    const params = [
      ...paramsIn('../src/services/teacherMode.ts'),
      ...paramsIn('../src/services/startLevel.ts'),
      ...paramsIn('../src/services/startGarden.ts'),
    ];
    expect(params).toEqual(expect.arrayContaining(['teacher', 'level', 'codex', 'tab', 'garden']));
    for (const param of params) expect(readme, param).toMatch(new RegExp(`[?&]${param}\\b`));
  });

  it('links the published game and only files of the repository that exist', () => {
    expect(readme).toContain('https://dayancabrera2003.github.io/daa-blossom-game/');
    const links = [...readme.matchAll(/\]\(([^)#]+)\)/g)]
      .map((match) => match[1] ?? '')
      .filter((link) => !/^[a-z]+:/.test(link));
    expect(links.length).toBeGreaterThan(5);
    for (const link of links)
      expect(existsSync(new URL(`../${link}`, import.meta.url)), link).toBe(true);
  });

  it('promises nothing still to come', () => {
    expect(readme).not.toMatch(/still to come|working title|coming soon/i);
  });
});
