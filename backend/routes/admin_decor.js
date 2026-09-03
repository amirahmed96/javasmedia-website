// CRUD "dekorasi toko": slider homepage + sub campaign. Keduanya sederhana
// (foto + urutan tampil), jadi digabung 1 file. Urutan diatur lewat tombol
// naik/turun (tukar sort_order dengan tetangganya) - lebih simpel daripada
// bikin UI drag-and-drop untuk kebutuhan sebesar ini.
const express = require('express');
const pool = require('../db');
const upload = require('../middleware/upload');

const router = express.Router();

function decorRoutes(table, extraFields = []) {
  const r = express.Router();

  r.get('/', async (req, res) => {
    try {
      const result = await pool.query(`SELECT * FROM ${table} ORDER BY sort_order ASC, id ASC`);
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Gagal mengambil data.' });
    }
  });

  r.post('/', upload.single('photo'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Foto wajib diupload.' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    try {
      const maxOrderResult = await pool.query(`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM ${table}`);
      const nextOrder = maxOrderResult.rows[0].next;
      const cols = ['image_url', 'sort_order', ...extraFields.map((f) => f.name)];
      const values = [imageUrl, nextOrder, ...extraFields.map((f) => req.body[f.name] || f.default)];
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      const result = await pool.query(
        `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) RETURNING id`,
        values
      );
      res.json({ ok: true, id: result.rows[0].id });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Gagal menyimpan data.' });
    }
  });

  r.put('/:id/move', async (req, res) => {
    // direction: "up" atau "down" - tukar sort_order dengan tetangga terdekat.
    const id = parseInt(req.params.id, 10);
    const { direction } = req.body;
    try {
      const currentResult = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
      if (currentResult.rows.length === 0) return res.status(404).json({ error: 'Data tidak ditemukan.' });
      const current = currentResult.rows[0];
      const cmp = direction === 'up' ? '<' : '>';
      const order = direction === 'up' ? 'DESC' : 'ASC';
      const neighborResult = await pool.query(
        `SELECT * FROM ${table} WHERE sort_order ${cmp} $1 ORDER BY sort_order ${order} LIMIT 1`,
        [current.sort_order]
      );
      if (neighborResult.rows.length === 0) {
        return res.json({ ok: true }); // sudah di ujung, tidak ada yang ditukar
      }
      const neighbor = neighborResult.rows[0];
      await pool.query(`UPDATE ${table} SET sort_order = $1 WHERE id = $2`, [neighbor.sort_order, current.id]);
      await pool.query(`UPDATE ${table} SET sort_order = $1 WHERE id = $2`, [current.sort_order, neighbor.id]);
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Gagal mengubah urutan.' });
    }
  });

  if (extraFields.length > 0) {
    r.put('/:id', async (req, res) => {
      const id = parseInt(req.params.id, 10);
      const sets = extraFields.map((f, i) => `${f.name} = $${i + 1}`);
      const values = extraFields.map((f) => req.body[f.name] || f.default);
      try {
        const result = await pool.query(
          `UPDATE ${table} SET ${sets.join(', ')} WHERE id = $${values.length + 1}`,
          [...values, id]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'Data tidak ditemukan.' });
        res.json({ ok: true });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal menyimpan data.' });
      }
    });
  }

  r.delete('/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    try {
      const result = await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
      if (result.rowCount === 0) return res.status(404).json({ error: 'Data tidak ditemukan.' });
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Gagal menghapus data.' });
    }
  });

  return r;
}

router.use('/api/admin/hero-slides', decorRoutes('hero_slides'));
router.use('/api/admin/sub-campaigns', decorRoutes('sub_campaigns', [{ name: 'label_text', default: 'SUB CAMPAIGN' }]));

module.exports = router;
