import lines from '@content/es/lines.json';
import { playWalkthrough } from '@game/systems/walkthrough';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { describe, expect, it } from 'vitest';

/**
 * The prologue can be failed (GDD §7, 0.2 and 0.4): after the first lantern the player is asked to
 * try another, and the level ends only once the garden refuses it. Played through the interface,
 * a level whose play step waits for a refusal finishes with its walkthrough, and never without
 * the moves it writes as refused.
 */

/** The levels whose play step waits for a refused move. */
const waiting = catalog().filter((level) =>
  level.flow.some((step) => step.step === 'play' && step.until !== undefined),
);

/** The level with its walkthrough less the moves written as refused. */
const untried = (level: Level): Level => ({
  ...level,
  walkthrough: level.walkthrough.filter((entry) => entry.type !== 'refusedMove'),
});

/** The text of a line. */
const text = (id: string): string => (lines as Record<string, string>)[id] ?? '';

describe('levels that wait for a refused move', () => {
  it('are 0.2 and 0.4, both waiting for a second lantern', () => {
    expect(waiting.map((level) => level.data.id)).toEqual(['0.2', '0.4']);
  });

  it.each(waiting.map((level) => [level.data.id, level] as const))(
    '%s finishes with its walkthrough, and not without the refused move',
    (_, level) => {
      expect(playWalkthrough(level).problem).toBeNull();
      expect(playWalkthrough(untried(level)).problem).toMatchObject({ code: 'unfinished' });
    },
  );

  it.each(waiting.map((level) => [level.data.id, level] as const))(
    '%s asks for another lantern after the first, and says one lantern is for two only after',
    (_, level) => {
      const played = playWalkthrough(level).effects;
      const said = played.flatMap((effect) => (effect.kind === 'say' ? effect.lines : []));
      const refused = played.findIndex((effect) => effect.kind === 'rejected');
      const asked = played.findIndex(
        (effect) => effect.kind === 'say' && effect.lines.some((id) => text(id).includes('¿Cabe')),
      );
      expect(asked).toBeGreaterThanOrEqual(0);
      expect(asked).toBeLessThan(refused);
      // Nothing the mentor says before the refusal tells the rule the player is about to try.
      const before = played.slice(0, refused);
      for (const effect of before) {
        if (effect.kind !== 'say') continue;
        for (const id of effect.lines) expect(text(id)).not.toMatch(/para dos|un solo farol/i);
      }
      expect(said.length).toBeGreaterThan(1);
    },
  );
});
