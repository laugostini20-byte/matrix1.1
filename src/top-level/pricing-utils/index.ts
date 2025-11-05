// ─────────────────────────────────────────────────────────────────────────────
// Pricing Calculation Utilities
// ─────────────────────────────────────────────────────────────────────────────

import { ALL_LEVELS } from "../constants";
import type { UnitPricing, PricingRow } from "../types";

/**
 * Round to nearest cent
 */
export function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Calculate price for a specific service level using compounding 10% increases
 */
export function calculateServiceLevelPrice(
  basePrice: number,
  level: number
): number {
  if (level === 1) return basePrice;
  const multiplier = Math.pow(1.1, level - 1);
  return roundCents(basePrice * multiplier);
}

/**
 * Generate all pricing rows for a unit based on its base pricing
 */
export function generatePricingRows(unitPricing: UnitPricing): PricingRow[] {
  return ALL_LEVELS.map((level: number) => {
    const basePrice = calculateServiceLevelPrice(
      unitPricing.base_price_usd,
      level
    );
    const basePlusOptions = calculateServiceLevelPrice(
      unitPricing.base_price_usd + unitPricing.options_addon_usd,
      level
    );
    return {
      service_level: level,
      base_price_usd: basePrice,
      base_plus_options_usd: basePlusOptions,
    };
  });
}

/**
 * Legacy function for compatibility - now just generates all levels
 */
export function normalizePricing(unitPricing: UnitPricing): PricingRow[] {
  return generatePricingRows(unitPricing);
}
