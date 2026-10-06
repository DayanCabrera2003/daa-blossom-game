// Formats rows of text as a right-aligned plain text table, for the bench tool.

/** Columns are as wide as their widest cell, right-aligned, two spaces apart. */
export function formatTable(
  headers: readonly string[],
  rows: readonly (readonly string[])[],
): string {
  const widths = headers.map((header, column) =>
    Math.max(header.length, ...rows.map((row) => (row[column] ?? '').length)),
  );
  const line = (cells: readonly string[]) =>
    widths.map((width, column) => (cells[column] ?? '').padStart(width + 2)).join('');
  return [line(headers), ...rows.map(line)].join('\n');
}
