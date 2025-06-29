import { Scene } from 'phaser';
import Phaser from 'phaser';

import { EventBus } from '../EventBus';
import { Player } from '../objects/Player';
import { Sword } from '../objects/Sword';
import { Bully } from '../objects/Bully';

export class Level0 extends Scene {
  // Core game objects
  private map: Phaser.Tilemaps.Tilemap;
  private grassTileset: Phaser.Tilemaps.Tileset;
  private islandTileset: Phaser.Tilemaps.Tileset;
  private grassTilesTileset: Phaser.Tilemaps.Tileset | null = null;
  private sceneLayer: Phaser.Tilemaps.TilemapLayer;
  private scene2Layer: Phaser.Tilemaps.TilemapLayer;
  player: Player;
  sword: Sword;
  bullies: Bully[] = [];
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
    // Add a tiled background using the same bg image from Tiled with proper offset
    const mapWidthPx = 100 * 32; // Map is 100 tiles wide, each 32px
    const mapHeightPx = 20 * 32; // Map is 20 tiles high, each 32px
    
    // Get the actual bg7 texture dimensions
    const bgTexture = this.textures.get('bg7');
    
    // Check if texture loaded successfully
    if (!bgTexture) {
      console.error('bg7 texture not found! Available textures:', this.textures.list);
      return;
    }
    
    const bgWidth = bgTexture.source[0].width;
    const bgHeight = bgTexture.source[0].height;
    
    console.log('Background texture dimensions:', bgWidth, 'x', bgHeight);
    console.log('Background texture info:', {
      key: bgTexture.key,
      width: bgWidth,
      height: bgHeight,
      source: bgTexture.source[0]
    });
    
    // Load the tilemap first to get the background layer offset
    this.map = this.make.tilemap({ key: 'level0-map' });
    
    // Get background offset and parallax from the tilemap data
    let offsetX = 0;
    let offsetY = 0;
    let parallaxX = 1.0;
    let parallaxY = 1.0;
    
    // Find the background layer in the tilemap data
    const tilemapData = this.cache.tilemap.get('level0-map');
    const backgroundLayer = tilemapData.data.layers.find((layer: any) => layer.type === 'imagelayer' && layer.name === 'background');
    
    if (backgroundLayer) {
      offsetX = backgroundLayer.offsetx || 0;
      offsetY = backgroundLayer.offsety || 0;
      parallaxX = backgroundLayer.parallaxx || 1.0;
      parallaxY = backgroundLayer.parallaxy || 1.0;
      console.log('Background properties from Tiled:', {
        offsetX,
        offsetY,
        parallaxX,
        parallaxY
      });
    } else {
      console.log('No background layer found, using default values');
    }
    
    // Create a container for background images to apply parallax
    const backgroundContainer = this.add.container(0, 0);
    
    // Tile the background to cover the entire map with the proper offset
    // We need to start from a position that accounts for the offset
    const startX = Math.floor(offsetX / bgWidth) * bgWidth;
    const startY = Math.floor(offsetY / bgHeight) * bgHeight;
    const endX = mapWidthPx + bgWidth;
    const endY = mapHeightPx + bgHeight;
    
    for (let x = startX; x < endX; x += bgWidth) {
      for (let y = startY; y < endY; y += bgHeight) {
        const bgImage = this.add.image(x + offsetX, y + offsetY, 'bg7');
        bgImage.setOrigin(0, 0); // Position by top-left corner instead of center
        backgroundContainer.add(bgImage);
      }
    }
    
    // Store the background container and parallax values for camera following
    (this as any).backgroundContainer = backgroundContainer;
    (this as any).parallaxX = parallaxX;
    (this as any).parallaxY = parallaxY;
    
    console.log('Background container created with', backgroundContainer.list.length, 'images');
    
    // Add all tilesets to the map
    const grassTileset = this.map.addTilesetImage('grass-spritesheet', 'grass-spritesheet');
    if (!grassTileset) {
      throw new Error('Failed to load grass-spritesheet tileset');
    }
    this.grassTileset = grassTileset;
    
    const islandTileset = this.map.addTilesetImage('island', 'island');
    if (!islandTileset) {
      throw new Error('Failed to load island tileset');
    }
    this.islandTileset = islandTileset;
    
    // Try to load grass_tiles tileset (it may not exist in the map yet)
    let grassTilesTileset = null;
    try {
      grassTilesTileset = this.map.addTilesetImage('grass_tiles', 'grass_tiles');
      this.grassTilesTileset = grassTilesTileset;
    } catch (error) {
      console.log('grass_tiles tileset not found in map, skipping...');
    }
    
    console.log('Tilesets loaded successfully:', {
      grass: {
        name: grassTileset.name,
        firstgid: grassTileset.firstgid,
        total: grassTileset.total,
        image: grassTileset.image?.key
      },
      island: {
        name: islandTileset.name,
        firstgid: islandTileset.firstgid,
        total: islandTileset.total,
        image: islandTileset.image?.key
      },
      grassTiles: grassTilesTileset ? {
        name: grassTilesTileset.name,
        firstgid: grassTilesTileset.firstgid,
        total: grassTilesTileset.total,
        image: grassTilesTileset.image?.key
      } : 'Not found in map'
    });
    
    // Create the scene layer with all available tilesets
    const tilesets = [this.grassTileset, this.islandTileset];
    if (this.grassTilesTileset) {
      tilesets.push(this.grassTilesTileset);
    }
    const sceneLayer = this.map.createLayer('scene', tilesets, 0, 0);
    if (!sceneLayer) {
      throw new Error('Failed to create scene layer');
    }
    this.sceneLayer = sceneLayer;
    
    // Create the scene2 layer with the same tilesets
    const scene2Layer = this.map.createLayer('scene2', tilesets, 0, 0);
    if (!scene2Layer) {
      throw new Error('Failed to create scene2 layer');
    }
    this.scene2Layer = scene2Layer;
    
    // Make sure both layers are visible and active
    this.sceneLayer.setVisible(true);
    this.sceneLayer.setActive(true);
    this.scene2Layer.setVisible(true);
    this.scene2Layer.setActive(true);
    
    console.log('Scene layer created:', {
      name: this.sceneLayer.layer?.name,
      visible: this.sceneLayer.visible,
      tilesTotal: this.sceneLayer.layer?.data?.length,
      layerData: this.sceneLayer.layer
    });
    
    console.log('Scene2 layer created:', {
      name: this.scene2Layer.layer?.name,
      visible: this.scene2Layer.visible,
      tilesTotal: this.scene2Layer.layer?.data?.length,
      layerData: this.scene2Layer.layer
    });
    
    // Set collision ONLY based on properties set in Tiled
    // This will respect the individual tile collision properties you set
    this.sceneLayer.setCollisionByProperty({ collides: true });
    this.sceneLayer.setCollisionByProperty({ collidable: true });
    this.scene2Layer.setCollisionByProperty({ collides: true });
    this.scene2Layer.setCollisionByProperty({ collidable: true });
    
    console.log('Set collision based on tile properties for both scene and scene2 layers');
    
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
    // Ground is 2 tiles from bottom (row 18), so spawn player just above it
    const groundY = (mapHeight / 32 - 2) * 32; // Ground level in pixels
    const playerSpawnY = groundY - 48; // Spawn 48px above ground (1.5 tiles)
    this.player = new Player(this, 100, playerSpawnY);
    
    console.log('Player spawn calculation:', {
      mapHeight: mapHeight,
      mapTilesHigh: mapHeight / 32,
      groundTileRow: mapHeight / 32 - 2,
      groundY: groundY,
      playerSpawnY: playerSpawnY
    });
    
    // Set up collision between player and the tilemap layer
    console.log('Setting up player collision...');
    
    // Create colliders for both scene layers
    const collider = this.physics.add.collider(this.player, this.sceneLayer);
    const collider2 = this.physics.add.collider(this.player, this.scene2Layer);
    console.log('Colliders created:', { scene: collider, scene2: collider2 });
    
    // Add overlap detectors for both layers
    this.physics.add.overlap(this.player, this.sceneLayer, () => {
      console.log('OVERLAP DETECTED! Player is touching scene layer tiles');
    });
    this.physics.add.overlap(this.player, this.scene2Layer, () => {
      console.log('OVERLAP DETECTED! Player is touching scene2 layer tiles');
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
    console.log('Grass tileset info:', {
      name: this.grassTileset.name,
      image: this.grassTileset.image,
      firstgid: this.grassTileset.firstgid,
      columns: this.grassTileset.columns,
      total: this.grassTileset.total
    });
    
    console.log('Island tileset info:', {
      name: this.islandTileset.name,
      image: this.islandTileset.image,
      firstgid: this.islandTileset.firstgid,
      columns: this.islandTileset.columns,
      total: this.islandTileset.total
    });
    
    if (this.grassTilesTileset) {
      console.log('Grass tiles tileset info:', {
        name: this.grassTilesTileset.name,
        image: this.grassTilesTileset.image,
        firstgid: this.grassTilesTileset.firstgid,
        columns: this.grassTilesTileset.columns,
        total: this.grassTilesTileset.total
      });
    }

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

    // Set a small deadzone for smoother following (adjusted for zoom)
    camera.setDeadzone(50, 25);

    // Set zoom to 2.5x for good balance between visibility and detail
    camera.setZoom(2.5);

    // Enable pixel-perfect rendering
    camera.roundPixels = true;
    
    console.log('Camera setup with 3x zoom to compensate for native sprite sizes');
  }

  private updateParallax(): void {
    // Apply parallax scrolling to background
    const backgroundContainer = (this as any).backgroundContainer;
    const parallaxX = (this as any).parallaxX;
    const parallaxY = (this as any).parallaxY;
    
    if (backgroundContainer && parallaxX !== undefined && parallaxY !== undefined) {
      const camera = this.cameras.main;
      
      // Calculate parallax offset based on camera position
      // Parallax factor > 1 means background moves faster (further away effect)
      // Parallax factor < 1 means background moves slower (closer effect)
      const parallaxOffsetX = camera.scrollX * (1 - (1 / parallaxX));
      const parallaxOffsetY = camera.scrollY * (1 - (1 / parallaxY));
      
      // Apply the parallax offset to the background container
      backgroundContainer.x = -parallaxOffsetX;
      backgroundContainer.y = -parallaxOffsetY;
    }
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

    // Apply parallax scrolling to background
    this.updateParallax();

    // Track input state for next frame
    this.wasJumpDown = jumpPressed;
    this.wasAttackDown = attackPressed;
    this.wasFocusDown = focusPressed;
    this.wasDashDown = dashPressed;
  }
} 