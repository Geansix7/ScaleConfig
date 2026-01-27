import { create } from 'zustand';
import type { FileDoc, PluRecord, ScpEntry, DptRecord, LayerId, ScreenId } from '../parser/types';
import { parseFile, extractPluRecords, extractScpEntries, extractDptRecords } from '../parser/parser';
import { writeFile, updateRowField, createPluRow } from '../parser/writer';
import type { NewPluParams } from '../parser/writer';
import { PLU_FIELDS, SCP_FIELDS } from '../parser/fieldMap';

const STORAGE_KEY = 'scaleconfig:last-session';

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function loadPersistedFile(): { fileName: string; bytes: Uint8Array } | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { fileName: string; data: string };
    if (!parsed?.data) return null;
    const bytes = base64ToBytes(parsed.data);
    return { fileName: parsed.fileName || 'restored.TMS', bytes };
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function persistFile(fileName: string, bytes: Uint8Array): void {
  if (!canUseStorage()) return;
  try {
    const data = bytesToBase64(bytes);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ fileName, data }));
  } catch {
    // Ignore storage errors (quota, private mode, etc.)
  }
}

function persistDoc(fileDoc: FileDoc | null, fileName: string): void {
  if (!fileDoc) return;
  const bytes = writeFile(fileDoc);
  persistFile(fileName || 'output.TMS', bytes);
}

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
  clearLocalData: () => void;

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

const persisted = loadPersistedFile();
const persistedState = (() => {
  if (!persisted) return null;
  try {
    const buffer = toArrayBuffer(persisted.bytes);
    const doc = parseFile(buffer);
    return {
      fileDoc: doc,
      fileName: persisted.fileName,
      originalBytes: new Uint8Array(buffer),
      pluRecords: extractPluRecords(doc),
      scpEntries: extractScpEntries(doc),
      dptRecords: extractDptRecords(doc),
      currentScreen: 'keyboard' as ScreenId,
    };
  } catch {
    return null;
  }
})();

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  fileDoc: persistedState?.fileDoc ?? null,
  fileName: persistedState?.fileName ?? '',
  originalBytes: persistedState?.originalBytes ?? null,
  pluRecords: persistedState?.pluRecords ?? [],
  scpEntries: persistedState?.scpEntries ?? [],
  dptRecords: persistedState?.dptRecords ?? [],
  activeLayer: 0,
  selectedKeyIndex: null,
  currentScreen: persistedState?.currentScreen ?? 'dashboard',
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
    persistFile(fileName, bytes);
  },

  exportFile: () => {
    const { fileDoc } = get();
    if (!fileDoc) return null;
    return writeFile(fileDoc);
  },

  clearLocalData: () => {
    if (canUseStorage()) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    set({
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
    });
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
    persistDoc(fileDoc, get().fileName);

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
    persistDoc(fileDoc, get().fileName);
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
    persistDoc(fileDoc, get().fileName);
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
    persistDoc(fileDoc, get().fileName);
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
