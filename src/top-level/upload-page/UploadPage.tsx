// ─────────────────────────────────────────────────────────────────────────────
// Upload Page Component
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  getEligibleLabsForUnit,
  supportsOnsiteCalibration,
  getStandardsForPN,
  getLabCapabilitiesForUnit,
} from "../../data/labs";
import {
  money,
  DonutChart,
  HorizontalBarChart,
  calculateQuoteSummary,
  exportQuoteToPDF,
  exportQuoteToExcel,
  type OptimizationStrategy,
  SERVICE_LEVEL_DESC,
  ALL_LEVELS,
  LABS,
  LAB_CAPACITY,
  getCapacityColor,
  getCapacityTextColor,
  clsx,
  ttColor,
  generatePricingRows,
  getTMSVendorsForUnitHelper,
} from "../";
import { UnitDetailsModal, ManualSearchModal } from "../modals";
import { ServiceLevelSelector } from "../../components/ServiceLevelSelector";
import type { Unit, MatchResult } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Unmatched Items Component
// ─────────────────────────────────────────────────────────────────────────────
function UnmatchedItemsSection({
  results,
  excludedItems,
  researchItems,
  selectedMatches,
  onExclude,
  onSendToResearch,
  onManualMatch,
  darkMode,
}: {
  results: MatchResult[];
  excludedItems: Set<number>;
  researchItems: Set<number>;
  selectedMatches: Map<number, Unit>;
  onExclude: (index: number) => void;
  onSendToResearch: (index: number) => void;
  onManualMatch: (index: number) => void;
  darkMode: boolean;
}) {
  // Filter out items that are excluded or have automatic matches
  // Keep manually matched items visible in the table below
  const unmatchedResults = results.filter(
    (r, idx) => r.matchedUnits.length === 0 && !excludedItems.has(idx)
    // Removed: !selectedMatches.has(idx) - this was hiding manually matched items
  );

  if (unmatchedResults.length === 0) return null;

  return (
    <div
      className={`rounded-xl border shadow-lg p-6 mb-6 ${
        darkMode
          ? "bg-gradient-to-br from-red-900/20 to-gray-900 border-red-700/50"
          : "bg-gradient-to-br from-red-50 to-white border-red-200"
      }`}
    >
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">⚠️</span>
        <div>
          <h2
            className={`text-lg font-bold ${
              darkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Unmatched Items ({unmatchedResults.length})
          </h2>
          <p
            className={`text-sm ${
              darkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            These items couldn't be matched and won't be included in the quote
            until resolved
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {unmatchedResults.map((result) => {
          const originalIndex = results.indexOf(result);
          const isExcluded = excludedItems.has(originalIndex);
          const isSentToResearch = researchItems.has(originalIndex);
          const isManuallyMatched = selectedMatches.has(originalIndex);

          return (
            <div
              key={originalIndex}
              className={`p-4 rounded-lg border ${
                isManuallyMatched
                  ? darkMode
                    ? "bg-green-900/20 border-green-700/50"
                    : "bg-green-50 border-green-200"
                  : isExcluded
                  ? darkMode
                    ? "bg-gray-800/50 border-gray-600"
                    : "bg-gray-100 border-gray-300"
                  : isSentToResearch
                  ? darkMode
                    ? "bg-amber-900/20 border-amber-700/50"
                    : "bg-amber-50 border-amber-200"
                  : darkMode
                  ? "bg-gray-800 border-gray-600"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className={`font-semibold ${
                        darkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {result.customerItem.manufacturer} -{" "}
                      {result.customerItem.model}
                    </div>
                    {isManuallyMatched && (
                      <span className="px-2 py-1 bg-green-500 text-white rounded text-xs">
                        ✅ Fixed & Ready
                      </span>
                    )}
                    {isExcluded && !isManuallyMatched && (
                      <span className="px-2 py-1 bg-gray-500 text-white rounded text-xs">
                        Excluded
                      </span>
                    )}
                    {isSentToResearch && !isManuallyMatched && (
                      <span className="px-2 py-1 bg-amber-500 text-white rounded text-xs">
                        Research
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-sm ${
                      darkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Row {result.customerItem.row} • Qty:{" "}
                    {result.customerItem.quantity || 1}
                    {result.customerItem.notes && (
                      <> • Notes: {result.customerItem.notes}</>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isManuallyMatched && !isExcluded && !isSentToResearch && (
                    <>
                      <button
                        onClick={() => onSendToResearch(originalIndex)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 active:scale-95 ${
                          darkMode
                            ? "bg-amber-600 text-white hover:bg-amber-700"
                            : "bg-amber-500 text-white hover:bg-amber-600"
                        }`}
                        title="Mark for research"
                      >
                        🔍 Research
                      </button>
                      <button
                        onClick={() => onManualMatch(originalIndex)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 active:scale-95 ${
                          darkMode
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-blue-500 text-white hover:bg-blue-600"
                        }`}
                        title="Manually match this item"
                      >
                        🔧 Manual Match
                      </button>
                    </>
                  )}
                  {isSentToResearch && !isManuallyMatched && (
                    <button
                      onClick={() => onManualMatch(originalIndex)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 active:scale-95 ${
                        darkMode
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "bg-green-500 text-white hover:bg-green-600"
                      }`}
                      title="Resolve this item after research"
                    >
                      ✅ Resolve
                    </button>
                  )}
                  <button
                    onClick={() => onExclude(originalIndex)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 active:scale-95 ${
                      darkMode
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-red-500 text-white hover:bg-red-600"
                    }`}
                    title="Exclude from quote"
                  >
                    ✕ Exclude
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {excludedItems.size > 0 && (
        <div
          className={`mt-4 pt-4 border-t ${
            darkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <div
            className={`text-sm ${
              darkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {excludedItems.size} item{excludedItems.size !== 1 ? "s" : ""}{" "}
            excluded from quote
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Quote Summary Dashboard Component
// ─────────────────────────────────────────────────────────────────────────────
function QuoteSummaryDashboard({
  summary,
  darkMode,
  onExportPDF,
  onExportExcel,
}: {
  summary: any;
  darkMode: boolean;
  onExportPDF: () => void;
  onExportExcel: () => void;
}) {
  return (
    <div className="glass-card p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📊</span>
          <div>
            <h2 className="text-xl font-bold text-blue-900">Quote Summary</h2>
            <p className="text-sm text-blue-600">
              Overview of your calibration quote
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onExportPDF}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 text-sm font-medium flex items-center gap-2"
          >
            📄 Export PDF
          </button>
          <button
            onClick={onExportExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 text-sm font-medium flex items-center gap-2"
          >
            📊 Export Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card bg-white border-blue-200 group hover:shadow-xl transition-all duration-300">
          <div className="text-xs uppercase tracking-wide text-blue-700 font-semibold mb-2">
            Total Items
          </div>
          <div className="text-3xl font-bold text-blue-900 mb-2 group-hover:scale-110 transition-transform">
            {summary.totalItems}
          </div>
          <div className="text-xs text-blue-600 font-medium">
            Items in quote
          </div>
        </div>

        <div className="stat-card bg-white border-green-200 group hover:shadow-xl transition-all duration-300">
          <div className="text-xs uppercase tracking-wide text-green-700 font-semibold mb-2">
            Configured Items
          </div>
          <div className="text-3xl font-bold text-green-900 mb-2 group-hover:scale-110 transition-transform">
            {summary.configuredItems}
          </div>
          <div className="text-xs text-green-600 font-medium">
            Ready to quote
          </div>
        </div>

        <div className="stat-card bg-white border-purple-200 group hover:shadow-xl transition-all duration-300">
          <div className="text-xs uppercase tracking-wide text-purple-700 font-semibold mb-2">
            Total Price
          </div>
          <div className="text-3xl font-bold text-purple-900 mb-2 group-hover:scale-110 transition-transform">
            {money(summary.totalPrice)}
          </div>
          <div className="text-xs text-purple-600 font-medium">
            Configured items only
          </div>
        </div>

        <div className="stat-card bg-white border-amber-200 group hover:shadow-xl transition-all duration-300">
          <div className="text-xs uppercase tracking-wide text-amber-700 font-semibold mb-2">
            Avg Turn Time
          </div>
          <div className="text-3xl font-bold text-amber-900 mb-2 group-hover:scale-110 transition-transform">
            {summary.avgTurnaroundTime} days
          </div>
          <div className="text-xs text-amber-600 font-medium">
            Based on selections
          </div>
        </div>
      </div>

      {summary.labBreakdown && summary.labBreakdown.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            Lab Breakdown
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {summary.labBreakdown.map((lab: any, index: number) => (
              <div
                key={index}
                className="bg-white border border-blue-200 rounded-lg p-3"
              >
                <div className="font-medium text-blue-900">{lab.lab}</div>
                <div className="text-sm text-blue-600">
                  {lab.count} items • {money(lab.total)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Upload Page Component
// ─────────────────────────────────────────────────────────────────────────────
export function UploadPage({
  fileInputRef,
  onFileUpload,
  isProcessing,
  results,
  errors,
  warnings,
  expandedRows,
  selectedMatches,
  onToggleRowExpansion,
  onSelectMatch,
  getSelectedMatch,
  getSelectedServiceLevel,
  getSelectedServiceLevels,
  getSelectedPrice,
  getSelectedLab,
  updateServiceLevel,
  updateServiceLevels,
  toggleServiceLevel,
  toggleMultiSelectMode,
  multiSelectMode,
  updatePrice,
  updateLab,
  preferredLabFilter,
  setPreferredLabFilter,
  zipCodeFilter,
  setZipCodeFilter,
  autoSelectPrioritizedLabs,
  refreshLabPriorities,
  modalRowIndex,
  setModalRowIndex,
  bulkSelectedRows,
  toggleBulkSelect,
  selectAllRows,
  clearBulkSelection,
  applyBulkLab,
  applyBulkServiceLevel,
  applyBulkBasePrice,
  handleOptimize,
  saveQuoteSession,
  loadQuoteSession,
  selectedPrices,
  selectedServiceLevels,
  selectedLabs,
  preferredLab,
  transferLabs,
  darkMode,
  excludedItems,
  researchItems,
  onExcludeItem,
  onSendToResearch,
  onManualMatch,
  manualSearchIndex,
  onManualMatchSelect,
  onCloseManualSearch,
  onResetAll,
  tmsLabs,
  tmsVendors,
  tmsPrices,
  tmsTurnTimes,
  removeLabCapability,
  addLabCapability,
  getEligibleLabsForUnitWithOverrides,
  openCapabilityModal,
  capabilityModalOpen,
  capabilityModalData,
  closeCapabilityModal,
  labCapabilityOverrides,
}: {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isProcessing: boolean;
  results: MatchResult[];
  errors: string[];
  warnings: string[];
  expandedRows: Set<number>;
  selectedMatches: Map<number, Unit>;
  onToggleRowExpansion: (rowIndex: number) => void;
  onSelectMatch: (rowIndex: number, unit: Unit) => void;
  getSelectedMatch: (rowIndex: number) => Unit | undefined;
  getSelectedServiceLevel: (rowIndex: number) => number;
  getSelectedServiceLevels: (rowIndex: number) => Set<number>;
  getSelectedPrice: (rowIndex: number) => number | null;
  getSelectedLab: (rowIndex: number) => string;
  updateServiceLevel: (rowIndex: number, level: number) => void;
  updateServiceLevels: (rowIndex: number, levels: Set<number>) => void;
  toggleServiceLevel: (rowIndex: number, level: number) => void;
  toggleMultiSelectMode: (rowIndex: number) => void;
  multiSelectMode: Map<number, boolean>;
  updatePrice: (rowIndex: number, price: number) => void;
  updateLab: (rowIndex: number, lab: string) => void;
  preferredLabFilter: string;
  setPreferredLabFilter: (value: string) => void;
  zipCodeFilter: string;
  setZipCodeFilter: (value: string) => void;
  autoSelectPrioritizedLabs: () => void;
  refreshLabPriorities: () => void;
  modalRowIndex: number | null;
  setModalRowIndex: (value: number | null) => void;
  bulkSelectedRows: Set<number>;
  toggleBulkSelect: (rowIndex: number) => void;
  selectAllRows: () => void;
  clearBulkSelection: () => void;
  applyBulkLab: (lab: string) => void;
  applyBulkServiceLevel: (level: number) => void;
  applyBulkBasePrice: (useBasePrice: boolean) => void;
  handleOptimize: (strategy: OptimizationStrategy) => void;
  saveQuoteSession: () => void;
  loadQuoteSession: () => void;
  selectedPrices: Map<number, number>;
  selectedServiceLevels: Map<number, number>;
  selectedLabs: Map<number, string>;
  preferredLab: string;
  transferLabs: Set<number>;
  darkMode: boolean;
  excludedItems: Set<number>;
  researchItems: Set<number>;
  onExcludeItem: (index: number) => void;
  onSendToResearch: (index: number) => void;
  onManualMatch: (index: number) => void;
  manualSearchIndex: number | null;
  onManualMatchSelect: (index: number, unit: Unit) => void;
  onCloseManualSearch: () => void;
  onResetAll: () => void;
  tmsLabs: Set<number>;
  tmsVendors: Map<number, string>;
  tmsPrices: Map<number, number>;
  tmsTurnTimes: Map<number, number>;
  removeLabCapability: (labCode: string, partNumber: string) => void;
  addLabCapability: (labCode: string, partNumber: string) => void;
  getEligibleLabsForUnitWithOverrides: (requirements: {
    partNumber: string;
    requiredCapabilityTags: any[];
  }) => any[];
  openCapabilityModal: (
    rowIndex: number,
    partNumber: string,
    requiredCapabilityTags: any[]
  ) => void;
  capabilityModalOpen: boolean;
  capabilityModalData: {
    rowIndex: number;
    partNumber: string;
    requiredCapabilityTags: any[];
  } | null;
  closeCapabilityModal: () => void;
  labCapabilityOverrides: Map<string, Set<string>>;
}) {
  // Track which row's gear dropdown is open
  const [openGearDropdown, setOpenGearDropdown] = useState<number | null>(null);
  const gearDropdownRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openGearDropdown !== null) {
        const ref = gearDropdownRefs.current.get(openGearDropdown);
        if (ref && !ref.contains(event.target as Node)) {
          setOpenGearDropdown(null);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openGearDropdown]);

  // Memoized quote summary calculations to ensure reactivity
  const quoteSummary = useMemo(() => {
    const totalValue = Array.from(selectedPrices.values()).reduce(
      (sum, price) => sum + price,
      0
    );

    // Use selectedLabs directly instead of getSelectedLab function
    const configuredItems = Array.from(selectedMatches.keys()).filter((i) => {
      const hasPrice = selectedPrices.has(i);
      const hasLab = selectedLabs.has(i) && selectedLabs.get(i) !== "";
      const isTMS = tmsLabs.has(i);
      return (hasPrice && hasLab) || isTMS;
    }).length;

    return { totalValue, configuredItems };
  }, [selectedPrices, selectedMatches, selectedLabs, tmsLabs]);

  const exportResults = () => {
    if (results.length === 0) return;

    // Include ALL items - we want excluded items too for "mark for review" functionality
    const filteredResults = results;

    const headers = [
      "Row",
      "Manufacturer",
      "Model",
      "Selected Service Level",
      "Selected Price",
      "Selected Lab",
      "Service Type",
      "Quantity",
      "Notes",
      "Best Match PN",
      "Standards Count",
      "Supports Onsite",
      "Price Range",
      "Turn Time Range",
      "All Available Labs",
      "Has Accredited",
      "Has Limited",
    ];
    const rows = filteredResults.map((result, i) => {
      const priceRange =
        result.minPrice && result.maxPrice
          ? `${money(result.minPrice)} - ${money(result.maxPrice)}`
          : "TBD";

      const turnTimeRange =
        result.minTurnTime && result.maxTurnTime
          ? `${result.minTurnTime}-${result.maxTurnTime} days`
          : "TBD";

      const selectedMatch = getSelectedMatch(i);
      const standardsCount = selectedMatch
        ? getStandardsForPN(selectedMatch.part_number).length
        : 0;
      const supportsOnsite = selectedMatch
        ? supportsOnsiteCalibration(selectedMatch.part_number)
        : false;

      // Determine service type
      const selectedUnit = selectedMatches.get(i);
      const selectedPrice = selectedPrices.get(i);
      const selectedLab = selectedLabs.get(i);
      const selectedServiceLevel = getSelectedServiceLevel(i);

      const isConfigured =
        selectedUnit &&
        selectedPrice &&
        selectedLab &&
        selectedServiceLevels.has(i);
      let serviceType = "";

      if (excludedItems.has(i)) {
        serviceType = "Marked for Review";
      } else if (tmsLabs.has(i)) {
        serviceType = "TMS";
      } else if (!isConfigured) {
        serviceType = "Needs More Info";
      } else if (transferLabs && transferLabs.has(i)) {
        serviceType = "Transfer";
      } else if (preferredLab && selectedLab === preferredLab) {
        if (supportsOnsiteCalibration(selectedUnit.part_number)) {
          serviceType = "Onsite/Depot Capable";
        } else {
          serviceType = "Depot Only";
        }
      } else if (preferredLab && selectedLab !== preferredLab) {
        serviceType = "Depot Only";
      } else {
        if (supportsOnsiteCalibration(selectedUnit.part_number)) {
          serviceType = "Onsite/Depot Capable";
        } else {
          serviceType = "Depot Only";
        }
      }

      return [
        String(result.customerItem.row),
        result.customerItem.manufacturer,
        result.customerItem.model,
        String(getSelectedServiceLevel(i)),
        getSelectedPrice(i) ? money(getSelectedPrice(i)!) : "",
        getSelectedLab(i) || "",
        serviceType,
        String(result.customerItem.quantity || 1),
        result.customerItem.notes || "",
        selectedMatch?.part_number || "No match",
        String(standardsCount),
        supportsOnsite ? "Yes" : "No",
        priceRange,
        turnTimeRange,
        result.labs.join(", "),
        result.hasAccredited ? "Yes" : "No",
        result.hasLimited ? "Yes" : "No",
      ].join("\t");
    });

    const content = [headers.join("\t"), ...rows].join("\n");

    const blob = new Blob([content], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `calibration-matches-${
      new Date().toISOString().split("T")[0]
    }.tsv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate comprehensive quote summary - exclude excluded items and include manually matched items
  const quoteSummaryData = useMemo(() => {
    // Filter out excluded items, but include manually matched items even if they have no automatic matches
    const filteredResults = results.filter(
      (r, idx) =>
        !excludedItems.has(idx) &&
        (r.matchedUnits.length > 0 || selectedMatches.has(idx))
    );
    return calculateQuoteSummary(
      filteredResults,
      selectedMatches,
      selectedPrices,
      selectedLabs
    );
  }, [results, selectedMatches, selectedPrices, selectedLabs, excludedItems]);

  // PDF Export handler
  const handleExportPDF = () => {
    // Filter out excluded items, but include manually matched items even if they have no automatic matches
    const filteredResults = results.filter(
      (r, idx) =>
        !excludedItems.has(idx) &&
        (r.matchedUnits.length > 0 || selectedMatches.has(idx))
    );
    exportQuoteToPDF(
      filteredResults,
      selectedMatches,
      selectedPrices,
      selectedLabs,
      new Map(
        Array.from(selectedMatches.keys()).map((i) => [
          i,
          getSelectedServiceLevel(i),
        ])
      ),
      quoteSummaryData
    );
  };

  // Excel Export handler
  const handleExportExcel = () => {
    // Include ALL items - we want excluded items too for "mark for review" functionality
    const filteredResults = results;
    exportQuoteToExcel(
      filteredResults,
      selectedMatches,
      selectedPrices,
      selectedLabs,
      new Map(
        Array.from(selectedMatches.keys()).map((i) => [
          i,
          getSelectedServiceLevel(i),
        ])
      ),
      preferredLab,
      transferLabs,
      excludedItems,
      tmsLabs
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Quote Summary Dashboard - At the top when results exist */}
      {results.length > 0 && (
        <QuoteSummaryDashboard
          summary={quoteSummaryData}
          darkMode={darkMode}
          onExportPDF={handleExportPDF}
          onExportExcel={handleExportExcel}
        />
      )}

      {/* Unmatched Items Section */}
      <UnmatchedItemsSection
        results={results}
        excludedItems={excludedItems}
        researchItems={researchItems}
        selectedMatches={selectedMatches}
        onExclude={onExcludeItem}
        onSendToResearch={onSendToResearch}
        onManualMatch={onManualMatch}
        darkMode={darkMode}
      />

      {/* Modern Upload Section */}
      <div className="glass-card p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📤</span>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Upload Customer List
              </h2>
              <p className="text-sm text-gray-500">
                Drag and drop or browse to upload CSV file
              </p>
            </div>
          </div>
          {results.length > 0 && (
            <button
              onClick={onResetAll}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 text-sm font-medium"
              title="Clear all data and start fresh"
            >
              🔄 Reset All
            </button>
          )}
        </div>

        <div className="mb-6 relative">
          <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-300 group">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={onFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="relative z-0">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-3xl">📁</span>
              </div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                Drop CSV file here or click to browse
              </p>
              <p className="text-xs text-gray-500">
                Accepts .csv and .txt files
              </p>
            </div>
          </div>
        </div>

        <div
          className={`p-5 rounded-xl border ${
            darkMode
              ? "bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700"
              : "bg-gradient-to-br from-gray-50 to-white border-gray-200"
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📋</span>
            <p
              className={`font-semibold text-sm ${
                darkMode ? "text-white" : "text-gray-900"
              }`}
            >
              CSV Format Guidelines
            </p>
          </div>
          <div className="bg-gray-900 p-4 rounded-lg font-mono text-xs text-green-400 mb-3 overflow-x-auto">
            <div className="whitespace-pre">
              manufacturer,model,service_level,quantity,notes
            </div>
            <div className="whitespace-pre text-gray-400">
              Fluke,87V,3,2,Need urgent calibration
            </div>
            <div className="whitespace-pre text-gray-400">
              Keysight,34461A,1,1,
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <div>
                <strong className={darkMode ? "text-white" : "text-gray-900"}>
                  Required:
                </strong>
                <span className={darkMode ? "text-gray-300" : "text-gray-600"}>
                  {" "}
                  manufacturer, model
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <div>
                <strong className={darkMode ? "text-white" : "text-gray-900"}>
                  Optional:
                </strong>
                <span className={darkMode ? "text-gray-300" : "text-gray-600"}>
                  {" "}
                  service_level, quantity, notes
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Processing State */}
      {isProcessing && (
        <div className="glass-card p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
            <span className="text-blue-900 font-medium">
              Processing your file...
            </span>
          </div>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="glass-card p-5 bg-gradient-to-r from-red-50 to-rose-50 border-red-200 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">⚠️</span>
            <h3 className="text-red-900 font-bold">Errors Detected</h3>
          </div>
          <ul className="text-red-700 text-sm space-y-2">
            {errors.map((error, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-red-500 font-bold">•</span>
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="glass-card p-5 bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">⚡</span>
            <h3 className="text-amber-900 font-bold">Warnings</h3>
          </div>
          <ul className="text-amber-700 text-sm space-y-2">
            {warnings.map((warning, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">•</span>
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Modern Quote Summary Dashboard */}
      {results.length > 0 && (
        <>
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <h3
              className={`text-xl font-bold ${
                darkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Quote Summary
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div className="stat-card bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 group hover:shadow-xl transition-all duration-300">
              <div className="text-xs uppercase tracking-wide text-blue-700 font-semibold mb-2">
                Total Quote Value
              </div>
              <div className="text-3xl font-bold text-blue-900 mb-2 group-hover:scale-110 transition-transform">
                {money(quoteSummary.totalValue)}
              </div>
              <div className="text-xs text-blue-600 font-medium">
                {selectedPrices.size} of {results.length} priced
              </div>
            </div>

            <div className="stat-card bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 group hover:shadow-xl transition-all duration-300">
              <div className="text-xs uppercase tracking-wide text-green-700 font-semibold mb-2">
                Items Configured
              </div>
              <div className="text-3xl font-bold text-green-900 mb-2 group-hover:scale-110 transition-transform">
                {quoteSummary.configuredItems}
              </div>
              <div className="text-xs text-green-600 font-medium">
                Ready to quote
              </div>
            </div>

            <div className="stat-card bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 group hover:shadow-xl transition-all duration-300">
              <div className="text-xs uppercase tracking-wide text-amber-700 font-semibold mb-2">
                Avg Turn Time
              </div>
              <div className="text-3xl font-bold text-amber-900 mb-2 group-hover:scale-110 transition-transform">
                {(() => {
                  const turnTimes: number[] = [];
                  results.forEach((_result, i) => {
                    const selectedLab = getSelectedLab(i);
                    const selectedMatch = getSelectedMatch(i);
                    if (selectedLab && selectedMatch) {
                      const labCaps = getEligibleLabsForUnit({
                        partNumber: selectedMatch.part_number,
                        requiredCapabilityTags:
                          selectedMatch.requiredCapabilityTags,
                      });
                      const labCap = labCaps.find(
                        (c) => c.labName === selectedLab
                      );
                      if (labCap) turnTimes.push(labCap.recalTT);
                    }
                  });
                  const avg =
                    turnTimes.length > 0
                      ? Math.round(
                          turnTimes.reduce((a, b) => a + b, 0) /
                            turnTimes.length
                        )
                      : 0;
                  return `${avg} days`;
                })()}
              </div>
              <div className="text-xs text-amber-600 font-medium">
                Based on selected labs
              </div>
            </div>

            <div className="stat-card bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200 group hover:shadow-xl transition-all duration-300">
              <div className="text-xs uppercase tracking-wide text-purple-700 font-semibold mb-2">
                Lab Distribution
              </div>
              <div className="text-3xl font-bold text-purple-900 mb-2 group-hover:scale-110 transition-transform">
                {(() => {
                  const labs = results
                    .map((_, i) => getSelectedLab(i))
                    .filter(Boolean);
                  return new Set(labs).size;
                })()}
              </div>
              <div className="text-xs text-purple-600 font-medium">
                Unique labs selected
              </div>
            </div>
          </div>

          {/* Data Visualization Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Lab Distribution Donut Chart */}
            {(() => {
              const labCounts = new Map<string, number>();
              
              // Count regular labs
              results.forEach((_, i) => {
                const lab = getSelectedLab(i);
                if (lab && !tmsLabs.has(i)) {
                  labCounts.set(lab, (labCounts.get(lab) || 0) + 1);
                }
              });

              // Count TMS labs
              tmsLabs.forEach((rowIndex) => {
                const vendor = tmsVendors.get(rowIndex);
                if (vendor) {
                  const tmsLabel = `TMS - ${vendor}`;
                  labCounts.set(tmsLabel, (labCounts.get(tmsLabel) || 0) + 1);
                }
              });

              if (labCounts.size === 0) return null;

              // Color mapping based on screenshot
              const colorMap: Record<string, string> = {};
              const colorPalette = [
                "#3b82f6", // Blue - Phoenix Lab
                "#10b981", // Green - Los Angeles Lab
                "#f59e0b", // Orange - San Diego Lab
                "#ef4444", // Red - TMS - Tektronix
                "#8b5cf6", // Purple - TMS - Trescal
                "#06b6d4", // Cyan
                "#ec4899", // Pink
                "#84cc16", // Lime
              ];

              const chartData = Array.from(labCounts.entries()).map(
                ([lab, count], i) => {
                  // Assign colors based on lab name patterns
                  let color = colorMap[lab];
                  if (!color) {
                    if (lab.includes("TMS - Tektronix")) {
                      color = "#ef4444"; // Red
                    } else if (lab.includes("TMS - Trescal")) {
                      color = "#8b5cf6"; // Purple
                    } else if (lab.includes("TMS")) {
                      color = "#ef4444"; // Red for other TMS
                    } else if (lab.includes("Phoenix")) {
                      color = "#3b82f6"; // Blue
                    } else if (lab.includes("Los Angeles")) {
                      color = "#10b981"; // Green
                    } else if (lab.includes("San Diego")) {
                      color = "#f59e0b"; // Orange
                    } else {
                      color = colorPalette[i % colorPalette.length];
                    }
                    colorMap[lab] = color;
                  }

                  return {
                    label: lab,
                    value: count,
                    color: color,
                  };
                }
              );

              return (
                <DonutChart
                  title="🏭 Lab Distribution"
                  data={chartData}
                  darkMode={darkMode}
                />
              );
            })()}

            {/* Cost Breakdown Bar Chart */}
            {(() => {
              const serviceLevelData = new Map<
                number,
                { total: number; count: number }
              >();
              
              // Count regular priced items
              results.forEach((result, i) => {
                const price = selectedPrices.get(i);
                const serviceLevel = getSelectedServiceLevel(i);
                if (price && serviceLevel && !tmsLabs.has(i)) {
                  const quantity = result.customerItem.quantity || 1;
                  const current = serviceLevelData.get(serviceLevel) || {
                    total: 0,
                    count: 0,
                  };
                  serviceLevelData.set(serviceLevel, {
                    total: current.total + price * quantity,
                    count: current.count + 1,
                  });
                }
              });

              // Count TMS priced items
              tmsLabs.forEach((rowIndex) => {
                const tmsPrice = tmsPrices.get(rowIndex);
                const serviceLevel = getSelectedServiceLevel(rowIndex);
                if (tmsPrice && serviceLevel) {
                  const quantity = results[rowIndex]?.customerItem.quantity || 1;
                  const current = serviceLevelData.get(serviceLevel) || {
                    total: 0,
                    count: 0,
                  };
                  serviceLevelData.set(serviceLevel, {
                    total: current.total + tmsPrice * quantity,
                    count: current.count + 1,
                  });
                }
              });

              if (serviceLevelData.size === 0) return null;

              const chartData = Array.from(serviceLevelData.entries())
                .sort((a, b) => a[0] - b[0])
                .map(([level, data]) => {
                  // Use solid colors matching screenshot
                  let color;
                  if (level <= 2) {
                    color = "#3b82f6"; // Blue
                  } else if (level <= 4) {
                    color = "#10b981"; // Green
                  } else if (level <= 6) {
                    color = "#f59e0b"; // Orange
                  } else if (level <= 8) {
                    color = "#8b5cf6"; // Purple
                  } else if (level <= 10) {
                    color = "#ef4444"; // Red
                  } else {
                    color = "#ec4899"; // Pink
                  }

                  return {
                    label: `Level ${level} - ${SERVICE_LEVEL_DESC[level] || ""}`,
                    value: data.total,
                    count: data.count,
                    color: color,
                    maxLabel: `${money(data.total)} (${data.count} item${data.count !== 1 ? "s" : ""})`,
                  };
                });

              return (
                <HorizontalBarChart
                  title="💰 Cost by Service Level"
                  data={chartData}
                  darkMode={darkMode}
                />
              );
            })()}
          </div>
        </>
      )}

      {/* Results Summary Stats */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className={`border rounded-2xl p-4 ${
              darkMode
                ? "bg-gray-800 border-gray-600"
                : "bg-white border-slate-200"
            }`}
          >
            <div
              className={`text-sm ${
                darkMode ? "text-gray-300" : "text-slate-600"
              }`}
            >
              Total Items
            </div>
            <div
              className={`text-2xl font-bold ${
                darkMode ? "text-blue-400" : "text-blue-600"
              }`}
            >
              {results.length}
            </div>
          </div>
          <div
            className={`border rounded-2xl p-4 ${
              darkMode
                ? "bg-gray-800 border-gray-600"
                : "bg-white border-slate-200"
            }`}
          >
            <div
              className={`text-sm ${
                darkMode ? "text-gray-300" : "text-slate-600"
              }`}
            >
              Items with Matches
            </div>
            <div
              className={`text-2xl font-bold ${
                darkMode ? "text-green-400" : "text-green-600"
              }`}
            >
              {results.filter((r) => r.matchedUnits.length > 0).length}
            </div>
          </div>
          <div
            className={`border rounded-2xl p-4 ${
              darkMode
                ? "bg-gray-800 border-gray-600"
                : "bg-white border-slate-200"
            }`}
          >
            <div
              className={`text-sm ${
                darkMode ? "text-gray-300" : "text-slate-600"
              }`}
            >
              Items without Matches
            </div>
            <div
              className={`text-2xl font-bold ${
                darkMode ? "text-red-400" : "text-red-600"
              }`}
            >
              {results.filter((r) => r.matchedUnits.length === 0).length}
            </div>
          </div>
        </div>
      )}

      {/* Main Results Table */}
      {results.length > 0 && (
        <>
          {/* Table Header with Actions */}
          <div className="flex items-center justify-between mb-4">
            <h2
              className={`text-xl font-bold ${
                darkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Match Results ({results.length} items)
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={selectAllRows}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  darkMode
                    ? "bg-purple-600 hover:bg-purple-700 text-white"
                    : "bg-purple-100 hover:bg-purple-200 text-purple-700"
                }`}
              >
                Select All
              </button>
              <button
                onClick={exportResults}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 border ${
                  darkMode
                    ? "bg-gray-800 border-gray-600 hover:bg-gray-700 text-white"
                    : "bg-white border-gray-300 hover:bg-gray-50 text-gray-700"
                }`}
              >
                Export Results
              </button>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {bulkSelectedRows.size > 0 && (
            <div
              className={`mb-4 glass-card p-6 rounded-xl ${
                darkMode
                  ? "bg-purple-900/20 border-purple-700/50"
                  : "bg-purple-50 border-purple-200"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <h3
                      className={`font-semibold ${
                        darkMode ? "text-purple-200" : "text-purple-900"
                      }`}
                    >
                      Bulk Actions
                    </h3>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      darkMode
                        ? "bg-blue-600 text-white"
                        : "bg-blue-500 text-white"
                    }`}
                  >
                    {bulkSelectedRows.size} selected
                  </span>
                </div>
                <button
                  onClick={clearBulkSelection}
                  className={`text-sm font-medium ${
                    darkMode ? "text-purple-300 hover:text-purple-200" : "text-purple-700 hover:text-purple-900"
                  }`}
                >
                  Clear Selection
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      darkMode ? "text-purple-200" : "text-purple-900"
                    }`}
                  >
                    Apply Lab with Proximity Fallback
                  </label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        applyBulkLab(e.target.value);
                      }
                    }}
                    className={`w-full px-4 py-2 text-sm border rounded-lg ${
                      darkMode
                        ? "bg-gray-800 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                    defaultValue=""
                  >
                    <option value="">Select preferred lab...</option>
                    {Array.from(
                      new Set(
                        results
                          .flatMap((r) => r.labs)
                          .filter((lab) => lab && lab.trim() !== "")
                      )
                    ).map((lab) => (
                      <option key={lab} value={lab}>
                        {lab}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                    <span className="text-blue-500">ℹ</span>
                    Uses closest alternative if selected lab lacks capability
                  </p>
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      darkMode ? "text-purple-200" : "text-purple-900"
                    }`}
                  >
                    Apply Service Level to Selected Items
                  </label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        applyBulkServiceLevel(Number(e.target.value));
                      }
                    }}
                    className={`w-full px-4 py-2 text-sm border rounded-lg ${
                      darkMode
                        ? "bg-gray-800 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                    defaultValue=""
                  >
                    <option value="">Select service level...</option>
                    {ALL_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        Level {level}: {SERVICE_LEVEL_DESC[level]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      darkMode ? "text-purple-200" : "text-purple-900"
                    }`}
                  >
                    Apply Base Price to Selected Items
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => applyBulkBasePrice(true)}
                      className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                        darkMode
                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                          : "bg-blue-100 hover:bg-blue-200 text-blue-700"
                      }`}
                    >
                      <span className="text-orange-500 mr-1">$</span>
                      Base Price
                    </button>
                    <button
                      onClick={() => applyBulkBasePrice(false)}
                      className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                        darkMode
                          ? "bg-purple-600 hover:bg-purple-700 text-white"
                          : "bg-purple-100 hover:bg-purple-200 text-purple-700"
                      }`}
                    >
                      <span className="text-blue-500 mr-1">💎</span>
                      Base + Options
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                    <span className="text-blue-500">ℹ</span>
                    Applies to current service level for each item
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="mt-6 glass-card overflow-hidden animate-fade-in">
            <div className="overflow-x-auto scrollbar-modern">
              <table className="w-full text-sm">
                <thead
                  className={`${
                    darkMode
                      ? "bg-gradient-to-r from-gray-800 to-gray-900"
                      : "bg-gradient-to-r from-gray-50 to-gray-100"
                  }`}
                >
                  <tr className={`text-left ${darkMode ? "text-gray-300" : "text-gray-600"} font-semibold uppercase text-xs tracking-wide`}>
                    <th className="py-4 px-4 w-12">
                      <input
                        type="checkbox"
                        checked={
                          results.length > 0 &&
                          bulkSelectedRows.size === results.length
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            selectAllRows();
                          } else {
                            clearBulkSelection();
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                    <th className="py-4 px-4">Row</th>
                    <th className="py-4 px-4">Manufacturer</th>
                    <th className="py-4 px-4">Model</th>
                    <th className="py-4 px-4">Service Level</th>
                    <th className="py-4 px-4">Best Match PN</th>
                    <th className="py-4 px-4">Standards</th>
                    <th className="py-4 px-4">Lab Capacity</th>
                    <th className="py-4 px-4">Selected Price</th>
                    <th className="py-4 px-4">Turn Time</th>
                    <th className="py-4 px-4">Labs</th>
                    <th className="py-4 px-4">Capabilities</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                {results.map((result, rowIndex) => {
                  const isExpanded = expandedRows.has(rowIndex);
                  const selectedMatch = getSelectedMatch(rowIndex);
                  const selectedServiceLevels = getSelectedServiceLevels(rowIndex);
                  const selectedPrice = getSelectedPrice(rowIndex);
                  const selectedLab = getSelectedLab(rowIndex);
                  const isBulkSelected = bulkSelectedRows.has(rowIndex);
                  const isExcluded = excludedItems.has(rowIndex);
                  const isResearch = researchItems.has(rowIndex);
                  const isTMS = tmsLabs.has(rowIndex);
                  const tmsVendor = tmsVendors.get(rowIndex);
                  const tmsPrice = tmsPrices.get(rowIndex);
                  const tmsTurnTime = tmsTurnTimes.get(rowIndex);
                  const isTransfer = transferLabs && transferLabs.has(rowIndex);

                  // Get eligible labs for this unit
                  const eligibleLabs = selectedMatch
                    ? getEligibleLabsForUnitWithOverrides({
                        partNumber: selectedMatch.part_number,
                        requiredCapabilityTags:
                          selectedMatch.requiredCapabilityTags,
                      })
                    : [];

                  // Get pricing rows
                  const pricingRows = selectedMatch
                    ? generatePricingRows(selectedMatch.pricing)
                    : [];

                  // Get standards count and onsite capability
                  const standardsCount = selectedMatch
                    ? getStandardsForPN(selectedMatch.part_number).length
                    : 0;
                  const supportsOnsite = selectedMatch
                    ? supportsOnsiteCalibration(selectedMatch.part_number)
                    : false;

                  // Get selected lab capability info
                  const selectedLabCap = selectedLab
                    ? eligibleLabs.find((l) => l.labName === selectedLab)
                    : null;

                  // Get lab capacity
                  const labCapacity = selectedLabCap
                    ? LAB_CAPACITY[selectedLabCap.labName] || 0
                    : null;
                  const capacityColor = labCapacity !== null
                    ? getCapacityColor(labCapacity)
                    : "";
                  const capacityTextColor = labCapacity !== null
                    ? getCapacityTextColor(labCapacity)
                    : "";

                  // Get turn time
                  const turnTime = isTMS
                    ? tmsTurnTime
                    : selectedLabCap
                    ? selectedLabCap.recalTT
                    : null;

                  // Calculate base price for current service level
                  const currentServiceLevel = getSelectedServiceLevel(rowIndex);
                  const basePrice = selectedMatch && pricingRows.length > 0
                    ? pricingRows.find((p) => p.service_level === currentServiceLevel)?.base_price_usd
                    : null;

                  // Determine if exact match
                  const isExactMatch = selectedMatch && result.matchedUnits.length > 0;

                  // Get capability status
                  const capabilityStatus = selectedLabCap
                    ? selectedLabCap.isAccredited
                      ? "Accredited"
                      : "Non-Accredited"
                    : null;

                  return (
                    <React.Fragment key={rowIndex}>
                      <tr
                        className={`${
                          isBulkSelected
                            ? darkMode
                              ? "bg-blue-100"
                              : "bg-blue-50"
                            : rowIndex % 2 === 0
                            ? darkMode
                              ? "bg-gray-900/50"
                              : "bg-white"
                            : darkMode
                            ? "bg-gray-800/30"
                            : "bg-gray-50/50"
                        } transition-all duration-200 group hover:bg-blue-50/50 ${
                          isExcluded ? "opacity-50" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isBulkSelected}
                            onChange={() => toggleBulkSelect(rowIndex)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>

                        {/* Row Number with Gear Icon */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2 relative">
                            <span
                              className={`font-bold ${
                                darkMode ? "text-white" : "text-gray-900"
                              }`}
                            >
                              {result.customerItem.row || rowIndex + 1}
                            </span>
                            <div
                              ref={(el) => {
                                if (el) {
                                  gearDropdownRefs.current.set(rowIndex, el);
                                } else {
                                  gearDropdownRefs.current.delete(rowIndex);
                                }
                              }}
                              className="relative"
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenGearDropdown(
                                    openGearDropdown === rowIndex ? null : rowIndex
                                  );
                                }}
                                className={`text-purple-400 hover:text-purple-600 transition-colors ${
                                  openGearDropdown === rowIndex ? "text-purple-600" : ""
                                }`}
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </button>

                              {/* Gear Dropdown Menu */}
                              {openGearDropdown === rowIndex && (
                                <div
                                  className={`absolute left-0 mt-2 w-64 rounded-lg shadow-xl border z-50 ${
                                    darkMode
                                      ? "bg-gray-800 border-gray-600"
                                      : "bg-white border-gray-200"
                                  }`}
                                >
                                  <div className="p-2 space-y-1">
                                    {/* Manual Lab Selection */}
                                    <div>
                                      <label
                                        className={`block text-xs font-semibold mb-1 px-2 ${
                                          darkMode ? "text-gray-300" : "text-gray-700"
                                        }`}
                                      >
                                        Lab Location
                                      </label>
                                      {selectedMatch && eligibleLabs.length > 0 ? (
                                        <select
                                          value={selectedLab || ""}
                                          onChange={(e) => {
                                            updateLab(rowIndex, e.target.value);
                                          }}
                                          className={`w-full px-3 py-2 text-sm border rounded-lg ${
                                            darkMode
                                              ? "bg-gray-700 border-gray-600 text-white"
                                              : "bg-white border-gray-300 text-gray-900"
                                          }`}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <option value="">Select lab location...</option>
                                          {eligibleLabs.map((lab) => (
                                            <option key={lab.labName} value={lab.labName}>
                                              {lab.labName}
                                              {lab.isAccredited ? " (Accredited)" : ""}
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onManualMatch(rowIndex);
                                          }}
                                          className={`w-full px-3 py-2 text-sm text-left rounded-lg transition-colors ${
                                            darkMode
                                              ? "bg-gray-700 hover:bg-gray-600 text-white"
                                              : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                                          }`}
                                        >
                                          🔧 Manual Lab Selection
                                        </button>
                                      )}
                                    </div>

                                    {/* Service Level Selection */}
                                    <div>
                                      <label
                                        className={`block text-xs font-semibold mb-1 px-2 ${
                                          darkMode ? "text-gray-300" : "text-gray-700"
                                        }`}
                                      >
                                        Service Level
                                      </label>
                                      {selectedMatch ? (
                                        <select
                                          value={currentServiceLevel}
                                          onChange={(e) => {
                                            updateServiceLevel(
                                              rowIndex,
                                              Number(e.target.value)
                                            );
                                          }}
                                          className={`w-full px-3 py-2 text-sm border rounded-lg ${
                                            darkMode
                                              ? "bg-gray-700 border-gray-600 text-white"
                                              : "bg-white border-gray-300 text-gray-900"
                                          }`}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {ALL_LEVELS.map((level) => (
                                            <option key={level} value={level}>
                                              Level {level}: {SERVICE_LEVEL_DESC[level] || ""}
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <div
                                          className={`px-3 py-2 text-sm rounded-lg ${
                                            darkMode
                                              ? "bg-gray-700 text-gray-400"
                                              : "bg-gray-100 text-gray-500"
                                          }`}
                                        >
                                          Select match first
                                        </div>
                                      )}
                                    </div>

                                    {/* Price Option */}
                                    <div>
                                      <label
                                        className={`block text-xs font-semibold mb-1 px-2 ${
                                          darkMode ? "text-gray-300" : "text-gray-700"
                                        }`}
                                      >
                                        Price Option
                                      </label>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (basePrice) {
                                              updatePrice(rowIndex, basePrice);
                                            }
                                          }}
                                          className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                                            darkMode
                                              ? "bg-blue-600 hover:bg-blue-700 text-white"
                                              : "bg-blue-100 hover:bg-blue-200 text-blue-700"
                                          }`}
                                        >
                                          Single
                                        </button>
                                        <select
                                          value={
                                            selectedPrice
                                              ? selectedPrice.toString()
                                              : ""
                                          }
                                          onChange={(e) => {
                                            if (e.target.value) {
                                              const price = parseFloat(e.target.value);
                                              if (!isNaN(price) && price > 0) {
                                                updatePrice(rowIndex, price);
                                              }
                                            }
                                          }}
                                          className={`flex-1 px-3 py-2 text-sm border rounded-lg ${
                                            darkMode
                                              ? "bg-gray-700 border-gray-600 text-white"
                                              : "bg-white border-gray-300 text-gray-900"
                                          }`}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <option value="">Select price option...</option>
                                          {pricingRows.map((p) => (
                                            <option key={p.service_level} value={p.base_price_usd}>
                                              Level {p.service_level}: {money(p.base_price_usd)}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>

                                    {/* Add or Remove Capabilities */}
                                    {selectedMatch && (
                                      <div className="pt-2 border-t border-gray-300 dark:border-gray-600">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openCapabilityModal(
                                              rowIndex,
                                              selectedMatch.part_number,
                                              selectedMatch.requiredCapabilityTags
                                            );
                                            setOpenGearDropdown(null);
                                          }}
                                          className={`w-full px-3 py-2 text-sm rounded-lg transition-colors flex items-center justify-center gap-2 ${
                                            darkMode
                                              ? "bg-green-600 hover:bg-green-700 text-white"
                                              : "bg-green-500 hover:bg-green-600 text-white"
                                          }`}
                                        >
                                          <span>✓</span>
                                          <span>Add or Remove Capabilities</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Manufacturer with Exact Match Badge */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-1">
                            <div
                              className={`font-semibold ${
                                darkMode ? "text-white" : "text-gray-900"
                              }`}
                            >
                              {result.customerItem.manufacturer}
                            </div>
                            {isExactMatch && selectedMatch && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium w-fit">
                                <span>✓</span>
                                <span>Exact Match</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Model with Quantity/C-of-C */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-1">
                            <div
                              className={`font-medium ${
                                darkMode ? "text-white" : "text-gray-900"
                              }`}
                            >
                              {result.customerItem.model}
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-gray-700">
                                {result.customerItem.quantity || 1}
                              </span>
                              <span className="text-xs text-gray-500">
                                {SERVICE_LEVEL_DESC[currentServiceLevel]?.split(" ")[0] || "C-of-C"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Service Level */}
                        <td className="py-4 px-4">
                          {selectedMatch ? (
                            <div className="flex flex-col gap-1">
                              <span
                                className={`font-semibold ${
                                  darkMode ? "text-white" : "text-gray-900"
                                }`}
                              >
                                {currentServiceLevel}
                              </span>
                              <span className="text-xs text-gray-600">
                                {SERVICE_LEVEL_DESC[currentServiceLevel] || ""}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>

                        {/* Best Match PN with Info Icon and Price */}
                        <td className="py-4 px-4">
                          {selectedMatch ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1">
                                <span
                                  className={`font-semibold ${
                                    darkMode ? "text-white" : "text-gray-900"
                                  }`}
                                >
                                  {selectedMatch.part_number}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setModalRowIndex(rowIndex);
                                  }}
                                  className="text-blue-500 hover:text-blue-700"
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                              {basePrice && (
                                <span className="text-sm font-semibold text-green-600">
                                  {money(basePrice)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>

                        {/* Standards with Onsite OK Badge */}
                        <td className="py-4 px-4">
                          {selectedMatch ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-sm text-gray-700">
                                {standardsCount} standard{standardsCount !== 1 ? "s" : ""}
                              </span>
                              {supportsOnsite && (
                                <span className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium w-fit">
                                  Onsite OK
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>

                        {/* Lab Capacity with Progress Bar */}
                        <td className="py-4 px-4">
                          {labCapacity !== null && selectedLab ? (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${labCapacity}%`,
                                    backgroundColor: capacityColor,
                                  }}
                                />
                              </div>
                              <span
                                className="text-sm font-medium"
                                style={{ color: capacityTextColor }}
                              >
                                {labCapacity}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>

                        {/* Selected Price */}
                        <td className="py-4 px-4">
                          {selectedPrice ? (
                            <span className="text-sm font-semibold text-green-600">
                              {money(selectedPrice)}
                            </span>
                          ) : isTMS && tmsPrice ? (
                            <span className="text-sm font-semibold text-green-600">
                              {money(tmsPrice)}
                            </span>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (basePrice) {
                                  updatePrice(rowIndex, basePrice);
                                }
                              }}
                              className="text-sm text-gray-500 hover:text-gray-700 underline"
                            >
                              Click to select price
                            </button>
                          )}
                        </td>

                        {/* Turn Time with Colored Badge */}
                        <td className="py-4 px-4">
                          {turnTime !== null ? (
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                turnTime <= 5
                                  ? "bg-green-100 text-green-700"
                                  : turnTime <= 10
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {turnTime} day{turnTime !== 1 ? "s" : ""}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>

                        {/* Labs with Location Pin and TMS Badges */}
                        <td className="py-4 px-4">
                          {isTMS && tmsVendor ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1">
                                <span className="text-red-500">📍</span>
                                <span className="text-sm font-medium text-gray-900">
                                  {tmsVendor}
                                </span>
                              </div>
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium w-fit">
                                <span>🏢</span>
                                <span>Transfer for TMS</span>
                              </span>
                            </div>
                          ) : selectedLab ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1">
                                <span className="text-red-500">📍</span>
                                <span className="text-sm font-medium text-gray-900">
                                  {selectedLab}
                                </span>
                              </div>
                              {isTransfer && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium w-fit">
                                  <span>↔</span>
                                  <span>Transfer from {preferredLab || "Preferred Lab"}</span>
                                </span>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (eligibleLabs.length > 0) {
                                  updateLab(rowIndex, eligibleLabs[0].labName);
                                }
                              }}
                              className="text-sm text-orange-600 hover:text-orange-700 underline"
                            >
                              Click to select lab
                            </button>
                          )}
                        </td>

                        {/* Capabilities with Status Badge */}
                        <td className="py-4 px-4">
                          {capabilityStatus ? (
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                capabilityStatus === "Accredited"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {capabilityStatus}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                      </tr>

                      {/* Expanded Row Content */}
                      {isExpanded && selectedMatch && (
                        <tr>
                          <td colSpan={12} className="py-4 px-4">
                            <div
                              className={`p-6 rounded-xl border shadow-sm ${
                                darkMode
                                  ? "bg-gradient-to-br from-gray-800/80 to-gray-900/80 border-gray-700"
                                  : "bg-gradient-to-br from-gray-50 to-white border-gray-200"
                              }`}
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Pricing Info */}
                                <div>
                                  <h4
                                    className={`font-semibold mb-3 text-sm uppercase tracking-wide ${
                                      darkMode ? "text-gray-300" : "text-gray-600"
                                    }`}
                                  >
                                    Available Pricing
                                  </h4>
                                  <div className="space-y-2">
                                    {pricingRows
                                      .slice(0, 6)
                                      .map((p) => (
                                        <div
                                          key={p.service_level}
                                          className={`flex items-center justify-between p-2 rounded-lg ${
                                            darkMode
                                              ? "bg-gray-800/50 text-gray-300"
                                              : "bg-white text-gray-700"
                                          }`}
                                        >
                                          <span className="text-sm font-medium">
                                            Level {p.service_level}
                                          </span>
                                          <span className="text-sm font-semibold text-blue-600">
                                            {money(p.base_price_usd)}
                                          </span>
                                        </div>
                                      ))}
                                  </div>
                                </div>

                                {/* Lab Info */}
                                <div>
                                  <h4
                                    className={`font-semibold mb-3 text-sm uppercase tracking-wide ${
                                      darkMode ? "text-gray-300" : "text-gray-600"
                                    }`}
                                  >
                                    Available Labs ({eligibleLabs.length})
                                  </h4>
                                  <div className="space-y-2">
                                    {eligibleLabs.slice(0, 6).map((lab) => (
                                      <div
                                        key={lab.labName}
                                        className={`flex items-center justify-between p-2 rounded-lg ${
                                          darkMode
                                            ? "bg-gray-800/50 text-gray-300"
                                            : "bg-white text-gray-700"
                                        }`}
                                      >
                                        <span className="text-sm font-medium">
                                          {lab.labName}
                                        </span>
                                        {lab.isAccredited && (
                                          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                                            ✓ Accredited
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {/* Details Modal */}
      {modalRowIndex !== null && getSelectedMatch(modalRowIndex) && (
        <UnitDetailsModal
          unit={getSelectedMatch(modalRowIndex)!}
          rowIndex={modalRowIndex}
          serviceLevel={getSelectedServiceLevel(modalRowIndex)}
          selectedLab={getSelectedLab(modalRowIndex)}
          onClose={() => setModalRowIndex(null)}
          darkMode={darkMode}
        />
      )}

      {/* Manual Search Modal */}
      {manualSearchIndex !== null && results[manualSearchIndex] && (
        <ManualSearchModal
          item={results[manualSearchIndex].customerItem}
          onSelect={(unit) => onManualMatchSelect(manualSearchIndex, unit)}
          onClose={onCloseManualSearch}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}
