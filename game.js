const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const BULLET_DELAY = 350;
const PLAYER_SPEED = 230;
const BULLET_SPEED = 520;
const PLAYER_TARGET_HEIGHT = 64;
const ENEMY_TARGET_HEIGHT = 56;
const BULLET_TARGET_HEIGHT = 24;
const ENEMY_SPAWN_OFFSET = ENEMY_TARGET_HEIGHT;

class YumGuzzlersScene extends Phaser.Scene {
    constructor() {
        super({ key: 'YumGuzzlersScene' });

        this.player = null;
        this.keys = null;
        this.bullets = null;
        this.enemies = null;
        this.lastFired = 0;
        this.facing = 'right';
        this.moveDirection = new Phaser.Math.Vector2(1, 0);
        this.fireResetTimer = null;
        this.gameStarted = false;
        this.enemySpawnTimer = null;
        this.score = 0;
        this.scoreText = null;
    }

    preload() {
        this.load.image('hero_left', 'assets/hero/Hero_leftstance.jpeg');
        this.load.image('hero_left_fire', 'assets/hero/Hero_leftstancefiring.jpeg');
        this.load.image('hero_right', 'assets/hero/Hero_rightstance.jpeg');
        this.load.image('hero_right_fire', 'assets/hero/Hero_rightstancefiring.jpeg');
        this.load.image('enemy', 'assets/enemies/Guz_1.jpeg');
        this.load.image('bullet_left', 'assets/projectiles/Yumshot_left.jpeg');
        this.load.image('bullet_right', 'assets/projectiles/Yumshot_right.jpeg');
    }

    create() {
        this.cameras.main.setBackgroundColor('#010309');
        this.physics.world.setBounds(32, 32, GAME_WIDTH - 64, GAME_HEIGHT - 64);

        const arenaFrame = this.add.rectangle(
            GAME_WIDTH / 2,
            GAME_HEIGHT / 2,
            GAME_WIDTH - 32,
            GAME_HEIGHT - 32
        );
        arenaFrame.setStrokeStyle(3, 0x1f2949, 0.9);
        arenaFrame.setDepth(0);

        this.player = this.physics.add.sprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'hero_right');
        this.player.setCollideWorldBounds(true);
        this.player.setDamping(true);
        this.player.setDrag(600, 600);
        this.player.setMaxVelocity(PLAYER_SPEED, PLAYER_SPEED);
        this.player.body.setAllowGravity(false);
        this.player.setDepth(1);

        this.#applySpriteScale(this.player, 'hero_right', PLAYER_TARGET_HEIGHT, 0.7);

        this.bullets = this.physics.add.group({
            defaultKey: 'bullet_right',
            maxSize: 16,
            runChildUpdate: false
        });
        this.enemies = this.physics.add.group({
            runChildUpdate: false
        });

        this.physics.add.overlap(this.bullets, this.enemies, this.#hitEnemy, null, this);

        this.keys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            fire: Phaser.Input.Keyboard.KeyCodes.SPACE
        });

        this.score = 0;
        this.scoreText = this.add.text(56, 48, 'Score: 0', {
            fontFamily: '"Segoe UI", sans-serif',
            fontSize: '20px',
            color: '#f0f6ff'
        });
        this.scoreText.setDepth(2);
        this.scoreText.setScrollFactor(0);

        this.physics.pause();

        const startButton = document.getElementById('start-button');
        if (startButton) {
            startButton.classList.remove('hidden');
            startButton.disabled = false;

            const startHandler = () => {
                startButton.disabled = true;
                startButton.classList.add('hidden');
                startButton.removeEventListener('click', startHandler);
                this.#beginGame();
            };

            startButton.addEventListener('click', startHandler);

            this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
                startButton.removeEventListener('click', startHandler);
                if (this.enemySpawnTimer) {
                    this.enemySpawnTimer.remove(false);
                }
                if (this.fireResetTimer) {
                    this.fireResetTimer.remove(false);
                }
            });
        }
    }

    update(time) {
        if (!this.gameStarted) {
            return;
        }

        const velocity = new Phaser.Math.Vector2();

        if (this.keys.left.isDown) {
            velocity.x -= 1;
        }
        if (this.keys.right.isDown) {
            velocity.x += 1;
        }
        if (this.keys.up.isDown) {
            velocity.y -= 1;
        }
        if (this.keys.down.isDown) {
            velocity.y += 1;
        }

        if (velocity.lengthSq() > 0) {
            this.moveDirection = velocity.clone().normalize();
            this.player.setVelocity(
                this.moveDirection.x * PLAYER_SPEED,
                this.moveDirection.y * PLAYER_SPEED
            );

            if (this.moveDirection.x < 0 && this.facing !== 'left') {
                this.facing = 'left';
                this.player.setTexture('hero_left');
                this.#applySpriteScale(this.player, 'hero_left', PLAYER_TARGET_HEIGHT, 0.7);
            } else if (this.moveDirection.x > 0 && this.facing !== 'right') {
                this.facing = 'right';
                this.player.setTexture('hero_right');
                this.#applySpriteScale(this.player, 'hero_right', PLAYER_TARGET_HEIGHT, 0.7);
            }
        } else {
            this.player.setVelocity(0, 0);
        }

        if (Phaser.Input.Keyboard.JustDown(this.keys.fire) && time > this.lastFired) {
            this.#fireBullet();
            this.lastFired = time + BULLET_DELAY;
        }

        this.bullets.children.iterate((bullet) => {
            if (!bullet || !bullet.active) {
                return;
            }

            if (
                bullet.x < -64 ||
                bullet.x > GAME_WIDTH + 64 ||
                bullet.y < -64 ||
                bullet.y > GAME_HEIGHT + 64
            ) {
                bullet.destroy();
            }
        });

        this.enemies.children.iterate((enemy) => {
            if (!enemy || !enemy.active) {
                return;
            }

            const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
            const speed = enemy.getData('speed');
            this.physics.velocityFromRotation(angle, speed, enemy.body.velocity);
        });
    }

    #beginGame() {
        if (this.gameStarted) {
            return;
        }

        this.gameStarted = true;
        this.physics.resume();
        this.enemySpawnTimer = this.time.addEvent({
            delay: 1200,
            callback: this.#spawnEnemy,
            callbackScope: this,
            loop: true
        });
    }

    #spawnEnemy() {
        const spawnEdge = Phaser.Math.Between(0, 3);
        let x = GAME_WIDTH / 2;
        let y = GAME_HEIGHT / 2;

        switch (spawnEdge) {
            case 0:
                x = Phaser.Math.Between(ENEMY_SPAWN_OFFSET, GAME_WIDTH - ENEMY_SPAWN_OFFSET);
                y = -ENEMY_SPAWN_OFFSET;
                break;
            case 1:
                x = GAME_WIDTH + ENEMY_SPAWN_OFFSET;
                y = Phaser.Math.Between(ENEMY_SPAWN_OFFSET, GAME_HEIGHT - ENEMY_SPAWN_OFFSET);
                break;
            case 2:
                x = Phaser.Math.Between(ENEMY_SPAWN_OFFSET, GAME_WIDTH - ENEMY_SPAWN_OFFSET);
                y = GAME_HEIGHT + ENEMY_SPAWN_OFFSET;
                break;
            default:
                x = -ENEMY_SPAWN_OFFSET;
                y = Phaser.Math.Between(ENEMY_SPAWN_OFFSET, GAME_HEIGHT - ENEMY_SPAWN_OFFSET);
                break;
        }

        const enemy = this.physics.add.sprite(x, y, 'enemy');
        enemy.body.setAllowGravity(false);
        enemy.setCollideWorldBounds(false);
        enemy.setData('speed', Phaser.Math.Between(85, 130));
        enemy.setDepth(1);

        this.#applySpriteScale(enemy, 'enemy', ENEMY_TARGET_HEIGHT, 0.8);

        this.enemies.add(enemy);
    }

    #fireBullet() {
        const direction = this.moveDirection.lengthSq() > 0
            ? this.moveDirection.clone().normalize()
            : new Phaser.Math.Vector2(this.facing === 'left' ? -1 : 1, 0);

        if (direction.x < 0) {
            this.facing = 'left';
        } else if (direction.x > 0) {
            this.facing = 'right';
        }

        const bulletKey = this.facing === 'left' ? 'bullet_left' : 'bullet_right';
        const bullet = this.physics.add.sprite(
            this.player.x + direction.x * 18,
            this.player.y + direction.y * 18,
            bulletKey
        );
        bullet.body.setAllowGravity(false);
        bullet.setVelocity(direction.x * BULLET_SPEED, direction.y * BULLET_SPEED);
        bullet.setDepth(2);

        this.#applySpriteScale(bullet, bulletKey, BULLET_TARGET_HEIGHT, 1);

        this.bullets.add(bullet);

        this.player.setTexture(this.facing === 'left' ? 'hero_left_fire' : 'hero_right_fire');
        this.#applySpriteScale(
            this.player,
            this.facing === 'left' ? 'hero_left_fire' : 'hero_right_fire',
            PLAYER_TARGET_HEIGHT,
            0.7
        );

        if (this.fireResetTimer) {
            this.fireResetTimer.remove(false);
        }

        this.fireResetTimer = this.time.delayedCall(160, () => {
            this.player.setTexture(this.facing === 'left' ? 'hero_left' : 'hero_right');
            this.#applySpriteScale(
                this.player,
                this.facing === 'left' ? 'hero_left' : 'hero_right',
                PLAYER_TARGET_HEIGHT,
                0.7
            );
        });
    }

    #hitEnemy(bullet, enemy) {
        bullet.destroy();
        enemy.destroy();
        this.score += 1;
        this.scoreText.setText(`Score: ${this.score}`);
    }

    #applySpriteScale(sprite, textureKey, targetHeight, bodyScale = 1) {
        const texture = this.textures.get(textureKey);
        if (!texture || !texture.getSourceImage()) {
            return;
        }

        const source = texture.getSourceImage();
        const scale = targetHeight / source.height;
        sprite.setScale(scale);

        if (sprite.body) {
            const bodyWidth = source.width * scale * bodyScale;
            const bodyHeight = source.height * scale * bodyScale;
            sprite.body.setSize(bodyWidth, bodyHeight, true);
        }
    }
}

const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: YumGuzzlersScene
};

new Phaser.Game(config);
