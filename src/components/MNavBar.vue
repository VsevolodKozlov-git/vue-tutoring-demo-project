<template>
  <UHeader toggle-side="right" mode="slideover">
    <template #title>
      <ULink to="/">МикроПроекты</ULink>
    </template>

    <div class="min-w-75">
      <UNavigationMenu :items="menuItems" orientation="horizontal" />
    </div>

    <template #body>
      <UNavigationMenu :items="menuItems" orientation="vertical" />
    </template>
    <!-- <UNavigationMenu :items="menuItems" orientation="vertical" type="drawer" /> -->

    <template #right>
      <UButton v-if="authState" color="neutral" variant="ghost" @click="logout">Выйти</UButton>
      <template v-else>
        <UButton color="neutral" variant="ghost" to="/login">Вход</UButton>
        <UButton color="primary" to="/register">Регистрация</UButton>
      </template>
      <UButton
        color="neutral"
        variant="ghost"
        target="_blank"
        to="https://github.com/VsevolodKozlov-git/vue-tutoring-demo-project"
        >Github</UButton
      >

      <UColorModeSwitch />
    </template>
  </UHeader>
</template>

<script setup>
import { useRouter } from 'vue-router'

import { authState, removeToken } from '@/utils/auth'

const router = useRouter()

const logout = () => {
  removeToken()
  router.push('/')
}

const menuItems = [
  [
    {
      label: 'Игры',
      children: [
        {
          label: 'Hangman',
          description: 'Классическая игра «Виселица»',
          to: '/hangman',
        },
        {
          label: 'Blackjack',
          description: 'Карточная игра «Блэкджек»',
          to: '/blackjack',
        },
      ],
    },
  ],
  [
    {
      label: 'Работа с API',
      children: [
        {
          label: 'Поиск',
          description: 'Текстовый поиск (Work In Progress)',
          to: '/search',
        },
        {
          label: 'Факты о котах',
          description: 'Случайные факты о котах',
          to: '/cat_facts',
        },
        {
          label: 'LOTR цитаты',
          description: 'Случайная цитата из «Властелина колец»',
          to: '/lotr_random_quote',
        },
        {
          label: 'LOTR фильтрация Vanilla',
          description: 'Фильтрация персонажей (чистый JS)',
          to: '/lotr_filter_character_vanilla',
        },
        {
          label: 'LOTR фильтрация Nuxt',
          description: 'Фильтрация персонажей (Nuxt)',
          to: '/lotr_filter_character_nuxt',
        },
        {
          label: 'Post-запрос',
          description: 'Добавление нового продукта',
          to: '/add_product',
        },
      ],
    },
  ],
  [
    {
      label: 'Для авторизованных',
      children: [
        {
          label: 'Профиль',
          description: 'Информация о пользователе',
          to: '/profile',
        },
      ],
    },
  ],
]
</script>

<style lang="css" scoped>
nav {
  padding: 10px 30px;
  background-color: #1c1f1f;
}
.flex-nav {
  display: flex;
  justify-content: space-between;
}

.divider {
  width: 2px;
  background-color: #ccc;
  margin: 0 10px;
}

.flex-links {
  display: flex;
}

.games {
  font-weight: 800;
  font-size: 28px;
}
</style>
