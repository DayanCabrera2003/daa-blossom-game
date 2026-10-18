import type { VertexId } from '@core/graph/types';
import type { Translate } from '@services/i18n';
import { cutPicture } from '@ui/model/cutPicture';
import { clearCut, showChain, startCut, touchCut, type CutSession } from '@ui/model/cutPlay';
import { cutWords } from '@ui/model/cutWords';
import type { DiagramGarden } from '@ui/model/diagramGarden';
import type { GardenDiagramSpec } from '@ui/model/diagramSpec';
import { helpKeys } from '@ui/model/diagramWords';
import { fitGarden, MINI, miniGarden } from '@ui/model/miniGarden';
import { LOOK_ONLY, drawGarden, gardenSvg } from './GardenSvg';
import { diagramButton, part } from './parts';
import { shape } from './svgShape';
import { keepingFocus, listenForTouches } from './touches';

/**
 * The cut at the flower of C8 (plan 07, phase 5): the open garden of 4.11 and the same garden with
 * its flower folded, side by side. The reader draws a chain on the open one, touching sprout by
 * sprout, or asks to be shown one; once it ends in the dark, its stretch up to the flower lights up
 * in both, and the argument of the flower lemma is told under the buttons. Only the sprouts of the
 * open garden can be touched.
 */
export function cutDiagram(
  hole: HTMLElement,
  garden: DiagramGarden,
  flower: readonly VertexId[],
  spec: GardenDiagramSpec,
  t: Translate,
): void {
  const page = hole.ownerDocument;
  const layout = fitGarden(garden.positions, MINI.width / 2);
  let session: CutSession = startCut();

  const figure = part(page, 'figure', 'dg dg-cut');
  if (spec.title !== undefined) figure.append(part(page, 'figcaption', 'dg-title', t(spec.title)));
  const pair = part(page, 'div', 'dg-pair');
  const open = gardenSvg(page, t('diagram.cut.open'));
  const folded = gardenSvg(page, t('diagram.cut.folded'));
  pair.append(open, folded);
  const bar = part(page, 'div', 'dg-bar');
  const show = diagramButton(page, t('diagram.cut.show'), () => update(showChain(garden, flower)));
  const clear = diagramButton(page, t('diagram.cut.clear'), () => update(clearCut()));
  bar.append(show, clear);
  const told = part(page, 'p', 'dg-step');
  told.setAttribute('aria-live', 'polite');
  const help = part(
    page,
    'p',
    'dg-help',
    helpKeys(spec)
      .map((key) => t(key))
      .join(' '),
  );
  figure.append(pair, bar, told, help);
  hole.replaceChildren(figure);

  /** Writes the name of a garden of the pair in its corner. */
  const caption = (svg: SVGSVGElement, key: string): void => {
    const text = shape(page, 'text', { class: 'dg-caption', x: 3, y: 11 });
    text.textContent = t(key);
    svg.append(text);
  };

  /** Draws both gardens and the words as the session has them. */
  const paint = (): void => {
    const picture = cutPicture(garden, layout, flower, session);
    drawGarden(
      open,
      miniGarden(garden, layout, picture.open.moment, session.drawn),
      { sprouts: true, vine: () => false, t },
      picture.open.overlay,
    );
    caption(open, 'diagram.cut.open');
    drawGarden(
      folded,
      miniGarden(garden, layout, picture.folded.moment),
      { ...LOOK_ONLY, t },
      picture.folded.overlay,
    );
    caption(folded, 'diagram.cut.folded');
    told.textContent = cutWords(session, garden.names, t);
    clear.disabled = session.drawn.length === 0;
  };
  const update = (next: CutSession): void => {
    session = next;
    keepingFocus(open, paint);
  };

  listenForTouches(open, (target) => {
    if (target.kind === 'sprout') update(touchCut(session, garden, flower, target.vertex));
  });
  paint();
}
