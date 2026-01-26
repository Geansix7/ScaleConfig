import { useState } from 'react';
import { Search, X, Save, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { PluRecord } from '../parser/types';

export function PluScreen() {
  const pluRecords = useStore(s => s.pluRecords);
  const updatePluField = useStore(s => s.updatePluField);
  const addPlu = useStore(s => s.addPlu);
  const deletePlu = useStore(s => s.deletePlu);
  const fileDoc = useStore(s => s.fileDoc);

  const [search, setSearch] = useState('');
  const [editingPlu, setEditingPlu] = useState<PluRecord | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  if (!fileDoc) {
    return (
      <div className="p-6 text-warm-500 text-sm">
        Load a .TMS file first to manage PLU items.
      </div>
    );
  }

  const filtered = search.trim()
    ? pluRecords.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toString().includes(search) ||
        p.shortCode.toLowerCase().includes(search.toLowerCase())
      )
    : pluRecords;

  // Find the next available low ID for numeric keyboard access
  function getNextAvailableId(): number {
    const usedIds = new Set(pluRecords.map(p => p.id));
    let id = 1;
    while (usedIds.has(id)) id++;
    return id;
  }

  function handleDelete(pluId: number) {
    if (confirm(`Delete PLU ${pluId}? This cannot be undone.`)) {
      deletePlu(pluId);
      setEditingPlu(null);
    }
  }

  return (
    <div className="flex h-full">
      {/* Table */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-4 border-b border-warm-200 bg-white">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-warm-900">PLU Manager</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-warm-400">{filtered.length} items</span>
              <button
                onClick={() => { setShowNewForm(true); setEditingPlu(null); }}
                className="px-3 py-1.5 text-xs bg-layer-gold text-white rounded-md hover:bg-amber-600 cursor-pointer flex items-center gap-1.5 font-medium transition-colors"
              >
                <Plus size={13} />
                New PLU
              </button>
            </div>
          </div>
          <div className="relative mt-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, ID, or short code..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-warm-200 rounded-lg focus:outline-none focus:border-layer-gold"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-warm-100 border-b border-warm-200">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-semibold text-warm-500">ID</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-warm-500">Name</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-warm-500">Price</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-warm-500">Unit</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-warm-500">Dept</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(plu => (
                <tr
                  key={plu.id}
                  onClick={() => { setEditingPlu(plu); setShowNewForm(false); }}
                  className={`
                    border-b border-warm-100 hover:bg-warm-50 cursor-pointer transition-colors
                    ${editingPlu?.id === plu.id ? 'bg-amber-50' : ''}
                  `}
                >
                  <td className="px-4 py-2.5 font-mono text-warm-500 text-xs">{plu.id}</td>
                  <td className="px-4 py-2.5 font-medium text-warm-900">{plu.name || '(no name)'}</td>
                  <td className="px-4 py-2.5 text-warm-700">{plu.price}</td>
                  <td className="px-4 py-2.5">
                    <span className={`
                      text-xs font-semibold px-2 py-0.5 rounded
                      ${plu.unitType === 2
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-green-50 text-green-700'
                      }
                    `}>
                      {plu.unitType === 2 ? 'pcs' : 'kg'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-warm-500">{plu.department}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New PLU panel */}
      {showNewForm && (
        <NewPluPanel
          suggestedId={getNextAvailableId()}
          onClose={() => setShowNewForm(false)}
          onCreate={(params) => {
            const result = addPlu(params);
            if (result.success) {
              setShowNewForm(false);
            } else {
              alert(result.error);
            }
          }}
        />
      )}

      {/* Edit panel */}
      {editingPlu && !showNewForm && (
        <PluEditPanel
          plu={editingPlu}
          onClose={() => setEditingPlu(null)}
          onDelete={() => handleDelete(editingPlu.id)}
          onSave={(field, value) => {
            updatePluField(editingPlu.id, field, value);
            const updated = useStore.getState().pluRecords.find(p => p.id === editingPlu.id);
            if (updated) setEditingPlu(updated);
          }}
        />
      )}
    </div>
  );
}

// ─── New PLU Panel ────────────────────────────────────

interface NewPluPanelProps {
  suggestedId: number;
  onClose: () => void;
  onCreate: (params: { id: number; name: string; price: string; unitType: number; department: number }) => void;
}

function NewPluPanel({ suggestedId, onClose, onCreate }: NewPluPanelProps) {
  const [id, setId] = useState(suggestedId.toString());
  const [name, setName] = useState('');
  const [price, setPrice] = useState('0,0');
  const [unitType, setUnitType] = useState(1);
  const [department, setDepartment] = useState('9');

  const priceValid = /^\d+,\d+$/.test(price);
  const idValid = /^\d+$/.test(id) && parseInt(id) > 0;
  const canCreate = priceValid && idValid && name.trim().length > 0;

  function handleCreate() {
    if (!canCreate) return;
    onCreate({
      id: parseInt(id),
      name: name.trim(),
      price,
      unitType,
      department: parseInt(department) || 9,
    });
  }

  return (
    <div className="w-72 bg-white border-l border-warm-200 flex flex-col">
      <div className="p-4 border-b border-warm-200 flex items-center justify-between">
        <div>
          <div className="text-xs text-layer-gold font-semibold">New Item</div>
          <div className="text-sm font-bold text-warm-900 mt-0.5">Add PLU</div>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-warm-100 text-warm-400 cursor-pointer">
          <X size={16} />
        </button>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-auto">
        {/* ID */}
        <div>
          <label className="text-xs font-semibold text-warm-500 block mb-1">
            PLU ID <span className="font-normal text-warm-400">(numeric keypad access)</span>
          </label>
          <input
            type="text"
            value={id}
            onChange={e => setId(e.target.value)}
            className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none font-mono ${
              idValid ? 'border-warm-200 focus:border-layer-gold' : 'border-red-300 bg-red-50'
            }`}
            autoFocus
          />
          <p className="text-[10px] text-warm-400 mt-1">
            Type this number on the scale keypad to recall the item
          </p>
        </div>

        {/* Name */}
        <div>
          <label className="text-xs font-semibold text-warm-500 block mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. කුකුළල"
            className="w-full px-3 py-2 text-sm border border-warm-200 rounded-md focus:outline-none focus:border-layer-gold"
          />
        </div>

        {/* Price */}
        <div>
          <label className="text-xs font-semibold text-warm-500 block mb-1">
            Price <span className="font-normal text-warm-400">(comma decimal: 600,0)</span>
          </label>
          <input
            type="text"
            value={price}
            onChange={e => setPrice(e.target.value)}
            className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none ${
              priceValid ? 'border-warm-200 focus:border-layer-gold' : 'border-red-300 bg-red-50'
            }`}
          />
          {!priceValid && (
            <p className="text-[10px] text-red-500 mt-1">Format: digits,digits (e.g. 280,0)</p>
          )}
        </div>

        {/* Unit Type */}
        <div>
          <label className="text-xs font-semibold text-warm-500 block mb-1">Unit Type</label>
          <div className="flex gap-2">
            <button
              onClick={() => setUnitType(1)}
              className={`flex-1 py-2 text-xs font-semibold rounded-md border cursor-pointer transition-colors ${
                unitType === 1
                  ? 'bg-green-50 border-green-300 text-green-700'
                  : 'border-warm-200 text-warm-500 hover:border-warm-400'
              }`}
            >
              kg (weight)
            </button>
            <button
              onClick={() => setUnitType(2)}
              className={`flex-1 py-2 text-xs font-semibold rounded-md border cursor-pointer transition-colors ${
                unitType === 2
                  ? 'bg-blue-50 border-blue-300 text-blue-600'
                  : 'border-warm-200 text-warm-500 hover:border-warm-400'
              }`}
            >
              pcs (count)
            </button>
          </div>
        </div>

        {/* Department */}
        <div>
          <label className="text-xs font-semibold text-warm-500 block mb-1">Department</label>
          <input
            type="number"
            value={department}
            onChange={e => setDepartment(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-warm-200 rounded-md focus:outline-none focus:border-layer-gold"
          />
        </div>
      </div>

      <div className="p-4 border-t border-warm-200">
        <button
          onClick={handleCreate}
          disabled={!canCreate}
          className="w-full py-2.5 bg-layer-gold text-white text-sm font-semibold rounded-md hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={14} />
          Create PLU
        </button>
      </div>
    </div>
  );
}

// ─── Edit PLU Panel ───────────────────────────────────

interface PluEditPanelProps {
  plu: PluRecord;
  onClose: () => void;
  onDelete: () => void;
  onSave: (field: 'name' | 'price' | 'unitType' | 'department', value: string | number) => void;
}

function PluEditPanel({ plu, onClose, onDelete, onSave }: PluEditPanelProps) {
  const [name, setName] = useState(plu.name);
  const [price, setPrice] = useState(plu.price);
  const [unitType, setUnitType] = useState(plu.unitType);
  const [department, setDepartment] = useState(plu.department.toString());

  function handleSave() {
    if (name !== plu.name) onSave('name', name);
    if (price !== plu.price) onSave('price', price);
    if (unitType !== plu.unitType) onSave('unitType', unitType);
    if (department !== plu.department.toString()) onSave('department', parseInt(department) || 0);
  }

  const priceValid = /^\d+,\d+$/.test(price);

  return (
    <div className="w-72 bg-white border-l border-warm-200 flex flex-col">
      <div className="p-4 border-b border-warm-200 flex items-center justify-between">
        <div>
          <div className="text-xs text-warm-400">PLU {plu.id}</div>
          <div className="text-sm font-bold text-warm-900 mt-0.5">Edit Item</div>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-warm-100 text-warm-400 cursor-pointer">
          <X size={16} />
        </button>
      </div>

      <div className="p-4 space-y-4 flex-1">
        {/* Name */}
        <div>
          <label className="text-xs font-semibold text-warm-500 block mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-warm-200 rounded-md focus:outline-none focus:border-layer-gold"
          />
        </div>

        {/* Price */}
        <div>
          <label className="text-xs font-semibold text-warm-500 block mb-1">
            Price <span className="font-normal text-warm-400">(comma decimal: 600,0)</span>
          </label>
          <input
            type="text"
            value={price}
            onChange={e => setPrice(e.target.value)}
            className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none ${
              priceValid ? 'border-warm-200 focus:border-layer-gold' : 'border-red-300 bg-red-50'
            }`}
          />
          {!priceValid && (
            <p className="text-[10px] text-red-500 mt-1">Format: digits,digits (e.g. 600,0)</p>
          )}
        </div>

        {/* Unit Type */}
        <div>
          <label className="text-xs font-semibold text-warm-500 block mb-1">Unit Type</label>
          <div className="flex gap-2">
            <button
              onClick={() => setUnitType(1)}
              className={`flex-1 py-2 text-xs font-semibold rounded-md border cursor-pointer transition-colors ${
                unitType === 1
                  ? 'bg-green-50 border-green-300 text-green-700'
                  : 'border-warm-200 text-warm-500 hover:border-warm-400'
              }`}
            >
              kg (weight)
            </button>
            <button
              onClick={() => setUnitType(2)}
              className={`flex-1 py-2 text-xs font-semibold rounded-md border cursor-pointer transition-colors ${
                unitType === 2
                  ? 'bg-blue-50 border-blue-300 text-blue-600'
                  : 'border-warm-200 text-warm-500 hover:border-warm-400'
              }`}
            >
              pcs (count)
            </button>
          </div>
        </div>

        {/* Department */}
        <div>
          <label className="text-xs font-semibold text-warm-500 block mb-1">Department</label>
          <input
            type="number"
            value={department}
            onChange={e => setDepartment(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-warm-200 rounded-md focus:outline-none focus:border-layer-gold"
          />
        </div>

        {/* Short code (read-only info) */}
        {plu.shortCode && (
          <div>
            <label className="text-xs font-semibold text-warm-500 block mb-1">Short Code</label>
            <div className="text-sm text-warm-700 font-mono">{plu.shortCode}</div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-warm-200 space-y-2">
        <button
          onClick={handleSave}
          disabled={!priceValid}
          className="w-full py-2 bg-warm-900 text-white text-sm font-medium rounded-md hover:bg-warm-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
        >
          <Save size={14} />
          Save Changes
        </button>
        <button
          onClick={onDelete}
          className="w-full py-2 text-sm font-medium text-red-500 border border-red-200 rounded-md hover:bg-red-50 cursor-pointer flex items-center justify-center gap-2 transition-colors"
        >
          <Trash2 size={14} />
          Delete PLU
        </button>
      </div>
    </div>
  );
}
