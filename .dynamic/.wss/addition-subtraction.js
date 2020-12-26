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
