import strings from '@content/es/strings.json';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { createTranslator } from '@services/i18n';
import { describe, expect, it } from 'vitest';
import { toolAdvice, toolToTry } from './toolAdvice';

const levels = catalog();
const levelById = (id: string): Level => {
  const level = levels.find((l) => l.data.id === id);
  if (level === undefined) throw new Error(`no level ${id}`);
  return level;
};
const greenhouse = levelById('3.1');
const festival = levelById('4.5');

describe('the tool a refusal points to, when the tool in hand was the wrong one', () => {
  it('fog over the vines points to Inspeccionar, unless it is already in hand', () => {
    const hidden = { code: 'vineHidden', vertex: 0 } as const;
    expect(toolToTry(hidden, 'lanterns', greenhouse)).toBe('inspect');
    expect(toolToTry(hidden, 'inspect', greenhouse)).toBeNull();
  });

  it('a lit sprout touched with the marks points to the lanterns', () => {
    const lit = { code: 'notInTheDark', vertex: 0 } as const;
    expect(toolToTry(lit, 'marks', greenhouse)).toBe('lanterns');
    expect(toolToTry(lit, 'lanterns', greenhouse)).toBeNull();
  });

  it('a chain not seen yet points to the marks, where the player searches by hand', () => {
    const unseen = { code: 'chainNotSeen' } as const;
    expect(toolToTry(unseen, 'lanterns', greenhouse)).toBe('marks');
    // Where the light searches by itself, the marks are not the way: the light is.
    expect(toolToTry(unseen, 'lanterns', festival)).toBeNull();
  });

  it('a move closed for the day on a sprout points to the other tool of the sprouts (4.5)', () => {
    const suns = { code: 'actionClosed', action: 'markRoot' } as const;
    expect(toolToTry(suns, 'marks', festival)).toBe('lanterns');
    // Nothing else puts a lantern out: no tool to point to.
    const split = { code: 'actionClosed', action: 'split' } as const;
    expect(toolToTry(split, 'lanterns', festival)).toBeNull();
    expect(toolToTry({ code: 'noFog' }, 'inspect', greenhouse)).toBe('lanterns');
  });

  it('a tool the bar does not show is never pointed to; other reasons point nowhere', () => {
    expect(toolToTry({ code: 'vineHidden', vertex: 0 }, 'lanterns', levelById('3.6'))).toBeNull();
    expect(toolToTry({ code: 'alreadyLit', vertex: 0 }, 'marks', greenhouse)).toBeNull();
  });

  it('the advice is a sentence that names the tool as the bar does', () => {
    const t = createTranslator(strings);
    expect(toolAdvice({ code: 'vineHidden', vertex: 0 }, 'lanterns', greenhouse, t)).toBe(
      'Prueba con Inspeccionar.',
    );
    expect(toolAdvice({ code: 'alreadyLit', vertex: 0 }, 'lanterns', greenhouse, t)).toBeNull();
  });
});
