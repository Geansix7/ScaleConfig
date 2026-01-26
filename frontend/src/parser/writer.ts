import type { FileDoc, Row } from './types';

const encoder = new TextEncoder();

// ─── Join raw fields with tab bytes ───────────────────

function joinWithTab(rawFields: Uint8Array[]): Uint8Array {
  if (rawFields.length === 0) return new Uint8Array(0);

  // Calculate total length
  let totalLen = 0;
  for (let i = 0; i < rawFields.length; i++) {
    totalLen += rawFields[i].length;
    if (i < rawFields.length - 1) totalLen += 1; // tab separator
  }

  const result = new Uint8Array(totalLen);
  let offset = 0;

  for (let i = 0; i < rawFields.length; i++) {
    result.set(rawFields[i], offset);
    offset += rawFields[i].length;
    if (i < rawFields.length - 1) {
      result[offset] = 0x09; // tab
      offset += 1;
    }
  }

  return result;
}

// ─── Concatenate multiple Uint8Arrays ─────────────────

function concatenateArrays(arrays: Uint8Array[]): Uint8Array {
  let totalLen = 0;
  for (const arr of arrays) {
    totalLen += arr.length;
  }

  const result = new Uint8Array(totalLen);
  let offset = 0;

  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }

  return result;
}

// ─── Get the bytes for a row ──────────────────────────

function getRowBytes(row: Row): Uint8Array {
  if (row.dirty) {
    return joinWithTab(row.rawFields);
  }
  return row.rawLine.raw;
}

// ─── Main writer ─────────────────────────────────────

export function writeFile(doc: FileDoc): Uint8Array {
  const lineEndingBytes = doc.lineEnding === '\r\n'
    ? new Uint8Array([0x0d, 0x0a])
    : new Uint8Array([0x0a]);

  const chunks: Uint8Array[] = [];

  // Header line
  chunks.push(doc.headerLine.raw);
  chunks.push(lineEndingBytes);

  // Sections
  for (let si = 0; si < doc.sections.length; si++) {
    // Inter-section gap (blank lines before this section)
    const gap = doc.interSectionGaps.get(si);
    if (gap) {
      for (const gapLine of gap) {
        chunks.push(gapLine.raw);
        chunks.push(lineEndingBytes);
      }
    }

    const section = doc.sections[si];

    // Start marker
    chunks.push(section.startLine.raw);
    chunks.push(lineEndingBytes);

    // Data rows
    for (const row of section.rows) {
      chunks.push(getRowBytes(row));
      chunks.push(lineEndingBytes);
    }

    // End marker
    chunks.push(section.endLine.raw);
    chunks.push(lineEndingBytes);
  }

  // Trailing content (gap before END ECS + END ECS line)
  for (const trailing of doc.trailingContent) {
    chunks.push(trailing.raw);
    chunks.push(lineEndingBytes);
  }

  return concatenateArrays(chunks);
}

// ─── Row mutation helpers ─────────────────────────────

export function updateRowField(row: Row, fieldIndex: number, newValue: string): void {
  const encoded = encoder.encode(newValue);
  row.rawFields[fieldIndex] = encoded;
  row.fields[fieldIndex] = newValue;
  row.dirty = true;
}

export function updateScpMapping(row: Row, pluId: number): void {
  updateRowField(row, 3, pluId.toString());
}

// ─── Create new PLU row ───────────────────────────────

// Template: 69-field PLU row matching the observed format
// Fields [0-15]: PLU, id, 0, "", unitType, price, 0,0, 0,0, 0,0,0,0,0,0, dept, name
// Fields [16-22]: empty (7 fields)
// Fields [23-35]: zeros (13 fields)
// Fields [36-68]: mix of "0,0", "0", "127,0", "127", trailing ""
const PLU_TEMPLATE_TAIL = [
  '', '', '', '', '', '', '',           // [16-22] empty
  '0', '0', '0', '0', '0', '0',        // [23-28]
  '0', '0', '0', '0', '0', '0',        // [29-34]
  '0',                                   // [35]
  '0,0', '0,0', '0', '0',              // [36-39]
  '0,0', '0,0', '0,0', '0', '0',       // [40-44]
  '0,0', '0,0', '0,0', '0', '0',       // [45-49]
  '127,0', '0,0', '0,0', '0', '0',     // [50-54]
  '127,0', '0,0', '0,0', '0', '0',     // [55-59]
  '127', '0', '0', '0', '0',           // [60-64]
  '127', '0', '0', '0',                // [65-68]
  '',                                    // [69] trailing empty (from trailing tab)
];

export interface NewPluParams {
  id: number;
  name: string;
  price: string;       // "280,0" format
  unitType: number;    // 1=kg, 2=pcs
  department: number;
}

export function createPluRow(params: NewPluParams): Row {
  const fields = [
    'PLU',
    params.id.toString(),
    '0',
    '',
    params.unitType.toString(),
    params.price,
    '0,0',
    '0,0',
    '0', '0', '0', '0', '0', '0',
    params.department.toString(),
    params.name,
    ...PLU_TEMPLATE_TAIL,
  ];

  const rawFields = fields.map(f => encoder.encode(f));
  const rawBytes = joinWithTab(rawFields);
  const rawLine = { raw: rawBytes, text: fields.join('\t') };

  return {
    rawLine,
    fields,
    rawFields,
    dirty: true, // New rows are always "dirty" so the writer builds from fields
  };
}

// ─── Round-trip verification ──────────────────────────

export function verifyRoundTrip(original: Uint8Array, output: Uint8Array): { match: boolean; firstDiffAt: number } {
  const minLen = Math.min(original.length, output.length);

  for (let i = 0; i < minLen; i++) {
    if (original[i] !== output[i]) {
      return { match: false, firstDiffAt: i };
    }
  }

  if (original.length !== output.length) {
    return { match: false, firstDiffAt: minLen };
  }

  return { match: true, firstDiffAt: -1 };
}
