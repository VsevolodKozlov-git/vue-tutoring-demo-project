import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: import('@/views/HomeView.vue'),
    },
    {
      path: '/hangman',
      name: 'hangman',
      component: () => import('@/views/HangmanView.vue'),
    },
    {
      path: '/blackjack',
      name: 'blackjack',
      component: () => import('@/views/BlackJackView.vue'),
    },
    {
      path: '/search',
      name: 'search',
      component: () => import('@/views/SearchView.vue'),
    },
  ],
})

export default router
