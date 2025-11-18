import { UNITS } from "../data/units";
import { getEligibleLabsForUnit } from "../data/labs";
import { SERVICE_LEVEL_DESC } from "../top-level";

// ─────────────────────────────────────────────────────────────────────────────
// Export Utilities
// ─────────────────────────────────────────────────────────────────────────────

// Export of service-level dictionary
export function buildServiceLevelText() {
  return Object.keys(SERVICE_LEVEL_DESC)
    .map((k) => `${k}: ${SERVICE_LEVEL_DESC[Number(k)]}`)
    .join("\n");
}

export function exportServiceLevelText() {
  const lines = buildServiceLevelText();
  const blob = new Blob([lines], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "service-level-descriptions.txt";
  a.click();
  URL.revokeObjectURL(url);
}

// Export all units data for analysis
export function exportAllUnitsData() {
  const headers = [
    "ID",
    "Part Number",
    "Manufacturer",
    "Model Number",
    "Description",
    "Base Price USD",
    "Options Addon USD",
    "Capabilities Count",
    "Lab Locations",
    "Has Accredited",
    "Has Limited",
  ];

  const rows = UNITS.map((unit) => {
    const eligibleLabs = getEligibleLabsForUnit({
      partNumber: unit.part_number,
      requiredCapabilityTags: unit.requiredCapabilityTags,
    });
    const labLocations = eligibleLabs.map((l) => l.labName);
    const hasAccredited = eligibleLabs.some((l) => l.isAccredited);

    return [
      unit.id,
      unit.part_number,
      unit.manufacturer,
      unit.model_number,
      unit.description,
      unit.pricing.base_price_usd.toString(),
      unit.pricing.options_addon_usd.toString(),
      eligibleLabs.length.toString(),
      labLocations.join(", "),
      hasAccredited ? "Yes" : "No",
      "N/A", // No longer tracking "limited"
    ].join("\t");
  });

  const content = [headers.join("\t"), ...rows].join("\n");
  const blob = new Blob([content], { type: "text/tab-separated-values" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "all-units-data.tsv";
  a.click();
  URL.revokeObjectURL(url);
}

