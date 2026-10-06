import { playWalkthrough } from '@game/systems/walkthrough';
import { catalog } from '@levels/catalog';
import { describe, expect, it } from 'vitest';

/**
 * Every level can be finished with the interface: its reference walkthrough, played through the
 * level controller the scene uses (moves as touches and drags where its sprouts really are,
 * answers, bets and touches as interface events), makes exactly the moves written, every one of
 * them accepted, and finishes the level's script.
 */
describe.each(catalog().map((level) => [level.data.id, level] as const))('level %s', (_, level) => {
  it('is finished by playing its walkthrough with the interface', () => {
    const played = playWalkthrough(level);
    expect(played.problem).toBeNull();
    expect(played.controller.session.won).not.toBeNull();
  });
});
