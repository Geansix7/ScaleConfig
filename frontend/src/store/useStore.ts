import { create } from 'zustand';
import type { FileDoc, PluRecord, ScpEntry, DptRecord, LayerId, ScreenId } from '../parser/types';
import { parseFile, extractPluRecords, extractScpEntries, extractDptRecords } from '../parser/parser';
import { writeFile, updateRowField, createPluRow } from '../parser/writer';
import type { NewPluParams } from '../parser/writer';
import { PLU_FIELDS, SCP_FIELDS } from '../parser/fieldMap';

interface AppState {
  // File state
  fileDoc: FileDoc | null;
  fileName: string;
  originalBytes: Uint8Array | null;

  // Parsed views
  pluRecords: PluRecord[];
  scpEntries: ScpEntry[];
  dptRecords: DptRecord[];

  // UI state
  activeLayer: LayerId;
  selectedKeyIndex: number | null;
  currentScreen: ScreenId;
  searchQuery: string;
  pluSearchQuery: string;

  // Actions - File
  loadFile: (buffer: ArrayBuffer, fileName: string) => void;
  exportFile: () => Uint8Array | null;

  // Actions - PLU editing
  addPlu: (params: NewPluParams) => { success: boolean; error?: string };
  deletePlu: (pluId: number) => void;
  updatePluField: (pluId: number, field: 'name' | 'price' | 'unitType' | 'department', value: string | number) => void;

  // Actions - Keyboard mapping
  setActiveLayer: (layer: LayerId) => void;
  selectKey: (keyIndex: number | null) => void;
  assignPluToKey: (layer: LayerId, keyIndex: number, pluId: number) => void;
  clearKey: (layer: LayerId, keyIndex: number) => void;

  // Actions - Navigation
  setScreen: (screen: ScreenId) => void;
  setSearchQuery: (query: string) => void;
  setPluSearchQuery: (query: string) => void;

  // Helpers
  getKeyMapping: (layer: LayerId, keyIndex: number) => ScpEntry | undefined;
  getPluById: (id: number) => PluRecord | undefined;
  isDirty: () => boolean;
}

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  fileDoc: null,
  fileName: '',
  originalBytes: null,
  pluRecords: [],
  scpEntries: [],
  dptRecords: [],
  activeLayer: 0,
  selectedKeyIndex: null,
  currentScreen: 'dashboard',
  searchQuery: '',
  pluSearchQuery: '',

  // ─── File actions ─────────────────────────────────

  loadFile: (buffer, fileName) => {
    const bytes = new Uint8Array(buffer);
    const doc = parseFile(buffer);
    const pluRecords = extractPluRecords(doc);
    const scpEntries = extractScpEntries(doc);
    const dptRecords = extractDptRecords(doc);

    set({
      fileDoc: doc,
      fileName,
      originalBytes: bytes,
      pluRecords,
      scpEntries,
      dptRecords,
      currentScreen: 'keyboard',
      selectedKeyIndex: null,
    });
  },

  exportFile: () => {
    const { fileDoc } = get();
    if (!fileDoc) return null;
    return writeFile(fileDoc);
  },

  // ─── PLU editing ──────────────────────────────────

  addPlu: (params) => {
    const { fileDoc, pluRecords } = get();
    if (!fileDoc) return { success: false, error: 'No file loaded' };

    // Check for duplicate ID
    if (pluRecords.some(p => p.id === params.id)) {
      return { success: false, error: `PLU ID ${params.id} already exists` };
    }

    const pluSection = fileDoc.sections.find(s => s.name === 'PLU');
    if (!pluSection) return { success: false, error: 'No PLU section in file' };

    // Create and append the new row
    const newRow = createPluRow(params);
    pluSection.rows.push(newRow);

    // Refresh parsed records
    const updatedRecords = extractPluRecords(fileDoc);
    set({ pluRecords: updatedRecords });

    return { success: true };
  },

  deletePlu: (pluId) => {
    const { fileDoc } = get();
    if (!fileDoc) return;

    const pluSection = fileDoc.sections.find(s => s.name === 'PLU');
    if (!pluSection) return;

    const idx = pluSection.rows.findIndex(r => r.fields[PLU_FIELDS.ID] === pluId.toString());
    if (idx === -1) return;

    pluSection.rows.splice(idx, 1);

    const pluRecords = extractPluRecords(fileDoc);
    set({ pluRecords });
  },

  updatePluField: (pluId, field, value) => {
    const { fileDoc } = get();
    if (!fileDoc) return;

    const pluSection = fileDoc.sections.find(s => s.name === 'PLU');
    if (!pluSection) return;

    const row = pluSection.rows.find(r => r.fields[PLU_FIELDS.ID] === pluId.toString());
    if (!row) return;

    const fieldIndexMap: Record<string, number> = {
      name: PLU_FIELDS.NAME,
      price: PLU_FIELDS.PRICE,
      unitType: PLU_FIELDS.UNIT_TYPE,
      department: PLU_FIELDS.DEPARTMENT,
    };

    const fieldIndex = fieldIndexMap[field];
    if (fieldIndex === undefined) return;

    updateRowField(row, fieldIndex, value.toString());

    // Refresh parsed records
    const pluRecords = extractPluRecords(fileDoc);
    set({ pluRecords });
  },

  // ─── Keyboard mapping ────────────────────────────

  setActiveLayer: (layer) => set({ activeLayer: layer }),

  selectKey: (keyIndex) => set({ selectedKeyIndex: keyIndex }),

  assignPluToKey: (layer, keyIndex, pluId) => {
    const { fileDoc } = get();
    if (!fileDoc) return;

    const scpSection = fileDoc.sections.find(s => s.name === 'SCP');
    if (!scpSection) return;

    // Find the SCP row for this layer+keyIndex
    const row = scpSection.rows.find(r =>
      r.fields[SCP_FIELDS.LAYER] === layer.toString() &&
      r.fields[SCP_FIELDS.KEY_INDEX] === keyIndex.toString()
    );

    if (!row) return;

    updateRowField(row, SCP_FIELDS.PLU_ID, pluId.toString());

    // Refresh SCP entries
    const scpEntries = extractScpEntries(fileDoc);
    set({ scpEntries });
  },

  clearKey: (layer, keyIndex) => {
    get().assignPluToKey(layer, keyIndex, 0);
  },

  // ─── Navigation ──────────────────────────────────

  setScreen: (screen) => set({ currentScreen: screen }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setPluSearchQuery: (query) => set({ pluSearchQuery: query }),

  // ─── Helpers ─────────────────────────────────────

  getKeyMapping: (layer, keyIndex) => {
    return get().scpEntries.find(e => e.layer === layer && e.keyIndex === keyIndex);
  },

  getPluById: (id) => {
    return get().pluRecords.find(p => p.id === id);
  },

  isDirty: () => {
    const { fileDoc } = get();
    if (!fileDoc) return false;
    return fileDoc.sections.some(s => s.rows.some(r => r.dirty));
  },
}));
