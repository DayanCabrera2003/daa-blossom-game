import type { VertexId } from '@core/graph/types';
import type { Action } from '@core/rules/actions';
import { itemAt } from '@core/shared/itemAt';
import type { Translate } from '@services/i18n';
import type { PlayRefusal } from './diagramPlay';

/**
 * Why the rules refused a move in a garden of the Codex, as the reader reads it: the very text the
 * game shows for that reason (GDD §2.10, "lo rechaza y explica por qué"), with the names of the
 * sprouts involved. The game's own `reasonText` lives where the books may not reach, so this is
 * its counterpart for the reasons of the rules alone; `tests/refusalText.test.ts` holds the two
 * to the same words.
 */

/** The sprouts a refused move went through, in order: its chain, stem or loop. */
const sequenceOf = (action: Action): readonly VertexId[] =>
  action.type === 'chain'
    ? action.path
    : action.type === 'rotateStem'
      ? action.stem
      : action.type === 'fold'
        ? action.loop
        : [];

/** The text of a refusal, sprouts named by `names`. */
export function refusalText(
  { reason, action }: PlayRefusal,
  names: readonly string[],
  t: Translate,
): string {
  const name = (v: VertexId): string => names[v] ?? String(v);
  const sequence = sequenceOf(action);
  const at = (index: number): string => name(itemAt(sequence, index % sequence.length));
  switch (reason.code) {
    case 'actionLocked':
    case 'actionClosed':
      return t(`reason.${reason.code}`, { action: t(`action.${reason.action}`) });
    case 'notAdjacent':
    case 'notLit':
    case 'litVine':
    case 'sunMeetsSun':
    case 'notSunsOfOneTree':
    case 'lightAtFlower':
      return t(`reason.${reason.code}`, { u: name(reason.u), v: name(reason.v) });
    case 'alreadyLit':
    case 'notInTheDark':
    case 'notARoot':
    case 'noLanternToPass':
    case 'alreadyInspected':
    case 'vineHidden':
    case 'notASun':
    case 'alreadyMarked':
    case 'alreadyPlaced':
    case 'notPlaced':
      return t(`reason.${reason.code}`, { vertex: name(reason.vertex) });
    case 'invalidPath': {
      const error = reason.error;
      const key = `reason.invalidPath.${error.code}`;
      switch (error.code) {
        case 'repeatedVertex':
        case 'endpointNotExposed':
          return t(key, { vertex: name(error.vertex) });
        case 'notAdjacent':
        case 'notAlternating':
          return t(key, { u: at(error.index), v: at(error.index + 1) });
        default:
          return t(key);
      }
    }
    case 'notAFlower': {
      const error = reason.error;
      const key = `reason.notAFlower.${error.code}`;
      switch (error.code) {
        case 'evenLength':
          return t(key, { length: error.length });
        case 'repeatedVertex':
        case 'notAlternating':
          return t(key, { vertex: at(error.index) });
        case 'notAdjacent':
          return t(key, { u: at(error.index), v: at(error.index + 1) });
        default:
          return t(key);
      }
    }
    default:
      return t(`reason.${reason.code}`);
  }
}
