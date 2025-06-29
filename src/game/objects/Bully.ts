import Phaser from 'phaser';

export class Bully extends Phaser.Physics.Arcade.Sprite {
  // Movement constants
  private readonly MOVE_SPEED = 150; // Slower than player
  private readonly JUMP_VELOCITY = -500; // Can jump
  private readonly ACCELERATION = 800;
  private readonly FRICTION = 800;
  
  // AI constants
  private readonly PATH_DISTANCE = 300; // Distance to travel on path
  private readonly ATTACK_RANGE = 20; // Pixels to attack player (reduced so player has advantage)
  private readonly ATTACK_COOLDOWN = 1500; // ms between attacks
  private readonly ATTACK_DURATION = 400; // ms for attack animation
  private readonly STUN_DURATION = 200; // ms stunned when hit (shorter duration)
  private readonly KNOCKBACK_FORCE = 200; // Knockback force when hit
  private readonly KNOCKBACK_DURATION = 300; // ms for knockback
  
  // Health and damage
  private readonly MAX_HEALTH = 3;
  private health: number = this.MAX_HEALTH;
  private readonly DAMAGE_TO_PLAYER = 1;
  
  // AI state
  private aiState: 'idle' | 'patrol' | 'attack' | 'stunned' | 'knockback' | 'dead' = 'patrol';
  private patrolDirection: number = 1; // 1 for right, -1 for left
  private facingDirection: number = 1;
  private patrolStartX: number;
  private lastAttackTime: number = 0;
  private stunStartTime: number = 0;
  private attackStartTime: number = 0;
  private knockbackStartTime: number = 0;
  private knockbackDirection: number = 0;
  
  // References
  private player: Phaser.Physics.Arcade.Sprite;
  
  // Visual effects
  private hitFlashTimer: number = 0;
  private deathTimer: number = 0;
  private readonly DEATH_DURATION = 10000; // ms for death animation (10 seconds)
  private readonly FALL_DURATION = 500; // ms to fall over (0.5 seconds)
  private readonly DROP_DURATION = 200; // ms to drop down when laying (0.2 seconds)
  private targetRotation: number = 0; // Target rotation for falling over
  private hasStartedFalling: boolean = false;
  private dropStartTime: number = 0;
  private originalY: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, player: Phaser.Physics.Arcade.Sprite) {
    super(scene, x, y, 'bully');
    
    this.player = player;
    this.patrolStartX = x;
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    // Scale up the bully to be closer to player size
    this.setScale(1.2);
    
    // Set physics body size (adjusted for scale and sprite padding)
    // Account for 25% padding on each side like the player
    const bodyWidth = 18; // Smaller to account for horizontal padding (30px * 0.6 for padding)
    const bodyHeight = 24; // Reduced height to crop 15% from bottom
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(bodyWidth, bodyHeight, false); // Don't center the body
    // Position body to crop 15% from bottom - offset it up by ~4 pixels
    body.setOffset((this.width - bodyWidth) / 2, 4);
    
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
        
      case 'knockback':
        this.handleKnockbackState(time);
        break;
        
      case 'attack':
        this.handleAttackState(time);
        break;
        
      case 'patrol':
        this.handlePatrolState(distanceToPlayer);
        break;
        
      case 'idle':
        this.handleIdleState();
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
    if (body && body.enable) {
      body.setAccelerationX(0);
    }
  }
  
  private handleKnockbackState(time: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    if (!body || !body.enable) {
      this.aiState = 'idle';
      return;
    }
    
    // Apply knockback force
    if (time - this.knockbackStartTime < this.KNOCKBACK_DURATION) {
      body.setVelocityX(this.knockbackDirection * this.KNOCKBACK_FORCE);
    } else {
      // Knockback finished, return to idle
      this.aiState = 'idle';
      body.setAccelerationX(0);
    }
  }
  
  private handleAttackState(time: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    if (body && body.enable) {
      // Stop movement during attack
      body.setAccelerationX(0);
    }
    
    // Check if attack is finished
    if (time - this.attackStartTime >= this.ATTACK_DURATION) {
      this.aiState = 'idle';
      this.lastAttackTime = time;
    }
  }
  
  private handlePatrolState(distanceToPlayer: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    if (!body || !body.enable) {
      return;
    }
    
    // Check if player is close enough to attack
    if (distanceToPlayer <= this.ATTACK_RANGE) {
      this.startAttack();
      return;
    }
    
    // Follow predetermined path - patrol back and forth
    const distanceFromStart = Math.abs(this.x - this.patrolStartX);
    
    // Change direction if we've gone too far or hit a wall/gap
    if (distanceFromStart >= this.PATH_DISTANCE || !this.canMoveInDirection(this.patrolDirection)) {
      this.patrolDirection *= -1;
    }
    
    this.facingDirection = this.patrolDirection;
    
    if (this.canMoveInDirection(this.patrolDirection)) {
      body.setAccelerationX(this.patrolDirection * this.ACCELERATION * 0.5); // Consistent patrol speed
      
      // Cap the velocity
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
  
  private handleIdleState(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    if (body && body.enable) {
      // Stop movement
      body.setAccelerationX(0);
    }
    
    // Return to patrol after a short idle period
    if (Math.random() < 0.02) { // 2% chance per frame to return to patrol
      this.aiState = 'patrol';
    }
  }
  
  private handleDeath(time: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    if (this.deathTimer === 0) {
      this.deathTimer = time;
      
      // Add dramatic death physics - jump back and fall
      const knockbackDirection = this.x > this.player.x ? 1 : -1;
      
      // Jump up and back (away from player)
      body.setVelocityY(-200); // Jump up
      body.setVelocityX(knockbackDirection * 150); // Fall back away from player
      body.setAcceleration(0, 600); // Apply gravity
      
      // Enable collision with world bounds during death fall
      body.setCollideWorldBounds(false); // They can fall off screen
      
      // Determine which way to fall over (left or right based on knockback direction)
      this.targetRotation = knockbackDirection > 0 ? Math.PI / 2 : -Math.PI / 2; // 90 degrees left or right
      
      // Stop any playing animation
      this.stop();
      
      // Apply dark tint instead of red
      const darkTint = 0x444444; // Consistent dark gray
      this.setTint(darkTint);
      
      // Bully death animation started
    }
    
    const timeSinceDeath = time - this.deathTimer;
    const deathProgress = timeSinceDeath / this.DEATH_DURATION;
    
    // Handle the "falling over" rotation during the first 0.5 seconds
    if (timeSinceDeath <= this.FALL_DURATION) {
      const fallProgress = timeSinceDeath / this.FALL_DURATION;
      // Smooth easing for the fall
      const easedProgress = 1 - Math.pow(1 - fallProgress, 3); // Ease-out cubic
      this.rotation = this.targetRotation * easedProgress;
      
      // Start smooth drop animation when rotation completes (at 99% progress)
      if (easedProgress >= 0.99 && !this.hasStartedFalling) {
        this.hasStartedFalling = true;
        this.dropStartTime = time;
        this.originalY = this.y; // Store current Y position
        
        // Stop physics immediately to prevent bouncing during the drop animation
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body && body.enable) {
          body.enable = false;
          body.setVelocity(0, 0);
        }
        
        // Starting smooth drop animation
      }
      
      // Handle smooth drop animation
      if (this.hasStartedFalling && this.dropStartTime > 0) {
        const dropElapsed = time - this.dropStartTime;
        if (dropElapsed <= this.DROP_DURATION) {
          const dropProgress = dropElapsed / this.DROP_DURATION;
          // Smooth easing for the drop (ease-out)
          const easedDropProgress = 1 - Math.pow(1 - dropProgress, 2);
          this.y = this.originalY + (15 * easedDropProgress); // Smoothly drop 15px
        } else {
          // Ensure final position is exactly 15px lower
          this.y = this.originalY + 15;
        }
      }
    } else {
      // Keep the final rotation (laying on side)
      this.rotation = this.targetRotation;
      
      // Ensure smooth drop starts even if we missed it during rotation (fallback)
      if (!this.hasStartedFalling) {
        this.hasStartedFalling = true;
        this.dropStartTime = time;
        this.originalY = this.y; // Store current Y position
        
        // Stop physics immediately to prevent bouncing during the drop animation
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body && body.enable) {
          body.enable = false;
          body.setVelocity(0, 0);
        }
        
        // Starting smooth drop animation (fallback)
      }
      
      // Handle smooth drop animation (same logic as in rotation phase)
      if (this.hasStartedFalling && this.dropStartTime > 0) {
        const dropElapsed = time - this.dropStartTime;
        if (dropElapsed <= this.DROP_DURATION) {
          const dropProgress = dropElapsed / this.DROP_DURATION;
          // Smooth easing for the drop (ease-out)
          const easedDropProgress = 1 - Math.pow(1 - dropProgress, 2);
          this.y = this.originalY + (15 * easedDropProgress); // Smoothly drop 15px
        } else {
          // Ensure final position is exactly 15px lower
          this.y = this.originalY + 15;
        }
      }
              
        // Physics is now disabled immediately when positioning is applied above
    }
    
    // Fade out effect (start fading after 80% of death duration, so 8 seconds)
    if (deathProgress > 0.8) {
      const fadeProgress = (deathProgress - 0.8) / 0.2; // Fade over last 20% of duration (2 seconds)
      this.setAlpha(Math.max(0, 1 - fadeProgress));
    }
    
    // Destroy after full death duration (10 seconds)
    if (deathProgress >= 1) {
      this.destroy();
    }
  }
  
  private canMoveInDirection(direction: number): boolean {
    // Simple check - in a real implementation you'd raycast to check for walls/gaps
    // For now, just check if we're not blocked by walls
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    // Check if body exists and is enabled
    if (!body || !body.enable) {
      return false;
    }
    
    if (direction > 0 && body.blocked && body.blocked.right) return false;
    if (direction < 0 && body.blocked && body.blocked.left) return false;
    
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
      this.hitFlashTimer -= 16.67; // Decrease by ~1 frame at 60fps
      if (this.hitFlashTimer <= 0) {
        this.clearTint();
      }
    }
  }
  
  private updateAnimations(): void {
    // Don't update animations if dead (animation already stopped) or if sprite is being destroyed
    if (this.aiState === 'dead' || !this.active || !this.anims) {
      return;
    }
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    // Update sprite facing direction
    this.setFlipX(this.facingDirection < 0);
    
    // Play appropriate animation based on state
    switch (this.aiState) {
      case 'stunned':
        if (this.anims) this.play('bully-hit', true);
        break;
        
      case 'attack':
        if (this.anims) this.play('bully-attack', true);
        break;
        
      case 'patrol':
      case 'knockback':
        if (body && body.enable && Math.abs(body.velocity.x) > 10) {
          if (this.anims) this.play('bully-walk', true);
        } else {
          if (this.anims) this.play('bully-idle', true);
        }
        break;
        
      case 'idle':
        if (this.anims) this.play('bully-idle', true);
        break;
    }
  }
  
  // Public methods for external interaction
  public takeDamage(damage: number = 1, attackerX?: number): void {
    if (this.aiState === 'dead') return;
    
    this.health -= damage;
    
    // Visual feedback
    this.setTint(0xffffff); // White flash
    this.hitFlashTimer = 300; // Flash for 300ms
    
    // Determine knockback direction based on attacker position
    if (attackerX !== undefined) {
      this.knockbackDirection = this.x > attackerX ? 1 : -1; // Push away from attacker
    } else {
      this.knockbackDirection = this.facingDirection * -1; // Push opposite to facing direction
    }
    
    if (this.health <= 0) {
      this.die();
    } else {
      this.startKnockback();
    }
  }
  
  private startKnockback(): void {
    this.aiState = 'knockback';
    this.knockbackStartTime = this.scene.time.now;
    
    // Apply immediate knockback velocity
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body && body.enable) {
      body.setVelocityX(this.knockbackDirection * this.KNOCKBACK_FORCE);
    }
  }
  
  private stun(): void {
    this.aiState = 'stunned';
    this.stunStartTime = this.scene.time.now;
  }
  
  private die(): void {
    this.aiState = 'dead';
    this.deathTimer = 0; // Will be set in handleDeath
    
    // Keep physics enabled for death animation, but disable collision with player
    const body = this.body as Phaser.Physics.Arcade.Body;
    // Don't disable the body entirely - we need physics for the death jump!
    // We'll disable collision with player in the scene instead
    
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