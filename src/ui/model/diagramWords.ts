import type { Translate } from '@services/i18n';
import type { DiagramMove, DiagramSpec } from './diagramSpec';
import type { MiniSprout } from './miniGarden';

/**
 * The words around a small garden of the Codex (plan 07, phase 4): the help line under it, built
 * from what the block lets the reader do, and what a screen reader says of each sprout and vine
 * the reader can touch. The texts are keys of `strings.json`.
 */

/** The keys of the help line of a diagram: the block's own, or one per thing it lets the reader do. */
export function helpKeys(spec: {
  readonly kind: DiagramSpec['kind'];
  readonly help?: string | undefined;
  readonly moves?: readonly DiagramMove[] | undefined;
}): string[] {
  if (spec.help !== undefined) return [spec.help];
  if (spec.kind === 'replay') return ['diagram.help.replay'];
  const moves = new Set(spec.moves);
  const keys: string[] = [];
  if (moves.has('chain')) keys.push('diagram.help.chain');
  else if (moves.has('join') || moves.has('passLantern')) keys.push('diagram.help.join');
  if (moves.has('passLantern') && !moves.has('chain')) keys.push('diagram.help.pass');
  if (moves.has('split')) keys.push('diagram.help.split');
  return keys;
}

/** What a screen reader says of a sprout: its name and lantern, its mark, whether it is touched. */
export function sproutWords(sprout: MiniSprout, t: Translate): string {
  const words = [
    t(sprout.lit ? 'diagram.sprout.lit' : 'diagram.sprout.dark', { name: sprout.label }),
  ];
  if (sprout.mark !== null) words.push(t(`diagram.mark.${sprout.mark}`));
  if (sprout.touched !== null) words.push(t('diagram.sprout.touched'));
  return words.join(', ');
}

/** What a screen reader says of a vine between the sprouts named `u` and `v`. */
export const vineWords = (u: string, v: string, lit: boolean, t: Translate): string =>
  t(lit ? 'diagram.vine.lit' : 'diagram.vine.dark', { u, v });
