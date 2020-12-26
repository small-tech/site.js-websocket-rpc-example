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
