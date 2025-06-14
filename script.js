//activate debugs
//this will show hitboxes + attack hitbox
//the collisions layer
//add invinciblity on/off
//add stage jumps 
let debugMode = false
//toggle for invincibility in debug 
let isInvincibleDebug = false

//reference player dom element from css
const player = document.querySelector('.player')
//define default state
let playerState = 'idle2'
//helper function to switch states and to delete the old state and replace it with the new one
function setPlayerState(newState) {
  if (playerState === newState) return
  player.classList.remove(playerState)
  playerState = newState
  //here we'll add a class, classList allows managing an element's class content, add just adds a class which would be under player and is a state (idle, run, jump...)
  player.classList.add(playerState)
}

//background full map 4 stages
const mapEl = document.querySelector('.map')
//game viewport, 1 stage at a time
const gameContainer = document.querySelector('.game-container')
//x and y positions in world
let playerX = 20
let playerY = 20
//track previous frame's x to compare with current and determine direction of movement (for collisions)
let prevX = playerX
let prevY = playerY
//vertical power of movement in gravity or jumping
let velocityY = 0
//gravity would be added to velocity to update player's y position and pull him to ground
const gravity = 0.5
//speed of movement
const speed = 3
const jumpStrength = -11
const keysPressed = {}
//sets player's facing direction
let facingRight = true
let onGround = false
let collisions = []
let collisionsLoaded = false
//the y value on the map this controls which stage is shown 
let mapOffsetY = 0
let currentStage = 0 //0 to 3
//this tells if we just transitioned stages, fixes a stage skipping bug by debouncing stage transitions
let justTransitioned = false
//defeated player
let isDefeated = false

//this is the size of one tile 16px * 16px
const tileSize = 16
//size of player and its hitbox
const spriteWidth = 96
const spriteHeight = 64
const hitboxWidth = 30
const hitboxHeight = 30
//hitbox grows when attacking 
const attackHitboxWidth = 50
const attackHitboxHeight = hitboxHeight
//this would change x and y values of hitbox relative to the player so it allows moving the hitbox and perfecting it now it's bottom center
const hitboxOffsetX = (spriteWidth - hitboxWidth) / 2
const hitboxOffsetY = spriteHeight - hitboxHeight
//now for attack hitboxe
const attackhitboxOffsetX = hitboxOffsetX
const attackhitboxOffsetY = hitboxOffsetY

//now starting positions for player in each stage, 576 is the height of 1 stage so we move him on the y axis to next stage and we can specify his position + facingdirection which is helpful
const stageStarts = [
  { x: 5, y: 10, facingRight: true },
  { x: 390, y: 586, facingRight: false },       // 576 + 10
  { x: 800, y: 1157, facingRight: false },      // 1152 + 5
  { x: 200, y: 1738, facingRight: false }       // 1728 + 10
]
// Pause overlay + controls
let isPaused = false
const pauseOverlay = document.createElement('div')
pauseOverlay.className = 'pause-overlay'
Object.assign(pauseOverlay.style, {
  position: 'absolute', top: '0', left: '0',
  width: '100%', height: '100%',
  backgroundColor: 'rgba(0,0,0,0.6)',
  display: 'none',
  flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  color: 'white', fontFamily: 'Arial,sans-serif', zIndex: '50'
})
// Continue button
const continueBtn = document.createElement('button')
continueBtn.textContent = 'Pause'
pauseOverlay.appendChild(continueBtn)
// Restart Stage
const restartStageBtn = document.createElement('button')
restartStageBtn.textContent = 'Restart Stage'
pauseOverlay.appendChild(restartStageBtn)
// Restart Game
const restartGameBtn = document.createElement('button')
restartGameBtn.textContent = 'Restart Game'
pauseOverlay.appendChild(restartGameBtn)
const controlsLegend = document.createElement('div');
controlsLegend.style.marginTop = '20px';
controlsLegend.style.fontSize = '18px';
controlsLegend.innerHTML = `
  <p>↑ ↓ ← → : Move</p>
  <p>1 2 3    : Attack</p>
  <p>Esc      : Pause / Continue</p>
`;
pauseOverlay.appendChild(controlsLegend)

gameContainer.appendChild(pauseOverlay)

function togglePause() {
  isPaused = !isPaused
  pauseOverlay.style.display = isPaused ? 'flex' : 'none'
  continueBtn.textContent = isPaused ? 'Continue' : 'Pause'
  if (isPaused) {
    lastTimestamp = 0;     // ← clear your timer so the next frame resets cleanly
  }
  for (const k in keysPressed) keysPressed[k] = false

}

continueBtn.addEventListener('click', togglePause)
restartStageBtn.addEventListener('click', restartStage)
restartGameBtn.addEventListener('click', restartGame)
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    togglePause()
    e.preventDefault()
    return
  }
  else keysPressed[e.key] = true
})
document.addEventListener('keyup', e => { keysPressed[e.key] = false })

// Restart logic
function restartStage() {
  lastTimestamp = 0;
  isPaused = false;
  pauseOverlay.style.display = 'none';
  continueBtn.textContent = 'Pause';
  const s = stageStarts[currentStage]
  playerX = s.x; playerY = s.y; velocityY = 0; onGround = false; facingRight = s.facingRight
  setPlayerState('idle2')
  cameraX = cameraY = 0
  updateCamera()
  removeEnemiesForStage(currentStage)
  removeCoinsForStage()
  spawnEnemiesForStage(currentStage)
  spawnCoinsForStage(currentStage)
  playerHealth = playerMaxHealth; score = 0
  updateHealthUI()
  hasKey = false;
  const keyUI = document.getElementById('ui-key');
  if (keyUI) keyUI.remove();
  updateScoreUI();
}
function restartGame() {
  lastTimestamp = 0
  isPaused = false
  pauseOverlay.style.display = 'none'
  continueBtn.textContent = 'Pause'
  removeEnemiesForStage(currentStage)
  removeCoinsForStage()
  currentStage = 0
  restartStage()
  hasKey = false;
  const keyUI = document.getElementById('ui-key');
  if (keyUI) keyUI.remove();
  updateScoreUI();

}
const endOverlay = document.createElement('div')
endOverlay.className = 'pause-overlay'  // reuse pause-overlay styles
endOverlay.style.display = 'none'       // start hidden
endOverlay.innerHTML = `
  <h1>🎉 You Win! 🎉</h1>
  <button id="play-again-btn">Play Again</button>
`
gameContainer.appendChild(endOverlay)

document
  .getElementById('play-again-btn')
  .addEventListener('click', () => {
    endOverlay.style.display = 'none';
    restartGame();
  });

//this converts absolute map coordinates to relative screen (camera) coordinates 
//camera x and y are both 0 but they'll be updated
//but is helpfull 
//used to draw everything in world, enemies, coints, debug element etc..
function worldToScreen(x, y) {
  return {
    x: x - cameraX,
    y: y - cameraY
  }
}

//NEW Camera settings
const camera = document.querySelector('.camera')
const world = document.querySelector('.world')
const cameraWidth = 2304
const cameraHeight = 576
let cameraX = 0
let cameraY = 0
const cameraEl = document.querySelector('.camera')
const zoomLevel = 2
//NEW update camera
function updateCamera() {
  // Define viewport and world dimensions for clarity
  const viewportWidth = 800 // From your CSS .game-container
  const viewportHeight = 576 // From your CSS .game-container
  const worldWidth = 2304

  // 1. Calculate the camera's target X
  // Use the viewportWidth for centering, not the old cameraWidth variable
  const targetX = playerX + (hitboxWidth / 2) - (viewportWidth / 2)
  const targetY = playerY + (hitboxHeight / 2) - (viewportHeight / 2)

  // 2. Smoothly interpolate the camera position towards the target
  cameraX += (targetX - cameraX) * 0.1
  cameraY += (targetY - cameraY) * 0.1

  // 3. Clamp the camera to the world and stage boundaries
  const maxScrollX = worldWidth - viewportWidth
  cameraX = Math.max(0, Math.min(cameraX, maxScrollX))

  // --- THIS IS THE NEW LOGIC FOR VERTICAL CLAMPING ---
  // Calculate the top Y coordinate of the current stage
  const stageTop = currentStage * viewportHeight

  // Clamp the final cameraY to the top of the current stage.
  cameraY = stageTop
  // --- END OF NEW LOGIC ---

  // 4. Apply the final transform to the world container
  world.style.transform = `translate(${-cameraX}px, ${-cameraY}px)`
}
// per-stage coin positions (world coords in tiles or pixels, your choice)
const coinSpawnData = {
  0: [
    { x: 300, y: 80 },
    { x: 320, y: 75 },
    { x: 340, y: 80 },

    { x: 840, y: 210 },
    { x: 820, y: 200 },
    { x: 800, y: 200 },


    { x: 750, y: 500 },
    { x: 780, y: 505 },
    { x: 810, y: 510 },

    { x: 1100, y: 500 },
    { x: 1080, y: 505 },
    { x: 1060, y: 510 },

    { x: 1600, y: 120 },
    { x: 1620, y: 125 },
    { x: 1640, y: 130 },


  ],

  1: [
    { x: 50, y: 80 + 576 },
    { x: 320, y: 75 + 576 },
    { x: 340, y: 80 + 576 },

    { x: 840, y: 210 + 576 },
    { x: 820, y: 200 + 576 },
    { x: 800, y: 200 + 576 },


    { x: 750, y: 500 + 576 },
    { x: 780, y: 505 + 576 },
    { x: 810, y: 510 + 576 },

    { x: 1100, y: 500 + 576 },
    { x: 1080, y: 505 + 576 },
    { x: 1060, y: 510 + 576 },

    { x: 1600, y: 120 + 576 },
    { x: 1620, y: 125 + 576 },
    { x: 1640, y: 130 + 576 },

  ],
  2: [
    { x: 300, y: 80 + 2 * 576 },
    { x: 320, y: 75 + 2 * 576 },
    { x: 340, y: 80 + 2 * 576 },

    { x: 840, y: 210 + 2 * 576 },
    { x: 820, y: 200 + 2 * 576 },
    { x: 800, y: 200 + 2 * 576 },


    { x: 750, y: 500 + 2 * 576 },
    { x: 780, y: 505 + 2 * 576 },
    { x: 810, y: 510 + 2 * 576 },

    { x: 1100, y: 500 + 2 * 576 },
    { x: 1080, y: 505 + 2 * 576 },
    { x: 1060, y: 510 + 2 * 576 },

    { x: 1600, y: 120 + 2 * 576 },
    { x: 1620, y: 125 + 2 * 576 },
    { x: 1640, y: 130 + 2 * 576 },

  ],
  3: [
    { x: 10, y: 80 + 3 * 576 },
    { x: 320, y: 75 + 3 * 576 },
    { x: 340, y: 80 + 3 * 576 },

    { x: 840, y: 210 + 3 * 576 },
    { x: 820, y: 200 + 3 * 576 },
    { x: 800, y: 200 + 3 * 576 },


    { x: 750, y: 500 + 3 * 576 },
    { x: 780, y: 505 + 3 * 576 },
    { x: 810, y: 510 + 3 * 576 },

    { x: 1100, y: 500 + 3 * 576 },
    { x: 1080, y: 505 + 3 * 576 },
    { x: 1060, y: 510 + 3 * 576 },

    { x: 1600, y: 120 + 3 * 576 },
    { x: 1620, y: 125 + 3 * 576 },
    { x: 1640, y: 130 + 3 * 576 },

  ],
}

let coins = []
let score = 0
function createCoin(x, y) {
  const coinEl = document.createElement('div')
  coinEl.className = 'coin'
  gameContainer.appendChild(coinEl)
  return { el: coinEl, x, y, collected: false }
}
//NEW spawn and remove coins
function spawnCoinsForStage(stage) {
  const list = coinSpawnData[stage] || []

  list.forEach(({ x, y }) => {
    const coin = createCoin(x, y)
    coins.push(coin)
  })
}

function removeCoinsForStage() {
  coins.forEach(c => {
    if (!c.collected && c.el.parentNode) c.el.parentNode.removeChild(c.el)
  })
  coins = []
}
//NEW loops over coins draws them checks collisions
function drawCoins() {
  // draw coins and check for collection
  coins.forEach(coin => {
    if (coin.collected) return
    // worldToScreen as you did for enemies:
    const { x: sx, y: sy } = worldToScreen(coin.x, coin.y)
    coin.el.style.transform = `translate(${sx}px, ${sy}px)`

    // simple AABB between player hitbox and coin
    const playerBox = {
      x: playerX + hitboxOffsetX,
      y: playerY + hitboxOffsetY,
      width: hitboxWidth,
      height: hitboxHeight
    }
    const coinBox = { x: coin.x, y: coin.y, width: 16, height: 16 }
    if (checkAABB(playerBox, coinBox)) {
      coin.collected = true
      coin.el.parentNode.removeChild(coin.el)
      score += 1
      updateScoreUI()
    }
  })
}
//player attack and damage 
let isAttacking = false
let isHit = false
let isInvincible = false
//here we define player health max at 100, starts at max
const playerMaxHealth = 100
let playerHealth = playerMaxHealth
let playerHearts = 3
//NEW creation and update of healthbar, hearts, coins counter
//create health bar in gamecontainer and health fill as its child
const healthBar = document.createElement('div')
healthBar.className = 'health-bar'
const healthFill = document.createElement('div')
healthFill.className = 'health-fill'
healthBar.appendChild(healthFill)
gameContainer.appendChild(healthBar)
//create 3 hearts append in gamecontainer
const heartsContainer = document.createElement('div')
heartsContainer.className = 'hearts'
for (let i = 0; i < 3; i++) {
  const heart = document.createElement('span')
  heart.className = 'heart'
  heart.textContent = '❤️'
  heartsContainer.appendChild(heart)
}
gameContainer.appendChild(heartsContainer)

//update fill bar and hearts
function updateHealthUI() {
  //width of fill bar will start at full health bar
  //it'll get updated to be current health / max health * 100 of original width
  healthFill.style.width = `${(playerHealth / playerMaxHealth) * 100}%`
  //returns all childs of heartscontainer so all 3 basically
  //we control their visibility next 
  const hearts = heartsContainer.children
  for (let i = 0; i < hearts.length; i++) {
    hearts[i].style.visibility = i < playerHearts ? 'visible' : 'hidden'
  }
}
updateHealthUI()
const scoreBoard = document.createElement('div');
scoreBoard.className = 'scoreboard';
scoreBoard.textContent = `Coins: 0`;
gameContainer.appendChild(scoreBoard);

const COINS_NEEDED = 3;
let hasKey = false;
function updateScoreUI() {
  scoreBoard.textContent = `Coins: ${score}/${COINS_NEEDED}`;
  if (!hasKey && score >= COINS_NEEDED) {
    hasKey = true;

    const keyEl = document.createElement('img');
    keyEl.src = 'key.png';
    keyEl.alt = 'Key';
    keyEl.style.position = 'absolute';
    keyEl.style.top = '0px';
    keyEl.style.right = '-50px';
    keyEl.style.width = '32px';
    keyEl.style.height = '32px';
    keyEl.id = 'ui-key';
    scoreBoard.appendChild(keyEl);
  }
}


//we'll define here an enemy object and it's properties 
//name, frames(for css animation), type(walk/fly), scale(control size with transform : scale(n)), movespeed, sprite/hitbox width and height, and hitboxoffsetY and X for hitbox positioning...
const enemyTypes = [
  {
    name: 'blueBall', frames: 10, type: 'fly', animSpeed: 200, scale: 0.5, moveSpeed: 0,
    spriteWidth: 64, spriteHeight: 64, hitboxWidth: 20, hitboxHeight: 10,
    hitboxOffsetX: 7, hitboxOffsetY: 16, health: 1, defeated: false
  },
  {
    name: 'greenRobot', frames: 26, type: 'walk', animSpeed: 100, scale: 0.5, moveSpeed: 1.0,
    spriteWidth: 64, spriteHeight: 64, hitboxWidth: 20, hitboxHeight: 20,
    hitboxOffsetX: 10, hitboxOffsetY: 3, health: 1, defeated: false
  },
  {
    name: 'robotBall', frames: 16, type: 'walk', animSpeed: 150, scale: 0.5, moveSpeed: 0,
    spriteWidth: 64, spriteHeight: 64, hitboxWidth: 40, hitboxHeight: 40,
    hitboxOffsetX: 7, hitboxOffsetY: 7, health: 1, defeated: false
  },
  {
    name: 'greenSnail', frames: 10, type: 'walk', animSpeed: 300, scale: 0.5, moveSpeed: 0.4,
    spriteWidth: 64, spriteHeight: 64, hitboxWidth: 20, hitboxHeight: 15,
    hitboxOffsetX: 3, hitboxOffsetY: 3, health: 1, defeated: false
  },
  {
    name: 'yellowBee', frames: 13, type: 'fly', animSpeed: 120, scale: 0.5, moveSpeed: 0.7,
    spriteWidth: 64, spriteHeight: 64, hitboxWidth: 20, hitboxHeight: 20,
    hitboxOffsetX: 8, hitboxOffsetY: 8, health: 1, defeated: false
  }
]
//store the enemies that spawned
let enemies = []
//for delta time calculation
let lastTimestamp = 0

//this part is for debugging the collisions layer 
//get color returns all the colors we need depending on the value we enter from 1,2,3,4,7,8,0 these are based on the collision values I gave to each tile on the collisions.json
//next part render debug tiles just makes divs with those colors 
function getColor(value) {
  switch (value) {
    case 1: return 'rgb(255, 0, 0)'   // Ground
    case 2: return 'rgb(0, 255, 0)'   // Wall
    case 3: return 'rgb(0, 0, 255)'   // One-way platform
    case 7: return 'rgb(128, 0, 128)'  // Two-way platform
    case 4: return 'rgb(255, 255, 0)'  // Hazard
    case 8: return 'rgb(255, 165, 0)'  // Door
    case 0: return 'transparent'
    default: return 'rgba(200, 200, 200, 0.3)'
  }
}
function renderDebugTiles() {
  for (let y = 0; y < collisions.length; y++) {
    for (let x = 0; x < collisions[y].length; x++) {
      const value = collisions[y][x]
      if (!value) continue
      const tile = document.createElement('div')
      tile.style.position = 'absolute'
      tile.style.left = `${x * tileSize}px`
      tile.style.top = `${y * tileSize}px`
      tile.style.width = `${tileSize}px`
      tile.style.height = `${tileSize}px`
      tile.style.backgroundColor = getColor(value)
      tile.style.pointerEvents = 'none'
      tile.style.zIndex = '0'
      mapEl.appendChild(tile)
    }
  }
}

//here if debug is true we'll create player's hitbox in red
//and attackhitbox in green 
let playerHitboxEl
if (debugMode) {
  playerHitboxEl = document.createElement('div')
  playerHitboxEl.className = 'hitbox player-hitbox'
  playerHitboxEl.style.position = 'absolute'
  playerHitboxEl.style.border = '1px solid red'
  playerHitboxEl.style.pointerEvents = 'none'
  playerHitboxEl.style.zIndex = '100'
  world.appendChild(playerHitboxEl)
}
let attackHitboxEl
if (debugMode) {
  attackHitboxEl = document.createElement('div')
  attackHitboxEl.className = 'hitbox attack-hitbox'
  attackHitboxEl.style.position = 'absolute'
  attackHitboxEl.style.border = '1px solid green'
  attackHitboxEl.style.pointerEvents = 'none'
  attackHitboxEl.style.zIndex = '100'
  attackHitboxEl.style.display = 'none'
  world.appendChild(attackHitboxEl)
}
//fetch sends a get request and returns the response (as a promise)
fetch('collisions.json')
  //if successful we go to the .then block, so there was a response whatever it is, it can be an error like 404 or anything
  .then(response => response.ok ? response.json() : Promise.reject())
  //response was ok now we call response.json() data
  .then(data => {
    //store collisions array (2D because we generate each line in an array on the json)
    collisions = data
    collisionsLoaded = true
    mapEl.style.height = (collisions.length * tileSize) + 'px'
    spawnEnemiesForStage(currentStage)
    spawnCoinsForStage(currentStage)

    if (debugMode) {
      renderDebugTiles()
    }
  })
  //catches all errors from the ones that might happen in fetch or after the fetch is successfull
  .catch(_ => {
    console.error("error fetching collisions.json")
    collisions = [[]]
    collisionsLoaded = true
    mapEl.style.heightMechanism = (4 * 576) + 'px'
    spawnEnemiesForStage(currentStage)
  })

//event listeners for keys pressed down and released e is a keyboad event and e.key is a string ("arrowleft" / "arrowright" etc...)
document.addEventListener('keydown', e => {
  if (e.key === '1' && !isAttacking) {
    startAttack('attack1')
  } else if (e.key === '2' && !isAttacking) {
    startAttack('attack2')
  } else if (e.key === '3' && !isAttacking) {
    startAttack('attack3')
  } else if (e.key === 'space' && !isAttacking) {
    startAttack('attack3')
  } else {
    keysPressed[e.key] = true
  }
})
document.addEventListener('keyup', e => keysPressed[e.key] = false)

//this takes attack type (attack1,attack2 or 3)
//sets the player's state to the attack  
//applies damage after a delay
//resets 
function startAttack(attackType) {
  isAttacking = true
  setPlayerState(attackType)
  const delay = attackType === 'attack3' ? 300 : 100
  setTimeout(() => {
    if (isAttacking) applyAttackDamage()
  }, delay)
  //animationend = css animation completed
  player.addEventListener('animationend', () => {
    isAttacking = false
    updatePlayerState()
  }, { once: true })
}

//NEW apply attack damage to enemies
function applyAttackDamage() {
  let attackHitboxX = playerX + hitboxOffsetX
  if (!facingRight) {
    attackHitboxX -= (attackHitboxWidth - hitboxWidth)
  }
  const playerAttackHitbox = {
    x: attackHitboxX,
    y: playerY + hitboxOffsetY,
    width: attackHitboxWidth,
    height: hitboxHeight
  }
  enemies.forEach(enemy => {
    const enemyHitbox = getEnemyHitbox(enemy)
    if (checkAABB(playerAttackHitbox, enemyHitbox)) {
      enemy.health -= 1
      enemy.el.classList.add('enemy-hit')
      setTimeout(() => enemy.el.classList.remove('enemy-hit'), 100)
      if (enemy.health <= 0) defeatEnemy(enemy)
    }
  })
}

//NEW defeat enemy
function defeatEnemy(enemy) {
  enemy.defeated = true;

  // 1) Switch the enemy’s class to the explosion animation
  enemy.el.classList.remove(`enemy-${enemy.type.name}`);
  enemy.el.classList.add('enemy-explosion');

  // 2) Unhook its hitbox
  if (debugMode && enemy.hitboxEl) {
    enemy.hitboxEl.remove();
  }

  // 3) When the explosion animation ends, remove the element and from your array
  enemy.el.addEventListener('animationend', () => {
    // remove from DOM
    enemy.el.remove();
    // remove from your enemies array
    enemies = enemies.filter(e => e !== enemy);
  }, { once: true });
}

//NEW player takes damage
function playerTakeDamage() {
  if (isInvincibleDebug || isInvincible || isDefeated) return
  playerHealth -= 20
  if (playerHealth <= 0) {
    playerHealth = 0
    playerHearts -= 1
    if (playerHearts <= 0) {
      playerHearts = 0; // Ensure it doesn't go negative
      updateHealthUI();
      defeatPlayer('game'); // Call defeat for a full game restart
      return; // Exit the function
    } else {
      playerHealth = playerMaxHealth
    }
  }
  updateHealthUI()
  isHit = true
  setPlayerState('hit')
  player.classList.add('player-hit')
  setTimeout(() => player.classList.remove('player-hit'), 300)
  player.addEventListener('animationend', () => {
    isHit = false
    updatePlayerState()
  }, { once: true })
  isInvincible = true
  setTimeout(() => { isInvincible = false }, 1000)
}

//NEW check player-enemy collisions
function checkPlayerEnemyCollisions() {

  const playerHitbox = {
    x: playerX + hitboxOffsetX,
    y: playerY + hitboxOffsetY,
    width: hitboxWidth,
    height: hitboxHeight
  }
  enemies.forEach(enemy => {
    if (enemy.defeated) return

    const enemyHitbox = getEnemyHitbox(enemy)
    if (checkAABB(playerHitbox, enemyHitbox) && !isAttacking && !isInvincible) {
      playerTakeDamage()
    }
  })
}
function defeatPlayer(restartType) {
  // Prevent the function from running multiple times if already triggered
  if (isDefeated) return;

  isDefeated = true;
  isAttacking = false; // Cancel any attacks
  velocityY = 0;       // Stop the player from falling

  // Clear any pressed keys to stop movement
  for (const k in keysPressed) {
    keysPressed[k] = false;
  }

  setPlayerState('ko');

  // Listen for the CSS animation to finish
  player.addEventListener('animationend', () => {
    // Make sure we are responding to the 'ko' animation ending, not another one
    if (playerState === 'ko') {
      isDefeated = false; // Reset the state
      if (restartType === 'game') {
        restartGame();
      } else { // 'stage'
        restartStage();
      }
    }
  }, { once: true }); // { once: true } automatically removes the listener after it runs
}
//collision detection with the axis-aligned bounding box
//returns true is two squares collide
function checkAABB(a, b) {
  return a.x < b.x + b.width && //a left edge < b right edge
    a.x + a.width > b.x && //a right edge > b left edge
    a.y < b.y + b.height && //a top edge < b bottom edge
    a.y + a.height > b.y //a bottom edge > b top edge
}
//calculation of enemy hitbox
function getEnemyHitbox(enemy) {
  const type = enemy.type //we get the type from the enemy object 
  const spriteW = type.spriteWidth || 64 //we get the width of the sprite from enemyTypes to place the hitbox relative to it + and add a default if it's not specified
  const spriteH = type.spriteHeight || 64
  //hitbox size
  const hbxW = type.hitboxWidth || spriteW * 0.7
  const hbxH = type.hitboxHeight || spriteH * 0.9
  //hitbox position relative to sprite we'll place it at the center horizontally and at the bottom (enemy's feet) vertically so it's bottom center
  const hitboxOffsetX = (spriteW - hbxW) / 2
  const hitboxOffsetY = spriteH - hbxH

  return {
    //attributes of hitbox
    x: enemy.x + hitboxOffsetX,
    y: enemy.y + hitboxOffsetY,
    width: hbxW,
    height: hbxH,
    OffsetX: hitboxOffsetX,
    OffsetY: hitboxOffsetY,
    spriteHeight: spriteH,
    spriteWidth: spriteW
  }
}

//this checks if a tile is valid (not off map) and if it's a collision tile (all except hazards and doors)
function isSolidTile(x, y) {
  if (x < 0 || y < 0 || y >= collisions.length || x >= collisions[y]?.length) //? mean or undefined it avoids returning an error by returning undefined if collisions[y] doesn't exist
    return false
  const tile = collisions[y][x] //collision tile's number
  return [1, 2, 3, 7].includes(tile)
}
//one tile is 16px by 16px this handles the conversion from pixel to tile
//simple calculation of which tile the pixel is on, returns object {x:tilex, y:tiley}
function pixelToTile(x, y) {
  return {
    x: Math.floor(x / tileSize), //tilesize = 16 
    y: Math.floor(y / tileSize)
  }
}

//enemy creation ex : createnemy(greenRobot, 50, 100) 
function createEnemy(typeName, x, y) {
  //.find takes a callback as argument loops throught the array returns first element 
  //where applying the function returns true/truthy value 
  //if 0 elements it returns undefined
  const enemyData = enemyTypes.find(et => et.name === typeName)
  if (!enemyData) {
    console.error("404 I guess, enemy type not found", typeName)
    return null
  }
  const enemyEl = document.createElement('div')
  enemyEl.classList.add('enemy', `enemy-${enemyData.name}`)
  gameContainer.appendChild(enemyEl)
  //enemy is just the properties associated with the enemy 
  const enemy = {
    //almost eveything here can/will be overwritten later (on spawndata)
    //enemy el is a reference to the dom element itself, we can update its properties (using transform for instance)
    el: enemyEl,
    x: x,
    y: y,
    //storing prev x/y allows determening direction of movement (if x > prevx player is moving right)
    //determening direction is important if you wanna push the player on impact
    //quick not about this : we already have facing right 
    //but we wanna separate direction of movement from the direction the enemy's facing 
    //even if they'll go together most of the times (all of the times so far) 
    prevX: x,
    prevY: y,
    type: enemyData, //enemyTypes object (speed, hitbox, sprite, size etc...)
    facingRight: false, //if we wanna make it random math.random()<0.5 does the job it returns 1 or 0 so 50/50 chance of true/false
    scale: enemyData.scale || 0.5,
    timeAccumulator: Math.random() * 2000, //for the fly animation so that for each flying creature the (wave movement) starts at a random time
    //properties of flying enemies
    flyAmplitude: 0,
    flyFrequency: 0,

    originalSpawnY: y,

    //properties od walking enemies 
    velocityY: 0,
    onGround: false,
    health: enemyData.health,
    defeated: false
  }

  if (enemy.type.type === 'fly') {
    //we use specific values from enemyData if they exist or we use defaults
    enemy.flyAmplitude = enemyData.flyAmplitude !== undefined ? enemyData.flyAmplitude : (15 + Math.random() * 20)
    enemy.flyFrequency = enemyData.flyFrequency !== undefined ? enemyData.flyFrequency : (0.002 + Math.random() * 0.0015)
  }
  //create enemy hitbox if debug mode is active
  if (debugMode) {
    enemy.hitboxEl = document.createElement('div')
    enemy.hitboxEl.className = 'hitbox enemy-hitbox'
    enemy.hitboxEl.style.position = 'absolute'
    enemy.hitboxEl.style.border = '1px solid blue'
    enemy.hitboxEl.style.pointerEvents = 'none'
    enemy.hitboxEl.style.zIndex = '100'
    gameContainer.appendChild(enemy.hitboxEl)
  }
  return enemy
}

//for now this only works on walking enemies
function handleEnemyVerticalCollisions(enemy) {
  if (enemy.type.type !== 'walk' || !collisionsLoaded) return
  //we'll use getenemyhitbox to get its prevY
  const enemyHitbox = getEnemyHitbox(enemy)
  //we'll store enemy Y (top/bottom) before applying velocity
  //important cause if current y overlaps with a collision tile
  //we can reset it to prevY note:based on this we'll define a search area (bigger than hitbox)
  const prevhitboxTopY = enemy.prevY + enemyHitbox.OffsetY
  const prevhitboxBottomY = enemy.prevY + enemyHitbox.spriteHeight

  //apply gravity and velocity
  enemy.velocityY += gravity
  enemy.y += enemy.velocityY
  //after gravity and velocity we get current properties of enemy
  let currentHitbox = getEnemyHitbox(enemy)
  let newOnGroundStatus = false
  //for checking overlap a bit before it happens we use a slightly bigger (search area)
  //left x
  const startRow = Math.max(0, Math.floor(currentHitbox.y / tileSize) - 1) //y (row) of current hitbox converted from pixels to tiles by dividing by tilesize = 16 and taking the floor, -1 adds a row to top so on top of the 0 row
  //right x
  const endRow = Math.min(collisions.length - 1, Math.floor((currentHitbox.y + currentHitbox.height) / tileSize) + 1) //collisions is a 2D array each the inside arrays are lines so collisions.length-1 is the number of rows (+1row below the last row)
  //top y
  const startCol = Math.max(0, Math.floor(currentHitbox.x / tileSize) - 1) //x position of hitbox converted from pixel to tiles (-1row (added on the left))
  //bottom y
  const endCol = Math.min((collisions[0]?.length || 0) - 1, Math.floor((currentHitbox.x + currentHitbox.width) / tileSize) + 1)//+1 row added on the right

  //we'll loop over rows and columns 
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {

      const tileValue = collisions[r]?.[c]
      // 0 = transparent, 1 = ground, 2 = wall, 3 = one-way, 4 = hazard, 7 = two way, 8 = door
      if (![1, 3, 7].includes(tileValue)) continue //0, 2, 4 and 8 don't impact vertical movement so we ignore them (we'll handle colliding vertically with walls in another place)
      //create an object that represents the tile rectangle, we * c and r by 16 to get x and y of tile 
      //and we know height/width are 16px
      const tileRect = {
        x: c * tileSize,
        y: r * tileSize,
        width: tileSize,
        height: tileSize
      }
      //if enemy hitbox overlaps the tile 
      if (checkAABB(currentHitbox, tileRect)) {
        //velocityY > 0 means falling and == 0 means idle(stationary)
        if (enemy.velocityY >= 0) {
          //if previously the enemy was above the tile (so now he should land on it)
          if (prevhitboxBottomY <= tileRect.y + 1) {
            enemy.y = tileRect.y - enemyHitbox.spriteHeight //here we take the actual size of the enemy sprite we put the enemy on top of the tile (tilerectY - spritesize)
            enemy.velocityY = 0
            newOnGroundStatus = true
            currentHitbox = getEnemyHitbox(enemy) //hitbox updated properties (after position corrections)
          }
        }
        //here we only deal with bottom collisions so we ignore one way platforms(3)
        else if (enemy.velocityY < 0 && tileValue !== 3) {
          //we check if enemy's previous y position was below the collision tile 
          //so enemy should hit head with tile (ceiling)
          //to do this it's enough to align his head with the ceiling then gravity will do the work
          //tilerect.y + tilerect.height = bottom Y of tile
          //this - hitboxoffsetY to get the top Y position of enemy, cause that's the distance between hitbox and actual sprite top 
          //so we basically move from the bottom of sprite up a little bit 
          //(distance = hitbox offsetY) so that when we place the image there it aligns well with the collisions tile
          if (prevhitboxTopY >= tileRect.y + tileRect.height - 1) {
            enemy.y = tileRect.y + tileRect.height - enemyHitbox.OffsetY
            enemy.velocityY = 0
            currentHitbox = getEnemyHitbox(enemy)
          }
        }
      }
    }
  }
  enemy.onGround = newOnGroundStatus
}


function handleEnemyMovementAndCollisions(enemy) {
  //horizontal collision are only for enemies that should move,
  //only when they're on ground,
  //and for now only for walking ones 
  if (enemy.type.type !== 'walk' || !enemy.onGround || enemy.type.moveSpeed === 0 || !collisionsLoaded) {
    return
  }
  //we keep trace of x position before movement
  enemy.prevX = enemy.x
  //add direction and movement 
  //this is speculative meaning it won't actually apply yet, we'll check if it overlaps with a collision tile later
  enemy.x += (enemy.facingRight ? 1 : -1) * enemy.type.moveSpeed
  //hitbox after (speculative) movement
  let currentHitbox = getEnemyHitbox(enemy)
  //to switch directions 
  let turnAround = false
  //tile concerned with horizontal collisions 1:ground and 2:wall
  const solidTilesForWall = [2]
  //same thing we did for vertical checks and y 
  //here in checkPointX we'll check a bit (1px) before x or 1 px after x + hitboxwidth
  //depending on the direction he's facing right +1 left -1
  const checkPointX = enemy.facingRight ? (currentHitbox.x + currentHitbox.width + 1) : (currentHitbox.x - 1)
  //determine which tiles (top and bottom) the hitbox is on
  const startRow = Math.floor(currentHitbox.y / tileSize)
  const endRow = Math.floor((currentHitbox.y + currentHitbox.height) / tileSize)
  //then we'll loop over tiles from start to end rows and check for collision tiles 
  for (let r = startRow; r <= endRow; r++) {
    if (r < 0 || r >= collisions.length) continue //ignorie out of map's bounds 
    //we get the checkpoint which is 1 pixel to left+right of hitbox and we convert to tile
    //c here is a column
    const c = Math.floor(checkPointX / tileSize)
    //if c is outofbounds of the map, enemy should turn 
    if (c < 0 || c >= (collisions[0]?.length || 0)) {
      turnAround = true
      break
    }
    //collisions[r] is a row in collisions and [c] is a column so collisions[r][c] is the value of the tile
    const tileValue = collisions[r]?.[c]
    //if collisions[r][c] == 1 || 2 we turn around we've horizontally hit ground or a wall
    if (solidTilesForWall.includes(tileValue)) {
      turnAround = true
      break
    }
  }
  //if enemy hasn't had to turnaround yet and is onground
  if (!turnAround && enemy.onGround) {
    //search area 2px to left/right and 5px below
    const footCheckX = currentHitbox.x + (enemy.facingRight ? currentHitbox.width + 2 : -2)
    const footCheckY = currentHitbox.y + currentHitbox.height + 5
    //convert to tiles
    const groundTileCol = Math.floor(footCheckX / tileSize)
    const groundTileRow = Math.floor(footCheckY / tileSize)
    let groundExists = false
    //make sure we're withing map's bounds
    if (groundTileRow >= 0 && groundTileRow < collisions.length &&
      groundTileCol >= 0 && groundTileCol < (collisions[0]?.length || 0)) {
      //get value of tile and check if it's 1(ground), 3(1-way platform), 7 (2-way platform)
      const tileBelowFoot = collisions[groundTileRow]?.[groundTileCol]
      if ([1, 3, 7].includes(tileBelowFoot)) {
        groundExists = true
      }
    }
    //if no ground in search area turn around
    if (!groundExists) {
      turnAround = true
    }
  }
  //if enemy should turn around (from colliding with walls, ground, platforms)
  //we revert to prevX, current x overlays with collision tile
  //switch facing direction
  if (turnAround) {
    enemy.x = enemy.prevX
    enemy.facingRight = !enemy.facingRight
  }
}
//update state of enemies (in each frame (will be used in gameloop))
//the two previous functions for handeling enemy collisions are included
//deltatime is the time passed since the last frame
function updateEnemyLogic(deltaTime) {
  //enemies contains active enemies on the stage we're on
  enemies.forEach(enemy => {
    //as usual before changing anything we save x/y in prevX and prevY
    //since this we'll execute with requestanimationframe(), 
    //these values are x and y of the last frame 
    enemy.prevX = enemy.x
    enemy.prevY = enemy.y
    //collisions and movement of walking types
    if (enemy.type.type === 'walk') {
      //gravity, landing on ground/platforms, ceilings
      handleEnemyVerticalCollisions(enemy)
      //horizontal movement, detection of ground ahead, turning
      handleEnemyMovementAndCollisions(enemy)

      //movement of flying types
    } else if (enemy.type.type === 'fly') {
      //timeaccumulator starts as a random number for each flying enemies (in createEnemy)
      //this makes sure the oscillation starts at a different point for each one
      //incrementing it by deltatime (time since last frame) makes the osciallation frame-rate independent   
      enemy.timeAccumulator += deltaTime
      //vertical movement
      const flyOffset = enemy.flyAmplitude * Math.sin(enemy.timeAccumulator * enemy.flyFrequency)
      enemy.y = enemy.originalSpawnY + flyOffset

      if (enemy.type.moveSpeed > 0) {
        //horizontal movement
        enemy.x += (enemy.facingRight ? 1 : -1) * enemy.type.moveSpeed
        //boundry checks 
        const spriteW = enemy.type.spriteWidth || 64
        //width of the map converted to pixels (number of columns)
        const mapPixelWidth = (collisions[0]?.length || 0) * tileSize
        //we check if enemy goes beyond the edges of the map
        //if so we reset the position and turnaround

        //left edge
        if (enemy.x < 0) {
          enemy.x = 0
          enemy.facingRight = !enemy.facingRight
          //right edge
        } else if (enemy.x + spriteW > mapPixelWidth) {
          enemy.x = mapPixelWidth - spriteW
          enemy.facingRight = !enemy.facingRight
        }
      }

    }
    //on the enemies spritesheet all exceot greenSnail face left by default so right should flip them
    let finalScaleX = enemy.facingRight ? 1 : -1
    if (enemy.type.name !== 'greenSnail') {
      finalScaleX *= -1
    }

    //these would be benificial in scrolling 
    //for now there's no horizontal scrolling 
    //that's why there's no mapoffsetX (for now*)
    let targetScreenX = enemy.x
    let targetScreenY = enemy.y
    //apply the css transform and update position : (x, y, scaleX(facingRight), scale())
    enemy.el.style.transform = `translate(${targetScreenX}px, ${targetScreenY}px) scaleX(${finalScaleX}) scale(${enemy.scale})`

    const screenPos = worldToScreen(enemy.x, enemy.y);
    enemy.el.style.transform = `translate(${screenPos.x}px, ${screenPos.y}px) scaleX(${finalScaleX}) scale(${enemy.scale})`;

    if (debugMode && enemy.hitboxEl) {
      const hitbox = getEnemyHitbox(enemy)
      const hitboxScreen = worldToScreen(hitbox.x, hitbox.y)
      enemy.hitboxEl.style.left = `${hitboxScreen.x}px`
      enemy.hitboxEl.style.top = `${hitboxScreen.y}px`
      enemy.hitboxEl.style.width = `${hitbox.width}px`
      enemy.hitboxEl.style.height = `${hitbox.height}px`
    }
  })
}
function renderDebugElements() {
  if (debugMode && playerHitboxEl) {
    const hitbox = {
      x: playerX + hitboxOffsetX,
      y: playerY + hitboxOffsetY,
      width: hitboxWidth,
      height: hitboxHeight
    };
    const screenPos = worldToScreen(hitbox.x, hitbox.y);
    playerHitboxEl.style.left = `${screenPos.x}px`;
    playerHitboxEl.style.top = `${screenPos.y}px`;
    playerHitboxEl.style.width = `${hitbox.width}px`;
    playerHitboxEl.style.height = `${hitbox.height}px`;
  }

  if (debugMode && isAttacking) {
    let attackX = playerX + hitboxOffsetX;
    if (!facingRight) attackX -= (attackHitboxWidth - hitboxWidth);

    const screenPos = worldToScreen(attackX, playerY + hitboxOffsetY);
    attackHitboxEl.style.left = `${screenPos.x}px`;
    attackHitboxEl.style.top = `${screenPos.y}px`;
    attackHitboxEl.style.width = `${attackHitboxWidth}px`;
    attackHitboxEl.style.height = `${hitboxHeight}px`;
    attackHitboxEl.style.display = 'block';
  } else if (debugMode) {
    attackHitboxEl.style.display = 'none';
  }
}

//player collisions
//starting with landing on ground/platforms, ceilings, doors
function handleVerticalCollisions() {
  //player's Y position (relative to viewport)
  //mapoffset Y is the amount the map scrolled vertically with
  const playerWorldY = playerY
  //hitbox x,y, height,width
  const rect = {
    x: playerX + hitboxOffsetX,
    y: playerWorldY + hitboxOffsetY,
    width: hitboxWidth,
    height: hitboxHeight
  }
  let newOnGround = false
  let playerIsCurrentlyOnDoor = false

  //define search area (+1 tile (16px) to left,right,top,bottom) 
  //max min here is just a way to avoid going out of bounds
  const startRow = Math.max(0, Math.floor(rect.y / tileSize) - 1)
  const endRow = Math.min(collisions.length - 1, Math.floor((rect.y + rect.height) / tileSize) + 1)
  const startCol = Math.max(0, Math.floor(rect.x / tileSize) - 1)
  const endCol = Math.min(collisions[0]?.length - 1, Math.floor((rect.x + rect.width) / tileSize) + 1)

  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const v = collisions[r]?.[c]
      //we skip if v is any falsy value like undefined (including 0 which means empty pixel no collisions)
      if (!v) continue
      //we get the value of tile in pixels
      const tile = {
        x: c * tileSize,
        y: r * tileSize,
        width: tileSize,
        height: tileSize
      }
      //if player's hitbox overlaps with the tile 
      if (checkAABB(rect, tile)) {
        //8 = door
        if (v === 8 && hasKey) {
          if (currentStage === stageStarts.length - 1) {
            // last door, show end screen
            endOverlay.style.display = 'flex';
            return;
          }

          playerIsCurrentlyOnDoor = true
          //we debounce stage transitioning
          //the boolean is set to true when we first transition
          //it resets when player is no longer colliding with door
          //this prevents some bugs with stage transitions (skipping stages)
          if (!justTransitioned) {
            transitionToNextStage()
            return
          }
          //1:ground 2:wall 3:two-way platform 
          //here's we'll handle landing and ceiling
        } else if ([1, 2, 7].includes(v)) {
          //save player's y before changes
          const prevPlayerWorldY = prevY
          //if falling (<0) or onground (0) 
          //current bottom y position is just rect.y + rect.height 
          //instead we get previous bottom y with prevPlayerWorldY + hitboxOffsetY + hitboxHeight
          //we check if it was above or at the same level as the tile 
          //(we can add some tolerance too)
          if (velocityY >= 0 && prevPlayerWorldY + hitboxOffsetY + hitboxHeight <= tile.y + 0.5) {
            //adjust player's y position make him land on top of tile
            //set velocity to 0 and onground to true
            playerY = tile.y - hitboxHeight - hitboxOffsetY
            velocityY = 0
            newOnGround = true
            //if player was jumping and was previously below tile or at the same level
          } else if (velocityY < 0 && prevPlayerWorldY + hitboxOffsetY >= tile.y + tile.height - 0.5) {
            playerY = tile.y + tile.height - hitboxOffsetY
            velocityY = 0
          }
          //for one-way platforms we only handle landing 
          //no bottom collisions
        } else if (v === 3 && velocityY >= 0 && (prevY + hitboxOffsetY + hitboxHeight) <= tile.y + 0.5) {
          playerY = tile.y - hitboxHeight - hitboxOffsetY
          velocityY = 0
          newOnGround = true
        } else if (v === 4 && !isInvincible && !isInvincibleDebug) {
          defeatPlayer('stage'); // Call defeat for a stage restart
          playerHearts = Math.max(0, playerHearts - 1);
          updateHealthUI();
          return; // Exit the function immediately
        }

      }
    }
  }
  //set global onground with local one after all the checks
  onGround = newOnGround
  //reset justtransitioned to false
  if (!playerIsCurrentlyOnDoor && justTransitioned) {
    justTransitioned = false
  }
}

function handleHorizontalCollisions() {
  //set player's y, define hitbox and search area
  const playerWorldY = playerY
  const rect = {
    x: playerX + hitboxOffsetX,
    y: playerWorldY + hitboxOffsetY,
    width: hitboxWidth,
    height: hitboxHeight
  }
  const startRow = Math.max(0, Math.floor(rect.y / tileSize) - 1)
  const endRow = Math.min(collisions.length - 1, Math.floor((rect.y + rect.height) / tileSize) + 1)
  const startCol = Math.max(0, Math.floor(rect.x / tileSize) - 1)
  const endCol = Math.min(collisions[0]?.length - 1, Math.floor((rect.x + rect.width) / tileSize) + 1)

  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      //if tile is a wall 
      if (collisions[r]?.[c] === 2) {
        //get x,y,height,weight of tile
        const tile = {
          x: c * tileSize,
          y: r * tileSize,
          width: tileSize,
          height: tileSize
        }
        //if hitbox and wall tile collide
        if (checkAABB(rect, tile)) {
          //if moving towards the right + right edge is to the left of tile or at same level + tolerance
          if (playerX > prevX && prevX + hitboxOffsetX + hitboxWidth <= tile.x + 0.5) {
            //position player to left of wall
            playerX = tile.x - hitboxWidth - hitboxOffsetX
            //if moving towards the left + left edge is to the right of tile or at same level + tolerance
          } else if (playerX < prevX && prevX + hitboxOffsetX >= tile.x + tile.width - 0.5) {
            //position player to right of wall
            playerX = tile.x + tile.width - hitboxOffsetX
          }
        }
      }
    }
  }
}

function updatePlayerState() {
  if (isAttacking || isHit) return
  const isMovingHorizontally = keysPressed['ArrowLeft'] || keysPressed['ArrowRight']
  //this checks for jumping -1 instead of 0 
  //setplayerstate will create a class under player with classlist.add name it to "state"
  //it'll also remove the old state
  if (velocityY < 0) setPlayerState('jump')
  else if (velocityY > 0 && !onGround) setPlayerState('fall')
  else if (isMovingHorizontally && onGround) setPlayerState('run')
  else if (onGround) setPlayerState('idle2')
}
function renderPlayer() {
  const playerSize = 0.6;
  player.style.transform = `translate(${playerX}px, ${playerY}px) scaleX(${facingRight ? 1 : -1}) scale(${playerSize})`;
}

function transitionToNextStage() {
  //if we're not yet at last stage
  if (currentStage < stageStarts.length - 1) {
    //remove all enemies
    removeEnemiesForStage(currentStage)
    removeCoinsForStage(currentStage)
    score = score - COINS_NEEDED
    currentStage++
    //all stages are 576px in height
    //we'll set player's x and y from stageStarts
    //which determines where should player appear at each stage
    //with y we take the offset into consideration
    playerX = stageStarts[currentStage].x
    playerY = stageStarts[currentStage].y
    //reset velocity and onground
    //apply offsetY to the map (shift upwards by 576*stage)
    velocityY = 0
    onGround = false
    //we use css's transform : translate(mapoffsetY) to set the stages y position
    mapEl.style.transform = `translateY(${-mapOffsetY}px)`
    //set this to true to make sure it only happens once
    //until player is no longer colliding with door
    justTransitioned = true
    //spawn new enemies 
    spawnEnemiesForStage(currentStage)
    spawnCoinsForStage(currentStage)
    console.log(`Transitioned to stage ${currentStage}`)

    //here we should transition to an end screen or something 
    //still dunno what to do here 
  } else if (currentStage == stageStarts.length - 1) {
    removeEnemiesForStage(currentStage)
    justTransitioned = true
  }
}

//data for spawning enemies for each stage
const enemySpawnData = {
  0: [
    { type: 'blueBall', x: 1000, y: 1, active: false, facingLeft: true, },
    { type: 'blueBall', x: 1300, y: 3, active: false, facingLeft: true },
    { type: 'greenRobot', x: 730, y: 130, active: false, facingLeft: false },
    { type: 'greenSnail', x: 400, y: 100, active: false, facingLeft: true },
    { type: 'yellowBee', x: 2000, y: 30, active: false, facingLeft: true },
    { type: 'yellowBee', x: 800, y: 30, active: false, facingLeft: true }
  ],
  1: [
    { type: 'greenRobot', x: 100, y: 776, active: false, facingLeft: true },
    { type: 'blueBall', x: 280, y: 700, active: false, facingLeft: true },
    { type: 'yellowBee', x: 450, y: 720, active: false, facingLeft: true },
    { type: 'robotBall', x: 650, y: 776, active: false, facingLeft: true },
    { type: 'greenSnail', x: 850, y: 776, active: false, facingLeft: true }
  ],
  2: [
    { type: 'yellowBee', x: 150, y: 1300, active: false, facingLeft: true },
    { type: 'greenRobot', x: 500, y: 1352, active: false, facingLeft: true },
    { type: 'blueBall', x: 700, y: 1280, active: false, facingLeft: true },
    { type: 'greenSnail', x: 900, y: 1352, active: false, facingLeft: true },
  ],
  3: [
    { type: 'greenRobot', x: 200, y: 1928, active: false, facingLeft: true },
    { type: 'blueBall', x: 400, y: 1850, active: false, facingLeft: true },
    { type: 'yellowBee', x: 600, y: 1880, active: false, facingLeft: true },
    { type: 'robotBall', x: 800, y: 1928, active: false, facingLeft: true },
    { type: 'greenSnail', x: 1000, y: 1928, active: false, facingLeft: true }
  ]
}

function spawnEnemiesForStage(stage) {
  const stageSpawns = enemySpawnData[stage]
  if (!stageSpawns) return
  stageSpawns.forEach(spawnData => {
    const enemy = createEnemy(spawnData.type, spawnData.x, spawnData.y)
    if (enemy) {
      if (spawnData.facingLeft !== undefined) enemy.facingRight = !spawnData.facingLeft
      enemy.stage = stage
      enemies.push(enemy)
      spawnData.active = true
      spawnData.enemyRef = enemy
      console.log(`Spawned ${spawnData.type} at x:${spawnData.x}, y:${spawnData.y} for stage ${stage}`)
    }
  })
}

function removeEnemiesForStage(stage) {
  enemies = enemies.filter(enemy => {
    if (enemy.stage === stage) {
      if (enemy.el && enemy.el.parentNode) enemy.el.parentNode.removeChild(enemy.el)
      if (debugMode && enemy.hitboxEl && enemy.hitboxEl.parentNode) enemy.hitboxEl.parentNode.removeChild(enemy.hitboxEl)
      return false
    }
    return true
  })
  const stageSpawns = enemySpawnData[stage]
  if (stageSpawns) {
    stageSpawns.forEach(spawnData => {
      spawnData.active = false
      spawnData.enemyRef = null
    })
  }
  console.log(`Removed all enemies from stage ${stage}`)
}

//NEW debug controls with stage buttons and invincible toggle
if (debugMode) {
  const debugControls = document.createElement('div')
  debugControls.className = 'debug-controls'
  debugControls.style.position = 'fixed'
  debugControls.style.top = '10px'
  debugControls.style.right = '10px'
  debugControls.style.zIndex = '100'

  const stageButtons = document.createElement('div')
  stageButtons.className = 'stage-buttons'
  for (let i = 0; i < stageStarts.length; i++) {
    const button = document.createElement('button')
    button.textContent = `Stage ${i + 1}`
    button.addEventListener('click', () => switchToStage(i))
    stageButtons.appendChild(button)
  }
  debugControls.appendChild(stageButtons)

  const invincibleButton = document.createElement('button')
  invincibleButton.textContent = 'Invincible: OFF'
  invincibleButton.addEventListener('click', () => {
    isInvincibleDebug = !isInvincibleDebug
    invincibleButton.textContent = `Invincible: ${isInvincibleDebug ? 'ON' : 'OFF'}`
  })
  debugControls.appendChild(invincibleButton)

  document.body.appendChild(debugControls)
}
//NEW debug switch stage 
function switchToStage(stageIndex) {
  if (stageIndex < 0 || stageIndex >= stageStarts.length) return
  removeEnemiesForStage(currentStage)
  currentStage = stageIndex
  playerX = stageStarts[currentStage].x
  playerY = stageStarts[currentStage].y
  facingRight = stageStarts[stageIndex].facingRight
  velocityY = 0
  onGround = false
  mapEl.style.transform = `translateY(${-mapOffsetY}px)`
  spawnEnemiesForStage(currentStage)
  console.log(`Switched to stage ${currentStage}, mapOffsetY: ${mapOffsetY}`)
}

function gameLoop(timestamp) {
  if (!collisionsLoaded) {
    requestAnimationFrame(gameLoop)
    return
  }
  if (!isPaused) {
    pauseOverlay.style.display = 'none'
    if (lastTimestamp === 0) lastTimestamp = timestamp
    const deltaTime = timestamp - lastTimestamp
    lastTimestamp = timestamp
    if (!isDefeated) {

    }
    prevX = playerX
    prevY = playerY

    if (keysPressed['ArrowLeft']) { playerX -= speed, facingRight = false }
    if (keysPressed['ArrowRight']) { playerX += speed, facingRight = true }
    if (keysPressed['ArrowUp'] && onGround) { velocityY = jumpStrength, onGround = false }

    if (!onGround) velocityY += gravity
    playerY += velocityY
    if (!isDefeated) {
      handleVerticalCollisions()
      handleHorizontalCollisions()
      updatePlayerState()
      checkPlayerEnemyCollisions()
    }
    updateEnemyLogic(deltaTime)
    updateCamera()
    renderPlayer();
    renderDebugElements();
    drawCoins()

    //NEW update player hitbox position for debugging
    if (debugMode && playerHitboxEl) {
      const playerHitbox = {
        x: playerX + hitboxOffsetX,
        y: playerY + hitboxOffsetY,
        width: hitboxWidth,
        height: hitboxHeight
      }
      playerHitboxEl.style.left = `${playerX + hitboxOffsetX}px`;
      playerHitboxEl.style.top = `${playerY + hitboxOffsetY}px`;
      playerHitboxEl.style.width = `${playerHitbox.width}px`
      playerHitboxEl.style.height = `${playerHitbox.height}px`
    }
    if (debugMode && isAttacking) {
      let attackHitboxX = playerX + hitboxOffsetX
      if (!facingRight) {
        attackHitboxX -= (attackHitboxWidth - hitboxWidth)
      }
      attackHitboxEl.style.left = `${attackHitboxX}px`
      attackHitboxEl.style.top = `${playerY + hitboxOffsetY}px`
      attackHitboxEl.style.width = `${attackHitboxWidth}px`
      attackHitboxEl.style.height = `${hitboxHeight}px`
      attackHitboxEl.style.display = 'block'
    } else if (debugMode) {
      attackHitboxEl.style.display = 'none'
    }

  } else {
    pauseOverlay.style.display = 'flex';
  }
  requestAnimationFrame(gameLoop)
}

requestAnimationFrame(gameLoop)