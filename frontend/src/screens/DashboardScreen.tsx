import { Upload, Keyboard, List, Download } from 'lucide-react';
import { useStore } from '../store/useStore';

export function DashboardScreen() {
  const fileName = useStore(s => s.fileName);
  const fileDoc = useStore(s => s.fileDoc);
  const pluRecords = useStore(s => s.pluRecords);
  const scpEntries = useStore(s => s.scpEntries);
  const setScreen = useStore(s => s.setScreen);
  const loadFile = useStore(s => s.loadFile);
  const exportFile = useStore(s => s.exportFile);
  const isDirty = useStore(s => s.isDirty);

  const assignedKeys = scpEntries.filter(e => e.pluId > 0 && e.keyIndex <= 40).length;

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
    const blob = new Blob([bytes], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'output.TMS';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 max-w-3xl">
      <h2 className="text-2xl font-bold text-warm-900 mb-6">Dashboard</h2>

      {!fileDoc ? (
        <div className="border-2 border-dashed border-warm-300 rounded-xl p-12 text-center">
          <Upload size={40} className="mx-auto text-warm-400 mb-3" />
          <p className="text-warm-600 mb-4">Import a .TMS file to get started</p>
          <button
            onClick={handleImport}
            className="px-5 py-2.5 bg-layer-gold text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors cursor-pointer"
          >
            Import .TMS File
          </button>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-warm-200 p-4">
              <div className="text-2xl font-bold text-warm-900">{pluRecords.length}</div>
              <div className="text-xs text-warm-500 mt-1">PLU Items</div>
            </div>
            <div className="bg-white rounded-lg border border-warm-200 p-4">
              <div className="text-2xl font-bold text-warm-900">{assignedKeys}</div>
              <div className="text-xs text-warm-500 mt-1">Assigned Keys</div>
            </div>
            <div className="bg-white rounded-lg border border-warm-200 p-4">
              <div className="text-2xl font-bold text-warm-900">{fileDoc.sections.length}</div>
              <div className="text-xs text-warm-500 mt-1">Sections</div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setScreen('keyboard')}
              className="flex items-center gap-2 px-4 py-2 bg-warm-900 text-white rounded-lg hover:bg-warm-800 transition-colors cursor-pointer"
            >
              <Keyboard size={16} />
              <span className="text-sm font-medium">Keyboard</span>
            </button>
            <button
              onClick={() => setScreen('plu')}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-warm-300 text-warm-800 rounded-lg hover:bg-warm-100 transition-colors cursor-pointer"
            >
              <List size={16} />
              <span className="text-sm font-medium">PLU Manager</span>
            </button>
            <button
              onClick={handleImport}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-warm-300 text-warm-800 rounded-lg hover:bg-warm-100 transition-colors cursor-pointer"
            >
              <Upload size={16} />
              <span className="text-sm font-medium">Re-import</span>
            </button>
            {isDirty() && (
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-layer-gold text-white rounded-lg hover:bg-amber-600 transition-colors cursor-pointer"
              >
                <Download size={16} />
                <span className="text-sm font-medium">Export</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
