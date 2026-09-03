// CRUD voucher/promo, khusus admin.
const express = require('express');
const pool = require('../db');

const router = express.Router();

router.get('/api/admin/vouchers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vouchers ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil data voucher.' });
  }
});

router.post('/api/admin/vouchers', async (req, res) => {
  const { code, discount_percent, description, valid_until, is_active } = req.body;
  if (!code || !discount_percent) {
    return res.status(400).json({ error: 'Kode voucher dan persen diskon wajib diisi.' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO vouchers (code, discount_percent, description, valid_until, is_active)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [code.toUpperCase(), discount_percent, description || null, valid_until || null, is_active !== false]
    );
    res.json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Kode voucher sudah dipakai, pilih kode lain.' });
    }
    res.status(500).json({ error: 'Gagal menyimpan voucher.' });
  }
});

router.put('/api/admin/vouchers/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { code, discount_percent, description, valid_until, is_active } = req.body;
  if (!code || !discount_percent) {
    return res.status(400).json({ error: 'Kode voucher dan persen diskon wajib diisi.' });
  }
  try {
    const result = await pool.query(
      `UPDATE vouchers SET code=$1, discount_percent=$2, description=$3, valid_until=$4, is_active=$5
       WHERE id=$6`,
      [code.toUpperCase(), discount_percent, description || null, valid_until || null, is_active !== false, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Voucher tidak ditemukan.' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Kode voucher sudah dipakai, pilih kode lain.' });
    }
    res.status(500).json({ error: 'Gagal menyimpan voucher.' });
  }
});

router.delete('/api/admin/vouchers/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const result = await pool.query('DELETE FROM vouchers WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Voucher tidak ditemukan.' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menghapus voucher.' });
  }
});

module.exports = router;
