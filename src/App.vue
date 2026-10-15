<script setup>
import { ref, watchEffect } from 'vue'
import { useUserAuth } from './services/userAuth'
import AuthView from './views/AuthView.vue'
import MarketplaceView from './views/MarketplaceView.vue'
import ShopOwnerPortal from './views/ShopOwnerPortal.vue'
import AdminPortal from './views/AdminPortal.vue'

const { currentUser, logout } = useUserAuth()

// Views: 'auth', 'marketplace', 'shop_portal', 'admin'
const currentView = ref('auth')

watchEffect(() => {
  if (!currentUser.value) {
    if (currentView.value !== 'admin') {
      currentView.value = 'auth'
    }
  } else if (currentUser.value.role === 'shop') {
    currentView.value = 'shop_portal'
  } else {
    currentView.value = 'marketplace'
  }
})

function handleAuthSuccess(user) {
  if (user.role === 'shop') {
    currentView.value = 'shop_portal'
  } else {
    currentView.value = 'marketplace'
  }
}

function handleLogout() {
  logout()
  currentView.value = 'auth'
}
</script>

<template>
  <div class="pawport-shell">
    <header class="app-nav">
      <div class="nav-brand" @click="currentView = currentUser ? (currentUser.role === 'shop' ? 'shop_portal' : 'marketplace') : 'auth'">
        🐾 PawPort
      </div>

      <div class="nav-controls">
        <template v-if="currentUser">
          <span class="user-badge">
            👤 {{ currentUser.username }} 
            <small v-if="currentUser.role === 'shop'">(Shop: {{ currentUser.shopName }})</small>
            <small v-else>(Buyer/Adopter)</small>
          </span>

          <!-- Shop Owner Nav Links -->
          <template v-if="currentUser.role === 'shop'">
            <button 
              :class="['nav-link-btn', { active: currentView === 'shop_portal' }]" 
              @click="currentView = 'shop_portal'"
            >
              Shop Dashboard
            </button>
            <button 
              :class="['nav-link-btn', { active: currentView === 'marketplace' }]" 
              @click="currentView = 'marketplace'"
            >
              Public Catalog
            </button>
          </template>

          <!-- Normal User Nav Links -->
          <template v-else>
            <button 
              :class="['nav-link-btn', { active: currentView === 'marketplace' }]" 
              @click="currentView = 'marketplace'"
            >
              Marketplace
            </button>
          </template>

          <button class="nav-link-btn btn-logout" @click="handleLogout">Logout</button>
        </template>

        <!-- Admin Gateway (Hidden when logged in) -->
        <button 
          v-if="!currentUser"
          :class="['nav-link-btn', 'admin-pill', { active: currentView === 'admin' }]" 
          @click="currentView = 'admin'">
          🛡️ Admin Portal
        </button>

        <button 
          v-if="!currentUser && currentView === 'admin'" 
          class="nav-link-btn" 
          @click="currentView = 'auth'"
        >
          Back to Login
        </button>
      </div>
    </header>

    <main class="app-body">
      <AuthView 
        v-if="currentView === 'auth'" 
        @auth-success="handleAuthSuccess" 
        @go-to-admin="currentView = 'admin'" 
      />
      <ShopOwnerPortal v-else-if="currentView === 'shop_portal'" />
      <MarketplaceView v-else-if="currentView === 'marketplace'" />
      <AdminPortal v-else-if="currentView === 'admin'" />
    </main>
  </div>
</template>

<style scoped>
.pawport-shell {
  min-height: 100vh;
  background-color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.app-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
}

.nav-brand {
  font-size: 1.3rem;
  font-weight: bold;
  cursor: pointer;
  color: #0f172a;
}

.nav-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-badge {
  font-size: 0.85rem;
  font-weight: 600;
  background: #f1f5f9;
  padding: 6px 12px;
  border-radius: 20px;
  color: #334155;
}

.user-badge small {
  color: #64748b;
  font-weight: normal;
}

.nav-link-btn {
  padding: 7px 14px;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  cursor: pointer;
}

.nav-link-btn.active {
  background: #0ea5e9;
  border-color: #0ea5e9;
  color: white;
}

.admin-pill {
  background: #fef2f2;
  border-color: #fecaca;
  color: #991b1b;
}

.admin-pill.active {
  background: #ef4444;
  border-color: #ef4444;
  color: white;
}

.btn-logout {
  background: #f1f5f9;
  color: #64748b;
}
</style>