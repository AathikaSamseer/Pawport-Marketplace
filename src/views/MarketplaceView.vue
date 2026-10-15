<script setup>
import { ref, computed } from 'vue'
import { useUserContext } from '../services/userContext'
import { usePetStore } from '../services/petStore'

const { currentUser, activeRole, setRole } = useUserContext()
const { pets, contributeSupport } = usePetStore()

// Filter listings based on selected role
const displayPets = computed(() => {
  if (activeRole.value === 'adopter') {
    return pets.value.filter(p => p.listingType === 'adopt')
  } else {
    return pets.value.filter(p => p.listingType === 'sale')
  }
})

// Support / Donation Modal State
const selectedPetForSupport = ref(null)
const supportAmount = ref(10)
const selectedNeedIndex = ref(0)
const successMessage = ref('')

function openSupportModal(pet) {
  selectedPetForSupport.value = pet
  selectedNeedIndex.value = 0
  supportAmount.value = 10
}

function handleContribute() {
  if (!selectedPetForSupport.value) return
  contributeSupport(selectedPetForSupport.value.id, selectedNeedIndex.value, supportAmount.value)
  successMessage.value = `Thank you! You contributed $${supportAmount.value} to ${selectedPetForSupport.value.name}.`
  setTimeout(() => {
    selectedPetForSupport.value = null
    successMessage.value = ''
  }, 1800)
}

function handleAdopt(pet) {
  alert(`Adoption inquiry submitted for ${pet.name}! The shelter will contact ${currentUser.email}.`)
}

function handleBuy(pet) {
  alert(`Proceeding to checkout for ${pet.name} ($${pet.price}).`)
}
</script>

<template>
  <div class="user-portal">
    <!-- TOP BAR: ROLE SELECTOR -->
    <header class="role-selector-header">
      <div class="user-info">
        <h3>Welcome, {{ currentUser.name }} 👋</h3>
        <p>Select what you are looking to do today:</p>
      </div>

      <div class="toggle-buttons">
        <button
          :class="['toggle-btn', { active: activeRole === 'adopter' }]"
          @click="setRole('adopter')"
        >
          🏡 I want to Adopt / Sponsor
        </button>
        <button
          :class="['toggle-btn', { active: activeRole === 'buyer' }]"
          @click="setRole('buyer')"
        >
          🛍️ I want to Buy a Pet
        </button>
      </div>
    </header>

    <!-- BANNER CONTEXT BASED ON MODE -->
    <div class="mode-banner" :class="activeRole">
      <div v-if="activeRole === 'adopter'">
        <h4>🐾 Adoption & Care Hub</h4>
        <p>Give a rescue pet a home, or donate food, medicine, and maintenance care items for pets in need.</p>
      </div>
      <div v-else>
        <h4>🐶 Pet Marketplace</h4>
        <p>Explore verified pets available for direct purchase from verified breeders and owners.</p>
      </div>
    </div>

    <!-- PET GRID -->
    <div class="pet-grid">
      <article v-for="pet in displayPets" :key="pet.id" class="pet-card">
        <img :src="pet.image" :alt="pet.name" class="pet-thumbnail" />
        
        <div class="pet-body">
          <div class="card-title-row">
            <h4>{{ pet.name }}</h4>
            <span class="species-badge">{{ pet.species }}</span>
          </div>
          <p class="pet-meta">{{ pet.breed }} • {{ pet.age }} years old</p>

          <!-- ADOPTER VIEW DETAILS -->
          <template v-if="activeRole === 'adopter'">
            <p class="fee-text">Adoption Processing Fee: <strong>${{ pet.adoptionFee }}</strong></p>

            <!-- Support / Care Items Preview -->
            <div v-if="pet.needsSupport" class="care-box">
              <span class="care-label">Needs community support:</span>
              <ul class="needs-list">
                <li v-for="(need, idx) in pet.careNeeds" :key="idx">
                  <span>{{ need.item }}</span>
                  <span class="funding">${{ need.funded }} /${{ need.targetCost }}</span>
                </li>
              </ul>
            </div>

            <div class="card-actions">
              <button class="btn btn-adopt" @click="handleAdopt(pet)">Adopt {{ pet.name }}</button>
              <button 
                v-if="pet.needsSupport" 
                class="btn btn-sponsor" 
                @click="openSupportModal(pet)"
              >
                🥫 Sponsor Food/Care
              </button>
            </div>
          </template>

          <!-- BUYER VIEW DETAILS -->
          <template v-else>
            <div class="price-row">
              <span class="price-label">Price:</span>
              <span class="price-value">${{ pet.price }}</span>
            </div>
            <div class="card-actions">
              <button class="btn btn-buy" @click="handleBuy(pet)">Buy Now</button>
              <button class="btn btn-outline" @click="alert('Inquiry sent to seller!')">Contact Seller</button>
            </div>
          </template>
        </div>
      </article>
    </div>

    <!-- SPONSORSHIP / CARE MODAL -->
    <div v-if="selectedPetForSupport" class="modal-overlay">
      <div class="modal-card">
        <h3>Support {{ selectedPetForSupport.name }}</h3>
        <p class="modal-sub">Fund food, health, or maintenance costs while they wait for adoption.</p>

        <div v-if="successMessage" class="alert-success">{{ successMessage }}</div>

        <form v-else @submit.prevent="handleContribute">
          <div class="form-group">
            <label>Select care item to fund:</label>
            <select v-model="selectedNeedIndex">
              <option 
                v-for="(need, idx) in selectedPetForSupport.careNeeds" 
                :key="idx" 
                :value="idx"
              >
                {{ need.item }} (Remaining: ${{ need.targetCost - need.funded }})
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Contribution Amount ($):</label>
            <input v-model.number="supportAmount" type="number" min="5" step="5" required />
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="selectedPetForSupport = null">Cancel</button>
            <button type="submit" class="btn btn-sponsor">Donate ${{ supportAmount }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped src="../assets/styles/marketplace.css"></style>
