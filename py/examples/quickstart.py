"""Run from py/: PYTHONPATH=src python3 examples/quickstart.py"""

import asyncio

from contextclip import ContextClipper, Message


async def main() -> None:
    clipper = ContextClipper(budget_tokens=200, tail_messages=2)

    messages = [
        Message(
            role="user" if i % 2 == 0 else "assistant",
            content=f"Message number {i} with some filler content to consume tokens.",
        )
        for i in range(20)
    ]

    print("--- check ---")
    print(clipper.check(messages))

    print("\n--- recover ---")
    result = await clipper.recover(messages)
    print("action:", result.action)
    print("usedTokens / budgetTokens:", result.used_tokens, "/", result.budget_tokens)
    print("remaining message count:", len(result.messages), "(from", len(messages), ")")
    print("first remaining message:", result.messages[0])
    print("last message (protected tail):", result.messages[-1])


if __name__ == "__main__":
    asyncio.run(main())
