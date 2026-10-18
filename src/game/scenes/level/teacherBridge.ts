import type Phaser from 'phaser';
import type { Bus } from '@services/bus';
import type { BusEvents } from '@services/busEvents';
import { neighbourLevels } from '@services/teacherJump';
import type { LevelSession } from '../../systems/levelSession';
import { teacherFeed } from '../../systems/teacherFeed';

/**
 * The level screen's side of teacher mode (GDD §5.8; plan 07, phase 13). After every event it
 * feeds the trace panel the day as it is, once per change (the logic is instant; the panel
 * catches up); when the level is left it says so. Its keys: T opens or folds the panel, PageUp
 * and PageDown jump to the level before or after in the catalog, drafts included. For a player
 * it does nothing at all.
 */
export class TeacherBridge {
  /** The day last fed, so a repaint that changed nothing is not fed again. */
  private fed: { history: unknown; events: unknown } | null = null;

  constructor(
    private readonly bus: Bus<BusEvents>,
    private readonly teacherMode: boolean,
  ) {}

  /** Feeds the panel the day of `session`, unless it is the one fed last. */
  feed(session: LevelSession): void {
    const feed = teacherFeed(session, this.teacherMode);
    if (feed === null) return;
    if (this.fed?.history === session.history && this.fed.events === session.dayEvents) return;
    this.fed = { history: session.history, events: session.dayEvents };
    this.bus.emit('teacher.feed', feed);
  }

  /** The level is left: the panel has no garden until the next one feeds it. */
  leave(): void {
    if (this.teacherMode) this.bus.emit('teacher.leave');
  }

  /**
   * Listens, in teacher mode, to T (the panel) and to PageUp and PageDown, which ask `jump` for the
   * level before or after `levelId` among `levelIds`.
   */
  bindKeys(
    scene: Phaser.Scene,
    levelIds: readonly string[],
    levelId: string,
    jump: (levelId: string) => void,
  ): void {
    if (!this.teacherMode) return;
    const keys = scene.input.keyboard;
    const { previous, next } = neighbourLevels(levelIds, levelId);
    keys?.on('keydown-T', () => this.bus.emit('teacher.toggle'));
    keys?.on('keydown-PAGE_UP', () => {
      if (previous !== null) jump(previous);
    });
    keys?.on('keydown-PAGE_DOWN', () => {
      if (next !== null) jump(next);
    });
  }
}
