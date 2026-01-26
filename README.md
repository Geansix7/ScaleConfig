# ScaleConfig

A modern, offline-first web tool for editing `.TMS` (Terminal Management System) files used by electronic retail scales.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![CI](https://img.shields.io/github/actions/workflow/status/VihangaDev/ScaleConfig/ci.yml?branch=main)
![Deploy](https://img.shields.io/github/actions/workflow/status/VihangaDev/ScaleConfig/deploy.yml?branch=main)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![React](https://img.shields.io/badge/React-19-61DAFB)
![Vite](https://img.shields.io/badge/Vite-7-646CFF)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38BDF8)

## Overview
ScaleConfig helps you manage PLUs and keyboard layouts for electronic scales without sacrificing file integrity.
If you do not change a record, the file is written back byte-for-byte.

### Highlights
- **Lossless .TMS round-trip** with original ordering and unknown fields preserved
- **PLU management** (search, edit, and bulk updates)
- **10x4 keyboard layout editor** with 3 layers per key
- **Offline-first** (all processing stays in your browser)
- **Fast and lightweight** React + Vite stack

## Screenshots
Add screenshots or GIFs here.

## Quick Start
### Prerequisites
- Node.js 20+
- npm 9+

### Installation
```bash
git clone https://github.com/VihangaDev/ScaleConfig.git
cd ScaleConfig/frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### Build for Production
```bash
cd frontend
npm run build
```

The output is written to `frontend/dist/`.

## Usage
### Importing a .TMS File
1. Click **Import** on the Dashboard
2. Select your `.TMS` file
3. Review parsed PLU data

### Editing PLUs
1. Open **PLUs** from the sidebar
2. Edit name, price, unit type, or department/class
3. Use the search bar to filter items

### Configuring the Keyboard
1. Open **Keyboard**
2. Choose a layer (1, 2, or 3)
3. Drag PLUs onto keys or click a key to assign/edit

### Exporting
1. Click **Export** to save changes
2. The app creates a backup of the original file
3. Review the diff preview before confirming

## Scale Model Compatibility
ScaleConfig is tested with the sample data included in this repo:
- Device strings: Budry MFD-51 TM-xA (firmware V3.20E) and TM-xA UC123 V3.20E
- File header: `ECS VER V3.15C5`

Other models may work, but compatibility outside these samples is not guaranteed.

## Sample Data
Sample `.TMS` files live in `samples/`. They are for local testing only.

## Project Structure
```
ScaleConfig/
├── frontend/              # React application
├── samples/               # Sample .TMS files for local testing
├── .github/               # GitHub workflows and templates
├── README.md
├── LICENSE
└── CONTRIBUTING.md
```

## Data Integrity
ScaleConfig is designed to preserve:
- Line endings (CRLF/LF)
- Section ordering
- Unknown fields and sections
- Raw bytes for unedited rows

## Deployment (GitHub Pages + Custom Domain)
This repo includes a `deploy.yml` workflow that builds with `BASE_URL=/` and publishes to GitHub Pages.
Custom domain: `tm-xa.vihanga.dev`

DNS records to configure:
- `CNAME` record for `tm-xa.vihanga.dev` pointing to `VihangaDev.github.io`
- If you also want to use the apex (`vihanga.dev`), add the GitHub Pages `A` records for the apex domain

The `CNAME` file is committed at `frontend/public/CNAME` and is included in the build output.

To deploy manually:
```bash
cd frontend
BASE_URL=/ScaleConfig/ npm run build
```

## Contributing
Contributions are welcome. Please see `CONTRIBUTING.md` for guidelines.

## License
MIT License. See `LICENSE` for details.
