import { GameObjects, Scene } from 'phaser';
import Phaser from 'phaser';

import { EventBus } from '../EventBus';
import { Player } from '../objects/Player';
import { Sword } from '../objects/Sword';
import { PlatformUtils } from '../utils/PlatformUtils';

export class Level0 extends Scene {
  background: GameObjects.Image;
  platforms: Phaser.Physics.Arcade.StaticGroup;
  player: Player;
  sword: Sword;
  cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  stars: Phaser.Physics.Arcade.Group;
  score: number;
  scoreText: Phaser.GameObjects.Text;

  // Death zone - y coordinate where player dies if they fall below
  private readonly DEATH_ZONE_Y = 1800;
  private readonly WORLD_HEIGHT = 2000; // Extended world height to allow falling

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
    // Set black background color
    this.cameras.main.setBackgroundColor('#000000');

    // Create a tiled background that covers the entire level
    // With world height of 2000, we need multiple rows to cover properly
    for (let x = 0; x < 3200; x += 1536) {
      for (let y = -1024; y < 2000; y += 1024) {
        this.add.image(x + 768, y + 1000, 'sky');
      }
    }

    // Set the world bounds to match our level
    this.physics.world.setBounds(0, 0, 3200, this.WORLD_HEIGHT);

    this.platforms = this.physics.add.staticGroup();

    // Ground floor - using new 1024×451 sprite
    // Since new sprite is ~2.5x wider and ~14x taller than original, adjust scale accordingly
    // Ground level platforms with 5% padding removed from top using preset
    PlatformUtils.createPlatformWithPreset(this, this.platforms, 400, 1330, 'ground', 'GROUND', 1, 1); // Left section
    PlatformUtils.createPlatformWithPreset(this, this.platforms, 2700, 1330, 'ground', 'GROUND', -1, 1); // Right section

    // Simple scattered platforms using ground2 sprite with 20% padding removed all around using preset
    PlatformUtils.createPlatformWithPreset(this, this.platforms, 1500, 1000, 'ground2', 'GROUND_2', 0.1, 1); // Low platform
    
    this.player = new Player(this, 100, 1050);
    this.physics.add.collider(this.player, this.platforms);

    // Create sword attached to player
    this.sword = new Sword(this, this.player);

    // Setup smooth camera follow with lookahead
    this.setupCamera();

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.actionKeys = {
        jump: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
        attack: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X),
        focus: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C),
        dash: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT)
      };
    }

    // Create star idle animation
    console.log('Creating star animation...');
    console.log('Star texture exists:', this.textures.exists('star'));
    
    // Debug: Check how many frames the texture has
    const starTexture = this.textures.get('star');
    console.log('Star texture info:', starTexture);
    console.log('Star frame count:', starTexture.frameTotal);
    
    try {
      this.anims.create({
        key: 'star-idle',
        frames: [
          { key: 'star', frame: 0 },
          { key: 'star', frame: 1 },
          { key: 'star', frame: 2 }
        ],
        frameRate: 8,
        repeat: -1
      });
      console.log('Star animation created successfully');
    } catch (error) {
      console.error('Error creating star animation:', error);
    }

    // Stars positioned on the new platform layout
    this.stars = this.physics.add.group();

    // Adjusted star positions for the new map layout
    const starPositions = [
      // Ground level stars
      { x: 200, y: 1100 }, { x: 400, y: 1100 }, { x: 600, y: 1100 },
      { x: 2200, y: 1100 }, { x: 2400, y: 1100 }, { x: 2600, y: 1100 },
      // Step platforms
      { x: 1150, y: 900 }, { x: 1250, y: 900 },
      { x: 1750, y: 700 }, { x: 1850, y: 700 },
      { x: 2350, y: 500 }, { x: 2450, y: 500 },
      // Side platforms
      { x: 1000, y: 600 }, { x: 2600, y: 300 }
    ];

    starPositions.forEach(pos => {
      const star = this.stars.create(pos.x, pos.y, 'star');
      star.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
      try {
        // Add staggered animation timing
        const randomDelay = Phaser.Math.Between(0, 2000); // Random delay 0-2 seconds
        const randomStartFrame = Phaser.Math.Between(0, 2); // Random starting frame
        
        // Set initial frame
        star.setFrame(randomStartFrame);
        
        // Start animation with delay
        this.time.delayedCall(randomDelay, () => {
          star.play('star-idle');
        });
        
        console.log('Star animation started at', pos.x, pos.y, 'with delay', randomDelay);
      } catch (error) {
        console.error('Error playing star animation:', error);
      }
    });

    this.physics.add.collider(this.stars, this.platforms);
    this.physics.add.overlap(this.player, this.stars, this.collectStar, undefined, this);

    this.score = 0;
    this.scoreText = this.add.text(16, 16, 'Level 0 - Score: 0', { fontSize: '32px', color: '#000' });
    this.scoreText.setScrollFactor(0); // Make score text stay fixed on screen

    // Add debug text for sprite info
    const debugText = this.add.text(16, 60, 'Sprite: hornet-px (32x32 → 96x96)', { fontSize: '24px', color: '#000' });
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

    // Check if player fell below death zone
    if (this.player.y > this.DEATH_ZONE_Y) {
      this.handlePlayerDeath();
    }

    // Update sword position and animation
    this.sword.update();

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

  private handlePlayerDeath() {
    console.log('Player fell to death zone - restarting level');
    
    // Prevent multiple death triggers
    if (this.scene.isPaused()) return;
    
    // Disable player input and physics
    this.player.setVelocity(0, 0);
    this.physics.pause();
    
    // Create black overlay for fade effect
    const camera = this.cameras.main;
    
    // Use simple rectangle - more reliable than graphics
    const blackOverlay = this.add.rectangle(
      camera.width / 2, 
      camera.height / 2, 
      camera.width, 
      camera.height, 
      0x000000
    );
    blackOverlay.setOrigin(0.5, 0.5);
    blackOverlay.setScrollFactor(0);
    blackOverlay.setAlpha(0); // Start transparent
    blackOverlay.setDepth(Number.MAX_SAFE_INTEGER); // Use maximum depth
    
    console.log('Created black overlay rectangle:', {
      width: camera.width,
      height: camera.height,
      depth: blackOverlay.depth,
      alpha: blackOverlay.alpha,
      x: blackOverlay.x,
      y: blackOverlay.y
    });
    
    // Animate fade to black
    this.tweens.add({
      targets: blackOverlay,
      alpha: 1,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        console.log('Fade complete - restarting level');
        this.scene.restart();
      }
    });
  }
} 