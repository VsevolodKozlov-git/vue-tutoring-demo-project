import { createRouter, createWebHistory } from 'vue-router'

import { isAuthorized } from '@/utils/auth'

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
    {
      path: '/cat_facts',
      name: 'cat_facts',
      component: () => import('@/views/CatFactView.vue'),
    },
    {
      path: '/lotr_random_quote',
      name: 'lotr_random_quote',
      component: () => import('@/views/LotrRandomQuoteView.vue'),
    },
    {
      path: '/lotr_filter_character_vanilla',
      name: 'lotr_filter_character_vanilla',
      component: () => import('@/views/LotrFilterCharacterVanillaView.vue'),
    },
    {
      path: '/lotr_filter_character_nuxt',
      name: 'lotr_filter_character_nuxt',
      component: () => import('@/views/LotrFilterCharacterNuxtView.vue'),
    },
    {
      path: '/add_product',
      name: 'add_product',
      component: () => import('@/views/AddProductView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/ProfileView.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !isAuthorized()) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
})

export default router
