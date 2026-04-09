/**
 * Extracts raw text from a PDF buffer using pdf-parse.
 * The Next.js config marks pdf-parse as a serverExternalPackage so it
 * is never bundled — it runs as plain Node.js and avoids the test-file
 * lookup that causes Next.js App Router build errors.
 */
export async function extractTextFromPDF(buffer) {
  // Dynamic import keeps this safely server-side and avoids static-analysis issues.
  const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js');
  const data = await pdfParse(buffer);
  return {
    text: data.text ?? '',
    pageCount: data.numpages ?? 1,
  };
}
