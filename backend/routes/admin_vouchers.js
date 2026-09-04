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

// Validasi + susun nilai voucher dari body request - dipakai bareng
// sama POST (buat baru/duplikat) dan PUT (edit).
function parseVoucherInput(body) {
  const type = body.discount_type === 'fixed' ? 'fixed' : 'percent';
  const value = parseInt(body.discount_value, 10);
  if (!body.code || !value) {
    return { error: 'Kode voucher dan nilai diskon wajib diisi.' };
  }
  if (type === 'percent' && (value < 1 || value > 100)) {
    return { error: 'Diskon persentase harus antara 1-100.' };
  }
  if (type === 'fixed' && value < 1) {
    return { error: 'Nominal potongan harus lebih dari 0.' };
  }
  const maxDiscount = type === 'percent' && body.max_discount_amount ? parseInt(body.max_discount_amount, 10) : null;
  return {
    code: body.code.toUpperCase().trim(),
    discount_type: type,
    discount_value: value,
    max_discount_amount: maxDiscount,
    description: body.description || null,
    valid_from: body.valid_from || null,
    valid_until: body.valid_until || null,
    is_active: body.is_active !== false
  };
}

router.post('/api/admin/vouchers', async (req, res) => {
  const v = parseVoucherInput(req.body);
  if (v.error) return res.status(400).json({ error: v.error });
  try {
    const result = await pool.query(
      `INSERT INTO vouchers (code, discount_type, discount_value, max_discount_amount, description, valid_from, valid_until, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [v.code, v.discount_type, v.discount_value, v.max_discount_amount, v.description, v.valid_from, v.valid_until, v.is_active]
    );
    res.json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Kode voucher "' + v.code + '" sudah dipakai, ganti kodenya.' });
    }
    res.status(500).json({ error: 'Gagal menyimpan voucher.' });
  }
});

router.put('/api/admin/vouchers/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const v = parseVoucherInput(req.body);
  if (v.error) return res.status(400).json({ error: v.error });
  try {
    const result = await pool.query(
      `UPDATE vouchers SET code=$1, discount_type=$2, discount_value=$3, max_discount_amount=$4, description=$5, valid_from=$6, valid_until=$7, is_active=$8
       WHERE id=$9`,
      [v.code, v.discount_type, v.discount_value, v.max_discount_amount, v.description, v.valid_from, v.valid_until, v.is_active, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Voucher tidak ditemukan.' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Kode voucher "' + v.code + '" sudah dipakai, ganti kodenya.' });
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
