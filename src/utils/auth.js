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
