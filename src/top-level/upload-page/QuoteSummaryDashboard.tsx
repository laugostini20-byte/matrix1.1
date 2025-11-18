import React from "react";
import type { QuoteSummary } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Quote Summary Dashboard Component
// ─────────────────────────────────────────────────────────────────────────────

interface QuoteSummaryDashboardProps {
  summary: QuoteSummary;
  darkMode: boolean;
  onExportPDF: () => void;
  onExportExcel: () => void;
}

export function QuoteSummaryDashboard({
  summary,
  darkMode,
  onExportPDF,
  onExportExcel,
}: QuoteSummaryDashboardProps) {
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
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 ${
              darkMode
                ? "bg-red-700 text-white hover:bg-red-600"
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
          >
            📄 Export PDF
          </button>
          <button
            onClick={onExportExcel}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 ${
              darkMode
                ? "bg-green-700 text-white hover:bg-green-600"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            📊 Export Excel
          </button>
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Value */}
        <div
          className={`p-4 rounded-lg border ${
            darkMode
              ? "bg-blue-900/20 border-blue-700/50"
              : "bg-blue-50 border-blue-200"
          }`}
        >
          <div
            className={`text-xs uppercase tracking-wide font-semibold mb-1 ${
              darkMode ? "text-blue-300" : "text-blue-700"
            }`}
          >
            Total Value
          </div>
          <div
            className={`text-2xl font-bold ${
              darkMode ? "text-blue-100" : "text-blue-900"
            }`}
          >
            ${summary.totalValue?.toFixed(2) || "0.00"}
          </div>
        </div>

        {/* Configured Items */}
        <div
          className={`p-4 rounded-lg border ${
            darkMode
              ? "bg-green-900/20 border-green-700/50"
              : "bg-green-50 border-green-200"
          }`}
        >
          <div
            className={`text-xs uppercase tracking-wide font-semibold mb-1 ${
              darkMode ? "text-green-300" : "text-green-700"
            }`}
          >
            Configured
          </div>
          <div
            className={`text-2xl font-bold ${
              darkMode ? "text-green-100" : "text-green-900"
            }`}
          >
            {summary.configuredItems} / {summary.totalItems}
          </div>
        </div>

        {/* Average Turn Time */}
        <div
          className={`p-4 rounded-lg border ${
            darkMode
              ? "bg-amber-900/20 border-amber-700/50"
              : "bg-amber-50 border-amber-200"
          }`}
        >
          <div
            className={`text-xs uppercase tracking-wide font-semibold mb-1 ${
              darkMode ? "text-amber-300" : "text-amber-700"
            }`}
          >
            Avg Turn Time
          </div>
          <div
            className={`text-2xl font-bold ${
              darkMode ? "text-amber-100" : "text-amber-900"
            }`}
          >
            {summary.avgTurnTime || "—"} days
          </div>
        </div>

        {/* Lab Distribution */}
        <div
          className={`p-4 rounded-lg border ${
            darkMode
              ? "bg-purple-900/20 border-purple-700/50"
              : "bg-purple-50 border-purple-200"
          }`}
        >
          <div
            className={`text-xs uppercase tracking-wide font-semibold mb-1 ${
              darkMode ? "text-purple-300" : "text-purple-700"
            }`}
          >
            Unique Labs
          </div>
          <div
            className={`text-2xl font-bold ${
              darkMode ? "text-purple-100" : "text-purple-900"
            }`}
          >
            {summary.uniqueLabs || 0}
          </div>
        </div>
      </div>

      {/* Configuration Progress */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <span
            className={`text-sm font-medium ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
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

