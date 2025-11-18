import type { LabCapabilityForUnit } from "../top-level";
import { getCapacityColor, getCapacityTextColor } from "../top-level";

// ─────────────────────────────────────────────────────────────────────────────
// Lab Recommendation System
// ─────────────────────────────────────────────────────────────────────────────

export interface LabRecommendation {
  score: number; // 0-100
  breakdown: {
    capacityColors: string;
    capacityTextColors: string;
    capacityScore: number; // 0-30 points
    experienceScore: number; // 0-30 points
    turnaroundScore: number; // 0-25 points
    standardsScore: number; // 0-15 points
    accreditationBonus: number; // 0-15 points
  };
  details: {
    capacity: number;
    experience: number; // number of matching standards
    avgTurnaround: number;
    totalStandards: number;
    isAccredited: boolean;
  };
}

/**
 * Calculate lab recommendation score based on multiple factors
 * Higher score = better recommendation
 */
export function calculateLabRecommendation(
  labCapability: LabCapabilityForUnit,
  capacity: number
): LabRecommendation {
  const { matchingStandards, stockTT, recalTT, isAccredited } = labCapability;

  // 1. Capacity Score (0-30 points) - Lower capacity is better (more availability)
  const capacityScore = Math.max(0, 30 - (capacity / 100) * 30);

  // 2. Experience Score (0-30 points) - More matching standards = more experience
  const experienceScore = Math.min(30, matchingStandards.length * 10); // 10 points per standard, max 30

  // 3. Turnaround Score (0-25 points) - Lower turnaround time is better
  const avgTurnaround = (stockTT + recalTT) / 2;
  const turnaroundScore = Math.max(0, 25 - (avgTurnaround / 30) * 25); // Scale based on 30 days max

  // 4. Standards Score (0-15 points) - More total standards = more capability
  const totalStandards = labCapability.matchingStandards.length; // Using matching standards as proxy
  const standardsScore = Math.min(15, totalStandards * 3); // 3 points per standard, max 15

  // 5. Accreditation Bonus (0-15 points) - Accredited labs get bonus points
  const accreditationBonus = isAccredited ? 15 : 0;

  const totalScore =
    capacityScore +
    experienceScore +
    turnaroundScore +
    standardsScore +
    accreditationBonus;

  // Get colors for capacity display (keeping original capacity colors)
  const capacityColors = getCapacityColor(capacity);
  const capacityTextColors = getCapacityTextColor(capacity);

  return {
    score: Math.round(totalScore),
    breakdown: {
      capacityColors,
      capacityTextColors,
      capacityScore: Math.round(capacityScore),
      experienceScore: Math.round(experienceScore),
      turnaroundScore: Math.round(turnaroundScore),
      standardsScore: Math.round(standardsScore),
      accreditationBonus: Math.round(accreditationBonus),
    },
    details: {
      capacity,
      experience: matchingStandards.length,
      avgTurnaround: Math.round(avgTurnaround * 10) / 10,
      totalStandards,
      isAccredited,
    },
  };
}

/**
 * Get recommendation bar colors based on score
 */
export function getRecommendationColors(score: number): {
  bg: string;
  text: string;
} {
  if (score >= 80) return { bg: "bg-green-500", text: "text-green-700" };
  if (score >= 60) return { bg: "bg-yellow-400", text: "text-yellow-800" };
  if (score >= 40) return { bg: "bg-orange-500", text: "text-orange-800" };
  return { bg: "bg-red-500", text: "text-red-700" };
}

