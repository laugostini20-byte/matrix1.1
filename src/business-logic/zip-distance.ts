import usZipsRaw from "../data/us-zip-coordinates.json";
import caFsasRaw from "../data/ca-fsa-coordinates.json";
import { LAB_LOCATIONS, calculateDistance } from "../top-level";
import type { LabLocation } from "../top-level";

// JSON is { "14624": [lat, lng], ... }
const US_ZIPS = usZipsRaw as unknown as Record<string, [number, number]>;
const CA_FSAS = caFsasRaw as unknown as Record<string, [number, number]>;

const US_ZIP_RE = /^\d{5}$/;
const CA_FSA_RE = /^[A-Z]\d[A-Z]/;

/**
 * Resolves a user-entered postal code to [lat, lng].
 * Accepts US 5-digit zips ("14624") and Canadian postal codes ("M5H 2N2" or "M5H2N2").
 * For Canadian codes, only the FSA (first 3 chars) is used.
 * Returns null if the format is unrecognized OR the code is not in the dataset.
 */
export function getCoordsForPostalCode(input: string): [number, number] | null {
  const normalized = input.trim().toUpperCase().replace(/\s+/g, "");
  if (!normalized) return null;

  if (US_ZIP_RE.test(normalized)) {
    return US_ZIPS[normalized] ?? null;
  }

  const fsaMatch = normalized.match(CA_FSA_RE);
  if (fsaMatch) {
    return CA_FSAS[fsaMatch[0]] ?? null;
  }

  return null;
}

/**
 * Quick predicate: does the input look like a syntactically valid US or CA code
 * (regardless of whether it's in our dataset)?
 */
export function isValidPostalFormat(input: string): boolean {
  const normalized = input.trim().toUpperCase().replace(/\s+/g, "");
  return US_ZIP_RE.test(normalized) || CA_FSA_RE.test(normalized);
}

export type WithDistance<T> = T & { distanceMi: number };

/**
 * Returns a NEW array of caps sorted ascending by distance to userCoords.
 * Each element gets a `distanceMi` field (rounded to whole miles).
 * Caps whose labName is not found in LAB_LOCATIONS are placed at the end with distanceMi = Infinity.
 */
export function sortLabsByDistance<T extends { labName: string }>(
  caps: T[],
  userCoords: [number, number]
): WithDistance<T>[] {
  const [userLat, userLng] = userCoords;

  const withDistance: WithDistance<T>[] = caps.map((c) => {
    const loc = LAB_LOCATIONS.find((l: LabLocation) => l.name === c.labName);
    const distance = loc
      ? Math.round(calculateDistance(userLat, userLng, loc.lat, loc.lng))
      : Infinity;
    return { ...c, distanceMi: distance };
  });

  withDistance.sort((a, b) => a.distanceMi - b.distanceMi);
  return withDistance;
}
