<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  pet: {
    type: Object,
    required: true
  }
})

const router = useRouter()

function openDetails() {
  router.push(`/pets/${props.pet.id}`)
}
</script>

<template>
  <div class="card" @click="openDetails">
    <img :src="pet.imageUrl" :alt="pet.name" class="card-img" />
    <div class="card-body">
      <div class="badge-row">
        <span :class="['tag', pet.type === 'Adoption' ? 'tag-adopt' : 'tag-sale']">
          {{ pet.type }}
        </span>
        <span class="tag tag-neutral">{{ pet.species }}</span>
      </div>
      <h3>{{ pet.name }}</h3>
      <p class="details">{{ pet.breed }} &bull; {{ pet.ageYears }} yr(s) &bull; {{ pet.gender }}</p>
      <p class="price">
        {{ pet.type === 'Sale' ? `$${pet.price}` : 'Free Adoption' }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  background: #ffffff;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
}
.card-img {
  width: 100%;
  height: 200px;
  object-fit: cover;
}
.card-body {
  padding: 16px;
}
.badge-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.tag {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 9999px;
  font-weight: 600;
}
.tag-adopt { background: #dcfce7; color: #15803d; }
.tag-sale { background: #e0e7ff; color: #4338ca; }
.tag-neutral { background: #f1f5f9; color: #475569; }
h3 { margin: 0 0 4px; font-size: 1.25rem; }
.details { margin: 0 0 12px; color: #64748b; font-size: 0.875rem; }
.price { font-weight: 700; color: #0f172a; margin: 0; }
</style>