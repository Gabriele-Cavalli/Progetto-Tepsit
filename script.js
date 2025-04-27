var canvas = document.getElementById('gameCanvas');
var ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
var keys = {};
var gameRunning = false;
var score = 0;
var playerLives = 3;
var gameStarted = false;
var playerName = "";
var leaderboard = JSON.parse(localStorage.getItem("leaderboard") || "[]");
// Aggiunte per la selezione del colore
var colors = ['blue', 'red', 'yellow'];
var selectedColorIndex = 0;
var tankColor = colors[selectedColorIndex];
document.getElementById('playerNameInput').addEventListener('input', function (e) {
    var input = e.target;
    playerName = input.value.trim();
});
window.addEventListener('keydown', function (e) {
    var active = document.activeElement;
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
    }
    else if (!gameRunning && e.code === 'Enter') {
        startGame();
    }
    e.preventDefault();
});
window.addEventListener('keyup', function (e) {
    keys[e.code] = false;
    e.preventDefault();
});
// Gestione del click per selezione colore
canvas.addEventListener('click', function (e) {
    if (!gameStarted || !gameRunning) {
        var rect = canvas.getBoundingClientRect();
        var mouseX_1 = e.clientX - rect.left;
        var mouseY_1 = e.clientY - rect.top;
        var squareSize_1 = 40;
        var totalWidth = colors.length * squareSize_1 + (colors.length - 1) * 20;
        var startX_1 = canvas.width / 2 - totalWidth / 2;
        var startY_1 = canvas.height / 2 + 20;
        colors.forEach(function (_, index) {
            var x = startX_1 + index * (squareSize_1 + 20);
            var y = startY_1;
            if (mouseX_1 >= x && mouseX_1 <= x + squareSize_1 &&
                mouseY_1 >= y && mouseY_1 <= y + squareSize_1) {
                selectedColorIndex = index;
                tankColor = colors[selectedColorIndex];
                drawStartScreen();
            }
        });
    }
});
var PowerUp = /** @class */ (function () {
    function PowerUp(type) {
        this.active = true;
        this.duration = 10000; // 10 secondi
        this.size = 20;
        this.x = Math.random() * (canvas.width - 40) + 20;
        this.y = Math.random() * (canvas.height - 40) + 20;
        this.type = type;
        this.spawnTime = performance.now();
    }
    PowerUp.prototype.draw = function () {
        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.type === 'speed') {
            // Disegna stella arancione
            ctx.fillStyle = 'orange';
            drawStar(ctx, 0, 0, 5, this.size, this.size / 2);
        }
        else {
            // Disegna scudo azzurro
            ctx.fillStyle = 'cyan';
            drawShield(ctx, 0, 0, this.size);
        }
        ctx.restore();
    };
    PowerUp.prototype.update = function () {
        // Il power-up scompare dopo un certo tempo
        if (performance.now() - this.spawnTime > this.duration) {
            this.active = false;
        }
    };
    return PowerUp;
}());
// Funzione per disegnare una stella
function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    var rot = Math.PI / 2 * 3;
    var x = cx;
    var y = cy;
    var step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (var i = 0; i < spikes; i++) {
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
function drawShield(ctx, cx, cy, size) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - size / 2);
    ctx.quadraticCurveTo(cx + size / 2, cy, cx, cy + size / 2);
    ctx.quadraticCurveTo(cx - size / 2, cy, cx, cy - size / 2);
    ctx.closePath();
    ctx.fill();
}
var Tank = /** @class */ (function () {
    function Tank(x, y) {
        this.baseSpeed = 200;
        this.speed = 200;
        this.bullets = [];
        this.lastShotTime = 0;
        this.shotCooldown = 300;
        this.hasShield = false;
        this.powerUpEndTime = 0;
        this.x = x;
        this.y = y;
        this.angle = 0;
    }
    Tank.prototype.draw = function () {
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
    };
    Tank.prototype.update = function (delta) {
        // Controlla se i power-up sono scaduti
        if (this.powerUpEndTime > 0 && performance.now() > this.powerUpEndTime) {
            this.speed = this.baseSpeed;
            this.hasShield = false;
            this.powerUpEndTime = 0;
        }
        var distance = this.speed * delta;
        if (keys['ArrowUp']) {
            this.x += distance * Math.cos(this.angle);
            this.y += distance * Math.sin(this.angle);
        }
        if (keys['ArrowLeft'])
            this.angle -= 2 * delta;
        if (keys['ArrowRight'])
            this.angle += 2 * delta;
        if (keys['Space'] && performance.now() - this.lastShotTime > this.shotCooldown) {
            this.shoot();
            this.lastShotTime = performance.now();
        }
    };
    Tank.prototype.shoot = function () {
        if (this.bullets.length < 5) {
            this.bullets.push(new Bullet(this.x, this.y, this.angle));
        }
    };
    Tank.prototype.applyPowerUp = function (type) {
        if (type === 'speed') {
            this.speed = this.baseSpeed * 1.5; // Aumenta la velocità del 50%
            this.powerUpEndTime = performance.now() + 10000; // 10 secondi
        }
        else if (type === 'shield') {
            this.hasShield = true;
            this.powerUpEndTime = performance.now() + 10000; // 10 secondi
        }
    };
    return Tank;
}());
var Bullet = /** @class */ (function () {
    function Bullet(x, y, angle) {
        this.speed = 400;
        this.active = true;
        this.x = x;
        this.y = y;
        this.angle = angle;
    }
    Bullet.prototype.update = function (delta) {
        this.x += this.speed * delta * Math.cos(this.angle);
        this.y += this.speed * delta * Math.sin(this.angle);
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
            this.active = false;
        }
    };
    Bullet.prototype.draw = function () {
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
        ctx.fill();
    };
    return Bullet;
}());
var Enemy = /** @class */ (function () {
    function Enemy() {
        this.speed = 80;
        this.alive = true;
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
    }
    Enemy.prototype.update = function (delta, targetX, targetY) {
        var dx = targetX - this.x;
        var dy = targetY - this.y;
        var length = Math.sqrt(dx * dx + dy * dy);
        if (length !== 0) {
            this.x += (dx / length) * this.speed * delta;
            this.y += (dy / length) * this.speed * delta;
        }
    };
    Enemy.prototype.draw = function () {
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x - 10, this.y - 10, 20, 20);
    };
    return Enemy;
}());
var tank = new Tank(canvas.width / 2, canvas.height / 2);
var enemies = [];
var powerUps = [];
var lastTime = performance.now();
var lastPowerUpSpawnTime = 0;
var powerUpSpawnInterval = 15000; // 15 secondi
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
        var types = ['speed', 'shield'];
        var randomType = types[Math.floor(Math.random() * types.length)];
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
    ctx.fillText("Punti: ".concat(score), 20, 30);
    // Disegna vite
    for (var i = 0; i < playerLives; i++) {
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
function drawHeart(ctx, x, y, size) {
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
    tank.bullets.forEach(function (bullet) {
        enemies.forEach(function (enemy) {
            var dx = bullet.x - enemy.x;
            var dy = bullet.y - enemy.y;
            var distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 15 && enemy.alive && bullet.active) {
                bullet.active = false;
                enemy.alive = false;
                score += 10;
            }
        });
    });
    // Collisione tank-nemici
    enemies.forEach(function (enemy) {
        var dx = tank.x - enemy.x;
        var dy = tank.y - enemy.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 25 && enemy.alive) {
            if (tank.hasShield) {
                tank.hasShield = false;
            }
            else {
                playerLives -= 1;
            }
            enemy.alive = false;
            if (playerLives <= 0) {
                gameRunning = false;
            }
        }
    });
    // Collisione tank-power-up
    powerUps.forEach(function (powerUp, index) {
        var dx = tank.x - powerUp.x;
        var dy = tank.y - powerUp.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
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
    var squareSize = 40;
    var totalWidth = colors.length * squareSize + (colors.length - 1) * 20;
    var startX = canvas.width / 2 - totalWidth / 2;
    colors.forEach(function (color, index) {
        var x = startX + index * (squareSize + 20);
        var y = canvas.height / 2 + 20;
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
    ctx.fillText("Punteggio: ".concat(score), canvas.width / 2, canvas.height / 2 + 20);
    ctx.fillText('Premi ENTER per ricominciare', canvas.width / 2, canvas.height / 2 + 60);
    if (score > 0) {
        leaderboard.push({ name: playerName, score: score });
        leaderboard.sort(function (a, b) { return b.score - a.score; });
        leaderboard = leaderboard.slice(0, 5);
        localStorage.setItem("leaderboard", JSON.stringify(leaderboard));
        renderLeaderboard();
    }
    drawStartScreen();
}
function renderLeaderboard() {
    var board = document.getElementById('leaderboard');
    var html = "<strong>Classifica</strong><br>";
    leaderboard.forEach(function (entry) {
        html += "".concat(entry.name, ": ").concat(entry.score, "<br>");
    });
    board.innerHTML = html;
}
function gameLoop(currentTime) {
    var delta = (currentTime - lastTime) / 1000;
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
    tank.bullets = tank.bullets.filter(function (b) { return b.active; });
    tank.bullets.forEach(function (bullet) {
        bullet.update(delta);
        bullet.draw();
    });
    enemies = enemies.filter(function (e) { return e.alive; });
    enemies.forEach(function (enemy) {
        enemy.update(delta, tank.x, tank.y);
        enemy.draw();
    });
    powerUps = powerUps.filter(function (p) { return p.active; });
    powerUps.forEach(function (powerUp) {
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
