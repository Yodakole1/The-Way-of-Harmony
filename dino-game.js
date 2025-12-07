const canvas = document.getElementById('dinoCanvas');
const ctx = canvas.getContext('2d');

// Get sprite containers
const dinoSprites = document.getElementById('dinoSprites');
const obstacleSprites = document.getElementById('obstacleSprites');

// Create dino sprite elements
const dinoTopSprite = document.createElement('div');
dinoTopSprite.className = 'dino dino-top';
dinoSprites.appendChild(dinoTopSprite);

const dinoBottomSprite = document.createElement('div');
dinoBottomSprite.className = 'dino dino-bottom';
dinoSprites.appendChild(dinoBottomSprite);

// Load background image
const backgroundImage = new Image();
backgroundImage.src = 'assets/dino/dino-background.jpg';
let backgroundX = 0; // For parallax scrolling
const backgroundSpeed = 0.5; // pixels per frame (slower)

// Load sound effects
const jumpSound = new Audio('assets/soundeffectovi/jump.wav');
jumpSound.volume = 0.3;
const deathSound = new Audio('assets/soundeffectovi/explosion-death-dino.wav');
deathSound.volume = 0.4;

// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const GROUND_Y_TOP = 150;
const GROUND_Y_BOTTOM = 350;
const DINO_WIDTH = 40;
const DINO_HEIGHT = 50;
const OBSTACLE_WIDTH = 30;
const OBSTACLE_HEIGHT_HIGH = 50;
const OBSTACLE_HEIGHT_LOW = 30;
const OBSTACLE_HEIGHT_FLYING = 45; // increased height to make jumping over harder
const FLYING_OBSTACLE_Y_OFFSET = 40; // lower to make jumping over harder
const GAME_SPEED_BASE = 3; // starting speed (slower)
const GAME_SPEED_INCREMENT = 0.3; // speed increase every 200 score
let gameSpeed = GAME_SPEED_BASE; // current game speed
const JUMP_VELOCITY = -12;
const GRAVITY = 0.6;
const CROUCH_REDUCTION = 20; // how much height is reduced when crouching

// Game state
let gameRunning = false;
let gameStarted = false;
let isPaused = false;
let score = 0;
let obstacleCount = 0;
let highScore = localStorage.getItem('dinoHighScore') || 0;
let currentMode = null; // 'harmony' or 'disharmony'
let previousMode = null; // track previous mode to detect changes
let modeTimer = 0;
let nextModeChange = 150; // frames until mode changes

// Top Dino (controlled by W/S)
let dinoTop = {
  x: 100,
  y: GROUND_Y_TOP - DINO_HEIGHT, // spawn on ground, not under it
  vy: 0,
  width: DINO_WIDTH,
  height: DINO_HEIGHT,
  isJumping: false,
  isCrouching: false,
  color: '#4caf50',
  groundY: GROUND_Y_TOP
};

// Bottom Dino (controlled by Arrow keys)
let dinoBottom = {
  x: 100,
  y: GROUND_Y_BOTTOM - DINO_HEIGHT, // spawn on ground, not under it
  vy: 0,
  width: DINO_WIDTH,
  height: DINO_HEIGHT,
  isJumping: false,
  isCrouching: false,
  color: '#2196F3',
  groundY: GROUND_Y_BOTTOM
};

// Obstacles
let obstaclesTop = [];
let obstaclesBottom = [];
let obstacleSpawnTimer = 0;
let obstacleSpawnRate = 100; // frames between obstacles

// Input handling
let keys = {};
document.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  
  if (e.key === ' ') {
    if (!gameStarted) {
      startGame();
    } else if (gameRunning) {
      isPaused = !isPaused;
    }
    e.preventDefault();
    return;
  }
  
  if (!gameRunning || isPaused) return;
  
  // Top dino controls (W/S)
  if (e.key === 'w' || e.key === 'W') {
    if (!dinoTop.isJumping && !dinoTop.isCrouching) {
      dinoTop.isJumping = true;
      dinoTop.vy = JUMP_VELOCITY;
      jumpSound.currentTime = 0;
      jumpSound.play().catch(err => {});
    }
  }
  if (e.key === 's' || e.key === 'S') {
    if (!dinoTop.isJumping) {
      dinoTop.isCrouching = true;
      dinoTop.height = DINO_HEIGHT - CROUCH_REDUCTION;
      dinoTop.y = dinoTop.groundY - dinoTop.height; // adjust y position when crouching
    }
  }
  
  // Bottom dino controls (Arrow keys)
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (!dinoBottom.isJumping && !dinoBottom.isCrouching) {
      dinoBottom.isJumping = true;
      dinoBottom.vy = JUMP_VELOCITY;
      jumpSound.currentTime = 0;
      jumpSound.play().catch(err => {});
    }
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (!dinoBottom.isJumping) {
      dinoBottom.isCrouching = true;
      dinoBottom.height = DINO_HEIGHT - CROUCH_REDUCTION;
      dinoBottom.y = dinoBottom.groundY - dinoBottom.height; // adjust y position when crouching
    }
  }
});

document.addEventListener('keyup', (e) => {
  keys[e.key] = false;
  
  // Release crouch
  if (e.key === 's' || e.key === 'S') {
    dinoTop.isCrouching = false;
    dinoTop.height = DINO_HEIGHT;
    dinoTop.y = dinoTop.groundY - DINO_HEIGHT; // restore normal position
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    dinoBottom.isCrouching = false;
    dinoBottom.height = DINO_HEIGHT;
    dinoBottom.y = dinoBottom.groundY - DINO_HEIGHT; // restore normal position
  }
});

function startGame() {
  gameStarted = true;
  gameRunning = true;
  isPaused = false;
  score = 0;
  obstacleCount = 0;
  
  // Clear existing obstacle sprites
  obstacleSprites.innerHTML = '';
  obstaclesTop = [];
  obstaclesBottom = [];
  obstacleSpawnTimer = 0;
  modeTimer = 0;
  gameSpeed = GAME_SPEED_BASE; // reset to base speed
  selectNewMode();
  
  dinoTop.y = GROUND_Y_TOP - DINO_HEIGHT; // spawn on ground
  dinoTop.vy = 0;
  dinoTop.isJumping = false;
  dinoTop.isCrouching = false;
  dinoTop.height = DINO_HEIGHT;
  
  dinoBottom.y = GROUND_Y_BOTTOM - DINO_HEIGHT; // spawn on ground
  dinoBottom.vy = 0;
  dinoBottom.isJumping = false;
  dinoBottom.isCrouching = false;
  dinoBottom.height = DINO_HEIGHT;
  
  document.getElementById('score').innerText = '0';
  document.getElementById('obstacleCount').innerText = '0';
  showNotification('GO! 🦖');
}

function selectNewMode() {
  // 50% chance for harmony, 50% for disharmony
  previousMode = currentMode;
  currentMode = Math.random() < 0.5 ? 'harmony' : 'disharmony';
  nextModeChange = modeTimer + Math.floor(Math.random() * 100) + 150; // 150-250 frames
  
  // Only show notification if mode actually changed
  if (previousMode !== currentMode) {
    const modeText = currentMode === 'harmony' ? '🟢 HARMONY' : '🔴 DISHARMONY';
    showNotification(modeText);
  }
  
  document.getElementById('currentMode').innerText = currentMode === 'harmony' ? 'Harmony' : 'Disharmony';
}

function spawnObstacle() {
  if (currentMode === 'harmony') {
    // Both get same obstacle type
    const rand = Math.random();
    const type = rand < 0.5 ? 'ground' : 'flying';
    
    if (type === 'flying') {
      // Random flying note type (1-4)
      const noteType = Math.floor(Math.random() * 4) + 1;
      const height = OBSTACLE_HEIGHT_FLYING;
      
      const topObstacle = {
        x: CANVAS_WIDTH,
        y: GROUND_Y_TOP - FLYING_OBSTACLE_Y_OFFSET - height,
        width: 50,
        height: 50,
        type: type,
        spriteType: noteType,
        element: document.createElement('div')
      };
      topObstacle.element.className = `obstacle obstacle-flying type${noteType}`;
      obstacleSprites.appendChild(topObstacle.element);
      obstaclesTop.push(topObstacle);
      
      const bottomObstacle = {
        x: CANVAS_WIDTH,
        y: GROUND_Y_BOTTOM - FLYING_OBSTACLE_Y_OFFSET - height,
        width: 50,
        height: 50,
        type: type,
        spriteType: noteType,
        element: document.createElement('div')
      };
      bottomObstacle.element.className = `obstacle obstacle-flying type${noteType}`;
      obstacleSprites.appendChild(bottomObstacle.element);
      obstaclesBottom.push(bottomObstacle);
    } else {
      // Random ground obstacle type (1-3 preskok variants)
      const groundType = Math.floor(Math.random() * 3) + 1;
      const height = OBSTACLE_HEIGHT_HIGH;
      
      const topObstacle = {
        x: CANVAS_WIDTH,
        y: GROUND_Y_TOP - height + 5,
        width: 40,
        height: 50,
        type: type,
        spriteType: groundType,
        element: document.createElement('div')
      };
      topObstacle.element.className = `obstacle obstacle-ground type${groundType}`;
      obstacleSprites.appendChild(topObstacle.element);
      obstaclesTop.push(topObstacle);
      
      const bottomObstacle = {
        x: CANVAS_WIDTH,
        y: GROUND_Y_BOTTOM - height + 5,
        width: 40,
        height: 50,
        type: type,
        spriteType: groundType,
        element: document.createElement('div')
      };
      bottomObstacle.element.className = `obstacle obstacle-ground type${groundType}`;
      obstacleSprites.appendChild(bottomObstacle.element);
      obstaclesBottom.push(bottomObstacle);
    }
  } else {
    // Disharmony: opposite obstacles
    const topRand = Math.random();
    const topType = topRand < 0.5 ? 'ground' : 'flying';
    
    // Choose opposite type for bottom
    const bottomType = topType === 'flying' ? 'ground' : 'flying';
    
    // Spawn top obstacle
    if (topType === 'flying') {
      const noteType = Math.floor(Math.random() * 4) + 1;
      const topObstacle = {
        x: CANVAS_WIDTH,
        y: GROUND_Y_TOP - FLYING_OBSTACLE_Y_OFFSET - OBSTACLE_HEIGHT_FLYING,
        width: 50,
        height: 50,
        type: topType,
        spriteType: noteType,
        element: document.createElement('div')
      };
      topObstacle.element.className = `obstacle obstacle-flying type${noteType}`;
      obstacleSprites.appendChild(topObstacle.element);
      obstaclesTop.push(topObstacle);
    } else {
      const groundType = Math.floor(Math.random() * 3) + 1;
      const topObstacle = {
        x: CANVAS_WIDTH,
        y: GROUND_Y_TOP - OBSTACLE_HEIGHT_HIGH + 5,
        width: 40,
        height: 50,
        type: topType,
        spriteType: groundType,
        element: document.createElement('div')
      };
      topObstacle.element.className = `obstacle obstacle-ground type${groundType}`;
      obstacleSprites.appendChild(topObstacle.element);
      obstaclesTop.push(topObstacle);
    }
    
    // Spawn bottom obstacle
    if (bottomType === 'flying') {
      const noteType = Math.floor(Math.random() * 4) + 1;
      const bottomObstacle = {
        x: CANVAS_WIDTH,
        y: GROUND_Y_BOTTOM - FLYING_OBSTACLE_Y_OFFSET - OBSTACLE_HEIGHT_FLYING,
        width: 50,
        height: 50,
        type: bottomType,
        spriteType: noteType,
        element: document.createElement('div')
      };
      bottomObstacle.element.className = `obstacle obstacle-flying type${noteType}`;
      obstacleSprites.appendChild(bottomObstacle.element);
      obstaclesBottom.push(bottomObstacle);
    } else {
      const groundType = Math.floor(Math.random() * 3) + 1;
      const bottomObstacle = {
        x: CANVAS_WIDTH,
        y: GROUND_Y_BOTTOM - OBSTACLE_HEIGHT_HIGH + 5,
        width: 40,
        height: 50,
        type: bottomType,
        spriteType: groundType,
        element: document.createElement('div')
      };
      bottomObstacle.element.className = `obstacle obstacle-ground type${groundType}`;
      obstacleSprites.appendChild(bottomObstacle.element);
      obstaclesBottom.push(bottomObstacle);
    }
  }
  
  obstacleCount++;
  document.getElementById('obstacleCount').innerText = obstacleCount;
}

function updateDino(dino, groundY) {
  if (dino.isJumping) {
    dino.vy += GRAVITY;
    dino.y += dino.vy;
    
    const landingY = groundY - dino.height; // land ON the ground
    if (dino.y >= landingY) {
      dino.y = landingY;
      dino.vy = 0;
      dino.isJumping = false;
    }
  }
}

function checkCollision(dino, obstacles) {
  
  const hitboxReduction = 6; // pixels reduced on side
  const dinoHitbox = {
    x: dino.x + hitboxReduction,
    y: dino.y + hitboxReduction,
    width: dino.width - hitboxReduction * 2,
    height: dino.height - hitboxReduction * 2
  };
  
  for (let obs of obstacles) {
    const obsHitbox = {
      x: obs.x + hitboxReduction,
      y: obs.y + hitboxReduction,
      width: obs.width - hitboxReduction * 2,
      height: obs.height - hitboxReduction * 2
    };
    
    if (dinoHitbox.x < obsHitbox.x + obsHitbox.width &&
        dinoHitbox.x + dinoHitbox.width > obsHitbox.x &&
        dinoHitbox.y < obsHitbox.y + obsHitbox.height &&
        dinoHitbox.y + dinoHitbox.height > obsHitbox.y) {
      return true;
    }
  }
  return false;
}

function gameOver() {
  gameRunning = false;
  
  deathSound.currentTime = 0;
  deathSound.play().catch(e => {});
  
  const displayScore = Math.floor(score / 20); // match the slower score calculation
  if (displayScore > highScore) {
    highScore = displayScore;
    localStorage.setItem('dinoHighScore', highScore);
    document.getElementById('highScore').innerText = highScore;
  }
  
  gameStarted = false;
  
  // Check if in tournament mode
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('tournament') === 'true') {
    const session = getCurrentSession();
    if (session) {
      // Save dino score
      updateSessionScore('dino', displayScore, 0);
      
      // Wait 2 seconds then advance to next game
      setTimeout(() => {
        const nextGame = advanceToNextGame();
        if (nextGame === 'snake') {
          window.location.href = 'versus-crazy.html?tournament=true';
        } else if (nextGame === 'complete') {
          window.location.href = 'index.html';
        }
      }, 2000);
    }
  }
}

function update() {
  if (!gameRunning || isPaused) return;
  
  // Update parallax background
  backgroundX -= backgroundSpeed * gameSpeed;
  if (backgroundX <= -CANVAS_WIDTH) {
    backgroundX = 0;
  }
  
  // Update mode timer
  modeTimer++;
  if (modeTimer >= nextModeChange) {
    selectNewMode();
  }
  
  // Update dinos
  updateDino(dinoTop, GROUND_Y_TOP);
  updateDino(dinoBottom, GROUND_Y_BOTTOM);
  
  // Spawn obstacles
  obstacleSpawnTimer++;
  if (obstacleSpawnTimer >= obstacleSpawnRate) {
    spawnObstacle();
    obstacleSpawnTimer = 0;
    // Gradually increase difficulty
    obstacleSpawnRate = Math.max(50, obstacleSpawnRate - 1);
  }
  
  // Update obstacles
  for (let i = obstaclesTop.length - 1; i >= 0; i--) {
    obstaclesTop[i].x -= gameSpeed;
    if (obstaclesTop[i].x + obstaclesTop[i].width < 0) {
      obstaclesTop[i].element.remove();
      obstaclesTop.splice(i, 1);
    }
  }
  
  for (let i = obstaclesBottom.length - 1; i >= 0; i--) {
    obstaclesBottom[i].x -= gameSpeed;
    if (obstaclesBottom[i].x + obstaclesBottom[i].width < 0) {
      obstaclesBottom[i].element.remove();
      obstaclesBottom.splice(i, 1);
    }
  }
  
  // Check collisions
  if (checkCollision(dinoTop, obstaclesTop) || checkCollision(dinoBottom, obstaclesBottom)) {
    gameOver();
    return;
  }
  
  // Update score and speed
  score++;
  const displayScore = Math.floor(score / 20); // slower score increment (was /10)
  document.getElementById('score').innerText = displayScore;
  
  // Increase speed every 200 points
  if (displayScore > 0 && displayScore % 200 === 0 && score % 20 === 0) {
    gameSpeed += GAME_SPEED_INCREMENT;
  }
}

function draw() {
  // Clear canvas
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  // Draw parallax background (seamless loop)
  if (backgroundImage.complete && backgroundImage.naturalWidth > 0) {
    // Draw first copy with 1px overlap to prevent gaps
    ctx.drawImage(backgroundImage, Math.floor(backgroundX), 0, CANVAS_WIDTH + 1, CANVAS_HEIGHT);
    // Draw second copy for seamless loop with 1px overlap
    ctx.drawImage(backgroundImage, Math.floor(backgroundX) + CANVAS_WIDTH, 0, CANVAS_WIDTH + 1, CANVAS_HEIGHT);
  } else {
    // Fallback gradient if image not loaded
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
  
  // Draw mode indicators
  if (gameRunning) {
    const modeColor = currentMode === 'harmony' ? '#4caf50' : '#F44336';
    ctx.fillStyle = modeColor;
    ctx.globalAlpha = 0.2;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.globalAlpha = 1;
    
    // Mode text on canvas
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = modeColor;
    ctx.textAlign = 'center';
    const modeText = currentMode === 'harmony' ? '🟢 HARMONY MODE' : '🔴 DISHARMONY MODE';
    ctx.fillText(modeText, CANVAS_WIDTH / 2, 30);
  }
  
  // Update dino sprite positions and animations
  if (gameRunning || gameStarted) {
    dinoTopSprite.style.left = dinoTop.x + 'px';
    dinoTopSprite.style.top = dinoTop.y + 'px';
    dinoTopSprite.className = 'dino dino-top';
    if (dinoTop.isCrouching) dinoTopSprite.classList.add('crouching');
    else if (dinoTop.isJumping) dinoTopSprite.classList.add('jumping');
    
    dinoBottomSprite.style.left = dinoBottom.x + 'px';
    dinoBottomSprite.style.top = dinoBottom.y + 'px';
    dinoBottomSprite.className = 'dino dino-bottom';
    if (dinoBottom.isCrouching) dinoBottomSprite.classList.add('crouching');
    else if (dinoBottom.isJumping) dinoBottomSprite.classList.add('jumping');
    
    dinoTopSprite.style.display = 'block';
    dinoBottomSprite.style.display = 'block';
    
    // Hide sprites when paused
    if (isPaused) {
      dinoTopSprite.style.display = 'none';
      dinoBottomSprite.style.display = 'none';
    }
  } else {
    dinoTopSprite.style.display = 'none';
    dinoBottomSprite.style.display = 'none';
  }
  
  // Update obstacle sprite positions
  obstaclesTop.forEach(obs => {
    obs.element.style.left = obs.x + 'px';
    obs.element.style.top = obs.y + 'px';
    // Hide obstacles when paused
    if (isPaused) {
      obs.element.style.display = 'none';
    } else {
      obs.element.style.display = 'block';
    }
  });
  
  obstaclesBottom.forEach(obs => {
    obs.element.style.left = obs.x + 'px';
    obs.element.style.top = obs.y + 'px';
    // Hide obstacles when paused
    if (isPaused) {
      obs.element.style.display = 'none';
    } else {
      obs.element.style.display = 'block';
    }
  });
  
  // Draw start message
  if (!gameStarted) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    const displayScore = Math.floor(score / 20); // match the slower score calculation
    
    if (displayScore > 0) {
      // Game over screen
      ctx.font = 'bold 50px Arial';
      ctx.fillStyle = '#ff6b6b';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);
      
      ctx.font = '28px Arial';
      ctx.fillStyle = 'white';
      ctx.fillText('YOU DIED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);
      
      ctx.font = '24px Arial';
      ctx.fillText(`Score: ${displayScore}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
      
      if (displayScore >= highScore) {
        ctx.fillStyle = '#ffd700';
        ctx.fillText('🎉 NEW HIGH SCORE! 🎉', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 65);
      }
      
      ctx.font = '20px Arial';
      ctx.fillStyle = '#aaa';
      ctx.fillText('Press SPACE to restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 100);
      
    } else {
      // Start screen
      ctx.font = 'bold 40px Arial';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.fillText('🎸 HARMONIC FLIGHT 🎸', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
      
      ctx.font = '24px Arial';
      ctx.fillText('Press SPACE to Start', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
      
      ctx.font = '16px Arial';
      ctx.fillText('Top: W (jump) / S (crouch)', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
      ctx.fillText('Bottom: ↑ (jump) / ↓ (crouch)', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 85);
    }
  }
  
  // Draw pause screen
  if (isPaused && gameRunning) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
    
    ctx.font = '24px Arial';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Press SPACE to continue', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
  }
}

function showNotification(message) {
  const notification = document.getElementById('notification');
  notification.innerText = message;
  notification.classList.remove('hidden');
  setTimeout(() => {
    notification.classList.add('hidden');
  }, 1000);
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// Initialize
document.getElementById('highScore').innerText = highScore;
gameLoop();
