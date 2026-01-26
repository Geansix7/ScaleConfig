import { useStore } from '../../store/useStore';
import type { LayerId } from '../../parser/types';
import { LAYER_NAMES, LAYER_COLORS } from '../../parser/types';

const LAYERS: LayerId[] = [0, 1, 2];

export function LayerSwitcher() {
  const activeLayer = useStore(s => s.activeLayer);
  const setActiveLayer = useStore(s => s.setActiveLayer);

  return (
    <div className="flex gap-1">
      {LAYERS.map(layer => {
        const isActive = activeLayer === layer;
        const color = LAYER_COLORS[layer];
        return (
          <button
            key={layer}
            onClick={() => setActiveLayer(layer)}
            className={`
              px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 cursor-pointer
              ${isActive
                ? 'text-white shadow-md'
                : 'bg-white border border-warm-200 text-warm-600 hover:border-warm-400'
              }
            `}
            style={isActive ? { backgroundColor: color } : undefined}
          >
            <span className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: isActive ? 'white' : color }}
              />
              {LAYER_NAMES[layer]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
