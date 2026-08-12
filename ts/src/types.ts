/** Deliberately generic — not tied to any framework's message shape. */
export interface Message {
  role: string
  content: string
}

export type CheckAction = 'ok' | 'nudge' | 'over_hard_limit'

export interface CheckResult {
  action: CheckAction
  usedTokens: number
  budgetTokens: number
  ratio: number
  /** Present only when action is 'nudge' — the host decides whether and
   * how to inject it. */
  nudge?: Message
}

export type RecoverAction = 'unchanged' | 'drained' | 'summarized'

export interface RecoverResult {
  messages: Message[]
  action: RecoverAction
  usedTokens: number
  budgetTokens: number
}
