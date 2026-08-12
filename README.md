# ContextClip

**A framework-agnostic budget tracker and tail-preserving compaction engine
for agent conversation history.**

Agent conversations accumulate tool calls, results, and multi-turn history
without bound. Every framework eventually hits the context window ceiling.
Most either crash, truncate crudely from the front and lose system context,
or hand-roll a fragile "compact when close" heuristic under deadline
pressure.

The best production coding agents handle this with real depth — a proactive
nudge before the hard limit, then staged recovery: a cheap structural drain
first, a full summarization pass only if still too large. ContextClip
extracts that separable core as a library operating on a generic
`{role, content}[]` message array, usable by any agent loop.

> **Status: v1, self-hosted, in progress.** Budget tracking, the soft/hard
> threshold check, staged drain-then-summarize recovery, and tail
> preservation all work end-to-end (see `ts/README.md`). Not yet published.

---

## Prior art — read this before building on it

Five real, shipped tools already touch this space:

| Name | What it does |
|---|---|
| `context-compact` | LLM context window compactor — summarizes old conversation history to free up context space |
| `ContextFit` | Fit any LLM conversation into any model's context window, deterministically, with a full audit of what was dropped |
| `ContextTrim` (PyPI) | Pluggable context window management strategies for LLM agents |
| `context-pack` | Task-specific context bundle generator for CLI coding agents |
| `context-slim` | Truncates large CLI coding-agent tool outputs through a token budget — 6 versions, actively maintained |

None of their descriptions mention staged drain-then-summarize recovery
with tail preservation specifically, but that's unverified, not confirmed —
read at least `ContextFit` and `context-slim` before investing further. One
hit isn't thirteen (see [SkillGarden](https://github.com/evanyan22/skillgarden)'s
prior-art table for what a genuinely crowded category looks like), but five
is enough to take seriously.

## How it works

```
 every message      soft threshold        hard limit:
 adds to budget ──►  crossed: inject  ──►  drain oldest (cheap) ──►  still over?
                     a short nudge         half of non-tail            summarize
                                           messages                    the rest
                                                                        (tail never touched)
```

1. `check(messages)` estimates token usage and returns `ok`, `nudge`
   (crossed the soft threshold — here's a message the host can inject), or
   `over_hard_limit` (recovery needed). Read-only, never mutates.
2. `recover(messages)` runs staged recovery: drop the oldest half of
   non-tail messages first (cheap, deterministic, no model call); if that's
   still not enough, hand whatever's left to a pluggable `Summarizer`. The
   most recent `tailMessages` are never touched by either stage.

## Scope (v1)

**In:**
- Budget estimator over a generic message array — no framework-specific
  types
- Proactive nudge at a configurable soft threshold
- Staged recovery on hard overflow: deterministic drain, then a pluggable
  `Summarizer`
- Tail preservation — a configurable window of recent messages is never
  touched
- A working `TruncatingSummarizer` default, so the pipeline is testable
  with no model call wired up

**Out, for now:**
- Any bundled LLM summarization implementation — host provides it, same
  pattern as ActAuth's `Approver`
- Framework-specific compaction events (PreCompact/PostCompact-style
  hooks) — host-runtime-specific, not portable
- Cross-session compaction analytics or history

## Repo layout

```
ts/    TypeScript implementation — see ts/README.md
py/    Python implementation — see py/README.md
```

Both ported line-for-line, same behavior. `py/` and `ts/` started as
siblings from day one.

Starting TypeScript-only, inside `ts/` from day one — same structural
lesson carried over from ActAuth and SkillGarden.

## License

MIT — see [LICENSE](LICENSE).
