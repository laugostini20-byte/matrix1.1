import React from "react";
import { LABS } from "../../data/labs";
import { ALL_LEVELS, SERVICE_LEVEL_DESC } from "../constants";

// ─────────────────────────────────────────────────────────────────────────────
// Bulk Actions Panel Component
// ─────────────────────────────────────────────────────────────────────────────

interface BulkActionsPanelProps {
  bulkSelectedRows: Set<number>;
  clearBulkSelection: () => void;
  applyBulkLab: (lab: string) => void;
  applyBulkServiceLevel: (level: number) => void;
  applyBulkBasePrice: (useBasePrice: boolean) => void;
  darkMode: boolean;
}

export function BulkActionsPanel({
  bulkSelectedRows,
  clearBulkSelection,
  applyBulkLab,
  applyBulkServiceLevel,
  applyBulkBasePrice,
  darkMode,
}: BulkActionsPanelProps) {
  if (bulkSelectedRows.size === 0) return null;

  return (
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
          <span>🎯 Bulk Actions</span>
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
            ℹ️ Uses closest alternative if selected lab lacks capability
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
              💰 Base Price
            </button>
            <button
              onClick={() => applyBulkBasePrice(false)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                darkMode
                  ? "bg-indigo-800/50 hover:bg-indigo-700/50 text-indigo-200"
                  : "bg-indigo-100 hover:bg-indigo-200 text-indigo-700"
              }`}
            >
              💎 Base + Options
            </button>
          </div>
          <div
            className={`text-xs mt-1 ${
              darkMode ? "text-indigo-400" : "text-indigo-600"
            }`}
          >
            ℹ️ Applies to current service level for each item
          </div>
        </div>
      </div>
    </div>
  );
}

