// ─────────────────────────────────────────────────────────────────────────────
// Unit Details Modal Component
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo } from "react";
import { getEligibleLabsForUnit } from "../../data/labs";
import { SERVICE_LEVEL_DESC, LAB_CAPACITY } from "../constants";
import {
  money,
  clsx,
  getCapacityColor,
  getCapacityTextColor,
  ttColor,
  isTMSRequired,
  getTMSVendorsForUnitHelper,
  selectPreferredTMSVendor,
} from "../utils";
import { generatePricingRows } from "../pricing-utils";
import type { Unit } from "../types";

interface UnitDetailsModalProps {
  unit: Unit;
  rowIndex: number;
  serviceLevel: number;
  selectedLab: string;
  onClose: () => void;
  darkMode?: boolean;
}

export function UnitDetailsModal({
  unit,
  rowIndex,
  serviceLevel,
  selectedLab,
  onClose,
  darkMode,
}: UnitDetailsModalProps) {
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

  // TMS (Third-Party Vendor Service) calculations
  const tmsRequired = useMemo(() => isTMSRequired(unit), [unit]);
  const tmsVendors = useMemo(() => getTMSVendorsForUnitHelper(unit), [unit]);
  const preferredTMSVendor = useMemo(
    () => selectPreferredTMSVendor(unit),
    [unit]
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
                <div>
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
                    <th className="py-2 px-3">Stock TT</th>
                    <th className="py-2 px-3">Recal TT</th>
                    <th className="py-2 px-3">Repair TT</th>
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
                                ttColor(cap.stockTT)
                              )}
                            >
                              {cap.stockTT} days
                            </span>
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
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span
                              className={clsx(
                                "inline-block px-2 py-0.5 rounded-full text-xs",
                                ttColor(cap.repairTT)
                              )}
                            >
                              {cap.repairTT} days
                            </span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="border-t border-slate-100 bg-slate-50">
                            <td></td>
                            <td colSpan={7} className="py-3 px-3">
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

          {/* TMS (Third-Party Vendor Service) */}
          <section>
            <h3
              className={`text-lg font-semibold mb-3 flex items-center gap-2 ${
                darkMode ? "text-white" : "text-slate-900"
              }`}
            >
              <span>🏢</span>
              <span>TMS (Third-Party Vendor Service)</span>
            </h3>

            {!tmsRequired ? (
              <div
                className={`text-sm p-4 rounded-lg ${
                  darkMode
                    ? "bg-gray-700 text-gray-400"
                    : "bg-slate-50 text-slate-600"
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
                <div className="overflow-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-slate-600 font-semibold uppercase text-xs tracking-wide">
                        <th className="py-3 px-4">Vendor</th>
                        <th className="py-3 px-4">Negotiated Price</th>
                        <th className="py-3 px-4">Turn Time</th>
                        <th className="py-3 px-4">Location</th>
                        <th className="py-3 px-4">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tmsVendors.map((vendor, index) => (
                        <tr
                          key={index}
                          className={`border-t border-slate-100 hover:bg-slate-50/50 transition-colors ${
                            preferredTMSVendor?.vendor_name ===
                            vendor.vendor_name
                              ? darkMode
                                ? "bg-blue-900/10"
                                : "bg-blue-50"
                              : ""
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {preferredTMSVendor?.vendor_name ===
                                vendor.vendor_name && (
                                <span className="text-yellow-500">⭐</span>
                              )}
                              <span
                                className={`font-medium ${
                                  darkMode ? "text-white" : "text-slate-900"
                                }`}
                              >
                                {vendor.vendor_name}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`font-semibold ${
                                darkMode ? "text-white" : "text-slate-900"
                              }`}
                            >
                              {money(vendor.negotiated_price_usd)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`font-semibold ${
                                darkMode ? "text-white" : "text-slate-900"
                              }`}
                            >
                              {vendor.vendor_turn_time_days} days
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-sm font-medium ${
                                darkMode ? "text-white" : "text-slate-900"
                              }`}
                            >
                              {vendor.supported_regions?.includes(
                                "North America"
                              )
                                ? "CA"
                                : vendor.supported_regions?.includes("Europe")
                                ? "DE"
                                : vendor.supported_regions?.includes(
                                    "Asia Pacific"
                                  )
                                ? "JP"
                                : "US"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-xs ${
                                darkMode ? "text-gray-400" : "text-slate-600"
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
