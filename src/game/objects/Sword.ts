import Phaser from 'phaser';
import { Player } from './Player';

export class Sword extends Phaser.GameObjects.Sprite {
  private player: Player;
  
  constructor(scene: Phaser.Scene, player: Player) {
    super(scene, 0, 0, 'hornet', 0); // Simple initialization
    this.player = player;
    
    scene.add.existing(this);
    
    // Set depth to be in front of the player
    this.setDepth(20);
    
    // Hide by default
    this.setVisible(false);
    
    this.initAnimations();
  }

  initAnimations(): void {
    // Placeholder for future sword animations
    // Sword sprite dimensions: 40px wide x 32px high
    // Add animations here when sword sprites are available
  }

  update(): void {
    // Simple positioning - just follow player
    this.setPosition(this.player.x, this.player.y);
    
    // Hide sword since we're using attack overlay system now
    this.setVisible(false);
  }
} 