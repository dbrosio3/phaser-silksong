import { GameObjects, Scene } from 'phaser';
import Phaser from 'phaser';

import { EventBus } from '../EventBus';
import { Player } from '../objects/Player';

export class Level0 extends Scene {
  background: GameObjects.Image;
  platforms: Phaser.Physics.Arcade.StaticGroup;
  player: Player;
  cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  stars: Phaser.Physics.Arcade.Group;
  score: number;
  scoreText: Phaser.GameObjects.Text;
  
  // Action platformer controls
  private actionKeys: {
    jump: Phaser.Input.Keyboard.Key;      // Z
    attack: Phaser.Input.Keyboard.Key;    // X (future)
    focus: Phaser.Input.Keyboard.Key;     // C (future)
    dash: Phaser.Input.Keyboard.Key;      // Shift (future)
  };
  
  // Input state tracking
  private wasJumpDown: boolean = false;
  private wasAttackDown: boolean = false;
  private wasFocusDown: boolean = false;
  private wasDashDown: boolean = false;

  constructor() {
    super('Level0');
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
      this.actionKeys = {
        jump: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
        attack: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X),
        focus: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C),
        dash: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT)
      };
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
    this.scoreText = this.add.text(16, 16, 'Level 0 - Score: 0', { fontSize: '32px', color: '#000' });
    this.scoreText.setScrollFactor(0); // Make score text stay fixed on screen

    // Add debug text for sprite info
    const debugText = this.add.text(16, 60, 'Sprite: hornet (128x128)', { fontSize: '24px', color: '#000' });
    debugText.setScrollFactor(0);

    EventBus.emit('current-scene-ready', this);
  }

  private setupCamera(): void {
    const camera = this.cameras.main;
    
    // Remove camera bounds - let camera follow everywhere for consistent centering
    // camera.setBounds(0, 0, 3200, 1200); // Commented out
    
    // Very tight following - player stays perfectly centered
    camera.startFollow(this.player, true, 0.2, 0.2);
    
    // Remove deadzone - camera follows every movement
    camera.setDeadzone(0, 0);
    
    // No offset - keep player perfectly centered
    camera.setFollowOffset(0, 0);
    
    // Set zoom if needed (1 = normal, >1 = zoomed in, <1 = zoomed out)
    camera.setZoom(1);
    
    // Enable camera smoothing to reduce jitter
    camera.roundPixels = true; // Prevents sub-pixel rendering artifacts
  }

  update(time: number, delta: number) {
    // Handle input with new action platformer controls
    const leftPressed = this.cursors.left.isDown;
    const rightPressed = this.cursors.right.isDown;
    const upPressed = this.cursors.up.isDown;
    const downPressed = this.cursors.down.isDown;
    
    // Action inputs
    const jumpPressed = this.actionKeys.jump.isDown;
    const attackPressed = this.actionKeys.attack.isDown;
    const focusPressed = this.actionKeys.focus.isDown;
    const dashPressed = this.actionKeys.dash.isDown;
    
    // Input state tracking for "just pressed" detection
    const jumpJustPressed = jumpPressed && !this.wasJumpDown;
    const attackJustPressed = attackPressed && !this.wasAttackDown;
    const focusJustPressed = focusPressed && !this.wasFocusDown;
    const dashJustPressed = dashPressed && !this.wasDashDown;

    // Update player input state
    this.player.setLeftPressed(leftPressed);
    this.player.setRightPressed(rightPressed);
    this.player.setJumpPressed(jumpPressed, jumpJustPressed);
    
    // Future actions - methods exist but not fully implemented yet
    this.player.setAttackPressed(attackPressed, attackJustPressed);
    this.player.setFocusPressed(focusPressed, focusJustPressed);
    this.player.setDashPressed(dashPressed, dashJustPressed);
    this.player.setLookUpPressed(upPressed);
    this.player.setLookDownPressed(downPressed);

    // Update player physics and state
    this.player.update(time, delta);

    // Track input state for next frame
    this.wasJumpDown = jumpPressed;
    this.wasAttackDown = attackPressed;
    this.wasFocusDown = focusPressed;
    this.wasDashDown = dashPressed;
    
    // Check if all stars collected - transition to Level1
    if (this.stars.countActive() === 0) {
      this.scene.start('Level1');
    }
  }

  collectStar(object1: any, object2: any) {
    const star = object2 as Phaser.Physics.Arcade.Sprite;
    star.disableBody(true, true);
    this.score = this.score + 10;
    this.scoreText.setText('Level 0 - Score: ' + this.score);
  }
} 