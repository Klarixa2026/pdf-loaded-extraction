import { NextResponse } from 'next/server';
import { extractTextFromPDF } from '@/lib/pdf-extractor';
import { parseTestSteps } from '@/lib/openai-parser';

// Allow up to 60 s on Vercel Pro; capped at 10 s on Hobby tier.
export const maxDuration = 60;

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const sections = (formData.get('sections') ?? 'Section 5').trim() || 'Section 5';

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No PDF file provided.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Step 1 — extract raw text from PDF
    const { text, pageCount } = await extractTextFromPDF(buffer);

    if (!text || text.trim().length < 100) {
      return NextResponse.json(
        { error: 'Could not extract readable text. Make sure the PDF is digital (not scanned).' },
        { status: 422 }
      );
    }

    // Step 2 — parse test steps from the user-specified sections using GPT-4o
    const { documentTitle, documentId, detectedFields, steps } = await parseTestSteps(text, sections);

    if (!steps.length) {
      return NextResponse.json(
        { error: `No test steps found in "${sections}". Check the section name and try again.` },
        { status: 422 }
      );
    }

    return NextResponse.json({ documentTitle, documentId, detectedFields, steps, pageCount });
  } catch (err) {
    console.error('[/api/extract]', err);
    return NextResponse.json(
      { error: err?.message ?? 'Unexpected server error.' },
      { status: 500 }
    );
  }
}
