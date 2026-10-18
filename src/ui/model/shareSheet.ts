import type { ImportRejection } from '@levels/sandbox/importText';
import { MAX_IMPORT_LENGTH, MAX_SPROUTS, MAX_VINES } from '@levels/sandbox/limits';
import type { ShareRequest } from '@services/busEvents';
import type { ExportedFile } from '@services/exportLog';
import type { Translate } from '@services/i18n';

/**
 * What the free mode's share sheet shows (plan 08, phase 14), decided without the DOM: the garden's
 * code, the link that opens the free mode with it (`?garden=`, read by `services/startGarden.ts`),
 * and its level file to download under a safe name; or, with no garden yet, only the way to open
 * one. And why a text opened there is no garden, in the garden's words.
 */

/** A garden ready to share, as the sheet shows it. */
export interface SharedGardenView {
  readonly code: string;
  readonly link: string;
  /** The level file to download; null when the garden makes none. */
  readonly file: ExportedFile | null;
}

/** What the sheet shows: the garden to share, if any (opening a garden is always offered). */
export interface ShareSheetView {
  readonly garden: SharedGardenView | null;
}

/** Every text of the sheet but the reasons, for the content checks. */
export const SHARE_TEXTS = [
  'share.title',
  'share.code',
  'share.codeHint',
  'share.link',
  'share.linkHint',
  'share.copy',
  'share.copied',
  'share.copyFailed',
  'share.download',
  'share.downloadHint',
  'share.empty',
  'share.import',
  'share.paste',
  'share.open',
  'share.file',
  'share.pasteEmpty',
  'share.fileUnread',
  'share.close',
  'share.keys',
  'share.done',
] as const;

/** The longest code a file's name keeps, so the whole name stays within 40 characters. */
const NAME_CODE_LENGTH = 40 - 'jardin-.json'.length;

/**
 * The address that opens the free mode with the garden of `code`: where the game is served now
 * (its origin and path), with the code as the only thing asked, so a level or teacher mode of the
 * sharer's own address never travels with it.
 */
export function gardenLink(pageHref: string, code: string): string {
  const url = new URL(pageHref);
  return `${url.origin}${url.pathname}?garden=${encodeURIComponent(code)}`;
}

/** A safe name for the garden's file: its code's letters, digits, `-` and `_`, cut short. */
export function gardenFilename(code: string): string {
  const safe = code.replace(/[^A-Za-z0-9_-]/g, '').slice(0, NAME_CODE_LENGTH);
  return safe === '' ? 'jardin.json' : `jardin-${safe}.json`;
}

/** What the sheet shows for the garden the editor shares, served at `pageHref`. */
export function shareSheet(request: ShareRequest, pageHref: string): ShareSheetView {
  const { code, json } = request;
  if (code === null) return { garden: null };
  return {
    garden: {
      code,
      link: gardenLink(pageHref, code),
      file:
        json === null
          ? null
          : { filename: gardenFilename(code), type: 'application/json', text: json },
    },
  };
}

/** Whether a chosen file of `size` bytes may be read: a longer one is refused unread. */
export const fileFitsImport = (size: number): boolean => size <= MAX_IMPORT_LENGTH;

/** Why a text opened in the sheet is no garden, with the limit it ran into when it is a count. */
export function importReasonText(reason: ImportRejection, t: Translate): string {
  const key = `share.reason.${reason}`;
  if (reason === 'tooMany') return t(key, { max: MAX_SPROUTS });
  if (reason === 'tooManyVines') return t(key, { max: MAX_VINES });
  return t(key);
}
