import { invariant } from '../shared/invariant';

/**
 * The kinds of elementary work the efficient algorithm does (Códex C11):
 * - `scan`: looking along one vine from a sun;
 * - `label`: marking a sprout;
 * - `rebase`: moving one sprout into a newly folded flower (the O(n) cost of a fold);
 * - `flip`: passing one lantern along a chain.
 */
export type OperationKind = 'scan' | 'label' | 'rebase' | 'flip';

/** Counts work by kind. Injected into an algorithm run, so the run itself stays pure. */
export interface OperationCounter {
  count(kind: OperationKind, amount?: number): void;
  /** Counts so far, as a snapshot. */
  readonly counts: Readonly<Record<OperationKind, number>>;
  /** All work so far: the number plotted against the size of the garden. */
  readonly total: number;
}

/** A fresh counter with every kind at zero. */
export function createOperationCounter(): OperationCounter {
  const counts: Record<OperationKind, number> = { scan: 0, label: 0, rebase: 0, flip: 0 };
  let total = 0;
  return {
    count(kind, amount = 1) {
      invariant(Number.isInteger(amount) && amount >= 0, `cannot count ${amount} operations`);
      counts[kind] += amount;
      total += amount;
    },
    get counts() {
      return { ...counts };
    },
    get total() {
      return total;
    },
  };
}
