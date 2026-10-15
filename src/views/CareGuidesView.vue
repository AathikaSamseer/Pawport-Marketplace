<script setup>
const guides = [
  {
    category: 'Preventative Health',
    title: 'Core Vaccinations for Dogs & Cats',
    summary: 'Distemper, Parvovirus, Rabies, and FVRCP vaccination timeline schedules.'
  },
  {
    category: 'Nutrition',
    title: 'Post-Adoption Transition Diet',
    summary: 'Preventing gastrointestinal issues when switching food formulations over 7–10 days.'
  },
  {
    category: 'Medication Safety',
    title: 'Safe Administration of Parasite Prevention',
    summary: 'Heartworm, tick, and flea dosage schedules, safety intervals, and side effects.'
  }
]
</script>

<template>
  <div class="guides-container">
    <h2>Pet Care & Health Resources</h2>
    <p class="subtitle">Essential care, nutrition advice, and safe medication practices for new pet owners.</p>

    <div class="cards-list">
      <article v-for="(guide, index) in guides" :key="index" class="guide-card">
        <span class="category-tag">{{ guide.category }}</span>
        <h3>{{ guide.title }}</h3>
        <p>{{ guide.summary }}</p>
      </article>
    </div>
  </div>
</template>

<style scoped>
.guides-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
}
.subtitle {
  color: #64748b;
  margin-bottom: 24px;
}
.cards-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.guide-card {
  padding: 20px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
}
.category-tag {
  font-size: 0.75rem;
  text-transform: uppercase;
  font-weight: 700;
  color: #0284c7;
}
.guide-card h3 {
  margin: 6px 0;
}
.guide-card p {
  margin: 0;
  color: #475569;
}
</style>