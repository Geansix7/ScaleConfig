// ─── Raw file structures (lossless) ───────────────────

export interface RawLine {
  raw: Uint8Array;   // Original bytes for this line (WITHOUT line ending)
  text: string;      // Best-effort UTF-8 decode (for display only)
}

export interface Row {
  rawLine: RawLine;
  fields: string[];           // Tab-split decoded strings (display)
  rawFields: Uint8Array[];    // Tab-split raw byte segments (for lossless write)
  dirty: boolean;             // Has this row been modified?
}

export interface Section {
  name: string;               // DPT, CLS, PLU, SCP, etc.
  startLine: RawLine;         // e.g. "XD1\tPLU\t"
  rows: Row[];
  endLine: RawLine;           // e.g. "END\tPLU\t"
}

export interface FileDoc {
  rawBytes: Uint8Array;                    // Original file for fallback
  lineEnding: '\r\n' | '\n';
  headerLine: RawLine;                     // First line: "ECS\tVER\t..."
  sections: Section[];                     // In original order
  interSectionGaps: Map<number, RawLine[]>; // Blank lines before section[i]
  trailingContent: RawLine[];              // After last section (END ECS, trailing blank)
}

// ─── Parsed views (overlays on Row data) ──────────────

export interface PluRecord {
  rowIndex: number;       // Index into PLU section's rows[]
  id: number;             // fields[1]
  unitType: number;       // fields[4]: 1=kg, 2=pcs
  price: string;          // fields[5]: "600,0" format (kept as string)
  price2: string;         // fields[6]
  price3: string;         // fields[7]
  department: number;     // fields[14]
  name: string;           // fields[15]
  shortCode: string;      // fields[64] (69-field format only)
  fieldCount: number;     // 69 or 16
}

export interface ScpEntry {
  rowIndex: number;       // Index into SCP section's rows[]
  layer: number;          // fields[1]: 0, 1, 2
  keyIndex: number;       // fields[2]: 1-40 (grid) or 41-48 (padding)
  pluId: number;          // fields[3]: mapped PLU ID (0 = empty)
}

export interface DptRecord {
  id: number;
  name: string;
}

export interface ClsRecord {
  id: number;
  name: string;
  deptId: number;
}

// ─── UI types ─────────────────────────────────────────

export type LayerId = 0 | 1 | 2;

export const LAYER_NAMES: Record<LayerId, string> = {
  0: 'L1 Main',
  1: 'L2 Red',
  2: 'L3 Blue',
};

export const LAYER_COLORS: Record<LayerId, string> = {
  0: '#c5943a', // gold
  1: '#c44b3f', // red
  2: '#3b82c4', // blue
};

export type ScreenId = 'dashboard' | 'keyboard' | 'plu' | 'settings';
