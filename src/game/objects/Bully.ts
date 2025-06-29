import Phaser from 'phaser';

export class Bully extends Phaser.Physics.Arcade.Sprite {
  // Movement constants
  private readonly MOVE_SPEED = 150; // Slower than player
  private readonly JUMP_VELOCITY = -500; // Can jump
  private readonly ACCELERATION = 800;
  private readonly FRICTION = 800;
  
  // AI constants
  private readonly DETECTION_RANGE = 300; // Pixels to detect player
  private readonly ATTACK_RANGE = 50; // Pixels to attack player
  private readonly PATROL_DISTANCE = 200; // Distance to patrol
  private readonly ATTACK_COOLDOWN = 1500; // ms between attacks
  private readonly ATTACK_DURATION = 400; // ms for attack animation
  private readonly STUN_DURATION = 800; // ms stunned when hit
  private readonly JUMP_CHECK_DISTANCE = 80; // Distance ahead to check for gaps/walls
  
  // Health and damage
  private readonly MAX_HEALTH = 3;
  private health: number = this.MAX_HEALTH;
  private readonly DAMAGE_TO_PLAYER = 1;
  
  // AI state
  private aiState: 'idle' | 'patrol' | 'chase' | 'attack' | 'stunned' | 'dead' = 'patrol';
  private patrolDirection: number = 1; // 1 for right, -1 for left
  private facingDirection: number = 1;
  private patrolStartX: number;
  private lastAttackTime: number = 0;
  private stunStartTime: number = 0;
  private attackStartTime: number = 0;
  
  // References
  private player: Phaser.Physics.Arcade.Sprite;
  
  // Visual effects
  private hitFlashTimer: number = 0;
  private deathTimer: number = 0;
  private readonly DEATH_DURATION = 1000; // ms for death animation

  constructor(scene: Phaser.Scene, x: number, y: number, player: Phaser.Physics.Arcade.Sprite) {
    super(scene, x, y, 'bully');
    
    this.player = player;
    this.patrolStartX = x;
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    // Set physics body size
    const bodyWidth = 24; // Adjust based on sprite
    const bodyHeight = 32;
    (this.body as Phaser.Physics.Arcade.Body).setSize(bodyWidth, bodyHeight, true);
    
    this.setBounce(0.1);
    this.setCollideWorldBounds(true);
    this.setDragX(this.FRICTION);
    this.setDepth(1);
    
    this.initAnimations();
  }
  
  initAnimations(): void {
    // Create animations based on the spritesheet layout
    // Assuming the bully spritesheet has similar layout to player
    
    // Idle animation
    this.anims.create({
      key: 'bully-idle',
      frames: [{ key: 'bully', frame: 0 }],
      frameRate: 1,
    });
    
    // Walk animation
    this.anims.create({
      key: 'bully-walk',
      frames: this.anims.generateFrameNumbers('bully', {
        start: 0,
        end: 3
      }),
      frameRate: 8,
      repeat: -1
    });
    
    // Attack animation
    this.anims.create({
      key: 'bully-attack',
      frames: this.anims.generateFrameNumbers('bully', {
        start: 4,
        end: 7
      }),
      frameRate: 12,
      repeat: 0
    });
    
    // Hit/stunned animation
    this.anims.create({
      key: 'bully-hit',
      frames: [{ key: 'bully', frame: 8 }],
      frameRate: 1,
    });
    
    // Death animation
    this.anims.create({
      key: 'bully-death',
      frames: [{ key: 'bully', frame: 9 }],
      frameRate: 1,
    });
  }
  
  update(time: number, delta: number): void {
    if (this.aiState === 'dead') {
      this.handleDeath(time);
      return;
    }
    
    this.updateAI(time);
    this.updateVisualEffects(time);
    this.updateAnimations();
  }
  
  private updateAI(time: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const distanceToPlayer = Phaser.Math.Distance.Between(this.x, this.y, this.player.x, this.player.y);
    
    // Handle different AI states
    switch (this.aiState) {
      case 'stunned':
        this.handleStunnedState(time);
        break;
        
      case 'attack':
        this.handleAttackState(time);
        break;
        
      case 'chase':
        this.handleChaseState(distanceToPlayer);
        break;
        
      case 'patrol':
        this.handlePatrolState(distanceToPlayer);
        break;
        
      case 'idle':
        this.handleIdleState(distanceToPlayer);
        break;
    }
  }
  
  private handleStunnedState(time: number): void {
    // Stay stunned for the duration
    if (time - this.stunStartTime >= this.STUN_DURATION) {
      this.aiState = 'idle';
    }
    
    // Stop movement while stunned
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAccelerationX(0);
  }
  
  private handleAttackState(time: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    // Stop movement during attack
    body.setAccelerationX(0);
    
    // Check if attack is finished
    if (time - this.attackStartTime >= this.ATTACK_DURATION) {
      this.aiState = 'idle';
      this.lastAttackTime = time;
    }
  }
  
  private handleChaseState(distanceToPlayer: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    // Check if player is in attack range
    if (distanceToPlayer <= this.ATTACK_RANGE) {
      this.startAttack();
      return;
    }
    
    // Check if player is out of detection range
    if (distanceToPlayer > this.DETECTION_RANGE) {
      this.aiState = 'patrol';
      return;
    }
    
    // Move towards player
    const directionToPlayer = this.player.x > this.x ? 1 : -1;
    this.facingDirection = directionToPlayer;
    
    // Check for obstacles/gaps before moving
    if (this.canMoveInDirection(directionToPlayer)) {
      body.setAccelerationX(directionToPlayer * this.ACCELERATION);
      
      // Cap the velocity
      if (directionToPlayer > 0 && body.velocity.x > this.MOVE_SPEED) {
        body.setVelocityX(this.MOVE_SPEED);
      } else if (directionToPlayer < 0 && body.velocity.x < -this.MOVE_SPEED) {
        body.setVelocityX(-this.MOVE_SPEED);
      }
    } else {
      // Try to jump over obstacle
      if (body.blocked.down) {
        body.setVelocityY(this.JUMP_VELOCITY);
      }
    }
  }
  
  private handlePatrolState(distanceToPlayer: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    // Check if player is in detection range
    if (distanceToPlayer <= this.DETECTION_RANGE) {
      this.aiState = 'chase';
      return;
    }
    
    // Patrol movement
    const distanceFromStart = Math.abs(this.x - this.patrolStartX);
    
    // Change direction if we've gone too far or hit a wall/gap
    if (distanceFromStart >= this.PATROL_DISTANCE || !this.canMoveInDirection(this.patrolDirection)) {
      this.patrolDirection *= -1;
    }
    
    this.facingDirection = this.patrolDirection;
    
    if (this.canMoveInDirection(this.patrolDirection)) {
      body.setAccelerationX(this.patrolDirection * this.ACCELERATION * 0.5); // Slower patrol speed
      
      // Cap the velocity (slower than chase)
      const patrolSpeed = this.MOVE_SPEED * 0.6;
      if (this.patrolDirection > 0 && body.velocity.x > patrolSpeed) {
        body.setVelocityX(patrolSpeed);
      } else if (this.patrolDirection < 0 && body.velocity.x < -patrolSpeed) {
        body.setVelocityX(-patrolSpeed);
      }
    } else {
      body.setAccelerationX(0);
    }
  }
  
  private handleIdleState(distanceToPlayer: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    // Check if player is in detection range
    if (distanceToPlayer <= this.DETECTION_RANGE) {
      this.aiState = 'chase';
      return;
    }
    
    // Return to patrol after a short idle period
    body.setAccelerationX(0);
    
    // Randomly return to patrol (simple timer-based)
    if (Math.random() < 0.01) { // 1% chance per frame to return to patrol
      this.aiState = 'patrol';
    }
  }
  
  private handleDeath(time: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    if (this.deathTimer === 0) {
      this.deathTimer = time;
      body.setAccelerationX(0);
      body.setVelocityX(0);
    }
    
    // Fade out and destroy after death duration
    if (time - this.deathTimer >= this.DEATH_DURATION) {
      this.destroy();
    } else {
      // Fade out effect
      const fadeProgress = (time - this.deathTimer) / this.DEATH_DURATION;
      this.setAlpha(1 - fadeProgress);
    }
  }
  
  private canMoveInDirection(direction: number): boolean {
    // Simple check - in a real implementation you'd raycast to check for walls/gaps
    // For now, just check if we're not blocked by walls
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    if (direction > 0 && body.blocked.right) return false;
    if (direction < 0 && body.blocked.left) return false;
    
    return true;
  }
  
  private startAttack(): void {
    const currentTime = this.scene.time.now;
    
    // Check attack cooldown
    if (currentTime - this.lastAttackTime >= this.ATTACK_COOLDOWN) {
      this.aiState = 'attack';
      this.attackStartTime = currentTime;
      
      // Create attack hitbox or trigger damage
      this.dealDamageToPlayer();
    }
  }
  
  private dealDamageToPlayer(): void {
    // This would typically be handled by collision detection in the scene
    // For now, we'll emit an event that the scene can listen to
    this.scene.events.emit('bully-attack', {
      bully: this,
      damage: this.DAMAGE_TO_PLAYER,
      x: this.x,
      y: this.y
    });
  }
  
  private updateVisualEffects(time: number): void {
    // Handle hit flash effect
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= time;
      if (this.hitFlashTimer <= 0) {
        this.clearTint();
      }
    }
  }
  
  private updateAnimations(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    // Update sprite facing direction
    this.setFlipX(this.facingDirection < 0);
    
    // Play appropriate animation based on state
    switch (this.aiState) {
      case 'dead':
        this.play('bully-death', true);
        break;
        
      case 'stunned':
        this.play('bully-hit', true);
        break;
        
      case 'attack':
        this.play('bully-attack', true);
        break;
        
      case 'chase':
      case 'patrol':
        if (Math.abs(body.velocity.x) > 10) {
          this.play('bully-walk', true);
        } else {
          this.play('bully-idle', true);
        }
        break;
        
      case 'idle':
        this.play('bully-idle', true);
        break;
    }
  }
  
  // Public methods for external interaction
  public takeDamage(damage: number = 1): void {
    if (this.aiState === 'dead') return;
    
    this.health -= damage;
    
    // Visual feedback
    this.setTint(0xff0000); // Red flash
    this.hitFlashTimer = 200; // Flash for 200ms
    
    if (this.health <= 0) {
      this.die();
    } else {
      this.stun();
    }
  }
  
  private stun(): void {
    this.aiState = 'stunned';
    this.stunStartTime = this.scene.time.now;
  }
  
  private die(): void {
    this.aiState = 'dead';
    this.deathTimer = 0; // Will be set in handleDeath
    
    // Emit death event
    this.scene.events.emit('bully-death', {
      bully: this,
      x: this.x,
      y: this.y
    });
  }
  
  public get isDead(): boolean {
    return this.aiState === 'dead';
  }
  
  public get currentHealth(): number {
    return this.health;
  }
  
  public get maxHealth(): number {
    return this.MAX_HEALTH;
  }
} 