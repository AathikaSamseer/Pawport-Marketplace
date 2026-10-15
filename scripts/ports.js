function listen(server, port) {
  return new Promise((resolve, reject) => {
    const onError = error => {
      server.removeListener('listening', onListening)
      reject(error)
    }
    const onListening = () => {
      server.removeListener('error', onError)
      resolve()
    }

    server.once('error', onError)
    server.once('listening', onListening)
    server.listen(port)
  })
}

export async function listenOnAvailablePort(server, requestedPort) {
  try {
    await listen(server, requestedPort)
    return { port: server.address().port, fallback: false }
  } catch (error) {
    if (error.code !== 'EADDRINUSE') throw error
    await listen(server, 0)
    return { port: server.address().port, fallback: true }
  }
}
