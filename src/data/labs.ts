/** ─────────────────────────────────────────────────────────────────────────
 * LABS.ts - Lab locations with properties and nested standards
 * ─────────────────────────────────────────────────────────────────────────── */

export type Region = "Northeast" | "Midwest" | "South" | "West";

// Capability tags that describe what a standard can do
export type CapabilityTag =
  | "Electrical-DC"
  | "Electrical-AC"
  | "Electrical-RF"
  | "Pressure"
  | "Temperature"
  | "Dimensional"
  | "Flow"
  | "Force"
  | "Humidity"
  | "Time-Freq"
  | "TMS-Only";

export type StandardInLab = {
  standardId: string; // Unique ID (e.g., STD-00001)
  make: string;
  model: string;
  capabilityTags: CapabilityTag[]; // What this standard can calibrate
  onsiteCapable: boolean; // Can it be deployed for onsite work?
  supportedPNs: string[]; // Which part numbers can this standard calibrate
};

export type Lab = {
  code: string; // e.g., "ROC"
  name: string; // e.g., "Rochester Lab"
  region: Region;
  stockTT: number; // Stock turnaround time in days
  recalTT: number; // Recalibration turnaround time in days
  repairTT: number; // Repair turnaround time in days
  isAccredited: boolean; // Does this lab have accreditation?
  standards: StandardInLab[]; // All standards at this lab
};

/** Deterministic RNG */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function between(rng: () => number, min: number, max: number) {
  return Math.floor(min + rng() * (max - min + 1));
}

function choice<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function sample<T>(rng: () => number, arr: T[], k: number): T[] {
  if (k >= arr.length) return [...arr];
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, k);
}

/** Standard make/model templates */
const STANDARD_TEMPLATES = [
  {
    make: "Fluke",
    model: "5522A",
    tags: ["Electrical-DC", "Electrical-AC"] as CapabilityTag[],
    onsite: true,
  },
  {
    make: "Fluke",
    model: "5502A",
    tags: ["Electrical-DC", "Electrical-AC"] as CapabilityTag[],
    onsite: true,
  },
  {
    make: "Fluke",
    model: "5700A",
    tags: ["Electrical-DC", "Electrical-AC"] as CapabilityTag[],
    onsite: false, // Larger benchtop system
  },
  {
    make: "Fluke",
    model: "5720A",
    tags: ["Electrical-DC", "Electrical-AC"] as CapabilityTag[],
    onsite: false, // Larger benchtop system
  },
  {
    make: "Keysight",
    model: "3458A",
    tags: ["Electrical-DC", "Electrical-AC"] as CapabilityTag[],
    onsite: true, // Portable DMM
  },
  {
    make: "Keysight",
    model: "ECal N4691B",
    tags: ["Electrical-RF"] as CapabilityTag[],
    onsite: false, // Specialized RF equipment
  },
  {
    make: "Keysight",
    model: "34470A",
    tags: ["Electrical-DC", "Electrical-AC"] as CapabilityTag[],
    onsite: true, // Portable DMM
  },
  {
    make: "Tektronix",
    model: "AFG31000",
    tags: ["Electrical-AC", "Time-Freq"] as CapabilityTag[],
    onsite: true, // Portable function generator
  },
  {
    make: "Tektronix",
    model: "MSO54",
    tags: ["Electrical-AC", "Time-Freq"] as CapabilityTag[],
    onsite: false, // Larger oscilloscope
  },
  {
    make: "R&S",
    model: "SMBV100B",
    tags: ["Electrical-RF"] as CapabilityTag[],
    onsite: false, // Larger signal generator
  },
  {
    make: "R&S",
    model: "FSV3000",
    tags: ["Electrical-RF"] as CapabilityTag[],
    onsite: false, // Larger spectrum analyzer
  },
  {
    make: "WIKA",
    model: "CPC6050",
    tags: ["Pressure"] as CapabilityTag[],
    onsite: true, // Portable pressure calibrator
  },
  {
    make: "Additel",
    model: "761A",
    tags: ["Pressure"] as CapabilityTag[],
    onsite: true,
  },
  {
    make: "Additel",
    model: "ADT780",
    tags: ["Temperature"] as CapabilityTag[],
    onsite: true,
  },
  {
    make: "Yokogawa",
    model: "2558A",
    tags: ["Temperature"] as CapabilityTag[],
    onsite: true, // Portable temperature calibrator
  },
  {
    make: "Yokogawa",
    model: "GS200",
    tags: ["Electrical-DC"] as CapabilityTag[],
    onsite: true, // Portable DC source
  },
  {
    make: "Hioki",
    model: "IM7583",
    tags: ["Electrical-AC"] as CapabilityTag[],
    onsite: true, // Portable impedance analyzer
  },
  {
    make: "Time Electronics",
    model: "5051",
    tags: ["Electrical-DC", "Electrical-AC"] as CapabilityTag[],
    onsite: true, // Portable multifunction calibrator
  },
  {
    make: "Beamex",
    model: "MC6",
    tags: ["Pressure", "Temperature"] as CapabilityTag[],
    onsite: true,
  },
  {
    make: "Flir",
    model: "Calibrated IR Source",
    tags: ["Temperature"] as CapabilityTag[],
    onsite: true,
  },
  {
    make: "Omega",
    model: "CL543B",
    tags: ["Temperature"] as CapabilityTag[],
    onsite: true,
  },
  {
    make: "Druck",
    model: "PACE5000",
    tags: ["Pressure"] as CapabilityTag[],
    onsite: true, // Portable pressure controller
  },
  {
    make: "Mitutoyo",
    model: "568-925",
    tags: ["Dimensional"] as CapabilityTag[],
    onsite: true, // Portable dimensional standard
  },
  {
    make: "Starrett",
    model: "762MXZ",
    tags: ["Dimensional"] as CapabilityTag[],
    onsite: true, // Portable dimensional standard
  },
  // Additional Electrical Standards
  {
    make: "Fluke",
    model: "8588A",
    tags: ["Electrical-DC", "Electrical-AC"] as CapabilityTag[],
    onsite: true,
  },
  {
    make: "Fluke",
    model: "5730A",
    tags: ["Electrical-DC", "Electrical-AC"] as CapabilityTag[],
    onsite: false,
  },
  {
    make: "Keysight",
    model: "3458A",
    tags: ["Electrical-DC"] as CapabilityTag[],
    onsite: true,
  },
  {
    make: "Keysight",
    model: "N9010A",
    tags: ["Electrical-RF"] as CapabilityTag[],
    onsite: false,
  },
  {
    make: "Transmille",
    model: "4000",
    tags: ["Electrical-DC", "Electrical-AC"] as CapabilityTag[],
    onsite: true,
  },
  // Additional Pressure Standards
  {
    make: "Fluke",
    model: "719Pro",
    tags: ["Pressure"] as CapabilityTag[],
    onsite: true,
  },
  {
    make: "Mensor",
    model: "CPC6000",
    tags: ["Pressure"] as CapabilityTag[],
    onsite: false,
  },
  {
    make: "DH Instruments",
    model: "PPC4",
    tags: ["Pressure"] as CapabilityTag[],
    onsite: false,
  },
  {
    make: "Additel",
    model: "ADT672",
    tags: ["Pressure"] as CapabilityTag[],
    onsite: true,
  },
  // Additional Temperature Standards
  {
    make: "Fluke",
    model: "1586A",
    tags: ["Temperature"] as CapabilityTag[],
    onsite: true,
  },
  {
    make: "Fluke",
    model: "7103",
    tags: ["Temperature"] as CapabilityTag[],
    onsite: false,
  },
  {
    make: "Ametek",
    model: "RTC-700",
    tags: ["Temperature"] as CapabilityTag[],
    onsite: false,
  },
  {
    make: "Hart Scientific",
    model: "9102S",
    tags: ["Temperature"] as CapabilityTag[],
    onsite: true,
  },
  // Flow Standards
  {
    make: "Bios",
    model: "DryCal",
    tags: ["Flow"] as CapabilityTag[],
    onsite: true,
  },
  {
    make: "Sensidyne",
    model: "Gilibrator",
    tags: ["Flow"] as CapabilityTag[],
    onsite: true,
  },
  {
    make: "Mesa Labs",
    model: "DryCal",
    tags: ["Flow"] as CapabilityTag[],
    onsite: true,
  },
  // Force Standards
  {
    make: "Morehouse",
    model: "PG-25",
    tags: ["Force"] as CapabilityTag[],
    onsite: false,
  },
  {
    make: "Flintec",
    model: "PC6",
    tags: ["Force"] as CapabilityTag[],
    onsite: true,
  },
  {
    make: "Rice Lake",
    model: "RL1210",
    tags: ["Force"] as CapabilityTag[],
    onsite: true,
  },
  // Humidity Standards
  {
    make: "Thunder Scientific",
    model: "2500",
    tags: ["Humidity"] as CapabilityTag[],
    onsite: false,
  },
  {
    make: "Vaisala",
    model: "HMK15",
    tags: ["Humidity"] as CapabilityTag[],
    onsite: true,
  },
  {
    make: "Rotronic",
    model: "HygroGen2",
    tags: ["Humidity"] as CapabilityTag[],
    onsite: false,
  },
  // Time-Freq Standards
  {
    make: "Fluke",
    model: "PM6681",
    tags: ["Time-Freq"] as CapabilityTag[],
    onsite: true,
  },
  {
    make: "Keysight",
    model: "53230A",
    tags: ["Time-Freq"] as CapabilityTag[],
    onsite: true,
  },
  // Additional Dimensional Standards
  {
    make: "Mitutoyo",
    model: "LSM-6200",
    tags: ["Dimensional"] as CapabilityTag[],
    onsite: false,
  },
  {
    make: "Starrett",
    model: "3600",
    tags: ["Dimensional"] as CapabilityTag[],
    onsite: true,
  },
  {
    make: "Brown & Sharpe",
    model: "MicroVal",
    tags: ["Dimensional"] as CapabilityTag[],
    onsite: false,
  },
];

/** Generate standards for a single lab */
function generateLabStandards(
  labCode: string,
  allPNs: string[],
  pnToRequirements: Map<string, CapabilityTag[]>,
  seed: number,
  pnCoverageMap: Map<string, number>
): StandardInLab[] {
  const rng = mulberry32(seed);
  const standards: StandardInLab[] = [];
  let idCounter = parseInt(labCode, 36) * 1000; // Offset IDs by lab

  // Each lab gets 50-70 standards (23 labs * ~60 avg = ~1,380 total for full coverage)
  const standardCount = between(rng, 50, 70);

  for (let i = 0; i < standardCount; i++) {
    const template = choice(rng, STANDARD_TEMPLATES);

    // Filter PNs that this standard can actually calibrate (matching capability tags)
    const compatiblePNs = allPNs.filter(pn => {
      const requiredTags = pnToRequirements.get(pn) || [];
      // Standard must have ALL required tags
      return requiredTags.every(tag => template.tags.includes(tag));
    });

    if (compatiblePNs.length === 0) {
      // Skip this standard if no PNs are compatible
      continue;
    }

    // Each standard supports 50-200 compatible PNs (more coverage with fewer standards)
    const pnCount = Math.min(between(rng, 50, 200), compatiblePNs.length);
    
    // Strongly prioritize under-covered PNs from compatible ones
    const underCoveredCompatible = compatiblePNs.filter(
      pn => (pnCoverageMap.get(pn) || 0) < 2
    );
    
    let supportedPNs: string[];
    if (underCoveredCompatible.length > 0) {
      // Prioritize under-covered PNs (80% of selection)
      const priorityCount = Math.min(
        Math.ceil(pnCount * 0.8),
        underCoveredCompatible.length
      );
      const priorityPNs = sample(rng, underCoveredCompatible, priorityCount);
      const remainingCount = pnCount - priorityPNs.length;
      const randomPNs = remainingCount > 0 
        ? sample(rng, compatiblePNs, remainingCount)
        : [];
      supportedPNs = [...new Set([...priorityPNs, ...randomPNs])];
    } else {
      supportedPNs = sample(rng, compatiblePNs, pnCount);
    }

    // Update coverage map
    supportedPNs.forEach(pn => {
      pnCoverageMap.set(pn, (pnCoverageMap.get(pn) || 0) + 1);
    });

    standards.push({
      standardId: `STD-${String(idCounter++).padStart(5, "0")}`,
      make: template.make,
      model: template.model,
      capabilityTags: template.tags,
      onsiteCapable: template.onsite,
      supportedPNs: supportedPNs,
    });
  }

  return standards;
}

/** Build all labs with their standards */
export function generateLabs(
  allPNs: string[],
  pnToRequirements: Map<string, CapabilityTag[]>
): Lab[] {
  const labConfigs = [
    { code: "ROC", name: "Rochester Lab", region: "Northeast" as Region },
    { code: "POR", name: "Portland Lab", region: "West" as Region },
    { code: "HOU", name: "Houston Lab", region: "South" as Region },
    { code: "PHL", name: "Philadelphia Lab", region: "Northeast" as Region },
    { code: "TOR", name: "Toronto Lab", region: "Northeast" as Region },
    { code: "MTL", name: "Montreal Lab", region: "Northeast" as Region },
    { code: "BOS", name: "Boston Lab", region: "Northeast" as Region },
    { code: "SJU", name: "San Juan Lab", region: "South" as Region },
    { code: "PIT", name: "Pittsburgh Lab", region: "Northeast" as Region },
    { code: "CIN", name: "Cincinnati Lab", region: "Midwest" as Region },
    { code: "DAY", name: "Dayton Lab", region: "Midwest" as Region },
    { code: "CLT", name: "Charlotte Lab", region: "South" as Region },
    { code: "LAX", name: "Los Angeles Lab", region: "West" as Region },
    { code: "DEN", name: "Denver Lab", region: "West" as Region },
    { code: "PHX", name: "Phoenix Lab", region: "West" as Region },
    { code: "IND", name: "Indianapolis Lab", region: "Midwest" as Region },
    { code: "DEC", name: "Decatur Lab", region: "Midwest" as Region },
    { code: "SAN", name: "San Diego Lab", region: "West" as Region },
    { code: "OTT", name: "Ottawa Lab", region: "Northeast" as Region },
    { code: "CHE", name: "Chesapeake Lab", region: "South" as Region },
    { code: "PBG", name: "Palm Beach Lab", region: "South" as Region },
    { code: "CLE", name: "Cleveland Lab", region: "Midwest" as Region },
    { code: "STL", name: "St. Louis Lab", region: "Midwest" as Region },
  ];

  const rng = mulberry32(42);
  const pnCoverageMap = new Map<string, number>();

  // First pass: Generate standards normally
  const labs = labConfigs.map((config, idx) => {
    return {
      code: config.code,
      name: config.name,
      region: config.region,
      stockTT: between(rng, 3, 7), // 3-7 days stock TT
      recalTT: between(rng, 4, 10), // 4-10 days recal TT
      repairTT: between(rng, 8, 16), // 8-16 days repair TT
      isAccredited: rng() < 0.5, // ~50% accredited
      standards: generateLabStandards(config.code, allPNs, pnToRequirements, 1000 + idx * 100, pnCoverageMap),
    };
  });

  // Second pass: Ensure 100% coverage by adding uncovered PNs to existing compatible standards
  let uncoveredPNs = allPNs.filter(pn => (pnCoverageMap.get(pn) || 0) === 0);
  
  if (uncoveredPNs.length > 0) {
    console.log(`🔧 Ensuring coverage for ${uncoveredPNs.length} uncovered PNs...`);
    
    // Try to add uncovered PNs to existing compatible standards first
    for (const pn of [...uncoveredPNs]) {
      const requiredTags = pnToRequirements.get(pn) || [];
      
      // Find an existing standard across all labs that can handle this PN
      let added = false;
      for (const lab of labs) {
        for (const standard of lab.standards) {
          // Check if this standard has all required capability tags
          const hasAllTags = requiredTags.every(tag => standard.capabilityTags.includes(tag));
          
          if (hasAllTags && standard.supportedPNs.length < 250) {
            // Add this PN to the existing standard
            standard.supportedPNs.push(pn);
            pnCoverageMap.set(pn, 1);
            added = true;
            break;
          }
        }
        if (added) break;
      }
    }
    
    // Third pass: For any still uncovered, create new standards
    uncoveredPNs = allPNs.filter(pn => (pnCoverageMap.get(pn) || 0) === 0);
    
    if (uncoveredPNs.length > 0) {
      console.log(`🔧 Creating new standards for remaining ${uncoveredPNs.length} uncovered PNs...`);
      
      uncoveredPNs.forEach((pn, idx) => {
        const labIdx = idx % labs.length;
        const lab = labs[labIdx];
        const requiredTags = pnToRequirements.get(pn) || [];
        
        // Find best matching template
        let compatibleTemplate = STANDARD_TEMPLATES.find(t => 
          requiredTags.every(tag => t.tags.includes(tag))
        );
        
        if (!compatibleTemplate && requiredTags.length > 0) {
          compatibleTemplate = STANDARD_TEMPLATES.find(t =>
            requiredTags.some(tag => t.tags.includes(tag))
          );
        }
        
        if (!compatibleTemplate) {
          compatibleTemplate = STANDARD_TEMPLATES[0];
        }
        
        // Add new standard
        lab.standards.push({
          standardId: `STD-${String(parseInt(lab.code, 36) * 1000 + lab.standards.length).padStart(5, "0")}`,
          make: compatibleTemplate.make,
          model: compatibleTemplate.model,
          capabilityTags: [...new Set([...compatibleTemplate.tags, ...requiredTags])], // Include required tags
          onsiteCapable: compatibleTemplate.onsite,
          supportedPNs: [pn],
        });
        
        pnCoverageMap.set(pn, 1);
      });
    }
    
    const finalCovered = allPNs.filter(pn => pnCoverageMap.get(pn)).length;
    console.log(`✅ Cleanup complete. Final coverage: ${finalCovered}/${allPNs.length} PNs (${((finalCovered/allPNs.length)*100).toFixed(1)}%)`);
  }

  return labs;
}

// This will be populated after UNITS are loaded
export let LABS: Lab[] = [];

export function initializeLabs(
  units: Array<{ part_number: string; requiredCapabilityTags: CapabilityTag[] }>
) {
  const allPNs = units.map(u => u.part_number);
  const pnToRequirements = new Map<string, CapabilityTag[]>(
    units.map(u => [u.part_number, u.requiredCapabilityTags])
  );
  LABS = generateLabs(allPNs, pnToRequirements);
}

/** Helper: Get all standards across all labs */
export function getAllStandards(): StandardInLab[] {
  return LABS.flatMap((lab) => lab.standards);
}

/** Helper: Get all standards for a specific PN across all labs */
export function getStandardsForPN(partNumber: string): StandardInLab[] {
  return getAllStandards().filter((s) => s.supportedPNs.includes(partNumber));
}

/** Helper: Get all standards at a specific lab for a PN */
export function getStandardsForPNAtLab(
  partNumber: string,
  labCode: string
): StandardInLab[] {
  const lab = LABS.find((l) => l.code === labCode);
  if (!lab) return [];
  return lab.standards.filter((s) => s.supportedPNs.includes(partNumber));
}

/** Helper: Check if a PN supports onsite calibration */
export function supportsOnsiteCalibration(partNumber: string): boolean {
  return getStandardsForPN(partNumber).some((s) => s.onsiteCapable);
}

/** ─────────────────────────────────────────────────────────────────────────
 * RESOLVER LOGIC - Determine lab eligibility for units
 * ─────────────────────────────────────────────────────────────────────────── */

export type UnitRequirements = {
  partNumber: string;
  requiredCapabilityTags: CapabilityTag[];
};

export type LabCapabilityForUnit = {
  labCode: string;
  labName: string;
  region: Region;
  stockTT: number;
  recalTT: number;
  repairTT: number;
  isAccredited: boolean;
  canCalibrate: boolean; // Does this lab meet all requirements?
  matchingStandards: StandardInLab[]; // Standards at this lab that can do this PN
};

/**
 * Check if a standard meets all the capability tag requirements
 */
function standardMeetsRequirements(
  standard: StandardInLab,
  requiredTags: CapabilityTag[]
): boolean {
  // If the unit requires TMS-Only, no internal lab standard can handle it
  if (requiredTags.includes("TMS-Only")) {
    return false;
  }
  
  // Standard must have ALL required tags
  return requiredTags.every((tag) => standard.capabilityTags.includes(tag));
}

/**
 * Determine if a lab can calibrate a unit based on requirements
 * Simply checks if the lab has standards with matching capability tags
 */
export function canLabCalibrateUnit(
  lab: Lab,
  requirements: UnitRequirements
): boolean {
  // Find standards at this lab that support this PN
  const candidateStandards = lab.standards.filter((s) =>
    s.supportedPNs.includes(requirements.partNumber)
  );

  if (candidateStandards.length === 0) {
    return false; // No standards for this PN
  }

  // Check if any standard meets capability tag requirements
  const hasMatchingStandard = candidateStandards.some((s) =>
    standardMeetsRequirements(s, requirements.requiredCapabilityTags)
  );

  return hasMatchingStandard;
}

/**
 * Get all labs that can calibrate a unit, with details
 * Shows ALL labs with matching standards (accreditation and onsite are informational only)
 */
export function getLabCapabilitiesForUnit(
  requirements: UnitRequirements
): LabCapabilityForUnit[] {
  return LABS.map((lab) => {
    const matchingStandards = lab.standards.filter(
      (s) =>
        s.supportedPNs.includes(requirements.partNumber) &&
        standardMeetsRequirements(s, requirements.requiredCapabilityTags)
    );

    const canCalibrate = matchingStandards.length > 0;

    return {
      labCode: lab.code,
      labName: lab.name,
      region: lab.region,
      stockTT: lab.stockTT,
      recalTT: lab.recalTT,
      repairTT: lab.repairTT,
      isAccredited: lab.isAccredited,
      canCalibrate,
      matchingStandards,
    };
  });
}

/**
 * Get only labs that CAN calibrate a unit (filtered)
 */
export function getEligibleLabsForUnit(
  requirements: UnitRequirements
): LabCapabilityForUnit[] {
  return getLabCapabilitiesForUnit(requirements).filter((l) => l.canCalibrate);
}
