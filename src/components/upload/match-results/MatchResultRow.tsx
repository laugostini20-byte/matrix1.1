import { ServiceLevelSelector } from "../../ServiceLevelSelector";
import { LABS, getEligibleLabsForUnit } from "../../../data/labs";
import type { Unit, MatchResult } from "../../../top-level";
import {
  SERVICE_LEVEL_DESC,
  LAB_CAPACITY,
  getCapacityColor,
  getCapacityTextColor,
  clsx,
  money,
  ttColor,
  getMatchQuality,
  getTMSVendorsForUnitHelper,
  generatePricingRows,
} from "../../../top-level";

export type MatchResultRowProps = {
  index: number;
  result: MatchResult;
  expandedRows: Set<number>;
  selectedMatches: Map<number, Unit>;
  selectedLabs: Map<number, string>;
  selectedPrices: Map<number, number>;
  bulkSelectedRows: Set<number>;
  multiSelectMode: Map<number, boolean>;
  transferLabs: Set<number>;
  tmsLabs: Set<number>;
  tmsTurnTimes: Map<number, number>;
  labCapabilityOverrides: Map<string, Set<string>>;
  onToggleRowExpansion: (rowIndex: number) => void;
  onSelectMatch: (rowIndex: number, unit: Unit) => void;
  toggleBulkSelect: (rowIndex: number) => void;
  toggleMultiSelectMode: (rowIndex: number) => void;
  toggleServiceLevel: (rowIndex: number, level: number) => void;
  updateServiceLevel: (rowIndex: number, level: number) => void;
  updateServiceLevels: (rowIndex: number, levels: Set<number>) => void;
  updatePrice: (rowIndex: number, price: number) => void;
  updateLab: (rowIndex: number, lab: string) => void;
  setModalRowIndex: (value: number | null) => void;
  openCapabilityModal: (
    rowIndex: number,
    partNumber: string,
    requiredCapabilityTags: any[]
  ) => void;
  removeLabCapability: (labCode: string, partNumber: string) => void;
  getSelectedMatch: (rowIndex: number) => Unit | undefined;
  getSelectedServiceLevel: (rowIndex: number) => number;
  getSelectedServiceLevels: (rowIndex: number) => Set<number>;
  getSelectedPrice: (rowIndex: number) => number | null;
  getSelectedLab: (rowIndex: number) => string;
  getEligibleLabsForUnitWithOverrides: (requirements: {
    partNumber: string;
    requiredCapabilityTags: any[];
  }) => any[];
  darkMode: boolean;
  preferredLab: string;
};

export function MatchResultRow(props: MatchResultRowProps) {
  const {
    index: i,
    result,
    expandedRows,
    selectedMatches,
    bulkSelectedRows,
    multiSelectMode,
    transferLabs,
    tmsLabs,
    tmsTurnTimes,
    labCapabilityOverrides,
    onToggleRowExpansion,
    onSelectMatch,
    toggleBulkSelect,
    toggleMultiSelectMode,
    toggleServiceLevel,
    updateServiceLevel,
    updateServiceLevels,
    updatePrice,
    updateLab,
    setModalRowIndex,
    openCapabilityModal,
    removeLabCapability,
    getSelectedMatch,
    getSelectedServiceLevel,
    getSelectedServiceLevels,
    getSelectedPrice,
    getSelectedLab,
    getEligibleLabsForUnitWithOverrides,
    darkMode,
    preferredLab,
  } = props;

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
    <>
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
                {isExpanded ? "▼" : "▶"}
              </span>
            )}
            {isExactMatch && hasMatches && !showExpandArrow && (
              <span
                className="text-xs text-blue-600"
                title="Click to configure"
              >
                ⚙️
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
                    ✓ Exact Match
                  </span>
                ) : matchQuality.quality >= 60 ? (
                  <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium w-fit">
                    ~ {matchQuality.quality}% Match
                  </span>
                ) : (
                  <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium w-fit">
                    ⚠ {matchQuality.quality}% Match
                  </span>
                );
              })()}
            {!hasMatches && (
              <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium w-fit">
                ✗ No Match
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
            <span className="text-slate-400 text-sm">—</span>
          )}
        </td>
        <td className="py-3 px-4">
          {(() => {
            const selectedLabName = getSelectedLab(i);
            if (!selectedLabName) {
              return (
                <span className="text-slate-400 text-sm">
                  —
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
                  📍 {getSelectedLab(i)}
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
                        🔄 Transfer from {preferredLab}
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
                      🏢 Transfer for TMS
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
                            ⏱ {(unit.standardTime || 0).toFixed(1)} hrs
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
                              ❌ Remove Capability
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
                          ✅ Add Capability
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
    </>
  );
}
