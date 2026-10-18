// The hand-written choice of what the game ships from the CC0 packs (plan 06, section 1): each pack
// pinned by the sha256 of its zip, and each chosen file with its key, output path, kind and load
// group. `npm run assets` extracts exactly this. Files are grouped by what they are for; a phase
// that needs more appends entries at the end of the right group (or a new group at the end of
// FILES), never reordering what is there, so parallel work merges cleanly.
import type { AssetKind, LoadGroup } from '../../src/game/assets/manifestSchema';
import { OWN_WORK } from '../synth/sounds';
import type { PackSource, SelectedFile, Selection } from './types';

/** The packs, as their license files and pages name them. Only CC0 packs are used. */
const PACKS = {
  ninja: {
    zip: 'ninja-adventure.zip',
    sha256: '95a06f4fdcfd1882f061a45ff313b7c905dbe2de1e8512b281d7937df62a7b15',
    root: 'Ninja Adventure - Asset Pack/',
    name: 'Ninja Adventure Asset Pack',
    version: null,
    author: 'Pixel-boy and AAA',
    license: 'CC0-1.0',
    url: 'https://pixel-boy.itch.io/ninja-adventure-asset-pack',
  },
  monogram: {
    zip: 'monogram.zip',
    sha256: '81d0540290f73d6317dc86e34978af80babf8e24129941cdf087b0fdfb75c287',
    root: 'monogram/',
    name: 'monogram',
    version: null,
    author: 'Vinícius Menézio (datagoblin)',
    license: 'CC0-1.0',
    url: 'https://datagoblin.itch.io/monogram',
  },
  tinyTown: {
    zip: 'kenney_tiny-town.zip',
    sha256: '9768692dccff1d706408a5aedd6ca4f6cd1409506cbc84cb2f862919764be977',
    root: '',
    name: 'Tiny Town',
    version: '1.1',
    author: 'Kenney',
    license: 'CC0-1.0',
    url: 'https://kenney.nl/assets/tiny-town',
  },
  uiPixel: {
    zip: 'kenney_ui-pack-pixel-adventure.zip',
    sha256: '0b0ed4802ebcfff5e44e370f394baa1d751862a5a4a7612ac4ce84e85faa0627',
    root: '',
    name: 'UI Pack - Pixel Adventure',
    version: '2.0',
    author: 'Kenney',
    license: 'CC0-1.0',
    url: 'https://kenney.nl/assets/ui-pack-pixel-adventure',
  },
  interfaceSounds: {
    zip: 'kenney_interface-sounds.zip',
    sha256: 'f2193d072726d6758a5f7871b2dcc54dcce0d5c35c6f0a62f92549b327c81232',
    root: 'Audio/',
    name: 'Interface Sounds',
    version: '1.0',
    author: 'Kenney',
    license: 'CC0-1.0',
    url: 'https://kenney.nl/assets/interface-sounds',
  },
  rpgAudio: {
    zip: 'kenney_rpg-audio.zip',
    sha256: '6dbeaf8544da958d8f2adcb4a4a4b76c1ade34a05f8ab9edccd327da7375f38b',
    root: 'Audio/',
    name: 'RPG Audio',
    version: null,
    author: 'Kenney',
    license: 'CC0-1.0',
    url: 'https://kenney.nl/assets/rpg-audio',
  },
  musicJingles: {
    zip: 'kenney_music-jingles.zip',
    sha256: 'b729ba57959bd58793d2c5cafa348aaf2655d354f3da35ec4729e03ec77197b8',
    root: 'Audio/',
    name: 'Music Jingles',
    version: null,
    author: 'Kenney',
    license: 'CC0-1.0',
    url: 'https://kenney.nl/assets/music-jingles',
  },
} as const satisfies Record<string, PackSource>;

type PackId = keyof typeof PACKS;

/** The tile size of every tileset and tile sheet used. */
const TILE = { width: 16, height: 16 } as const;

/**
 * One chosen file. Wave files are always brought to mono at 22.05 kHz; everything else is copied
 * as it is. `frame` is given for sheets only; `group` defaults to `boot`.
 */
function pick(
  key: string,
  kind: AssetKind,
  [pack, entry]: readonly [PackId, string],
  out: string,
  options: { readonly group?: LoadGroup; readonly frame?: SelectedFile['frame'] } = {},
): SelectedFile {
  return {
    key,
    pack,
    entry,
    out,
    kind,
    group: options.group ?? 'boot',
    convert: entry.endsWith('.wav') ? 'mono22k' : 'copy',
    ...(options.frame === undefined ? {} : { frame: options.frame }),
  };
}

/** Shorthands for an entry of each pack. */
const ninja = (entry: string) => ['ninja', entry] as const;
const kenney = (pack: PackId, entry: string) => [pack, entry] as const;

/** The 53-colour palette (section 1.1) and the font (section 1.2). */
const PALETTE_AND_FONT: readonly SelectedFile[] = [
  pick('image.palette', 'image', ninja('Palette.png'), 'images/palette.png'),
  pick(
    'font.monogram',
    'font',
    ['monogram', 'ttf/monogram-extended.ttf'],
    'fonts/monogram-extended.ttf',
  ),
];

/** Tilesets for the garden pieces and the seasonal backdrops (sections 1.4 and 1.5). */
const TILESETS: readonly SelectedFile[] = [
  pick(
    'tiles.floor',
    'sheet',
    ninja('Backgrounds/Tilesets/TilesetFloor.png'),
    'images/tiles/floor.png',
    { frame: TILE },
  ),
  pick(
    'tiles.floorDetail',
    'sheet',
    ninja('Backgrounds/Tilesets/TilesetFloorDetail.png'),
    'images/tiles/floor-detail.png',
    { frame: TILE },
  ),
  pick(
    'tiles.nature',
    'sheet',
    ninja('Backgrounds/Tilesets/TilesetNature.png'),
    'images/tiles/nature.png',
    { frame: TILE },
  ),
  pick(
    'tiles.water',
    'sheet',
    ninja('Backgrounds/Tilesets/TilesetWater.png'),
    'images/tiles/water.png',
    { frame: TILE },
  ),
  pick(
    'tiles.house',
    'sheet',
    ninja('Backgrounds/Tilesets/TilesetHouse.png'),
    'images/tiles/house.png',
    { frame: TILE },
  ),
  pick(
    'tiles.element',
    'sheet',
    ninja('Backgrounds/Tilesets/TilesetElement.png'),
    'images/tiles/element.png',
    { frame: TILE },
  ),
  pick(
    'tiles.interiorFloor',
    'sheet',
    ninja('Backgrounds/Tilesets/Interior/TilesetInteriorFloor.png'),
    'images/tiles/interior-floor.png',
    { frame: TILE },
  ),
];

/** Portraits and their frame (section 1.3). */
const PORTRAITS: readonly SelectedFile[] = [
  pick(
    'portrait.sauce',
    'image',
    ninja('Actor/Character/OldMan3/Faceset.png'),
    'images/portraits/sauce.png',
  ),
  pick(
    'portrait.bruto',
    'image',
    ninja('Actor/Character/OldMan2/Faceset.png'),
    'images/portraits/bruto.png',
  ),
  pick('ui.facesetBox', 'image', ninja('Ui/Dialog/FacesetBox.png'), 'images/ui/faceset-box.png'),
];

/** Sprites and effects of the garden pieces (section 1.4). */
const GARDEN_PIECES: readonly SelectedFile[] = [
  pick(
    'actor.lantern',
    'sheet',
    ninja('Actor/Monster/LanternRed/SpriteSheet.png'),
    'images/actors/lantern.png',
    { frame: TILE },
  ),
  // Two frames of 10 × 8, not 16 × 16 as its name says: the picture is 20 × 8.
  pick(
    'anim.flower',
    'sheet',
    ninja('Backgrounds/Animated/Flower/SpriteSheet16x16.png'),
    'images/animated/flower.png',
    { frame: { width: 10, height: 8 } },
  ),
  pick(
    'anim.waterRipples',
    'sheet',
    ninja('Backgrounds/Animated/Water Ripples/SpriteSheet16x16.png'),
    'images/animated/water-ripples.png',
    { frame: TILE },
  ),
  pick('fx.fog', 'image', ninja('FX/Environment/Fog.png'), 'images/fx/fog.png'),
  pick('fx.smoke', 'sheet', ninja('FX/Smoke/Smoke/SpriteSheet.png'), 'images/fx/smoke.png', {
    frame: { width: 32, height: 32 },
  }),
  // Seven frames of 10 × 8, and six leaves of 12 × 7, side by side.
  pick('fx.spark', 'sheet', ninja('FX/Particle/Spark.png'), 'images/fx/spark.png', {
    frame: { width: 10, height: 8 },
  }),
  pick('fx.leafPink', 'sheet', ninja('FX/Particle/LeafPink.png'), 'images/fx/leaf-pink.png', {
    frame: { width: 12, height: 7 },
  }),
];

/**
 * Seasonal decorations and particles beyond the tilesets (section 1.5). Of the pack's flags, only
 * the four bright ones wave at the festival; the black, brown, grey and white ones stay out.
 */
const SEASONS: readonly SelectedFile[] = [
  pick(
    'anim.flagRed',
    'sheet',
    ninja('Backgrounds/Animated/Flag/FlagRed16x16.png'),
    'images/animated/flag-red.png',
    { frame: TILE },
  ),
  pick(
    'anim.flagYellow',
    'sheet',
    ninja('Backgrounds/Animated/Flag/FlagYellow16x16.png'),
    'images/animated/flag-yellow.png',
    { frame: TILE },
  ),
  pick(
    'anim.flagBlue',
    'sheet',
    ninja('Backgrounds/Animated/Flag/FlagBlue16x16.png'),
    'images/animated/flag-blue.png',
    { frame: TILE },
  ),
  pick(
    'anim.flagGreen',
    'sheet',
    ninja('Backgrounds/Animated/Flag/FlagGreen16x16.png'),
    'images/animated/flag-green.png',
    { frame: TILE },
  ),
  pick('fx.leaf', 'image', ninja('FX/Particle/Leaf.png'), 'images/fx/leaf.png'),
  pick('fx.snow', 'image', ninja('FX/Particle/Snow.png'), 'images/fx/snow.png'),
  pick(
    'kenney.town',
    'sheet',
    kenney('tinyTown', 'Tilemap/tilemap_packed.png'),
    'images/kenney/tiny-town.png',
    { frame: TILE },
  ),
];

/**
 * Wooden panels, buttons, sliders, checkboxes and icons (section 1.6). The plain button is left
 * out: no label reads on its orange face (`picture/wood.ts`). The toolbar has no room for a moon
 * beside the sun of the tool of marks, so the moon is a small badge on the sun's corner
 * (`picture/buttonIcon.ts`).
 */
const UI: readonly SelectedFile[] = [
  pick('ui.dialogBox', 'image', ninja('Ui/Dialog/DialogBox.png'), 'images/ui/dialog-box.png'),
  pick(
    'wood.panel',
    'image',
    ninja('Ui/Theme/Theme Wood/nine_path_panel.png'),
    'images/ui/wood/panel.png',
  ),
  pick(
    'wood.buttonHover',
    'image',
    ninja('Ui/Theme/Theme Wood/button_hover.png'),
    'images/ui/wood/button-hover.png',
  ),
  pick(
    'wood.buttonPressed',
    'image',
    ninja('Ui/Theme/Theme Wood/button_pressed.png'),
    'images/ui/wood/button-pressed.png',
  ),
  pick(
    'wood.buttonDisabled',
    'image',
    ninja('Ui/Theme/Theme Wood/button_disabled.png'),
    'images/ui/wood/button-disabled.png',
  ),
  pick(
    'wood.sliderGrabber',
    'image',
    ninja('Ui/Theme/Theme Wood/h_slidder_grabber.png'),
    'images/ui/wood/slider-grabber.png',
  ),
  pick(
    'wood.sliderGrabberHover',
    'image',
    ninja('Ui/Theme/Theme Wood/h_slidder_grabber_hover.png'),
    'images/ui/wood/slider-grabber-hover.png',
  ),
  pick(
    'wood.sliderGrabberDisabled',
    'image',
    ninja('Ui/Theme/Theme Wood/h_slidder_grabber_disabled.png'),
    'images/ui/wood/slider-grabber-disabled.png',
  ),
  pick(
    'wood.sliderProgress',
    'image',
    ninja('Ui/Theme/Theme Wood/slider_progress.png'),
    'images/ui/wood/slider-progress.png',
  ),
  pick(
    'wood.sliderProgressHover',
    'image',
    ninja('Ui/Theme/Theme Wood/slider_progress_hover.png'),
    'images/ui/wood/slider-progress-hover.png',
  ),
  pick(
    'wood.checked',
    'image',
    ninja('Ui/Theme/Theme Wood/checked.png'),
    'images/ui/wood/checked.png',
  ),
  pick(
    'wood.unchecked',
    'image',
    ninja('Ui/Theme/Theme Wood/unchecked.png'),
    'images/ui/wood/unchecked.png',
  ),
  pick('icon.sun', 'image', ninja('Ui/Skill Icon/Meteo/Sun.png'), 'images/ui/icons/sun.png'),
  pick('icon.water', 'image', ninja('Items/Resource/Water.png'), 'images/ui/icons/water.png'),
  pick('icon.rock', 'image', ninja('Items/Resource/Rock.png'), 'images/ui/icons/rock.png'),
  pick('icon.book', 'image', ninja('Items/Object/Book.png'), 'images/ui/icons/book.png'),
  pick('icon.seed', 'image', ninja('Items/Food/Seed1.png'), 'images/ui/icons/seed.png'),
  pick(
    'icon.hourglass',
    'image',
    ninja('Items/Object/Hourglass.png'),
    'images/ui/icons/hourglass.png',
  ),
  pick(
    'kenney.ui',
    'sheet',
    kenney('uiPixel', 'Tilesheets/Small tiles/Thick outline/tilemap_packed.png'),
    'images/kenney/ui-pixel.png',
    { frame: TILE },
  ),
  // The moon of the tool of marks, a badge on the corner of its sun (plan 09, phase 2).
  pick('icon.moon', 'image', ninja('Ui/Skill Icon/Meteo/Moon.png'), 'images/ui/icons/moon.png'),
];

/**
 * Music, one track per screen (section 1.7). Keys and file names name the screen, not the track,
 * so swapping a track after listening only changes its entry here. None goes in `boot`: the hub's
 * loads behind the hub once it shows (plan 09, phase 9), each chapter's with its first level.
 */
const MUSIC: readonly SelectedFile[] = [
  pick('music.hub', 'music', ninja('Audio/Musics/4 - Village.ogg'), 'audio/music/hub.ogg', {
    group: 'hub',
  }),
  pick('music.ch1', 'music', ninja('Audio/Musics/31 - Sunny.ogg'), 'audio/music/ch1.ogg', {
    group: 'ch1',
  }),
  pick('music.ch2', 'music', ninja('Audio/Musics/39 - Boat.ogg'), 'audio/music/ch2.ogg', {
    group: 'ch2',
  }),
  pick('music.ch3', 'music', ninja('Audio/Musics/22 - Dream.ogg'), 'audio/music/ch3.ogg', {
    group: 'ch3',
  }),
  pick('music.ch4', 'music', ninja('Audio/Musics/20 - Good Time.ogg'), 'audio/music/ch4.ogg', {
    group: 'ch4',
  }),
  pick('music.ch5', 'music', ninja('Audio/Musics/11 - Clearing.ogg'), 'audio/music/ch5.ogg', {
    group: 'ch5',
  }),
  pick('music.ch6', 'music', ninja('Audio/Musics/27 - Chill.ogg'), 'audio/music/ch6.ogg', {
    group: 'ch6',
  }),
  pick('music.ch6Race', 'music', ninja('Audio/Musics/23 - Road.ogg'), 'audio/music/ch6-race.ogg', {
    group: 'ch6',
  }),
  pick('music.ch7', 'music', ninja('Audio/Musics/12 - Temple.ogg'), 'audio/music/ch7.ogg', {
    group: 'ch7',
  }),
  pick(
    'music.credits',
    'music',
    ninja('Audio/Musics/15 - Credit Theme.ogg'),
    'audio/music/credits.ogg',
    { group: 'credits' },
  ),
];

/** Jingles of the moments (section 1.7), named by the moment. */
const JINGLES: readonly SelectedFile[] = [
  pick(
    'jingle.victory',
    'jingle',
    kenney('musicJingles', 'Pizzicato jingles/jingles_PIZZI01.ogg'),
    'audio/jingles/victory.ogg',
  ),
  pick('jingle.unlock', 'jingle', ninja('Audio/Jingles/LevelUp1.wav'), 'audio/jingles/unlock.wav'),
  pick(
    'jingle.betWon',
    'jingle',
    ninja('Audio/Sounds/Bonus/Coin.wav'),
    'audio/jingles/bet-won.wav',
  ),
];

/** Sound effects of the events (section 1.8), named by the event. The chimes are synthesized. */
const SFX: readonly SelectedFile[] = [
  pick('sfx.putOut', 'sfx', kenney('interfaceSounds', 'drop_002.ogg'), 'audio/sfx/put-out.ogg'),
  pick('sfx.markSun', 'sfx', kenney('interfaceSounds', 'pluck_002.ogg'), 'audio/sfx/mark-sun.ogg'),
  pick(
    'sfx.markMoon',
    'sfx',
    kenney('interfaceSounds', 'pluck_001.ogg'),
    'audio/sfx/mark-moon.ogg',
  ),
  pick(
    'sfx.conflict',
    'sfx',
    kenney('interfaceSounds', 'question_001.ogg'),
    'audio/sfx/conflict.ogg',
  ),
  pick(
    'sfx.inspect',
    'sfx',
    ninja('Audio/Sounds/Whoosh & Slash/Whoosh2.wav'),
    'audio/sfx/inspect.wav',
  ),
  pick(
    'sfx.waterDrop',
    'sfx',
    ninja('Audio/Sounds/Elemental/WaterDrop.wav'),
    'audio/sfx/water-drop.wav',
  ),
  pick(
    'sfx.chainFound',
    'sfx',
    kenney('interfaceSounds', 'glass_004.ogg'),
    'audio/sfx/chain-found.ogg',
  ),
  pick(
    'sfx.searchCleared',
    'sfx',
    kenney('interfaceSounds', 'minimize_001.ogg'),
    'audio/sfx/search-cleared.ogg',
  ),
  pick('sfx.stone', 'sfx', kenney('interfaceSounds', 'bong_001.ogg'), 'audio/sfx/stone.ogg'),
  pick('sfx.scarecrow', 'sfx', kenney('rpgAudio', 'cloth2.ogg'), 'audio/sfx/scarecrow.ogg'),
  pick('sfx.reject', 'sfx', kenney('interfaceSounds', 'back_002.ogg'), 'audio/sfx/reject.ogg'),
  pick('sfx.button', 'sfx', kenney('interfaceSounds', 'click_001.ogg'), 'audio/sfx/button.ogg'),
  pick('sfx.advance', 'sfx', kenney('interfaceSounds', 'select_001.ogg'), 'audio/sfx/advance.ogg'),
  pick(
    'sfx.panelOpen',
    'sfx',
    kenney('interfaceSounds', 'open_002.ogg'),
    'audio/sfx/panel-open.ogg',
  ),
  pick(
    'sfx.panelClose',
    'sfx',
    kenney('interfaceSounds', 'close_002.ogg'),
    'audio/sfx/panel-close.ogg',
  ),
  pick('sfx.bookOpen', 'sfx', kenney('rpgAudio', 'bookOpen.ogg'), 'audio/sfx/book-open.ogg'),
  pick('sfx.bookFlip1', 'sfx', kenney('rpgAudio', 'bookFlip1.ogg'), 'audio/sfx/book-flip1.ogg'),
  pick('sfx.bookFlip2', 'sfx', kenney('rpgAudio', 'bookFlip2.ogg'), 'audio/sfx/book-flip2.ogg'),
  pick('sfx.bookFlip3', 'sfx', kenney('rpgAudio', 'bookFlip3.ogg'), 'audio/sfx/book-flip3.ogg'),
  pick('sfx.bookClose', 'sfx', kenney('rpgAudio', 'bookClose.ogg'), 'audio/sfx/book-close.ogg'),
  pick('sfx.card', 'sfx', kenney('interfaceSounds', 'maximize_002.ogg'), 'audio/sfx/card.ogg'),
  pick(
    'sfx.brutoSleeps',
    'sfx',
    kenney('interfaceSounds', 'minimize_005.ogg'),
    'audio/sfx/bruto-sleeps.ogg',
  ),
];

/** Babble syllables (section 1.9): only those some speaker uses. */
const VOICE: readonly SelectedFile[] = [1, 2, 3, 4, 6, 7, 10].map((n) =>
  pick(
    `voice.${n}`,
    'voice',
    ninja(`Audio/Sounds/Voice/Voice${n}.wav`),
    `audio/voice/voice${n}.wav`,
  ),
);

/**
 * The cosmetics of the hub (plan 08, section 1.2), won with stars: the two butterflies (four
 * directions of four wingbeats each), the frog, the cat and the two hens (still, then moving), and
 * the plant each seed sows (four frames of its sway). All of them already in the pack's colours.
 */
const HUB_CRITTERS: readonly SelectedFile[] = [
  pick(
    'critter.butterfly',
    'sheet',
    ninja('Actor/Monster/Butterfly/SpriteSheet.png'),
    'images/hub/butterfly.png',
    { frame: TILE },
  ),
  pick(
    'critter.butterflyBlue',
    'sheet',
    ninja('Actor/Monster/ButterflyBlue/SpriteSheet.png'),
    'images/hub/butterfly-blue.png',
    { frame: TILE },
  ),
  pick('critter.frog', 'sheet', ninja('Actor/Animal/Frog/SpriteSheet.png'), 'images/hub/frog.png', {
    frame: TILE,
  }),
  pick('critter.cat', 'sheet', ninja('Actor/Animal/Cat/SpriteSheet.png'), 'images/hub/cat.png', {
    frame: TILE,
  }),
  pick(
    'critter.chickenWhite',
    'sheet',
    ninja('Actor/Animal/Chicken/SpriteSheetWhite.png'),
    'images/hub/chicken-white.png',
    { frame: TILE },
  ),
  pick(
    'critter.chickenBrown',
    'sheet',
    ninja('Actor/Animal/Chicken/SpriteSheetBrown.png'),
    'images/hub/chicken-brown.png',
    { frame: TILE },
  ),
  pick(
    'deco.plant',
    'sheet',
    ninja('Backgrounds/Animated/Plant/SpriteSheet16x16.png'),
    'images/hub/plant.png',
    { frame: TILE },
  ),
];

/**
 * The page's own icon (plan 09, phase 9): a loose 16 × 16 picture of the pack, a sprout of grass,
 * linked by `index.html` as its favicon and never loaded by the game.
 */
const PAGE: readonly SelectedFile[] = [
  pick('icon.favicon', 'icon', ninja('Items/Resource/Grass.png'), 'images/favicon.png'),
];

/** Everything `npm run assets` extracts, in the order the manifest lists it. */
export const SELECTION: Selection = {
  packs: PACKS,
  files: [
    ...PALETTE_AND_FONT,
    ...TILESETS,
    ...PORTRAITS,
    ...GARDEN_PIECES,
    ...SEASONS,
    ...UI,
    ...MUSIC,
    ...JINGLES,
    ...SFX,
    ...VOICE,
    ...HUB_CRITTERS,
    ...PAGE,
  ],
  // The chimes, the sparkle and the fold chords, synthesized by the project (`npm run sounds`).
  own: OWN_WORK,
};
