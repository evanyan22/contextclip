import asyncio

from contextclip.clipper import ContextClipper
from contextclip.summarizer import Summarizer
from contextclip.types import Message


def msg(role: str, content: str) -> Message:
    return Message(role=role, content=content)


def test_reports_ok_under_the_soft_threshold():
    clipper = ContextClipper(budget_tokens=1000)
    result = clipper.check([msg("user", "short")])
    assert result.action == "ok"


def test_nudges_once_usage_crosses_the_soft_threshold():
    clipper = ContextClipper(budget_tokens=40, soft_threshold=0.5, hard_threshold=0.9)
    result = clipper.check([msg("user", "x" * 100)])
    assert result.action == "nudge"
    assert result.nudge is not None


def test_reports_over_hard_limit_once_usage_crosses_the_hard_threshold():
    clipper = ContextClipper(budget_tokens=40, soft_threshold=0.5, hard_threshold=0.6)
    result = clipper.check([msg("user", "x" * 100)])
    assert result.action == "over_hard_limit"


def test_leaves_messages_unchanged_when_already_under_target():
    clipper = ContextClipper(budget_tokens=1000)
    messages = [msg("user", "hello")]
    result = asyncio.run(clipper.recover(messages))
    assert result.action == "unchanged"
    assert result.messages == messages


def test_never_touches_the_protected_tail():
    clipper = ContextClipper(budget_tokens=30, tail_messages=2, soft_threshold=0.5)
    messages = [
        msg("user", "x" * 80),
        msg("assistant", "x" * 80),
        msg("user", "TAIL_A"),
        msg("assistant", "TAIL_B"),
    ]
    result = asyncio.run(clipper.recover(messages))
    tail_contents = [m.content for m in result.messages[-2:]]
    assert tail_contents == ["TAIL_A", "TAIL_B"]


def test_drains_oldest_messages_first_when_that_is_enough_to_fit_the_target():
    # target = 200 * 0.5 = 100 tokens. Each head message is ~30 tokens,
    # so all 4 (120) + tail exceeds target, but draining the oldest 2
    # (down to 60 + tail) fits comfortably.
    clipper = ContextClipper(budget_tokens=200, tail_messages=1, soft_threshold=0.5)
    messages = [
        msg("user", "x" * 112),
        msg("user", "x" * 112),
        msg("user", "x" * 112),
        msg("user", "x" * 112),
        msg("assistant", "TAIL"),
    ]
    result = asyncio.run(clipper.recover(messages))
    assert result.action == "drained"
    assert not any(m.content.startswith("[compacted") for m in result.messages)


def test_falls_back_to_the_summarizer_when_draining_half_of_head_is_not_enough():
    calls: list[list[Message]] = []

    class FakeSummarizer(Summarizer):
        async def summarize(self, messages: list[Message]) -> Message:
            calls.append(messages)
            return msg("system", f"[summary of {len(messages)}]")

    clipper = ContextClipper(
        budget_tokens=40, tail_messages=1, soft_threshold=0.5, summarizer=FakeSummarizer()
    )
    messages = [
        msg("user", "x" * 60),
        msg("user", "x" * 60),
        msg("user", "x" * 60),
        msg("user", "x" * 60),
        msg("assistant", "TAIL"),
    ]
    result = asyncio.run(clipper.recover(messages))
    assert result.action == "summarized"
    assert len(calls) == 1
    assert "[summary of" in result.messages[0].content
    assert result.messages[-1].content == "TAIL"
