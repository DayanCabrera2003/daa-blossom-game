import type Phaser from 'phaser';
import type { Translate } from '@services/i18n';
import type { UiEvent } from '../../systems/levelController';
import { AnimationView } from '../../view/AnimationView';
import { DialogueView } from '../../view/DialogueView';
import { FlowerView } from '../../view/FlowerView';
import { FogView } from '../../view/FogView';
import { GardenView } from '../../view/GardenView';
import { HudView } from '../../view/HudView';
import { MarksView } from '../../view/MarksView';
import { MirrorView } from '../../view/MirrorView';
import { NotebookView } from '../../view/NotebookView';
import { ObjectsView } from '../../view/ObjectsView';
import { QuestionView } from '../../view/QuestionView';
import { SideBySideView } from '../../view/SideBySideView';
import { SunSliderView } from '../../view/SunSliderView';
import { ToastView } from '../../view/ToastView';
import { ToolbarView } from '../../view/ToolbarView';
import { TutorialView } from '../../view/TutorialView';
import { VeilView } from '../../view/VeilView';
import type { PresenterViews } from '../presenter';

/** Every layer the level screen paints, from the fog at the bottom to the dialogue box on top. */
export interface LevelViews {
  readonly fog: FogView;
  readonly flowers: FlowerView;
  readonly objects: ObjectsView;
  readonly garden: GardenView;
  readonly marks: MarksView;
  readonly mirror: MirrorView;
  readonly sideBySide: SideBySideView;
  readonly animation: AnimationView;
  readonly hud: HudView;
  readonly toolbar: ToolbarView;
  readonly sun: SunSliderView;
  readonly toast: ToastView;
  readonly dialogue: DialogueView;
}

/** Where the buttons of the level screen send their presses. */
export interface LevelButtons {
  /** An event for the level controller (buttons, tools, the sun slider). */
  readonly dispatch: (event: UiEvent) => void;
  /** The back button: leaves for the hub. */
  readonly back: () => void;
  /** The "?" button: shows the level's mechanic cards again. */
  readonly help: () => void;
}

/**
 * Builds the layers of the level screen, in the order they stack (each view adds its objects to
 * the scene as it is created), with the buttons wired to `buttons`.
 */
export const buildLevelViews = (
  scene: Phaser.Scene,
  t: Translate,
  buttons: LevelButtons,
): LevelViews => {
  const { dispatch } = buttons;
  return {
    fog: new FogView(scene),
    flowers: new FlowerView(scene),
    objects: new ObjectsView(scene),
    garden: new GardenView(scene),
    marks: new MarksView(scene),
    mirror: new MirrorView(scene, t),
    sideBySide: new SideBySideView(scene, t),
    animation: new AnimationView(scene),
    hud: new HudView(scene, t, {
      done: () => dispatch({ kind: 'done' }),
      undo: () => dispatch({ kind: 'undo' }),
      redo: () => dispatch({ kind: 'redo' }),
      hint: () => dispatch({ kind: 'hint' }),
      back: buttons.back,
      help: buttons.help,
      checkMirror: () => dispatch({ kind: 'checkMirror' }),
      leaveLayer: () => dispatch({ kind: 'leaveLayer' }),
    }),
    toolbar: new ToolbarView(scene, t, (tool) => dispatch({ kind: 'tool', tool })),
    sun: new SunSliderView(scene, (fraction) => dispatch({ kind: 'seek', fraction })),
    toast: new ToastView(scene),
    dialogue: new DialogueView(scene, t('dialogue.continue')),
  };
};

/**
 * Builds the panels the presenter opens over the garden; they stack above every layer of
 * `buildLevelViews`, so they are built after it. The dialogue box is shared with the level screen.
 */
export const buildPresenterViews = (
  scene: Phaser.Scene,
  t: Translate,
  dialogue: DialogueView,
): PresenterViews => ({
  dialogue,
  question: new QuestionView(scene),
  notebook: new NotebookView(scene),
  veil: new VeilView(scene),
  tutorial: new TutorialView(scene, t),
});
