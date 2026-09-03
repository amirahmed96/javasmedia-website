// CRUD produk + varian, khusus admin (butuh login role owner).
const express = require('express');
const pool = require('../db');
const upload = require('../middleware/upload');

const router = express.Router();

function parseVariants(body) {
  // Form admin kirim varian sebagai JSON string di field "variants_json",
  // contoh: [{"sku":"RB-M","variant_label":"Size M","price":42000,"price_old":null}]
  if (!body.variants_json) return [];
  try {
    const parsed = JSON.parse(body.variants_json);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    return [];
  }
}

// List semua produk (termasuk nonaktif) buat tabel admin.
router.get('/api/admin/products', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, COALESCE(
        (SELECT json_agg(json_build_object(
            'id', v.id, 'sku', v.sku, 'variant_label', v.variant_label,
            'price', v.price, 'price_old', v.price_old, 'is_active', v.is_active
          ) ORDER BY v.id ASC)
          FROM product_variants v WHERE v.product_id = p.id),
        '[]'
      ) AS variants
      FROM products p
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil data produk.' });
  }
});

router.get('/api/admin/products/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const productResult = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Produk tidak ditemukan.' });
    }
    const variantsResult = await pool.query(
      'SELECT * FROM product_variants WHERE product_id = $1 ORDER BY id ASC',
      [id]
    );
    res.json({ ...productResult.rows[0], variants: variantsResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil data produk.' });
  }
});

router.post('/api/admin/products', upload.single('photo'), async (req, res) => {
  const { name, category, description } = req.body;
  const variants = parseVariants(req.body);
  if (!name || !category) {
    return res.status(400).json({ error: 'Nama dan kategori produk wajib diisi.' });
  }
  if (variants.length === 0) {
    return res.status(400).json({ error: 'Minimal 1 varian (SKU + harga) wajib diisi.' });
  }
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const productResult = await client.query(
      `INSERT INTO products (name, category, description, image_url)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [name, category, description || null, imageUrl]
    );
    const productId = productResult.rows[0].id;
    for (const v of variants) {
      await client.query(
        `INSERT INTO product_variants (product_id, sku, variant_label, price, price_old)
         VALUES ($1, $2, $3, $4, $5)`,
        [productId, v.sku, v.variant_label || null, v.price, v.price_old || null]
      );
    }
    await client.query('COMMIT');
    res.json({ ok: true, id: productId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Ada SKU yang sudah dipakai produk lain. SKU harus unik.' });
    }
    res.status(500).json({ error: 'Gagal menyimpan produk.' });
  } finally {
    client.release();
  }
});

router.put('/api/admin/products/:id', upload.single('photo'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name, category, description } = req.body;
  const variants = parseVariants(req.body);
  if (!name || !category) {
    return res.status(400).json({ error: 'Nama dan kategori produk wajib diisi.' });
  }
  if (variants.length === 0) {
    return res.status(400).json({ error: 'Minimal 1 varian (SKU + harga) wajib diisi.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let updateQuery = `UPDATE products SET name=$1, category=$2, description=$3, updated_at=now()`;
    const params = [name, category, description || null];
    if (req.file) {
      updateQuery += `, image_url=$${params.length + 1}`;
      params.push(`/uploads/${req.file.filename}`);
    }
    updateQuery += ` WHERE id=$${params.length + 1}`;
    params.push(id);
    const result = await client.query(updateQuery, params);
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Produk tidak ditemukan.' });
    }
    // Ganti semua varian lama dengan yang baru dari form (sederhana untuk Tahap 1).
    await client.query('DELETE FROM product_variants WHERE product_id = $1', [id]);
    for (const v of variants) {
      await client.query(
        `INSERT INTO product_variants (product_id, sku, variant_label, price, price_old)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, v.sku, v.variant_label || null, v.price, v.price_old || null]
      );
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Ada SKU yang sudah dipakai produk lain. SKU harus unik.' });
    }
    res.status(500).json({ error: 'Gagal menyimpan produk.' });
  } finally {
    client.release();
  }
});

router.delete('/api/admin/products/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const result = await pool.query('DELETE FROM products WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Produk tidak ditemukan.' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menghapus produk.' });
  }
});

module.exports = router;
