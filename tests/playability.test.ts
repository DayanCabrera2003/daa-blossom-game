import { startingTool } from '@game/input/startingTool';
import { playWalkthrough } from '@game/systems/walkthrough';
import { catalog } from '@levels/catalog';
import { describe, expect, it } from 'vitest';

/**
 * Every level can be finished with the interface: its reference walkthrough, played through the
 * level controller the scene uses (moves as touches and drags where its sprouts really are,
 * answers, bets and touches as interface events), makes exactly the moves written, every one of
 * them accepted, and finishes the level's script. It takes only the tools the level's bar shows,
 * and presses "Terminé" only where the level offers it, so the bar never hides what a solution
 * needs.
 */
describe.each(catalog().map((level) => [level.data.id, level] as const))('level %s', (_, level) => {
  it('is finished by playing its walkthrough with the interface', () => {
    const played = playWalkthrough(level);
    expect(played.problem).toBeNull();
    expect(played.controller.session.won).not.toBeNull();
  });

  // Where the light searches by itself, folding, opening and dragging do not depend on the tool:
  // the level is played with the tool it starts with, and Inspeccionar only to look in the fog.
  it.runIf(level.start.allowed.has('stepLight'))('needs no tool but its first to play', () => {
    expect(playWalkthrough(level, 0, [startingTool(level), 'inspect']).problem).toBeNull();
  });
});
