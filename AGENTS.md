# AGENTS.md

Демонстрационное Vue 3 + Vite приложение («МикроПроекты») для курса по программированию. Один view = один урок/демо. Тестов, CI и TypeScript нет. Текст интерфейса — на русском.

## Команды

- `npm run dev` — dev-сервер на порту **8100**
- `npm run build` / `npm run preview`
- `npm run lint` — запускает oxlint + eslint, оба с автоисправлением (`--fix`)
- `npm run format` — prettier, форматирует только `src/`
- Команд для тестов и typecheck нет; проверяйте через `npm run lint` + `npm run build`.

## Структура

- `src/views/*View.vue` — по одному демо на урок (SFC с `<script setup>`)
- `src/components/M*.vue` — общие компоненты курса (MButton, MCard, MHeader, MNavBar)
- `src/router/index.js` — все роуты; алиас `@` → `src/`

## Nuxt UI (подключён в обычное Vue-приложение — не «чините» это)

- Nuxt UI v4 интегрирован через плагин `@nuxt/ui/vite` (vite.config.js) + `@nuxt/ui/vue-plugin` (src/main.js); Tailwind v4 подключается вместе с ним, отдельного tailwind-конфига нет.
- Компоненты `U*` импортируются автоматически — используйте их в шаблонах без импорта.
- Композаблы импортируются из `@nuxt/ui/runtime/...` (пример: `useToast` в AddProductView.vue).
- `auto-imports.d.ts` и `components.d.ts` генерируются при dev/build (в .gitignore) — не редактируйте вручную.

## Добавление страницы урока (все три шага обязательны)

1. Создать `src/views/XxxView.vue`
2. Добавить ленивый роут (`() => import('@/views/XxxView.vue')`) в `src/router/index.js`
3. Добавить пункт меню в `src/components/MNavBar.vue` (пункты меню дублируют роуты)

## Подвохи

- В `src/utils/api/axiosBase.js` зашит общий демо-токен Bearer для the-one-api.dev — не трогайте; новые секреты в репозиторий не добавлять.
- `sass` не установлен. В `AddProductView.vue` есть пустой блок `<style lang="scss">`, безвредный, пока он пустой — в новых view используйте `lang="css"`.
- Демо-страницы обращаются к внешним публичным API (meowfacts, the-one-api.dev, api.escuelajs.co); нужен доступ в сеть, некоторые эндпоинты нестабильны.
- Страницы авторизации/профиля работают против локального бэкенда `http://localhost:8200` (инстанс в `src/utils/api/axiosLocal.js`); он обязан разрешать CORS с origin `http://localhost:8100`.

## Соглашения

- Prettier: без точек с запятой, одинарные кавычки, ширина 100 символов; отступ 2 пробела.
- Стиль коммитов: `feat: <описание>` (на русском или английском).
