// ─────────────────────────────────────────────────────────────────────────────
// Optimization and Recommendations Utilities
// ─────────────────────────────────────────────────────────────────────────────

import { LAB_CAPACITY } from "../constants";
import { getEligibleLabsForUnit } from "../../data/labs";
import { generatePricingRows } from "../pricing-utils";
import type { Unit, MatchResult, LabCapabilityForUnit } from "../types";

export type Recommendation = {
  type: "warning" | "info" | "success";
  message: string;
  rowIndex: number;
  action?: string;
};

export type OptimizationStrategy =
  | "minimize_cost"
  | "minimize_time"
  | "balance_capacity";

export type OptimizationResult = {
  matches: Map<number, Unit>;
  labs: Map<number, string>;
  prices: Map<number, number>;
  serviceLevels: Map<number, number>;
};

/**
 * Generate smart recommendations based on current selections
 */
export function generateRecommendations(
  results: MatchResult[],
  selectedMatches: Map<number, Unit>,
  selectedLabs: Map<number, string>,
  selectedPrices: Map<number, number>
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  results.forEach((result, i) => {
    const selectedMatch = selectedMatches.get(i);
    const selectedLab = selectedLabs.get(i);
    const selectedPrice = selectedPrices.get(i);

    if (!selectedMatch || !selectedLab) return;

    // Check lab capacity
    const capacity = LAB_CAPACITY[selectedLab] || 50;
    if (capacity >= 85) {
      recommendations.push({
        type: "warning",
        message: `Row ${result.customerItem.row}: ${selectedLab} is at ${capacity}% capacity. Consider alternative labs.`,
        rowIndex: i,
        action: "High capacity alert",
      });
    }

    // Check for cost savings
    const eligibleLabs = getEligibleLabsForUnit({
      partNumber: selectedMatch.part_number,
      requiredCapabilityTags: selectedMatch.requiredCapabilityTags,
    });

    if (selectedPrice && eligibleLabs.length > 1) {
      // Find if there's a cheaper option at a low-capacity lab
      const lowCapacityLabs = eligibleLabs.filter(
        (lab) => LAB_CAPACITY[lab.labName] < 60
      );

      if (lowCapacityLabs.length > 0 && capacity > 60) {
        recommendations.push({
          type: "info",
          message: `Row ${result.customerItem.row}: ${lowCapacityLabs.length} labs with lower capacity available for better turn time reliability.`,
          rowIndex: i,
        });
      }
    }

    // Check if price is not selected
    if (!selectedPrice) {
      recommendations.push({
        type: "warning",
        message: `Row ${result.customerItem.row}: Price not selected yet.`,
        rowIndex: i,
      });
    }
  });

  return recommendations;
}

/**
 * Auto-optimize selections based on strategy
 */
export function optimizeSelections(
  results: MatchResult[],
  selectedMatches: Map<number, Unit>,
  strategy: OptimizationStrategy
): OptimizationResult {
  const matches = new Map<number, Unit>();
  const labs = new Map<number, string>();
  const prices = new Map<number, number>();
  const serviceLevels = new Map<number, number>();

  // For minimize_time strategy, we need to analyze all items first to find the best lab consolidation
  let preferredLab: string | null = null;

  if (strategy === "minimize_time") {
    // First pass: analyze all items to find the lab that can handle the most items
    const labItemCounts = new Map<
      string,
      { count: number; avgRecalTT: number; totalRecalTT: number }
    >();

    results.forEach((result, i) => {
      let selectedMatch = selectedMatches.get(i);
      if (!selectedMatch && result.bestMatch) {
        selectedMatch = result.bestMatch;
        matches.set(i, selectedMatch);
      } else if (selectedMatch) {
        matches.set(i, selectedMatch);
      }

      if (!selectedMatch) return;

      const eligibleLabs = getEligibleLabsForUnit({
        partNumber: selectedMatch.part_number,
        requiredCapabilityTags: selectedMatch.requiredCapabilityTags,
      });

      if (eligibleLabs.length === 0) return;

      // Count how many items each lab can handle
      eligibleLabs.forEach((lab) => {
        const current = labItemCounts.get(lab.labName) || {
          count: 0,
          avgRecalTT: 0,
          totalRecalTT: 0,
        };
        current.count += 1;
        current.totalRecalTT += lab.recalTT;
        current.avgRecalTT = current.totalRecalTT / current.count;
        labItemCounts.set(lab.labName, current);
      });
    });

    // Find the lab that can handle the most items
    // If there's a tie, prefer the one with better (lower) average recal time
    let maxItems = 0;
    let bestAvgRecalTT = Infinity;

    for (const [labName, data] of labItemCounts) {
      if (
        data.count > maxItems ||
        (data.count === maxItems && data.avgRecalTT < bestAvgRecalTT)
      ) {
        maxItems = data.count;
        bestAvgRecalTT = data.avgRecalTT;
        preferredLab = labName;
      }
    }
  }

  results.forEach((result, i) => {
    // Auto-select best match if not already selected
    let selectedMatch = selectedMatches.get(i);
    if (!selectedMatch && result.bestMatch) {
      selectedMatch = result.bestMatch;
      matches.set(i, selectedMatch);
    } else if (selectedMatch) {
      matches.set(i, selectedMatch);
    }

    if (!selectedMatch) return;

    const eligibleLabs = getEligibleLabsForUnit({
      partNumber: selectedMatch.part_number,
      requiredCapabilityTags: selectedMatch.requiredCapabilityTags,
    });

    if (eligibleLabs.length === 0) return;

    let chosenLab: LabCapabilityForUnit;

    switch (strategy) {
      case "minimize_cost":
        // Choose lab with best turn time (lower stock TT = lower cost typically)
        chosenLab = eligibleLabs.reduce((best, current) =>
          current.stockTT < best.stockTT ? current : best
        );
        serviceLevels.set(i, 1); // Lowest service level
        break;

      case "minimize_time":
        // First try to use the preferred lab (the one that can handle most items)
        if (preferredLab) {
          const preferredLabOption = eligibleLabs.find(
            (lab) => lab.labName === preferredLab
          );
          if (preferredLabOption) {
            chosenLab = preferredLabOption;
          } else {
            // Fallback to fastest recal time if preferred lab can't handle this item
            chosenLab = eligibleLabs.reduce((best, current) =>
              current.recalTT < best.recalTT ? current : best
            );
          }
        } else {
          // Fallback to fastest recal time if no preferred lab found
          chosenLab = eligibleLabs.reduce((best, current) =>
            current.recalTT < best.recalTT ? current : best
          );
        }
        serviceLevels.set(i, result.customerItem.service_level || 3);
        break;

      case "balance_capacity":
        // Choose lab with lowest capacity
        chosenLab = eligibleLabs.reduce((best, current) => {
          const bestCap = LAB_CAPACITY[best.labName] || 50;
          const currentCap = LAB_CAPACITY[current.labName] || 50;
          return currentCap < bestCap ? current : best;
        });
        serviceLevels.set(i, result.customerItem.service_level || 3);
        break;

      default:
        chosenLab = eligibleLabs[0];
    }

    labs.set(i, chosenLab.labName);

    // Set price based on service level
    const serviceLevel = serviceLevels.get(i) || 1;
    const pricing = generatePricingRows(selectedMatch.pricing);
    const levelPricing = pricing.find((p) => p.service_level === serviceLevel);
    if (levelPricing) {
      prices.set(i, levelPricing.base_price_usd);
    }
  });

  return { matches, labs, prices, serviceLevels };
}
