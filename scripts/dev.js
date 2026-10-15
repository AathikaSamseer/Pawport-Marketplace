import { randomBytes } from 'node:crypto'
import { existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'

if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
  if (existsSync(resolve('.env'))) {
  console.error('Set both ADMIN_EMAIL and ADMIN_PASSWORD in .env before starting PawPort.')
  process.exit(1)
  } else {
    process.env.ADMIN_EMAIL = 'admin@pawport.local'
    process.env.ADMIN_PASSWORD = randomBytes(24).toString('base64url')
    process.env.PUBLIC_ORIGIN = 'http://localhost:5173'
    process.env.PORT = process.env.PORT || '3001'
    writeFileSync(
      resolve('.env'),
      `ADMIN_EMAIL=${process.env.ADMIN_EMAIL}\nADMIN_PASSWORD=${process.env.ADMIN_PASSWORD}\nPUBLIC_ORIGIN=${process.env.PUBLIC_ORIGIN}\nPORT=${process.env.PORT}\n`,
      { flag: 'wx', mode: 0o600 }
    )
    console.log('Created local admin credentials:')
    console.log(`  Email: ${process.env.ADMIN_EMAIL}`)
    console.log(`  Password: ${process.env.ADMIN_PASSWORD}`)
    console.log('These credentials are saved in the ignored .env file.')
  }
}

if (!process.env.PUBLIC_ORIGIN) {
  process.env.PUBLIC_ORIGIN = 'http://localhost:5173'
}
if (!process.env.PORT) {
  process.env.PORT = '3001'
}

const children = []
let shuttingDown = false

function stopChildren(exitCode = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill()
  }
  setTimeout(() => process.exit(exitCode), 1000).unref()
}

function start(name, args, withIpc = false) {
  const child = spawn(process.execPath, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: withIpc ? ['inherit', 'inherit', 'inherit', 'ipc'] : 'inherit'
  })
  children.push(child)
  child.on('error', error => {
    console.error(`${name} failed to start:`, error.message)
    stopChildren(1)
  })
  child.on('exit', (code, signal) => {
    if (!shuttingDown) {
      console.error(`${name} stopped${signal ? ` (${signal})` : ` with exit code ${code}`}.`)
      stopChildren(code || 1)
    }
  })
  return child
}

const requestedPort = Number(process.env.PORT)
const api = start('PawPort API', [resolve('server/index.js')], true)
api.on('message', message => {
  if (message?.type !== 'listening') return
  process.env.PORT = String(message.port)
  if (message.port !== requestedPort) {
    console.warn(`Vite will proxy API requests to port ${message.port}.`)
  }
  start('Vite', [resolve('node_modules/vite/bin/vite.js'), ...process.argv.slice(2)])
})

process.on('SIGINT', () => stopChildren(0))
process.on('SIGTERM', () => stopChildren(0))
