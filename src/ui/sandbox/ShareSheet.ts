import strings from '@content/es/strings.json';
import { download } from '@services/download';
import type { ImportAnswer, ShareRequest } from '@services/busEvents';
import { createTranslator, type Translate } from '@services/i18n';
import {
  fileFitsImport,
  importReasonText,
  shareSheet,
  type SharedGardenView,
} from '@ui/model/shareSheet';
import { WOOD_PANEL } from '../book/bookFrame';
import { button, make } from '../book/bookParts';
import { openOverlay } from '../overlay';
import type { OverlayFrame, ShareModule } from '../shell';
import '../book/book.css';
import './share.css';

/**
 * The free mode's share sheet (plan 08, phase 14), in its own deferred chunk, on the frame and the
 * wood every book shares (`ui/overlay.ts`), so it leaves the same three ways: Escape, the button
 * back to the editor, and a press around the paper. On the paper, for a garden: its code and its
 * link, each in a field that selects itself, with a button that copies it (and says so; if the
 * clipboard refuses, the text stays selected to copy by hand), and the button that downloads its
 * level file. Under them, always, a box to paste a code or a level file into, or a file to choose,
 * opened as the editor's new garden: the text travels to the game as it was written, the game reads
 * it and answers at once, and the sheet either closes or says kindly why that is no garden. What it
 * shows is decided in `ui/model/shareSheet.ts`; this module only builds the DOM.
 */

/** The sheet's texts, in the only language written. */
const t = createTranslator(strings);

/** How long a copy button says "¡Copiado!" before it offers to copy again. */
const COPIED_MS = 1500;

export const showShare: ShareModule['showShare'] = (request, frame) =>
  showShareSheet(request, frame, t);

/** Opens the share sheet for the garden of `request`, its first control in focus. */
function showShareSheet(request: ShareRequest, frame: OverlayFrame, t: Translate): void {
  const { book, close } = openOverlay(frame, t('share.title'), 'share');
  book.style.setProperty('--wood-panel', `url("${WOOD_PANEL}")`);
  const page = book.ownerDocument;
  const view = shareSheet(request, page.location.href);

  // One line that says what just happened (copied, refused…), read out by screen readers.
  const status = make(page, 'p', 'share-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const say = (text: string, trouble = false): void => {
    status.textContent = text;
    status.classList.toggle('share-trouble', trouble);
  };

  const paper = make(page, 'div', 'share-paper');
  if (view.garden === null) paper.append(make(page, 'p', 'share-empty', t('share.empty')));
  else paper.append(...gardenParts(page, view.garden, frame, t, say));
  const opening = openingPart(page, frame, t, say, close);
  paper.append(opening.part);

  const actions = make(page, 'div', 'share-actions');
  const back = button(page, 'book-button share-back', 'back', close);
  back.textContent = t('share.close');
  back.setAttribute('aria-keyshortcuts', 'Escape');
  actions.append(make(page, 'p', 'share-keys', t('share.keys')), back);

  book.append(make(page, 'h2', 'share-title', t('share.title')), paper, status, actions);
  // The first thing to do: copy the code, or, with nothing to share, paste a garden.
  (paper.querySelector<HTMLElement>('.share-copy') ?? opening.paste).focus();
}

/** A field and its label, from a key and an id. */
function labelled(page: Document, id: string, label: string, field: HTMLElement): HTMLElement {
  const text = make(page, 'label', 'share-label', label);
  text.htmlFor = id;
  field.id = id;
  return text;
}

/** The parts of the sheet that share the garden: its code, its link and its file. */
function gardenParts(
  page: Document,
  garden: SharedGardenView,
  frame: OverlayFrame,
  t: Translate,
  say: (text: string, trouble?: boolean) => void,
): HTMLElement[] {
  /** A read-only field holding `value`, which selects itself, with a button that copies it. */
  const copyable = (id: string, label: string, hint: string, value: string): HTMLElement => {
    const field = make(page, 'input', 'share-field');
    field.readOnly = true;
    field.value = value;
    field.spellcheck = false;
    field.addEventListener('focus', () => field.select());
    const copy = button(page, 'book-button share-copy', id, () => {
      frame.bus.emit('sound', 'click');
      copyText(field, copy, t, say);
    });
    copy.textContent = t('share.copy');
    const row = make(page, 'div', 'share-row');
    row.append(field, copy);
    const part = make(page, 'section', 'share-part');
    part.append(labelled(page, id, label, field), row, make(page, 'p', 'share-hint', hint));
    return part;
  };
  const parts = [
    copyable('share-code', t('share.code'), t('share.codeHint'), garden.code),
    copyable('share-link', t('share.link'), t('share.linkHint'), garden.link),
  ];
  const { file } = garden;
  if (file !== null) {
    const save = button(page, 'book-button share-download', 'download', () => {
      frame.bus.emit('sound', 'click');
      download(file);
    });
    save.textContent = t('share.download');
    const part = make(page, 'section', 'share-part');
    part.append(save, make(page, 'p', 'share-hint', t('share.downloadHint')));
    parts.push(part);
  }
  return parts;
}

/**
 * Copies the text of `field` to the clipboard and says so on its button; where the clipboard is
 * missing or refuses (an insecure page, a denied permission), the text stays selected in its field
 * to be copied by hand.
 */
function copyText(
  field: HTMLInputElement,
  copy: HTMLButtonElement,
  t: Translate,
  say: (text: string, trouble?: boolean) => void,
): void {
  field.select();
  const byHand = (): void => {
    field.focus();
    field.select();
    say(t('share.copyFailed'), true);
  };
  const clipboard = field.ownerDocument.defaultView?.navigator.clipboard;
  if (clipboard === undefined) {
    byHand();
    return;
  }
  clipboard.writeText(field.value).then(() => {
    copy.textContent = t('share.copied');
    say(t('share.copied'));
    setTimeout(() => (copy.textContent = t('share.copy')), COPIED_MS);
  }, byHand);
}

/**
 * The part that opens a garden: a box to paste a code or a level file into, a button to choose a
 * file instead, and the one that opens what was pasted (also Ctrl+Enter in the box).
 */
function openingPart(
  page: Document,
  frame: OverlayFrame,
  t: Translate,
  say: (text: string, trouble?: boolean) => void,
  close: () => void,
): { part: HTMLElement; paste: HTMLTextAreaElement } {
  const paste = make(page, 'textarea', 'share-paste');
  paste.rows = 3;
  paste.spellcheck = false;
  paste.placeholder = t('share.paste');

  /** Hands a text to the game and closes the sheet on a garden, or says why it is none. */
  const open = (text: string): void => {
    if (text.trim() === '') {
      say(t('share.pasteEmpty'), true);
      paste.focus();
      return;
    }
    // The game reads the text and answers at once, before `emit` returns.
    const answers: ImportAnswer[] = [];
    const stop = frame.bus.on('sandbox.importAnswer', (answer) => answers.push(answer));
    frame.bus.emit('sandbox.imported', { text });
    stop();
    const answer = answers[0];
    if (answer === undefined) return;
    if (answer.ok) {
      close();
      return;
    }
    say(importReasonText(answer.reason, t), true);
  };

  paste.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      open(paste.value);
    }
  });

  // The file chooser is the browser's own, hidden behind a button of the book.
  const chooser = make(page, 'input', 'share-chooser');
  chooser.type = 'file';
  chooser.accept = '.json,application/json,text/plain';
  chooser.hidden = true;
  chooser.addEventListener('change', () => {
    const chosen = chooser.files?.[0];
    // Cleared, so choosing the same file again reads it again.
    chooser.value = '';
    if (chosen === undefined) return;
    if (!fileFitsImport(chosen.size)) {
      say(importReasonText('tooLong', t), true);
      return;
    }
    chosen.text().then(open, () => say(t('share.fileUnread'), true));
  });
  const choose = button(page, 'book-button share-choose', 'choose', () => chooser.click());
  choose.textContent = t('share.file');
  const go = button(page, 'book-button share-open', 'open', () => {
    frame.bus.emit('sound', 'click');
    open(paste.value);
  });
  go.textContent = t('share.open');
  go.setAttribute('aria-keyshortcuts', 'Control+Enter');

  const row = make(page, 'div', 'share-row share-opening');
  row.append(choose, go);
  const part = make(page, 'section', 'share-part share-import');
  part.append(labelled(page, 'share-paste', t('share.import'), paste), paste, row, chooser);
  return { part, paste };
}
