import type { FreeOrders } from '../systems/levelController';

/** A button of the free mode's orders: the order it gives and the key of its label. */
export interface OrderButton {
  readonly kind: 'solve' | 'certify';
  readonly label: string;
}

/** Every order's button, in the order they sit at the end of the tools' row. */
const ORDER_BUTTONS: readonly OrderButton[] = [
  { kind: 'solve', label: 'sandbox.solve' },
  { kind: 'certify', label: 'sandbox.certify' },
];

/**
 * The buttons of the free mode's orders a garden shows (plan 08, phase 13): the mechanical gardener
 * ("Jardinero"), then the certificate ("Certificado"), each only when the player has met it.
 */
export const orderButtons = (orders: FreeOrders): OrderButton[] =>
  ORDER_BUTTONS.filter(({ kind }) => orders[kind] !== null);
