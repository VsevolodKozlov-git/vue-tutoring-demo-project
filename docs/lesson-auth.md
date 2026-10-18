# Урок: авторизация во фронтенде (Vue 3 + Vite)

В этом уроке мы добавляем в приложение полную систему авторизации: страницы входа и регистрации, страницу профиля, кнопку выхода в верхней панели и защиту маршрутов от неавторизованных пользователей.

## Что мы сделаем

- Храним токен в `localStorage` в отдельном модуле
- Создаём отдельный axios-инстанс для нашего бэкенда, который **сам** подставляет токен в каждый запрос
- Перехватываем ошибку `401`: чистим токен, показываем toast, уводим на страницу входа
- Делаем страницы `/login`, `/register`, `/profile`
- Закрываем `/profile` route guard'ом: без токена — редирект на логин, после входа — возврат на исходную страницу
- Кнопки «Вход» / «Регистрация» / «Выйти» в правой части верхней панели

**Схема решения:**

```
Пользователь
    │
    ▼
View (Login / Register / Profile)
    │
    ▼  axiosLocalInstance (baseURL: http://localhost:8200)
    │   ├─ request-интерцептор:  добавляет заголовок Authorization: Bearer <token>
    │   └─ response-интерцептор: 401 → removeToken() + toast + редирект на /login
    ▼
Наш бэкенд (FastAPI, http://localhost:8200)
```

Плюс отдельно — route guard в роутере, который не пускает на защищённые страницы без токена.

> Токен, схема `Bearer` и то, почему он живёт ограниченное время — вы уже разбирали на бэкенд-уроках. Здесь мы используем это как данность.

## Контракт API

Четыре endpoint'а нашего бэкенда (базовый URL `http://localhost:8200`):

| Метод   | Путь        | Тело запроса                                                            | Что возвращает                          | Статусы                                                             |
| ------- | ----------- | ----------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------- |
| `POST`  | `/register` | `username`, `password`, `first_name`, `second_name` (все обязательны)   | `username`, `first_name`, `second_name` | `201` — создан, `400` — логин занят, `422` — невалидные поля        |
| `POST`  | `/login`    | `username`, `password`                                                  | `access_token`, `token_type: "Bearer"`  | `200` — токен выдан, `401` — неверный логин/пароль, `422`           |
| `GET`   | `/profile`  | — (нужен заголовок `Authorization: Bearer <token>`)                     | `username`, `first_name`, `second_name` | `200`, `401` — токен невалиден/протух, `403` — заголовок не передан |
| `PATCH` | `/profile`  | `first_name` и/или `second_name` (хотя бы одно) + заголовок авторизации | актуальный профиль                      | `200`, `401`, `403`, `422`                                          |

Общий формат ошибок:

```json
{ "detail": "текст ошибки" }
```

Для `422` поле `detail` — **массив** объектов валидации:

```json
{
  "detail": [
    { "loc": ["body", "username"], "msg": "field required", "type": "value_error.missing" }
  ]
}
```

Два важных нюанса из контракта:

- После `POST /register` токен **не выдают** — чтобы залогиниться, нужно отдельно вызвать `POST /login`.
- FastAPI отвечает `403`, если заголовок `Authorization` **не передан вообще**, и `401`, если токен **протух или невалиден**. Логика «перелогинься» должна срабатывать только на `401`.

---

## Шаг 1. Храним токен в localStorage — `src/utils/auth.js`

Отдельный модуль — единственное место во всём приложении, где токен появляется и исчезает. Нигде больше не трогаем `localStorage` руками.

```js
import { ref } from 'vue'

const TOKEN_KEY = 'access_token'

export const authState = ref(isAuthorized())

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
  authState.value = true
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY)
  authState.value = false
}

export function isAuthorized() {
  return Boolean(getToken())
}
```

Разбор:

- `saveToken` / `removeToken` делают **две** вещи: пишут/чистят `localStorage` **и** синхронно обновляют `authState`.
- `authState` — обычный `ref`, чтобы интерфейс (кнопки в панели) реагировал на смену авторизации.
- **Подводный камень:** `MNavBar` в нашем приложении живёт в `App.vue` _вне_ `RouterView`. Это значит, что при переходе между страницами навбар **не перемонтируется** — его `setup` не выполняется заново. Если бы состояние авторизации было простым значением, кнопка «Вход» никогда не превратилась бы в «Выйти» без перезагрузки. Реактивный `ref` решает проблему: изменили `authState.value` — и шаблон навбара перерисовался.

## Шаг 2. Отдельный axios-инстанс для локального API — `src/utils/api/axiosLocal.js`

Почему отдельный инстанс, а не глобальный `axios` или наш `axiosBase` (для the-one-api):

- интерцепторы вешаются на конкретный инстанс — нам нужна обработка 401 **только** для нашего бэкенда, а не для всех запросов приложения;
- у своего инстанса свой `baseURL`.

Начнём с создания инстанса и **request-интерцептора** — он автоматически добавляет токен из `localStorage` в каждый запрос:

```js
import axios from 'axios'
import router from '@/router'
import { getToken, removeToken } from '@/utils/auth'

export const axiosLocalInstance = axios.create({
  baseURL: 'http://localhost:8200',
})

axiosLocalInstance.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

После этого в view просто пишем `axiosLocalInstance.get('/profile')` — заголовок подставится сам. Ни в одном запросе больше не упоминаем токен.

> **Операционный момент:** фронтенд крутится на порту `8100`, бэкенд на `8200`. Это разные origin — cross-origin запрос. Бэкенд обязан разрешать CORS с origin `http://localhost:8100`, иначе браузер заблокирует все запросы до того, как наш код вообще увидит ответ.

## Шаг 3. Перехват 401 — response-интерцептор

Добавляем в тот же файл:

```js
axiosLocalInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const url = error.config?.url ?? ''
    const isAuthRequest = AUTH_ENDPOINTS.some((path) => url.startsWith(path))

    if (status === 401 && !isAuthRequest) {
      removeToken()
      unauthorizedMessageCallback?.()
      if (router.currentRoute.value.path !== '/login') {
        router.push('/login')
      }
    }

    return Promise.reject(error)
  },
)
```

Что делает обработчик при `401` (в порядке действий):

1. `removeToken()` — токен протух, дальше с ним работать бессмысленно.
2. `unauthorizedMessageCallback?.()` — показать пользователю toast (как — следующий шаг).
3. Редирект на `/login` через роутер.

Три важных решения, заложенных в этот код:

**Почему проверяем `isAuthRequest`.** В файле есть константа:

```js
const AUTH_ENDPOINTS = ['/login', '/register']
```

Неверный пароль при входе — это **тоже** `401`. Без этого условия сцена «я ввёл неверный пароль» выглядела бы так: toast «Страница доступна только авторизованным» + редирект... на ту же самую страницу логина. Абсурд. Поэтому запросы к `/login` и `/register` из глобальной обработки 401 исключены — их ошибки обрабатывает сама форма (покажем в шаге 6).

**Почему `return Promise.reject(error)`.** Интерцептор — часть promise-цепочки. Если мы обработали 401 (побочные эффекты выполнены), но вернём `undefined`, вызывающий код решит, что запрос **успешно** завершился. Например, `ProfileView` сделает так:

```js
const { data } = await axiosLocalInstance.get('/profile')
form.value = { first_name: data.first_name, ... } // data === undefined → TypeError
```

`Promise.reject(error)` говорит: «глобальные последствия я сделал, но ошибка жива — её должен обработать и вызывающий код». Все наши view имеют `catch`, где показывают свою контекстную ошибку.

**Почему `router.currentRoute.value.path !== '/login'`.** Не создаём лишнюю навигацию, если пользователь уже на странице входа.

**403 не трогаем.** Напомню: `403` у FastAPI означает «заголовок `Authorization` не передан вообще». Это не «токен протух», и перелогин здесь не поможет — на 403 мы не реагируем, срабатываем только на 401.

## Шаг 4. Toast при 401: инъекция callback

Тост мы показываем через Nuxt UI: `useToast()`. Но вызывать `useToast()` прямо в axios-интерцепторе — плохая практика: интерцептор — обычный модуль, а не компонент, и внутри `useToast` будет вызван `inject()`, который Vue разрешает только внутри `setup()` — в dev-режиме это выведет предупреждение в консоль.

Решение — **инъекция колбэка**. Axios-модуль не знает, _как_ показывать сообщение; он лишь знает, _когда_ это нужно сделать. А _что именно_ делать (какой toast с каким текстом) определяет компонент — `App.vue`:

В `axiosLocal.js`:

```js
let unauthorizedMessageCallback = null

export function setUnauthorizedMessageCallback(callback) {
  unauthorizedMessageCallback = callback
}
```

В `App.vue` (корневой компонент, живёт всё время — идеальное место для регистрации):

```vue
<script setup>
import { RouterView } from 'vue-router'

import MNavBar from '@/components/MNavBar.vue'
import { setUnauthorizedMessageCallback } from '@/utils/api/axiosLocal'
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js'

const toast = useToast()

setUnauthorizedMessageCallback(() => {
  toast.add({
    color: 'warning',
    title: 'Требуется авторизация',
    description: 'Страница доступна только авторизованным',
  })
})
</script>

<template>
  <UApp>
    <MNavBar />
    <UMain class="p-5">
      <RouterView />
    </UMain>
  </UApp>
</template>

<style scoped></style>
```

Почему это работает надёжно: `setup` у `App.vue` выполняется при старте приложения, до того, как мог произойти любой запрос. Колбэк всегда зарегистрирован раньше, чем может прилететь 401.

## Шаг 5. Редирект через роутер

Уже показали в коде интерцептора:

```js
if (router.currentRoute.value.path !== '/login') {
  router.push('/login')
}
```

Axios-модуль напрямую зависит от роутера (`import router from '@/router'`). Циклической зависимости здесь нет: роутер не импортирует `axiosLocal` на уровне модуля (view подключаются лениво).

## Шаг 6. Страница входа — `src/views/LoginView.vue`

```vue
<template>
  <div class="mx-auto max-w-md space-y-6">
    <h1 class="text-3xl font-bold">Вход</h1>

    <UForm :state="form" :validate="validateForm" @submit="onSubmit" class="space-y-4">
      <UFormField name="username" label="Логин">
        <UInput v-model="form.username" placeholder="Введите логин" />
      </UFormField>
      <UFormField name="password" label="Пароль">
        <UInput v-model="form.password" type="password" placeholder="Введите пароль" />
      </UFormField>
      <UButton type="submit" block>Войти</UButton>
    </UForm>

    <p>
      Нет аккаунта?
      <ULink to="/register" class="text-primary">Зарегистрируйтесь</ULink>
    </p>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { axiosLocalInstance, getApiErrorMessage } from '@/utils/api/axiosLocal'
import { isAuthorized, saveToken } from '@/utils/auth'
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const form = ref({ username: '', password: '' })

const validateForm = () => {
  const errors = []
  if (!form.value.username) {
    errors.push({ name: 'username', message: 'Поле обязательно' })
  }
  if (!form.value.password) {
    errors.push({ name: 'password', message: 'Поле обязательно' })
  }
  return errors
}

const onSubmit = async () => {
  try {
    const { data } = await axiosLocalInstance.post('/login', {
      username: form.value.username,
      password: form.value.password,
    })

    saveToken(data.access_token)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    router.push(redirect)
  } catch (error) {
    toast.add({
      color: 'error',
      title: 'Ошибка входа',
      description: getApiErrorMessage(error),
    })
  }
}

onMounted(() => {
  if (isAuthorized()) {
    router.replace('/')
  }
})
</script>

<style lang="css" scoped></style>
```

Разбор ключевых моментов:

- **`validateForm`** — функция валидации `UForm`: пока возвращает массив ошибок, форма не отправляется (паттерн, который мы уже использовали в формах с API).
- **`redirect` из query.** Если пользователь открыл защищённый `/profile`, guard перенаправит его на `/login?redirect=/profile`. После успешного входа мы делаем `router.push(redirect)` — пользователь возвращается туда, куда хотел. Это связывает шаги 6 и 8.
- **`catch`** — сюда попадают 401 «неверный пароль» (интерцептор его пропускает, т.к. это `/login`), 422 и сетевые ошибки. Текст ошибки берём через хелпер `getApiErrorMessage` — он же лежит в `axiosLocal.js` и умеет работать и со строковым `detail`, и с массивом 422-валидации (склейка `msg` через `'; '`).
- **`onMounted`** — если человек уже авторизован и зашёл на страницу входа, уводим его на главную.

Хелпер для текста ошибок (полный код, он же в `axiosLocal.js`):

```js
export function getApiErrorMessage(error) {
  const detail = error.response?.data?.detail

  if (typeof detail === 'string') {
    return detail
  }

  if (Array.isArray(detail)) {
    const messages = detail.map((item) => item?.msg).filter(Boolean)
    if (messages.length) {
      return messages.join('; ')
    }
  }

  return 'Ошибка запроса'
}
```

## Шаг 7. Страница регистрации — `src/views/RegisterView.vue`

Поля — ровно те, что требует `POST /register`: логин, пароль, имя, фамилия.

```vue
<template>
  <div class="mx-auto max-w-md space-y-6">
    <h1 class="text-3xl font-bold">Регистрация</h1>

    <UForm :state="form" :validate="validateForm" @submit="onSubmit" class="space-y-4">
      <UFormField name="username" label="Логин">
        <UInput v-model="form.username" placeholder="Введите логин" />
      </UFormField>
      <UFormField name="password" label="Пароль">
        <UInput v-model="form.password" type="password" placeholder="Введите пароль" />
      </UFormField>
      <UFormField name="first_name" label="Имя">
        <UInput v-model="form.first_name" placeholder="Введите имя" />
      </UFormField>
      <UFormField name="second_name" label="Фамилия">
        <UInput v-model="form.second_name" placeholder="Введите фамилию" />
      </UFormField>
      <UButton type="submit" block>Зарегистрироваться</UButton>
    </UForm>

    <p>
      Уже есть аккаунт?
      <ULink to="/login" class="text-primary">Войдите</ULink>
    </p>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { axiosLocalInstance, getApiErrorMessage } from '@/utils/api/axiosLocal'
import { isAuthorized, saveToken } from '@/utils/auth'
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js'

const router = useRouter()
const toast = useToast()

const form = ref({ username: '', password: '', first_name: '', second_name: '' })

const validateForm = () => {
  const errors = []
  const requiredFields = ['username', 'password', 'first_name', 'second_name']
  for (const name of requiredFields) {
    if (!form.value[name]) {
      errors.push({ name, message: 'Поле обязательно' })
    }
  }
  return errors
}

const onSubmit = async () => {
  try {
    await axiosLocalInstance.post('/register', {
      username: form.value.username,
      password: form.value.password,
      first_name: form.value.first_name,
      second_name: form.value.second_name,
    })

    const { data } = await axiosLocalInstance.post('/login', {
      username: form.value.username,
      password: form.value.password,
    })

    saveToken(data.access_token)
    toast.add({
      color: 'success',
      title: 'Регистрация успешна',
      description: 'Вы автоматически вошли в систему',
    })
    router.push('/')
  } catch (error) {
    toast.add({
      color: 'error',
      title: 'Ошибка регистрации',
      description: getApiErrorMessage(error),
    })
  }
}

onMounted(() => {
  if (isAuthorized()) {
    router.replace('/')
  }
})
</script>

<style lang="css" scoped></style>
```

**Двухшаговая логика** — главное, что нужно понять здесь:

1. `POST /register` — создаём пользователя. Токен API на этот шаг **не возвращает** (так задумано контрактом).
2. Сразу за ним — `POST /login` с теми же логином и паролем. Только теперь мы получаем `access_token`.
3. `saveToken` → пользователь сразу авторизован, идём на главную.

Если первый шаг упал (например, `400` — логин занят), второй не выполняется — `await` бросит исключение, и мы улетим в `catch` с toast об ошибке регистрации.

## Шаг 8. RouteGuard — `src/router/index.js`

Добавляем три роута (ленивая загрузка, как и все остальные):

```js
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
```

И глобальный guard после создания роутера:

```js
import { isAuthorized } from '@/utils/auth'

// ... createRouter(...)

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !isAuthorized()) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
})
```

Как это работает:

- `beforeEach` вызывается **перед каждой** навигацией. Если вернуть объект-маршрут — навигация отменяется и выполняется перенаправление на него.
- `meta.requiresAuth` — маркер на самом маршруте: guard не хардкодит список защищённых путей, а опрашивает `meta`. Хотите закрыть ещё один маршрут — добавляете `meta: { requiresAuth: true }`, ничего больше менять не нужно.
- `query: { redirect: to.fullPath }` — запоминаем, куда человек пытался попасть. Страница входа (шаг 6) после успешного логина делает `router.push(redirect)`.

## Шаг 9. Страница профиля — `src/views/ProfileView.vue`

Отображает данные пользователя (`GET /profile`) и даёт изменить имя и фамилию (`PATCH /profile`). Логин неизменяем — поле выведено как read-only.

```vue
<template>
  <div class="mx-auto max-w-md space-y-6">
    <h1 class="text-3xl font-bold">Профиль</h1>

    <div v-if="loading">Загрузка профиля…</div>

    <UForm
      v-else-if="profile"
      :state="form"
      :validate="validateForm"
      @submit="onSubmit"
      class="space-y-4"
    >
      <UFormField name="username" label="Логин">
        <UInput :model-value="profile.username" disabled />
      </UFormField>
      <UFormField name="first_name" label="Имя">
        <UInput v-model="form.first_name" placeholder="Введите имя" />
      </UFormField>
      <UFormField name="second_name" label="Фамилия">
        <UInput v-model="form.second_name" placeholder="Введите фамилию" />
      </UFormField>
      <UButton type="submit" block>Сохранить</UButton>
    </UForm>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'

import { axiosLocalInstance, getApiErrorMessage } from '@/utils/api/axiosLocal'
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js'

const toast = useToast()

const profile = ref(null)
const form = ref({ first_name: '', second_name: '' })
const loading = ref(true)

const loadProfile = async () => {
  try {
    const { data } = await axiosLocalInstance.get('/profile')
    profile.value = data
    form.value = { first_name: data.first_name, second_name: data.second_name }
  } catch {
    // 401 обрабатывается интерцептором: редирект на страницу логина
  } finally {
    loading.value = false
  }
}

const validateForm = () => {
  const errors = []
  if (!form.value.first_name) {
    errors.push({ name: 'first_name', message: 'Поле обязательно' })
  }
  if (!form.value.second_name) {
    errors.push({ name: 'second_name', message: 'Поле обязательно' })
  }
  return errors
}

const onSubmit = async () => {
  try {
    const { data } = await axiosLocalInstance.patch('/profile', {
      first_name: form.value.first_name,
      second_name: form.value.second_name,
    })
    profile.value = data
    form.value = { first_name: data.first_name, second_name: data.second_name }
    toast.add({
      color: 'success',
      title: 'Успех',
      description: 'Профиль обновлён',
    })
  } catch (error) {
    toast.add({
      color: 'error',
      title: 'Ошибка',
      description: getApiErrorMessage(error),
    })
  }
}

onMounted(loadProfile)
</script>

<style lang="css" scoped></style>
```

Разбор:

- **`GET /profile` при монтировании.** Заголовок `Authorization` подставил request-интерцептор (шаг 2) — в коде view об этом и речи нет.
- **401 на загрузке** — протухший токен. Здесь `catch` намеренно «пустой»: интерцептор уже сделал всё глобальное (чистка токена, toast, редирект на логин). `finally { loading.value = false }` просто не даёт странице зависнуть в состоянии загрузки.
- **`PATCH` возвращает актуальный профиль** — поэтому после сохранения обновляем и `profile`, и `form` из ответа, а не верим только своим полям.
- **Read-only логин** — `UInput` с `disabled` и `:model-value` (без `v-model`: изменять не даём).

## Шаг 10. Кнопки в верхней панели и пункт меню — `src/components/MNavBar.vue`

Правая часть шапки (`#right` слот `UHeader`). Обратите внимание на `v-if="authState"` — это тот самый реактивный `ref` из шага 1:

```vue
<template #right>
  <UButton v-if="authState" color="neutral" variant="ghost" @click="logout">Выйти</UButton>
  <template v-else>
    <UButton color="neutral" variant="ghost" to="/login">Вход</UButton>
    <UButton color="primary" to="/register">Регистрация</UButton>
  </template>
  <!-- остальные кнопки (Github, переключатель темы) -->
</template>
```

В `<script setup>`:

```js
import { useRouter } from 'vue-router'

import { authState, removeToken } from '@/utils/auth'

const router = useRouter()

const logout = () => {
  removeToken()
  router.push('/')
}
```

`removeToken()` сам обнулит `authState` — кнопки мгновенно переключатся на «Вход»/«Регистрация», навбар не перемонтируется (помните о подводном камне из шага 1).

И добавляем новый раздел в массив `menuItems`:

```js
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
```

Раздел видим всем — неавторизованный клик по «Профилю» наглядно демонстрирует работу guard'а: редирект на логин с `redirect` в query.

---

## Подводные камни (шпаргалка)

| Проблема                                                                               | Почему возникает                                                 | Как решено                                                                                                |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Неверный пароль → «Страница доступна только авторизованным» + зацикливание на `/login` | 401 при входе — это тоже 401                                     | `AUTH_ENDPOINTS`: `/login` и `/register` исключены из глобальной обработки                                |
| Crash в view после 401 (`Cannot read ... of undefined`)                                | Интерцептор «проглотил» ошибку, `await` разрешился без данных    | `return Promise.reject(error)` — ошибка доходит до `catch` вызывающего кода                               |
| Кнопка «Вход» не меняется на «Выйти»                                                   | MNavBar живёт вне `RouterView`, не перемонтируется при навигации | Реактивный `authState` (ref), обновляемый в `saveToken`/`removeToken`                                     |
| Предупреждение `inject() can only be used inside setup()` в dev-консоли                | `useToast()` вызывается в axios-модуле, а не в компоненте        | Инъекция callback: axios-модуль только вызывает `unauthorizedMessageCallback`, toast показывает `App.vue` |
| Запросы `/profile` падают с 403                                                        | Не подставили заголовок `Authorization`                          | Request-интерцептор добавляет `Bearer <token>` автоматически                                              |
| Все запросы к бэкенду блокируются браузером                                            | CORS: фронт на 8100, API на 8200                                 | Бэкенд обязан разрешать origin `http://localhost:8100`                                                    |
| Тост показывает «field required» вместо смысла                                         | 422-ошибка — `detail` это массив, а не строка                    | `getApiErrorMessage` склеивает `msg` по массиву                                                           |

## Самопроверка (сценарии ручного тестирования)

1. **Вход с неверным паролем** → toast с текстом ошибки API (`login or password is incorrect`), остаёмся на странице логина, редиректа нет.
2. **Успешный вход** → токен в `localStorage` (`access_token`), кнопка «Войти» сменилась на «Выйти», возврат на исходную страницу (если пришли с `redirect`).
3. **Открыть `/profile` без токена** → редирект на `/login?redirect=/profile`.
4. **Регистрация с занятым логином** → toast `Username already exists`, авто-входа нет.
5. **Успешная регистрация** → автоматически выполнен вход, токен в `localStorage`, success-toast.
6. **Профиль: изменить имя/фамилию, сохранить** → success-toast, данные обновлены на странице.
7. **«Выйти»** → токен удалён из `localStorage`, кнопки «Вход»/«Регистрация» вернулись, мы на главной.
8. **Протухший токен** (дождаться истечения или подменить в devtools) → любой запрос к `/profile` → 401 → toast «Страница доступна только авторизованным» + редирект на логин.

---

## Домашнее задание

Реализовать систему авторизации **самостоятельно** — с нуля, без копирования кода из урока. Урок использовать как ориентир по архитектуре: если застряли — сверьтесь со схемой и с шагами, но код пишите своими руками.

### Требования

**1. Страница входа (`/login`)**

- Форма: логин + пароль, оба поля обязательны (клиентская валидация через `validate` у формы).
- Отправка на `POST /login`. При успехе — сохранить `access_token`.
- При ошибке — показать текст ошибки API в toast (уметь и со строковым `detail`, и с массивом 422).
- После входа вернуться на страницу, с которой нас сюда редирекнули (если есть `redirect` в query), иначе — на главную.

**2. Страница регистрации (`/register`)**

- Форма: логин, пароль, имя, фамилия — все обязательны.
- `POST /register`; при успехе **автоматически** выполнить `POST /login` теми же данными и сохранить токен.
- Ошибка на любом из двух шагов — toast с текстом API.

**3. Страница профиля (`/profile`)**

- При открытии — `GET /profile`, показать логин (read-only), имя, фамилию.
- Изменить имя и/или фамилию — `PATCH /profile`, после успеха — toast и обновлённые данные.
- Запросы идут с токеном, но токен в коде страницы **не упоминается** (подставляется автоматически).

**4. Кнопки в верхней панели**

- Не авторизован: две кнопки — «Вход» и «Регистрация» (ссылки на страницы).
- Авторизован: одна кнопка «Выйти» — удаляет токен и приводит интерфейс к состоянию «не авторизован» **без перезагрузки страницы**.

**5. Защита маршрутов**

- `/profile` закрыт для неавторизованных: route guard с редиректом на `/login` и запоминанием исходного пути (`redirect` в query).
- Guard опирается на `meta` маршрута, а не на хардкод путей — чтобы закрыть новый маршрут, нужно было добавить один `meta`.

**6. Axios-инстанс для локального API**

- Отдельный инстанс с `baseURL` бэкенда (не глобальный axios).
- Request-интерцептор: автоматически добавляет `Authorization: Bearer <token>` при наличии токена.
- Response-интерцептор: при `401` (кроме `/login` и `/register`) — удалить токен, показать toast «Страница доступна только авторизованным», перейти на `/login`. Ошибка должна доходить до `catch` вызывающего кода.

### Критерий «сделано»

Все сценарии из раздела «Самопроверка» отработали без ошибок в консоли, и `npm run lint` + `npm run build` прошли успешно.
