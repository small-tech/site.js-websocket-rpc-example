// Basic RPC library (server side).

module.exports = function enableRPC (client, request, methods) {
  client.on('message', data => {
    const details = JSON.parse(data)

    const methodName = details[0]
    const callId = details[1]

    // Introspection method: returns valid method names.
    if (methodName === '__validMethods') {
      const validMethods = Object.getOwnPropertyNames(methods)
      const validMethodsResponse = JSON.stringify([callId, validMethods])
      client.send(validMethodsResponse)
      console.log(`   ✨️    ❨RPC❩ Valid methods for ${request.url.replace('.websocket', '')} are ${validMethods.join(', ')}`)
      return
    }

    // Handles all other RPC calls.
    if (methods.hasOwnProperty(methodName)) {
      const result = methods[methodName](...details.slice(2))
      const resultJSON = JSON.stringify([callId, result])
      console.log(`   ✨️    ❨RPC❩ ${methodName}(${details.slice(2).join(', ')}) → ${result}`)
      client.send(resultJSON)
    } else {
      client.send(JSON.stringify(null))
    }
  })
}
