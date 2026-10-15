<script setup>
import { ref } from 'vue'
import { useUserAuth } from '../services/userAuth'

const emit = defineEmits(['auth-success'])
const { login, register } = useUserAuth()

const isLoginMode = ref(true)
const errorMessage = ref('')

// Login Form
const loginForm = ref({
  accountInput: '',
  password: ''
})

// Sign-Up Form
const signupForm = ref({
  role: 'user', // 'user' or 'shop'
  email: '',
  username: '',
  password: '',
  phone: '',
  shopName: '',
  location: '',
  defaultMode: 'adopter'
})

function handleLoginSubmit() {
  errorMessage.value = ''
  const result = login(loginForm.value.accountInput, loginForm.value.password)
  if (result.success) {
    emit('auth-success', result.user)
  } else {
    errorMessage.value = result.message
  }
}

function handleSignupSubmit() {
  errorMessage.value = ''
  if (!signupForm.value.email || !signupForm.value.username || !signupForm.value.password) {
    errorMessage.value = 'Please fill out all required fields.'
    return
  }

  if (signupForm.value.role === 'shop' && !signupForm.value.shopName) {
    errorMessage.value = 'Please provide your Shop or Shelter name.'
    return
  }

  const result = register(signupForm.value)
  if (result.success) {
    emit('auth-success', result.user)
  } else {
    errorMessage.value = result.message
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="card-top">
        <span class="logo-mark">🐾</span>
        <h2>Welcome to PawPort</h2>
        <p class="tagline">
          {{ isLoginMode ? 'Sign in to explore pets, adopt, or manage your shop' : 'Create an account to get started' }}
        </p>
      </div>

      <!-- ERROR ALERT -->
      <div v-if="errorMessage" class="error-banner">
        ⚠️ {{ errorMessage }}
      </div>

      <!-- 1. LOGIN FORM -->
      <form v-if="isLoginMode" @submit.prevent="handleLoginSubmit" class="form-container">
        <div class="form-group">
          <label>Username or Email</label>
          <input 
            v-model="loginForm.accountInput" 
            type="text" 
            placeholder="e.g. alex or alex@example.com" 
            required 
          />
        </div>

        <div class="form-group">
          <label>Password</label>
          <input 
            v-model="loginForm.password" 
            type="password" 
            placeholder="••••••••" 
            required 
          />
        </div>

        <!-- BUTTON TEXT CHANGED TO "Login" -->
        <button type="submit" class="btn btn-submit">Login</button>

        <!-- CREATE ACCOUNT LINK -->
        <p class="switch-mode-text">
          Don't have an account? 
          <a href="#" @click.prevent="isLoginMode = false; errorMessage = ''">Create account</a>
        </p>
      </form>

      <!-- 2. SIGN-UP FORM -->
      <form v-else @submit.prevent="handleSignupSubmit" class="form-container">
        <div class="role-selector">
          <label class="role-option" :class="{ selected: signupForm.role === 'user' }">
            <input type="radio" value="user" v-model="signupForm.role" />
            <div>
              <strong>Pet Lover</strong>
              <small>Adopter or Buyer</small>
            </div>
          </label>

          <label class="role-option" :class="{ selected: signupForm.role === 'shop' }">
            <input type="radio" value="shop" v-model="signupForm.role" />
            <div>
              <strong>Shop / Shelter</strong>
              <small>List & sell pets</small>
            </div>
          </label>
        </div>

        <div class="form-group">
          <label>Email Address *</label>
          <input v-model="signupForm.email" type="email" placeholder="you@domain.com" required />
        </div>

        <div class="form-group">
          <label>Username *</label>
          <input v-model="signupForm.username" type="text" placeholder="unique_username" required />
        </div>

        <div class="form-group">
          <label>Password *</label>
          <input v-model="signupForm.password" type="password" placeholder="At least 6 characters" required />
        </div>

        <template v-if="signupForm.role === 'shop'">
          <div class="form-group">
            <label>Shop / Shelter Business Name *</label>
            <input v-model="signupForm.shopName" type="text" placeholder="e.g. Happy Tails Shelter" required />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Phone / WhatsApp</label>
              <input v-model="signupForm.phone" type="tel" placeholder="+1 234 567 890" />
            </div>
            <div class="form-group">
              <label>City / Location</label>
              <input v-model="signupForm.location" type="text" placeholder="City or District" />
            </div>
          </div>
        </template>

        <div v-else class="form-group">
          <label>Primary Interest</label>
          <select v-model="signupForm.defaultMode">
            <option value="adopter">Adoption & Sponsoring Care Needs</option>
            <option value="buyer">Direct Pet Purchasing</option>
          </select>
        </div>

        <button type="submit" class="btn btn-submit">Sign Up</button>

        <p class="switch-mode-text">
          Already have an account? 
          <a href="#" @click.prevent="isLoginMode = true; errorMessage = ''">Login here</a>
        </p>
      </form>
    </div>
  </div>
</template>

<style scoped src="../assets/styles/auth.css"></style>