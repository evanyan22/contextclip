import { estimateTokens } from './budget.js'
import { type Summarizer, TruncatingSummarizer } from './summarizer.js'
import type { CheckResult, Message, RecoverResult } from './types.js'

export interface ContextClipperOptions {
  budgetTokens: number
  /** Fraction of budget that triggers a nudge, and the recovery target. Default 0.7. */
  softThreshold?: number
  /** Fraction of budget that requires recovery. Default 0.92. */
  hardThreshold?: number
  /** Most-recent messages never drained or summarized. Default 4. */
  tailMessages?: number
  summarizer?: Summarizer
}

const NUDGE_MESSAGE: Message = {
  role: 'system',
  content: 'The conversation is approaching its context budget. Wrap up the current step concisely.',
}

/** Tracks budget usage over a generic message array and, on overflow,
 * recovers in two stages: a cheap deterministic drain first, a pluggable
 * Summarizer second — never touching the most recent tail. */
export class ContextClipper {
  private readonly budgetTokens: number
  private readonly softThreshold: number
  private readonly hardThreshold: number
  private readonly tailMessages: number
  private readonly summarizer: Summarizer

  constructor(options: ContextClipperOptions) {
    this.budgetTokens = options.budgetTokens
    this.softThreshold = options.softThreshold ?? 0.7
    this.hardThreshold = options.hardThreshold ?? 0.92
    this.tailMessages = options.tailMessages ?? 4
    this.summarizer = options.summarizer ?? new TruncatingSummarizer()
  }

  estimateUsage(messages: Message[]): number {
    return messages.reduce((sum, m) => sum + estimateTokens(`${m.role}: ${m.content}`), 0)
  }

  /** Read-only budget check — never mutates or recovers. Returns a nudge
   * message for the host to inject if usage has crossed the soft
   * threshold but not yet the hard one. */
  check(messages: Message[]): CheckResult {
    const usedTokens = this.estimateUsage(messages)
    const ratio = usedTokens / this.budgetTokens

    if (ratio >= this.hardThreshold) {
      return { action: 'over_hard_limit', usedTokens, budgetTokens: this.budgetTokens, ratio }
    }
    if (ratio >= this.softThreshold) {
      return {
        action: 'nudge',
        usedTokens,
        budgetTokens: this.budgetTokens,
        ratio,
        nudge: NUDGE_MESSAGE,
      }
    }
    return { action: 'ok', usedTokens, budgetTokens: this.budgetTokens, ratio }
  }

  /** Staged recovery for when `check()` reports over_hard_limit. */
  async recover(messages: Message[]): Promise<RecoverResult> {
    const tailStart = Math.max(0, messages.length - this.tailMessages)
    const tail = messages.slice(tailStart)
    const head = messages.slice(0, tailStart)
    const target = this.budgetTokens * this.softThreshold

    if (this.estimateUsage(messages) <= target) {
      return {
        messages,
        action: 'unchanged',
        usedTokens: this.estimateUsage(messages),
        budgetTokens: this.budgetTokens,
      }
    }

    // Stage 1: drain — cheap, no model call. Capped at half of `head` so
    // there's always something left for stage 2 to compress instead of
    // deleting everything outright.
    const drainCap = Math.ceil(head.length / 2)
    const remainingHead = head.slice(drainCap)
    const drainedCount = head.length - remainingHead.length

    const afterDrain = [...remainingHead, ...tail]
    if (this.estimateUsage(afterDrain) <= target) {
      return {
        messages: afterDrain,
        action: drainedCount > 0 ? 'drained' : 'unchanged',
        usedTokens: this.estimateUsage(afterDrain),
        budgetTokens: this.budgetTokens,
      }
    }

    // Stage 2: still over budget — summarize whatever's left of head.
    // The tail is never touched.
    let finalMessages = afterDrain
    if (remainingHead.length > 0) {
      const summary = await this.summarizer.summarize(remainingHead)
      finalMessages = [summary, ...tail]
    }

    return {
      messages: finalMessages,
      action: 'summarized',
      usedTokens: this.estimateUsage(finalMessages),
      budgetTokens: this.budgetTokens,
    }
  }
}
