/**
 * The lantern the page draws in CSS before its script arrives (plan 09, phase 9; `index.html`):
 * it beats on the dark page while the script downloads and the pixel font loads, and goes once the
 * canvas draws its own loading bar, in the same place and tones.
 */

/** The id of the lantern's element in `index.html`. */
export const PAGE_LOADER_ID = 'page-loader';

/** The one call of the page the lantern needs to be found. */
export interface LoaderPage {
  getElementById(id: string): { remove(): void } | null;
}

/** Takes the lantern off the page; a page without it (already gone) is left as it is. */
export function dismissPageLoader(page: LoaderPage): void {
  page.getElementById(PAGE_LOADER_ID)?.remove();
}
