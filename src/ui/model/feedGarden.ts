import { itemAt } from '@core/shared/itemAt';
import type { Level } from '@levels/build';
import type { TeacherFeed } from '@services/busEvents';
import { diagramGarden, type DiagramGarden } from './diagramGarden';

/**
 * The garden the teacher's panel draws and names for a feed (plan 08, phase 12): a level of the
 * catalog, looked up by its id with `levelOf`, as the Codex's diagrams find it; or a garden of the
 * free mode, which the catalog does not have, from the sprouts the feed brings (names, places,
 * bees and flowers) and the dawn of its day. Null when neither is there.
 */
export function feedGarden(
  feed: TeacherFeed,
  levelOf: (id: string) => Level | undefined,
): DiagramGarden | null {
  const { sprouts } = feed;
  if (sprouts !== undefined) {
    return {
      names: sprouts.map((sprout) => sprout.label),
      positions: sprouts.map(({ x, y }) => ({ x, y })),
      kinds: sprouts.map((sprout) => sprout.kind ?? null),
      start: itemAt(feed.day, 0),
      level: null,
    };
  }
  const found = diagramGarden({ level: feed.level }, { level: levelOf, card: () => undefined });
  return found.ok ? found.value : null;
}
