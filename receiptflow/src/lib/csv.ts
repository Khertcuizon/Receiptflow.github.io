/**
 * Builds a CSV string. Cells that start with a formula character are prefixed
 * with an apostrophe so spreadsheets treat them as text (CSV injection guard).
 */
export function buildCsv(rows: Array<Array<string | number>>): string {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const text = String(value ?? '');
          const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
          return `"${safe.replace(/"/g, '""')}"`;
        })
        .join(','),
    )
    .join('\r\n');
}

export function downloadCsv(filename: string, csv: string): void {
  // The BOM makes Excel read the file as UTF-8 (so ₱ and accents survive).
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
