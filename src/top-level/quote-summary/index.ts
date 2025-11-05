// ─────────────────────────────────────────────────────────────────────────────
// Quote Summary Types and Calculations
// ─────────────────────────────────────────────────────────────────────────────

import { getEligibleLabsForUnit } from "../../data/labs";
import type { Unit, MatchResult } from "../types";

export type QuoteSummary = {
  totalItems: number;
  configuredItems: number;
  totalPrice: number;
  maxPossiblePrice: number;
  savings: number;
  avgTurnaroundTime: number;
  labBreakdown: { lab: string; count: number; total: number }[];
};

/**
 * Calculate comprehensive quote summary from match results and user selections
 */
export function calculateQuoteSummary(
  results: MatchResult[],
  selectedMatches: Map<number, Unit>,
  selectedPrices: Map<number, number>,
  selectedLabs: Map<number, string>
): QuoteSummary {
  let totalPrice = 0;
  let maxPossiblePrice = 0;
  let totalTurnaround = 0;
  let configuredItems = 0;
  const labCounts: Record<string, { count: number; total: number }> = {};

  results.forEach((result, index) => {
    const selectedUnit = selectedMatches.get(index);
    const selectedPrice = selectedPrices.get(index);
    const selectedLab = selectedLabs.get(index);

    if (selectedUnit && selectedPrice && selectedLab) {
      configuredItems++;
      totalPrice += selectedPrice;

      // Add to lab breakdown
      if (!labCounts[selectedLab]) {
        labCounts[selectedLab] = { count: 0, total: 0 };
      }
      labCounts[selectedLab].count++;
      labCounts[selectedLab].total += selectedPrice;

      // Get turnaround time
      const labCap = getEligibleLabsForUnit({
        partNumber: selectedUnit.part_number,
        requiredCapabilityTags: selectedUnit.requiredCapabilityTags,
      }).find((cap) => cap.labName === selectedLab);

      if (labCap) {
        totalTurnaround += labCap.recalTT || 10;
      }
    }

    // Calculate max possible price from result
    if (result.maxPrice) {
      maxPossiblePrice += result.maxPrice;
    }
  });

  const avgTurnaroundTime =
    configuredItems > 0 ? totalTurnaround / configuredItems : 0;
  const savings = maxPossiblePrice - totalPrice;

  const labBreakdown = Object.entries(labCounts).map(([lab, data]) => ({
    lab,
    count: data.count,
    total: data.total,
  }));

  return {
    totalItems: results.length,
    configuredItems,
    totalPrice,
    maxPossiblePrice,
    savings,
    avgTurnaroundTime: Math.round(avgTurnaroundTime),
    labBreakdown,
  };
}
