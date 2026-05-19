# App.tsx Breakup — Design Spec

**Date:** 2026-05-19
**Status:** Approved, ready for implementation planning
**Owner:** louis.augostini@transcat.com

## Problem

`src/App.tsx` is 6,607 lines containing 9 React components plus 2 helper functions in one file. Maintainability is suffering: navigation is hard, reasoning about a single component requires loading the whole file, and a previous extraction attempt left orphaned/stale duplicates in `src/top-level/modals/` and `src/top-level/upload-page/`.

## Goals

- Break App.tsx into one-file-per-component
- Zero behavior changes — mechanical movement only
- Each extraction is independently verifiable and revertible
- Eliminate the orphaned duplicates in `src/top-level/`

## Non-Goals

- No renaming, no logic tweaks, no "while I'm here" cleanup
- No new tests (the project has none; we use TypeScript + manual smoke as safety net)
- No deeper sub-component decomposition — top-level only
- No changes to data layer, business logic, or context providers

## Current State

App.tsx contains:

| Component | Lines | Range |
|---|---|---|
| `AppContent` | ~1,510 | 175–1686 |
| `ServiceLevelMultiSelect` | ~170 | 1691–1859 |
| `DetailView` | ~840 | 1861–2697 |
| `analyzeUnitsData` + `runDiagnostics` + `Diagnostics` | ~220 | 2704–2923 |
| `UnitDetailsModal` | ~605 | 2928–3533 |
| `ManualSearchModal` | ~225 | 3538–3762 |
| `UnmatchedItemsSection` | ~210 | 3767–3977 |
| `QuoteSummaryDashboard` | ~235 | 3982–4218 |
| `UploadPage` | ~2,370 | 4223–6592 |
| `App` (export default) | small | 6598+ |

**Orphans:** `src/top-level/upload-page/UploadPage.tsx` (990 lines), `src/top-level/modals/UnitDetailsModal.tsx` (819 lines), `src/top-level/modals/ManualSearchModal.tsx` (243 lines), `src/top-level/modals/ComparisonModal.tsx` (310 lines). Re-exported via `src/top-level/index.ts` barrel but **not imported anywhere**. App.tsx uses its own local definitions. Live `ComparisonModal` is `src/components/modals/ComparisonModal.tsx` (already wired).

## Target Architecture

```
src/
  components/
    CopyButton.tsx                    [existing]
    ServiceLevelSelector.tsx          [existing]
    ServiceLevelMultiSelect.tsx       [new]
    DetailView.tsx                    [new]
    QuoteSummaryDashboard.tsx         [new]
    UnmatchedItemsSection.tsx         [new]
    diagnostics/
      Diagnostics.tsx                 [new]
      diagnostics-utils.ts            [new — runDiagnostics + analyzeUnitsData]
    modals/
      ComparisonModal.tsx             [existing, already wired]
      UnitDetailsModal.tsx            [new]
      ManualSearchModal.tsx           [new]
    upload/
      UploadPage.tsx                  [new]
      AppContent.tsx                  [new]
  App.tsx                             [shrinks to ~50 lines: providers + AppContent]
```

End state after cleanup: `src/top-level/modals/` and `src/top-level/upload-page/` deleted; their barrel re-exports removed from `src/top-level/index.ts`.

## Extraction Recipe (per component)

Every extraction follows the same 6-step mechanical recipe:

1. **READ** — Read the component's body in App.tsx; enumerate its props interface, imports, and references to other App.tsx-resident components.
2. **CREATE FILE** — Write the new file with copy of component, resolved imports, named props type, `export function X(...)`.
3. **REMOVE** — Delete the original function body from App.tsx.
4. **IMPORT** — Add `import { X } from "./components/.../X";` to App.tsx.
5. **VERIFY** — Run gate (below); manually smoke-test the affected screen.
6. **COMMIT** — Single atomic commit: `Extract <X> from App.tsx`.

### Rules

- **No behavior changes.** Mechanical movement only. Note opportunities as TODOs for follow-up.
- **Inline prop types get named.** `function X({a, b}: {a: string})` becomes `type XProps = {...}; export function X(p: XProps)`.
- **Shared inline helpers** go to a co-located `helpers.ts` if reused elsewhere, otherwise stay in the new file.
- **Orphan diff check** before extracting `UploadPage`, `UnitDetailsModal`, `ManualSearchModal`: diff App.tsx version vs. the `src/top-level/` orphan; preserve any divergent fixes; otherwise treat App.tsx as canonical.

## Verification Protocol

### Per-extraction gate (must pass before next commit)

1. `npm run build` — tsc + vite build, ZERO errors and ZERO warnings.
2. `npm run lint` — ESLint clean (project is configured with `max-warnings 0`).
3. **Manual smoke test** — click through the screen owned by the extracted component (see table below).
4. `git diff HEAD~1` review — should be 1 new file + edits in App.tsx only.

### Smoke-test target per extraction

| Extracted | Smoke target |
|---|---|
| `Diagnostics` + utils | Open Diagnostics panel; counts render |
| `ServiceLevelMultiSelect` | Open any unit; change service levels |
| `ManualSearchModal` | Trigger manual search from unmatched items |
| `UnmatchedItemsSection` | Upload CSV with bad rows |
| `QuoteSummaryDashboard` | Upload CSV; verify dashboard |
| `UnitDetailsModal` | Click unit row; modal opens with lab caps table |
| `DetailView` | Navigate to unit detail page; dark mode; closest-lab |
| `UploadPage` | Full flow: upload → results → details |
| `AppContent` | App launches; providers wire up |

### Failure handling

- DO NOT proceed; DO NOT commit partial work.
- Fix and re-run gate, OR `git reset --hard HEAD` to discard the extraction.
- No `--amend` forward; each extraction is clean-commit-or-revert.

### Final verification (after all 10 commits)

- App.tsx under 100 lines.
- `npm run build` and `npm run lint` clean.
- Full end-to-end smoke: upload CSV → review → drill into details → export PDF → toggle dark mode → ZIP closest-lab flow.
- `git log` shows 9 extraction commits + 1 cleanup commit.

## Sequencing

Extractions are ordered so each step depends only on already-extracted or unmoved code.

```
Diagnostics + utils       (independent)
ServiceLevelMultiSelect    (independent)
ManualSearchModal          (independent)
UnmatchedItemsSection      (depends on ManualSearchModal)
QuoteSummaryDashboard      (independent)
UnitDetailsModal           (depends on ServiceLevelMultiSelect)
DetailView                 (depends on UnitDetailsModal, ServiceLevelMultiSelect)
UploadPage                 (depends on Diagnostics, QuoteSummaryDashboard,
                            UnmatchedItemsSection, UnitDetailsModal, DetailView)
AppContent                 (depends on UploadPage)
```

### Commit sequence

| # | Commit | Approx lines moved |
|---|---|---|
| 1 | Extract `diagnostics-utils.ts` + `Diagnostics` | ~220 |
| 2 | Extract `ServiceLevelMultiSelect` | ~170 |
| 3 | Extract `ManualSearchModal` | ~225 |
| 4 | Extract `UnmatchedItemsSection` | ~210 |
| 5 | Extract `QuoteSummaryDashboard` | ~235 |
| 6 | Extract `UnitDetailsModal` | ~605 |
| 7 | Extract `DetailView` | ~840 |
| 8 | Extract `UploadPage` | ~2,370 |
| 9 | Extract `AppContent` | ~1,510 |
| 10 | Cleanup: delete orphans + remove barrel re-exports | — |

### Effort estimate

- Steps 1–5: ~15–20 min each
- Steps 6–7: ~30–40 min each
- Step 8 (`UploadPage`): ~60–90 min — most internal helpers
- Step 9 (`AppContent`): ~45–60 min
- Step 10: ~10 min

**Total: ~5–7 hours of focused work**, splittable across sessions.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Missed import causes runtime error | Per-extraction smoke test catches before next commit |
| Hidden coupling between components | Extract leaves first; circular references surface immediately as tsc errors |
| Orphan files have divergent fixes | Diff check before extracting orphan-shadowed components |
| Drift mid-refactor if interrupted | Atomic commits — partially done state is always a valid, working app |
| Hoisting inline helpers wrong | Default to keeping helpers in the new file unless tsc forces relocation |

## Out of Scope (Future Work)

- Deeper sub-component decomposition (e.g., breaking `UploadPage` into smaller pieces)
- Test suite addition
- Bundling/perf optimization
- Renaming for clarity
- Hooks extraction beyond what already exists
