-- Tahap 1: Content Management - JavasMedia
-- Skema ini sengaja dirancang siap-multi-role (users.role) dan siap-per-SKU
-- (products/product_variants) supaya tahap Sales Order/Stock In-Out nanti
-- tinggal nambah kolom, bukan bikin ulang. Lihat rencana lengkap di
-- /Users/Amir/.claude/plans/valiant-enchanting-duckling.md

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'employee')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  category      VARCHAR(20) NOT NULL CHECK (category IN
                  ('apparel', 'aksesori', 'packaging', 'promotion', 'homedecor', 'others')),
  description   TEXT,
  image_url     VARCHAR(500),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Setiap produk WAJIB punya minimal 1 baris varian, walau produk itu gak
-- punya pilihan ukuran (variant_label boleh NULL). SKU di sini format-nya
-- SAMA dengan SKU asli Amir di spreadsheet (mis. "RB-M"), supaya nanti
-- bisa langsung disambungkan ke Stock In/Out & Sales Order tanpa restrukturisasi.
CREATE TABLE IF NOT EXISTS product_variants (
  id            SERIAL PRIMARY KEY,
  product_id    INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku           VARCHAR(50) UNIQUE NOT NULL,
  variant_label VARCHAR(100),
  price         INTEGER NOT NULL,
  price_old     INTEGER,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);

CREATE TABLE IF NOT EXISTS articles (
  id            SERIAL PRIMARY KEY,
  title         VARCHAR(200) NOT NULL,
  category      VARCHAR(30) NOT NULL,
  excerpt       VARCHAR(300),
  content       TEXT NOT NULL,
  image_url     VARCHAR(500),
  is_published  BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vouchers (
  id                SERIAL PRIMARY KEY,
  code              VARCHAR(30) UNIQUE NOT NULL,
  discount_percent  INTEGER NOT NULL,
  description       VARCHAR(200),
  valid_until       DATE,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hero_slides (
  id          SERIAL PRIMARY KEY,
  image_url   VARCHAR(500) NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sub_campaigns (
  id          SERIAL PRIMARY KEY,
  image_url   VARCHAR(500) NOT NULL,
  label_text  VARCHAR(50) NOT NULL DEFAULT 'SUB CAMPAIGN',
  sort_order  INTEGER NOT NULL DEFAULT 0
);
