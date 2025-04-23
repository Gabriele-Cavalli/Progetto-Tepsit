// script.ts
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
document.getElementById('playerNameInput').addEventListener('input', function (e) {
    var input = e.target;
    playerName = input.value.trim();
});
window.addEventListener('keydown', function (e) {
    // Non interferire con l’input se stai scrivendo nel campo del nome
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
var Tank = /** @class */ (function () {
    function Tank(x, y) {
        this.speed = 200;
        this.bullets = [];
        this.lastShotTime = 0;
        this.shotCooldown = 300;
        this.x = x;
        this.y = y;
        this.angle = 0;
    }
    Tank.prototype.draw = function () {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = 'blue';
        ctx.fillRect(-15, -10, 30, 20);
        ctx.fillStyle = 'black';
        ctx.fillRect(10, -3, 15, 6);
        ctx.restore();
    };
    Tank.prototype.update = function (delta) {
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
var lastTime = performance.now();
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
    ctx.textAlign = 'left';
    ctx.fillText("Punti: ".concat(score), 20, 30);
    ctx.fillText("Vita: ".concat(playerLives), 20, 60);
}
function checkCollisions() {
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
    enemies.forEach(function (enemy) {
        var dx = tank.x - enemy.x;
        var dy = tank.y - enemy.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 25 && enemy.alive) {
            playerLives -= 1;
            enemy.alive = false;
            if (playerLives <= 0) {
                gameRunning = false;
            }
        }
    });
}
function drawStartScreen() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Tank Mini-Game', canvas.width / 2, canvas.height / 2 - 40);
    ctx.font = '24px Arial';
    ctx.fillText('Inserisci il tuo nome e premi ENTER per iniziare', canvas.width / 2, canvas.height / 2);
}
function drawGameOver() {
    ctx.fillStyle = 'black';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = '24px Arial';
    ctx.fillText("Punteggio: ".concat(score), canvas.width / 2, canvas.height / 2 + 20);
    ctx.fillText('Premi ENTER per ricominciare', canvas.width / 2, canvas.height / 2 + 60);
    leaderboard.push({ name: playerName, score: score });
    leaderboard.sort(function (a, b) { return b.score - a.score; });
    leaderboard = leaderboard.slice(0, 5);
    localStorage.setItem("leaderboard", JSON.stringify(leaderboard));
    renderLeaderboard();
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
    checkCollisions();
    drawHUD();
    requestAnimationFrame(gameLoop);
}
drawStartScreen();
renderLeaderboard();
