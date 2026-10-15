import { ref } from 'vue'

const initialPets = [
  {
    id: 1,
    ownerId: 2, // Belongs to Pawsome Pet Haven
    shopName: 'Pawsome Pet Haven',
    name: 'Bella',
    species: 'Dog',
    breed: 'Beagle',
    age: 2,
    listingType: 'adopt', // 'adopt' or 'sale'
    adoptionFee: 50,
    price: 0,
    status: 'Available',
    image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=500'
  },
  {
    id: 2,
    ownerId: 2, // Belongs to Pawsome Pet Haven
    shopName: 'Pawsome Pet Haven',
    name: 'Oliver',
    species: 'Cat',
    breed: 'British Shorthair',
    age: 1,
    listingType: 'sale',
    adoptionFee: 0,
    price: 650,
    status: 'Available',
    image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=500'
  },
  {
    id: 3,
    ownerId: 999, // Belongs to another external shop
    shopName: 'Green Valley Kennel',
    name: 'Rocky',
    species: 'Dog',
    breed: 'Golden Retriever',
    age: 1,
    listingType: 'sale',
    adoptionFee: 0,
    price: 800,
    status: 'Available',
    image: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=500'
  },
  {
    id: 4,
    ownerId: 999, // Belongs to another external shop
    shopName: 'Green Valley Kennel',
    name: 'Mochi',
    species: 'Rabbit',
    breed: 'Mini Rex',
    age: 1,
    listingType: 'adopt',
    adoptionFee: 25,
    price: 0,
    status: 'Available',
    image: 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=500'
  }
]

const pets = ref(JSON.parse(localStorage.getItem('pawport_pets') || 'null') || initialPets)

function save() {
  localStorage.setItem('pawport_pets', JSON.stringify(pets.value))
}

export function usePetStore() {
  // CREATE (Assigned to the active shop)
  function createPet(petData, shopUser) {
    const newPet = {
      id: Date.now(),
      ownerId: shopUser.id,
      shopName: shopUser.shopName || shopUser.username,
      name: petData.name,
      species: petData.species,
      breed: petData.breed,
      age: Number(petData.age),
      listingType: petData.listingType,
      adoptionFee: petData.listingType === 'adopt' ? Number(petData.adoptionFee || 0) : 0,
      price: petData.listingType === 'sale' ? Number(petData.price || 0) : 0,
      status: 'Available',
      image: petData.image || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=500'
    }
    pets.value.unshift(newPet)
    save()
  }

  // UPDATE (Restricted to owner)
  function updatePet(id, updatedData, currentUserId) {
    const index = pets.value.findIndex(p => p.id === id)
    if (index !== -1 && pets.value[index].ownerId === currentUserId) {
      pets.value[index] = { ...pets.value[index], ...updatedData }
      save()
      return true
    }
    return false
  }

  // DELETE (Restricted to owner)
  function deletePet(id, currentUserId) {
    const pet = pets.value.find(p => p.id === id)
    if (pet && pet.ownerId === currentUserId) {
      pets.value = pets.value.filter(p => p.id !== id)
      save()
      return true
    }
    return false
  }

  return {
    pets,
    createPet,
    updatePet,
    deletePet
  }
}