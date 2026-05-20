import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  getEligibleLabsForUnit,
} from "./data/labs";
import { ComparisonModal } from "./components/modals/ComparisonModal";
import { Diagnostics } from "./components/diagnostics/Diagnostics";
import { DetailView } from "./components/DetailView";
import { UploadPage } from "./components/upload/UploadPage";
import { runDiagnostics } from "./components/diagnostics/diagnostics-utils";
import { exportServiceLevelText, exportAllUnitsData } from "./utils/export";
import { useDebounce } from "./hooks/useDebounce";
import { AppStateProvider, useAppState } from "./context/AppStateContext";
import { SearchProvider, useSearch } from "./context/SearchContext";
import { LabSelectionProvider, useLabSelection } from "./context/LabSelectionContext";
import type {
  Unit,
  MatchResult,
  LabLocation,
  OptimizationStrategy,
} from "./top-level";
import {
  LAB_LOCATIONS,
  calculateDistance,
  searchUnits,
  parseCustomerList,
  createMatchResult,
  generatePricingRows,
  optimizeSelections,
  isTMSRequired,
  selectPreferredTMSVendor,
} from "./top-level";

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Main App Component
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Upload functionality
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Chart Components - Pure CSS/SVG
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// TODO: Move to charts folder - currently unused
/*
function BarChart({
  data,
  title,
  height = 200,
  darkMode = false,
}: {
  data: { label: string; value: number; color: string }[];
  title?: string;
  height?: number;
  darkMode?: boolean;
}) {
  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  const range = maxValue - minValue;

  // Ensure minimum bar height for visibility
  const minBarHeight = 8;

  return (
    <div
      className={`chart-container animate-fade-in ${
        darkMode ? "bg-[#1c1c1e] border-white/10" : "bg-white border-gray-200"
      }`}
    >
      {title && (
        <h4
          className={`text-sm font-semibold mb-6 ${
            darkMode ? "text-white" : "text-gray-900"
          }`}
        >
          {title}
        </h4>
      )}
      <div
        className={`flex items-end justify-between px-1 pt-1 ${
          data.length > 10 ? "gap-0.5" : "gap-1"
        }`}
        style={{ height: `${height}px` }}
      >
        {data.map((item, i) => {
          // Improved scaling: Better space utilization with linear scaling
          let percentage;
          if (range === 0) {
            percentage = 60; // If all values are the same, show 60%
          } else {
            // Normalize to 0-1 range
            const normalized = (item.value - minValue) / range;
            // Use linear scaling for more predictable visual representation
            // Map to 20-95% range for better space utilization
            percentage = Math.max(normalized * 75 + 20, 12);
          }

          const barHeight = Math.max((percentage / 100) * height, minBarHeight);

          return (
            <div
              key={i}
              className={`flex flex-col items-center gap-0.5 ${
                data.length > 10 ? "flex-1 min-w-0" : "flex-1"
              }`}
            >
              <div
                className={`text-xs font-semibold ${
                  darkMode ? "text-white" : "text-gray-700"
                } ${
                  data.length > 10 ? "text-center text-[10px]" : "text-center"
                }`}
              >
                {typeof item.value === "number"
                  ? money(item.value)
                  : item.value}
              </div>
              <div
                className={`chart-bar rounded-t-sm ${
                  data.length > 10 ? "w-4/5" : "w-5/6"
                }`}
                style={{
                  height: `${barHeight}px`,
                  background: item.color,
                  minHeight: `${minBarHeight}px`,
                }}
              />
              <div
                className={`text-xs text-center leading-tight ${
                  darkMode ? "text-white" : "text-gray-600"
                } ${data.length > 10 ? "text-[9px]" : "text-[10px]"}`}
              >
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
*/

function AppContent() {
  // Get global app state from context
  const { currentPage, setCurrentPage, darkMode, setDarkMode, coverageStats, showDiag, setShowDiag } = useAppState();
  
  // Get search state from context
  const {
    partQ, setPartQ,
    mfrQ, setMfrQ,
    modelQ, setModelQ,
    descQ, setDescQ,
    showAdvancedFilters, setShowAdvancedFilters,
    priceMin, setPriceMin,
    priceMax, setPriceMax,
    hasOnsiteFilter, setHasOnsiteFilter,
    compareMode, setCompareMode,
    selectedForCompare, setSelectedForCompare,
    showCompareModal, setShowCompareModal,
    selected, setSelected,
    capType, setCapType,
    accred, setAccred,
    svclevel, setSvclevel,
  } = useSearch();
  
  // Get lab selection state from context
  const {
    selectedServiceLevels, setSelectedServiceLevels,
    selectedServiceLevelSets, setSelectedServiceLevelSets,
    multiSelectMode, setMultiSelectMode,
    selectedPrices, setSelectedPrices,
    selectedLabs, setSelectedLabs,
    preferredLabFilter, setPreferredLabFilter,
    zipCodeFilter, setZipCodeFilter,
    preferredLab, setPreferredLab,
    transferLabs, setTransferLabs,
    tmsLabs, setTmsLabs,
    tmsVendors, setTmsVendors,
    tmsPrices, setTmsPrices,
    tmsTurnTimes, setTmsTurnTimes,
    labCapabilityOverrides, setLabCapabilityOverrides,
    capabilityModalOpen, setCapabilityModalOpen,
    capabilityModalData, setCapabilityModalData,
  } = useLabSelection();

  // Page C upload state
  const [uploadResults, setUploadResults] = useState<MatchResult[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [uploadWarnings, setUploadWarnings] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [selectedMatches, setSelectedMatches] = useState<Map<number, Unit>>(
    new Map()
  );
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [modalRowIndex, setModalRowIndex] = useState<number | null>(null);

  // Bulk selection state
  const [bulkSelectedRows, setBulkSelectedRows] = useState<Set<number>>(
    new Set()
  );

  // Unmatched items management
  const [excludedItems, setExcludedItems] = useState<Set<number>>(new Set());
  const [researchItems, setResearchItems] = useState<Set<number>>(new Set());
  const [manualSearchIndex, setManualSearchIndex] = useState<number | null>(
    null
  );

  // Debounce search inputs
  const dPart = useDebounce(partQ, 200);
  const dMfr = useDebounce(mfrQ, 200);
  const dModel = useDebounce(modelQ, 200);
  const dDesc = useDebounce(descQ, 200);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        if (e.key === "Escape") {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      // / - Focus search
      if (e.key === "/") {
        e.preventDefault();
        setCurrentPage("search");
        setTimeout(() => {
          const firstInput = document.querySelector(
            'input[placeholder="Part Number"]'
          ) as HTMLInputElement;
          firstInput?.focus();
        }, 100);
      }

      // Esc - Clear search or close modals
      if (e.key === "Escape") {
        if (modalRowIndex !== null) {
          setModalRowIndex(null);
        } else if (currentPage === "search") {
          setPartQ("");
          setMfrQ("");
          setModelQ("");
          setDescQ("");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    currentPage,
    modalRowIndex,
    setPartQ,
    setMfrQ,
    setModelQ,
    setDescQ,
    setModalRowIndex,
    setCurrentPage,
  ]);

  const tableMatches = useMemo(() => {
    const any = [dPart, dMfr, dModel, dDesc].some((v) => v.trim().length > 0);
    if (!any) return [] as Unit[];
    const list = searchUnits(dPart, dMfr, dModel, dDesc);
    return list.slice(0, 20);
  }, [dPart, dMfr, dModel, dDesc]);

  // File upload handler
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setUploadErrors([]);
    setUploadWarnings([]);
    setUploadResults([]);
    setExpandedRows(new Set());
    setSelectedMatches(new Map());
    setSelectedServiceLevels(new Map());
    setSelectedPrices(new Map());
    setSelectedLabs(new Map());

    // Reset TMS state
    setTmsLabs(new Set());
    setTmsVendors(new Map());
    setTmsPrices(new Map());
    setTmsTurnTimes(new Map());

    try {
      const content = await file.text();
      const parseResult = parseCustomerList(content);

      setUploadErrors(parseResult.errors);
      setUploadWarnings(parseResult.warnings);

      if (parseResult.items.length > 0) {
        const results = parseResult.items.map((item) =>
          createMatchResult(
            item,
            preferredLabFilter || undefined,
            zipCodeFilter || undefined
          )
        );
        setUploadResults(results);
        // Reset unmatched items state
        setExcludedItems(new Set());
        setResearchItems(new Set());

        // Process TMS requirements for each result
        const newTmsLabs = new Set<number>();
        const newTmsVendors = new Map<number, string>();
        const newTmsPrices = new Map<number, number>();
        const newTmsTurnTimes = new Map<number, number>();

        results.forEach((result, index) => {
          if (result.bestMatch) {
            const tmsRequired = isTMSRequired(result.bestMatch);
            if (tmsRequired) {
              const preferredVendor = selectPreferredTMSVendor(
                result.bestMatch
              );
              if (preferredVendor) {
                newTmsLabs.add(index);
                newTmsVendors.set(index, preferredVendor.vendor_name);
                newTmsPrices.set(index, preferredVendor.negotiated_price_usd);
                newTmsTurnTimes.set(
                  index,
                  preferredVendor.vendor_turn_time_days
                );

                // Auto-assign TMS vendor and settings
                setSelectedMatches((prev: Map<number, Unit>) =>
                  new Map(prev).set(index, result.bestMatch!)
                );
                setSelectedServiceLevels((prev: Map<number, number>) => new Map(prev).set(index, 1));
                setSelectedPrices((prev: Map<number, number>) =>
                  new Map(prev).set(index, preferredVendor.negotiated_price_usd)
                );
                setSelectedLabs((prev: Map<number, string>) =>
                  new Map(prev).set(
                    index,
                    `TMS - ${preferredVendor.vendor_name}`
                  )
                );
              }
            }
          }
        });

        setTmsLabs(newTmsLabs);
        setTmsVendors(newTmsVendors);
        setTmsPrices(newTmsPrices);
        setTmsTurnTimes(newTmsTurnTimes);
      }
    } catch (error) {
      setUploadErrors([
        `Error reading file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Navigation handlers
  const handleSelectUnit = (unit: Unit) => {
    setSelected(unit);
    setCurrentPage("details");
  };

  // Lab capability management functions
  const removeLabCapability = (labCode: string, partNumber: string) => {
    setLabCapabilityOverrides((prev: Map<string, Set<string>>) => {
      const newMap = new Map(prev);
      if (!newMap.has(labCode)) {
        newMap.set(labCode, new Set<string>());
      }
      // Add to override set to mark as "cannot do"
      const overrides = newMap.get(labCode) as Set<string>;
      overrides.add(`REMOVE:${partNumber}`);
      return newMap;
    });
  };

  const addLabCapability = (labCode: string, partNumber: string) => {
    setLabCapabilityOverrides((prev: Map<string, Set<string>>) => {
      const newMap = new Map(prev);
      if (!newMap.has(labCode)) {
        newMap.set(labCode, new Set<string>());
      }
      // Add capability override
      const overrides = newMap.get(labCode) as Set<string>;
      overrides.add(`ADD:${partNumber}`);
      // Remove any remove override if it exists
      overrides.delete(`REMOVE:${partNumber}`);
      return newMap;
    });
  };

  // Check if a lab can do a part number (considering overrides)
  const canLabDoPartNumber = (labCode: string, partNumber: string): boolean => {
    const overrides = labCapabilityOverrides.get(labCode);
    if (!overrides) return true; // No overrides, use normal matrix logic

    // Check if explicitly removed
    if (overrides.has(`REMOVE:${partNumber}`)) {
      return false;
    }

    // Check if explicitly added
    if (overrides.has(`ADD:${partNumber}`)) {
      return true;
    }

    return true; // No override, use normal matrix logic
  };

  // Get eligible labs with capability overrides applied
  const getEligibleLabsForUnitWithOverrides = (requirements: {
    partNumber: string;
    requiredCapabilityTags: any[];
  }) => {
    const originalLabs = getEligibleLabsForUnit(requirements);
    return originalLabs.filter((lab) =>
      canLabDoPartNumber(lab.labCode, requirements.partNumber)
    );
  };

  // Modal functions
  const openCapabilityModal = (
    rowIndex: number,
    partNumber: string,
    requiredCapabilityTags: any[]
  ) => {
    setCapabilityModalData({ rowIndex, partNumber, requiredCapabilityTags });
    setCapabilityModalOpen(true);
  };

  const closeCapabilityModal = () => {
    setCapabilityModalOpen(false);
    setCapabilityModalData(null);
  };

  // Unmatched items handlers
  const handleExcludeItem = (index: number) => {
    setExcludedItems((prev: Set<number>) => {
      const newSet = new Set(prev);
      newSet.add(index);
      return newSet;
    });
  };

  const handleSendToResearch = (index: number) => {
    const result = uploadResults[index];
    if (!result) return;

    // Create email body
    const subject = encodeURIComponent(
      `Research Request: ${result.customerItem.manufacturer} - ${result.customerItem.model}`
    );
    const body = encodeURIComponent(
      `Please research and add the following item to our database:\n\n` +
        `Manufacturer: ${result.customerItem.manufacturer}\n` +
        `Model: ${result.customerItem.model}\n` +
        `Row: ${result.customerItem.row}\n` +
        (result.customerItem.notes
          ? `Notes: ${result.customerItem.notes}\n`
          : "") +
        `\n\nThis item could not be automatically matched.`
    );

    // Open email client
    window.location.href = `mailto:research@transcat.com?subject=${subject}&body=${body}`;

    // Mark as sent to research
    setResearchItems((prev: Set<number>) => {
      const newSet = new Set(prev);
      newSet.add(index);
      return newSet;
    });
  };

  const handleResetAll = () => {
    // Clear all upload-related state
    setUploadResults([]);
    setUploadErrors([]);
    setUploadWarnings([]);
    setExpandedRows(new Set());
    setSelectedMatches(new Map());
    setSelectedServiceLevels(new Map());
    setSelectedPrices(new Map());
    setSelectedLabs(new Map());
    setExcludedItems(new Set());
    setResearchItems(new Set());
    setManualSearchIndex(null);
    setBulkSelectedRows(new Set());
    setModalRowIndex(null);

    // Reset transfer lab tracking
    setPreferredLab("");
    setTransferLabs(new Set());

    // Reset lab capability overrides
    setLabCapabilityOverrides(new Map());

    // Reset capability modal
    setCapabilityModalOpen(false);
    setCapabilityModalData(null);

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleManualMatch = (index: number) => {
    // Open manual search modal for this item
    setManualSearchIndex(index);
  };

  const handleManualMatchSelect = (index: number, unit: Unit) => {
    // Assign the manually selected unit
    selectMatch(index, unit);
    setManualSearchIndex(null);
  };

  // Upload results helpers
  const toggleRowExpansion = (rowIndex: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowIndex)) {
      newExpanded.delete(rowIndex);
    } else {
      newExpanded.add(rowIndex);
    }
    setExpandedRows(newExpanded);
  };

  const selectMatch = (rowIndex: number, unit: Unit) => {
    const newSelected = new Map(selectedMatches);
    newSelected.set(rowIndex, unit);
    setSelectedMatches(newSelected);
  };

  const getSelectedMatch = (rowIndex: number): Unit | undefined => {
    return selectedMatches.get(rowIndex) || uploadResults[rowIndex]?.bestMatch;
  };

  // Smart wrapper functions for backward compatibility
  const getSelectedServiceLevels = (rowIndex: number): Set<number> => {
    if (multiSelectMode.get(rowIndex)) {
      return selectedServiceLevelSets.get(rowIndex) || new Set([1]);
    } else {
      const singleLevel =
        selectedServiceLevels.get(rowIndex) ||
        uploadResults[rowIndex]?.customerItem.service_level ||
        1;
      return new Set([singleLevel]);
    }
  };

  const getSelectedServiceLevel = (rowIndex: number): number => {
    const levels = getSelectedServiceLevels(rowIndex);
    return Math.min(...levels); // Return the lowest level as primary
  };

  const getPrimaryServiceLevel = (rowIndex: number): number => {
    return getSelectedServiceLevel(rowIndex);
  };

  const getSelectedPrice = (rowIndex: number): number | null => {
    return selectedPrices.get(rowIndex) || null;
  };

  const getSelectedLab = (rowIndex: number): string => {
    return selectedLabs.get(rowIndex) || "";
  };

  const updateServiceLevel = (rowIndex: number, level: number) => {
    // Switch to single-select mode
    setMultiSelectMode((prev: Map<number, boolean>) => {
      const newMode = new Map(prev);
      newMode.set(rowIndex, false);
      return newMode;
    });

    const newSelected = new Map(selectedServiceLevels);
    newSelected.set(rowIndex, level);
    setSelectedServiceLevels(newSelected);

    // Clear multi-select data
    setSelectedServiceLevelSets((prev: Map<number, Set<number>>) => {
      const newSets = new Map(prev);
      newSets.delete(rowIndex);
      return newSets;
    });

    // Clear price selection when service level changes
    const newPrices = new Map(selectedPrices);
    newPrices.delete(rowIndex);
    setSelectedPrices(newPrices);
  };

  // New multi-select service level functions
  const updateServiceLevels = (rowIndex: number, levels: Set<number>) => {
    // Switch to multi-select mode
    setMultiSelectMode((prev: Map<number, boolean>) => {
      const newMode = new Map(prev);
      newMode.set(rowIndex, true);
      return newMode;
    });

    setSelectedServiceLevelSets((prev: Map<number, Set<number>>) => {
      const newSets = new Map(prev);
      newSets.set(rowIndex, levels);
      return newSets;
    });

    // Clear single-select data
    setSelectedServiceLevels((prev: Map<number, number>) => {
      const newSelected = new Map(prev);
      newSelected.delete(rowIndex);
      return newSelected;
    });

    // Clear price selection when service levels change
    const newPrices = new Map(selectedPrices);
    newPrices.delete(rowIndex);
    setSelectedPrices(newPrices);
  };

  const toggleServiceLevel = (rowIndex: number, level: number) => {
    const currentLevels = getSelectedServiceLevels(rowIndex);
    const newLevels = new Set(currentLevels);

    if (newLevels.has(level)) {
      newLevels.delete(level);
      // Ensure at least one level is selected
      if (newLevels.size === 0) {
        newLevels.add(1);
      }
    } else {
      newLevels.add(level);
    }

    updateServiceLevels(rowIndex, newLevels);
  };

  const toggleMultiSelectMode = (rowIndex: number) => {
    const isMultiSelect = multiSelectMode.get(rowIndex);
    const currentLevels = getSelectedServiceLevels(rowIndex);

    if (isMultiSelect) {
      // Switch to single-select mode
      const primaryLevel = getPrimaryServiceLevel(rowIndex);
      updateServiceLevel(rowIndex, primaryLevel);
    } else {
      // Switch to multi-select mode
      updateServiceLevels(rowIndex, currentLevels);
    }
  };

  const updatePrice = (rowIndex: number, price: number) => {
    const newSelected = new Map(selectedPrices);
    newSelected.set(rowIndex, price);
    setSelectedPrices(newSelected);
  };

  const updateLab = (rowIndex: number, lab: string) => {
    const newSelected = new Map(selectedLabs);
    newSelected.set(rowIndex, lab);
    setSelectedLabs(newSelected);

    // Update transfer labs if we have a preferred lab set
    if (preferredLab) {
      const transferRows = identifyTransferLabs(
        preferredLab,
        newSelected as Map<number, string>
      );
      setTransferLabs(transferRows);
    }
  };

  // Auto-select the first (prioritized) lab for each result
  const autoSelectPrioritizedLabs = () => {
    const newSelected = new Map(selectedLabs);
    uploadResults.forEach((result, index) => {
      if (result.labs.length > 0 && !newSelected.has(index)) {
        newSelected.set(index, result.labs[0]); // First lab is prioritized
      }
    });
    setSelectedLabs(newSelected);
  };

  // Refresh results with updated lab filters
  const refreshLabPriorities = () => {
    if (uploadResults.length === 0) return;

    const refreshedResults = uploadResults.map((result) =>
      createMatchResult(
        result.customerItem,
        preferredLabFilter || undefined,
        zipCodeFilter || undefined
      )
    );
    setUploadResults(refreshedResults);

    // Clear existing lab selections so they can be re-selected with new priorities
    setSelectedLabs(new Map());
  };

  // Bulk selection handlers
  const toggleBulkSelect = (rowIndex: number) => {
    const newSelected = new Set(bulkSelectedRows);
    if (newSelected.has(rowIndex)) {
      newSelected.delete(rowIndex);
    } else {
      newSelected.add(rowIndex);
    }
    setBulkSelectedRows(newSelected);
  };

  const selectAllRows = () => {
    // Select rows that have matches OR have been manually matched
    const rowsWithMatches = new Set(
      uploadResults
        .map((result, i) => ({ result, index: i }))
        .filter(
          ({ result, index }) =>
            result.matchedUnits.length > 0 || selectedMatches.has(index)
        )
        .map(({ index }) => index)
    );
    setBulkSelectedRows(rowsWithMatches);
  };

  const clearBulkSelection = () => {
    setBulkSelectedRows(new Set());
  };

  // Helper function to determine which labs are transfer labs based on preferred lab
  const identifyTransferLabs = (
    preferredLabName: string,
    allSelectedLabs: Map<number, string>
  ) => {
    const transferRows = new Set<number>();

    allSelectedLabs.forEach((selectedLab, rowIndex) => {
      // If the selected lab is different from the preferred lab, it's a transfer lab
      // But exclude TMS items from being marked as transfer labs
      if (selectedLab !== preferredLabName && !tmsLabs.has(rowIndex)) {
        transferRows.add(rowIndex);
      }
    });

    return transferRows;
  };

  const applyBulkLab = (lab: string) => {
    const newLabs = new Map(selectedLabs);
    const selectedLabLocation = LAB_LOCATIONS.find(
      (loc: LabLocation) => loc.name === lab
    );

    if (!selectedLabLocation) {
      alert(`Could not find location data for ${lab}`);
      return;
    }

    let directApplied = 0;
    let fallbackApplied = 0;
    let skipped = 0;
    const fallbackDetails: Record<string, number> = {}; // Track which fallback labs were used
    const skippedItems: string[] = [];

    bulkSelectedRows.forEach((rowIndex) => {
      const selectedMatch = getSelectedMatch(rowIndex);
      if (!selectedMatch) {
        skipped++;
        skippedItems.push(
          `Row ${uploadResults[rowIndex]?.customerItem.row} (no match)`
        );
        return;
      }

      // Get all eligible labs for this part number
      const eligibleLabs = getEligibleLabsForUnit({
        partNumber: selectedMatch.part_number,
        requiredCapabilityTags: selectedMatch.requiredCapabilityTags,
      });

      // Check if preferred lab has capability
      const labHasCapability = eligibleLabs.some((l) => l.labName === lab);

      if (labHasCapability) {
        // Direct assignment - preferred lab has capability
        newLabs.set(rowIndex, lab);
        directApplied++;
      } else {
        // Preferred lab doesn't have capability - find closest alternative
        const labsWithDistances = eligibleLabs
          .map((eligibleLab) => {
            const labLocation = LAB_LOCATIONS.find(
              (loc: LabLocation) => loc.name === eligibleLab.labName
            );
            if (!labLocation) return null;

            const distance = calculateDistance(
              selectedLabLocation.lat,
              selectedLabLocation.lng,
              labLocation.lat,
              labLocation.lng
            );

            return { labName: eligibleLab.labName, distance };
          })
          .filter(Boolean) as { labName: string; distance: number }[];

        if (labsWithDistances.length > 0) {
          // Find closest lab with capability
          const closestLab = labsWithDistances.reduce((best, current) =>
            current.distance < best.distance ? current : best
          );

          newLabs.set(rowIndex, closestLab.labName);
          fallbackApplied++;
          fallbackDetails[closestLab.labName] =
            (fallbackDetails[closestLab.labName] || 0) + 1;
        } else {
          // No labs have capability for this item
          skipped++;
          skippedItems.push(
            `Row ${uploadResults[rowIndex]?.customerItem.row} (${selectedMatch.part_number})`
          );
        }
      }
    });

    setSelectedLabs(newLabs);

    // Update preferred lab and identify transfer labs
    setPreferredLab(lab);
    const transferRows = identifyTransferLabs(
      lab,
      newLabs as Map<number, string>
    );
    setTransferLabs(transferRows);

    // Build detailed feedback message
    let message = "";

    if (directApplied > 0) {
      message += `âœ“ Applied ${lab} to ${directApplied} item(s)\n`;
    }

    if (fallbackApplied > 0) {
      message += `\nðŸ”„ Used proximity fallback for ${fallbackApplied} item(s):\n`;
      Object.entries(fallbackDetails)
        .sort((a, b) => b[1] - a[1]) // Sort by count descending
        .forEach(([fallbackLab, count]) => {
          message += `  â€¢ ${fallbackLab}: ${count} item(s) (closest alternative to ${lab})\n`;
        });
    }

    if (skipped > 0) {
      message += `\nâš  Skipped ${skipped} item(s) (no capable labs):\n`;
      message += skippedItems.slice(0, 5).join("\n");
      if (skippedItems.length > 5) {
        message += `\n  ... and ${skippedItems.length - 5} more`;
      }
    }

    if (message) {
      alert(message);
    }
  };

  const applyBulkServiceLevel = (level: number) => {
    const newLevels = new Map(selectedServiceLevels);
    const newMultiSelectMode = new Map(multiSelectMode);

    bulkSelectedRows.forEach((rowIndex) => {
      // Apply single service level to all selected rows
      newLevels.set(rowIndex, level);
      newMultiSelectMode.set(rowIndex, false);
    });

    setSelectedServiceLevels(newLevels);
    setMultiSelectMode(newMultiSelectMode);

    // Clear multi-select data for bulk-selected rows
    setSelectedServiceLevelSets((prev: Map<number, Set<number>>) => {
      const newSets = new Map(prev);
      bulkSelectedRows.forEach((rowIndex) => {
        newSets.delete(rowIndex);
      });
      return newSets;
    });

    // Clear prices when changing service levels
    const newPrices = new Map(selectedPrices);
    bulkSelectedRows.forEach((rowIndex) => {
      newPrices.delete(rowIndex);
    });
    setSelectedPrices(newPrices);
  };

  const applyBulkBasePrice = (useBasePrice: boolean) => {
    const newPrices = new Map(selectedPrices);
    const newLabs = new Map(selectedLabs);
    const newMatches = new Map(selectedMatches);

    bulkSelectedRows.forEach((rowIndex) => {
      const selectedMatch = getSelectedMatch(rowIndex);

      if (selectedMatch) {
        // Ensure the match is stored in selectedMatches
        newMatches.set(rowIndex, selectedMatch);

        const pricing = generatePricingRows(selectedMatch.pricing);
        const serviceLevel = getSelectedServiceLevel(rowIndex);
        const levelPricing = pricing.find(
          (p) => p.service_level === serviceLevel
        );

        if (levelPricing) {
          const price = useBasePrice
            ? levelPricing.base_price_usd
            : levelPricing.base_plus_options_usd;
          newPrices.set(rowIndex, price);

          // Auto-select a lab if none is selected
          if (!selectedLabs.has(rowIndex)) {
            const eligibleLabs = getEligibleLabsForUnit({
              partNumber: selectedMatch.part_number,
              requiredCapabilityTags: selectedMatch.requiredCapabilityTags,
            });

            if (eligibleLabs.length > 0) {
              // Select the first available lab
              const firstLab = eligibleLabs[0].labName;
              newLabs.set(rowIndex, firstLab);
            }
          }
        }
      }
    });

    setSelectedPrices(newPrices);
    setSelectedLabs(newLabs);
    setSelectedMatches(newMatches);
  };

  // Auto-optimize handler
  const handleOptimize = (strategy: OptimizationStrategy) => {
    const optimized = optimizeSelections(
      uploadResults,
      selectedMatches,
      strategy
    );
    setSelectedMatches(optimized.matches);
    setSelectedLabs(optimized.labs);
    setSelectedPrices(optimized.prices);
    setSelectedServiceLevels(optimized.serviceLevels);

    // Clear multi-select data when optimizing (optimization works with single levels)
    setSelectedServiceLevelSets(new Map());
    setMultiSelectMode(new Map());
  };

  // Save/Load quote sessions
  const saveQuoteSession = () => {
    const session = {
      results: uploadResults,
      selectedMatches: Array.from(selectedMatches.entries()),
      selectedLabs: Array.from(selectedLabs.entries()),
      selectedPrices: Array.from(selectedPrices.entries()),
      selectedServiceLevels: Array.from(selectedServiceLevels.entries()),
      selectedServiceLevelSets: Array.from(
        selectedServiceLevelSets.entries()
      ).map((entry) => {
        const [key, value] = entry as [number, Set<number>];
        return [key, Array.from(value)];
      }),
      multiSelectMode: Array.from(multiSelectMode.entries()),
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem("quoteSession", JSON.stringify(session));
    alert("Quote session saved successfully!");
  };

  const loadQuoteSession = () => {
    const savedSession = localStorage.getItem("quoteSession");
    if (!savedSession) {
      alert("No saved quote session found.");
      return;
    }
    try {
      const session = JSON.parse(savedSession);
      setUploadResults(session.results);
      setSelectedMatches(new Map(session.selectedMatches));
      setSelectedLabs(new Map(session.selectedLabs));
      setSelectedPrices(new Map(session.selectedPrices));
      setSelectedServiceLevels(new Map(session.selectedServiceLevels));
      setSelectedServiceLevelSets(
        new Map(
          (session.selectedServiceLevelSets || []).map(
            ([k, v]: [number, number[]]) => [k, new Set(v)]
          )
        )
      );
      setMultiSelectMode(new Map(session.multiSelectMode || []));
      alert(
        `Quote session loaded from ${new Date(
          session.timestamp
        ).toLocaleString()}`
      );
    } catch (error) {
      alert("Error loading quote session.");
    }
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        darkMode
          ? "bg-[#0a0a0a]"
          : "bg-gradient-to-br from-gray-50 via-white to-gray-50"
      }`}
    >
      {/* Modern Glassmorphism Header */}
      <header
        className={`sticky top-0 z-50 backdrop-blur-glass border-b shadow-sm transition-colors duration-300 ${
          darkMode
            ? "bg-[#1c1c1e]/90 border-white/10"
            : "bg-white/70 border-black/5"
        }`}
      >
        <div className="mx-auto max-w-7xl px-6">
          {/* Top Bar */}
          <div className="flex items-center justify-between py-5">
            <div className="animate-fade-in">
              <h1
                className={`text-3xl font-bold tracking-tight bg-clip-text text-transparent ${
                  darkMode
                    ? "bg-gradient-to-r from-blue-400 to-indigo-400"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600"
                }`}
              >
                Calibration Matrix
              </h1>
              <p
                className={`text-sm mt-1 font-medium ${
                  darkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {currentPage === "search" &&
                  "Search and discover calibration units"}
                {currentPage === "details" &&
                  "Capabilities and pricing insights"}
                {currentPage === "upload" && "Intelligent bulk matching"}
              </p>
            </div>
            <div className="flex items-center gap-3 animate-slide-in-right">
              <button
                onClick={() => setDarkMode((v: boolean) => !v)}
                className={`w-10 h-10 flex items-center justify-center rounded-full border hover:shadow-md transition-all duration-200 active:scale-95 ${
                  darkMode
                    ? "bg-[#2c2c2e] border-white/10 hover:bg-[#3c3c3e]"
                    : "bg-white/80 border-black/5 hover:bg-white"
                }`}
                title="Toggle dark mode"
              >
                <span className="text-lg">{darkMode ? "â˜€ï¸" : "ðŸŒ™"}</span>
              </button>
              <button
                onClick={() => setShowDiag((v: boolean) => !v)}
                className={`px-4 py-2 text-xs font-medium rounded-full border hover:shadow-md transition-all duration-200 active:scale-95 ${
                  darkMode
                    ? "bg-[#2c2c2e] border-white/10 text-gray-300 hover:bg-[#3c3c3e] hover:text-white"
                    : "bg-white/80 border-black/5 text-gray-600 hover:bg-white hover:text-gray-900"
                }`}
              >
                {showDiag ? "Hide" : "Show"} diagnostics
              </button>
            </div>
          </div>

          {/* Modern Tab Navigation */}
          <div className="flex gap-2 pb-4">
            <button
              onClick={() => setCurrentPage("search")}
              className={`tab-btn ${
                currentPage === "search" ? "tab-btn-active" : "tab-btn-inactive"
              }`}
            >
              <span className="mr-2">ðŸ”</span>
              Search
            </button>
            <button
              onClick={() => selected && setCurrentPage("details")}
              disabled={!selected}
              className={`tab-btn ${
                currentPage === "details"
                  ? "tab-btn-active"
                  : selected
                  ? "tab-btn-inactive"
                  : "text-gray-300 cursor-not-allowed"
              }`}
            >
              <span className="mr-2">ðŸ“Š</span>
              Details{" "}
              {selected && (
                <span className="ml-1 text-xs opacity-60">
                  ({selected.part_number})
                </span>
              )}
            </button>
            <button
              onClick={() => setCurrentPage("upload")}
              className={`tab-btn ${
                currentPage === "upload" ? "tab-btn-active" : "tab-btn-inactive"
              }`}
            >
              <span className="mr-2">ðŸ“¤</span>
              Bulk Upload
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {currentPage === "search" && (
          <>
            {/* Modern Coverage Statistics */}
            {coverageStats && (
              <div className="mb-8 glass-card p-6 animate-fade-in">
                <div className="flex items-center justify-between mb-5">
                  <h3
                    className={`text-lg font-semibold ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Coverage Analytics
                  </h3>
                  <div className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-semibold rounded-full shadow-md">
                    {(
                      (coverageStats.unitsWithLabs / coverageStats.totalUnits) *
                      100
                    ).toFixed(1)}
                    % coverage
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="stat-card group hover:shadow-lg transition-all duration-300">
                    <div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                      Total Units
                    </div>
                    <div className="text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {coverageStats.totalUnits}
                    </div>
                  </div>
                  <div className="stat-card bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 group hover:shadow-lg transition-all duration-300">
                    <div className="text-xs font-medium text-green-700 mb-2 uppercase tracking-wide">
                      With Labs
                    </div>
                    <div className="text-3xl font-bold text-green-600 group-hover:scale-110 transition-transform">
                      {coverageStats.unitsWithLabs}
                    </div>
                  </div>
                  <div className="stat-card bg-gradient-to-br from-red-50 to-rose-50 border-red-200 group hover:shadow-lg transition-all duration-300">
                    <div className="text-xs font-medium text-red-700 mb-2 uppercase tracking-wide">
                      No Labs
                    </div>
                    <div className="text-3xl font-bold text-red-600 group-hover:scale-110 transition-transform">
                      {coverageStats.unitsWithoutLabs}
                    </div>
                  </div>
                  <div className="stat-card bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200 group hover:shadow-lg transition-all duration-300">
                    <div className="text-xs font-medium text-purple-700 mb-2 uppercase tracking-wide">
                      Avg Labs/Unit
                    </div>
                    <div className="text-3xl font-bold text-purple-600 group-hover:scale-110 transition-transform">
                      {coverageStats.avgLabsPerUnit.toFixed(1)}
                    </div>
                  </div>
                  <div className="stat-card bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 group hover:shadow-lg transition-all duration-300">
                    <div className="text-xs font-medium text-blue-700 mb-2 uppercase tracking-wide">
                      Total Standards
                    </div>
                    <div className="text-3xl font-bold text-blue-600 group-hover:scale-110 transition-transform">
                      {coverageStats.totalStandards}
                    </div>
                  </div>
                </div>
                {coverageStats.uncoveredPNs.length > 0 && (
                  <details className="mt-5 group">
                    <summary className="text-sm text-red-600 cursor-pointer hover:text-red-700 font-medium list-none flex items-center gap-2">
                      <span className="w-6 h-6 flex items-center justify-center bg-red-100 rounded-full text-xs group-open:rotate-90 transition-transform">
                        â–¶
                      </span>
                      View {coverageStats.uncoveredPNs.length} uncovered part
                      numbers
                    </summary>
                    <div className="mt-3 p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-red-200 max-h-48 overflow-auto scrollbar-modern">
                      <div className="text-xs font-mono text-gray-600 space-y-1">
                        {coverageStats.uncoveredPNs.map((pn) => (
                          <div
                            key={pn}
                            className="hover:text-gray-900 transition-colors"
                          >
                            {pn}
                          </div>
                        ))}
                      </div>
                    </div>
                  </details>
                )}
              </div>
            )}

            {/* Modern Search Interface */}
            <div className="glass-card p-6 animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">ðŸ”</span>
                <h2
                  className={`text-lg font-semibold ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  Search Calibration Units
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  value={partQ}
                  onChange={(e) => setPartQ(e.target.value)}
                  placeholder="Part Number"
                  className="input-modern text-sm placeholder:text-gray-400"
                />
                <input
                  value={mfrQ}
                  onChange={(e) => setMfrQ(e.target.value)}
                  placeholder="Manufacturer"
                  className="input-modern text-sm placeholder:text-gray-400"
                />
                <input
                  value={modelQ}
                  onChange={(e) => setModelQ(e.target.value)}
                  placeholder="Model"
                  className="input-modern text-sm placeholder:text-gray-400"
                />
                <input
                  value={descQ}
                  onChange={(e) => setDescQ(e.target.value)}
                  placeholder="Description"
                  className="input-modern text-sm placeholder:text-gray-400"
                />
              </div>
              <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
                <p className="text-xs text-gray-500 font-medium">
                  {!compareMode
                    ? "Type to search â€¢ Click a row for details"
                    : "Select units to compare"}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setCompareMode(!compareMode);
                      setSelectedForCompare(new Set());
                    }}
                    className={`text-xs font-medium px-4 py-2 rounded-full transition-all duration-200 ${
                      compareMode
                        ? "bg-blue-500 text-white shadow-md"
                        : "bg-white/80 text-blue-600 border border-blue-200 hover:bg-blue-50"
                    }`}
                  >
                    {compareMode ? "âœ“ Compare Mode" : "Compare Units"}
                  </button>
                  <button
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className="text-xs font-medium px-4 py-2 rounded-full bg-white/80 text-gray-700 border border-gray-200 hover:bg-white hover:shadow-md transition-all duration-200"
                  >
                    {showAdvancedFilters ? "Hide" : "Show"} Advanced
                  </button>
                </div>
              </div>

              {/* Advanced Filters Panel */}
              {showAdvancedFilters && (
                <div className="mt-5 p-5 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 animate-fade-in">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg">âš™ï¸</span>
                    <h3 className="text-sm font-semibold text-gray-900">
                      Advanced Filters
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                        Min Price ($)
                      </label>
                      <input
                        type="number"
                        value={priceMin}
                        onChange={(e) => setPriceMin(e.target.value)}
                        placeholder="0"
                        className="input-modern text-sm w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                        Max Price ($)
                      </label>
                      <input
                        type="number"
                        value={priceMax}
                        onChange={(e) => setPriceMax(e.target.value)}
                        placeholder="10000"
                        className="input-modern text-sm w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                        Onsite Capable
                      </label>
                      <select
                        value={hasOnsiteFilter}
                        onChange={(e) => setHasOnsiteFilter(e.target.value)}
                        className="select-modern text-sm w-full"
                      >
                        <option value="all">All Units</option>
                        <option value="yes">Onsite Only</option>
                        <option value="no">Lab Only</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setPriceMin("");
                      setPriceMax("");
                      setHasOnsiteFilter("all");
                    }}
                    className="mt-4 text-xs font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-white transition-all duration-200"
                  >
                    âœ• Clear Filters
                  </button>
                </div>
              )}
            </div>

            {/* Modern Results Table */}
            <div className="mt-6 glass-card overflow-hidden">
              {compareMode && selectedForCompare.size > 0 && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">
                    âœ“ {selectedForCompare.size} unit
                    {selectedForCompare.size !== 1 ? "s" : ""} selected
                  </span>
                  <button
                    onClick={() => setShowCompareModal(true)}
                    className="btn-primary text-xs py-2 px-4"
                  >
                    View Comparison â†’
                  </button>
                </div>
              )}
              <div className="overflow-x-auto scrollbar-modern">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr className="text-left text-gray-600 font-semibold uppercase text-xs tracking-wide">
                      {compareMode && <th className="py-4 px-4 w-12"></th>}
                      <th className="py-4 px-4">Part Number</th>
                      <th className="py-4 px-4">Model</th>
                      <th className="py-4 px-4">Manufacturer</th>
                      <th className="py-4 px-4">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tableMatches.length === 0 ? (
                      <tr>
                        <td
                          className="py-16 px-4 text-center"
                          colSpan={compareMode ? 5 : 4}
                        >
                          <div className="flex flex-col items-center gap-4 animate-fade-in">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                              <span className="text-4xl">ðŸ”</span>
                            </div>
                            <div className="text-xl font-semibold text-gray-900">
                              Start Your Search
                            </div>
                            <div className="text-sm text-gray-600 max-w-md bg-gray-50 rounded-xl p-4">
                              <p className="mb-3 font-medium text-gray-700">
                                Enter any combination of:
                              </p>
                              <ul className="space-y-2 text-left">
                                <li className="flex items-center gap-2">
                                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                  <strong>Part Number</strong>{" "}
                                  <span className="text-gray-400">
                                    (e.g., PN-FLK-87V-0002)
                                  </span>
                                </li>
                                <li className="flex items-center gap-2">
                                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                  <strong>Manufacturer</strong>{" "}
                                  <span className="text-gray-400">
                                    (e.g., Fluke, Keysight)
                                  </span>
                                </li>
                                <li className="flex items-center gap-2">
                                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                  <strong>Model</strong>{" "}
                                  <span className="text-gray-400">
                                    (e.g., 87V, 34461A)
                                  </span>
                                </li>
                                <li className="flex items-center gap-2">
                                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                  <strong>Description</strong>{" "}
                                  <span className="text-gray-400">
                                    keywords
                                  </span>
                                </li>
                              </ul>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      tableMatches.map((u: Unit) => (
                        <tr
                          key={u.id}
                          className="hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-transparent cursor-pointer transition-all duration-200 group"
                          onClick={() => !compareMode && handleSelectUnit(u)}
                        >
                          {compareMode && (
                            <td
                              className="py-4 px-4"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={selectedForCompare.has(u.id)}
                                onChange={() => {
                                  const newSet = new Set(selectedForCompare);
                                  if (newSet.has(u.id)) {
                                    newSet.delete(u.id);
                                  } else {
                                    newSet.add(u.id);
                                  }
                                  setSelectedForCompare(newSet);
                                }}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                              />
                            </td>
                          )}
                          <td
                            className={`py-4 px-4 font-semibold group-hover:text-blue-600 transition-colors ${
                              darkMode ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {u.part_number}
                          </td>
                          <td
                            className={`py-4 px-4 ${
                              darkMode ? "text-gray-200" : "text-gray-700"
                            }`}
                          >
                            {u.model_number}
                          </td>
                          <td
                            className={`py-4 px-4 ${
                              darkMode ? "text-gray-200" : "text-gray-700"
                            }`}
                          >
                            {u.manufacturer}
                          </td>
                          <td
                            className={`py-4 px-4 ${
                              darkMode ? "text-gray-300" : "text-gray-600"
                            }`}
                          >
                            {u.description}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {tableMatches.length > 0 && (
                <div className="text-xs text-gray-500 px-4 py-3 bg-gray-50 border-t border-gray-100 font-medium">
                  Showing {tableMatches.length} result
                  {tableMatches.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>

            {/* Comparison Modal */}
            {showCompareModal && (
              <ComparisonModal
                selectedIds={selectedForCompare}
                allUnits={tableMatches}
                onClose={() => setShowCompareModal(false)}
              />
            )}
          </>
        )}

        {currentPage === "details" && selected && (
          <>
            <DetailView
              unit={selected}
              capType={capType}
              setCapType={setCapType}
              accred={accred}
              setAccred={setAccred}
              svclevel={svclevel}
              setSvclevel={setSvclevel}
              darkMode={darkMode}
            />
          </>
        )}

        {currentPage === "upload" && (
          <UploadPage
            fileInputRef={fileInputRef}
            onFileUpload={handleFileUpload}
            isProcessing={isProcessing}
            results={uploadResults}
            errors={uploadErrors}
            warnings={uploadWarnings}
            expandedRows={expandedRows}
            selectedMatches={selectedMatches}
            onToggleRowExpansion={toggleRowExpansion}
            onSelectMatch={selectMatch}
            getSelectedMatch={getSelectedMatch}
            getSelectedServiceLevel={getSelectedServiceLevel}
            getSelectedServiceLevels={getSelectedServiceLevels}
            getSelectedPrice={getSelectedPrice}
            getSelectedLab={getSelectedLab}
            updateServiceLevel={updateServiceLevel}
            updateServiceLevels={updateServiceLevels}
            toggleServiceLevel={toggleServiceLevel}
            toggleMultiSelectMode={toggleMultiSelectMode}
            multiSelectMode={multiSelectMode}
            updatePrice={updatePrice}
            updateLab={updateLab}
            preferredLabFilter={preferredLabFilter}
            setPreferredLabFilter={setPreferredLabFilter}
            zipCodeFilter={zipCodeFilter}
            setZipCodeFilter={setZipCodeFilter}
            autoSelectPrioritizedLabs={autoSelectPrioritizedLabs}
            refreshLabPriorities={refreshLabPriorities}
            modalRowIndex={modalRowIndex}
            setModalRowIndex={setModalRowIndex}
            bulkSelectedRows={bulkSelectedRows}
            toggleBulkSelect={toggleBulkSelect}
            selectAllRows={selectAllRows}
            clearBulkSelection={clearBulkSelection}
            applyBulkLab={applyBulkLab}
            applyBulkServiceLevel={applyBulkServiceLevel}
            applyBulkBasePrice={applyBulkBasePrice}
            handleOptimize={handleOptimize}
            saveQuoteSession={saveQuoteSession}
            loadQuoteSession={loadQuoteSession}
            selectedPrices={selectedPrices}
            selectedLabs={selectedLabs}
            preferredLab={preferredLab}
            transferLabs={transferLabs}
            darkMode={darkMode}
            removeLabCapability={removeLabCapability}
            addLabCapability={addLabCapability}
            getEligibleLabsForUnitWithOverrides={
              getEligibleLabsForUnitWithOverrides
            }
            openCapabilityModal={openCapabilityModal}
            capabilityModalOpen={capabilityModalOpen}
            capabilityModalData={capabilityModalData}
            closeCapabilityModal={closeCapabilityModal}
            labCapabilityOverrides={labCapabilityOverrides}
            excludedItems={excludedItems}
            researchItems={researchItems}
            onExcludeItem={handleExcludeItem}
            onSendToResearch={handleSendToResearch}
            onManualMatch={handleManualMatch}
            manualSearchIndex={manualSearchIndex}
            onManualMatchSelect={handleManualMatchSelect}
            onCloseManualSearch={() => setManualSearchIndex(null)}
            onResetAll={handleResetAll}
            tmsLabs={tmsLabs}
            tmsVendors={tmsVendors}
            tmsPrices={tmsPrices}
            tmsTurnTimes={tmsTurnTimes}
          />
        )}

        {/* Data Export Section */}
        <div className="mt-10 text-sm text-slate-600 space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-medium">Service Level Descriptions</span>
            <a
              className="underline"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                exportServiceLevelText();
              }}
            >
              Download .txt
            </a>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">All Units Data</span>
            <a
              className="underline"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                exportAllUnitsData();
              }}
            >
              Download .tsv
            </a>
            <span className="text-xs text-slate-500">
              (Includes all part numbers, manufacturers, models, and
              capabilities)
            </span>
          </div>
        </div>

        {showDiag && <Diagnostics tests={runDiagnostics()} />}
      </main>

      <footer className="py-10 text-center text-xs text-slate-500">
        POC only â€¢ Mock data â€¢ Ready to wire to real endpoints
      </footer>
    </div>
  );
}



// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Main App Component - Wraps AppContent with Context Providers
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function App() {
  return (
    <AppStateProvider>
      <SearchProvider>
        <LabSelectionProvider>
          <AppContent />
        </LabSelectionProvider>
      </SearchProvider>
    </AppStateProvider>
  );
}
