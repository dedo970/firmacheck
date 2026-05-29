/* eslint-disable @typescript-eslint/no-require-imports, no-console */
const { copyFileSync, mkdirSync, existsSync } = require('fs');

mkdirSync('public', { recursive: true });

const copies = [
  ['node_modules/sql.js/dist/sql-wasm.wasm', 'public/sql-wasm.wasm'],
  ['node_modules/leaflet/dist/images/marker-icon.png', 'public/leaflet-marker-icon.png'],
  ['node_modules/leaflet/dist/images/marker-icon-2x.png', 'public/leaflet-marker-icon-2x.png'],
  ['node_modules/leaflet/dist/images/marker-shadow.png', 'public/leaflet-marker-shadow.png'],
];

for (const [src, dest] of copies) {
  if (!existsSync(src)) {
    console.error(`postinstall: missing source file "${src}" — run "npm install" and try again`);
    process.exit(1);
  }
  copyFileSync(src, dest);
  console.log(`postinstall: copied ${src} → ${dest}`);
}
