from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Optional

CheckAction = Literal["ok", "nudge", "over_hard_limit"]
RecoverAction = Literal["unchanged", "drained", "summarized"]


@dataclass
class Message:
    """Deliberately generic — not tied to any framework's message shape."""

    role: str
    content: str


@dataclass
class CheckResult:
    action: CheckAction
    used_tokens: int
    budget_tokens: int
    ratio: float
    # Present only when action is 'nudge' — the host decides whether and
    # how to inject it.
    nudge: Optional[Message] = None


@dataclass
class RecoverResult:
    messages: list[Message]
    action: RecoverAction
    used_tokens: int
    budget_tokens: int
