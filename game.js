const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 600 },
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
let fireResetTimer = null;

const game = new Phaser.Game(config);

function preload() {
    // load hero images
    this.load.image('hero_left', 'assets/hero/Hero_leftstance.jpeg');
    this.load.image('hero_left_fire', 'assets/hero/Hero_leftstancefiring.jpeg');
    this.load.image('hero_right', 'assets/hero/Hero_rightstance.jpeg');
    this.load.image('hero_right_fire', 'assets/hero/Hero_rightstancefiring.jpeg');
    // load enemy
    this.load.image('enemy', 'assets/enemies/Guz_1.jpeg');
    // load projectiles
    this.load.image('bullet_left', 'assets/projectiles/Yumshot_left.jpeg');
    this.load.image('bullet_right', 'assets/projectiles/Yumshot_right.jpeg');
}

function create() {
    // simple ground
    const ground = this.add.rectangle(400, 590, 800, 20, 0x222222);
    this.physics.add.existing(ground, true);

    // player sprite
    player = this.physics.add.sprite(100, 500, 'hero_right');
    player.setCollideWorldBounds(true);

    // groups
    bullets = this.physics.add.group();
    enemies = this.physics.add.group();

    // collisions
    this.physics.add.collider(player, ground);
    this.physics.add.collider(enemies, ground);
    this.physics.add.overlap(bullets, enemies, hitEnemy, null, this);

    // keyboard keys
    keys = this.input.keyboard.addKeys({
        up: 'W',
        down: 'S',
        right: 'D',
        left: 'A',
        jump: 'SPACE',
        fire: 'ENTER'
    });

    // enemy spawn event
    this.time.addEvent({
        delay: 2000,
        callback: spawnEnemy,
        callbackScope: this,
        loop: true
    });
}

function spawnEnemy() {
    const enemy = this.physics.add.sprite(820, 520, 'enemy');
    enemy.setVelocityX(-50);
    enemies.add(enemy);
}

function fireBullet() {
    // choose bullet sprite based on facing
    const bulletKey = facing === 'left' ? 'bullet_left' : 'bullet_right';
    const offset = facing === 'left' ? -20 : 20;
    const bullet = this.physics.add.sprite(player.x + offset, player.y, bulletKey);
    bullet.setVelocityX(facing === 'left' ? -400 : 400);
    bullet.setCollideWorldBounds(false);
    bullet.body.setAllowGravity(false);
    bullets.add(bullet);

    // change player texture to firing frame
    player.setTexture(facing === 'left' ? 'hero_left_fire' : 'hero_right_fire');

    // reset to stance after short time
    if (fireResetTimer) {
        fireResetTimer.remove(false);
    }
    fireResetTimer = this.time.delayedCall(200, () => {
        player.setTexture(facing === 'left' ? 'hero_left' : 'hero_right');
    });
}

function hitEnemy(bullet, enemy) {
    bullet.destroy();
    enemy.destroy();
}

function update(time) {
    // reset horizontal velocity
    player.setVelocityX(0);

    // horizontal movement and facing
    if (keys.left.isDown) {
        player.setVelocityX(-160);
        if (facing !== 'left') {
            facing = 'left';
            player.setTexture('hero_left');
        }
    } else if (keys.right.isDown) {
        player.setVelocityX(160);
        if (facing !== 'right') {
            facing = 'right';
            player.setTexture('hero_right');
        }
    }

    // vertical movement (optional up/down)
    if (keys.up.isDown) {
        player.setVelocityY(-160);
    } else if (keys.down.isDown) {
        player.setVelocityY(160);
    }

    // jump
    if (Phaser.Input.Keyboard.JustDown(keys.jump) && player.body.blocked.down) {
        player.setVelocityY(-330);
    }

    // fire bullet
    if (Phaser.Input.Keyboard.JustDown(keys.fire) && time > lastFired) {
        fireBullet.call(this);
        lastFired = time + BULLET_DELAY;
    }

    // remove bullets offscreen
    bullets.children.each(function (b) {
        if (b.x < -20 || b.x > 820) {
            b.destroy();
        }
    }, this);
}
