// src/lib/table-filter.js
function safeLower(v) {
  return String(v ?? "").toLowerCase();
}

/**
 * @param {Array} rows
 * @param {string} query
 * @param {Array<string|Function>} fields
 *  - string: row[field]
 *  - function: (row) => value
 */
export function filterRows(rows, query, fields) {
  const q = safeLower(query).trim();
  if (!q) return rows || [];

  const list = Array.isArray(rows) ? rows : [];
  const cols = Array.isArray(fields) ? fields : [];

  return list.filter((r) => {
    const blob = cols
      .map((f) => {
        try {
          return typeof f === "function" ? f(r) : r?.[f];
        } catch {
          return "";
        }
      })
      .map(safeLower)
      .join(" ");

    return blob.includes(q);
  });
}
