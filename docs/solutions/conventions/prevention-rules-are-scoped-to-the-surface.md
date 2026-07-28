---
title: "A prevention rule is scoped to the function or surface, never to the input that reproduced"
date: 2026-07-28
category: conventions
module: docs/solutions
problem_type: convention
component: documentation
severity: high
applies_when:
  - "Writing the Prevention section of a solution doc"
  - "Fixing a bug that reproduced through one input, branch, page, or file"
  - "Reviewing a fix that landed on the surface where the bug was reported"
  - "Auditing a codebase where the same defect class appears in more than one place"
tags:
  - prevention-rules
  - scope
  - blast-radius
  - review-heuristic
  - recurrence
  - partial-fix
---

# A prevention rule is scoped to the function or surface, never to the input that reproduced

## Context

A bug is found through one input. The fix lands on the branch that input touched. The prevention rule is then written to describe *that branch* — because that is what was in front of the person writing it. The rule reads as complete, gets filed in the knowledge store, and the identical defect in the branch beside it survives, now with a document sitting next to it that appears to have already addressed the problem.

This repo produced the clean example. `docs/solutions/bugs/sheetjs-date-parsing-timezone-offset.md` was written on 2026-05-22 with the prevention rule *"default to UTC methods for date normalization,"* illustrated with the `Date`-object branch of `normalizeDate` — the branch that reproduced. The same function's string-fallback branch called `dayjs(str).format(...)`, local-anchored, and stayed broken for fourteen months. The rule was not wrong. It was as narrow as the repro that taught it.

The pattern held four-for-four across one audit cycle spanning four projects: a fix clipped the page and not the workbook; a correction reached the glossary and the trends footnote but not the README; a de-hardcoding pass covered the components and left the README inside the scope that project's own DECISIONS.md had just declared; and here, one branch of a four-branch function. The shared shape is *the primary surface got the fix, the secondary surface did not.* What this project adds is that the mechanism built to prevent that outcome — the prevention rule — reproduced the same narrowness one layer up.

## Guidance

**Write the rule against the function, module, or surface — not the input.**

Before filing a prevention rule, ask: what is the smallest unit that fully contains this defect class? That unit is the scope. If the answer is "the branch that reproduced," the rule is incomplete on arrival.

A concrete test: read the rule back and ask whether a reader could satisfy it while leaving an identical defect in place three lines away. If yes, widen it.

```
Too narrow:  Use UTC methods when normalizing Date objects.
             Satisfiable while dayjs(str) sits four lines below, still
             local-anchored.

Correct:     normalizeDate is UTC-anchored in every branch — Excel serials,
             Date objects, strict-format strings, and the string fallback.
             Names the unit; a reader can enumerate the branches and check
             each one.
```

**Then enumerate.** A rule scoped to a function is only enforceable if the branches are listed. "Every branch" without the list is an aspiration; the list is what a reviewer can check against. Both examples above are one sentence — this costs nothing but the enumeration.

**Companion heuristic — when you find a guard, check what it doesn't guard.**

A partial fix that raises apparent rigor is harder to catch afterward than no fix at all. The next reviewer sees a guard, reads it as evidence the area was audited, and moves on. The guard is what stops the search.

The example is in the same repo. `generateSummary` claimed files were identical whenever three row counts were zero. An earlier pass found that duplicate and blank keys silently drop rows from comparison, and added an `excludedRowCount` hedge for exactly that case. That hedge made the verdict *look* audited. The verdict still ignored column changes entirely, and that hole survived a subsequent review whose stated subject was verdict honesty — because the reviewer saw a hedge on the verdict and read the area as covered.

So: the existence of a guard is a reason to look harder at its neighbours, not a reason to move on. Ask what the guard covers, then ask what sits in the same function, on the same object, or behind the same call that it does not cover.

## Why This Matters

Prevention rules are the compounding mechanism of a knowledge store. A rule scoped to the repro does worse than nothing: it costs the same to write and read as a correct rule, it occupies the slot where the correct rule would go, and it signals to every future reader that the problem has been handled. The narrow rule is the reason the recurrence went unnoticed for fourteen months — nobody re-examined `normalizeDate`, because `normalizeDate` already had a doc.

The cost of widening is one sentence at write time. The cost of not widening is a recurrence that presents as a new bug, plus the audit time to discover that it was documented all along.

## When to Apply

- Writing the Prevention section of any solution doc
- Reviewing a fix where the reported symptom came through one specific input, file, page, or format
- Auditing a repo where the same defect class plausibly appears in sibling code paths
- Reading an existing prevention rule during a refresh — if it names an input rather than a surface, widen it and check the siblings now

## Examples

**Before — rule scoped to the repro (this repo, 2026-05-22):**

> Default to UTC methods for date normalization. Any comparison tool that discards the time component should use `getUTCFullYear`/`getUTCMonth`/`getUTCDate`.

Satisfiable while `dayjs(str).format(...)` — the string fallback in the same function — stays local-anchored. It did, for fourteen months.

**After — rule scoped to the surface, branches enumerated (2026-07-28):**

> `normalizeDate` is UTC-anchored in every branch — Excel serials, `Date` objects, strict-format strings, and the string fallback. Local methods are only correct when you know the value was constructed in local time AND you're extracting in the same timezone — which is never guaranteed for values that arrive from a user's file.

Closing the function to the rule also caught a branch that was not yet producing a wrong answer: the strict-format loop parsed local but formatted local, so the error cancelled — a property of the current `DATE_FORMATS` list rather than of the code. One time-bearing format added and it would have shifted. Scoping to the surface finds latent violations, not just live ones.

## Related

- `docs/solutions/bugs/sheetjs-date-parsing-timezone-offset.md` — the doc whose own prevention rule produced this convention
- `docs/solutions/logic-errors/identical-verdict-ignored-column-changes.md` — the guard-that-stopped-the-search example, in full
- DECISIONS.md — "Prevention rules are scoped to the surface, not the repro" (2026-07-28)
