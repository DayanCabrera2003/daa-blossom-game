import { describe, expect, it } from 'vitest';
import {
  BUTTON_HEIGHT,
  flowButtons,
  NOTEBOOK_HEADER,
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

  it('the notebook: its name and what to do on top, the statement, one row per ending', () => {
    const layout = notebookLayout(LINE_HEIGHT, [20, 30]);
    const { y } = QUESTION_PANEL;
    const promptY = y + PANEL.pad + NOTEBOOK_HEADER + PANEL.gap;
    expect(layout.promptY).toBe(promptY);
    const firstRow = promptY + LINE_HEIGHT + PANEL.gap;
    expect(layout.rows).toEqual([firstRow, firstRow + 20 + PANEL.gap]);
    expect(layout.height).toBe(firstRow + 20 + PANEL.gap + 30 + PANEL.pad - y);
  });

  it('a card: its title, its body, the demo and the button, each under the one before', () => {
    const layout = tutorialLayout(3 * LINE_HEIGHT, 60);
    const top = TUTORIAL_PANEL.y + PANEL.pad;
    expect(layout.bodyY).toBe(top + LINE_HEIGHT + PANEL.gap);
    expect(layout.demoY).toBe(layout.bodyY + 3 * LINE_HEIGHT + PANEL.gap);
    expect(layout.buttonY).toBe(layout.demoY + 60 + PANEL.gap);
    expect(layout.height).toBe(layout.buttonY + BUTTON_HEIGHT + PANEL.pad - TUTORIAL_PANEL.y);
  });

  it('a panel placed elsewhere lays out the same from its own corner and width', () => {
    const spot = { x: 100, y: 90, width: 200 };
    const moved = questionLayout(LINE_HEIGHT, [40], spot);
    expect(moved.prompt).toEqual({ x: 100 + PANEL.pad, y: 90 + PANEL.pad });
    expect(moved.height).toBe(questionLayout(LINE_HEIGHT, [40]).height);
    // Options that do not fit a narrower row wrap to the next one.
    const narrow = questionLayout(LINE_HEIGHT, [100, 100], spot);
    expect(narrow.buttons[1]?.y).toBeGreaterThan(narrow.buttons[0]?.y ?? 0);
    expect(notebookLayout(LINE_HEIGHT, [20], 90).promptY - 90).toBe(
      notebookLayout(LINE_HEIGHT, [20]).promptY - QUESTION_PANEL.y,
    );
    expect(tutorialLayout(LINE_HEIGHT, 60, 90).buttonY - 90).toBe(
      tutorialLayout(LINE_HEIGHT, 60).buttonY - TUTORIAL_PANEL.y,
    );
  });
});
