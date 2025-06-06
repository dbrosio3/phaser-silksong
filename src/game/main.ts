import { Boot } from './scenes/Boot';
import { MainMenu } from './scenes/MainMenu';
import { Level0 } from './scenes/Level0';
import { Level1 } from './scenes/Level1';
import { AUTO, Game } from 'phaser';
import { Preloader } from './scenes/Preloader';
import type Phaser from 'phaser';

//  Find out more information about the Game Config at:
//  https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  width: 1440,
  height: 788,
  parent: 'game-container',
  backgroundColor: '#028af8',
  // Pixel art rendering settings
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 2000, x: 0 },
      debug: false
    }
  },
  scene: [
    Boot,
    Preloader,
    MainMenu,
    Level0,
    Level1
  ]
};

const StartGame = (parent: string) => {

  return new Game({ ...config, parent });

}

export default StartGame;
