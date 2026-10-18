import type { Translate } from '@services/i18n';
import {
  EPILOGUE_ENTRY,
  EPILOGUE_USES,
  epilogueChoices,
  paragraphsOf,
  type EpilogueChoice,
} from '@ui/model/epilogue';
import { WOOD_PANEL } from '../book/bookFrame';
import { button, make } from '../book/bookParts';
import { openOverlay } from '../overlay';
import type { OverlayFrame } from '../shell';
import '../book/book.css';
import './epilogue.css';

/**
 * The epilogue "Más allá del jardín" (GDD §7; plan 07, phase 11): a sober screen with no puzzle,
 * over the hub at dawn (the canvas stays behind, untouched). On the same wood as the books, a sheet
 * of paper with the title, the three real uses of the garden in its own words, and the author's
 * closing note; under it, the ways on. It shares the books' frame (`ui/overlay.ts`), so it leaves
 * the same three ways: Escape, the button back to the garden, and a press around the paper. What
 * it offers is decided in `ui/model/epilogue.ts`; this module only builds the DOM.
 */

/** Opens the epilogue in the shell's layer, its text in focus so the arrows scroll it. */
export function showEpilogue(frame: OverlayFrame, t: Translate): void {
  const { book, close } = openOverlay(frame, t('epilogue.title'), 'epilogue');
  // The dawn over the hub, instead of the books' dim night.
  book.parentElement?.classList.add('epilogue-backdrop');
  book.style.setProperty('--wood-panel', `url("${WOOD_PANEL}")`);
  const page = book.ownerDocument;

  const title = make(page, 'h2', 'epilogue-title', t('epilogue.title'));
  title.id = 'epilogue-title';

  // The paper: the uses first, then the author's note, set apart by a rule.
  const text = make(page, 'div', 'epilogue-text');
  text.tabIndex = 0;
  text.setAttribute('aria-labelledby', title.id);
  const uses = make(page, 'ul', 'epilogue-uses');
  uses.append(...EPILOGUE_USES.map((key) => make(page, 'li', 'epilogue-use', t(key))));
  const note = make(page, 'section', 'epilogue-note');
  note.append(
    make(page, 'h3', 'epilogue-author', t('epilogue.author.title')),
    ...paragraphsOf(t('epilogue.author.closing')).map((paragraph) =>
      make(page, 'p', 'epilogue-closing', paragraph),
    ),
  );
  text.append(make(page, 'p', 'epilogue-lead', t('epilogue.lead')), uses, note);

  // What each button does: the Codex opens over the epilogue at its last entry; the free mode and
  // the credits are the game's to start once the epilogue is closed; going back closes it, like
  // Escape.
  const act: Readonly<Record<EpilogueChoice, () => void>> = {
    readCodex: () => frame.bus.emit('book.open', { book: 'codex', entry: EPILOGUE_ENTRY }),
    sandbox: () => {
      close();
      frame.bus.emit('sandbox.open');
    },
    credits: () => {
      close();
      frame.bus.emit('credits.open');
    },
    back: close,
  };
  const actions = make(page, 'div', 'epilogue-actions');
  actions.append(make(page, 'p', 'epilogue-keys', t('epilogue.keys')));
  for (const choice of epilogueChoices(frame.codexOpen(frame.saves.get()), frame.capabilities())) {
    const made = button(page, `book-button epilogue-${choice.choice}`, choice.choice, () =>
      act[choice.choice](),
    );
    made.textContent = t(choice.label);
    if (choice.choice === 'back') made.setAttribute('aria-keyshortcuts', 'Escape');
    actions.append(made);
  }

  book.append(title, text, actions);
  text.focus();
}
