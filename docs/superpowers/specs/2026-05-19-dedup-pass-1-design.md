# Deduplication Pass 1 — Design Spec

**Date:** 2026-05-19
**Status:** Approved, ready for implementation planning
**Owner:** louis.augostini@transcat.com

## Problem

After the App.tsx breakup, three concrete duplications remain in `src/top-level/`:

1. An empty orphan directory (`detail-view/`)
2. A stale duplicate module (`diagnostics/index.ts` ≈ `optimization-utils/index.ts`) — the barrel even has a comment "Explicitly re-export optimization utilities to avoid conflicts" acknowledging the duplication
3. Internal private duplicates of pricing utilities in `upload/index.ts` that shadow canonical exports in `pricing-utils/index.ts`

These are noise: extra files for maintainers to read, redundant code that can drift, and confusing barrel exports that work around the duplication instead of fixing it.

## Goals

- Remove the three duplications above
- Zero behavior changes
- Each fix is a small, independently revertible atomic commit

## Non-Goals

- No deeper internal-pattern refactoring (UploadPage, etc.)
- No dark-mode className helper extraction
- No new tests (the project has none; safety net is TypeScript + manual smoke)
- No restructuring of `top-level/` beyond what these three fixes require

## Current State

```
src/top-level/
├── charts/            (kept)
├── constants.ts       (kept)
├── detail-view/       [EMPTY — DELETE]
├── diagnostics/       [STALE DUPE of optimization-utils — DELETE]
├── export-utils/      (kept)
├── index.ts           [EDIT — remove 2 lines]
├── modals/            (already deleted in earlier task)
├── optimization-utils/ (kept — canonical)
├── pricing-utils/     (kept — canonical)
├── quote-summary/     (kept)
├── types.ts           (kept)
├── upload/            [EDIT — replace internal dupes with imports]
├── upload-page/       (already deleted in earlier task)
└── utils.ts           (kept)
```

## The Three Fixes

### Fix 1: Delete empty `detail-view/`

- Path: `src/top-level/detail-view/`
- State: confirmed empty directory
- Action: `git rm -r src/top-level/detail-view` (or directly remove if untracked)
- Barrel impact: none — already not referenced in `top-level/index.ts`
- Commit: `Remove empty top-level/detail-view orphan directory`

### Fix 2: Delete duplicate `diagnostics/` module

- Path: `src/top-level/diagnostics/index.ts` (168 lines)
- State: stale copy of `optimization-utils/index.ts` (243 lines). Shares: `Recommendation`, `OptimizationStrategy`, `OptimizationResult` types, plus `generateRecommendations` and `optimizeSelections` functions. The `optimization-utils` version is longer (has a `minimize_time` strategy branch that `diagnostics` lacks).
- Action:
  - `git rm -r src/top-level/diagnostics`
  - Edit `src/top-level/index.ts`: remove the line `export * from "./diagnostics";`
  - Edit `src/top-level/index.ts`: remove the comment `// Explicitly re-export optimization utilities to avoid conflicts` (no longer needed)
- External-use check: grep `src` confirmed nothing imports `top-level/diagnostics` directly — consumers reach through the barrel, which still exports the same names via `optimization-utils`.
- Commit: `Remove duplicate top-level/diagnostics module`

### Fix 3: Consolidate pricing utilities

- Path: `src/top-level/upload/index.ts`
- Issue: contains private (un-exported) function definitions for `roundCents` (line 15), `calculateServiceLevelPrice` (line 19), and `generatePricingRows` (line 25) that duplicate exported functions in `src/top-level/pricing-utils/index.ts`.
- Action:
  - **First, verify function-body equivalence** between the `upload/` private versions and the `pricing-utils/` exported versions. Read both implementations and confirm logical equivalence.
    - If equivalent: proceed.
    - If divergent: port any meaningful fix from `upload/` to `pricing-utils/` as a separate preliminary commit, then proceed.
  - Delete the three private function definitions from `upload/index.ts`.
  - Add an import at the top of `upload/index.ts`:
    ```ts
    import { roundCents, calculateServiceLevelPrice, generatePricingRows } from "../pricing-utils";
    ```
- Commit: `Consolidate duplicate pricing utilities in upload/index.ts`

## Execution Order

Easy-to-hard, each as a separate atomic commit:

1. Fix 1 — empty dir delete (near-zero risk; pure win)
2. Fix 2 — duplicate file delete + barrel edit (low risk; just deletion + 2-line edit)
3. Fix 3 — pricing util consolidation (medium risk; only one of the three that touches runtime logic)

The fixes are logically independent — order is for psychological momentum and risk gradient, not technical dependency.

## Verification Protocol

### Per-commit gate

1. `npm run build` exits 0 (tsc + vite build clean)
2. `git diff --stat` shows only the files this commit was supposed to touch
3. **Manual smoke test** via the running dev server (HMR will reload):
   - Fix 1: App loads, no console errors
   - Fix 2: App loads, Diagnostics panel still renders, opening a unit (which exercises `generateRecommendations`) works
   - Fix 3: Upload a CSV and verify pricing rows still calculate correctly
4. Only commit after 1–3 pass

### Failure handling

- Do **not** commit on a failing build or failing smoke.
- Either fix and re-run the gate, or `git restore` to discard the change and retry.
- Never `--amend` a failed commit — keep each extraction's history clean.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| `upload/`'s private pricing functions have divergent logic from `pricing-utils/` | Manual diff before deletion in Fix 3; port fix forward to `pricing-utils` if found |
| `top-level/diagnostics/` is imported somewhere we missed | Grep already done — confirmed clean. Build will catch anyway. |
| Barrel edit in Fix 2 breaks unrelated consumer | Build is the gate. The names removed from the diagnostics re-export are also exported via optimization-utils, so any consumer that imported via the barrel keeps working. |
| Smoke test misses a regression | Pricing calculations are the highest-leverage smoke target (Fix 3). The other two are deletion-only — nothing to regress. |

## Out of Scope

- Refactoring the `top-level/index.ts` barrel structure (could be flattened post-cleanup, but YAGNI)
- Extracting a dark-mode className helper across 6 files
- Investigating duplication inside large component files (UploadPage, DetailView)
- Adding tests
- Splitting `UploadPage.tsx` further (separate future task)

## Branch Strategy

Commits go directly to `main`. Each commit is independently safe; no need for a feature branch given the small scope.
