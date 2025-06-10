import Phaser from 'phaser';

export class Player extends Phaser.Physics.Arcade.Sprite {
  // Movement constants
  private readonly MOVE_SPEED = 500;
  private readonly JUMP_VELOCITY = -1000; // More negative = jumps higher/faster
  private readonly ACCELERATION = 3000; // Higher = reaches max speed faster
  private readonly AIR_ACCELERATION = 800; // Higher = more air control
  private readonly FRICTION = 3000; // Higher = stops sliding sooner
  private readonly AIR_FRICTION = 800; // Higher = less air sliding

  // Dash constants
  private readonly DASH_SPEED = 2000; // Dash speed
  private readonly DASH_DURATION = 200; // ms
  private readonly DASH_COOLDOWN = 500; // ms between dashes

  // Attack constants
  private readonly WHIP_DURATION = 300; // ms (roughly 6 frames at 28fps)

  // Coyote time and jump buffering
  private readonly COYOTE_TIME = 150; // ms after leaving ground where jump is still allowed
  private readonly JUMP_BUFFER_TIME = 100; // ms before landing where jump input is remembered

  // Double jump settings
  private readonly MAX_JUMPS = 2; // Allow double jump

  // Attack overlay sprite
  private attackOverlay: Phaser.GameObjects.Sprite;

  // State tracking
  private lastGroundedTime: number = 0;
  private jumpBufferTime: number = 0;
  private isGrounded: boolean = false;
  private jumpsRemaining: number = this.MAX_JUMPS;
  private hasJumped: boolean = false; // Track if player has actually jumped

  // Direction and dash state
  private facingDirection: number = 1; // 1 for right, -1 for left (always has a direction)
  private isDashing: boolean = false;
  private dashStartTime: number = 0;
  private lastDashTime: number = 0;

  // Attack state
  private isAttacking: boolean = false;
  private attackStartTime: number = 0;

  // Input tracking
  private leftPressed: boolean = false;
  private rightPressed: boolean = false;
  private jumpJustPressed: boolean = false;
  private dashJustPressed: boolean = false;
  private attackJustPressed: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'hornet');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Scale up the 32x32 sprite to 96x96 for good visibility
    this.setScale(3, 3);

    // Create attack overlay sprite
    this.attackOverlay = scene.add.sprite(x, y, 'hornet-attack');
    this.attackOverlay.setScale(3, 3); // Match player scale
    this.attackOverlay.setDepth(2); // Render above player (player is depth 1)
    this.attackOverlay.setVisible(false); // Initially hidden

    // Reduce bounce for less floaty feel
    this.setBounce(0.1);
    this.setCollideWorldBounds(true);

    // Set depth to be behind the sword
    this.setDepth(1);

    // Set drag for better control
    this.setDragX(this.FRICTION);

    this.initAnimations();
  }

  initAnimations(): void {
    // Row 1: Idle animation (1 frame)
    this.anims.create({
      key: 'idle',
      frames: [{ key: 'hornet', frame: 0 }],
      frameRate: 1,
    });

    // Row 2: Running animation (4 frames)
    this.anims.create({
      key: 'run',
      frames: this.anims.generateFrameNumbers('hornet', {
        start: 4,
        end: 7
      }),
      frameRate: 12,
      repeat: -1
    });

    // Row 3: Dash animation (3 frames)
    this.anims.create({
      key: 'dash',
      frames: this.anims.generateFrameNumbers('hornet', {
        start: 8,
        end: 10
      }),
      frameRate: 12,
      repeat: -1
    });

    // Row 4: Jump animation (4 frames)
    this.anims.create({
      key: 'jump',
      frames: this.anims.generateFrameNumbers('hornet', {
        start: 12,
        end: 15
      }),
      frameRate: 8,
      repeat: 1,
    });

    // Attack overlay animations
    this.scene.anims.create({
      key: 'attack-overlay',
      frames: this.scene.anims.generateFrameNumbers('hornet-attack', {
        start: 0,
        end: 3  // Adjust based on actual frame count
        
      }),
      frameRate: 24,
      repeat: 0 // Play once
    });
  }


  // Call this from the scene's update method
  update(time: number, delta: number): void {
    this.updateGroundedState(time);
    this.handleDashing(time);
    this.handleAttacking(time);
    this.handleMovement(delta);
    this.handleJumping(time);
    this.updateAnimations();
    this.updateAttackOverlay();
  }

  private updateGroundedState(time: number): void {
    const wasGrounded = this.isGrounded;
    this.isGrounded = this.body && (this.body as Phaser.Physics.Arcade.Body).blocked.down || false;

    if (this.isGrounded) {
      this.lastGroundedTime = time;
      // Reset jumps and jump state when landing
      if (!wasGrounded) {
        this.jumpsRemaining = this.MAX_JUMPS;
        this.hasJumped = false; // Reset jump state when landing
      }
      // Reset drag when grounded for better ground control
      this.setDragX(this.FRICTION);
    } else {
      // Reduce drag in air for better air control
      this.setDragX(this.AIR_FRICTION);
    }
  }

  private handleDashing(time: number): void {
    // Check if dash duration is over
    if (this.isDashing && time - this.dashStartTime >= this.DASH_DURATION) {
      this.isDashing = false;
    }

    // Maintain dash momentum and compensate for gravity during dash
    if (this.isDashing) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setVelocityX(this.facingDirection * this.DASH_SPEED);
      body.setVelocityY(0); // Continuously compensate for gravity
    }

    // Check if player wants to start a new dash
    if (this.dashJustPressed && !this.isDashing) {
      // Check cooldown
      const timeSinceLastDash = time - this.lastDashTime;
      if (timeSinceLastDash >= this.DASH_COOLDOWN) {
        this.startDash(time);
      }
    }
  }

  private startDash(time: number): void {
    this.isDashing = true;
    this.dashStartTime = time;
    this.lastDashTime = time;

    // Set initial dash velocity in facing direction
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(this.facingDirection * this.DASH_SPEED);

    // Compensate for gravity during dash - maintain current Y velocity
    body.setVelocityY(0); // Keep horizontal dash trajectory
  }

  private handleAttacking(time: number): void {
    // Check if attack duration is over
    if (this.isAttacking && time - this.attackStartTime >= this.WHIP_DURATION) {
      this.isAttacking = false;
    }

    // Check if player wants to start a new attack
    if (this.attackJustPressed && !this.isAttacking && !this.isDashing) {
      this.startAttack(time);
    }
  }

  private startAttack(time: number): void {
    this.isAttacking = true;
    this.attackStartTime = time;
  }

  private handleMovement(delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    // Skip normal movement logic if dashing (handled in handleDashing)
    if (this.isDashing) {
      return;
    }

    const acceleration = this.isGrounded ? this.ACCELERATION : this.AIR_ACCELERATION;

    let currentDirection = 0;
    if (this.leftPressed && !this.rightPressed) {
      currentDirection = -1;
    } else if (this.rightPressed && !this.leftPressed) {
      currentDirection = 1;
    }

    // Update facing direction when moving
    if (currentDirection !== 0) {
      this.facingDirection = currentDirection;
    }
    // Note: When no input, facing direction persists (this is the key change!)

    // Check if we're switching directions (left↔right)
    const switchingDirections = Math.sign(body.velocity.x) !== 0 && currentDirection !== 0 && Math.sign(body.velocity.x) !== currentDirection;

    if (currentDirection === -1) {
      // Moving left
      if (switchingDirections) {
        // Immediately stop horizontal movement when switching directions
        body.setVelocityX(0);
      }
      body.setAccelerationX(-acceleration);
      // Cap the velocity
      if (body.velocity.x < -this.MOVE_SPEED) {
        body.setVelocityX(-this.MOVE_SPEED);
      }
    } else if (currentDirection === 1) {
      // Moving right
      if (switchingDirections) {
        // Immediately stop horizontal movement when switching directions
        body.setVelocityX(0);
      }
      body.setAccelerationX(acceleration);
      // Cap the velocity
      if (body.velocity.x > this.MOVE_SPEED) {
        body.setVelocityX(this.MOVE_SPEED);
      }
    } else {
      // No input - let friction/drag handle deceleration (natural sliding)
      body.setAccelerationX(0);
    }
  }

  private handleJumping(time: number): void {
    // Update jump buffer
    if (this.jumpJustPressed) {
      this.jumpBufferTime = time;
    }

    // Check if we can jump
    const canCoyoteJump = time - this.lastGroundedTime <= this.COYOTE_TIME;
    const hasJumpBuffer = time - this.jumpBufferTime <= this.JUMP_BUFFER_TIME;

    // Can jump if:
    // 1. Grounded or within coyote time (first jump)
    // 2. In air but has jumped before and has jumps remaining (double jump)
    const canFirstJump = (this.isGrounded || canCoyoteJump) && this.jumpsRemaining > 0;
    const canDoubleJump = !this.isGrounded && this.hasJumped && this.jumpsRemaining > 0;
    const canJump = canFirstJump || canDoubleJump;

    if (hasJumpBuffer && canJump) {
      this.performJump();
      // Clear jump buffer after successful jump
      this.jumpBufferTime = 0;
    }
  }

  private performJump(): void {
    this.setVelocityY(this.JUMP_VELOCITY);
    this.jumpsRemaining--;
    this.hasJumped = true; // Mark that player has jumped

    // Reset coyote time to prevent multiple jumps from coyote time
    if (this.jumpsRemaining === this.MAX_JUMPS - 1) {
      this.lastGroundedTime = 0;
    }
  }

  private updateAnimations(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (this.isDashing) {
      // Dashing - play dash animation and flip sprite based on facing direction
      this.anims.play('dash', true);
      this.setFlipX(this.facingDirection < 0);
    } else if (!this.isGrounded) {
      // In air - play jumping animation and flip sprite based on facing direction
      this.anims.play('jump', true);
      this.setFlipX(this.facingDirection < 0);
    } else if (Math.abs(body.velocity.x) > 10) {
      // Moving on ground - play running animation and flip sprite based on facing direction
      this.anims.play('run', true);
      this.setFlipX(this.facingDirection < 0);
    } else {
      // Idle on ground - play idle animation and flip sprite based on facing direction
      this.anims.play('idle', true);
      this.setFlipX(this.facingDirection < 0);
    }
    
    // Note: Attack animation is handled separately by the attack overlay sprite
    // This allows the player to show movement animations while attacking
  }

  private updateAttackOverlay(): void {
    // Position attack overlay with 10px offset in the facing direction
    const offsetX = 10 * this.facingDirection; // +10px when facing right, -10px when facing left
    this.attackOverlay.setPosition(this.x + offsetX, this.y);
    
    // Match player's flip state
    this.attackOverlay.setFlipX(this.flipX);
    
    // Show/hide based on attack state
    if (this.isAttacking) {
      this.attackOverlay.setVisible(true);
      
      // Play attack animation if not already playing
      if (!this.attackOverlay.anims.isPlaying || this.attackOverlay.anims.currentAnim?.key !== 'attack-overlay') {
        this.attackOverlay.play('attack-overlay');
      }
    } else {
      this.attackOverlay.setVisible(false);
    }
  }

  // Input methods to be called from scene
  setLeftPressed(pressed: boolean): void {
    this.leftPressed = pressed;
  }

  setRightPressed(pressed: boolean): void {
    this.rightPressed = pressed;
  }

  setJumpPressed(pressed: boolean, justPressed: boolean = false): void {
    this.jumpJustPressed = justPressed;
  }

  // Future action methods - ready for implementation
  setAttackPressed(pressed: boolean, justPressed: boolean = false): void {
    this.attackJustPressed = justPressed;
  }

  setDashPressed(pressed: boolean, justPressed: boolean = false): void {
    this.dashJustPressed = justPressed;
  }

  setFocusPressed(pressed: boolean, justPressed: boolean = false): void {
    // TODO: Implement focus/cast mechanics
    // this.focusPressed = pressed;
    // this.focusJustPressed = justPressed;
  }

  setLookUpPressed(pressed: boolean): void {
    // TODO: Implement look up mechanics (camera adjustment)
    // this.lookUpPressed = pressed;
  }

  setLookDownPressed(pressed: boolean): void {
    // TODO: Implement look down mechanics (camera adjustment)
    // this.lookDownPressed = pressed;
  }

  // Legacy methods for backward compatibility (deprecated)
  moveLeft(): void {
    this.setLeftPressed(true);
    this.setRightPressed(false);
  }

  moveRight(): void {
    this.setRightPressed(true);
    this.setLeftPressed(false);
  }

  idle(): void {
    this.setLeftPressed(false);
    this.setRightPressed(false);
  }

  jump(): void {
    this.setJumpPressed(true, true);
  }

  // Getters for sword to access player state
  get currentFacingDirection(): number {
    return this.facingDirection;
  }

  get currentlyAttacking(): boolean {
    return this.isAttacking;
  }
}
