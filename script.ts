const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

type Keys = { [key: string]: boolean };
const keys: Keys = {};

let gameRunning = false;
let score = 0;
let playerLives = 3;
let gameStarted = false;

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (!gameStarted && e.code === 'Enter') {
    gameStarted = true;
    startGame();
  } else if (!gameRunning && e.code === 'Enter') {
    startGame();
  }
  e.preventDefault();
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
  e.preventDefault();
});

class Tank {
  x: number;
  y: number;
  angle: number;
  speed: number;
  bullets: Bullet[] = [];
  lastShotTime: number = 0;
  shotCooldown: number = 300;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.angle = 0;
    this.speed = 200;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = 'blue';
    ctx.fillRect(-15, -10, 30, 20);
    ctx.fillStyle = 'black';
    ctx.fillRect(10, -3, 15, 6);
    ctx.restore();
  }

  update(delta: number) {
    const distance = this.speed * delta;
    if (keys['ArrowUp']) {
      this.x += distance * Math.cos(this.angle);
      this.y += distance * Math.sin(this.angle);
    }
    if (keys['ArrowLeft']) this.angle -= 2 * delta;
    if (keys['ArrowRight']) this.angle += 2 * delta;

    if (keys['Space'] && performance.now() - this.lastShotTime > this.shotCooldown) {
      this.shoot();
      this.lastShotTime = performance.now();
    }
  }

  shoot() {
    if (this.bullets.length < 5) {
      this.bullets.push(new Bullet(this.x, this.y, this.angle));
    }
  }
}

class Bullet {
  x: number;
  y: number;
  angle: number;
  speed: number = 400;
  active: boolean = true;

  constructor(x: number, y: number, angle: number) {
    this.x = x;
    this.y = y;
    this.angle = angle;
  }

  update(delta: number) {
    this.x += this.speed * delta * Math.cos(this.angle);
    this.y += this.speed * delta * Math.sin(this.angle);
    if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
      this.active = false;
    }
  }

  draw() {
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Enemy {
  x: number;
  y: number;
  speed: number = 80;
  alive: boolean = true;

  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
  }

  update(delta: number, targetX: number, targetY: number) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length !== 0) {
      this.x += (dx / length) * this.speed * delta;
      this.y += (dy / length) * this.speed * delta;
    }
  }

  draw() {
    ctx.fillStyle = 'green';
    ctx.fillRect(this.x - 10, this.y - 10, 20, 20);
  }
}

let tank = new Tank(canvas.width / 2, canvas.height / 2);
let enemies: Enemy[] = [];
let lastTime = performance.now();

function startGame() {
  tank = new Tank(canvas.width / 2, canvas.height / 2);
  enemies = [];
  score = 0;
  playerLives = 3;
  gameRunning = true;
  spawnEnemy();
  requestAnimationFrame(gameLoop);
}

function spawnEnemy() {
  if (gameRunning && enemies.length < 5) {
    enemies.push(new Enemy());
  }
  if (gameRunning) {
    setTimeout(spawnEnemy, 2000);
  }
}

function drawHUD() {
  ctx.fillStyle = 'black';
  ctx.font = '20px Arial';
  ctx.textAlign = 'left'; // FIX
  ctx.fillText(`Punti: ${score}`, 20, 30);
  ctx.fillText(`Vita: ${playerLives}`, 20, 60);
}

function checkCollisions() {
  tank.bullets.forEach((bullet) => {
    enemies.forEach((enemy) => {
      const dx = bullet.x - enemy.x;
      const dy = bullet.y - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 15 && enemy.alive && bullet.active) {
        bullet.active = false;
        enemy.alive = false;
        score += 10;
      }
    });
  });

  enemies.forEach((enemy) => {
    const dx = tank.x - enemy.x;
    const dy = tank.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 25 && enemy.alive) {
      playerLives -= 1;
      enemy.alive = false;
      if (playerLives <= 0) {
        gameRunning = false;
      }
    }
  });
}

function gameLoop(currentTime: number) {
  const delta = (currentTime - lastTime) / 1000;
  lastTime = currentTime;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!gameStarted) {
    drawStartScreen();
    return;
  }

  if (!gameRunning) {
    drawGameOver();
    return;
  }

  tank.update(delta);
  tank.draw();

  tank.bullets = tank.bullets.filter((b) => b.active);
  tank.bullets.forEach((bullet) => {
    bullet.update(delta);
    bullet.draw();
  });

  enemies = enemies.filter((e) => e.alive);
  enemies.forEach((enemy) => {
    enemy.update(delta, tank.x, tank.y);
    enemy.draw();
  });

  checkCollisions();
  drawHUD();

  requestAnimationFrame(gameLoop);
}

function drawStartScreen() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'black';
  ctx.font = '36px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Tank Mini-Game', canvas.width / 2, canvas.height / 2 - 40);
  ctx.font = '24px Arial';
  ctx.fillText('Premi ENTER per iniziare', canvas.width / 2, canvas.height / 2);
}

function drawGameOver() {
  ctx.fillStyle = 'black';
  ctx.font = '48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 20);
  ctx.font = '24px Arial';
  ctx.fillText(`Punteggio: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
  ctx.fillText('Premi ENTER per ricominciare', canvas.width / 2, canvas.height / 2 + 60);
}

// Avvio con schermata iniziale
drawStartScreen();