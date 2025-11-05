// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

// Lab Location Data
export type LabLocation = {
  name: string;
  zipCode: string;
  lat: number;
  lng: number;
};

// Service Level dictionary (global)
export const SERVICE_LEVEL_DESC: Record<number, string> = {
  1: "C-of-C",
  2: "Non-Accredited Cert",
  3: "Non-Accredited Cert With Data",
  4: "Non-Accredited Cert With Data",
  5: "Non-Accredited Cert With Standard Accuracies",
  6: "Non-Accredited Cert With Standard Accuracies",
  7: "Calibration with simple acceptance",
  8: "Calibration with simple acceptance",
  9: "Calibration with acceptance guardband",
  10: "Calibration with acceptance guardband",
  11: "Calibration with acceptance PCS",
  12: "Calibration with acceptance guardband and PCS",
};

// Lab locations with approximate coordinates (matches LABS from labs.ts)
export const LAB_LOCATIONS: LabLocation[] = [
  {
    name: "Rochester Lab",
    zipCode: "14624",
    lat: 43.1566,
    lng: -77.6088,
  },
  {
    name: "Portland Lab",
    zipCode: "97201",
    lat: 45.5152,
    lng: -122.6784,
  },
  {
    name: "Houston Lab",
    zipCode: "77001",
    lat: 29.7604,
    lng: -95.3698,
  },
  {
    name: "Philadelphia Lab",
    zipCode: "19101",
    lat: 39.9526,
    lng: -75.1652,
  },
  {
    name: "Toronto Lab",
    zipCode: "M5H2N2",
    lat: 43.6532,
    lng: -79.3832,
  },
  {
    name: "Montreal Lab",
    zipCode: "H3A1A1",
    lat: 45.5017,
    lng: -73.5673,
  },
  {
    name: "Boston Lab",
    zipCode: "02101",
    lat: 42.3601,
    lng: -71.0589,
  },
  {
    name: "San Juan Lab",
    zipCode: "00901",
    lat: 18.4655,
    lng: -66.1057,
  },
  {
    name: "Pittsburgh Lab",
    zipCode: "15201",
    lat: 40.4406,
    lng: -79.9959,
  },
  {
    name: "Cincinnati Lab",
    zipCode: "45201",
    lat: 39.1031,
    lng: -84.512,
  },
  {
    name: "Dayton Lab",
    zipCode: "45402",
    lat: 39.7589,
    lng: -84.1916,
  },
  {
    name: "Charlotte Lab",
    zipCode: "28201",
    lat: 35.2271,
    lng: -80.8431,
  },
  {
    name: "Los Angeles Lab",
    zipCode: "90001",
    lat: 34.0522,
    lng: -118.2437,
  },
  {
    name: "Denver Lab",
    zipCode: "80202",
    lat: 39.7392,
    lng: -104.9903,
  },
  {
    name: "Phoenix Lab",
    zipCode: "85001",
    lat: 33.4484,
    lng: -112.074,
  },
  {
    name: "Indianapolis Lab",
    zipCode: "46201",
    lat: 39.7684,
    lng: -86.1581,
  },
  {
    name: "Decatur Lab",
    zipCode: "62521",
    lat: 39.8403,
    lng: -88.9548,
  },
  {
    name: "San Diego Lab",
    zipCode: "92101",
    lat: 32.7157,
    lng: -117.1611,
  },
  {
    name: "Ottawa Lab",
    zipCode: "K1A0A1",
    lat: 45.4215,
    lng: -75.6972,
  },
  {
    name: "Chesapeake Lab",
    zipCode: "23320",
    lat: 36.7682,
    lng: -76.2875,
  },
  {
    name: "Palm Beach Lab",
    zipCode: "33401",
    lat: 26.7153,
    lng: -80.0534,
  },
  {
    name: "Cleveland Lab",
    zipCode: "44101",
    lat: 41.4993,
    lng: -81.6944,
  },
  {
    name: "St. Louis Lab",
    zipCode: "63101",
    lat: 38.627,
    lng: -90.1994,
  },
];

// Lab Capacity Data (percentage utilization: 0-100)
export const LAB_CAPACITY: Record<string, number> = {
  "Rochester Lab": 45, // Low - Green
  "Portland Lab": 62, // Medium - Yellow
  "Houston Lab": 88, // High - Red
  "Philadelphia Lab": 35, // Low - Green
  "Toronto Lab": 72, // Medium - Yellow
  "Montreal Lab": 28, // Low - Green
  "Boston Lab": 91, // High - Red
  "San Juan Lab": 55, // Medium - Yellow
  "Pittsburgh Lab": 42, // Low - Green
  "Cincinnati Lab": 78, // Medium - Yellow
  "Dayton Lab": 68, // Medium - Yellow
  "Charlotte Lab": 52, // Medium - Yellow
  "Los Angeles Lab": 85, // High - Red
  "Denver Lab": 38, // Low - Green
  "Phoenix Lab": 48, // Low - Green
  "Indianapolis Lab": 75, // Medium - Yellow
  "Decatur Lab": 32, // Low - Green
  "San Diego Lab": 81, // High - Red
  "Ottawa Lab": 58, // Medium - Yellow
  "Chesapeake Lab": 44, // Low - Green
  "Palm Beach Lab": 65, // Medium - Yellow
};

// All service levels
export const ALL_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

