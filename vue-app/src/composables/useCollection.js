/**
 * Composable for managing the player's note collection in localStorage.
 *
 * Stored shape (localStorage key: "alyssa_collection"):
 *   { [noteId: number]: { collectedAt: string (ISO 8601) } }
 *
 * Provides reactive state and helper methods for collecting, querying,
 * and importing / exporting the collection.
 */
import { reactive, toRefs } from 'vue'

const STORAGE_KEY = 'alyssa_collection'

/**
 * Read the raw collection object from localStorage.
 * @returns {Object<number, { collectedAt: string }>}
 */
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

/**
 * Persist the collection object to localStorage.
 * @param {Object} data
 */
function saveToStorage(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

// Shared reactive state (singleton across all consumers)
const state = reactive({
  collected: loadFromStorage(),
})

/**
 * @returns Reactive collection helpers
 */
export function useCollection() {
  /**
   * Mark a note as collected. Returns `true` when the note is new.
   * @param {number} noteId
   * @returns {boolean} isNew
   */
  function collect(noteId) {
    const isNew = !state.collected[noteId]
    if (isNew) {
      state.collected[noteId] = { collectedAt: new Date().toISOString() }
      saveToStorage(state.collected)
    }
    return isNew
  }

  /**
   * Check whether a note has been collected before.
   * @param {number} noteId
   * @returns {boolean}
   */
  function hasCollected(noteId) {
    return !!state.collected[noteId]
  }

  /**
   * Get the collection date for a collected note.
   * @param {number} noteId
   * @returns {string|null} ISO date string or null
   */
  function collectedDate(noteId) {
    return state.collected[noteId]?.collectedAt ?? null
  }

  /**
   * Export collection data as a JSON string (for download).
   * @returns {string}
   */
  function exportData() {
    return JSON.stringify(state.collected, null, 2)
  }

  /**
   * Import collection data from a JSON string.
   * Merges with existing data — does not overwrite already-collected notes.
   * @param {string} jsonString
   */
  function importData(jsonString) {
    try {
      const incoming = JSON.parse(jsonString)
      for (const [id, value] of Object.entries(incoming)) {
        if (!state.collected[id]) {
          state.collected[id] = value
        }
      }
      saveToStorage(state.collected)
    } catch (e) {
      console.error('Failed to import collection data:', e)
      throw new Error('Invalid collection data format.')
    }
  }

  return {
    ...toRefs(state),
    collect,
    hasCollected,
    collectedDate,
    exportData,
    importData,
  }
}
