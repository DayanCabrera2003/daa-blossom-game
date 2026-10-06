// Entry point: starts the game at the largest whole zoom that fits, and keeps it so on resize.
import Phaser from 'phaser';
import { gameConfig } from './game/config';
import { integerZoom } from './game/scale/integerZoom';

const zoomForWindow = (): number => integerZoom(window.innerWidth, window.innerHeight);
const game = new Phaser.Game(gameConfig(document.body, zoomForWindow()));
window.addEventListener('resize', () => game.scale.setZoom(zoomForWindow()));
