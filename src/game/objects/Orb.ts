import Phaser from 'phaser';
import { Player } from './Player';

export class Orb extends Phaser.GameObjects.Sprite {
  private player: Player;
  private baseOffset: { x: number; y: number };
  private floatOffset: { x: number; y: number };
  private floatTime: number = 0;
  private isActive: boolean = false;
  private fadeInTween: Phaser.Tweens.Tween | null = null;
  private fadeOutTween: Phaser.Tweens.Tween | null = null;
  
  // State management
  private orbState: 'inactive' | 'waiting' | 'approaching' | 'following' | 'talking' = 'inactive';
  private spawnPosition: { x: number; y: number } = { x: 0, y: 0 };
  private hasSpokenToPlayer: boolean = false;
  
  // Dialog system
  private dialogMessages: string[] = [
    "Que? Que haces acá? Es muy temprano...",
    "Este universo esta muy inestable todavia, no sé si encontrarás lo que buscas"
  ];
  private currentDialogIndex: number = 0;
  
  // Orientation tracking
  private facingDirection: number = 1; // 1 for right, -1 for left
  private lastPosition: { x: number; y: number } = { x: 0, y: 0 };
  
  // Floating behavior parameters
  private readonly FLOAT_SPEED = 2; // Speed of floating motion
  private readonly FLOAT_AMPLITUDE_X = 15; // Horizontal floating range
  private readonly FLOAT_AMPLITUDE_Y = 10; // Vertical floating range
  private readonly FOLLOW_SPEED = 0.05; // How fast orb follows player (0-1)
  private readonly APPROACH_SPEED = 0.8; // Speed when approaching player
  
  // Detection and interaction parameters
  private readonly DETECTION_RADIUS = 120; // How close player needs to be to trigger approach
  private readonly TALK_RADIUS = 50; // How close orb needs to be to player to start talking
  
  // Fade parameters
  private readonly FADE_DURATION = 800; // Fade in/out duration in ms
  
  constructor(scene: Phaser.Scene, player: Player, spawnX: number, spawnY: number) {
    super(scene, spawnX, spawnY, 'orb');
    this.player = player;
    this.spawnPosition = { x: spawnX, y: spawnY };
    
    scene.add.existing(this);
    
    // Scale up to be more visible
    this.setScale(1);
    
    // Set depth to be behind the player but in front of background
    this.setDepth(0.5);
    
    // Start hidden
    this.setAlpha(0);
    this.setVisible(false);
    
    // Initialize base offset (orb will orbit around this offset from player when following)
    this.baseOffset = { x: -30, y: -20 }; // Start to the left and slightly above player
    this.floatOffset = { x: 0, y: 0 };
    
    // Initialize position tracking
    this.lastPosition = { x: spawnX, y: spawnY };
    
    // Set initial facing direction (right by default)
    this.setFlipX(false);
  }
  
  private updatePosition(): void {
    if (this.orbState === 'inactive') return;
    
    switch (this.orbState) {
      case 'waiting':
        // Stay at spawn position with floating motion
        const waitingX = this.spawnPosition.x + this.floatOffset.x;
        const waitingY = this.spawnPosition.y + this.floatOffset.y;
        this.setPosition(waitingX, waitingY);
        break;
        
      case 'approaching':
        // Move towards player
        const targetX = this.player.x;
        const targetY = this.player.y - 30; // Slightly above player
        this.x = Phaser.Math.Linear(this.x, targetX, this.APPROACH_SPEED);
        this.y = Phaser.Math.Linear(this.y, targetY, this.APPROACH_SPEED);
        
        // Check if close enough to start talking
        const distanceToPlayer = Phaser.Math.Distance.Between(this.x, this.y, this.player.x, this.player.y);

        if (distanceToPlayer < this.TALK_RADIUS) {
          this.startTalking();
        }
        break;
        
      case 'following':
        // Follow player with offset and floating motion
        const followX = this.player.x + this.baseOffset.x + this.floatOffset.x;
        const followY = this.player.y + this.baseOffset.y + this.floatOffset.y;
        this.x = Phaser.Math.Linear(this.x, followX, this.FOLLOW_SPEED);
        this.y = Phaser.Math.Linear(this.y, followY, this.FOLLOW_SPEED);
        break;
        
      case 'talking':
        // Position above and to the right of player during dialog
        const talkX = this.player.x + 40; // 40px to the right
        const talkY = this.player.y - 60; // 60px above
        this.setPosition(talkX, talkY);
        
        // Face the player during conversation (always face left since we're to the right)
        this.facingDirection = -1;
        this.setFlipX(true);
        break;
    }
  }
  
  private updateFloating(time: number): void {
    if (this.orbState === 'inactive') return;
    
    // Update float time
    this.floatTime = time * 0.001; // Convert to seconds
    
    // Only apply floating motion when waiting or following
    if (this.orbState === 'waiting' || this.orbState === 'following') {
      // Calculate floating offsets using sine waves with different phases
      this.floatOffset.x = Math.sin(this.floatTime * this.FLOAT_SPEED) * this.FLOAT_AMPLITUDE_X;
      this.floatOffset.y = Math.sin(this.floatTime * this.FLOAT_SPEED * 1.3 + 1) * this.FLOAT_AMPLITUDE_Y;
    } else {
      // Reset floating offset when not floating
      this.floatOffset.x = 0;
      this.floatOffset.y = 0;
    }
  }
  
  public spawn(): void {
    if (this.orbState !== 'inactive') return;
    
    this.orbState = 'waiting';
    this.isActive = true;
    this.setVisible(true);
    
    // Reset dialog system
    this.currentDialogIndex = 0;
    this.hasSpokenToPlayer = false;
    
    // Position at spawn location
    this.setPosition(this.spawnPosition.x, this.spawnPosition.y);
    
    // Cancel any existing fade out tween
    if (this.fadeOutTween) {
      this.fadeOutTween.destroy();
      this.fadeOutTween = null;
    }
    
    // Fade in
    this.fadeInTween = this.scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: this.FADE_DURATION,
      ease: 'Power2'
    });
  }
  
  public despawn(): void {
    if (!this.isActive) return;
    
    // Cancel any existing fade in tween
    if (this.fadeInTween) {
      this.fadeInTween.destroy();
      this.fadeInTween = null;
    }
    
    // Fade out
    this.fadeOutTween = this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: this.FADE_DURATION,
      ease: 'Power2',
      onComplete: () => {
        this.isActive = false;
        this.orbState = 'inactive';
        this.setVisible(false);
      }
    });
  }
  
  private startTalking(): void {

    this.orbState = 'talking';
    // Emit event to trigger dialog with current message
    this.scene.events.emit('orb-talk', {
      text: this.dialogMessages[this.currentDialogIndex],
      orb: this
    });
  }
  
  public finishTalking(): void {
    // Advance to next dialog message
    this.currentDialogIndex++;
    
    // Check if there are more messages
    if (this.currentDialogIndex < this.dialogMessages.length) {
      // Show next message immediately
      this.startTalking();
    } else {
      // No more messages, finish conversation
      if (!this.hasSpokenToPlayer) {
        this.hasSpokenToPlayer = true;
        this.orbState = 'following';
      }
    }
  }
  
  private checkPlayerProximity(): void {
    if (this.orbState !== 'waiting') return;
    
    // Don't approach if already spoken to player
    if (this.hasSpokenToPlayer) return;
    
    const distanceToPlayer = Phaser.Math.Distance.Between(
      this.x, this.y, 
      this.player.x, this.player.y
    );
    
    if (distanceToPlayer < this.DETECTION_RADIUS) {

      this.orbState = 'approaching';
    }
  }
  
  private updateOrientation(): void {
    // Calculate movement direction based on position change
    const deltaX = this.x - this.lastPosition.x;
    
    // Only change orientation if there's significant horizontal movement
    if (Math.abs(deltaX) > 0.5) {
      if (deltaX > 0) {
        // Moving right
        this.facingDirection = 1;
        this.setFlipX(false);
      } else {
        // Moving left
        this.facingDirection = -1;
        this.setFlipX(true);
      }
    }
    
    // For approaching state, also consider target direction
    if (this.orbState === 'approaching') {
      const targetDirection = this.player.x > this.x ? 1 : -1;
      if (targetDirection !== this.facingDirection) {
        this.facingDirection = targetDirection;
        this.setFlipX(targetDirection < 0);
      }
    }
    
    // Update last position for next frame
    this.lastPosition.x = this.x;
    this.lastPosition.y = this.y;
  }
  
  public update(time: number): void {
    if (!this.isActive) return;
    
    // System working - debug logs removed
    
    this.checkPlayerProximity();
    this.updateFloating(time);
    this.updatePosition();
    this.updateOrientation();
  }
  
  public get isActiveOrb(): boolean {
    return this.isActive;
  }
  
  public get currentState(): string {
    return this.orbState;
  }
} 