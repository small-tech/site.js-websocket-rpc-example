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
