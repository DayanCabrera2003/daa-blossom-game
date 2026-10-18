import { describe, expect, it } from 'vitest';
import strings from '../src/content/es/strings.json';
import { estimatedButtonWidth, toolbarRow, traceButtonLeft } from '../src/game/picture/bottomRows';
import { iconRoom, TOOL_ICONS } from '../src/game/picture/buttonIcon';
import { fontMetrics } from '../src/game/picture/pixelFont';
import { outlinedNameBox } from '../src/game/picture/sproutName';
import { availableTools } from '../src/game/input/tools';
import { LAYOUT } from '../src/game/view/layout';
import { catalog } from '../src/levels/catalog';
import { labelBox } from '../src/levels/layoutChecks';
import { boxesNear, type Box } from '../src/levels/plane';
import { isUiUnlocked } from '../src/levels/uiUnlocks';
import { createTranslator } from '../src/services/i18n';

// Every sprout's name is drawn with a dark outline a pixel wide (plan 09, phase 2), so that it reads
// over the vines. In the real catalog, the outlined name still keeps off the letters of every
// other name, under the top bar, and off the wood of every button of the toolbar the level shows
// (its tools, with the real words, and the teacher's trace button at the end of the row).

const t = createTranslator(strings);

/** A button's wood: from a pixel above its row, a line of text and a pixel each side tall. */
const buttonBox = (left: number, width: number): Box => ({
  left,
  right: left + width,
  top: LAYOUT.toolbarY - 1,
  bottom: LAYOUT.toolbarY - 1 + fontMetrics(8).fontSize + 2,
});

describe('the outlined names of the sprouts in the catalog', () => {
  const levels = catalog();

  it.each(levels.map((level) => [level.data.id, level] as const))(
    'level %s: every outlined name keeps off the other names, the top bar and the toolbar',
    (id, level) => {
      const { sprouts } = level.data;
      const tools = availableTools(level.start.allowed, isUiUnlocked('layers', id));
      const widths = tools.map(
        (tool) => estimatedButtonWidth(t(`tool.${tool}`)) + iconRoom(TOOL_ICONS[tool] ?? []),
      );
      const trace = estimatedButtonWidth(t('hud.trace'));
      const toolbar = [
        ...toolbarRow(widths).map((left, i) => buttonBox(left, widths[i] ?? 0)),
        buttonBox(traceButtonLeft(trace), trace),
      ];
      for (const sprout of sprouts) {
        const outlined = outlinedNameBox(sprout);
        for (const other of sprouts) {
          if (other === sprout) continue;
          expect(boxesNear(outlined, labelBox(other), 0), `${sprout.label} on ${other.label}`).toBe(
            false,
          );
        }
        expect(outlined.top).toBeGreaterThanOrEqual(LAYOUT.garden.y);
        for (const button of toolbar)
          expect(boxesNear(outlined, button, 0), `${sprout.label} on the toolbar`).toBe(false);
      }
    },
  );
});
