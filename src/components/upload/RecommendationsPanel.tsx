import type { MatchResult, Unit } from "../../top-level";
import { generateRecommendations } from "../../top-level";

export type RecommendationsPanelProps = {
  results: MatchResult[];
  selectedMatches: Map<number, Unit>;
  getSelectedLab: (rowIndex: number) => string;
  selectedPrices: Map<number, number>;
};

export function RecommendationsPanel({
  results,
  selectedMatches,
  getSelectedLab,
  selectedPrices,
}: RecommendationsPanelProps) {
  return (
    <>
      {results.length > 0 &&
        (() => {
          // Rebuild selectedLabs map for recommendations
          const computedSelectedLabs = new Map<number, string>();
          results.forEach((_, i) => {
            const lab = getSelectedLab(i);
            if (lab) computedSelectedLabs.set(i, lab);
          });

          const recommendations = generateRecommendations(
            results,
            selectedMatches,
            computedSelectedLabs,
            selectedPrices
          );

          if (recommendations.length === 0) return null;

          return (
            <div className="glass-card p-6 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">💡</span>
                <h3 className="text-xl font-bold text-gray-900">
                  Smart Recommendations
                </h3>
                <span className="badge badge-info ml-auto">
                  {recommendations.length} tips
                </span>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-modern">
                {recommendations.slice(0, 10).map((rec, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
                      rec.type === "warning"
                        ? "bg-amber-50 border border-amber-200 text-amber-800"
                        : rec.type === "info"
                        ? "bg-blue-50 border border-blue-200 text-blue-800"
                        : "bg-green-50 border border-green-200 text-green-800"
                    }`}
                  >
                    <span className="text-lg flex-shrink-0">
                      {rec.type === "warning"
                        ? "⚠️"
                        : rec.type === "info"
                        ? "ℹ️"
                        : "✅"}
                    </span>
                    <div className="flex-1">{rec.message}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
    </>
  );
}
