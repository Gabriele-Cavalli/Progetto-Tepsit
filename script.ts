const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
//let 1
let keys: { [key: string]: boolean } = {};
let gameRunning = false;
let score = 0;
let playerLives = 3;
let gameStarted = false;
let playerName = "";

interface ScoreEntry {
  name: string;
  score: number;
}

let leaderboard: ScoreEntry[] = JSON.parse(localStorage.getItem("leaderboard") || "[]");

// Aggiunte per la selezione del colore
const colors = ['blue', 'red', 'yellow'];
let selectedColorIndex = 0;
let tankColor = colors[selectedColorIndex];

(document.getElementById('playerNameInput') as HTMLInputElement).addEventListener('input', (e) => {
  const input = e.target as HTMLInputElement;
  playerName = input.value.trim();
});

window.addEventListener('keydown', (e) => {
  const active = document.activeElement;
  if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
    return;
  }

  keys[e.code] = true;

  if (!gameStarted && e.code === 'Enter') {
    if (!playerName) {
      alert("Inserisci il tuo nome prima di iniziare!");
      return;
    }
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

// Gestione del click per selezione colore
canvas.addEventListener('click', (e) => {
  if (!gameStarted || !gameRunning) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const squareSize = 40;
    const totalWidth = colors.length * squareSize + (colors.length - 1) * 20;
    const startX = canvas.width / 2 - totalWidth / 2;
    const startY = canvas.height / 2 + 20;
    
    colors.forEach((_, index) => {
      const x = startX + index * (squareSize + 20);
      const y = startY;
      
      if (mouseX >= x && mouseX <= x + squareSize && 
          mouseY >= y && mouseY <= y + squareSize) {
        selectedColorIndex = index;
        tankColor = colors[selectedColorIndex];
        drawStartScreen();
      }
    });
  }
});

// Tipi di power-up
type PowerUpType = 'speed' | 'shield';

class PowerUp {
  x: number;
  y: number;
  type: PowerUpType;
  active: boolean = true;
  spawnTime: number;
  duration: number = 10000; // 10 secondi
  size: number = 20;

  constructor(type: PowerUpType) {
    this.x = Math.random() * (canvas.width - 40) + 20;
    this.y = Math.random() * (canvas.height - 40) + 20;
    this.type = type;
    this.spawnTime = performance.now();
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    if (this.type === 'speed') {
      // Disegna stella arancione
      ctx.fillStyle = 'orange';
      drawStar(ctx, 0, 0, 5, this.size, this.size/2);
    } else {
      // Disegna scudo azzurro
      ctx.fillStyle = 'cyan';
      drawShield(ctx, 0, 0, this.size);
    }
    
    ctx.restore();
  }

  update() {
    // Il power-up scompare dopo un certo tempo
    if (performance.now() - this.spawnTime > this.duration) {
      this.active = false;
    }
  }
}

// Funzione per disegnare una stella
function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
  let rot = Math.PI / 2 * 3;
  let x = cx;
  let y = cy;
  let step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
}

// Funzione per disegnare uno scudo
function drawShield(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - size/2);
  ctx.quadraticCurveTo(cx + size/2, cy, cx, cy + size/2);
  ctx.quadraticCurveTo(cx - size/2, cy, cx, cy - size/2);
  ctx.closePath();
  ctx.fill();
}

class Tank {
  x: number;
  y: number;
  angle: number;
  baseSpeed: number = 200;
  speed: number = 200;
  bullets: Bullet[] = [];
  lastShotTime: number = 0;
  shotCooldown: number = 300;
  hasShield: boolean = false;
  powerUpEndTime: number = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.angle = 0;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    
    // Disegna scudo se attivo
    if (this.hasShield) {
      ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.fillStyle = tankColor;
    ctx.fillRect(-15, -10, 30, 20);
    ctx.fillStyle = 'black';
    ctx.fillRect(10, -3, 15, 6);
    ctx.restore();
  }

  update(delta: number) {
    // Controlla se i power-up sono scaduti
    if (this.powerUpEndTime > 0 && performance.now() > this.powerUpEndTime) {
      this.speed = this.baseSpeed;
      this.hasShield = false;
      this.powerUpEndTime = 0;
    }
    
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

  applyPowerUp(type: PowerUpType) {
    if (type === 'speed') {
      this.speed = this.baseSpeed * 1.5; // Aumenta la velocità del 50%
      this.powerUpEndTime = performance.now() + 10000; // 10 secondi
    } else if (type === 'shield') {
      this.hasShield = true;
      this.powerUpEndTime = performance.now() + 10000; // 10 secondi
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
let powerUps: PowerUp[] = [];
let lastTime = performance.now();
let lastPowerUpSpawnTime = 0;
const powerUpSpawnInterval = 15000; // 15 secondi

function startGame() {
  tank = new Tank(canvas.width / 2, canvas.height / 2);
  enemies = [];
  powerUps = [];
  score = 0;
  playerLives = 3;
  gameRunning = true;
  spawnEnemy();
  lastPowerUpSpawnTime = performance.now();
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

function spawnPowerUp() {
  if (gameRunning && powerUps.length < 2) {
    const types: PowerUpType[] = ['speed', 'shield'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    powerUps.push(new PowerUp(randomType));
  }
  if (gameRunning) {
    setTimeout(spawnPowerUp, powerUpSpawnInterval);
  }
}

function drawHUD() {
  ctx.fillStyle = 'black';
  ctx.font = '20px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`Punti: ${score}`, 20, 30);
  
  // Disegna vite
  for(let i = 0; i < playerLives; i++) {
    drawHeart(ctx, 20 + (i * 30), 60, 2.5);
  }
  
  // Disegna indicatori power-up
  if (tank.speed > tank.baseSpeed) {
    drawStar(ctx, 20, 100, 5, 10, 5);
  }
  if (tank.hasShield) {
    drawShield(ctx, 50, 100, 20);
  }
}

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  ctx.beginPath();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(0, -3, -5, -3, -5, 0);
  ctx.bezierCurveTo(-5, 3, 0, 5, 0, 7);
  ctx.bezierCurveTo(0, 5, 5, 3, 5, 0);
  ctx.bezierCurveTo(5, -3, 0, -3, 0, 0);
  ctx.closePath();
  ctx.fillStyle = "red";
  ctx.fill();
  ctx.restore();
}

function checkCollisions() {
  // Collisione proiettili-nemici
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

  // Collisione tank-nemici
  enemies.forEach((enemy) => {
    const dx = tank.x - enemy.x;
    const dy = tank.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 25 && enemy.alive) {
      if (tank.hasShield) {
        tank.hasShield = false;
      } else {
        playerLives -= 1;
      }
      enemy.alive = false;
      if (playerLives <= 0) {
        gameRunning = false;
      }
    }
  });

  // Collisione tank-power-up
  powerUps.forEach((powerUp, index) => {
    const dx = tank.x - powerUp.x;
    const dy = tank.y - powerUp.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 25 && powerUp.active) {
      tank.applyPowerUp(powerUp.type);
      powerUp.active = false;
    }
  });
}

function drawStartScreen() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'black';
  ctx.font = '36px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Tank Mini-Game', canvas.width / 2, canvas.height / 2 - 80);
  ctx.font = '24px Arial';
  ctx.fillText('Inserisci il tuo nome e premi ENTER per iniziare', canvas.width / 2, canvas.height / 2 - 40);
  
  // Disegna i quadrati colorati
  const squareSize = 40;
  const totalWidth = colors.length * squareSize + (colors.length - 1) * 20;
  const startX = canvas.width / 2 - totalWidth / 2;
  
  colors.forEach((color, index) => {
    const x = startX + index * (squareSize + 20);
    const y = canvas.height / 2 + 20;
    
    // Disegna il bordo se selezionato
    if (index === selectedColorIndex) {
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 5, y - 5, squareSize + 10, squareSize + 10);
    }
    
    // Disegna il quadrato colorato
    ctx.fillStyle = color;
    ctx.fillRect(x, y, squareSize, squareSize);
  });
}

function drawGameOver() {
  ctx.fillStyle = 'black';
  ctx.font = '48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 20);
  ctx.font = '24px Arial';
  ctx.fillText(`Punteggio: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
  ctx.fillText('Premi ENTER per ricominciare', canvas.width / 2, canvas.height / 2 + 60);
  
  if (score > 0) {
    leaderboard.push({ name: playerName, score });
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 5);
    localStorage.setItem("leaderboard", JSON.stringify(leaderboard));
    renderLeaderboard();
  }
  
  drawStartScreen();
}

function renderLeaderboard() {
  const board = document.getElementById('leaderboard')!;
  let html = "<strong>Classifica</strong><br>";
  leaderboard.forEach(entry => {
    html += `${entry.name}: ${entry.score}<br>`;
  });
  board.innerHTML = html;
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

  tank.bullets = tank.bullets.filter(b => b.active);
  tank.bullets.forEach((bullet) => {
    bullet.update(delta);
    bullet.draw();
  });

  enemies = enemies.filter(e => e.alive);
  enemies.forEach((enemy) => {
    enemy.update(delta, tank.x, tank.y);
    enemy.draw();
  });

  powerUps = powerUps.filter(p => p.active);
  powerUps.forEach((powerUp) => {
    powerUp.update();
    powerUp.draw();
  });

  // Spawna power-up periodicamente
  if (currentTime - lastPowerUpSpawnTime > powerUpSpawnInterval) {
    spawnPowerUp();
    lastPowerUpSpawnTime = currentTime;
  }

  checkCollisions();
  drawHUD();
  requestAnimationFrame(gameLoop);
}

drawStartScreen();
renderLeaderboard();
