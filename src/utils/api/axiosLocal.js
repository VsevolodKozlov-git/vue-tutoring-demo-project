import axios from 'axios'
import router from '@/router'
import { getToken, removeToken } from '@/utils/auth'

const AUTH_ENDPOINTS = ['/login', '/register']

let unauthorizedMessageCallback = null

export function setUnauthorizedMessageCallback(callback) {
  unauthorizedMessageCallback = callback
}

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
