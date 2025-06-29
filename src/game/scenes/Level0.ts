import { Scene } from 'phaser';
import Phaser from 'phaser';

import { EventBus } from '../EventBus';
import { Player } from '../objects/Player';
import { Sword } from '../objects/Sword';
import { Bully } from '../objects/Bully';
import { Orb } from '../objects/Orb';

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
  orb: Orb;
  bullies: Bully[] = [];
  cursors: Phaser.Types.Input.Keyboard.CursorKeys;

  // Dialog system
  private dialogBox: Phaser.GameObjects.Container | null = null;
  private dialogText: Phaser.GameObjects.Text | null = null;
  private isDialogActive: boolean = false;
  private typewriterTimer: Phaser.Time.TimerEvent | null = null;
  private autoAdvanceTimer: Phaser.Time.TimerEvent | null = null;
  private currentDialogText: string = '';
  private dialogCharIndex: number = 0;

  // Action platformer controls
  private actionKeys: {
    jump: Phaser.Input.Keyboard.Key;      // Z
    attack: Phaser.Input.Keyboard.Key;    // X (future) 
    focus: Phaser.Input.Keyboard.Key;     // C (future)
    dash: Phaser.Input.Keyboard.Key;      // Shift (future)
    space: Phaser.Input.Keyboard.Key;     // Space for dialog
    interact: Phaser.Input.Keyboard.Key;  // A for hugging tree
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
  
  // Tree interaction system
  private nearTree: boolean = false;
  private interactionHint: Phaser.GameObjects.Text | null = null;
  private readonly TREE_X_MIN = 2142; // Minimum X coordinate for tree interaction
  private readonly TREE_X_MAX = 2238; // Maximum X coordinate for tree interaction
  private readonly TREE_Y_MIN = 600; // Minimum Y coordinate for tree interaction  
  private readonly TREE_Y_MAX = 800; // Maximum Y coordinate for tree interaction
  
  // Orb tree hint trigger
  private readonly TREE_HINT_TRIGGER_X = 2036; // X position to trigger tree hint dialog
  private treeHintTriggered = false; // Track if tree hint dialog has been shown
  private treeHintMessages = [
    "Los arboles milenarios te daran la respuesta",
    "Probá abrazandolo y fijate que te dice"
  ];
  private currentTreeHintIndex = 0;
  
  // Tree interaction messages
  private treeInteractionMessages = [
    "Hola... tu regalo no está aquí, pero lo podrás encontrar donde reinan los felinos.",
  ];
  private currentTreeInteractionIndex = 0;

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

    // Create orb at a specific position in the level
    // Position it early in the level for the player to discover
    const orbSpawnX = 400;
    const orbSpawnY = groundY - 80; // Floating above ground
    this.orb = new Orb(this, this.player, orbSpawnX, orbSpawnY);
    
    // Spawn the orb immediately at its position
    this.orb.spawn();

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
        dash: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
        space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
        interact: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A)
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
      // { x: 1200, y: enemySpawnY },   // Mid level
      // { x: 1600, y: enemySpawnY },  // Later in level
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
    
    // Listen for orb events
    this.events.on('orb-talk', this.handleOrbTalk, this);

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

  private handleOrbTalk(event: any): void {

    const { text, orb } = event;
    this.showDialog(text, orb);
  }

  private showDialog(text: string, orb: Orb): void {
    if (this.isDialogActive) return;
    
    this.isDialogActive = true;
    
    const camera = this.cameras.main;
    
    // Smaller dialog positioned above center
    const dialogX = camera.centerX;
    const dialogY = camera.centerY - 110;
    
    const dialogBg = this.add.rectangle(
      dialogX, 
      dialogY, 
      600, 100, // Smaller: 600x100
      0x000000, 1 // Dark background
    );
    dialogBg.setScrollFactor(0); // Fixed to camera
    dialogBg.setDepth(2000); // Very high depth
    
    // Add a border
    const dialogBorder = this.add.rectangle(
      dialogX, 
      dialogY, 
      604, 104, // Border slightly bigger
      0x000000, 1 // White border
    );
    dialogBorder.setScrollFactor(0);
    dialogBorder.setDepth(1999); // Behind the background
    
    // Dialog text - start with empty text for typewriter effect
    this.currentDialogText = text;
    this.dialogCharIndex = 0;
    
    this.dialogText = this.add.text(
      dialogX, 
      dialogY - 10, // Slightly above center of dialog
      '', // Start with empty text
      {
        fontFamily: 'Arial',
        fontSize: 18,
        color: '#ffffff',
        align: 'center',
        padding: { x: 15, y: 8 },
        wordWrap: { width: 550 }
      }
    );
    this.dialogText.setOrigin(0.5);
    this.dialogText.setScrollFactor(0);
    this.dialogText.setDepth(2001);
    
    // Start typewriter effect
    this.startTypewriterEffect();
    
    // Prompt text
    const promptText = this.add.text(
      dialogX, 
      dialogY + 30, // Below the main text
      'Espacio para saltar', 
      {
        fontFamily: 'Arial',
        fontSize: 14,
        color: '#999999',
        align: 'right',
        padding: { x: 8, y: 4 }
      }
    );
    promptText.setOrigin(0.5);
    promptText.setScrollFactor(0);
    promptText.setDepth(2002);
    
    // Store elements for cleanup
    this.dialogBox = this.add.container(0, 0);
    this.dialogBox.add([dialogBorder, dialogBg, this.dialogText, promptText]);
    (this.dialogBox as any).orb = orb;
  }

  private startTypewriterEffect(): void {
    // Clear any existing timer
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
    }
    
    // Create timer that adds one character every 50ms
    this.typewriterTimer = this.time.addEvent({
      delay: 50, // 50ms between characters
      callback: () => {
        if (this.dialogCharIndex < this.currentDialogText.length && this.dialogText) {
          // Add next character
          this.dialogCharIndex++;
          const visibleText = this.currentDialogText.substring(0, this.dialogCharIndex);
          this.dialogText.setText(visibleText);
        } else {
          // Finished typing, cleanup timer
          if (this.typewriterTimer) {
            this.typewriterTimer.destroy();
            this.typewriterTimer = null;
          }
          
          // Auto-advance after a brief pause to let player read
          this.autoAdvanceTimer = this.time.delayedCall(1500, () => { // 1.5 second pause after typing finishes
            this.autoAdvanceDialog();
          });
        }
      },
      repeat: this.currentDialogText.length - 1
    });
  }
  
  private autoAdvanceDialog(): void {
    if (this.isDialogActive && this.dialogBox) {
      const orb = (this.dialogBox as any).orb;
      
      // Clean up timer reference
      this.autoAdvanceTimer = null;
      
      // Clean up current dialog
      this.dialogBox.destroy();
      this.dialogBox = null;
      this.dialogText = null;
      this.isDialogActive = false;
      this.currentDialogText = '';
      this.dialogCharIndex = 0;
      
      // Tell orb to advance to next dialog or finish
      if (orb && orb.finishTalking) {
        orb.finishTalking();
      }
    }
  }
  
  private skipTypewriterEffect(): void {
    // Skip to the end of the typewriter effect
    if (this.typewriterTimer && this.dialogText) {
      this.typewriterTimer.destroy();
      this.typewriterTimer = null;
      this.dialogText.setText(this.currentDialogText);
      this.dialogCharIndex = this.currentDialogText.length;
      
      // Cancel any existing auto-advance timer
      if (this.autoAdvanceTimer) {
        this.autoAdvanceTimer.destroy();
        this.autoAdvanceTimer = null;
      }
      
      // Auto-advance immediately after skipping (shorter pause)
      this.autoAdvanceTimer = this.time.delayedCall(500, () => { // 0.5 second pause when skipped
        this.autoAdvanceDialog();
      });
    }
  }

  private closeDialog(): void {
    if (!this.isDialogActive || !this.dialogBox) return;
    
    const orb = (this.dialogBox as any).orb;
    
    // Clean up typewriter timer
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
      this.typewriterTimer = null;
    }
    
    // Clean up any pending auto-advance timers
    if (this.autoAdvanceTimer) {
      this.autoAdvanceTimer.destroy();
      this.autoAdvanceTimer = null;
    }
    
    // Clean up dialog elements
    this.dialogBox.destroy();
    this.dialogBox = null;
    this.dialogText = null;
    this.isDialogActive = false;
    this.currentDialogText = '';
    this.dialogCharIndex = 0;
    
    // Tell orb dialog is finished
    if (orb && orb.finishTalking) {
      orb.finishTalking();
    }
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

  private checkForTreeInteraction(): void {
    if (this.isDialogActive) {
      this.hideInteractionHint();
      return;
    }

    // Log player position for debugging
    console.log(`Player position: (${Math.round(this.player.x)}, ${Math.round(this.player.y)})`);

    // Check if player is within tree interaction area (simple rectangle check)
    const isNearTree = (
      this.player.x >= this.TREE_X_MIN &&
      this.player.x <= this.TREE_X_MAX &&
      this.player.y >= this.TREE_Y_MIN &&
      this.player.y <= this.TREE_Y_MAX
    );

    if (isNearTree && !this.nearTree) {
      console.log("Player is near the tree! Showing hug hint!");
      this.nearTree = true;
      this.showInteractionHint();
    } else if (!isNearTree && this.nearTree) {
      console.log("Player left tree area. Hiding hint.");
      this.nearTree = false;
      this.hideInteractionHint();
    }
  }

  private checkForTreeHintTrigger(): void {
    // Check if player has reached the tree hint trigger position
    if (!this.treeHintTriggered && this.player.x >= this.TREE_HINT_TRIGGER_X && !this.isDialogActive) {
      console.log(`Player reached tree hint trigger at X: ${this.TREE_HINT_TRIGGER_X}`);
      this.treeHintTriggered = true;
      this.showTreeHintDialog();
    }
  }

  private showTreeHintDialog(): void {
    // Start the custom tree hint dialog sequence
    this.currentTreeHintIndex = 0;
    this.showNextTreeHintMessage();
  }

  private showNextTreeHintMessage(): void {
    if (this.currentTreeHintIndex >= this.treeHintMessages.length) {
      // All messages shown, orb can go back to following
      return;
    }

    const treeHintText = this.treeHintMessages[this.currentTreeHintIndex];
    
    // Show the tree hint dialog using the existing system
    this.showTreeHintCustomDialog(treeHintText);
  }

  private showTreeHintCustomDialog(text: string): void {
    if (this.isDialogActive) return;
    
    this.isDialogActive = true;
    
    // Position orb for talking
    this.orb.setPosition(this.player.x + 40, this.player.y - 60);
    
    const camera = this.cameras.main;
    
    // Smaller dialog positioned above center
    const dialogX = camera.centerX;
    const dialogY = camera.centerY - 110;
    
    const dialogBg = this.add.rectangle(
      dialogX, 
      dialogY, 
      600, 100, // Smaller: 600x100
      0x000000, 1 // Dark background
    );
    dialogBg.setScrollFactor(0); // Fixed to camera
    dialogBg.setDepth(2000); // Very high depth
    
    // Add a border
    const dialogBorder = this.add.rectangle(
      dialogX, 
      dialogY, 
      604, 104, // Border slightly bigger
      0x000000, 1 // Black border
    );
    dialogBorder.setScrollFactor(0);
    dialogBorder.setDepth(1999); // Behind the background
    
    // Dialog text - start with empty text for typewriter effect
    this.currentDialogText = text;
    this.dialogCharIndex = 0;
    
    this.dialogText = this.add.text(
      dialogX, 
      dialogY - 10, // Slightly above center of dialog
      '', // Start with empty text
      {
        fontFamily: 'Arial',
        fontSize: 18,
        color: '#ffffff',
        align: 'center',
        padding: { x: 15, y: 8 },
        wordWrap: { width: 550 }
      }
    );
    this.dialogText.setOrigin(0.5);
    this.dialogText.setScrollFactor(0);
    this.dialogText.setDepth(2001);
    
    // Prompt text
    const promptText = this.add.text(
      dialogX, 
      dialogY + 30, // Below the main text
      'Espacio para saltar', 
      {
        fontFamily: 'Arial',
        fontSize: 14,
        color: '#999999',
        align: 'right',
        padding: { x: 8, y: 4 }
      }
    );
    promptText.setOrigin(0.5);
    promptText.setScrollFactor(0);
    promptText.setDepth(2002);
    
    // Start typewriter effect
    this.startTreeHintTypewriter();
    
    // Store elements for cleanup
    this.dialogBox = this.add.container(0, 0);
    this.dialogBox.add([dialogBorder, dialogBg, this.dialogText, promptText]);
  }

  private startTreeHintTypewriter(): void {
    // Clear any existing timer
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
    }
    
    // Create timer that adds one character every 50ms
    this.typewriterTimer = this.time.addEvent({
      delay: 50, // 50ms between characters
      callback: () => {
        if (this.dialogCharIndex < this.currentDialogText.length && this.dialogText) {
          // Add next character
          this.dialogCharIndex++;
          const visibleText = this.currentDialogText.substring(0, this.dialogCharIndex);
          this.dialogText.setText(visibleText);
        } else {
          // Finished typing, cleanup timer
          if (this.typewriterTimer) {
            this.typewriterTimer.destroy();
            this.typewriterTimer = null;
          }
          
          // Auto-advance after a brief pause to let player read
          this.autoAdvanceTimer = this.time.delayedCall(1500, () => { // 1.5 second pause after typing finishes
            this.autoAdvanceTreeHintDialog();
          });
        }
      },
      repeat: this.currentDialogText.length - 1
    });
  }

  private skipAnyTypewriter(): void {
    // Unified method to skip typewriter effect for any active dialog
    if (this.typewriterTimer && this.dialogText) {
      this.typewriterTimer.destroy();
      this.typewriterTimer = null;
      this.dialogText.setText(this.currentDialogText);
      this.dialogCharIndex = this.currentDialogText.length;
      
      // Cancel any existing auto-advance timer
      if (this.autoAdvanceTimer) {
        this.autoAdvanceTimer.destroy();
        this.autoAdvanceTimer = null;
      }
      
      // Determine which type of dialog to auto-advance
      if (this.treeHintTriggered && this.currentTreeHintIndex < this.treeHintMessages.length) {
        // Tree hint dialog
        this.autoAdvanceTimer = this.time.delayedCall(500, () => {
          this.autoAdvanceTreeHintDialog();
        });
      } else if (this.nearTree) {
        // Tree interaction dialog (when hugging the tree)
        this.autoAdvanceTimer = this.time.delayedCall(500, () => {
          this.autoAdvanceTreeInteractionDialog();
        });
      } else {
        // Regular orb dialog
        this.autoAdvanceTimer = this.time.delayedCall(500, () => {
          this.autoAdvanceDialog();
        });
      }
    }
  }

  private skipTreeHintTypewriter(): void {
    // Skip to the end of the typewriter effect for tree hint dialog
    if (this.typewriterTimer && this.dialogText) {
      this.typewriterTimer.destroy();
      this.typewriterTimer = null;
      this.dialogText.setText(this.currentDialogText);
      this.dialogCharIndex = this.currentDialogText.length;
      
      // Cancel any existing auto-advance timer
      if (this.autoAdvanceTimer) {
        this.autoAdvanceTimer.destroy();
        this.autoAdvanceTimer = null;
      }
      
      // Auto-advance immediately after skipping (shorter pause)
      this.autoAdvanceTimer = this.time.delayedCall(500, () => { // 0.5 second pause when skipped
        this.autoAdvanceTreeHintDialog();
      });
    }
  }

  private autoAdvanceTreeHintDialog(): void {
    if (!this.isDialogActive || !this.dialogBox) return;
    
    // Clean up timer reference
    this.autoAdvanceTimer = null;
    
    // Clean up current dialog
    this.dialogBox.destroy();
    this.dialogBox = null;
    this.dialogText = null;
    this.isDialogActive = false;
    this.currentDialogText = '';
    this.dialogCharIndex = 0;
    
    // Advance to next message
    this.currentTreeHintIndex++;
    
    // Check if there are more messages
    if (this.currentTreeHintIndex < this.treeHintMessages.length) {
      // Show next message after a brief pause
      this.time.delayedCall(500, () => {
        this.showNextTreeHintMessage();
      });
    } else {
      // All messages shown, tree hint sequence complete
      console.log("Tree hint dialog sequence completed!");
    }
  }

  private showInteractionHint(): void {
    if (this.interactionHint) {
      this.interactionHint.setVisible(true);
      return;
    }

    this.interactionHint = this.add.text(
      0, 0,
      'Abrazar (A)',
      {
        fontSize: '14px',  // Smaller font
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 8, y: 4 },  // Smaller padding
        stroke: '#ffffff',
        strokeThickness: 1
      }
    );
    
    this.interactionHint.setOrigin(0.5, 0.5);
    this.interactionHint.setDepth(500);
    this.interactionHint.setScrollFactor(1); // Scroll with world
    
    // Position in the middle of the tree interaction area, raised 32px
    const treeMiddleX = (this.TREE_X_MIN + this.TREE_X_MAX) / 2;
    const treeMiddleY = (this.TREE_Y_MIN + this.TREE_Y_MAX) / 2 - 32; // Raised 32px
    this.interactionHint.setPosition(treeMiddleX, treeMiddleY);
  }

  private updateHintPosition(): void {
    // No longer needed since hint is positioned at tree center and scrolls with world
  }

  private hideInteractionHint(): void {
    if (this.interactionHint) {
      this.interactionHint.setVisible(false);
    }
  }

  private handleInteraction(): void {
    console.log("A key pressed! nearTree:", this.nearTree, "isDialogActive:", this.isDialogActive);
    
    if (!this.nearTree || this.isDialogActive) {
      return;
    }

    console.log("Starting tree hug dialog sequence!");
    // Start the tree interaction dialog sequence
    this.currentTreeInteractionIndex = 0;
    this.showNextTreeInteractionMessage();
  }

  private showNextTreeInteractionMessage(): void {
    if (this.currentTreeInteractionIndex >= this.treeInteractionMessages.length) {
      // All messages shown, interaction complete
      console.log("Tree interaction sequence completed!");
      return;
    }

    const message = this.treeInteractionMessages[this.currentTreeInteractionIndex];
    
    // Show the tree interaction dialog
    this.showInteractionDialog(message, true);
  }

  private showInteractionDialog(text: string, useGreenBackground: boolean = false): void {
    if (this.isDialogActive) {
      return;
    }

    this.hideInteractionHint();
    this.isDialogActive = true;

    // Stop player movement
    this.player.setVelocityX(0);

    const camera = this.cameras.main;
    
    // Smaller dialog positioned above center (same style as orb dialogs)
    const dialogX = camera.centerX;
    const dialogY = camera.centerY - 110;
    
    // Choose background color based on message
    const backgroundColor = useGreenBackground ? 0x042f04 : 0x000000; // Dark green or black
    const borderColor = useGreenBackground ? 0x042f04 : 0x000000; // Dark green or black
    
    const dialogBg = this.add.rectangle(
      dialogX, 
      dialogY, 
      600, 100, // Same size as orb dialogs
      backgroundColor, 1 // Dark background (black or green)
    );
    dialogBg.setScrollFactor(0); // Fixed to camera
    dialogBg.setDepth(2000); // Very high depth
    
    // Add a border
    const dialogBorder = this.add.rectangle(
      dialogX, 
      dialogY, 
      604, 104, // Border slightly bigger
      borderColor, 1 // Border color matches background
    );
    dialogBorder.setScrollFactor(0);
    dialogBorder.setDepth(1999); // Behind the background

    // Dialog text - start with empty text for typewriter effect
    this.currentDialogText = text;
    this.dialogCharIndex = 0;
    
    this.dialogText = this.add.text(
      dialogX, 
      dialogY - 10, // Slightly above center of dialog
      '', // Start with empty text
      {
        fontFamily: 'Arial',
        fontSize: 18,
        color: '#ffffff',
        align: 'center',
        padding: { x: 15, y: 8 },
        wordWrap: { width: 550 }
      }
    );
    this.dialogText.setOrigin(0.5);
    this.dialogText.setScrollFactor(0);
    this.dialogText.setDepth(2001);

    // Prompt text
    const promptText = this.add.text(
      dialogX, 
      dialogY + 30, // Below the main text
      'Espacio para saltar', 
      {
        fontFamily: 'Arial',
        fontSize: 14,
        color: '#999999',
        align: 'right',
        padding: { x: 8, y: 4 }
      }
    );
    promptText.setOrigin(0.5);
    promptText.setScrollFactor(0);
    promptText.setDepth(2002);

    // Store elements for cleanup
    this.dialogBox = this.add.container(0, 0);
    this.dialogBox.add([dialogBorder, dialogBg, this.dialogText, promptText]);
    
    // Start typewriter effect
    this.startInteractionTypewriter();
  }

  private startInteractionTypewriter(): void {
    // Clear any existing timer
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
    }

    // Create timer that adds one character every 50ms
    this.typewriterTimer = this.time.addEvent({
      delay: 50, // 50ms between characters
      callback: () => {
        if (this.dialogCharIndex < this.currentDialogText.length && this.dialogText) {
          // Add next character
          this.dialogCharIndex++;
          const visibleText = this.currentDialogText.substring(0, this.dialogCharIndex);
          this.dialogText.setText(visibleText);
        } else {
          // Finished typing, cleanup timer
          if (this.typewriterTimer) {
            this.typewriterTimer.destroy();
            this.typewriterTimer = null;
          }
          
          // Auto-advance after a brief pause to let player read
          this.autoAdvanceTimer = this.time.delayedCall(2000, () => { // 2 second pause for tree dialog
            this.autoAdvanceTreeInteractionDialog();
          });
        }
      },
      repeat: this.currentDialogText.length - 1
    });
  }

  private autoAdvanceTreeInteractionDialog(): void {
    if (!this.isDialogActive || !this.dialogBox) return;
    
    // Clean up timer reference
    this.autoAdvanceTimer = null;
    
    // Clean up current dialog
    this.dialogBox.destroy();
    this.dialogBox = null;
    this.dialogText = null;
    this.isDialogActive = false;
    this.currentDialogText = '';
    this.dialogCharIndex = 0;
    
    // Advance to next message
    this.currentTreeInteractionIndex++;
    
    // Check if there are more messages
    if (this.currentTreeInteractionIndex < this.treeInteractionMessages.length) {
      // Show next message after a brief pause
      this.time.delayedCall(500, () => {
        this.showNextTreeInteractionMessage();
      });
    } else {
      // All messages shown, tree interaction sequence complete
      console.log("Tree interaction dialog sequence completed!");
    }
  }

  private closeInteractionDialog(): void {
    // Clean up typewriter timer
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
      this.typewriterTimer = null;
    }
    
    // Clean up any pending auto-advance timers
    if (this.autoAdvanceTimer) {
      this.autoAdvanceTimer.destroy();
      this.autoAdvanceTimer = null;
    }

    // Clean up dialog elements
    if (this.dialogBox) {
      this.dialogBox.destroy();
      this.dialogBox = null;
    }
    
    this.dialogText = null;
    this.isDialogActive = false;
    this.currentDialogText = '';
    this.dialogCharIndex = 0;
    
    console.log("Tree interaction dialog closed!");
  }

  update(time: number, delta: number) {
    // Handle dialog input first
    if (this.isDialogActive && this.actionKeys.space) {
      if (Phaser.Input.Keyboard.JustDown(this.actionKeys.space)) {
        // Skip typewriter effect for any active dialog
        if (this.typewriterTimer) {
          this.skipAnyTypewriter();
        }
        return; // Don't process other input while dialog is active
      }
    }
    
    // Don't process input or updates if player is dead
    if (this.player.isDead) {
      // Still update visual effects for dead player
      this.player.update(time, delta);
      
      // Still update orb for fade out effect
      this.orb.update(time);
      
      // Still update bullies and visual effects (including dead ones for death animation)
      this.bullies.forEach(bully => {
        bully.update(time, delta);
      });
      
      // Clean up destroyed bullies from the array
      this.bullies = this.bullies.filter(bully => bully.active);
      
      this.updateParallax();
      return;
    }

    // Don't process game input if dialog is active
    if (this.isDialogActive) {
      // Stop player movement during dialog
      this.player.setLeftPressed(false);
      this.player.setRightPressed(false);
      this.player.setJumpPressed(false, false);
      this.player.setAttackPressed(false, false);
      this.player.setDashPressed(false, false);
      this.player.setLookUpPressed(false);
      this.player.setLookDownPressed(false);
      
      // Set player velocity to zero to stop immediately
      const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
      if (playerBody) {
        playerBody.setVelocityX(0);
        // Don't stop Y velocity completely to allow gravity/falling
      }
      
      // Still update player for animations and physics
      this.player.update(time, delta);
      
      // Still update orb during dialog
      this.orb.update(time);
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
    const interactPressed = this.actionKeys.interact.isDown;

    // Input state tracking for "just pressed" detection
    const jumpJustPressed = jumpPressed && !this.wasJumpDown;
    const attackJustPressed = attackPressed && !this.wasAttackDown;
    const focusJustPressed = focusPressed && !this.wasFocusDown;
    const dashJustPressed = dashPressed && !this.wasDashDown;
    
    // Handle A key for tree hugging
    if (Phaser.Input.Keyboard.JustDown(this.actionKeys.interact)) {
      this.handleInteraction();
    }

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

    // Update orb position and animation
    this.orb.update(time);

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
    
    // Check if player has reached the tree hint trigger
    this.checkForTreeHintTrigger();
    
    // Check if player is near the tree
    this.checkForTreeInteraction();

    // Track input state for next frame
    this.wasJumpDown = jumpPressed;
    this.wasAttackDown = attackPressed;
    this.wasFocusDown = focusPressed;
    this.wasDashDown = dashPressed;
  }
} 