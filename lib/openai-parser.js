import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Build a dynamic system prompt based on what the user asked to extract.
 *
 * The prompt asks GPT-4o to:
 *  1. Identify the exact column headers used in the test tables (detectedFields).
 *  2. Extract every numbered row from the requested sections.
 *  3. Return each step with keys that exactly match the detected column headers.
 *
 * This lets the front-end show the raw PDF field names so the user can map
 * them to their own Veeva CSV column names.
 */
function buildPrompt(sectionsInput) {
  return `You are a pharmaceutical validation document parser specialising in GMP qualification documents (SAT, IQ, OQ, PQ, FAT).

The user wants to extract test steps from: "${sectionsInput}"

───────────────────────────────────────────────────
STEP 1 — Identify test table structure
───────────────────────────────────────────────────
Find all test tables that belong to the requested sections.
Note the EXACT column headers as they appear in the table header row, for example:
  "No.", "Test procedure", "Acceptance criteria", "Tested by", etc.

Do NOT invent column names — use only what is printed in the document.

───────────────────────────────────────────────────
STEP 2 — Extract every numbered test step
───────────────────────────────────────────────────
For every numbered row in every test table within the requested sections:
  • "section"     : the subsection number + title, e.g. "5.1 Media connections and conditions"
  • "step_number" : section prefix + row number, e.g. "5.1.1", "5.2.1"
  • "step_title"  : concise title ≤ 10 words derived from the first action in the procedure column
  • One key per detected field, using the EXACT column header as the key name

───────────────────────────────────────────────────
OUTPUT — return ONLY this JSON (no markdown, no explanation):
───────────────────────────────────────────────────
{
  "document_title": "...",
  "document_id": "...",
  "detected_fields": ["No.", "Test procedure", "Acceptance criteria"],
  "steps": [
    {
      "section": "5.1 Media connections and conditions",
      "step_number": "5.1.1",
      "step_title": "Verify electrical power supply voltage",
      "No.": "1",
      "Test procedure": "Verification of the electrical power supply voltage...",
      "Acceptance criteria": "Main voltage value:\\nL1 to L2: ___ VAC\\n..."
    }
  ]
}

Rules:
  • detected_fields must list ONLY the content column headers (exclude result/signature/date columns).
  • Every step object must have exactly the keys in detected_fields plus section, step_number, step_title.
  • Preserve all text verbatim, including measurement blanks like "___ [°C]" or "Version-No.: ______".
  • Include ALL steps from ALL requested (sub)sections — do not skip any.
  • Return ONLY valid JSON.`;
}

/**
 * Slice the full PDF text down to just the portion containing the requested sections.
 * Looks for the first occurrence of a section header (e.g. "5", "5.1", "Section 5")
 * and returns text from that point to a reasonable cutoff.
 * Falls back to the first 50 000 chars if no section boundary is found.
 */
function extractRelevantText(fullText, sectionsInput) {
  // Build candidate patterns from the sections input
  // e.g. "Section 5 (all subsections)" → try "5", "Section 5", "5."
  const numbers = [...sectionsInput.matchAll(/\b(\d[\d.]*)/g)].map((m) => m[1]);
  const MAX_CHARS = 50000;

  for (const num of numbers) {
    // Match e.g. "5\n", "5 ", "5.", "Section 5", "5.1" at start of a line
    const patterns = [
      new RegExp(`(?:^|\\n)\\s*(?:Section\\s+)?${num.replace('.', '\\.')}[\\s\\n.]`, 'i'),
    ];
    for (const re of patterns) {
      const idx = fullText.search(re);
      if (idx !== -1) {
        return fullText.slice(idx, idx + MAX_CHARS);
      }
    }
  }

  // No section found — send the first chunk (skip front matter by starting at 20 % in)
  const skip = Math.floor(fullText.length * 0.1);
  return fullText.slice(skip, skip + MAX_CHARS);
}

export async function parseTestSteps(text, sectionsInput) {
  const relevantText = extractRelevantText(text, sectionsInput);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: buildPrompt(sectionsInput) },
      {
        role: 'user',
        content: `Parse the following document text and return the JSON:\n\n${relevantText}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0,
  });

  const raw = response.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw);

  const detectedFields = Array.isArray(parsed.detected_fields) ? parsed.detected_fields : [];
  const steps = (parsed.steps ?? []).map((s) => {
    const step = {
      section: s.section ?? '',
      step_number: s.step_number ?? '',
      step_title: s.step_title ?? '',
    };
    // Copy each detected field value exactly as returned by GPT-4o
    for (const field of detectedFields) {
      step[field] = s[field] ?? '';
    }
    return step;
  });

  return {
    documentTitle: parsed.document_title ?? 'Document',
    documentId: parsed.document_id ?? '',
    detectedFields,
    steps,
  };
}
