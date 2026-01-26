import { LayoutGrid, Keyboard, List, Settings } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { ScreenId } from '../../parser/types';

const NAV_ITEMS: { id: ScreenId; icon: typeof LayoutGrid; label: string }[] = [
  { id: 'dashboard', icon: LayoutGrid, label: 'Home' },
  { id: 'keyboard', icon: Keyboard, label: 'Keys' },
  { id: 'plu', icon: List, label: 'PLUs' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const currentScreen = useStore(s => s.currentScreen);
  const setScreen = useStore(s => s.setScreen);

  return (
    <aside className="w-16 bg-warm-900 flex flex-col items-center py-4 gap-1">
      <div className="text-layer-gold font-bold text-xs mb-4 tracking-wider">SC</div>
      {NAV_ITEMS.map(item => {
        const isActive = currentScreen === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setScreen(item.id)}
            className={`
              w-12 h-12 rounded-lg flex flex-col items-center justify-center gap-0.5
              transition-all duration-150 cursor-pointer
              ${isActive
                ? 'bg-warm-700 text-layer-gold'
                : 'text-warm-400 hover:text-warm-200 hover:bg-warm-800'
              }
            `}
            title={item.label}
          >
            <item.icon size={20} />
            <span className="text-[9px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </aside>
  );
}
