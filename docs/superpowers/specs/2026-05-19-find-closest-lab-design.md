# Find Closest Lab — Design Spec

**Date:** 2026-05-19
**Status:** Approved, pending implementation plan
**Scope:** Part Number Detail page — Lab Capabilities section

## Summary

Add a "Find Closest Lab" feature to the Lab Capabilities table on part-number detail pages. The user enters a US zip code or Canadian postal code, and the lab list reorders closest → furthest, with distance shown inline next to each lab name.

## Motivation

The Lab Capabilities table currently shows eligible labs in a default order that doesn't reflect proximity to the customer site. For sales reps quoting a job, picking a lab close to the customer (lower shipping cost, faster turnaround) is a frequent question. Today they have to eyeball lab names against mental geography. This feature makes the proximity ranking explicit and self-serve.

## User Flow

1. User is on a part detail page, viewing the "Lab Capabilities" table
2. User clicks a **📍 Find Closest Lab** button next to the section heading
3. An inline panel expands below the heading with a zip/postal code input and a **Sort by Distance** button
4. User types a code (e.g., `14624` or `M5H 2N2`) and clicks Sort
5. The table reorders closest → furthest; each lab name now reads `Rochester Lab (12 mi)`, etc.
6. A **Clear** button is now visible; clicking it restores default order. Collapsing the panel does NOT clear the sort — the button label updates to `📍 Sorted by zip 14624` to make the active state visible.

## UI Details

### Trigger button

- Placement: right side of the "🏭 Lab Capabilities" heading row
- Style: matches the existing utility-button pattern in the section (compact, rounded, neutral background)
- Label: `📍 Find Closest Lab` (or `📍 Sorted by zip 14624` when active, to reinforce state)

### Expanded panel

- Appears as a thin bar directly under the heading, above the table
- Contents (left to right):
  - Text input with placeholder `e.g. 14624 or M5H 2N2`, `maxLength=7`
  - Primary button: **Sort by Distance**
  - Secondary button: **Clear** (only visible when a sort is active)
- Below the input, when validation fails: red inline text (no toast, no modal)
- Submitting via Enter key is equivalent to clicking Sort

### Sorted-table display

- The "Lab" column cell becomes `{labName} ({distance} mi)` when sort is active
- Distance is rounded to the nearest whole mile
- Default sort: ascending by distance
- All other columns (Accredited, Standards, Stock TT, Recal TT, Repair TT) are unchanged
- Expanded-row state (`expandedLabs`) survives reordering — it's keyed by `labCode`

## Data Layer

### Static datasets

Two bundled JSON files in `src/data/`:

**`src/data/us-zip-coordinates.json`** (~40k entries, ~1 MB)
```
{ "14624": [43.1566, -77.6088], "97201": [45.5152, -122.6784], ... }
```
Source: public US zip → lat/lng dataset (e.g., GeoNames postal codes US extract).

**`src/data/ca-fsa-coordinates.json`** (~1.6k entries, ~50 KB)
```
{ "M5H": [43.6510, -79.3830], "H3A": [45.5048, -73.5772], ... }
```
Source: Canadian FSA (Forward Sortation Area = first 3 characters of postal code) → centroid lat/lng. Granularity is neighborhood-level (~1–5 km), which is more than sufficient given inter-lab distances of hundreds of miles.

### Helper module

**`src/business-logic/zip-distance.ts`** exposes:

- `getCoordsForPostalCode(input: string): [number, number] | null`
  - Normalizes input (uppercase, strips whitespace)
  - Detects format via regex:
    - US: `/^\d{5}$/`
    - Canadian FSA: extract first 3 chars matching `/^[A-Z]\d[A-Z]/i`
  - Returns coordinates from the matching dataset, or `null` if not found / unrecognized format
- `sortLabsByDistance<T extends { labName: string; labCode: string }>(caps: T[], userCoords: [number, number]): Array<T & { distanceMi: number }>`
  - Looks up each lab's coordinates from existing `LAB_LOCATIONS` in `src/top-level/constants.ts`
  - Uses existing `calculateDistance` Haversine helper from `src/top-level/utils.ts`
  - Returns a new array sorted ascending by distance, with `distanceMi` attached to each element
  - Labs with no location data in `LAB_LOCATIONS` are placed at the end with `distanceMi: Infinity`

## Component & State Changes

### Target file

The active "Lab Capabilities" rendering is in `src/App.tsx` (around line 2100), inside the DetailView code path. A near-identical block also exists in `src/top-level/detail-view/DetailView.tsx`, which appears to be dead code (recent UI changes only took effect when App.tsx was edited). Implementation will confirm and mirror the change to DetailView.tsx if it turns out to be live; otherwise the duplicate can be removed in a separate cleanup pass (out of scope for this spec).

### New state (local to DetailView section)

```ts
const [zipPanelOpen, setZipPanelOpen] = useState(false);
const [zipInput, setZipInput] = useState("");
const [activeSort, setActiveSort] = useState<{
  coords: [number, number];
  label: string; // for the "Sorted by zip X" button label
} | null>(null);
const [zipError, setZipError] = useState<string | null>(null);
```

### Derived data

```ts
const sortedCaps = activeSort
  ? sortLabsByDistance(caps, activeSort.coords)
  : caps.map(c => ({ ...c, distanceMi: null as number | null }));
```

The table maps over `sortedCaps` instead of `caps`. The Lab cell renders `{labName}{distanceMi != null ? ` (${distanceMi} mi)` : ""}`.

### Handlers

- `handleSort()` — called by button click and Enter key
  - Validates input, sets `zipError` if invalid
  - On success: sets `activeSort`, clears `zipError`
- `handleClear()` — resets `activeSort` and `zipError`, keeps panel open and `zipInput` intact
- `handleInputChange()` — updates `zipInput`, clears `zipError` on edit

## Validation & Error Handling

Validation occurs only when the user clicks Sort (not while typing — avoids annoying premature errors).

| Input state | Error message |
|---|---|
| Empty | (no error; button does nothing) |
| Not matching US 5-digit or Canadian FSA pattern | `Enter a 5-digit US zip or Canadian postal code (e.g., M5H 2N2)` |
| Valid pattern but not found in dataset | `Postal code not recognized` |

Error text appears in red, smaller font, directly below the input. It clears as soon as the user edits the input or clicks Clear.

## Edge Cases

- **No lab has location data in `LAB_LOCATIONS`** — the table renders unchanged; distance column shows nothing. (Not expected in practice but doesn't crash.)
- **One lab has location data, others don't** — labs with data sort by distance ascending; labs without are appended in original order with no distance shown.
- **User opens panel, types, then closes panel without sorting** — input and error state are preserved; if they reopen, their input is still there. Sort state is only mutated via Sort/Clear buttons.
- **Reset Filters elsewhere in the page** — does not affect zip/distance state (kept independent).

## Out of Scope

- **Full Canadian postal codes** (6 chars) — FSA-level precision is sufficient and keeps the bundle small. Full codes can be added later if precision complaints emerge.
- **Persistence** — entered zip resets on page navigation. (Could be added via `useLocalStorage` later if desired.)
- **Geolocation API** — no "use my current location" button. Explicit zip-only input.
- **International postal codes outside US/CA** — not supported.
- **Distance as a sortable table column** — distance is shown inline with the lab name only; the column header is not re-sortable.
- **Cleanup of the duplicate DetailView.tsx** — separate cleanup task.

## Acceptance Criteria

1. Button labeled `📍 Find Closest Lab` is present next to the Lab Capabilities heading on the part detail page.
2. Clicking it expands an inline panel with a postal code input and Sort button.
3. Entering `14624` and clicking Sort reorders the labs so Rochester Lab is first (distance `0 mi`), with all other labs in ascending distance order.
4. Entering `M5H 2N2` (or `M5H2N2`) sorts with Toronto Lab first.
5. Lab name cells show ` (N mi)` suffix when sort is active.
6. Entering `00000` shows "Postal code not recognized" inline.
7. Entering `abc` shows "Enter a 5-digit US zip or Canadian postal code (e.g., M5H 2N2)" inline.
8. Clicking Clear restores default order and removes distance suffixes.
9. Expand/collapse state of individual labs is preserved through sort changes.
10. No regressions to other DetailView features (filters, service level selector, etc.).
