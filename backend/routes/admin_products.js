// CRUD produk + varian, khusus admin (butuh login role owner).
const express = require('express');
const pool = require('../db');
const upload = require('../middleware/upload');

const router = express.Router();

function parseVariants(body) {
  // Form admin kirim varian sebagai JSON string di field "variants_json",
  // contoh: [{"sku":"RB-M","variant_option_1":"LOGO","variant_option_2":"M","price":42000,"price_old":null}]
  if (!body.variants_json) return [];
  try {
    const parsed = JSON.parse(body.variants_json);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    return [];
  }
}

const PRODUCT_WITH_RELATIONS_QUERY = `
  SELECT p.*, COALESCE(
      (SELECT json_agg(json_build_object(
          'id', v.id, 'sku', v.sku, 'variant_option_1', v.variant_option_1,
          'variant_option_2', v.variant_option_2, 'price', v.price,
          'price_old', v.price_old, 'is_active', v.is_active
        ) ORDER BY v.id ASC)
        FROM product_variants v WHERE v.product_id = p.id),
      '[]'
    ) AS variants,
    COALESCE(
      (SELECT json_agg(json_build_object('id', i.id, 'image_url', i.image_url) ORDER BY i.sort_order ASC)
        FROM product_images i WHERE i.product_id = p.id),
      '[]'
    ) AS images
  FROM products p
`;

// List semua produk (termasuk nonaktif) buat tabel admin.
router.get('/api/admin/products', async (req, res) => {
  try {
    const result = await pool.query(`${PRODUCT_WITH_RELATIONS_QUERY} ORDER BY p.created_at DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil data produk.' });
  }
});

router.get('/api/admin/products/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const result = await pool.query(`${PRODUCT_WITH_RELATIONS_QUERY} WHERE p.id = $1`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Produk tidak ditemukan.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil data produk.' });
  }
});

router.post('/api/admin/products', upload.array('photos', 8), async (req, res) => {
  const { name, category, description, variant_axis_1_name, variant_axis_2_name } = req.body;
  const variants = parseVariants(req.body);
  if (!name || !category) {
    return res.status(400).json({ error: 'Nama dan kategori produk wajib diisi.' });
  }
  if (variants.length === 0) {
    return res.status(400).json({ error: 'Minimal 1 varian (SKU + harga) wajib diisi.' });
  }
  const photoUrls = (req.files || []).map((f) => `/uploads/${f.filename}`);
  const coverUrl = photoUrls[0] || null;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const productResult = await client.query(
      `INSERT INTO products (name, category, description, image_url, variant_axis_1_name, variant_axis_2_name)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [name, category, description || null, coverUrl, variant_axis_1_name || null, variant_axis_2_name || null]
    );
    const productId = productResult.rows[0].id;
    for (let i = 0; i < photoUrls.length; i++) {
      await client.query(
        `INSERT INTO product_images (product_id, image_url, sort_order) VALUES ($1, $2, $3)`,
        [productId, photoUrls[i], i]
      );
    }
    for (const v of variants) {
      await client.query(
        `INSERT INTO product_variants (product_id, sku, variant_option_1, variant_option_2, price, price_old)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [productId, v.sku, v.variant_option_1 || null, v.variant_option_2 || null, v.price, v.price_old || null]
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

router.put('/api/admin/products/:id', upload.array('photos', 8), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name, category, description, variant_axis_1_name, variant_axis_2_name } = req.body;
  const variants = parseVariants(req.body);
  if (!name || !category) {
    return res.status(400).json({ error: 'Nama dan kategori produk wajib diisi.' });
  }
  if (variants.length === 0) {
    return res.status(400).json({ error: 'Minimal 1 varian (SKU + harga) wajib diisi.' });
  }
  const newPhotoUrls = (req.files || []).map((f) => `/uploads/${f.filename}`);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let updateQuery = `UPDATE products SET name=$1, category=$2, description=$3, variant_axis_1_name=$4, variant_axis_2_name=$5, updated_at=now()`;
    const params = [name, category, description || null, variant_axis_1_name || null, variant_axis_2_name || null];
    if (newPhotoUrls.length > 0) {
      updateQuery += `, image_url=$${params.length + 1}`;
      params.push(newPhotoUrls[0]);
    }
    updateQuery += ` WHERE id=$${params.length + 1}`;
    params.push(id);
    const result = await client.query(updateQuery, params);
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Produk tidak ditemukan.' });
    }
    // Upload foto baru MENGGANTI semua foto lama (sederhana untuk Tahap 1,
    // sama seperti pola varian di bawah). Kalau gak ada foto baru, foto lama dibiarkan.
    if (newPhotoUrls.length > 0) {
      await client.query('DELETE FROM product_images WHERE product_id = $1', [id]);
      for (let i = 0; i < newPhotoUrls.length; i++) {
        await client.query(
          `INSERT INTO product_images (product_id, image_url, sort_order) VALUES ($1, $2, $3)`,
          [id, newPhotoUrls[i], i]
        );
      }
    }
    // Ganti semua varian lama dengan yang baru dari form (sederhana untuk Tahap 1).
    await client.query('DELETE FROM product_variants WHERE product_id = $1', [id]);
    for (const v of variants) {
      await client.query(
        `INSERT INTO product_variants (product_id, sku, variant_option_1, variant_option_2, price, price_old)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, v.sku, v.variant_option_1 || null, v.variant_option_2 || null, v.price, v.price_old || null]
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
