import type Phaser from 'phaser';
import type { Bus } from '@services/bus';
import type { BusEvents } from '@services/busEvents';
import { neighbourLevels } from '@services/teacherJump';
import type { LevelSession } from '../../systems/levelSession';
import { teacherFeed } from '../../systems/teacherFeed';
import { teacherSun, type SunSeek } from '../../systems/teacherSun';

/** Where PageUp and PageDown lead: the level before or after `levelId` among `levelIds`. */
export interface LevelJumps {
  readonly levelIds: readonly string[];
  readonly levelId: string;
  readonly jump: (levelId: string) => void;
}

/**
 * The level screen's side of teacher mode (GDD §5.8; plan 07, phase 13). After every event it
 * feeds the trace panel the day as it is, once per change (the logic is instant; the panel
 * catches up); when the level is left it says so. A row of the panel's day moves the game's sun to
 * it, so both always show the same garden. Its keys: T opens or folds the panel, PageUp and
 * PageDown jump to the level before or after in the catalog, drafts included (never from a garden
 * of the free mode). For a player it does nothing at all.
 */
export class TeacherBridge {
  /** The day last fed, so a repaint that changed nothing is not fed again. */
  private fed: { history: unknown; events: unknown } | null = null;

  /** `ownGarden`: the garden is not in the catalog (the free mode's), so the feed brings it. */
  constructor(
    private readonly bus: Bus<BusEvents>,
    private readonly teacherMode: boolean,
    private readonly ownGarden = false,
  ) {}

  /** Feeds the panel the day of `session`, unless it is the one fed last. */
  feed(session: LevelSession): void {
    const feed = teacherFeed(session, this.teacherMode, this.ownGarden);
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
   * Listens, in teacher mode and while `scene` runs, to the rows of the panel's day: each asks
   * `seek` to move the sun to its step of a day of `dayLength()` gardens.
   */
  followPanel(scene: Phaser.Scene, dayLength: () => number, seek: (event: SunSeek) => void): void {
    if (!this.teacherMode) return;
    const stop = this.bus.on('teacher.sun', ({ step }) => seek(teacherSun(step, dayLength())));
    // Phaser's shutdown event of the scene (`Phaser.Scenes.Events.SHUTDOWN`, only a type here).
    scene.events.once('shutdown', stop);
  }

  /**
   * Listens, in teacher mode, to T (the panel) and, unless `jumps` is null (a garden of the free
   * mode, which is no level of the catalog), to PageUp and PageDown, which ask `jump` for the level
   * before or after `levelId` among `levelIds`.
   */
  bindKeys(scene: Phaser.Scene, jumps: LevelJumps | null): void {
    if (!this.teacherMode) return;
    const keys = scene.input.keyboard;
    keys?.on('keydown-T', () => this.bus.emit('teacher.toggle'));
    if (jumps === null) return;
    const { levelIds, levelId, jump } = jumps;
    const { previous, next } = neighbourLevels(levelIds, levelId);
    keys?.on('keydown-PAGE_UP', () => {
      if (previous !== null) jump(previous);
    });
    keys?.on('keydown-PAGE_DOWN', () => {
      if (next !== null) jump(next);
    });
  }
}
