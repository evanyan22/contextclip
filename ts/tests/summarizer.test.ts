import { describe, expect, it } from 'vitest'
import { TruncatingSummarizer } from '../src/summarizer.js'

describe('TruncatingSummarizer', () => {
  it('combines messages into one system message', async () => {
    const summarizer = new TruncatingSummarizer()
    const result = await summarizer.summarize([
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi there' },
    ])
    expect(result.role).toBe('system')
    expect(result.content).toContain('compacted 2 earlier message')
    expect(result.content).toContain('hello')
    expect(result.content).toContain('hi there')
  })

  it('truncates when combined content exceeds maxChars', async () => {
    const summarizer = new TruncatingSummarizer(20)
    const result = await summarizer.summarize([{ role: 'user', content: 'x'.repeat(100) }])
    expect(result.content).toContain('…')
  })
})
