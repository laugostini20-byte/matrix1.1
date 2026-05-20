import React, { useMemo } from "react";
import {
  LABS,
  getStandardsForPN,
  supportsOnsiteCalibration,
  getLabCapabilitiesForUnit,
  getEligibleLabsForUnit,
} from "../../data/labs";
import { ServiceLevelSelector } from "../ServiceLevelSelector";
import { ManualSearchModal } from "../modals/ManualSearchModal";
import { UnitDetailsModal } from "../modals/UnitDetailsModal";
import { UnmatchedItemsSection } from "../UnmatchedItemsSection";
import { QuoteSummaryDashboard } from "../QuoteSummaryDashboard";
import type {
  Unit,
  MatchResult,
  OptimizationStrategy,
} from "../../top-level";
import {
  SERVICE_LEVEL_DESC,
  LAB_CAPACITY,
  ALL_LEVELS,
  getCapacityColor,
  getCapacityTextColor,
  clsx,
  money,
  ttColor,
  DonutChart,
  HorizontalBarChart,
  getMatchQuality,
  calculateQuoteSummary,
  exportQuoteToExcel,
  exportQuoteToPDF,
  generatePricingRows,
  generateRecommendations,
  getTMSVendorsForUnitHelper,
} from "../../top-level";

// ─────────────────────────────────────────────────────────────────────────────
// Upload Page Component
// ─────────────────────────────────────────────────────────────────────────────
export type UploadPageProps = {
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
  selectedLabs: Map<number, string>;
  preferredLab: string;
  transferLabs: Set<number>;
  darkMode: boolean;
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
};

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
  selectedLabs,
  preferredLab,
  transferLabs,
  darkMode,
  removeLabCapability,
  addLabCapability,
  getEligibleLabsForUnitWithOverrides,
  openCapabilityModal,
  capabilityModalOpen,
  capabilityModalData,
  closeCapabilityModal,
  labCapabilityOverrides,
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
}: UploadPageProps) {
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
      "Transfer Type",
      "TMS Preferred Vendor",
      "TMS Negotiated Price",
      "TMS Vendor Turn Time",
    ];
    const rows = filteredResults.flatMap((result, i) => {
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
      const selectedServiceLevels = getSelectedServiceLevels(i);

      const isConfigured =
        selectedUnit &&
        selectedPrice &&
        selectedLab &&
        selectedServiceLevels.size > 0;
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

      // Generate one row per selected service level
      return Array.from(selectedServiceLevels).map((serviceLevel) =>
        [
          String(result.customerItem.row),
          result.customerItem.manufacturer,
          result.customerItem.model,
          String(serviceLevel),
          tmsLabs.has(i)
            ? tmsPrices.has(i)
              ? money(tmsPrices.get(i)!)
              : ""
            : getSelectedPrice(i)
            ? money(getSelectedPrice(i)!)
            : "",
          tmsLabs.has(i) ? tmsVendors.get(i) || "" : getSelectedLab(i) || "",
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
          tmsLabs.has(i) ? "TMS" : transferLabs.has(i) ? "Transfer" : "",
          tmsVendors.get(i) || "",
          tmsPrices.has(i) ? money(tmsPrices.get(i)!) : "",
          tmsTurnTimes.has(i) ? `${tmsTurnTimes.get(i)} days` : "",
        ].join("\t")
      );
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
            <span className="text-3xl">ðŸ“¤</span>
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
              ðŸ”„ Reset All
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
                <span className="text-3xl">ðŸ“</span>
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
            <span className="text-lg">ðŸ“‹</span>
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
              <span className="text-green-600 font-bold">âœ“</span>
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
              <span className="text-blue-600 font-bold">â€¢</span>
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
            <span className="text-2xl">âš ï¸</span>
            <h3 className="text-red-900 font-bold">Errors Detected</h3>
          </div>
          <ul className="text-red-700 text-sm space-y-2">
            {errors.map((error, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-red-500 font-bold">â€¢</span>
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
            <span className="text-2xl">âš¡</span>
            <h3 className="text-amber-900 font-bold">Warnings</h3>
          </div>
          <ul className="text-amber-700 text-sm space-y-2">
            {warnings.map((warning, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">â€¢</span>
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
            <span className="text-2xl">ðŸ“Š</span>
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
              results.forEach((_, i) => {
                const lab = getSelectedLab(i);
                if (lab) {
                  labCounts.set(lab, (labCounts.get(lab) || 0) + 1);
                }
              });

              if (labCounts.size === 0) return null;

              const chartData = Array.from(labCounts.entries()).map(
                ([lab, count], i) => ({
                  label: lab,
                  value: count,
                  color: [
                    "#3b82f6",
                    "#10b981",
                    "#f59e0b",
                    "#ef4444",
                    "#8b5cf6",
                    "#ec4899",
                    "#06b6d4",
                    "#84cc16",
                  ][i % 8],
                })
              );

              return (
                <DonutChart
                  title="ðŸ­ Lab Distribution"
                  data={chartData}
                  darkMode={darkMode}
                />
              );
            })()}

            {/* Cost Breakdown Bar Chart */}
            {selectedPrices.size > 0 &&
              (() => {
                const serviceLevelData = new Map<
                  number,
                  { total: number; count: number }
                >();
                results.forEach((result, i) => {
                  const price = selectedPrices.get(i);
                  const selectedServiceLevels = getSelectedServiceLevels(i);
                  if (price && selectedServiceLevels.size > 0) {
                    const quantity = result.customerItem.quantity || 1;

                    // For multi-select, distribute the price across all selected levels
                    const pricePerLevel = price / selectedServiceLevels.size;

                    selectedServiceLevels.forEach((serviceLevel) => {
                      const current = serviceLevelData.get(serviceLevel) || {
                        total: 0,
                        count: 0,
                      };
                      serviceLevelData.set(serviceLevel, {
                        total: current.total + pricePerLevel * quantity,
                        count: current.count + 1,
                      });
                    });
                  }
                });

                if (serviceLevelData.size === 0) return null;

                const chartData = Array.from(serviceLevelData.entries())
                  .sort((a, b) => a[0] - b[0])
                  .map(([level, data]) => ({
                    label: `L${level}`,
                    value: data.total,
                    count: data.count,
                    color: `linear-gradient(90deg, ${
                      level <= 2
                        ? "#60a5fa, #3b82f6"
                        : level <= 4
                        ? "#34d399, #10b981"
                        : level <= 6
                        ? "#fbbf24, #f59e0b"
                        : level <= 8
                        ? "#a78bfa, #8b5cf6"
                        : level <= 10
                        ? "#fb7185, #f43f5e"
                        : "#fb923c, #ea580c"
                    })`,
                  }));

                return (
                  <HorizontalBarChart
                    title="ðŸ’° Cost by Service Level"
                    data={chartData.map((item) => ({
                      ...item,
                      label: `Level ${item.label.replace("L", "")} - ${
                        SERVICE_LEVEL_DESC[
                          parseInt(item.label.replace("L", ""))
                        ]
                      }`,
                      maxLabel: `${money(item.value)} (${item.count} items)`,
                    }))}
                    darkMode={darkMode}
                  />
                );
              })()}
          </div>
        </>
      )}

      {/* FEATURE 1: Smart Recommendations Panel */}
      {results.length > 0 &&
        (() => {
          // Rebuild selectedLabs map for recommendations
          const computedSelectedLabs = new Map<number, string>();
          results.forEach((_, i) => {
            const lab = getSelectedLab(i);
            if (lab) computedSelectedLabs.set(i, lab);
          });

          const recommendations = generateRecommendations(
            results,
            selectedMatches,
            computedSelectedLabs,
            selectedPrices
          );

          if (recommendations.length === 0) return null;

          return (
            <div className="glass-card p-6 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">ðŸ’¡</span>
                <h3 className="text-xl font-bold text-gray-900">
                  Smart Recommendations
                </h3>
                <span className="badge badge-info ml-auto">
                  {recommendations.length} tips
                </span>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-modern">
                {recommendations.slice(0, 10).map((rec, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
                      rec.type === "warning"
                        ? "bg-amber-50 border border-amber-200 text-amber-800"
                        : rec.type === "info"
                        ? "bg-blue-50 border border-blue-200 text-blue-800"
                        : "bg-green-50 border border-green-200 text-green-800"
                    }`}
                  >
                    <span className="text-lg flex-shrink-0">
                      {rec.type === "warning"
                        ? "âš ï¸"
                        : rec.type === "info"
                        ? "â„¹ï¸"
                        : "âœ…"}
                    </span>
                    <div className="flex-1">{rec.message}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

      {/* FEATURE 2 & 5: Auto-Optimize and Save/Load */}
      {results.length > 0 && (
        <div
          className={`border rounded-2xl p-4 shadow-sm ${
            darkMode
              ? "bg-gray-800 border-gray-600"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3
                className={`font-semibold mb-2 ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Quick Actions
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleOptimize("minimize_cost")}
                  className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  ðŸ’° Minimize Cost
                </button>
                <button
                  onClick={() => handleOptimize("minimize_time")}
                  className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  âš¡ Minimize Time
                </button>
                <button
                  onClick={() => handleOptimize("balance_capacity")}
                  className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  âš–ï¸ Balance Capacity
                </button>
              </div>
            </div>
            <div>
              <h3
                className={`font-semibold mb-2 ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Session Management
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={saveQuoteSession}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  ðŸ’¾ Save Quote
                </button>
                <button
                  onClick={loadQuoteSession}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  ðŸ“‚ Load Quote
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FEATURE 3: Bulk Actions Panel */}
      {results.length > 0 && bulkSelectedRows.size > 0 && (
        <div
          className={`rounded-2xl p-4 shadow-sm border-2 ${
            darkMode
              ? "bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border-indigo-500/30"
              : "bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-300"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <h3
              className={`font-semibold flex items-center gap-2 ${
                darkMode ? "text-white" : "text-gray-900"
              }`}
            >
              <span>ðŸŽ¯ Bulk Actions</span>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  darkMode
                    ? "bg-indigo-500 text-white"
                    : "bg-indigo-600 text-white"
                }`}
              >
                {bulkSelectedRows.size} selected
              </span>
            </h3>
            <button
              onClick={clearBulkSelection}
              className={`text-xs underline transition-colors ${
                darkMode
                  ? "text-indigo-400 hover:text-indigo-300"
                  : "text-indigo-600 hover:text-indigo-800"
              }`}
            >
              Clear Selection
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label
                className={`block text-xs font-medium mb-2 ${
                  darkMode ? "text-indigo-300" : "text-indigo-700"
                }`}
              >
                Apply Lab with Proximity Fallback
              </label>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    applyBulkLab(e.target.value);
                    e.target.value = "";
                  }
                }}
                className={`w-full text-sm border rounded-lg px-3 py-2 ${
                  darkMode
                    ? "border-indigo-500/50 bg-[#1c1c1e] text-white"
                    : "border-indigo-300 bg-white"
                }`}
              >
                <option value="">Select preferred lab...</option>
                {LABS.map((lab) => (
                  <option key={lab.code} value={lab.name}>
                    {lab.name}
                  </option>
                ))}
              </select>
              <div
                className={`text-xs mt-1 ${
                  darkMode ? "text-indigo-400" : "text-indigo-600"
                }`}
              >
                â„¹ï¸ Uses closest alternative if selected lab lacks capability
              </div>
            </div>
            <div>
              <label
                className={`block text-xs font-medium mb-2 ${
                  darkMode ? "text-indigo-300" : "text-indigo-700"
                }`}
              >
                Apply Service Level to Selected Items
              </label>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    applyBulkServiceLevel(parseInt(e.target.value));
                    e.target.value = "";
                  }
                }}
                className={`w-full text-sm border rounded-lg px-3 py-2 ${
                  darkMode
                    ? "border-indigo-500/50 bg-[#1c1c1e] text-white"
                    : "border-indigo-300 bg-white"
                }`}
              >
                <option value="">Select service level...</option>
                {ALL_LEVELS.map((level: number) => (
                  <option key={level} value={level}>
                    Level {level}: {SERVICE_LEVEL_DESC[level]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className={`block text-xs font-medium mb-2 ${
                  darkMode ? "text-indigo-300" : "text-indigo-700"
                }`}
              >
                Apply Base Price to Selected Items
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => applyBulkBasePrice(true)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    darkMode
                      ? "bg-indigo-800/50 hover:bg-indigo-700/50 text-indigo-200"
                      : "bg-indigo-100 hover:bg-indigo-200 text-indigo-700"
                  }`}
                >
                  ðŸ’° Base Price
                </button>
                <button
                  onClick={() => applyBulkBasePrice(false)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    darkMode
                      ? "bg-indigo-800/50 hover:bg-indigo-700/50 text-indigo-200"
                      : "bg-indigo-100 hover:bg-indigo-200 text-indigo-700"
                  }`}
                >
                  ðŸ’Ž Base + Options
                </button>
              </div>
              <div
                className={`text-xs mt-1 ${
                  darkMode ? "text-indigo-400" : "text-indigo-600"
                }`}
              >
                â„¹ï¸ Applies to current service level for each item
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div
          className={`border rounded-2xl shadow-sm overflow-hidden ${
            darkMode
              ? "bg-gray-800 border-gray-600"
              : "bg-white border-slate-200"
          }`}
        >
          <div
            className={`p-4 border-b flex items-center justify-between ${
              darkMode ? "border-gray-600" : "border-slate-200"
            }`}
          >
            <h3
              className={`font-semibold ${
                darkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Match Results ({results.length} items)
            </h3>
            <div className="flex gap-2">
              <button
                onClick={selectAllRows}
                className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-sm font-medium"
              >
                Select All
              </button>
              <button
                onClick={exportResults}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  darkMode
                    ? "bg-gray-700 hover:bg-gray-600 text-white"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                Export Results
              </button>
            </div>
          </div>

          <div className="overflow-auto">
            <table className={`w-full text-sm ${darkMode ? "dark" : ""}`}>
              <thead>
                <tr
                  className={`text-left ${
                    darkMode
                      ? "bg-gray-700 text-white"
                      : "bg-slate-50 text-slate-500"
                  }`}
                  style={
                    darkMode
                      ? { backgroundColor: "#374151", color: "white" }
                      : {}
                  }
                >
                  <th
                    className={`py-3 px-4 w-10 ${
                      darkMode ? "text-white" : "text-slate-500"
                    }`}
                    style={darkMode ? { color: "white" } : {}}
                  >
                    <input
                      type="checkbox"
                      checked={
                        bulkSelectedRows.size === results.length &&
                        results.length > 0
                      }
                      onChange={() => {
                        if (bulkSelectedRows.size === results.length) {
                          clearBulkSelection();
                        } else {
                          selectAllRows();
                        }
                      }}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <th
                    className={`py-3 px-4 ${
                      darkMode ? "text-white" : "text-slate-500"
                    }`}
                    style={darkMode ? { color: "white" } : {}}
                  >
                    Row
                  </th>
                  <th
                    className={`py-3 px-4 ${
                      darkMode ? "text-white" : "text-slate-500"
                    }`}
                    style={darkMode ? { color: "white" } : {}}
                  >
                    Manufacturer
                  </th>
                  <th
                    className={`py-3 px-4 ${
                      darkMode ? "text-white" : "text-slate-500"
                    }`}
                    style={darkMode ? { color: "white" } : {}}
                  >
                    Model
                  </th>
                  <th
                    className={`py-3 px-4 ${
                      darkMode ? "text-white" : "text-slate-500"
                    }`}
                    style={darkMode ? { color: "white" } : {}}
                  >
                    Service Level
                  </th>
                  <th
                    className={`py-3 px-4 ${
                      darkMode ? "text-white" : "text-slate-500"
                    }`}
                    style={darkMode ? { color: "white" } : {}}
                  >
                    Best Match PN
                  </th>
                  <th
                    className={`py-3 px-4 ${
                      darkMode ? "text-white" : "text-slate-500"
                    }`}
                    style={darkMode ? { color: "white" } : {}}
                  >
                    Standards
                  </th>
                  <th
                    className={`py-3 px-4 ${
                      darkMode ? "text-white" : "text-slate-500"
                    }`}
                    style={darkMode ? { color: "white" } : {}}
                  >
                    Lab Capacity
                  </th>
                  <th
                    className={`py-3 px-4 ${
                      darkMode ? "text-white" : "text-slate-500"
                    }`}
                    style={darkMode ? { color: "white" } : {}}
                  >
                    Selected Price
                  </th>
                  <th
                    className={`py-3 px-4 ${
                      darkMode ? "text-white" : "text-slate-500"
                    }`}
                    style={darkMode ? { color: "white" } : {}}
                  >
                    Turn Time
                  </th>
                  <th
                    className={`py-3 px-4 ${
                      darkMode ? "text-white" : "text-slate-500"
                    }`}
                    style={darkMode ? { color: "white" } : {}}
                  >
                    Labs
                  </th>
                  <th
                    className={`py-3 px-4 ${
                      darkMode ? "text-white" : "text-slate-500"
                    }`}
                    style={darkMode ? { color: "white" } : {}}
                  >
                    Capabilities
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, i) => {
                  const isExpanded = expandedRows.has(i);
                  const selectedMatch = getSelectedMatch(i);
                  const hasMultipleMatches = result.matchedUnits.length > 1;
                  const hasMatches =
                    result.matchedUnits.length > 0 || selectedMatches.has(i);

                  // Check if this is a 100% exact match
                  const matchQuality = selectedMatch
                    ? getMatchQuality(result.customerItem, selectedMatch)
                    : { quality: 0, isExact: false };
                  const isExactMatch =
                    matchQuality.isExact || matchQuality.quality === 100;

                  // Can expand if there are matches (to configure service/price)
                  const canExpand = hasMatches;

                  // Show arrow only if there are multiple matches and not exact
                  const showExpandArrow = hasMultipleMatches && !isExactMatch;

                  return (
                    <React.Fragment key={i}>
                      <tr
                        className={`border-t border-slate-100 ${
                          darkMode ? "hover:bg-gray-800" : "hover:bg-slate-50"
                        } ${
                          bulkSelectedRows.has(i)
                            ? darkMode
                              ? "bg-indigo-900/30"
                              : "bg-indigo-50"
                            : ""
                        } ${
                          transferLabs.has(i)
                            ? darkMode
                              ? "bg-orange-900/20 border-l-4 border-orange-500"
                              : "bg-orange-50 border-l-4 border-orange-400"
                            : ""
                        }`}
                      >
                        <td
                          className="py-3 px-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={bulkSelectedRows.has(i)}
                            onChange={() => toggleBulkSelect(i)}
                            disabled={!hasMatches}
                            className={`w-4 h-4 ${
                              hasMatches
                                ? "cursor-pointer"
                                : "cursor-not-allowed opacity-30"
                            }`}
                            title={
                              hasMatches
                                ? "Select for bulk actions"
                                : "No match found - cannot bulk select"
                            }
                          />
                        </td>
                        <td
                          className={`py-3 px-4 font-medium ${
                            canExpand ? "cursor-pointer" : ""
                          } ${darkMode ? "text-white" : "text-gray-900"}`}
                          onClick={() => canExpand && onToggleRowExpansion(i)}
                        >
                          <div className="flex items-center gap-2">
                            <span>{result.customerItem.row}</span>
                            {showExpandArrow && (
                              <span className="text-slate-400">
                                {isExpanded ? "â–¼" : "â–¶"}
                              </span>
                            )}
                            {isExactMatch && hasMatches && !showExpandArrow && (
                              <span
                                className="text-xs text-blue-600"
                                title="Click to configure"
                              >
                                âš™ï¸
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            <span
                              className={
                                darkMode ? "text-white" : "text-gray-900"
                              }
                            >
                              {result.customerItem.manufacturer}
                            </span>
                            {selectedMatch &&
                              (() => {
                                const matchQuality = getMatchQuality(
                                  result.customerItem,
                                  selectedMatch
                                );
                                return matchQuality.isExact ? (
                                  <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium w-fit">
                                    âœ“ Exact Match
                                  </span>
                                ) : matchQuality.quality >= 60 ? (
                                  <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium w-fit">
                                    ~ {matchQuality.quality}% Match
                                  </span>
                                ) : (
                                  <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium w-fit">
                                    âš  {matchQuality.quality}% Match
                                  </span>
                                );
                              })()}
                            {!hasMatches && (
                              <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium w-fit">
                                âœ— No Match
                              </span>
                            )}
                          </div>
                        </td>
                        <td
                          className={`py-3 px-4 ${
                            darkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {result.customerItem.model}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            <div
                              className={`text-sm ${
                                darkMode ? "text-white" : "text-gray-900"
                              }`}
                            >
                              {getSelectedServiceLevel(i)}
                            </div>
                            <div
                              className={`text-xs ${
                                darkMode ? "text-gray-400" : "text-slate-500"
                              }`}
                            >
                              {SERVICE_LEVEL_DESC[getSelectedServiceLevel(i)]}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium">
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col gap-1">
                              <div
                                className={`text-sm ${
                                  darkMode ? "text-white" : "text-gray-900"
                                }`}
                              >
                                {selectedMatch?.part_number || "No match"}
                              </div>
                              {getSelectedPrice(i) && (
                                <div className="text-xs text-green-600 font-medium">
                                  {money(getSelectedPrice(i)!)}
                                </div>
                              )}
                            </div>
                            {selectedMatch && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setModalRowIndex(i);
                                }}
                                className="flex-shrink-0 p-1 hover:bg-blue-100 rounded-full transition-colors"
                                title="View details"
                              >
                                <svg
                                  className="w-5 h-5 text-blue-600"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {selectedMatch ? (
                            (() => {
                              const selectedLabName = getSelectedLab(i);
                              const selectedLabObj = LABS.find(
                                (lab) => lab.name === selectedLabName
                              );

                              // Get standards from the selected lab only
                              const standards = selectedLabObj
                                ? selectedLabObj.standards.filter((std) =>
                                    std.supportedPNs.includes(
                                      selectedMatch.part_number
                                    )
                                  )
                                : [];

                              // Check if any standard at the selected lab is onsite capable
                              const hasOnsite = standards.some(
                                (std) => std.onsiteCapable
                              );

                              return (
                                <div className="flex flex-col gap-1">
                                  <div
                                    className={`text-sm font-medium ${
                                      darkMode ? "text-white" : "text-slate-900"
                                    }`}
                                  >
                                    {standards.length} standard
                                    {standards.length !== 1 ? "s" : ""}
                                  </div>
                                  {hasOnsite && (
                                    <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium w-fit">
                                      Onsite OK
                                    </span>
                                  )}
                                </div>
                              );
                            })()
                          ) : (
                            <span className="text-slate-400 text-sm">â€”</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {(() => {
                            const selectedLabName = getSelectedLab(i);
                            if (!selectedLabName) {
                              return (
                                <span className="text-slate-400 text-sm">
                                  â€”
                                </span>
                              );
                            }

                            // For TMS items, show N/A instead of lab capacity
                            if (tmsLabs.has(i)) {
                              return (
                                <span className="text-slate-400 text-sm">
                                  N/A
                                </span>
                              );
                            }

                            const capacity =
                              LAB_CAPACITY[selectedLabName] || 50;
                            const barColor = getCapacityColor(capacity);
                            const textColor = getCapacityTextColor(capacity);

                            return (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden min-w-[60px]">
                                  <div
                                    className={`h-full ${barColor} transition-all duration-300`}
                                    style={{ width: `${capacity}%` }}
                                  />
                                </div>
                                <span
                                  className={`text-xs font-medium ${textColor} min-w-[35px]`}
                                >
                                  {capacity}%
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-3 px-4">
                          {getSelectedPrice(i) ? (
                            <div className="text-sm font-medium text-green-600">
                              {money(getSelectedPrice(i)!)}
                            </div>
                          ) : (
                            <div
                              className={`text-sm ${
                                darkMode ? "text-gray-400" : "text-slate-500"
                              }`}
                            >
                              Click to select price
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {(() => {
                            // If it's a TMS item, show TMS vendor turn time
                            if (tmsLabs.has(i) && tmsTurnTimes.has(i)) {
                              const tmsTurnTime = tmsTurnTimes.get(i)!;
                              return (
                                <span
                                  className={clsx(
                                    "inline-block px-2 py-1 rounded-full text-xs font-medium",
                                    ttColor(tmsTurnTime)
                                  )}
                                >
                                  {tmsTurnTime} days
                                </span>
                              );
                            }

                            // If a lab is selected, show the exact turn time for that lab
                            const selectedLab = getSelectedLab(i);
                            if (selectedLab && selectedMatch) {
                              const labCaps = getEligibleLabsForUnit({
                                partNumber: selectedMatch.part_number,
                                requiredCapabilityTags:
                                  selectedMatch.requiredCapabilityTags,
                              });
                              const labCapability = labCaps.find(
                                (cap) => cap.labName === selectedLab
                              );
                              if (labCapability) {
                                // Use recalTT as the standard turn time
                                return (
                                  <span
                                    className={clsx(
                                      "inline-block px-2 py-1 rounded-full text-xs font-medium",
                                      ttColor(labCapability.recalTT)
                                    )}
                                  >
                                    {labCapability.recalTT} days
                                  </span>
                                );
                              }
                            }
                            // Otherwise show the range
                            return result.minTurnTime && result.maxTurnTime ? (
                              <span
                                className={clsx(
                                  "inline-block px-2 py-1 rounded-full text-xs",
                                  ttColor(result.minTurnTime)
                                )}
                              >
                                {result.minTurnTime}-{result.maxTurnTime} days
                              </span>
                            ) : (
                              "TBD"
                            );
                          })()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            {getSelectedLab(i) ? (
                              <div className="flex flex-col gap-1">
                                <div
                                  className={`text-sm font-medium ${
                                    transferLabs.has(i)
                                      ? darkMode
                                        ? "text-orange-400"
                                        : "text-orange-600"
                                      : darkMode
                                      ? "text-blue-400"
                                      : "text-blue-600"
                                  }`}
                                >
                                  ðŸ“ {getSelectedLab(i)}
                                </div>
                                {transferLabs.has(i) &&
                                  preferredLab &&
                                  !tmsLabs.has(i) && (
                                    <div className="flex items-center gap-1">
                                      <span
                                        className={`px-2 py-1 text-xs rounded-full font-medium ${
                                          darkMode
                                            ? "bg-orange-900/30 text-orange-300 border border-orange-700/50"
                                            : "bg-orange-100 text-orange-700 border border-orange-300"
                                        }`}
                                      >
                                        ðŸ”„ Transfer from {preferredLab}
                                      </span>
                                    </div>
                                  )}
                                {tmsLabs.has(i) && (
                                  <div className="flex items-center gap-1">
                                    <span
                                      className={`px-2 py-1 text-xs rounded-full font-medium ${
                                        darkMode
                                          ? "bg-purple-900/30 text-purple-300 border border-purple-700/50"
                                          : "bg-purple-100 text-purple-700 border border-purple-300"
                                      }`}
                                    >
                                      ðŸ¢ Transfer for TMS
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : hasMatches ? (
                              <div
                                className={`text-sm ${
                                  darkMode ? "text-amber-400" : "text-amber-600"
                                }`}
                              >
                                Click to select lab
                              </div>
                            ) : (
                              <div
                                className={`text-sm ${
                                  darkMode ? "text-gray-400" : "text-slate-500"
                                }`}
                              >
                                No matches
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1">
                            {(() => {
                              const selectedLabName = getSelectedLab(i);

                              // If a lab is selected, show that lab's capabilities
                              if (selectedLabName && selectedMatch) {
                                const eligibleLabs = getEligibleLabsForUnit({
                                  partNumber: selectedMatch.part_number,
                                  requiredCapabilityTags:
                                    selectedMatch.requiredCapabilityTags,
                                });

                                const selectedLabCap = eligibleLabs.find(
                                  (lab) => lab.labName === selectedLabName
                                );

                                if (selectedLabCap) {
                                  return (
                                    <>
                                      {selectedLabCap.isAccredited && (
                                        <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                          Accredited
                                        </span>
                                      )}
                                      {!selectedLabCap.isAccredited && (
                                        <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                                          Non-Accredited
                                        </span>
                                      )}
                                    </>
                                  );
                                }
                              }

                              // If no lab selected, show overall availability
                              return (
                                <>
                                  {result.hasAccredited && (
                                    <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                      Accredited
                                    </span>
                                  )}
                                  {result.hasLimited && (
                                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                      Limited
                                    </span>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50">
                          <td colSpan={12} className="py-4 px-4">
                            <div className="space-y-4">
                              {/* Unit Selection - Only show if NOT 100% exact match */}
                              {hasMultipleMatches && !isExactMatch && (
                                <div>
                                  <div className="text-sm font-medium text-slate-700 mb-2">
                                    Choose from {result.matchedUnits.length}{" "}
                                    matches:
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {result.matchedUnits.map(
                                      (unit, unitIndex) => (
                                        <div
                                          key={unitIndex}
                                          className={clsx(
                                            "border rounded-lg p-3 cursor-pointer transition-colors",
                                            selectedMatch?.id === unit.id
                                              ? "border-blue-500 bg-blue-50"
                                              : "border-slate-200 bg-white hover:bg-slate-50"
                                          )}
                                          onClick={() => onSelectMatch(i, unit)}
                                        >
                                          <div className="font-medium text-sm">
                                            {unit.part_number}
                                          </div>
                                          <div className="text-xs text-slate-600 mt-1">
                                            {unit.manufacturer}{" "}
                                            {unit.model_number}
                                          </div>
                                          <div className="text-xs text-slate-500 mt-1">
                                            {unit.description}
                                          </div>
                                          <div className="text-xs text-blue-600 mt-1 font-medium">
                                            â± {(unit.standardTime || 0).toFixed(1)} hrs
                                          </div>
                                          <div className="mt-2 flex gap-1">
                                            {(() => {
                                              const labs =
                                                getEligibleLabsForUnitWithOverrides(
                                                  {
                                                    partNumber:
                                                      unit.part_number,
                                                    requiredCapabilityTags:
                                                      unit.requiredCapabilityTags,
                                                  }
                                                );
                                              const hasAccredited = labs.some(
                                                (l) => l.isAccredited
                                              );
                                              const hasOnsite = labs.some((l) =>
                                                l.matchingStandards.some(
                                                  (s: any) => s.onsiteCapable
                                                )
                                              );
                                              return (
                                                <>
                                                  {hasAccredited && (
                                                    <span className="inline-block px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                                                      Accredited Available
                                                    </span>
                                                  )}
                                                  {hasOnsite && (
                                                    <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                                                      Onsite Available
                                                    </span>
                                                  )}
                                                </>
                                              );
                                            })()}
                                          </div>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Service Configuration */}
                              {selectedMatch && (
                                <div
                                  className={`border-t pt-4 ${
                                    darkMode
                                      ? "border-gray-600"
                                      : "border-slate-200"
                                  }`}
                                  style={
                                    darkMode
                                      ? {
                                          backgroundColor: "#374151 !important",
                                          borderRadius: "8px",
                                          padding: "16px",
                                        }
                                      : {}
                                  }
                                >
                                  <div
                                    className={`text-sm font-semibold mb-3 ${
                                      darkMode ? "text-black" : "text-slate-700"
                                    }`}
                                    style={
                                      darkMode
                                        ? {
                                            color: "#000000 !important",
                                            fontWeight: "600",
                                            fontSize: "14px",
                                            backgroundColor: "transparent",
                                          }
                                        : {}
                                    }
                                  >
                                    Configure Service Options:
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Service Level Selector */}
                                    <div>
                                      <label
                                        className={`block text-xs font-medium mb-2 ${
                                          darkMode
                                            ? "text-black"
                                            : "text-slate-600"
                                        }`}
                                        style={
                                          darkMode
                                            ? {
                                                color: "#000000 !important",
                                                fontWeight: "600",
                                                fontSize: "12px",
                                                backgroundColor: "transparent",
                                              }
                                            : {}
                                        }
                                      >
                                        Service Level
                                      </label>
                                      <ServiceLevelSelector
                                        rowIndex={i}
                                        selectedLevels={getSelectedServiceLevels(
                                          i
                                        )}
                                        onUpdateServiceLevel={
                                          updateServiceLevel
                                        }
                                        onUpdateServiceLevels={
                                          updateServiceLevels
                                        }
                                        onToggleServiceLevel={
                                          toggleServiceLevel
                                        }
                                        onToggleMultiSelectMode={
                                          toggleMultiSelectMode
                                        }
                                        isMultiSelect={
                                          multiSelectMode.get(i) || false
                                        }
                                        darkMode={darkMode}
                                      />
                                    </div>

                                    {/* Price Selector */}
                                    <div>
                                      <label
                                        className={`block text-xs font-medium mb-2 ${
                                          darkMode
                                            ? "text-black"
                                            : "text-slate-600"
                                        }`}
                                        style={
                                          darkMode
                                            ? {
                                                color: "#000000 !important",
                                                fontWeight: "600",
                                                fontSize: "12px",
                                                backgroundColor: "transparent",
                                              }
                                            : {}
                                        }
                                      >
                                        Price Option
                                      </label>
                                      <select
                                        value={getSelectedPrice(i) || ""}
                                        onChange={(e) =>
                                          updatePrice(
                                            i,
                                            parseFloat(e.target.value)
                                          )
                                        }
                                        onClick={(e) => e.stopPropagation()}
                                        className={`w-full text-sm rounded-lg px-3 py-2 ${
                                          darkMode
                                            ? "text-white"
                                            : "bg-white border border-slate-300 text-gray-900"
                                        }`}
                                        style={
                                          darkMode
                                            ? {
                                                backgroundColor: "#374151",
                                                border: "none",
                                                outline: "none",
                                              }
                                            : {}
                                        }
                                      >
                                        <option value="">
                                          Select price option...
                                        </option>
                                        {(() => {
                                          if (!selectedMatch) return null;
                                          const pricing = generatePricingRows(
                                            selectedMatch.pricing
                                          );
                                          const selectedLevels =
                                            getSelectedServiceLevels(i);

                                          // For multi-select, show prices for all selected levels
                                          if (selectedLevels.size > 1) {
                                            return Array.from(selectedLevels)
                                              .sort(
                                                (a: number, b: number) => a - b
                                              )
                                              .map((level) => {
                                                const levelPricing =
                                                  pricing.find(
                                                    (p) =>
                                                      p.service_level === level
                                                  );
                                                if (!levelPricing) return null;

                                                return [
                                                  {
                                                    value:
                                                      levelPricing.base_price_usd,
                                                    label: `L${level} Base: ${money(
                                                      levelPricing.base_price_usd
                                                    )}`,
                                                  },
                                                  {
                                                    value:
                                                      levelPricing.base_plus_options_usd,
                                                    label: `L${level} +Options: ${money(
                                                      levelPricing.base_plus_options_usd
                                                    )}`,
                                                  },
                                                ];
                                              })
                                              .filter(
                                                (
                                                  item
                                                ): item is NonNullable<
                                                  typeof item
                                                > => item !== null
                                              )
                                              .flat();
                                          } else {
                                            // Single level - show base and +options
                                            const serviceLevel =
                                              Array.from(selectedLevels)[0] ??
                                              1;
                                            const levelPricing = pricing.find(
                                              (p) =>
                                                p.service_level === serviceLevel
                                            );
                                            if (!levelPricing) return null;

                                            return [
                                              {
                                                value:
                                                  levelPricing.base_price_usd,
                                                label: `Base: ${money(
                                                  levelPricing.base_price_usd
                                                )}`,
                                              },
                                              {
                                                value:
                                                  levelPricing.base_plus_options_usd,
                                                label: `Base + Options: ${money(
                                                  levelPricing.base_plus_options_usd
                                                )}`,
                                              },
                                            ];
                                          }
                                        })()?.map((option: any) => (
                                          <option
                                            key={option.value}
                                            value={option.value}
                                          >
                                            {option.label}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    {/* Lab Selector */}
                                    <div>
                                      <label
                                        className={`block text-xs font-medium mb-2 ${
                                          darkMode
                                            ? "text-black"
                                            : "text-slate-600"
                                        }`}
                                        style={
                                          darkMode
                                            ? {
                                                color: "#000000 !important",
                                                fontWeight: "600",
                                                fontSize: "12px",
                                                backgroundColor: "transparent",
                                              }
                                            : {}
                                        }
                                      >
                                        {tmsLabs.has(i)
                                          ? "TMS Vendor"
                                          : "Lab Location"}
                                      </label>
                                      <select
                                        value={getSelectedLab(i)}
                                        onChange={(e) =>
                                          updateLab(i, e.target.value)
                                        }
                                        onClick={(e) => e.stopPropagation()}
                                        className={`w-full text-sm rounded-lg px-3 py-2 ${
                                          darkMode
                                            ? "text-white"
                                            : "bg-white border border-slate-300 text-gray-900"
                                        }`}
                                        style={
                                          darkMode
                                            ? {
                                                backgroundColor: "#374151",
                                                border: "none",
                                                outline: "none",
                                              }
                                            : {}
                                        }
                                      >
                                        <option value="">
                                          {tmsLabs.has(i)
                                            ? "Select TMS vendor..."
                                            : "Select lab location..."}
                                        </option>
                                        {tmsLabs.has(i)
                                          ? // TMS Vendor options
                                            getTMSVendorsForUnitHelper(
                                              selectedMatch
                                            ).map((vendor, vendorIndex) => (
                                              <option
                                                key={vendorIndex}
                                                value={`TMS - ${vendor.vendor_name}`}
                                              >
                                                {vendor.vendor_name} -{" "}
                                                {money(
                                                  vendor.negotiated_price_usd
                                                )}{" "}
                                                ({vendor.vendor_turn_time_days}{" "}
                                                days)
                                              </option>
                                            ))
                                          : // Lab options
                                            getEligibleLabsForUnitWithOverrides(
                                              {
                                                partNumber:
                                                  selectedMatch.part_number,
                                                requiredCapabilityTags:
                                                  selectedMatch.requiredCapabilityTags,
                                              }
                                            )
                                              .filter((lab) => {
                                                // Exclude labs that have had capability artificially added
                                                const overrides =
                                                  labCapabilityOverrides.get(
                                                    lab.labCode
                                                  );
                                                return (
                                                  !overrides ||
                                                  !overrides.has(
                                                    `ADD:${selectedMatch.part_number}`
                                                  )
                                                );
                                              })
                                              .map((cap, capIndex) => (
                                                <option
                                                  key={capIndex}
                                                  value={cap.labName}
                                                >
                                                  {cap.labName}
                                                  {cap.isAccredited
                                                    ? " (Accredited)"
                                                    : ""}
                                                </option>
                                              ))}
                                      </select>
                                    </div>
                                  </div>

                                  {/* Lab Capability Management */}
                                  <div
                                    className={`border-t pt-4 mt-4 ${
                                      darkMode
                                        ? "border-gray-600"
                                        : "border-slate-200"
                                    }`}
                                  >
                                    <div
                                      className={`text-sm font-semibold mb-3 ${
                                        darkMode
                                          ? "text-black"
                                          : "text-slate-700"
                                      }`}
                                    >
                                      Manage Lab Capabilities:
                                    </div>
                                    <div className="space-y-2">
                                      {/* Lab Capability Management Buttons */}
                                      <div className="flex items-center gap-4 p-2 bg-gray-50 rounded-lg">
                                        {/* Remove Capability Button */}
                                        {getSelectedLab(i) && (
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-blue-800">
                                              {getSelectedLab(i)}:
                                            </span>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const labCode =
                                                  getEligibleLabsForUnit({
                                                    partNumber:
                                                      selectedMatch.part_number,
                                                    requiredCapabilityTags:
                                                      selectedMatch.requiredCapabilityTags,
                                                  }).find(
                                                    (lab) =>
                                                      lab.labName ===
                                                      getSelectedLab(i)
                                                  )?.labCode;
                                                if (labCode) {
                                                  removeLabCapability(
                                                    labCode,
                                                    selectedMatch.part_number
                                                  );
                                                }
                                              }}
                                              className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                                              title="Remove capability - this lab cannot do this item"
                                            >
                                              âŒ Remove Capability
                                            </button>
                                          </div>
                                        )}

                                        {/* Add Capability Button */}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openCapabilityModal(
                                              i,
                                              selectedMatch.part_number,
                                              selectedMatch.requiredCapabilityTags
                                            );
                                          }}
                                          className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                                          title="Add capability to other labs"
                                        >
                                          âœ… Add Capability
                                        </button>
                                      </div>

                                      {getEligibleLabsForUnit({
                                        partNumber: selectedMatch.part_number,
                                        requiredCapabilityTags:
                                          selectedMatch.requiredCapabilityTags,
                                      }).length === 0 && (
                                        <div className="text-sm text-gray-500 italic">
                                          No labs currently capable of this item
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
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
      )}

      {/* Summary Stats */}
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
                darkMode ? "text-white" : "text-gray-900"
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

      {/* Lab Capability Management Modal */}
      {capabilityModalOpen && capabilityModalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className={`bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto ${
              darkMode ? "bg-gray-800" : "bg-white"
            }`}
          >
            <div className="flex justify-between items-center mb-4">
              <h3
                className={`text-lg font-semibold ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Add Lab Capability
              </h3>
              <button
                onClick={closeCapabilityModal}
                className={`text-gray-400 hover:text-gray-600 ${
                  darkMode ? "hover:text-gray-300" : "hover:text-gray-600"
                }`}
              >
                âœ•
              </button>
            </div>

            <div
              className={`text-sm mb-4 ${
                darkMode ? "text-gray-300" : "text-gray-600"
              }`}
            >
              Part Number:{" "}
              <span className="font-mono font-medium">
                {capabilityModalData.partNumber}
              </span>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {getLabCapabilitiesForUnit({
                partNumber: capabilityModalData.partNumber,
                requiredCapabilityTags:
                  capabilityModalData.requiredCapabilityTags,
              })
                .filter(
                  (lab) =>
                    lab.labName !== getSelectedLab(capabilityModalData.rowIndex)
                )
                .filter((lab) => !lab.canCalibrate)
                .filter((lab) => {
                  // Exclude labs that already have capability artificially added
                  const overrides = labCapabilityOverrides.get(lab.labCode);
                  return (
                    !overrides ||
                    !overrides.has(`ADD:${capabilityModalData.partNumber}`)
                  );
                })
                .map((lab, labIndex) => (
                  <div
                    key={labIndex}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      darkMode
                        ? "bg-gray-700 border-gray-600"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex-1">
                      <div
                        className={`font-medium ${
                          darkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {lab.labName}
                      </div>
                      <div
                        className={`text-sm ${
                          darkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {lab.region} â€¢ {lab.matchingStandards.length} matching
                        standards
                        {lab.isAccredited && (
                          <span className="ml-2 text-green-600">
                            âœ“ Accredited
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        addLabCapability(
                          lab.labCode,
                          capabilityModalData.partNumber
                        );
                        closeCapabilityModal();
                      }}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm"
                    >
                      Add Capability
                    </button>
                  </div>
                ))}

              {getLabCapabilitiesForUnit({
                partNumber: capabilityModalData.partNumber,
                requiredCapabilityTags:
                  capabilityModalData.requiredCapabilityTags,
              })
                .filter(
                  (lab) =>
                    lab.labName !== getSelectedLab(capabilityModalData.rowIndex)
                )
                .filter((lab) => !lab.canCalibrate)
                .filter((lab) => {
                  const overrides = labCapabilityOverrides.get(lab.labCode);
                  return (
                    !overrides ||
                    !overrides.has(`ADD:${capabilityModalData.partNumber}`)
                  );
                }).length === 0 && (
                <div
                  className={`text-center py-8 ${
                    darkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  All labs already have capability for this item
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={closeCapabilityModal}
                className={`px-4 py-2 rounded ${
                  darkMode
                    ? "bg-gray-600 text-white hover:bg-gray-500"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                } transition-colors`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
