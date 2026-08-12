from __future__ import annotations

import math


def estimate_tokens(text: str) -> int:
    """~4 chars/token — a common rough heuristic, good enough for a
    budget gate rather than exact accounting. Same heuristic used across
    the sibling ActAuth/SkillGarden projects for consistency."""
    return math.ceil(len(text) / 4)
