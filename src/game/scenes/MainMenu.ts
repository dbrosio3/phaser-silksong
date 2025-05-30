import { GameObjects, Scene } from 'phaser';
import { EventBus } from '../EventBus';

export class MainMenu extends Scene {
  background: GameObjects.Image;
  titleText: GameObjects.Text;
  playButton: GameObjects.Text;

  constructor() {
    super('MainMenu');
  }

  create() {
    // Add background
    this.background = this.add.image(720, 394, 'sky');
    this.background.setScale(1.8, 1.3); // Scale to fit the new resolution
    
    // Add title
    this.titleText = this.add.text(720, 200, 'Platformer Game', {
      fontFamily: 'Arial Black',
      fontSize: 64,
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 8,
      align: 'center'
    }).setOrigin(0.5);

    // Add play button
    this.playButton = this.add.text(720, 400, 'Play', {
      fontFamily: 'Arial Black',
      fontSize: 48,
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 6,
      align: 'center'
    }).setOrigin(0.5);

    // Make play button interactive
    this.playButton.setInteractive({ useHandCursor: true });
    
    // Button hover effects
    this.playButton.on('pointerover', () => {
      this.playButton.setScale(1.1);
      this.playButton.setTint(0x00ff00);
    });

    this.playButton.on('pointerout', () => {
      this.playButton.setScale(1);
      this.playButton.clearTint();
    });

    // Button click handler
    this.playButton.on('pointerdown', () => {
      this.scene.start('Level0');
    });

    // Also allow Enter key to start game
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-ENTER', () => {
        this.scene.start('Level0');
      });
    }

    EventBus.emit('current-scene-ready', this);
  }
}
