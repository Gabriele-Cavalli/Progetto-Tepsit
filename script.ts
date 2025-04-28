//Dichiarazione constate per il canvas
const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
//inizializazione di variabili e flag
let keys: { [key: string]: boolean } = {};
let gameRunning = false;
let score = 0;
let playerLives = 3;
let gameStarted = false;
let playerName = "";
//creazione del tipo entry della clasifica
interface ScoreEntry {
  name: string;
  score: number;
}
//prende da local storage le leaderboard
let leaderboard: ScoreEntry[] = JSON.parse(localStorage.getItem("leaderboard") || "[]");

// Aggiunte per la selezione del colore
const colors = ['blue', 'red', 'yellow'];
let selectedColorIndex = 0;
let tankColor = colors[selectedColorIndex];
//prende il nome contneuto nel cmapo testo
(document.getElementById('playerNameInput') as HTMLInputElement).addEventListener('input', (e) => {
  const input = e.target as HTMLInputElement;
  playerName = input.value.trim();
});
//event listener per rilevare se si sta premendo un tatso
window.addEventListener('keydown', (e) => {
  const active = document.activeElement;
  if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
    return;
  }

  keys[e.code] = true;
  //controlla se si è premuto enter e si è inserito il nome e che il gioco no sia partito e chen on stia
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
  angle: number; //angolo rotazione
  baseSpeed: number = 200;
  speed: number = 200;
  bullets: Bullet[] = []; //array proiettili
  lastShotTime: number = 0; 
  shotCooldown: number = 300; //intervallo tra spari
  hasShield: boolean = false; //indicazione scudo
  powerUpEndTime: number = 0;

  constructor(x: number, y: number) {//creazione di un carro armato
    this.x = x;
    this.y = y;
    this.angle = 0;
  }

  draw() {
    ctx.save();//salvataggio stato attuale
    ctx.translate(this.x, this.y);//traslazione 
    ctx.rotate(this.angle);
    
    // Disegna scudo se attivo
    if (this.hasShield) {
      ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';//colore blu
      ctx.beginPath();//nuovo percorso
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.fill();//colora interno
    }
    
    ctx.fillStyle = tankColor;
    ctx.fillRect(-15, -10, 30, 20);//disegna corpo carro (rettangolo)
    ctx.fillStyle = 'black';
    ctx.fillRect(10, -3, 15, 6);//disegna canna cannone
    ctx.restore();
  }
  //aggiornamento stato
  update(delta: number) {//tempo trascorso dall'ultimo frame
    // Controlla se i power-up sono scaduti
    if (this.powerUpEndTime > 0 && performance.now() > this.powerUpEndTime) {
      this.speed = this.baseSpeed;//rispristino velocità
      this.hasShield = false;//disattiva scudo
      this.powerUpEndTime = 0;
    }
    
    const distance = this.speed * delta;//calcolo distanza con velocità e tempo trascorso
    //gestione dei tasti
    if (keys['ArrowUp']) {//se premo freccia in su 
      this.x += distance * Math.cos(this.angle);
      this.y += distance * Math.sin(this.angle);
    }
    if (keys['ArrowLeft']) this.angle -= 2 * delta;//freccia sinistra
    if (keys['ArrowRight']) this.angle += 2 * delta;//freccia destra
    if (keys['Space'] && performance.now() - this.lastShotTime > this.shotCooldown) {//spaziatrice
      this.shoot();//spara se passano millisecondi da ultimo sparo
      this.lastShotTime = performance.now();
    }
  }
//sparo
  shoot() {
    if (this.bullets.length < 5) {//se ci sono 5 colpi
      this.bullets.push(new Bullet(this.x, this.y, this.angle));//crea bullet da queste posizioni
    }
  }
//attivazione dei power-up
  applyPowerUp(type: PowerUpType) {
    if (type === 'speed') {
      this.speed = this.baseSpeed * 1.5; // Aumenta la velocità del 50%
      this.powerUpEndTime = performance.now() + 10000; // 10 secondi
    } else if (type === 'shield') {
      this.hasShield = true;//attiva scudo
      this.powerUpEndTime = performance.now() + 10000; // 10 secondi
    }
  }
}
//proiettile
class Bullet {
  x: number;//pos x
  y: number;//pos y 
  angle: number;//angolo movimento proiettile
  speed: number = 400;//velocità
  active: boolean = true;//stato

  constructor(x: number, y: number, angle: number) {//creazione proiettile
    this.x = x;
    this.y = y;
    this.angle = angle;
  }
//aggiornamento della posizione
  update(delta: number) {//si considera velocità, tempo trascorso e direzione
    this.x += this.speed * delta * Math.cos(this.angle);
    this.y += this.speed * delta * Math.sin(this.angle);
    if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {//se proiettile esce fuori dallo schermo
      this.active = false;//disattivato
    }
  }

  draw() {
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);//cerchio di raggio 5
    ctx.fill();//riempie di rosso
  }
}
//nemici
class Enemy {
  x: number;
  y: number;
  speed: number = 80;//vel
  alive: boolean = true;//stato

  constructor() {//creazione con posizioni casuali
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
  }
//aggiorna movimento
  update(delta: number, targetX: number, targetY: number) {//distanza tra nemico e un bersaglio
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const length = Math.sqrt(dx * dx + dy * dy);//calcola distanza
    if (length !== 0) {
      this.x += (dx / length) * this.speed * delta;//moltiplica per velocità e tempo trascorso
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
