import { DonutChart, HorizontalBarChart, money, SERVICE_LEVEL_DESC } from "../../top-level";
import type { MatchResult } from "../../top-level";

type QuoteChartsProps = {
  results: MatchResult[];
  getSelectedLab: (rowIndex: number) => string;
  darkMode: boolean;
  selectedPrices: Map<number, number>;
  getSelectedServiceLevels: (rowIndex: number) => Set<number>;
};

export function QuoteCharts({
  results,
  getSelectedLab,
  darkMode,
  selectedPrices,
  getSelectedServiceLevels,
}: QuoteChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Lab Distribution Donut Chart */}
      {(() => {
        const labCounts = new Map<string, number>();
        results.forEach((_, i) => {
          const lab = getSelectedLab(i);
          if (lab) {
            labCounts.set(lab, (labCounts.get(lab) || 0) + 1);
          }
        });

        if (labCounts.size === 0) return null;

        const chartData = Array.from(labCounts.entries()).map(
          ([lab, count], i) => ({
            label: lab,
            value: count,
            color: [
              "#3b82f6",
              "#10b981",
              "#f59e0b",
              "#ef4444",
              "#8b5cf6",
              "#ec4899",
              "#06b6d4",
              "#84cc16",
            ][i % 8],
          })
        );

        return (
          <DonutChart
            title="🏭 Lab Distribution"
            data={chartData}
            darkMode={darkMode}
          />
        );
      })()}

      {/* Cost Breakdown Bar Chart */}
      {selectedPrices.size > 0 &&
        (() => {
          const serviceLevelData = new Map<
            number,
            { total: number; count: number }
          >();
          results.forEach((result, i) => {
            const price = selectedPrices.get(i);
            const selectedServiceLevels = getSelectedServiceLevels(i);
            if (price && selectedServiceLevels.size > 0) {
              const quantity = result.customerItem.quantity || 1;

              // For multi-select, distribute the price across all selected levels
              const pricePerLevel = price / selectedServiceLevels.size;

              selectedServiceLevels.forEach((serviceLevel) => {
                const current = serviceLevelData.get(serviceLevel) || {
                  total: 0,
                  count: 0,
                };
                serviceLevelData.set(serviceLevel, {
                  total: current.total + pricePerLevel * quantity,
                  count: current.count + 1,
                });
              });
            }
          });

          if (serviceLevelData.size === 0) return null;

          const chartData = Array.from(serviceLevelData.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([level, data]) => ({
              label: `L${level}`,
              value: data.total,
              count: data.count,
              color: `linear-gradient(90deg, ${
                level <= 2
                  ? "#60a5fa, #3b82f6"
                  : level <= 4
                  ? "#34d399, #10b981"
                  : level <= 6
                  ? "#fbbf24, #f59e0b"
                  : level <= 8
                  ? "#a78bfa, #8b5cf6"
                  : level <= 10
                  ? "#fb7185, #f43f5e"
                  : "#fb923c, #ea580c"
              })`,
            }));

          return (
            <HorizontalBarChart
              title="💰 Cost by Service Level"
              data={chartData.map((item) => ({
                ...item,
                label: `Level ${item.label.replace("L", "")} - ${
                  SERVICE_LEVEL_DESC[
                    parseInt(item.label.replace("L", ""))
                  ]
                }`,
                maxLabel: `${money(item.value)} (${item.count} items)`,
              }))}
              darkMode={darkMode}
            />
          );
        })()}
    </div>
  );
}
