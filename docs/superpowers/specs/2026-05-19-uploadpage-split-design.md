# UploadPage Split — Design Spec

**Date:** 2026-05-19
**Status:** Approved, ready for implementation planning
**Owner:** louis.augostini@transcat.com

## Problem

`src/components/upload/UploadPage.tsx` is 2,412 lines — the largest file remaining after the App.tsx breakup. It contains 16 distinct JSX sections plus ~210 lines of memoized calculations and event handlers at the top. Navigation, reasoning, and AI-assisted edits all suffer.

The file already has clear internal section markers (`{/* SectionName */}` JSX comments) that signal natural decomposition boundaries.

## Goals

- Extract 9 self-contained sub-components into their own files under `src/components/upload/`
- Zero behavior changes — mechanical movement only
- Each extraction is one atomic commit on a feature branch, individually revertible
- End state: `UploadPage.tsx` becomes a ~400-line composition root (orchestration + the section composition)

## Non-Goals

- Refactoring the state-orchestration hooks inside UploadPage (kept as-is)
- Fixing pre-existing bugs (e.g., `bg-gray-750` Tailwind no-op) — those stay for follow-up
- Splitting AppContent (separate future task)
- Internal duplication analysis (will become easier in smaller files; out of scope here)
- Test coverage (project has no test suite)

## Current State

`src/components/upload/UploadPage.tsx` contains 16 sections:

| Lines | Section |
|---|---|
| 184–395 | Memoized calcs + handlers (~210 lines) — stays in UploadPage |
| 397–405 | Quote Summary Dashboard wrapper (already-extracted child) |
| 407–417 | Unmatched Items wrapper (already-extracted child) |
| 419–522 | Upload Dropzone + CSV Format Guidelines |
| 524–534 | Processing State — stays in UploadPage (trivially small) |
| 536–570 | Errors + Warnings banners |
| 572–664 | Modern Quote Summary Dashboard (already-extracted child) |
| 665–775 | Data viz charts (Donut + Bar) |
| 777–832 | Smart Recommendations Panel |
| 834–898 | Auto-Optimize + Save/Load |
| 900–1044 | Bulk Actions Panel |
| 1045–2170 | Results table + expanded rows |
| 2172–2242 | Summary Stats — stays in UploadPage (trivially small) |
| 2244–2264 | Modal wrappers — stay in UploadPage |
| 2266–2350 | Lab Capability Management Modal (currently inline) |

## Target Architecture

```
src/components/upload/
  AppContent.tsx                      [existing, unchanged]
  UploadPage.tsx                      [shrinks 2,412 → ~400 lines]
  UploadAlerts.tsx                    [NEW]
  UploadDropzone.tsx                  [NEW]
  RecommendationsPanel.tsx            [NEW]
  OptimizeAndSavePanel.tsx            [NEW]
  QuoteCharts.tsx                     [NEW]
  BulkActionsPanel.tsx                [NEW]
  LabCapabilityModal.tsx              [NEW]
  match-results/
    MatchResultsTable.tsx             [NEW]
    MatchResultRow.tsx                [NEW]
```

The `match-results/` subdirectory groups the two tightly coupled files (Row is only usable via Table's parent context).

## Extraction Recipe (per component)

1. **READ** the source range in UploadPage.tsx. Enumerate the props it needs from UploadPage's prop list, plus any utilities/hooks referenced.
2. **CREATE** the new file with imports resolved relative to new location (one level up for direct children of `components/upload/`, two for files in `match-results/`), named props type hoisted (e.g., `type FooPanelProps = {...}`), exported function with byte-identical body.
3. **REMOVE** the section JSX from UploadPage.tsx; replace with `<FooPanel ... />` invocation passing the necessary props.
4. **IMPORT** the new component into UploadPage.tsx near existing component imports.
5. **VERIFY** — `npm run build` exit 0, live smoke test the affected section via HMR, `git diff --stat` shows exactly 2 files.
6. **COMMIT** atomically with message `Extract <ComponentName> from UploadPage`.

### Rules

- NO behavior changes. Pre-existing oddities preserved exactly.
- Stay in scope — each commit touches only the 2 expected files.
- No worktrees. Work directly in the main project directory on the `refactor/uploadpage-split` branch.
- Hoist inline prop types to named `<Component>Props` types.

## Sequencing

Each line below is one atomic commit. Order = independence × size (leaves first, big-thing last).

```
1. UploadAlerts            ~35 lines  (independent, smallest)
2. UploadDropzone         ~100 lines  (independent)
3. RecommendationsPanel    ~55 lines  (independent)
4. OptimizeAndSavePanel    ~65 lines  (independent)
5. QuoteCharts            ~110 lines  (independent)
6. BulkActionsPanel       ~145 lines  (independent)
7. LabCapabilityModal      ~85 lines  (independent — currently inline)
8. MatchResultRow         ~500 lines  (must extract before Table)
9. MatchResultsTable      ~600 lines  (depends on MatchResultRow)
```

End state: UploadPage.tsx ~400 lines.

## Verification Protocol

### Per-extraction gate

1. `npm run build` exits 0
2. `git diff --stat` shows exactly the 2 expected files (new + UploadPage.tsx)
3. Live smoke test the section owned by the extracted component

### Smoke targets

| Extracted component | Smoke target |
|---|---|
| UploadAlerts | Upload malformed CSV → red banner shows |
| UploadDropzone | Drop a CSV → parses and processes |
| RecommendationsPanel | Upload CSV → scroll to recommendations |
| OptimizeAndSavePanel | Click Auto-Optimize → it runs |
| QuoteCharts | Upload CSV → donut + bar charts render |
| BulkActionsPanel | Select rows → bulk actions UI appears |
| LabCapabilityModal | Click "Add Capability" in a row → modal opens |
| MatchResultRow | Expand a row → unit selection / service config / lab selector render |
| MatchResultsTable | Upload CSV → table renders with all rows |

### Failure handling

- DO NOT commit on failed build or failed smoke.
- Either fix and re-run the gate, or `git restore` the changed files and retry.
- No `--amend` forward. Each extraction is clean-commit-or-revert.

### Final verification (after all 9 commits)

- UploadPage.tsx line count under 500
- Full end-to-end smoke: upload CSV → recommendations → optimize → bulk actions → expand a row → Lab Capability Management modal
- `git log` shows 9 atomic extraction commits on the feature branch

## Branch Strategy

Create `refactor/uploadpage-split` from main. All 9 commits go there. Merge to main when complete (fast-forward, like App.tsx breakup).

## Execution Mode

Subagent-driven (same as App.tsx tasks 1–9). Each extraction = one implementer subagent + spec compliance reviewer + code quality reviewer. Reviews enforce no-behavior-changes and scope discipline. Use sonnet model for the two large extractions (MatchResultRow, MatchResultsTable); haiku for the smaller ones.

Subagents explicitly instructed: NO worktrees, NO branch switching. All work directly in main project directory on the feature branch.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Extracted component needs more props than expected | tsc catches immediately. MatchResultRow is the riskiest — likely 20+ props. |
| Internal state accidentally relocated | Subagent prompt enforces byte-identical body; spec reviewer verifies |
| Subagent creates worktree (App.tsx Task 8 issue) | Explicit prohibition in every implementer prompt — proven effective in Tasks 6-9 of App.tsx |
| Long props list per extracted component | Acceptable for this pass. Out of scope: addressing via context or composed hooks. |
| Pre-existing bugs preserved | Intentional. Follow-up task chips track them separately. |

## Out of Scope

- Refactoring UploadPage's state-management hooks (separate future task)
- Splitting AppContent (separate future task)
- Internal duplication elimination (becomes tractable after this split)
- Dark-mode className helper (declined earlier in this cycle)
- Fixing `bg-gray-750` (separate task chip already spawned)
- Bundle size / code-splitting
