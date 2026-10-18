import strings from '../../src/content/es/strings.json';
import { estimatedButtonWidth } from '../../src/game/picture/bottomRows';
import type { Rect } from '../../src/game/picture/boxDistance';
import { BOOK_ICON, iconRoom } from '../../src/game/picture/buttonIcon';
import { chapterTitle } from '../../src/game/picture/chapterTitle';
import { hubCounter } from '../../src/game/picture/hubCounter';
import { flowerBox, HUB_HEAD, signBox } from '../../src/game/picture/hubGarden';
import { HUB, layoutHub } from '../../src/game/picture/hubLayout';
import { hubTopLine } from '../../src/game/picture/hubTopLine';
import { BUTTON_HEIGHT } from '../../src/game/picture/panelLayout';
import { labelSeal } from '../../src/game/picture/signSeal';
import { labelStars } from '../../src/game/picture/starIcon';
import { catalog } from '../../src/levels/catalog';
import { createTranslator } from '../../src/services/i18n';
import { catalogEntries, visibleLevels } from '../../src/services/progress';

// The hub as `HubScene` lays it out with the real catalog and the real words, every level at
// three stars (the widest buttons) and the counter at its widest: the boxes of the top line, the
// titles and the buttons, and each chapter's flower column and signpost. The tests of what grows
// in the hub (the secret flowers, the cosmetics) keep clear of these.

export const t = createTranslator(strings);
export const entries = catalogEntries(catalog());
/** The width the pixel font gives a text. */
export const text = (words: string): number => estimatedButtonWidth(words) - 4;

/** A chapter's flower column and signpost. */
export interface Place {
  readonly cell: Rect;
  readonly sign: Rect;
}

/** The hub's boxes and each chapter's flower column and signpost, as `HubScene` lays them out. */
export function hubOf(teacherMode: boolean): { boxes: Rect[]; signs: Map<string, Place> } {
  const shown = visibleLevels(entries, teacherMode);
  const chapters = [...new Set(shown.map((level) => level.id.split('.')[0] ?? ''))];
  const widths = chapters.map((chapter) =>
    shown
      .filter((level) => level.id.startsWith(`${chapter}.`))
      .map(({ id }) => estimatedButtonWidth(`${id} ${' '.repeat(labelStars(3).spaces)}`)),
  );
  const titles = chapters.map((chapter) => {
    const title = chapterTitle(chapter);
    return text(t(title.key, title.params)) + HUB_HEAD;
  });
  const layout = layoutHub(widths, BUTTON_HEIGHT, titles);
  const top = hubTopLine({
    title: text(t('hub.title')),
    badge: teacherMode ? text(t('teacher.badge')) : null,
    counter: hubCounter(999, 99, 8).width,
    gear: 13,
    signs: [
      estimatedButtonWidth(t('hub.codex') + ' '.repeat(labelSeal(t('codex.new')).spaces)) +
        iconRoom([BOOK_ICON]),
      estimatedButtonWidth(t('hub.notebook')),
    ],
    signHeight: BUTTON_HEIGHT,
  });
  const boxes: Rect[] = [top.title, top.counter, top.gear, ...top.signs];
  if (top.badge !== null) boxes.push(top.badge);
  const signs = new Map<string, Place>();
  layout.chapters.forEach(({ titleY, buttons }, c) => {
    const chapter = chapters[c] ?? '';
    signs.set(chapter, {
      cell: flowerBox(titleY, BUTTON_HEIGHT),
      sign: signBox(titleY, BUTTON_HEIGHT),
    });
    boxes.push({
      x: HUB.margin + HUB_HEAD,
      y: titleY,
      width: (titles[c] ?? 0) - HUB_HEAD,
      height: BUTTON_HEIGHT - 2,
    });
    buttons.forEach(({ x, y }, b) =>
      boxes.push({ x, y: y - 1, width: widths[c]?.[b] ?? 0, height: BUTTON_HEIGHT }),
    );
  });
  return { boxes, signs };
}
