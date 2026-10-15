import { randomUUID, randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto'
import { promisify } from 'node:util'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const scrypt = promisify(scryptCallback)

const initialPets = [
  {
    id: 'pet-1',
    name: 'Milo',
    species: 'Dog',
    breed: 'Golden Retriever',
    ageYears: 2,
    gender: 'Male',
    type: 'Adoption',
    price: 0,
    vaccinated: true,
    neutered: true,
    healthNotes: 'All primary vaccinations up to date. Microchipped.',
    description: 'Energetic, house-trained, and friendly with young children.',
    imageUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=800&q=80',
    contactEmail: 'shelter@pawport.org',
    status: 'Available'
  },
  {
    id: 'pet-2',
    name: 'Luna',
    species: 'Cat',
    breed: 'British Shorthair',
    ageYears: 1,
    gender: 'Female',
    type: 'Sale',
    price: 350,
    vaccinated: true,
    neutered: false,
    healthNotes: 'Dewormed; requires routine booster shot next month.',
    description: 'Calm temperament, strictly indoor, litter box trained.',
    imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80',
    contactEmail: 'shelter@pawport.org',
    status: 'Available'
  },
  {
    id: 'pet-3',
    name: 'Charlie',
    species: 'Dog',
    breed: 'Beagle',
    ageYears: 3,
    gender: 'Male',
    type: 'Adoption',
    price: 0,
    vaccinated: true,
    neutered: true,
    healthNotes: 'Healthy, active, regular veterinary checkups.',
    description: 'Loves nature walks, curious sniffer, social with other dogs.',
    imageUrl: 'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?auto=format&fit=crop&w=800&q=80',
    contactEmail: 'shelter@pawport.org',
    status: 'Available'
  }
]

const petColumns = [
  'name', 'species', 'breed', 'age_years', 'gender', 'type', 'price',
  'vaccinated', 'neutered', 'health_notes', 'description', 'image_url',
  'owner_id', 'contact_email', 'status'
]

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return scrypt(password, salt, 64).then(hash => ({
    salt,
    hash: hash.toString('hex')
  }))
}

function verifyPassword(password, salt, expectedHash) {
  return hashPassword(password, salt).then(({ hash }) => {
    const expected = Buffer.from(expectedHash, 'hex')
    const actual = Buffer.from(hash, 'hex')
    return expected.length === actual.length && timingSafeEqual(expected, actual)
  })
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

function mapPet(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    species: row.species,
    breed: row.breed,
    ageYears: row.age_years,
    gender: row.gender,
    type: row.type,
    price: row.price,
    vaccinated: Boolean(row.vaccinated),
    neutered: Boolean(row.neutered),
    healthNotes: row.health_notes,
    description: row.description,
    imageUrl: row.image_url,
    ownerId: row.owner_id,
    contactEmail: row.contact_email,
    status: row.status
  }
}

function mapUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role
  }
}

function normalizePet(data, ownerId, contactEmail) {
  return {
    name: data.name.trim(),
    species: data.species,
    breed: data.breed.trim(),
    age_years: Number(data.ageYears),
    gender: data.gender,
    type: data.type,
    price: Number(data.price),
    vaccinated: Number(Boolean(data.vaccinated)),
    neutered: Number(Boolean(data.neutered)),
    health_notes: data.healthNotes.trim(),
    description: data.description.trim(),
    image_url: data.imageUrl.trim(),
    owner_id: ownerId,
    contact_email: contactEmail,
    status: data.status
  }
}

function validEmail(email) {
  return typeof email === 'string' && email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validatePet(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false
  const stringFields = ['name', 'species', 'breed', 'gender', 'type', 'healthNotes', 'description', 'imageUrl', 'status']
  if (!stringFields.every(field => typeof data[field] === 'string')) return false
  if (!data.name.trim() || data.name.length > 100 || !data.breed.trim() || data.breed.length > 100) return false
  if (!['Dog', 'Cat', 'Bird', 'Rabbit', 'Other'].includes(data.species)) return false
  if (!['Male', 'Female'].includes(data.gender)) return false
  if (!['Adoption', 'Sale'].includes(data.type)) return false
  if (!['Available', 'Pending', 'Adopted'].includes(data.status)) return false
  if (!Number.isInteger(Number(data.ageYears)) || Number(data.ageYears) < 0 || Number(data.ageYears) > 100) return false
  if (!Number.isFinite(Number(data.price)) || Number(data.price) < 0) return false
  if (!['vaccinated', 'neutered'].every(field => typeof data[field] === 'boolean')) return false
  if (data.healthNotes.length > 2000 || !data.description.trim() || data.description.length > 5000) return false
  if (typeof data.imageUrl !== 'string' || data.imageUrl.length > 2048) return false
  try {
    const url = new URL(data.imageUrl)
    if (!['http:', 'https:'].includes(url.protocol)) return false
  } catch {
    return false
  }
  return true
}

export class PawPortDatabase {
  constructor(databasePath) {
    mkdirSync(dirname(databasePath), { recursive: true })
    this.db = new DatabaseSync(databasePath)
    this.db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;')
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL COLLATE NOCASE UNIQUE,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('adopter', 'provider', 'admin')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS pets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        species TEXT NOT NULL,
        breed TEXT NOT NULL,
        age_years INTEGER NOT NULL,
        gender TEXT NOT NULL,
        type TEXT NOT NULL,
        price REAL NOT NULL,
        vaccinated INTEGER NOT NULL,
        neutered INTEGER NOT NULL,
        health_notes TEXT NOT NULL,
        description TEXT NOT NULL,
        image_url TEXT NOT NULL,
        owner_id TEXT NOT NULL REFERENCES users(id),
        contact_email TEXT NOT NULL,
        status TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS inquiries (
        id TEXT PRIMARY KEY,
        pet_id TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id),
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        living_arrangement TEXT NOT NULL,
        has_other_pets INTEGER NOT NULL,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
      CREATE INDEX IF NOT EXISTS inquiries_pet ON inquiries(pet_id);
    `)
    this.seedPets()
  }

  seedPets() {
    const insert = this.db.prepare(`
      INSERT OR IGNORE INTO pets (
        id, ${petColumns.join(', ')}
      ) VALUES (${Array.from({ length: petColumns.length + 1 }, () => '?').join(', ')})
    `)
    const provider = this.db.prepare("SELECT id FROM users WHERE email = ?").get('listing-owner@pawport.local')
    let ownerId = provider?.id
    if (!ownerId) {
      ownerId = 'seed-provider'
      this.db.prepare(`
        INSERT OR IGNORE INTO users (id, name, email, password_hash, password_salt, role)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(ownerId, 'PawPort Listings', 'listing-owner@pawport.local', 'not-for-login', 'not-for-login', 'provider')
    }
    for (const pet of initialPets) {
      const values = normalizePet(pet, ownerId, pet.contactEmail)
      insert.run(pet.id, ...petColumns.map(column => values[column]))
    }
  }

  async createAdmin(email, password) {
    if (!email || !password) return false
    if (!validEmail(email) || password.length < 12 || password.length > 128 ||
      password === 'replace-with-a-unique-password-of-at-least-12-characters') {
      throw new Error('Set a valid ADMIN_EMAIL and replace the example with a unique ADMIN_PASSWORD of 12 to 128 characters.')
    }
    const existing = this.db.prepare('SELECT id, role FROM users WHERE email = ?').get(email.trim())
    if (existing) {
      if (existing.role !== 'admin') {
        throw new Error('ADMIN_EMAIL is already registered as a non-admin account.')
      }
      return false
    }
    const { salt, hash } = await hashPassword(password)
    this.db.prepare(`
      INSERT INTO users (id, name, email, password_hash, password_salt, role)
      VALUES (?, ?, ?, ?, ?, 'admin')
    `).run(randomUUID(), 'PawPort Administrator', email.trim(), hash, salt)
    return true
  }

  async createUser({ name, email, password, role }) {
    const { salt, hash } = await hashPassword(password)
    const user = {
      id: randomUUID(),
      name: name.trim(),
      email: email.trim(),
      password_hash: hash,
      password_salt: salt,
      role
    }
    this.db.prepare(`
      INSERT INTO users (id, name, email, password_hash, password_salt, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(user.id, user.name, user.email, user.password_hash, user.password_salt, user.role)
    return { id: user.id, name: user.name, email: user.email, role: user.role }
  }

  async authenticate(email, password) {
    const user = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim())
    const valid = user
      ? await verifyPassword(password, user.password_salt, user.password_hash)
      : await verifyPassword(password, 'pawport-timing-salt', '00'.repeat(64))
    return valid && user ? mapUser(user) : null
  }

  createSession(userId) {
    const token = randomBytes(32).toString('hex')
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000
    this.db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
      .run(hashToken(token), userId, expiresAt)
    return token
  }

  getSession(token) {
    if (!token) return null
    const tokenHash = hashToken(token)
    this.db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now())
    const row = this.db.prepare(`
      SELECT users.id, users.name, users.email, users.role
      FROM sessions JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ? AND sessions.expires_at > ?
    `).get(tokenHash, Date.now())
    return row ? mapUser(row) : null
  }

  deleteSession(token) {
    if (token) this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token))
  }

  listPets() {
    return this.db.prepare('SELECT * FROM pets ORDER BY rowid DESC').all().map(mapPet)
  }

  getPet(id) {
    return mapPet(this.db.prepare('SELECT * FROM pets WHERE id = ?').get(id))
  }

  savePet(data, ownerId, contactEmail, id = randomUUID()) {
    const values = normalizePet(data, ownerId, contactEmail)
    const columns = ['id', ...petColumns]
    const placeholders = columns.map(() => '?').join(', ')
    this.db.prepare(`INSERT INTO pets (${columns.join(', ')}) VALUES (${placeholders})`)
      .run(id, ...petColumns.map(column => values[column]))
    return this.getPet(id)
  }

  updatePet(id, data) {
    const existing = this.getPet(id)
    if (!existing) return null
    const values = normalizePet(data, existing.ownerId, existing.contactEmail)
    this.db.prepare(`
      UPDATE pets SET ${petColumns.map(column => `${column} = ?`).join(', ')} WHERE id = ?
    `).run(...petColumns.map(column => values[column]), id)
    return this.getPet(id)
  }

  deletePet(id) {
    return this.db.prepare('DELETE FROM pets WHERE id = ?').run(id).changes > 0
  }

  createInquiry(petId, userId, data) {
    const id = randomUUID()
    this.db.prepare(`
      INSERT INTO inquiries (
        id, pet_id, user_id, full_name, email, phone,
        living_arrangement, has_other_pets, message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, petId, userId, data.fullName.trim(), data.email.trim(),
      data.phone.trim(), data.livingArrangement, Number(data.hasOtherPets),
      data.message.trim()
    )
    return id
  }

  listInquiries(user) {
    const query = `
      SELECT inquiries.id, inquiries.pet_id, pets.name AS pet_name,
        inquiries.full_name, inquiries.email, inquiries.phone,
        inquiries.living_arrangement, inquiries.has_other_pets,
        inquiries.message, inquiries.created_at
      FROM inquiries JOIN pets ON pets.id = inquiries.pet_id
      ${user.role === 'admin' ? '' : 'WHERE pets.owner_id = ?'}
      ORDER BY inquiries.created_at DESC, inquiries.rowid DESC
    `
    const rows = user.role === 'admin'
      ? this.db.prepare(query).all()
      : this.db.prepare(query).all(user.id)
    return rows.map(row => ({
      id: row.id,
      petId: row.pet_id,
      petName: row.pet_name,
      fullName: row.full_name,
      email: row.email,
      phone: row.phone,
      livingArrangement: row.living_arrangement,
      hasOtherPets: Boolean(row.has_other_pets),
      message: row.message,
      createdAt: row.created_at
    }))
  }

  close() {
    this.db.close()
  }
}

export { validEmail }
