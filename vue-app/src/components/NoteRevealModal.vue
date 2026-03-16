<script setup>
/**
 * NoteRevealModal – full-screen overlay that shows a caught note.
 *
 * Two-step reveal:
 *   1. "You got a note!" with the rarity colour card
 *   2. Opens the note to display its text, with optional NEW badge
 *
 * Props:
 *   note   – { id, text, rarity }
 *   isNew  – whether this is the first time the player caught this note
 *
 * Emits:
 *   close – user dismissed the modal
 */
import { ref } from 'vue'

const props = defineProps({
  note: { type: Object, required: true },
  isNew: { type: Boolean, default: false },
})

const emit = defineEmits(['close'])

const step = ref(1) // 1 = "You got a note!", 2 = note text revealed

function advance() {
  if (step.value === 1) {
    step.value = 2
  } else {
    emit('close')
  }
}

/** Map rarity to a CSS class for colour theming. */
function rarityClass(rarity) {
  return `rarity-${rarity}`
}
</script>

<template>
  <div class="modal-overlay" @click="advance">
    <div class="modal-card" :class="rarityClass(note.rarity)" @click.stop="advance">
      <!-- Step 1: Rarity reveal -->
      <template v-if="step === 1">
        <p class="reveal-label">You got a note!</p>
        <div class="note-card" :class="rarityClass(note.rarity)">
          <span class="rarity-badge">{{ note.rarity }}</span>
        </div>
        <p class="tap-hint">Click to open</p>
      </template>

      <!-- Step 2: Note text -->
      <template v-else>
        <span v-if="isNew" class="new-badge">NEW</span>
        <div class="note-card open" :class="rarityClass(note.rarity)">
          <p class="note-text">"{{ note.text }}"</p>
        </div>
        <p class="rarity-label">{{ note.rarity }}</p>
        <p class="tap-hint">Click to close</p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 5000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  animation: fade-in 0.25s ease;
}

.modal-card {
  position: relative;
  background: #fff;
  border-radius: var(--radius-lg);
  padding: 2.5rem 2rem;
  max-width: 360px;
  width: 90%;
  text-align: center;
  box-shadow: var(--shadow-card);
}

.reveal-label {
  font-size: 1.6rem;
  font-weight: 700;
  margin-bottom: 1.2rem;
  color: var(--color-text);
}

.note-card {
  width: 140px;
  height: 180px;
  margin: 0 auto 1rem;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 20px var(--glow-common);
  transition: all var(--transition-normal);
}

.note-card.open {
  width: 100%;
  height: auto;
  min-height: 120px;
  padding: 1.5rem;
}

/* Rarity backgrounds */
.note-card.rarity-common    { background: var(--rarity-common);    box-shadow: 0 0 20px var(--glow-common); }
.note-card.rarity-uncommon  { background: var(--rarity-uncommon);  box-shadow: 0 0 20px var(--glow-uncommon); }
.note-card.rarity-rare      { background: var(--rarity-rare);      box-shadow: 0 0 20px var(--glow-rare); }
.note-card.rarity-epic      { background: var(--rarity-epic);      box-shadow: 0 0 20px var(--glow-epic); }
.note-card.rarity-legendary { background: var(--rarity-legendary); box-shadow: 0 0 20px var(--glow-legendary); }

.rarity-badge {
  text-transform: capitalize;
  font-weight: 700;
  color: #fff;
  font-size: 1rem;
  letter-spacing: 1px;
}

.note-text {
  color: #fff;
  font-size: 1.1rem;
  font-weight: 500;
  line-height: 1.5;
  font-style: italic;
}

.new-badge {
  position: absolute;
  top: 12px;
  right: 16px;
  background: #e74c3c;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  letter-spacing: 1px;
  animation: pulse 1s infinite alternate;
}

.rarity-label {
  text-transform: capitalize;
  font-weight: 600;
  color: var(--color-text-light);
  margin-top: 0.4rem;
}

.tap-hint {
  margin-top: 1rem;
  font-size: 0.8rem;
  color: var(--color-text-light);
  opacity: 0.7;
}

@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes pulse {
  from { transform: scale(1); }
  to   { transform: scale(1.1); }
}
</style>
