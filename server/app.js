import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer as createHttpServer } from 'node:http'
import { extname, resolve, sep } from 'node:path'
import { PawPortDatabase, validEmail, validatePet } from './database.js'

const MAX_BODY_SIZE = 64 * 1024
const SESSION_COOKIE = 'pawport_session'
const SESSION_MAX_AGE = 7 * 24 * 60 * 60
const loginAttempts = new Map()

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
}

function sendJson(response, status, data, extraHeaders = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders
  })
  response.end(JSON.stringify(data))
}

function sessionCookie(token, production) {
  return `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${SESSION_MAX_AGE}${production ? '; Secure' : ''}`
}

function clearSessionCookie(production) {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0${production ? '; Secure' : ''}`
}

function readCookie(request, name) {
  const cookieHeader = request.headers.cookie || ''
  const value = cookieHeader.split(';').map(part => part.trim())
    .find(part => part.startsWith(`${name}=`))
  return value ? value.slice(name.length + 1) : ''
}

async function readJson(request) {
  let size = 0
  const chunks = []
  for await (const chunk of request) {
    size += chunk.length
    if (size > MAX_BODY_SIZE) {
      const error = new Error('Request body is too large.')
      error.status = 413
      throw error
    }
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    const error = new Error('Request body must be valid JSON.')
    error.status = 400
    throw error
  }
}

function loginRateLimit(request, response) {
  const key = request.socket.remoteAddress || 'unknown'
  const now = Date.now()
  const attempts = (loginAttempts.get(key) || []).filter(time => now - time < 15 * 60 * 1000)
  if (attempts.length >= 10) {
    sendJson(response, 429, { message: 'Too many sign-in attempts. Please try again in 15 minutes.' })
    return false
  }
  attempts.push(now)
  loginAttempts.set(key, attempts)
  return true
}

function validateInquiry(data) {
  return data && typeof data === 'object' && !Array.isArray(data) &&
    typeof data.fullName === 'string' && data.fullName.trim().length > 0 && data.fullName.length <= 120 &&
    validEmail(data.email) &&
    typeof data.phone === 'string' && data.phone.length <= 40 &&
    typeof data.livingArrangement === 'string' &&
    ['House with yard', 'Apartment / Flat', 'Farm / Acreage'].includes(data.livingArrangement) &&
    typeof data.hasOtherPets === 'boolean' &&
    typeof data.message === 'string' && data.message.trim().length > 0 && data.message.length <= 3000
}

function validateNewUser(data) {
  return data && typeof data === 'object' && !Array.isArray(data) &&
    typeof data.name === 'string' && data.name.trim().length > 0 && data.name.length <= 120 &&
    validEmail(data.email) &&
    typeof data.password === 'string' && data.password.length >= 12 && data.password.length <= 128 &&
    ['adopter', 'provider'].includes(data.role)
}

function setSecurityHeaders(response) {
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('X-Frame-Options', 'DENY')
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'")
}

function serveStatic(request, response, staticDirectory) {
  if (request.method !== 'GET') {
    sendJson(response, 404, { message: 'Not found.' })
    return
  }

  let pathname
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
  } catch {
    sendJson(response, 400, { message: 'Invalid URL.' })
    return
  }
  const root = resolve(staticDirectory)
  let filePath = resolve(root, `.${pathname}`)
  if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
    sendJson(response, 400, { message: 'Invalid path.' })
    return
  }
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    filePath = resolve(root, 'index.html')
  }
  if (!existsSync(filePath)) {
    sendJson(response, 404, { message: 'Built frontend not found. Run npm run build first.' })
    return
  }
  response.writeHead(200, {
    'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream',
    'Cache-Control': extname(filePath) === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable'
  })
  createReadStream(filePath).pipe(response)
}

export function createPawPortServer({
  databasePath,
  staticDirectory = resolve('dist'),
  production = process.env.NODE_ENV === 'production',
  adminEmail = process.env.ADMIN_EMAIL,
  adminPassword = process.env.ADMIN_PASSWORD,
  publicOrigin = process.env.PUBLIC_ORIGIN
} = {}) {
  if (Boolean(adminEmail) !== Boolean(adminPassword)) {
    throw new Error('Set both ADMIN_EMAIL and ADMIN_PASSWORD to configure the administrator account.')
  }
  if (production && !publicOrigin) {
    throw new Error('Set PUBLIC_ORIGIN to the public application origin when running in production.')
  }
  if (publicOrigin) {
    try {
      const parsedOrigin = new URL(publicOrigin)
      if (!['http:', 'https:'].includes(parsedOrigin.protocol) || parsedOrigin.origin !== publicOrigin) {
        throw new Error()
      }
    } catch {
      throw new Error('PUBLIC_ORIGIN must be an origin such as https://pawport.example.')
    }
  }
  const database = new PawPortDatabase(databasePath || resolve('server/data/pawport.sqlite'))

  const server = createHttpServer(async (request, response) => {
    setSecurityHeaders(response)
    const method = request.method
    let body

    try {
      const url = new URL(request.url, 'http://localhost')
      const path = url.pathname
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const origin = request.headers.origin
        const expectedOrigin = publicOrigin || `http://${request.headers.host}`
        const isDevelopmentOrigin = !production &&
          ['http://localhost:5173', 'http://127.0.0.1:5173'].includes(origin)
        if (origin !== expectedOrigin && !isDevelopmentOrigin) {
          sendJson(response, 403, { message: 'Cross-origin requests are not allowed.' })
          return
        }
      }

      if (path === '/api/auth/me' && method === 'GET') {
        const user = database.getSession(readCookie(request, SESSION_COOKIE))
        sendJson(response, 200, { user })
        return
      }

      if (path === '/api/auth/signup' && method === 'POST') {
        body = await readJson(request)
        if (!validateNewUser(body)) {
          sendJson(response, 400, { message: 'Provide a name, valid email, password of at least 12 characters, and valid account type.' })
          return
        }
        try {
          const user = await database.createUser(body)
          const token = database.createSession(user.id)
          sendJson(response, 201, { user }, { 'Set-Cookie': sessionCookie(token, production) })
        } catch (error) {
          if (error.code === 'ERR_SQLITE_ERROR' && /UNIQUE constraint failed/i.test(error.message)) {
            sendJson(response, 409, { message: 'An account with this email already exists.' })
            return
          }
          throw error
        }
        return
      }

      if (path === '/api/auth/login' && method === 'POST') {
        if (!loginRateLimit(request, response)) return
        body = await readJson(request)
        if (!body || typeof body.email !== 'string' || typeof body.password !== 'string') {
          sendJson(response, 400, { message: 'Email and password are required.' })
          return
        }
        const user = await database.authenticate(body.email, body.password)
        if (!user) {
          sendJson(response, 401, { message: 'Invalid email or password.' })
          return
        }
        loginAttempts.delete(request.socket.remoteAddress || 'unknown')
        const token = database.createSession(user.id)
        sendJson(response, 200, { user }, { 'Set-Cookie': sessionCookie(token, production) })
        return
      }

      if (path === '/api/auth/logout' && method === 'POST') {
        database.deleteSession(readCookie(request, SESSION_COOKIE))
        sendJson(response, 200, { success: true }, { 'Set-Cookie': clearSessionCookie(production) })
        return
      }

      if (path.startsWith('/api/')) {
        const user = database.getSession(readCookie(request, SESSION_COOKIE))
        if (!user) {
          sendJson(response, 401, { message: 'Please sign in to continue.' })
          return
        }

        if (path === '/api/pets' && method === 'GET') {
          sendJson(response, 200, { pets: database.listPets() })
          return
        }

        if (path === '/api/inquiries' && method === 'GET') {
          if (!['provider', 'admin'].includes(user.role)) {
            sendJson(response, 403, { message: 'Only providers can view listing inquiries.' })
            return
          }
          sendJson(response, 200, { inquiries: database.listInquiries(user) })
          return
        }

        const petMatch = path.match(/^\/api\/pets\/([^/]+)$/)
        if (petMatch && method === 'GET') {
          const pet = database.getPet(decodeURIComponent(petMatch[1]))
          if (!pet) {
            sendJson(response, 404, { message: 'Pet listing not found.' })
            return
          }
          sendJson(response, 200, { pet })
          return
        }

        const inquiryMatch = path.match(/^\/api\/pets\/([^/]+)\/inquiries$/)
        if (inquiryMatch && method === 'POST') {
          body = await readJson(request)
          if (!validateInquiry(body)) {
            sendJson(response, 400, { message: 'Please provide valid inquiry details.' })
            return
          }
          const pet = database.getPet(decodeURIComponent(inquiryMatch[1]))
          if (!pet) {
            sendJson(response, 404, { message: 'Pet listing not found.' })
            return
          }
          database.createInquiry(pet.id, user.id, body)
          sendJson(response, 201, { success: true, message: 'Inquiry saved for the provider.' })
          return
        }

        if (path === '/api/pets' && method === 'POST') {
          if (!['provider', 'admin'].includes(user.role)) {
            sendJson(response, 403, { message: 'Only providers can publish listings.' })
            return
          }
          body = await readJson(request)
          if (!validatePet(body)) {
            sendJson(response, 400, { message: 'Pet listing fields are invalid.' })
            return
          }
          const pet = database.savePet(body, user.id, user.email)
          sendJson(response, 201, { pet })
          return
        }

        if (path.startsWith('/api/admin/')) {
          if (user.role !== 'admin') {
            sendJson(response, 403, { message: 'Administrator access is required.' })
            return
          }
          if (path === '/api/admin/pets' && method === 'GET') {
            sendJson(response, 200, { pets: database.listPets() })
            return
          }
          if (path === '/api/admin/pets' && method === 'POST') {
            body = await readJson(request)
            if (!validatePet(body)) {
              sendJson(response, 400, { message: 'Pet listing fields are invalid.' })
              return
            }
            const pet = database.savePet(body, user.id, user.email)
            sendJson(response, 201, { pet })
            return
          }
          const adminPetMatch = path.match(/^\/api\/admin\/pets\/([^/]+)$/)
          if (adminPetMatch && method === 'PUT') {
            body = await readJson(request)
            if (!validatePet(body)) {
              sendJson(response, 400, { message: 'Pet listing fields are invalid.' })
              return
            }
            const pet = database.updatePet(decodeURIComponent(adminPetMatch[1]), body)
            if (!pet) {
              sendJson(response, 404, { message: 'Pet listing not found.' })
              return
            }
            sendJson(response, 200, { pet })
            return
          }
          if (adminPetMatch && method === 'DELETE') {
            const deleted = database.deletePet(decodeURIComponent(adminPetMatch[1]))
            if (!deleted) {
              sendJson(response, 404, { message: 'Pet listing not found.' })
              return
            }
            sendJson(response, 200, { success: true })
            return
          }
        }

        sendJson(response, 404, { message: 'API endpoint not found.' })
        return
      }

      serveStatic(request, response, staticDirectory)
    } catch (error) {
      if (response.headersSent) {
        response.destroy(error)
        return
      }
      if (error.status) {
        sendJson(response, error.status, { message: error.message })
        return
      }
      console.error('Request failed:', error)
      sendJson(response, 500, { message: 'An unexpected server error occurred.' })
    }
  })

  return {
    server,
    database,
    async initialize() {
      const adminCreated = await database.createAdmin(adminEmail, adminPassword)
      if (!adminEmail) {
        console.warn('No administrator account configured; set ADMIN_EMAIL and ADMIN_PASSWORD to enable admin sign-in.')
      }
      return { adminCreated }
    },
    close() {
      return new Promise((resolveClose, reject) => {
        server.close(error => {
          database.close()
          if (error) reject(error)
          else resolveClose()
        })
      })
    }
  }
}
