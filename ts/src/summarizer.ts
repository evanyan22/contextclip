import type { Message } from './types.js'

export interface Summarizer {
  summarize(messages: Message[]): Promise<Message>
}

/** A real, working default — no model call. Concatenates and truncates
 * rather than genuinely summarizing, so the whole recovery pipeline is
 * testable without wiring up an LLM. Swap in a real Summarizer (an LLM
 * call, host-provided) for actual compression quality — this package
 * doesn't bundle one, same as ActAuth doesn't bundle a Slack client. */
export class TruncatingSummarizer implements Summarizer {
  constructor(private readonly maxChars: number = 500) {}

  async summarize(messages: Message[]): Promise<Message> {
    const combined = messages.map((m) => `[${m.role}] ${m.content}`).join('\n')
    const truncated =
      combined.length > this.maxChars ? `${combined.slice(0, this.maxChars)}…` : combined
    return {
      role: 'system',
      content: `[compacted ${messages.length} earlier message(s)]\n${truncated}`,
    }
  }
}
