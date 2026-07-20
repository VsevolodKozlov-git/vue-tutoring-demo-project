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
      path: '/show',
      name: 'show',
      component: () => import('@/views/ShowView.vue'),
    },
  ],
})

export default router
