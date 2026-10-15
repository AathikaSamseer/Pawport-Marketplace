<script setup>
import { ref, watch } from 'vue'
import { apiRequest } from '../../services/api'

const props = defineProps({
  pet: {
    type: Object,
    required: true
  },
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'submitted'])
const errorMessage = ref('')
const isSubmitting = ref(false)

const form = ref({
  fullName: '',
  email: '',
  phone: '',
  livingArrangement: 'House with yard',
  hasOtherPets: false,
  message: ''
})

const submitted = ref(false)

watch(() => props.isOpen, isOpen => {
  if (isOpen) {
    form.value = {
      fullName: '',
      email: '',
      phone: '',
      livingArrangement: 'House with yard',
      hasOtherPets: false,
      message: ''
    }
    submitted.value = false
    errorMessage.value = ''
  }
})

async function submitInquiry() {
  errorMessage.value = ''
  isSubmitting.value = true
  try {
    await apiRequest(`/api/pets/${encodeURIComponent(props.pet.id)}/inquiries`, {
      method: 'POST',
      body: JSON.stringify(form.value)
    })
    submitted.value = true
    emit('submitted')
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-card">
      <header class="modal-header">
        <h3>Contact Provider for {{ pet.name }}</h3>
        <button class="close-btn" type="button" aria-label="Close inquiry" @click="emit('close')">&times;</button>
      </header>

      <div v-if="submitted" class="success-message">
        <p>Your inquiry is saved and available to the listing provider. They can follow up at {{ form.email }}.</p>
        <button class="btn-primary" type="button" @click="emit('close')">Done</button>
      </div>

      <form v-else @submit.prevent="submitInquiry" class="inquiry-form">
        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
        <div class="form-row">
          <label>Full Name</label>
          <input v-model="form.fullName" required placeholder="Your name" />
        </div>

        <div class="form-row">
          <label>Email Address</label>
          <input type="email" v-model="form.email" required placeholder="you@example.com" />
        </div>

        <div class="form-row">
          <label>Phone Number</label>
          <input type="tel" v-model="form.phone" placeholder="(555) 000-0000" />
        </div>

        <div class="form-row">
          <label>Home Environment</label>
          <select v-model="form.livingArrangement">
            <option>House with yard</option>
            <option>Apartment / Flat</option>
            <option>Farm / Acreage</option>
          </select>
        </div>

        <div class="form-row check-row">
          <label>
            <input type="checkbox" v-model="form.hasOtherPets" />
            Currently have other pets at home
          </label>
        </div>

        <div class="form-row">
          <label>Message to Owner / Shelter</label>
          <textarea
            v-model="form.message"
            rows="3"
            placeholder="Tell them about your home environment and experience..."
            required
          ></textarea>
        </div>

        <footer class="modal-actions">
          <button type="button" class="btn-cancel" @click="emit('close')">Cancel</button>
          <button type="submit" class="btn-primary" :disabled="isSubmitting">
            {{ isSubmitting ? 'Saving...' : 'Save Inquiry' }}
          </button>
        </footer>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}
.modal-card {
  background: #ffffff;
  border-radius: 12px;
  width: 100%;
  max-width: 520px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
}
.modal-header h3 {
  margin: 0;
  font-size: 1.15rem;
}
.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #64748b;
}
.inquiry-form {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.form-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.form-row label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #334155;
}
.form-row input,
.form-row select,
.form-row textarea {
  padding: 8px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.9rem;
}
.check-row label {
  font-weight: normal;
  display: flex;
  gap: 8px;
  align-items: center;
  cursor: pointer;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}
.btn-cancel {
  padding: 8px 14px;
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
}
.btn-primary {
  padding: 8px 16px;
  background: #0284c7;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}
.btn-primary:disabled {
  opacity: 0.7;
  cursor: wait;
}
.error-message {
  color: #dc2626;
  margin: 0;
}
.success-message {
  padding: 40px 20px;
  text-align: center;
  color: #15803d;
  font-weight: 600;
}
.success-message .btn-primary {
  margin-top: 16px;
}
</style>