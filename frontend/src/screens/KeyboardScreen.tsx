import { Upload, Download } from 'lucide-react';
import { useStore } from '../store/useStore';
import { LayerSwitcher } from '../components/keyboard/LayerSwitcher';
import { KeyboardGrid } from '../components/keyboard/KeyboardGrid';
import { KeyDetailPanel } from '../components/keyboard/KeyDetailPanel';

export function KeyboardScreen() {
  const fileDoc = useStore(s => s.fileDoc);
  const loadFile = useStore(s => s.loadFile);
  const exportFile = useStore(s => s.exportFile);
  const fileName = useStore(s => s.fileName);
  const isDirty = useStore(s => s.isDirty);

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

  if (!fileDoc) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-warm-500 mb-4">Load a .TMS file to view the keyboard layout</p>
          <button
            onClick={handleImport}
            className="px-5 py-2.5 bg-layer-gold text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors cursor-pointer inline-flex items-center gap-2"
          >
            <Upload size={16} />
            Import .TMS File
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main keyboard area */}
      <div className="flex-1 p-4 flex flex-col min-w-0">
        {/* Top bar: layer switcher + export */}
        <div className="flex items-center justify-between mb-4">
          <LayerSwitcher />
          <div className="flex gap-2">
            <button
              onClick={handleImport}
              className="px-3 py-1.5 text-xs border border-warm-200 rounded-md text-warm-600 hover:bg-warm-100 cursor-pointer flex items-center gap-1.5"
            >
              <Upload size={12} />
              Import
            </button>
            {isDirty() && (
              <button
                onClick={handleExport}
                className="px-3 py-1.5 text-xs bg-layer-gold text-white rounded-md hover:bg-amber-600 cursor-pointer flex items-center gap-1.5 font-medium"
              >
                <Download size={12} />
                Export
              </button>
            )}
          </div>
        </div>

        {/* Keyboard grid */}
        <div className="flex-1">
          <KeyboardGrid />
        </div>
      </div>

      {/* Right side panel */}
      <KeyDetailPanel />
    </div>
  );
}
