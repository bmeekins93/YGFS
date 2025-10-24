// Cleaned and fixed game.js for Yum Guzzlers From Space
// Remove duplicate config/update definitions and ensure start button starts the game properly

let game;
let player;
let bullets;
let enemies;
let keys;
let facing = 'right';
let gameStarted = false;
let score = 0;
let scoreText;
let lastFired = 0;

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
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

// Initialize the Phaser game
game = new Phaser.Game(config);

function preload() {
  // Load assets
  this.load.image('background', 'assets/background.png');
  this.load.image('hero_left', 'assets/hero_left.png');
  this.load.image('hero_right', 'assets/hero_right.png');
  this.load.image('bullet', 'assets/bullet.png');
  this.load.image('enemy', 'assets/enemy.png');
}

function create() {
  // Add background
  this.add.image(400, 300, 'background');

  // Create groups for bullets and enemies
  bullets = this.physics.add.group();
  enemies = this.physics.add.group();

  // Create the player sprite
  player = this.physics.add.sprite(400, 300, 'hero_right');
  player.setCollideWorldBounds(true);

  // Display score
  scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '20px', fill: '#fff' });

  // Pause physics initially until start button is clicked
  this.physics.pause();

  // Grab the start button from the HTML and set up click handler
  const startButton = document.getElementById('start-button');
  if (startButton) {
    startButton.classList.remove('hidden');
    startButton.addEventListener('click', () => {
      gameStarted = true;
      startButton.classList.add('hidden');
      this.physics.resume();
      spawnEnemy.call(this);
    });
  }

  // Capture mouse input for firing bullets
  this.input.mouse.capture = true;

  // Set up keyboard controls (WASD)
  keys = this.input.keyboard.addKeys({
    up: Phaser.Input.Keyboard.KeyCodes.W,
    left: Phaser.Input.Keyboard.KeyCodes.A,
    down: Phaser.Input.Keyboard.KeyCodes.S,
    right: Phaser.Input.Keyboard.KeyCodes.D
  });
}

function spawnEnemy() {
  // Spawn an enemy at a random position around the edges of the screen
  const positions = [
    { x: Phaser.Math.Between(0, 800), y: -50 },
    { x: Phaser.Math.Between(0, 800), y: 650 },
    { x: -50, y: Phaser.Math.Between(0, 600) },
    { x: 850, y: Phaser.Math.Between(0, 600) }
  ];
  const pos = positions[Phaser.Math.Between(0, positions.length - 1)];
  const enemy = enemies.create(pos.x, pos.y, 'enemy');
  // Store a random speed for each enemy
  enemy.setData('speed', Phaser.Math.Between(50, 100));
}

function fireBullet(pointer) {
  // Create a bullet at the player's position and fire toward pointer coordinates
  const bullet = bullets.create(player.x, player.y, 'bullet');
  this.physics.moveTo(bullet, pointer.worldX, pointer.worldY, 500);
  bullet.setData('born', 0);
}

function hitEnemy(bullet, enemy) {
  // Destroy bullet and enemy and update score
  bullet.destroy();
  enemy.destroy();
  score += 10;
  scoreText.setText('Score: ' + score);
  // Spawn another enemy after one is destroyed
  spawnEnemy.call(this);
}

function update(time, delta) {
  // Do nothing if the game hasn't started yet
  if (!gameStarted) return;

  // Player movement logic
  const speed = 220;
  let vx = 0;
  let vy = 0;
  if (keys.left.isDown) vx -= 1;
  if (keys.right.isDown) vx += 1;
  if (keys.up.isDown) vy -= 1;
  if (keys.down.isDown) vy += 1;

  const velVec = new Phaser.Math.Vector2(vx, vy);
  if (velVec.lengthSq() > 0) {
    velVec.normalize();
    player.setVelocity(velVec.x * speed, velVec.y * speed);
    // Update facing direction based on horizontal movement
    if (velVec.x < 0 && facing !== 'left') {
      facing = 'left';
      player.setTexture('hero_left');
    } else if (velVec.x > 0 && facing !== 'right') {
      facing = 'right';
      player.setTexture('hero_right');
    }
  } else {
    player.setVelocity(0, 0);
  }

  // Fire bullet when mouse is pressed, with a simple rate limit
  if (this.input.activePointer.isDown && time > lastFired + 200) {
    fireBullet.call(this, this.input.activePointer);
    lastFired = time;
  }

  // Remove bullets that go offscreen
  bullets.children.each(function (b) {
    if (b.x < -40 || b.x > 840 || b.y < -40 || b.y > 640) {
      b.destroy();
    }
  }, this);

  // Check collisions between bullets and enemies
  this.physics.add.overlap(bullets, enemies, hitEnemy, null, this);

  // Make enemies chase the player
  enemies.children.each(function (enemy) {
    if (!enemy.active) return;
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
    const speed = enemy.getData('speed') || 80;
    this.physics.velocityFromRotation(angle, speed, enemy.body.velocity);
    enemy.body.setAllowGravity(false);
  }, this);
}
