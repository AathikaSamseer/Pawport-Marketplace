<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePetStore } from '../stores/pets'
import PetInquiryModal from '../components/pets/PetInquiryModal.vue'

const route = useRoute()
const router = useRouter()
const petStore = usePetStore()

const isModalOpen = ref(false)
const loadError = ref('')
const pet = computed(() => petStore.getPetById(route.params.id))

onMounted(async () => {
  try {
    await petStore.loadPet(route.params.id)
  } catch (error) {
    loadError.value = error.message
  }
})
</script>

<template>
  <div v-if="loadError" class="not-found">
    <h2>Unable to load listing</h2>
    <p>{{ loadError }}</p>
    <button @click="router.push('/marketplace')">Return to Marketplace</button>
  </div>
  <div v-else-if="!pet" class="not-found">
    <h2>Loading pet listing...</h2>
  </div>
  <div v-else-if="pet" class="profile-container">
    <button class="back-link" @click="router.push('/marketplace')">&larr; Back to Marketplace</button>

    <div class="profile-layout">
      <div class="image-column">
        <img :src="pet.imageUrl" :alt="pet.name" class="main-image" />
      </div>

      <div class="details-column">
        <div class="badge-header">
          <span :class="['tag', pet.type === 'Adoption' ? 'tag-adopt' : 'tag-sale']">
            {{ pet.type }}
          </span>
          <span class="status-indicator">{{ pet.status }}</span>
        </div>

        <h1>{{ pet.name }}</h1>
        <p class="summary-line">{{ pet.breed }} &bull; {{ pet.gender }} &bull; {{ pet.ageYears }} year(s) old</p>

        <div class="price-banner">
          <span class="label">Adoption / Purchase Fee:</span>
          <span class="amount">{{ pet.type === 'Sale' ? `$${pet.price}` : 'Free / Donation-based' }}</span>
        </div>

        <section class="section">
          <h3>About {{ pet.name }}</h3>
          <p>{{ pet.description }}</p>
        </section>

        <section class="section">
          <h3>Health & Medical Information</h3>
          <ul class="health-checks">
            <li :class="{ confirmed: pet.vaccinated }">
              <span class="icon">{{ pet.vaccinated ? '✓' : '✗' }}</span>
              Vaccinations Up-to-Date
            </li>
            <li :class="{ confirmed: pet.neutered }">
              <span class="icon">{{ pet.neutered ? '✓' : '✗' }}</span>
              Spayed / Neutered
            </li>
          </ul>
          <div v-if="pet.healthNotes" class="health-notes-box">
            <strong>Notes:</strong> {{ pet.healthNotes }}
          </div>
        </section>

        <section class="section contact-section">
          <button class="cta-button" @click="isModalOpen = true">
            {{ pet.type === 'Adoption' ? 'Apply to Adopt' : 'Contact Seller to Buy' }}
          </button>
        </section>
      </div>
    </div>

    <PetInquiryModal
      :pet="pet"
      :is-open="isModalOpen"
      @close="isModalOpen = false"
    />
  </div>

  <div v-else class="not-found">
    <h2>Pet Not Found</h2>
    <p>The listing may have been adopted or removed.</p>
    <button @click="router.push('/marketplace')">Return to Marketplace</button>
  </div>
</template>

<style scoped>
.profile-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px;
}
.back-link {
  background: none;
  border: none;
  color: #0284c7;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 16px;
  padding: 0;
}
.profile-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 36px;
  background: #ffffff;
  padding: 24px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}
.main-image {
  width: 100%;
  height: 420px;
  object-fit: cover;
  border-radius: 8px;
}
.badge-header {
  display: flex;
  gap: 10px;
  align-items: center;
}
.tag {
  font-size: 0.8rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 9999px;
}
.tag-adopt { background: #dcfce7; color: #15803d; }
.tag-sale { background: #e0e7ff; color: #4338ca; }
.status-indicator {
  font-size: 0.8rem;
  color: #0284c7;
  background: #f0f9ff;
  padding: 3px 8px;
  border-radius: 4px;
}
h1 { margin: 8px 0 4px; font-size: 2rem; }
.summary-line { color: #64748b; margin-bottom: 20px; }
.price-banner {
  background: #f8fafc;
  padding: 12px 16px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.price-banner .amount { font-size: 1.25rem; font-weight: 700; color: #0f172a; }
.section { margin-bottom: 20px; }
.section h3 { margin: 0 0 8px; font-size: 1.05rem; }
.health-checks {
  list-style: none;
  padding: 0;
  margin: 0 0 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.health-checks li {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
}
.health-checks li.confirmed { color: #16a34a; font-weight: 500; }
.health-notes-box {
  background: #fffbeb;
  border-left: 4px solid #f59e0b;
  padding: 8px 12px;
  font-size: 0.85rem;
  color: #78350f;
}
.cta-button {
  width: 100%;
  padding: 14px;
  background: #0284c7;
  color: white;
  font-size: 1rem;
  font-weight: 700;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}
.cta-button:hover { background: #0369a1; }
.not-found { text-align: center; padding: 60px 20px; }
@media (max-width: 768px) {
  .profile-layout { grid-template-columns: 1fr; }
}
</style>