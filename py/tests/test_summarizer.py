import asyncio

from contextclip.summarizer import TruncatingSummarizer
from contextclip.types import Message


def test_combines_messages_into_one_system_message():
    summarizer = TruncatingSummarizer()
    result = asyncio.run(
        summarizer.summarize(
            [Message(role="user", content="hello"), Message(role="assistant", content="hi there")]
        )
    )
    assert result.role == "system"
    assert "compacted 2 earlier message" in result.content
    assert "hello" in result.content
    assert "hi there" in result.content


def test_truncates_when_combined_content_exceeds_max_chars():
    summarizer = TruncatingSummarizer(max_chars=20)
    result = asyncio.run(summarizer.summarize([Message(role="user", content="x" * 100)]))
    assert "…" in result.content
