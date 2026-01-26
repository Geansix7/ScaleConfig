import { X, Search, Trash2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { LAYER_NAMES, LAYER_COLORS } from '../../parser/types';

export function KeyDetailPanel() {
  const selectedKeyIndex = useStore(s => s.selectedKeyIndex);
  const activeLayer = useStore(s => s.activeLayer);
  const selectKey = useStore(s => s.selectKey);
  const getKeyMapping = useStore(s => s.getKeyMapping);
  const getPluById = useStore(s => s.getPluById);
  const pluRecords = useStore(s => s.pluRecords);
  const assignPluToKey = useStore(s => s.assignPluToKey);
  const clearKey = useStore(s => s.clearKey);

  const [searchText, setSearchText] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  // All hooks MUST be called before any conditional returns
  const filteredPlus = useMemo(() => {
    if (!searchText.trim()) return pluRecords;
    const q = searchText.toLowerCase();
    return pluRecords.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.id.toString().includes(q) ||
      p.shortCode.toLowerCase().includes(q)
    );
  }, [pluRecords, searchText]);

  if (selectedKeyIndex === null) {
    return (
      <div className="w-80 bg-white border-l border-warm-200 p-6 flex items-center justify-center">
        <p className="text-sm text-warm-400 text-center">
          Click a key to view details and reassign
        </p>
      </div>
    );
  }

  const mapping = getKeyMapping(activeLayer, selectedKeyIndex);
  const plu = mapping && mapping.pluId > 0 ? getPluById(mapping.pluId) : null;
  const layerColor = LAYER_COLORS[activeLayer];

  function handleAssign(pluId: number) {
    assignPluToKey(activeLayer, selectedKeyIndex!, pluId);
    setShowPicker(false);
    setSearchText('');
  }

  function handleClear() {
    clearKey(activeLayer, selectedKeyIndex!);
  }

  const row = Math.ceil(selectedKeyIndex / 10);
  const col = ((selectedKeyIndex - 1) % 10) + 1;

  return (
    <div className="w-80 bg-white border-l border-warm-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-warm-200 flex items-center justify-between">
        <div>
          <div className="text-xs text-warm-400">
            Key {selectedKeyIndex} (R{row} C{col})
          </div>
          <div className="text-sm font-semibold flex items-center gap-2 mt-0.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: layerColor }}
            />
            {LAYER_NAMES[activeLayer]}
          </div>
        </div>
        <button
          onClick={() => selectKey(null)}
          className="p-1.5 rounded hover:bg-warm-100 text-warm-400 cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Current assignment */}
      <div className="p-4 border-b border-warm-100">
        {plu ? (
          <div className="space-y-2">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-warm-400 mb-1">Assigned PLU</div>
              <div className="text-lg font-bold text-warm-900">{plu.name || '(no name)'}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-warm-400">ID:</span>
                <span className="ml-1 font-mono text-warm-700">{plu.id}</span>
              </div>
              <div>
                <span className="text-warm-400">Unit:</span>
                <span className={`ml-1 font-semibold ${plu.unitType === 2 ? 'text-blue-600' : 'text-green-700'}`}>
                  {plu.unitType === 2 ? 'pcs' : 'kg'}
                </span>
              </div>
              <div>
                <span className="text-warm-400">Price:</span>
                <span className="ml-1 font-semibold text-warm-800">{plu.price}</span>
              </div>
              <div>
                <span className="text-warm-400">Dept:</span>
                <span className="ml-1 text-warm-700">{plu.department}</span>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setShowPicker(true)}
                className="flex-1 text-xs px-3 py-1.5 bg-warm-900 text-white rounded-md hover:bg-warm-800 cursor-pointer font-medium"
              >
                Change PLU
              </button>
              <button
                onClick={handleClear}
                className="px-3 py-1.5 text-layer-red border border-red-200 rounded-md hover:bg-red-50 cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-warm-400 mb-3">No PLU assigned</p>
            <button
              onClick={() => setShowPicker(true)}
              className="text-xs px-4 py-2 bg-layer-gold text-white rounded-md hover:bg-amber-600 cursor-pointer font-medium"
            >
              Assign PLU
            </button>
          </div>
        )}
      </div>

      {/* PLU Picker */}
      {showPicker && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-3 border-b border-warm-100">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-warm-400" />
              <input
                type="text"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                placeholder="Search PLU name or ID..."
                className="w-full pl-8 pr-3 py-2 text-xs border border-warm-200 rounded-md focus:outline-none focus:border-layer-gold"
                autoFocus
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto p-2">
            {filteredPlus.map(p => (
              <button
                key={p.id}
                onClick={() => handleAssign(p.id)}
                className={`
                  w-full text-left px-3 py-2 rounded-md text-xs transition-colors cursor-pointer
                  hover:bg-warm-100
                  ${plu && plu.id === p.id ? 'bg-warm-100 border border-warm-300' : ''}
                `}
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-warm-900 truncate">{p.name || `PLU ${p.id}`}</span>
                  <span className="text-warm-400 font-mono ml-2 shrink-0">{p.id}</span>
                </div>
                <div className="flex gap-3 mt-0.5 text-warm-500">
                  <span>{p.price}</span>
                  <span className={p.unitType === 2 ? 'text-blue-500' : 'text-green-600'}>
                    {p.unitType === 2 ? 'pcs' : 'kg'}
                  </span>
                </div>
              </button>
            ))}
            {filteredPlus.length === 0 && (
              <p className="text-xs text-warm-400 text-center py-4">No results</p>
            )}
          </div>
          <div className="p-2 border-t border-warm-100">
            <button
              onClick={() => { setShowPicker(false); setSearchText(''); }}
              className="w-full text-xs py-1.5 text-warm-500 hover:text-warm-700 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
