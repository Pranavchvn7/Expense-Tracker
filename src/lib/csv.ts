// Characters that make Excel/Sheets/LibreOffice treat a cell as a formula (CSV injection).
const FORMULA_START = /^[=+\-@\t\r]/;

/**
 * One safe CSV cell. Text that starts with a formula character gets a leading apostrophe
 * so a spreadsheet shows it as text instead of running it; then RFC 4180 quoting applies.
 * Only pass text here; numbers are formatted by the caller and never start with those characters.
 */
export function csvCell(value: string): string {
  let s = FORMULA_START.test(value) ? `'${value}` : value;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
