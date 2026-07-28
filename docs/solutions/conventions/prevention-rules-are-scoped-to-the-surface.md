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
tags:
  - prevention-rules
  - scope
  - review-heuristic
  - correct-by-cancellation
  - portfolio-convention
---

# A prevention rule is scoped to the function or surface, never to the input that reproduced

**Canonical statement: `../../../../reference/prevention-rule-scoping.md`** (portfolio root, `C:\Users\mssha\projects\reference\`). This rule governs every repo, so it lives outside any one of them. This file is the local pointer plus this repo's instance — do not restate the rule here, and do not let the two drift.

## The two tests, in short

1. **Three lines away.** Could a reader satisfy this rule while leaving an identical defect three lines away? Then it is scoped to the repro.
2. **Enumeration.** "Every branch" without the list is an aspiration. The list is what a reviewer checks against.

## This repo's instance

`docs/solutions/bugs/sheetjs-date-parsing-timezone-offset.md` was written 2026-05-22 with the prevention rule *"default to UTC methods for date normalization,"* illustrated with the `Date`-object branch of `normalizeDate` — the branch that reproduced. The string-fallback branch of the same function called `dayjs(str).format(...)`, local-anchored, and stayed broken for fourteen months with that doc sitting in the knowledge store the whole time.

Widening the rule to the function also surfaced a branch that was not yet wrong: the strict-format loop parsed local and formatted local, so the errors cancelled. Correct by coincidence of `DATE_FORMATS` — every entry is date-only — and no test could have caught it, because the tests exercise the list that makes it work. See "Correct by cancellation" in the canonical file.

The sibling case in this repo is the `excludedRowCount` hedge in `generateSummary`, written up in `docs/solutions/logic-errors/identical-verdict-ignored-column-changes.md` as "the guard that stopped the search."

## Related

- `../bugs/sheetjs-date-parsing-timezone-offset.md`
- `../logic-errors/identical-verdict-ignored-column-changes.md`
- DECISIONS.md — "Prevention rules are scoped to the surface, not the repro" (2026-07-28)
