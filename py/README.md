# ContextClip (Python)

Ported line-for-line from the TypeScript implementation. See the
[root README](../README.md) for the pitch, the prior-art table, and the
scope decisions — this file only covers what's specific to running the
Python code.

## Install

```bash
pip install -e ".[dev]"
```

## Quickstart

```bash
PYTHONPATH=src python3 examples/quickstart.py
```

```python
from contextclip import ContextClipper

clipper = ContextClipper(budget_tokens=200, tail_messages=2)

status = clipper.check(messages)
if status.action == "over_hard_limit":
    result = await clipper.recover(messages)
    # result.action is "drained" or "summarized" — result.messages never
    # touches the last `tail_messages` of the original list.
```

## Test

```bash
pytest
```

## Status

Budget tracking, threshold checks, and staged drain-then-summarize
recovery with tail preservation are real and tested. Published as
[`contextclip`](https://pypi.org/project/contextclip/) on PyPI.
