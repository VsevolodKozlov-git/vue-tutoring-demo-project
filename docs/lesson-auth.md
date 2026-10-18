# Урок: авторизация во фронтенде (Vue 3 + Vite)

В этом уроке мы добавляем в приложение полную систему авторизации: страницы входа и регистрации, страницу профиля, кнопку выхода в верхней панели и защиту маршрутов от неавторизованных пользователей.

## Что мы сделаем

- Храним токен в `localStorage` в отдельном модуле
- Создаём отдельный axios-инстанс для нашего бэкенда, который **сам** подставляет токен в каждый запрос
- Перехватываем ошибку `401`: чистим токен, показываем toast, уводим на страницу входа
- Делаем страницы `/login`, `/register`, `/profile`
- Закрываем `/profile` route guard'ом: без токена — редирект на логин
- Кнопки «Вход» / «Регистрация» / «Выйти» в правой части верхней панели

---

## Часть 1. Как работает система: 4 схемы

Прежде чем писать код — картина того, что происходит между фронтендом и бэкендом. Четыре ситуации.

### 1.1. Логин

Фронтенд отправляет логин и пароль, бэкенд их проверяет и возвращает токен:

```
 Фронтенд                            Бэкенд
    │                                    │
    │  POST /login                       │
    │  { username, password }            │
    │ ─────────────────────────────────► │
    │                                    │
    │  200 OK                            │
    │  { access_token: "eyJ...",         │
    │    token_type: "Bearer" }          │
    │ ◄───────────────────────────────── │
    │
    ▼
токен сохраняется в localStorage
```

С этого момента фронтенд доказывает бэкенду «кто я» не паролем, а токеном.

### 1.2. Прикрепление токена к запросу

После логина токен нужен в каждом запросе к бэкенду. Делать это руками в каждом запросе нельзя — axios-интерцептор **автоматически** достаёт токен из `localStorage` и прикрепляет к запросу:

```
запрос из кода:
axiosLocalInstance.get('/profile')
        │
        ▼
request-интерцептор (выполняется перед каждой отправкой):
        │
        ├─ token = localStorage.getItem('access_token')
        │
        └─ config.headers.Authorization = `Bearer ${token}`
        │
        ▼
запрос уходит в бэкенд с заголовком:
GET /profile
Authorization: Bearer eyJ...
```

### 1.3. Нет токена

Пользователь открыл защищённую страницу, а токена нет (не залогинен или токен удалён):

```
пользователь открывает /profile
        │
        ▼
route guard: есть ли токен?
        │
        ▼
localStorage.getItem('access_token')
        │
        ▼
   null — токена нет
        │
        ▼
перенаправление на /login
        │
        ▼
пользователю выводится сообщение
«Страница доступна только авторизованным»
```

> В эталонной реализации guard делает только редирект; сообщение в ситуации «нет токена» можно выводить тем же механизмом toast, что и в случае 401 (1.4), — это хорошая дополнительная задача.

### 1.4. Токен протух (ответ 401)

Токен был отправлен, но на бэкенде он уже истёк (живёт ограниченное время, например 1 час):

```
запрос с токеном:
Authorization: Bearer <протухший токен>
        │
        ▼
бэкенд: токен невалиден
        │
        ▼
401 Unauthorized
        │
        ▼
response-интерцептор:
   1. removeToken() — удалить старый токен
   2. показать toast «Страница доступна только авторизованным»
   3. перенаправить на /login
        │
        ▼
пользователь логинится заново, получает новый токен
```


---

## Часть 2. Храним токен (localStorage)

### Что такое localStorage

`localStorage` — встроенное в браузер хранилище пар «ключ–значение»:

Основные методы, которые нам нужны:

| Метод                              | Что делает                  | Возвращает                        |
| ---------------------------------- | --------------------------- | --------------------------------- |
| `localStorage.setItem(key, value)` | сохранить значение по ключу | —                                 |
| `localStorage.getItem(key)`        | прочитать значение по ключу | строку или `null`, если ключа нет |
| `localStorage.removeItem(key)`     | удалить ключ                | —                                 |

### Задание 1. Модуль токена

Создайте файл `src/utils/auth.js` и реализуйте четыре функции:

- `getToken()` — вернуть токен из `localStorage` (или `null`, если токена нет)
- `saveToken(token)` — сохранить токен в `localStorage`
- `removeToken()` — удалить токен из `localStorage`
- `isAuthorized()` — вернуть `true`, если токен есть, иначе `false`

<details>
<summary>Пример решения</summary>

```js
const TOKEN_KEY = 'access_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function isAuthorized() {
  return Boolean(getToken())
}
```

</details>


- **Почему отдельный модуль** — это единственное место во всём приложении, где токен появляется и исчезает. Больше никто не трогает `localStorage` напрямую.

### Задание 2. Реактивное состояние

Интерфейсу нужно **знать** об авторизации: верхняя панель показывает «Вход»/«Регистрация», если токена нет, и «Выйти», если есть.


Решение — реактивный `ref`, который обновляется в тех же функциях:

<details>
<summary>Эталонное решение</summary>

```js
import { ref } from 'vue'

export const authState = ref(isAuthorized())

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
  authState.value = true
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY)
  authState.value = false
}
```

</details>

---

## Часть 3. Axios-интерцепторы

### Что такое интерцепторы

У axios-инстанса есть два вида «крючков», которые выполняются для **каждого** запроса:

- **request-интерцептор** — `instance.interceptors.request.use(fn)`. Выполняется **до** отправки запроса: получает `config` запроса, может его изменить (заголовки, url, параметры) и обязан вернуть обратно.
- **response-интерцептор** — `instance.interceptors.response.use(onFulfilled, onRejected)`. Выполняется, когда пришёл ответ: первая функция — для успешных ответов, вторая — для ошибок.

Пример, не имеющий отношения к авторизации — добавить свой заголовок во все запросы:

```js
api.interceptors.request.use((config) => {
  config.headers['X-App-Version'] = '1.0'
  return config
})
```

Теперь каждый запрос этого инстанса уходит с заголовком `X-App-Version` — и нигде в бизнес-коде эту строку писать не нужно.

### Вопрос

У нас есть токен в `localStorage`, и он должен попадать в заголовок `Authorization: Bearer <token>` каждого запроса к нашему бэкенду. Как сделать это, не прописывая это в каждом запросе?

### Задание 3. Инстанс для нашего бэкенда

Создайте файл `src/utils/api/axiosLocal.js`:

1. axios-инстанс с `baseURL: 'http://localhost:8200'`.
2. request-интерцептор: если токен есть (`getToken()`), добавить заголовок `Authorization: Bearer <token>`.

Почему отдельный инстанс, а не глобальный `axios` или наш `axiosBase` для the-one-api: интерцепторы вешаются на конкретный инстанс — нам нужна такая обработка **только** для нашего бэкенда, да и `baseURL` у каждого свой.

<details>
<summary>Эталонное решение</summary>

```js
import axios from 'axios'
import { getToken } from '@/utils/auth'

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

</details>

Дальше во всех страницах просто пишем `axiosLocalInstance.get('/profile')` — заголовок подставится сам.

---

## Часть 4. Обработка 401

### Почему 401 надо обрабатывать особым образом

Вспомним схему 1.4: `401` от нашего бэкенда значит — токен невалиден или протух. У пользователя в `localStorage` лежит «мёртвый» токен, и если его не убрать, каждый следующий запрос снова получит `401`. Значит, нам нужно **одно место**, которое единообразно обработает эту ситуацию для всех запросов, — response-интерцептор нашего инстанса.

### Вопрос: что делаем, когда пришла 401?


1. **Удалить старый токен** — `removeToken()`, иначе «мёртвый» токен продолжит жить в `localStorage`.
2. **Показать пользователю сообщение** — «Страница доступна только авторизованным».
3. **Перенаправить на страницу логина** — единственный способ получить новый токен.

### Задание 4. Каркас обработчика

Добавьте в `axiosLocal.js` response-интерцептор. Начальную часть даём: статус ответа и URL запроса, который упал:

```js
axiosLocalInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const url = error.config?.url ?? ''

    // …
  },
)
```

`error.config.url` — путь, который мы запрашивали (например, `/profile`). Он понадобится нам сейчас.

**Вопрос:** какое условие надо проверить, чтобы сработать именно на 401?

### Стоп: 401 может прийти и с /login

Прежде чем писать условие, подумайте: пользователь вводит неверный пароль на странице входа. Какой статус вернёт бэкенд? `401` — «неверный логин или пароль»!

Если наш интерцептор обрабатывал **любую** 401, сцена «неверный пароль» выглядела бы так: toast «Страница доступна только авторизованным» + редирект… на ту же самую страницу логина. Токен бы удалили, хотя его и не было. Абсурд.

Вывод: глобальная обработка должна **пропускать** запросы к `/login` и `/register` — их ошибки показывает сама форма (часть 5). Запомним, какие URL относятся к «логину/регистрации»:

```js
const AUTH_ENDPOINTS = ['/login', '/register']
```

### Задание 5. Доведите интерцептор до конца

Напишите логику: при `401` на запрос, **не** относящийся к `/login`/`/register`, выполнить три действия из списка выше.

<details>
<summary>Эталонное решение</summary>

```js
import router from '@/router'
import { removeToken } from '@/utils/auth'

const AUTH_ENDPOINTS = ['/login', '/register']

let unauthorizedMessageCallback = null

export function setUnauthorizedMessageCallback(callback) {
  unauthorizedMessageCallback = callback
}

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

</details>

Разбор:

- `AUTH_ENDPOINTS.some((path) => url.startsWith(path))` — запрос к логину или регистрации?
- `unauthorizedMessageCallback?.()` — действие «показать сообщение». Как само сообщение показывается — ниже.
- `router.currentRoute.value.path !== '/login'` — если пользователь уже на странице входа, лишнюю навигацию не создаём.
- axios-модуль импортирует роутер напрямую. Циклической зависимости нет: роутер `axiosLocal` на уровне модуля не импортирует (view подключаются лениво).

### Почему ошибку нужно распространять: `Promise.reject(error)`

Интерцептор — часть promise-цепочки. Если мы обработали 401 (побочные эффекты выполнены), но вернём `undefined`, вызывающий код решит, что запрос **успешно** завершился. Пример кода, который **сломается**, если ошибку не распространять:

```js
const { data } = await axiosLocalInstance.get('/profile')
form.value = { first_name: data.first_name } // data === undefined → TypeError
```

`return Promise.reject(error)` говорит: «глобальные последствия я сделал, но ошибка жива — её должен обработать и вызывающий код». Все наши страницы имеют `catch`, где показывают свою контекстную ошибку.

### Сообщение: почему нельзя просто вызвать useToast()

Toast мы хотим показать через `useToast()` (Nuxt UI). Но интерцептор — обычный модуль, а не компонент, а внутри `useToast()` вызывается `inject()`, который Vue разрешает только внутри `setup()` — в dev-режиме это выведет предупреждение в консоль.

Решение — **инъекция callback**. Axios-модуль не знает, **как** показывать сообщение; он знает только **когда**. Что именно показывать (какой toast с каким текстом) решает компонент — `App.vue`.

### Задание 6. Подключите сообщение

1. Переменную callback и сеттер вы уже видели в эталонном решении задания 5 — убедитесь, что они у вас есть.
2. В `App.vue` (корневой компонент, живёт всё время) зарегистрируйте callback:

<details>
<summary>Эталонное решение</summary>

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

</details>

Почему это надёжно: `setup` у `App.vue` выполняется при старте приложения, до того, как мог произойти любой запрос. Callback всегда зарегистрирован раньше, чем может прилететь 401.

---

## Часть 5. Страница входа — `src/views/LoginView.vue`

Требования:

- Форма с двумя обязательными полями: логин, пароль (клиентская валидация через `validate` у формы — паттерн из прошлых уроков: пока `validateForm` возвращает массив ошибок, форма не отправляется).
- Отправка на `POST /login` (тело: `username`, `password`).
- При успехе: бэкенд вернёт `access_token` — сохранить его (`saveToken`).
- **Возврат на исходную страницу.** Если пользователя сюда редирекнули с защищённой страницы, в URL будет `?redirect=/profile` (guard, часть 7, положит его туда). После успешного входа — `router.push(redirect)`, иначе — на главную.
- При ошибке — toast с текстом ошибки API.

Текст ошибки API живёт в `error.response.data.detail`. Но у `422` `detail` — **массив** объектов валидации, а не строка. Напишите в `axiosLocal.js` хелпер `getApiErrorMessage(error)`, который умеет и со строкой, и с массивом (склейка `msg` через `'; '`), и используйте его во всех страницах.

### Задание 7. Создайте страницу входа

<details>
<summary>Эталонное решение</summary>

Хелпер (добавить в `axiosLocal.js`):

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

Страница:

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

</details>

Что важно понять в решении:

- `catch` ловит и 401 «неверный пароль» (интерцептор `/login` пропускает — см. часть 4), и 422, и сетевые ошибки — во всех случаях показываем текст API.
- `onMounted` + `isAuthorized()`: если человек уже авторизован и зашёл на страницу входа — уводим на главную.

---

## Часть 6. Страница регистрации — `src/views/RegisterView.vue`

Требования: форма с логин, пароль, имя, фамилия — все поля обязательны.

**Двухшаговая логика** — главное, что здесь нужно понять:

1. `POST /register` (тело: `username`, `password`, `first_name`, `second_name`) — создаём пользователя. Токен на этот шаг бэкенд **не возвращает** (так задумано).
2. Сразу за ним — `POST /login` с теми же логином и паролем. Теперь получаем `access_token`.
3. `saveToken` — пользователь сразу авторизован, идём на главную.

Если первый шаг упал (например, `400` — логин занят), второй не выполняется: `await` бросит исключение, и мы улетим в `catch` с toast об ошибке регистрации.

### Задание 8. Создайте страницу регистрации

<details>
<summary>Эталонное решение</summary>

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

</details>

---

## Часть 7. Route guard — `src/router/index.js`

Нам нужно, чтобы `/profile` был недоступен без токена.

**Как работают guard'ы:** `router.beforeEach(fn)` вызывается **перед каждой** навигацией. Если `fn` вернёт объект-маршрут — навигация отменяется и выполняется перенаправление на него.

Список защищённых путей хардкодить не будем — используем `meta` маршрута:

- у `/profile` вешаем `meta: { requiresAuth: true }`;
- guard проверяет `to.meta.requiresAuth && !isAuthorized()`.

Закройте новый маршрут в будущем — достаточно добавить `meta`, ничего больше менять не нужно.

### Задание 9. Добавьте роуты и guard

Три роута: `/login`, `/register`, `/profile` (ленивая загрузка, как и все остальные).

<details>
<summary>Эталонное решение</summary>

```js
import { isAuthorized } from '@/utils/auth'

// в массиве routes:
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

// после createRouter:
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !isAuthorized()) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
})
```

</details>

`query: { redirect: to.fullPath }` — запоминаем, куда человек пытался попасть. После успешного логина страница входа (часть 5) отведёт его туда.

---

## Часть 8. Страница профиля — `src/views/ProfileView.vue`

Требования:

- При открытии — `GET /profile` (заголовок подставил request-интерцептор — в коде страницы о токене **нет ни слова**), показать логин (read-only), имя, фамилию.
- Изменить имя и/или фамилию — `PATCH /profile` (тело: `first_name` и/или `second_name`). В ответе придёт **обновлённый** профиль — обновите и отображение, и форму из него, а не верьте только своим полям.
- После успешного сохранения — success-toast; при ошибке — toast с текстом API.
- Если токен протух, `GET` вернёт `401` — интерцептор уже сделал всё глобальное (чистка токена, toast, редирект). `catch` страницы может быть «пустым»; важно — `finally { loading.value = false }`, чтобы страница не зависла в состоянии загрузки.

### Задание 10. Создайте страницу профиля

<details>
<summary>Эталонное решение</summary>

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

</details>

Read-only логин — `UInput` с `disabled` и `:model-value` (без `v-model`: изменять не даём).

---

## Часть 9. Кнопки в верхней панели и меню — `src/components/MNavBar.vue`

Требования:

- В правой части шапки (`#right` слот `UHeader`): если токена нет — две кнопки «Вход» (`to="/login"`) и «Регистрация» (`to="/register"`); если есть — одна «Выйти»: удалить токен и уйти на главную.
- Помним про часть 2: панель не перемонтируется, поэтому `v-if="authState"`; `removeToken()` сам переключит состояние — кнопки сменятся мгновенно.
- В массив `menuItems` добавить раздел «Для авторизованных» с пунктом «Профиль» (`to: '/profile'`). Раздел видим всем: неавторизованный клик наглядно демонстрирует работу guard'а.

### Задание 11. Добавьте кнопки и раздел меню

<details>
<summary>Эталонное решение</summary>

```vue
<template #right>
  <UButton v-if="authState" color="neutral" variant="ghost" @click="logout">Выйти</UButton>
  <template v-else>
    <UButton color="neutral" variant="ghost" to="/login">Вход</UButton>
    <UButton color="primary" to="/register">Регистрация</UButton>
  </template>
</template>
```

```js
import { useRouter } from 'vue-router'

import { authState, removeToken } from '@/utils/auth'

const router = useRouter()

const logout = () => {
  removeToken()
  router.push('/')
}
```

```js
// в массиве menuItems новый раздел:
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

</details>

---

## Подводные камни (шпаргалка)

| Проблема                                                                               | Почему возникает                                                 | Как решено                                                                  |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Неверный пароль → «Страница доступна только авторизованным» + зацикливание на `/login` | 401 при входе — это тоже 401                                     | `AUTH_ENDPOINTS`: `/login` и `/register` исключены из глобальной обработки  |
| Crash в странице после 401 (`Cannot read ... of undefined`)                            | Интерцептор «проглотил» ошибку, `await` разрешился без данных    | `return Promise.reject(error)` — ошибка доходит до `catch` вызывающего кода |
| Кнопка «Вход» не меняется на «Выйти»                                                   | MNavBar живёт вне `RouterView`, не перемонтируется при навигации | Реактивный `authState`, обновляемый в `saveToken`/`removeToken`             |
| Предупреждение `inject() can only be used inside setup()` в dev-консоли                | `useToast()` вызывается в axios-модуле, а не в компоненте        | Инъекция callback: toast показывает `App.vue`                               |
| Запросы `/profile` падают с 403                                                        | Не подставили заголовок `Authorization`                          | Request-интерцептор добавляет `Bearer <token>` автоматически                |
| Тост показывает «field required» вместо смысла                                         | 422-ошибка — `detail` это массив, а не строка                    | `getApiErrorMessage` склеивает `msg` по массиву                             |

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

Реализовать систему авторизации **самостоятельно** — с нуля, без копирования кода из урока. Урок использовать как ориентир по архитектуре: если застряли — сверьтесь со схемами (часть 1) и с шагами, но код пишите своими руками.

### Шаг 0. Бэкенд: создайте метод PATCH /profile

Методы логина, регистрации и получения профиля (`POST /login`, `POST /register`, `GET /profile`) у вас уже есть — добавьте метод **изменения** профиля.

**`PATCH /profile`** — изменение имени и/или фамилии текущего пользователя.

- **Запрос:**
  - заголовок `Authorization: Bearer <token>` — обязателен;
  - JSON-тело: `first_name` (string, необязательно), `second_name` (string, необязательно) — можно обновить только одно из полей; `null`/отсутствует — поле не меняется.
- **Ответ при успехе:** `200`, JSON — актуальный профиль: `username`, `first_name`, `second_name`.
- **Статусы ошибок:** `401` — токен невалиден/протух; `403` — заголовок `Authorization` не передан; `422` — ошибка валидации тела.
- Формат ошибок — как у остальных методов: `{ "detail": "текст ошибки" }`.

### Шаг 1. Фронтенд: требования

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
