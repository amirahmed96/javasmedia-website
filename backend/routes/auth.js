const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');

const router = express.Router();

router.post('/admin/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi.' });
  }
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Username atau password salah.' });
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Username atau password salah.' });
    }
    req.session.userId = user.id;
    req.session.userRole = user.role;
    req.session.username = user.username;
    res.json({ ok: true, redirect: '/admin/produk' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

router.post('/admin/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true, redirect: '/admin/login' });
  });
});

router.get('/api/admin/me', (req, res) => {
  if (!req.session || !req.session.userRole) {
    return res.status(401).json({ error: 'Belum login.' });
  }
  res.json({ username: req.session.username, role: req.session.userRole });
});

module.exports = router;
