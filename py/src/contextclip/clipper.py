from __future__ import annotations

import math
from typing import Optional

from .budget import estimate_tokens
from .summarizer import Summarizer, TruncatingSummarizer
from .types import CheckResult, Message, RecoverResult

_NUDGE_MESSAGE = Message(
    role="system",
    content="The conversation is approaching its context budget. Wrap up the current step concisely.",
)


class ContextClipper:
    """Tracks budget usage over a generic message array and, on
    overflow, recovers in two stages: a cheap deterministic drain first,
    a pluggable Summarizer second — never touching the most recent
    tail."""

    def __init__(
        self,
        budget_tokens: int,
        soft_threshold: float = 0.7,
        hard_threshold: float = 0.92,
        tail_messages: int = 4,
        summarizer: Optional[Summarizer] = None,
    ):
        self.budget_tokens = budget_tokens
        self.soft_threshold = soft_threshold
        self.hard_threshold = hard_threshold
        self.tail_messages = tail_messages
        self.summarizer = summarizer or TruncatingSummarizer()

    def estimate_usage(self, messages: list[Message]) -> int:
        return sum(estimate_tokens(f"{m.role}: {m.content}") for m in messages)

    def check(self, messages: list[Message]) -> CheckResult:
        """Read-only budget check — never mutates or recovers. Returns a
        nudge message for the host to inject if usage has crossed the
        soft threshold but not yet the hard one."""
        used_tokens = self.estimate_usage(messages)
        ratio = used_tokens / self.budget_tokens

        if ratio >= self.hard_threshold:
            return CheckResult(
                action="over_hard_limit",
                used_tokens=used_tokens,
                budget_tokens=self.budget_tokens,
                ratio=ratio,
            )
        if ratio >= self.soft_threshold:
            return CheckResult(
                action="nudge",
                used_tokens=used_tokens,
                budget_tokens=self.budget_tokens,
                ratio=ratio,
                nudge=_NUDGE_MESSAGE,
            )
        return CheckResult(
            action="ok", used_tokens=used_tokens, budget_tokens=self.budget_tokens, ratio=ratio
        )

    async def recover(self, messages: list[Message]) -> RecoverResult:
        """Staged recovery for when check() reports over_hard_limit."""
        tail_start = max(0, len(messages) - self.tail_messages)
        tail = messages[tail_start:]
        head = messages[:tail_start]
        target = self.budget_tokens * self.soft_threshold

        if self.estimate_usage(messages) <= target:
            return RecoverResult(
                messages=messages,
                action="unchanged",
                used_tokens=self.estimate_usage(messages),
                budget_tokens=self.budget_tokens,
            )

        # Stage 1: drain — cheap, no model call. Capped at half of
        # `head` so there's always something left for stage 2 to
        # compress instead of deleting everything outright.
        drain_cap = math.ceil(len(head) / 2)
        remaining_head = head[drain_cap:]
        drained_count = len(head) - len(remaining_head)

        after_drain = [*remaining_head, *tail]
        if self.estimate_usage(after_drain) <= target:
            return RecoverResult(
                messages=after_drain,
                action="drained" if drained_count > 0 else "unchanged",
                used_tokens=self.estimate_usage(after_drain),
                budget_tokens=self.budget_tokens,
            )

        # Stage 2: still over budget — summarize whatever's left of
        # head. The tail is never touched.
        final_messages = after_drain
        if remaining_head:
            summary = await self.summarizer.summarize(remaining_head)
            final_messages = [summary, *tail]

        return RecoverResult(
            messages=final_messages,
            action="summarized",
            used_tokens=self.estimate_usage(final_messages),
            budget_tokens=self.budget_tokens,
        )
