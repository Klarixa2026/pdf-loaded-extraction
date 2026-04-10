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
 * Clean extracted PDF text before sending to the model:
 * - Collapse runs of blank lines (PDF headers/footers leave lots of these)
 * - Remove lines that are purely page numbers or document reference stamps
 * - Collapse excessive horizontal whitespace
 */
function cleanText(text) {
  return text
    // Normalise Windows line endings
    .replace(/\r\n/g, '\n')
    // Remove lines that are just a page number (e.g. "- 12 -", "Page 12 of 29", "12")
    .replace(/^\s*[-–]?\s*(?:Page\s+)?\d+(\s+of\s+\d+)?\s*[-–]?\s*$/gim, '')
    // Collapse 3+ consecutive blank lines → single blank line
    .replace(/\n{3,}/g, '\n\n')
    // Collapse runs of spaces/tabs on a single line
    .replace(/[ \t]{3,}/g, '  ')
    .trim();
}

/**
 * Find the character index where a top-level section begins.
 * Tries progressively broader patterns:
 *   "5.1 Title", "5 Title", "Section 5", "SECTION 5"
 */
function findSectionStart(text, sectionNum) {
  // Escape dots in the section number for regex
  const escaped = sectionNum.replace(/\./g, '\\.');
  const patterns = [
    // "5.1 Some Title" or "5.1\nSome Title" at start of line
    new RegExp(`(?:^|\\n)[ \\t]*${escaped}(?=[\\s.\\n])`, 'i'),
    // "Section 5" / "SECTION 5.1"
    new RegExp(`(?:^|\\n)[ \\t]*Section\\s+${escaped}(?=[\\s.\\n])`, 'i'),
  ];
  for (const re of patterns) {
    const m = text.search(re);
    if (m !== -1) return m;
  }
  return -1;
}

/**
 * Find the character index where the NEXT top-level section begins
 * (so we don't send unrelated content to the model).
 * e.g. if the user asked for section 5, stop at section 6.
 */
function findSectionEnd(text, startIdx, sectionNum) {
  // Determine the next sibling section number
  const parts = sectionNum.split('.');
  const nextNum = [...parts.slice(0, -1), String(Number(parts[parts.length - 1]) + 1)].join('.');
  const escaped = nextNum.replace(/\./g, '\\.');
  const re = new RegExp(`(?:\\n)[ \\t]*(?:Section\\s+)?${escaped}(?=[\\s.\\n])`, 'i');
  const m = text.slice(startIdx + 1).search(re);
  return m === -1 ? -1 : startIdx + 1 + m;
}

/**
 * Slice the full PDF text down to just the portion containing the requested sections,
 * then clean it to reduce token count before sending to the model.
 */
function extractRelevantText(fullText, sectionsInput) {
  const MAX_CHARS = 50000; // ~12 500 tokens — preserves full sections without truncation

  // Parse out all section numbers mentioned by the user
  const numbers = [...sectionsInput.matchAll(/\b(\d[\d.]*)/g)].map((m) => m[1]);

  // Sort so we find the earliest-starting section first
  let startIdx = -1;
  let bestNum = null;
  for (const num of numbers) {
    const idx = findSectionStart(fullText, num);
    if (idx !== -1 && (startIdx === -1 || idx < startIdx)) {
      startIdx = idx;
      bestNum = num;
    }
  }

  if (startIdx === -1) {
    // Fallback: skip assumed front-matter (first 10 %) and send a clean chunk
    const skip = Math.floor(fullText.length * 0.1);
    return cleanText(fullText.slice(skip, skip + MAX_CHARS));
  }

  // Find where this section ends (next sibling section)
  const endIdx = findSectionEnd(fullText, startIdx, bestNum);
  const raw = endIdx === -1
    ? fullText.slice(startIdx, startIdx + MAX_CHARS)
    : fullText.slice(startIdx, Math.min(endIdx, startIdx + MAX_CHARS));

  return cleanText(raw);
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
