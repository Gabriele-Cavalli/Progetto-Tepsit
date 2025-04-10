var canvas = document.getElementById('gameCanvas');
var ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
var keys = {};
window.addEventListener('keydown', function (e) {
    keys[e.code] = true;
    e.preventDefault();
});
window.addEventListener('keyup', function (e) {
    keys[e.code] = false;
    e.preventDefault();
});
var Tank = /** @class */ (function () {
    function Tank(x, y) {
        this.bullets = [];
        this.lastShotTime = 0;
        this.shotCooldown = 300;
        this.x = x;
        this.y = y;
        this.angle = 0;
        this.speed = 200; // pixels per second
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
        this.speed = 400; // pixels per second
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
        this.speed = 80; // pixels per second
        this.alive = true;
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
    }
    Enemy.prototype.update = function (delta, targetX, targetY) {
        var dx = targetX - this.x;
        var dy = targetY - this.y;
        var length = Math.sqrt(dx * dx + dy * dy);
        this.x += (dx / length) * this.speed * delta;
        this.y += (dy / length) * this.speed * delta;
    };
    Enemy.prototype.draw = function () {
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x - 10, this.y - 10, 20, 20);
    };
    return Enemy;
}());
var tank = new Tank(canvas.width / 2, canvas.height / 2);
var enemies = [];
function spawnEnemy() {
    if (enemies.length < 5) {
        enemies.push(new Enemy());
    }
    setTimeout(spawnEnemy, 2000);
}
spawnEnemy();
var lastTime = performance.now();
function gameLoop(currentTime) {
    var delta = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    tank.update(delta);
    tank.draw();
    tank.bullets.forEach(function (bullet, index) {
        bullet.update(delta);
        if (!bullet.active) {
            tank.bullets.splice(index, 1);
        }
        else {
            bullet.draw();
        }
    });
    enemies.forEach(function (enemy) {
        enemy.update(delta, tank.x, tank.y);
        enemy.draw();
    });
    requestAnimationFrame(gameLoop);
}
gameLoop(performance.now());
