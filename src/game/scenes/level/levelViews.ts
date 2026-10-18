import type Phaser from 'phaser';
import type { Translate } from '@services/i18n';
import type { UiEvent } from '../../systems/levelController';
import { voiceLine } from '../../systems/lineVoice';
import { nudgedFraction } from '../../systems/sun';
import { AnimationView } from '../../view/AnimationView';
import { BackdropView } from '../../view/BackdropView';
import { DialogueView } from '../../view/DialogueView';
import { FlowerView } from '../../view/FlowerView';
import { movesLess } from '../motion';
import { sayAloud, sayLineAloud } from '../sayAloud';
import { FogView } from '../../view/FogView';
import { GardenView } from '../../view/GardenView';
import { HudView, type HudLayout } from '../../view/HudView';
import { MarksView } from '../../view/MarksView';
import { MirrorView } from '../../view/MirrorView';
import { NotebookView } from '../../view/NotebookView';
import { ObjectsView } from '../../view/ObjectsView';
import { QuestionView } from '../../view/QuestionView';
import { RaceView } from '../../view/RaceView';
import { RecipeView } from '../../view/RecipeView';
import { SideBySideView } from '../../view/SideBySideView';
import { SunSliderView } from '../../view/SunSliderView';
import { ToastView } from '../../view/ToastView';
import { ToolbarView } from '../../view/ToolbarView';
import { TutorialView } from '../../view/TutorialView';
import { VeilView } from '../../view/VeilView';
import type { PresenterViews } from '../presenter';

/**
 * Every layer the level screen paints, from the backdrop at the bottom (under the fog) to the
 * dialogue box on top.
 */
export interface LevelViews {
  readonly backdrop: BackdropView;
  readonly fog: FogView;
  readonly flowers: FlowerView;
  readonly objects: ObjectsView;
  readonly garden: GardenView;
  readonly marks: MarksView;
  readonly mirror: MirrorView;
  readonly sideBySide: SideBySideView;
  readonly recipe: RecipeView;
  readonly race: RaceView;
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
  /** The back button: leaves for the hub, or in the free mode for the editor. */
  readonly back: () => void;
  /** How the HUD is laid out: its back button's text, its buttons, where the trace sits. */
  readonly hud: HudLayout;
  /** The "?" button: shows the level's mechanic cards again. */
  readonly help: () => void;
  /** The book button: opens the Códex. */
  readonly book: () => void;
  /** The trace button, in teacher mode only: opens or folds the teacher's panel. */
  readonly trace: () => void;
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
    backdrop: new BackdropView(scene, () => movesLess(scene)),
    fog: new FogView(scene, () => movesLess(scene)),
    flowers: new FlowerView(scene),
    objects: new ObjectsView(scene),
    garden: new GardenView(scene),
    marks: new MarksView(scene),
    mirror: new MirrorView(scene, t),
    sideBySide: new SideBySideView(scene, t),
    recipe: new RecipeView(scene, t, {
      card: (card) => dispatch({ kind: 'recipeCard', card }),
      check: () => dispatch({ kind: 'checkRecipe' }),
    }),
    race: new RaceView(scene, t),
    animation: new AnimationView(scene, () => movesLess(scene)),
    hud: new HudView(
      scene,
      t,
      {
        done: () => dispatch({ kind: 'done' }),
        undo: () => dispatch({ kind: 'undo' }),
        redo: () => dispatch({ kind: 'redo' }),
        hint: () => dispatch({ kind: 'hint' }),
        back: buttons.back,
        help: buttons.help,
        book: buttons.book,
        trace: buttons.trace,
        checkMirror: () => dispatch({ kind: 'checkMirror' }),
        leaveLayer: () => dispatch({ kind: 'leaveLayer' }),
      },
      buttons.hud,
    ),
    toolbar: new ToolbarView(scene, t, (tool) => dispatch({ kind: 'tool', tool })),
    sun: new SunSliderView(
      scene,
      (fraction) => dispatch({ kind: 'seek', fraction }),
      // A side arrow on the sun seeks the step beside it, as a drag to that step would.
      (direction, { fraction, steps }) =>
        dispatch({ kind: 'seek', fraction: nudgedFraction(fraction, steps, direction) }),
    ),
    toast: new ToastView(scene, sayAloud(scene)),
    dialogue: new DialogueView(scene, t, voiceLine, sayLineAloud(scene)),
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
