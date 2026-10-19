import strings from '../../src/content/es/strings.json';
import {
  bottomRow,
  estimatedButtonWidth,
  HUD_BUTTONS,
  ordersRow,
  toolbarRow,
  traceButtonLeft,
} from '../../src/game/picture/bottomRows';
import type { Rect } from '../../src/game/picture/boxDistance';
import { BOOK_ICON, iconRoom, TOOL_ICONS } from '../../src/game/picture/buttonIcon';
import { BUTTON_HEIGHT } from '../../src/game/picture/panelLayout';
import { availableTools } from '../../src/game/input/tools';
import { GEAR_SIZE } from '../../src/game/view/GearButton';
import { LAYOUT } from '../../src/game/view/layout';
import type { catalog } from '../../src/levels/catalog';
import { isUiUnlocked } from '../../src/levels/uiUnlocks';
import { createTranslator } from '../../src/services/i18n';

// The buttons of a level's HUD as `HudView`, `ToolbarView` and the settings' gear lay them out,
// with the real words: the level's tools along the toolbar (and at its end the teacher's trace and,
// where the light searches by itself, "Avanzar la luz"),
// and along the bottom row the gear, the Códex and every HUD button (each keeps its place even
// while hidden). Each button's box is its wood: a pixel above its row, a line of text tall.

const t = createTranslator(strings);

/** A level of the catalog. */
type Level = ReturnType<typeof catalog>[number];

/** A button of the HUD: what it is, for the messages, and its wood. */
export interface HudBox {
  readonly id: string;
  readonly box: Rect;
}

/** A button's wood whose label starts at `left` on the row written at `y`. */
const wood = (left: number, y: number, width: number): Rect => ({
  x: left,
  y: y - 1,
  width,
  height: BUTTON_HEIGHT,
});

/** The buttons of `level`'s HUD, in teacher mode or not. */
export function hudBoxes(level: Level, teacher: boolean): HudBox[] {
  const tools = availableTools(level.start.allowed, isUiUnlocked('layers', level.data.id));
  const toolWidths = tools.map(
    (tool) => estimatedButtonWidth(t(`tool.${tool}`)) + iconRoom(TOOL_ICONS[tool] ?? []),
  );
  const boxes: HudBox[] = toolbarRow(toolWidths).map((left, i) => ({
    id: `tool ${tools[i] ?? ''}`,
    box: wood(left, LAYOUT.toolbarY, toolWidths[i] ?? 0),
  }));
  const trace = estimatedButtonWidth(t('hud.trace'));
  const light = estimatedButtonWidth(t('hud.stepLight'));
  if (level.start.allowed.has('stepLight')) {
    const [traceLeft = 0, lightLeft = 0] = ordersRow([trace, light]);
    boxes.push({ id: 'light', box: wood(lightLeft, LAYOUT.toolbarY, light) });
    if (teacher) boxes.push({ id: 'trace', box: wood(traceLeft, LAYOUT.toolbarY, trace) });
  } else if (teacher) {
    boxes.push({ id: 'trace', box: wood(traceButtonLeft(trace), LAYOUT.toolbarY, trace) });
  }
  const book = estimatedButtonWidth(t('hud.book')) + iconRoom([BOOK_ICON]);
  const buttons = HUD_BUTTONS.map((name) => estimatedButtonWidth(t(`hud.${name}`)));
  const row = bottomRow({ gear: GEAR_SIZE, book, trace: null, buttons });
  boxes.push({
    id: 'gear',
    box: { x: LAYOUT.margin, y: LAYOUT.bottomY - 1, width: GEAR_SIZE, height: GEAR_SIZE },
  });
  boxes.push({ id: 'book', box: wood(row.book, LAYOUT.bottomY, book) });
  HUD_BUTTONS.forEach((name, i) => {
    boxes.push({ id: name, box: wood(row.buttons[i] ?? 0, LAYOUT.bottomY, buttons[i] ?? 0) });
  });
  return boxes;
}
