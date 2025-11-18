import React, { useMemo, useState, useEffect, useRef } from "react";
import { UNITS } from "./data/units";
import {
  supportsOnsiteCalibration,
  getLabCapabilitiesForUnit,
  getEligibleLabsForUnit,
  getAllStandards,
} from "./data/labs";
import type {
  Unit,
  LabCapabilityForUnit,
  PricingRow,
  CustomerItem,
  MatchResult,
  LabLocation,
  QuoteSummary,
  OptimizationStrategy,
} from "./top-level";
import {
  SERVICE_LEVEL_DESC,
  LAB_LOCATIONS,
  LAB_CAPACITY,
  ALL_LEVELS,
  getCapacityColor,
  getCapacityTextColor,
  calculateDistance,
  clsx,
  money,
  ttColor,
  searchUnits,
  HorizontalBarChart,
  parseCustomerList,
  createMatchResult,
  calculateServiceLevelPrice,
  generatePricingRows,
  normalizePricing,
  optimizeSelections,
  isTMSRequired,
  getTMSVendorsForUnitHelper,
  selectPreferredTMSVendor,
} from "./top-level";
import { UploadPage } from "./top-level/upload-page";

// ─────────────────────────────────────────────────────────────────────────────
// ServiceLevelSelector has been moved to src/components/ServiceLevelSelector.tsx
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Lab Recommendation System
// ─────────────────────────────────────────────────────────────────────────────

export interface LabRecommendation {
  score: number; // 0-100
  breakdown: {
    capacityColors: string;
    capacityTextColors: string;
    capacityScore: number; // 0-30 points
    experienceScore: number; // 0-30 points
    turnaroundScore: number; // 0-25 points
    standardsScore: number; // 0-15 points
    accreditationBonus: number; // 0-15 points
  };
  details: {
    capacity: number;
    experience: number; // number of matching standards
    avgTurnaround: number;
    totalStandards: number;
    isAccredited: boolean;
  };
}

/**
 * Calculate lab recommendation score based on multiple factors
 * Higher score = better recommendation
 */
export function calculateLabRecommendation(
  labCapability: LabCapabilityForUnit,
  capacity: number
): LabRecommendation {
  const { matchingStandards, stockTT, recalTT, isAccredited } = labCapability;

  // 1. Capacity Score (0-30 points) - Lower capacity is better (more availability)
  const capacityScore = Math.max(0, 30 - (capacity / 100) * 30);

  // 2. Experience Score (0-30 points) - More matching standards = more experience
  const experienceScore = Math.min(30, matchingStandards.length * 10); // 10 points per standard, max 30

  // 3. Turnaround Score (0-25 points) - Lower turnaround time is better
  const avgTurnaround = (stockTT + recalTT) / 2;
  const turnaroundScore = Math.max(0, 25 - (avgTurnaround / 30) * 25); // Scale based on 30 days max

  // 4. Standards Score (0-15 points) - More total standards = more capability
  const totalStandards = labCapability.matchingStandards.length; // Using matching standards as proxy
  const standardsScore = Math.min(15, totalStandards * 3); // 3 points per standard, max 15

  // 5. Accreditation Bonus (0-15 points) - Accredited labs get bonus points
  const accreditationBonus = isAccredited ? 15 : 0;

  const totalScore =
    capacityScore +
    experienceScore +
    turnaroundScore +
    standardsScore +
    accreditationBonus;

  // Get colors for capacity display (keeping original capacity colors)
  const capacityColors = getCapacityColor(capacity);
  const capacityTextColors = getCapacityTextColor(capacity);

  return {
    score: Math.round(totalScore),
    breakdown: {
      capacityColors,
      capacityTextColors,
      capacityScore: Math.round(capacityScore),
      experienceScore: Math.round(experienceScore),
      turnaroundScore: Math.round(turnaroundScore),
      standardsScore: Math.round(standardsScore),
      accreditationBonus: Math.round(accreditationBonus),
    },
    details: {
      capacity,
      experience: matchingStandards.length,
      avgTurnaround: Math.round(avgTurnaround * 10) / 10,
      totalStandards,
      isAccredited,
    },
  };
}

/**
 * Get recommendation bar colors based on score
 */
export function getRecommendationColors(score: number): {
  bg: string;
  text: string;
} {
  if (score >= 80) return { bg: "bg-green-500", text: "text-green-700" };
  if (score >= 60) return { bg: "bg-yellow-400", text: "text-yellow-800" };
  if (score >= 40) return { bg: "bg-orange-500", text: "text-orange-800" };
  return { bg: "bg-red-500", text: "text-red-700" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main App Component
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Upload functionality
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Helper to calculate coverage statistics
function calculateCoverageStats() {
  const stats = {
    totalUnits: UNITS.length,
    unitsWithLabs: 0,
    unitsWithoutLabs: 0,
    uncoveredPNs: [] as string[],
    avgLabsPerUnit: 0,
    totalStandards: 0,
    onsiteCapableStandards: 0,
  };

  const allStandards = getAllStandards();
  stats.totalStandards = allStandards.length;
  stats.onsiteCapableStandards = allStandards.filter(
    (s) => s.onsiteCapable
  ).length;

  let totalLabCount = 0;

  UNITS.forEach((unit) => {
    const eligibleLabs = getEligibleLabsForUnit({
      partNumber: unit.part_number,
      requiredCapabilityTags: unit.requiredCapabilityTags,
    });

    if (eligibleLabs.length > 0) {
      stats.unitsWithLabs++;
      totalLabCount += eligibleLabs.length;
    } else {
      stats.unitsWithoutLabs++;
      stats.uncoveredPNs.push(unit.part_number);
    }
  });

  stats.avgLabsPerUnit =
    stats.unitsWithLabs > 0 ? totalLabCount / stats.unitsWithLabs : 0;

  return stats;
}

// ─────────────────────────────────────────────────────────────────────────────
// Chart Components - Pure CSS/SVG
// ─────────────────────────────────────────────────────────────────────────────

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

export default function App() {
  const [coverageStats, setCoverageStats] = useState<ReturnType<
    typeof calculateCoverageStats
  > | null>(null);

  // Calculate coverage on mount
  useEffect(() => {
    const stats = calculateCoverageStats();
    setCoverageStats(stats);
    console.log("📊 Standards Coverage Analysis:", stats);
  }, []);

  // Navigation state
  const [currentPage, setCurrentPage] = useState<
    "search" | "details" | "upload"
  >("search");

  // Page A search bars
  const [partQ, setPartQ] = useState("");
  const [mfrQ, setMfrQ] = useState("");
  const [modelQ, setModelQ] = useState("");
  const [descQ, setDescQ] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [hasOnsiteFilter, setHasOnsiteFilter] = useState<string>("all");
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(
    new Set()
  );
  const [showCompareModal, setShowCompareModal] = useState(false);
  // Selected unit (Page B)
  const [selected, setSelected] = useState<Unit | null>(null);

  // Page C upload state
  const [uploadResults, setUploadResults] = useState<MatchResult[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [uploadWarnings, setUploadWarnings] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [selectedMatches, setSelectedMatches] = useState<Map<number, Unit>>(
    new Map()
  );
  const [selectedServiceLevels, setSelectedServiceLevels] = useState<
    Map<number, number>
  >(new Map());
  // New multi-select service level support
  const [selectedServiceLevelSets, setSelectedServiceLevelSets] = useState<
    Map<number, Set<number>>
  >(new Map());
  const [multiSelectMode, setMultiSelectMode] = useState<Map<number, boolean>>(
    new Map()
  );
  const [selectedPrices, setSelectedPrices] = useState<Map<number, number>>(
    new Map()
  );
  const [selectedLabs, setSelectedLabs] = useState<Map<number, string>>(
    new Map()
  );

  // Track preferred lab and transfer labs for highlighting
  const [preferredLab, setPreferredLab] = useState<string>("");
  const [transferLabs, setTransferLabs] = useState<Set<number>>(new Set());

  // TMS (Third-Party Vendor Service) state
  const [tmsLabs, setTmsLabs] = useState<Set<number>>(new Set());
  const [tmsVendors, setTmsVendors] = useState<Map<number, string>>(new Map());
  const [tmsPrices, setTmsPrices] = useState<Map<number, number>>(new Map());
  const [tmsTurnTimes, setTmsTurnTimes] = useState<Map<number, number>>(
    new Map()
  );

  // Track lab capability overrides (labCode -> Set of partNumbers they can/cannot do)
  const [labCapabilityOverrides, setLabCapabilityOverrides] = useState<
    Map<string, Set<string>>
  >(new Map());

  // Modal state for lab capability management
  const [capabilityModalOpen, setCapabilityModalOpen] = useState(false);
  const [capabilityModalData, setCapabilityModalData] = useState<{
    rowIndex: number;
    partNumber: string;
    requiredCapabilityTags: any[];
  } | null>(null);

  const [preferredLabFilter, setPreferredLabFilter] = useState<string>(() => {
    return localStorage.getItem("preferredLab") || "";
  });
  const [zipCodeFilter, setZipCodeFilter] = useState<string>(() => {
    return localStorage.getItem("zipCode") || "";
  });
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

  // Optional filters (used inside DetailView)
  const [capType, setCapType] = useState<string>("All");
  const [accred, setAccred] = useState<string>("All");
  const [svclevel, setSvclevel] = useState<Set<number>>(new Set());
  const [showDiag, setShowDiag] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("darkMode") === "true";
  });

  // Debounce Page A inputs
  const [dPart, setDPart] = useState(partQ);
  const [dMfr, setDMfr] = useState(mfrQ);
  const [dModel, setDModel] = useState(modelQ);
  const [dDesc, setDDesc] = useState(descQ);
  useEffect(() => {
    const t = setTimeout(() => {
      setDPart(partQ);
      setDMfr(mfrQ);
      setDModel(modelQ);
      setDDesc(descQ);
    }, 200);
    return () => clearTimeout(t);
  }, [partQ, mfrQ, modelQ, descQ]);

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem("preferredLab", preferredLabFilter);
  }, [preferredLabFilter]);

  useEffect(() => {
    localStorage.setItem("zipCode", zipCodeFilter);
  }, [zipCodeFilter]);

  // Dark mode effect - apply to body/html and persist
  useEffect(() => {
    localStorage.setItem("darkMode", String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    }
  }, [darkMode]);

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
                setSelectedMatches((prev) =>
                  new Map(prev).set(index, result.bestMatch!)
                );
                setSelectedServiceLevels((prev) => new Map(prev).set(index, 1));
                setSelectedPrices((prev) =>
                  new Map(prev).set(index, preferredVendor.negotiated_price_usd)
                );
                setSelectedLabs((prev) =>
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
                onClick={() => setDarkMode((v) => !v)}
                className={`w-10 h-10 flex items-center justify-center rounded-full border hover:shadow-md transition-all duration-200 active:scale-95 ${
                  darkMode
                    ? "bg-[#2c2c2e] border-white/10 hover:bg-[#3c3c3e]"
                    : "bg-white/80 border-black/5 hover:bg-white"
                }`}
                title="Toggle dark mode"
              >
                <span className="text-lg">{darkMode ? "☀️" : "🌙"}</span>
              </button>
              <button
                onClick={() => setShowDiag((v) => !v)}
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
              <span className="mr-2">🔍</span>
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
              <span className="mr-2">📊</span>
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
              <span className="mr-2">📤</span>
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
                        ▶
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
                <span className="text-2xl">🔍</span>
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
                    ? "Type to search • Click a row for details"
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
                    {compareMode ? "✓ Compare Mode" : "Compare Units"}
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
                    <span className="text-lg">⚙️</span>
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
                    ✕ Clear Filters
                  </button>
                </div>
              )}
            </div>

            {/* Modern Results Table */}
            <div className="mt-6 glass-card overflow-hidden">
              {compareMode && selectedForCompare.size > 0 && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">
                    ✓ {selectedForCompare.size} unit
                    {selectedForCompare.size !== 1 ? "s" : ""} selected
                  </span>
                  <button
                    onClick={() => setShowCompareModal(true)}
                    className="btn-primary text-xs py-2 px-4"
                  >
                    View Comparison →
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
                              <span className="text-4xl">🔍</span>
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
        POC only • Mock data • Ready to wire to real endpoints
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail View (Page B)
// ─────────────────────────────────────────────────────────────────────────────
// Custom multiselect component for service levels
function ServiceLevelMultiSelect({
  selectedLevels,
  onSelectionChange,
  darkMode,
}: {
  selectedLevels: Set<number>;
  onSelectionChange: (levels: Set<number>) => void;
  darkMode: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleLevel = (level: number) => {
    const newSelection = new Set(selectedLevels);
    if (newSelection.has(level)) {
      newSelection.delete(level);
    } else {
      newSelection.add(level);
    }
    onSelectionChange(newSelection);
  };

  const selectAll = () => {
    onSelectionChange(new Set(ALL_LEVELS));
  };

  const selectNone = () => {
    onSelectionChange(new Set());
  };

  const getDisplayText = () => {
    if (selectedLevels.size === 0) return "Select service levels...";
    if (selectedLevels.size === ALL_LEVELS.length) return "All service levels";
    if (selectedLevels.size <= 4) {
      return Array.from(selectedLevels)
        .sort((a, b) => a - b)
        .map((level) => `L${level}`)
        .join(", ");
    }
    return `${selectedLevels.size} service levels selected`;
  };

  const getSelectedBadges = () => {
    if (selectedLevels.size === 0 || selectedLevels.size > 4) return null;

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {Array.from(selectedLevels)
          .sort((a, b) => a - b)
          .map((level) => (
            <span
              key={level}
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                darkMode
                  ? "bg-blue-900 text-blue-200"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              L{level}
            </span>
          ))}
      </div>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className={`w-full border rounded-lg ${
          darkMode
            ? "border-gray-600 bg-[#1c1c1e] text-white"
            : "border-gray-300 bg-white text-gray-900"
        } hover:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500`}
      >
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full text-left px-3 py-2 text-sm flex items-center justify-between focus:outline-none"
        >
          <span className="truncate">{getDisplayText()}</span>
          <svg
            className={`w-4 h-4 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {getSelectedBadges()}
      </div>

      {isOpen && (
        <div
          className={`absolute z-50 w-full mt-1 border rounded-lg shadow-lg max-h-60 overflow-y-auto ${
            darkMode
              ? "border-gray-600 bg-[#1c1c1e] text-white"
              : "border-gray-300 bg-white text-gray-900"
          }`}
        >
          {/* Quick actions */}
          <div
            className={`px-3 py-2 border-b ${
              darkMode ? "border-gray-600" : "border-gray-200"
            }`}
          >
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600"
              >
                Select All
              </button>
              <button
                onClick={selectNone}
                className="text-xs px-2 py-1 rounded bg-gray-500 text-white hover:bg-gray-600"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Service level options */}
          {ALL_LEVELS.map((level: number) => (
            <label
              key={level}
              className={`flex items-center px-3 py-2 hover:bg-opacity-10 hover:bg-blue-500 cursor-pointer ${
                darkMode ? "hover:bg-white" : "hover:bg-gray-100"
              }`}
            >
              <input
                type="checkbox"
                checked={selectedLevels.has(level)}
                onChange={() => toggleLevel(level)}
                className={`mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${
                  darkMode ? "bg-gray-700 border-gray-600" : ""
                }`}
              />
              <span className="text-sm">
                Level {level} - {SERVICE_LEVEL_DESC[level]}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailView({
  unit,
  accred,
  setAccred,
  svclevel,
  setSvclevel,
  darkMode,
}: {
  unit: Unit;
  capType: string;
  setCapType: (value: string) => void;
  accred: string;
  setAccred: (value: string) => void;
  svclevel: Set<number>;
  setSvclevel: (value: Set<number>) => void;
  darkMode: boolean;
}) {
  const [expandedLabs, setExpandedLabs] = useState<Set<string>>(new Set());

  // Get lab capabilities using the new resolver
  const labCaps = useMemo(
    () =>
      getLabCapabilitiesForUnit({
        partNumber: unit.part_number,
        requiredCapabilityTags: unit.requiredCapabilityTags,
      }),
    [unit]
  );

  // Filter eligible labs based on filters
  const caps = useMemo(
    () =>
      labCaps.filter(
        (l) =>
          l.canCalibrate && // Only labs that can calibrate this unit
          (accred === "All" ||
            (accred === "Yes" ? l.isAccredited : !l.isAccredited))
      ),
    [labCaps, accred]
  );

  const toggleLab = (labCode: string) => {
    const newExpanded = new Set(expandedLabs);
    if (newExpanded.has(labCode)) {
      newExpanded.delete(labCode);
    } else {
      newExpanded.add(labCode);
    }
    setExpandedLabs(newExpanded);
  };

  const pricesAll = useMemo(() => normalizePricing(unit.pricing), [unit]);
  const prices = useMemo(
    () =>
      pricesAll.filter(
        (p) => svclevel.size === 0 || svclevel.has(p.service_level)
      ),
    [pricesAll, svclevel]
  );

  const minPrice = useMemo(() => {
    const nums = prices
      .map((p) => p.base_price_usd)
      .filter((v) => Number.isFinite(v));
    return nums.length ? Math.min(...nums) : null;
  }, [prices]);
  const minTT = useMemo(() => {
    const tts = caps
      .flatMap((c) => [c.stockTT, c.recalTT])
      .filter(Number.isFinite);
    return tts.length ? Math.min(...tts) : null;
  }, [caps]);

  // TMS (Third-Party Vendor Service) logic
  const tmsRequired = useMemo(() => isTMSRequired(unit), [unit]);
  const tmsVendors = useMemo(() => getTMSVendorsForUnitHelper(unit), [unit]);
  const preferredTMSVendor = useMemo(
    () => selectPreferredTMSVendor(unit),
    [unit]
  );

  return (
    <div className="glass-card p-6 animate-fade-in">
      {/* Modern Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 pb-6 border-b border-gray-200">
        <div className="flex-1">
          <div
            className={`text-xs uppercase tracking-wide font-semibold mb-1 ${
              darkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Part Number
          </div>
          <div
            className={`text-2xl font-bold mb-2 ${
              darkMode ? "text-white" : "text-gray-900"
            }`}
          >
            {unit.part_number}
          </div>
          <div
            className={`flex items-center gap-2 text-sm mb-1 ${
              darkMode ? "text-gray-300" : "text-gray-600"
            }`}
          >
            <span
              className={`font-semibold ${
                darkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {unit.manufacturer}
            </span>
            <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
            <span className={darkMode ? "text-gray-300" : "text-gray-600"}>
              {unit.model_number}
            </span>
          </div>
          <div
            className={`text-sm max-w-2xl ${
              darkMode ? "text-gray-300" : "text-gray-600"
            }`}
          >
            {unit.description}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {unit.requiredCapabilityTags.map((tag) => (
              <span key={tag} className="badge badge-info text-xs">
                {tag}
              </span>
            ))}
          </div>
          <div
            className={`mt-3 text-sm ${
              darkMode ? "text-gray-300" : "text-gray-600"
            }`}
          >
            <span className="font-semibold">Subgroup:</span>{" "}
            <span className="text-purple-600">{unit.subgroup || "N/A"}</span>
          </div>
          <div
            className={`mt-4 mb-2 p-3 rounded-lg bg-blue-50 border border-blue-200 ${
              darkMode ? "bg-blue-900/30 border-blue-700" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">⏱ Standard Time:</span>
              <span className="text-base font-bold text-blue-600">
                {(unit.standardTime || 0).toFixed(1)} hours
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {minPrice !== null && (
            <div className="stat-card text-center min-w-[160px]">
              <div className="text-xs uppercase text-gray-500 font-semibold mb-1">
                Starting From
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {money(minPrice)}
              </div>
            </div>
          )}
          {minTT !== null && (
            <div className="flex justify-center">
              <span className={clsx("text-xs font-medium", ttColor(minTT))}>
                ≥{minTT} day turnaround
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Modern Filters */}
      <div
        className={`mt-6 p-5 rounded-xl border ${
          darkMode
            ? "bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700"
            : "bg-gradient-to-br from-gray-50 to-white border-gray-200"
        }`}
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🎯</span>
          <h3
            className={`text-sm font-semibold ${
              darkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Filter Options
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label
              className={`block text-xs font-semibold mb-2 uppercase tracking-wide ${
                darkMode ? "text-gray-300" : "text-gray-600"
              }`}
            >
              Accreditation
            </label>
            <select
              value={accred}
              onChange={(e) => setAccred(e.target.value)}
              className="select-modern text-sm w-full"
            >
              <option value="All">All Labs</option>
              <option value="Yes">Accredited Only</option>
              <option value="No">Non-Accredited Only</option>
            </select>
          </div>
          <div>
            <label
              className={`block text-xs font-semibold mb-2 uppercase tracking-wide ${
                darkMode ? "text-gray-300" : "text-gray-600"
              }`}
            >
              Service Level
            </label>
            <ServiceLevelMultiSelect
              selectedLevels={svclevel}
              onSelectionChange={setSvclevel}
              darkMode={darkMode}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setAccred("All");
                setSvclevel(new Set());
              }}
              className="btn-secondary w-full text-sm"
            >
              ✕ Reset Filters
            </button>
          </div>
        </div>
        <div
          className={`mt-3 px-3 py-2 rounded-lg border ${
            darkMode
              ? "bg-blue-900/30 border-blue-700"
              : "bg-blue-50 border-blue-200"
          }`}
        >
          <div
            className={`text-xs font-medium ${
              darkMode ? "text-blue-300" : "text-blue-900"
            }`}
          >
            ✓ {caps.length} lab{caps.length !== 1 ? "s" : ""} match your
            criteria
          </div>
        </div>
      </div>

      {/* Lab Capabilities */}
      <section className="mt-6">
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
          {supportsOnsiteCalibration(unit.part_number) && (
            <span className="badge badge-info">✓ Onsite Capable</span>
          )}
        </div>
        <div className="overflow-auto border border-gray-200 rounded-xl scrollbar-modern">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr className="text-left text-gray-600 font-semibold uppercase text-xs tracking-wide">
                <th className="py-4 px-4 w-12"></th>
                <th className="py-4 px-4">Lab</th>
                <th className="py-4 px-4">Accredited</th>
                <th className="py-4 px-4">Standards</th>
                <th className="py-2 px-3">Recommendation</th>
                <th className="py-2 px-3">Turn Time</th>
              </tr>
            </thead>
            <tbody>
              {caps.map((c, i) => {
                const isExpanded = expandedLabs.has(c.labCode);
                return (
                  <React.Fragment key={i}>
                    <tr
                      className={`border-t border-slate-100 cursor-pointer ${
                        darkMode ? "hover:bg-gray-800" : "hover:bg-slate-50"
                      }`}
                      onClick={() => toggleLab(c.labCode)}
                    >
                      <td className="py-2 px-3">
                        <span className="text-slate-400">
                          {isExpanded ? "▼" : "▶"}
                        </span>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-medium">
                        {c.labName}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {c.isAccredited ? (
                          <span className="text-green-600">✓ Yes</span>
                        ) : (
                          <span className="text-slate-400">No</span>
                        )}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-blue-600 font-medium">
                        {c.matchingStandards.length} matching
                      </td>
                      <td className="py-2 px-3">
                        {(() => {
                          const capacity = LAB_CAPACITY[c.labName] || 50;
                          const recommendation = calculateLabRecommendation(
                            c,
                            capacity
                          );
                          const colors = getRecommendationColors(
                            recommendation.score
                          );

                          return (
                            <div className="flex items-center gap-2 relative group">
                              {/* Horizontal Progress Bar */}
                              <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden min-w-[80px] max-w-[120px] cursor-help">
                                <div
                                  className={`h-full ${colors.bg} transition-all duration-300`}
                                  style={{
                                    width: `${recommendation.score}%`,
                                  }}
                                />
                              </div>

                              {/* Score and Rating Container - Positioned to the right */}
                              <div className="flex flex-col items-start min-w-[50px]">
                                {/* Numerical Score */}
                                <span
                                  className={`text-sm font-bold ${colors.text}`}
                                >
                                  {recommendation.score}
                                </span>

                                {/* Textual Rating */}
                                <span className="text-xs text-gray-600">
                                  {recommendation.score >= 80
                                    ? "Excellent"
                                    : recommendation.score >= 60
                                    ? "Good"
                                    : recommendation.score >= 40
                                    ? "Fair"
                                    : "Poor"}
                                </span>
                              </div>

                              {/* Custom Tooltip */}
                              <div
                                className="absolute w-64 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 p-4"
                                style={{
                                  position: "absolute",
                                  top: "100%",
                                  left: "0",
                                  marginTop: "8px",
                                  maxHeight: "300px",
                                  overflowY: "auto",
                                }}
                              >
                                {/* Header */}
                                <div className="text-sm font-bold text-white mb-3">
                                  Score Breakdown
                                </div>

                                {/* Score Breakdown */}
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-white">
                                      Capacity:
                                    </span>
                                    <span className="text-green-400 font-medium">
                                      +{recommendation.breakdown.capacityScore}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-white">
                                      Turnaround:
                                    </span>
                                    <span className="text-blue-400 font-medium">
                                      +
                                      {recommendation.breakdown.turnaroundScore}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-white">
                                      Accreditation:
                                    </span>
                                    <span className="text-purple-400 font-medium">
                                      +
                                      {
                                        recommendation.breakdown
                                          .accreditationBonus
                                      }
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-white">
                                      Standards:
                                    </span>
                                    <span className="text-yellow-400 font-medium">
                                      +{recommendation.breakdown.standardsScore}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-white">
                                      Experience:
                                    </span>
                                    <span className="text-orange-400 font-medium">
                                      +
                                      {recommendation.breakdown.experienceScore}
                                    </span>
                                  </div>

                                  {/* Total */}
                                  <div className="pt-2 border-t border-gray-700 flex justify-between items-center">
                                    <span className="font-bold text-white">
                                      Total:
                                    </span>
                                    <span className="font-bold text-white">
                                      {recommendation.score}
                                    </span>
                                  </div>
                                </div>

                                {/* Tooltip Arrow - Top */}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 tooltip-arrow-top"></div>

                                {/* Tooltip Arrow - Bottom */}
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900 tooltip-arrow-bottom opacity-0"></div>
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className={clsx(
                            "inline-block px-2 py-0.5 rounded-full text-xs",
                            ttColor(c.recalTT)
                          )}
                        >
                          {c.recalTT} days
                        </span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-t border-slate-100 bg-slate-50">
                        <td></td>
                        <td colSpan={5} className="py-3 px-3">
                          <div className="text-xs font-semibold text-slate-700 mb-2">
                            Matching Standards at {c.labName}:
                          </div>
                          <div className="space-y-1">
                            {c.matchingStandards.map((std, stdIdx) => (
                              <div
                                key={stdIdx}
                                className="flex items-center gap-3 text-xs py-1 px-2 bg-white rounded border border-slate-200"
                              >
                                <span className="font-mono text-slate-600">
                                  {std.standardId}
                                </span>
                                <span className="font-medium text-slate-900">
                                  {std.make} {std.model}
                                </span>
                                <span className="text-slate-500">
                                  {std.capabilityTags.join(", ")}
                                </span>
                                {std.onsiteCapable && (
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                    Onsite OK
                                  </span>
                                )}
                              </div>
                            ))}
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
      </section>

      {/* TMS (Third-Party Vendor Service) */}
      <section className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏢</span>
            <h3
              className={`text-lg font-semibold ${
                darkMode ? "text-white" : "text-gray-900"
              }`}
            >
              TMS (Third-Party Vendor Service)
            </h3>
          </div>
        </div>

        {!tmsRequired ? (
          <div
            className={`text-sm ${
              darkMode ? "text-gray-400" : "text-gray-600"
            } italic`}
          >
            No TMS applicable—this unit is serviceable in-house.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Preferred Vendor Highlight */}
            {preferredTMSVendor && (
              <div
                className={`p-4 rounded-lg border-2 ${
                  darkMode
                    ? "bg-blue-900/20 border-blue-700/50"
                    : "bg-blue-50 border-blue-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⭐</span>
                  <span
                    className={`font-semibold ${
                      darkMode ? "text-blue-300" : "text-blue-700"
                    }`}
                  >
                    Preferred Vendor
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span
                      className={`font-medium ${
                        darkMode ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Vendor:
                    </span>
                    <div
                      className={`font-semibold ${
                        darkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {preferredTMSVendor.vendor_name}
                    </div>
                  </div>
                  <div>
                    <span
                      className={`font-medium ${
                        darkMode ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Price:
                    </span>
                    <div
                      className={`font-semibold ${
                        darkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {money(preferredTMSVendor.negotiated_price_usd)}
                    </div>
                  </div>
                  <div>
                    <span
                      className={`font-medium ${
                        darkMode ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Turn Time:
                    </span>
                    <div
                      className={`font-semibold ${
                        darkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {preferredTMSVendor.vendor_turn_time_days} days
                    </div>
                  </div>
                </div>
                {preferredTMSVendor.notes && (
                  <div
                    className={`mt-2 text-xs ${
                      darkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {preferredTMSVendor.notes}
                  </div>
                )}
              </div>
            )}

            {/* All Vendors Table */}
            <div className="overflow-auto border border-gray-200 rounded-xl scrollbar-modern">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr className="text-left text-gray-600 font-semibold uppercase text-xs tracking-wide">
                    <th className="py-4 px-4">Vendor</th>
                    <th className="py-4 px-4">Negotiated Price</th>
                    <th className="py-4 px-4">Turn Time</th>
                    <th className="py-4 px-4">Location</th>
                    <th className="py-4 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {tmsVendors.map((vendor, index) => (
                    <tr
                      key={index}
                      className={`border-t border-gray-100 hover:bg-gray-50/50 transition-colors ${
                        preferredTMSVendor?.vendor_name === vendor.vendor_name
                          ? darkMode
                            ? "bg-blue-900/10"
                            : "bg-blue-50"
                          : ""
                      }`}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {preferredTMSVendor?.vendor_name ===
                            vendor.vendor_name && (
                            <span className="text-yellow-500">⭐</span>
                          )}
                          <span
                            className={`font-medium ${
                              darkMode ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {vendor.vendor_name}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`font-semibold ${
                            darkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {money(vendor.negotiated_price_usd)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`font-semibold ${
                            darkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {vendor.vendor_turn_time_days} days
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`text-sm font-medium ${
                            darkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {vendor.supported_regions?.includes("North America")
                            ? "CA"
                            : vendor.supported_regions?.includes("Europe")
                            ? "DE"
                            : vendor.supported_regions?.includes("Asia Pacific")
                            ? "JP"
                            : "US"}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`text-xs ${
                            darkMode ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          {vendor.notes || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Pricing */}
      <section className="mt-6">
        <div
          className={`text-sm font-semibold mb-2 ${
            darkMode ? "text-white" : "text-gray-900"
          }`}
        >
          Pricing
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className={`text-left ${
                  darkMode ? "text-gray-300" : "text-slate-500"
                }`}
              >
                <th className="py-2 pr-3">Service Level</th>
                <th className="py-2 pr-3">Description</th>
                <th className="py-2 pr-3">Base Price</th>
                <th className="py-2 pr-3">Base + Options</th>
              </tr>
            </thead>
            <tbody>
              {prices.map((p, i) => (
                <tr
                  key={i}
                  className={`border-t ${
                    darkMode ? "border-gray-700" : "border-slate-100"
                  }`}
                >
                  <td
                    className={`py-2 pr-3 whitespace-nowrap font-medium ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {p.service_level}
                  </td>
                  <td
                    className={`py-2 pr-3 min-w-[240px] ${
                      darkMode ? "text-gray-300" : "text-slate-700"
                    }`}
                  >
                    {SERVICE_LEVEL_DESC[p.service_level] || "—"}
                  </td>
                  <td
                    className={`py-2 pr-3 whitespace-nowrap font-semibold ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {money(p.base_price_usd)}
                  </td>
                  <td
                    className={`py-2 pr-3 whitespace-nowrap ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {money(p.base_plus_options_usd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <CopyBtn
            label="Copy PN"
            toCopy={unit.part_number}
            darkMode={darkMode}
          />
          <CopyBtn
            label="Copy Model"
            toCopy={`${unit.manufacturer} ${unit.model_number}`}
            darkMode={darkMode}
          />
          <CopyBtn
            label="Copy Capabilities (TSV)"
            toCopy={serializeCaps(caps)}
            darkMode={darkMode}
          />
          <CopyBtn
            label="Copy Pricing (TSV)"
            toCopy={serializePricing(prices)}
            darkMode={darkMode}
          />
        </div>
      </section>

      {/* Data Visualizations */}
      {prices.length > 0 && (
        <section className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <HorizontalBarChart
            title="📊 Price Comparison by Service Level"
            data={prices.map((p) => ({
              label: `Level ${p.service_level} - ${
                SERVICE_LEVEL_DESC[p.service_level]
              }`,
              value: p.base_price_usd,
              maxLabel: money(p.base_price_usd),
              color: `linear-gradient(90deg, ${
                p.service_level <= 2
                  ? "#60a5fa, #3b82f6"
                  : p.service_level <= 4
                  ? "#34d399, #10b981"
                  : p.service_level <= 6
                  ? "#fbbf24, #f59e0b"
                  : p.service_level <= 8
                  ? "#a78bfa, #8b5cf6"
                  : p.service_level <= 10
                  ? "#fb7185, #f43f5e"
                  : "#fb923c, #ea580c"
              })`,
            }))}
            darkMode={darkMode}
          />
          {caps.length > 0 && (
            <HorizontalBarChart
              title="⚡ Lab Turnaround Times"
              data={caps
                .sort((a, b) => a.recalTT - b.recalTT) // Sort by turnaround time
                .map((c) => ({
                  label: c.labName,
                  value: c.recalTT,
                  maxLabel: `${c.recalTT} days`,
                  color: `linear-gradient(90deg, ${
                    c.recalTT <= 5
                      ? "#34d399, #10b981"
                      : c.recalTT <= 10
                      ? "#fbbf24, #f59e0b"
                      : "#f87171, #ef4444"
                  })`,
                }))}
              darkMode={darkMode}
            />
          )}
        </section>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────
function serializeCaps(caps: LabCapabilityForUnit[]) {
  const headers = ["Lab", "Accredited", "Matching Standards", "Turn Time"];
  const rows = caps.map((c) =>
    [
      c.labName,
      c.isAccredited ? "Yes" : "No",
      String(c.matchingStandards.length),
      String(c.recalTT),
    ].join("\t")
  );
  return [headers.join("\t"), ...rows].join("\n");
}
function serializePricing(pr: PricingRow[]) {
  const headers = [
    "Service Level",
    "Description",
    "Base Price",
    "Base + Options",
  ];
  const rows = pr.map((p) =>
    [
      String(p.service_level),
      SERVICE_LEVEL_DESC[p.service_level] || "",
      `$${p.base_price_usd}`,
      `$${p.base_plus_options_usd}`,
    ].join("\t")
  );
  return [headers.join("\t"), ...rows].join("\n");
}
function CopyBtn({
  label,
  toCopy,
  darkMode,
}: {
  label: string;
  toCopy: string;
  darkMode?: boolean;
}) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(toCopy);
        setOk(true);
        setTimeout(() => setOk(false), 1200);
      }}
      className={clsx(
        "rounded-xl px-3 py-2 text-sm border",
        ok
          ? "border-green-400 bg-green-50"
          : darkMode
          ? "border-gray-600 bg-gray-800 hover:bg-gray-700 text-white"
          : "border-slate-300 bg-white hover:bg-slate-50"
      )}
      title="Copy to clipboard"
    >
      {ok ? "Copied!" : label}
    </button>
  );
}

// Export of service-level dictionary
function buildServiceLevelText() {
  return Object.keys(SERVICE_LEVEL_DESC)
    .map((k) => `${k}: ${SERVICE_LEVEL_DESC[Number(k)]}`)
    .join("\n");
}
function exportServiceLevelText() {
  const lines = buildServiceLevelText();
  const blob = new Blob([lines], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "service-level-descriptions.txt";
  a.click();
  URL.revokeObjectURL(url);
}

// Export all units data for analysis
function exportAllUnitsData() {
  const headers = [
    "ID",
    "Part Number",
    "Manufacturer",
    "Model Number",
    "Description",
    "Base Price USD",
    "Options Addon USD",
    "Capabilities Count",
    "Lab Locations",
    "Has Accredited",
    "Has Limited",
  ];

  const rows = UNITS.map((unit) => {
    const eligibleLabs = getEligibleLabsForUnit({
      partNumber: unit.part_number,
      requiredCapabilityTags: unit.requiredCapabilityTags,
    });
    const labLocations = eligibleLabs.map((l) => l.labName);
    const hasAccredited = eligibleLabs.some((l) => l.isAccredited);

    return [
      unit.id,
      unit.part_number,
      unit.manufacturer,
      unit.model_number,
      unit.description,
      unit.pricing.base_price_usd.toString(),
      unit.pricing.options_addon_usd.toString(),
      eligibleLabs.length.toString(),
      labLocations.join(", "),
      hasAccredited ? "Yes" : "No",
      "N/A", // No longer tracking "limited"
    ].join("\t");
  });

  const content = [headers.join("\t"), ...rows].join("\n");
  const blob = new Blob([content], { type: "text/tab-separated-values" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "all-units-data.tsv";
  a.click();
  URL.revokeObjectURL(url);
}

// Analyze data for duplicates and patterns
function analyzeUnitsData() {
  const analysis = {
    totalUnits: UNITS.length,
    uniquePartNumbers: new Set(UNITS.map((u: Unit) => u.part_number)).size,
    uniqueManufacturers: new Set(UNITS.map((u: Unit) => u.manufacturer)).size,
    uniqueModels: new Set(UNITS.map((u: Unit) => u.model_number)).size,
    uniqueManufacturerModelCombos: new Set(
      UNITS.map((u: Unit) => `${u.manufacturer}|${u.model_number}`)
    ).size,
    manufacturerCounts: {} as Record<string, number>,
    modelCounts: {} as Record<string, number>,
    manufacturerModelCounts: {} as Record<string, number>,
  };

  // Count occurrences
  UNITS.forEach((unit) => {
    analysis.manufacturerCounts[unit.manufacturer] =
      (analysis.manufacturerCounts[unit.manufacturer] || 0) + 1;
    analysis.modelCounts[unit.model_number] =
      (analysis.modelCounts[unit.model_number] || 0) + 1;
    const combo = `${unit.manufacturer}|${unit.model_number}`;
    analysis.manufacturerModelCounts[combo] =
      (analysis.manufacturerModelCounts[combo] || 0) + 1;
  });

  return analysis;
}

// ─────────────────────────────────────────────────────────────────────────────
// Diagnostics (lightweight tests)
// ─────────────────────────────────────────────────────────────────────────────
function runDiagnostics() {
  const results: { name: string; pass: boolean; details?: string }[] = [];

  // Test 1: Service level text has one line per level
  const txt = buildServiceLevelText();
  const expectedLines = Object.keys(SERVICE_LEVEL_DESC).length;
  const actualLines = txt.split("\n").length;
  results.push({
    name: "Service level export contains expected number of lines",
    pass: actualLines === expectedLines,
    details: `expected ${expectedLines}, got ${actualLines}`,
  });

  // Test 2: serializeCaps line count = header + caps length for first unit
  const u0 = UNITS[0];
  const u0Labs = getEligibleLabsForUnit({
    partNumber: u0.part_number,
    requiredCapabilityTags: u0.requiredCapabilityTags,
  });
  const capsTSV = serializeCaps(u0Labs);
  const capsLines = capsTSV.split("\n");
  results.push({
    name: "Capabilities TSV includes header + rows",
    pass: capsLines.length === 1 + u0Labs.length,
    details: `expected ${1 + u0Labs.length}, got ${capsLines.length}`,
  });

  // Test 3: normalized pricing always contains all service levels for first unit
  const norm = normalizePricing(UNITS[0].pricing);
  results.push({
    name: "Pricing normalization outputs entries for all defined service levels",
    pass:
      norm.length === 12 &&
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].every((l) =>
        norm.some((p) => p.service_level === l)
      ),
    details: `expected 12 levels, got ${norm.length}`,
  });

  // Test 4: compounding 10% rule sanity (L2 = L1 * 1.1) when L1 present
  const level1 = norm.find((p) => p.service_level === 1)?.base_price_usd;
  const level2 = norm.find((p) => p.service_level === 2)?.base_price_usd;
  const multOk = Number.isFinite(level1)
    ? Math.abs(level1! * 1.1 - (level2 ?? NaN)) < 0.01
    : true; // skip if no anchor
  results.push({
    name: "Compounding 10% rule check (L2 = L1 * 1.1)",
    pass: multOk,
    details: Number.isFinite(level1)
      ? `L1=${level1}, L2=${level2}`
      : "no anchor present",
  });

  // Test 5: Newlines properly escaped (sanity)
  const sanity = ["a", "b"].join("\n");
  results.push({
    name: "Newlines are properly escaped (sanity)",
    pass: sanity === "a\nb",
    details: sanity.replace("\n", "\\n"),
  });

  // Test 6: Page-A search returns U-1001 when querying PN-34567
  const pnList = searchUnits("PN-34567", "", "", "");
  results.push({
    name: "Search by Part Number finds PN-34567",
    pass: pnList.some((u) => u.id === "U-1001"),
    details: `found: ${pnList.map((u: Unit) => u.id).join(", ")}`,
  });

  // Test 7: Service level calculation for level 3 (should be base * 1.1^2)
  const testPricing = { base_price_usd: 100, options_addon_usd: 20 };
  const testLevel3 = calculateServiceLevelPrice(testPricing.base_price_usd, 3);
  const expectedLevel3 = 100 * Math.pow(1.1, 2); // 121
  const calcOk = Math.abs(testLevel3 - expectedLevel3) < 0.01;
  results.push({
    name: "Service level calculation (Level 3 = base * 1.1^2)",
    pass: calcOk,
    details: `expected ${expectedLevel3.toFixed(2)}, got ${testLevel3.toFixed(
      2
    )}`,
  });

  // Test 8: Data uniqueness analysis
  const analysis = analyzeUnitsData();
  const hasUniquePartNumbers =
    analysis.uniquePartNumbers === analysis.totalUnits;
  const hasUniqueManufacturerModelCombos =
    analysis.uniqueManufacturerModelCombos === analysis.totalUnits;

  results.push({
    name: "All part numbers are unique",
    pass: hasUniquePartNumbers,
    details: `${analysis.uniquePartNumbers}/${analysis.totalUnits} unique part numbers`,
  });

  results.push({
    name: "All manufacturer+model combinations are unique",
    pass: hasUniqueManufacturerModelCombos,
    details: `${analysis.uniqueManufacturerModelCombos}/${analysis.totalUnits} unique manufacturer+model combinations`,
  });

  // Show duplicate analysis if there are issues
  if (!hasUniqueManufacturerModelCombos) {
    const duplicates = Object.entries(analysis.manufacturerModelCounts)
      .filter(([_, count]) => count > 1)
      .slice(0, 3); // Show first 3 duplicates

    if (duplicates.length > 0) {
      results.push({
        name: "Duplicate manufacturer+model combinations found",
        pass: false,
        details: `Examples: ${duplicates
          .map(
            ([combo, count]) =>
              `${combo.split("|")[0]} ${combo.split("|")[1]} (${count}x)`
          )
          .join(", ")}`,
      });
    }
  }

  // Test 9: Standards coverage analysis
  const allStandards = getAllStandards();
  const coveredPNs = new Set(allStandards.flatMap((s) => s.supportedPNs));
  const coveragePercent = ((coveredPNs.size / UNITS.length) * 100).toFixed(1);
  const goodCoverage = parseFloat(coveragePercent) >= 95;
  results.push({
    name: "Standards coverage across catalog",
    pass: goodCoverage,
    details: `${coveragePercent}% of units have standards (${coveredPNs.size}/${UNITS.length})`,
  });

  // Test 10: Average standards per PN should be reasonable (multiple options)
  const standardsPerPN = Array.from(coveredPNs).map(
    (pn) => allStandards.filter((s) => s.supportedPNs.includes(pn)).length
  );
  const avgStandards =
    standardsPerPN.length > 0
      ? (
          standardsPerPN.reduce((a, b) => a + b, 0) / standardsPerPN.length
        ).toFixed(1)
      : 0;
  const hasMultipleOptions = parseFloat(avgStandards.toString()) >= 3;
  results.push({
    name: "Units have multiple calibration options",
    pass: hasMultipleOptions,
    details: `Average ${avgStandards} standards per unit`,
  });

  // Test 11: Total standards count
  const onsiteCapableStandards = allStandards.filter((s) => s.onsiteCapable);
  results.push({
    name: "Standards database populated",
    pass: allStandards.length > 100,
    details: `${allStandards.length} total standards (${onsiteCapableStandards.length} onsite-capable)`,
  });

  return results;
}

function Diagnostics({
  tests,
}: {
  tests: { name: string; pass: boolean; details?: string }[];
}) {
  return (
    <section className="mt-8 border border-slate-200 bg-white rounded-2xl p-4">
      <div className="text-sm font-semibold mb-2">Diagnostics</div>
      <ul className="space-y-1">
        {tests.map((t, i) => (
          <li key={i} className="text-sm">
            <span
              className={clsx(
                "mr-2 font-medium",
                t.pass ? "text-green-700" : "text-red-700"
              )}
            >
              {t.pass ? "PASS" : "FAIL"}
            </span>
            <span className="font-medium">{t.name}</span>
            {t.details && (
              <span className="ml-2 text-slate-500">({t.details})</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Comparison Modal Component
// ─────────────────────────────────────────────────────────────────────────────
function ComparisonModal({
  selectedIds,
  allUnits,
  onClose,
}: {
  selectedIds: Set<string>;
  allUnits: Unit[];
  onClose: () => void;
}) {
  const unitsToCompare = allUnits.filter((u) => selectedIds.has(u.id));

  if (unitsToCompare.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Unit Comparison
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Comparing {unitsToCompare.length} unit
              {unitsToCompare.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Comparison Table */}
        <div className="flex-1 overflow-auto p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-300">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 bg-slate-50 sticky left-0 z-10">
                    Attribute
                  </th>
                  {unitsToCompare.map((unit, idx) => (
                    <th
                      key={unit.id}
                      className="py-3 px-4 font-semibold text-slate-900 min-w-[200px]"
                    >
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-xs text-slate-500">
                          Unit {idx + 1}
                        </span>
                        <span className="font-bold">{unit.part_number}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Manufacturer */}
                <tr className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-700 bg-slate-50 sticky left-0">
                    Manufacturer
                  </td>
                  {unitsToCompare.map((unit) => (
                    <td key={unit.id} className="py-3 px-4">
                      {unit.manufacturer}
                    </td>
                  ))}
                </tr>

                {/* Model */}
                <tr className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-700 bg-slate-50 sticky left-0">
                    Model
                  </td>
                  {unitsToCompare.map((unit) => (
                    <td key={unit.id} className="py-3 px-4">
                      {unit.model_number}
                    </td>
                  ))}
                </tr>

                {/* Description */}
                <tr className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-700 bg-slate-50 sticky left-0">
                    Description
                  </td>
                  {unitsToCompare.map((unit) => (
                    <td key={unit.id} className="py-3 px-4 text-slate-600">
                      {unit.description}
                    </td>
                  ))}
                </tr>

                {/* Base Price */}
                <tr className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-700 bg-slate-50 sticky left-0">
                    Base Price
                  </td>
                  {unitsToCompare.map((unit) => (
                    <td
                      key={unit.id}
                      className="py-3 px-4 font-semibold text-green-600"
                    >
                      {money(unit.pricing.base_price_usd)}
                    </td>
                  ))}
                </tr>

                {/* Options Add-on */}
                <tr className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-700 bg-slate-50 sticky left-0">
                    Options Add-on
                  </td>
                  {unitsToCompare.map((unit) => (
                    <td key={unit.id} className="py-3 px-4 text-slate-600">
                      {money(unit.pricing.options_addon_usd)}
                    </td>
                  ))}
                </tr>

                {/* Available Labs */}
                <tr className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-700 bg-slate-50 sticky left-0">
                    Available Labs
                  </td>
                  {unitsToCompare.map((unit) => {
                    const labs = getEligibleLabsForUnit({
                      partNumber: unit.part_number,
                      requiredCapabilityTags: unit.requiredCapabilityTags,
                    });
                    return (
                      <td key={unit.id} className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-blue-600">
                            {labs.length} lab{labs.length !== 1 ? "s" : ""}
                          </span>
                          <div className="text-xs text-slate-500">
                            {labs
                              .slice(0, 3)
                              .map((l) => l.labName)
                              .join(", ")}
                            {labs.length > 3 && ` +${labs.length - 3} more`}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Turn Time Range */}
                <tr className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-700 bg-slate-50 sticky left-0">
                    Turn Time Range
                  </td>
                  {unitsToCompare.map((unit) => {
                    const labs = getEligibleLabsForUnit({
                      partNumber: unit.part_number,
                      requiredCapabilityTags: unit.requiredCapabilityTags,
                    });
                    const turnTimes = labs
                      .flatMap((l) => [l.stockTT, l.recalTT, l.repairTT])
                      .filter(Number.isFinite);
                    const minTT = turnTimes.length
                      ? Math.min(...turnTimes)
                      : null;
                    const maxTT = turnTimes.length
                      ? Math.max(...turnTimes)
                      : null;
                    return (
                      <td key={unit.id} className="py-3 px-4">
                        {minTT && maxTT ? (
                          <span className="text-slate-700">
                            {minTT}-{maxTT} days
                          </span>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Onsite Capable */}
                <tr className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-700 bg-slate-50 sticky left-0">
                    Onsite Capable
                  </td>
                  {unitsToCompare.map((unit) => {
                    const hasOnsite = supportsOnsiteCalibration(
                      unit.part_number
                    );
                    return (
                      <td key={unit.id} className="py-3 px-4">
                        {hasOnsite ? (
                          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            ✓ Yes
                          </span>
                        ) : (
                          <span className="text-slate-400">No</span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Accredited Labs */}
                <tr className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-700 bg-slate-50 sticky left-0">
                    Accredited Labs
                  </td>
                  {unitsToCompare.map((unit) => {
                    const labs = getEligibleLabsForUnit({
                      partNumber: unit.part_number,
                      requiredCapabilityTags: unit.requiredCapabilityTags,
                    });
                    const accreditedCount = labs.filter(
                      (l) => l.isAccredited
                    ).length;
                    return (
                      <td key={unit.id} className="py-3 px-4">
                        {accreditedCount > 0 ? (
                          <span className="text-green-600 font-medium">
                            {accreditedCount} available
                          </span>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Capability Tags */}
                <tr className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-700 bg-slate-50 sticky left-0">
                    Capabilities
                  </td>
                  {unitsToCompare.map((unit) => (
                    <td key={unit.id} className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {unit.requiredCapabilityTags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Unit Details Modal Component
// ─────────────────────────────────────────────────────────────────────────────
function UnitDetailsModal({
  unit,
  rowIndex,
  serviceLevel,
  selectedLab,
  onClose,
  darkMode,
}: {
  unit: Unit;
  rowIndex: number;
  serviceLevel: number;
  selectedLab: string;
  onClose: () => void;
  darkMode?: boolean;
}) {
  const [expandedLabs, setExpandedLabs] = useState<Set<string>>(new Set());

  const pricingRows = useMemo(() => generatePricingRows(unit.pricing), [unit]);
  const currentPricing = pricingRows.find(
    (p) => p.service_level === serviceLevel
  );

  // Get eligible labs for this unit
  const capsWithStandards = useMemo(
    () =>
      getEligibleLabsForUnit({
        partNumber: unit.part_number,
        requiredCapabilityTags: unit.requiredCapabilityTags,
      }),
    [unit]
  );

  // Find the selected lab capability
  const selectedLabCapability = selectedLab
    ? capsWithStandards.find((cap) => cap.labName === selectedLab)
    : null;

  const toggleLab = (labCode: string) => {
    const newExpanded = new Set(expandedLabs);
    if (newExpanded.has(labCode)) {
      newExpanded.delete(labCode);
    } else {
      newExpanded.add(labCode);
    }
    setExpandedLabs(newExpanded);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={`rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto ${
          darkMode ? "bg-gray-800" : "bg-white"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`sticky top-0 border-b px-6 py-4 flex items-center justify-between rounded-t-2xl ${
            darkMode
              ? "bg-gray-800 border-gray-600"
              : "bg-white border-slate-200"
          }`}
        >
          <div>
            <h2
              className={`text-xl font-bold ${
                darkMode ? "text-white" : "text-slate-900"
              }`}
            >
              Unit Details
            </h2>
            <p
              className={`text-sm ${
                darkMode ? "text-gray-400" : "text-slate-500"
              }`}
            >
              Row {rowIndex + 1}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${
              darkMode ? "hover:bg-gray-700" : "hover:bg-slate-100"
            }`}
            title="Close"
          >
            <svg
              className={`w-6 h-6 ${
                darkMode ? "text-gray-300" : "text-slate-600"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Part Information */}
          <section>
            <h3
              className={`text-lg font-semibold mb-3 ${
                darkMode ? "text-white" : "text-slate-900"
              }`}
            >
              Part Information
            </h3>
            <div
              className={`rounded-lg p-4 space-y-2 ${
                darkMode ? "bg-gray-700" : "bg-slate-50"
              }`}
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div
                    className={`text-xs uppercase font-medium ${
                      darkMode ? "text-gray-400" : "text-slate-500"
                    }`}
                  >
                    Internal Part Number
                  </div>
                  <div
                    className={`text-base font-semibold ${
                      darkMode ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {unit.part_number}
                  </div>
                </div>
                <div>
                  <div
                    className={`text-xs uppercase font-medium ${
                      darkMode ? "text-gray-400" : "text-slate-500"
                    }`}
                  >
                    Manufacturer
                  </div>
                  <div
                    className={`text-base font-semibold ${
                      darkMode ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {unit.manufacturer}
                  </div>
                </div>
                <div>
                  <div
                    className={`text-xs uppercase font-medium ${
                      darkMode ? "text-gray-400" : "text-slate-500"
                    }`}
                  >
                    Model Number
                  </div>
                  <div
                    className={`text-base font-semibold ${
                      darkMode ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {unit.model_number}
                  </div>
                </div>
                <div>
                  <div
                    className={`text-xs uppercase font-medium ${
                      darkMode ? "text-gray-400" : "text-slate-500"
                    }`}
                  >
                    Subgroup
                  </div>
                  <div
                    className={`text-base font-semibold ${
                      darkMode ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {unit.subgroup || "N/A"}
                  </div>
                </div>
                <div>
                  <div
                    className={`text-xs uppercase font-medium ${
                      darkMode ? "text-gray-400" : "text-slate-500"
                    }`}
                  >
                    Standard Time
                  </div>
                  <div
                    className={`text-base font-semibold ${
                      darkMode ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {(unit.standardTime || 0).toFixed(1)} hours
                  </div>
                </div>
                <div className="col-span-2">
                  <div
                    className={`text-xs uppercase font-medium ${
                      darkMode ? "text-gray-400" : "text-slate-500"
                    }`}
                  >
                    Description
                  </div>
                  <div
                    className={`text-sm ${
                      darkMode ? "text-gray-300" : "text-slate-700"
                    }`}
                  >
                    {unit.description}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Current Selection Summary */}
          <section>
            <h3
              className={`text-lg font-semibold mb-3 ${
                darkMode ? "text-white" : "text-slate-900"
              }`}
            >
              Current Selection
            </h3>
            <div
              className={`border rounded-lg p-4 space-y-3 ${
                darkMode
                  ? "bg-blue-900/30 border-blue-700"
                  : "bg-blue-50 border-blue-200"
              }`}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div
                    className={`text-xs uppercase font-medium ${
                      darkMode ? "text-blue-300" : "text-blue-700"
                    }`}
                  >
                    Service Level
                  </div>
                  <div
                    className={`text-base font-semibold ${
                      darkMode ? "text-blue-100" : "text-blue-900"
                    }`}
                  >
                    Level {serviceLevel}
                  </div>
                  <div
                    className={`text-sm ${
                      darkMode ? "text-blue-300" : "text-blue-700"
                    }`}
                  >
                    {SERVICE_LEVEL_DESC[serviceLevel]}
                  </div>
                </div>
                {currentPricing && (
                  <div>
                    <div
                      className={`text-xs uppercase font-medium ${
                        darkMode ? "text-blue-300" : "text-blue-700"
                      }`}
                    >
                      Price Range for This Level
                    </div>
                    <div
                      className={`text-base font-semibold ${
                        darkMode ? "text-blue-100" : "text-blue-900"
                      }`}
                    >
                      {money(currentPricing.base_price_usd)} -{" "}
                      {money(currentPricing.base_plus_options_usd)}
                    </div>
                    <div
                      className={`text-sm ${
                        darkMode ? "text-blue-300" : "text-blue-700"
                      }`}
                    >
                      Base to Base + Options
                    </div>
                  </div>
                )}
              </div>
              {selectedLabCapability && (
                <div
                  className={`border-t pt-3 ${
                    darkMode ? "border-blue-700" : "border-blue-200"
                  }`}
                >
                  <div
                    className={`text-xs uppercase font-medium mb-2 ${
                      darkMode ? "text-blue-300" : "text-blue-700"
                    }`}
                  >
                    Selected Lab Details
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <div
                        className={`text-xs ${
                          darkMode ? "text-blue-400" : "text-blue-600"
                        }`}
                      >
                        Lab
                      </div>
                      <div
                        className={`font-semibold ${
                          darkMode ? "text-blue-100" : "text-blue-900"
                        }`}
                      >
                        {selectedLabCapability.labName}
                      </div>
                    </div>
                    <div>
                      <div
                        className={`text-xs ${
                          darkMode ? "text-blue-400" : "text-blue-600"
                        }`}
                      >
                        Turn Time
                      </div>
                      <div
                        className={`font-semibold ${
                          darkMode ? "text-blue-100" : "text-blue-900"
                        }`}
                      >
                        <span
                          className={clsx(
                            "inline-block px-2 py-0.5 rounded-full text-xs",
                            ttColor(selectedLabCapability.recalTT)
                          )}
                        >
                          {selectedLabCapability.recalTT} days
                        </span>
                      </div>
                    </div>
                    <div>
                      <div
                        className={`text-xs ${
                          darkMode ? "text-blue-400" : "text-blue-600"
                        }`}
                      >
                        Accreditation
                      </div>
                      <div
                        className={`font-semibold text-xs ${
                          darkMode ? "text-blue-100" : "text-blue-900"
                        }`}
                      >
                        {selectedLabCapability.isAccredited ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded ${
                              darkMode
                                ? "bg-green-900/50 text-green-300"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            Accredited
                          </span>
                        ) : (
                          <span
                            className={`inline-block px-2 py-0.5 rounded ${
                              darkMode
                                ? "bg-gray-700 text-gray-300"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            Non-Accredited
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Lab Capabilities Summary */}
          <section>
            <h3
              className={`text-lg font-semibold mb-3 flex items-center gap-2 ${
                darkMode ? "text-white" : "text-slate-900"
              }`}
            >
              <span>Lab Capabilities Summary</span>
              {supportsOnsiteCalibration(unit.part_number) && (
                <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  ✓ Onsite Capable
                </span>
              )}
            </h3>
            <div className="overflow-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-600">
                    <th className="py-2 px-3 w-8"></th>
                    <th className="py-2 px-3">Lab</th>
                    <th className="py-2 px-3">Accredited</th>
                    <th className="py-2 px-3">Standards</th>
                    <th className="py-2 px-3">Lab Capacity</th>
                    <th className="py-2 px-3">Turn Time</th>
                  </tr>
                </thead>
                <tbody>
                  {capsWithStandards.map((cap, i) => {
                    const isExpanded = expandedLabs.has(cap.labCode);
                    const isSelected = cap.labName === selectedLab;
                    return (
                      <React.Fragment key={i}>
                        <tr
                          className={clsx(
                            `border-t border-slate-100 cursor-pointer ${
                              darkMode
                                ? "hover:bg-gray-800"
                                : "hover:bg-slate-50"
                            }`,
                            isSelected &&
                              (darkMode
                                ? "bg-blue-900/30 font-medium"
                                : "bg-blue-50 font-medium")
                          )}
                          onClick={() => toggleLab(cap.labCode)}
                        >
                          <td className="py-2 px-3">
                            <span className="text-slate-400">
                              {isExpanded ? "▼" : "▶"}
                            </span>
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap font-medium">
                            {cap.labName}
                            {isSelected && (
                              <span className="ml-2 text-blue-600">✓</span>
                            )}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            {cap.isAccredited ? (
                              <span className="text-green-600">✓ Yes</span>
                            ) : (
                              <span className="text-slate-400">No</span>
                            )}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap text-blue-600 font-medium">
                            {cap.matchingStandards.length} matching
                          </td>
                          <td className="py-2 px-3">
                            {(() => {
                              const capacity = LAB_CAPACITY[cap.labName] || 50;
                              const barColor = getCapacityColor(capacity);
                              const textColor = getCapacityTextColor(capacity);

                              return (
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden min-w-[80px] max-w-[120px]">
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
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span
                              className={clsx(
                                "inline-block px-2 py-0.5 rounded-full text-xs",
                                ttColor(cap.recalTT)
                              )}
                            >
                              {cap.recalTT} days
                            </span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="border-t border-slate-100 bg-slate-50">
                            <td></td>
                            <td colSpan={5} className="py-3 px-3">
                              <div className="text-xs font-semibold text-slate-700 mb-2">
                                Matching Standards at {cap.labName}:
                              </div>
                              <div className="space-y-1">
                                {cap.matchingStandards.map((std, stdIdx) => (
                                  <div
                                    key={stdIdx}
                                    className="flex items-center gap-3 text-xs py-1 px-2 bg-white rounded border border-slate-200"
                                  >
                                    <span className="font-mono text-slate-600">
                                      {std.standardId}
                                    </span>
                                    <span className="font-medium text-slate-900">
                                      {std.make} {std.model}
                                    </span>
                                    <span className="text-slate-500">
                                      {std.capabilityTags.join(", ")}
                                    </span>
                                    {std.onsiteCapable && (
                                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                        Onsite OK
                                      </span>
                                    )}
                                  </div>
                                ))}
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
          </section>

          {/* Pricing Table for All Levels */}
          <section>
            <h3 className="text-lg font-semibold text-slate-900 mb-3">
              All Service Level Pricing
            </h3>
            <div className="overflow-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-600">
                    <th className="py-2 px-3">Level</th>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3">Base Price</th>
                    <th className="py-2 px-3">Base + Options</th>
                  </tr>
                </thead>
                <tbody>
                  {pricingRows.map((p, i) => (
                    <tr
                      key={i}
                      className={clsx(
                        "border-t border-slate-100",
                        p.service_level === serviceLevel &&
                          "bg-blue-50 font-medium"
                      )}
                    >
                      <td className="py-2 px-3">
                        {p.service_level}
                        {p.service_level === serviceLevel && (
                          <span className="ml-2 text-blue-600">✓</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-700">
                        {SERVICE_LEVEL_DESC[p.service_level]}
                      </td>
                      <td className="py-2 px-3 font-semibold">
                        {money(p.base_price_usd)}
                      </td>
                      <td className="py-2 px-3">
                        {money(p.base_plus_options_usd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Manual Search Modal for Unmatched Items
// ─────────────────────────────────────────────────────────────────────────────
function ManualSearchModal({
  item,
  onSelect,
  onClose,
  darkMode,
}: {
  item: CustomerItem;
  onSelect: (unit: Unit) => void;
  onClose: () => void;
  darkMode: boolean;
}) {
  const [searchMfr, setSearchMfr] = useState(item.manufacturer);
  const [searchModel, setSearchModel] = useState(item.model);
  const [searchPart, setSearchPart] = useState("");

  const searchResults = useMemo(() => {
    return searchUnits(searchPart, searchMfr, searchModel, "");
  }, [searchPart, searchMfr, searchModel]);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl overflow-hidden ${
          darkMode ? "bg-gray-900" : "bg-white"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`p-6 border-b ${
            darkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h2
              className={`text-xl font-bold ${
                darkMode ? "text-white" : "text-gray-900"
              }`}
            >
              🔧 Manual Match: {item.manufacturer} - {item.model}
            </h2>
            <button
              onClick={onClose}
              className={`text-2xl hover:opacity-70 transition-opacity ${
                darkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              ×
            </button>
          </div>
          <p
            className={`text-sm ${
              darkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Search for the correct unit to match this item
          </p>
        </div>

        {/* Search Fields */}
        <div
          className={`p-6 border-b ${
            darkMode
              ? "bg-gray-800/50 border-gray-700"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label
                className={`block text-xs font-semibold mb-2 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Manufacturer
              </label>
              <input
                type="text"
                value={searchMfr}
                onChange={(e) => setSearchMfr(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
                placeholder="Search manufacturer..."
              />
            </div>
            <div>
              <label
                className={`block text-xs font-semibold mb-2 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Model
              </label>
              <input
                type="text"
                value={searchModel}
                onChange={(e) => setSearchModel(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
                placeholder="Search model..."
              />
            </div>
            <div>
              <label
                className={`block text-xs font-semibold mb-2 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Part Number
              </label>
              <input
                type="text"
                value={searchPart}
                onChange={(e) => setSearchPart(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
                placeholder="Search part number..."
              />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="overflow-y-auto max-h-96 p-6">
          {searchResults.length === 0 ? (
            <div
              className={`text-center py-12 ${
                darkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              <div className="text-4xl mb-2">🔍</div>
              <p>No units found. Try different search terms.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {searchResults.slice(0, 50).map((unit: Unit) => (
                <button
                  key={unit.part_number}
                  onClick={() => onSelect(unit)}
                  className={`w-full text-left p-4 rounded-lg border transition-all duration-200 hover:scale-[1.02] ${
                    darkMode
                      ? "bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-blue-500"
                      : "bg-white border-gray-200 hover:bg-blue-50 hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div
                        className={`font-medium ${
                          darkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {unit.part_number}
                      </div>
                      <div
                        className={`text-sm ${
                          darkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {unit.manufacturer} - {unit.model_number}
                      </div>
                      <div
                        className={`text-xs mt-1 ${
                          darkMode ? "text-gray-500" : "text-gray-500"
                        }`}
                      >
                        {unit.description}
                      </div>
                    </div>
                    <div
                      className={`text-sm font-medium ${
                        darkMode ? "text-blue-400" : "text-blue-600"
                      }`}
                    >
                      {money(unit.pricing.base_price_usd)}
                    </div>
                  </div>
                </button>
              ))}
              {searchResults.length > 50 && (
                <div
                  className={`text-sm text-center py-2 ${
                    darkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Showing first 50 of {searchResults.length} results
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`p-4 border-t ${
            darkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <button
            onClick={onClose}
            className={`w-full px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              darkMode
                ? "bg-gray-700 text-white hover:bg-gray-600"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

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
                  : isSentToResearch
                  ? darkMode
                    ? "bg-blue-900/20 border-blue-700/50"
                    : "bg-blue-50 border-blue-200"
                  : darkMode
                  ? "bg-gray-800/50 border-gray-700"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${
                        darkMode
                          ? "bg-gray-700 text-gray-300"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      Row {result.customerItem.row}
                    </span>
                    {isManuallyMatched && (
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded ${
                          darkMode
                            ? "bg-green-700 text-green-100"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        ✅ Fixed & Ready
                      </span>
                    )}
                    {isSentToResearch && !isManuallyMatched && (
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded ${
                          darkMode
                            ? "bg-blue-700 text-blue-100"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        📧 Sent to Research
                      </span>
                    )}
                  </div>
                  <div
                    className={`font-medium ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {result.customerItem.manufacturer} -{" "}
                    {result.customerItem.model}
                  </div>
                  {result.customerItem.notes && (
                    <div
                      className={`text-sm mt-1 ${
                        darkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Notes: {result.customerItem.notes}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {!isManuallyMatched && !isSentToResearch && (
                    <>
                      <button
                        onClick={() => onManualMatch(originalIndex)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 active:scale-95 ${
                          darkMode
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-blue-500 text-white hover:bg-blue-600"
                        }`}
                        title="Manually match this item"
                      >
                        🔧 Fix
                      </button>
                      <button
                        onClick={() => onSendToResearch(originalIndex)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 active:scale-95 ${
                          darkMode
                            ? "bg-yellow-600 text-white hover:bg-yellow-700"
                            : "bg-yellow-500 text-white hover:bg-yellow-600"
                        }`}
                        title="Send to research team"
                      >
                        📧 Research
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
                        ? "bg-orange-600 text-white hover:bg-orange-700"
                        : "bg-orange-500 text-white hover:bg-orange-600"
                    }`}
                    title="Remove from quote but keep in export for review"
                  >
                    📋 Mark for Review
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
  summary: QuoteSummary;
  darkMode: boolean;
  onExportPDF: () => void;
  onExportExcel: () => void;
}) {
  return (
    <div
      className={`rounded-xl border shadow-lg p-6 ${
        darkMode
          ? "bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700"
          : "bg-gradient-to-br from-white to-gray-50 border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h2
          className={`text-lg font-bold ${
            darkMode ? "text-white" : "text-gray-900"
          }`}
        >
          📊 Quote Summary
        </h2>
        <div className="flex gap-2">
          <button
            onClick={onExportPDF}
            disabled={summary.configuredItems === 0}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 active:scale-95 ${
              summary.configuredItems === 0
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : darkMode
                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg"
                : "bg-blue-500 text-white hover:bg-blue-600 shadow-md hover:shadow-lg"
            }`}
            title="Export PDF for depot quotes"
          >
            📄 Export to PDF for Quote
          </button>
          <button
            onClick={onExportExcel}
            disabled={summary.configuredItems === 0}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 active:scale-95 ${
              summary.configuredItems === 0
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : darkMode
                ? "bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg"
                : "bg-green-500 text-white hover:bg-green-600 shadow-md hover:shadow-lg"
            }`}
            title="Export Excel for onsite quotes with travel costs"
          >
            📊 Export to Excel for Cost Model
          </button>
        </div>
      </div>

      {/* Stats Grid - Horizontal layout for top placement */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-4">
        {/* Total Items */}
        <div
          className={`p-3 rounded-lg ${
            darkMode ? "bg-gray-700/50" : "bg-blue-50"
          }`}
        >
          <div
            className={`text-xs font-medium mb-1 ${
              darkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Total Items
          </div>
          <div
            className={`text-2xl font-bold ${
              darkMode ? "text-white" : "text-gray-900"
            }`}
          >
            {summary.totalItems}
          </div>
        </div>

        {/* Configured */}
        <div
          className={`p-3 rounded-lg ${
            darkMode ? "bg-gray-700/50" : "bg-green-50"
          }`}
        >
          <div
            className={`text-xs font-medium mb-1 ${
              darkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Configured
          </div>
          <div
            className={`text-2xl font-bold ${
              summary.configuredItems === summary.totalItems
                ? "text-green-500"
                : darkMode
                ? "text-yellow-400"
                : "text-yellow-600"
            }`}
          >
            {summary.configuredItems}
          </div>
        </div>

        {/* Total Price */}
        <div
          className={`p-3 rounded-lg ${
            darkMode ? "bg-gray-700/50" : "bg-purple-50"
          }`}
        >
          <div
            className={`text-xs font-medium mb-1 ${
              darkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Total Price
          </div>
          <div
            className={`text-xl font-bold ${
              darkMode ? "text-white" : "text-gray-900"
            }`}
          >
            {money(summary.totalPrice)}
          </div>
        </div>

        {/* Avg Turnaround */}
        <div
          className={`p-3 rounded-lg ${
            darkMode ? "bg-gray-700/50" : "bg-orange-50"
          }`}
        >
          <div
            className={`text-xs font-medium mb-1 ${
              darkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Avg Turnaround
          </div>
          <div
            className={`text-xl font-bold ${
              darkMode ? "text-white" : "text-gray-900"
            }`}
          >
            {summary.avgTurnaroundTime} days
          </div>
        </div>
      </div>

      {/* Lab Breakdown - Horizontal display */}
      {summary.labBreakdown.length > 0 && (
        <div>
          <h3
            className={`text-sm font-semibold mb-2 ${
              darkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Lab Breakdown
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {summary.labBreakdown.map((lb, idx) => (
              <div
                key={idx}
                className={`p-2 rounded text-center ${
                  darkMode ? "bg-gray-700/30" : "bg-gray-100"
                }`}
              >
                <div
                  className={`text-sm font-medium truncate ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}
                  title={lb.lab}
                >
                  {lb.lab}
                </div>
                <div
                  className={`text-xs ${
                    darkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {lb.count} {lb.count === 1 ? "item" : "items"}
                </div>
                <div
                  className={`text-sm font-bold ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  {money(lb.total)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Indicator */}
      <div
        className={`mt-4 pt-4 border-t ${
          darkMode ? "border-gray-600" : "border-gray-300"
        }`}
      >
        <div className="flex justify-between text-xs mb-1">
          <span className={darkMode ? "text-gray-400" : "text-gray-600"}>
            Configuration Progress
          </span>
          <span className={darkMode ? "text-gray-300" : "text-gray-700"}>
            {summary.totalItems > 0
              ? Math.round((summary.configuredItems / summary.totalItems) * 100)
              : 0}
            %
          </span>
        </div>
        <div
          className={`w-full h-2 rounded-full ${
            darkMode ? "bg-gray-700" : "bg-gray-200"
          }`}
        >
          <div
            className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
            style={{
              width: `${
                summary.totalItems > 0
                  ? (summary.configuredItems / summary.totalItems) * 100
                  : 0
              }%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
