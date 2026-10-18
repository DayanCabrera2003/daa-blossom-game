import type { Translate } from '@services/i18n';
import type { DiagramGarden } from '@ui/model/diagramGarden';
import type { GardenDiagramSpec } from '@ui/model/diagramSpec';
import { helpKeys } from '@ui/model/diagramWords';
import { fitGarden, miniGarden, type MiniLayout, type MiniMoment } from '@ui/model/miniGarden';
import type { Overlay } from '@ui/model/overlay';
import {
  resetPlacing,
  startPlacing,
  touchPlacing,
  undoPlacing,
  type PlacedPiece,
  type PlacingSession,
} from '@ui/model/placing';
import { drawGarden, gardenSvg } from './GardenSvg';
import { diagramButton, part } from './parts';
import { keepingFocus, listenForTouches } from './touches';

/** What a garden of pieces is: its piece, the button that sets them from a search, its picture. */
export interface PlacingKind {
  readonly piece: PlacedPiece;
  /** The text key of the button that sets the pieces where a finished search says. */
  readonly certify: string;
  /** The pieces set where a finished search says. */
  readonly certified: (session: PlacingSession) => PlacingSession;
  /** What the garden wears and marks, and what is said under it. */
  readonly picture: (
    layout: MiniLayout,
    session: PlacingSession,
    t: Translate,
  ) => { readonly moment: MiniMoment; readonly overlay: Overlay; readonly words: string[] };
}

/**
 * A garden where the reader places pieces (plan 07, phase 5): the scarecrows of C5 and the stones
 * of C12. A touch on a sprout places its piece or takes it back, a button sets them where a
 * finished search says (on its moons), and the count under the buttons tells what they prove.
 * The session is `ui/model/placing.ts`; what each kind shows and says comes with its `kind`. Only
 * sprouts can be touched.
 */
export function placingDiagram(
  hole: HTMLElement,
  garden: DiagramGarden,
  spec: GardenDiagramSpec,
  kind: PlacingKind,
  t: Translate,
): void {
  const page = hole.ownerDocument;
  const layout = fitGarden(garden.positions);
  let session: PlacingSession = startPlacing(garden, kind.piece);

  const figure = part(page, 'figure', `dg dg-${spec.kind}`);
  if (spec.title !== undefined) figure.append(part(page, 'figcaption', 'dg-title', t(spec.title)));
  const svg = gardenSvg(page, t('diagram.garden'));
  const bar = part(page, 'div', 'dg-bar');
  const certify = diagramButton(page, t(kind.certify), () => update(kind.certified(session)));
  const undo = diagramButton(page, t('hud.undo'), () => update(undoPlacing(session)));
  const reset = diagramButton(page, t('diagram.reset'), () => update(resetPlacing(session)));
  bar.append(certify, undo, reset);
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
    const picture = kind.picture(layout, session, t);
    drawGarden(
      svg,
      miniGarden(garden, layout, picture.moment),
      { sprouts: true, vine: () => false, t },
      picture.overlay,
    );
    told.replaceChildren(...picture.words.map((line) => part(page, 'p', '', line)));
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
