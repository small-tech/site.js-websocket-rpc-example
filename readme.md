# Simple Site.js WebSocket RPC (Remote Procedure Call) example

This is a very basic example of performing remote procedure calls (a fancy way of saying calling methods on the server) using WebSockets in Site.js.

Note that this is just an example to illustrate a basic concept. It does not have robust error checking and employs a very basic allow list for security.

__Do not use it in production.__

## Usage

To start, simply clone this repository and run [Site.js](https://sitejs.org) on it:

```
git clone https://source.small-tech.org/site.js/examples/websocket-rpc.git
cd websocket-rpc
site
```

Then hit `https://localhost`.

## How it works

### Client-side

We start with `index.html`, where we simply load the `index.js` module:

```html
<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='UTF-8'>
  <meta name='viewport' content='width=device-width, initial-scale=1.0'>
  <title>Simple Site.js WebSocket RPC (Remote Procedure Call) example</title>
  <script type='module' src='./index.js'></script>
</head>
<body>
  <h1>Simple Site.js WebSocket RPC (Remote Procedure Call) example</h1>
  <main>
    <ol></ol>
  </main>
</body>
</html>
```

In the `index.js` module, we load in the client-side RPC library, wait for it to initialise using its asynchronous factory method, and then make remote calls on it.

```js
import { WebSocketRPC } from './rpc.js'

async function main () {
  const remote = await WebSocketRPC.init('/addition-subtraction')

  const a = 40
  const b = 2
  try {
    addListItem(`${a} + ${b} = ${await remote.addTwoNumbers(a, b)}`)
    addListItem(`${a} - ${b} = ${await remote.subtractTwoNumbers(a,b)}`)
    addListItem(`${a} × ${b} = ${await remote.multiplyTwoNumbers(a,b)}`)
    addListItem(`${a} ÷ ${b} = ${await remote.divideTwoNumbers(a,b)}`)
  } catch (error) {
    addListItem(`Remote procedure call failed because ${error.message}`)
  }
}

function addListItem (contents) {
  document.getElementsByTagName('ol')[0].innerHTML += `<li>${contents}</li>`
}

main()
```

In this case, we’re hitting the `addition-subtraction` API path, which has the `addTwoNumbers()` and `subtractTwoNumbers()` methods. So when you run the example, you will see an expected error when we try to call `multiplyTwoNumbers()` which doesn’t exist at that path (it exists on the `multiplication-division` API path. Try changing the path in the `init()` call and commenting out the addition and subtraction calls to see it working.)

The client-side RPC library is the longest piece of code in the whole example.

All it does is make an initial call to the server to get the valid methods for this API path and then it returns a proxy object that knows how to handle future calls:

```js
// Basic RPC library (client side).
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
```

### Server-side

So that concludes the client. What about the server?

On the server, we have our `addition-subtraction` and `multiplication-division` web socket routes. Notice that they’re in the `.dynamic/.wss` folder. This is [DotJS](https://sitejs.org/#dynamic-sites).

Here’s the `addition-substraction` route:

```js
const enableRPC = require('./.lib/rpc')

module.exports = function (client, request) {
  enableRPC(client, request, methods)
}

const methods = {
  addTwoNumbers (a, b) {
    return a + b
  },

  subtractTwoNumbers (a, b) {
    return a - b
  }
}
```

What we’re doing here is loading in the server-side RPC library and then, in our connection handler, we’re simply calling the function we’ve imported and passing it the reference to the client, the request, and the methods we want to define on this API path.

The `multiplication-division` route does basically the same thing but contains different methods:

```js
const enableRPC = require('./.lib/rpc')

module.exports = function (client, request) {
  enableRPC(client, request, methods)
}

const methods = {
  multiplyTwoNumbers (a, b) {
    return a * b
  },

  divideTwoNumbers (a, b) {
    return a / b
  }
}
```

So, finally, what does the server-side RPC library look like? Well, it’s rather small:

```js
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
```

_Note that the server-side library is in the hidden `.lib` folder as Site.js ignores hidden folders inside the special `.dynamic` folder and doesn’t automatically make them into routes (like it does with the `addition-subtraction` and `multiplication-division` routes in our example). Read up more on [DotJS in the Site.js documentation](https://github.com/small-tech/site.js#dynamic-sites)._


The server-side RPC library does two things:

1. Checks if the special `__validMethods` method is called and, if so, returns an array of methods that are valid for this API path.
2. For all other calls, checks if the method exists and, if it does, calls it, passing it any arguments it recieved, and then returns the result as a JSON string.

Again, this is just a simple example/tutorial to illustrate the concept of remote procedure calls using WebSockets. It does not perform any input sanitisation, etc., beyond a cursory check for valid methods. So please do not use this in production but I hope it has given you a better idea of how simple the core concept behind remote procedure calls (RPC) is.

## Like this? Fund us!

[Small Technology Foundation](https://small-tech.org) is a tiny, independent not-for-profit.

We exist in part thanks to patronage by people like you. If you share [our vision](https://small-tech.org/about/#small-technology) and want to support our work, please [become a patron or donate to us](https://small-tech.org/fund-us) today and help us continue to exist.

## Copyright

&copy; 2020 [Aral Balkan](https://ar.al), [Small Technology Foundation](https://small-tech.org).
