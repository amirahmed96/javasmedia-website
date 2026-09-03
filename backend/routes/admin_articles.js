// CRUD artikel, khusus admin.
const express = require('express');
const pool = require('../db');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/api/admin/articles', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM articles ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil data artikel.' });
  }
});

router.get('/api/admin/articles/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const result = await pool.query('SELECT * FROM articles WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Artikel tidak ditemukan.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil data artikel.' });
  }
});

router.post('/api/admin/articles', upload.single('photo'), async (req, res) => {
  const { title, category, excerpt, content, is_published } = req.body;
  if (!title || !category || !content) {
    return res.status(400).json({ error: 'Judul, kategori, dan isi artikel wajib diisi.' });
  }
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
  try {
    const result = await pool.query(
      `INSERT INTO articles (title, category, excerpt, content, image_url, is_published)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [title, category, excerpt || null, content, imageUrl, is_published !== 'false']
    );
    res.json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menyimpan artikel.' });
  }
});

router.put('/api/admin/articles/:id', upload.single('photo'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { title, category, excerpt, content, is_published } = req.body;
  if (!title || !category || !content) {
    return res.status(400).json({ error: 'Judul, kategori, dan isi artikel wajib diisi.' });
  }
  let updateQuery = `UPDATE articles SET title=$1, category=$2, excerpt=$3, content=$4, is_published=$5, updated_at=now()`;
  const params = [title, category, excerpt || null, content, is_published !== 'false'];
  if (req.file) {
    updateQuery += `, image_url=$${params.length + 1}`;
    params.push(`/uploads/${req.file.filename}`);
  }
  updateQuery += ` WHERE id=$${params.length + 1}`;
  params.push(id);
  try {
    const result = await pool.query(updateQuery, params);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Artikel tidak ditemukan.' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menyimpan artikel.' });
  }
});

router.delete('/api/admin/articles/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const result = await pool.query('DELETE FROM articles WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Artikel tidak ditemukan.' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menghapus artikel.' });
  }
});

module.exports = router;
