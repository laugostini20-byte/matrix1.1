// One-shot generator for postal-code datasets.
// Produces src/data/us-zip-coordinates.json and src/data/ca-fsa-coordinates.json.
// After running successfully, the `zipcodes` dev dep can be removed.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import zipcodes from "zipcodes";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../src/data");
mkdirSync(DATA_DIR, { recursive: true });

// ---------- US zips ----------
const usMap = {};
for (let z = 501; z <= 99999; z++) {
  const padded = String(z).padStart(5, "0");
  const info = zipcodes.lookup(padded);
  if (info && typeof info.latitude === "number" && typeof info.longitude === "number") {
    usMap[padded] = [
      Math.round(info.latitude * 10000) / 10000,
      Math.round(info.longitude * 10000) / 10000,
    ];
  }
}
writeFileSync(resolve(DATA_DIR, "us-zip-coordinates.json"), JSON.stringify(usMap));
console.log(`US zips written: ${Object.keys(usMap).length}`);

// ---------- Canadian FSAs ----------
const caMap = {
  "A1A": [47.5615, -52.7126], "A1B": [47.5708, -52.6817], "A1C": [47.5635, -52.7022],
  "A2A": [48.9500, -54.6167], "A2B": [49.0167, -55.6500], "A2H": [48.9495, -57.9501],
  "B1P": [46.1351, -60.1831], "B2N": [45.3700, -63.2647], "B3H": [44.6364, -63.5917],
  "B3J": [44.6488, -63.5752], "B3K": [44.6633, -63.5963], "B3L": [44.6488, -63.6256],
  "B4N": [45.0700, -64.4900], "B4V": [44.3833, -65.1167],
  "C1A": [46.2382, -63.1311], "C1B": [46.2500, -63.1230],
  "E1C": [46.0878, -64.7782], "E2L": [45.2733, -66.0633], "E3B": [45.9636, -66.6431],
  "G1K": [46.8139, -71.2080], "G1R": [46.8123, -71.2145], "G2B": [46.8500, -71.3000],
  "G7H": [48.4283, -71.0683], "G9A": [46.3500, -72.5500],
  "H1A": [45.6500, -73.5167], "H2X": [45.5117, -73.5731], "H2Y": [45.5081, -73.5550],
  "H3A": [45.5048, -73.5772], "H3B": [45.5017, -73.5673], "H3C": [45.4972, -73.5658],
  "H3H": [45.4900, -73.5856], "H4B": [45.4717, -73.6256], "H7N": [45.5667, -73.7000],
  "J4B": [45.4500, -73.4667], "J7Y": [45.7000, -74.0000],
  "K1A": [45.4215, -75.6972], "K1P": [45.4215, -75.6972], "K2P": [45.4112, -75.6906],
  "K7L": [44.2312, -76.4860], "K9H": [44.3000, -78.3167],
  "L1H": [43.8971, -78.8658], "L4W": [43.6200, -79.6500], "L5B": [43.5890, -79.6441],
  "L6T": [43.7315, -79.7624], "L8E": [43.2557, -79.8711], "L9C": [43.2557, -79.8711],
  "M2N": [43.7615, -79.4111], "M4B": [43.6890, -79.3060], "M4C": [43.6890, -79.3000],
  "M4Y": [43.6657, -79.3804], "M5A": [43.6555, -79.3596], "M5B": [43.6555, -79.3795],
  "M5G": [43.6595, -79.3855], "M5H": [43.6510, -79.3830], "M5J": [43.6447, -79.3812],
  "M5K": [43.6481, -79.3812], "M5V": [43.6447, -79.3956], "M6J": [43.6463, -79.4180],
  "M9W": [43.7100, -79.5800], "N2L": [43.4643, -80.5204], "N6A": [42.9849, -81.2453],
  "P3E": [46.4917, -80.9930], "P7B": [48.3809, -89.2477],
  "R2C": [49.9000, -97.0500], "R3C": [49.8951, -97.1384], "R3M": [49.8800, -97.1800],
  "S4P": [50.4452, -104.6189], "S7K": [52.1332, -106.6700],
  "T2P": [51.0447, -114.0719], "T5J": [53.5444, -113.4909], "T6E": [53.5167, -113.4833],
  "T1K": [49.6956, -112.8417],
  "V5K": [49.2827, -123.0445], "V6B": [49.2827, -123.1207], "V6C": [49.2880, -123.1132],
  "V6E": [49.2865, -123.1280], "V6Z": [49.2811, -123.1198], "V8W": [48.4284, -123.3656],
  "V9A": [48.4284, -123.3656],
  "Y1A": [60.7212, -135.0568],
};
writeFileSync(resolve(DATA_DIR, "ca-fsa-coordinates.json"), JSON.stringify(caMap));
console.log(`CA FSAs written: ${Object.keys(caMap).length}`);
