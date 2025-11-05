// ─────────────────────────────────────────────────────────────────────────────
// Manual Search Modal for Unmatched Items
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo } from "react";
import { searchUnits } from "../utils";
import { money } from "../utils";
import type { Unit, CustomerItem } from "../types";

interface ManualSearchModalProps {
  item: CustomerItem;
  onSelect: (unit: Unit) => void;
  onClose: () => void;
  darkMode: boolean;
}

export function ManualSearchModal({
  item,
  onSelect,
  onClose,
  darkMode,
}: ManualSearchModalProps) {
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
                      <div
                        className={`text-xs mt-1 font-medium ${
                          darkMode ? "text-blue-400" : "text-blue-600"
                        }`}
                      >
                        ⏱ {(unit.standardTime || 0).toFixed(1)} hours
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
