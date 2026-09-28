/* CSV downloads that open cleanly in Excel and Google Sheets.
 *
 * Names, businesses and references come from partners themselves, so a value
 * starting with = + - @ (or a tab/CR) is prefixed with ' — otherwise Excel
 * would run it as a formula (e.g. a HYPERLINK that leaks other partners'
 * details). Plain negative numbers are left alone. */

export const csvCell = (v: unknown) => {
  const t = String(v ?? "");
  const safe = /^[=+\-@\t\r]/.test(t) && !/^-?\d+(\.\d+)?$/.test(t) ? `'${t}` : t;
  return `"${safe.replace(/"/g, '""')}"`;
};

export const toCsv = (rows: unknown[][]) => rows.map((r) => r.map(csvCell).join(",")).join("\r\n");

/** Save rows as a .csv file. The byte-order mark makes Excel read ₹ and
    Indian-language names as UTF-8 instead of mangling them. */
export function downloadCsv(filename: string, rows: unknown[][]) {
  const blob = new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  // Some browsers start the download after click() returns.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
