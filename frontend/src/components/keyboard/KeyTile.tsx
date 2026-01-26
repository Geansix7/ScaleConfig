import { useStore } from '../../store/useStore';
import { LAYER_COLORS } from '../../parser/types';

interface KeyTileProps {
  keyIndex: number;
}

export function KeyTile({ keyIndex }: KeyTileProps) {
  const activeLayer = useStore(s => s.activeLayer);
  const selectedKeyIndex = useStore(s => s.selectedKeyIndex);
  const selectKey = useStore(s => s.selectKey);
  const getKeyMapping = useStore(s => s.getKeyMapping);
  const getPluById = useStore(s => s.getPluById);

  const mapping = getKeyMapping(activeLayer, keyIndex);
  const plu = mapping && mapping.pluId > 0 ? getPluById(mapping.pluId) : null;
  const isSelected = selectedKeyIndex === keyIndex;
  const isEmpty = !plu;
  const layerColor = LAYER_COLORS[activeLayer];

  const unitLabel = plu ? (plu.unitType === 2 ? 'pcs' : 'kg') : '';

  function formatPrice(price: string): string {
    if (!price || price === '0,0') return '';
    // Convert "600,0" to display format
    const parts = price.split(',');
    if (parts.length === 2) {
      const whole = parts[0];
      const dec = parts[1];
      if (dec === '0') return `Rs ${whole}`;
      return `Rs ${whole}.${dec}`;
    }
    return `Rs ${price}`;
  }

  return (
    <button
      onClick={() => selectKey(isSelected ? null : keyIndex)}
      className={`
        relative rounded-lg border text-left p-2 transition-all duration-150
        flex flex-col justify-between min-h-[90px] cursor-pointer
        ${isEmpty
          ? 'border-dashed border-warm-300 bg-warm-100/50 hover:border-warm-400'
          : 'border-warm-200 bg-white hover:shadow-md hover:border-warm-300'
        }
        ${isSelected ? 'ring-2 shadow-lg' : ''}
      `}
      style={{
        borderTopWidth: '3px',
        borderTopColor: isEmpty ? undefined : layerColor,
        ...(isSelected ? { '--tw-ring-color': layerColor } as React.CSSProperties : {}),
      }}
    >
      {isEmpty ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-warm-400 text-xs">Empty</span>
        </div>
      ) : (
        <>
          {/* Top: PLU ID + unit badge */}
          <div className="flex justify-between items-start mb-1">
            <span className="text-[10px] text-warm-400 font-mono">{plu.id}</span>
            {unitLabel && (
              <span className={`
                text-[9px] font-bold px-1.5 py-0.5 rounded
                ${plu.unitType === 2
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-green-50 text-green-700'
                }
              `}>
                {unitLabel}
              </span>
            )}
          </div>

          {/* Middle: Name (max 2 lines) */}
          <div className="flex-1 flex items-center">
            <span className="text-xs font-semibold text-warm-900 line-clamp-2 leading-tight">
              {plu.name || '(no name)'}
            </span>
          </div>

          {/* Bottom: Price */}
          {formatPrice(plu.price) && (
            <div className="text-right mt-1">
              <span className="text-[11px] font-semibold text-warm-700">
                {formatPrice(plu.price)}
              </span>
            </div>
          )}
        </>
      )}
    </button>
  );
}
