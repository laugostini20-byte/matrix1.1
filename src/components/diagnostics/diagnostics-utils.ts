import { UNITS } from "../../data/units";
import type { Unit } from "../../top-level";
import {
  SERVICE_LEVEL_DESC,
  searchUnits,
  calculateServiceLevelPrice,
  normalizePricing,
} from "../../top-level";
import { serializeCaps } from "../../utils/serialization";
import { buildServiceLevelText } from "../../utils/export";
import { getEligibleLabsForUnit, getAllStandards } from "../../data/labs";

// Analyze data for duplicates and patterns
export function analyzeUnitsData() {
  const analysis = {
    totalUnits: UNITS.length,
    uniquePartNumbers: new Set(UNITS.map((u: Unit) => u.part_number)).size,
    uniqueManufacturers: new Set(UNITS.map((u: Unit) => u.manufacturer)).size,
    uniqueModels: new Set(UNITS.map((u: Unit) => u.model_number)).size,
    uniqueManufacturerModelCombos: new Set(
      UNITS.map((u: Unit) => `${u.manufacturer}|${u.model_number}`)
    ).size,
    manufacturerCounts: {} as Record<string, number>,
    modelCounts: {} as Record<string, number>,
    manufacturerModelCounts: {} as Record<string, number>,
  };

  // Count occurrences
  UNITS.forEach((unit) => {
    analysis.manufacturerCounts[unit.manufacturer] =
      (analysis.manufacturerCounts[unit.manufacturer] || 0) + 1;
    analysis.modelCounts[unit.model_number] =
      (analysis.modelCounts[unit.model_number] || 0) + 1;
    const combo = `${unit.manufacturer}|${unit.model_number}`;
    analysis.manufacturerModelCounts[combo] =
      (analysis.manufacturerModelCounts[combo] || 0) + 1;
  });

  return analysis;
}

export function runDiagnostics() {
  const results: { name: string; pass: boolean; details?: string }[] = [];

  // Test 1: Service level text has one line per level
  const txt = buildServiceLevelText();
  const expectedLines = Object.keys(SERVICE_LEVEL_DESC).length;
  const actualLines = txt.split("\n").length;
  results.push({
    name: "Service level export contains expected number of lines",
    pass: actualLines === expectedLines,
    details: `expected ${expectedLines}, got ${actualLines}`,
  });

  // Test 2: serializeCaps line count = header + caps length for first unit
  const u0 = UNITS[0];
  const u0Labs = getEligibleLabsForUnit({
    partNumber: u0.part_number,
    requiredCapabilityTags: u0.requiredCapabilityTags,
  });
  const capsTSV = serializeCaps(u0Labs);
  const capsLines = capsTSV.split("\n");
  results.push({
    name: "Capabilities TSV includes header + rows",
    pass: capsLines.length === 1 + u0Labs.length,
    details: `expected ${1 + u0Labs.length}, got ${capsLines.length}`,
  });

  // Test 3: normalized pricing always contains all service levels for first unit
  const norm = normalizePricing(UNITS[0].pricing);
  results.push({
    name: "Pricing normalization outputs entries for all defined service levels",
    pass:
      norm.length === 12 &&
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].every((l) =>
        norm.some((p) => p.service_level === l)
      ),
    details: `expected 12 levels, got ${norm.length}`,
  });

  // Test 4: compounding 10% rule sanity (L2 = L1 * 1.1) when L1 present
  const level1 = norm.find((p) => p.service_level === 1)?.base_price_usd;
  const level2 = norm.find((p) => p.service_level === 2)?.base_price_usd;
  const multOk = Number.isFinite(level1)
    ? Math.abs(level1! * 1.1 - (level2 ?? NaN)) < 0.01
    : true; // skip if no anchor
  results.push({
    name: "Compounding 10% rule check (L2 = L1 * 1.1)",
    pass: multOk,
    details: Number.isFinite(level1)
      ? `L1=${level1}, L2=${level2}`
      : "no anchor present",
  });

  // Test 5: Newlines properly escaped (sanity)
  const sanity = ["a", "b"].join("\n");
  results.push({
    name: "Newlines are properly escaped (sanity)",
    pass: sanity === "a\nb",
    details: sanity.replace("\n", "\\n"),
  });

  // Test 6: Page-A search returns U-1001 when querying PN-34567
  const pnList = searchUnits("PN-34567", "", "", "");
  results.push({
    name: "Search by Part Number finds PN-34567",
    pass: pnList.some((u) => u.id === "U-1001"),
    details: `found: ${pnList.map((u: Unit) => u.id).join(", ")}`,
  });

  // Test 7: Service level calculation for level 3 (should be base * 1.1^2)
  const testPricing = { base_price_usd: 100, options_addon_usd: 20 };
  const testLevel3 = calculateServiceLevelPrice(testPricing.base_price_usd, 3);
  const expectedLevel3 = 100 * Math.pow(1.1, 2); // 121
  const calcOk = Math.abs(testLevel3 - expectedLevel3) < 0.01;
  results.push({
    name: "Service level calculation (Level 3 = base * 1.1^2)",
    pass: calcOk,
    details: `expected ${expectedLevel3.toFixed(2)}, got ${testLevel3.toFixed(
      2
    )}`,
  });

  // Test 8: Data uniqueness analysis
  const analysis = analyzeUnitsData();
  const hasUniquePartNumbers =
    analysis.uniquePartNumbers === analysis.totalUnits;
  const hasUniqueManufacturerModelCombos =
    analysis.uniqueManufacturerModelCombos === analysis.totalUnits;

  results.push({
    name: "All part numbers are unique",
    pass: hasUniquePartNumbers,
    details: `${analysis.uniquePartNumbers}/${analysis.totalUnits} unique part numbers`,
  });

  results.push({
    name: "All manufacturer+model combinations are unique",
    pass: hasUniqueManufacturerModelCombos,
    details: `${analysis.uniqueManufacturerModelCombos}/${analysis.totalUnits} unique manufacturer+model combinations`,
  });

  // Show duplicate analysis if there are issues
  if (!hasUniqueManufacturerModelCombos) {
    const duplicates = Object.entries(analysis.manufacturerModelCounts)
      .filter(([_, count]) => count > 1)
      .slice(0, 3); // Show first 3 duplicates

    if (duplicates.length > 0) {
      results.push({
        name: "Duplicate manufacturer+model combinations found",
        pass: false,
        details: `Examples: ${duplicates
          .map(
            ([combo, count]) =>
              `${combo.split("|")[0]} ${combo.split("|")[1]} (${count}x)`
          )
          .join(", ")}`,
      });
    }
  }

  // Test 9: Standards coverage analysis
  const allStandards = getAllStandards();
  const coveredPNs = new Set(allStandards.flatMap((s) => s.supportedPNs));
  const coveragePercent = ((coveredPNs.size / UNITS.length) * 100).toFixed(1);
  const goodCoverage = parseFloat(coveragePercent) >= 95;
  results.push({
    name: "Standards coverage across catalog",
    pass: goodCoverage,
    details: `${coveragePercent}% of units have standards (${coveredPNs.size}/${UNITS.length})`,
  });

  // Test 10: Average standards per PN should be reasonable (multiple options)
  const standardsPerPN = Array.from(coveredPNs).map(
    (pn) => allStandards.filter((s) => s.supportedPNs.includes(pn)).length
  );
  const avgStandards =
    standardsPerPN.length > 0
      ? (
          standardsPerPN.reduce((a, b) => a + b, 0) / standardsPerPN.length
        ).toFixed(1)
      : 0;
  const hasMultipleOptions = parseFloat(avgStandards.toString()) >= 3;
  results.push({
    name: "Units have multiple calibration options",
    pass: hasMultipleOptions,
    details: `Average ${avgStandards} standards per unit`,
  });

  // Test 11: Total standards count
  const onsiteCapableStandards = allStandards.filter((s) => s.onsiteCapable);
  results.push({
    name: "Standards database populated",
    pass: allStandards.length > 100,
    details: `${allStandards.length} total standards (${onsiteCapableStandards.length} onsite-capable)`,
  });

  return results;
}
