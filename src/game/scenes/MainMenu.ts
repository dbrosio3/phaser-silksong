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

  update() {
    if (this.cursors.left.isDown) {
      this.player.moveLeft();
    } else if (this.cursors.right.isDown) {
      this.player.moveRight();
    } else {
      this.player.idle();
    }

    if (this.cursors.up.isDown) {
      this.player.jump();
    }
  }

  collectStar(player, star) {
    star.disableBody(true, true);
    this.score = this.score + 10;
    this.scoreText.setText('Score: ' + this.score);
  }

  changeScene() {

  }

}
