import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { parseFile, extractPluRecords, extractScpEntries } from '../parser';
import { writeFile, verifyRoundTrip, updateRowField } from '../writer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMS_PATH = resolve(__dirname, '../../../..', 'samples', 'A_000.TMS');

function loadTestFile(): ArrayBuffer {
  const buf = readFileSync(TMS_PATH);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

describe('Parser', () => {
  it('parses header correctly', () => {
    const buffer = loadTestFile();
    const doc = parseFile(buffer);
    expect(doc.headerLine.text).toContain('ECS');
    expect(doc.headerLine.text).toContain('V3.15C5');
    expect(doc.headerLine.text).toContain('UTF-8');
  });

  it('detects CRLF line ending', () => {
    const buffer = loadTestFile();
    const doc = parseFile(buffer);
    expect(doc.lineEnding).toBe('\r\n');
  });

  it('identifies all 13 sections in order', () => {
    const buffer = loadTestFile();
    const doc = parseFile(buffer);
    const names = doc.sections.map(s => s.name);
    expect(names).toEqual([
      'DPT', 'CLS', 'PLU', 'UNT', 'BAR',
      'LAB', 'SAL', 'REP', 'SCP', 'TMS',
      'TMT', 'INF', 'TIM',
    ]);
  });

  it('parses correct row counts per section', () => {
    const buffer = loadTestFile();
    const doc = parseFile(buffer);
    const counts: Record<string, number> = {};
    for (const s of doc.sections) {
      counts[s.name] = s.rows.length;
    }
    expect(counts['DPT']).toBe(9);
    expect(counts['CLS']).toBe(10);
    expect(counts['PLU']).toBe(141);
    expect(counts['UNT']).toBe(0);
    expect(counts['BAR']).toBe(9);
    expect(counts['SCP']).toBe(128);
  });

  it('parses PLU records with correct fields', () => {
    const buffer = loadTestFile();
    const doc = parseFile(buffer);
    const plus = extractPluRecords(doc);

    expect(plus.length).toBe(141);

    // Check first keyboard PLU
    const plu9001 = plus.find(p => p.id === 9001);
    expect(plu9001).toBeDefined();
    expect(plu9001!.unitType).toBe(1); // kg
    expect(plu9001!.price).toBe('600,0');
    expect(plu9001!.department).toBe(9);
    expect(plu9001!.name).toContain('කැරට්');
    expect(plu9001!.fieldCount).toBe(69);
  });

  it('parses SCP entries correctly', () => {
    const buffer = loadTestFile();
    const doc = parseFile(buffer);
    const entries = extractScpEntries(doc);

    expect(entries.length).toBe(128);

    // Layer 0, key 1 → PLU 9001
    const k1l0 = entries.find(e => e.layer === 0 && e.keyIndex === 1);
    expect(k1l0).toBeDefined();
    expect(k1l0!.pluId).toBe(9001);

    // Layer 1, key 1 → PLU 9041
    const k1l1 = entries.find(e => e.layer === 1 && e.keyIndex === 1);
    expect(k1l1).toBeDefined();
    expect(k1l1!.pluId).toBe(9041);

    // Layer 2, key 1 → PLU 9081
    const k1l2 = entries.find(e => e.layer === 2 && e.keyIndex === 1);
    expect(k1l2).toBeDefined();
    expect(k1l2!.pluId).toBe(9081);

    // Padding keys (41-48) on layer 0 have pluId 0
    const padding = entries.filter(e => e.keyIndex > 40);
    expect(padding.length).toBe(8);
    expect(padding.every(e => e.pluId === 0)).toBe(true);
  });

  it('preserves trailing tab on lines', () => {
    const buffer = loadTestFile();
    const doc = parseFile(buffer);
    // DPT rows have 4 fields (trailing tab creates empty last field)
    const dptSection = doc.sections.find(s => s.name === 'DPT')!;
    const firstRow = dptSection.rows[0];
    expect(firstRow.fields.length).toBe(4);
    expect(firstRow.fields[3]).toBe(''); // trailing empty
  });
});

describe('Writer - Round-trip', () => {
  it('produces byte-identical output when no changes made', () => {
    const buffer = loadTestFile();
    const original = new Uint8Array(buffer);
    const doc = parseFile(buffer);
    const output = writeFile(doc);
    const result = verifyRoundTrip(original, output);

    if (!result.match) {
      // Show context around first difference for debugging
      const pos = result.firstDiffAt;
      const origSlice = original.slice(Math.max(0, pos - 20), pos + 20);
      const outSlice = output.slice(Math.max(0, pos - 20), pos + 20);
      console.error(`First diff at byte ${pos}:`);
      console.error('Original:', Array.from(origSlice).map(b => b.toString(16).padStart(2, '0')).join(' '));
      console.error('Output:  ', Array.from(outSlice).map(b => b.toString(16).padStart(2, '0')).join(' '));
      console.error(`Original length: ${original.length}, Output length: ${output.length}`);
    }

    expect(result.match).toBe(true);
  });
});

describe('Writer - Mutations', () => {
  it('only changes the edited row when a PLU price is updated', () => {
    const buffer = loadTestFile();
    const doc = parseFile(buffer);
    const original = new Uint8Array(buffer);

    // Find PLU 9001 and change its price
    const pluSection = doc.sections.find(s => s.name === 'PLU')!;
    const row = pluSection.rows.find(r => r.fields[1] === '9001')!;

    updateRowField(row, 5, '750,0'); // Change price from 600,0 to 750,0

    const output = writeFile(doc);

    // Output should differ from original
    const result = verifyRoundTrip(original, output);
    expect(result.match).toBe(false);

    // Parse the output and verify only that PLU changed
    const outputBuffer = output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength);
    const doc2 = parseFile(outputBuffer);
    const plus2 = extractPluRecords(doc2);
    const plu9001 = plus2.find(p => p.id === 9001)!;
    expect(plu9001.price).toBe('750,0');

    // Other PLUs unchanged
    const plu9002 = plus2.find(p => p.id === 9002)!;
    const origPlus = extractPluRecords(parseFile(buffer));
    const origPlu9002 = origPlus.find(p => p.id === 9002)!;
    expect(plu9002.price).toBe(origPlu9002.price);
  });
});
