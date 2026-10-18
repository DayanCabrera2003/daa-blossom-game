import { contrast } from './contrast';
import type { ButtonState } from './wood';
import type { PALETTE } from '../view/palette';

/**
 * Every text of the canvas and what it is written on (plan 09, phase 6): each call of
 * `view/textStyle.ts` with its colour and its ground, so `tests/textContrast.test.ts` can hold each
 * pair to the contrast WCAG asks of body text, measured on the real pixels (the faces of the wood,
 * the grass, water and snow of the backdrops). Text written straight on a backdrop wears the dark
 * outline of the sprouts' names (`view/OutlinedText.ts`): an ornament of any colour may lie under
 * it, so it brings its own dark ground. Pure: a table and the arithmetic of its colours.
 */

/** A colour of the palette (`view/palette.ts`). */
type PaletteKey = keyof typeof PALETTE;

/** The backdrops text may sit on: the hub's grass (and the free mode's), or the levels' seasons. */
export type Backdrop = 'hub' | 'levels' | 'canvas';

/** What a text is written on. */
export type TextSurface =
  /** The face of a wooden piece of the pack: a panel, the dialogue's page or its tab, a button. */
  | { readonly kind: 'wood'; readonly piece: 'panel' | 'dialogue' | 'dialogueTab' | ButtonState }
  /** A backdrop straight: the ground of the hub or of a level, or the bare canvas. */
  | { readonly kind: 'backdrop'; readonly of: Backdrop }
  /** A colour of the palette laid at `alpha` over a backdrop (1: an opaque patch of it). */
  | {
      readonly kind: 'fill';
      readonly colour: PaletteKey;
      readonly alpha: number;
      readonly over: Backdrop;
    };

/** A text of the game: where it is written, its colour, what lies under it, and its outline. */
export interface TextOnSurface {
  /** The file that writes it, from `src/game/`. */
  readonly file: string;
  /** What it is, for the messages of the test. */
  readonly what: string;
  readonly text: PaletteKey;
  readonly surface: TextSurface;
  /** Whether it wears the dark outline, which then is all the letters touch. */
  readonly outlined: boolean;
}

/** The contrast WCAG 2 asks of body text; the pixel font's letters are all body-sized. */
export const MIN_TEXT_CONTRAST = 4.5;

const wood = (piece: Extract<TextSurface, { kind: 'wood' }>['piece']): TextSurface => ({
  kind: 'wood',
  piece,
});
const backdrop = (of: Backdrop): TextSurface => ({ kind: 'backdrop', of });
const fill = (colour: PaletteKey, alpha: number, over: Backdrop = 'levels'): TextSurface => ({
  kind: 'fill',
  colour,
  alpha,
  over,
});

/** The texts on the wood of a panel, in its ink. */
const onPanel = (file: string, what: string): TextOnSurface => ({
  file,
  what,
  text: 'ink',
  surface: wood('panel'),
  outlined: false,
});

/** Every text of the canvas, file by file. */
export const TEXTS: readonly TextOnSurface[] = [
  // The hub's top line, its chapters and its flowers, on the hub's grass.
  {
    file: 'scenes/hub/HubTopLine.ts',
    what: 'title',
    text: 'lit',
    surface: backdrop('hub'),
    outlined: false,
  },
  {
    file: 'scenes/hub/HubTopLine.ts',
    what: 'teacher badge',
    text: 'sun',
    surface: backdrop('hub'),
    outlined: false,
  },
  {
    file: 'scenes/hub/HubTopLine.ts',
    what: 'counter',
    text: 'label',
    surface: backdrop('hub'),
    outlined: false,
  },
  {
    file: 'scenes/hub/HubTopLine.ts',
    what: 'the Códex seal',
    text: 'ink',
    surface: fill('lit', 1, 'hub'),
    outlined: false,
  },
  {
    file: 'scenes/HubScene.ts',
    what: 'chapter title',
    text: 'label',
    surface: backdrop('hub'),
    outlined: false,
  },
  {
    file: 'scenes/hub/HubSecrets.ts',
    what: 'flower tip',
    text: 'label',
    surface: fill('ink', 1, 'hub'),
    outlined: false,
  },
  {
    file: 'scenes/hub/HubSecrets.ts',
    what: 'stars still missing',
    text: 'label',
    surface: backdrop('hub'),
    outlined: false,
  },
  // The free mode's editor, on the hub's grass.
  {
    file: 'scenes/sandbox/SandboxScene.ts',
    what: 'title',
    text: 'lit',
    surface: backdrop('hub'),
    outlined: false,
  },
  {
    file: 'scenes/sandbox/SandboxScene.ts',
    what: 'counts',
    text: 'label',
    surface: backdrop('hub'),
    outlined: false,
  },
  {
    file: 'scenes/sandbox/SandboxScene.ts',
    what: 'prompt',
    text: 'label',
    surface: backdrop('hub'),
    outlined: false,
  },
  onPanel('scenes/sandbox/GenerateMenu.ts', 'size'),
  // A level's HUD, on its season's ground.
  {
    file: 'view/HudView.ts',
    what: 'goal, status, water, layers, council',
    text: 'label',
    surface: backdrop('levels'),
    outlined: false,
  },
  {
    file: 'view/HudView.ts',
    what: 'prompt',
    text: 'sun',
    surface: backdrop('levels'),
    outlined: false,
  },
  {
    file: 'view/OutlinedName.ts',
    what: "a sprout's name",
    text: 'label',
    surface: backdrop('levels'),
    outlined: true,
  },
  {
    file: 'view/MirrorView.ts',
    what: "a piece's degree",
    text: 'highlight',
    surface: fill('water', 0.85),
    outlined: false,
  },
  {
    file: 'view/SideBySideView.ts',
    what: 'caption',
    text: 'highlight',
    surface: fill('background', 0.8),
    outlined: false,
  },
  {
    file: 'view/SideBySideView.ts',
    what: 'folded names',
    text: 'label',
    surface: backdrop('levels'),
    outlined: false,
  },
  // A counterexample's own screen, on the bare canvas.
  {
    file: 'scenes/CounterexampleScene.ts',
    what: 'statement',
    text: 'lit',
    surface: backdrop('canvas'),
    outlined: false,
  },
  {
    file: 'scenes/CounterexampleScene.ts',
    what: 'lanterns',
    text: 'label',
    surface: backdrop('canvas'),
    outlined: false,
  },
  // The wooden pieces.
  {
    file: 'view/Button.ts',
    what: 'a button at rest',
    text: 'ink',
    surface: wood('idle'),
    outlined: false,
  },
  {
    file: 'view/Button.ts',
    what: 'a button in hand',
    text: 'label',
    surface: wood('active'),
    outlined: false,
  },
  {
    file: 'view/Button.ts',
    what: 'a button off',
    text: 'label',
    surface: wood('off'),
    outlined: false,
  },
  {
    file: 'view/DialogueView.ts',
    what: "speaker's name",
    text: 'label',
    surface: wood('dialogueTab'),
    outlined: false,
  },
  {
    file: 'view/DialogueView.ts',
    what: 'line',
    text: 'ink',
    surface: wood('dialogue'),
    outlined: false,
  },
  {
    file: 'view/DialogueView.ts',
    what: '"continue" hint',
    text: 'dark',
    surface: wood('dialogue'),
    outlined: false,
  },
  onPanel('view/SettingsView.ts', 'title, channels, volumes, motion'),
  onPanel('view/QuestionView.ts', 'prompt and footer'),
  onPanel('view/NotebookView.ts', 'title, footer, statement'),
  {
    file: 'view/NotebookView.ts',
    what: 'ending',
    text: 'ink',
    surface: wood('idle'),
    outlined: false,
  },
  onPanel('view/TutorialView.ts', 'card'),
  onPanel('view/VictoryPanel.ts', 'title, stars'),
  onPanel('view/KeysCard.ts', 'keys'),
  onPanel('view/ToastView.ts', 'notice'),
  onPanel('scenes/credits/CreditsScene.ts', 'roll'),
  // A card's demo: its choices and its button drawn in the colours of wood, in ink.
  {
    file: 'view/CardDemoView.ts',
    what: 'label on a choice',
    text: 'ink',
    surface: fill('button', 1),
    outlined: false,
  },
  {
    file: 'view/CardDemoView.ts',
    what: 'label on the choice picked',
    text: 'ink',
    surface: fill('buttonActive', 1),
    outlined: false,
  },
  // The race's and the recipe's panels, a flat wood over the garden.
  {
    file: 'view/RaceView.ts',
    what: 'title',
    text: 'label',
    surface: fill('panel', 0.97),
    outlined: false,
  },
  {
    file: 'view/RaceView.ts',
    what: "the automaton's counter",
    text: 'lit',
    surface: fill('panel', 0.97),
    outlined: false,
  },
  {
    file: 'view/RaceView.ts',
    what: "Bruto's counter",
    text: 'moon',
    surface: fill('panel', 0.97),
    outlined: false,
  },
  {
    file: 'view/RaceView.ts',
    what: 'axes',
    text: 'darkVine',
    surface: fill('panel', 0.97),
    outlined: false,
  },
  {
    file: 'view/RecipeView.ts',
    what: 'headings',
    text: 'label',
    surface: fill('panel', 0.97),
    outlined: false,
  },
  {
    file: 'view/RecipeView.ts',
    what: 'table heading',
    text: 'darkVine',
    surface: fill('panel', 0.97),
    outlined: false,
  },
  {
    file: 'view/RecipeView.ts',
    what: 'feedback',
    text: 'highlight',
    surface: fill('panel', 0.97),
    outlined: false,
  },
  {
    file: 'view/RecipeView.ts',
    what: 'a card',
    text: 'ink',
    surface: fill('button', 1),
    outlined: false,
  },
  {
    file: 'view/RecipeView.ts',
    what: 'a card placed',
    text: 'ink',
    surface: fill('buttonActive', 1),
    outlined: false,
  },
  // The veil over a bet.
  {
    file: 'view/VeilView.ts',
    what: 'veil',
    text: 'darkVine',
    surface: fill('fog', 1),
    outlined: false,
  },
];

/** `top` laid at `alpha` over `under`, channel by channel, as the canvas blends them. */
export function blend(top: number, alpha: number, under: number): number {
  return [16, 8, 0].reduce((colour, shift) => {
    const a = (top >> shift) & 0xff;
    const b = (under >> shift) & 0xff;
    return colour | (Math.round(a * alpha + b * (1 - alpha)) << shift);
  }, 0);
}

/** How well a text of colour `text` reads on a ground of `grounds`: its contrast on the worst. */
export const textReads = (text: number, grounds: readonly number[]): number =>
  Math.min(...grounds.map((ground) => contrast(text, ground)));
