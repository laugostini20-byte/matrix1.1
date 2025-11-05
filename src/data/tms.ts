// ─────────────────────────────────────────────────────────────────────────────
// TMS (Third-Party Vendor Service) Data
// ─────────────────────────────────────────────────────────────────────────────

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

// TMS data keyed by part_number
export const tmsByPartNumber = new Map<string, TMSEntry[]>([
  // Fluke 87V - No TMS needed (has in-house capabilities)
  // "PN-FLK-87V": [] - intentionally empty to show "No TMS applicable"

  // Keysight DMM - TMS required
  [
    "PN-KEY-34465A",
    [
      {
        vendor_name: "Keysight Technologies",
        negotiated_price_usd: 275.0,
        vendor_turn_time_days: 7,
        supported_regions: ["North America", "Europe"],
        notes: "Direct manufacturer service",
      },
      {
        vendor_name: "Micro Precision",
        negotiated_price_usd: 245.0,
        vendor_turn_time_days: 10,
        supported_regions: ["North America"],
        notes: "Authorized service center",
      },
      {
        vendor_name: "Trescal",
        negotiated_price_usd: 295.0,
        vendor_turn_time_days: 5,
        supported_regions: ["Global"],
        notes: "Premium service with expedited options",
      },
    ],
  ],

  // Tektronix Oscilloscope - TMS required
  [
    "PN-TEK-MSO64",
    [
      {
        vendor_name: "Tektronix",
        negotiated_price_usd: 450.0,
        vendor_turn_time_days: 12,
        supported_regions: ["North America", "Europe", "Asia Pacific"],
        notes: "Factory calibration with certificate",
      },
      {
        vendor_name: "Fluke Calibration",
        negotiated_price_usd: 420.0,
        vendor_turn_time_days: 14,
        supported_regions: ["North America", "Europe"],
        notes: "Cross-manufacturer capability",
      },
    ],
  ],

  // Generic DMM fallback
  [
    "DMM_GENERIC",
    [
      {
        vendor_name: "Micro Precision",
        negotiated_price_usd: 200.0,
        vendor_turn_time_days: 8,
        supported_regions: ["North America"],
        notes: "Generic DMM calibration service",
      },
      {
        vendor_name: "Trescal",
        negotiated_price_usd: 225.0,
        vendor_turn_time_days: 6,
        supported_regions: ["Global"],
        notes: "Generic DMM calibration service",
      },
    ],
  ],

  // Generic Oscilloscope fallback
  [
    "OSCILLOSCOPE_GENERIC",
    [
      {
        vendor_name: "Tektronix",
        negotiated_price_usd: 350.0,
        vendor_turn_time_days: 10,
        supported_regions: ["North America", "Europe", "Asia Pacific"],
        notes: "Generic oscilloscope calibration",
      },
      {
        vendor_name: "Keysight Technologies",
        negotiated_price_usd: 375.0,
        vendor_turn_time_days: 8,
        supported_regions: ["Global"],
        notes: "Generic oscilloscope calibration",
      },
    ],
  ],

  // Generic Power Supply fallback
  [
    "POWER_SUPPLY_GENERIC",
    [
      {
        vendor_name: "Fluke Calibration",
        negotiated_price_usd: 180.0,
        vendor_turn_time_days: 7,
        supported_regions: ["North America", "Europe"],
        notes: "Generic power supply calibration",
      },
      {
        vendor_name: "Micro Precision",
        negotiated_price_usd: 165.0,
        vendor_turn_time_days: 9,
        supported_regions: ["North America"],
        notes: "Generic power supply calibration",
      },
    ],
  ],
]);

// Helper function to get TMS vendors for a unit
export function getTMSVendorsForUnit(partNumber: string): TMSEntry[] {
  // First try exact part number match
  const exactMatch = tmsByPartNumber.get(partNumber);
  if (exactMatch && exactMatch.length > 0) {
    return exactMatch;
  }

  // Try prefix matching for generated part numbers (e.g., PN-KEY-34465A-0001 matches PN-KEY-34465A)
  for (const [prefix, vendors] of tmsByPartNumber.entries()) {
    if (partNumber.startsWith(prefix + "-") && vendors.length > 0) {
      return vendors;
    }
  }

  // Fallback to generic equipment type based on part number patterns
  if (partNumber.includes("DMM") || partNumber.includes("MULTIMETER")) {
    return tmsByPartNumber.get("DMM_GENERIC") || [];
  }

  if (
    partNumber.includes("OSC") ||
    partNumber.includes("SCOPE") ||
    partNumber.includes("MSO")
  ) {
    return tmsByPartNumber.get("OSCILLOSCOPE_GENERIC") || [];
  }

  if (partNumber.includes("PWR") || partNumber.includes("POWER")) {
    return tmsByPartNumber.get("POWER_SUPPLY_GENERIC") || [];
  }

  // No TMS vendors found
  return [];
}

// Helper function to select preferred vendor based on strategy
export function selectPreferredVendor(
  vendors: TMSEntry[],
  strategy: TMSVendorStrategy = "fastest_then_cheapest"
): TMSEntry | null {
  if (vendors.length === 0) return null;
  if (vendors.length === 1) return vendors[0];

  if (strategy === "fastest_then_cheapest") {
    // Sort by turn time (ascending), then by price (ascending)
    return vendors.sort((a, b) => {
      if (a.vendor_turn_time_days !== b.vendor_turn_time_days) {
        return a.vendor_turn_time_days - b.vendor_turn_time_days;
      }
      return a.negotiated_price_usd - b.negotiated_price_usd;
    })[0];
  } else {
    // Sort by price (ascending), then by turn time (ascending)
    return vendors.sort((a, b) => {
      if (a.negotiated_price_usd !== b.negotiated_price_usd) {
        return a.negotiated_price_usd - b.negotiated_price_usd;
      }
      return a.vendor_turn_time_days - b.vendor_turn_time_days;
    })[0];
  }
}
