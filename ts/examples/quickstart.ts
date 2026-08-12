// Run from ts/: npm run quickstart

import { ContextClipper, type Message } from '../src/index.js'

const clipper = new ContextClipper({ budgetTokens: 200, tailMessages: 2 })

const messages: Message[] = []
for (let i = 0; i < 20; i++) {
  messages.push({
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: `Message number ${i} with some filler content to consume tokens.`,
  })
}

console.log('--- check ---')
console.log(clipper.check(messages))

console.log('\n--- recover ---')
const result = await clipper.recover(messages)
console.log('action:', result.action)
console.log('usedTokens / budgetTokens:', result.usedTokens, '/', result.budgetTokens)
console.log('remaining message count:', result.messages.length, '(from', messages.length, ')')
console.log('first remaining message:', result.messages[0])
console.log('last message (protected tail):', result.messages.at(-1))
