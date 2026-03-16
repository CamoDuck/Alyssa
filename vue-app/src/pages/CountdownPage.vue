<script setup>
/**
 * CountdownPage – the landing page.
 *
 * Displays "Your 2 year anniversary gift in…" with a live countdown
 * to March 16 2026 00:00 PST. Once the countdown expires the user is
 * automatically redirected to the main menu.
 */
import { useRouter } from 'vue-router'
import CountdownTimer from '../components/CountdownTimer.vue'

const router = useRouter()

/** Anniversary target: March 15, 2026 11:00 PM PST (UTC-8). */
const TARGET_DATE = new Date('2026-03-15T23:00:00-08:00')

function onCountdownDone() {
  router.push({ name: 'menu' })
}
</script>

<template>
  <div class="countdown-page">
    <div class="container">
      <p class="label">Your 2 year anniversary gift in...</p>
      <CountdownTimer :target-date="TARGET_DATE" @done="onCountdownDone" />
    </div>
  </div>
</template>

<style scoped>
.countdown-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

.container {
  text-align: center;
}

.label {
  font-size: 1.8rem;
  margin-bottom: 1.5rem;
  font-weight: 300;
}
</style>
