/**
 * Shared CSV export helpers with UTF-8 BOM for Excel compatibility
 * (handles Spanish characters: ñ, á, é, í, ó, ú)
 */

export function downloadCSV(filename: string, lines: string[]) {
  const BOM = "\uFEFF";
  const csv = BOM + lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function formatMoney(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`;
}

export function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
