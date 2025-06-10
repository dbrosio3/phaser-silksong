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
    
    // Add the tileset to the map (first param is name in JSON, second is the loaded texture key)
    const tileset = this.map.addTilesetImage('grass-spritesheet', 'grass-spritesheet');
    if (!tileset) {
      throw new Error('Failed to load grass-spritesheet tileset');
    }
    this.tileset = tileset;
    
    console.log('Tileset loaded successfully:', {
      name: tileset.name,
      firstgid: tileset.firstgid,
      total: tileset.total,
      image: tileset.image?.key
    });
    
    // Create the scene layer (this contains the solid platforms)
    // Try creating with explicit parameters
    const sceneLayer = this.map.createLayer('scene', this.tileset, 0, 0);
    if (!sceneLayer) {
      throw new Error('Failed to create scene layer');
    }
    this.sceneLayer = sceneLayer;
    
    // Make sure the layer is visible and active
    this.sceneLayer.setVisible(true);
    this.sceneLayer.setActive(true);
    
    console.log('Scene layer created:', {
      name: this.sceneLayer.layer?.name,
      visible: this.sceneLayer.visible,
      tilesTotal: this.sceneLayer.layer?.data?.length,
      layerData: this.sceneLayer.layer
    });
    
    // Set collision for specific tile ranges that we know exist (1-26)
    this.sceneLayer.setCollisionBetween(1, 26);
    
    // Also try setting tile callbacks as an alternative
    for (let i = 1; i <= 26; i++) {
      this.sceneLayer.setTileIndexCallback(i, () => {
        console.log('Tile callback fired for index:', i);
      }, this);
    }
    
    console.log('Set collision for tiles 1-26');
    
    console.log('Collision set for all non-zero tiles in scene layer');
    
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
    
    console.log('World bounds set to:', {
      width: mapWidth,
      height: mapHeight,
      bottomY: mapHeight
    });

    // Create player at a good starting position
    // Starting near the left side, above the ground level (row 18 * 32 = 576px)
    this.player = new Player(this, 100, 500);
    
    // Set up collision between player and the tilemap layer
    console.log('Setting up player collision...');
    
    // Create collider without any callbacks first
    const collider = this.physics.add.collider(this.player, this.sceneLayer);
    console.log('Collider created:', collider);
    
    // Add overlap detector to see if there are any interactions at all
    this.physics.add.overlap(this.player, this.sceneLayer, () => {
      console.log('OVERLAP DETECTED! Player is touching tiles');
    });
    
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
    
    // Debug: Check several tiles around the ground area
    console.log('Checking tiles in ground area:');
    for (let x = 0; x < 10; x++) {
      for (let y = 17; y < 20; y++) {
        const tile = this.map.getTileAt(x, y, false, 'scene');
        if (tile && tile.index > 0) {
          console.log(`Tile at (${x}, ${y}):`, {
            index: tile.index,
            pixelX: tile.pixelX,
            pixelY: tile.pixelY,
            collides: tile.collides,
            layer: tile.layer?.name,
            faceTop: tile.faceTop,
            faceBottom: tile.faceBottom,
            faceLeft: tile.faceLeft,
            faceRight: tile.faceRight
          });
        }
      }
    }
    
    // Debug: Check if the scene layer has collision set
    console.log('Scene layer collision info:', {
      layer: this.sceneLayer,
      tilemap: this.sceneLayer.tilemap,
      layerIndex: this.sceneLayer.layerIndex
    });

    // Debug: Check player physics body details
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    console.log('Player physics body details:', {
      playerCenter: { x: this.player.x, y: this.player.y },
      bodyBounds: {
        x: playerBody?.x,
        y: playerBody?.y,
        width: playerBody?.width,
        height: playerBody?.height,
        bottom: playerBody ? playerBody.y + playerBody.height : 'N/A'
      },
      velocity: {
        x: playerBody?.velocity.x,
        y: playerBody?.velocity.y
      },
      tileAtFeet: `Row ${Math.floor((this.player.y + 16) / 32)} (Y=${Math.floor((this.player.y + 16) / 32) * 32})`
    });

    // Debug: Check tileset loading
    console.log('Tileset info:', {
      name: this.tileset.name,
      image: this.tileset.image,
      firstgid: this.tileset.firstgid,
      columns: this.tileset.columns,
      total: this.tileset.total
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