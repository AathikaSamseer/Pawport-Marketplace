import { ref } from 'vue'

// Role mode: 'adopter' or 'buyer'
const activeRole = ref(localStorage.getItem('pawport_user_mode') || 'adopter')
const currentUser = ref(JSON.parse(localStorage.getItem('pawport_user') || 'null') || {
  id: 101,
  name: 'Alex Johnson',
  email: 'alex@example.com'
})

export function useUserContext() {
  function setRole(mode) {
    activeRole.value = mode
    localStorage.setItem('pawport_user_mode', mode)
  }

  return {
    currentUser,
    activeRole,
    setRole
  }
}
