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
//player attack and damage 
let isAttacking = false
let isHit = false
let isInvincible = false
const playerMaxHealth = 100
let playerHealth = playerMaxHealth
let playerHearts = 3
//health bar, lives
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

//update health ui
function updateHealthUI() {
  healthFill.style.width = `${(playerHealth / playerMaxHealth) * 100}%`
  const hearts = heartsContainer.children
  for (let i = 0; i < hearts.length; i++) {
    hearts[i].style.visibility = i < playerHearts ? 'visible' : 'hidden'
  }
}
updateHealthUI()

const enemyTypes = [
  //we'll define here an enemy object and it's properties 
  //name, frames(for css animation), type(walk/fly), scale(control size with transform : scale(n)), movespeed, sprite/hitbox width and height, and hitboxoffsetY and X for hitbox positioning...
  {
    name: 'blueBall', frames: 10, type: 'fly', animSpeed: 200, scale: 0.5, moveSpeed: 0,
    spriteWidth: 64, spriteHeight: 64, hitboxWidth: 50, hitboxHeight: 50,
    hitboxOffsetX: 7, hitboxOffsetY: 7, health: 1
  },
  {
    name: 'greenRobot', frames: 26, type: 'walk', animSpeed: 100, scale: 0.5, moveSpeed: 1.0,
    spriteWidth: 64, spriteHeight: 64, hitboxWidth: 44, hitboxHeight: 58,
    hitboxOffsetX: 10, hitboxOffsetY: 3, health: 1
  },
  {
    name: 'robotBall', frames: 16, type: 'walk', animSpeed: 150, scale: 0.5, moveSpeed: 0,
    spriteWidth: 64, spriteHeight: 64, hitboxWidth: 50, hitboxHeight: 50,
    hitboxOffsetX: 7, hitboxOffsetY: 7, health: 1
  },
  {
    name: 'greenSnail', frames: 10, type: 'walk', animSpeed: 300, scale: 0.5, moveSpeed: 0.4,
    spriteWidth: 64, spriteHeight: 64, hitboxWidth: 58, hitboxHeight: 32,
    hitboxOffsetX: 3, hitboxOffsetY: 32, health: 1
  },
  {
    name: 'yellowBee', frames: 13, type: 'fly', animSpeed: 120, scale: 0.5, moveSpeed: 0.7,
    spriteWidth: 64, spriteHeight: 64, hitboxWidth: 48, hitboxHeight: 48,
    hitboxOffsetX: 8, hitboxOffsetY: 8, health: 1
  },
  {
    name: 'bigRobot', frames: 42, type: 'walk', animSpeed: 100, scale: 0.5, moveSpeed: 1.0,
    spriteWidth: 300, spriteHeight: 280,
    hitboxWidth: 280, hitboxHeight: 270,
    hitboxOffsetX: 10, hitboxOffsetY: 5, health: 3
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
    //criticalErrorOccurred = true
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

function startAttack(attackType) {
  isAttacking = true
  setPlayerState(attackType)
  const damageDelay = attackType === 'attack3' ? 525 : 400 // ms
  setTimeout(() => {
    if (isAttacking) applyAttackDamage()
  }, damageDelay)
  player.addEventListener('animationend', () => {
    isAttacking = false
    updatePlayerState()
  }, { once: true })
}

function applyAttackDamage() {
  const playerHitbox = {
    x: playerX + hitboxOffsetX,
    y: playerY + mapOffsetY + hitboxOffsetY,
    width: hitboxWidth,
    height: hitboxHeight
  }
  enemies.forEach(enemy => {
    const enemyHitbox = getEnemyHitbox(enemy)
    if (checkAABB(playerHitbox, enemyHitbox)) {
      enemy.health -= 1
      enemy.el.classList.add('enemy-hit')
      setTimeout(() => enemy.el.classList.remove('enemy-hit'), 100)
      if (enemy.health <= 0) defeatEnemy(enemy)
    }
  })
}

function defeatEnemy(enemy) {
  enemies = enemies.filter(e => e !== enemy)
  if (enemy.el && enemy.el.parentNode) {
    enemy.el.parentNode.removeChild(enemy.el)
  }
}
function playerTakeDamage() {
  if (isInvincible) return
  playerHealth -= 20
  if (playerHealth <= 0) {
    playerHealth = 0
    playerHearts -= 1
    if (playerHearts <= 0) {
      console.log("Game Over")
      //*** we'll add game over logic here
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

//check player-enemy collisions
function checkPlayerEnemyCollisions() {
  const playerHitbox = {
    x: playerX + hitboxOffsetX,
    y: playerY + mapOffsetY + hitboxOffsetY,
    width: hitboxWidth,
    height: hitboxHeight
  }
  enemies.forEach(enemy => {
    const enemyHitbox = getEnemyHitbox(enemy)
    if (checkAABB(playerHitbox, enemyHitbox) && !isAttacking && !isInvincible) {
      playerTakeDamage()
    }
  })
}

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
  //where applying the function returns true/truthy value or 
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
    //almost eveything here can will be overwritten later (on spawndata)
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
    health: enemyData.health
  }

  if (enemy.type.type === 'fly') {
    //we use specific values from enemyData if they exist or we use defaults
    enemy.flyAmplitude = enemyData.flyAmplitude !== undefined ? enemyData.flyAmplitude : (15 + Math.random() * 20)
    enemy.flyFrequency = enemyData.flyFrequency !== undefined ? enemyData.flyFrequency : (0.002 + Math.random() * 0.0015)
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
    let targetScreenY = enemy.y - mapOffsetY
    //apply the css transform and update position : (x, y, scaleX(facingRight), scale())
    enemy.el.style.transform = `translate(${targetScreenX}px, ${targetScreenY}px) scaleX(${finalScaleX}) scale(${enemy.scale})`
  })
}

//Player collisions
//starting with landing on ground/platforms, ceilings, doors
function handleVerticalCollisions() {
  //player's Y position (relative to viewport)
  //mapoffset Y is the amount the map scrolled vertically with
  const playerWorldY = playerY + mapOffsetY
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
        if (v === 8) {
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
          const prevPlayerWorldY = prevY + mapOffsetY
          //if falling (<0) or onground (0) 
          //current bottom y position is just rect.y + rect.height 
          //instead we get previous bottom y with prevPlayerWorldY + hitboxOffsetY + hitboxHeight
          //we check if it was above or at the same level as the tile 
          //(we can add some tolerance too)
          if (velocityY >= 0 && prevPlayerWorldY + hitboxOffsetY + hitboxHeight <= tile.y + 0.5) {
            //adjust player's y position make him land on top of tile
            //set velocity to 0 and onground to true
            playerY = tile.y - hitboxHeight - hitboxOffsetY - mapOffsetY
            velocityY = 0
            newOnGround = true
            //if player was jumping and was previously below tile or at the same level
          } else if (velocityY < 0 && prevPlayerWorldY + hitboxOffsetY >= tile.y + tile.height - 0.5) {
            playerY = tile.y + tile.height - hitboxOffsetY - mapOffsetY
            velocityY = 0
          }
          //for one-way platforms we only handle landing 
          //no bottom collisions
        } else if (v === 3 && velocityY >= 0 && (prevY + mapOffsetY + hitboxOffsetY + hitboxHeight) <= tile.y + 0.5) {
          playerY = tile.y - hitboxHeight - hitboxOffsetY - mapOffsetY
          velocityY = 0
          newOnGround = true
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
  const playerWorldY = playerY + mapOffsetY
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

function transitionToNextStage() {
  //if we're not yet at last stage
  if (currentStage < stageStarts.length - 1) {
    //remove all enemies
    removeEnemiesForStage(currentStage)

    currentStage++
    //all stages are 576px in height
    mapOffsetY = 576 * currentStage
    //we'll set player's x and y from stageStarts
    //which determines where should player appear at each stage
    //with y we take the offset into consideration
    playerX = stageStarts[currentStage].x
    playerY = stageStarts[currentStage].y - mapOffsetY
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

    console.log(`Transitioned to stage ${currentStage}, mapOffsetY: ${mapOffsetY}`)

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
    { type: 'blueBall', x: 1000, y: 1, active: false, facingLeft: true },
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
    { type: 'greenSnail', x: 850, y: 776, active: false, facingLeft: true },
  ],
  2: [
    { type: 'yellowBee', x: 150, y: 1300, active: false, facingLeft: true },
    { type: 'greenRobot', x: 500, y: 1352, active: false, facingLeft: true },
    { type: 'blueBall', x: 700, y: 1280, active: false, facingLeft: true },
    { type: 'greenSnail', x: 900, y: 1352, active: false, facingLeft: true },
    { type: 'bigRobot', x: 1000, y: 1352, active: false, facingLeft: true }

  ],
  3: [
    { type: 'greenRobot', x: 200, y: 1928, active: false, facingLeft: true },
    { type: 'blueBall', x: 400, y: 1850, active: false, facingLeft: true },
    { type: 'yellowBee', x: 600, y: 1880, active: false, facingLeft: true },
    { type: 'robotBall', x: 800, y: 1928, active: false, facingLeft: true },
    { type: 'greenSnail', x: 1000, y: 1928, active: false, facingLeft: true },
  ]
}
function spawnEnemiesForStage(stage) {
  const stageSpawns = enemySpawnData[stage]
  if (!stageSpawns) return

  stageSpawns.forEach(spawnData => {
    const enemy = createEnemy(spawnData.type, spawnData.x, spawnData.y)
    if (enemy) {
      if (spawnData.facingLeft !== undefined) {
        enemy.facingRight = !spawnData.facingLeft
      }
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
      if (enemy.el && enemy.el.parentNode) {
        enemy.el.parentNode.removeChild(enemy.el)
      }
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

  if (keysPressed['ArrowLeft']) { playerX -= speed; facingRight = false }
  if (keysPressed['ArrowRight']) { playerX += speed; facingRight = true }
  if (keysPressed['ArrowUp'] && onGround) { velocityY = jumpStrength; onGround = false }

  if (!onGround) velocityY += gravity
  playerY += velocityY

  handleVerticalCollisions()
  handleHorizontalCollisions()
  updatePlayerState()
  updateEnemyLogic(deltaTime)
  checkPlayerEnemyCollisions()

  const playerSize = 0.6
  player.style.transform = `translate(${playerX}px, ${playerY}px) scaleX(${facingRight ? 1 : -1}) scale(${playerSize})`

  requestAnimationFrame(gameLoop)
}

requestAnimationFrame(gameLoop)