<script setup>
/**
 * ClawMachine – 2-D claw machine mini-game with physics.
 *
 * Physics features:
 *   - Notes fall under gravity, bounce off walls / floor, and stack on
 *     each other via AABB collision resolution (two-pass for stability).
 *   - Higher-rarity notes drop first so they settle at the bottom of the
 *     pile; lower-rarity notes land on top and are easier to grab.
 *   - The claw swings on a damped pendulum — moving the carriage imparts
 *     angular momentum, dropping / retracting changes cable length which
 *     affects swing frequency.
 *
 * Game rules (from instructions):
 *   - 20 notes randomly selected (duplicates allowed)
 *   - Lower rarity → near top; higher → near bottom
 *   - Claw never fails; catches exactly one note at a time
 *   - After catch → reveal modal (rarity colour + text + NEW badge)
 *   - Notes refresh every 60 seconds
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCollection } from '../composables/useCollection.js'
import NoteRevealModal from '../components/NoteRevealModal.vue'
import allNotes from '../data/notes.json'

const router = useRouter()
const { collect } = useCollection()

/* ──────────────────────── Constants ──────────────────────── */
const CANVAS_W = 400
const CANVAS_H = 500
const CLAW_Y_START = 30
const CLAW_SPEED = 3
const DROP_SPEED = 4
const RETRACT_SPEED = 3
const CHUTE_X = CANVAS_W / 2
const NOTE_W = 36
const NOTE_H = 28
const CLAW_WIDTH = 30

// Note physics
const GRAVITY = 0.25
const FRICTION = 0.8
const BOUNCE = 0.35
const FLOOR_Y = CANVAS_H - 8
const WALL_L = 6
const WALL_R = CANVAS_W - 6

// Claw pendulum
const SWING_RESTORE = 0.4   // gravity-like restoring constant
const SWING_DAMPING = 0.96  // angular velocity damping per frame
const SWING_MOVE_K = 0.02   // how much carriage movement drives swing
const SWING_MAX = 0.5       // max swing angle (radians)

const NOTES_COUNT = 40
const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary']
const RARITY_COLORS = {
  common: '#a8a8a8',
  uncommon: '#5cb85c',
  rare: '#5bc0de',
  epic: '#9b59b6',
  legendary: '#f0ad4e',
}

/* ──────────────────────── State ─────────────────────────── */
const canvasRef = ref(null)
let ctx = null
let animFrame = null
let refreshTimer = null

const clawX = ref(CANVAS_W / 2)
const clawY = ref(CLAW_Y_START)
const moveDir = ref(0)            // -1 left, 0 still, 1 right
const gameState = ref('idle')     // idle | dropping | retracting | delivering | reveal
const caughtNote = ref(null)
const revealNote = ref(null)
const revealIsNew = ref(false)
const machineNotes = ref([])      // { note, x, y, vx, vy, settled }[]

// Claw swing
let swingAngle = 0      // current pendulum angle (radians)
let swingVelocity = 0   // angular velocity
let prevClawX = CANVAS_W / 2

// Keyboard state tracking
const keysPressed = ref(new Set())

/* ──────────────────────── Note generation ────────────────── */

/**
 * Pick 40 random notes and drop them into the machine.
 * Higher-rarity notes spawn closer to the viewport (smaller negative y)
 * so they reach the floor first and settle at the bottom of the pile.
 * Lower-rarity notes spawn further above and land on top → easy to grab.
 */
function generateMachineNotes() {
  const notes = []
  for (let i = 0; i < NOTES_COUNT; i++) {
    const note = allNotes[Math.floor(Math.random() * allNotes.length)]
    const rarityIdx = RARITY_ORDER.indexOf(note.rarity)

    const x = WALL_L + Math.random() * (WALL_R - WALL_L - NOTE_W)
    // Legendary (idx 4) → small negative y (drops first).
    // Common (idx 0) → large negative y (drops last, lands on top).
    const y = -NOTE_H - (RARITY_ORDER.length - 1 - rarityIdx) * 35
              - Math.random() * 25

    notes.push({
      note, x, y,
      vx: (Math.random() - 0.5) * 1.5,
      vy: 0,
      settled: false,
    })
  }
  machineNotes.value = notes
}

/* ──────────────────────── Note physics ──────────────────── */

/**
 * Resolve AABB overlap between two notes.
 * Pushes them apart along the shortest axis and bounces velocities.
 */
function resolveCollision(a, b) {
  const overlapX = Math.min(a.x + NOTE_W, b.x + NOTE_W) - Math.max(a.x, b.x)
  const overlapY = Math.min(a.y + NOTE_H, b.y + NOTE_H) - Math.max(a.y, b.y)
  if (overlapX <= 0 || overlapY <= 0) return

  if (overlapX < overlapY) {
    // Horizontal separation
    const sign = (a.x + NOTE_W / 2) < (b.x + NOTE_W / 2) ? -1 : 1
    const push = overlapX / 2 + 0.5
    if (!a.settled) a.x += sign * push
    if (!b.settled) b.x -= sign * push
    if (!a.settled && !b.settled) {
      const t = a.vx; a.vx = b.vx * BOUNCE; b.vx = t * BOUNCE
    } else if (!a.settled) { a.vx = -a.vx * BOUNCE }
    else if (!b.settled)   { b.vx = -b.vx * BOUNCE }
  } else {
    // Vertical separation
    const sign = (a.y + NOTE_H / 2) < (b.y + NOTE_H / 2) ? -1 : 1
    const push = overlapY / 2 + 0.5
    if (!a.settled) a.y += sign * push
    if (!b.settled) b.y -= sign * push
    if (!a.settled && !b.settled) {
      const t = a.vy; a.vy = b.vy * BOUNCE; b.vy = t * BOUNCE
    } else if (!a.settled) { a.vy = -a.vy * BOUNCE }
    else if (!b.settled)   { b.vy = -b.vy * BOUNCE }
  }
}

/** Run one physics tick for every note in the machine. */
function updateNotePhysics() {
  const notes = machineNotes.value

  for (const n of notes) {
    if (n.settled) continue

    n.vy += GRAVITY
    n.vx *= FRICTION
    n.x += n.vx
    n.y += n.vy

    // Wall bounces
    if (n.x < WALL_L) { n.x = WALL_L; n.vx = Math.abs(n.vx) * BOUNCE }
    if (n.x + NOTE_W > WALL_R) { n.x = WALL_R - NOTE_W; n.vx = -Math.abs(n.vx) * BOUNCE }

    // Floor bounce
    if (n.y + NOTE_H > FLOOR_Y) {
      n.y = FLOOR_Y - NOTE_H
      n.vy = -Math.abs(n.vy) * BOUNCE
      n.vx *= FRICTION
      if (Math.abs(n.vy) < 0.5 && Math.abs(n.vx) < 0.3) {
        n.vy = 0; n.vx = 0; n.settled = true
      }
    }
  }

  // Note-to-note collisions (two passes reduce jitter)
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < notes.length; i++) {
      for (let j = i + 1; j < notes.length; j++) {
        const a = notes[i], b = notes[j]
        if (a.x < b.x + NOTE_W && a.x + NOTE_W > b.x &&
            a.y < b.y + NOTE_H && a.y + NOTE_H > b.y) {
          resolveCollision(a, b)
        }
      }
    }
  }

  // Settle notes resting on already-settled notes
  for (const n of notes) {
    if (n.settled || Math.abs(n.vy) > 0.6 || Math.abs(n.vx) > 0.4) continue
    for (const o of notes) {
      if (o === n || !o.settled) continue
      if (n.x < o.x + NOTE_W && n.x + NOTE_W > o.x &&
          Math.abs((n.y + NOTE_H) - o.y) < 2) {
        n.vy = 0; n.vx = 0; n.settled = true
        break
      }
    }
  }
}

/* ──────────────────────── Claw swing ────────────────────── */

/** Update the claw's damped pendulum based on carriage movement. */
function updateClawSwing() {
  const cableLen = Math.max(20, clawY.value - 10)
  const dx = clawX.value - prevClawX
  prevClawX = clawX.value

  // Pendulum: restoring torque + inertia from carriage acceleration
  const restoring = -(SWING_RESTORE / cableLen) * Math.sin(swingAngle)
  const inertia = -dx * SWING_MOVE_K
  swingVelocity += restoring + inertia
  swingVelocity *= SWING_DAMPING
  swingAngle += swingVelocity

  // Hard clamp with bounce-back
  if (swingAngle > SWING_MAX)  { swingAngle = SWING_MAX;  swingVelocity *= -0.3 }
  if (swingAngle < -SWING_MAX) { swingAngle = -SWING_MAX; swingVelocity *= -0.3 }
}

/**
 * Compute the claw-tip position after applying the swing offset.
 * Pivot is at (clawX, 10) on the rail; cable hangs below.
 * @returns {{ x: number, y: number }}
 */
function clawTip() {
  const cableLen = Math.max(20, clawY.value - 10)
  return {
    x: clawX.value + Math.sin(swingAngle) * cableLen,
    y: 10 + Math.cos(swingAngle) * cableLen,
  }
}

/* ──────────────────────── Drawing ───────────────────────── */

function draw() {
  if (!ctx) return
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

  // Machine background
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // Glass border
  ctx.strokeStyle = 'rgba(74,32,64,0.3)'
  ctx.lineWidth = 3
  ctx.strokeRect(2, 2, CANVAS_W - 4, CANVAS_H - 4)

  // Rail at top
  ctx.fillStyle = 'rgba(74,32,64,0.25)'
  ctx.fillRect(0, 0, CANVAS_W, 20)

  // Draw notes (skip those still above the viewport)
  for (const item of machineNotes.value) {
    if (item.y + NOTE_H < 0) continue
    ctx.fillStyle = RARITY_COLORS[item.note.rarity]
    ctx.beginPath()
    roundRect(ctx, item.x, item.y, NOTE_W, NOTE_H, 4)
    ctx.fill()

    // Small envelope line
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(item.x, item.y)
    ctx.lineTo(item.x + NOTE_W / 2, item.y + NOTE_H * 0.45)
    ctx.lineTo(item.x + NOTE_W, item.y)
    ctx.stroke()
  }

  // ── Claw (rendered with swing offset) ──
  const tip = clawTip()

  // Cable from rail pivot to swung claw head
  ctx.strokeStyle = 'rgba(74,32,64,0.5)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(clawX.value, 10)
  ctx.lineTo(tip.x, tip.y)
  ctx.stroke()

  // Carriage dot on rail
  ctx.fillStyle = 'rgba(74,32,64,0.5)'
  ctx.beginPath()
  ctx.arc(clawX.value, 10, 5, 0, Math.PI * 2)
  ctx.fill()

  // Claw head
  ctx.fillStyle = 'rgba(74,32,64,0.8)'
  ctx.beginPath()
  ctx.arc(tip.x, tip.y, 8, 0, Math.PI * 2)
  ctx.fill()

  // Prongs
  const open = gameState.value === 'idle' || gameState.value === 'dropping' ? 1 : 0.3
  ctx.strokeStyle = 'rgba(74,32,64,0.8)'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(tip.x, tip.y + 6); ctx.lineTo(tip.x - CLAW_WIDTH * 0.5 * open, tip.y + 22); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(tip.x, tip.y + 6); ctx.lineTo(tip.x + CLAW_WIDTH * 0.5 * open, tip.y + 22); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(tip.x, tip.y + 6); ctx.lineTo(tip.x, tip.y + 24); ctx.stroke()

  // Caught note follows the swung claw
  if (caughtNote.value && (gameState.value === 'retracting' || gameState.value === 'delivering')) {
    ctx.fillStyle = RARITY_COLORS[caughtNote.value.note.rarity]
    ctx.beginPath()
    roundRect(ctx, tip.x - NOTE_W / 2, tip.y + 26, NOTE_W, NOTE_H, 4)
    ctx.fill()
  }
}

/** Canvas rounded-rect helper. */
function roundRect(context, x, y, w, h, r) {
  context.moveTo(x + r, y)
  context.lineTo(x + w - r, y)
  context.quadraticCurveTo(x + w, y, x + w, y + r)
  context.lineTo(x + w, y + h - r)
  context.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  context.lineTo(x + r, y + h)
  context.quadraticCurveTo(x, y + h, x, y + h - r)
  context.lineTo(x, y + r)
  context.quadraticCurveTo(x, y, x + r, y)
}

/* ──────────────────────── Game loop ─────────────────────── */

function gameLoop() {
  // Physics ticks
  if (gameState.value !== 'reveal') updateNotePhysics()
  updateClawSwing()

  // Horizontal movement (only when idle)
  if (gameState.value === 'idle' && moveDir.value !== 0) {
    clawX.value = Math.max(20, Math.min(CANVAS_W - 20, clawX.value + moveDir.value * CLAW_SPEED))
  }

  // Dropping
  if (gameState.value === 'dropping') {
    clawY.value += DROP_SPEED

    const hit = findHitNote()
    if (hit) {
      caughtNote.value = hit
      machineNotes.value = machineNotes.value.filter(n => n !== hit)
      gameState.value = 'retracting'
    }
    if (clawY.value >= CANVAS_H - 40 && !caughtNote.value) {
      gameState.value = 'retracting'
    }
  }

  // Retracting
  if (gameState.value === 'retracting') {
    clawY.value -= RETRACT_SPEED
    if (clawY.value <= CLAW_Y_START) {
      clawY.value = CLAW_Y_START
      gameState.value = caughtNote.value ? 'delivering' : 'idle'
    }
  }

  // Delivering — slide to chute then reveal
  if (gameState.value === 'delivering') {
    const dx = CHUTE_X - clawX.value
    if (Math.abs(dx) > CLAW_SPEED) {
      clawX.value += Math.sign(dx) * CLAW_SPEED
    } else {
      clawX.value = CHUTE_X
      const note = caughtNote.value.note
      const isNew = collect(note.id)
      revealNote.value = note
      revealIsNew.value = isNew
      caughtNote.value = null
      gameState.value = 'reveal'
    }
  }

  draw()
  animFrame = requestAnimationFrame(gameLoop)
}

/**
 * Find the first note the swung claw tip overlaps with.
 * @returns {Object|null}
 */
function findHitNote() {
  const tip = clawTip()
  const cx = tip.x
  const cy = tip.y + 24 // prong tip

  for (const item of machineNotes.value) {
    if (cx >= item.x && cx <= item.x + NOTE_W &&
        cy >= item.y && cy <= item.y + NOTE_H) {
      return item
    }
  }
  return null
}

/* ──────────────────────── Controls ──────────────────────── */

function startMoveLeft()  { moveDir.value = -1 }
function startMoveRight() { moveDir.value = 1 }
function stopMove()       { moveDir.value = 0 }

function updateMovement() {
  if (keysPressed.value.has('ArrowLeft') || keysPressed.value.has('a')) {
    if (keysPressed.value.has('ArrowRight') || keysPressed.value.has('d')) {
      moveDir.value = 0 // Both keys pressed - stop
    } else {
      moveDir.value = -1 // Only left pressed
    }
  } else if (keysPressed.value.has('ArrowRight') || keysPressed.value.has('d')) {
    moveDir.value = 1 // Only right pressed
  } else {
    moveDir.value = 0 // No keys pressed
  }
}

function dropClaw() {
  if (gameState.value !== 'idle') return
  caughtNote.value = null
  gameState.value = 'dropping'
}

function closeReveal() {
  revealNote.value = null
  revealIsNew.value = false
  gameState.value = 'idle'
}

/* ──────────────────────── Keyboard support ───────────────── */

function onKeyDown(e) {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'ArrowRight' || e.key === 'd') {
    e.preventDefault()
    keysPressed.value.add(e.key)
    updateMovement()
  }
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault()
    dropClaw()
  }
}

function onKeyUp(e) {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'ArrowRight' || e.key === 'd') {
    e.preventDefault()
    keysPressed.value.delete(e.key)
    updateMovement()
  }
}

/* ──────────────────────── Lifecycle ──────────────────────── */

onMounted(() => {
  const canvas = canvasRef.value
  if (canvas) {
    ctx = canvas.getContext('2d')
    canvas.width = CANVAS_W
    canvas.height = CANVAS_H
  }

  generateMachineNotes()
  animFrame = requestAnimationFrame(gameLoop)
  refreshTimer = setInterval(generateMachineNotes, 60_000)

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
})

onUnmounted(() => {
  cancelAnimationFrame(animFrame)
  clearInterval(refreshTimer)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
})
</script>

<template>
  <div class="claw-page">
    <!-- Top bar -->
    <div class="top-bar">
      <button class="nav-btn" @click="router.push({ name: 'menu' })">← Back</button>
      <h2 class="page-title">Claw Machine</h2>
      <button class="nav-btn" @click="router.push({ name: 'collection' })">Collection →</button>
    </div>

    <!-- Canvas -->
    <div class="canvas-wrapper">
      <canvas ref="canvasRef"></canvas>
    </div>

    <!-- Controls -->
    <div class="controls">
      <div class="stick-area">
        <button
          class="ctrl-btn"
          @mousedown="startMoveLeft"
          @mouseup="stopMove"
          @mouseleave="stopMove"
          @touchstart.prevent="startMoveLeft"
          @touchend.prevent="stopMove"
          aria-label="Move left"
        >◄</button>
        <button
          class="ctrl-btn"
          @mousedown="startMoveRight"
          @mouseup="stopMove"
          @mouseleave="stopMove"
          @touchstart.prevent="startMoveRight"
          @touchend.prevent="stopMove"
          aria-label="Move right"
        >►</button>
      </div>
      <button
        class="drop-btn"
        :disabled="gameState !== 'idle'"
        @click="dropClaw"
      >
        DROP
      </button>
    </div>

    <p class="hint">Use arrow keys / A D to move, Space to drop</p>

    <!-- Note reveal modal -->
    <NoteRevealModal
      v-if="revealNote"
      :note="revealNote"
      :is-new="revealIsNew"
      @close="closeReveal"
    />
  </div>
</template>

<style scoped>
.claw-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding: 1rem;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 420px;
  margin-bottom: 0.8rem;
}

.nav-btn {
  background: rgba(255, 255, 255, 0.3);
  padding: 0.4rem 0.8rem;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
  transition: background var(--transition-fast);
}
.nav-btn:hover {
  background: rgba(255, 255, 255, 0.55);
}

.page-title {
  font-size: 1.3rem;
  font-weight: 700;
}

.canvas-wrapper {
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-card);
  line-height: 0;
}

canvas {
  display: block;
  background: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.2) 100%);
}

.controls {
  display: flex;
  gap: 1.5rem;
  align-items: center;
  margin-top: 1rem;
}

.stick-area {
  display: flex;
  gap: 0.5rem;
}

.ctrl-btn {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  font-size: 1.5rem;
  color: var(--color-text);
  font-weight: 700;
  transition: all var(--transition-fast);
  user-select: none;
  -webkit-user-select: none;
}
.ctrl-btn:hover {
  background: rgba(255, 255, 255, 0.65);
}
.ctrl-btn:active {
  transform: scale(0.92);
  background: rgba(255, 255, 255, 0.7);
}

.drop-btn {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--color-text);
  color: var(--color-white);
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 1px;
  transition: all var(--transition-fast);
  user-select: none;
  -webkit-user-select: none;
}
.drop-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 20px rgba(74, 32, 64, 0.4);
}
.drop-btn:active:not(:disabled) {
  transform: scale(0.95);
}
.drop-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.hint {
  margin-top: 0.8rem;
  font-size: 0.75rem;
  opacity: 0.5;
}
</style>
