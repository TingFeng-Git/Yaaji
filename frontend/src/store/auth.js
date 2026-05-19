import { ref, reactive } from 'vue'

const TOKEN_KEY = 'yaji_auth_token'
const USER_KEY = 'yaji_auth_user'

export const authState = reactive({
  isAuthenticated: false,
  user: null,
  token: null,
})

export function loadAuthFromStorage() {
  const token = localStorage.getItem(TOKEN_KEY)
  const userStr = localStorage.getItem(USER_KEY)
  
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr)
      authState.token = token
      authState.user = user
      authState.isAuthenticated = true
    } catch {
      clearAuth()
    }
  }
}

export function setAuth(token, user) {
  authState.token = token
  authState.user = user
  authState.isAuthenticated = true
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth() {
  authState.token = null
  authState.user = null
  authState.isAuthenticated = false
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}
