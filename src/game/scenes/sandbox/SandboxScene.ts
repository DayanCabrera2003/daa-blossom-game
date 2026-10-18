import Phaser from 'phaser';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../scale/integerZoom';
import { HUB } from '../../picture/hubLayout';
import { trackFor } from '../../systems/musicFor';
import { Button } from '../../view/Button';
import { fitCamera } from '../../view/fitCamera';
import { paintHubGround } from '../../view/hubGround';
import { PALETTE } from '../../view/palette';
import { textStyle } from '../../view/textStyle';
import { contextOf } from '../context';
import { SANDBOX_SCENE } from '../SandboxGate';

/**
 * The free mode's scene, in its own chunk: only the gate's import() reaches it. For now (plan 08,
 * phase 10) it is the free mode's bare ground with its title and the way back to the hub; the
 * editor fills it in phase 11, and opens the garden the gate hands it (`SandboxSceneData`).
 */
export class SandboxScene extends Phaser.Scene {
  constructor() {
    super(SANDBOX_SCENE);
  }

  create(): void {
    fitCamera(this);
    const { t, music } = contextOf(this);
    // The free mode plays the hub's track (plan 08, section 1.3).
    music.play(trackFor({ kind: 'hub' }));
    paintHubGround(this);
    this.add.text(HUB.margin, HUB.margin, t('sandbox.title'), textStyle(12, PALETTE.lit));
    const back = new Button(this, 0, 0, t('sandbox.back'), () => this.scene.start('hub'));
    back.moveTo(CANVAS_WIDTH - HUB.margin - back.width, CANVAS_HEIGHT - HUB.margin - back.height);
  }
}
