# UploadPage Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract 9 self-contained sub-components from `src/components/upload/UploadPage.tsx` (2,412 lines) into sibling files under `src/components/upload/`, shrinking UploadPage to ~400 lines.

**Architecture:** Nine atomic extractions in dependency order (leaves first), each one a single commit on the `refactor/uploadpage-split` branch. Pure mechanical movement — no behavior changes. Each section's identity is anchored on its JSX comment marker (which is stable across extractions), not on line numbers (which shift).

**Tech Stack:** React 19, TypeScript 5.7, Vite 6, Tailwind 3.4. No test suite — verification via `npm run build` (tsc + vite) and manual smoke against the running dev server on port 5180.

**Spec reference:** [2026-05-19-uploadpage-split-design.md](../specs/2026-05-19-uploadpage-split-design.md)

---

## Universal Extraction Recipe

Every task below follows this recipe. The recipe is short because the team has run this pattern successfully 12+ times in the App.tsx breakup.

1. **READ** the section in `src/components/upload/UploadPage.tsx` — find it by its JSX comment marker (e.g., `{/* FEATURE 1: Smart Recommendations Panel */}`), not by line number. Note the props the section reads from UploadPage's prop list and any utilities/types it references.
2. **CREATE** the new file in `src/components/upload/` (or `match-results/` for Tasks 8 and 9). Imports resolved from new location. Named props type hoisted (e.g., `type FooPanelProps = { ... }`). Exported as `export function FooPanel(props: FooPanelProps) { ... }`. Body copied byte-identical (no behavior changes, preserve pre-existing quirks like the `bg-gray-750` Tailwind no-op).
3. **REMOVE** the original section JSX from UploadPage.tsx. Replace with `<FooPanel ... />` invocation passing the needed props.
4. **IMPORT** the new component into UploadPage.tsx near other component imports (around lines 9–13 of the file).
5. **VERIFY:** Run `npm run build` (must exit 0). Run `git diff --stat` (must show exactly the 2 expected files). Smoke-test the affected section via HMR in the live dev server.
6. **COMMIT** atomically with the task-specific message.

### Critical rules (apply to every task)

- NO behavior changes. Mechanical movement only.
- NO worktrees. NO branch switching. All work directly in the main project directory on the `refactor/uploadpage-split` branch.
- Stay in scope — only 2 files in `git diff` (the new file + UploadPage.tsx).
- Build failures: read the error, fix the missing import, re-run. If unrecoverable, `git restore` and retry.
- DO NOT commit on a failing build.
- Pre-existing oddities (e.g., the `bg-gray-750` no-op or the inline `any[]` types) are preserved as-is — out of scope.

---

## Pre-flight

### Task 0: Establish clean baseline + feature branch

**Files:**
- Modify: branch state (create new branch)

- [ ] **Step 1: Confirm clean working tree on `main`**

Run:
```powershell
git status
```

Expected: on `main`, no tracked changes (untracked `.claude/` and `dist/` are OK).

- [ ] **Step 2: Confirm baseline build passes**

Run:
```powershell
npm run build
```

Expected: exit code 0. Pre-existing chunk size warning is acceptable.

- [ ] **Step 3: Create feature branch**

Run:
```powershell
git checkout -b refactor/uploadpage-split
git status
```

Expected: branch `refactor/uploadpage-split`, working tree clean.

- [ ] **Step 4: Confirm dev server is running (for HMR smoke tests)**

The dev server should be running at `http://localhost:5180`. If not, start it in a separate terminal:
```powershell
npm run dev
```

Reload the browser and confirm the app loads with no console errors.

---

## Task 1: Extract UploadAlerts

**Files:**
- Create: `src/components/upload/UploadAlerts.tsx`
- Modify: `src/components/upload/UploadPage.tsx`

**Source sections:** `{/* Errors */}` (~lines 536–552) AND `{/* Warnings */}` (~lines 554–570). Both get combined into one `UploadAlerts` component.

**Props needed:** `errors: string[]`, `warnings: string[]`.

**Smoke target:** Upload a CSV with malformed rows (e.g., empty manufacturer column). Red error banner should appear when there are errors; amber warning banner when there are warnings.

- [ ] **Step 1: Read both source sections in UploadPage.tsx**

Open `src/components/upload/UploadPage.tsx`. Find:
- `{/* Errors */}` marker — the block renders `errors.length > 0 && (<div class="glass-card ...red...">...</div>)`
- `{/* Warnings */}` marker — the block renders `warnings.length > 0 && (<div class="glass-card ...amber...">...</div>)`

Both blocks together are ~35 lines.

- [ ] **Step 2: Create `src/components/upload/UploadAlerts.tsx`**

```tsx
type UploadAlertsProps = {
  errors: string[];
  warnings: string[];
};

export function UploadAlerts({ errors, warnings }: UploadAlertsProps) {
  return (
    <>
      {/* Errors */}
      {errors.length > 0 && (
        // COPY EXACT JSX from UploadPage's {/* Errors */} block here
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        // COPY EXACT JSX from UploadPage's {/* Warnings */} block here
      )}
    </>
  );
}
```

Copy the JSX bodies verbatim. No imports needed beyond React (and React isn't required in React 19 if no JSX-namespace usage).

- [ ] **Step 3: Remove both source sections from UploadPage.tsx**

Delete the two blocks (errors + warnings, contiguous in source). Replace with a single invocation:

```tsx
<UploadAlerts errors={errors} warnings={warnings} />
```

- [ ] **Step 4: Add import to UploadPage.tsx**

Near the other component imports (around line 9–13):

```tsx
import { UploadAlerts } from "./UploadAlerts";
```

- [ ] **Step 5: Verify build**

Run:
```powershell
npm run build
```

Expected: exit 0.

- [ ] **Step 6: Verify diff scope**

Run:
```powershell
git diff --stat
```

Expected: exactly 2 files — new `src/components/upload/UploadAlerts.tsx` and modified `src/components/upload/UploadPage.tsx`. Nothing else.

- [ ] **Step 7: Smoke test**

In the browser (HMR has reloaded):
- Go to Bulk Upload tab
- Upload a CSV with at least one malformed row (e.g., `manufacturer,model\n,87V\nFluke,`)
- Verify red error banner renders
- Upload a CSV that triggers warnings (e.g., a duplicate row); verify amber warning banner

- [ ] **Step 8: Commit**

```powershell
git add src/components/upload/UploadAlerts.tsx src/components/upload/UploadPage.tsx
git commit -m "Extract UploadAlerts from UploadPage"
```

---

## Task 2: Extract UploadDropzone

**Files:**
- Create: `src/components/upload/UploadDropzone.tsx`
- Modify: `src/components/upload/UploadPage.tsx`

**Source section:** `{/* Modern Upload Section */}` (~lines 419–522). About 100 lines including the drop zone + the CSV Format Guidelines card below it.

**Props needed:** Likely `fileInputRef`, `onFileUpload` (drop / file-change handler), `isProcessing`, `darkMode`, `onResetAll`. The subagent should read the section and enumerate exactly what's referenced.

**Smoke target:** Bulk Upload tab loads, drop zone renders with 📤 icon, CSV format guidelines card with sample CSV appears, dropping a CSV file triggers parsing.

- [ ] **Step 1: Read the source section**

Find `{/* Modern Upload Section */}` in `src/components/upload/UploadPage.tsx`. Note all props/handlers it references (likely `fileInputRef`, `onFileUpload`, `isProcessing`, `darkMode`, `onResetAll`).

- [ ] **Step 2: Create `src/components/upload/UploadDropzone.tsx`**

```tsx
type UploadDropzoneProps = {
  // hoist exact prop shape from the section's variable references
};

export function UploadDropzone(props: UploadDropzoneProps) {
  // COPY EXACT JSX from the Modern Upload Section block here
}
```

Imports needed: whatever the original JSX uses (`clsx` from `../../top-level` if used, possibly Tailwind className utilities).

- [ ] **Step 3: Remove the source section from UploadPage.tsx**

Delete the entire `{/* Modern Upload Section */}` block. Replace with:

```tsx
<UploadDropzone /* pass the props it needs */ />
```

- [ ] **Step 4: Add import to UploadPage.tsx**

```tsx
import { UploadDropzone } from "./UploadDropzone";
```

- [ ] **Step 5: Verify build**

```powershell
npm run build
```

- [ ] **Step 6: Verify diff scope**

```powershell
git diff --stat
```

Expected: 2 files.

- [ ] **Step 7: Smoke test**

- Browser: reload, Bulk Upload tab.
- Drop zone renders with 📤 icon, "Drop CSV file here or click to browse" text.
- CSV Format Guidelines card with sample CSV renders.
- Drop a valid CSV file — it parses and triggers the processing flow.

- [ ] **Step 8: Commit**

```powershell
git add src/components/upload/UploadDropzone.tsx src/components/upload/UploadPage.tsx
git commit -m "Extract UploadDropzone from UploadPage"
```

---

## Task 3: Extract RecommendationsPanel

**Files:**
- Create: `src/components/upload/RecommendationsPanel.tsx`
- Modify: `src/components/upload/UploadPage.tsx`

**Source section:** `{/* FEATURE 1: Smart Recommendations Panel */}` (~lines 777–832). About 55 lines.

**Props needed:** Likely `recommendations`, `darkMode`, `selectedLabs`, plus any handler the panel triggers. The subagent enumerates exactly.

**Smoke target:** After CSV upload, scroll to the Recommendations panel section. It renders rec items with warning/info/success colors and emoji.

- [ ] **Step 1: Read the source section**

Find `{/* FEATURE 1: Smart Recommendations Panel */}`. The map at line ~808 iterates `recommendations.slice(0, 10)`.

- [ ] **Step 2: Create `src/components/upload/RecommendationsPanel.tsx`**

```tsx
import type { Recommendation } from "../../top-level";

type RecommendationsPanelProps = {
  // hoist from the section's references
};

export function RecommendationsPanel(props: RecommendationsPanelProps) {
  // COPY EXACT JSX
}
```

- [ ] **Step 3: Remove from UploadPage.tsx**

Delete the block. Replace with:
```tsx
<RecommendationsPanel /* pass props */ />
```

- [ ] **Step 4: Add import**

```tsx
import { RecommendationsPanel } from "./RecommendationsPanel";
```

- [ ] **Step 5: Verify build**

```powershell
npm run build
```

- [ ] **Step 6: Verify diff scope and smoke test**

```powershell
git diff --stat
```

Expected: 2 files. Smoke: upload a CSV, scroll to recommendations section, verify rendering.

- [ ] **Step 7: Commit**

```powershell
git add src/components/upload/RecommendationsPanel.tsx src/components/upload/UploadPage.tsx
git commit -m "Extract RecommendationsPanel from UploadPage"
```

---

## Task 4: Extract OptimizeAndSavePanel

**Files:**
- Create: `src/components/upload/OptimizeAndSavePanel.tsx`
- Modify: `src/components/upload/UploadPage.tsx`

**Source section:** `{/* FEATURE 2 & 5: Auto-Optimize and Save/Load */}` (~lines 834–898). About 65 lines.

**Props needed:** Likely `handleOptimize`, `saveQuoteSession`, `loadQuoteSession`, `darkMode`.

**Smoke target:** After CSV upload, the Auto-Optimize, Save Quote, and Load Quote buttons render. Clicking Auto-Optimize triggers the optimization handler.

- [ ] **Step 1: Read the source section**

Find `{/* FEATURE 2 & 5: Auto-Optimize and Save/Load */}`. Enumerate props/handlers referenced.

- [ ] **Step 2: Create `src/components/upload/OptimizeAndSavePanel.tsx`**

```tsx
import type { OptimizationStrategy } from "../../top-level";

type OptimizeAndSavePanelProps = {
  // hoist from references
};

export function OptimizeAndSavePanel(props: OptimizeAndSavePanelProps) {
  // COPY EXACT JSX
}
```

- [ ] **Step 3: Remove and replace in UploadPage.tsx**

Delete the block. Insert:
```tsx
<OptimizeAndSavePanel /* props */ />
```

- [ ] **Step 4: Add import**

```tsx
import { OptimizeAndSavePanel } from "./OptimizeAndSavePanel";
```

- [ ] **Step 5: Verify build and smoke**

```powershell
npm run build
git diff --stat
```

Smoke: upload CSV, verify buttons render, click Auto-Optimize and confirm it executes.

- [ ] **Step 6: Commit**

```powershell
git add src/components/upload/OptimizeAndSavePanel.tsx src/components/upload/UploadPage.tsx
git commit -m "Extract OptimizeAndSavePanel from UploadPage"
```

---

## Task 5: Extract QuoteCharts

**Files:**
- Create: `src/components/upload/QuoteCharts.tsx`
- Modify: `src/components/upload/UploadPage.tsx`

**Source section:** `{/* Data Visualization Charts */}` (~lines 665–775). About 110 lines — contains the Lab Distribution Donut Chart (lines 667+) and Cost Breakdown Bar Chart (lines 705+).

**Props needed:** Likely `results`, `selectedLabs`, `selectedMatches`, `selectedPrices`, `darkMode`, plus calculation inputs. Subagent enumerates.

**Smoke target:** After CSV upload, scroll to the charts area. Donut chart of lab distribution renders. Bar chart of cost breakdown renders.

- [ ] **Step 1: Read the source section**

Find `{/* Data Visualization Charts */}`. This section uses `DonutChart` and `HorizontalBarChart` from `../../top-level`.

- [ ] **Step 2: Create `src/components/upload/QuoteCharts.tsx`**

```tsx
import { DonutChart, HorizontalBarChart, money } from "../../top-level";
import type { MatchResult } from "../../top-level";

type QuoteChartsProps = {
  // hoist from references
};

export function QuoteCharts(props: QuoteChartsProps) {
  // COPY EXACT JSX
}
```

- [ ] **Step 3: Remove and replace in UploadPage.tsx**

```tsx
<QuoteCharts /* props */ />
```

- [ ] **Step 4: Add import**

```tsx
import { QuoteCharts } from "./QuoteCharts";
```

- [ ] **Step 5: Verify build and smoke**

```powershell
npm run build
git diff --stat
```

Smoke: upload CSV, verify both charts render with correct data.

- [ ] **Step 6: Commit**

```powershell
git add src/components/upload/QuoteCharts.tsx src/components/upload/UploadPage.tsx
git commit -m "Extract QuoteCharts from UploadPage"
```

---

## Task 6: Extract BulkActionsPanel

**Files:**
- Create: `src/components/upload/BulkActionsPanel.tsx`
- Modify: `src/components/upload/UploadPage.tsx`

**Source section:** `{/* FEATURE 3: Bulk Actions Panel */}` (~lines 900–1044). About 145 lines — contains lab selector, service level dropdown, base price input, bulk apply buttons.

**Props needed:** Many. Likely `bulkSelectedRows`, `applyBulkLab`, `applyBulkServiceLevel`, `applyBulkBasePrice`, `clearBulkSelection`, `darkMode`, plus `LABS`, etc.

**Smoke target:** Upload CSV → select 2+ rows via checkboxes → bulk actions panel becomes visible → can apply a lab/level/price.

- [ ] **Step 1: Read the source section**

Find `{/* FEATURE 3: Bulk Actions Panel */}`. Enumerate all the bulk-action callbacks and state slices it references.

- [ ] **Step 2: Create `src/components/upload/BulkActionsPanel.tsx`**

```tsx
import { LABS } from "../../data/labs";
import { ALL_LEVELS, SERVICE_LEVEL_DESC, clsx } from "../../top-level";

type BulkActionsPanelProps = {
  // hoist from references
};

export function BulkActionsPanel(props: BulkActionsPanelProps) {
  // COPY EXACT JSX
}
```

- [ ] **Step 3: Remove and replace in UploadPage.tsx**

```tsx
<BulkActionsPanel /* props */ />
```

- [ ] **Step 4: Add import**

```tsx
import { BulkActionsPanel } from "./BulkActionsPanel";
```

- [ ] **Step 5: Verify build, diff, smoke**

```powershell
npm run build
git diff --stat
```

Smoke: upload CSV, select 2+ rows, verify panel appears, apply a bulk action.

- [ ] **Step 6: Commit**

```powershell
git add src/components/upload/BulkActionsPanel.tsx src/components/upload/UploadPage.tsx
git commit -m "Extract BulkActionsPanel from UploadPage"
```

---

## Task 7: Extract LabCapabilityModal

**Files:**
- Create: `src/components/upload/LabCapabilityModal.tsx`
- Modify: `src/components/upload/UploadPage.tsx`

**Source section:** `{/* Lab Capability Management Modal */}` (~lines 2266–2350). About 85 lines — currently an inline modal at the very bottom of UploadPage.

**Props needed:** `capabilityModalOpen`, `capabilityModalData`, `closeCapabilityModal`, `addLabCapability`, `removeLabCapability`, `darkMode`.

**Smoke target:** Upload CSV → expand a row → use "Add Capability" or "Remove Capability" button → modal opens correctly.

- [ ] **Step 1: Read the source section**

Find `{/* Lab Capability Management Modal */}`. This is currently rendered inline as a sibling at the bottom of UploadPage's JSX.

- [ ] **Step 2: Create `src/components/upload/LabCapabilityModal.tsx`**

```tsx
import { LABS } from "../../data/labs";
import { clsx } from "../../top-level";

type LabCapabilityModalProps = {
  // hoist from references
};

export function LabCapabilityModal(props: LabCapabilityModalProps) {
  // COPY EXACT JSX
}
```

- [ ] **Step 3: Remove and replace in UploadPage.tsx**

```tsx
<LabCapabilityModal /* props */ />
```

- [ ] **Step 4: Add import**

```tsx
import { LabCapabilityModal } from "./LabCapabilityModal";
```

- [ ] **Step 5: Verify build, diff, smoke**

```powershell
npm run build
git diff --stat
```

Smoke: upload CSV, expand a row, click "Add Capability" — modal opens. Close it via the close button.

- [ ] **Step 6: Commit**

```powershell
git add src/components/upload/LabCapabilityModal.tsx src/components/upload/UploadPage.tsx
git commit -m "Extract LabCapabilityModal from UploadPage"
```

---

## Task 8: Extract MatchResultRow

**Files:**
- Create: `src/components/upload/match-results/MatchResultRow.tsx`
- Modify: `src/components/upload/UploadPage.tsx`

**Source content:** The body of `results.map((result, i) => { ... return (<React.Fragment key={i}>...</React.Fragment>); })` — currently starts at ~line 1214 and the Fragment closes at ~line 2164. About 950 lines (much of which is the expanded row content from ~1681 onward).

**This is the riskiest extraction — many props.** Likely 20+ props (every per-row callback, state slice, lookup helper). The subagent must enumerate them carefully.

**Approach:** Extract the entire Fragment body (both the main `<tr>` and the conditional expanded `<tr>`) as a single component. The map in UploadPage becomes `results.map((result, i) => <MatchResultRow key={i} index={i} result={result} {...allTheProps} />)`.

**Important:** The `key` belongs on `<MatchResultRow>` in the map, since `MatchResultRow` is the direct child of the map now (replacing the Fragment). The component itself returns `<><tr>...</tr>{isExpanded && <tr>...</tr>}</>` — bare fragment is fine because it's no longer inside a list.

**Smoke target:** Upload CSV → table renders with multiple rows → expand a row (click ▶ arrow) → all sub-sections render (Unit Selection, Service Configuration, Lab Selector, Lab Capability Management buttons).

- [ ] **Step 1: Read the source — full Fragment body**

In `src/components/upload/UploadPage.tsx`, find the `results.map((result, i) => {` opener (around line 1214). Read everything from `return (` through `</React.Fragment>` and `);` (close to line 2164–2165).

Then enumerate ALL identifiers used inside this block. These become props for the new component. Common ones to expect (verify against the source):

- `result`, `index` (from the map signature)
- State slices: `expandedRows`, `selectedMatches`, `selectedLabs`, `selectedPrices`, `bulkSelectedRows`, `multiSelectMode`, `transferLabs`, `tmsLabs`, `tmsPrices`, `tmsTurnTimes`, `tmsVendors`, `labCapabilityOverrides`, `excludedItems`, `researchItems`
- Callbacks: `onToggleRowExpansion`, `onSelectMatch`, `onExcludeItem`, `onSendToResearch`, `toggleBulkSelect`, `toggleMultiSelectMode`, `toggleServiceLevel`, `updateServiceLevel`, `updateServiceLevels`, `updatePrice`, `updateLab`, `setModalRowIndex`, `openCapabilityModal`
- Lookups: `getSelectedMatch`, `getSelectedServiceLevel`, `getSelectedServiceLevels`, `getSelectedPrice`, `getSelectedLab`, `getEligibleLabsForUnitWithOverrides`, `getMatchQuality` (from `../../top-level`)
- Boolean: `darkMode`

- [ ] **Step 2: Create `src/components/upload/match-results/MatchResultRow.tsx`**

```tsx
import React from "react";
import { ServiceLevelSelector } from "../../ServiceLevelSelector";
import { LABS, supportsOnsiteCalibration, getLabCapabilitiesForUnit, getEligibleLabsForUnit } from "../../../data/labs";
import {
  clsx, money, ttColor, getCapacityColor, getCapacityTextColor,
  SERVICE_LEVEL_DESC, LAB_CAPACITY, ALL_LEVELS,
  getMatchQuality, /* anything else from the body */
} from "../../../top-level";
import type { Unit, MatchResult } from "../../../top-level";

type MatchResultRowProps = {
  index: number;
  result: MatchResult;
  // ... full prop list from Step 1's enumeration
};

export function MatchResultRow(props: MatchResultRowProps) {
  const { index: i, result, /* destructure all */ } = props;

  // COPY the body of the map's return statement here, EXACTLY.
  // The body begins with the constants computed inside the map (isExpanded, selectedMatch,
  // hasMultipleMatches, hasMatches, matchQuality, isExactMatch, canExpand, showExpandArrow)
  // and ends with the </React.Fragment>.
  // Replace `<React.Fragment key={i}>` with bare `<>` since this is no longer inside a list iteration.
  // Use bare `</>`.

  const isExpanded = props.expandedRows.has(i);
  // ... etc
  return (
    <>
      <tr /* ... */>{/* main row */}</tr>
      {isExpanded && (
        <tr className="bg-slate-50">{/* expanded row */}</tr>
      )}
    </>
  );
}
```

**Note:** the inner const computations at the top of the map's body (isExpanded, selectedMatch, hasMultipleMatches, hasMatches, matchQuality, isExactMatch, canExpand, showExpandArrow) move INTO the component body, not into the props.

- [ ] **Step 3: Replace the map body in UploadPage.tsx**

Change the existing:

```tsx
{results.map((result, i) => {
  const isExpanded = expandedRows.has(i);
  // ... lots of computation
  return (
    <React.Fragment key={i}>
      <tr key={i} /* ... */>...</tr>
      {isExpanded && <tr>...</tr>}
    </React.Fragment>
  );
})}
```

to:

```tsx
{results.map((result, i) => (
  <MatchResultRow
    key={i}
    index={i}
    result={result}
    /* pass every prop the component needs — same list enumerated in Step 1 */
    expandedRows={expandedRows}
    selectedMatches={selectedMatches}
    /* ... etc ... */
    darkMode={darkMode}
  />
))}
```

The `key={i}` is now on `<MatchResultRow>` directly (the map's direct child), which is the correct place per the React fragment-key fix already in the codebase.

- [ ] **Step 4: Add import**

```tsx
import { MatchResultRow } from "./match-results/MatchResultRow";
```

- [ ] **Step 5: Verify build**

```powershell
npm run build
```

Expect this to take a few iterations — many props means many opportunities for typos in prop names. Read tsc errors carefully and fix.

- [ ] **Step 6: Verify diff scope**

```powershell
git diff --stat
```

Expected: 2 files — new `src/components/upload/match-results/MatchResultRow.tsx`, modified `src/components/upload/UploadPage.tsx`.

- [ ] **Step 7: Smoke test (thorough — this is the biggest extraction)**

Upload CSV with at least 2 rows. Verify:
- Main table rows render with manufacturer/model/match indicators
- Click ▶ to expand a row
- Expanded row shows Unit Selection (if non-exact match)
- Service Level Selector works (single + multi select)
- Price Selector works
- Lab Selector dropdown renders
- Lab Capability Management buttons render and clicking "Add Capability" opens the modal
- Collapse the row again
- No console errors

- [ ] **Step 8: Commit**

```powershell
git add src/components/upload/match-results/MatchResultRow.tsx src/components/upload/UploadPage.tsx
git commit -m "Extract MatchResultRow from UploadPage"
```

---

## Task 9: Extract MatchResultsTable

**Files:**
- Create: `src/components/upload/match-results/MatchResultsTable.tsx`
- Modify: `src/components/upload/UploadPage.tsx`

**Source section:** `{/* Results */}` (~lines 1045–2170) — the entire results table block: the outer card, the table headers, and the `results.map(...)` body (which now invokes `MatchResultRow` from Task 8).

**Approach:** The wrapper around `results.map` (the `<div class="glass-card">`, the `<table>`, `<thead>`, `<tbody>` opener, and the `</tbody></table></div>` closer) plus the map itself. The header section includes the "Match Results (N items)" title, Select All checkbox, Export Results button.

**Props needed:** `results` (to iterate), `selectAllRows`, all the per-row props that `MatchResultRow` needs (since MatchResultsTable passes them through), `darkMode`, plus any header-level helpers.

**Smoke target:** Upload CSV → table renders with header, column titles, and all rows. Select All checkbox works. Export Results button works.

- [ ] **Step 1: Read the source section**

Find `{/* Results */}` in UploadPage.tsx. Read from there down to the closing `</div>` of the outer card (just before `{/* Summary Stats */}`). This is the entire results card.

- [ ] **Step 2: Create `src/components/upload/match-results/MatchResultsTable.tsx`**

```tsx
import { MatchResultRow } from "./MatchResultRow";
import { clsx } from "../../../top-level";
import type { MatchResult } from "../../../top-level";

type MatchResultsTableProps = {
  results: MatchResult[];
  // ... the full pass-through prop list for MatchResultRow
  // plus header-level props like selectAllRows
  darkMode: boolean;
};

export function MatchResultsTable(props: MatchResultsTableProps) {
  // COPY the entire Results section from UploadPage
  // The internal `results.map((result, i) => <MatchResultRow ... />)` already exists
  // from Task 8; that stays inside this component.
}
```

- [ ] **Step 3: Replace the Results section in UploadPage.tsx**

Delete the entire `{/* Results */}` block. Replace with:

```tsx
<MatchResultsTable /* full prop list */ />
```

UploadPage now passes the same props to MatchResultsTable that it previously used to render the table directly.

- [ ] **Step 4: Add import to UploadPage.tsx**

```tsx
import { MatchResultsTable } from "./match-results/MatchResultsTable";
```

Also: the existing `import { MatchResultRow } ...` line added in Task 8 should be REMOVED from UploadPage.tsx, since `MatchResultRow` is no longer used directly by UploadPage (only by `MatchResultsTable`). If `tsc` flags it as unused after Step 5, remove it.

- [ ] **Step 5: Verify build**

```powershell
npm run build
```

If tsc complains "MatchResultRow declared but never read" in UploadPage.tsx, remove the now-orphaned import.

- [ ] **Step 6: Verify diff scope**

```powershell
git diff --stat
```

Expected: 2 files — new `src/components/upload/match-results/MatchResultsTable.tsx`, modified `src/components/upload/UploadPage.tsx`.

- [ ] **Step 7: Smoke test**

Upload CSV with multiple rows. Verify:
- Outer card with "Match Results (N items)" header renders
- Select All checkbox at top of table works
- Export Results button is present and clickable
- All rows render via `MatchResultRow`
- Each row can be expanded/collapsed
- No console errors

- [ ] **Step 8: Commit**

```powershell
git add src/components/upload/match-results/MatchResultsTable.tsx src/components/upload/UploadPage.tsx
git commit -m "Extract MatchResultsTable from UploadPage"
```

---

## Final Verification

### Task 10: Confirm end state and merge

- [ ] **Step 1: Confirm UploadPage.tsx is under 500 lines**

```powershell
(Get-Content src/components/upload/UploadPage.tsx | Measure-Object -Line).Lines
```

Expected: under 500 (likely ~400).

- [ ] **Step 2: Confirm all new files exist**

```powershell
Get-ChildItem -Recurse src/components/upload -Filter *.tsx | Select-Object FullName
```

Expected to include:
- `src/components/upload/UploadPage.tsx`
- `src/components/upload/AppContent.tsx`
- `src/components/upload/UploadAlerts.tsx`
- `src/components/upload/UploadDropzone.tsx`
- `src/components/upload/RecommendationsPanel.tsx`
- `src/components/upload/OptimizeAndSavePanel.tsx`
- `src/components/upload/QuoteCharts.tsx`
- `src/components/upload/BulkActionsPanel.tsx`
- `src/components/upload/LabCapabilityModal.tsx`
- `src/components/upload/match-results/MatchResultsTable.tsx`
- `src/components/upload/match-results/MatchResultRow.tsx`

- [ ] **Step 3: Final build**

```powershell
npm run build
```

Expected: exit 0.

- [ ] **Step 4: Full end-to-end smoke test**

Reload `http://localhost:5180` and run the full happy path:
1. Search tab: type a part number, verify filtered results
2. Details tab: open a unit, verify Lab Capabilities table renders
3. Bulk Upload tab: upload a CSV with mixed rows (some matched, some unmatched)
4. Verify recommendations panel renders
5. Click Auto-Optimize
6. Select rows via checkboxes, verify Bulk Actions Panel appears
7. Expand a row, verify all sub-sections render
8. Open the Lab Capability Management modal from inside a row
9. Toggle dark mode in multiple views
10. Export PDF and Excel — verify downloads
11. No console errors

- [ ] **Step 5: Review git log**

```powershell
git log --oneline -12
```

Expected: 9 extraction commits on `refactor/uploadpage-split`, plus the spec commit on main (pre-branch).

- [ ] **Step 6: Merge to main (when user confirms)**

DO NOT merge until user explicitly confirms. When approved:

```powershell
git checkout main
git merge --ff-only refactor/uploadpage-split
git branch -d refactor/uploadpage-split
git push origin main
```

---

## Notes for the implementing subagent dispatcher

- **One subagent per task.** Fresh context each time. Pass the full task text in the prompt (don't make subagents read the plan file).
- **Spec-compliance + code-quality review after each task** (subagent-driven-development pattern).
- **Model selection:** haiku for tasks 1–7 (small extractions), sonnet for tasks 8–9 (the giant + complex props).
- **The MatchResultRow extraction (Task 8) is the risky one.** Watch carefully for missed props — tsc errors will catch most, but subtle behavior like `useCallback` dependency arrays could be lost if the body has any computed values that the subagent doesn't move.
- **Pre-existing oddities stay.** The `bg-gray-750` Tailwind no-op, the React-key fix for fragments, the mojibake fix — all already correct in the current state. Subagents should preserve current behavior exactly.
- **Line numbers shift between tasks.** Each new subagent should locate sections by their JSX comment marker (e.g., `{/* FEATURE 1: Smart Recommendations Panel */}`), not by line number.
