-- Revisi Tahap 1 berdasarkan hasil coba-coba Amir di admin:
-- 1. Produk bisa punya sampai 8 foto (bukan cuma 1) -> tabel product_images baru.
-- 2. Variasi produk jadi 2 tingkat ala Shopee (mis. AREA SABLON x SIZE),
--    tanpa foto per opsi -> variant_label diganti variant_option_1/2,
--    nama tiap tingkat variasi disimpan di products.
-- 3. Kartu sub campaign bisa diklik menuju link -> sub_campaigns.link_url.
-- Aman diubah langsung (bukan tabel baru terpisah) karena belum ada data
-- produksi nyata yang bergantung pada skema lama - masih tahap uji coba admin.

ALTER TABLE product_variants DROP COLUMN IF EXISTS variant_label;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS variant_option_1 VARCHAR(100);
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS variant_option_2 VARCHAR(100);

ALTER TABLE products ADD COLUMN IF NOT EXISTS variant_axis_1_name VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS variant_axis_2_name VARCHAR(50);

CREATE TABLE IF NOT EXISTS product_images (
  id            SERIAL PRIMARY KEY,
  product_id    INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url     VARCHAR(500) NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);

ALTER TABLE sub_campaigns ADD COLUMN IF NOT EXISTS link_url VARCHAR(500);
ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS link_url VARCHAR(500);
