import type Phaser from 'phaser';
import { itemAt } from '@core/shared/itemAt';
import type { Translate } from '@services/i18n';
import { ordersRow } from '../../picture/bottomRows';
import { orderButtons } from '../../picture/orderButtons';
import type { FreeOrders, UiEvent } from '../../systems/levelController';
import { Button } from '../../view/Button';
import { LAYOUT } from '../../view/layout';

/**
 * The free mode's own buttons on the level screen (plan 08, phase 13): "Jardinero", the mechanical
 * gardener solving the garden, and "Certificado", its certificate on demand, each only when the
 * player has met it (`picture/orderButtons.ts`). They end the tools' row at the right margin
 * (`picture/bottomRows.ts`, where the teacher's trace sits in a level of the catalog) and send their
 * orders to the level controller; what the orders do is the free mode's own code, handed in with
 * the garden. A level of the catalog has none.
 */
export const addSandboxBar = (
  scene: Phaser.Scene,
  t: Translate,
  orders: FreeOrders,
  dispatch: (event: UiEvent) => void,
): void => {
  const buttons = orderButtons(orders).map(
    ({ kind, label }) => new Button(scene, 0, LAYOUT.toolbarY, t(label), () => dispatch({ kind })),
  );
  const lefts = ordersRow(buttons.map((button) => button.width));
  buttons.forEach((button, i) => button.moveTo(itemAt(lefts, i), LAYOUT.toolbarY));
};
