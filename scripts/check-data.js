// Checks data.xlsx before the site is published. Run locally with: node scripts/check-data.js
// Exits with an error (and blocks the deploy in CI) if the workbook is broken.
const fs = require("fs");
const path = require("path");
const XLSX = require(path.join(__dirname, "..", "xlsx.full.min.js"));

const errors = [];
const wb = XLSX.read(fs.readFileSync(path.join(__dirname, "..", "data.xlsx")));

const required = {
  Companies: ["ticker", "name", "sector", "market_cap_bn"],
  Measures: ["applies_to", "direction", "weight", "measure"],
};

const sheets = {};
for (const [sheet, cols] of Object.entries(required)) {
  if (!wb.Sheets[sheet]) { errors.push(`Missing sheet "${sheet}"`); continue; }
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { defval: "" });
  const header = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1 })[0] || [];
  for (const c of cols) if (!header.includes(c)) errors.push(`${sheet}: missing column "${c}"`);
  sheets[sheet] = rows;
}

// Excel row number = index + 2 (header is row 1)
(sheets.Companies || []).forEach((r, i) => {
  const row = i + 2;
  if (!String(r.ticker).trim()) errors.push(`Companies row ${row}: ticker is empty`);
  if (r.market_cap_bn !== "" && isNaN(Number(r.market_cap_bn)))
    errors.push(`Companies row ${row}: market_cap_bn "${r.market_cap_bn}" is not a number`);
});

(sheets.Measures || []).forEach((r, i) => {
  const row = i + 2;
  if (!String(r.applies_to).trim()) errors.push(`Measures row ${row}: applies_to is empty`);
  if (![-1, 0, 1].includes(Number(r.direction)))
    errors.push(`Measures row ${row}: direction "${r.direction}" must be 1, 0 or -1`);
  if (r.weight === "" || isNaN(Number(r.weight)))
    errors.push(`Measures row ${row}: weight "${r.weight}" is not a number`);
});

if (errors.length) {
  console.error(`data.xlsx has ${errors.length} problem(s):\n- ` + errors.join("\n- "));
  process.exit(1);
}
console.log(`data.xlsx OK: ${sheets.Companies.length} companies, ${sheets.Measures.length} measures`);
