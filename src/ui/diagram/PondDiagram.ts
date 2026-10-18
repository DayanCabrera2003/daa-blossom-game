import { size } from '@core/matching/queries';
import type { Matching } from '@core/matching/types';
import type { Translate } from '@services/i18n';
import type { DiagramGarden } from '@ui/model/diagramGarden';
import type { GardenDiagramSpec } from '@ui/model/diagramSpec';
import { helpKeys } from '@ui/model/diagramWords';
import { fitGarden, miniGarden } from '@ui/model/miniGarden';
import { POND_VIEWS, pondPicture, pondPieces, type PondView } from '@ui/model/pondPicture';
import { pondWords } from '@ui/model/pondWords';
import { LOOK_ONLY, drawGarden, gardenSvg } from './GardenSvg';
import { part } from './parts';
import { viewButtons } from './viewButtons';

/**
 * The pond of C3 (plan 07, phase 5): the garden of a level of chapter 2 with your lanterns, the
 * reflection's, both at once, or the tangle parted into its threads and loops, chosen with the
 * buttons right under it, and what each view counts told below. What each view shows and says is
 * decided in `ui/model/pondPicture.ts` and `pondWords.ts`.
 */
export function pondDiagram(
  hole: HTMLElement,
  garden: DiagramGarden,
  mirror: Matching,
  spec: GardenDiagramSpec,
  t: Translate,
): void {
  const page = hole.ownerDocument;
  const layout = fitGarden(garden.positions);
  const pieces = pondPieces(garden.start.matching, mirror);
  const lanterns = { yours: size(garden.start.matching), mirror: size(mirror) };

  const figure = part(page, 'figure', 'dg dg-pond');
  if (spec.title !== undefined) figure.append(part(page, 'figcaption', 'dg-title', t(spec.title)));
  const svg = gardenSvg(page, t('diagram.garden'));
  const views = viewButtons(
    page,
    POND_VIEWS.map((view) => ({ id: view, label: t(`diagram.pond.${view}`) })),
    (view) => show(view as PondView),
  );
  const told = part(page, 'div', 'dg-step');
  told.setAttribute('aria-live', 'polite');
  const help = part(
    page,
    'p',
    'dg-help dg-aside',
    helpKeys(spec)
      .map((key) => t(key))
      .join(' '),
  );
  figure.append(svg, views.bar, told, help);
  hole.replaceChildren(figure);

  /** Shows the pond in `view`. */
  const show = (view: PondView): void => {
    const picture = pondPicture(garden, layout, view, mirror);
    drawGarden(
      svg,
      miniGarden(garden, layout, picture.moment),
      { ...LOOK_ONLY, t },
      picture.overlay,
    );
    views.choose(view);
    told.replaceChildren(
      ...pondWords(view, pieces, lanterns, garden.names, t).map((line) =>
        part(page, 'p', '', line),
      ),
    );
  };
  show('yours');
}
