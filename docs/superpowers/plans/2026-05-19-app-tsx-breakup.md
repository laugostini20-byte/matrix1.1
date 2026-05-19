# App.tsx Breakup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract 9 components from `src/App.tsx` (6,607 lines) into one-file-per-component structure under `src/components/`, with zero behavior changes.

**Architecture:** Mechanical extraction in dependency order (leaves first). Each component becomes its own file. Each extraction is one atomic commit verified by tsc + lint + manual smoke test. After all extractions, delete orphaned duplicates in `src/top-level/modals/` and `src/top-level/upload-page/`.

**Tech Stack:** React 19, TypeScript 5.7, Vite 6, Tailwind 3.4. No tests in project — safety net is TypeScript + ESLint + manual browser smoke test.

**Spec reference:** [2026-05-19-app-tsx-breakup-design.md](../specs/2026-05-19-app-tsx-breakup-design.md)

---

## Universal Extraction Recipe

Every task below follows this recipe. Each task instantiates this recipe with specific line numbers, file paths, and smoke-test steps.

### The 6 mechanical steps

1. **READ** — Open `src/App.tsx` to the exact line range. Note:
   - The component's props interface (often inline as `function X({a, b}: {a: string; b: number})`)
   - Any `import` statements at the top of App.tsx that this component uses
   - Any references to OTHER components defined in App.tsx (these stay as references until those components are also extracted)
2. **CREATE FILE** — Create the new file with this template:

```tsx
import React, { useState, useEffect, useMemo, useRef } from "react";
// ...only the imports this component actually uses
// Imports to resolve:
//   - "./data/..."     becomes "../data/..." (one level up)
//   - "./top-level"    becomes "../top-level"
//   - "./hooks/..."    becomes "../hooks/..."
//   - "./utils/..."    becomes "../utils/..."
//   - "./context/..."  becomes "../context/..."
//   - "./components/..." becomes "./..." (sibling) or "../components/..."
// If the new file is in src/components/<sub>/X.tsx, prefixes are "../../"

type XProps = {
  // inline prop type from the original function signature, hoisted to named type
};

export function X(props: XProps) {
  // exact body copied from App.tsx — no behavior changes
}
```

3. **REMOVE** — Delete the original function body from App.tsx (delete from the line that starts the section comment block above the function through the closing brace).
4. **IMPORT** — Add to App.tsx near the existing component imports:

```tsx
import { X } from "./components/.../X";
```

5. **VERIFY** — Run the gate:

```powershell
npm run build
npm run lint
```

Both must exit 0 with zero errors and zero warnings. Then manually smoke-test the specific screen (see per-task instructions). Then run:

```powershell
git diff --stat
```

Confirm: 1 new file added, only `src/App.tsx` modified, no other files changed.

6. **COMMIT** — Single atomic commit with the task-specific message.

### If gate fails

- Do **not** commit. Do **not** proceed to next task.
- Most common failure: missing import in the new file. Read the tsc error, add the missing import, re-run.
- Second most common: missed reference to a function/type that's still defined inside App.tsx. The new file needs to import it from App.tsx (rare — usually these are in `./top-level` or `./utils`).
- Nuclear option: `git restore src/App.tsx` and `Remove-Item src/components/.../X.tsx` to reset, then try again.

---

## Pre-flight: Verify Clean Baseline

### Task 0: Confirm starting state

**Files:**
- Read: `src/App.tsx`
- Run: `npm run build`, `npm run lint`

- [ ] **Step 1: Confirm clean git working tree**

Run: `git status`

Expected output:
```
On branch main
Your branch is up to date with 'origin/main'.

Untracked files:
  .claude/

nothing added to commit but untracked files present
```

If the working tree has uncommitted code changes, STOP and resolve them first.

- [ ] **Step 2: Confirm baseline build passes**

Run: `npm run build`

Expected: Exit code 0. tsc produces no errors. Vite build completes with output files in `dist/`.

If this fails, the codebase is not in a clean state — debug before extracting anything.

- [ ] **Step 3: Confirm baseline lint passes**

Run: `npm run lint`

Expected: Exit code 0, no warnings (project is configured with `--max-warnings 0`).

- [ ] **Step 4: Confirm baseline smoke test**

Run: `npm run dev`

Open browser to `http://localhost:5180`. Verify:
- Upload page renders
- Can drop or paste a sample CSV
- Click into a unit detail page
- Toggle dark mode
- No console errors

Kill the dev server when done.

---

## Task 1: Extract Diagnostics

**Files:**
- Create: `src/components/diagnostics/diagnostics-utils.ts` (from App.tsx lines 2704–2893)
- Create: `src/components/diagnostics/Diagnostics.tsx` (from App.tsx lines 2895–2923)
- Modify: `src/App.tsx`

**App.tsx source range:** 2699–2924 (includes the section banner comments)

**Smoke target:** Open the Diagnostics panel (typically a button on the upload page or accessible via dev shortcut) and verify the test results render with pass/fail indicators and counts.

- [ ] **Step 1: Read source range**

Read App.tsx lines 2699–2924. Identify:
- `analyzeUnitsData()` — uses `UNITS` from `./data/units`, `Unit` type
- `runDiagnostics()` — uses `SERVICE_LEVEL_DESC`, `ALL_LEVELS`, `LAB_LOCATIONS` from `./top-level`, plus utilities from `./top-level`
- `Diagnostics` component — uses `runDiagnostics()`, `analyzeUnitsData()`, and standard React

- [ ] **Step 2: Create diagnostics-utils.ts**

Create `src/components/diagnostics/diagnostics-utils.ts` containing exactly `analyzeUnitsData` (App.tsx 2704–2730) and `runDiagnostics` (App.tsx 2735–2893). Required imports:

```ts
import { UNITS } from "../../data/units";
import { LABS, supportsOnsiteCalibration, getLabCapabilitiesForUnit, getEligibleLabsForUnit } from "../../data/labs";
import type { Unit } from "../../top-level";
import {
  SERVICE_LEVEL_DESC,
  ALL_LEVELS,
  LAB_LOCATIONS,
  // ...add any other identifiers referenced inside these two functions, scan the body
} from "../../top-level";

export function analyzeUnitsData() { /* exact body from App.tsx */ }
export function runDiagnostics() { /* exact body from App.tsx */ }
```

Resolve all referenced identifiers by scanning the function bodies. The compiler will catch any missed import in Step 5.

- [ ] **Step 3: Create Diagnostics.tsx**

Create `src/components/diagnostics/Diagnostics.tsx`:

```tsx
import React from "react";
import { runDiagnostics, analyzeUnitsData } from "./diagnostics-utils";

type DiagnosticsProps = {
  // Copy the inline prop type from App.tsx function Diagnostics({...}: {...})
  // Likely includes darkMode: boolean and maybe onClose handler
};

export function Diagnostics(props: DiagnosticsProps) {
  /* exact body from App.tsx 2895–2923 */
}
```

- [ ] **Step 4: Remove from App.tsx**

Delete lines 2699–2924 from `src/App.tsx` (the section banner through the closing `}` of `Diagnostics`).

- [ ] **Step 5: Add import to App.tsx**

Near the existing component imports (around line 11–13 of App.tsx), add:

```tsx
import { Diagnostics } from "./components/diagnostics/Diagnostics";
```

If `runDiagnostics` or `analyzeUnitsData` are called directly from elsewhere in App.tsx (not just from the `Diagnostics` component), also add:

```tsx
import { runDiagnostics, analyzeUnitsData } from "./components/diagnostics/diagnostics-utils";
```

Grep App.tsx for `runDiagnostics(` and `analyzeUnitsData(` to confirm.

- [ ] **Step 6: Run gate**

```powershell
npm run build
npm run lint
```

Both must pass with exit 0.

- [ ] **Step 7: Manual smoke test**

```powershell
npm run dev
```

In the browser at `http://localhost:5180`:
- Open the Diagnostics panel (search for the trigger if unsure — likely a "Run Diagnostics" button or keyboard shortcut)
- Verify test results render with pass/fail rows
- Verify counts (total units, unique manufacturers, etc.) display
- No console errors

Kill the dev server.

- [ ] **Step 8: Verify diff scope**

Run: `git diff --stat`

Expected: 2 new files (`diagnostics-utils.ts`, `Diagnostics.tsx`), 1 modified (`src/App.tsx`). No other files touched.

- [ ] **Step 9: Commit**

```powershell
git add src/components/diagnostics/ src/App.tsx
git commit -m "Extract Diagnostics and diagnostics-utils from App.tsx"
```

---

## Task 2: Extract ServiceLevelMultiSelect

**Files:**
- Create: `src/components/ServiceLevelMultiSelect.tsx` (from App.tsx lines 1691–1859)
- Modify: `src/App.tsx`

**App.tsx source range:** 1687–1859 (includes the section banner)

**Smoke target:** Navigate to any unit detail page. Use the service-level multi-select control — verify checkboxes toggle correctly, selected levels apply, dark mode renders correctly.

- [ ] **Step 1: Read source range**

Read App.tsx lines 1687–1859. The component takes `selectedLevels`, `onSelectionChange`, `darkMode` (confirmed from spec investigation). It uses `ALL_LEVELS`, `SERVICE_LEVEL_DESC`, and `clsx` from `./top-level`.

- [ ] **Step 2: Create ServiceLevelMultiSelect.tsx**

Create `src/components/ServiceLevelMultiSelect.tsx`:

```tsx
import React, { useState, useEffect, useRef } from "react"; // only what's used
import { ALL_LEVELS, SERVICE_LEVEL_DESC, clsx } from "../top-level";
// scan the body for any other identifiers and add imports

type ServiceLevelMultiSelectProps = {
  selectedLevels: Set<number>;
  onSelectionChange: (levels: Set<number>) => void;
  darkMode: boolean;
};

export function ServiceLevelMultiSelect({ selectedLevels, onSelectionChange, darkMode }: ServiceLevelMultiSelectProps) {
  /* exact body from App.tsx 1691–1859 */
}
```

- [ ] **Step 3: Remove from App.tsx**

Delete lines 1687–1859 from `src/App.tsx`.

- [ ] **Step 4: Add import to App.tsx**

```tsx
import { ServiceLevelMultiSelect } from "./components/ServiceLevelMultiSelect";
```

- [ ] **Step 5: Run gate**

```powershell
npm run build
npm run lint
```

- [ ] **Step 6: Manual smoke test**

```powershell
npm run dev
```

- Click into any unit's detail view
- Open the service-level multi-select control
- Toggle a few levels on/off, confirm selection visual updates
- Toggle dark mode, confirm component renders correctly
- No console errors

- [ ] **Step 7: Verify diff and commit**

```powershell
git diff --stat
git add src/components/ServiceLevelMultiSelect.tsx src/App.tsx
git commit -m "Extract ServiceLevelMultiSelect from App.tsx"
```

---

## Task 3: Extract ManualSearchModal

**Files:**
- Create: `src/components/modals/ManualSearchModal.tsx` (from App.tsx lines 3538–3762)
- Modify: `src/App.tsx`

**App.tsx source range:** 3535–3763

**Smoke target:** Upload a CSV with rows that don't match any unit. From the unmatched-items section, trigger the manual search modal. Verify it opens, search filters results, selection works, modal closes properly.

**Note:** Before extracting, run a quick diff against the existing orphan to spot any divergent fixes:

```powershell
git show HEAD:src/top-level/modals/ManualSearchModal.tsx | code -d - src/top-level/modals/ManualSearchModal.tsx
```

(Or use any diff tool to compare orphan vs. what's in App.tsx lines 3538–3762.) The App.tsx version is canonical — but if the orphan has a fix worth preserving, note it as a follow-up TODO and proceed with App.tsx version.

- [ ] **Step 1: Read source range**

Read App.tsx lines 3535–3763. Identify props, imports needed, references.

- [ ] **Step 2: Create ManualSearchModal.tsx**

Create `src/components/modals/ManualSearchModal.tsx` with the standard template. Imports go up two levels:

```tsx
import React, { useState, useEffect } from "react"; // only what's used
import { UNITS } from "../../data/units";
import { searchUnits, clsx /* + others */ } from "../../top-level";
import type { Unit, CustomerItem, MatchResult } from "../../top-level";
// hooks if used: import { useDebounce } from "../../hooks/useDebounce";

type ManualSearchModalProps = {
  // hoist from App.tsx inline type
};

export function ManualSearchModal(props: ManualSearchModalProps) {
  /* body from App.tsx 3538–3762 */
}
```

- [ ] **Step 3: Remove from App.tsx**

Delete lines 3535–3763.

- [ ] **Step 4: Add import to App.tsx**

```tsx
import { ManualSearchModal } from "./components/modals/ManualSearchModal";
```

- [ ] **Step 5: Run gate**

```powershell
npm run build
npm run lint
```

- [ ] **Step 6: Manual smoke test**

```powershell
npm run dev
```

- Upload a CSV with at least one unmatched row (e.g., a fake part number)
- Scroll to unmatched items section
- Click "Search manually" (or equivalent trigger)
- Verify modal opens, search input works, results filter
- Select a unit; verify it propagates back
- Close modal via X and via Esc; both must work
- No console errors

- [ ] **Step 7: Verify diff and commit**

```powershell
git diff --stat
git add src/components/modals/ManualSearchModal.tsx src/App.tsx
git commit -m "Extract ManualSearchModal from App.tsx"
```

---

## Task 4: Extract UnmatchedItemsSection

**Files:**
- Create: `src/components/UnmatchedItemsSection.tsx` (from App.tsx lines 3767–3977)
- Modify: `src/App.tsx`

**App.tsx source range:** 3764–3978

**Smoke target:** Upload CSV with unmatched rows. Verify the unmatched items section renders, the "search manually" button works (delegates to `ManualSearchModal`, extracted in Task 3).

- [ ] **Step 1: Read source range**

Read App.tsx 3764–3978. Note: this component uses `ManualSearchModal` — which is now imported from `./components/modals/ManualSearchModal` in App.tsx. The extracted `UnmatchedItemsSection` will need to import it from `./modals/ManualSearchModal` (sibling).

- [ ] **Step 2: Create UnmatchedItemsSection.tsx**

```tsx
import React, { useState } from "react";
import { ManualSearchModal } from "./modals/ManualSearchModal";
import type { CustomerItem, MatchResult } from "../top-level";
import { clsx /* + others as needed */ } from "../top-level";

type UnmatchedItemsSectionProps = {
  // hoist
};

export function UnmatchedItemsSection(props: UnmatchedItemsSectionProps) {
  /* body from App.tsx 3767–3977 */
}
```

- [ ] **Step 3: Remove from App.tsx**

Delete lines 3764–3978.

- [ ] **Step 4: Add import to App.tsx**

```tsx
import { UnmatchedItemsSection } from "./components/UnmatchedItemsSection";
```

- [ ] **Step 5: Run gate**

```powershell
npm run build
npm run lint
```

- [ ] **Step 6: Manual smoke test**

- Upload CSV with unmatched rows
- Verify unmatched section renders with row count
- Trigger manual search from this section, verify modal flow works end-to-end
- No console errors

- [ ] **Step 7: Verify diff and commit**

```powershell
git diff --stat
git add src/components/UnmatchedItemsSection.tsx src/App.tsx
git commit -m "Extract UnmatchedItemsSection from App.tsx"
```

---

## Task 5: Extract QuoteSummaryDashboard

**Files:**
- Create: `src/components/QuoteSummaryDashboard.tsx` (from App.tsx lines 3982–4218)
- Modify: `src/App.tsx`

**App.tsx source range:** 3979–4219

**Smoke target:** Upload a CSV. Verify the quote summary dashboard renders: charts, totals, breakdowns by service level.

- [ ] **Step 1: Read source range**

Read App.tsx 3979–4219. Likely uses `DonutChart`, `HorizontalBarChart`, `money`, `calculateQuoteSummary` from `./top-level`.

- [ ] **Step 2: Create QuoteSummaryDashboard.tsx**

```tsx
import React from "react";
import {
  DonutChart,
  HorizontalBarChart,
  money,
  calculateQuoteSummary,
  // scan body for more
} from "../top-level";
import type { QuoteSummary, /* others */ } from "../top-level";

type QuoteSummaryDashboardProps = { /* hoist */ };

export function QuoteSummaryDashboard(props: QuoteSummaryDashboardProps) {
  /* body from App.tsx 3982–4218 */
}
```

- [ ] **Step 3: Remove from App.tsx**

Delete lines 3979–4219.

- [ ] **Step 4: Add import to App.tsx**

```tsx
import { QuoteSummaryDashboard } from "./components/QuoteSummaryDashboard";
```

- [ ] **Step 5: Run gate**

```powershell
npm run build
npm run lint
```

- [ ] **Step 6: Manual smoke test**

- Upload CSV
- Verify dashboard renders: donut chart, bar chart, totals
- Toggle dark mode, confirm chart colors update
- No console errors

- [ ] **Step 7: Verify diff and commit**

```powershell
git diff --stat
git add src/components/QuoteSummaryDashboard.tsx src/App.tsx
git commit -m "Extract QuoteSummaryDashboard from App.tsx"
```

---

## Task 6: Extract UnitDetailsModal

**Files:**
- Create: `src/components/modals/UnitDetailsModal.tsx` (from App.tsx lines 2928–3533)
- Modify: `src/App.tsx`

**App.tsx source range:** 2925–3534

**Smoke target:** Click a unit row to open the modal. Verify it shows lab capabilities table, service levels, pricing. ZIP-distance "Find Closest Lab" should still work (this is now-extracted `ServiceLevelMultiSelect` indirectly).

**Orphan diff check:** Diff against `src/top-level/modals/UnitDetailsModal.tsx` before extracting. Note that orphan is 819 lines while App.tsx version is ~605 — orphan is likely an older, larger draft. Confirm via diff; canonical is App.tsx.

- [ ] **Step 1: Read source range**

Read App.tsx 2925–3534. This is the largest extraction so far. Likely uses:
- `ServiceLevelMultiSelect` from `../components/ServiceLevelMultiSelect` (already extracted in Task 2)
- Many `./top-level` utilities: `clsx`, `money`, `getCapacityColor`, `calculateDistance`, `generatePricingRows`, etc.
- `./data/labs` and `./data/units` data
- `./business-logic/zip-distance` for distance features

- [ ] **Step 2: Create UnitDetailsModal.tsx**

```tsx
import React, { useState, useEffect, useMemo, useRef } from "react"; // pare down to what's used
import { ServiceLevelMultiSelect } from "../ServiceLevelMultiSelect";
import { LABS, supportsOnsiteCalibration, getLabCapabilitiesForUnit } from "../../data/labs";
import {
  clsx, money, /* many more */
} from "../../top-level";
import type { Unit, LabLocation } from "../../top-level";
import { getCoordsForPostalCode, isValidPostalFormat, sortLabsByDistance } from "../../business-logic/zip-distance";

type UnitDetailsModalProps = { /* hoist */ };

export function UnitDetailsModal(props: UnitDetailsModalProps) {
  /* body from App.tsx 2928–3533 */
}
```

- [ ] **Step 3: Remove from App.tsx**

Delete lines 2925–3534.

- [ ] **Step 4: Add import to App.tsx**

```tsx
import { UnitDetailsModal } from "./components/modals/UnitDetailsModal";
```

- [ ] **Step 5: Run gate**

```powershell
npm run build
npm run lint
```

- [ ] **Step 6: Manual smoke test (extended)**

- Upload CSV
- Click a unit row → modal opens
- Verify lab capabilities table sorts and displays
- Enter a ZIP code, sort labs by distance
- Toggle service levels via the multi-select
- Verify pricing recalculates
- Close modal
- Toggle dark mode, repeat
- No console errors

- [ ] **Step 7: Verify diff and commit**

```powershell
git diff --stat
git add src/components/modals/UnitDetailsModal.tsx src/App.tsx
git commit -m "Extract UnitDetailsModal from App.tsx"
```

---

## Task 7: Extract DetailView

**Files:**
- Create: `src/components/DetailView.tsx` (from App.tsx lines 1861–2697)
- Modify: `src/App.tsx`

**App.tsx source range:** 1860–2698

**Smoke target:** Navigate to a unit's detail page (full-screen view, not modal). Verify all sections render: header, capabilities, service-level selector, ZIP closest-lab flow, lab table sorted by distance.

- [ ] **Step 1: Read source range**

Read App.tsx 1860–2698. Uses `ServiceLevelMultiSelect` (extracted, Task 2), `UnitDetailsModal` (extracted, Task 6). Heavy use of `./top-level` utilities and `./business-logic/zip-distance`.

- [ ] **Step 2: Create DetailView.tsx**

```tsx
import React, { useState, useEffect, useMemo, useRef } from "react"; // pare
import { ServiceLevelMultiSelect } from "./ServiceLevelMultiSelect";
import { UnitDetailsModal } from "./modals/UnitDetailsModal";
import { LABS, /* helpers */ } from "../data/labs";
import { clsx, money, /* many */ } from "../top-level";
import type { Unit, LabLocation } from "../top-level";
import { getCoordsForPostalCode, isValidPostalFormat, sortLabsByDistance } from "../business-logic/zip-distance";

type DetailViewProps = { /* hoist */ };

export function DetailView(props: DetailViewProps) {
  /* body from App.tsx 1861–2697 */
}
```

- [ ] **Step 3: Remove from App.tsx**

Delete lines 1860–2698.

- [ ] **Step 4: Add import to App.tsx**

```tsx
import { DetailView } from "./components/DetailView";
```

- [ ] **Step 5: Run gate**

```powershell
npm run build
npm run lint
```

- [ ] **Step 6: Manual smoke test (extended)**

- Upload CSV
- Click into a unit's full detail page (not modal — the dedicated page route)
- Verify all sections render
- Use ZIP closest-lab feature: enter a US ZIP, then a Canadian FSA — both should sort labs
- Verify lab capabilities table shows inline distance
- Verify aria-live region announces sort changes (test with screen reader if available; otherwise inspect DOM for `aria-live` attribute)
- Toggle dark mode
- Open the unit details modal from this view, verify it still works (Task 6 sanity check)
- No console errors

- [ ] **Step 7: Verify diff and commit**

```powershell
git diff --stat
git add src/components/DetailView.tsx src/App.tsx
git commit -m "Extract DetailView from App.tsx"
```

---

## Task 8: Extract UploadPage

**Files:**
- Create: `src/components/upload/UploadPage.tsx` (from App.tsx lines 4223–6592)
- Modify: `src/App.tsx`

**App.tsx source range:** 4220–6593

**This is the largest extraction (~2,370 lines).** Allow 60–90 minutes. The component uses every other already-extracted component plus many internal helpers.

**Smoke target:** Full end-to-end upload flow: drop CSV → see parsed results → see matches/unmatched → see quote summary → drill into details → drill into unit detail page → export PDF.

**Orphan diff check:** Diff against `src/top-level/upload-page/UploadPage.tsx` (990 lines) before extracting. The orphan is much smaller — likely an older snapshot. App.tsx is canonical. If the orphan has any unique improvement, capture as a TODO comment in the new file.

- [ ] **Step 1: Read source range**

Read App.tsx 4220–6593. This component uses:
- `Diagnostics` (Task 1)
- `QuoteSummaryDashboard` (Task 5)
- `UnmatchedItemsSection` (Task 4)
- `UnitDetailsModal` (Task 6)
- `DetailView` (Task 7)
- Many utilities from `./top-level`, `./hooks/useLocalStorage`, `./utils/export`, `./utils/serialization`

Likely contains internal helper functions — leave them inside the new file unless duplicated elsewhere (in which case lift to `./components/upload/helpers.ts` only if duplication is confirmed).

- [ ] **Step 2: Create UploadPage.tsx**

Create `src/components/upload/UploadPage.tsx`. Paths from this location go up two levels:

```tsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { Diagnostics } from "../diagnostics/Diagnostics";
import { QuoteSummaryDashboard } from "../QuoteSummaryDashboard";
import { UnmatchedItemsSection } from "../UnmatchedItemsSection";
import { UnitDetailsModal } from "../modals/UnitDetailsModal";
import { DetailView } from "../DetailView";
import { UNITS } from "../../data/units";
import { LABS /* + others */ } from "../../data/labs";
import { /* many top-level utilities */ } from "../../top-level";
import type { /* types */ } from "../../top-level";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { useDebounce } from "../../hooks/useDebounce";
import { serializeCaps, serializePricing } from "../../utils/serialization";
import { buildServiceLevelText, exportServiceLevelText, exportAllUnitsData } from "../../utils/export";
import { useAppState } from "../../context/AppStateContext";
import { useSearch } from "../../context/SearchContext";
import { useLabSelection } from "../../context/LabSelectionContext";

type UploadPageProps = { /* hoist */ };

export function UploadPage(props: UploadPageProps) {
  /* body from App.tsx 4223–6592 */
}
```

- [ ] **Step 3: Remove from App.tsx**

Delete lines 4220–6593.

- [ ] **Step 4: Add import to App.tsx**

```tsx
import { UploadPage } from "./components/upload/UploadPage";
```

- [ ] **Step 5: Run gate**

```powershell
npm run build
npm run lint
```

Expect this to surface the most import issues — work through them one error at a time until clean.

- [ ] **Step 6: Manual smoke test (full)**

- Upload a known-good CSV with a mix of matched/unmatched rows
- Verify upload page renders all sections
- Open the Diagnostics panel — verify Task 1 still works
- Verify Quote Summary Dashboard renders
- Verify Unmatched Items Section renders
- Open a unit details modal — full check
- Navigate to a unit's full detail page — full check
- Export PDF — verify download succeeds and PDF renders correctly
- Toggle dark mode, repeat critical paths
- No console errors

- [ ] **Step 7: Verify diff and commit**

```powershell
git diff --stat
git add src/components/upload/UploadPage.tsx src/App.tsx
git commit -m "Extract UploadPage from App.tsx"
```

---

## Task 9: Extract AppContent

**Files:**
- Create: `src/components/upload/AppContent.tsx` (from App.tsx lines 175–1685)
- Modify: `src/App.tsx`

**App.tsx source range:** 175–1685

**This is the orchestrator** — it wraps `UploadPage` and provides routing/state coordination. After this extraction, `App.tsx` should be down to ~50 lines (just the providers and `<AppContent />`).

**Smoke target:** App launches at all. All providers wire up (`AppStateProvider`, `SearchProvider`, `LabSelectionProvider`). Navigation between upload page and detail view works.

- [ ] **Step 1: Read source range**

Read App.tsx 175–1685. This is the main `AppContent()` function. Uses:
- `UploadPage` (Task 8) — just extracted, must import from new location
- Context hooks: `useAppState`, `useSearch`, `useLabSelection` from `./context/...`
- All the same top-level utilities

- [ ] **Step 2: Create AppContent.tsx**

```tsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { UploadPage } from "./UploadPage";
import { useAppState } from "../../context/AppStateContext";
import { useSearch } from "../../context/SearchContext";
import { useLabSelection } from "../../context/LabSelectionContext";
import { /* utilities */ } from "../../top-level";
import type { /* types */ } from "../../top-level";

export function AppContent() {
  /* body from App.tsx 175–1685 */
}
```

(No props — `AppContent` typically takes no props since it's the root composition.)

- [ ] **Step 3: Remove from App.tsx**

Delete lines 175–1685. After this and Task 8's deletion, App.tsx should be tiny.

- [ ] **Step 4: Add import to App.tsx**

```tsx
import { AppContent } from "./components/upload/AppContent";
```

- [ ] **Step 5: Clean up App.tsx unused imports**

After both deletions, App.tsx will have many imports that are no longer used (all the utilities that were used inside `AppContent` and `UploadPage`). Run:

```powershell
npm run lint
```

ESLint with `--max-warnings 0` will fail on unused imports. Remove them one by one until lint passes. The final App.tsx should import only:
- React
- The three Provider components (`AppStateProvider`, `SearchProvider`, `LabSelectionProvider`)
- `AppContent`

- [ ] **Step 6: Run gate**

```powershell
npm run build
npm run lint
```

- [ ] **Step 7: Manual smoke test (full end-to-end)**

- Launch dev server, app loads with no errors
- Run the full happy path: upload CSV → review → drill into details → export PDF
- Toggle dark mode in multiple views
- Use ZIP closest-lab feature
- Trigger manual search modal
- Open Diagnostics panel
- No console errors anywhere

- [ ] **Step 8: Verify App.tsx is tiny**

Run: `wc -l src/App.tsx`

Expected: Under 60 lines. If it's larger, there's leftover code that didn't belong to a top-level component — investigate, then decide where it goes.

- [ ] **Step 9: Verify diff and commit**

```powershell
git diff --stat
git add src/components/upload/AppContent.tsx src/App.tsx
git commit -m "Extract AppContent from App.tsx (App.tsx now ~50 lines)"
```

---

## Task 10: Cleanup — Delete Orphans

**Files:**
- Delete: `src/top-level/modals/` (entire directory)
- Delete: `src/top-level/upload-page/` (entire directory)
- Modify: `src/top-level/index.ts` (remove barrel re-exports)

**Smoke target:** Same full end-to-end flow as Task 9 — confirm nothing depended on the orphans implicitly.

- [ ] **Step 1: Confirm orphans are truly orphaned**

```powershell
# Search for imports of the orphan paths anywhere in src/
Get-ChildItem -Recurse -Path src -Include *.ts,*.tsx | Select-String -Pattern "top-level/modals|top-level/upload-page"
```

Expected: Only `src/top-level/index.ts` shows up (the barrel that re-exports them). If any other file references them, STOP — investigate before deleting.

- [ ] **Step 2: Remove barrel re-exports**

Edit `src/top-level/index.ts`. Delete these two lines:

```ts
export * from "./modals";
export * from "./upload-page";
```

- [ ] **Step 3: Delete orphan directories**

```powershell
Remove-Item -Recurse -Force src/top-level/modals
Remove-Item -Recurse -Force src/top-level/upload-page
```

- [ ] **Step 4: Run gate**

```powershell
npm run build
npm run lint
```

If anything references the deleted exports, tsc will scream. Fix any reference or restore the orphans if a real consumer turns up.

- [ ] **Step 5: Manual smoke test (full)**

Same end-to-end pass as Task 9. Everything must still work.

- [ ] **Step 6: Verify diff and commit**

```powershell
git diff --stat
git add src/top-level/index.ts
git add -A src/top-level/modals src/top-level/upload-page
git commit -m "Remove orphaned top-level/modals and top-level/upload-page directories"
```

---

## Final Verification

### Task 11: Confirm end state

- [ ] **Step 1: App.tsx line count**

```powershell
(Get-Content src/App.tsx | Measure-Object -Line).Lines
```

Expected: Under 100 lines.

- [ ] **Step 2: Full build + lint**

```powershell
npm run build
npm run lint
```

Both must pass cleanly.

- [ ] **Step 3: Full smoke test**

End-to-end:
- Launch `npm run dev`
- Upload CSV
- Review matched + unmatched
- Open quote summary dashboard
- Drill into a unit modal
- Drill into a unit detail page
- Use ZIP closest-lab
- Use service-level multi-select
- Trigger manual search
- Open Diagnostics
- Export PDF
- Toggle dark mode in each view
- No console errors

- [ ] **Step 4: Verify git log**

```powershell
git log --oneline -12
```

Expected: 10 extraction/cleanup commits since the spec commit. Each is small, atomic, and reviewable.

- [ ] **Step 5: Push (optional, when ready)**

```powershell
git push origin main
```

(Only if user wants to push. Default is to wait for explicit user confirmation.)

---

## Notes for the Implementing Engineer

- **Don't batch.** Resist the urge to extract two components in one commit. The whole safety model depends on atomic commits.
- **Don't refactor while extracting.** If you notice something ugly (e.g., a hardcoded magic number, a duplicated calculation), note it as a `// TODO:` comment in the new file. Address it in a separate commit AFTER the extraction is verified.
- **Trust tsc.** If a build fails, the error message tells you exactly what's missing. Don't guess — read the error.
- **When in doubt about imports**, scan the function body for every uppercase identifier (likely a type or constant) and every lowercase identifier called as a function. Each one needs an import.
- **Inline helper functions** stay in the new file unless they're called from somewhere else still in App.tsx — in which case, leave them in App.tsx for now and only extract the component. We can hoist helpers in a follow-up cleanup pass.
- **Dark mode** is a prop in most components. Don't accidentally drop it from the prop type when hoisting to a named type.
- **If a smoke test reveals broken behavior**, the safest move is `git reset --hard HEAD` (only if you haven't committed the broken extraction yet — which you shouldn't have, because the gate should have caught it).
