// Rasterizes the on-screen permit card and embeds it as a single image in a
// one-page PDF, rather than redrawing the layout with jsPDF's own drawing
// API -- the permit is a richly-styled visual document (photo, QR code,
// colored badges), and re-implementing that in jsPDF would drift from the
// real design over time. Both html2canvas and jspdf are dynamically
// imported so they stay out of the main bundle until someone actually
// clicks "PDF".
export async function createExamPermitPdf(element: HTMLElement): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  });

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const margin = 24;
  const availableWidth = pdf.internal.pageSize.getWidth() - margin * 2;
  const availableHeight = pdf.internal.pageSize.getHeight() - margin * 2;
  const scale = Math.min(availableWidth / canvas.width, availableHeight / canvas.height);
  const renderWidth = canvas.width * scale;
  const renderHeight = canvas.height * scale;

  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, renderWidth, renderHeight);
  return pdf.output('blob');
}

export function getExamPermitPdfFilename(candidateId: string): string {
  return `PhilSA-Exam-Permit-${candidateId}.pdf`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}
