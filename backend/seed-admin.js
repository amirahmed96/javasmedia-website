// Bikin/update 1 akun admin (role owner) dari ADMIN_USERNAME/ADMIN_PASSWORD di .env.
// Aman dijalankan berkali-kali - kalau username sudah ada, password-nya di-update.
// Pakai: npm run seed-admin
require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('./db');

async function main() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    throw new Error('ADMIN_USERNAME dan ADMIN_PASSWORD harus diisi di .env');
  }
  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (username, password_hash, role)
     VALUES ($1, $2, 'owner')
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [username, hash]
  );
  console.log(`Akun admin "${username}" (role: owner) siap dipakai.`);
  await pool.end();
}

main().catch((err) => {
  console.error('Gagal bikin akun admin:', err);
  process.exit(1);
});
