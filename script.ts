const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

type Keys = { [key: string]: boolean };
const keys: Keys = {};

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
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
    this.speed = 200; // pixels per second
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
    if (keys['ArrowLeft']) {
      this.angle -= 2 * delta; // radians per second
    }
    if (keys['ArrowRight']) {
      this.angle += 2 * delta;
    }
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
  speed: number = 400; // pixels per second
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
  speed: number = 80; // pixels per second
  alive: boolean = true;

  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
  }

  update(delta: number, targetX: number, targetY: number) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    this.x += (dx / length) * this.speed * delta;
    this.y += (dy / length) * this.speed * delta;
  }

  draw() {
    ctx.fillStyle = 'green';
    ctx.fillRect(this.x - 10, this.y - 10, 20, 20);
  }
}

const tank = new Tank(canvas.width / 2, canvas.height / 2);
const enemies: Enemy[] = [];

function spawnEnemy() {
  if (enemies.length < 5) {
    enemies.push(new Enemy());
  }
  setTimeout(spawnEnemy, 2000);
}
spawnEnemy();

let lastTime = performance.now();
function gameLoop(currentTime: number) {
  const delta = (currentTime - lastTime) / 1000;
  lastTime = currentTime;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  tank.update(delta);
  tank.draw();

  tank.bullets.forEach((bullet, index) => {
    bullet.update(delta);
    if (!bullet.active) {
      tank.bullets.splice(index, 1);
    } else {
      bullet.draw();
    }
  });

  enemies.forEach(enemy => {
    enemy.update(delta, tank.x, tank.y);
    enemy.draw();
  });

  requestAnimationFrame(gameLoop);
}

gameLoop(performance.now());
