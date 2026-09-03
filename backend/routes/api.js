// Endpoint publik - dipakai katalog.html, detail-produk.html, promo.html,
// articles.html, detail-artikel.html, index.html. Tidak butuh login.
const express = require('express');
const pool = require('../db');

const router = express.Router();

// Ambil semua produk aktif + varian-variannya. Harga tampilan (untuk kartu
// katalog) dihitung dari varian termurah - detail-produk.html tetap dapat
// SEMUA varian lewat field `variants` untuk render pilihan Ukuran.
const PRODUCTS_QUERY = `
  SELECT
    p.id, p.name, p.category, p.description, p.image_url,
    p.variant_axis_1_name, p.variant_axis_2_name,
    (SELECT v.price FROM product_variants v
      WHERE v.product_id = p.id AND v.is_active = true
      ORDER BY v.price ASC LIMIT 1) AS price,
    (SELECT v.price_old FROM product_variants v
      WHERE v.product_id = p.id AND v.is_active = true
      ORDER BY v.price ASC LIMIT 1) AS price_old,
    COALESCE(
      (SELECT json_agg(json_build_object(
          'id', v.id, 'sku', v.sku, 'variant_option_1', v.variant_option_1,
          'variant_option_2', v.variant_option_2, 'price', v.price, 'price_old', v.price_old
        ) ORDER BY v.price ASC)
        FROM product_variants v
        WHERE v.product_id = p.id AND v.is_active = true),
      '[]'
    ) AS variants,
    COALESCE(
      (SELECT json_agg(json_build_object('id', i.id, 'image_url', i.image_url) ORDER BY i.sort_order ASC)
        FROM product_images i WHERE i.product_id = p.id),
      '[]'
    ) AS images
  FROM products p
  WHERE p.is_active = true
`;

router.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query(`${PRODUCTS_QUERY} ORDER BY p.created_at DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil data produk.' });
  }
});

router.get('/api/products/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'ID produk tidak valid.' });
  try {
    const result = await pool.query(`${PRODUCTS_QUERY} AND p.id = $1`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Produk tidak ditemukan.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil data produk.' });
  }
});

router.get('/api/articles', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, category, excerpt, image_url, created_at
       FROM articles WHERE is_published = true ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil data artikel.' });
  }
});

router.get('/api/articles/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'ID artikel tidak valid.' });
  try {
    const result = await pool.query(
      'SELECT * FROM articles WHERE id = $1 AND is_published = true',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Artikel tidak ditemukan.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil data artikel.' });
  }
});

router.get('/api/vouchers', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, code, discount_percent, description, valid_until
       FROM vouchers
       WHERE is_active = true AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
       ORDER BY valid_until ASC NULLS LAST`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil data voucher.' });
  }
});

router.get('/api/hero-slides', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, image_url, link_url FROM hero_slides ORDER BY sort_order ASC, id ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil data slider.' });
  }
});

router.get('/api/sub-campaigns', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, image_url, label_text, link_url FROM sub_campaigns ORDER BY sort_order ASC, id ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil data sub campaign.' });
  }
});

module.exports = router;
