import { Scene } from 'phaser';

export class Preloader extends Scene {
  constructor() {
    super('Preloader');
  }

  preload() {
    // Load the assets for the game
    this.load.setPath('assets');

    this.load.image('sky', 'sky.png');
    this.load.image('ground', 'ground.png');
    this.load.image('ground2', 'ground_2.png');
    this.load.spritesheet('star', 'star.png', {
        frameWidth: 37, frameHeight: 37
    });
    this.load.spritesheet('hornet', 'hornet-px.png', {
        frameWidth: 32, frameHeight: 32
    });
    this.load.spritesheet('hornet-attack', 'hornet_attack.png', {
        frameWidth: 40, frameHeight: 32  // Correct dimensions: 40px wide x 32px high
    });
  }

  create() {
    // Go directly to MainMenu after loading
    this.scene.start('MainMenu');
  }
}
