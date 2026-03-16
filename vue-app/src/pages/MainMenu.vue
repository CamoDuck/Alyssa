<script setup>
/**
 * MainMenu – 2×2 grid of large square activity buttons.
 *
 * Button 1 (top-left): Claw Machine – always unlocked (custom SVG icon).
 * Buttons 2-4: Locked behind countdown timers for April 16, May 16, and
 * June 16 2026 respectively. Each locked button is greyed out with its
 * icon hidden behind a shadow overlay and a mini countdown.
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import CountdownTimer from '../components/CountdownTimer.vue'

const router = useRouter()

/**
 * Menu button definitions.
 * Only the first button is initially unlocked; the rest unlock on their date.
 */
const buttons = ref([
  {
    id: 'claw',
    label: 'Claw Machine',
    route: 'claw',
    unlockDate: null, // always unlocked
    icon: 'claw',
  },
  {
    id: 'btn2',
    label: '???',
    route: null,
    unlockDate: new Date('2026-04-16T00:00:00-07:00'),
    icon: 'lock',
  },
  {
    id: 'btn3',
    label: '???',
    route: null,
    unlockDate: new Date('2026-05-16T00:00:00-07:00'),
    icon: 'lock',
  },
  {
    id: 'btn4',
    label: '???',
    route: null,
    unlockDate: new Date('2026-06-16T00:00:00-07:00'),
    icon: 'lock',
  },
])

function isUnlocked(btn) {
  if (!btn.unlockDate) return true
  return new Date() >= btn.unlockDate
}

const revealedButtons = ref(new Set())

function revealButton(btnId) {
  revealedButtons.value.add(btnId)
  // Save to localStorage for persistence between sessions
  localStorage.setItem('alyssa_revealed_buttons', JSON.stringify([...revealedButtons.value]))
}

function handleClick(btn) {
  if (!isUnlocked(btn)) return
  if (btn.route) router.push({ name: btn.route })
}

// Load revealed buttons from localStorage on mount
onMounted(() => {
  const saved = localStorage.getItem('alyssa_revealed_buttons')
  if (saved) {
    try {
      const savedIds = JSON.parse(saved)
      revealedButtons.value = new Set(savedIds)
    } catch (e) {
      // Ignore parsing errors, start fresh
    }
  }
})
</script>

<template>
  <div class="menu-page">
    <h1 class="menu-title">Choose an Activity</h1>
    <div class="grid">
      <button
        v-for="btn in buttons"
        :key="btn.id"
        :class="['menu-btn', { 
          locked: !isUnlocked(btn),
          'question-cover': isUnlocked(btn) && !revealedButtons.has(btn.id)
        }]"
        :disabled="!isUnlocked(btn)"
        @click="isUnlocked(btn) && !revealedButtons.has(btn.id) ? revealButton(btn.id) : handleClick(btn)"
      >
        <!-- Question mark state -->
        <div v-if="isUnlocked(btn) && !revealedButtons.has(btn.id)" class="question-content">
          <div class="question-mark">?</div>
        </div>

        <!-- Unlocked icon area -->
        <div v-else-if="isUnlocked(btn)" class="icon-area">
          <!-- Claw machine SVG icon -->
          <svg
            v-if="btn.icon === 'claw'"
            class="btn-icon"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <!-- Claw machine body -->
            <rect x="15" y="10" width="70" height="80" rx="8" stroke="currentColor" stroke-width="4" fill="none" />
            <!-- Glass window -->
            <rect x="22" y="18" width="56" height="50" rx="4" stroke="currentColor" stroke-width="3" fill="none" opacity="0.6" />
            <!-- Prize chute -->
            <rect x="35" y="72" width="30" height="14" rx="3" stroke="currentColor" stroke-width="3" fill="none" />
            <!-- Claw arm -->
            <line x1="50" y1="8" x2="50" y2="30" stroke="currentColor" stroke-width="3" />
            <!-- Claw prongs -->
            <path d="M50 30 L40 42" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
            <path d="M50 30 L60 42" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
            <path d="M50 30 L50 44" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
            <!-- Small prizes (circles) -->
            <circle cx="35" cy="58" r="4" fill="currentColor" opacity="0.3" />
            <circle cx="48" cy="62" r="4" fill="currentColor" opacity="0.3" />
            <circle cx="60" cy="56" r="4" fill="currentColor" opacity="0.3" />
            <circle cx="42" cy="54" r="3" fill="currentColor" opacity="0.2" />
            <circle cx="55" cy="60" r="3" fill="currentColor" opacity="0.2" />
          </svg>
          <span class="btn-label">{{ btn.label }}</span>
        </div>

        <!-- Locked state: shadow overlay + countdown -->
        <div v-else class="locked-area">
          <div class="lock-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="40" height="40">
              <path d="M12 2C9.24 2 7 4.24 7 7v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7c0-2.76-2.24-5-5-5zm-3 5c0-1.66 1.34-3 3-3s3 1.34 3 3v3H9V7zm3 8a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"/>
            </svg>
          </div>
          <CountdownTimer :target-date="btn.unlockDate" compact />
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.menu-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
}

.menu-title {
  font-size: 1.8rem;
  font-weight: 600;
  margin-bottom: 2rem;
  color: var(--color-text);
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  max-width: 560px;
  width: 100%;
}

.menu-btn {
  aspect-ratio: 1;
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.3);
  border: 2px solid rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-normal);
  padding: 1.5rem;
  color: var(--color-text);
}

.menu-btn:not(.locked):hover {
  background: rgba(255, 255, 255, 0.55);
  transform: translateY(-4px);
  box-shadow: var(--shadow-card);
}

.menu-btn.locked {
  background: rgba(0, 0, 0, 0.15);
  border-color: rgba(0, 0, 0, 0.1);
  cursor: not-allowed;
  color: rgba(74, 32, 64, 0.4);
}

.icon-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
}

.btn-icon {
  width: 80px;
  height: 80px;
}

.btn-label {
  font-size: 1rem;
  font-weight: 600;
}

.locked-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.lock-icon svg {
  width: 40px;
  height: 40px;
  opacity: 0.5;
}

@media (max-width: 480px) {
  .grid {
    gap: 1rem;
  }
  .btn-icon {
    width: 56px;
    height: 56px;
  }
}

.question-content {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 100%;
  height: 100%;
}

.question-mark {
  font-size: 4rem;
  font-weight: bold;
  color: var(--color-text);
  z-index: 2;
  position: relative;
}
</style>
