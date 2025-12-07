const canvas = document.getElementById('boxingCanvas');
const ctx = canvas.getContext('2d');

// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;

// Load background image
const backgroundImage = new Image();
backgroundImage.src = 'assets/boks/boxpozadina.png';

// Load sound effects
const hitSound = new Audio('assets/soundeffectovi/hithurt.wav');
hitSound.volume = 0.3;
const deathSound = new Audio('assets/soundeffectovi/explosion-death-dino.wav');
deathSound.volume = 0.4;

// Get sprite elements
const player1Sprite = document.getElementById('player1Sprite');
const player2Sprite = document.getElementById('player2Sprite');
const monsterSprite = document.getElementById('monsterSprite');
const gameOverlay = document.getElementById('gameOverlay');

// Game state
let gameRunning = false;
let gameStarted = false;
let isPaused = false;
let score = 0;
let p1Health = 100;
let p2Health = 100;
let monsterHealth = 500;

// Current move requirements
let p1CurrentMove = null; // 'w', 'a', 's', 'd'
let p2CurrentMove = null; // 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'
let p1MovingArrow = null; // animation state for arrow
let p2MovingArrow = null; // animation state for arrow
let p1Hit = false;
let p2Hit = false;
let waitingForBothPlayers = false;

// Animation states
let p1State = 'idle'; // idle, attacking, injured
let p2State = 'idle';
let monsterState = 'idle'; // idle, injured, death
let p1AnimationType = 'idle'; // tracks which attack animation
let p2AnimationType = 'idle';
let animationTimer = 0;
let animationDuration = 30; // frames for attack animations

// Get selected skins
let currentSkins = {p1: 1, p2: 1};

// Helper function to set player sprite animation
function setPlayerAnimation(player, animation, immediate = false) {
  const skin = currentSkins[player === 1 ? 'p1' : 'p2'];
  const sprite = player === 1 ? player1Sprite : player2Sprite;
  
  // Remove all classes first
  sprite.className = '';
  
  // Force reflow
  void sprite.offsetWidth;
  
  // Apply new classes immediately
  sprite.className = `player player${player} skin${skin} ${animation}`;
  
  // Force another reflow to ensure animation restarts
  void sprite.offsetWidth;
  void sprite.offsetHeight;
}

// Helper function to set monster sprite animation
function setMonsterAnimation(animation, immediate = false) {
  // For hurt animation, force the background image to ensure it shows
  if (animation === 'hurt') {
    monsterSprite.style.backgroundImage = "url('./assets/boks/spritetree hurt.gif')";
    monsterSprite.className = 'monster hurt';
    void monsterSprite.offsetWidth;
    void monsterSprite.offsetHeight;
    return;
  }
  
  // Clear inline style for other animations
  monsterSprite.style.backgroundImage = '';
  monsterSprite.className = 'monster';
  void monsterSprite.offsetWidth;
  monsterSprite.className = `monster ${animation}`;
  void monsterSprite.offsetWidth;
  void monsterSprite.offsetHeight;
}

// Arrow movement (come from sides)
let arrowSpeed = 3; // start slower for better visibility
const ARROW_TARGET_Y = 50; // above player heads
const PLAYER1_X = 190; // Player 1 arrow target position
const PLAYER2_X = 610; // Player 2 arrow target position

// Timers
let moveTimer = 0;
let moveInterval = 200; // frames between new moves (increased from 150 for slower pace)

// Input handling
let keys = {};
document.addEventListener('keydown', (e) => {
  // Don't process any keys if setup menu is visible
  const setupMenu = document.getElementById('boxingSetup');
  if (setupMenu && !setupMenu.classList.contains('hidden')) {
    return;
  }
  
  // Prevent default behavior for arrow keys and space to stop page scrolling
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault();
  }
  
  if (e.key === ' ' && !gameStarted) {
    startGame();
    return;
  }
  
  // Handle SPACE for rematch when game is over
  if (e.key === ' ' && !gameRunning && gameStarted) {
    startGame();
    return;
  }
  
  // Handle SPACE for pause during gameplay
  if (e.key === ' ' && gameRunning) {
    isPaused = !isPaused;
    return;
  }
  
  if (!gameRunning || waitingForBothPlayers || isPaused) return;
  
  keys[e.key] = true;
  
  // Player 1 controls (WASD)
  if (!p1Hit && p1CurrentMove && (e.key === 'w' || e.key === 'W' || e.key === 'a' || e.key === 'A' || e.key === 's' || e.key === 'S' || e.key === 'd' || e.key === 'D')) {
    if (e.key === p1CurrentMove || e.key === p1CurrentMove.toUpperCase()) {
      p1Hit = true;
      p1State = 'attacking';
      // Set animation type based on key and store it - PLAY IMMEDIATELY
      if (e.key === 'w' || e.key === 'W') { 
        p1AnimationType = 'highkick'; 
        setPlayerAnimation(1, 'highkick', true); 
      }
      else if (e.key === 's' || e.key === 'S') { 
        p1AnimationType = 'lowkick'; 
        setPlayerAnimation(1, 'lowkick', true); 
      }
      else if (e.key === 'a' || e.key === 'A') { 
        p1AnimationType = 'leftPunch'; 
        setPlayerAnimation(1, 'leftPunch', true); 
      }
      else if (e.key === 'd' || e.key === 'D') { 
        p1AnimationType = 'rightPunch'; 
        setPlayerAnimation(1, 'rightPunch', true); 
      }
      
      // Return to idle after attack animation completes
      setTimeout(() => {
        if (p1State === 'attacking') {
          p1State = 'idle';
          p1AnimationType = 'idle';
          setPlayerAnimation(1, 'idle', true);
        }
      }, 1300);
      
      if (!(p1MovingArrow && p1MovingArrow.arrived)) {
        // Missed - first show monster attack, then player injury
        setTimeout(() => {
          // Monster attacks
          const attackType = Math.random() < 0.5 ? 'leftHit' : 'rightHit';
          setMonsterAnimation(attackType);
          
          setTimeout(() => {
            // Then player gets injured
            p1Health -= 20;
            p1State = 'injured';
            setPlayerAnimation(1, 'gotHit');
            setMonsterAnimation('idle');
            
            setTimeout(() => { 
              p1State = 'idle';
              setPlayerAnimation(1, 'idle');
            }, 650); // Injury animation duration
            updateUI();
          }, 650); // Monster attack lasts 650ms
        }, 400); // Brief delay before monster attacks
      }
    } else {
      // Wrong button pressed - monster attacks immediately, then player injury
      const attackType = Math.random() < 0.5 ? 'leftHit' : 'rightHit';
      setMonsterAnimation(attackType);
      
      setTimeout(() => {
        p1Health -= 20;
        p1State = 'injured';
        setPlayerAnimation(1, 'gotHit');
        setMonsterAnimation('idle');
        
        setTimeout(() => { 
          p1State = 'idle';
          setPlayerAnimation(1, 'idle');
        }, 650);
        updateUI();
      }, 650);
    }
    checkBothPlayers();
  }
  
  // Player 2 controls (Arrows)
  if (!p2Hit && p2CurrentMove && (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'ArrowRight')) {
    if (e.key === p2CurrentMove) {
      p2Hit = true;
      p2State = 'attacking';
      // Set animation type based on key and store it - PLAY IMMEDIATELY
      if (e.key === 'ArrowUp') { 
        p2AnimationType = 'highkick'; 
        setPlayerAnimation(2, 'highkick', true); 
      }
      else if (e.key === 'ArrowDown') { 
        p2AnimationType = 'lowkick'; 
        setPlayerAnimation(2, 'lowkick', true); 
      }
      else if (e.key === 'ArrowLeft') { 
        p2AnimationType = 'leftPunch'; 
        setPlayerAnimation(2, 'leftPunch', true); 
      }
      else if (e.key === 'ArrowRight') { 
        p2AnimationType = 'rightPunch'; 
        setPlayerAnimation(2, 'rightPunch', true); 
      }
      
      // Return to idle after attack animation completes
      setTimeout(() => {
        if (p2State === 'attacking') {
          p2State = 'idle';
          p2AnimationType = 'idle';
          setPlayerAnimation(2, 'idle', true);
        }
      }, 1300);
      
      if (!(p2MovingArrow && p2MovingArrow.arrived)) {
        // Missed - first show monster attack, then player injury
        setTimeout(() => {
          // Monster attacks
          const attackType = Math.random() < 0.5 ? 'leftHit' : 'rightHit';
          setMonsterAnimation(attackType);
          
          setTimeout(() => {
            // Then player gets injured
            p2Health -= 20;
            p2State = 'injured';
            setPlayerAnimation(2, 'gotHit');
            setMonsterAnimation('idle');
            
            setTimeout(() => { 
              p2State = 'idle';
              setPlayerAnimation(2, 'idle');
            }, 650);
            updateUI();
          }, 650);
        }, 400);
      }
    } else {
      // Wrong button pressed - monster attacks immediately, then player injury
      const attackType = Math.random() < 0.5 ? 'leftHit' : 'rightHit';
      setMonsterAnimation(attackType);
      
      setTimeout(() => {
        p2Health -= 20;
        p2State = 'injured';
        setPlayerAnimation(2, 'gotHit');
        setMonsterAnimation('idle');
        
        setTimeout(() => { 
          p2State = 'idle';
          setPlayerAnimation(2, 'idle');
        }, 650);
        updateUI();
      }, 650);
    }
    checkBothPlayers();
  }
});

function startGame() {
  gameStarted = true;
  gameRunning = true;
  isPaused = false;
  score = 0;
  p1Health = 100;
  p2Health = 100;
  monsterHealth = 500;
  moveTimer = 0;
  moveInterval = 200; // reset speed progression (slower starting pace)
  arrowSpeed = 3; // reset arrow speed (slower)
  p1Hit = false;
  p2Hit = false;
  waitingForBothPlayers = false;
  p1State = 'idle';
  p2State = 'idle';
  monsterState = 'idle';
  
  // Get selected skins from setup
  currentSkins = window.boxingSkins || {p1: 1, p2: 1};
  
  // Reset sprite animations with selected skins
  setPlayerAnimation(1, 'idle');
  setPlayerAnimation(2, 'idle');
  setMonsterAnimation('idle');
  
  updateUI();
  spawnNewMoves();
  showNotification('FIGHT! 🥊');
}

function spawnNewMoves() {
  // Generate random moves for both players
  const p1Moves = ['w', 'a', 's', 'd'];
  const p2Moves = ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];
  
  p1CurrentMove = p1Moves[Math.floor(Math.random() * p1Moves.length)];
  p2CurrentMove = p2Moves[Math.floor(Math.random() * p2Moves.length)];
  
  // Initialize arrow positions (off-screen, coming from sides)
  p1MovingArrow = {
    x: -50, // start from left off-screen
    y: ARROW_TARGET_Y,
    targetX: PLAYER1_X,
    move: p1CurrentMove,
    arrived: false
  };
  
  p2MovingArrow = {
    x: CANVAS_WIDTH + 50, // start from right off-screen
    y: ARROW_TARGET_Y,
    targetX: PLAYER2_X,
    move: p2CurrentMove,
    arrived: false
  };
  
  p1Hit = false;
  p2Hit = false;
  waitingForBothPlayers = false;
}

function checkBothPlayers() {
  if (p1Hit && p2Hit) {
    // Both hit their buttons!
    waitingForBothPlayers = true;
    monsterHealth -= 40; // 20 damage each
    score += 10; // bonus points for cooperation
    
    // Progressive difficulty - speed up over time
    moveInterval = Math.max(60, moveInterval - 5); // decrease time between moves (min 1 second)
    arrowSpeed = Math.min(15, arrowSpeed + 0.5); // increase arrow speed (max 15)
    
    console.log('Both players hit! P1:', p1AnimationType, 'P2:', p2AnimationType);
    
    // Animations are already playing from button press
    // After attack animations complete (650ms), show monster injury
    setTimeout(() => {
      hitSound.currentTime = 0;
      hitSound.play().catch(e => {});
      // Monster hurt animation
      monsterState = 'hurt';
      setMonsterAnimation('hurt', true);
      console.log('Monster animation: hurt');
      
      // Keep all animations visible, then reset after monster injury animation
      setTimeout(() => { 
        // Check if monster is dead before resetting
        if (monsterHealth <= 0) {
          // Monster is dead - play death animation
          monsterState = 'death';
          setMonsterAnimation('death', true);
          gameRunning = false;
          
          // Show end screen after death animation completes
          setTimeout(() => {
            // End screen will be shown by draw() function
            
            // Check if in tournament mode
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('tournament') === 'true') {
              if (typeof updateSessionScore !== 'undefined' && typeof completeSession !== 'undefined') {
                // Save boxing score
                updateSessionScore('boxing', score, 0);
                // Complete tournament and save to leaderboard
                completeSession();
                // Return to main menu and show leaderboard after delay
                setTimeout(() => {
                  window.location.href = 'index.html?showLeaderboard=true';
                }, 2000);
              }
            }
          }, 1000); // Wait for death animation
          return;
        }
        
        // Reset monster to idle
        monsterState = 'idle';
        setMonsterAnimation('idle', true);
        
        // Reset players to idle
        p1State = 'idle';
        p2State = 'idle';
        p1AnimationType = 'idle';
        p2AnimationType = 'idle';
        setPlayerAnimation(1, 'idle', true);
        setPlayerAnimation(2, 'idle', true);
        
        if (gameRunning) {
          spawnNewMoves();
          moveTimer = 0;
        }
      }, 650); // Monster injury animation duration
    }, 650); // Players attack animation duration
    
    updateUI();
    
    // Check if players died
    checkGameOver();
  }
}

function checkGameOver() {
  if (p1Health <= 0 || p2Health <= 0) {
    gameRunning = false;
    // Keep gameStarted = true so sprites stay visible
    deathSound.currentTime = 0;
    deathSound.play().catch(e => {});
    monsterState = 'laugh';
    setMonsterAnimation('laugh', true);
    
    // Check if in tournament mode
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tournament') === 'true') {
      if (typeof updateSessionScore !== 'undefined' && typeof completeSession !== 'undefined') {
        setTimeout(() => {
          // Save boxing score (current score even on loss)
          updateSessionScore('boxing', score, 0);
          // Complete tournament and save to leaderboard
          completeSession();
          // Return to main menu and show leaderboard after delay
          setTimeout(() => {
            window.location.href = 'index.html?showLeaderboard=true';
          }, 2000);
        }, 1000);
      }
    }
    return;
  }
  
  // Monster death is handled in checkBothPlayers for proper animation timing
}

function updateUI() {
  document.getElementById('p1Health').innerText = Math.max(0, p1Health);
  document.getElementById('p2Health').innerText = Math.max(0, p2Health);
  document.getElementById('monsterHealth').innerText = Math.max(0, monsterHealth);
  document.getElementById('score').innerText = score;
  
  // Color code health
  const p1El = document.getElementById('p1Health');
  const p2El = document.getElementById('p2Health');
  if (p1Health <= 20) p1El.style.color = '#f44336';
  else if (p1Health <= 50) p1El.style.color = '#ff9800';
  else p1El.style.color = '#4caf50';
  
  if (p2Health <= 20) p2El.style.color = '#f44336';
  else if (p2Health <= 50) p2El.style.color = '#ff9800';
  else p2El.style.color = '#4caf50';
}

function update() {
  if (!gameRunning || isPaused) return;
  
  moveTimer++;
  animationTimer++;
  
  // Move arrows from sides towards players
  if (p1MovingArrow) {
    p1MovingArrow.x += arrowSpeed;
    if (p1MovingArrow.x >= p1MovingArrow.targetX) {
      p1MovingArrow.x = p1MovingArrow.targetX;
      p1MovingArrow.arrived = true;
    }
    // Arrow can disappear off-screen if player too slow
    if (p1MovingArrow.x > CANVAS_WIDTH + 100) {
      p1MovingArrow = null;
    }
  }
  
  if (p2MovingArrow) {
    p2MovingArrow.x -= arrowSpeed;
    if (p2MovingArrow.x <= p2MovingArrow.targetX) {
      p2MovingArrow.x = p2MovingArrow.targetX;
      p2MovingArrow.arrived = true;
    }
    // Arrow can disappear off-screen if player too slow
    if (p2MovingArrow.x < -100) {
      p2MovingArrow = null;
    }
  }
  
  // Timeout if players take too long (miss)
  if (moveTimer >= moveInterval && !waitingForBothPlayers) {
    // Players took too long, they miss
    if (!p1Hit) {
      p1Health -= 10; // missing loses 10 HP
      p1State = 'injured';
      player1Sprite.classList.add('injured');
      setTimeout(() => { 
        p1State = 'idle';
        player1Sprite.classList.remove('injured');
      }, 500);
    }
    if (!p2Hit) {
      p2Health -= 10; // missing loses 10 HP
      p2State = 'injured';
      player2Sprite.classList.add('injured');
      setTimeout(() => { 
        p2State = 'idle';
        player2Sprite.classList.remove('injured');
      }, 500);
    }
    updateUI();
    checkGameOver();
    if (gameRunning) {
      spawnNewMoves();
      moveTimer = 0;
    }
  }
}

function draw() {
  // Clear canvas
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  // Draw background image
  if (backgroundImage.complete && backgroundImage.naturalWidth > 0) {
    ctx.drawImage(backgroundImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  } else {
    // Fallback gradient if image not loaded
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#2c1810');
    gradient.addColorStop(0.5, '#3d2314');
    gradient.addColorStop(1, '#1a0f0a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
  
  if (gameRunning) {
    // Characters are rendered via CSS sprites
    // Only draw arrows and UI on canvas
    
    // Draw moving arrows
    if (p1MovingArrow) {
      drawArrow(p1MovingArrow.x, p1MovingArrow.y, p1MovingArrow.move, 'player1');
    }
    if (p2MovingArrow) {
      drawArrow(p2MovingArrow.x, p2MovingArrow.y, p2MovingArrow.move, 'player2');
    }
    
    // Draw hit indicators
    if (p1Hit) {
      ctx.fillStyle = '#4caf50';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('✓', 140, ARROW_TARGET_Y + 60);
    }
    if (p2Hit) {
      ctx.fillStyle = '#4caf50';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('✓', 660, ARROW_TARGET_Y + 60);
    }
    
    // Draw monster health bar
    const barWidth = 150;
    const barHeight = 10;
    const barX = CANVAS_WIDTH / 2 - barWidth / 2;
    const barY = 20;
    
    // Background
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Health
    const healthPercent = Math.max(0, monsterHealth / 500);
    ctx.fillStyle = healthPercent > 0.5 ? '#4caf50' : (healthPercent > 0.25 ? '#FFA500' : '#F44336');
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
    
    // Border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
  }
  
  // Draw start screen
  if (!gameStarted && score === 0 && p1Health === 100 && p2Health === 100) {
    gameOverlay.style.background = 'rgba(0, 0, 0, 0.8)';
    gameOverlay.style.pointerEvents = 'none';
    gameOverlay.innerHTML = `
      <div style="text-align: center; color: white;">
        <div style="font-size: 40px; font-weight: bold; margin-bottom: 20px;">🥊 JUST FIGHT 🥊</div>
        <div style="font-size: 24px; margin-bottom: 20px;">Press SPACE to Start</div>
        <div style="font-size: 16px; color: #ccc;">Work together to defeat the monster!</div>
      </div>
    `;
  }
  
  // Game over screen - overlay on top of game
  else if (!gameRunning && gameStarted) {
    const isVictory = monsterHealth <= 0;
    gameOverlay.style.background = 'rgba(0, 0, 0, 0.9)';
    gameOverlay.style.pointerEvents = 'none';
    gameOverlay.innerHTML = `
      <div style="text-align: center; color: white; padding: 40px;">
        <div style="font-size: 60px; font-weight: bold; margin-bottom: 30px; color: ${isVictory ? '#4caf50' : '#f44336'};">
          ${isVictory ? '🎉 VICTORY! 🎉' : '💀 DEFEATED! 💀'}
        </div>
        <div style="font-size: 28px; margin-bottom: 25px; color: #fff;">
          ${isVictory ? 'Monster Defeated!' : 'Players Lost!'}
        </div>
        <div style="font-size: 32px; font-weight: bold; margin-bottom: 15px; color: #FFD700;">
          Final Score: ${score}
        </div>
        <div style="font-size: 20px; margin-bottom: 10px; color: #aaa;">
          Player 1 HP: ${Math.max(0, p1Health)}
        </div>
        <div style="font-size: 20px; margin-bottom: 10px; color: #aaa;">
          Player 2 HP: ${Math.max(0, p2Health)}
        </div>
        <div style="font-size: 20px; margin-bottom: 30px; color: #aaa;">
          Monster HP: ${Math.max(0, monsterHealth)}
        </div>
        <div style="font-size: 24px; color: #4caf50; font-weight: bold;">
          Press SPACE for Rematch
        </div>
      </div>
    `;
  }
  
  // Pause overlay
  else if (isPaused && gameRunning) {
    gameOverlay.style.background = 'rgba(0, 0, 0, 0.9)';
    gameOverlay.style.pointerEvents = 'none';
    gameOverlay.innerHTML = `
      <div style="text-align: center; color: white;">
        <div style="font-size: 48px; font-weight: bold; margin-bottom: 20px;">PAUSED</div>
        <div style="font-size: 24px;">Press SPACE to continue</div>
      </div>
    `;
    
    // Hide sprites when paused
    player1Sprite.style.display = 'none';
    player2Sprite.style.display = 'none';
    monsterSprite.style.display = 'none';
  }
  
  // Clear overlay during gameplay
  else {
    gameOverlay.style.background = 'transparent';
    gameOverlay.innerHTML = '';
    
    // Show sprites during gameplay
    if (gameRunning) {
      player1Sprite.style.display = 'block';
      player2Sprite.style.display = 'block';
      monsterSprite.style.display = 'block';
    }
  }
}

function drawArrow(x, y, move, player) {
  const arrowSize = 60;
  
  // Determine arrow direction and icon based on move
  let symbol = '';
  let color = player === 'player1' ? '#4caf50' : '#2196F3';
  
  if (move === 'w' || move === 'ArrowUp') {
    symbol = '↑';
  } else if (move === 's' || move === 'ArrowDown') {
    symbol = '↓';
  } else if (move === 'a' || move === 'ArrowLeft') {
    symbol = '←';
  } else if (move === 'd' || move === 'ArrowRight') {
    symbol = '→';
  }
  
  // Draw arrow glow
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(x, y, arrowSize / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1.0;
  
  // Draw white border
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.shadowBlur = 0;
  
  // Draw symbol with shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 5;
  ctx.fillStyle = 'white';
  ctx.font = `bold ${arrowSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(symbol, x, y);
  ctx.shadowBlur = 0;
  
  // Draw move label
  ctx.font = 'bold 14px Arial';
  ctx.fillStyle = 'white';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 3;
  let label = '';
  if (move === 'w' || move === 'ArrowUp') label = 'HIGH KICK';
  else if (move === 's' || move === 'ArrowDown') label = 'LOW KICK';
  else if (move === 'a' || move === 'ArrowLeft') label = 'LEFT PUNCH';
  else if (move === 'd' || move === 'ArrowRight') label = 'RIGHT PUNCH';
  
  ctx.fillText(label, x, y + arrowSize / 2 + 18);
  ctx.shadowBlur = 0;
}

function showNotification(message) {
  const notification = document.getElementById('notification');
  notification.innerText = message;
  notification.classList.remove('hidden');
  setTimeout(() => {
    notification.classList.add('hidden');
  }, 2000);
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// Initialize
gameLoop();
