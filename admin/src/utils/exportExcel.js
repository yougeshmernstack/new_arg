import * as XLSX from 'xlsx';

/**
 * Export rows to an .xlsx file and trigger download.
 *
 * @param {Object} options
 * @param {string} options.filename - File name without extension
 * @param {Array<{ header: string, value: (row: any, index: number) => any }>} options.columns
 * @param {Array} options.rows
 * @param {string} [options.sheetName='Sheet1']
 */
export function exportToExcel({ filename, columns, rows, sheetName = 'Sheet1' }) {
  const safeColumns = Array.isArray(columns) ? columns : [];
  const safeRows = Array.isArray(rows) ? rows : [];

  const data = safeRows.map((row, index) => {
    const obj = {};
    for (const col of safeColumns) {
      const header = col.header || col.key || '';
      let val;
      try {
        val = typeof col.value === 'function' ? col.value(row, index) : row?.[col.key];
      } catch {
        val = '';
      }
      if (val == null) val = '';
      obj[header] = val;
    }
    return obj;
  });

  const worksheet = XLSX.utils.json_to_sheet(data.length ? data : [{}]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31) || 'Sheet1');

  const stamp = new Date().toISOString().slice(0, 10);
  const base = String(filename || 'export')
    .replace(/\.xlsx$/i, '')
    .replace(/[^\w-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'export';

  XLSX.writeFile(workbook, `${base}_${stamp}.xlsx`);
}

export function formatExcelDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('en-IN');
  } catch {
    return String(value);
  }
}

export function formatExcelAmount(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/**
 * Fetch all pages of a paginated list for Excel export.
 * @param {(page: number, limit: number) => Promise<{ rows: any[], total?: number, pages?: number }>} fetchPage
 */
export async function fetchAllForExport(fetchPage, pageSize = 200) {
  const first = await fetchPage(1, pageSize);
  const rows = [...(first.rows || [])];
  const total = Number(first.total) || rows.length;
  const pages = Math.max(
    1,
    Number(first.pages) || Math.ceil(total / pageSize) || 1,
  );
  for (let page = 2; page <= pages; page += 1) {
    const next = await fetchPage(page, pageSize);
    rows.push(...(next.rows || []));
  }
  return rows;
}
