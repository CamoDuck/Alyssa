<script setup>
/**
 * Root application component.
 * Renders the current route via <router-view> and provides
 * the global sparkle cursor effect across all pages.
 */
import SparkleEffect from './components/SparkleEffect.vue'
</script>

<template>
  <SparkleEffect />
  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
