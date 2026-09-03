// Jalankan semua file .sql di folder migrations/ secara urut.
// Pakai: npm run migrate
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function main() {
  const dir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    console.log('Menjalankan migrasi:', file);
    await pool.query(sql);
  }
  console.log('Selesai. Semua migrasi sudah jalan.');
  await pool.end();
}

main().catch((err) => {
  console.error('Migrasi gagal:', err);
  process.exit(1);
});
