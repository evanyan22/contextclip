import { describe, expect, it } from 'vitest'
import { estimateTokens } from '../src/budget.js'

describe('estimateTokens', () => {
  it('is roughly 4 characters per token', () => {
    expect(estimateTokens('a'.repeat(40))).toBe(10)
  })
})
