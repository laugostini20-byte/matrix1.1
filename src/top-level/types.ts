// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type PricingRow = {
  service_level: number; // 1-12
  base_price_usd: number;
  base_plus_options_usd: number;
};

// Upload functionality types
export type CustomerItem = {
  row: number; // Original row number for reference
  manufacturer: string;
  model: string;
  service_level?: number;
  quantity?: number;
  notes?: string;
};

// Import types from data files
import type { Unit, UnitPricing } from "../data/units";
import type { LabCapabilityForUnit } from "../data/labs";

// Re-export for convenience
export type { Unit, UnitPricing, LabCapabilityForUnit };

export type MatchResult = {
  customerItem: CustomerItem;
  matchedUnits: Unit[];
  bestMatch?: Unit;
  capabilityCount: number;
  minPrice?: number;
  maxPrice?: number;
  minTurnTime?: number;
  maxTurnTime?: number;
  labs: string[];
  hasAccredited: boolean;
  hasLimited: boolean;
};

export type UploadParseResult = {
  items: CustomerItem[];
  errors: string[];
  warnings: string[];
};

// TMS (Third-Party Vendor Service) types
export type Region = "North America" | "Europe" | "Asia Pacific" | "Global";

export type TMSEntry = {
  vendor_name: string;
  negotiated_price_usd: number;
  vendor_turn_time_days: number;
  supported_regions?: Region[];
  notes?: string;
};

export type TMSVendorStrategy =
  | "fastest_then_cheapest"
  | "cheapest_then_fastest";

export type TransferType = "TMS" | null;
