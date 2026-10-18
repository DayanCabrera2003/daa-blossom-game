import type { Translate } from '@services/i18n';
import { coverPicture, coverWords } from '@ui/model/coverPicture';
import { onTheMoons } from '@ui/model/coverPlay';
import type { DiagramGarden } from '@ui/model/diagramGarden';
import type { GardenDiagramSpec } from '@ui/model/diagramSpec';
import { helpKeys } from '@ui/model/diagramWords';
import { fitGarden, miniGarden } from '@ui/model/miniGarden';
import {
  resetPlacing,
  startPlacing,
  touchPlacing,
  undoPlacing,
  type PlacingSession,
} from '@ui/model/placing';
import { drawGarden, gardenSvg } from './GardenSvg';
import { diagramButton, part } from './parts';
import { keepingFocus, listenForTouches } from './touches';

/**
 * The scarecrows of C5 (plan 07, phase 5): a garden of bees and flowers where a touch on a sprout
 * places or takes its scarecrow, "on the moons" sets them where a finished search says, and the
 * count under the buttons tells how much is guarded and what a full guard proves. The session and
 * the picture are `ui/model/placing.ts`, `coverPlay.ts` and `coverPicture.ts`; only sprouts can be touched.
 */
export function coverDiagram(
  hole: HTMLElement,
  garden: DiagramGarden,
  spec: GardenDiagramSpec,
  t: Translate,
): void {
  const page = hole.ownerDocument;
  const layout = fitGarden(garden.positions);
  let session: PlacingSession = startPlacing(garden, 'scarecrow');

  const figure = part(page, 'figure', 'dg dg-cover');
  if (spec.title !== undefined) figure.append(part(page, 'figcaption', 'dg-title', t(spec.title)));
  const svg = gardenSvg(page, t('diagram.garden'));
  const bar = part(page, 'div', 'dg-bar');
  const moons = diagramButton(page, t('diagram.cover.moons'), () => update(onTheMoons(session)));
  const undo = diagramButton(page, t('hud.undo'), () => update(undoPlacing(session)));
  const reset = diagramButton(page, t('diagram.reset'), () => update(resetPlacing(session)));
  bar.append(moons, undo, reset);
  const told = part(page, 'div', 'dg-step');
  told.setAttribute('aria-live', 'polite');
  const help = part(
    page,
    'p',
    'dg-help',
    helpKeys(spec)
      .map((key) => t(key))
      .join(' '),
  );
  figure.append(svg, bar, told, help);
  hole.replaceChildren(figure);

  /** Draws the garden and its count as the session has them. */
  const paint = (): void => {
    const picture = coverPicture(layout, session);
    drawGarden(
      svg,
      miniGarden(garden, layout, picture.moment),
      { sprouts: true, vine: () => false, t },
      picture.overlay,
    );
    told.replaceChildren(...coverWords(picture.count, t).map((line) => part(page, 'p', '', line)));
    undo.disabled = session.history.length === 1;
    reset.disabled = session.history.length === 1;
  };
  const update = (next: PlacingSession): void => {
    session = next;
    keepingFocus(svg, paint);
  };

  listenForTouches(svg, (target) => {
    if (target.kind === 'sprout') update(touchPlacing(session, target.vertex));
  });
  paint();
}
