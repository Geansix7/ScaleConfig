# Scale Config Web App Plan (Complete)

## 0) Product Principles
- Lossless edits: the .TMS file must round-trip byte-for-byte when no changes are made.
- Safe edits: always create backups and show a change preview.
- Fast workflow: 10x4 keyboard UI first-class; 2-3 clicks to change a key.
- Clean UI: minimal chrome, bold typography, strong hierarchy.
- Offline-first: local-only, no external uploads.

## 1) Core User Tasks
- Import a .TMS file and see PLUs immediately.
- Assign any PLU to any key in a 10x4 layout, across 3 layers per key.
- Edit PLU name, price, unit type (kg vs pcs), and class/department.
- Bulk update prices, rename, and duplicate items.
- Export updated .TMS with backups and a diff preview.

## 2) Recommended Architecture (Local-Only)
### Option A (Best for browser):
- Frontend-only app using the File System Access API.
- Pros: no server, easiest install.
- Cons: limited to Chromium-based browsers.

### Option B (Most reliable):
- Local backend (Node + Express) + frontend (React + Vite).
- Pros: full file access, stable, cross-browser.
- Cons: requires running a local server.

### Option C (Best UX):
- Desktop wrapper (Tauri or Electron) around Option A/B.
- Pros: native file access, easy distribution.
- Cons: packaging overhead.

**Recommended:** Option B or C for reliable file read/write.

## 3) File Format Handling (Lossless)
### 3.1 Assumptions (to verify)
- Tab-delimited lines.
- Sections with start markers and END markers.
- Decimal comma (e.g., 600,0).
- Mixed language text.

### 3.2 Requirements
- Preserve line endings (CRLF vs LF).
- Preserve tabs and trailing empty fields.
- Preserve section ordering.
- Preserve unknown sections and fields.
- Never reformat numbers unless the user edits them.

### 3.3 Data Model (Lossless Core)
- FileDoc
  - rawHeaderLine
  - lineEnding ("\n" or "\r\n")
  - sections[] (original order)
- Section
  - name
  - startLineRaw
  - rows[]
  - endLineRaw
- Row
  - rawLine
  - fields[] (split by tab, preserve empty)
  - kind (fields[0])
  - parsed (optional typed view)

### 3.4 Parsed Views (Configurable Field Map)
Use a config map to define indexes for each section:
- PLU: id, type, price, name, dept/class, etc.
- DPT, CLS, BAR, LAB, etc.

This allows you to adjust indexes without rewriting code.

### 3.5 Observed A_000.TMS Details (Read + Parsed)
**File-level**
- Line endings: CRLF (`\r\n`).
- Header: `ECS\tVER\tV3.15C5\tUTF-8`.
- Device strings (from TMT/INF): `Budry MFD-51 TM-xA V3.20E` and `TM-xA UC123 V3.20E`.
- Mixed-language text; some names render as garbled characters when decoded as UTF-8, so preserve raw bytes and allow encoding selection.

**Sections (in order)**
1. DPT
2. CLS
3. PLU
4. UNT (empty)
5. BAR
6. LAB
7. SAL (empty)
8. REP
9. SCP
10. TMS
11. TMT
12. INF
13. TIM

**Row counts**
- DPT: 9
- CLS: 10
- PLU: 143
- UNT: 0
- BAR: 9
- LAB: 1266
- SAL: 0
- REP: 11330
- SCP: 128
- TMS: 500
- TMT: 28
- INF: 3
- TIM: 1

**Record types + field counts**
- DPT: 4 fields per line (e.g., `DPT\t1\tT-Weight\t`).
- CLS: 11 fields per line (e.g., `CLS\t1\tT-Weight\t1\t0\t0\t0\t0\t0\t0\t`).
- PLU: two observed formats:
  - 69 fields (139 lines) – main format.
  - 16 fields (2 lines) – short format (e.g., PLU IDs 8009, 8010 in this file).
- BAR: 9 fields per line (e.g., `BAR\t1\tBarcode-1\t0\t0\t0\t0\tF600J500A000A000A000A000\t`).
- LAB section contains multiple record types:
  - `LAB` (40 fields)
  - `LAS` (14 fields) – layout rows
  - `LAE` (2 fields) – end marker
- REP section contains multiple record types:
  - `REP` (11 fields)
  - `RES` (19 fields)
  - `REE` (2 fields)
- SCP: 5 fields per line (e.g., `SCP\t0\t1\t9001\t`).
- TMS: 4 fields per line (e.g., `TMS\t0\t12\t`).
- TMT: 4 fields per line (e.g., `TMT\t0\t<text>\t`).
- INF section contains:
  - `INA` (10 fields)
  - `INM` (5 fields)
  - `INF` (6 fields) – contains store/device metadata
- TIM: 8 fields (single line) – appears to be date/time values.

**PLU field observations (69-field format)**
- [0] `PLU`
- [1] PLU ID (numeric)
- [2] observed constant `0`
- [3] empty (tab)
- [4] observed `1` or `2` (likely unit type: kg vs pcs) – treat as unit field.
- [5] primary price (decimal comma, e.g., `600,0`)
- [6], [7] additional price fields (often `0,0`)
- [14] observed `9` (likely dept/class; confirm)
- [15] item name (Sinhala/English/mixed)
- [64] short code/alias in some lines (e.g., `test`, `whiterice-test`)
- Trailing fields include repeated blocks with values like `0,0`, `0`, and `127`; treat as opaque until confirmed.

**Encoding note**
- File declares UTF-8, but some item names appear garbled when decoded; treat encoding as configurable and preserve raw bytes to avoid data loss.

## 4) Parser and Writer
### 4.1 Parser
1. Read file as binary.
2. Detect line ending.
3. Try UTF-8; allow manual encoding if needed.
4. Split into lines; keep raw lines.
5. Identify sections by "start" and "END" markers.
6. Store rows with raw fields.

### 4.2 Writer
1. Rebuild each line from fields or rawLine if unchanged.
2. Use original line ending.
3. Write all lines in original order.

### 4.3 Diff Preview
- Show side-by-side textual diff before export.
- Highlight only changed lines.

## 5) Validation Rules
- PLU ID: required, numeric, unique.
- Price: valid decimal comma format.
- Name length: warn beyond limit (set default 30, configurable).
- Empty names allowed but flagged.
- Unit type required (kg or pcs); warn if unknown.
- Prevent duplicate key assignments unless user confirms.

## 6) UI Design System (Clean + Attractive)
- Typography: choose a bold, distinctive font (e.g., "Space Grotesk" or "Sora").
- Color: warm neutral base with a single bold accent (no purple).
- Surfaces: subtle gradients and soft borders.
- Buttons: pill or rounded-rect, strong contrast.
- Spacing: generous padding, 8pt grid.

## 7) Screen Structure
### 7.1 Dashboard
- File status, last export, total PLUs, warnings.
- Quick actions: Import, Export, Keyboard, PLUs.

### 7.2 PLU Manager
- Search + filters (weight/count, price range, favorites).
- Table view with inline edit.
- Right-side drawer for detailed edit.
- Bulk actions: price %, set type, copy, delete.

### 7.3 Keyboard (10x4, 3 Layers)
- 40-key grid with big targets and a **Layer switch** (Layer 1/2/3).
- Each key shows: Name (2 lines), Price, Unit (kg/pcs), PLU ID for the active layer.
- Color-coded by type.
- Drag PLU onto key (drops into active layer).
- Click key to edit assignment for active layer.
- Long-press to clear or duplicate within the layer.
- Layer tools: copy layer -> layer, swap layers, clear layer.

### 7.3.1 Current Keyboard Layout Reference (Exact Structure)
Use this as the canonical layout reference when building the 10x4 keyboard grid and 3-layer labels.

| Key | Row | Col | L1 (Main) | L2 (Red) | L3 (Blue) |
| --- | --- | --- | --- | --- | --- |
| 1 | 1 | 1 | කැරට් | බීට් | නෝකෝල් |
| 2 | 1 | 2 | බොංචි | මෑ කරල් | දඹල |
| 3 | 1 | 3 | ලීක්ස් | ගෝවා | ගෝවා මල් |
| 4 | 1 | 4 | අල | බතල | මඤ්ඤොක්කා |
| 5 | 1 | 5 | බී ළූණු | රතු ළූණු | ළූණු කොළ |
| 6 | 1 | 6 | තක්කාලි | අමු මිරිස් | මාළු මිරිස් |
| 7 | 1 | 7 | දෙහි | ඉඟුරු | සුදු ළූණු |
| 8 | 1 | 8 | වට්ටක්කා | පතෝල | බටානා |
| 9 | 1 | 9 | වම්බටු | බණ්ඩක්කා | කරවිල |
| 10 | 1 | 10 | පොල් | කරපිංචා | සේර |
| 11 | 2 | 1 | මුකුණුවැන්න | කංකුන් | ගොටුකොළ |
| 12 | 2 | 2 | නිවිති | සාරණ | තම්පලා |
| 13 | 2 | 3 | කොහිල | නෙළුම් අල | ඉං අල |
| 14 | 2 | 4 | රාබු | රතු රාබු | සුදු රාබු |
| 15 | 2 | 5 | පිපිඤ්ඤා | කැකිරි | පුහුල් |
| 16 | 2 | 6 | මී කිරි | කිතුල් පැණි | බිම්මල් |
| 17 | 2 | 7 | පොලොස් | දෙල් | කොස් |
| 18 | 2 | 8 | අළු කෙසෙල් | කෙසෙල් මුව | තිබ්බටු |
| 19 | 2 | 9 | මුරුංගා | තුඹ කරවිල | වැටකොළු |
| 20 | 2 | 10 | ලංකා අල | රට අල | කිරි අල |
| 21 | 3 | 1 | සලාද කොළ | අයිස්බර්ග් | රොකට් |
| 22 | 3 | 2 | බෙල් පෙපර් රතු | බෙල් පෙපර් කහ | බෙල් පෙපර් කොළ |
| 23 | 3 | 3 | බ්‍රොකලි | රතු ගෝවා | අතුගෝවා |
| 24 | 3 | 4 | සුකිනි | සැළඩ පිපිඤ්ඤා | චෙරි තක්කාලි |
| 25 | 3 | 5 | සැල්දරි | පාස්ලි | ලීක්ස් (සුප්) |
| 26 | 3 | 6 | බටර් බොංචි | කැබිලි | ෆ්‍රෙන්ච් බීන්ස් |
| 27 | 3 | 7 | මින්චි | කොත්තමල්ලි | බැසිල් |
| 28 | 3 | 8 | සීනි බතල | මස්කෙඩක්කා | විලාඩ් |
| 29 | 3 | 9 | GH තක්කාලි | රෝමන් | ප්‍රිසි |
| 30 | 3 | 10 | වෙනත් (Kg) | වෙනත් (Pcs) | බෑග් |
| 31 | 4 | 1 | ඇම්බුන් | සීනි | පුවාළු |
| 32 | 4 | 2 | ඇඹුල් | රතඹලා | නේන්ද්‍රා |
| 33 | 4 | 3 | ගස් ලබු | කොමඩු | අන්නාසි |
| 34 | 4 | 4 | ඇපල් රතු | ඇපල් කොළ | පෙයාර්ස් |
| 35 | 4 | 5 | දොඩම් | පිටරට දොඩම් | නාරං |
| 36 | 4 | 6 | මිදි කළු | මිදි කොළ | ස්ට්‍රෝබෙරි |
| 37 | 4 | 7 | කර්ත-කොලොම්බන් | උයන අඹ | අල්පොංසො |
| 38 | 4 | 8 | අලිගැටපේර | පේර | කාමරංගා |
| 39 | 4 | 9 | පැෂන් | නෙල්ලි | අඹරැල්ලා |
| 40 | 4 | 10 | දිවුල් | ලබු (පලතුරු) | ඩ්‍රැගන් ෆෘට් |

### 7.4 Import/Export
- Import: file picker, encoding selector, preview.
- Export: choose output name, create backup, diff preview.

### 7.5 Settings
- Encoding defaults.
- Field index config.
- Label length limits.
- Backup folder path.

## 8) Keyboard Mapping Strategy
### 8.1 If mapping exists in .TMS
- Parse mapping section into a KeyMap model with 3 layers.
- Update mapping section on edits (only the active layer slot).

### 8.2 If mapping is missing
- Create sidecar JSON mapping (same filename + .keys.json) with 3 layers.
- UI uses sidecar for layout.
- Offer export once mapping is confirmed.

## 9) Component Map (Frontend)
- AppShell
- SidebarNav
- TopBar
- DashboardPanel
- PluTable
- PluEditDrawer
- KeyboardGrid
- KeyTile
- LayerSwitcher
- ImportModal
- ExportModal
- DiffViewer

## 10) Backend API (if using local server)
- GET /file/open
- POST /file/save
- POST /file/backup
- POST /file/validate
- GET /file/diff

## 11) File/Repo Structure
- /frontend
  - /components
  - /screens
  - /styles
  - /utils
- /backend
  - /parser
  - /writer
  - /api
- /tests
  - roundtrip.test.ts
  - plu_edit.test.ts

## 12) Testing Plan
- Round-trip: read -> write -> binary compare.
- PLU edit: only one line changes.
- Bulk update: correct price math with comma decimals.
- Non-ASCII: preserved after export.
- Key assignment: updates mapping only for the correct layer.
- Layer copy/swap: no cross-layer corruption.

## 13) Milestones
### Phase 1: Engine
- Parser + writer + tests.

### Phase 2: PLU Manager
- List + search + edit + bulk.

### Phase 3: Keyboard UI
- 10x4 grid + drag drop + key edit.

### Phase 4: Import/Export
- Encoding + diff + backups.

### Phase 5: Polish
- Keyboard UX refinements + performance.

## 14) Acceptance Criteria
- Zero data loss in unchanged export.
- Key assignment is 2 clicks or less on the active layer.
- PLU edit reflected in output file.
- UI works on desktop + tablet.

## 15) Open Questions (To Confirm)
- Exact keyboard mapping section name and field layout.
- Max label length for key display.
- Allowed PLU ID ranges and reserved IDs.
- Whether multiple price tiers exist.

## 16) Immediate Next Steps
1. Confirm mapping section and PLU field indexes.
2. Implement parser and round-trip test.
3. Build PLU list + edit drawer.
4. Build keyboard grid and assignment logic.
