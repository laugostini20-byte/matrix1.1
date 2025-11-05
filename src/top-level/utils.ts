// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

// TMS (Third-Party Vendor Service) utilities
import { getTMSVendorsForUnit, selectPreferredVendor } from "../data/tms";
import { getLabCapabilitiesForUnit } from "../data/labs";
import type { Unit, TMSEntry, TMSVendorStrategy } from "./types";

/**
 * Determines if a unit requires TMS (Third-Party Vendor Service)
 * TMS is required when no in-house labs can perform the calibration
 * or when the unit has TMS-Only capability tags
 */
export function isTMSRequired(unit: Unit): boolean {
  // Check if unit has TMS-Only capability tags
  const hasTMSOnlyTag = unit.requiredCapabilityTags.some(
    (tag) => tag === "TMS-Only"
  );
  if (hasTMSOnlyTag) {
    return true;
  }

  const labCapabilities = getLabCapabilitiesForUnit({
    partNumber: unit.part_number,
    requiredCapabilityTags: unit.requiredCapabilityTags,
  });

  // Filter to only labs that can actually calibrate this unit
  const capableLabs = labCapabilities.filter((lab) => lab.canCalibrate);

  return capableLabs.length === 0;
}

/**
 * Gets TMS vendors for a unit
 */
export function getTMSVendorsForUnitHelper(unit: Unit): TMSEntry[] {
  return getTMSVendorsForUnit(unit.part_number);
}

/**
 * Selects the preferred TMS vendor based on strategy
 */
export function selectPreferredTMSVendor(
  unit: Unit,
  strategy: TMSVendorStrategy = "fastest_then_cheapest"
): TMSEntry | null {
  const vendors = getTMSVendorsForUnitHelper(unit);
  return selectPreferredVendor(vendors, strategy);
}

import { UNITS } from "../data/units";
import { LAB_LOCATIONS } from "./constants";
import type { LabLocation } from "./constants";

// ─────────────────────────────────────────────────────────────────────────────
// Lab Capacity and Location Utilities
// ─────────────────────────────────────────────────────────────────────────────

export function getCapacityColor(capacity: number): string {
  if (capacity >= 80) return "bg-red-500";
  if (capacity >= 60) return "bg-yellow-500";
  return "bg-green-500";
}

export function getCapacityTextColor(capacity: number): string {
  if (capacity >= 80) return "text-red-700";
  if (capacity >= 60) return "text-yellow-700";
  return "text-green-700";
}

// Haversine formula to calculate distance between two points
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Find closest lab to a given zip code (simplified - you'd want to use a real geocoding service)
export function findClosestLab(zipCode: string): LabLocation | null {
  // This is a simplified lookup - in reality you'd geocode the zip code
  const zipToCoords: Record<string, { lat: number; lng: number }> = {
    // Northeast
    "02101": { lat: 42.3601, lng: -71.0589 }, // Boston
    "10001": { lat: 40.7589, lng: -73.9851 }, // NYC
    "14624": { lat: 43.1566, lng: -77.6088 }, // Rochester
    "19101": { lat: 39.9526, lng: -75.1652 }, // Philadelphia
    // Midwest
    "44101": { lat: 41.4993, lng: -81.6944 }, // Cleveland
    "45201": { lat: 39.1031, lng: -84.512 }, // Cincinnati
    "60601": { lat: 41.8781, lng: -87.6298 }, // Chicago
    "48201": { lat: 42.3314, lng: -83.0458 }, // Detroit
    // South
    "77001": { lat: 29.7604, lng: -95.3698 }, // Houston
    "30301": { lat: 33.749, lng: -84.388 }, // Atlanta
    "75201": { lat: 32.7767, lng: -96.797 }, // Dallas
    // West
    "80202": { lat: 39.7392, lng: -104.9903 }, // Denver
    "90001": { lat: 34.0522, lng: -118.2437 }, // Los Angeles
    "97201": { lat: 45.5152, lng: -122.6784 }, // Portland
    "98101": { lat: 47.6062, lng: -122.3321 }, // Seattle
    "85001": { lat: 33.4484, lng: -112.074 }, // Phoenix
  };

  const coords = zipToCoords[zipCode];
  if (!coords) return null;

  let closestLab: LabLocation | null = null;
  let minDistance = Infinity;

  for (const lab of LAB_LOCATIONS) {
    const distance = calculateDistance(
      coords.lat,
      coords.lng,
      lab.lat,
      lab.lng
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestLab = lab;
    }
  }

  return closestLab;
}

// ─────────────────────────────────────────────────────────────────────────────
// General Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

export function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function normalize(x: string) {
  return x
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function money(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "TBD";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function ttColor(days: number) {
  if (days <= 5) return "badge badge-success";
  if (days <= 10) return "badge badge-warning";
  return "badge badge-error";
}

// ─────────────────────────────────────────────────────────────────────────────
// Search Utilities
// ─────────────────────────────────────────────────────────────────────────────

export function searchUnits(
  part: string,
  mfr: string,
  model: string,
  desc: string
): Unit[] {
  const p = normalize(part || "");
  const m = normalize(mfr || "");
  const mo = normalize(model || "");
  const d = normalize(desc || "");
  const list = UNITS.filter(
    (u) =>
      (!p || normalize(u.part_number).includes(p)) &&
      (!m || normalize(u.manufacturer).includes(m)) &&
      (!mo || normalize(u.model_number).includes(mo)) &&
      (!d || normalize(u.description).includes(d))
  );
  // Basic relevance: exact PN match strongest, then exact model, then manufacturer contains
  list.sort((a, b) => {
    const aScore =
      (normalize(a.part_number) === p ? 3 : 0) +
      (normalize(a.model_number) === mo ? 2 : 0) +
      (normalize(a.manufacturer).includes(m) ? 1 : 0);
    const bScore =
      (normalize(b.part_number) === p ? 3 : 0) +
      (normalize(b.model_number) === mo ? 2 : 0) +
      (normalize(b.manufacturer).includes(m) ? 1 : 0);
    return bScore - aScore;
  });
  return list;
}
