<script setup>
import { onMounted, ref } from 'vue'
import { usePetStore } from '../stores/pets'
import PetCard from '../components/pets/PetCard.vue'

const petStore = usePetStore()
const loadError = ref('')

onMounted(async () => {
  try {
    await petStore.loadPets()
  } catch (error) {
    loadError.value = error.message
  }
})
</script>

<template>
  <div class="container">
    <header class="hero">
      <h1>Find Your Ideal Companion</h1>
      <p>Explore pets available for adoption, donation, or direct purchase.</p>
    </header>

    <section class="filters-bar">
      <div class="filter-item">
        <label>Species</label>
        <select v-model="petStore.activeFilters.species">
          <option value="All">All Species</option>
          <option value="Dog">Dog</option>
          <option value="Cat">Cat</option>
        </select>
      </div>

      <div class="filter-item">
        <label>Listing Type</label>
        <select v-model="petStore.activeFilters.type">
          <option value="All">All Types</option>
          <option value="Adoption">Adoption / Donation</option>
          <option value="Sale">Sale</option>
        </select>
      </div>

      <div class="filter-item checkbox-wrap">
        <label>
          <input type="checkbox" v-model="petStore.activeFilters.vaccinatedOnly" />
          Vaccinated Only
        </label>
      </div>
    </section>

    <div v-if="loadError" class="empty-state error-state">{{ loadError }}</div>
    <div v-else-if="!petStore.hasLoaded" class="empty-state">Loading pet listings...</div>
    <div v-else-if="petStore.filteredPets.length === 0" class="empty-state">
      <p>No pets match your current search filters.</p>
    </div>

    <section v-else class="grid">
      <PetCard v-for="pet in petStore.filteredPets" :key="pet.id" :pet="pet" />
    </section>
  </div>
</template>

<style scoped>
.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px;
}
.hero {
  text-align: center;
  margin-bottom: 32px;
}
.hero h1 {
  font-size: 2.25rem;
  margin-bottom: 8px;
  color: #0f172a;
}
.hero p {
  color: #64748b;
  margin: 0;
}
.filters-bar {
  display: flex;
  gap: 16px;
  background: #ffffff;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  margin-bottom: 32px;
  align-items: flex-end;
}
.filter-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.filter-item label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
}
.filter-item select {
  padding: 8px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
}
.checkbox-wrap {
  justify-content: center;
  height: 38px;
}
.checkbox-wrap label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 24px;
}
.empty-state {
  text-align: center;
  padding: 48px;
  color: #94a3b8;
}
.error-state {
  color: #dc2626;
}
</style>