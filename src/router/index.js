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
      path: '/text_search',
      name: 'text_search',
      component: () => import('@/views/TextSearch.vue'),
    },
    {
      path: '/todo',
      name: 'todo',
      component: () => import('@/views/ToDoView.vue'),
    },
  ],
})

export default router
