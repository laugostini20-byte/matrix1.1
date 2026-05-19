import type { MatchResult, Unit } from "../top-level";

type UnmatchedItemsSectionProps = {
  results: MatchResult[];
  excludedItems: Set<number>;
  researchItems: Set<number>;
  selectedMatches: Map<number, Unit>;
  onExclude: (index: number) => void;
  onSendToResearch: (index: number) => void;
  onManualMatch: (index: number) => void;
  darkMode: boolean;
};

export function UnmatchedItemsSection({
  results,
  excludedItems,
  researchItems,
  selectedMatches,
  onExclude,
  onSendToResearch,
  onManualMatch,
  darkMode,
}: UnmatchedItemsSectionProps) {
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
