import { Scene } from 'phaser';

export class Preloader extends Scene {
  constructor() {
    super('Preloader');
  }

  preload() {
    // Load the assets for the game
    this.load.setPath('assets');

    this.load.image('sky', 'sky.png');
    this.load.image('px_bg', 'px_bg.png');
    this.load.image('bg7', 'bg7.png');
    this.load.image('ground', 'ground.png');
    this.load.image('ground2', 'ground_2.png');
    this.load.image('grassy_floor', 'grassy_floor.png');
    this.load.spritesheet('star', 'star.png', {
        frameWidth: 37, frameHeight: 37
    });
    this.load.spritesheet('hornet', 'hornet-px.png', {
        frameWidth: 32, frameHeight: 32
    });
    this.load.spritesheet('hornet-attack', 'hornet_attack.png', {
        frameWidth: 40, frameHeight: 32  // Correct dimensions: 40px wide x 32px high
    });
    this.load.spritesheet('bully', 'huskbullypixel.png', {
        frameWidth: 30, frameHeight: 30  // Adjust frame size based on your spritesheet
    });

    // Load the orb sprite
    this.load.image('orb', 'theknightpixe_fade.png');

    // Load tilemap assets
    this.load.tilemapTiledJSON('level0-map', 'game.json');
    this.load.spritesheet('grass-spritesheet', 'grass-spritesheet.png', {
        frameWidth: 32, frameHeight: 32
    });
    // Load the new island tileset
    this.load.image('island', 'island.png');
    // Load the grass_tiles tileset
    this.load.image('grass_tiles', 'grass_tiles.png');
  }

  create() {
    // Go directly to MainMenu after loading
    this.scene.start('MainMenu');
  }
}
