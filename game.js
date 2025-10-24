const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 500 },
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

const game = new Phaser.Game(config);

function preload() {
    // placeholder for assets if added later
}

function create() {
    // create a simple ground platform
    const ground = this.add.rectangle(400, 580, 800, 40, 0x444444);
    this.physics.add.existing(ground, true); // static body

    // create player
    player = this.add.rectangle(100, 500, 40, 60, 0x00ffff);
    this.physics.add.existing(player);
    player.body.setCollideWorldBounds(true);

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
    // spawn at right side
    const enemy = this.add.rectangle(820, 520, 40, 60, 0xff0000);
    this.physics.add.existing(enemy);
    enemy.body.setVelocityX(-50);
    enemy.body.setCollideWorldBounds(false);
    enemies.add(enemy);
}

function hitEnemy(bullet, enemy) {
    // spawn splash effect could go here
    bullet.destroy();
    enemy.destroy();
}

function update(time) {
    // reset horizontal velocity
    player.body.setVelocityX(0);
    // reset vertical velocity partly to not accumulate when not pressing keys
    // (gravity will still act when jumping)

    // horizontal movement
    if (keys.left && keys.left.isDown) {
        player.body.setVelocityX(-160);
    }
    if (keys.right && keys.right.isDown) {
        player.body.setVelocityX(160);
    }
    // vertical movement (up / down)
    if (keys.up && keys.up.isDown) {
        player.body.setVelocityY(-160);
    }
    if (keys.down && keys.down.isDown) {
        player.body.setVelocityY(160);
    }

    // jump
    if (keys.jump && Phaser.Input.Keyboard.JustDown(keys.jump) && player.body.blocked.down) {
        player.body.setVelocityY(-330);
    }

    // fire bullet
    if (keys.fire && Phaser.Input.Keyboard.JustDown(keys.fire) && time > lastFired) {
        const bullet = this.add.rectangle(player.x + 20, player.y, 20, 8, 0xffffff);
        this.physics.add.existing(bullet);
        bullet.body.setAllowGravity(false);
        bullet.body.setVelocityX(400);
        bullets.add(bullet);
        lastFired = time + BULLET_DELAY;
    }

    // remove bullets that go off screen
    bullets.children.each(function (b) {
        if (b.x > 820) {
            b.destroy();
        }
    }, this);
}
