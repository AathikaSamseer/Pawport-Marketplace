import assert from 'node:assert/strict'
import { createServer } from 'node:net'
import test from 'node:test'
import { listenOnAvailablePort } from '../scripts/ports.js'

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, resolve)
  })
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve())
  })
}

test('listenOnAvailablePort falls back when the requested port is occupied', async t => {
  const occupiedServer = createServer()
  await listen(occupiedServer, 0)
  t.after(() => close(occupiedServer))

  const occupiedPort = occupiedServer.address().port
  const fallbackServer = createServer()
  const { port: fallbackPort, fallback } = await listenOnAvailablePort(fallbackServer, occupiedPort)
  t.after(() => close(fallbackServer))

  assert.equal(fallback, true)
  assert.notEqual(fallbackPort, occupiedPort)
})

test('listenOnAvailablePort preserves an available requested port', async t => {
  const reservation = createServer()
  await listen(reservation, 0)
  const requestedPort = reservation.address().port
  await close(reservation)

  const server = createServer()
  const result = await listenOnAvailablePort(server, requestedPort)
  t.after(() => close(server))

  assert.equal(result.port, requestedPort)
  assert.equal(result.fallback, false)
})
