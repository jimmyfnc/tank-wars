import Phaser from 'phaser';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { GAME_CONFIG } from './config';

// Main game configuration
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_CONFIG.SCREEN_WIDTH,
  height: GAME_CONFIG.SCREEN_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#87CEEB', // Sky blue
  pixelArt: true, // Enable pixel-perfect rendering
  roundPixels: true,
  scene: [MenuScene, GameScene], // MenuScene first = starts there
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

// Create and export game instance
new Phaser.Game(config);
