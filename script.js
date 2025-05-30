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
//this is the size of one tile 16px * 16px
const tileSize = 16
//size of player and its hitbox
const spriteWidth = 96
const spriteHeight = 64
const hitboxWidth = 48
const hitboxHeight = 56
//this would change x and y values of hitbox relative to the player so it allows moving the hitbox and perfecting it now it's bottom center
const hitboxOffsetX = (spriteWidth - hitboxWidth) / 2
const hitboxOffsetY = spriteHeight - hitboxHeight
//now starting positions for player in each stage, 576 is the height of 1 stage so we move him on the y axis to next stage and we can specify his position which is helpful
const stageStarts = [
  { x: 50, y: 200 },
  { x: 100, y: 200 + 576 },
  { x: 150, y: 200 + 576 * 2 },
  { x: 200, y: 200 + 576 * 3 }
]

const enemyTypes = [
  //we'll define here an enemy object and it's properties 
  //name, frames(for css animation), type(walk/fly), scale(control size with transform : scale(n)), movespeed, sprite/hitbox width and height, and hitboxoffsetY and X for hitbox positioning...
  {
    name: 'blueBall', frames: 10, type: 'fly', animSpeed: 200, scale: 0.5, moveSpeed: 0,
    spriteWidth: 64, spriteHeight: 64, hitboxWidth: 50, hitboxHeight: 50,
    hitboxOffsetX: 7, hitboxOffsetY: 7
  },
  {
    name: 'greenRobot', frames: 26, type: 'walk', animSpeed: 100, scale: 0.5, moveSpeed: 1.0,
    spriteWidth: 64, spriteHeight: 64, hitboxWidth: 44, hitboxHeight: 58,
    hitboxOffsetX: 10, hitboxOffsetY: 3
  },
  {
    name: 'robotBall', frames: 16, type: 'walk', animSpeed: 150, scale: 0.5, moveSpeed: 0,
    spriteWidth: 64, spriteHeight: 64, hitboxWidth: 50, hitboxHeight: 50,
    hitboxOffsetX: 7, hitboxOffsetY: 7
  },
  {
    name: 'greenSnail', frames: 10, type: 'walk', animSpeed: 300, scale: 0.5, moveSpeed: 0.4,
    spriteWidth: 64, spriteHeight: 64, hitboxWidth: 58, hitboxHeight: 32,
    hitboxOffsetX: 3, hitboxOffsetY: 32
  },
  {
    name: 'yellowBee', frames: 13, type: 'fly', animSpeed: 120, scale: 0.5, moveSpeed: 0.7,
    spriteWidth: 64, spriteHeight: 64, hitboxWidth: 48, hitboxHeight: 48,
    hitboxOffsetX: 8, hitboxOffsetY: 8
  },
  {
    name: 'bigRobot', frames: 42, type: 'walk', animSpeed: 100, scale: 0.5, moveSpeed: 1.0,
    spriteWidth: 300, spriteHeight: 280,
    hitboxWidth: 280, hitboxHeight: 270,
    hitboxOffsetX: 10, hitboxOffsetY: 5
  }
]
//store the enemies that spawned
let enemies = []
//for delta time calculation
let lastTimestamp = 0

//this part is for debugging the collisions layer 
//get color returns all the colors we need depending on the value we enter from 1,2,3,4,7,8,0 these are based on the collision values I gave to each tile on the collisions.json
//next part render debug tiles just makes divs with those colors 

// function getColor(value) {
//   switch (value) {
//     case 1: return 'rgb(255, 0, 0)'   // Ground
//     case 2: return 'rgb(0, 255, 0)'   // Wall
//     case 3: return 'rgb(0, 0, 255)'   // One-way platform
//     case 7: return 'rgb(128, 0, 128)'  // Two-way platform
//     case 4: return 'rgb(255, 255, 0)'  // Hazard
//     case 8: return 'rgb(255, 165, 0)'  // Door
//     case 0: return 'transparent'
//     default: return 'rgba(200, 200, 200, 0.3)'
//   }
// }
// function renderDebugTiles() {
//   for (let y = 0; y < collisions.length; y++) {
//     for (let x = 0; x < collisions[y].length; x++) {
//       const value = collisions[y][x]
//       if (!value) continue
//       const tile = document.createElement('div')
//       tile.style.position = 'absolute'
//       tile.style.left = `${x * tileSize}px`
//       tile.style.top = `${y * tileSize}px`
//       tile.style.width = `${tileSize}px`
//       tile.style.height = `${tileSize}px`
//       tile.style.backgroundColor = getColor(value)
//       tile.style.pointerEvents = 'none'
//       tile.style.zIndex = '0'
//       mapEl.appendChild(tile)
//     }
//   }
// }

// criticalErrorOccurred = false
//fetch sends a get request and returns the response (as a promise)
fetch('collisions.json')
//if successful we go to the .then block, so there was a response whatever it is, it can be an error like 404 or anything
  .then(response => response.ok ? response.json() : Promise.reject())//now we check if response was ok 200-299 in this case we return response.json() which unmarshalls it if there's an error we create a promise and reject it
  //response was ok now we call response.json() data
  .then(data => {
    //store collisions array (2D because we generate each line in an array on the json)
    collisions = data
    collisionsLoaded = true
    mapEl.style.height = (collisions.length * tileSize) + 'px'
    spawnEnemiesForStage(currentStage)
    // renderDebugTiles()
  })
  //catches all errors from the ones that might happen in fetch or after the fetch is successfull
  .catch(_ => {
    console.error("error fetching collisions.json")
    collisions = [[]]
    collisionsLoaded = true
    mapEl.style.height = (4 * 576) + 'px'
    spawnEnemiesForStage(currentStage)
    // criticalErrorOccurred = true
  })
//event listeners for keys pressed down and released e is a keyboad event and e.key is a string ("arrowleft" / "arrowright" etc...)
document.addEventListener('keydown', e => keysPressed[e.key] = true)
document.addEventListener('keyup', e => keysPressed[e.key] = false)
//this part is a debug that shows all player states
// document.addEventListener('keydown', (e) => {
//   const playerEl = document.querySelector('.player')
//   switch (e.key) {
//     case '1': playerEl.className = 'player idle1'
// break
//     case '2': playerEl.className = 'player idle2'
// break
//     case '3': playerEl.className = 'player run'
// break
//     case '4': playerEl.className = 'player jump'
//  break
//     case '5': playerEl.className = 'player fall
//  break
//     case '6': playerEl.className = 'player attack1'
// break
//     case '7': playerEl.className = 'player attack2'
// break
//     case '8': playerEl.className = 'player attack3'
// break
//     case '9': playerEl.className = 'player hit'
// break
//     case '0': playerEl.className = 'player dizzy'
// break
//     case '.': playerEl.className = 'player ko'
// break
//   }
// })

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
  const type = enemy.type
  const spriteW = type.spriteWidth || 64 // Default if not specified
  const spriteH = type.spriteHeight || 64
  const hbxW = type.hitboxWidth || spriteW * 0.7// Default if not specified
  const hbxH = type.hitboxHeight || spriteH * 0.9 // Default if not specified

  // Hitbox is typically aligned to the bottom-center of the sprite frame.
  // hitboxOffsetX is distance from sprite's left edge to hitbox's left edge.
  const hitboxOffsetX = (spriteW - hbxW) / 2
  // hitboxOffsetY is distance from sprite's top edge to hitbox's top edge.
  const hitboxOffsetY = spriteH - hbxH // Assumes hitbox is at the bottom of the sprite frame

  return {
    x: enemy.x + hitboxOffsetX, // World X of hitbox top-left
    y: enemy.y + hitboxOffsetY, // World Y of hitbox top-left
    width: hbxW,
    height: hbxH,
    // Store raw offsets and sprite height for easier calculations later
    rawOffsetX: hitboxOffsetX,
    rawOffsetY: hitboxOffsetY,
    spriteHeight: spriteH, // Full height of the sprite
    spriteWidth: spriteW   // Full width of the sprite
  }
}

function resolveEnemyCollisions(enemy) {
  if (enemy.type.type !== 'walk') return //only walking enemies
  const hitbox = getEnemyHitbox(enemy)
  // const prevHitbox = getEnemyHitbox({
  //   x: enemy.prevX,
  //   y: enemy.prevY,
  //   type: enemy.type
  // })

  //vertical collisions
  const verticalCheck = checkCollisionDirections(hitbox, 'y')
  if (verticalCheck.collided) {
    if (verticalCheck.direction === 'down') {
      enemy.y = verticalCheck.tileY - enemy.type.hitboxHeight - enemy.type.hitboxOffsetY
      enemy.velocityY = 0
      enemy.onGround = true
    } else if (verticalCheck.direction === 'up') {
      enemy.y = verticalCheck.tileY + tileSize - enemy.type.hitboxOffsetY
      enemy.velocityY = 0
    }
  }

  //horizontal collisions
  const horizontalCheck = checkCollisionDirections(hitbox, 'x');
  if (horizontalCheck.collided) {
    if (horizontalCheck.direction === 'right') {
      enemy.x = horizontalCheck.tileX - enemy.type.hitboxWidth - enemy.type.hitboxOffsetX
      enemy.facingRight = false
    } else if (horizontalCheck.direction === 'left') {
      enemy.x = horizontalCheck.tileX + tileSize - enemy.type.hitboxOffsetX
      enemy.facingRight = true
    }
  }

  //ledge detection
  if (enemy.onGround && enemy.type.moveSpeed > 0) {
    const checkX = enemy.facingRight ?
      hitbox.right + 5 :
      hitbox.left - 5
    const checkY = hitbox.bottom + 5

    const tile = pixelToTile(checkX, checkY)
    if (!isSolidTile(tile.x, tile.y)) {
      enemy.facingRight = !enemy.facingRight
    }
  }
}

function checkCollisionDirections(hitbox, axis) {
  const results = {
    collided: false,
    direction: null,
    tileX: 0,
    tileY: 0
  }

  const startX = Math.floor(hitbox.left / tileSize)
  const endX = Math.floor(hitbox.right / tileSize)
  const startY = Math.floor(hitbox.top / tileSize)
  const endY = Math.floor(hitbox.bottom / tileSize)

  for (let y = startY; y <= endY; y++) {
    for (let x = startX; x <= endX; x++) {
      if (!isSolidTile(x, y)) continue;

      const tile = {
        left: x * tileSize,
        right: (x + 1) * tileSize,
        top: y * tileSize,
        bottom: (y + 1) * tileSize
      }

      if (checkAABB(hitbox, tile)) {
        results.collided = true;
        results.tileX = x * tileSize
        results.tileY = y * tileSize

        if (axis === 'y') {
          const overlapY = hitbox.top < tile.top ?
            tile.top - hitbox.bottom :
            hitbox.top - tile.bottom
          results.direction = hitbox.top < tile.top ? 'down' : 'up'
        } else {
          const overlapX = hitbox.left < tile.left ?
            tile.left - hitbox.right :
            hitbox.left - tile.right
          results.direction = hitbox.left < tile.left ? 'right' : 'left'
        }
        return results;
      }
    }
  }
  return results
}

function isSolidTile(x, y) {
  if (y >= collisions.length || x >= collisions[y].length) return false
  const tile = collisions[y][x]
  return [1, 2, 3, 7].includes(tile)
}

function pixelToTile(x, y) {
  return {
    x: Math.floor(x / tileSize),
    y: Math.floor(y / tileSize)
  }
}

function updateEnemyLogic(deltaTime) {
  enemies.forEach(enemy => {
    enemy.prevX = enemy.x;
    enemy.prevY = enemy.y;

    // Apply physics to walking enemies
    if (enemy.type.type === 'walk') {
      if (!enemy.onGround) {
        enemy.velocityY += gravity
        enemy.y += enemy.velocityY
      }

      enemy.x += enemy.facingRight ?
        enemy.type.moveSpeed :
        -enemy.type.moveSpeed
    }

    // Handle flying enemy movement
    if (enemy.type.type === 'fly') {
      enemy.timeAccumulator += deltaTime
      enemy.y = enemy.originalSpawnY +
        Math.sin(enemy.timeAccumulator * 0.002) * enemy.flyAmplitude;

      enemy.x += enemy.facingRight ?
        enemy.type.moveSpeed :
        -enemy.type.moveSpeed
    }

    resolveEnemyCollisions(enemy)
    updateEnemyVisuals(enemy)
  })
}

function updateEnemyVisuals(enemy) {
  const screenY = enemy.y - mapOffsetY
  enemy.el.style.transform = `
    translate(${enemy.x}px, ${screenY}px)
    scaleX(${enemy.facingRight ? 1 : -1})
    scale(${enemy.type.scale})
  `
}

// --- ENEMY FUNCTIONS ---
function createEnemy(typeName, x, y) {
  const enemyData = enemyTypes.find(et => et.name === typeName)
  if (!enemyData) {
    console.error("Unknown enemy type:", typeName)
    return null
  }
  const enemyEl = document.createElement('div');
  enemyEl.classList.add('enemy', `enemy-${enemyData.name}`)
  gameContainer.appendChild(enemyEl)
  const enemy = {
    el: enemyEl,
    x: x, // World x, top-left of sprite
    y: y, // World y, top-left of sprite
    prevX: x, // For collision response logic
    prevY: y, // For collision response logic
    type: enemyData,
    facingRight: Math.random() < 0.5, // Default, can be overridden by spawnData
    scale: enemyData.scale || 1.0,
    timeAccumulator: Math.random() * 2000, // For animations or timed behaviors

    // Flying enemy specific properties
    flyAmplitude: 0,
    flyFrequency: 0,
    originalSpawnY: y, // Base Y for oscillation if flying

    // Walking enemy specific properties
    velocityY: 0,
    onGround: false // Will be determined by gravity and collisions
  }

  if (enemy.type.type === 'fly') {
    // Use specific values from enemyData if present, otherwise use defaults
    enemy.flyAmplitude = enemyData.flyAmplitude !== undefined ? enemyData.flyAmplitude : (15 + Math.random() * 20);
    enemy.flyFrequency = enemyData.flyFrequency !== undefined ? enemyData.flyFrequency : (0.002 + Math.random() * 0.0015);
  }
  // For walking enemies, onGround starts false; handleEnemyVerticalCollisions will manage it.

  return enemy
}
function handleEnemyVerticalCollisions(enemy) {
  if (enemy.type.type !== 'walk' || !collisionsLoaded) return

  const enemyHitboxInfo = getEnemyHitbox(enemy) // Hitbox definition based on PREVIOUS enemy.y

  // Store previous Y position of the hitbox's TOP for accurate ceiling collision detection
  // enemy.prevY is the sprite's top Y. enemyHitboxInfo.rawOffsetY is offset from sprite top to hitbox top.
  const prevHitboxActualTopY = enemy.prevY + enemyHitboxInfo.rawOffsetY;
  const prevHitboxActualBottomY = enemy.prevY + enemyHitboxInfo.spriteHeight;


  // Apply gravity if not on ground (or to re-check if still on ground)
  // For walking enemies, they are always subject to gravity unless explicitly on ground.
  enemy.velocityY += gravity
  enemy.y += enemy.velocityY

  let currentHitbox = getEnemyHitbox(enemy) // Recalculate with new enemy.y
  let newOnGroundStatus = false

  // Define search area for collision tiles
  const startRow = Math.max(0, Math.floor(currentHitbox.y / tileSize) - 1)
  const endRow = Math.min(collisions.length - 1, Math.floor((currentHitbox.y + currentHitbox.height) / tileSize) + 1)
  const startCol = Math.max(0, Math.floor(currentHitbox.x / tileSize) - 1)
  const endCol = Math.min((collisions[0]?.length || 0) - 1, Math.floor((currentHitbox.x + currentHitbox.width) / tileSize) + 1)

  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const tileValue = collisions[r]?.[c];
      // Tiles that block vertical movement: 1 (Ground), 3 (One-way platform - from top), 7 (Two-way platform)
      if (![1, 3, 7].includes(tileValue)) continue;

      const tileRect = { x: c * tileSize, y: r * tileSize, width: tileSize, height: tileSize }

      if (checkAABB(currentHitbox, tileRect)) {
        // --- Landing on a surface (moving down or was on ground) ---
        if (enemy.velocityY >= 0) {
          // Condition: Enemy's previous bottom was at or above the tile's top surface.
          // This ensures we only collide when crossing the boundary downwards.
          if (prevHitboxActualBottomY <= tileRect.y + 1) { // +1 for small tolerance
            // Landed on the tile. Align bottom of SPRITE with top of tile.
            enemy.y = tileRect.y - enemyHitboxInfo.spriteHeight;
            enemy.velocityY = 0;
            newOnGroundStatus = true;
            currentHitbox = getEnemyHitbox(enemy); // Update hitbox after position correction
          }
        }
        // --- Hitting a ceiling (moving up) ---
        // One-way platforms (type 3) should not act as ceilings.
        else if (enemy.velocityY < 0 && tileValue !== 3) {
          // Condition: Enemy's previous top was at or below the tile's bottom surface.
          if (prevHitboxActualTopY >= tileRect.y + tileRect.height - 1) { // -1 for tolerance
            // Hit a ceiling. Align top of HITBOX with bottom of tile.
            enemy.y = tileRect.y + tileRect.height - enemyHitboxInfo.rawOffsetY
            enemy.velocityY = 0
            currentHitbox = getEnemyHitbox(enemy) // Update hitbox after position correction
          }
        }
      }
    }
  }
  enemy.onGround = newOnGroundStatus
}


function handleEnemyMovementAndCollisions(enemy, deltaTime) {
  if (enemy.type.type !== 'walk' || !enemy.onGround || enemy.type.moveSpeed === 0 || !collisionsLoaded) {
    // Walking enemies only move horizontally if on the ground and have speed.
    return
  }

  enemy.prevX = enemy.x // Store X before this frame's horizontal movement

  enemy.x += (enemy.facingRight ? 1 : -1) * enemy.type.moveSpeed
  let currentHitbox = getEnemyHitbox(enemy) // Hitbox after speculative horizontal move

  let turnAround = false
  const solidTilesForWall = [1, 2] // Ground and Walls act as horizontal barriers

  // 1. Wall/Obstacle Collision Check
  // Check a point slightly ahead of the hitbox's leading edge, across its height.
  const checkPointX = enemy.facingRight ? (currentHitbox.x + currentHitbox.width + 1) : (currentHitbox.x - 1)
  const startRow = Math.floor(currentHitbox.y / tileSize)
  const endRow = Math.floor((currentHitbox.y + currentHitbox.height - 1) / tileSize) // -1 to stay within hitbox

  for (let r = startRow; r <= endRow; r++) {
    if (r < 0 || r >= collisions.length) continue
    const c = Math.floor(checkPointX / tileSize)
    if (c < 0 || c >= (collisions[0]?.length || 0)) { // Out of map bounds
      turnAround = true // Turn if about to walk off map edge
      break
    }
    const tileValue = collisions[r]?.[c]
    if (solidTilesForWall.includes(tileValue)) {
      turnAround = true
      break
    }
  }

  // 2. Ledge Detection (if not already turning due to a wall)
  if (!turnAround && enemy.onGround) {
    // Check the tile just in front of and below the enemy's leading foot.
    const footCheckX = currentHitbox.x + (enemy.facingRight ? currentHitbox.width + 2 : -2); // Slightly ahead of hitbox edge
    const footCheckY = currentHitbox.y + currentHitbox.height + 5; // 5px below the hitbox bottom

    const groundTileCol = Math.floor(footCheckX / tileSize);
    const groundTileRow = Math.floor(footCheckY / tileSize);

    let groundExistsAhead = false;
    if (groundTileRow >= 0 && groundTileRow < collisions.length &&
      groundTileCol >= 0 && groundTileCol < (collisions[0]?.length || 0)) {
      const tileBelowFoot = collisions[groundTileRow]?.[groundTileCol];
      // Tiles considered as walkable ground for ledge detection: 1 (Ground), 3 (One-way), 7 (Two-way)
      if ([1, 3, 7].includes(tileBelowFoot)) {
        groundExistsAhead = true;
      }
    }
    if (!groundExistsAhead) {
      turnAround = true;
    }
  }

  // Apply turn around logic
  if (turnAround) {
    enemy.x = enemy.prevX; // Revert to X before movement to avoid partially entering wall/ledge
    enemy.facingRight = !enemy.facingRight;
  }
}

function updateEnemyLogic(deltaTime) {
  enemies.forEach(enemy => {
    // Store previous positions for accurate collision checking within the frame
    enemy.prevX = enemy.x;
    enemy.prevY = enemy.y;

    if (enemy.type.type === 'walk') {
      handleEnemyVerticalCollisions(enemy); // Handles gravity, landing, ceiling hits
      handleEnemyMovementAndCollisions(enemy, deltaTime); // Handles horizontal walking, wall/ledge turning
    } else if (enemy.type.type === 'fly') {
      // Basic flying logic (oscillation)
      enemy.timeAccumulator += deltaTime;
      const flyOffset = enemy.flyAmplitude * Math.sin(enemy.timeAccumulator * enemy.flyFrequency);
      enemy.y = enemy.originalSpawnY + flyOffset; // Oscillate around original spawn Y

      // Example: Horizontal movement for flying types like 'yellowBee'
      if (enemy.type.moveSpeed > 0) { // Any flying enemy with moveSpeed > 0
        enemy.x += (enemy.facingRight ? 1 : -1) * enemy.type.moveSpeed;
        // Simple boundary check to turn flying enemies at map edges
        const spriteW = enemy.type.spriteWidth || 64;
        const mapPixelWidth = (collisions[0]?.length || 0) * tileSize;
        if (enemy.x < 0) {
          enemy.x = 0;
          enemy.facingRight = !enemy.facingRight;
        } else if (enemy.x + spriteW > mapPixelWidth) {
          enemy.x = mapPixelWidth - spriteW;
          enemy.facingRight = !enemy.facingRight;
        }
      }
    }

    // Update visual position based on world coordinates and map offset
    let targetScreenX = enemy.x; // enemy.x is already world coordinate
    let targetScreenY = enemy.y - mapOffsetY; // Adjust world Y by map offset for screen Y

    enemy.el.style.transform = `translate(${targetScreenX}px, ${targetScreenY}px) scaleX(${enemy.facingRight ? 1 : -1}) scale(${enemy.scale})`;
  });
}
// --- COLLISION HANDLING (Player) ---
function handleVerticalCollisions() {
  const playerWorldY = playerY + mapOffsetY;
  const rect = {
    x: playerX + hitboxOffsetX,
    y: playerWorldY + hitboxOffsetY,
    width: hitboxWidth,
    height: hitboxHeight
  };
  let newOnGround = false;
  let playerIsCurrentlyOnDoor = false;

  const startRow = Math.max(0, Math.floor(rect.y / tileSize) - 1);
  const endRow = Math.min(collisions.length - 1, Math.floor((rect.y + rect.height) / tileSize) + 1);
  const startCol = Math.max(0, Math.floor(rect.x / tileSize) - 1);
  const endCol = Math.min(collisions[0]?.length - 1, Math.floor((rect.x + rect.width) / tileSize) + 1);

  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const v = collisions[r]?.[c];
      if (!v) continue;
      const tile = { x: c * tileSize, y: r * tileSize, width: tileSize, height: tileSize };

      if (checkAABB(rect, tile)) {
        if (v === 8) {
          playerIsCurrentlyOnDoor = true;
          if (!justTransitioned) {
            transitionToNextStage();
            return;
          }
        } else if ([1, 2, 7].includes(v)) {
          const prevPlayerWorldY = prevY + mapOffsetY;
          if (velocityY >= 0 && prevPlayerWorldY + hitboxOffsetY + hitboxHeight <= tile.y + 0.5) {
            playerY = tile.y - hitboxHeight - hitboxOffsetY - mapOffsetY;
            velocityY = 0;
            newOnGround = true;
          } else if (velocityY < 0 && prevPlayerWorldY + hitboxOffsetY >= tile.y + tile.height - 0.5) {
            playerY = tile.y + tile.height - hitboxOffsetY - mapOffsetY;
            velocityY = 0;
          }
        } else if (v === 3 && velocityY >= 0 && (prevY + mapOffsetY + hitboxOffsetY + hitboxHeight) <= tile.y + 0.5) {
          playerY = tile.y - hitboxHeight - hitboxOffsetY - mapOffsetY;
          velocityY = 0;
          newOnGround = true;
        }
      }
    }
  }
  onGround = newOnGround;
  if (!playerIsCurrentlyOnDoor && justTransitioned) {
    justTransitioned = false;
  }
}

function handleHorizontalCollisions() {
  const playerWorldY = playerY + mapOffsetY;
  const rect = {
    x: playerX + hitboxOffsetX,
    y: playerWorldY + hitboxOffsetY,
    width: hitboxWidth,
    height: hitboxHeight
  };
  const startRow = Math.max(0, Math.floor(rect.y / tileSize) - 1);
  const endRow = Math.min(collisions.length - 1, Math.floor((rect.y + rect.height) / tileSize) + 1);
  const startCol = Math.max(0, Math.floor(rect.x / tileSize) - 1);
  const endCol = Math.min(collisions[0]?.length - 1, Math.floor((rect.x + rect.width) / tileSize) + 1);

  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      if (collisions[r]?.[c] === 2) {
        const tile = { x: c * tileSize, y: r * tileSize, width: tileSize, height: tileSize };
        if (checkAABB(rect, tile)) {
          if (playerX > prevX && prevX + hitboxOffsetX + hitboxWidth <= tile.x + 0.5) {
            playerX = tile.x - hitboxWidth - hitboxOffsetX;
          } else if (playerX < prevX && prevX + hitboxOffsetX >= tile.x + tile.width - 0.5) {
            playerX = tile.x + tile.width - hitboxOffsetX;
          }
        }
      }
    }
  }
}

function transitionToNextStage() {
  if (currentStage < stageStarts.length - 1) {
    removeEnemiesForStage(currentStage); // Remove enemies from current stage

    currentStage++
    mapOffsetY = 576 * currentStage
    playerX = stageStarts[currentStage].x
    playerY = stageStarts[currentStage].y - mapOffsetY
    velocityY = 0
    onGround = false
    mapEl.style.transform = `translateY(${-mapOffsetY}px)`
    justTransitioned = true

    spawnEnemiesForStage(currentStage) // Spawn enemies for new stage

    console.log(`Transitioned to stage ${currentStage}, mapOffsetY: ${mapOffsetY}`)
  }
}

function updatePlayerState() {
  const isMovingHorizontally = keysPressed['ArrowLeft'] || keysPressed['ArrowRight']
  if (velocityY < -1) setPlayerState('jump')
  else if (velocityY > 2 && !onGround) setPlayerState('fall')
  else if (isMovingHorizontally && onGround) setPlayerState('run')
  else if (onGround) setPlayerState('idle2')
}

const enemySpawnData = {
  0: [
    { type: 'blueBall', x: 150, y: 130, triggerX: 100, active: false },
    { type: 'greenRobot', x: 100, y: 205, triggerX: 180, active: false },
    { type: 'robotBall', x: 350, y: 200, triggerX: 300, active: false },
    { type: 'greenSnail', x: 480, y: 200, triggerX: 430, active: false, facingLeft: true },
    { type: 'yellowBee', x: 600, y: 150, triggerX: 550, active: false },
    { type: 'bigRobot', x: 1000, y: 1352, active: false, facingLeft: true }


  ],
  1: [
    { type: 'greenRobot', x: 120, y: 776, triggerX: 80, active: false },
    { type: 'blueBall', x: 280, y: 700, triggerX: 230, active: false },
    { type: 'yellowBee', x: 450, y: 720, triggerX: 400, active: false },
    { type: 'robotBall', x: 650, y: 776, triggerX: 600, active: false },
    { type: 'greenSnail', x: 850, y: 776, triggerX: 800, active: false },
  ],
  2: [
    { type: 'yellowBee', x: 150, y: 1300, triggerX: 100, active: false },
    { type: 'robotBall', x: 300, y: 1352, triggerX: 250, active: false },
    { type: 'greenRobot', x: 500, y: 1352, triggerX: 450, active: false },
    { type: 'blueBall', x: 700, y: 1280, triggerX: 650, active: false },
    { type: 'greenSnail', x: 900, y: 1352, triggerX: 850, active: false },
    { type: 'bigRobot', x: 1000, y: 1352, active: false, facingLeft: true }

  ],
  3: [
    { type: 'greenRobot', x: 200, y: 1928, triggerX: 150, active: false },
    { type: 'blueBall', x: 400, y: 1850, triggerX: 350, active: false },
    { type: 'yellowBee', x: 600, y: 1880, triggerX: 550, active: false },
    { type: 'robotBall', x: 800, y: 1928, triggerX: 750, active: false },
    { type: 'greenSnail', x: 1000, y: 1928, triggerX: 950, active: false },
  ]
}
// --- ENEMY SPAWNING BY STAGE ---
function spawnEnemiesForStage(stage) {
  const stageSpawns = enemySpawnData[stage]
  if (!stageSpawns) return

  stageSpawns.forEach(spawnData => {
    const enemy = createEnemy(spawnData.type, spawnData.x, spawnData.y)
    if (enemy) {
      if (spawnData.facingLeft !== undefined) {
        enemy.facingRight = !spawnData.facingLeft
      }
      enemy.stage = stage // Track which stage this enemy belongs to
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
      if (enemy.el && enemy.el.parentNode) {
        enemy.el.parentNode.removeChild(enemy.el)
      }
      return false // Remove from array
    }
    return true // Keep in array
  })

  const stageSpawns = enemySpawnData[stage]
  if (stageSpawns) {
    stageSpawns.forEach(spawnData => {
      spawnData.active = false;
      spawnData.enemyRef = null;
    });
  }
  console.log(`Removed all enemies from stage ${stage}`);
}

// --- GAME LOOP ---
function gameLoop(timestamp) {
  if (!collisionsLoaded) {
    requestAnimationFrame(gameLoop)
    return
  }
  if (lastTimestamp === 0) lastTimestamp = timestamp
  const deltaTime = timestamp - lastTimestamp
  lastTimestamp = timestamp

  prevX = playerX
  prevY = playerY

  if (keysPressed['ArrowLeft']) { playerX -= speed; facingRight = false}
  if (keysPressed['ArrowRight']) { playerX += speed; facingRight = true}
  if (keysPressed['ArrowUp'] && onGround) { velocityY = jumpStrength; onGround = false}

  if (!onGround) velocityY += gravity
  playerY += velocityY

  handleVerticalCollisions()
  handleHorizontalCollisions()
  updatePlayerState()
  updateEnemyLogic(deltaTime)

  const desiredscale = 0.6
  player.style.transform = `translate(${playerX}px, ${playerY}px) scaleX(${facingRight ? 1 : -1}) scale(${desiredscale})`

  requestAnimationFrame(gameLoop)
}

requestAnimationFrame(gameLoop)