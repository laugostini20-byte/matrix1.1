// ─────────────────────────────────────────────────────────────────────────────
// Upload and Parsing Functionality
// ─────────────────────────────────────────────────────────────────────────────

import { UNITS } from "../../data/units";
import { getEligibleLabsForUnit } from "../../data/labs";
import { normalize, findClosestLab } from "../utils";
import { generatePricingRows } from "../pricing-utils";
import type { Unit, CustomerItem, MatchResult, UploadParseResult } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// CSV Parsing Functions
// ─────────────────────────────────────────────────────────────────────────────

export function parseCustomerList(csvContent: string): UploadParseResult {
  const lines = csvContent
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const items: CustomerItem[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Expected headers (flexible matching)
  const expectedHeaders = [
    "manufacturer",
    "model",
    "service_level",
    "quantity",
    "notes",
  ];
  let headerMap: Record<string, number> = {};

  if (lines.length === 0) {
    errors.push("File is empty");
    return { items, errors, warnings };
  }

  // Parse header row
  const headerLine = lines[0].toLowerCase();
  const headers = headerLine.split(",").map((h) => h.trim().replace(/"/g, ""));

  // Map headers to indices (flexible matching)
  expectedHeaders.forEach((expected) => {
    const index = headers.findIndex(
      (h) => h.includes(expected) || expected.includes(h)
    );
    if (index !== -1) headerMap[expected] = index;
  });

  // Validate required headers
  if (headerMap.manufacturer === undefined) {
    errors.push("Missing 'manufacturer' column");
  }
  if (headerMap.model === undefined) {
    errors.push("Missing 'model' column");
  }

  if (errors.length > 0) {
    return { items, errors, warnings };
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const columns = line.split(",").map((col) => col.trim().replace(/"/g, ""));

    if (columns.length < Math.max(...Object.values(headerMap)) + 1) {
      warnings.push(`Row ${i + 1}: Not enough columns, skipping`);
      continue;
    }

    const manufacturer = columns[headerMap.manufacturer] || "";
    const model = columns[headerMap.model] || "";

    if (!manufacturer || !model) {
      warnings.push(`Row ${i + 1}: Missing manufacturer or model, skipping`);
      continue;
    }

    const item: CustomerItem = {
      row: i + 1,
      manufacturer: manufacturer,
      model: model,
      service_level:
        headerMap.service_level !== undefined
          ? parseInt(columns[headerMap.service_level]) || undefined
          : undefined,
      quantity:
        headerMap.quantity !== undefined
          ? parseInt(columns[headerMap.quantity]) || 1
          : 1,
      notes:
        headerMap.notes !== undefined
          ? columns[headerMap.notes] || undefined
          : undefined,
    };

    items.push(item);
  }

  if (items.length === 0) {
    errors.push("No valid items found in file");
  }

  return { items, errors, warnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// Unit Matching Functions
// ─────────────────────────────────────────────────────────────────────────────

export function findMatchingUnits(item: CustomerItem): Unit[] {
  const normMfr = normalize(item.manufacturer);
  const normModel = normalize(item.model);

  return UNITS.filter((unit) => {
    const unitMfr = normalize(unit.manufacturer);
    const unitModel = normalize(unit.model_number);

    // Exact manufacturer match preferred, but allow partial matches
    const mfrMatch =
      unitMfr === normMfr ||
      unitMfr.includes(normMfr) ||
      normMfr.includes(unitMfr);

    // Model matching - try exact first, then partial
    const modelMatch =
      unitModel === normModel ||
      unitModel.includes(normModel) ||
      normModel.includes(unitModel);

    return mfrMatch && modelMatch;
  });
}

export function getMatchQuality(
  item: CustomerItem,
  unit: Unit
): { quality: number; isExact: boolean } {
  const normMfr = normalize(item.manufacturer);
  const normModel = normalize(item.model);
  const unitMfr = normalize(unit.manufacturer);
  const unitModel = normalize(unit.model_number);

  // Check for exact match
  if (normMfr === unitMfr && normModel === unitModel) {
    return { quality: 100, isExact: true };
  }

  // Partial match scoring
  let score = 0;

  // Manufacturer match (50% weight)
  if (normMfr === unitMfr) {
    score += 50;
  } else if (normMfr.includes(unitMfr) || unitMfr.includes(normMfr)) {
    score += 30;
  }

  // Model match (50% weight)
  if (normModel === unitModel) {
    score += 50;
  } else if (normModel.includes(unitModel) || unitModel.includes(normModel)) {
    score += 30;
  }

  return { quality: score, isExact: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// Match Result Creation
// ─────────────────────────────────────────────────────────────────────────────

export function createMatchResult(
  item: CustomerItem,
  preferredLab?: string,
  zipCode?: string
): MatchResult {
  const matchedUnits = findMatchingUnits(item);

  if (matchedUnits.length === 0) {
    return {
      customerItem: item,
      matchedUnits: [],
      capabilityCount: 0,
      labs: [],
      hasAccredited: false,
      hasLimited: false,
    };
  }

  // Find best match (exact manufacturer + model match preferred)
  const normMfr = normalize(item.manufacturer);
  const normModel = normalize(item.model);

  const bestMatch =
    matchedUnits.find(
      (unit) =>
        normalize(unit.manufacturer) === normMfr &&
        normalize(unit.model_number) === normModel
    ) || matchedUnits[0];

  // Calculate aggregated stats across all matched units using new model
  const allPricing = matchedUnits.flatMap((unit) =>
    generatePricingRows(unit.pricing)
  );

  // Calculate price range
  const prices = allPricing
    .map((p) => p.base_price_usd)
    .filter(Number.isFinite);
  const minPrice = prices.length ? Math.min(...prices) : undefined;
  const maxPrice = prices.length ? Math.max(...prices) : undefined;

  // Get eligible labs for each matched unit
  const allLabCaps = matchedUnits.flatMap((unit) =>
    getEligibleLabsForUnit({
      partNumber: unit.part_number,
      requiredCapabilityTags: unit.requiredCapabilityTags,
    })
  );

  // Calculate turn time range from eligible labs
  const turnTimes = allLabCaps
    .flatMap((c) => [c.stockTT, c.recalTT, c.repairTT])
    .filter(Number.isFinite);
  const minTurnTime = turnTimes.length ? Math.min(...turnTimes) : undefined;
  const maxTurnTime = turnTimes.length ? Math.max(...turnTimes) : undefined;

  // Get unique labs
  const allLabs = [...new Set(allLabCaps.map((c) => c.labName))];
  let prioritizedLabs = allLabs;

  // Prioritize preferred lab or closest lab
  if (preferredLab && allLabs.includes(preferredLab)) {
    prioritizedLabs = [
      preferredLab,
      ...allLabs.filter((lab) => lab !== preferredLab),
    ];
  } else if (zipCode) {
    const closestLab = findClosestLab(zipCode);
    if (closestLab && allLabs.includes(closestLab.name)) {
      prioritizedLabs = [
        closestLab.name,
        ...allLabs.filter((lab) => lab !== closestLab.name),
      ];
    }
  }

  // Check capability types
  const hasAccredited = allLabCaps.some((c) => c.isAccredited);
  const hasLimited = false; // No longer tracking "limited" in new model

  return {
    customerItem: item,
    matchedUnits,
    bestMatch,
    capabilityCount: allLabCaps.length,
    minPrice,
    maxPrice,
    minTurnTime,
    maxTurnTime,
    labs: prioritizedLabs,
    hasAccredited,
    hasLimited,
  };
}