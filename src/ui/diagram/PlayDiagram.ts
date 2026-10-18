import type { Translate } from '@services/i18n';
import type { DiagramGarden } from '@ui/model/diagramGarden';
import {
  currentGarden,
  lanternCount,
  passChain,
  resetPlay,
  startPlay,
  touchPlay,
  undoPlay,
  type PlaySession,
} from '@ui/model/diagramPlay';
import type { DiagramSpec } from '@ui/model/diagramSpec';
import { chainOf } from '@ui/model/diagramTouch';
import { helpKeys } from '@ui/model/diagramWords';
import { snapshotOf } from '@ui/model/gardenSnapshot';
import { fitGarden, miniGarden } from '@ui/model/miniGarden';
import { refusalText } from '@ui/model/refusalText';
import { drawGarden, gardenSvg } from './GardenSvg';
import { diagramButton, part } from './parts';
import { keepingFocus, listenForTouches } from './touches';

/**
 * A garden the reader plays on, in the intuition tab of an entry (plan 07, phase 4): touch with the
 * pointer, or move with Tab and touch with Enter or Space. Every touch goes to the session of
 * `ui/model/diagramPlay.ts`, which asks the rules; the garden is drawn again from what they answer,
 * with the lantern count, the reason of a refusal in the game's words, and buttons to pass a chain,
 * undo and start again.
 */

/** The block of a garden to play. */
type PlaySpec = Extract<DiagramSpec, { kind: 'play' }>;

/** Builds the diagram in `hole`, on `garden`, as `spec` asks. */
export function playDiagram(
  hole: HTMLElement,
  garden: DiagramGarden,
  spec: PlaySpec,
  t: Translate,
): void {
  const page = hole.ownerDocument;
  const layout = fitGarden(garden.positions);
  let session: PlaySession = startPlay(garden, spec.moves);

  const figure = part(page, 'figure', 'dg dg-play');
  if (spec.title !== undefined) figure.append(part(page, 'figcaption', 'dg-title', t(spec.title)));
  const svg = gardenSvg(page, t('diagram.garden'));
  const bar = part(page, 'div', 'dg-bar');
  const count = part(page, 'span', 'dg-count');
  count.setAttribute('aria-live', 'polite');
  const pass = diagramButton(page, t('diagram.passChain'), () => update(passChain(session)));
  const undo = diagramButton(page, t('hud.undo'), () => update(undoPlay(session)));
  const reset = diagramButton(page, t('diagram.reset'), () => update(resetPlay(session)));
  bar.append(count, ...(spec.moves.includes('chain') ? [pass] : []), undo, reset);
  const help = part(
    page,
    'p',
    'dg-help',
    helpKeys(spec)
      .map((key) => t(key))
      .join(' '),
  );
  const message = part(page, 'p', 'dg-message');
  message.setAttribute('aria-live', 'polite');
  figure.append(svg, bar, message, help);
  hole.replaceChildren(figure);

  /** Draws the garden as the session has it, keeping the focus on the same sprout or vine. */
  const draw = (): void => keepingFocus(svg, paint);
  const paint = (): void => {
    const now = currentGarden(session);
    const moment = {
      snapshot: snapshotOf(now),
      scarecrows: now.scarecrows,
      stones: now.stones,
    };
    drawGarden(svg, miniGarden(garden, layout, moment, session.touched), {
      sprouts: true,
      vine: (vine) => vine.lit && session.moves.has('split'),
      t,
    });
    count.textContent = t('hud.lanterns', { count: lanternCount(session) });
    pass.disabled = chainOf(session.touched, session.moves) === null;
    undo.disabled = session.history.length === 1;
    reset.disabled = session.history.length === 1 && session.touched.length === 0;
    message.textContent =
      session.refusal === null ? '' : refusalText(session.refusal, garden.names, t);
  };
  const update = (next: PlaySession): void => {
    session = next;
    draw();
  };

  listenForTouches(svg, (target) => update(touchPlay(session, target)));
  draw();
}
