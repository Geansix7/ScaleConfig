import type { FileDoc, RawLine, Row, Section, PluRecord, ScpEntry, DptRecord } from './types';
import { PLU_FIELDS, SCP_FIELDS, DPT_FIELDS } from './fieldMap';

const TAB = 0x09;
const CR = 0x0d;
const LF = 0x0a;

const decoder = new TextDecoder('utf-8', { fatal: false });
const encoder = new TextEncoder();

// ─── Line ending detection ────────────────────────────

function detectLineEnding(bytes: Uint8Array): '\r\n' | '\n' {
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === LF) {
      return (i > 0 && bytes[i - 1] === CR) ? '\r\n' : '\n';
    }
  }
  return '\r\n';
}

// ─── Split bytes into lines ───────────────────────────

function splitLines(bytes: Uint8Array, lineEnding: '\r\n' | '\n'): RawLine[] {
  const lines: RawLine[] = [];
  const leLen = lineEnding.length;
  let start = 0;

  for (let i = 0; i < bytes.length; i++) {
    if (lineEnding === '\r\n') {
      if (bytes[i] === CR && i + 1 < bytes.length && bytes[i + 1] === LF) {
        const raw = bytes.slice(start, i);
        lines.push({ raw, text: decoder.decode(raw) });
        start = i + 2;
        i++; // skip LF
      }
    } else {
      if (bytes[i] === LF) {
        const raw = bytes.slice(start, i);
        lines.push({ raw, text: decoder.decode(raw) });
        start = i + 1;
      }
    }
  }

  // Handle remaining bytes after last line ending (if file doesn't end with newline)
  if (start < bytes.length) {
    const raw = bytes.slice(start);
    lines.push({ raw, text: decoder.decode(raw) });
  }

  return lines;
}

// ─── Split a raw line on tabs ─────────────────────────

function splitOnTab(bytes: Uint8Array): Uint8Array[] {
  const fields: Uint8Array[] = [];
  let start = 0;

  for (let i = 0; i <= bytes.length; i++) {
    if (i === bytes.length || bytes[i] === TAB) {
      fields.push(bytes.slice(start, i));
      start = i + 1;
    }
  }

  return fields;
}

// ─── Parse a line into a Row ──────────────────────────

function parseRow(line: RawLine): Row {
  const rawFields = splitOnTab(line.raw);
  const fields = rawFields.map(f => decoder.decode(f));
  return { rawLine: line, fields, rawFields, dirty: false };
}

// ─── Main parser ──────────────────────────────────────

export function parseFile(buffer: ArrayBuffer): FileDoc {
  const bytes = new Uint8Array(buffer);
  const lineEnding = detectLineEnding(bytes);
  const allLines = splitLines(bytes, lineEnding);

  if (allLines.length === 0) {
    throw new Error('Empty file');
  }

  const headerLine = allLines[0];
  const sections: Section[] = [];
  const interSectionGaps = new Map<number, RawLine[]>();
  const trailingContent: RawLine[] = [];
  let currentGap: RawLine[] = [];
  let i = 1;

  while (i < allLines.length) {
    const text = allLines[i].text;

    if (text.startsWith('XD1\t')) {
      // Store accumulated gap before this section
      if (currentGap.length > 0) {
        interSectionGaps.set(sections.length, [...currentGap]);
        currentGap = [];
      }

      const sectionName = text.split('\t')[1];
      const startLine = allLines[i];
      i++;

      const rows: Row[] = [];
      while (i < allLines.length) {
        const lineText = allLines[i].text;
        if (lineText.startsWith('END\t') && lineText.split('\t')[1] === sectionName) {
          break;
        }
        rows.push(parseRow(allLines[i]));
        i++;
      }

      const endLine = allLines[i] || { raw: encoder.encode(`END\t${sectionName}\t`), text: `END\t${sectionName}\t` };
      i++;

      sections.push({ name: sectionName, startLine, rows, endLine });
    } else if (text.startsWith('END\tECS')) {
      // End of file marker - collect remaining as trailing content
      if (currentGap.length > 0) {
        trailingContent.push(...currentGap);
        currentGap = [];
      }
      trailingContent.push(allLines[i]);
      i++;
      // Collect anything after END ECS (shouldn't normally exist, but preserve)
      while (i < allLines.length) {
        trailingContent.push(allLines[i]);
        i++;
      }
    } else {
      // Blank line or unexpected content between sections
      currentGap.push(allLines[i]);
      i++;
    }
  }

  // If there's leftover gap that wasn't consumed (file without END ECS)
  if (currentGap.length > 0) {
    trailingContent.push(...currentGap);
  }

  return {
    rawBytes: bytes,
    lineEnding,
    headerLine,
    sections,
    interSectionGaps,
    trailingContent,
  };
}

// ─── Parsed view extractors ──────────────────────────

export function extractPluRecords(doc: FileDoc): PluRecord[] {
  const section = doc.sections.find(s => s.name === 'PLU');
  if (!section) return [];

  return section.rows.map((row, idx) => ({
    rowIndex: idx,
    id: parseInt(row.fields[PLU_FIELDS.ID]) || 0,
    unitType: parseInt(row.fields[PLU_FIELDS.UNIT_TYPE]) || 1,
    price: row.fields[PLU_FIELDS.PRICE] || '0,0',
    price2: row.fields[PLU_FIELDS.PRICE_2] || '0,0',
    price3: row.fields[PLU_FIELDS.PRICE_3] || '0,0',
    department: parseInt(row.fields[PLU_FIELDS.DEPARTMENT]) || 0,
    name: row.fields[PLU_FIELDS.NAME] || '',
    shortCode: row.fields.length > PLU_FIELDS.SHORT_CODE ? (row.fields[PLU_FIELDS.SHORT_CODE] || '') : '',
    fieldCount: row.fields.length,
  }));
}

export function extractScpEntries(doc: FileDoc): ScpEntry[] {
  const section = doc.sections.find(s => s.name === 'SCP');
  if (!section) return [];

  return section.rows.map((row, idx) => ({
    rowIndex: idx,
    layer: parseInt(row.fields[SCP_FIELDS.LAYER]) || 0,
    keyIndex: parseInt(row.fields[SCP_FIELDS.KEY_INDEX]) || 0,
    pluId: parseInt(row.fields[SCP_FIELDS.PLU_ID]) || 0,
  }));
}

export function extractDptRecords(doc: FileDoc): DptRecord[] {
  const section = doc.sections.find(s => s.name === 'DPT');
  if (!section) return [];

  return section.rows.map(row => ({
    id: parseInt(row.fields[DPT_FIELDS.ID]) || 0,
    name: row.fields[DPT_FIELDS.NAME] || '',
  }));
}
