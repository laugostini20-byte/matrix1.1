import { UNITS } from "../data/units";
import { getEligibleLabsForUnit, getAllStandards } from "../data/labs";

// ─────────────────────────────────────────────────────────────────────────────
// Helper to calculate coverage statistics
// ─────────────────────────────────────────────────────────────────────────────

export function calculateCoverageStats() {
  const stats = {
    totalUnits: UNITS.length,
    unitsWithLabs: 0,
    unitsWithoutLabs: 0,
    uncoveredPNs: [] as string[],
    avgLabsPerUnit: 0,
    totalStandards: 0,
    onsiteCapableStandards: 0,
  };

  const allStandards = getAllStandards();
  stats.totalStandards = allStandards.length;
  stats.onsiteCapableStandards = allStandards.filter(
    (s) => s.onsiteCapable
  ).length;

  let totalLabCount = 0;

  UNITS.forEach((unit) => {
    const eligibleLabs = getEligibleLabsForUnit({
      partNumber: unit.part_number,
      requiredCapabilityTags: unit.requiredCapabilityTags,
    });

    if (eligibleLabs.length > 0) {
      stats.unitsWithLabs++;
      totalLabCount += eligibleLabs.length;
    } else {
      stats.unitsWithoutLabs++;
      stats.uncoveredPNs.push(unit.part_number);
    }
  });

  stats.avgLabsPerUnit =
    stats.unitsWithLabs > 0 ? totalLabCount / stats.unitsWithLabs : 0;

  return stats;
}

