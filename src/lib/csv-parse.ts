// RFC 4180 style CSV parser. Pure (no imports) so it can be tested with plain node.
// Handles a BOM, CRLF/LF, quoted fields with "" escapes and newlines inside quotes, and
// comma or semicolon delimiters (detected from the header line). Never evaluates anything.

export type ParsedCsv = { rows: string[][]; tooManyRows: boolean };

function detectDelimiter(text: string): "," | ";" {
  let commas = 0;
  let semis = 0;
  let inQuotes = false;
  for (const ch of text) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes) {
      if (ch === "\n") break;
      if (ch === ",") commas++;
      else if (ch === ";") semis++;
    }
  }
  return semis > commas ? ";" : ",";
}

/** Parse at most `maxRows` data rows (plus the header). Blank lines are skipped. */
export function parseCsv(input: string, maxRows: number): ParsedCsv {
  const text = input.replace(/^﻿/, "");
  const delim = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let tooManyRows = false;

  const endRow = () => {
    row.push(field);
    field = "";
    if (row.some((c) => c.trim() !== "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i] as string;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"' && field === "") {
      inQuotes = true;
    } else if (ch === delim) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      endRow();
      if (rows.length > maxRows + 1) {
        tooManyRows = true;
        break;
      }
    } else field += ch;
  }
  if (!tooManyRows && (field !== "" || row.length > 0)) endRow();
  if (rows.length > maxRows + 1) {
    tooManyRows = true;
    rows.length = maxRows + 1;
  }
  return { rows, tooManyRows };
}
