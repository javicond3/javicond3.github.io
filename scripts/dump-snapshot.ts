import * as xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';

const out: Record<string, Record<string, any[]>> = {};
const CELL_DATES = new Set(['*']);
for (const f of fs.readdirSync('data').filter((f) => f.endsWith('.xlsx'))) {
  const wb = xlsx.read(fs.readFileSync(path.join('data', f)), { type: 'buffer', cellDates: true });
  out[f] = {};
  for (const name of wb.SheetNames) {
    out[f][name] = xlsx.utils.sheet_to_json(wb.Sheets[name]);
  }
}
fs.writeFileSync('scripts/snapshot.json', JSON.stringify(out));
console.log('files:', Object.keys(out).length, 'bytes:', fs.statSync('scripts/snapshot.json').size);
