import { GameObjects, Scene } from 'phaser';
import Phaser from 'phaser';

import { EventBus } from '../EventBus';
import { Player } from '../objects/Player';

export class MainMenu extends Scene {
  background: GameObjects.Image;
  logoTween: Phaser.Tweens.Tween | null;
  platforms: Phaser.Physics.Arcade.StaticGroup;
  player: Player;
  cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  stars: Phaser.Physics.Arcade.Group;
  score: number;
  scoreText: Phaser.GameObjects.Text;
  
  // Input tracking for better jump detection
  private jumpKey: Phaser.Input.Keyboard.Key;
  private wasJumpDown: boolean = false;

  constructor() {
    super('MainMenu');
  }

  create() {
    // Create a tiled background that covers the entire level (now taller)
    for (let x = 0; x < 3200; x += 800) {
      for (let y = 0; y < 1200; y += 600) {
        this.add.image(x + 400, y + 300, 'sky');
      }
    }

    // Set the world bounds to match our larger level (now with vertical space)
    this.physics.world.setBounds(0, 0, 3200, 1200);

    this.platforms = this.physics.add.staticGroup();

    // Staircase platform layout - ascending from left to right
    // Ground level - long base platform
    this.platforms.create(400, 1150, 'ground').setScale(4, 1).refreshBody();
    this.platforms.create(1200, 1150, 'ground').setScale(4, 1).refreshBody();
    
    // Step 1 - slightly elevated
    this.platforms.create(800, 950, 'ground').setScale(2, 1).refreshBody();
    
    // Step 2 - higher
    this.platforms.create(1200, 750, 'ground').setScale(2, 1).refreshBody();
    
    // Step 3 - even higher
    this.platforms.create(1600, 550, 'ground').setScale(2, 1).refreshBody();
    
    // Step 4 - highest main platform
    this.platforms.create(2000, 350, 'ground').setScale(2, 1).refreshBody();
    
    // Final high platform - the peak
    this.platforms.create(2400, 150, 'ground').setScale(1.5, 1).refreshBody();
    
    // Optional side platforms for alternative routes
    this.platforms.create(600, 650, 'ground'); // Side platform near step 2
    this.platforms.create(1800, 250, 'ground'); // Side platform near peak

    this.player = new Player(this, 100, 1050);
    this.physics.add.collider(this.player, this.platforms);

    // Setup smooth camera follow with lookahead
    this.setupCamera();

    if(this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.jumpKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    }
    
    // Stars positioned to guide players up the staircase
    this.stars = this.physics.add.group();
    
    // Place stars strategically on the staircase path
    const starPositions = [
      // Ground level stars
      {x: 300, y: 1100}, {x: 500, y: 1100}, {x: 1100, y: 1100}, {x: 1300, y: 1100},
      // Step 1 stars
      {x: 750, y: 900}, {x: 850, y: 900},
      // Step 2 stars  
      {x: 1150, y: 700}, {x: 1250, y: 700},
      // Step 3 stars
      {x: 1550, y: 500}, {x: 1650, y: 500},
      // Step 4 stars
      {x: 1950, y: 300}, {x: 2050, y: 300},
      // Peak stars
      {x: 2350, y: 100}, {x: 2450, y: 100},
      // Side platform stars
      {x: 600, y: 600}, {x: 1800, y: 200}
    ];
    
    starPositions.forEach(pos => {
      const star = this.stars.create(pos.x, pos.y, 'star');
      star.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
    });

    this.physics.add.collider(this.stars, this.platforms);
    this.physics.add.overlap(this.player, this.stars, this.collectStar, undefined, this);

    this.score = 0;
    this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', color: '#000' });
    this.scoreText.setScrollFactor(0); // Make score text stay fixed on screen

    EventBus.emit('current-scene-ready', this);
  }

  private setupCamera(): void {
    const camera = this.cameras.main;
    
    // Set camera bounds for the larger level (now with vertical space)
    camera.setBounds(0, 0, 3200, 1200);
    
    // Start following the player with smooth interpolation
    camera.startFollow(this.player, true, 0.05, 0.05);
    
    // Set up lookahead - camera will anticipate player movement
    camera.setFollowOffset(0, 50); // Slight downward offset to see more ground ahead
    
    // Configure deadzone for smooth following (now supports vertical movement)
    camera.setDeadzone(150, 150); // Increased vertical deadzone for better vertical following
    
    // Set zoom if needed (1 = normal, >1 = zoomed in, <1 = zoomed out)
    camera.setZoom(1);
    
    // Enable camera smoothing to reduce jitter
    camera.roundPixels = true; // Prevents sub-pixel rendering artifacts
  }

  update(time: number, delta: number) {
    // Handle input with proper jump detection
    const leftPressed = this.cursors.left.isDown;
    const rightPressed = this.cursors.right.isDown;
    const jumpPressed = this.jumpKey.isDown;
    const jumpJustPressed = jumpPressed && !this.wasJumpDown;

    // Update player input state
    this.player.setLeftPressed(leftPressed);
    this.player.setRightPressed(rightPressed);
    this.player.setJumpPressed(jumpPressed, jumpJustPressed);

    // Update player physics and state
    this.player.update(time, delta);

    // Update camera lookahead based on player movement
    this.updateCameraLookahead();

    // Track jump state for next frame
    this.wasJumpDown = jumpPressed;
  }

  private updateCameraLookahead(): void {
    const camera = this.cameras.main;
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    
    // Calculate horizontal lookahead based on velocity
    const velocityX = playerBody.velocity.x;
    const maxLookahead = 100; // Maximum pixels to look ahead
    const lookaheadX = Math.sign(velocityX) * Math.min(Math.abs(velocityX) / 3, maxLookahead);
    
    // Vertical lookahead - look down when falling, up when jumping
    const velocityY = playerBody.velocity.y;
    let lookaheadY = 50; // Default downward offset
    
    if (velocityY < -200) {
      // Jumping - look slightly up
      lookaheadY = 20;
    } else if (velocityY > 200) {
      // Falling fast - look further down
      lookaheadY = 80;
    }
    
    // Smoothly interpolate to new offset to avoid camera snapping
    const currentOffsetX = camera.followOffset.x;
    const currentOffsetY = camera.followOffset.y;
    
    const lerpFactor = 0.02; // Lower = smoother, higher = more responsive
    const newOffsetX = Phaser.Math.Linear(currentOffsetX, lookaheadX, lerpFactor);
    const newOffsetY = Phaser.Math.Linear(currentOffsetY, lookaheadY, lerpFactor);
    
    camera.setFollowOffset(newOffsetX, newOffsetY);
  }

  collectStar(object1: any, object2: any) {
    const star = object2 as Phaser.Physics.Arcade.Sprite;
    star.disableBody(true, true);
    this.score = this.score + 10;
    this.scoreText.setText('Score: ' + this.score);
  }

  changeScene() {

  }
}
