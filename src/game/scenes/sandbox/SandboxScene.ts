import Phaser from 'phaser';
import { EMPTY_DESIGN, editDesign, type Design, type DesignEdit } from '@levels/sandbox/design';
import { openingDesign, type OpeningProblem } from '@levels/sandbox/opening';
import { shareOf } from '@levels/sandbox/share';
import { toPlayable } from '@levels/sandbox/toLevel';
import { catalogEntries } from '@services/progress';
import { sandboxAccess } from '@services/sandboxAccess';
import { recordTutorialSeen } from '@services/save';
import { createSandboxStore, type SandboxStore } from '@services/sandboxStore';
import type { AssetKey } from '../../assets/keys';
import { hubKeys } from '../../assets/loadPlan';
import { playUiSound } from '../../audio/uiSound';
import {
  chooseDesignTool,
  designMove,
  designPress,
  designRelease,
  initialDesignPointer,
  type DesignPointer,
  type DesignTool,
} from '../../input/designIntent';
import { designKey, type DesignCommand } from '../../input/designKeys';
import { pressOf } from '../../input/keyBindings';
import type { Point } from '../../input/target';
import { DESIGN_HEADER, designHeader } from '../../picture/designHeader';
import { designPicture } from '../../picture/designPicture';
import { designReasonText } from '../../picture/designReason';
import { TOAST } from '../../picture/toastBox';
import { designBarState, type DesignButton } from '../../picture/designToolbar';
import { EDITOR_CARD, editorCardLoop } from '../../picture/editorCard';
import { CANVAS_WIDTH } from '../../scale/integerZoom';
import { amendDesign, recordDesign } from '../../systems/designHistory';
import { importIntoHistory } from '../../systems/designImport';
import { designSound, GENERATED_SOUND } from '../../systems/designSounds';
import {
  anotherSeed,
  FIRST_CHOICE,
  grow,
  pickGenerator,
  resizeChoice,
  type GenerateChoice,
} from '../../systems/generateChoice';
import {
  canRedo,
  canUndo,
  current,
  redo,
  startHistory,
  undo,
  type History,
} from '../../systems/history';
import { freeOrders } from '../../systems/sandboxOrders';
import type { LevelSceneData } from '../../systems/levelScreenOf';
import { trackFor } from '../../systems/musicFor';
import { fitCamera } from '../../view/fitCamera';
import { GardenView } from '../../view/GardenView';
import { paintHubGround } from '../../view/hubGround';
import { PALETTE } from '../../view/palette';
import { textStyle } from '../../view/textStyle';
import { ToastView } from '../../view/ToastView';
import { keepGardenClear } from '../../view/touchZone';
import { TutorialView } from '../../view/TutorialView';
import { contextOf, type GameContext } from '../context';
import { openLevel } from '../LevelGate';
import { SANDBOX_SCENE, type SandboxSceneData } from '../SandboxGate';
import { DesignBar } from './DesignBar';
import { GenerateMenu } from './GenerateMenu';
import { FocusController } from '../focus/FocusController';
import { sayAloud } from '../sayAloud';
import { loadBehind } from '../loadBehind';
import { OutlinedText } from '../../view/OutlinedText';

/**
 * The free mode's last design, opened the first time the editor is (with this chunk, so its reading
 * and checking never weigh on the game's start) and kept for the rest of the game.
 */
let store: SandboxStore | null = null;

/**
 * The editor's history as it was when its design went to be played: coming back from the garden
 * (`returning`), the editor goes on from it, design, undo and redo as they were.
 */
let played: History<Design> | null = null;

/**
 * The free mode's editor (plan 08, phase 11), in its own chunk: only the gate's import() reaches
 * it. On the hub's grass, the garden being designed, drawn by the garden's own view; above it, the
 * title, the counts of the free mode's limits and what the tool in hand asks of the hand; below,
 * the tools and orders on the level's two rows. The scene decides nothing: the pointer and keys go
 * to the pure editor input (`input/designIntent.ts`, `input/designKeys.ts`), each edit to the
 * design's reducer, which answers with the new design or why not (said kindly), and the screen is
 * repainted from the pure pictures. Every change is kept at once in the free mode's own store, and
 * undo and redo walk the history of designs. The first time, a mechanic card shows the gestures.
 * "Jugar" builds the design as a level here, in this chunk, with the actions the player has met,
 * and hands it to the level scene, which plays it and comes back with "Diseñar" (plan 08, phase
 * 12). "Compartir" opens the share sheet over the editor (a DOM overlay, plan 08, phase 14) with
 * the design's code and level file; a garden opened there comes back on the bus as the text it was,
 * is read here and becomes the design shown (undoable), and the sheet hears why if it is none.
 */
export class SandboxScene extends Phaser.Scene {
  private context!: GameContext;
  private history: History<Design> = startHistory(EMPTY_DESIGN);
  private pointer: DesignPointer = initialDesignPointer('sprout');
  /** The generate menu's choice, kept while the editor is open so it opens where it was left. */
  private choice: GenerateChoice = FIRST_CHOICE;
  /** Whether the menu has grown a garden since it opened: later ones amend it. */
  private grownInMenu = false;
  /** Whether the mechanic card is showing: it alone takes input. */
  private cardOpen = false;
  /** A notice waiting for the card to close (a garden that could not be opened). */
  private pendingNotice: string | null = null;
  private garden!: GardenView;
  private bar!: DesignBar;
  private menu!: GenerateMenu;
  private toast!: ToastView;
  private tutorial!: TutorialView;
  private count!: OutlinedText;
  private prompt!: OutlinedText;

  constructor() {
    super(SANDBOX_SCENE);
  }

  create(data: Partial<SandboxSceneData> = {}): void {
    fitCamera(this);
    this.context = contextOf(this);
    const { t, music, saves, storage } = this.context;
    store ??= createSandboxStore(storage);
    // The free mode plays the hub's track (plan 08, section 1.3), loaded behind it when a shared
    // link opens the free mode before the hub ever showed.
    music.play(trackFor({ kind: 'hub' }));
    loadBehind(
      this,
      hubKeys((key) => this.cache.audio.exists(key)),
    );
    paintHubGround(this);
    if (data.returning === true && played !== null) {
      // Back from playing the design: on where the editor was, nothing to tell.
      this.history = played;
      this.pendingNotice = null;
    } else {
      this.openGarden(data.garden ?? null, store.get());
    }
    played = null;
    this.pointer = initialDesignPointer('sprout');
    this.choice = FIRST_CHOICE;
    this.grownInMenu = false;
    this.cardOpen = false;

    const { margin, titleY, promptY } = DESIGN_HEADER;
    // On the hub's grass, the header's lines are outlined as the sprouts' names are
    // (`picture/textContrast.ts`).
    new OutlinedText(this, margin, titleY, t('sandbox.title'), textStyle(8, PALETTE.lit));
    this.count = new OutlinedText(this, CANVAS_WIDTH - margin, titleY, '', textStyle(8)).setOrigin(
      1,
      0,
    );
    this.prompt = new OutlinedText(this, margin, promptY, '', textStyle(8));
    this.garden = new GardenView(this);
    this.bar = new DesignBar(this, t, (button) => this.press(button));
    this.menu = new GenerateMenu(this, t, {
      pick: (id) => this.choose(pickGenerator(this.choice, id)),
      resize: (step) => this.choose(resizeChoice(this.choice, step)),
      another: () => this.choose(anotherSeed(this.choice)),
      done: () => this.closeMenu(),
    });
    this.toast = new ToastView(this, sayAloud(this));
    this.tutorial = new TutorialView(this, t);
    this.bindInput();
    // A garden opened in the share sheet, while this editor is up.
    const stop = this.context.bus.on('sandbox.imported', ({ text }) => this.opened(text));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, stop);
    this.render();
    if (saves.get().tutorialsSeen.includes(EDITOR_CARD)) this.notify(this.pendingNotice);
    else this.showCard();
  }

  /**
   * The history the editor starts with: the design a shared link brings (read here, in this
   * chunk), after the player's own last design so undo goes back to it; or the last design kept.
   * A garden that cannot be opened is told once the screen is up.
   */
  private openGarden(code: string | null, stored: Design): void {
    const own = openingDesign(null, stored);
    const opened = code === null ? own : openingDesign(code, stored);
    this.history =
      code !== null && opened.problem === null
        ? recordDesign(startHistory(own.design), opened.design)
        : startHistory(opened.design);
    this.keep();
    const problem: OpeningProblem | null = opened.problem;
    this.pendingNotice = problem === null ? null : this.context.t(`sandbox.opened.${problem}`);
  }

  /** The design shown. */
  private get design(): Design {
    return current(this.history);
  }

  /** Keeps the design shown as the free mode's last design. */
  private keep(): void {
    store?.set(this.design);
  }

  /** Listens to the pointer on the garden and to the keys. */
  private bindInput(): void {
    const at = (pointer: Phaser.Input.Pointer): Point => ({ x: pointer.worldX, y: pointer.worldY });
    // The buttons' grown touch zones keep off the editor's garden, where sprouts are placed.
    keepGardenClear(this);
    this.input.on(
      'pointerdown',
      (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        // Buttons, the menu's wood and the card take their own touches.
        if (over.length > 0 || this.cardOpen || this.menu.open) return;
        this.pointer = designPress(this.pointer, this.design, at(pointer));
        this.render();
      },
    );
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.pointer.press === null) return;
      this.pointer = designMove(this.pointer, at(pointer));
      this.render();
    });
    const release = (pointer: Phaser.Input.Pointer): void => {
      if (this.pointer.press === null) return;
      const released = designRelease(this.pointer, this.design, at(pointer));
      this.pointer = released.pointer;
      if (released.edit !== null) this.edit(released.edit);
      this.render();
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
    // The keyboard's focus walks the bar, the menu and the card; Enter with nothing in focus
    // closes the card, as "Entendido" does.
    new FocusController(this, {
      screen: () => 'editor',
      fallback: () => this.tutorial.dismiss(),
    });
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      const command = designKey(pressOf(event), {
        cardOpen: this.cardOpen,
        menuOpen: this.menu.open,
        selecting: this.pointer.selected !== null,
      });
      if (command !== null) this.command(command);
    });
  }

  /** What a key asked for. */
  private command(command: DesignCommand): void {
    switch (command.kind) {
      case 'tool':
        return this.take(command.tool);
      case 'undo':
        return this.walk(undo);
      case 'redo':
        return this.walk(redo);
      case 'openMenu':
        return this.openMenu();
      case 'closeMenu':
        return this.closeMenu();
      case 'closeCard':
        this.tutorial.close();
        return this.cardClosed();
      case 'letGo':
        return this.take(this.pointer.tool);
      case 'leave':
        return this.leave();
    }
  }

  /** A button of the bar. */
  private press(button: DesignButton): void {
    if (this.cardOpen) return;
    switch (button) {
      case 'generate':
        return this.openMenu();
      case 'clear':
        this.edit({ type: 'clear' });
        return this.render();
      case 'undo':
        return this.walk(undo);
      case 'redo':
        return this.walk(redo);
      case 'back':
        return this.leave();
      case 'play':
        return this.play();
      case 'share':
        return this.context.bus.emit('sandbox.share', shareOf(this.design));
      default:
        return this.take(button);
    }
  }

  /** Takes a tool; a sprout chosen with the previous one is let go. */
  private take(tool: DesignTool): void {
    this.pointer = chooseDesignTool(this.pointer, tool);
    this.render();
  }

  /** An edit through the design's reducer: kept and undoable, or refused and said kindly. */
  private edit(edit: DesignEdit): void {
    const before = this.design;
    const outcome = editDesign(before, edit);
    this.ring(designSound(edit, before, outcome));
    if (!outcome.ok) {
      this.notify(designReasonText(outcome.error, this.context.t));
      return;
    }
    this.history = recordDesign(this.history, outcome.value);
    this.keep();
  }

  /**
   * A text opened in the share sheet: a garden becomes the design shown, after the one before so
   * undo goes back to it, with nothing left chosen; the sheet is answered at once either way.
   */
  private opened(text: string): void {
    const { history, answer } = importIntoHistory(this.history, text);
    if (answer.ok) {
      this.history = history;
      this.keep();
      this.take(this.pointer.tool);
      this.notify(this.context.t('share.done'));
    }
    this.context.bus.emit('sandbox.importAnswer', answer);
  }

  /** Undo or redo: the design at the cursor's new place, with nothing left chosen. */
  private walk(step: (history: History<Design>) => History<Design>): void {
    if (this.cardOpen || this.menu.open) return;
    const can = step === undo ? canUndo(this.history) : canRedo(this.history);
    if (!can) return;
    this.history = step(this.history);
    this.keep();
    this.take(this.pointer.tool);
  }

  /** Opens the generate menu over the bar; the garden is not edited by hand meanwhile. */
  private openMenu(): void {
    this.pointer = chooseDesignTool(this.pointer, this.pointer.tool);
    this.grownInMenu = false;
    this.bar.setVisible(false);
    this.menu.setVisible(true);
    this.render();
  }

  private closeMenu(): void {
    this.menu.setVisible(false);
    this.bar.setVisible(true);
    this.render();
  }

  /**
   * A new choice in the menu grows its garden at once, in place of the design: the first one
   * since the menu opened is recorded, the next ones amend it, so one undo goes back to before.
   */
  private choose(choice: GenerateChoice): void {
    const unchanged = choice === this.choice && this.grownInMenu;
    this.choice = choice;
    const grown = unchanged ? null : grow(choice);
    if (grown !== null) {
      this.history = this.grownInMenu
        ? amendDesign(this.history, grown.design)
        : recordDesign(this.history, grown.design);
      this.grownInMenu = true;
      this.keep();
      this.ring(GENERATED_SOUND);
      if (grown.shrunk) this.notify(this.context.t('sandbox.gen.shrunk', { size: grown.size }));
    }
    this.render();
  }

  /** The editor's mechanic card, the first time: the gestures, then whatever notice waits. */
  private showCard(): void {
    this.cardOpen = true;
    const { t } = this.context;
    this.tutorial.show(
      { title: t('sandbox.card.title'), body: t('sandbox.card.body'), loop: editorCardLoop() },
      () => this.cardClosed(),
    );
  }

  /** The card closed: seen for good, and the notice that waited is shown. */
  private cardClosed(): void {
    if (!this.cardOpen) return;
    this.cardOpen = false;
    this.context.saves.update((save) => recordTutorialSeen(save, EDITOR_CARD));
    this.notify(this.pendingNotice);
  }

  /** A gentle notice, above the bar, or above the menu while it is open. */
  private notify(message: string | null): void {
    this.pendingNotice = null;
    if (message === null) return;
    if (this.menu.open) this.toast.show(message, this.menu.top - TOAST.aboveDrawer);
    else this.toast.show(message);
  }

  /** Rings an editor sound, if the edit has one. */
  private ring(key: AssetKey | null): void {
    if (key !== null) playUiSound(this, key);
  }

  /**
   * Plays the design: built as a level with the actions the player has met (all in teacher mode;
   * `services/sandboxAccess.ts`) and handed to the level scene, the editor's history kept to come
   * back to, with the orders the player has met (the mechanical gardener, the certificate). A
   * design that does not make a level stays here, said kindly.
   */
  private play(): void {
    const { catalog, saves, teacherMode, t } = this.context;
    const access = sandboxAccess(catalogEntries(catalog), saves.get(), teacherMode);
    const playable = toPlayable(this.design, access.actions);
    if (!playable.ok) {
      this.notify(t('sandbox.unplayable'));
      return;
    }
    played = this.history;
    // The free mode's orders go with the garden, built here so their code stays in this chunk.
    const data: LevelSceneData = { sandbox: { level: playable.value, orders: freeOrders(access) } };
    openLevel(this, data);
  }

  private leave(): void {
    this.scene.start('hub');
  }

  /** Repaints the garden, the header, the bar and the menu from the pure pictures. */
  private render(): void {
    const { t } = this.context;
    const { design, pointer } = this;
    this.garden.render(designPicture(design, pointer));
    const header = designHeader(design, pointer.tool, this.menu.open);
    this.count.setText(t(header.count.key, header.count.params));
    this.prompt.setText(t(header.prompt.key, header.prompt.params));
    this.bar.render(
      designBarState({
        tool: pointer.tool,
        design,
        canUndo: canUndo(this.history),
        canRedo: canRedo(this.history),
        canPlay: true,
      }),
    );
    this.menu.render(this.choice);
  }
}
