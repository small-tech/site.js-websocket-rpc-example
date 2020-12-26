// Basic RPC library (client side)
export class WebSocketRPC {
  static init (path = '/') {
    return new Promise ((resolve, reject) => {

      const instance = new this(path)
      instance.webSocket = new WebSocket(`wss://${window.location.host}${path}`)

      instance.webSocket.onopen = async () => {
        // When the socket opens, we first get a list of valid methods
        // for this API path.
        const validMethods = await instance.remoteCall('__validMethods')
        if (validMethods === null) {
          reject(new error ('protocol error: could not get valid methods'))
        }
        // Return a proxy to handle future remote calls.
        resolve(new Proxy({}, {
          get: (object, property) => {
            // As this is a promise, then will be called on it internally, handle that.
            if (property === 'then') return Reflect.get(instance, 'then')
            if (validMethods.includes(property)) {
                return instance.remoteCall.bind(instance, property)
            } else {
              return function () {
                throw this.methodDoesNotExistError(property)
              }.bind(instance, property)
            }
          }
        }))
      }
    })
  }

  constructor (path) {
    this.callId = 0
    this.calls = []
    this.path = path
  }

  remoteCall () {
    const currentCallId = this.callId++
    const methodName = arguments[0]
    const remoteCall = JSON.stringify([arguments[0], currentCallId,...(Array.from(arguments).slice(1))])

    this.webSocket.send(remoteCall)

    return new Promise((resolve, reject) => {
      this.webSocket.addEventListener('message', message => {
        const details = JSON.parse(message.data)
        if (details === null) {
          reject(this.methodDoesNotExistError(methodName))
          return
        }
        if (details[0] === currentCallId) {
          resolve(details[1])
        }
      })
    })
  }

  methodDoesNotExistError (methodName) {
    return new Error (`remote method <code>${methodName}()</code> does not exist.`)
  }
}
