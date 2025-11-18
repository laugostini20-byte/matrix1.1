import React from "react";
import type { OptimizationStrategy } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Optimization Panel Component
// ─────────────────────────────────────────────────────────────────────────────

interface OptimizationPanelProps {
  handleOptimize: (strategy: OptimizationStrategy) => void;
  saveQuoteSession: () => void;
  loadQuoteSession: () => void;
  darkMode: boolean;
}

export function OptimizationPanel({
  handleOptimize,
  saveQuoteSession,
  loadQuoteSession,
  darkMode,
}: OptimizationPanelProps) {
  return (
    <div
      className={`border rounded-2xl p-4 shadow-sm ${
        darkMode
          ? "bg-gray-800 border-gray-600"
          : "bg-white border-slate-200"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3
            className={`font-semibold mb-2 ${
              darkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Quick Actions
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleOptimize("minimize_cost")}
              className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              💰 Minimize Cost
            </button>
            <button
              onClick={() => handleOptimize("minimize_time")}
              className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              ⚡ Minimize Time
            </button>
            <button
              onClick={() => handleOptimize("balance_capacity")}
              className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              ⚖️ Balance Capacity
            </button>
          </div>
        </div>
        <div>
          <h3
            className={`font-semibold mb-2 ${
              darkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Session Management
          </h3>
          <div className="flex gap-2">
            <button
              onClick={saveQuoteSession}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              💾 Save Quote
            </button>
            <button
              onClick={loadQuoteSession}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              📂 Load Quote
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

