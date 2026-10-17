import { describe, expect, it } from 'vitest';
import {
  BUTTON_HEIGHT,
  flowButtons,
  notebookLayout,
  PANEL,
  QUESTION_PANEL,
  questionLayout,
  TUTORIAL_PANEL,
  tutorialLayout,
} from './panelLayout';
import { LINE_HEIGHT } from './textWrap';

describe('how the panels lay out their texts and buttons', () => {
  it('flows buttons left to right and wraps them at the right edge', () => {
    const { positions, bottom } = flowButtons([30, 30, 30], 10, 100, 4, 50);
    expect(positions).toEqual([
      { x: 10, y: 50 },
      { x: 44, y: 50 },
      { x: 10, y: 50 + BUTTON_HEIGHT + 4 },
    ]);
    expect(bottom).toBe(50 + 2 * BUTTON_HEIGHT + 4);
  });

  it('a button wider than the row still gets a row of its own', () => {
    const { positions } = flowButtons([200, 30], 10, 100, 4, 0);
    expect(positions[1]).toEqual({ x: 10, y: BUTTON_HEIGHT + 4 });
  });

  it('a question: the prompt, the options under it, the footer under them', () => {
    const layout = questionLayout(2 * LINE_HEIGHT, [40, 40]);
    const { x, y } = QUESTION_PANEL;
    expect(layout.prompt).toEqual({ x: x + PANEL.pad, y: y + PANEL.pad });
    const optionsTop = y + PANEL.pad + 2 * LINE_HEIGHT + PANEL.gap;
    expect(layout.buttons).toEqual([
      { x: x + PANEL.pad, y: optionsTop },
      { x: x + PANEL.pad + 40 + PANEL.gap, y: optionsTop },
    ]);
    expect(layout.footer).toEqual({ x: x + PANEL.pad, y: optionsTop + BUTTON_HEIGHT + PANEL.gap });
    expect(layout.height).toBe(layout.footer.y + LINE_HEIGHT + PANEL.pad - y);
  });

  it('the notebook: its name, the statement, one row per ending, the footer', () => {
    const layout = notebookLayout(LINE_HEIGHT, [20, 30]);
    const { y } = QUESTION_PANEL;
    const promptY = y + PANEL.pad + LINE_HEIGHT + PANEL.gap;
    expect(layout.promptY).toBe(promptY);
    const firstRow = promptY + LINE_HEIGHT + PANEL.gap;
    expect(layout.rows).toEqual([firstRow, firstRow + 20 + PANEL.gap]);
    expect(layout.footerY).toBe(firstRow + 20 + PANEL.gap + 30 + PANEL.gap);
    expect(layout.height).toBe(layout.footerY + LINE_HEIGHT + PANEL.pad - y);
  });

  it('a card: its title, its body, the demo and the button, each under the one before', () => {
    const layout = tutorialLayout(3 * LINE_HEIGHT, 60);
    const top = TUTORIAL_PANEL.y + PANEL.pad;
    expect(layout.bodyY).toBe(top + LINE_HEIGHT + PANEL.gap);
    expect(layout.demoY).toBe(layout.bodyY + 3 * LINE_HEIGHT + PANEL.gap);
    expect(layout.buttonY).toBe(layout.demoY + 60 + PANEL.gap);
    expect(layout.height).toBe(layout.buttonY + BUTTON_HEIGHT + PANEL.pad - TUTORIAL_PANEL.y);
  });
});
