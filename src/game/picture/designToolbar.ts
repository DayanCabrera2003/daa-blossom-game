import type { Design } from '@levels/sandbox/design';
import { DESIGN_TOOLS, type DesignTool } from '../input/designIntent';
import type { Point } from '../input/target';
import { CANVAS_HEIGHT } from '../scale/integerZoom';
import { hudRow, toolbarRow } from './bottomRows';

/**
 * The bar of the free mode's editor (plan 08, phase 11), on the two bottom rows a level's HUD uses
 * so a player finds it where the tools always are: the tools left to right on the upper row with
 * "Generar…" and "Vaciar" at its right end, and on the lower row, from the right, the way back,
 * redo, undo, share and play. Pure: which buttons there are, where each goes once the scene has
 * measured them, and which are offered now.
 */

/** The orders at the right end of the tools' row, from the right. */
const ORDERS = ['clear', 'generate'] as const;

/** The buttons of the lower row, from the right. */
const LOWER = ['back', 'redo', 'undo', 'share', 'play'] as const;

/** A button of the editor's bar. */
export type DesignButton = DesignTool | (typeof ORDERS)[number] | (typeof LOWER)[number];

/** Every button of the bar. */
export const DESIGN_BUTTONS: readonly DesignButton[] = [...DESIGN_TOOLS, ...ORDERS, ...LOWER];

/** The tops of the two rows: the level HUD's (`view/layout.ts`), the tools above the buttons. */
export const DESIGN_ROWS = { tools: CANVAS_HEIGHT - 27, buttons: CANVAS_HEIGHT - 13 } as const;

/** The interface text of each button. */
export const DESIGN_BUTTON_TEXT: Readonly<Record<DesignButton, string>> = {
  sprout: 'sandbox.tool.sprout',
  vine: 'sandbox.tool.vine',
  lantern: 'sandbox.tool.lantern',
  move: 'sandbox.tool.move',
  remove: 'sandbox.tool.remove',
  generate: 'sandbox.tool.generate',
  clear: 'sandbox.tool.clear',
  back: 'sandbox.back',
  redo: 'hud.redo',
  undo: 'hud.undo',
  share: 'sandbox.share',
  play: 'sandbox.play',
};

/** The top-left corner of each button's panel, given each one's width. */
export function designToolbar(
  widths: Readonly<Record<DesignButton, number>>,
): Readonly<Record<DesignButton, Point>> {
  const row = (buttons: readonly DesignButton[], lefts: readonly number[], y: number) =>
    buttons.map((button, i) => [button, { x: lefts[i] ?? 0, y }] as const);
  const width = (button: DesignButton): number => widths[button];
  return Object.fromEntries([
    ...row(DESIGN_TOOLS, toolbarRow(DESIGN_TOOLS.map(width)), DESIGN_ROWS.tools),
    ...row(ORDERS, hudRow(ORDERS.map(width)), DESIGN_ROWS.tools),
    ...row(LOWER, hudRow(LOWER.map(width)), DESIGN_ROWS.buttons),
  ]) as Record<DesignButton, Point>;
}

/** What the bar shows now: the tool in hand, sunken, and which buttons may be pressed. */
export interface DesignBarState {
  readonly active: DesignTool;
  readonly enabled: Readonly<Record<DesignButton, boolean>>;
}

/** What the bar's state depends on. */
export interface DesignBarInput {
  readonly tool: DesignTool;
  readonly design: Design;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  /** Whether the free mode can play a garden yet, and share one (they come in phases 12 and 14). */
  readonly canPlay: boolean;
  readonly canShare: boolean;
}

/**
 * Which buttons may be pressed: every tool, generate and the way back always; undo and redo when
 * the history has a step that way; clear and share once there is a sprout to clear or share; play
 * once there is a vine, since a garden without one has nothing to light.
 */
export function designBarState(input: DesignBarInput): DesignBarState {
  const { design } = input;
  const sprouts = design.sprouts.length > 0;
  const tools = Object.fromEntries(DESIGN_TOOLS.map((tool) => [tool, true])) as Record<
    DesignTool,
    boolean
  >;
  return {
    active: input.tool,
    enabled: {
      ...tools,
      generate: true,
      clear: sprouts,
      back: true,
      redo: input.canRedo,
      undo: input.canUndo,
      share: input.canShare && sprouts,
      play: input.canPlay && design.vines.length > 0,
    },
  };
}
