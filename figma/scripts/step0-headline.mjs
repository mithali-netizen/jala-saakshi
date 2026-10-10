// Step 0: verify the headline claim against the shipping dataset.
//   node scripts/step0-headline.mjs
// Reads tiramisu/public/data/readings.json (the single source of truth). Read-only.
import { readFileSync } from "node:fs";

const rows = JSON.parse(
  readFileSync(new URL("../../public/data/readings.json", import.meta.url), "utf8"),
);

const letters = (s) => s.toLowerCase().replace(/[^a-z]/g, "");
const canonRiver = (r) => {
  const k = letters(r);
  if (k.startsWith("krishna")) return "Krishna";
  if (k.startsWith("dakshinapinakini")) return "Dakshina Pinakini";
  if (k.startsWith("lakshman")) return "Lakshmantirtha";
  if (k.startsWith("ghataprab")) return "Ghataprabha";
  const alias = { simsha: "Shimsha", nethravathi: "Netravathi", malprabha: "Malaprabha", tungabhadra: "Tungabhadra" };
  return alias[k] ?? r.trim();
};

const locKey = (r) => `${r.lat.toFixed(4)},${r.lng.toFixed(4)}`;
const locations = new Set(rows.map(locKey));
const codes = new Set(rows.map((r) => r.station_code));
const riversRaw = new Set(rows.map((r) => r.river));
const riversCanon = new Set(rows.map((r) => canonRiver(r.river)));

const LAKE = /lake|kere|tank/i;
const lakeRows = rows.filter((r) =>
  [r.station_name, r.river, r.stretch, r.note].some((f) => f && LAKE.test(f)),
);
const lakeLocations = new Set(lakeRows.map(locKey));

const blr = rows.filter((r) => /bengaluru|bangalore/i.test(r.district ?? ""));
const blrCodes = new Set(blr.map((r) => r.station_code));
const noValues = (r) => r.class == null && r.do == null && r.bod == null && r.total_coliform == null;
const blrNoReading = new Set(blr.filter(noValues).map((r) => r.station_code));
const withDistrict = rows.filter((r) => r.district);

console.log("Rows in dataset:                       ", rows.length);
console.log("Distinct station codes:                ", codes.size, "(codes are re-issued across years)");
console.log("Unique monitoring locations (lat/lng): ", locations.size);
console.log("Distinct rivers (as spelled in PDFs):  ", riversRaw.size);
console.log("Distinct rivers (spelling variants merged):", riversCanon.size);
console.log("Rows matching lake|kere|tank:          ", lakeRows.length, `-> ${lakeLocations.size} locations`);
console.log("Stations in Bengaluru district:        ", blrCodes.size, "(district is filled only for months:",
  [...new Set(withDistrict.map((r) => r.month))].join(", ") + ")");
console.log("  ...with no reading recorded:         ", blrNoReading.size, [...blrNoReading].join(", "));
console.log("Rows flagged status=no_access:         ",
  rows.filter((r) => r.status === "no_access").map((r) => `${r.station_code} (${r.month})`).join(", ") || 0);
if (lakeLocations.size > 0) {
  console.log("\n!! Lakes ARE present in the data. Stop: the headline needs rethinking.");
  process.exitCode = 2;
}
