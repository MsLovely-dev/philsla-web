export type ExamReviewExportFormat = 'PDF' | 'EXCEL';

export interface ExamReviewExportSource {
  candidateId: string;
  candidateName: string;
  submittedAt: string;
  totalScore: number;
  maxScore: number;
  status: string;
  pendingSubjectiveItems: number;
}

export interface ExamReviewExportRow {
  candidateId: string;
  examinee: string;
  submittedAt: string;
  score: string;
  status: string;
  manualReview: string;
}

const EXCEL_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const EXCEL_HEADERS = ['Candidate ID', 'Examinee', 'Submission', 'Score', 'Status', 'Manual Review'];

function formatSubmissionDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';

  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Manila',
  }).format(date);
}

function getExportFilename(extension: 'pdf' | 'xlsx'): string {
  const date = new Date().toISOString().slice(0, 10);
  return `philsa-exam-review-${date}.${extension}`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

export function buildExamReviewExportRows(
  attempts: ExamReviewExportSource[],
): ExamReviewExportRow[] {
  return attempts.map(attempt => ({
      candidateId: attempt.candidateId,
      examinee: attempt.candidateName,
      submittedAt: formatSubmissionDate(attempt.submittedAt),
      score: `${attempt.totalScore} / ${attempt.maxScore}`,
      status: attempt.status,
      manualReview: attempt.pendingSubjectiveItems > 0 ? 'Required' : 'Complete',
    }));
}

export async function createExamReviewPdf(rows: ExamReviewExportRow[]): Promise<Blob> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  pdf.setFontSize(16);
  pdf.text('PhilSA Exam Review Queue', 40, 36);
  pdf.setFontSize(9);
  pdf.setTextColor(90);
  pdf.text(`Exported ${rows.length} record${rows.length === 1 ? '' : 's'}`, 40, 52);

  autoTable(pdf, {
    startY: 68,
    head: [['Candidate ID', 'Examinee', 'Submission', 'Score', 'Status', 'Manual Review']],
    body: rows.map(row => [
      row.candidateId,
      row.examinee,
      row.submittedAt,
      row.score,
      row.status,
      row.manualReview,
    ]),
    styles: { fontSize: 8, cellPadding: 5 },
    headStyles: { fillColor: [30, 41, 59] },
  });

  return pdf.output('blob');
}

async function exportPdf(rows: ExamReviewExportRow[]): Promise<void> {
  downloadBlob(await createExamReviewPdf(rows), getExportFilename('pdf'));
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function createInlineStringCell(value: string, columnIndex: number, rowIndex: number, styleIndex = 0): string {
  const column = String.fromCharCode(65 + columnIndex);
  return `<c r="${column}${rowIndex}" t="inlineStr" s="${styleIndex}"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

export async function createExamReviewWorkbook(rows: ExamReviewExportRow[]): Promise<Uint8Array> {
  const { strToU8, zipSync } = await import('fflate');
  const values = [
    EXCEL_HEADERS,
    ...rows.map(row => [
      row.candidateId,
      row.examinee,
      row.submittedAt,
      row.score,
      row.status,
      row.manualReview,
    ]),
  ];
  const sheetRows = values.map((row, rowIndex) => {
    const excelRow = rowIndex + 1;
    const cells = row.map((value, columnIndex) => createInlineStringCell(value, columnIndex, excelRow, rowIndex === 0 ? 1 : 0));
    return `<row r="${excelRow}">${cells.join('')}</row>`;
  }).join('');
  const lastRow = values.length;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;
  const rootRelationships = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Exam Review" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;
  const workbookRelationships = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/><family val="2"/></font>
    <font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/><family val="2"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1E293B"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
  const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:F${lastRow}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols>
    <col min="1" max="1" width="22" customWidth="1"/>
    <col min="2" max="2" width="30" customWidth="1"/>
    <col min="3" max="3" width="25" customWidth="1"/>
    <col min="4" max="6" width="18" customWidth="1"/>
  </cols>
  <sheetData>${sheetRows}</sheetData>
  <autoFilter ref="A1:F${lastRow}"/>
</worksheet>`;

  return zipSync({
    '[Content_Types].xml': strToU8(contentTypes),
    '_rels/.rels': strToU8(rootRelationships),
    'xl/workbook.xml': strToU8(workbook),
    'xl/_rels/workbook.xml.rels': strToU8(workbookRelationships),
    'xl/styles.xml': strToU8(styles),
    'xl/worksheets/sheet1.xml': strToU8(worksheet),
  }, { level: 6 });
}

async function exportExcel(rows: ExamReviewExportRow[]): Promise<void> {
  const workbook = await createExamReviewWorkbook(rows);
  downloadBlob(new Blob([workbook as BlobPart], { type: EXCEL_MIME_TYPE }), getExportFilename('xlsx'));
}

export async function exportExamReviewBatch(
  rows: ExamReviewExportRow[],
  format: ExamReviewExportFormat,
): Promise<void> {
  if (rows.length === 0) {
    throw new Error('There are no exam review records to export.');
  }

  if (format === 'PDF') {
    await exportPdf(rows);
    return;
  }

  await exportExcel(rows);
}
