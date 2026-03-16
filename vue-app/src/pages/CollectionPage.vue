<script setup>
/**
 * CollectionPage – displays all notes organized by rarity.
 *
 * Features:
 *   - Notes grouped by rarity tier (common → legendary)
 *   - Collected notes are fully visible and clickable to re-read
 *   - Uncollected notes are semi-transparent and non-interactive
 *   - Collected notes show a tooltip with the date they were collected
 *   - Import / export collection data as JSON file
 */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCollection } from '../composables/useCollection.js'
import allNotes from '../data/notes.json'

const router = useRouter()
const { collected, hasCollected, collectedDate, exportData, importData } = useCollection()

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary']
const RARITY_COLORS = {
  common: '#a8a8a8',
  uncommon: '#5cb85c',
  rare: '#5bc0de',
  epic: '#9b59b6',
  legendary: '#f0ad4e',
}

/** Group notes by rarity in tier order. */
const groupedNotes = computed(() => {
  return RARITY_ORDER.map(rarity => ({
    rarity,
    color: RARITY_COLORS[rarity],
    notes: allNotes.filter(n => n.rarity === rarity),
  }))
})

/** Count collected notes. */
const collectedCount = computed(() =>
  allNotes.filter(n => hasCollected(n.id)).length
)

/* ──────────────────────── Note viewer ────────────────────── */
const viewingNote = ref(null)

function viewNote(note) {
  if (!hasCollected(note.id)) return
  viewingNote.value = note
}

function closeViewer() {
  viewingNote.value = null
}

/* ──────────────────────── Import / Export ─────────────────── */

function downloadCollection() {
  const blob = new Blob([exportData()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'alyssa-collection.json'
  a.click()
  URL.revokeObjectURL(url)
}

const fileInput = ref(null)

function triggerImport() {
  fileInput.value?.click()
}

function handleImport(event) {
  const file = event.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      importData(reader.result)
      importMessage.value = 'Collection imported successfully!'
    } catch {
      importMessage.value = 'Failed to import — invalid file.'
    }
    setTimeout(() => (importMessage.value = ''), 3000)
  }
  reader.readAsText(file)
  // Reset so re-selecting the same file still triggers
  event.target.value = ''
}

const importMessage = ref('')

/**
 * Format an ISO date string to a human-readable date.
 * @param {string} iso
 * @returns {string}
 */
function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="collection-page">
    <!-- Top bar -->
    <div class="top-bar">
      <button class="nav-btn" @click="router.push({ name: 'claw' })">← Claw Machine</button>
      <h2 class="page-title">Collection</h2>
      <span class="counter">{{ collectedCount }} / {{ allNotes.length }}</span>
    </div>

    <!-- Import / Export -->
    <div class="io-bar">
      <button class="io-btn" @click="downloadCollection">⬇ Export</button>
      <button class="io-btn" @click="triggerImport">⬆ Import</button>
      <input ref="fileInput" type="file" accept=".json" hidden @change="handleImport" />
      <span v-if="importMessage" class="io-msg">{{ importMessage }}</span>
    </div>

    <!-- Rarity sections -->
    <section v-for="group in groupedNotes" :key="group.rarity" class="rarity-section">
      <h3 class="rarity-heading" :style="{ color: group.color }">
        {{ group.rarity }}
      </h3>
      <div class="notes-grid">
        <div
          v-for="note in group.notes"
          :key="note.id"
          :class="['note-card', { collected: hasCollected(note.id) }]"
          :style="{ borderColor: group.color, '--glow': group.color }"
          :title="hasCollected(note.id) ? `Collected: ${formatDate(collectedDate(note.id))}` : 'Not yet collected'"
          @click="viewNote(note)"
        >
          <div class="note-inner" :style="{ backgroundColor: group.color }">
            <span v-if="hasCollected(note.id)" class="note-preview">{{ note.text }}</span>
            <span v-else class="note-unknown">?</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Note viewer overlay -->
    <div v-if="viewingNote" class="viewer-overlay" @click="closeViewer">
      <div class="viewer-card" @click.stop>
        <div class="viewer-body" :style="{ backgroundColor: RARITY_COLORS[viewingNote.rarity] }">
          <p class="viewer-text">"{{ viewingNote.text }}"</p>
        </div>
        <p class="viewer-rarity">{{ viewingNote.rarity }}</p>
        <p class="viewer-date">
          Collected {{ formatDate(collectedDate(viewingNote.id)) }}
        </p>
        <button class="viewer-close" @click="closeViewer">Close</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.collection-page {
  min-height: 100vh;
  padding: 1rem;
  max-width: 600px;
  margin: 0 auto;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
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
  color: var(--color-text);
}

.counter {
  font-size: 0.9rem;
  font-weight: 600;
  opacity: 0.7;
}

/* Import / Export bar */
.io-bar {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  margin-bottom: 1.5rem;
}

.io-btn {
  background: rgba(255, 255, 255, 0.35);
  padding: 0.4rem 0.9rem;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text);
  transition: background var(--transition-fast);
}
.io-btn:hover {
  background: rgba(255, 255, 255, 0.55);
}

.io-msg {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-text);
}

/* Rarity sections */
.rarity-section {
  margin-bottom: 2rem;
}

.rarity-heading {
  text-transform: capitalize;
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 0.8rem;
  letter-spacing: 1px;
}

.notes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 0.8rem;
}

.note-card {
  aspect-ratio: 3 / 4;
  border-radius: var(--radius-md);
  border: 2px solid;
  overflow: hidden;
  opacity: 0.35;
  cursor: default;
  transition: all var(--transition-normal);
}

.note-card.collected {
  opacity: 1;
  cursor: pointer;
}

.note-card.collected:hover {
  transform: translateY(-3px);
  box-shadow: 0 0 12px var(--glow);
}

.note-inner {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
}

.note-preview {
  color: #fff;
  font-size: 0.55rem;
  line-height: 1.4;
  text-align: center;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
}

.note-unknown {
  color: rgba(255, 255, 255, 0.4);
  font-size: 1.8rem;
  font-weight: 700;
}

/* Note viewer overlay */
.viewer-overlay {
  position: fixed;
  inset: 0;
  z-index: 5000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  animation: fade-in 0.2s ease;
}

.viewer-card {
  background: #fff;
  border-radius: var(--radius-lg);
  padding: 2rem 1.5rem;
  max-width: 360px;
  width: 90%;
  text-align: center;
  box-shadow: var(--shadow-card);
}

.viewer-body {
  border-radius: var(--radius-md);
  padding: 1.5rem;
  margin-bottom: 1rem;
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.viewer-text {
  color: #fff;
  font-size: 1.1rem;
  font-style: italic;
  line-height: 1.5;
}

.viewer-rarity {
  text-transform: capitalize;
  font-weight: 600;
  color: var(--color-text-light);
  margin-bottom: 0.3rem;
}

.viewer-date {
  font-size: 0.8rem;
  color: var(--color-text-light);
  opacity: 0.7;
  margin-bottom: 1rem;
}

.viewer-close {
  background: var(--color-text);
  color: var(--color-white);
  padding: 0.5rem 1.5rem;
  border-radius: var(--radius-sm);
  font-weight: 600;
  transition: opacity var(--transition-fast);
}
.viewer-close:hover {
  opacity: 0.85;
}

@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
</style>
