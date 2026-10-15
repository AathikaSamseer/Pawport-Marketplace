import { createRouter, createWebHistory } from 'vue-router'

// Active Views
import AuthView from '../views/AuthView.vue'
import MarketplaceView from '../views/MarketplaceView.vue'
import ShopOwnerPortal from '../views/ShopOwnerPortal.vue'
import AdminPortal from '../views/AdminPortal.vue'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: AuthView
  },
  {
    path: '/marketplace',
    name: 'Marketplace',
    component: MarketplaceView
  },
  {
    path: '/shop-portal',
    name: 'ShopPortal',
    component: ShopOwnerPortal
  },
  {
    path: '/admin',
    name: 'AdminPortal',
    component: AdminPortal
  }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router