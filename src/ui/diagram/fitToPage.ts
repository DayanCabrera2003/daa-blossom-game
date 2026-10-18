import { gardenFit } from '@ui/model/diagramFit';

/**
 * Sizes the garden of a diagram of the Codex so that its whole block (the garden, its controls and
 * its message lines) is seen at once on the page of the book (`ui/model/diagramFit.ts` decides).
 * What the garden must leave room for is measured, never guessed: the page's text area, how far
 * down it the block starts, and every part of the block but the garden and its asides (the help,
 * the whole recipe), which may lie below. Measured again whenever the page or one of those parts
 * changes size, the room kept only grows while the page keeps its size, so a longer message never
 * makes the garden jump back and forth as the reader walks a day.
 */

/** The scrolling text of a book page that holds diagrams. */
const PAGE = '[data-diagram-page]';

/** The parts of a block that may lie below the page shown: they are not kept in sight. */
const ASIDE = 'dg-aside';

/** A length of a computed style in pixels, or 0. */
const pixels = (value: string): number => Number.parseFloat(value) || 0;

/** Fits the garden (or the pair of gardens) of `figure` to the page it is on, and keeps it so. */
export function fitToPage(figure: HTMLElement): void {
  const page = figure.closest<HTMLElement>(PAGE);
  const view = figure.ownerDocument.defaultView;
  const gardens = [
    ...figure.querySelectorAll<SVGSVGElement>(':scope > .dg-svg, :scope > .dg-pair > .dg-svg'),
  ];
  const first = gardens[0];
  if (page === null || view === null || first === undefined) return;
  // The garden's row in the block: the garden itself, or the pair holding two.
  const row = first.parentElement === figure ? first : (first.parentElement ?? first);
  const kept = [...figure.children].filter(
    (part) => part !== row && !part.classList.contains(ASIDE),
  );
  let tallest = 0;
  let pageSize = '';

  const fit = (): void => {
    if (!figure.isConnected) {
      observer.disconnect();
      return;
    }
    const style = view.getComputedStyle(page);
    const area = {
      width: page.clientWidth - pixels(style.paddingLeft) - pixels(style.paddingRight),
      height: page.clientHeight - pixels(style.paddingTop) - pixels(style.paddingBottom),
    };
    // A page of another size (a new zoom, a resized window) starts the room kept anew.
    const size = `${area.width}x${area.height}`;
    if (size !== pageSize) {
      pageSize = size;
      tallest = 0;
    }
    const gap = pixels(view.getComputedStyle(figure).rowGap);
    const heights = kept.map((part) => part.getBoundingClientRect().height).filter((h) => h > 0);
    tallest = Math.max(
      tallest,
      heights.reduce((sum, height) => sum + height + gap, 0),
    );
    const top =
      figure.getBoundingClientRect().top -
      page.getBoundingClientRect().top -
      page.clientTop +
      page.scrollTop -
      pixels(style.paddingTop);
    const root = view.getComputedStyle(figure.ownerDocument.documentElement);
    const fitted = gardenFit({
      page: area,
      top,
      kept: tallest,
      picture: {
        width: pixels(first.style.getPropertyValue('--diagram-width')),
        height: pixels(first.style.getPropertyValue('--diagram-height')),
      },
      unit: pixels(root.getPropertyValue('--zoom')) || 1,
      columns: gardens.length > 1 ? 2 : 1,
      gap: row === first ? 0 : pixels(view.getComputedStyle(row).columnGap),
    });
    for (const garden of gardens) garden.style.width = `${fitted.width}px`;
  };

  const observer = new view.ResizeObserver(fit);
  observer.observe(page);
  for (const part of kept) observer.observe(part);
  fit();
}
