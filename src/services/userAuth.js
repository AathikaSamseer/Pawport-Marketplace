import { ref } from 'vue'

const storedUsers = JSON.parse(localStorage.getItem('pawport_users') || 'null') || [
  {
    id: 1,
    username: 'alex',
    email: 'alex@example.com',
    password: 'password123',
    role: 'user', // 'user' or 'shop'
    defaultMode: 'adopter',
    shopName: '',
    phone: ''
  },
  {
    id: 2,
    username: 'pawsome_store',
    email: 'contact@pawsome.com',
    password: 'password123',
    role: 'shop',
    shopName: 'Pawsome Pet Haven',
    phone: '+1-555-0199',
    location: 'Metro City'
  }
]

const currentUser = ref(JSON.parse(localStorage.getItem('pawport_active_user') || 'null'))

export function useUserAuth() {
  function login(usernameOrEmail, password) {
    const user = storedUsers.find(
      u => (u.username.toLowerCase() === usernameOrEmail.toLowerCase() || 
            u.email.toLowerCase() === usernameOrEmail.toLowerCase()) && 
            u.password === password
    )

    if (user) {
      currentUser.value = { ...user }
      delete currentUser.value.password
      localStorage.setItem('pawport_active_user', JSON.stringify(currentUser.value))
      return { success: true, user: currentUser.value }
    }
    return { success: false, message: 'Invalid username/email or password.' }
  }

  function register(newUser) {
    const exists = storedUsers.some(
      u => u.username.toLowerCase() === newUser.username.toLowerCase() ||
           u.email.toLowerCase() === newUser.email.toLowerCase()
    )

    if (exists) {
      return { success: false, message: 'Username or Email is already registered.' }
    }

    const created = {
      id: Date.now(),
      ...newUser
    }

    storedUsers.push(created)
    localStorage.setItem('pawport_users', JSON.stringify(storedUsers))

    // Automatically log in upon successful sign-up
    currentUser.value = { ...created }
    delete currentUser.value.password
    localStorage.setItem('pawport_active_user', JSON.stringify(currentUser.value))

    return { success: true, user: currentUser.value }
  }

  function logout() {
    currentUser.value = null
    localStorage.removeItem('pawport_active_user')
  }

  return {
    currentUser,
    login,
    register,
    logout
  }
}
