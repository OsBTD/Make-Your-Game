//activate debugs
let debugMode = true
let isInvincibleDebug = false

const player = document.querySelector('.player')
let playerState = 'idle2'

function setPlayerState(newState) {
  if (playerState === newState) return
  player.classList.remove(playerState)
  playerState = newState
  player.classList.add(playerState)
}

const mapEl = document.querySelector('.map')
const gameContainer = document.querySelector('.game-container')
let playerX = 20
let playerY = 20
let prevX = playerX
let prevY = playerY
let velocityY = 0
const gravity = 0.5
const speed = 3
const jumpStrength = -11
const keysPressed = {}
let facingRight = true
let onGround = false
let collisions = []
let collisionsLoaded = false
let mapOffsetY = 0
let currentStage = 0
let justTransitioned = false
let isDefeated = false

const tileSize = 16
const spriteWidth = 96
const spriteHeight = 64
const hitboxWidth = 30
const hitboxHeight = 30
const attackHitboxWidth = 50
const attackHitboxHeight = hitboxHeight
const hitboxOffsetX = (spriteWidth - hitboxWidth) / 2
const hitboxOffsetY = spriteHeight - hitboxHeight
const attackhitboxOffsetX = hitboxOffsetX
const attackhitboxOffsetY = hitboxOffsetY

const stageStarts = [
  { x: 5, y: 10, facingRight: true },
  { x: 390, y: 800, facingRight: false },
  { x: 800, y: 1157, facingRight: false },
  { x: 200, y: 1738, facingRight: false }
]

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
const continueBtn = document.createElement('button')
continueBtn.textContent = 'Pause'
pauseOverlay.appendChild(continueBtn)
const restartStageBtn = document.createElement('button')
restartStageBtn.textContent = 'Restart Stage'
pauseOverlay.appendChild(restartStageBtn)
const restartGameBtn = document.createElement('button')
restartGameBtn.textContent = 'Restart Game'
pauseOverlay.appendChild(restartGameBtn)
const controlsLegend = document.createElement('div')
controlsLegend.style.marginTop = '20px'
controlsLegend.style.fontSize = '18px'
controlsLegend.innerHTML = `
  <p>↑ ↓ ← → : Move</p>
  <p>1 2 3    : Attack</p>
  <p>Esc      : Pause / Continue</p>
`
pauseOverlay.appendChild(controlsLegend)
gameContainer.appendChild(pauseOverlay)

function togglePause() {
  isPaused = !isPaused
  pauseOverlay.style.display = isPaused ? 'flex' : 'none'
  continueBtn.textContent = isPaused ? 'Continue' : 'Pause'
  if (isPaused) {
    lastTimestamp = 0
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

function restartStage() {
  lastTimestamp = 0
  isPaused = false
  pauseOverlay.style.display = 'none'
  continueBtn.textContent = 'Pause'
  const s = stageStarts[currentStage]
  playerX = s.x
  playerY = s.y
  velocityY = 0
  onGround = false
  facingRight = s.facingRight
  setPlayerState('idle2')
  cameraX = cameraY = 0
  updateCamera()
  removeEnemiesForStage(currentStage)
  removeCoinsForStage()
  spawnEnemiesForStage(currentStage)
  spawnCoinsForStage(currentStage)
  score = 0
  hasKey = false
  const keyUI = document.getElementById('ui-key')
  if (keyUI) keyUI.remove()
  updateHealthUI()
  updateScoreUI()
}

function restartGame() {
  lastTimestamp = 0
  isPaused = false
  pauseOverlay.style.display = 'none'
  continueBtn.textContent = 'Pause'
  while (heartsContainer.firstChild) {
    heartsContainer.removeChild(heartsContainer.firstChild);
  }
  for (let i = 0; i < 3; i++) {
    const heart = document.createElement('span');
    heart.className = 'heart';
    heart.textContent = '❤️';
    heartsContainer.appendChild(heart);
  }
  removeEnemiesForStage(currentStage)
  removeCoinsForStage()
  currentStage = 0
  score = 0
  hasKey = false
  playerHearts = 3
  playerHealth = playerMaxHealth
  console.log(`restartGame: playerHearts set to ${playerHearts}`);

  const keyUI = document.getElementById('ui-key')
  if (keyUI) keyUI.remove()

  updateScoreUI()
  updateHealthUI()
  restartStage()
}
const endOverlay = document.createElement('div')
endOverlay.className = 'pause-overlay'
endOverlay.style.display = 'none'
endOverlay.innerHTML = `
  <h1>🎉 You Win! 🎉</h1>
  <button id="play-again-btn">Play Again</button>
`
gameContainer.appendChild(endOverlay)

document.getElementById('play-again-btn').addEventListener('click', () => {
  endOverlay.style.display = 'none'
  restartGame()
  pauseOverlay.appendChild(continueBtn)
  pauseOverlay.appendChild(restartStageBtn)
  pauseOverlay.appendChild(restartGameBtn)
  pauseOverlay.appendChild(controlsLegend)

})
const touchControls = document.createElement('div')
touchControls.className = 'touch-controls'
Object.assign(touchControls.style, {
  position: 'fixed',
  bottom: '10px',
  left: '0',
  width: '100%',
  display: 'flex',
  justifyContent: 'space-between',
  zIndex: '100',
  pointerEvents: 'none'
})

const movementButtons = document.createElement('div')
movementButtons.style.display = 'flex'
movementButtons.style.gap = '10px'
movementButtons.style.marginLeft = '10px'
movementButtons.style.pointerEvents = 'auto'

const leftButton = document.createElement('button')
leftButton.textContent = '←'
leftButton.className = 'touch-button'
Object.assign(leftButton.style, {
  width: '60px',
  height: '60px',
  fontSize: '24px',
  backgroundColor: 'rgba(255, 255, 255, 0.7)',
  border: '2px solid #000',
  borderRadius: '10px',
  cursor: 'pointer'
})

const rightButton = document.createElement('button')
rightButton.textContent = '→'
rightButton.className = 'touch-button'
Object.assign(rightButton.style, {
  width: '60px',
  height: '60px',
  fontSize: '24px',
  backgroundColor: 'rgba(255, 255, 255, 0.7)',
  border: '2px solid #000',
  borderRadius: '10px',
  cursor: 'pointer'
})

movementButtons.appendChild(leftButton)
movementButtons.appendChild(rightButton)

const actionButtons = document.createElement('div')
actionButtons.style.display = 'flex'
actionButtons.style.flexDirection = 'column'
actionButtons.style.alignItems = 'flex-end'
actionButtons.style.gap = '10px'
actionButtons.style.marginRight = '10px'
actionButtons.style.pointerEvents = 'auto'

const topRow = document.createElement('div')
topRow.style.display = 'flex'
topRow.style.gap = '10px'

const bottomRow = document.createElement('div')
bottomRow.style.display = 'flex'
bottomRow.style.gap = '10px'

const jumpButton = document.createElement('button')
jumpButton.textContent = '↑'
jumpButton.className = 'touch-button'
Object.assign(jumpButton.style, {
  width: '60px',
  height: '60px',
  fontSize: '24px',
  backgroundColor: 'rgba(255, 255, 255, 0.7)',
  border: '2px solid #000',
  borderRadius: '10px',
  cursor: 'pointer'
})

const attack1Button = document.createElement('button')
attack1Button.textContent = '1'
attack1Button.className = 'touch-button'
Object.assign(attack1Button.style, {
  width: '60px',
  height: '60px',
  fontSize: '24px',
  backgroundColor: 'rgba(255, 100, 100, 0.7)',
  border: '2px solid #000',
  borderRadius: '10px',
  cursor: 'pointer'
})

const attack2Button = document.createElement('button')
attack2Button.textContent = '2'
attack2Button.className = 'touch-button'
Object.assign(attack2Button.style, {
  width: '60px',
  height: '60px',
  fontSize: '24px',
  backgroundColor: 'rgba(255, 100, 100, 0.7)',
  border: '2px solid #000',
  borderRadius: '10px',
  cursor: 'pointer'
})

const attack3Button = document.createElement('button')
attack3Button.textContent = '3'
attack3Button.className = 'touch-button'
Object.assign(attack3Button.style, {
  width: '60px',
  height: '60px',
  fontSize: '24px',
  backgroundColor: 'rgba(255, 100, 100, 0.7)',
  border: '2px solid #000',
  borderRadius: '10px',
  cursor: 'pointer'
})

const pauseButton = document.createElement('button')
pauseButton.textContent = 'Pause'
pauseButton.className = 'touch-button'
Object.assign(pauseButton.style, {
  width: '80px',
  height: '60px',
  fontSize: '18px',
  backgroundColor: 'rgba(100, 100, 255, 0.7)',
  border: '2px solid #000',
  borderRadius: '10px',
  cursor: 'pointer'
})

topRow.appendChild(jumpButton)
topRow.appendChild(pauseButton)

bottomRow.appendChild(attack1Button)
bottomRow.appendChild(attack2Button)
bottomRow.appendChild(attack3Button)

actionButtons.appendChild(topRow)
actionButtons.appendChild(bottomRow)

touchControls.appendChild(movementButtons)
touchControls.appendChild(actionButtons)
gameContainer.appendChild(touchControls)

// Add event listeners for touch controls
leftButton.addEventListener('touchstart', (e) => {
  e.preventDefault()
  keysPressed['ArrowLeft'] = true
}, { passive: false })

leftButton.addEventListener('touchend', (e) => {
  e.preventDefault()
  keysPressed['ArrowLeft'] = false
}, { passive: false })

rightButton.addEventListener('touchstart', (e) => {
  e.preventDefault()
  keysPressed['ArrowRight'] = true
}, { passive: false })

rightButton.addEventListener('touchend', (e) => {
  e.preventDefault()
  keysPressed['ArrowRight'] = false
}, { passive: false })

jumpButton.addEventListener('touchstart', (e) => {
  e.preventDefault()
  keysPressed['ArrowUp'] = true
}, { passive: false })

jumpButton.addEventListener('touchend', (e) => {
  e.preventDefault()
  keysPressed['ArrowUp'] = false
}, { passive: false })

attack1Button.addEventListener('touchstart', (e) => {
  e.preventDefault()
  if (!isAttacking) startAttack('attack1')
}, { passive: false })

attack2Button.addEventListener('touchstart', (e) => {
  e.preventDefault()
  if (!isAttacking) startAttack('attack2')
}, { passive: false })

attack3Button.addEventListener('touchstart', (e) => {
  e.preventDefault()
  if (!isAttacking) startAttack('attack3')
}, { passive: false })

pauseButton.addEventListener('touchstart', (e) => {
  e.preventDefault()
  togglePause()
}, { passive: false })

function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}
if (isMobileDevice()) {
  touchControls.style.display = 'flex'
} else {
  touchControls.style.display = 'none'
}

function worldToScreen(x, y) {
  return {
    x: x - cameraX,
    y: y - cameraY
  }
}

const camera = document.querySelector('.camera')
const world = document.querySelector('.world')
const cameraWidth = 2304
const cameraHeight = 576
let cameraX = 0
let cameraY = 0
const zoomLevel = 2

function updateCamera() {
  const viewportWidth = 800
  const viewportHeight = 576
  const worldWidth = 2304
  const targetX = playerX + (hitboxWidth / 2) - (viewportWidth / 2)
  const targetY = playerY + (hitboxHeight / 2) - (viewportHeight / 2)
  cameraX += (targetX - cameraX) * 0.1
  cameraY += (targetY - cameraY) * 0.1
  cameraX = Math.max(0, Math.min(cameraX, worldWidth))
  const stageTop = currentStage * viewportHeight
  cameraY = stageTop
  world.style.transform = `translate(${-cameraX}px, ${-cameraY}px)`
}

const coinSpawnData = {
  0: [
    { x: 300, y: 80 }, { x: 320, y: 75 }, { x: 340, y: 80 },
    { x: 840, y: 210 }, { x: 820, y: 200 }, { x: 800, y: 200 },
    { x: 750, y: 500 }, { x: 780, y: 505 }, { x: 810, y: 510 },
    { x: 1100, y: 500 }, { x: 1080, y: 505 }, { x: 1060, y: 510 },
    { x: 1600, y: 120 }, { x: 1620, y: 125 }, { x: 1640, y: 130 }
  ],
  1: [
    { x: 50, y: 80 + 576 }, { x: 320, y: 75 + 576 }, { x: 340, y: 80 + 576 },
    { x: 840, y: 210 + 576 }, { x: 820, y: 200 + 576 }, { x: 800, y: 200 + 576 },
    { x: 750, y: 500 + 576 }, { x: 780, y: 505 + 576 }, { x: 810, y: 510 + 576 },
    { x: 1100, y: 500 + 576 }, { x: 1080, y: 505 + 576 }, { x: 1060, y: 510 + 576 },
    { x: 1600, y: 120 + 576 }, { x: 1620, y: 125 + 576 }, { x: 1640, y: 130 + 576 }
  ],
  2: [
    { x: 300, y: 80 + 2 * 576 }, { x: 320, y: 75 + 2 * 576 }, { x: 340, y: 80 + 2 * 576 },
    { x: 840, y: 210 + 2 * 576 }, { x: 820, y: 200 + 2 * 576 }, { x: 800, y: 200 + 2 * 576 },
    { x: 750, y: 500 + 2 * 576 }, { x: 780, y: 505 + 2 * 576 }, { x: 810, y: 510 + 2 * 576 },
    { x: 1100, y: 500 + 2 * 576 }, { x: 1080, y: 505 + 2 * 576 }, { x: 1060, y: 510 + 2 * 576 },
    { x: 1600, y: 120 + 2 * 576 }, { x: 1620, y: 125 + 2 * 576 }, { x: 1640, y: 130 + 2 * 576 }
  ],
  3: [
    { x: 10, y: 80 + 3 * 576 }, { x: 320, y: 75 + 3 * 576 }, { x: 340, y: 80 + 3 * 576 },
    { x: 840, y: 210 + 3 * 576 }, { x: 820, y: 200 + 3 * 576 }, { x: 800, y: 200 + 3 * 576 },
    { x: 750, y: 500 + 3 * 576 }, { x: 780, y: 505 + 3 * 576 }, { x: 810, y: 510 + 3 * 576 },
    { x: 1100, y: 500 + 3 * 576 }, { x: 1080, y: 505 + 3 * 576 }, { x: 1060, y: 510 + 3 * 576 },
    { x: 1600, y: 120 + 3 * 576 }, { x: 1620, y: 125 + 3 * 576 }, { x: 1640, y: 130 + 3 * 576 }
  ]
}

let coins = []
let score = 0

function createCoin(x, y) {
  const coinEl = document.createElement('div')
  coinEl.className = 'coin'
  gameContainer.appendChild(coinEl)
  return { el: coinEl, x, y, collected: false }
}

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

function drawCoins() {
  coins.forEach(coin => {
    if (coin.collected) return
    const { x: sx, y: sy } = worldToScreen(coin.x, coin.y)
    coin.el.style.transform = `translate(${sx}px, ${sy}px)`
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

let isAttacking = false
let isHit = false
let isInvincible = false
const playerMaxHealth = 100
let playerHealth = playerMaxHealth
let playerHearts = 3

const healthBar = document.createElement('div')
healthBar.className = 'health-bar'
const healthFill = document.createElement('div')
healthFill.className = 'health-fill'
healthBar.appendChild(healthFill)
gameContainer.appendChild(healthBar)

const heartsContainer = document.createElement('div')
heartsContainer.className = 'hearts'
for (let i = 0; i < 3; i++) {
  const heart = document.createElement('span')
  heart.className = 'heart'
  heart.textContent = '❤️'
  heartsContainer.appendChild(heart)
}

gameContainer.appendChild(heartsContainer)

function updateHealthUI() {
  healthFill.style.width = `${(playerHealth / playerMaxHealth) * 100}%`
  const hearts = heartsContainer.children
  console.log(`updateHealthUI: playerHearts=${playerHearts}, hearts in DOM=${hearts.length}`);
  for (let i = 0; i < hearts.length; i++) {
    hearts[i].style.visibility = i < playerHearts ? 'visible' : 'hidden'
  }
}
updateHealthUI()

const scoreBoard = document.createElement('div')
scoreBoard.className = 'scoreboard'
scoreBoard.textContent = `Coins: 0`
gameContainer.appendChild(scoreBoard)

const coinsNeeded = 5
let hasKey = false

function updateScoreUI() {
  scoreBoard.textContent = `Coins: ${score}/${coinsNeeded}`
  const keyUI = document.getElementById('ui-key')
  if (score >= coinsNeeded && !keyUI) {
    hasKey = true
    const keyEl = document.createElement('img')
    keyEl.src = 'key.png'
    keyEl.alt = 'Key'
    keyEl.style.position = 'absolute'
    keyEl.style.top = '0px'
    keyEl.style.right = '-50px'
    keyEl.style.width = '32px'
    keyEl.style.height = '32px'
    keyEl.id = 'ui-key'
    scoreBoard.appendChild(keyEl)
  } else if (score < coinsNeeded && keyUI) {
    keyUI.remove()
    hasKey = false
  }
}

const enemyTypes = [
  { name: 'blueBall', frames: 10, type: 'fly', animSpeed: 200, scale: 0.5, moveSpeed: 0, spriteWidth: 64, spriteHeight: 64, hitboxWidth: 20, hitboxHeight: 10, hitboxOffsetX: 7, hitboxOffsetY: 16, health: 1, defeated: false },
  { name: 'greenRobot', frames: 26, type: 'walk', animSpeed: 100, scale: 0.5, moveSpeed: 1.0, spriteWidth: 64, spriteHeight: 64, hitboxWidth: 20, hitboxHeight: 20, hitboxOffsetX: 10, hitboxOffsetY: 3, health: 1, defeated: false },
  { name: 'robotBall', frames: 16, type: 'walk', animSpeed: 150, scale: 0.5, moveSpeed: 0, spriteWidth: 64, spriteHeight: 64, hitboxWidth: 40, hitboxHeight: 40, hitboxOffsetX: 7, hitboxOffsetY: 7, health: 1, defeated: false },
  { name: 'greenSnail', frames: 10, type: 'walk', animSpeed: 300, scale: 0.5, moveSpeed: 0.4, spriteWidth: 64, spriteHeight: 64, hitboxWidth: 20, hitboxHeight: 15, hitboxOffsetX: 3, hitboxOffsetY: 3, health: 1, defeated: false },
  { name: 'yellowBee', frames: 13, type: 'fly', animSpeed: 120, scale: 0.5, moveSpeed: 0.7, spriteWidth: 64, spriteHeight: 64, hitboxWidth: 20, hitboxHeight: 20, hitboxOffsetX: 8, hitboxOffsetY: 8, health: 1, defeated: false }
]

let enemies = []
let lastTimestamp = 0

function getColor(value) {
  switch (value) {
    case 1: return 'rgb(255, 0, 0)'
    case 2: return 'rgb(0, 255, 0)'
    case 3: return 'rgb(0, 0, 255)'
    case 7: return 'rgb(128, 0, 128)'
    case 4: return 'rgb(255, 255, 0)'
    case 8: return 'rgb(255, 165, 0)'
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

fetch('collisions.json')
  .then(response => response.ok ? response.json() : Promise.reject())
  .then(data => {
    collisions = data
    collisionsLoaded = true
    mapEl.style.height = (collisions.length * tileSize) + 'px'
    spawnEnemiesForStage(currentStage)
    spawnCoinsForStage(currentStage)
    if (debugMode) renderDebugTiles()
  })
  .catch(_ => {
    console.error("error fetching collisions.json")
    collisions = [[]]
    collisionsLoaded = true
    mapEl.style.height = (4 * 576) + 'px'
    spawnEnemiesForStage(currentStage)
  })

document.addEventListener('keydown', e => {
  if (e.key === '1' && !isAttacking) startAttack('attack1')
  else if (e.key === '2' && !isAttacking) startAttack('attack2')
  else if (e.key === '3' && !isAttacking) startAttack('attack3')
  else if (e.key === 'space' && !isAttacking) startAttack('attack3')
  else keysPressed[e.key] = true
})
document.addEventListener('keyup', e => keysPressed[e.key] = false)

function startAttack(attackType) {
  isAttacking = true
  setPlayerState(attackType)
  const delay = attackType === 'attack3' ? 300 : 100
  setTimeout(() => {
    if (isAttacking) applyAttackDamage()
  }, delay)
  player.addEventListener('animationend', () => {
    isAttacking = false
    updatePlayerState()
  }, { once: true })
}

function applyAttackDamage() {
  let attackHitboxX = playerX + hitboxOffsetX
  if (!facingRight) attackHitboxX -= (attackHitboxWidth - hitboxWidth)
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

function defeatEnemy(enemy) {
  enemy.defeated = true
  enemy.el.classList.remove(`enemy-${enemy.type.name}`)
  enemy.el.classList.add('enemy-explosion')
  if (debugMode && enemy.hitboxEl) enemy.hitboxEl.remove()
  enemy.el.addEventListener('animationend', () => {
    enemy.el.remove()
    enemies = enemies.filter(e => e !== enemy)
  }, { once: true })
}

function playerTakeDamage() {
  if (isInvincibleDebug || isInvincible || isDefeated) return
  playerHealth -= 20
  if (playerHealth <= 0) {
    playerHealth = 0
    playerHearts -= 1
    if (playerHearts <= 0) {
      playerHearts = 0
      updateHealthUI()
      defeatPlayer('game')
      return
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
    if (checkAABB(playerHitbox, enemyHitbox) && !isAttacking && !isInvincible) playerTakeDamage()
  })
}

function defeatPlayer(restartType) {
  if (isDefeated) return
  isDefeated = true
  isAttacking = false
  velocityY = 0
  for (const k in keysPressed) keysPressed[k] = false
  setPlayerState('ko')
  player.addEventListener('animationend', () => {
    if (playerState === 'ko') {
      isDefeated = false
      if (restartType === 'game') {
        playerHearts = 3
        restartGame()
      } else {
        restartStage()
      }
    }
  }, { once: true })
}

function checkAABB(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

function getEnemyHitbox(enemy) {
  const type = enemy.type
  const spriteW = type.spriteWidth || 64
  const spriteH = type.spriteHeight || 64
  const hbxW = type.hitboxWidth || spriteW * 0.7
  const hbxH = type.hitboxHeight || spriteH * 0.9
  const hitboxOffsetX = (spriteW - hbxW) / 2
  const hitboxOffsetY = spriteH - hbxH
  return {
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

function isSolidTile(x, y) {
  if (x < 0 || y < 0 || y >= collisions.length || x >= collisions[y]?.length) return false
  const tile = collisions[y][x]
  return [1, 2, 3, 7].includes(tile)
}

function pixelToTile(x, y) {
  return {
    x: Math.floor(x / tileSize),
    y: Math.floor(y / tileSize)
  }
}

function createEnemy(typeName, x, y) {
  const enemyData = enemyTypes.find(et => et.name === typeName)
  if (!enemyData) {
    console.error("404 I guess, enemy type not found", typeName)
    return null
  }
  const enemyEl = document.createElement('div')
  enemyEl.classList.add('enemy', `enemy-${enemyData.name}`)
  gameContainer.appendChild(enemyEl)
  const enemy = {
    el: enemyEl,
    x: x,
    y: y,
    prevX: x,
    prevY: y,
    type: enemyData,
    facingRight: false,
    scale: enemyData.scale || 0.5,
    timeAccumulator: Math.random() * 2000,
    flyAmplitude: 0,
    flyFrequency: 0,
    originalSpawnY: y,
    velocityY: 0,
    onGround: false,
    health: enemyData.health,
    defeated: false
  }
  if (enemy.type.type === 'fly') {
    enemy.flyAmplitude = enemyData.flyAmplitude !== undefined ? enemyData.flyAmplitude : (15 + Math.random() * 20)
    enemy.flyFrequency = enemyData.flyFrequency !== undefined ? enemyData.flyFrequency : (0.002 + Math.random() * 0.0015)
  }
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

function handleEnemyVerticalCollisions(enemy) {
  if (enemy.type.type !== 'walk' || !collisionsLoaded) return
  const enemyHitbox = getEnemyHitbox(enemy)
  const prevhitboxTopY = enemy.prevY + enemyHitbox.OffsetY
  const prevhitboxBottomY = enemy.prevY + enemyHitbox.spriteHeight
  enemy.velocityY += gravity
  enemy.y += enemy.velocityY
  let currentHitbox = getEnemyHitbox(enemy)
  let newOnGroundStatus = false
  const startRow = Math.max(0, Math.floor(currentHitbox.y / tileSize) - 1)
  const endRow = Math.min(collisions.length - 1, Math.floor((currentHitbox.y + currentHitbox.height) / tileSize) + 1)
  const startCol = Math.max(0, Math.floor(currentHitbox.x / tileSize) - 1)
  const endCol = Math.min((collisions[0]?.length || 0) - 1, Math.floor((currentHitbox.x + currentHitbox.width) / tileSize) + 1)
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const tileValue = collisions[r]?.[c]
      if (![1, 3, 7].includes(tileValue)) continue
      const tileRect = { x: c * tileSize, y: r * tileSize, width: tileSize, height: tileSize }
      if (checkAABB(currentHitbox, tileRect)) {
        if (enemy.velocityY >= 0 && prevhitboxBottomY <= tileRect.y + 1) {
          enemy.y = tileRect.y - enemyHitbox.spriteHeight
          enemy.velocityY = 0
          newOnGroundStatus = true
          currentHitbox = getEnemyHitbox(enemy)
        } else if (enemy.velocityY < 0 && tileValue !== 3 && prevhitboxTopY >= tileRect.y + tileRect.height - 1) {
          enemy.y = tileRect.y + tileRect.height - enemyHitbox.OffsetY
          enemy.velocityY = 0
          currentHitbox = getEnemyHitbox(enemy)
        }
      }
    }
  }
  enemy.onGround = newOnGroundStatus
}

function handleEnemyMovementAndCollisions(enemy) {
  if (enemy.type.type !== 'walk' || !enemy.onGround || enemy.type.moveSpeed === 0 || !collisionsLoaded) return
  enemy.prevX = enemy.x
  enemy.x += (enemy.facingRight ? 1 : -1) * enemy.type.moveSpeed
  let currentHitbox = getEnemyHitbox(enemy)
  let turnAround = false
  const solidTilesForWall = [2]
  const checkPointX = enemy.facingRight ? (currentHitbox.x + currentHitbox.width + 1) : (currentHitbox.x - 1)
  const startRow = Math.floor(currentHitbox.y / tileSize)
  const endRow = Math.floor((currentHitbox.y + currentHitbox.height) / tileSize)
  for (let r = startRow; r <= endRow; r++) {
    if (r < 0 || r >= collisions.length) continue
    const c = Math.floor(checkPointX / tileSize)
    if (c < 0 || c >= (collisions[0]?.length || 0)) {
      turnAround = true
      break
    }
    const tileValue = collisions[r]?.[c]
    if (solidTilesForWall.includes(tileValue)) {
      turnAround = true
      break
    }
  }
  if (!turnAround && enemy.onGround) {
    const footCheckX = currentHitbox.x + (enemy.facingRight ? currentHitbox.width + 2 : -2)
    const footCheckY = currentHitbox.y + currentHitbox.height + 5
    const groundTileCol = Math.floor(footCheckX / tileSize)
    const groundTileRow = Math.floor(footCheckY / tileSize)
    let groundExists = false
    if (groundTileRow >= 0 && groundTileRow < collisions.length && groundTileCol >= 0 && groundTileCol < (collisions[0]?.length || 0)) {
      const tileBelowFoot = collisions[groundTileRow]?.[groundTileCol]
      if ([1, 3, 7].includes(tileBelowFoot)) groundExists = true
    }
    if (!groundExists) turnAround = true
  }
  if (turnAround) {
    enemy.x = enemy.prevX
    enemy.facingRight = !enemy.facingRight
  }
}

function updateEnemyLogic(deltaTime) {
  enemies.forEach(enemy => {
    enemy.prevX = enemy.x
    enemy.prevY = enemy.y
    if (enemy.type.type === 'walk') {
      handleEnemyVerticalCollisions(enemy)
      handleEnemyMovementAndCollisions(enemy)
    } else if (enemy.type.type === 'fly') {
      enemy.timeAccumulator += deltaTime
      const flyOffset = enemy.flyAmplitude * Math.sin(enemy.timeAccumulator * enemy.flyFrequency)
      enemy.y = enemy.originalSpawnY + flyOffset
      if (enemy.type.moveSpeed > 0) {
        enemy.x += (enemy.facingRight ? 1 : -1) * enemy.type.moveSpeed
        const spriteW = enemy.type.spriteWidth || 64
        const mapPixelWidth = (collisions[0]?.length || 0) * tileSize
        if (enemy.x < 0) {
          enemy.x = 0
          enemy.facingRight = !enemy.facingRight
        } else if (enemy.x + spriteW > mapPixelWidth) {
          enemy.x = mapPixelWidth - spriteW
          enemy.facingRight = !enemy.facingRight
        }
      }
    }
    let finalScaleX = enemy.facingRight ? 1 : -1
    if (enemy.type.name !== 'greenSnail') finalScaleX *= -1
    const screenPos = worldToScreen(enemy.x, enemy.y)
    enemy.el.style.transform = `translate(${screenPos.x}px, ${screenPos.y}px) scaleX(${finalScaleX}) scale(${enemy.scale})`
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
    const hitbox = { x: playerX + hitboxOffsetX, y: playerY + hitboxOffsetY, width: hitboxWidth, height: hitboxHeight }
    const screenPos = worldToScreen(hitbox.x, hitbox.y)
    playerHitboxEl.style.left = `${screenPos.x}px`
    playerHitboxEl.style.top = `${screenPos.y}px`
    playerHitboxEl.style.width = `${hitbox.width}px`
    playerHitboxEl.style.height = `${hitbox.height}px`
  }
  if (debugMode && isAttacking) {
    let attackX = playerX + hitboxOffsetX
    if (!facingRight) attackX -= (attackHitboxWidth - hitboxWidth)
    const screenPos = worldToScreen(attackX, playerY + hitboxOffsetY)
    attackHitboxEl.style.left = `${screenPos.x}px`
    attackHitboxEl.style.top = `${screenPos.y}px`
    attackHitboxEl.style.width = `${attackHitboxWidth}px`
    attackHitboxEl.style.height = `${hitboxHeight}px`
    attackHitboxEl.style.display = 'block'
  } else if (debugMode) {
    attackHitboxEl.style.display = 'none'
  }
}

function handleVerticalCollisions() {
  const playerWorldY = playerY
  const rect = { x: playerX + hitboxOffsetX, y: playerWorldY + hitboxOffsetY, width: hitboxWidth, height: hitboxHeight }
  let newOnGround = false
  let playerIsCurrentlyOnDoor = false
  const startRow = Math.max(0, Math.floor(rect.y / tileSize) - 1)
  const endRow = Math.min(collisions.length - 1, Math.floor((rect.y + rect.height) / tileSize) + 1)
  const startCol = Math.max(0, Math.floor(rect.x / tileSize) - 1)
  const endCol = Math.min(collisions[0]?.length - 1, Math.floor((rect.x + rect.width) / tileSize) + 1)
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const v = collisions[r]?.[c]
      if (!v) continue
      const tile = { x: c * tileSize, y: r * tileSize, width: tileSize, height: tileSize }
      if (checkAABB(rect, tile)) {
        if (v === 8 && hasKey) {
          if (currentStage === stageStarts.length - 1) {
            removeCoinsForStage()
            removeEnemiesForStage()
            if (continueBtn.parentNode) continueBtn.remove()
            if (restartStageBtn.parentNode) restartStageBtn.remove()
            if (restartGameBtn.parentNode) restartGameBtn.remove()
            if (controlsLegend.parentNode) controlsLegend.remove()
            isPaused = true
            endOverlay.style.display = 'flex'
            return
          }
          playerIsCurrentlyOnDoor = true
          if (!justTransitioned) {
            transitionToNextStage()
            return
          }
        } else if ([1, 2, 7].includes(v)) {
          const prevPlayerWorldY = prevY
          if (velocityY >= 0 && prevPlayerWorldY + hitboxOffsetY + hitboxHeight <= tile.y + 0.5) {
            playerY = tile.y - hitboxHeight - hitboxOffsetY
            velocityY = 0
            newOnGround = true
          } else if (velocityY < 0 && prevPlayerWorldY + hitboxOffsetY >= tile.y + tile.height - 0.5) {
            playerY = tile.y + tile.height - hitboxOffsetY
            velocityY = 0
          }
        } else if (v === 3 && velocityY >= 0 && (prevY + hitboxOffsetY + hitboxHeight) <= tile.y + 0.5) {
          playerY = tile.y - hitboxHeight - hitboxOffsetY
          velocityY = 0
          newOnGround = true
        } else if (v === 4 && !isInvincible && !isInvincibleDebug) {
          playerHearts = Math.max(0, playerHearts - 1)
          updateHealthUI()
          if (playerHearts <= 0) {
            // If no hearts are left, it's a full game over
            defeatPlayer('game');
          } else {
            // Otherwise, it's just a stage restart
            defeatPlayer('stage');
          }
          return
        }
      }
    }
  }
  onGround = newOnGround
  if (!playerIsCurrentlyOnDoor && justTransitioned) justTransitioned = false
}

function handleHorizontalCollisions() {
  const playerWorldY = playerY
  const rect = { x: playerX + hitboxOffsetX, y: playerWorldY + hitboxOffsetY, width: hitboxWidth, height: hitboxHeight }
  const startRow = Math.max(0, Math.floor(rect.y / tileSize) - 1)
  const endRow = Math.min(collisions.length - 1, Math.floor((rect.y + rect.height) / tileSize) + 1)
  const startCol = Math.max(0, Math.floor(rect.x / tileSize) - 1)
  const endCol = Math.min(collisions[0]?.length - 1, Math.floor((rect.x + rect.width) / tileSize) + 1)
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      if (collisions[r]?.[c] === 2) {
        const tile = { x: c * tileSize, y: r * tileSize, width: tileSize, height: tileSize }
        if (checkAABB(rect, tile)) {
          if (playerX > prevX && prevX + hitboxOffsetX + hitboxWidth <= tile.x + 0.5) {
            playerX = tile.x - hitboxWidth - hitboxOffsetX
          } else if (playerX < prevX && prevX + hitboxOffsetX >= tile.x + tile.width - 0.5) {
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
  if (velocityY < 0) setPlayerState('jump')
  else if (velocityY > 0 && !onGround) setPlayerState('fall')
  else if (isMovingHorizontally && onGround) setPlayerState('run')
  else if (onGround) setPlayerState('idle2')
}

function renderPlayer() {
  const playerSize = 0.6
  player.style.transform = `translate(${playerX}px, ${playerY}px) scaleX(${facingRight ? 1 : -1}) scale(${playerSize})`
}

function transitionToNextStage() {
  if (currentStage < stageStarts.length - 1) {
    removeEnemiesForStage(currentStage)
    removeCoinsForStage(currentStage)
    score = 0
    hasKey = false
    const keyUI = document.getElementById('ui-key')
    if (keyUI) keyUI.remove()
    updateScoreUI()
    currentStage++
    playerX = stageStarts[currentStage].x
    playerY = stageStarts[currentStage].y
    velocityY = 0
    onGround = false
    mapEl.style.transform = `translateY(${-mapOffsetY}px)`
    justTransitioned = true
    spawnEnemiesForStage(currentStage)
    spawnCoinsForStage(currentStage)
    console.log(`Transitioned to stage ${currentStage}`)
  } else if (currentStage == stageStarts.length - 1) {
    removeEnemiesForStage(currentStage)
    justTransitioned = true
  }
}

const enemySpawnData = {
  0: [
    { type: 'blueBall', x: 1000, y: 1, active: false, facingLeft: true },
    { type: 'blueBall', x: 1300, y: 3, active: false, facingLeft: true },
    { type: 'greenRobot', x: 730, y: 130, active: false, facingLeft: false },
    { type: 'greenSnail', x: 400, y: 100, active: false, facingLeft: true },
    { type: 'yellowBee', x: 2000, y: 30, active: false, facingLeft: true },
    { type: 'yellowBee', x: 800, y: 30, active: false, facingLeft: true }
  ],
  1: [
    { type: 'greenRobot', x: 100, y: 576 + 200, active: false, facingLeft: true },
    { type: 'blueBall', x: 280, y: 576 + 94, active: false, facingLeft: true },
    { type: 'yellowBee', x: 450, y: 576 + 86, active: false, facingLeft: true },
    { type: 'greenRobot', x: 1000, y: 576 + 500, active: false, facingLeft: true },

  ],
  2: [
    { type: 'yellowBee', x: 150, y: (576 * 2) + 1300, active: false, facingLeft: true },
    { type: 'greenRobot', x: 500, y: (576 * 2) + 1352, active: false, facingLeft: true },
    { type: 'blueBall', x: 700, y: (576 * 2) + 1280, active: false, facingLeft: true },
    { type: 'greenSnail', x: 900, y: (576 * 2) + 1352, active: false, facingLeft: true }
  ],
  3: [
    { type: 'greenRobot', x: 200, y: (576 * 3) + 1928, active: false, facingLeft: true },
    { type: 'blueBall', x: 400, y: (576 * 3) + 1850, active: false, facingLeft: true },
    { type: 'yellowBee', x: 600, y: (576 * 3) + 1880, active: false, facingLeft: true },
    { type: 'robotBall', x: 800, y: (576 * 3) + 1928, active: false, facingLeft: true },
    { type: 'greenSnail', x: 1000, y: (576 * 3) + 1928, active: false, facingLeft: true }
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
  if (stageSpawns) stageSpawns.forEach(spawnData => { spawnData.active = false; spawnData.enemyRef = null })
  console.log(`Removed all enemies from stage ${stage}`)
}

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
    if (!isDefeated) { }
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
    renderPlayer()
    renderDebugElements()
    drawCoins()
  } else {
    pauseOverlay.style.display = 'flex'
  }
  requestAnimationFrame(gameLoop)
}

requestAnimationFrame(gameLoop)