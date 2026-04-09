'use client';

import { useState, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Tiny shared components
// ─────────────────────────────────────────────────────────────────────────────

function Spinner({ size = 5, color = 'text-blue-600' }) {
  return (
    <svg className={`animate-spin w-${size} h-${size} ${color}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function ErrorBanner({ message, onDismiss }) {
  return (
    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
      <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
      <div className="flex-1">
        <p className="font-medium">Error</p>
        <p className="mt-0.5 text-red-600">{message}</p>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="text-red-400 hover:text-red-600">✕</button>
      )}
    </div>
  );
}

function StepBadge({ current, total, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-700 text-white text-xs font-bold">
        {current}
      </span>
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <span className="text-xs text-gray-400">Step {current} of {total}</span>
    </div>
  );
}

function ExtractionLoader({ fileName }) {
  const steps = [
    { label: 'Reading PDF document', detail: 'Parsing text layer from all pages' },
    { label: 'Identifying test sections', detail: 'Locating requested section headers' },
    { label: 'Extracting test steps', detail: 'Parsing rows, columns and step data' },
    { label: 'Generating step titles', detail: 'Summarising procedures with Klarixa AI' },
  ];

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      {/* Animated ring */}
      <div className="relative w-20 h-20 mb-8">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="34" fill="none" stroke="#e5e7eb" strokeWidth="6" />
          <circle
            cx="40" cy="40" r="34" fill="none"
            stroke="#1d4ed8" strokeWidth="6"
            strokeDasharray="213.6"
            strokeDashoffset="53"
            strokeLinecap="round"
            style={{ animation: 'spin 1.4s linear infinite' }}
          />
        </svg>
        {/* Klarixa "K" mark in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-black text-blue-700 select-none">K</span>
        </div>
      </div>

      <p className="text-lg font-semibold text-gray-900 mb-1">Analysing document</p>
      {fileName && (
        <p className="text-sm text-gray-500 mb-8 max-w-xs truncate text-center">{fileName}</p>
      )}

      {/* Step list */}
      <div className="w-full max-w-sm space-y-3">
        {steps.map((s, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="mt-0.5 w-5 h-5 flex-shrink-0 flex items-center justify-center">
              <div
                className="w-2 h-2 rounded-full bg-blue-600"
                style={{ animation: `pulse 1.6s ease-in-out ${i * 0.3}s infinite` }}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">{s.label}</p>
              <p className="text-xs text-gray-400">{s.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-10 text-xs text-gray-400">This usually takes 15 – 30 seconds</p>

      <style>{`
        @keyframes spin { to { stroke-dashoffset: -213.6; } }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage 1 — Configure & Upload
// ─────────────────────────────────────────────────────────────────────────────

function ConfigureStage({ onExtract }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [sections, setSections] = useState('Section 5 (all subsections)');

  const handleFile = (f) => {
    if (f && f.name.toLowerCase().endsWith('.pdf')) setFile(f);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = () => {
    if (file && sections.trim()) onExtract(file, sections.trim());
  };

  return (
    <div className="space-y-6">
      {/* Section input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Sections / subsections to extract
          <span className="ml-1 text-red-500">*</span>
        </label>
        <input
          type="text"
          value={sections}
          onChange={(e) => setSections(e.target.value)}
          placeholder="e.g. Section 5, or 5.1, 5.3, 5.4.1, or all"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-400 mt-1">
          Be as specific as you like — "Section 5", "5.1, 5.2", "Function Test", "all" are all valid.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed
          p-14 cursor-pointer transition-colors
          ${file ? 'border-green-400 bg-green-50' : dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50/40'}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        {file ? (
          <>
            <svg className="w-12 h-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-800">{file.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{(file.size / 1024).toFixed(0)} KB · Click to change</p>
            </div>
          </>
        ) : (
          <>
            <svg className="w-14 h-14 text-gray-400" fill="none" viewBox="0 0 48 48" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M28 4H12a4 4 0 00-4 4v32a4 4 0 004 4h24a4 4 0 004-4V20M28 4l12 16M28 4v16h12" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 28l6-6 6 6M22 22v12" />
            </svg>
            <div className="text-center">
              <p className="text-base font-semibold text-gray-700">Drop vendor SAT PDF here</p>
              <p className="text-sm text-gray-500 mt-1">or click to browse · PDF only</p>
            </div>
          </>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!file || !sections.trim()}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Extract test steps
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage 2 — Field Mapping
// ─────────────────────────────────────────────────────────────────────────────

// Default suggestions so the user doesn't have to type from scratch
const SUGGESTED_VEEVA_NAMES = {
  'No.': 'step_number__v',
  'Test procedure': 'procedure__v',
  'Acceptance criteria': 'expected_results__v',
  'Tested by': 'tested_by__v',
  'Test procedure ': 'procedure__v',   // trailing-space variant
};

function MappingStage({ extractedData, onConfirm, onBack }) {
  const { documentTitle, documentId, detectedFields, steps, pageCount } = extractedData;

  // fieldMapping: { [pdfField]: veevaColumnName }
  const [fieldMapping, setFieldMapping] = useState(() => {
    const initial = {};
    for (const f of detectedFields) {
      initial[f] = SUGGESTED_VEEVA_NAMES[f] ?? SUGGESTED_VEEVA_NAMES[f.trim()] ?? '';
    }
    return initial;
  });

  const [touched, setTouched] = useState({});
  // Optional AI-derived title column: user names it, value comes from step.step_title
  const [derivedTitleName, setDerivedTitleName] = useState('step_title__v');

  const updateMapping = (field, value) => {
    setFieldMapping((prev) => ({ ...prev, [field]: value }));
  };

  const markTouched = (field) => setTouched((prev) => ({ ...prev, [field]: true }));

  const errors = detectedFields.reduce((acc, f) => {
    if (!fieldMapping[f]?.trim()) acc[f] = 'Veeva column name is required';
    return acc;
  }, {});

  const isValid = Object.keys(errors).length === 0;

  const handleConfirm = () => {
    const allTouched = detectedFields.reduce((acc, f) => ({ ...acc, [f]: true }), {});
    setTouched(allTouched);
    if (isValid) onConfirm(fieldMapping, derivedTitleName.trim());
  };

  // Unique sections for the preview count
  const sectionCount = new Set(steps.map((s) => s.section)).size;

  return (
    <div className="space-y-6">
      {/* Doc info */}
      <div className="bg-white border border-gray-200 rounded-xl px-5 py-3 flex flex-wrap items-center gap-4 text-sm text-gray-600">
        <span className="font-semibold text-gray-900">{documentTitle}</span>
        {documentId && <span className="text-xs text-gray-400">Doc ID: {documentId}</span>}
        <span className="text-gray-300">|</span>
        <span>{steps.length} test steps</span>
        <span className="text-gray-300">|</span>
        <span>{sectionCount} section{sectionCount !== 1 ? 's' : ''}</span>
        <span className="text-gray-300">|</span>
        <span>{pageCount} pages</span>
      </div>

      {/* Mapping card */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-800">Map PDF columns → Veeva CSV columns</p>
            <p className="text-xs text-gray-500 mt-0.5">
              All fields are required. Column names are pre-filled with suggested Veeva names — edit as needed.
            </p>
          </div>
          <span className="text-xs bg-blue-100 text-blue-700 font-medium px-2.5 py-1 rounded-full">
            {detectedFields.length} field{detectedFields.length !== 1 ? 's' : ''} detected
          </span>
        </div>

        <div className="divide-y divide-gray-100">
          {/* Header row */}
          <div className="grid grid-cols-2 gap-4 px-5 py-2.5 bg-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span>PDF column header (from document)</span>
            <span>Veeva CSV column name <span className="text-red-500">*</span></span>
          </div>

          {detectedFields.map((field) => {
            const hasError = touched[field] && errors[field];
            return (
              <div key={field} className="grid grid-cols-2 gap-4 px-5 py-3.5 items-start">
                {/* Left — PDF field name (read-only, extracted from doc) */}
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-100 text-blue-700 flex-shrink-0">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                    </svg>
                  </span>
                  <code className="text-sm text-gray-800 font-mono bg-gray-50 border border-gray-200 rounded px-2 py-0.5">
                    {field}
                  </code>
                </div>

                {/* Right — Veeva column name input */}
                <div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 text-xs pointer-events-none">→</span>
                    <input
                      type="text"
                      value={fieldMapping[field] ?? ''}
                      onChange={(e) => updateMapping(field, e.target.value)}
                      onBlur={() => markTouched(field)}
                      placeholder="e.g. procedure__v"
                      className={`w-full pl-7 pr-3 py-2 text-sm border rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                        ${hasError ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
                    />
                  </div>
                  {hasError && (
                    <p className="text-xs text-red-600 mt-1">{errors[field]}</p>
                  )}
                </div>
              </div>
            );
          })}

          {/* ── Derived title row ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4 px-5 py-4 items-start bg-amber-50 border-t-2 border-dashed border-amber-300">
            {/* Left — description of the derived source */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 border border-amber-300 rounded-full px-2 py-0.5 font-semibold">
                  ✦ AI-derived
                </span>
                <span className="text-sm font-medium text-gray-800">Concise title column</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Klarixa AI extracts a short (≤10 word) title from the <code className="bg-gray-100 px-1 rounded">Test procedure</code> text for each step.
                Name the CSV column below — leave blank to exclude.
              </p>
              {steps[0]?.step_title && (
                <p className="text-xs text-amber-700 italic">
                  e.g. &ldquo;{steps[0].step_title}&rdquo;
                </p>
              )}
            </div>

            {/* Right — Veeva column name for the derived title */}
            <div>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 text-xs pointer-events-none">→</span>
                <input
                  type="text"
                  value={derivedTitleName}
                  onChange={(e) => setDerivedTitleName(e.target.value)}
                  placeholder="e.g. step_title__v  (leave blank to skip)"
                  className="w-full pl-7 pr-3 py-2 text-sm border border-amber-300 rounded-lg font-mono bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Optional · column will be prepended first in the output</p>
            </div>
          </div>
        </div>
      </div>

      {/* Step preview */}
      <details className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <summary className="px-5 py-3 text-sm font-medium text-gray-700 cursor-pointer select-none hover:bg-gray-50">
          Preview extracted data ({steps.length} steps) — click to expand
        </summary>
        <div className="overflow-x-auto border-t border-gray-100 max-h-72 overflow-y-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-800 text-white sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Section</th>
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Step</th>
                {detectedFields.map((f) => (
                  <th key={f} className="px-3 py-2 text-left font-medium whitespace-nowrap">{f}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {steps.slice(0, 10).map((step, i) => (
                <tr key={i} className={`border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-3 py-2 align-top text-gray-500 whitespace-nowrap">{step.section}</td>
                  <td className="px-3 py-2 align-top text-gray-600 whitespace-nowrap">{step.step_number}</td>
                  {detectedFields.map((f) => (
                    <td key={f} className="px-3 py-2 align-top text-gray-600 max-w-xs truncate">
                      {step[f]}
                    </td>
                  ))}
                </tr>
              ))}
              {steps.length > 10 && (
                <tr>
                  <td colSpan={detectedFields.length + 2} className="px-3 py-2 text-center text-xs text-gray-400">
                    … and {steps.length - 10} more steps
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </details>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50"
        >
          ← Back
        </button>
        <button
          onClick={handleConfirm}
          className="flex-[3] py-3 rounded-xl text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 transition-colors"
        >
          Confirm mapping & generate file
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage 3 — Results & Download
// ─────────────────────────────────────────────────────────────────────────────

function groupBySection(steps) {
  return steps.reduce((acc, s) => {
    const key = s.section || 'Uncategorised';
    (acc[key] = acc[key] ?? []).push(s);
    return acc;
  }, {});
}

async function triggerDownload(steps, mapping, format, documentTitle, derivedTitleColumn) {
  const res = await fetch('/api/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ steps, mapping, format, documentTitle, derivedTitleColumn }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error ?? 'Download failed');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `veeva-test-steps.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}

function ResultsStage({ extractedData, fieldMapping, derivedTitleColumn, onReset }) {
  const { documentTitle, documentId, steps, pageCount } = extractedData;
  const [downloading, setDownloading] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});

  const veevaColumns = Object.values(fieldMapping);
  const pdfFields = Object.keys(fieldMapping);

  const toggle = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleDownload = async (format) => {
    setDownloading(format);
    setError(null);
    try {
      await triggerDownload(steps, fieldMapping, format, documentTitle, derivedTitleColumn);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(null);
    }
  };

  const groups = groupBySection(steps);

  return (
    <div className="space-y-5">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Summary bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{documentTitle}</span>
          {documentId && <span className="text-xs text-gray-400">Doc ID: {documentId}</span>}
          <span className="text-gray-300">|</span>
          <span>{steps.length} steps</span>
          <span className="text-gray-300">|</span>
          <span>{pageCount} pages</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50"
          >
            Start over
          </button>
          <button
            onClick={() => handleDownload('csv')}
            disabled={!!downloading}
            className="flex items-center gap-1.5 text-sm bg-white border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
          >
            {downloading === 'csv' ? <Spinner size={4} /> : null}
            Download CSV
          </button>
          <button
            onClick={() => handleDownload('xlsx')}
            disabled={!!downloading}
            className="flex items-center gap-1.5 text-sm bg-blue-700 text-white rounded-lg px-4 py-1.5 hover:bg-blue-800 disabled:opacity-50"
          >
            {downloading === 'xlsx' ? <Spinner size={4} color="text-white" /> : null}
            Download Excel
          </button>
        </div>
      </div>

      {/* Mapping summary chips */}
      <div className="flex flex-wrap gap-2">
        {derivedTitleColumn && (
          <span className="flex items-center gap-1.5 text-xs bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
            <span className="text-amber-700 font-medium">✦ AI-derived</span>
            <span className="text-gray-400">→</span>
            <code className="text-green-700">{derivedTitleColumn}</code>
          </span>
        )}
        {pdfFields.map((pdf, i) => (
          <span key={pdf} className="flex items-center gap-1.5 text-xs bg-blue-50 border border-blue-100 rounded-full px-3 py-1">
            <code className="text-blue-700">{pdf}</code>
            <span className="text-gray-400">→</span>
            <code className="text-green-700">{veevaColumns[i]}</code>
          </span>
        ))}
      </div>

      {/* Results table grouped by section */}
      {Object.entries(groups).map(([section, sectionSteps]) => (
        <div key={section}>
          <h3 className="text-xs font-semibold text-blue-800 bg-blue-50 px-4 py-2 rounded-lg mb-2 border border-blue-100 uppercase tracking-wide">
            {section} — {sectionSteps.length} step{sectionSteps.length !== 1 ? 's' : ''}
          </h3>
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="px-3 py-2.5 text-left font-medium text-xs whitespace-nowrap">Step</th>
                  {derivedTitleColumn && (
                    <th className="px-3 py-2.5 text-left font-mono text-xs font-medium whitespace-nowrap text-amber-300">
                      {derivedTitleColumn}
                    </th>
                  )}
                  {veevaColumns.map((col) => (
                    <th key={col} className="px-3 py-2.5 text-left font-mono text-xs font-medium whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sectionSteps.map((step, i) => {
                  const key = `${section}-${i}`;
                  const isOpen = expanded[key];
                  return (
                    <tr key={key} className={`border-t border-gray-100 align-top ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{step.step_number}</td>
                      {derivedTitleColumn && (
                        <td className="px-3 py-2.5 text-amber-700 italic text-xs max-w-xs">
                          {step.step_title ?? ''}
                        </td>
                      )}
                      {pdfFields.map((field, fi) => {
                        const text = step[field] ?? '';
                        const isLong = text.length > 150;
                        return (
                          <td key={field} className="px-3 py-2.5 text-gray-700 max-w-sm">
                            <p className={`whitespace-pre-wrap text-xs ${isOpen ? '' : 'line-clamp-3'}`}>{text}</p>
                            {isLong && fi === 0 && (
                              <button
                                onClick={() => toggle(key)}
                                className="text-xs text-blue-600 hover:underline mt-1"
                              >
                                {isOpen ? 'Show less ↑' : 'Show more ↓'}
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root page — orchestrates the 3-stage flow
// ─────────────────────────────────────────────────────────────────────────────

const STAGES = ['Configure & Upload', 'Map Fields', 'Download'];

export default function Home() {
  const [stage, setStage] = useState('upload');   // 'upload' | 'extracting' | 'mapping' | 'ready'
  const [error, setError] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [fieldMapping, setFieldMapping] = useState(null);
  const [derivedTitleColumn, setDerivedTitleColumn] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState(null);

  const stageIndex = { upload: 0, extracting: 0, mapping: 1, ready: 2 }[stage] ?? 0;

  const handleExtract = useCallback(async (file, sections) => {
    setStage('extracting');
    setError(null);
    setUploadedFileName(file.name);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('sections', sections);

    try {
      const res = await fetch('/api/extract', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Extraction failed');
      setExtractedData(json);
      setStage('mapping');
    } catch (err) {
      setError(err.message);
      setStage('upload');
      setUploadedFileName(null);
    }
  }, []);

  const handleMappingConfirm = useCallback((mapping, derivedTitleName) => {
    setFieldMapping(mapping);
    setDerivedTitleColumn(derivedTitleName || null);
    setStage('ready');
  }, []);

  const handleReset = useCallback(() => {
    setStage('upload');
    setExtractedData(null);
    setFieldMapping(null);
    setDerivedTitleColumn(null);
    setError(null);
  }, []);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">PDF → Veeva Loader</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Extract SAT test steps · Map to your Veeva columns · Export CSV / Excel
            </p>
          </div>

          {/* Stage indicator */}
          <div className="hidden sm:flex items-center gap-1">
            {STAGES.map((label, i) => (
              <div key={label} className="flex items-center gap-1">
                <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full
                  ${i === stageIndex ? 'bg-blue-700 text-white' : i < stageIndex ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                  <span>{i < stageIndex ? '✓' : i + 1}</span>
                  <span>{label}</span>
                </div>
                {i < STAGES.length - 1 && <span className="text-gray-300 text-xs">›</span>}
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6">
            <ErrorBanner message={error} onDismiss={() => setError(null)} />
          </div>
        )}

        {stage === 'upload' && (
          <ConfigureStage onExtract={handleExtract} loading={false} />
        )}

        {stage === 'extracting' && (
          <ExtractionLoader fileName={uploadedFileName} />
        )}

        {stage === 'mapping' && extractedData && (
          <MappingStage
            extractedData={extractedData}
            onConfirm={handleMappingConfirm}
            onBack={handleReset}
          />
        )}

        {stage === 'ready' && extractedData && fieldMapping && (
          <ResultsStage
            extractedData={extractedData}
            fieldMapping={fieldMapping}
            derivedTitleColumn={derivedTitleColumn}
            onReset={handleReset}
          />
        )}
      </div>
    </main>
  );
}
