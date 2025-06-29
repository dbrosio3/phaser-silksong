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

  // Collision tracking
  private lastBullyCollisionTime: Map<Bully, number> = new Map();
  private lastBullyAttackTime: Map<Bully, number> = new Map();
  private readonly COLLISION_COOLDOWN = 500; // ms between damage from same bully
  private readonly ATTACK_COOLDOWN = 300; // ms between sword attacks on same bully
  private readonly PLAYER_ATTACK_RANGE = 40; // Player's sword reach (longer than bully attack range)

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
    
    // Background texture loaded successfully
    
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
      // Background properties loaded from Tiled
    } else {
      // Using default background values
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
    
    // Background container created successfully
    
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
      // grass_tiles tileset not found in map, skipping
    }
    
    // Tilesets loaded successfully
    
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
    
    // Scene layers created successfully
    
    // Set collision ONLY based on properties set in Tiled
    // This will respect the individual tile collision properties you set
    this.sceneLayer.setCollisionByProperty({ collides: true });
    this.sceneLayer.setCollisionByProperty({ collidable: true });
    this.scene2Layer.setCollisionByProperty({ collides: true });
    this.scene2Layer.setCollisionByProperty({ collidable: true });
    
    // Collision set up based on tile properties
    
    // Set the world bounds to match the tilemap
    const mapWidth = this.map.widthInPixels;
    const mapHeight = this.map.heightInPixels;
    this.physics.world.setBounds(0, 0, mapWidth, mapHeight);
    
    // World bounds set to match tilemap

    // Create player at a good starting position
    // Ground is 2 tiles from bottom (row 18), so spawn player just above it
    const groundY = (mapHeight / 32 - 2) * 32; // Ground level in pixels
    const playerSpawnY = groundY - 48; // Spawn 48px above ground (1.5 tiles)
    this.player = new Player(this, 100, playerSpawnY);
    
    // Player spawn position calculated
    
    // Set up collision between player and the tilemap layer
    // Setting up player collision
    
    // Create colliders for both scene layers
    const collider = this.physics.add.collider(this.player, this.sceneLayer);
    const collider2 = this.physics.add.collider(this.player, this.scene2Layer);
    // Colliders created successfully
    
    // Remove debug overlap detectors (they were causing spam)
    
    // Player collision configured

    // Tilesets loaded and configured

    // Create sword attached to player
    this.sword = new Sword(this, this.player);

    // Create bullies (enemies) at various positions on the map
    this.createBullies();

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
    
    // Camera configured with zoom and following
  }

  private createBullies(): void {
    // Calculate ground level for enemy spawning
    const mapHeight = this.map.heightInPixels;
    const groundY = (mapHeight / 32 - 2) * 32; // Ground level in pixels
    const enemySpawnY = groundY - 96; // Spawn 3 tiles (96px) above ground

    // Create bullies at various positions across the map
    const bullyPositions = [
      { x: 800, y: enemySpawnY },   // Early in the level
      { x: 1200, y: enemySpawnY },   // Mid level
      { x: 1600, y: enemySpawnY },  // Later in level
    ];

    bullyPositions.forEach(pos => {
      const bully = new Bully(this, pos.x, pos.y, this.player);
      this.bullies.push(bully);

      // Set up collision between bully and tilemap layers
      this.physics.add.collider(bully, this.sceneLayer);
      this.physics.add.collider(bully, this.scene2Layer);

      // Set up solid collision between player and bully (player can't pass through)
      this.physics.add.collider(this.player, bully, () => {
        this.handleBullyPlayerCollision(bully);
      });
    });

    // Listen for bully events
    this.events.on('bully-attack', this.handleBullyAttack, this);
    this.events.on('bully-death', this.handleBullyDeath, this);
    
    // Listen for player events
    this.events.on('player-death', this.handlePlayerDeath, this);

    // Bullies created and configured
  }

  private handleBullyPlayerCollision(bully: Bully): void {
    // Don't collide with dead enemies
    if (bully.isDead) {
      // Disable collision with this dead bully
      const colliders = this.physics.world.colliders.getActive().filter((collider: any) => {
        return (collider.bodyA === this.player.body && collider.bodyB === bully.body) ||
               (collider.bodyB === this.player.body && collider.bodyA === bully.body);
      });
      colliders.forEach((collider: any) => collider.destroy());
      return;
    }
    
    const currentTime = this.time.now;
    const lastCollisionTime = this.lastBullyCollisionTime.get(bully) || 0;
    
    // Check if bully can damage player and apply knockback
    if (!this.player.isInvincible() && 
        currentTime - lastCollisionTime > this.COLLISION_COOLDOWN) {
      
      // Player collided with bully
      
      // Apply damage to player
      this.player.takeDamage(1);
      
      // Apply knockback to player (push away from bully)
      const knockbackDirection = this.player.x > bully.x ? 1 : -1; // Push away from bully
      const knockbackForce = 200;
      const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
      
      // Apply horizontal knockback
      playerBody.setVelocityX(knockbackDirection * knockbackForce);
      
      // Small upward bounce for more dramatic effect
      if (playerBody.blocked.down) {
        playerBody.setVelocityY(-100);
      }
      
      this.lastBullyCollisionTime.set(bully, currentTime);
      
      // Player knocked back from collision
    }
  }

  private checkPlayerAttacks(): void {
    // Check if player is attacking
    if (!this.player.currentlyAttacking) {
      return;
    }

    const currentTime = this.time.now;
    
    // Check all bullies within attack range
    this.bullies.forEach(bully => {
      if (bully.isDead) {
        return;
      }

      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, bully.x, bully.y);
      const lastAttackTime = this.lastBullyAttackTime.get(bully) || 0;

      // Check if bully is within player's attack range and attack cooldown has passed
      if (distance <= this.PLAYER_ATTACK_RANGE && 
          currentTime - lastAttackTime > this.ATTACK_COOLDOWN) {
        
        // Check if player is facing the right direction
        const playerFacing = this.player.currentFacingDirection;
        const bullyDirection = bully.x > this.player.x ? 1 : -1;
        
        if (playerFacing === bullyDirection) {
          // Player successfully hit bully
          bully.takeDamage(1, this.player.x);
          this.lastBullyAttackTime.set(bully, currentTime);
        }
      }
    });
  }

  private handleBullyAttack(event: any): void {
    const { damage, x, y } = event;
    // Bully attacked
    
    // Check if player is close enough to take damage and not invincible
    const distanceToPlayer = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
    if (distanceToPlayer <= 25 && !this.player.isInvincible()) { // Attack range (matches bully attack range)
      // Player takes damage from bully attack
      this.player.takeDamage(damage);
    }
  }

  private handleBullyDeath(event: any): void {
    const { bully } = event;
    // Bully died - starting death animation
    
    // Clean up collision tracking for dead bully (but keep it in array for death animation)
    this.lastBullyCollisionTime.delete(bully);
    this.lastBullyAttackTime.delete(bully);
    
    // You could add death effects, score increase, item drops, etc. here
  }

  private handlePlayerDeath(event: any): void {
    // Player died - Game Over
    
    // Create black overlay for fade effect
    const blackOverlay = this.add.rectangle(0, 0, this.cameras.main.width * 2, this.cameras.main.height * 2, 0x000000);
    blackOverlay.setOrigin(0, 0);
    blackOverlay.setDepth(1000); // Above everything
    blackOverlay.setAlpha(0); // Start transparent
    blackOverlay.setScrollFactor(0); // Don't scroll with camera
    
    // Fade to black over 1 second, then restart
    this.tweens.add({
      targets: blackOverlay,
      alpha: 1,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        // Restarting level
        this.scene.restart();
      }
    });
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
    // Don't process input or updates if player is dead
    if (this.player.isDead) {
      // Still update visual effects for dead player
      this.player.update(time, delta);
      
      // Still update bullies and visual effects (including dead ones for death animation)
      this.bullies.forEach(bully => {
        bully.update(time, delta);
      });
      
      // Clean up destroyed bullies from the array
      this.bullies = this.bullies.filter(bully => bully.active);
      
      this.updateParallax();
      return;
    }

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

    // Check for player attacks on bullies (with extended range)
    this.checkPlayerAttacks();

    // Update all bullies (including dead ones for death animation)
    this.bullies.forEach(bully => {
      bully.update(time, delta);
    });

    // Clean up destroyed bullies from the array
    this.bullies = this.bullies.filter(bully => bully.active);

    // Apply parallax scrolling to background
    this.updateParallax();

    // Track input state for next frame
    this.wasJumpDown = jumpPressed;
    this.wasAttackDown = attackPressed;
    this.wasFocusDown = focusPressed;
    this.wasDashDown = dashPressed;
  }
} 