import { GameObjects, Scene } from 'phaser';
import { EventBus } from '../EventBus';

export class Level1 extends Scene {
  background: GameObjects.Image;
  titleText: GameObjects.Text;
  completionText: GameObjects.Text;
  backButton: GameObjects.Text;

  constructor() {
    super('Level1');
  }

  create() {
    // Add background
    this.background = this.add.image(720, 394, 'sky');
    this.background.setScale(1.8, 1.3); // Scale to fit the new resolution
    this.background.setTint(0x444444); // Darker tint for different feel
    
    // Add title
    this.titleText = this.add.text(720, 150, 'Level 1', {
      fontFamily: 'Arial Black',
      fontSize: 64,
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 8,
      align: 'center'
    }).setOrigin(0.5);

    // Add completion message
    this.completionText = this.add.text(720, 300, 'Congratulations!\nYou completed Level 0!\n\nLevel 1 coming soon...', {
      fontFamily: 'Arial',
      fontSize: 32,
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center'
    }).setOrigin(0.5);

    // Add back to menu button
    this.backButton = this.add.text(720, 500, 'Back to Menu', {
      fontFamily: 'Arial Black',
      fontSize: 36,
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center'
    }).setOrigin(0.5);

    // Make back button interactive
    this.backButton.setInteractive({ useHandCursor: true });
    
    // Button hover effects
    this.backButton.on('pointerover', () => {
      this.backButton.setScale(1.1);
      this.backButton.setTint(0x00ff00);
    });

    this.backButton.on('pointerout', () => {
      this.backButton.setScale(1);
      this.backButton.clearTint();
    });

    // Button click handler
    this.backButton.on('pointerdown', () => {
      this.scene.start('MainMenu');
    });

    // Also allow Escape key to go back
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-ESC', () => {
        this.scene.start('MainMenu');
      });
    }

    EventBus.emit('current-scene-ready', this);
  }
} 