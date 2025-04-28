// =============================================
// INIZIALIZZAZIONE DEL CANVAS E CONTESTO GRAFICO
// =============================================
// Ottiene il riferimento all'elemento canvas e imposta il tipo come HTMLCanvasElement
var canvas = document.getElementById('gameCanvas');
// Ottiene il contesto di rendering 2D (il ! indica che siamo sicuri che esiste)
var ctx = canvas.getContext('2d');
// Imposta le dimensioni del canvas pari a quelle della finestra
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
// =============================================
// VARIABILI DI STATO DEL GIOCO
// =============================================
// Mappa per tenere traccia dei tasti premuti
var keys = {};
// Flag che indica se il gioco è in esecuzione
var gameRunning = false;
// Punteggio corrente del giocatore
var score = 0;
// Numero di vite rimanenti
var playerLives = 3;
// Flag che indica se il gioco è iniziato
var gameStarted = false;
// Nome del giocatore
var playerName = "";
// Carica la classifica dal localStorage o inizializza un array vuoto
var leaderboard = JSON.parse(localStorage.getItem("leaderboard") || "[]");
// =============================================
// SELEZIONE COLORE DEL TANK
// =============================================
// Array di colori disponibili
var colors = ['blue', 'red', 'yellow'];
// Indice del colore selezionato
var selectedColorIndex = 0;
// Colore corrente del tank
var tankColor = colors[selectedColorIndex];
// =============================================
// GESTIONE INPUT UTENTE
// =============================================
// Listener per l'input del nome giocatore
document.getElementById('playerNameInput').addEventListener('input', function (e) {
    var input = e.target;
    playerName = input.value.trim();
});
// Listener per i tasti premuti
window.addEventListener('keydown', function (e) {
    // Ignora l'input se è attivo un campo di testo
    var active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
        return;
    }
    // Registra il tasto premuto
    keys[e.code] = true;
    // Gestione tasto ENTER:
    // - Se il gioco non è iniziato, verifica il nome e avvia il gioco
    // - Se il gioco è finito, riavvia il gioco
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
// Listener per i tasti rilasciati
window.addEventListener('keyup', function (e) {
    keys[e.code] = false;
    e.preventDefault();
});
// =============================================
// GESTIONE SELEZIONE COLORE CON CLICK
// =============================================
canvas.addEventListener('click', function (e) {
    // Funziona solo nella schermata iniziale
    if (!gameStarted || !gameRunning) {
        var rect = canvas.getBoundingClientRect();
        // Calcola la posizione del mouse relativa al canvas
        var mouseX_1 = e.clientX - rect.left;
        var mouseY_1 = e.clientY - rect.top;
        // Dimensioni e posizionamento dei quadrati colorati
        var squareSize_1 = 40;
        var totalWidth = colors.length * squareSize_1 + (colors.length - 1) * 20;
        var startX_1 = canvas.width / 2 - totalWidth / 2;
        var startY_1 = canvas.height / 2 + 20;
        // Verifica quale quadrato è stato cliccato
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
        // Stato di attività
        this.active = true;
        // Durata del power-up (10 secondi)
        this.duration = 10000;
        // Dimensioni
        this.size = 20;
        // Posizione casuale nel canvas
        this.x = Math.random() * (canvas.width - 40) + 20;
        this.y = Math.random() * (canvas.height - 40) + 20;
        this.type = type;
        this.spawnTime = performance.now();
    }
    PowerUp.prototype.draw = function () {
        ctx.save();
        ctx.translate(this.x, this.y);
        // Disegna il power-up in base al tipo
        if (this.type === 'speed') {
            // Stella arancione per il power-up di velocità
            ctx.fillStyle = 'orange';
            drawStar(ctx, 0, 0, 5, this.size, this.size / 2);
        }
        else {
            // Scudo azzurro per il power-up di protezione
            ctx.fillStyle = 'cyan';
            drawShield(ctx, 0, 0, this.size);
        }
        ctx.restore();
    };
    PowerUp.prototype.update = function () {
        // Disattiva il power-up se è scaduto
        if (performance.now() - this.spawnTime > this.duration) {
            this.active = false;
        }
    };
    return PowerUp;
}());
// =============================================
// FUNZIONI DI DISEGNO UTILITY
// =============================================
// Disegna una stella
function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    var rot = Math.PI / 2 * 3;
    var x = cx;
    var y = cy;
    var step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    // Disegna i raggi della stella
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
// Disegna uno scudo
function drawShield(ctx, cx, cy, size) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - size / 2);
    // Usa curve quadratiche per la forma dello scudo
    ctx.quadraticCurveTo(cx + size / 2, cy, cx, cy + size / 2);
    ctx.quadraticCurveTo(cx - size / 2, cy, cx, cy - size / 2);
    ctx.closePath();
    ctx.fill();
}
// =============================================
// CLASSE DEL TANK (GIOCATORE)
// =============================================
var Tank = /** @class */ (function () {
    function Tank(x, y) {
        // Velocità base e corrente
        this.baseSpeed = 200;
        this.speed = 200;
        // Array dei proiettili sparati
        this.bullets = [];
        // Tempo dell'ultimo sparo
        this.lastShotTime = 0;
        // Tempo di attesa tra gli spari (in ms)
        this.shotCooldown = 300;
        // Flag per lo scudo attivo
        this.hasShield = false;
        // Tempo di fine effetto power-up
        this.powerUpEndTime = 0;
        this.x = x;
        this.y = y;
        this.angle = 0;
    }
    Tank.prototype.draw = function () {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        // Disegna lo scudo se attivo (cerchio semitrasparente)
        if (this.hasShield) {
            ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(0, 0, 30, 0, Math.PI * 2);
            ctx.fill();
        }
        // Disegna il corpo del tank (rettangolo)
        ctx.fillStyle = tankColor;
        ctx.fillRect(-15, -10, 30, 20);
        // Disegna la canna del cannone
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
        // Calcola la distanza da percorrere in base alla velocità
        var distance = this.speed * delta;
        // Movimento in base ai tasti premuti
        if (keys['ArrowUp']) {
            this.x += distance * Math.cos(this.angle);
            this.y += distance * Math.sin(this.angle);
        }
        if (keys['ArrowLeft'])
            this.angle -= 2 * delta;
        if (keys['ArrowRight'])
            this.angle += 2 * delta;
        // Sparo con la barra spaziatrice (con cooldown)
        if (keys['Space'] && performance.now() - this.lastShotTime > this.shotCooldown) {
            this.shoot();
            this.lastShotTime = performance.now();
        }
    };
    Tank.prototype.shoot = function () {
        // Limita a 5 proiettili contemporaneamente
        if (this.bullets.length < 5) {
            this.bullets.push(new Bullet(this.x, this.y, this.angle));
        }
    };
    Tank.prototype.applyPowerUp = function (type) {
        if (type === 'speed') {
            // Aumenta la velocità del 50% per 10 secondi
            this.speed = this.baseSpeed * 1.5;
            this.powerUpEndTime = performance.now() + 10000;
        }
        else if (type === 'shield') {
            // Attiva lo scudo per 10 secondi
            this.hasShield = true;
            this.powerUpEndTime = performance.now() + 10000;
        }
    };
    return Tank;
}());
// =============================================
// CLASSE DEI PROIETTILI
// =============================================
var Bullet = /** @class */ (function () {
    function Bullet(x, y, angle) {
        // Velocità costante
        this.speed = 400;
        // Stato di attività
        this.active = true;
        this.x = x;
        this.y = y;
        this.angle = angle;
    }
    Bullet.prototype.update = function (delta) {
        // Movimento in base all'angolo e alla velocità
        this.x += this.speed * delta * Math.cos(this.angle);
        this.y += this.speed * delta * Math.sin(this.angle);
        // Disattiva se esce dai bordi del canvas
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
            this.active = false;
        }
    };
    Bullet.prototype.draw = function () {
        // Disegna un cerchio rosso
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
        ctx.fill();
    };
    return Bullet;
}());
// =============================================
// CLASSE DEI NEMICI
// =============================================
var Enemy = /** @class */ (function () {
    function Enemy() {
        // Velocità costante
        this.speed = 80;
        // Stato di vita
        this.alive = true;
        // Posizione casuale nel canvas
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
    }
    Enemy.prototype.update = function (delta, targetX, targetY) {
        // Calcola la direzione verso il bersaglio (tank)
        var dx = targetX - this.x;
        var dy = targetY - this.y;
        var length = Math.sqrt(dx * dx + dy * dy);
        // Movimento verso il bersaglio
        if (length !== 0) {
            this.x += (dx / length) * this.speed * delta;
            this.y += (dy / length) * this.speed * delta;
        }
    };
    Enemy.prototype.draw = function () {
        // Disegna un quadrato verde
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x - 10, this.y - 10, 20, 20);
    };
    return Enemy;
}());
// =============================================
// INIZIALIZZAZIONE E VARIABILI GLOBALI DEL GIOCO
// =============================================
// Istanza del tank del giocatore
var tank = new Tank(canvas.width / 2, canvas.height / 2);
// Array dei nemici
var enemies = [];
// Array dei power-up
var powerUps = [];
// Tempo dell'ultimo frame
var lastTime = performance.now();
// Tempo dell'ultimo spawn di power-up
var lastPowerUpSpawnTime = 0;
// Intervallo tra gli spawn di power-up (15 secondi)
var powerUpSpawnInterval = 15000;
// =============================================
// FUNZIONI PRINCIPALI DEL GIOCO
// =============================================
// Avvia/resetta il gioco
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
// Genera un nuovo nemico
function spawnEnemy() {
    if (gameRunning && enemies.length < 5) {
        enemies.push(new Enemy());
    }
    if (gameRunning) {
        setTimeout(spawnEnemy, 2000); // Genera un nemico ogni 2 secondi
    }
}
// Genera un nuovo power-up
function spawnPowerUp() {
    if (gameRunning && powerUps.length < 2) {
        var types = ['speed', 'shield'];
        var randomType = types[Math.floor(Math.random() * types.length)];
        powerUps.push(new PowerUp(randomType));
    }
    if (gameRunning) {
        setTimeout(spawnPowerUp, powerUpSpawnInterval); // Genera power-up ogni 15 secondi
    }
}
// Disegna l'HUD (testo e indicatori)
function drawHUD() {
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText("Punti: ".concat(score), 20, 30);
    // Disegna le vite come cuori
    for (var i = 0; i < playerLives; i++) {
        drawHeart(ctx, 20 + (i * 30), 60, 2.5);
    }
    // Disegna indicatori dei power-up attivi
    if (tank.speed > tank.baseSpeed) {
        drawStar(ctx, 20, 100, 5, 10, 5);
    }
    if (tank.hasShield) {
        drawShield(ctx, 50, 100, 20);
    }
}
// Disegna un cuore (per le vite)
function drawHeart(ctx, x, y, size) {
    ctx.save();
    ctx.beginPath();
    ctx.translate(x, y);
    ctx.scale(size, size);
    ctx.moveTo(0, 0);
    // Usa curve di Bezier per la forma del cuore
    ctx.bezierCurveTo(0, -3, -5, -3, -5, 0);
    ctx.bezierCurveTo(-5, 3, 0, 5, 0, 7);
    ctx.bezierCurveTo(0, 5, 5, 3, 5, 0);
    ctx.bezierCurveTo(5, -3, 0, -3, 0, 0);
    ctx.closePath();
    ctx.fillStyle = "red";
    ctx.fill();
    ctx.restore();
}
// Controlla tutte le collisioni
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
                score += 10; // Aumenta il punteggio
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
                // Lo scudo protegge da un colpo
                tank.hasShield = false;
            }
            else {
                // Altrimenti perde una vita
                playerLives -= 1;
            }
            enemy.alive = false;
            // Game over se finiscono le vite
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
// Disegna la schermata iniziale
function drawStartScreen() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Tank Mini-Game', canvas.width / 2, canvas.height / 2 - 80);
    ctx.font = '24px Arial';
    ctx.fillText('Inserisci il tuo nome e premi ENTER per iniziare', canvas.width / 2, canvas.height / 2 - 40);
    // Disegna i quadrati per la selezione del colore
    var squareSize = 40;
    var totalWidth = colors.length * squareSize + (colors.length - 1) * 20;
    var startX = canvas.width / 2 - totalWidth / 2;
    colors.forEach(function (color, index) {
        var x = startX + index * (squareSize + 20);
        var y = canvas.height / 2 + 20;
        // Evidenzia il colore selezionato
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
// Disegna la schermata di game over
function drawGameOver() {
    ctx.fillStyle = 'black';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = '24px Arial';
    ctx.fillText("Punteggio: ".concat(score), canvas.width / 2, canvas.height / 2 + 20);
    ctx.fillText('Premi ENTER per ricominciare', canvas.width / 2, canvas.height / 2 + 60);
    // Aggiungi il punteggio alla classifica se è valido
    if (score > 0) {
        leaderboard.push({ name: playerName, score: score });
        // Ordina la classifica in ordine decrescente
        leaderboard.sort(function (a, b) { return b.score - a.score; });
        // Mantieni solo i primi 5 punteggi
        leaderboard = leaderboard.slice(0, 5);
        // Salva nel localStorage
        localStorage.setItem("leaderboard", JSON.stringify(leaderboard));
        renderLeaderboard();
    }
    drawStartScreen();
}
// Aggiorna la visualizzazione della classifica
function renderLeaderboard() {
    var board = document.getElementById('leaderboard');
    var html = "<strong>Classifica</strong><br>";
    leaderboard.forEach(function (entry) {
        html += "".concat(entry.name, ": ").concat(entry.score, "<br>");
    });
    board.innerHTML = html;
}
// Loop principale del gioco
function gameLoop(currentTime) {
    // Calcola il tempo trascorso dall'ultimo frame
    var delta = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    // Pulisci il canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Schermata iniziale
    if (!gameStarted) {
        drawStartScreen();
        return;
    }
    // Schermata di game over
    if (!gameRunning) {
        drawGameOver();
        return;
    }
    // Aggiorna e disegna il tank
    tank.update(delta);
    tank.draw();
    // Filtra e aggiorna i proiettili attivi
    tank.bullets = tank.bullets.filter(function (b) { return b.active; });
    tank.bullets.forEach(function (bullet) {
        bullet.update(delta);
        bullet.draw();
    });
    // Filtra e aggiorna i nemici vivi
    enemies = enemies.filter(function (e) { return e.alive; });
    enemies.forEach(function (enemy) {
        enemy.update(delta, tank.x, tank.y);
        enemy.draw();
    });
    // Filtra e aggiorna i power-up attivi
    powerUps = powerUps.filter(function (p) { return p.active; });
    powerUps.forEach(function (powerUp) {
        powerUp.update();
        powerUp.draw();
    });
    // Genera power-up periodicamente
    if (currentTime - lastPowerUpSpawnTime > powerUpSpawnInterval) {
        spawnPowerUp();
        lastPowerUpSpawnTime = currentTime;
    }
    // Controlla le collisioni e disegna l'HUD
    checkCollisions();
    drawHUD();
    // Richiama il prossimo frame
    requestAnimationFrame(gameLoop);
}
// =============================================
// AVVIO DEL GIOCO
// =============================================
// Mostra la schermata iniziale e la classifica
drawStartScreen();
renderLeaderboard();
