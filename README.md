# Calibration Matrix

A React + TypeScript app for Transcat that helps quote calibration jobs. Search a catalog of 5,320 calibrated units, find the best lab for each one based on capability + location, and produce a customer quote.

> Proof of concept. Mock data. Ready to wire to real endpoints.

## What it does

Three primary workflows, accessible via the tabs at the top:

1. **🔍 Search** — Filter the unit catalog by part number, manufacturer, model, or description. Click a row to see lab capabilities and a service-level price grid.

2. **📊 Details** — Drill into a specific unit's full detail page: lab capabilities sorted by distance (enter a US ZIP or Canadian FSA), service-level selector, ZIP "Find Closest Lab" feature, and onsite-calibration eligibility.

3. **📤 Bulk Upload** — Upload a customer CSV (`manufacturer,model,service_level,quantity,notes`). The app auto-matches each row against the catalog, surfaces unmatched items for manual search, and produces a quote summary with pricing breakdown, donut/bar charts, smart recommendations, auto-optimize, and PDF/Excel export.

## Tech stack

| Tool | Version | Role |
|---|---|---|
| React | 19 | UI |
| TypeScript | 5.7 | Type safety |
| Vite | 6 | Build + dev server |
| Tailwind CSS | 3.4 | Styling |
| jsPDF + jspdf-autotable | 3 / 5 | PDF export |

No test suite. No backend — all data is bundled as static TypeScript modules.

## Running it locally

```bash
npm install           # one-time, ~30 seconds
npm run dev           # dev server on http://localhost:5180
```

Other commands:

```bash
npm run build         # tsc + vite build → dist/
npm run preview       # serve the built dist/ for sanity check
```

The dev server has HMR — edits to `src/` reload instantly.

## Project structure

```
src/
├── App.tsx                          [20 lines — providers + AppContent]
├── main.tsx                         [Vite entry]
├── index.css                        [Tailwind base]
│
├── components/
│   ├── CopyButton.tsx
│   ├── DetailView.tsx               [the Details tab page]
│   ├── QuoteSummaryDashboard.tsx
│   ├── ServiceLevelMultiSelect.tsx
│   ├── ServiceLevelSelector.tsx
│   ├── UnmatchedItemsSection.tsx
│   │
│   ├── diagnostics/
│   │   ├── Diagnostics.tsx          [in-app dev panel ("Show diagnostics")]
│   │   └── diagnostics-utils.ts
│   │
│   ├── modals/
│   │   ├── ComparisonModal.tsx
│   │   ├── ManualSearchModal.tsx
│   │   └── UnitDetailsModal.tsx
│   │
│   └── upload/                      [Bulk Upload tab — 11 files]
│       ├── AppContent.tsx           [state orchestrator: 1543 lines]
│       ├── UploadPage.tsx           [composition root for upload: 705 lines]
│       ├── UploadAlerts.tsx
│       ├── UploadDropzone.tsx
│       ├── RecommendationsPanel.tsx
│       ├── OptimizeAndSavePanel.tsx
│       ├── QuoteCharts.tsx          [donut + bar charts]
│       ├── BulkActionsPanel.tsx
│       ├── LabCapabilityModal.tsx
│       └── match-results/
│           ├── MatchResultsTable.tsx
│           └── MatchResultRow.tsx   [per-row UI: 1041 lines]
│
├── context/                         [React Context providers]
│   ├── AppStateContext.tsx          [page nav, dark mode, coverage stats]
│   ├── LabSelectionContext.tsx      [lab + unit selection state]
│   └── SearchContext.tsx            [search query state]
│
├── hooks/
│   ├── useDebounce.ts
│   └── useLocalStorage.ts
│
├── data/                            [mock catalog data — replace with API later]
│   ├── labs.ts                      [lab definitions, capability rules]
│   ├── units.ts                     [5,320 calibrated units]
│   ├── tms.ts                       [transfer vendor mappings]
│   ├── us-zip-coordinates.json
│   └── ca-fsa-coordinates.json
│
├── business-logic/
│   ├── coverage-stats.ts
│   ├── serialization.ts
│   └── zip-distance.ts              [haversine + bundled coordinate lookup]
│
├── top-level/                       [shared utilities + types]
│   ├── constants.ts                 [service levels, lab capacity, etc.]
│   ├── types.ts                     [Unit, MatchResult, CustomerItem, …]
│   ├── utils.ts                     [clsx, money, ttColor, calculateDistance, …]
│   ├── charts/                      [DonutChart, HorizontalBarChart components]
│   ├── upload/                      [CSV parsing + match-quality logic]
│   ├── pricing-utils/               [service-level pricing math]
│   ├── quote-summary/               [quote totals/breakdowns]
│   ├── export-utils/                [PDF + Excel export builders]
│   ├── optimization-utils/          [auto-optimize strategies, recommendations]
│   └── index.ts                     [barrel re-export]
│
└── utils/
    ├── export.ts                    [text/TSV download builders]
    └── serialization.ts             [config serialization for copy/paste]
```

## How state flows

`App.tsx` is just provider plumbing:

```
<AppStateProvider>
  <SearchProvider>
    <LabSelectionProvider>
      <AppContent />        ← all real logic lives here
    </LabSelectionProvider>
  </SearchProvider>
</AppStateProvider>
```

`AppContent` is the heavy state orchestrator. It:
- Holds the upload/match/quote state via `useState` + the three Context providers
- Computes derived data (matches, eligible labs, pricing rows)
- Renders one of three views based on `currentPage`: Search results, Details page, or `<UploadPage />`

`UploadPage` is now thin — it just destructures the ~60 props passed from `AppContent` and composes the 9 panel/table sub-components.

## Where to make changes

| You want to… | Edit… |
|---|---|
| Add a new tab | `AppContent.tsx` (the `currentPage` switch) |
| Tweak the search filters | `AppContent.tsx` (the Search-tab render) |
| Change the unit-detail page | `components/DetailView.tsx` |
| Change a Bulk Upload panel | `components/upload/<Panel>.tsx` |
| Change the matched-row layout | `components/upload/match-results/MatchResultRow.tsx` |
| Add a new pricing rule | `top-level/pricing-utils/index.ts` |
| Add a new match-quality heuristic | `top-level/upload/index.ts` (`getMatchQuality`) |
| Change the lab catalog | `data/labs.ts` |
| Change the unit catalog | `data/units.ts` |

## Design docs and implementation history

This codebase went through a significant refactor; the design specs and implementation plans live in `docs/superpowers/`:

```
docs/superpowers/
├── specs/      [design specs — what we built, why]
└── plans/      [implementation plans — how we built it, task by task]
```

Recent specs include:
- `2026-05-19-app-tsx-breakup-design.md` — split the original 6,607-line App.tsx into per-component files
- `2026-05-19-dedup-pass-1-design.md` — removed orphan duplicates in `top-level/`
- `2026-05-19-uploadpage-split-design.md` — split UploadPage from 2,412 → 705 lines

Reading these before touching the codebase will save time.

## Known issues and TODOs

Things that work but aren't ideal:

| Issue | Where | Effort to fix |
|---|---|---|
| 1.8MB main JS bundle | Vite build output | Code-split via `manualChunks` |
| 194 inline `darkMode ? "…" : "…"` ternaries | Across `components/` | Extract a helper or switch to Tailwind `dark:` variants |
| `AppContent.tsx` is 1,543 lines | `components/upload/AppContent.tsx` | Extract custom hooks (useUploadState, etc.) |
| `bg-gray-750` Tailwind class doesn't exist | Several components | Replace with `bg-gray-700` |
| Some `any[]` types in prop interfaces | `UploadPage.tsx` props | Type as `string[]` or proper capability tag type |
| No ESLint configured | — | Add `eslint.config.js` if you want lint coverage |
| No test suite | — | Vitest is the natural choice for Vite projects |
| Inline emoji + hard-coded copy throughout | UI components | i18n if multi-locale becomes a need |

None of these block deployment. They're maintainability follow-ups.

## Mock-data notes

This is a POC. Everything in `src/data/` is hand-curated mock data:

- **5,320 units** with synthetic part numbers (`PN-FLK-87V-0001`, etc.)
- **~14 labs** with random-ish capability assignments
- **TMS vendors** for transfer-service items

To wire to real endpoints later, replace `src/data/*.ts` with async fetches (likely via React Query or SWR) and adjust `business-logic/coverage-stats.ts` and `top-level/upload/index.ts` to accept live data.

## Development workflow tips

- The Diagnostics panel (top-right "Show diagnostics" button) runs sanity checks against the data — useful for confirming new data imports parse cleanly.
- Dark mode toggles via the 🌙 button in the header. Currently 6 components have dark variants — see "Known issues" above.
- The dev server uses port **5180** (configured in `vite.config.ts`).
- Git history is intentionally granular (one atomic commit per extraction) — easy to `git bisect` if a regression appears.
