import { describe, expect, it } from 'vitest'
import { ContextClipper } from '../src/clipper.js'
import type { Message, Summarizer } from '../src/index.js'

function msg(role: string, content: string): Message {
  return { role, content }
}

describe('ContextClipper.check', () => {
  it('reports ok under the soft threshold', () => {
    const clipper = new ContextClipper({ budgetTokens: 1000 })
    const result = clipper.check([msg('user', 'short')])
    expect(result.action).toBe('ok')
  })

  it('nudges once usage crosses the soft threshold', () => {
    const clipper = new ContextClipper({ budgetTokens: 40, softThreshold: 0.5, hardThreshold: 0.9 })
    const result = clipper.check([msg('user', 'x'.repeat(100))])
    expect(result.action).toBe('nudge')
    expect(result.nudge).toBeDefined()
  })

  it('reports over_hard_limit once usage crosses the hard threshold', () => {
    const clipper = new ContextClipper({ budgetTokens: 40, softThreshold: 0.5, hardThreshold: 0.6 })
    const result = clipper.check([msg('user', 'x'.repeat(100))])
    expect(result.action).toBe('over_hard_limit')
  })
})

describe('ContextClipper.recover', () => {
  it('leaves messages unchanged when already under the soft-threshold target', async () => {
    const clipper = new ContextClipper({ budgetTokens: 1000 })
    const messages = [msg('user', 'hello')]
    const result = await clipper.recover(messages)
    expect(result.action).toBe('unchanged')
    expect(result.messages).toEqual(messages)
  })

  it('never touches the protected tail', async () => {
    const clipper = new ContextClipper({ budgetTokens: 30, tailMessages: 2, softThreshold: 0.5 })
    const messages = [
      msg('user', 'x'.repeat(80)),
      msg('assistant', 'x'.repeat(80)),
      msg('user', 'TAIL_A'),
      msg('assistant', 'TAIL_B'),
    ]
    const result = await clipper.recover(messages)
    const tailContents = result.messages.slice(-2).map((m) => m.content)
    expect(tailContents).toEqual(['TAIL_A', 'TAIL_B'])
  })

  it('drains oldest messages first when that is enough to fit the target', async () => {
    // target = 200 * 0.5 = 100 tokens. Each head message is ~30 tokens,
    // so all 4 (120) + tail exceeds target, but draining the oldest 2
    // (down to 60 + tail) fits comfortably.
    const clipper = new ContextClipper({ budgetTokens: 200, tailMessages: 1, softThreshold: 0.5 })
    const messages = [
      msg('user', 'x'.repeat(112)),
      msg('user', 'x'.repeat(112)),
      msg('user', 'x'.repeat(112)),
      msg('user', 'x'.repeat(112)),
      msg('assistant', 'TAIL'),
    ]
    const result = await clipper.recover(messages)
    expect(result.action).toBe('drained')
    expect(result.messages.some((m) => m.content.startsWith('[compacted'))).toBe(false)
  })

  it('falls back to the summarizer when draining half of head is not enough', async () => {
    const calls: Message[][] = []
    const summarizer: Summarizer = {
      async summarize(messages) {
        calls.push(messages)
        return { role: 'system', content: `[summary of ${messages.length}]` }
      },
    }
    const clipper = new ContextClipper({
      budgetTokens: 40,
      tailMessages: 1,
      softThreshold: 0.5,
      summarizer,
    })
    const messages = [
      msg('user', 'x'.repeat(60)),
      msg('user', 'x'.repeat(60)),
      msg('user', 'x'.repeat(60)),
      msg('user', 'x'.repeat(60)),
      msg('assistant', 'TAIL'),
    ]
    const result = await clipper.recover(messages)
    expect(result.action).toBe('summarized')
    expect(calls).toHaveLength(1)
    expect(result.messages[0]?.content).toContain('[summary of')
    expect(result.messages.at(-1)?.content).toBe('TAIL')
  })
})
