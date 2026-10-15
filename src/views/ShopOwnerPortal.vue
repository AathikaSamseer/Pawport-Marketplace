<script setup>
import { ref, computed } from 'vue'
import { useUserAuth } from '../services/userAuth'
import { usePetStore } from '../services/petStore'

const { currentUser } = useUserAuth()
const { pets, createPet, updatePet, deletePet } = usePetStore()

// View Tab: 'my_inventory' vs 'common_market'
const activeTab = ref('my_inventory')

// Filter for Common Market: 'all', 'adopt', 'sale'
const marketFilter = ref('all')

// List of pets owned by THIS shop
const myPets = computed(() => {
  return pets.value.filter(p => p.ownerId === currentUser.value?.id)
})

// List of pets owned by OTHER shops
const otherShopPets = computed(() => {
  return pets.value.filter(p => {
    const isOther = p.ownerId !== currentUser.value?.id
    if (!isOther) return false
    if (marketFilter.value === 'all') return true
    return p.listingType === marketFilter.value
  })
})

// Modal & Form State for CRUD
const isModalOpen = ref(false)
const isEditing = ref(false)
const editingId = ref(null)

const formData = ref({
  name: '',
  species: 'Dog',
  breed: '',
  age: 1,
  listingType: 'sale', // 'adopt' or 'sale'
  adoptionFee: 0,
  price: 0,
  image: ''
})

function openCreateModal() {
  isEditing.value = false
  editingId.value = null
  formData.value = {
    name: '',
    species: 'Dog',
    breed: '',
    age: 1,
    listingType: 'sale',
    adoptionFee: 0,
    price: 150,
    image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=500'
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

function handleSavePet() {
  if (!formData.value.name.trim() || !formData.value.breed.trim()) {
    alert('Please enter the pet name and breed.')
    return
  }

  if (isEditing.value) {
    updatePet(editingId.value, formData.value, currentUser.value.id)
  } else {
    createPet(formData.value, currentUser.value)
  }
  closeModal()
}

function handleDeletePet(pet) {
  if (confirm(`Are you sure you want to delete ${pet.name}? This will remove it from the common site.`)) {
    deletePet(pet.id, currentUser.value.id)
  }
}

// B2B Actions on Other Shops
function handleB2BAdopt(pet) {
  alert(`Adoption transfer request sent to ${pet.shopName} for ${pet.name}!`)
}

function handleB2BBuy(pet) {
  alert(`B2B Purchase order initiated for ${pet.name} from ${pet.shopName} for $${pet.price}.`)
}
</script>

<template>
  <div class="shop-portal">
    <!-- SHOP HEADER & METRICS -->
    <header class="shop-header">
      <div class="shop-meta">
        <h2>🏪 {{ currentUser?.shopName || 'My Pet Store' }}</h2>
        <p class="sub-text">
          Owner: <strong>{{ currentUser?.username }}</strong> • 
          Location: <strong>{{ currentUser?.location || 'Registered Vendor' }}</strong>
        </p>
      </div>

      
    </header>

    <!-- SECTION 1: MY INVENTORY (FULL CRUD) -->
    <section v-if="activeTab === 'my_inventory'" class="portal-section">
      <div class="section-bar">
        <div>
          <h3>Manage Your Listings</h3>
          <p class="section-sub">Any updates made here immediately publish to the common pet listing catalog.</p>
        </div>
        <button class="btn btn-primary" @click="openCreateModal">+ Add New Pet to Common Site</button>
      </div>

      <!-- INVENTORY TABLE -->
      <div class="table-card">
        <table class="inventory-table">
          <thead>
            <tr>
              <th>Preview</th>
              <th>Name & Breed</th>
              <th>Category</th>
              <th>Fee / Price</th>
              <th>Status</th>
              <th>My Shop Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pet in myPets" :key="pet.id">
              <td>
                <img :src="pet.image" class="thumb" :alt="pet.name" />
              </td>
              <td>
                <strong>{{ pet.name }}</strong>
                <div class="meta-small">{{ pet.species }} • {{ pet.breed }} ({{ pet.age }} yrs)</div>
              </td>
              <td>
                <span :class="['tag', pet.listingType]">
                  {{ pet.listingType === 'adopt' ? '🏡 Adoption' : '🏷️ For Sale' }}
                </span>
              </td>
              <td>
                <span v-if="pet.listingType === 'adopt'">${{ pet.adoptionFee }} fee</span>
                <span v-else class="price">${{ pet.price }}</span>
              </td>
              <td>
                <span class="status-badge">{{ pet.status }}</span>
              </td>
              <td>
                <button class="btn-sm btn-edit" @click="openEditModal(pet)">Edit</button>
                <button class="btn-sm btn-delete" @click="handleDeletePet(pet)">Delete</button>
              </td>
            </tr>
            <tr v-if="myPets.length === 0">
              <td colspan="6" class="empty-cell">
                You have not posted any pets yet. Click <strong>"+ Add New Pet"</strong> to start selling or listing adoptions.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- SECTION 2: COMMON MARKETPLACE (INTERACTION WITH OTHER SHOPS) -->
    <section v-else class="portal-section">
      <div class="section-bar">
        <div>
          <h3>Partner & External Shop Listings</h3>
          <p class="section-sub">Network with other shops: source new pets for your shop or collaborate on rescue adoptions.</p>
        </div>

        <div class="filter-pills">
          <button 
            :class="['pill', { active: marketFilter === 'all' }]"
            @click="marketFilter = 'all'"
          >
            All
          </button>
          <button 
            :class="['pill', { active: marketFilter === 'sale' }]"
            @click="marketFilter = 'sale'"
          >
            Available to Buy (B2B)
          </button>
          <button 
            :class="['pill', { active: marketFilter === 'adopt' }]"
            @click="marketFilter = 'adopt'"
          >
            Available to Adopt
          </button>
        </div>
      </div>

      <!-- EXTERNAL PETS GRID -->
      <div class="market-grid">
        <article v-for="pet in otherShopPets" :key="pet.id" class="partner-card">
          <img :src="pet.image" :alt="pet.name" class="card-img" />
          
          <div class="card-content">
            <div class="card-header-row">
              <h4>{{ pet.name }}</h4>
              <span class="origin-shop">🏪 {{ pet.shopName }}</span>
            </div>

            <p class="pet-desc">{{ pet.species }} • {{ pet.breed }} • {{ pet.age }} yr(s)</p>

            <div class="deal-info">
              <span v-if="pet.listingType === 'adopt'" class="deal-tag adopt-tag">
                Adoption Rehome (${{ pet.adoptionFee }})
              </span>
              <span v-else class="deal-tag sale-tag">
                Wholesale Price: ${{ pet.price }}
              </span>
            </div>

            <!-- B2B ACTIONS: CANNOT EDIT OR DELETE -->
            <div class="b2b-actions">
              <button 
                v-if="pet.listingType === 'adopt'" 
                class="btn btn-b2b-adopt" 
                @click="handleB2BAdopt(pet)"
              >
                🤝 Request Adoption Transfer
              </button>
              <button 
                v-else 
                class="btn btn-b2b-buy" 
                @click="handleB2BBuy(pet)"
              >
                🛒 Buy from {{ pet.shopName }}
              </button>
            </div>
          </div>
        </article>

        <div v-if="otherShopPets.length === 0" class="empty-state">
          No external listings match the selected category right now.
        </div>
      </div>
    </section>

    <!-- CREATE / EDIT MODAL -->
    <div v-if="isModalOpen" class="modal-overlay">
      <div class="modal-box">
        <h3>{{ isEditing ? 'Edit Pet in Your Inventory' : 'Post Pet to Common Catalog' }}</h3>

        <form @submit.prevent="handleSavePet" class="modal-form">
          <div class="form-group">
            <label>Pet Name *</label>
            <input v-model="formData.name" placeholder="e.g. Max" required />
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
              <input v-model="formData.breed" placeholder="e.g. Labrador" required />
            </div>
          </div>

          <!-- ROLE/PURPOSE SELECTION: ADOPTION OR SELLER -->
          <div class="form-group">
            <label>Listing Category</label>
            <div class="radio-row">
              <label class="radio-card" :class="{ selected: formData.listingType === 'sale' }">
                <input type="radio" value="sale" v-model="formData.listingType" />
                <span>🏷️ For Sale (Direct Buyer / B2B)</span>
              </label>
              <label class="radio-card" :class="{ selected: formData.listingType === 'adopt' }">
                <input type="radio" value="adopt" v-model="formData.listingType" />
                <span>🏡 Adoption (Shelter / Rehome)</span>
              </label>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Age (Years)</label>
              <input v-model.number="formData.age" type="number" min="0" required />
            </div>

            <div v-if="formData.listingType === 'sale'" class="form-group">
              <label>Sale Price ($) *</label>
              <input v-model.number="formData.price" type="number" min="0" required />
            </div>

            <div v-else class="form-group">
              <label>Adoption Processing Fee ($)</label>
              <input v-model.number="formData.adoptionFee" type="number" min="0" />
            </div>
          </div>

          <div class="form-group">
            <label>Photo URL</label>
            <input v-model="formData.image" placeholder="https://..." />
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="closeModal">Cancel</button>
            <button type="submit" class="btn btn-primary">
              {{ isEditing ? 'Update Listing' : 'Publish Listing' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped src="../assets/styles/shop-portal.css"></style>