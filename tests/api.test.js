import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createPawPortServer } from '../server/app.js'

const adminEmail = 'admin@example.test'
const adminPassword = 'correct-horse-battery-staple'
let app
let baseUrl
let tempDirectory

async function request(path, { method = 'GET', body, cookie } = {}) {
  const headers = {}
  headers.Origin = baseUrl
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (cookie) headers.Cookie = cookie
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  return {
    response,
    data: await response.json(),
    cookie: response.headers.get('set-cookie')?.split(';')[0],
    setCookie: response.headers.get('set-cookie')
  }
}

async function signup(account) {
  const result = await request('/api/auth/signup', { method: 'POST', body: account })
  assert.equal(result.response.status, 201)
  return { user: result.data.user, cookie: result.cookie }
}

before(async () => {
  tempDirectory = await mkdtemp(join(tmpdir(), 'pawport-test-'))
  app = createPawPortServer({
    databasePath: join(tempDirectory, 'test.sqlite'),
    staticDirectory: join(tempDirectory, 'dist'),
    adminEmail,
    adminPassword
  })
  await app.initialize()
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve))
  baseUrl = `http://127.0.0.1:${app.server.address().port}`
})

after(async () => {
  if (app) await app.close()
  if (tempDirectory) await rm(tempDirectory, { recursive: true, force: true })
})

test('auth, listing CRUD, role access, and inquiries use the shared SQLite store', async () => {
  const session = await request('/api/auth/me')
  assert.equal(session.response.status, 200)
  assert.equal(session.data.user, null)

  const crossOrigin = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: {
      Origin: 'https://attacker.example',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Cross Origin',
      email: 'cross-origin@example.test',
      password: 'long-enough-password',
      role: 'adopter'
    })
  })
  assert.equal(crossOrigin.status, 403)

  const guest = await request('/api/pets')
  assert.equal(guest.response.status, 401)

  const invalidAccount = await request('/api/auth/signup', {
    method: 'POST',
    body: {
      name: 'Privilege Escalation',
      email: 'bad-role@example.test',
      password: 'a-secure-password',
      role: 'admin'
    }
  })
  assert.equal(invalidAccount.response.status, 400)

  const adopter = await signup({
    name: 'Adopter Example',
    email: 'adopter@example.test',
    password: 'adopter-password-123',
    role: 'adopter'
  })
  const storedAccount = app.database.db.prepare('SELECT password_hash FROM users WHERE email = ?')
    .get('adopter@example.test')
  assert.notEqual(storedAccount.password_hash, 'adopter-password-123')
  const duplicateAccount = await request('/api/auth/signup', {
    method: 'POST',
    body: {
      name: 'Duplicate',
      email: 'ADOPTER@example.test',
      password: 'another-long-password',
      role: 'adopter'
    }
  })
  assert.equal(duplicateAccount.response.status, 409)

  const provider = await signup({
    name: 'Provider Example',
    email: 'provider@example.test',
    password: 'provider-password-123',
    role: 'provider'
  })
  assert.equal(adopter.user.role, 'adopter')

  const forbiddenAdmin = await request('/api/admin/pets', {
    cookie: provider.cookie
  })
  assert.equal(forbiddenAdmin.response.status, 403)

  const listing = {
    name: 'Toby',
    species: 'Dog',
    breed: 'Terrier',
    ageYears: 2,
    gender: 'Male',
    type: 'Adoption',
    price: 0,
    vaccinated: true,
    neutered: false,
    healthNotes: 'Healthy',
    description: 'Friendly and energetic.',
    imageUrl: 'https://example.test/toby.jpg',
    status: 'Available'
  }
  const created = await request('/api/pets', {
    method: 'POST',
    cookie: provider.cookie,
    body: listing
  })
  assert.equal(created.response.status, 201)
  const petId = created.data.pet.id
  assert.equal(created.data.pet.ownerId, provider.user.id)
  assert.equal(created.data.pet.contactEmail, provider.user.email)

  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: adminEmail, password: adminPassword }
  })
  assert.equal(adminLogin.response.status, 200)
  assert.match(adminLogin.setCookie, /HttpOnly/)
  assert.match(adminLogin.setCookie, /SameSite=Strict/)
  const adminCookie = adminLogin.cookie

  const initialAdminList = await request('/api/admin/pets', { cookie: adminCookie })
  assert.equal(initialAdminList.response.status, 200)
  assert.ok(initialAdminList.data.pets.some(pet => pet.id === petId))

  const inquiry = await request(`/api/pets/${petId}/inquiries`, {
    method: 'POST',
    cookie: adopter.cookie,
    body: {
      fullName: 'Adopter Example',
      email: 'adopter@example.test',
      phone: '555-1234',
      livingArrangement: 'House with yard',
      hasOtherPets: true,
      message: 'We would love to meet Toby.'
    }
  })
  assert.equal(inquiry.response.status, 201)

  const providerInbox = await request('/api/inquiries', { cookie: provider.cookie })
  assert.equal(providerInbox.response.status, 200)
  assert.equal(providerInbox.data.inquiries.length, 1)
  assert.equal(providerInbox.data.inquiries[0].petName, 'Toby')
  assert.equal(providerInbox.data.inquiries[0].email, 'adopter@example.test')

  const updatedListing = { ...listing, name: 'Toby Updated', status: 'Pending' }
  const updated = await request(`/api/admin/pets/${petId}`, {
    method: 'PUT',
    cookie: adminCookie,
    body: updatedListing
  })
  assert.equal(updated.response.status, 200)
  assert.equal(updated.data.pet.name, 'Toby Updated')

  const marketplaceList = await request('/api/pets', { cookie: adopter.cookie })
  assert.equal(marketplaceList.response.status, 200)
  assert.equal(marketplaceList.data.pets.find(pet => pet.id === petId).name, 'Toby Updated')

  const deleted = await request(`/api/admin/pets/${petId}`, {
    method: 'DELETE',
    cookie: adminCookie
  })
  assert.equal(deleted.response.status, 200)
  assert.equal(app.database.db.prepare('SELECT COUNT(*) AS count FROM inquiries WHERE pet_id = ?').get(petId).count, 0)

  const logout = await request('/api/auth/logout', { method: 'POST', cookie: adopter.cookie })
  assert.equal(logout.response.status, 200)
  const afterLogout = await request('/api/pets', { cookie: adopter.cookie })
  assert.equal(afterLogout.response.status, 401)
})
