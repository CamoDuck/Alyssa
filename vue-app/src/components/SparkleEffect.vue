<script setup>
/**
 * SparkleEffect – renders sparkles that follow the cursor and burst on click.
 * Ported from the original static index.html implementation.
 * This component is mounted once in App.vue and covers the entire viewport.
 */
import { onMounted, onUnmounted } from 'vue'

const SPARKLE_COLORS = ['#fff', '#ffd6f0', '#f0c0ff', '#ffe0f5', '#d4a0e8', '#ffffff']

/** Create a single sparkle dot near (x, y). */
function createSparkle(x, y) {
  const el = document.createElement('div')
  el.className = 'sparkle-dot'
  const color = SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)]
  const offsetX = (Math.random() - 0.5) * 50
  const offsetY = (Math.random() - 0.5) * 50
  const size = Math.random() * 16 + 12

  Object.assign(el.style, {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: '9999',
    borderRadius: '50%',
    left: `${x + offsetX}px`,
    top: `${y + offsetY}px`,
    width: `${size}px`,
    height: `${size}px`,
    backgroundColor: color,
    boxShadow: `0 0 ${size}px ${color}`,
    animation: 'sparkle-fade 0.6s ease-out forwards',
  })

  document.body.appendChild(el)
  el.addEventListener('animationend', () => el.remove())
}

/** Create an explosion of particles at (x, y) on click. */
function createExplosion(x, y) {
  const count = 18
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div')
    el.className = 'sparkle-explosion'
    const angle = (2 * Math.PI / count) * i + (Math.random() - 0.5) * 0.5
    const dist = Math.random() * 60 + 40
    const tx = Math.cos(angle) * dist
    const ty = Math.sin(angle) * dist
    const color = SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)]
    const size = Math.random() * 12 + 8

    Object.assign(el.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '9999',
      borderRadius: '50%',
      left: `${x}px`,
      top: `${y}px`,
      width: `${size}px`,
      height: `${size}px`,
      backgroundColor: color,
      boxShadow: `0 0 ${size + 2}px ${color}`,
      '--tx': `${tx}px`,
      '--ty': `${ty}px`,
      animation: 'sparkle-explode 0.7s ease-out forwards',
    })

    document.body.appendChild(el)
    el.addEventListener('animationend', () => el.remove())
  }

  // Ripple ring
  const ripple = document.createElement('div')
  Object.assign(ripple.style, {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: '9998',
    border: '3px solid rgba(255,255,255,0.7)',
    borderRadius: '50%',
    width: '10px',
    height: '10px',
    left: `${x}px`,
    top: `${y}px`,
    transform: 'translate(-50%,-50%)',
    animation: 'ripple-expand 0.5s ease-out forwards',
  })
  document.body.appendChild(ripple)
  ripple.addEventListener('animationend', () => ripple.remove())
}

let moveThrottle = 0

function onMouseMove(e) {
  const now = Date.now()
  if (now - moveThrottle < 30) return
  moveThrottle = now
  for (let i = 0; i < 2; i++) createSparkle(e.clientX, e.clientY)
}

function onClick(e) {
  createExplosion(e.clientX, e.clientY)
}

onMounted(() => {
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('click', onClick)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('click', onClick)
})
</script>

<template>
  <!-- No visible DOM; sparkles are injected directly into <body>. -->
</template>

<style>
/* Global keyframes used by dynamically-created sparkle elements. */
@keyframes sparkle-fade {
  0%   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(0); }
}

@keyframes sparkle-explode {
  0%   { opacity: 1; transform: translate(var(--tx), var(--ty)) scale(1); }
  100% { opacity: 0; transform: translate(calc(var(--tx) * 3), calc(var(--ty) * 3)) scale(0); }
}

@keyframes ripple-expand {
  0%   { width: 10px; height: 10px; opacity: 0.8; }
  100% { width: 120px; height: 120px; opacity: 0; }
}
</style>
