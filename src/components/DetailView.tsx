import React, { useMemo, useState } from "react";
import { ServiceLevelMultiSelect } from "./ServiceLevelMultiSelect";
import { CopyButton } from "./CopyButton";
import { getLabCapabilitiesForUnit } from "../data/labs";
import type { Unit } from "../top-level";
import {
  SERVICE_LEVEL_DESC,
  clsx,
  money,
  ttColor,
  HorizontalBarChart,
  normalizePricing,
  isTMSRequired,
  getTMSVendorsForUnitHelper,
  selectPreferredTMSVendor,
} from "../top-level";
import { serializeCaps, serializePricing } from "../utils/serialization";
import {
  getCoordsForPostalCode,
  isValidPostalFormat,
  sortLabsByDistance,
} from "../business-logic/zip-distance";

type DetailViewProps = {
  unit: Unit;
  capType: string;
  setCapType: (value: string) => void;
  accred: string;
  setAccred: (value: string) => void;
  svclevel: Set<number>;
  setSvclevel: (value: Set<number>) => void;
  darkMode: boolean;
};

export function DetailView({
  unit,
  accred,
  setAccred,
  svclevel,
  setSvclevel,
  darkMode,
}: DetailViewProps) {
  const [expandedLabs, setExpandedLabs] = useState<Set<string>>(new Set());
  const [zipPanelOpen, setZipPanelOpen] = useState<boolean>(false);
  const [zipInput, setZipInput] = useState<string>("");
  const [activeSort, setActiveSort] = useState<{
    coords: [number, number];
    postalCode: string;
  } | null>(null);
  const [zipError, setZipError] = useState<string | null>(null);

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
    setActiveSort({ coords, postalCode: trimmed.toUpperCase() });
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

  const sortedCaps = useMemo(
    () =>
      activeSort
        ? sortLabsByDistance(caps, activeSort.coords)
        : caps.map((c) => ({ ...c, distanceMi: null as number | null })),
    [caps, activeSort]
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
          <div className={`mt-3 text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
            <span className="font-semibold">Subgroup:</span> <span className="text-purple-600">{unit.subgroup || "N/A"}</span>
          </div>
          <div className={`mt-4 mb-2 p-3 rounded-lg bg-blue-50 border border-blue-200 ${darkMode ? "bg-blue-900/30 border-blue-700" : ""}`}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">⏱ Standard Time:</span>
              <span className="text-base font-bold text-blue-600">{(unit.standardTime || 0).toFixed(1)} hours</span>
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
          <button
            type="button"
            onClick={() => setZipPanelOpen((open) => !open)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 active:scale-95 ${
              activeSort
                ? darkMode
                  ? "border-blue-500 bg-blue-900/40 text-blue-300 hover:bg-blue-900/60"
                  : "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                : darkMode
                  ? "bg-[#2c2c2e] border-white/10 text-gray-300 hover:bg-[#3c3c3e]"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            📍 {activeSort ? `Sorted near ${activeSort.postalCode}` : "Find Closest Lab"}
          </button>
        </div>
        {zipPanelOpen && (
          <div
            className={`mb-4 p-3 rounded-lg border ${
              darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"
            }`}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                id="zip-sort-input"
                aria-label="Postal code for lab distance sort"
                aria-describedby={zipError ? "zip-sort-error" : undefined}
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
              <p
                id="zip-sort-error"
                role="alert"
                className="mt-2 text-xs text-red-600"
              >
                {zipError}
              </p>
            )}
          </div>
        )}
        <div className="overflow-auto border border-gray-200 rounded-xl scrollbar-modern">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr className="text-left text-gray-600 font-semibold uppercase text-xs tracking-wide">
                <th className="py-4 px-4 w-12"></th>
                <th className="py-4 px-4">Lab</th>
                <th className="py-4 px-4">Accredited</th>
                <th className="py-4 px-4">Standards</th>
                <th className="py-2 px-3">Stock TT</th>
                <th className="py-2 px-3">Recal TT</th>
                <th className="py-2 px-3">Repair TT</th>
              </tr>
            </thead>
            <tbody>
              {sortedCaps.map((c) => {
                const isExpanded = expandedLabs.has(c.labCode);
                return (
                  <React.Fragment key={c.labCode}>
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
                        {Number.isFinite(c.distanceMi) && (
                          <span
                            className={`ml-1 text-xs font-normal ${
                              darkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            ({c.distanceMi} mi)
                          </span>
                        )}
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
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className={clsx(
                            "inline-block px-2 py-0.5 rounded-full text-xs",
                            ttColor(c.stockTT)
                          )}
                        >
                          {c.stockTT} days
                        </span>
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
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className={clsx(
                            "inline-block px-2 py-0.5 rounded-full text-xs",
                            ttColor(c.repairTT)
                          )}
                        >
                          {c.repairTT} days
                        </span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-t border-slate-100 bg-slate-50">
                        <td></td>
                        <td colSpan={6} className="py-3 px-3">
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
          <CopyButton
            label="Copy PN"
            toCopy={unit.part_number}
            darkMode={darkMode}
          />
          <CopyButton
            label="Copy Model"
            toCopy={`${unit.manufacturer} ${unit.model_number}`}
            darkMode={darkMode}
          />
          <CopyButton
            label="Copy Capabilities (TSV)"
            toCopy={serializeCaps(caps)}
            darkMode={darkMode}
          />
          <CopyButton
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
