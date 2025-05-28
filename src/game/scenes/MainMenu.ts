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
    this.add.image(400, 300, 'sky');

    this.platforms = this.physics.add.staticGroup();

    this.platforms.create(400, 568, 'ground').setScale(2).refreshBody();
    this.platforms.create(600, 400, 'ground');
    this.platforms.create(50, 250, 'ground');
    this.platforms.create(750, 220, 'ground');

    this.player = new Player(this, 100, 450);
    this.physics.add.collider(this.player, this.platforms);

    if(this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.jumpKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    }
    
    this.stars = this.physics.add.group({
      key: 'star',
      repeat: 11,
      setXY: { x: 12, y: 0, stepX: 70 }
    })

    this.stars.children.iterate((child) => {
      (child as Phaser.Physics.Arcade.Sprite).setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
      return true;
    });

    this.physics.add.collider(this.stars, this.platforms);
    this.physics.add.overlap(this.player, this.stars, this.collectStar, undefined, this);

    this.score = 0;
    this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', color: '#000' });

    EventBus.emit('current-scene-ready', this);
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

    // Track jump state for next frame
    this.wasJumpDown = jumpPressed;
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
