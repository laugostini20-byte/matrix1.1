import type { LabCapabilityForUnit, PricingRow } from "../top-level";
import { SERVICE_LEVEL_DESC } from "../top-level";

// ─────────────────────────────────────────────────────────────────────────────
// Serialization Utilities
// ─────────────────────────────────────────────────────────────────────────────

export function serializeCaps(caps: LabCapabilityForUnit[]) {
  const headers = [
    "Lab",
    "Accredited",
    "Matching Standards",
    "Stock TT",
    "Recal TT",
    "Repair TT",
  ];
  const rows = caps.map((c) =>
    [
      c.labName,
      c.isAccredited ? "Yes" : "No",
      String(c.matchingStandards.length),
      String(c.stockTT),
      String(c.recalTT),
      String(c.repairTT),
    ].join("\t")
  );
  return [headers.join("\t"), ...rows].join("\n");
}

export function serializePricing(pr: PricingRow[]) {
  const headers = [
    "Service Level",
    "Description",
    "Base Price",
    "Base + Options",
  ];
  const rows = pr.map((p) =>
    [
      String(p.service_level),
      SERVICE_LEVEL_DESC[p.service_level] || "",
      `$${p.base_price_usd}`,
      `$${p.base_plus_options_usd}`,
    ].join("\t")
  );
  return [headers.join("\t"), ...rows].join("\n");
}

