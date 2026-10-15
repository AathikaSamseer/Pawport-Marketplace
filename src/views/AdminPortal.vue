<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { usePetStore } from '../stores/pets'

const router = useRouter()
const authStore = useAuthStore()
const petStore = usePetStore()
const isAdminAuthenticated = computed(() => authStore.currentUser?.role === 'admin')
const pets = computed(() => petStore.listings)
const email = ref('')
const password = ref('')
const loginError = ref('')
const dashboardError = ref('')
const isLoading = ref(false)

async function loadAdminListings() {
  dashboardError.value = ''
  isLoading.value = true
  try {
    await Promise.all([
      petStore.loadPets({ admin: true }),
      petStore.loadInquiries()
    ])
  } catch (error) {
    dashboardError.value = error.message
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  if (isAdminAuthenticated.value) loadAdminListings()
})

async function handleLogin() {
  loginError.value = ''
  try {
    if (authStore.isAuthenticated) await authStore.logout()
    await authStore.login(email.value, password.value)
    if (authStore.currentUser.role !== 'admin') {
      await authStore.logout()
      loginError.value = 'This account does not have administrator access.'
      return
    }
    loginError.value = ''
    email.value = ''
    password.value = ''
    await loadAdminListings()
  } catch (error) {
    loginError.value = error.message
  }
}

// Form & Modal State
const isModalOpen = ref(false)
const isEditing = ref(false)
const editingId = ref(null)

const formData = ref({
  name: '',
  species: 'Dog',
  breed: '',
  ageYears: 1,
  gender: 'Male',
  type: 'Adoption',
  price: 0,
  vaccinated: false,
  neutered: false,
  healthNotes: '',
  description: '',
  imageUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=800&q=80',
  status: 'Available'
})

function openCreateModal() {
  isEditing.value = false
  editingId.value = null
  formData.value = {
    name: '',
    species: 'Dog',
    breed: '',
    ageYears: 1,
    gender: 'Male',
    type: 'Adoption',
    price: 0,
    vaccinated: false,
    neutered: false,
    healthNotes: '',
    description: '',
    imageUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=800&q=80',
    status: 'Available'
  }
  isModalOpen.value = true
}

function openEditModal(pet) {
  isEditing.value = true
  editingId.value = pet.id
  formData.value = { ...pet }
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
}

async function handleSubmit() {
  if (!formData.value.name.trim() || !formData.value.breed.trim()) {
    alert('Please fill out all required fields.')
    return
  }

  dashboardError.value = ''
  try {
    if (isEditing.value) {
      await petStore.updateAdminPet(editingId.value, formData.value)
    } else {
      await petStore.createAdminPet(formData.value)
    }
    closeModal()
  } catch (error) {
    dashboardError.value = error.message
  }
}

async function confirmDelete(id, name) {
  if (confirm(`Are you sure you want to delete ${name} from the database?`)) {
    dashboardError.value = ''
    try {
      await petStore.deleteAdminPet(id)
    } catch (error) {
      dashboardError.value = error.message
    }
  }
}

async function handleLogout() {
  try {
    await authStore.logout()
    await router.push('/')
  } catch (error) {
    dashboardError.value = error.message
  }
}
</script>

<template>
  <div class="admin-wrapper">
    <!-- VIEW 1: LOGIN FORM IF NOT AUTHENTICATED -->
    <section v-if="!isAdminAuthenticated" class="login-screen">
      <!--<div class="login-topbar">
        <RouterLink to="/" class="back-button">← Back to user login</RouterLink>
      </div>-->

      <div class="auth-card">
        <h2>🔒 PawPort Admin Portal</h2>
        <p class="subtitle">Please authenticate to manage listings</p>

        <form @submit.prevent="handleLogin" class="form">
          <div class="form-group">
            <label for="admin-email">Administrator email</label>
            <input id="admin-email" v-model="email" type="email" placeholder="Enter administrator email" required />
          </div>

          <div class="form-group">
            <label for="admin-password">Password</label>
            <input id="admin-password" v-model="password" type="password" placeholder="Enter password" required />
          </div>

          <p v-if="loginError" class="error">{{ loginError }}</p>

          <button type="submit" class="btn btn-primary">Log In</button>
        </form>
      </div>
    </section>

    <!-- VIEW 2: ADMIN CRUD DASHBOARD -->
    <section v-else class="dashboard">
      <header class="dash-header">
        <div>
          <h2>🐾 PawPort Listing Management</h2>
          <p>Total items: {{ pets.length }}</p>
        </div>
        <div class="actions">
          <RouterLink to="/" class="btn btn-secondary">Back to Main Site</RouterLink>
          <button @click="openCreateModal" class="btn btn-primary">+ Add New Pet</button>
          <button @click="handleLogout" class="btn btn-secondary">Log Out</button>
        </div>
      </header>
      <p v-if="dashboardError" class="error">{{ dashboardError }}</p>

      <!-- READ: LISTINGS TABLE -->
      <div class="table-container">
        <table class="crud-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Species</th>
              <th>Breed</th>
              <th>Age</th>
              <th>Price ($)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pet in pets" :key="pet.id">
              <td>#{{ pet.id }}</td>
              <td><strong>{{ pet.name }}</strong></td>
              <td>{{ pet.species }}</td>
              <td>{{ pet.breed }}</td>
              <td>{{ pet.ageYears }} yr(s)</td>
              <td>${{ pet.price }}</td>
              <td>
                <span :class="['badge', pet.status.toLowerCase()]">
                  {{ pet.status }}
                </span>
              </td>
              <td>
                <button @click="openEditModal(pet)" class="btn-sm btn-edit">Edit</button>
                <button @click="confirmDelete(pet.id, pet.name)" class="btn-sm btn-delete">Delete</button>
              </td>
            </tr>
            <tr v-if="isLoading">
              <td colspan="8" class="empty-state">Loading listings...</td>
            </tr>
            <tr v-if="pets.length === 0 && !isLoading && !dashboardError">
              <td colspan="8" class="empty-state">No listings found. Click "+ Add New Pet" to create one.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <section class="inquiries-section">
        <h3>Listing inquiries</h3>
        <p v-if="petStore.inquiries.length === 0" class="empty-state">No inquiries have been received yet.</p>
        <article v-for="inquiry in petStore.inquiries" :key="inquiry.id" class="inquiry-card">
          <div class="inquiry-heading">
            <strong>{{ inquiry.fullName }}</strong>
            <span>For {{ inquiry.petName }}</span>
          </div>
          <p><a :href="`mailto:${inquiry.email}`">{{ inquiry.email }}</a><span v-if="inquiry.phone"> · {{ inquiry.phone }}</span></p>
          <p>{{ inquiry.livingArrangement }}<span v-if="inquiry.hasOtherPets"> · Has other pets</span></p>
          <p>{{ inquiry.message }}</p>
        </article>
      </section>

      <!-- CREATE / UPDATE MODAL -->
      <div v-if="isModalOpen" class="modal-backdrop">
        <div class="modal">
          <h3>{{ isEditing ? 'Edit Pet Listing' : 'Create New Pet Listing' }}</h3>

          <form @submit.prevent="handleSubmit">
            <div class="form-group">
              <label>Pet Name *</label>
              <input v-model="formData.name" required />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Species</label>
                <select v-model="formData.species">
                  <option value="Dog">Dog</option>
                  <option value="Cat">Cat</option>
                  <option value="Bird">Bird</option>
                  <option value="Rabbit">Rabbit</option>
                </select>
              </div>

              <div class="form-group">
                <label>Breed *</label>
                <input v-model="formData.breed" required />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Age (years)</label>
                <input v-model.number="formData.ageYears" type="number" min="0" required />
              </div>

              <div class="form-group">
                <label>Price ($)</label>
                <input v-model.number="formData.price" type="number" min="0" required />
              </div>
            </div>

            <div class="form-group">
              <label>Status</label>
              <select v-model="formData.status">
                <option value="Available">Available</option>
                <option value="Pending">Pending</option>
                <option value="Adopted">Adopted</option>
              </select>
            </div>

            <div class="modal-buttons">
              <button type="button" @click="closeModal" class="btn btn-secondary">Cancel</button>
              <button type="submit" class="btn btn-primary">
                {{ isEditing ? 'Save Changes' : 'Create Listing' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped src="../assets/styles/admin.css"></style>