import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiRequest, ApiError } from '../services/api'

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref(null)
  const isRestored = ref(false)
  const isAuthenticated = computed(() => currentUser.value !== null)
  const canManageListings = computed(() => ['provider', 'admin'].includes(currentUser.value?.role))

  async function restoreSession() {
    if (isRestored.value) return currentUser.value
    try {
      const { user } = await apiRequest('/api/auth/me')
      currentUser.value = user
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) {
        throw error
      }
      currentUser.value = null
    }
    isRestored.value = true
    return currentUser.value
  }

  async function login(email, password) {
    const { user } = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
    currentUser.value = user
    isRestored.value = true
    return currentUser.value
  }

  async function signup(account) {
    const { user } = await apiRequest('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(account)
    })
    currentUser.value = user
    isRestored.value = true
    return currentUser.value
  }

  async function logout() {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' })
    } finally {
      currentUser.value = null
      isRestored.value = true
    }
  }

  function clearSession() {
    currentUser.value = null
    isRestored.value = true
  }

  return {
    currentUser,
    isAuthenticated,
    isRestored,
    canManageListings,
    restoreSession,
    login,
    signup,
    logout,
    clearSession
  }
})