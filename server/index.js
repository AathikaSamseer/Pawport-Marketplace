import { resolve } from 'node:path'
import { createPawPortServer } from './app.js'
import { listenOnAvailablePort } from '../scripts/ports.js'

const app = createPawPortServer({
  databasePath: process.env.DATABASE_PATH
    ? resolve(process.env.DATABASE_PATH)
    : undefined,
  staticDirectory: resolve('dist'),
  publicOrigin: process.env.PUBLIC_ORIGIN
})

try {
  await app.initialize()
  const requestedPort = Number(process.env.PORT || 3001)
  const { port, fallback } = await listenOnAvailablePort(app.server, requestedPort)
  if (fallback) {
    console.warn(`Port ${requestedPort} is already in use; using port ${port} for the PawPort API.`)
  }
  app.server.on('error', error => {
    console.error('Unable to start PawPort server:', error.message)
    process.exitCode = 1
    app.database.close()
  })
  console.log(`PawPort server listening on http://localhost:${port}`)
  process.send?.({ type: 'listening', port })
} catch (error) {
  console.error('Unable to start PawPort:', error.message)
  process.exitCode = 1
  app.database.close()
}
