require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const cors = require('cors');
const bcrypt = require('bcrypt');

const pool = require('./db');
const requireRole = require('./middleware/requireRole');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const adminProductsRoutes = require('./routes/admin_products');
const adminArticlesRoutes = require('./routes/admin_articles');
const adminVouchersRoutes = require('./routes/admin_vouchers');
const adminDecorRoutes = require('./routes/admin_decor');

const app = express();

// Railway men-terminate HTTPS di gerbang depan lalu terusin ke sini pakai
// HTTP biasa. Tanpa ini, Express mengira koneksinya tidak aman dan diam-diam
// menolak mengeset cookie sesi (cookie.secure butuh koneksi yang dianggap aman).
app.set('trust proxy', 1);

// Situs statis (katalog.html dkk) beda origin dari backend ini, jadi perlu
// CORS. `credentials: true` gak dipakai di sini karena API publik tidak
// butuh cookie - cuma endpoint /admin/* yang butuh session, dan itu dibuka
// langsung dari browser yang sama origin-nya (admin buka halaman ini
// langsung, bukan lewat fetch cross-origin).
const allowedOrigins = (process.env.STATIC_SITE_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  // Sesi disimpan di Postgres (bukan memori server) supaya login Amir tidak
  // ikut hilang setiap kali server restart (redeploy, dsb) - sebelumnya
  // pakai memory store default express-session, yang berarti restart server
  // = semua orang ke-logout paksa meski cookie di browser belum kedaluwarsa.
  store: new pgSession({ pool, tableName: 'session', createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || 'dev-secret-ganti-di-production',
  resave: false,
  saveUninitialized: false,
  rolling: true, // tiap request memperpanjang sesi, bukan cuma dihitung dari sekali login
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 hari, diperpanjang lagi tiap ada aktivitas (rolling)
  }
}));

// Foto yang diupload admin, bisa diakses publik (dipakai <img src> di katalog.html dkk).
app.use('/uploads', express.static(process.env.UPLOAD_DIR || path.join(__dirname, 'uploads')));

// CSS admin (boleh diakses tanpa cek sesi, isinya cuma styling, gak ada data).
app.get('/admin/admin.css', (req, res) => res.sendFile(path.join(__dirname, 'views', 'admin.css')));

// Halaman admin (HTML statis + JS, dilindungi requireRole kecuali /admin/login).
app.get('/admin', (req, res) => res.redirect('/admin/produk'));
app.get('/admin/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/admin/produk', requireRole('owner', 'employee'), (req, res) => res.sendFile(path.join(__dirname, 'views', 'produk-list.html')));
app.get('/admin/produk/baru', requireRole('owner'), (req, res) => res.sendFile(path.join(__dirname, 'views', 'produk-form.html')));
app.get('/admin/produk/:id/edit', requireRole('owner'), (req, res) => res.sendFile(path.join(__dirname, 'views', 'produk-form.html')));
app.get('/admin/artikel', requireRole('owner', 'employee'), (req, res) => res.sendFile(path.join(__dirname, 'views', 'artikel-list.html')));
app.get('/admin/artikel/baru', requireRole('owner'), (req, res) => res.sendFile(path.join(__dirname, 'views', 'artikel-form.html')));
app.get('/admin/artikel/:id/edit', requireRole('owner'), (req, res) => res.sendFile(path.join(__dirname, 'views', 'artikel-form.html')));
app.get('/admin/voucher', requireRole('owner'), (req, res) => res.sendFile(path.join(__dirname, 'views', 'voucher-list.html')));
app.get('/admin/dekorasi', requireRole('owner'), (req, res) => res.sendFile(path.join(__dirname, 'views', 'dekorasi.html')));

// Auth (login/logout) - tidak digerbangi requireRole karena ini yang
// dipakai untuk login itu sendiri.
app.use('/', authRoutes);

// API publik - dipakai situs statis, tanpa login.
app.use('/', apiRoutes);

// API admin - semua butuh login role owner (kecuali produk/artikel list
// yang juga boleh employee, untuk tahap depan; tapi Tahap 1 cuma ada akun owner).
app.use(requireRole('owner', 'employee'));
app.use('/', adminProductsRoutes);
app.use('/', adminArticlesRoutes);
app.use('/', adminVouchersRoutes);
app.use('/', adminDecorRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Terjadi kesalahan server.' });
});

// Migrasi & seed admin dijalankan otomatis tiap server start - aman diulang
// (CREATE TABLE IF NOT EXISTS + ON CONFLICT DO UPDATE), jadi gak perlu akses
// psql terpisah cuma buat setup awal database di Railway.
async function runStartupTasks() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await pool.query(sql);
  }
  console.log('Migrasi database sudah dicek/dijalankan.');

  if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    await pool.query(
      `INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, 'owner')
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [process.env.ADMIN_USERNAME, hash]
    );
    console.log(`Akun admin "${process.env.ADMIN_USERNAME}" siap dipakai.`);
  }

  // Akun admin ke-2 (opsional) - dipisah dari ADMIN_USERNAME/ADMIN_PASSWORD
  // di atas supaya nambah akun ini tidak mengganggu/menimpa akun admin yang
  // sudah ada.
  if (process.env.ADMIN2_USERNAME && process.env.ADMIN2_PASSWORD) {
    const hash2 = await bcrypt.hash(process.env.ADMIN2_PASSWORD, 10);
    await pool.query(
      `INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, 'owner')
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [process.env.ADMIN2_USERNAME, hash2]
    );
    console.log(`Akun admin "${process.env.ADMIN2_USERNAME}" siap dipakai.`);
  }
}

const PORT = process.env.PORT || 4000;
runStartupTasks()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`JavasMedia backend jalan di port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Gagal menjalankan setup awal (migrasi/seed admin):', err);
    process.exit(1);
  });
