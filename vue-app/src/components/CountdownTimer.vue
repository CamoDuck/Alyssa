<script setup>
/**
 * CountdownTimer – displays a live days / hours / minutes / seconds countdown
 * towards a given target date.
 *
 * Props:
 *   targetDate  – Date object or ISO string for the countdown target
 *   compact     – if true, renders a smaller inline version (used on locked buttons)
 *
 * Emits:
 *   done – fired once when the countdown reaches zero
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  targetDate: { type: [Date, String], required: true },
  compact: { type: Boolean, default: false },
})

const emit = defineEmits(['done'])

const now = ref(new Date())
let timer = null
const hasEmittedDone = ref(false)

const target = computed(() =>
  props.targetDate instanceof Date ? props.targetDate : new Date(props.targetDate),
)

const diff = computed(() => Math.max(0, target.value - now.value))
const isDone = computed(() => diff.value <= 0)

const days = computed(() => Math.floor(diff.value / 86_400_000))
const hours = computed(() => Math.floor((diff.value % 86_400_000) / 3_600_000))
const minutes = computed(() => Math.floor((diff.value % 3_600_000) / 60_000))
const seconds = computed(() => Math.floor((diff.value % 60_000) / 1000))

/** Zero-pad a number to at least two digits. */
function pad(n) {
  return String(n).padStart(2, '0')
}

onMounted(() => {
  timer = setInterval(() => {
    now.value = new Date()
    if (isDone.value && !hasEmittedDone.value) {
      hasEmittedDone.value = true
      clearInterval(timer)
      emit('done')
    }
  }, 1000)
})

onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div :class="['countdown', { compact }]">
    <template v-if="!isDone">
      <div class="countdown-item">
        <span class="number">{{ pad(days) }}</span>
        <span class="unit">Days</span>
      </div>
      <div class="countdown-item">
        <span class="number">{{ pad(hours) }}</span>
        <span class="unit">Hours</span>
      </div>
      <div class="countdown-item">
        <span class="number">{{ pad(minutes) }}</span>
        <span class="unit">Min</span>
      </div>
      <div class="countdown-item">
        <span class="number">{{ pad(seconds) }}</span>
        <span class="unit">Sec</span>
      </div>
    </template>
    <slot v-else name="done">
      <span class="done-text">Ready!</span>
    </slot>
  </div>
</template>

<style scoped>
.countdown {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  flex-wrap: wrap;
}

.countdown.compact {
  gap: 0.6rem;
}

.countdown-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.number {
  font-size: 4rem;
  font-weight: 700;
  line-height: 1;
}

.compact .number {
  font-size: 1.4rem;
}

.unit {
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-top: 0.4rem;
  font-weight: 500;
}

.compact .unit {
  font-size: 0.6rem;
  letter-spacing: 1px;
  margin-top: 0.2rem;
}

.done-text {
  font-size: 1.2rem;
  font-weight: 600;
}
</style>
