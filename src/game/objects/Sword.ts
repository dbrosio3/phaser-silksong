import Phaser from 'phaser';
import { Player } from './Player';

export class Sword extends Phaser.GameObjects.Sprite {
  private player: Player;
  private wasAttacking: boolean = false; // Track previous attack state
  
  // Sword scaling factor
  private readonly SWORD_SCALE = 0.85;
  
  // Frame-specific offsets for positioning (relative to player)
  private readonly frameOffsets: { [key: number]: { x: number, y: number } } = {    
    // Attack frames (202-207)
    202: { x: -60, y: -40 },
    203: { x: -50, y: -30 },
    204: { x: -50, y: -30 },
    205: { x: 60, y: -10 },
    206: { x: 70, y: 20 },
    207: { x: 70, y: 20 },
    208: { x: 70, y: 20 },
  };

  constructor(scene: Phaser.Scene,  player: Player) {
    super(scene, 0, 0, 'hornet', 202); // Start with first sword frame
    this.player = player;
    
    scene.add.existing(this);
    
    // Set depth to be behind the player
    this.setDepth(0);
    
    // Scale down the sword
    this.setScale(this.SWORD_SCALE);
    
    this.initAnimations();
  }

  initAnimations(): void {
    // Sword attack animation - row 12, columns 10-15 (frames 202-207)
    this.anims.create({
      key: 'sword_attack',
      frames: this.anims.generateFrameNumbers('hornet', {
        start: 202, 
        end: 207
      }),
      frameRate: 24 ,
      repeat: 0
    });
  }

  update(): void {
    // Show/hide sword based on attack state
    if (this.player.currentlyAttacking) {
      this.setVisible(true);
      
      // Check if this is the start of a new attack
      if (!this.wasAttacking) {
        // Start the attack animation from the beginning
        this.anims.play('sword_attack');
      }
      
      // Get current frame number
      const currentFrame = parseInt(this.frame.name as string, 10);
      
      // Get offset for current frame (default to frame 202 if not found)
      const offset = this.frameOffsets[currentFrame] || this.frameOffsets[202];
      
      // Calculate position with frame-specific offsets
      // Mirror X offset based on player facing direction
      const facingDirection = this.player.currentFacingDirection;
      const xOffset = offset.x * facingDirection;
      const yOffset = offset.y;
      
      // Position sword relative to player with offsets
      this.x = this.player.x + xOffset;
      this.y = this.player.y + yOffset;
      
      // Match player's facing direction
      this.setFlipX(facingDirection < 0);
    } else {
      // Hide sword when not attacking
      this.setVisible(false);
    }
    
    // Update attack state tracking
    this.wasAttacking = this.player.currentlyAttacking;
  }
} 