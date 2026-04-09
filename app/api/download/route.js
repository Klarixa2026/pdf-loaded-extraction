import { NextResponse } from 'next/server';
import { generateCSV, generateExcel } from '@/lib/file-generator';

export const maxDuration = 30;

export async function POST(request) {
  try {
    const { steps, mapping, format, documentTitle, derivedTitleColumn } = await request.json();

    if (!Array.isArray(steps) || !steps.length) {
      return NextResponse.json({ error: 'No steps provided.' }, { status: 400 });
    }

    if (!mapping || typeof mapping !== 'object' || !Object.keys(mapping).length) {
      return NextResponse.json({ error: 'No field mapping provided.' }, { status: 400 });
    }

    const safeName = (documentTitle ?? 'veeva-test-steps')
      .replace(/[^a-z0-9_-]/gi, '_')
      .slice(0, 60);

    if (format === 'xlsx') {
      const buffer = await generateExcel(steps, mapping, documentTitle, derivedTitleColumn);
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${safeName}.xlsx"`,
        },
      });
    }

    // Default: CSV
    const csv = generateCSV(steps, mapping, derivedTitleColumn);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${safeName}.csv"`,
      },
    });
  } catch (err) {
    console.error('[/api/download]', err);
    return NextResponse.json(
      { error: err?.message ?? 'Unexpected server error.' },
      { status: 500 }
    );
  }
}
