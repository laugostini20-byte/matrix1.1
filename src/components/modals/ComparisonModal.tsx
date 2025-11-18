import React from "react";
import type { Unit } from "../../top-level";
import { getEligibleLabsForUnit, supportsOnsiteCalibration } from "../../data/labs";
import { money } from "../../top-level";

export function ComparisonModal({
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

