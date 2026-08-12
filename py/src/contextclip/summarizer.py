from __future__ import annotations

from abc import ABC, abstractmethod

from .types import Message


class Summarizer(ABC):
    @abstractmethod
    async def summarize(self, messages: list[Message]) -> Message: ...


class TruncatingSummarizer(Summarizer):
    """A real, working default — no model call. Concatenates and
    truncates rather than genuinely summarizing, so the whole recovery
    pipeline is testable without wiring up an LLM. Swap in a real
    Summarizer (an LLM call, host-provided) for actual compression
    quality — this package doesn't bundle one, same as ActAuth doesn't
    bundle a Slack client."""

    def __init__(self, max_chars: int = 500):
        self.max_chars = max_chars

    async def summarize(self, messages: list[Message]) -> Message:
        combined = "\n".join(f"[{m.role}] {m.content}" for m in messages)
        truncated = combined if len(combined) <= self.max_chars else f"{combined[: self.max_chars]}…"
        return Message(
            role="system",
            content=f"[compacted {len(messages)} earlier message(s)]\n{truncated}",
        )
