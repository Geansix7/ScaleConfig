import { Upload, Download } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useStore } from '../../store/useStore';
import { DashboardScreen } from '../../screens/DashboardScreen';
import { KeyboardScreen } from '../../screens/KeyboardScreen';
import { PluScreen } from '../../screens/PluScreen';

export function AppShell() {
  const currentScreen = useStore(s => s.currentScreen);
  const fileName = useStore(s => s.fileName);
  const fileDoc = useStore(s => s.fileDoc);
  const isDirty = useStore(s => s.isDirty);
  const loadFile = useStore(s => s.loadFile);
  const exportFile = useStore(s => s.exportFile);

  function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.TMS,.tms';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const buffer = await file.arrayBuffer();
      loadFile(buffer, file.name);
    };
    input.click();
  }

  function handleExport() {
    const bytes = exportFile();
    if (!bytes) return;
    const safeBytes = new Uint8Array(bytes);
    const blob = new Blob([safeBytes], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'output.TMS';
    a.click();
    URL.revokeObjectURL(url);
  }

  const dirty = isDirty();

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-12 bg-white border-b border-warm-200 flex items-center px-4 shrink-0 justify-between">
          <div className="flex items-center">
            <h1 className="text-sm font-semibold text-warm-800">ScaleConfig</h1>
            {fileName && (
              <span className="ml-3 text-xs text-warm-500">
                {fileName}
                {dirty && <span className="ml-1 text-layer-red font-bold">*</span>}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleImport}
              className="px-3 py-1.5 text-xs border border-warm-200 rounded-md text-warm-600 hover:bg-warm-100 cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <Upload size={13} />
              Import
            </button>
            <button
              onClick={handleExport}
              disabled={!fileDoc}
              className={`px-3 py-1.5 text-xs rounded-md flex items-center gap-1.5 transition-colors cursor-pointer
                ${dirty
                  ? 'bg-layer-gold text-white hover:bg-amber-600 font-semibold shadow-sm'
                  : fileDoc
                    ? 'border border-warm-200 text-warm-600 hover:bg-warm-100'
                    : 'border border-warm-200 text-warm-300 cursor-not-allowed'
                }
              `}
            >
              <Download size={13} />
              Export
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto bg-warm-50">
          {currentScreen === 'dashboard' && <DashboardScreen />}
          {currentScreen === 'keyboard' && <KeyboardScreen />}
          {currentScreen === 'plu' && <PluScreen />}
          {currentScreen === 'settings' && (
            <div className="p-6 text-warm-500 text-sm">Settings (coming soon)</div>
          )}
        </main>
      </div>
    </div>
  );
}
