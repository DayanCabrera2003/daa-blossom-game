import type Phaser from 'phaser';
import type { VertexId } from '@core/graph/types';
import { itemAt } from '@core/shared/itemAt';
import { stepAt, totalDuration, type AnimationStep } from '../animation/plan';
import type { Point } from '../input/target';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import { SPROUT_RADIUS } from './GardenView';
import { PALETTE } from './palette';

/**
 * Plays an animation plan over the garden, which already shows the final state: the view only
 * catches up (the logic is instant). Each frame asks `stepAt` which step is playing and how far;
 * a new move by the player stops the plan at once.
 */
export class AnimationView {
  private readonly overlay: Phaser.GameObjects.Graphics;
  private steps: readonly AnimationStep[] = [];
  private positions: readonly Point[] = [];
  private startedAt = 0;

  constructor(scene: Phaser.Scene) {
    this.overlay = scene.add.graphics().setDepth(60);
  }

  /** Whether a plan is still playing. */
  get playing(): boolean {
    return this.steps.length > 0;
  }

  play(steps: readonly AnimationStep[], positions: readonly Point[], now: number): void {
    this.steps = totalDuration(steps) > 0 ? steps : [];
    this.positions = positions;
    this.startedAt = now;
  }

  /** Skips to the end: the garden view already shows it. */
  finish(): void {
    this.steps = [];
    this.overlay.clear();
  }

  update(now: number): void {
    const g = this.overlay.clear();
    const at = stepAt(this.steps, now - this.startedAt);
    if (at === null) {
      this.steps = [];
      return;
    }
    const step = this.steps[at.index] as AnimationStep;
    const p = (v: VertexId): Point => itemAt(this.positions, v);
    const pulse = 1 - at.progress;
    switch (step.kind) {
      case 'hop': {
        const a = p(step.from);
        const b = p(step.to);
        g.fillStyle(PALETTE.litGlow).fillCircle(
          a.x + at.progress * (b.x - a.x),
          a.y + at.progress * (b.y - a.y),
          4,
        );
        break;
      }
      case 'light':
      case 'putOut':
      case 'conflict': {
        const colour = step.kind === 'conflict' ? PALETTE.chainWrong : PALETTE.litGlow;
        const blink = step.kind === 'conflict' ? Math.round(at.progress * 6) % 2 === 0 : true;
        if (blink)
          g.lineStyle(3, colour, pulse).lineBetween(
            p(step.u).x,
            p(step.u).y,
            p(step.v).x,
            p(step.v).y,
          );
        break;
      }
      case 'mark':
      case 'reveal':
      case 'place': {
        const c = p(step.vertex);
        g.lineStyle(1, PALETTE.highlight, pulse).strokeCircle(
          c.x,
          c.y,
          SPROUT_RADIUS + 2 + 10 * at.progress,
        );
        break;
      }
      case 'chain':
        g.lineStyle(3, PALETTE.chainGain, pulse).strokePoints(
          step.path.map(p) as Phaser.Types.Math.Vector2Like[],
          false,
        );
        break;
      case 'fold':
      case 'unfold':
      case 'clear':
        g.fillStyle(
          step.kind === 'clear' ? PALETTE.background : PALETTE.flower,
          0.25 * pulse,
        ).fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        break;
    }
  }
}
