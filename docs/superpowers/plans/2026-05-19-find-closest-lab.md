# Find Closest Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Find Closest Lab" button to the part-detail Lab Capabilities table that sorts labs by distance to a user-entered US zip or Canadian FSA, with distance shown inline next to each lab name.

**Architecture:** Two bundled JSON datasets (US zips + Canadian FSAs) feed a pure-function helper module (`zip-distance.ts`) that converts input → coords and produces a sorted-with-distance list. UI changes live in `App.tsx`'s DetailView code path: a button, an expandable panel, and a derived `sortedCaps` array consumed by the existing table.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind. Existing `calculateDistance` Haversine helper in `top-level/utils.ts` and `LAB_LOCATIONS` in `top-level/constants.ts`. No new runtime dependencies. The `zipcodes` npm package is used at build time only to generate the US dataset, then uninstalled.

**Verification approach:** No test framework exists in this codebase. Verification happens via the running Vite preview server: UI behavior checked with `preview_screenshot`/`preview_snapshot`, helper-function correctness checked with `preview_eval` running expressions against the live module.

**Spec:** [docs/superpowers/specs/2026-05-19-find-closest-lab-design.md](../specs/2026-05-19-find-closest-lab-design.md)

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `src/data/us-zip-coordinates.json` | Create | Static map of US 5-digit zip → `[lat, lng]` |
| `src/data/ca-fsa-coordinates.json` | Create | Static map of Canadian FSA (3 chars) → `[lat, lng]` |
| `scripts/build-postal-data.mjs` | Create | One-shot Node script to build the two JSON files. Not part of runtime bundle. |
| `src/business-logic/zip-distance.ts` | Create | Pure helpers: `getCoordsForPostalCode`, `sortLabsByDistance` |
| `src/App.tsx` | Modify | DetailView section — add state, button, panel, derived `sortedCaps` |
| `src/top-level/detail-view/DetailView.tsx` | Modify (conditional) | Mirror change ONLY if Task 3 confirms it is live code |

---

## Task 1: Build the postal-code datasets

**Files:**
- Create: `scripts/build-postal-data.mjs`
- Create: `src/data/us-zip-coordinates.json`
- Create: `src/data/ca-fsa-coordinates.json`

- [ ] **Step 1: Install the `zipcodes` package as a temporary dev dep**

Run from repo root:
```powershell
npm install --save-dev zipcodes
```

Expected: `added 1 package` message, no errors.

- [ ] **Step 2: Create `scripts/build-postal-data.mjs`**

```js
// One-shot generator for postal-code datasets.
// Produces src/data/us-zip-coordinates.json and src/data/ca-fsa-coordinates.json.
// After running successfully, the `zipcodes` dev dep can be removed.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import zipcodes from "zipcodes";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../src/data");
mkdirSync(DATA_DIR, { recursive: true });

// ---------- US zips ----------
// The zipcodes package ships a record of all US zips. Iterate 00501..99999.
const usMap = {};
for (let z = 501; z <= 99999; z++) {
  const padded = String(z).padStart(5, "0");
  const info = zipcodes.lookup(padded);
  if (info && typeof info.latitude === "number" && typeof info.longitude === "number") {
    usMap[padded] = [
      Math.round(info.latitude * 10000) / 10000,
      Math.round(info.longitude * 10000) / 10000,
    ];
  }
}
writeFileSync(resolve(DATA_DIR, "us-zip-coordinates.json"), JSON.stringify(usMap));
console.log(`US zips written: ${Object.keys(usMap).length}`);

// ---------- Canadian FSAs ----------
// Hand-curated FSA centroids covering all 18 Canadian FSA prefixes (A-Y, no D/F/I/O/Q/U/W/Z).
// Within each region, representative FSAs are included. This is sufficient for
// POC-grade "closest lab" sorting since cross-country distances dominate intra-region differences.
const caMap = {
  // Newfoundland (A)
  "A1A": [47.5615, -52.7126], "A1B": [47.5708, -52.6817], "A1C": [47.5635, -52.7022],
  "A2A": [48.9500, -54.6167], "A2B": [49.0167, -55.6500], "A2H": [48.9495, -57.9501],
  // Nova Scotia (B)
  "B1P": [46.1351, -60.1831], "B2N": [45.3700, -63.2647], "B3H": [44.6364, -63.5917],
  "B3J": [44.6488, -63.5752], "B3K": [44.6633, -63.5963], "B3L": [44.6488, -63.6256],
  "B4N": [45.0700, -64.4900], "B4V": [44.3833, -65.1167],
  // Prince Edward Island (C)
  "C1A": [46.2382, -63.1311], "C1B": [46.2500, -63.1230],
  // New Brunswick (E)
  "E1C": [46.0878, -64.7782], "E2L": [45.2733, -66.0633], "E3B": [45.9636, -66.6431],
  // Quebec (G, H, J)
  "G1K": [46.8139, -71.2080], "G1R": [46.8123, -71.2145], "G2B": [46.8500, -71.3000],
  "G7H": [48.4283, -71.0683], "G9A": [46.3500, -72.5500],
  "H1A": [45.6500, -73.5167], "H2X": [45.5117, -73.5731], "H2Y": [45.5081, -73.5550],
  "H3A": [45.5048, -73.5772], "H3B": [45.5017, -73.5673], "H3C": [45.4972, -73.5658],
  "H3H": [45.4900, -73.5856], "H4B": [45.4717, -73.6256], "H7N": [45.5667, -73.7000],
  "J4B": [45.4500, -73.4667], "J7Y": [45.7000, -74.0000],
  // Ontario (K, L, M, N, P)
  "K1A": [45.4215, -75.6972], "K1P": [45.4215, -75.6972], "K2P": [45.4112, -75.6906],
  "K7L": [44.2312, -76.4860], "K9H": [44.3000, -78.3167],
  "L1H": [43.8971, -78.8658], "L4W": [43.6200, -79.6500], "L5B": [43.5890, -79.6441],
  "L6T": [43.7315, -79.7624], "L8E": [43.2557, -79.8711], "L9C": [43.2557, -79.8711],
  "M2N": [43.7615, -79.4111], "M4B": [43.6890, -79.3060], "M4C": [43.6890, -79.3000],
  "M4Y": [43.6657, -79.3804], "M5A": [43.6555, -79.3596], "M5B": [43.6555, -79.3795],
  "M5G": [43.6595, -79.3855], "M5H": [43.6510, -79.3830], "M5J": [43.6447, -79.3812],
  "M5K": [43.6481, -79.3812], "M5V": [43.6447, -79.3956], "M6J": [43.6463, -79.4180],
  "M9W": [43.7100, -79.5800], "N2L": [43.4643, -80.5204], "N6A": [42.9849, -81.2453],
  "P3E": [46.4917, -80.9930], "P7B": [48.3809, -89.2477],
  // Manitoba (R)
  "R2C": [49.9000, -97.0500], "R3C": [49.8951, -97.1384], "R3M": [49.8800, -97.1800],
  // Saskatchewan (S)
  "S4P": [50.4452, -104.6189], "S7K": [52.1332, -106.6700],
  // Alberta (T)
  "T2P": [51.0447, -114.0719], "T5J": [53.5444, -113.4909], "T6E": [53.5167, -113.4833],
  "T1K": [49.6956, -112.8417],
  // British Columbia (V)
  "V5K": [49.2827, -123.0445], "V6B": [49.2827, -123.1207], "V6C": [49.2880, -123.1132],
  "V6E": [49.2865, -123.1280], "V6Z": [49.2811, -123.1198], "V8W": [48.4284, -123.3656],
  "V9A": [48.4284, -123.3656],
  // Yukon (Y)
  "Y1A": [60.7212, -135.0568],
};
writeFileSync(resolve(DATA_DIR, "ca-fsa-coordinates.json"), JSON.stringify(caMap));
console.log(`CA FSAs written: ${Object.keys(caMap).length}`);
```

- [ ] **Step 3: Run the generator**

```powershell
node scripts/build-postal-data.mjs
```

Expected output (approximate):
```
US zips written: 41000
CA FSAs written: 73
```

- [ ] **Step 4: Spot-check the files exist and look right**

Run:
```powershell
Get-Item src/data/us-zip-coordinates.json | Select-Object Length
Get-Item src/data/ca-fsa-coordinates.json | Select-Object Length
```

Expected: US file is ~1–2 MB. CA file is ~3 KB.

Run:
```powershell
(Get-Content src/data/us-zip-coordinates.json -Raw | ConvertFrom-Json)."14624"
```

Expected: `43.1566 -77.6088` (lat lng of Rochester). Note: actual values may differ by ±0.01 due to dataset source — that's fine.

- [ ] **Step 5: Remove the `zipcodes` dev dep (no longer needed at runtime or build)**

```powershell
npm uninstall zipcodes
```

Expected: `removed 1 package`.

- [ ] **Step 6: Commit**

```powershell
git add scripts/build-postal-data.mjs src/data/us-zip-coordinates.json src/data/ca-fsa-coordinates.json package.json package-lock.json
git commit -m "Add US zip and Canadian FSA coordinate datasets"
```

---

## Task 2: Implement the `zip-distance` helper module

**Files:**
- Create: `src/business-logic/zip-distance.ts`

- [ ] **Step 1: Create the helper module**

```ts
import usZipsRaw from "../data/us-zip-coordinates.json";
import caFsasRaw from "../data/ca-fsa-coordinates.json";
import { LAB_LOCATIONS, calculateDistance } from "../top-level";
import type { LabLocation } from "../top-level";

// JSON is { "14624": [lat, lng], ... }
const US_ZIPS = usZipsRaw as Record<string, [number, number]>;
const CA_FSAS = caFsasRaw as Record<string, [number, number]>;

const US_ZIP_RE = /^\d{5}$/;
const CA_FSA_RE = /^[A-Z]\d[A-Z]/;

/**
 * Resolves a user-entered postal code to [lat, lng].
 * Accepts US 5-digit zips ("14624") and Canadian postal codes ("M5H 2N2" or "M5H2N2").
 * For Canadian codes, only the FSA (first 3 chars) is used.
 * Returns null if the format is unrecognized OR the code is not in the dataset.
 */
export function getCoordsForPostalCode(input: string): [number, number] | null {
  const normalized = input.trim().toUpperCase().replace(/\s+/g, "");
  if (!normalized) return null;

  if (US_ZIP_RE.test(normalized)) {
    return US_ZIPS[normalized] ?? null;
  }

  const fsaMatch = normalized.match(CA_FSA_RE);
  if (fsaMatch) {
    return CA_FSAS[fsaMatch[0]] ?? null;
  }

  return null;
}

/**
 * Quick predicate: does the input look like a syntactically valid US or CA code
 * (regardless of whether it's in our dataset)?
 */
export function isValidPostalFormat(input: string): boolean {
  const normalized = input.trim().toUpperCase().replace(/\s+/g, "");
  return US_ZIP_RE.test(normalized) || CA_FSA_RE.test(normalized);
}

export type WithDistance<T> = T & { distanceMi: number };

/**
 * Returns a NEW array of caps sorted ascending by distance to userCoords.
 * Each element gets a `distanceMi` field (rounded to whole miles).
 * Caps whose labName is not found in LAB_LOCATIONS are placed at the end with distanceMi = Infinity.
 */
export function sortLabsByDistance<T extends { labName: string }>(
  caps: T[],
  userCoords: [number, number]
): WithDistance<T>[] {
  const [userLat, userLng] = userCoords;

  const withDistance: WithDistance<T>[] = caps.map((c) => {
    const loc = LAB_LOCATIONS.find((l: LabLocation) => l.name === c.labName);
    const distance = loc
      ? Math.round(calculateDistance(userLat, userLng, loc.lat, loc.lng))
      : Infinity;
    return { ...c, distanceMi: distance };
  });

  withDistance.sort((a, b) => a.distanceMi - b.distanceMi);
  return withDistance;
}
```

- [ ] **Step 2: Verify the module type-checks**

Run:
```powershell
npx tsc --noEmit
```

Expected: no errors NEW to this file (there may be pre-existing TS6133 unused-variable warnings — those are unrelated).

If a "Cannot find module '../data/us-zip-coordinates.json'" error appears, ensure `tsconfig.json` has `"resolveJsonModule": true`. If not, add it. Check tsconfig before assuming:

```powershell
Get-Content tsconfig.json | Select-String "resolveJsonModule"
```

- [ ] **Step 3: Verify functions work via the running preview**

Ensure the dev server is running (`preview_start name=dev` if not). Then run:

```
preview_eval expression: import('/src/business-logic/zip-distance.ts').then(m => ({
  rochester: m.getCoordsForPostalCode("14624"),
  toronto: m.getCoordsForPostalCode("M5H 2N2"),
  invalid: m.getCoordsForPostalCode("abcde"),
  unknown: m.getCoordsForPostalCode("00000"),
  validFormatBadValue: m.isValidPostalFormat("00000"),
  validFormatGood: m.isValidPostalFormat("M5H 2N2"),
  invalidFormat: m.isValidPostalFormat("xyz"),
}))
```

Expected result shape:
```json
{
  "rochester": [43.1566, -77.6088],   // ±0.01 OK
  "toronto":   [43.6510, -79.3830],
  "invalid":   null,
  "unknown":   null,
  "validFormatBadValue": true,
  "validFormatGood":     true,
  "invalidFormat":       false
}
```

- [ ] **Step 4: Verify `sortLabsByDistance` works via preview**

```
preview_eval expression: import('/src/business-logic/zip-distance.ts').then(m => {
  const fakeCaps = [
    { labName: "Houston Lab" },
    { labName: "Rochester Lab" },
    { labName: "Toronto Lab" },
  ];
  // Rochester zip: 14624 → [43.1566, -77.6088]
  return m.sortLabsByDistance(fakeCaps, [43.1566, -77.6088]);
})
```

Expected: Rochester first (distanceMi: 0), then Toronto (~190 mi), then Houston (~1500+ mi). Order matters more than exact distances.

- [ ] **Step 5: Commit**

```powershell
git add src/business-logic/zip-distance.ts
git commit -m "Add zip-distance helper for postal code lookup and lab sorting"
```

---

## Task 3: Confirm which DetailView code path is live

**Files:**
- Read-only: `src/App.tsx`, `src/top-level/detail-view/DetailView.tsx`

Two near-identical "Lab Capabilities" blocks exist. Past changes (Onsite Capable badge removal, Recommendation column removal) only took visual effect when made in `App.tsx`, suggesting `DetailView.tsx` is dead code. This task confirms before changing only one.

- [ ] **Step 1: Add a sentinel string in DetailView.tsx**

In `src/top-level/detail-view/DetailView.tsx`, find the line containing `Lab Capabilities` and change it to `Lab Capabilities (DetailView.tsx)` temporarily.

Find the line (it should be around line 547):
```tsx
              Lab Capabilities
```

Change to:
```tsx
              Lab Capabilities (DetailView.tsx)
```

- [ ] **Step 2: Check the live page**

Take a screenshot of the Details tab in the running preview (`preview_screenshot`). Look at the "Lab Capabilities" heading.

- If the heading reads `Lab Capabilities (DetailView.tsx)` → `DetailView.tsx` IS LIVE. Remember this.
- If the heading still reads `Lab Capabilities` → `DetailView.tsx` is DEAD CODE. Remember this.

- [ ] **Step 3: Revert the sentinel**

Revert the change in `DetailView.tsx` back to:
```tsx
              Lab Capabilities
```

- [ ] **Step 4: Do NOT commit**

This was a temporary diagnostic. No commit. Move to Task 4 with the knowledge of which file(s) to touch.

**Resulting rule for Tasks 4–7:**
- If `App.tsx` is live AND `DetailView.tsx` is dead → modify `App.tsx` only.
- If `DetailView.tsx` is live → make every UI change in BOTH `App.tsx` and `DetailView.tsx` (the implementations should stay in sync).

---

## Task 4: Add state and the trigger button

**Files:**
- Modify: `src/App.tsx` (inside the DetailView component / section, near the Lab Capabilities heading ~line 2100)
- Modify: `src/top-level/detail-view/DetailView.tsx` ONLY IF Task 3 marked it live

- [ ] **Step 1: Locate the DetailView function/component in App.tsx**

Find the `DetailView` function definition. Use Grep:
```
grep -n "function DetailView\|const DetailView" src/App.tsx
```

Note its starting line. You'll add state hooks near the top of its body.

- [ ] **Step 2: Add the new state hooks**

Inside the DetailView component body, after the existing `useState` calls (the existing pattern is `const [expandedLabs, setExpandedLabs] = useState(...)` — add yours nearby), insert:

```tsx
const [zipPanelOpen, setZipPanelOpen] = useState<boolean>(false);
const [zipInput, setZipInput] = useState<string>("");
const [activeSort, setActiveSort] = useState<{
  coords: [number, number];
  label: string;
} | null>(null);
const [zipError, setZipError] = useState<string | null>(null);
```

- [ ] **Step 3: Add the import for the helper module**

Near the top of App.tsx, with the other `business-logic` imports, add:

```tsx
import {
  getCoordsForPostalCode,
  isValidPostalFormat,
  sortLabsByDistance,
} from "./business-logic/zip-distance";
```

- [ ] **Step 4: Add the trigger button**

Find the Lab Capabilities heading block. After our earlier cleanup it looks like:
```tsx
<div className="flex items-center justify-between mb-4">
  <div className="flex items-center gap-2">
    <span className="text-lg">🏭</span>
    <h3
      className={`text-lg font-semibold ${
        darkMode ? "text-white" : "text-gray-900"
      }`}
    >
      Lab Capabilities
    </h3>
  </div>
</div>
```

Add a button as the second child of the outer flex container (right side):
```tsx
<div className="flex items-center justify-between mb-4">
  <div className="flex items-center gap-2">
    <span className="text-lg">🏭</span>
    <h3
      className={`text-lg font-semibold ${
        darkMode ? "text-white" : "text-gray-900"
      }`}
    >
      Lab Capabilities
    </h3>
  </div>
  <button
    type="button"
    onClick={() => setZipPanelOpen((open) => !open)}
    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 active:scale-95 ${
      activeSort
        ? "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
    }`}
  >
    📍 {activeSort ? `Sorted by zip ${activeSort.label}` : "Find Closest Lab"}
  </button>
</div>
```

- [ ] **Step 5: Verify in preview**

Take a screenshot. The button should appear to the right of the "Lab Capabilities" heading. Clicking it should do nothing visible yet (panel UI comes in Task 5).

Expected: `📍 Find Closest Lab` button visible, no errors in console.

- [ ] **Step 6: If Task 3 found DetailView.tsx live, mirror Steps 2–4 in that file**

Apply the same imports, state, and button addition to `src/top-level/detail-view/DetailView.tsx`. The Lab Capabilities heading there is at ~line 547. Use the same code blocks.

- [ ] **Step 7: Commit**

```powershell
git add src/App.tsx
# Also add src/top-level/detail-view/DetailView.tsx if you modified it
git commit -m "Add Find Closest Lab button and state to DetailView"
```

---

## Task 5: Add the expandable panel UI (input + Sort + Clear + error)

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/top-level/detail-view/DetailView.tsx` ONLY IF Task 3 marked it live

- [ ] **Step 1: Add the handlers**

Inside the DetailView component body, near the other handler functions, add:

```tsx
const handleZipSort = () => {
  const trimmed = zipInput.trim();
  if (!trimmed) {
    setZipError(null);
    return;
  }
  if (!isValidPostalFormat(trimmed)) {
    setZipError("Enter a 5-digit US zip or Canadian postal code (e.g., M5H 2N2)");
    return;
  }
  const coords = getCoordsForPostalCode(trimmed);
  if (!coords) {
    setZipError("Postal code not recognized");
    return;
  }
  setZipError(null);
  setActiveSort({ coords, label: trimmed.toUpperCase() });
};

const handleZipClear = () => {
  setActiveSort(null);
  setZipError(null);
};

const handleZipInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setZipInput(e.target.value);
  if (zipError) setZipError(null);
};

const handleZipKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleZipSort();
  }
};
```

- [ ] **Step 2: Add the panel JSX immediately below the heading row**

Insert this AFTER the closing `</div>` of the heading block (the one that contains the trigger button) and BEFORE the `<div className="overflow-auto border ...">` table wrapper:

```tsx
{zipPanelOpen && (
  <div
    className={`mb-4 p-3 rounded-lg border ${
      darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"
    }`}
  >
    <div className="flex items-center gap-2 flex-wrap">
      <input
        type="text"
        value={zipInput}
        onChange={handleZipInputChange}
        onKeyDown={handleZipKeyDown}
        placeholder="e.g. 14624 or M5H 2N2"
        maxLength={7}
        className={`px-3 py-2 text-sm rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-300 ${
          darkMode
            ? "bg-gray-900 border-gray-600 text-white"
            : "bg-white border-gray-300 text-gray-900"
        }`}
      />
      <button
        type="button"
        onClick={handleZipSort}
        className="px-3 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
      >
        Sort by Distance
      </button>
      {activeSort && (
        <button
          type="button"
          onClick={handleZipClear}
          className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
            darkMode
              ? "border-gray-600 text-gray-300 hover:bg-gray-700"
              : "border-gray-300 text-gray-700 hover:bg-gray-100"
          }`}
        >
          Clear
        </button>
      )}
    </div>
    {zipError && (
      <p className="mt-2 text-xs text-red-600">{zipError}</p>
    )}
  </div>
)}
```

- [ ] **Step 3: Verify panel toggles in preview**

Take a screenshot before clicking the button → no panel.
Click `📍 Find Closest Lab` in the preview (`preview_click` on the button) → screenshot → panel visible with input + Sort button.
Click again → panel hidden.

- [ ] **Step 4: Verify error states in preview**

In the preview, with the panel open:
1. Type `xyz` → click Sort → error "Enter a 5-digit US zip or Canadian postal code (e.g., M5H 2N2)" should appear in red below the input.
2. Clear input, type `00000` → click Sort → error "Postal code not recognized".
3. Edit input (type any character) → error should disappear.

- [ ] **Step 5: Verify Enter key submits**

Type `14624` and press Enter. The error (if any) should clear. (The actual reordering is wired in Task 6.) For now: confirm no JS error in console.

- [ ] **Step 6: If DetailView.tsx is live, mirror Steps 1–2 there**

- [ ] **Step 7: Commit**

```powershell
git add src/App.tsx
# Also add src/top-level/detail-view/DetailView.tsx if applicable
git commit -m "Add zip-input panel with Sort/Clear and inline error validation"
```

---

## Task 6: Wire sorted caps into the table and show inline distance

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/top-level/detail-view/DetailView.tsx` ONLY IF Task 3 marked it live

- [ ] **Step 1: Compute `sortedCaps` derived value**

Find where `caps` is used in the JSX (`{caps.map((c, i) => { ... })}` in the table body, around the line tracked in Step 3 below). Just BEFORE that JSX (e.g., still inside the component but above the `return`), add:

```tsx
const sortedCaps = activeSort
  ? sortLabsByDistance(caps, activeSort.coords)
  : caps.map((c) => ({ ...c, distanceMi: null as number | null }));
```

Note: `sortLabsByDistance` returns rounded `distanceMi: number`; the no-sort branch uses `null`. Both branches share the field name so the JSX below can read `c.distanceMi` uniformly.

- [ ] **Step 2: Change the table body to iterate over `sortedCaps`**

Find:
```tsx
{caps.map((c, i) => {
```

Change to:
```tsx
{sortedCaps.map((c, i) => {
```

- [ ] **Step 3: Update the Lab name cell to show inline distance**

Find the lab-name cell (was: `<td className="py-2 px-3 whitespace-nowrap font-medium">{c.labName}</td>`):

```tsx
<td className="py-2 px-3 whitespace-nowrap font-medium">
  {c.labName}
</td>
```

Change to:
```tsx
<td className="py-2 px-3 whitespace-nowrap font-medium">
  {c.labName}
  {c.distanceMi != null && c.distanceMi !== Infinity && (
    <span className="ml-1 text-xs text-gray-500 font-normal">
      ({c.distanceMi} mi)
    </span>
  )}
</td>
```

- [ ] **Step 4: Full UI verification in preview**

In the running preview:

**4a. US zip sort**
- Open the Details page (search any part number, click into details).
- Click `📍 Find Closest Lab` → type `14624` → click Sort by Distance.
- Expected: table reorders, Rochester Lab is first with `(0 mi)` next to its name. Other US labs are in ascending distance order.

**4b. Canadian postal code sort**
- Clear input, type `M5H 2N2` → Sort.
- Expected: Toronto Lab first with `(0 mi)`. Other labs by ascending distance.

**4c. Invalid input**
- Type `xyz` → Sort. Error appears. Table order is unchanged from previous sort.

**4d. Unknown zip**
- Type `00000` → Sort. Error "Postal code not recognized". Order unchanged.

**4e. Clear**
- Click Clear button. Table returns to original order. Distance suffix disappears. Button label reverts to `📍 Find Closest Lab`.

**4f. Active button label**
- After a successful sort, the trigger button reads `📍 Sorted by zip 14624` (or whatever was entered). When panel is collapsed and then reopened, the input keeps its value.

**4g. Expand/collapse persistence**
- Sort the table. Click the ▶ on a lab to expand its standards. Re-sort with a different zip. Confirm the previously-expanded lab is still expanded (matched by labCode).

**4h. No regressions**
- All other DetailView features still work: filter dropdowns, service level selector, the "labs match your criteria" count, etc.

- [ ] **Step 5: If DetailView.tsx is live, mirror Steps 1–3 there**

- [ ] **Step 6: Commit**

```powershell
git add src/App.tsx
# Also add src/top-level/detail-view/DetailView.tsx if applicable
git commit -m "Sort lab table by distance and show inline distance label"
```

---

## Task 7: Final acceptance pass

**Files:** None (verification only)

- [ ] **Step 1: Run TypeScript compiler**

```powershell
npx tsc --noEmit
```

Expected: no NEW errors related to the feature files. Pre-existing TS6133 warnings in other files are unrelated and acceptable.

- [ ] **Step 2: Walk through every acceptance criterion from the spec**

For each of the 10 criteria in [docs/superpowers/specs/2026-05-19-find-closest-lab-design.md](../specs/2026-05-19-find-closest-lab-design.md) under "Acceptance Criteria", verify in the running preview:

| # | Criterion | Pass/Fail |
|---|---|---|
| 1 | Button labeled `📍 Find Closest Lab` is visible next to Lab Capabilities heading | |
| 2 | Clicking it expands a panel with input + Sort button | |
| 3 | Entering `14624` → Rochester Lab first, all labs in ascending distance | |
| 4 | Entering `M5H 2N2` → Toronto Lab first | |
| 5 | Distance ` (N mi)` suffix appears on lab names when sort is active | |
| 6 | `00000` → "Postal code not recognized" inline | |
| 7 | `abc` → "Enter a 5-digit US zip or Canadian postal code (e.g., M5H 2N2)" inline | |
| 8 | Clear restores original order and removes distance suffix | |
| 9 | Expand state of individual labs persists through sort changes | |
| 10 | No regressions to other DetailView features | |

If any fail, stop and fix before final commit.

- [ ] **Step 3: Final commit (only if any cleanup edits were made in Step 2)**

```powershell
git status
# If clean, no commit needed.
# If anything was changed:
git add <files>
git commit -m "Final fixes from acceptance pass"
```

- [ ] **Step 4: Done. Report to user.**

Summarize: feature implemented, all acceptance criteria pass, screenshots if helpful. Mention whether DetailView.tsx was live (and therefore changed) or dead (and therefore skipped — possibly worth flagging as future cleanup).
