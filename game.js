const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

let player;
let keys;
let bullets;
let enemies;
let lastFired = 0;
const BULLET_DELAY = 400;
let facing = 'right';
let moveDirection = new Phaser.Math.Vector2(1, 0);
let fireResetTimer = null;
let gameStarted = false;

const game = new Phaser.Game(config);

function preload() {
    // load hero images
    this.load.image('hero_left', 'assets/hero/Hero_leftstance.jpeg');
    this.load.image('hero_left_fire', 'assets/hero/Hero_leftstancefiring.jpeg');
    this.load.image('hero_right', 'assets/hero/Hero_rightstance.jpeg');
    this.load.image('hero_right_fire', 'assets/hero/Hero_rightstancefiring.jpeg');
    // load bullet images
    this.load.image('bullet_left', 'assets/projectiles/Yumshot_left.jpeg');
    this.load.image('bullet_right', 'assets/projectiles/Yumshot_right.jpeg');
    // load enemy
    this.load.image('enemy', 'assets/enemies/Guz_1.jpeg');
}

function create() {
    bullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 20, runChildUpdate: true });
    enemies = this.physics.add.group();

    player = this.physics.add.sprite(400, 300, 'hero_right');
    player.setCollideWorldBounds(true);

    keys = this.input.keyboard.addKeys('W,A,S,D,SPACE');

    this.physics.pause(); // pause game until start

    const startButton = document.getElementById('start-button');
    startButton.addEventListener('click', () => {
        if (gameStarted) {
            return;
        }
        gameStarted = true;
        startButton.classList.add('hidden');
        this.physics.resume();
        this.time.addEvent({
            delay: 1200,
            callback: spawnEnemy,
            callbackScope: this,
            loop: true
        });
    }, { once: true });

    // bullet-enemy collision
    this.physics.add.overlap(bullets, enemies, hitEnemy, null, this);
}

function spawnEnemy() {
    const spawnEdge = Phaser.Math.Between(0, 3);
    let x = 0;
    let y = 0;
    switch (spawnEdge) {
        case 0: // top
            x = Phaser.Math.Between(40, 760);
            y = -40;
            break;
        case 1: // right
            x = 840;
            y = Phaser.Math.Between(40, 560);
            break;
        case 2: // bottom
            x = Phaser.Math.Between(40, 760);
            y = 640;
            break;
        default: // left
            x = -40;
            y = Phaser.Math.Between(40, 560);
            break;
    }
    const enemy = this.physics.add.sprite(x, y, 'enemy');
    enemy.body.setAllowGravity(false);
    enemy.setCollideWorldBounds(false);
    enemy.setData('speed', Phaser.Math.Between(70, 110));
    enemies.add(enemy);
}

function fireBullet() {
    const time = this.time.now;
    if (time - lastFired < BULLET_DELAY) {
        return;
    }
    lastFired = time;
    let bulletKey;
    let velocityX;

    if (facing === 'right') {
        bulletKey = 'bullet_right';
        velocityX = 300;
    } else {
        bulletKey = 'bullet_left';
        velocityX = -300;
    }
    const bullet = bullets.get(player.x, player.y, bulletKey);
    if (!bullet) {
        return;
    }
    bullet.setActive(true);
    bullet.setVisible(true);
    bullet.body.enable = true;
    bullet.setVelocity(velocityX, 0);
    bullet.setCollideWorldBounds(false);
}

function hitEnemy(bullet, enemy) {
    bullet.destroy();
    enemy.destroy();
}

function update(time, delta) {
    if (!gameStarted) {
        return;
    }
    // movement
    moveDirection.set(0, 0);
    if (keys.A.isDown) {
        moveDirection.x = -1;
        facing = 'left';
    } else if (keys.D.isDown) {
        moveDirection.x = 1;
        facing = 'right';
    }
    if (keys.W.isDown) {
        moveDirection.y = -1;
    } else if (keys.S.isDown) {
        moveDirection.y = 1;
    }
    moveDirection.normalize();
    player.setVelocity(moveDirection.x * 200, moveDirection.y * 200);

    // set sprite based on facing and firing
    if (facing === 'right') {
        if (keys.SPACE.isDown) {
            player.setTexture('hero_right_fire');
        } else {
            player.setTexture('hero_right');
        }
    } else {
        if (keys.SPACE.isDown) {
            player.setTexture('hero_left_fire');
        } else {
            player.setTexture('hero_left');
        }
    }

    // fire bullet on space
    if (keys.SPACE.isDown) {
        fireBullet.call(this);
    }

    // update bullets – remove those off-screen
    bullets.children.iterate((bullet) => {
        if (bullet && bullet.active && (bullet.x < -50 || bullet.x > 850)) {
            bullet.destroy();
        }
    });

    // enemy chasing player
    enemies.children.iterate((enemy) => {
        if (enemy && enemy.active) {
            const enemySpeed = enemy.getData('speed');
            this.physics.moveToObject(enemy, player, enemySpeed);
        }
    });
}
