import { useState, useRef } from "react";
import { 
  parseCustomerList, 
  createMatchResult,
  getEligibleLabsForUnit,
  optimizeSelections,
  calculateDistance,
} from "../";
import type { 
  Unit,
  MatchResult, 
  OptimizationStrategy,
  LabLocation,
} from "../types";
import { LAB_LOCATIONS, generatePricingRows } from "../";
import {
  isTMSRequired,
  selectPreferredTMSVendor,
} from "../";

// ─────────────────────────────────────────────────────────────────────────────
// useUploadHandlers Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useUploadHandlers(
  preferredLabFilter: string,
  zipCodeFilter: string,
  setPreferredLab: (lab: string) => void
) {
  // Upload state
  const [uploadResults, setUploadResults] = useState<MatchResult[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [uploadWarnings, setUploadWarnings] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [selectedMatches, setSelectedMatches] = useState<Map<number, Unit>>(new Map());
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [modalRowIndex, setModalRowIndex] = useState<number | null>(null);

  // Bulk selection state
  const [bulkSelectedRows, setBulkSelectedRows] = useState<Set<number>>(new Set());

  // Unmatched items management
  const [excludedItems, setExcludedItems] = useState<Set<number>>(new Set());
  const [researchItems, setResearchItems] = useState<Set<number>>(new Set());
  const [manualSearchIndex, setManualSearchIndex] = useState<number | null>(null);

  // Service level management state (passed from LabSelectionContext)
  // These will be accessed via props
  const [selectedServiceLevels, setSelectedServiceLevels] = useState<Map<number, number>>(new Map());
  const [selectedServiceLevelSets, setSelectedServiceLevelSets] = useState<Map<number, Set<number>>>(new Map());
  const [multiSelectMode, setMultiSelectMode] = useState<Map<number, boolean>>(new Map());
  const [selectedPrices, setSelectedPrices] = useState<Map<number, number>>(new Map());
  const [selectedLabs, setSelectedLabs] = useState<Map<number, string>>(new Map());
  const [transferLabs, setTransferLabs] = useState<Set<number>>(new Set());
  const [tmsLabs, setTmsLabs] = useState<Set<number>>(new Set());
  const [tmsVendors, setTmsVendors] = useState<Map<number, string>>(new Map());
  const [tmsPrices, setTmsPrices] = useState<Map<number, number>>(new Map());
  const [tmsTurnTimes, setTmsTurnTimes] = useState<Map<number, number>>(new Map());

  // File upload handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
              const preferredVendor = selectPreferredTMSVendor(result.bestMatch);
              if (preferredVendor) {
                newTmsLabs.add(index);
                newTmsVendors.set(index, preferredVendor.vendor_name);
                newTmsPrices.set(index, preferredVendor.negotiated_price_usd);
                newTmsTurnTimes.set(index, preferredVendor.vendor_turn_time_days);

                // Auto-assign TMS vendor and settings
                setSelectedMatches((prev) =>
                  new Map(prev).set(index, result.bestMatch!)
                );
                setSelectedServiceLevels((prev) => new Map(prev).set(index, 1));
                setSelectedPrices((prev) =>
                  new Map(prev).set(index, preferredVendor.negotiated_price_usd)
                );
                setSelectedLabs((prev) =>
                  new Map(prev).set(index, `TMS - ${preferredVendor.vendor_name}`)
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

  // Unmatched items handlers
  const handleExcludeItem = (index: number) => {
    setExcludedItems((prev) => {
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
    setResearchItems((prev) => {
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
    setMultiSelectMode((prev) => {
      const newMode = new Map(prev);
      newMode.set(rowIndex, false);
      return newMode;
    });

    const newSelected = new Map(selectedServiceLevels);
    newSelected.set(rowIndex, level);
    setSelectedServiceLevels(newSelected);

    // Clear multi-select data
    setSelectedServiceLevelSets((prev) => {
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
    setMultiSelectMode((prev) => {
      const newMode = new Map(prev);
      newMode.set(rowIndex, true);
      return newMode;
    });

    setSelectedServiceLevelSets((prev) => {
      const newSets = new Map(prev);
      newSets.set(rowIndex, levels);
      return newSets;
    });

    // Clear single-select data
    setSelectedServiceLevels((prev) => {
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
    if (preferredLabFilter) {
      const transferRows = identifyTransferLabs(
        preferredLabFilter,
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
      message += `✓ Applied ${lab} to ${directApplied} item(s)\n`;
    }

    if (fallbackApplied > 0) {
      message += `\n🔄 Used proximity fallback for ${fallbackApplied} item(s):\n`;
      Object.entries(fallbackDetails)
        .sort((a, b) => b[1] - a[1]) // Sort by count descending
        .forEach(([fallbackLab, count]) => {
          message += `  • ${fallbackLab}: ${count} item(s) (closest alternative to ${lab})\n`;
        });
    }

    if (skipped > 0) {
      message += `\n⚠ Skipped ${skipped} item(s) (no capable labs):\n`;
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
    setSelectedServiceLevelSets((prev) => {
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

  return {
    // State
    uploadResults,
    uploadErrors,
    uploadWarnings,
    isProcessing,
    expandedRows,
    selectedMatches,
    fileInputRef,
    modalRowIndex,
    setModalRowIndex,
    bulkSelectedRows,
    excludedItems,
    researchItems,
    manualSearchIndex,
    selectedServiceLevels,
    selectedServiceLevelSets,
    multiSelectMode,
    selectedPrices,
    selectedLabs,
    transferLabs,
    tmsLabs,
    tmsVendors,
    tmsPrices,
    tmsTurnTimes,
    // Handlers
    handleFileUpload,
    handleExcludeItem,
    handleSendToResearch,
    handleResetAll,
    handleManualMatch,
    handleManualMatchSelect,
    toggleRowExpansion,
    selectMatch,
    getSelectedMatch,
    getSelectedServiceLevels,
    getSelectedServiceLevel,
    getSelectedPrice,
    getSelectedLab,
    updateServiceLevel,
    updateServiceLevels,
    toggleServiceLevel,
    toggleMultiSelectMode,
    updatePrice,
    updateLab,
    autoSelectPrioritizedLabs,
    refreshLabPriorities,
    toggleBulkSelect,
    selectAllRows,
    clearBulkSelection,
    applyBulkLab,
    applyBulkServiceLevel,
    applyBulkBasePrice,
    handleOptimize,
    saveQuoteSession,
    loadQuoteSession,
  };
}

