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
    // load enemy
    this.load.image('enemy', 'assets/enemies/Guz_1.jpeg');
    // load projectiles
    this.load.image('bullet_left', 'assets/projectiles/Yumshot_left.jpeg');
    this.load.image('bullet_right', 'assets/projectiles/Yumshot_right.jpeg');
}

function create() {
    this.physics.world.setBounds(0, 0, 800, 600);

    // player sprite
    player = this.physics.add.sprite(400, 300, 'hero_right');
    player.setCollideWorldBounds(true);
    player.body.setAllowGravity(false);
    player.setDrag(400);
    player.setMaxVelocity(260, 260);

    // groups
    bullets = this.physics.add.group();
    enemies = this.physics.add.group();

    // collisions
    this.physics.add.overlap(bullets, enemies, hitEnemy, null, this);

    // keyboard keys
    keys = this.input.keyboard.addKeys({
        up: 'W',
        down: 'S',
        right: 'D',
        left: 'A',
        fire: 'SPACE'
    });

    // pause physics until the player presses start
    this.physics.pause();

    const startButton = document.getElementById('start-button');
    if (startButton) {
        startButton.classList.remove('hidden');
        startButton.disabled = false;

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
    }
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
    const direction = moveDirection.lengthSq() > 0
        ? moveDirection.clone().normalize()
        : new Phaser.Math.Vector2(facing === 'left' ? -1 : 1, 0);

    if (direction.x < 0) {
        facing = 'left';
    } else if (direction.x > 0) {
        facing = 'right';
    }

    const bulletKey = facing === 'left' ? 'bullet_left' : 'bullet_right';
    const bullet = this.physics.add.sprite(
        player.x + direction.x * 24,
        player.y + direction.y * 24,
        bulletKey
    );
    bullet.body.setAllowGravity(false);
    bullet.setVelocity(direction.x * 480, direction.y * 480);
    bullet.setCollideWorldBounds(false);
    bullets.add(bullet);

    player.setTexture(facing === 'left' ? 'hero_left_fire' : 'hero_right_fire');

    if (fireResetTimer) {
        fireResetTimer.remove(false);
    }
    fireResetTimer = this.time.delayedCall(180, () => {
        player.setTexture(facing === 'left' ? 'hero_left' : 'hero_right');
    });
}

function hitEnemy(bullet, enemy) {
    bullet.destroy();
    enemy.destroy();
}

function update(time) {
    if (!gameStarted) {
        return;
    }

    // reset horizontal velocity
    const velocity = new Phaser.Math.Vector2(0, 0);

    if (keys.left.isDown) {
        velocity.x -= 1;
    }
    if (keys.right.isDown) {
        velocity.x += 1;
    }
    if (keys.up.isDown) {
        velocity.y -= 1;
    }
    if (keys.down.isDown) {
        velocity.y += 1;
    }

    if (velocity.lengthSq() > 0) {
        moveDirection = velocity.clone().normalize();
        player.setVelocity(moveDirection.x * 220, moveDirection.y * 220);

        if (moveDirection.x < 0 && facing !== 'left') {
            facing = 'left';
            player.setTexture('hero_left');
        } else if (moveDirection.x > 0 && facing !== 'right') {
            facing = 'right';
            player.setTexture('hero_right');
        }
    } else {
        player.setVelocity(0, 0);
    }

    // fire bullet
    if (Phaser.Input.Keyboard.JustDown(keys.fire) && time > lastFired) {
        fireBullet.call(this);
        lastFired = time + BULLET_DELAY;
    }

    // remove bullets offscreen
    bullets.children.each(function (b) {
        if (b.x < -40 || b.x > 840 || b.y < -40 || b.y > 640) {
            b.destroy();
        }
    }, this);

    // keep enemies chasing the player
    enemies.children.each(function (enemy) {
        if (!enemy.active) {
            return;
        }

        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
        const speed = enemy.getData('speed') || 80;
        this.physics.velocityFromRotation(angle, speed, enemy.body.velocity);
        enemy.body.setAllowGravity(false);
    }, this);
}
