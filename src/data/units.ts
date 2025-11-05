import { CapabilityTag, initializeLabs } from "./labs";

/** ─────────────────────────────────────────────────────────────────────────
 * UNITS.ts - Equipment to be calibrated with requirements
 * ─────────────────────────────────────────────────────────────────────────── */

export type UnitPricing = {
  base_price_usd: number;
  options_addon_usd: number;
};

export { type CapabilityTag } from "./labs";

export type Unit = {
  id: string;
  part_number: string;
  manufacturer: string;
  model_number: string;
  description: string;
  // Requirements for calibration
  requiredCapabilityTags: CapabilityTag[]; // What capability tags are needed
  pricing: UnitPricing;
  standardTime: number; // Standard calibration time in hours
  subgroup: string; // Subgroup categorization
};

/** Deterministic RNG so data stays the same on each refresh */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Base catalog "shapes" we'll remix into thousands of believable units */
const BASE_UNITS: Array<{
  manufacturer: string;
  model_number: string;
  description: string;
  part_prefix: string;
  price_anchor: number; // service level 1 base
  options_addon: number;
  typicalTags: CapabilityTag[]; // What tags this type typically needs
}> = [
  {
    manufacturer: "Fluke",
    model_number: "87V",
    description: "True RMS Industrial Multimeter",
    part_prefix: "PN-FLK-87V",
    price_anchor: 150,
    options_addon: 20,
    typicalTags: ["Electrical-DC", "Electrical-AC"],
  },
  {
    manufacturer: "Keysight",
    model_number: "34461A",
    description: "6.5 Digit Bench Multimeter",
    part_prefix: "PN-KEY-34461",
    price_anchor: 230,
    options_addon: 25,
    typicalTags: ["Electrical-DC", "Electrical-AC"],
  },
  {
    manufacturer: "Keysight",
    model_number: "34465A",
    description: "6.5 Digit Bench Multimeter (TMS Only)",
    part_prefix: "PN-KEY-34465A",
    price_anchor: 275,
    options_addon: 30,
    typicalTags: ["Electrical-DC", "Electrical-AC", "TMS-Only"],
  },
  {
    manufacturer: "Tektronix",
    model_number: "TBS1102",
    description: "100 MHz Oscilloscope",
    part_prefix: "PN-TEX-1102",
    price_anchor: 350,
    options_addon: 40,
    typicalTags: ["Electrical-AC", "Time-Freq"],
  },
  {
    manufacturer: "Tektronix",
    model_number: "MSO64",
    description: "6 GHz Mixed Signal Oscilloscope (TMS Only)",
    part_prefix: "PN-TEK-MSO64",
    price_anchor: 450,
    options_addon: 50,
    typicalTags: ["Electrical-AC", "Time-Freq", "TMS-Only"],
  },
  {
    manufacturer: "Mitutoyo",
    model_number: "500-196-30",
    description: "Digital Caliper 0–6 in / IP67",
    part_prefix: "PN-MIT-500",
    price_anchor: 65,
    options_addon: 10,
    typicalTags: ["Dimensional"],
  },
  {
    manufacturer: "Omega",
    model_number: "DP41",
    description: "Process Meter",
    part_prefix: "PN-OMG-DP41",
    price_anchor: 120,
    options_addon: 18,
    typicalTags: ["Electrical-DC", "Electrical-AC"],
  },
  {
    manufacturer: "Additel",
    model_number: "681A",
    description: "Precision Pressure Calibrator",
    part_prefix: "PN-ADT-681A",
    price_anchor: 420,
    options_addon: 55,
    typicalTags: ["Pressure"],
  },
  {
    manufacturer: "R&S",
    model_number: "NGU401",
    description: "SMU Source Measure Unit",
    part_prefix: "PN-RNS-NGU",
    price_anchor: 540,
    options_addon: 70,
    typicalTags: ["Electrical-DC"],
  },
  {
    manufacturer: "Yokogawa",
    model_number: "DLM2024",
    description: "Mixed Signal Oscilloscope",
    part_prefix: "PN-YOK-2024",
    price_anchor: 480,
    options_addon: 60,
    typicalTags: ["Electrical-AC", "Time-Freq"],
  },
  {
    manufacturer: "Hioki",
    model_number: "RM3548",
    description: "Resistance Meter",
    part_prefix: "PN-HIO-3548",
    price_anchor: 210,
    options_addon: 22,
    typicalTags: ["Electrical-DC"],
  },
  {
    manufacturer: "WIKA",
    model_number: "CPC4000",
    description: "Pressure Controller",
    part_prefix: "PN-WKA-4000",
    price_anchor: 600,
    options_addon: 80,
    typicalTags: ["Pressure"],
  },
  {
    manufacturer: "Honeywell",
    model_number: "DR4500",
    description: "Circular Chart Recorder",
    part_prefix: "PN-HON-4500",
    price_anchor: 260,
    options_addon: 30,
    typicalTags: ["Temperature"],
  },
  {
    manufacturer: "Agilent",
    model_number: "U1733C",
    description: "LCR Meter",
    part_prefix: "PN-AGI-1733",
    price_anchor: 180,
    options_addon: 20,
    typicalTags: ["Electrical-AC"],
  },
  {
    manufacturer: "Fluke",
    model_number: "115",
    description: "Compact True-RMS Digital Multimeter",
    part_prefix: "PN-FLK-115",
    price_anchor: 120,
    options_addon: 15,
    typicalTags: ["Electrical-DC", "Electrical-AC"],
  },
  {
    manufacturer: "Fluke",
    model_number: "287",
    description: "Logging Multimeter",
    part_prefix: "PN-FLK-287",
    price_anchor: 280,
    options_addon: 30,
    typicalTags: ["Electrical-DC", "Electrical-AC"],
  },
  {
    manufacturer: "Omega",
    model_number: "iBTHX",
    description: "Bluetooth Temperature and Humidity Data Logger",
    part_prefix: "PN-OMG-IBTHX",
    price_anchor: 140,
    options_addon: 15,
    typicalTags: ["Temperature", "Humidity"],
  },
  {
    manufacturer: "Ashcroft",
    model_number: "2089",
    description: "Digital Pressure Gauge",
    part_prefix: "PN-ASH-2089",
    price_anchor: 190,
    options_addon: 25,
    typicalTags: ["Pressure"],
  },
  {
    manufacturer: "Rosemount",
    model_number: "3051",
    description: "Pressure Transmitter",
    part_prefix: "PN-RSM-3051",
    price_anchor: 320,
    options_addon: 40,
    typicalTags: ["Pressure"],
  },
];

/** Keep only the first occurrence of each manufacturer+model_number combo */
function dedupeByMakeModel(units: Unit[]): Unit[] {
  const kept = new Map<string, Unit>();
  for (const u of units) {
    const key = `${u.manufacturer}|${u.model_number}`;
    if (!kept.has(key)) kept.set(key, u); // preserve first: locks part_number & price
  }
  return Array.from(kept.values());
}

/** Standard times for calibration (in hours) */
const STANDARD_TIMES = [0.1, 0.5, 1.5, 4.0, 8.0, 12.0, 16.0, 20.0];

/** Subgroups for categorization */
const SUBGROUPS = [
  "Digital Multimeter",
  "Oscilloscope, 3 or 4 Channel",
  "Frequency Counter",
  "Signal Generator",
  "Spectrum Analyzer",
  "Network Analyzer",
  "DC Power Supply",
  "Torque Wrench",
  "Caliper",
  "Outside Micrometer",
  "Gauge Block",
  "Pressure Gauge",
  "Barometer",
  "Mass Flow Meter",
];

/** Generate random standard time for a unit */
function generateStandardTime(rng: () => number): number {
  // Randomly select from standard times (common) or generate extended times
  const rand = rng();
  if (rand < 0.3) return STANDARD_TIMES[0]; // 30% chance for 0.1 hours
  if (rand < 0.5) return STANDARD_TIMES[1]; // 20% chance for 0.5 hours
  if (rand < 0.7) return STANDARD_TIMES[2]; // 20% chance for 1.5 hours
  if (rand < 0.85) return STANDARD_TIMES[3]; // 15% chance for 4 hours
  // For remaining 15%, generate a time between 5-24 hours
  return 5 + rng() * 19;
}

/** Generate random subgroup for a unit */
function generateSubgroup(rng: () => number): string {
  const rand = rng();
  return SUBGROUPS[Math.floor(rand * SUBGROUPS.length)];
}

/** Duplicate and lightly vary the base catalog into thousands of units */
function generateUnits(seed = 42, copiesPerBase = 200): Unit[] {
  const rng = mulberry32(seed);
  const out: Unit[] = [];
  let uid = 1001;

  for (const base of BASE_UNITS) {
    // Create unique variations (280 per base × 18 bases = ~5,000 units)
    for (let n = 1; n <= copiesPerBase; n++) {
      // vary prices ±20%
      const priceFactor = 0.8 + rng() * 0.4; // 0.8..1.2
      const basePrice = Math.round(base.price_anchor * priceFactor);
      const addOn = Math.round(base.options_addon * (0.8 + rng() * 0.4));

      // Generate standard time for this unit
      const standardTime = generateStandardTime(rng);
      const subgroup = generateSubgroup(rng);

      out.push({
        id: `U-${uid++}`,
        part_number: `${base.part_prefix}-${String(n).padStart(4, "0")}`,
        manufacturer: base.manufacturer,
        model_number: `${base.model_number}-${(10 + (n % 280)).toString()}`,
        description: base.description,
        requiredCapabilityTags: base.typicalTags, // Use the base tags
        pricing: {
          base_price_usd: basePrice,
          options_addon_usd: addOn,
        },
        standardTime: standardTime,
        subgroup: subgroup,
      });
    }
  }

  // Collapse duplicates so each make/model appears once under a single part number and price.
  return dedupeByMakeModel(out);
}

/** Export BIG list (18 base units × 280 unique variations = ~5,040 units after de-dupe) */
export const UNITS: Unit[] = generateUnits(1337, 3800);

// Initialize labs with units (including their capability requirements) after units are generated
initializeLabs(UNITS);
