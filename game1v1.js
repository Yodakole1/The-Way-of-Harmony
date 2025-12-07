// 1v1 modes implementation: two tables and crazy mode
// Uses existing styles; leaderboard shared via localStorage

// Crazy mode only version of snake game
(function(){
  const blockSize = 40;
  const colorMap = {
    'green': {head:'#4caf50', body:'#388e3c', prefix: 'zelena'},
    'blue': {head:'#2196F3', body:'#1976D2', prefix: 'plava'},
    'red': {head:'#F44336', body:'#D32F2F', prefix: 'crvena'},
    'yellow': {head:'#FFEB3B', body:'#FBC02D', prefix: 'zuta'}
  };
  let isPaused = false;
  // Food and snake assets
  const assets = {
    jabuka: 'assets/zmijice/jabuka.gif',
    banana: 'assets/zmijice/banana.gif',
    kruska: 'assets/zmijice/kruska.gif'
  };
  // Sound effects
  const powerupSound = new Audio('assets/soundeffectovi/powerup.wav');
  powerupSound.volume = 0.3;
  const deathSound = new Audio('assets/soundeffectovi/explosion-death-dino.wav');
  deathSound.volume = 0.4;
  const foodImages = {};
  const snakeImages = {};

  function preloadImages(){
    // Load food images
    ['jabuka','banana','kruska'].forEach(k=>{
      const img = new Image(); img.src = assets[k]; foodImages[k]=img;
    });
    // Load snake images for all colors (use single corner asset)
    ['crvena', 'plava', 'zelena', 'zuta'].forEach(prefix => {
      snakeImages[prefix] = {
        head: new Image(),
        body: new Image(),
        turnRight: new Image()
      };
      snakeImages[prefix].head.src = `assets/zmijice/${prefix}zmijaglava.gif`;
      snakeImages[prefix].body.src = `assets/zmijice/${prefix}zmijatelo.png`;
      snakeImages[prefix].turnRight.src = `assets/zmijice/${prefix}zmijaG.png`;
    });
  }
  preloadImages();

  // Crazy mode (one table, two snakes and inter-collision)
  window.startCrazyVersus = function(cfg){
    if(window._crazyHandler){ document.removeEventListener('keydown', window._crazyHandler); }
    let gameStarted = false;
    const canvas = document.getElementById('crazyCanvas');
    const ctx = canvas.getContext('2d');
    const canvasSize = canvas.width;
    const gridSize = canvasSize / blockSize;
    let s1 = [{x:3,y:3, visualX:3, visualY:3}, {x:2,y:3, visualX:2, visualY:3}, {x:1,y:3, visualX:1, visualY:3}], d1={x:1,y:0}, score1=0; // head at x:3, facing right
    let s2 = [{x:9,y:9, visualX:9, visualY:9}, {x:10,y:9, visualX:10, visualY:9}, {x:11,y:9, visualX:11, visualY:9}], d2={x:-1,y:0}, score2=0; // head at x:9, facing left
    let grow1=0, grow2=0; // growth counters
    let food={};
    let baseSpeed=250; // base speed for both snakes
    let boostedSpeed=150; // speed when boost is active
    let lastMove1 = 0, lastMove2 = 0; // track last move time for each snake
    let justAte1 = false, justAte2 = false; // per-tick eat debounce
    let mainAnimationId=null; let alive1=true; let alive2=true;
    let speedBoost1 = false, speedBoost2 = false; // individual speed boost tracking
    let speedBoostEnd1 = 0, speedBoostEnd2 = 0; // timestamp when boost ends
    let gameStartedMovement = false; // track if game movement should start
    const c1Color = cfg?.p1?.color || 'green';
    const c2Color = cfg?.p2?.color || 'blue';
    const c1 = colorMap[c1Color];
    const c2 = colorMap[c2Color];
    
    const spriteContainer = document.getElementById('snakeSprites');
    const interpolationSpeed = 0.35; // Smooth interpolation (0-1, higher = faster)

    const foods = {
      normal: {effect: {score:1}, color:'#2196F3', img:'jabuka'},
      speed: {effect: {speed:1.2, duration:4000}, color:'#F44336', img:'kruska'},
      length: {effect: {score:2}, color:'#FFC107', img:'banana'}
    };
    
    // Lerp helper function for smooth interpolation
    function lerp(start, end, t) {
      return start * (1 - t) + end * t;
    }
    
    // Update visual positions towards logical positions
    function updateVisualPositions() {
      s1.forEach(seg => {
        seg.visualX = lerp(seg.visualX, seg.x, interpolationSpeed);
        seg.visualY = lerp(seg.visualY, seg.y, interpolationSpeed);
      });
      // Update s2 visual positions
      s2.forEach(seg => {
        seg.visualX = lerp(seg.visualX, seg.x, interpolationSpeed);
        seg.visualY = lerp(seg.visualY, seg.y, interpolationSpeed);
      });
    }

    function spawnFood(){
      let fx,fy,valid=false;
      while(!valid){
        fx=Math.floor(Math.random()*gridSize);
        fy=Math.floor(Math.random()*gridSize);
        const occ = [...s1,...s2].some(seg=>seg.x===fx&&seg.y===fy);
        const notSame = !food.x || (fx!==food.x || fy!==food.y);
        valid = !occ && notSame;
      }
      const r=Math.random();
      const type = r<0.5?'normal':(r<0.75?'length':'speed');
      food={x:fx,y:fy,type, color:foods[type].color, img:foods[type].img};
    }

    function draw(){
      // Clear canvas and draw checkerboard grid
      ctx.clearRect(0,0,canvasSize,canvasSize);
      
      // Draw alternating colored grid squares
      for(let row = 0; row < gridSize; row++){
        for(let col = 0; col < gridSize; col++){
          ctx.fillStyle = (row + col) % 2 === 0 ? '#5a0560' : '#7d0f8c';
          ctx.fillRect(col * blockSize, row * blockSize, blockSize, blockSize);
        }
      }
      
      // Update visual positions with interpolation
      updateVisualPositions();
      
      // We now render head/body/corners/food on canvas; no DOM sprites
      // spriteContainer.innerHTML = '';

      // Helper to draw a rotated sprite on canvas
      function drawRot(image, gx, gy, deg){
        const x = gx*blockSize, y = gy*blockSize;
        ctx.save();
        ctx.translate(x + blockSize/2, y + blockSize/2);
        ctx.rotate(deg * Math.PI/180);
        ctx.drawImage(image, -blockSize/2, -blockSize/2, blockSize, blockSize);
        ctx.restore();
      }
      
      // Helper function to render snake with CSS sprites using visual positions
      const renderSnake = (snake, direction, color) => {
        snake.forEach((seg,idx)=>{
          if(idx === 0){
            // Head on canvas (GIF may not animate on canvas; using static image)
            const imgs = snakeImages[colorMap[color].prefix];
            if(imgs && imgs.head.complete && imgs.head.naturalWidth > 0){
              let deg = 0;
              if(direction.x === 1) deg = 90;
              else if(direction.x === -1) deg = 270;
              else if(direction.y === 1) deg = 180;
              drawRot(imgs.head, seg.visualX, seg.visualY, deg);
            } else {
              ctx.fillStyle = colorMap[color].head;
              ctx.fillRect(seg.visualX*blockSize, seg.visualY*blockSize, blockSize, blockSize);
            }
          } else {
            // Body and corners: draw on canvas (JS), keep head/food as CSS only
            const prev = snake[idx - 1];
            const next = snake[idx + 1];
            const prefix = colorMap[color].prefix;
            const imgs = snakeImages[prefix];

            if(next) {
              const dirToPrev = {x: prev.x - seg.x, y: prev.y - seg.y};
              const dirToNext = {x: next.x - seg.x, y: next.y - seg.y};
              const isTurn = (dirToPrev.x !== dirToNext.x) && (dirToPrev.y !== dirToNext.y);
              if(isTurn && imgs && imgs.turnRight.complete) {
                // Map corner rotation in degrees using single G asset
                let deg = 0;
                if(dirToPrev.y === 1 && dirToNext.x === 1) {
                  // DOWN -> RIGHT
                  deg = 360;
                } else if(dirToPrev.x === 1 && dirToNext.y === -1) {
                  // RIGHT -> UP
                  deg = 270;
                } else if(dirToPrev.y === -1 && dirToNext.x === -1) {
                  // UP -> LEFT
                  deg = 180;
                } else if(dirToPrev.x === -1 && dirToNext.y === 1) {
                  // LEFT -> DOWN
                  deg = 90;
                } else if(dirToPrev.y === -1 && dirToNext.x === 1) {
                  // UP -> RIGHT
                  deg = 270;
                } else if(dirToPrev.x === -1 && dirToNext.y === -1) {
                  // LEFT -> UP
                  deg = 180;
                } else if(dirToPrev.y === 1 && dirToNext.x === -1) {
                  // DOWN -> LEFT
                  deg = 90;
                } else if(dirToPrev.x === 1 && dirToNext.y === 1) {
                  // RIGHT -> DOWN
                  deg = 0;
                }
                const rad = deg * Math.PI / 180;
                ctx.save();
                ctx.translate(seg.visualX*blockSize + blockSize/2, seg.visualY*blockSize + blockSize/2);
                ctx.rotate(rad);
                ctx.drawImage(imgs.turnRight, -blockSize/2, -blockSize/2, blockSize, blockSize);
                ctx.restore();
              } else {
                // Straight body segment
                if(imgs && imgs.body.complete && imgs.body.naturalWidth > 0) {
                  const bodyDeg = (prev.x > seg.x) ? 90 : (prev.x < seg.x ? 270 : (prev.y > seg.y ? 0 : 180));
                  const bodyRad = bodyDeg * Math.PI / 180;
                  ctx.save();
                  ctx.translate(seg.visualX*blockSize + blockSize/2, seg.visualY*blockSize + blockSize/2);
                  ctx.rotate(bodyRad);
                  ctx.drawImage(imgs.body, -blockSize/2, -blockSize/2, blockSize, blockSize);
                  ctx.restore();
                } else {
                  // Fallback rectangle
                  ctx.fillStyle = colorMap[color].body;
                  ctx.fillRect(seg.visualX*blockSize, seg.visualY*blockSize, blockSize, blockSize);
                }
              }
            } else {
              // Tail as straight relative to prev
              if(imgs && imgs.body.complete && imgs.body.naturalWidth > 0) {
                const bodyDeg = (prev.x > seg.x) ? 90 : (prev.x < seg.x ? 270 : (prev.y > seg.y ? 0 : 180));
                const bodyRad = bodyDeg * Math.PI / 180;
                ctx.save();
                ctx.translate(seg.visualX*blockSize + blockSize/2, seg.visualY*blockSize + blockSize/2);
                ctx.rotate(bodyRad);
                ctx.drawImage(imgs.body, -blockSize/2, -blockSize/2, blockSize, blockSize);
                ctx.restore();
              } else {
                ctx.fillStyle = colorMap[color].body;
                ctx.fillRect(seg.visualX*blockSize, seg.visualY*blockSize, blockSize, blockSize);
              }
            }
            // Body drawn on canvas; no DOM sprite appended
            return;
          }
          
          // No DOM sprites used
        });
      };
      
      // Render both snakes
      renderSnake(s1, d1, c1Color);
      renderSnake(s2, d2, c2Color);
      
      // Render food on canvas
      if(food.img && foodImages[food.img]){
        ctx.drawImage(foodImages[food.img], food.x*blockSize, food.y*blockSize, blockSize, blockSize);
      } else {
        ctx.fillStyle = food.color || '#fff';
        ctx.fillRect(food.x*blockSize, food.y*blockSize, blockSize, blockSize);
      }
    }

    function collideWalls(h){ return h.x<0 || h.x>=gridSize || h.y<0 || h.y>=gridSize; }
    function collideSelf(sn,h){ return sn.some(seg=>seg.x===h.x && seg.y===h.y); }
    function collideOther(other,h){ return other.some(seg=>seg.x===h.x && seg.y===h.y); }
    
    // Update speed boost UI indicators
    function updateSpeedBoostUI() {
      const now = Date.now();
      
      // Player 1 cooldown (left side of arena)
      let p1Display = document.getElementById('p1SpeedBoost');
      if(!p1Display) {
        p1Display = document.createElement('div');
        p1Display.id = 'p1SpeedBoost';
        p1Display.style.cssText = 'position: absolute; left: -120px; top: 50%; transform: translateY(-50%); padding: 15px; background: rgba(76, 175, 80, 0.9); border-radius: 10px; color: white; font-size: 20px; font-weight: bold; min-width: 100px; text-align: center; display: none;';
        document.querySelector('.snake-canvas-wrapper').appendChild(p1Display);
      }
      
      if(speedBoost1) {
        const remaining = Math.ceil((speedBoostEnd1 - now) / 1000);
        p1Display.innerHTML = `⚡<br>${remaining}s`;
        p1Display.style.display = 'block';
      } else {
        p1Display.style.display = 'none';
      }
      
      // Player 2 cooldown (right side of arena)
      let p2Display = document.getElementById('p2SpeedBoost');
      if(!p2Display) {
        p2Display = document.createElement('div');
        p2Display.id = 'p2SpeedBoost';
        p2Display.style.cssText = 'position: absolute; right: -120px; top: 50%; transform: translateY(-50%); padding: 15px; background: rgba(33, 150, 243, 0.9); border-radius: 10px; color: white; font-size: 20px; font-weight: bold; min-width: 100px; text-align: center; display: none;';
        document.querySelector('.snake-canvas-wrapper').appendChild(p2Display);
      }
      
      if(speedBoost2) {
        const remaining = Math.ceil((speedBoostEnd2 - now) / 1000);
        p2Display.innerHTML = `⚡<br>${remaining}s`;
        p2Display.style.display = 'block';
      } else {
        p2Display.style.display = 'none';
      }
    }

    function loop(){
      if(!alive1 && !alive2){ return; }
      if(isPaused){ return; }
      // Don't move until space is pressed to start
      if(!gameStartedMovement) { return; }
      
      const now = Date.now();
      
      // Check and update speed boosts
      if(speedBoost1 && now >= speedBoostEnd1) {
        speedBoost1 = false;
        updateSpeedBoostUI();
      }
      if(speedBoost2 && now >= speedBoostEnd2) {
        speedBoost2 = false;
        updateSpeedBoostUI();
      }
      
      // Reset eat debounce at start of tick
      justAte1 = false; justAte2 = false;

      // Move snake 1 if enough time has passed
      const speed1 = speedBoost1 ? boostedSpeed : baseSpeed;
      if(alive1 && (d1.x || d1.y) && now - lastMove1 >= speed1) {
        lastMove1 = now;
        const h1={x:s1[0].x+d1.x,y:s1[0].y+d1.y};
        
        if(collideWalls(h1)||collideSelf(s1,h1)||collideOther(s2,h1)){ 
          alive1=false;
          deathSound.currentTime = 0;
          deathSound.play().catch(e => {}); 
        } else {
          h1.visualX = s1[0].visualX;
          h1.visualY = s1[0].visualY;
          s1.unshift(h1);
          
          // Check food (debounced per tick)
          if(!justAte1 && h1.x===food.x && h1.y===food.y){ 
            powerupSound.currentTime = 0;
            powerupSound.play().catch(e => {});
            if(food.type==='normal') { // jabuka: +1 size
              score1 += 1;
              grow1 = 1; // skip next 1 tail removal = +1 net segment
            } else if(food.type==='length') { // banana: +2 size
              score1 += 2;
              grow1 = 2; // skip next 2 tail removals = +2 net segments
            } else if(food.type==='speed') { // kruska: speed only
              // no score, no growth - still remove tail normally
              speedBoost1 = true;
              speedBoostEnd1 = Date.now() + 3000;
              updateSpeedBoostUI();
            }
            justAte1 = true;
            spawnFood();
          }
          
          // Handle growth and tail removal
          if(grow1 > 0) {
            grow1--; // skip tail removal this move
          } else {
            s1.pop(); // normal movement - remove tail
          }
        }
        
        document.getElementById('cP1Score').innerText = score1;
      }
      
      // Move snake 2 if enough time has passed
      const speed2 = speedBoost2 ? boostedSpeed : baseSpeed;
      if(alive2 && (d2.x || d2.y) && now - lastMove2 >= speed2) {
        lastMove2 = now;
        const h2={x:s2[0].x+d2.x,y:s2[0].y+d2.y};
        
        if(collideWalls(h2)||collideSelf(s2,h2)||collideOther(s1,h2)){ 
          alive2=false;
          deathSound.currentTime = 0;
          deathSound.play().catch(e => {}); 
        } else {
          h2.visualX = s2[0].visualX;
          h2.visualY = s2[0].visualY;
          s2.unshift(h2);
          
          // Check food (debounced per tick)
          if(!justAte2 && h2.x===food.x && h2.y===food.y){ 
            powerupSound.currentTime = 0;
            powerupSound.play().catch(e => {});
            if(food.type==='normal') { // jabuka: +1 size
              score2 += 1;
              grow2 = 1; // skip next 1 tail removal = +1 net segment
            } else if(food.type==='length') { // banana: +2 size
              score2 += 2;
              grow2 = 2; // skip next 2 tail removals = +2 net segments
            } else if(food.type==='speed') { // kruska: speed only
              // no score, no growth - still remove tail normally
              speedBoost2 = true;
              speedBoostEnd2 = Date.now() + 3000;
              updateSpeedBoostUI();
            }
            justAte2 = true;
            spawnFood();
          }
          
          // Handle growth and tail removal
          if(grow2 > 0) {
            grow2--; // skip tail removal this move
          } else {
            s2.pop(); // normal movement - remove tail
          }
        }
        
        document.getElementById('cP2Score').innerText = score2;
      }
      if(!alive1 || !alive2){
        clearInterval(loopInterval);
        let winnerName, winnerId;
        if(!alive1 && !alive2) {
          winnerName = 'Nerešeno';
          winnerId = null;
        } else if(alive1) {
          winnerName = cfg?.p1?.name || 'Player1';
          winnerId = 'p1';
        } else {
          winnerName = cfg?.p2?.name || 'Player2';
          winnerId = 'p2';
        }
        
        // Check if in tournament mode
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('tournament') === 'true' && typeof getCurrentSession !== 'undefined') {
          const session = getCurrentSession();
          if (session) {
            // Show winner notification
            const note = document.getElementById('notification');
            note.innerText = `🏆 ${winnerName} wins! Advancing to Boxing...`;
            note.style.fontSize = '1.2rem';
            note.classList.remove('hidden');
            
            // Save snake score - only winner's food count
            let winnerScore = 0;
            if (alive1 && !alive2) {
              winnerScore = score1; // Player 1 won
            } else if (alive2 && !alive1) {
              winnerScore = score2; // Player 2 won
            } else {
              winnerScore = Math.max(score1, score2); // Draw - use highest score
            }
            updateSessionScore('snake', winnerScore, 0);
            
            // Wait 2 seconds then advance to boxing game
            setTimeout(() => {
              const nextGame = advanceToNextGame();
              if (nextGame === 'boxing') {
                window.location.href = 'boxing-game.html?tournament=true';
              } else if (nextGame === 'complete') {
                window.location.href = 'index.html?showLeaderboard=true';
              }
            }, 2000);
            return;
          }
        }
        
        const note = document.getElementById('notification');
        note.innerText = `🏆 ${winnerName} wins! Press SPACE to rematch`;
        note.style.fontSize = '1.2rem';
        note.classList.remove('hidden');
        
        // Update wins counter
        if(winnerId && typeof updateWins === 'function') {
          updateWins(winnerId);
        }
        
        if(mainAnimationId) cancelAnimationFrame(mainAnimationId);
      }
    }
    
    // Continuous animation loop for smooth rendering
    function animate() {
      draw();
      if(speedBoost1 || speedBoost2) updateSpeedBoostUI(); // Update countdown
      
      // Start screen overlay
      if(!gameStarted) {
        ctx.fillStyle='rgba(0,0,0,0.7)';
        ctx.fillRect(0,0,canvasSize,canvasSize);
        ctx.fillStyle='#fff';
        ctx.font='bold 48px Arial';
        ctx.textAlign='center';
        ctx.textBaseline='middle';
        ctx.fillText('SNAKE BATTLE', canvasSize/2, canvasSize/2 - 30);
        ctx.font='24px Arial';
        ctx.fillText('Press SPACE to start', canvasSize/2, canvasSize/2 + 40);
      }
      // Pause overlay
      else if(isPaused) {
        ctx.fillStyle='rgba(0,0,0,0.7)';
        ctx.fillRect(0,0,canvasSize,canvasSize);
        ctx.fillStyle='#fff';
        ctx.font='bold 48px Arial';
        ctx.textAlign='center';
        ctx.textBaseline='middle';
        ctx.fillText('PAUSED', canvasSize/2, canvasSize/2);
        ctx.font='24px Arial';
        ctx.fillText('Press SPACE to continue', canvasSize/2, canvasSize/2 + 50);
      }
      
      if(alive1 || alive2) {
        mainAnimationId = requestAnimationFrame(animate);
      }
    }

    function key(e){
      const k=e.key;
      if(k===' '|| k==='Spacebar'){ 
        if(!gameStarted) {
          gameStarted = true;
          gameStartedMovement = true; // Start movement
        } else if(!alive1 || !alive2) {
          // Rematch after game over
          const note = document.getElementById('notification');
          note.classList.add('hidden');
          note.style.fontSize = '';
          // Restart game with same config
          document.removeEventListener('keydown', key);
          if(window._crazyHandler) {
            document.removeEventListener('keydown', window._crazyHandler);
          }
          startCrazyVersus(cfg);
        } else {
          isPaused=!isPaused;
        }
        e.preventDefault(); 
        return; 
      }
      if(isPaused || !gameStarted) return; // Block keys until game starts
      if(['w','W','a','A','s','S','d','D'].includes(k)) e.preventDefault();
      if((k==='w'||k==='W') && d1.y!==1) d1={x:0,y:-1};
      if((k==='a'||k==='A') && d1.x!==1) d1={x:-1,y:0};
      if((k==='s'||k==='S') && d1.y!==-1) d1={x:0,y:1};
      if((k==='d'||k==='D') && d1.x!==-1) d1={x:1,y:0};
      // Arrow keys for Player 2
      if(['ArrowUp','ArrowLeft','ArrowDown','ArrowRight'].includes(k)) e.preventDefault();
      if(k==='ArrowUp' && d2.y!==1) d2={x:0,y:-1};
      if(k==='ArrowLeft' && d2.x!==1) d2={x:-1,y:0};
      if(k==='ArrowDown' && d2.y!==-1) d2={x:0,y:1};
      if(k==='ArrowRight' && d2.x!==-1) d2={x:1,y:0};
    }

    spawnFood();
    lastMove1 = Date.now();
    lastMove2 = Date.now();
    const loopInterval = setInterval(loop, 16); // Check every frame (~60fps)
    animate(); // Start animation loop
    document.addEventListener('keydown', key);
    window._crazyHandler = key;
  };
})();
