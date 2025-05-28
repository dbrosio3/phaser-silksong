import Phaser from 'phaser';

export class Player extends Phaser.Physics.Arcade.Sprite {
  // Movement constants
  private readonly MOVE_SPEED = 300;
  private readonly JUMP_VELOCITY = -1000; // More negative = jumps higher/faster
  private readonly ACCELERATION = 2000; // Higher = reaches max speed faster
  private readonly AIR_ACCELERATION = 800; // Higher = more air control
  private readonly FRICTION = 2000; // Higher = stops sliding sooner
  private readonly AIR_FRICTION = 800; // Higher = less air sliding
  
  // Coyote time and jump buffering
  private readonly COYOTE_TIME = 150; // ms after leaving ground where jump is still allowed
  private readonly JUMP_BUFFER_TIME = 100; // ms before landing where jump input is remembered
  
  // State tracking
  private lastGroundedTime: number = 0;
  private jumpBufferTime: number = 0;
  private isGrounded: boolean = false;
  
  // Input tracking
  private leftPressed: boolean = false;
  private rightPressed: boolean = false;
  private jumpJustPressed: boolean = false;
  private lastDirection: number = 0; // -1 for left, 1 for right, 0 for none

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'dude');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Reduce bounce for less floaty feel
    this.setBounce(0.1);
    this.setCollideWorldBounds(true);
    
    // Set drag for better control
    this.setDragX(this.FRICTION);
    
    this.initAnimations();
  }

  initAnimations(): void {
    this.anims.create({
      key: 'left',
      frames: this.anims.generateFrameNumbers('dude', {
        start: 0, 
        end: 3
      }),
      frameRate: 10,
      repeat: -1
    });

    this.anims.create({
      key: 'turn',
      frames: [{ key: 'dude', frame: 4 }],
      frameRate: 1,
    });

    this.anims.create({
      key: 'right',
      frames: this.anims.generateFrameNumbers('dude', {
        start: 5, 
        end: 8
      }),
      frameRate: 10,
      repeat: -1
    });
  }

  // Call this from the scene's update method
  update(time: number, delta: number): void {
    this.updateGroundedState(time);
    this.handleMovement(delta);
    this.handleJumping(time);
    this.updateAnimations();
  }

  private updateGroundedState(time: number): void {
    this.isGrounded = this.body && (this.body as Phaser.Physics.Arcade.Body).blocked.down || false;
    
    if (this.isGrounded) {
      this.lastGroundedTime = time;
      // Reset drag when grounded for better ground control
      this.setDragX(this.FRICTION);
    } else {
      // Reduce drag in air for better air control
      this.setDragX(this.AIR_FRICTION);
    }
  }

  private handleMovement(delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const acceleration = this.isGrounded ? this.ACCELERATION : this.AIR_ACCELERATION;
    
    let currentDirection = 0;
    if (this.leftPressed && !this.rightPressed) {
      currentDirection = -1;
    } else if (this.rightPressed && !this.leftPressed) {
      currentDirection = 1;
    }
    
    // Check if we're switching directions (left↔right)
    const switchingDirections = this.lastDirection !== 0 && currentDirection !== 0 && this.lastDirection !== currentDirection;
    
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
    
    // Update last direction for next frame
    if (currentDirection !== 0) {
      this.lastDirection = currentDirection;
    } else if (Math.abs(body.velocity.x) < 10) {
      // Reset direction when nearly stopped
      this.lastDirection = 0;
    }
  }

  private handleJumping(time: number): void {
    // Update jump buffer
    if (this.jumpJustPressed) {
      this.jumpBufferTime = time;
    }

    // Check if we can jump (coyote time or grounded)
    const canCoyoteJump = time - this.lastGroundedTime <= this.COYOTE_TIME;
    const hasJumpBuffer = time - this.jumpBufferTime <= this.JUMP_BUFFER_TIME;
    
    if (hasJumpBuffer && (this.isGrounded || canCoyoteJump)) {
      this.performJump();
      // Clear jump buffer after successful jump
      this.jumpBufferTime = 0;
    }
  }

  private performJump(): void {
    this.setVelocityY(this.JUMP_VELOCITY);
    // Reset coyote time to prevent multiple jumps
    this.lastGroundedTime = 0;
  }

  private updateAnimations(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    if (Math.abs(body.velocity.x) > 10) {
      if (body.velocity.x < 0) {
        this.anims.play('left', true);
      } else {
        this.anims.play('right', true);
      }
    } else {
      this.anims.play('turn', true);
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
}
