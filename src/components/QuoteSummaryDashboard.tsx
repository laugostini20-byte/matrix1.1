import type { QuoteSummary } from "../top-level";
import { money } from "../top-level";

type QuoteSummaryDashboardProps = {
  summary: QuoteSummary;
  darkMode: boolean;
  onExportPDF: () => void;
  onExportExcel: () => void;
};

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
