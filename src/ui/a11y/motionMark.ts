import type { Bus } from '@services/bus';
import type { BusEvents } from '@services/busEvents';
import { reducesMotion, type MotionChoice } from '@services/motion';

/** The page's root element, as far as the mark touches it. */
export interface MotionRoot {
  readonly dataset: Record<string, string | undefined>;
}

/** The system's "reduce motion" query (`matchMedia`), and its change event where there is one. */
export interface SystemMotion {
  readonly matches: boolean;
  addEventListener?(type: 'change', listener: () => void): void;
}

/** What the mark needs: the shared bus, the page's root, the setting at start-up, the system. */
export interface MotionMarkOptions {
  readonly bus: Bus<BusEvents>;
  readonly root: MotionRoot;
  readonly choice: MotionChoice;
  readonly system: SystemMotion;
}

/**
 * Marks the page with how much it moves (plan 09, phase 6): `data-motion="reduced"` or `"full"` on
 * the root, which the books' and the epilogue's styles read instead of the system's preference, so
 * the game's own motion setting rules them too. The mark follows the settings panel (the
 * `motion.changed` event) and, while the setting follows the system, the system's preference as it
 * changes.
 */
export function mountMotionMark({ bus, root, choice, system }: MotionMarkOptions): void {
  let current = choice;
  const mark = (): void => {
    root.dataset.motion = reducesMotion(current, system.matches) ? 'reduced' : 'full';
  };
  mark();
  bus.on('motion.changed', ({ motion }) => {
    current = motion;
    mark();
  });
  system.addEventListener?.('change', mark);
}
