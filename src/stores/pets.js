import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiRequest } from '../services/api'

export const usePetStore = defineStore('pets', () => {
  const listings = ref([])
  const inquiries = ref([])
  const hasLoaded = ref(false)
  const activeFilters = ref({
    species: 'All',
    type: 'All',
    vaccinatedOnly: false
  })

  const filteredPets = computed(() => {
    return listings.value.filter(pet => {
      const matchSpecies = activeFilters.value.species === 'All' || pet.species === activeFilters.value.species
      const matchType = activeFilters.value.type === 'All' || pet.type === activeFilters.value.type
      const matchVax = !activeFilters.value.vaccinatedOnly || pet.vaccinated
      return matchSpecies && matchType && matchVax
    })
  })

  function getPetById(id) {
    return listings.value.find(p => p.id === id)
  }

  async function loadPets({ admin = false } = {}) {
    const { pets } = await apiRequest(admin ? '/api/admin/pets' : '/api/pets')
    listings.value = pets
    hasLoaded.value = true
    return pets
  }

  async function loadPet(id) {
    const { pet } = await apiRequest(`/api/pets/${encodeURIComponent(id)}`)
    const index = listings.value.findIndex(listing => listing.id === pet.id)
    if (index === -1) listings.value.push(pet)
    else listings.value[index] = pet
    return pet
  }

  async function addListing(petData) {
    const { pet } = await apiRequest('/api/pets', {
      method: 'POST',
      body: JSON.stringify(petData)
    })
    listings.value.unshift(pet)
    return pet
  }

  async function createAdminPet(petData) {
    const { pet } = await apiRequest('/api/admin/pets', {
      method: 'POST',
      body: JSON.stringify(petData)
    })
    listings.value.unshift(pet)
    return pet
  }

  async function updateAdminPet(id, petData) {
    const { pet } = await apiRequest(`/api/admin/pets/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(petData)
    })
    const index = listings.value.findIndex(listing => listing.id === pet.id)
    if (index !== -1) listings.value[index] = pet
    return pet
  }

  async function deleteAdminPet(id) {
    await apiRequest(`/api/admin/pets/${encodeURIComponent(id)}`, { method: 'DELETE' })
    listings.value = listings.value.filter(pet => pet.id !== id)
  }

  async function loadInquiries() {
    const { inquiries: savedInquiries } = await apiRequest('/api/inquiries')
    inquiries.value = savedInquiries
    return savedInquiries
  }

  return {
    listings,
    inquiries,
    hasLoaded,
    activeFilters,
    filteredPets,
    getPetById,
    loadPets,
    loadPet,
    addListing,
    createAdminPet,
    updateAdminPet,
    deleteAdminPet,
    loadInquiries
  }
})