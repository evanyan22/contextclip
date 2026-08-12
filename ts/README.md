# ContextClip (TypeScript)

See the [root README](../README.md) for the pitch, the prior-art caveat,
and the scope decisions. This file only covers what's specific to running
the code.

## Install

```bash
npm install
```

## Quickstart

```bash
npm run quickstart
```

```ts
import { ContextClipper } from './src/index.js'

const clipper = new ContextClipper({ budgetTokens: 200, tailMessages: 2 })

const status = clipper.check(messages)
if (status.action === 'over_hard_limit') {
  const { messages: recovered, action } = await clipper.recover(messages)
  // action is 'drained' or 'summarized' — recovered never touches the
  // last `tailMessages` of the original array.
}
```

## Test / build

```bash
npm test        # vitest
npm run build   # tsc -> dist/
```

## Status

Budget tracking, threshold checks, and staged drain-then-summarize
recovery with tail preservation are real and tested. Not yet published to
npm — `contextclip` was clean on every registry checked, so this should
be publishable under the bare name if/when it ships.
