/**
 * Generates output files from extracted steps using a user-defined column mapping.
 *
 * mapping shape:  { [pdfFieldName]: veevaColumnName }
 * e.g. { "No.": "step_number__v", "Test procedure": "procedure__v", "Acceptance criteria": "expected_results__v" }
 *
 * The generated CSV/Excel columns are the Veeva column names (values of the mapping).
 * The data comes from each step's keyed values matching the PDF field names (keys of the mapping).
 */

// ── CSV ───────────────────────────────────────────────────────────────────────

function escapeCSV(value) {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * @param {object[]} steps
 * @param {Record<string, string>} mapping  pdfField → veevaColumn
 * @param {string|null} derivedTitleColumn  Veeva column name for AI-derived step title (prepended first)
 */
export function generateCSV(steps, mapping, derivedTitleColumn) {
  const pdfFields = Object.keys(mapping);
  const veevaColumns = Object.values(mapping);

  const allColumns = derivedTitleColumn ? [derivedTitleColumn, ...veevaColumns] : veevaColumns;
  const header = allColumns.map(escapeCSV).join(',');

  const rows = steps.map((step) => {
    const cells = pdfFields.map((field) => escapeCSV(step[field] ?? ''));
    if (derivedTitleColumn) cells.unshift(escapeCSV(step.step_title ?? ''));
    return cells.join(',');
  });

  return [header, ...rows].join('\r\n');
}

// ── Excel ─────────────────────────────────────────────────────────────────────

/**
 * @param {object[]} steps
 * @param {Record<string, string>} mapping  pdfField → veevaColumn
 * @param {string} documentTitle
 * @param {string|null} derivedTitleColumn  Veeva column name for AI-derived step title (prepended first)
 */
export async function generateExcel(steps, mapping, documentTitle, derivedTitleColumn) {
  const { default: ExcelJS } = await import('exceljs');

  const pdfFields = Object.keys(mapping);
  const veevaColumns = Object.values(mapping);

  // Prepend derived title column if provided
  const allColumns = derivedTitleColumn ? [derivedTitleColumn, ...veevaColumns] : veevaColumns;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Klarixa';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Test Steps');

  // Build column definitions using Veeva column names as headers
  sheet.columns = allColumns.map((col, i) => ({
    header: col,
    key: String(i),
    width: col.length > 30 ? 60 : col.length > 15 ? 45 : 30,
  }));

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003366' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.height = 28;

  // Add data rows
  for (const step of steps) {
    const values = {};
    let colIdx = 0;
    if (derivedTitleColumn) {
      values[String(colIdx++)] = step.step_title ?? '';
    }
    for (const field of pdfFields) {
      values[String(colIdx++)] = step[field] ?? '';
    }
    const row = sheet.addRow(values);
    row.alignment = { vertical: 'top', wrapText: true };
  }

  // Borders on all cells
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });

  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  return workbook.xlsx.writeBuffer();
}
