/**
 * Vue Router configuration.
 *
 * Routes:
 *  /           – Countdown page (redirects to /menu once the target date passes)
 *  /menu       – Main menu with four activity buttons
 *  /claw       – 2-D claw-machine mini-game
 *  /collection – Note collection viewer with import / export
 */
import { createRouter, createWebHistory } from 'vue-router'

import CountdownPage from '../pages/CountdownPage.vue'
import MainMenu from '../pages/MainMenu.vue'
import ClawMachine from '../pages/ClawMachine.vue'
import CollectionPage from '../pages/CollectionPage.vue'

const routes = [
  { path: '/', name: 'countdown', component: CountdownPage },
  { path: '/menu', name: 'menu', component: MainMenu },
  { path: '/claw', name: 'claw', component: ClawMachine },
  { path: '/collection', name: 'collection', component: CollectionPage },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
