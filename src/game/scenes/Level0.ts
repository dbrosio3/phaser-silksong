import { Scene } from 'phaser';
import Phaser from 'phaser';

import { EventBus } from '../EventBus';
import { Player } from '../objects/Player';
import { Sword } from '../objects/Sword';

export class Level0 extends Scene {
  // Core game objects
  private map: Phaser.Tilemaps.Tilemap;
  private tileset: Phaser.Tilemaps.Tileset;
  private sceneLayer: Phaser.Tilemaps.TilemapLayer;
  player: Player;
  sword: Sword;
  cursors: Phaser.Types.Input.Keyboard.CursorKeys;

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
    // Add a simple tiled background using the same bg image from Tiled
    const mapWidthPx = 100 * 32; // Map is 100 tiles wide, each 32px
    const mapHeightPx = 20 * 32; // Map is 20 tiles high, each 32px
    
    // Tile the background to cover the entire map (bg.png is 1024x1024)
    for (let x = 0; x < mapWidthPx; x += 1024) {
      for (let y = 0; y < mapHeightPx; y += 1024) {
        this.add.image(x + 512, y + 512, 'bg');
      }
    }

    // Load the tilemap
    this.map = this.make.tilemap({ key: 'level0-map' });
    
    // Add the tileset to the map
    const tileset = this.map.addTilesetImage('grass-spritesheet', 'grass-spritesheet');
    if (!tileset) {
      throw new Error('Failed to load grass-spritesheet tileset');
    }
    this.tileset = tileset;
    
    // Create the scene layer (this contains the solid platforms)
    const sceneLayer = this.map.createLayer('scene', this.tileset, 0, 0);
    if (!sceneLayer) {
      throw new Error('Failed to create scene layer');
    }
    this.sceneLayer = sceneLayer;
    
    // Set collision for all tiles in the scene layer (tiles with ID > 0)
    // Try multiple collision setup methods
    this.sceneLayer.setCollisionByExclusion([0]);
    
    // Also try setting collision manually for specific tiles
    this.sceneLayer.setCollisionBetween(1, 26);
    
    // Manual collision setup for tiles that definitely exist
    for (let x = 0; x < this.map.width; x++) {
      for (let y = 18; y < 20; y++) { // Rows 18 and 19 have our platforms
        const tile = this.map.getTileAt(x, y, false, 'scene');
        if (tile && tile.index > 0) {
          tile.setCollision(true, true, true, true);
        }
      }
    }
    
    // Debug: Check collision after setting it
    console.log('Collision set for tiles. Checking tile at ground:');
    const testTile = this.map.getTileAt(3, 18, false, 'scene');
    if (testTile) {
      console.log('Test tile collision properties:');
      console.log('- collides:', testTile.collides);
      console.log('- collideUp:', testTile.collideUp);
      console.log('- collideDown:', testTile.collideDown);
      console.log('- collideLeft:', testTile.collideLeft);
      console.log('- collideRight:', testTile.collideRight);
      console.log('- index:', testTile.index);
    }
    
    // Debug: Log collision setup
    console.log('Tilemap loaded:', this.map);
    console.log('Scene layer created:', this.sceneLayer);
    console.log('Map dimensions:', this.map.widthInPixels, 'x', this.map.heightInPixels);
    
    // Set the world bounds to match the tilemap
    const mapWidth = this.map.widthInPixels;
    const mapHeight = this.map.heightInPixels;
    this.physics.world.setBounds(0, 0, mapWidth, mapHeight);

    // Create player at a good starting position
    // Starting near the left side, above the ground level (row 18 * 32 = 576px)
    this.player = new Player(this, 100, 500);
    
    // Set up collision between player and the tilemap layer
    // Try both collider and overlap to see what works
    console.log('Setting up player collision...');
    const collider = this.physics.add.collider(this.player, this.sceneLayer);
    console.log('Collider created:', collider);
    
    // Alternative: Try using world collision bounds for testing
    console.log('Player physics body:', this.player.body);
    
    // Debug: Check if collision is working
    console.log('Player created at:', this.player.x, this.player.y);
    console.log('Collision set up between player and scene layer');
    
    // Debug: Check what tiles are at specific positions
    const playerTileX = Math.floor(this.player.x / 32);
    const playerTileY = Math.floor(this.player.y / 32);
    const groundTileY = 18; // Ground should be at row 18
    
    console.log('Player tile position:', playerTileX, playerTileY);
    console.log('Ground should be at row:', groundTileY);
    
    // Check what tile is at the ground position
    const groundTile = this.map.getTileAt(playerTileX, groundTileY, false, 'scene');
    console.log('Tile at ground position:', groundTile);
    
    // Debug: Check if the scene layer has collision set
    console.log('Scene layer collision info:', {
      layer: this.sceneLayer,
      tilemap: this.sceneLayer.tilemap,
      layerIndex: this.sceneLayer.layerIndex
    });

    // Create sword attached to player
    this.sword = new Sword(this, this.player);

    // Setup camera to follow the player
    this.setupCamera();

    // Setup input controls
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.actionKeys = {
        jump: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
        attack: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X),
        focus: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C),
        dash: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT)
      };
    }

    EventBus.emit('current-scene-ready', this);
  }

  private setupCamera(): void {
    const camera = this.cameras.main;

    // Set camera bounds to the tilemap dimensions
    const mapWidth = this.map.widthInPixels;
    const mapHeight = this.map.heightInPixels;
    camera.setBounds(0, 0, mapWidth, mapHeight);

    // Follow the player smoothly
    camera.startFollow(this.player, true, 0.2, 0.2);

    // Set a small deadzone for smoother following
    camera.setDeadzone(100, 50);

    // Enable pixel-perfect rendering
    camera.roundPixels = true;
  }

  update(time: number, delta: number) {
    // Handle input with action platformer controls
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

    // Update sword position and animation
    this.sword.update();

    // Track input state for next frame
    this.wasJumpDown = jumpPressed;
    this.wasAttackDown = attackPressed;
    this.wasFocusDown = focusPressed;
    this.wasDashDown = dashPressed;
  }
} 