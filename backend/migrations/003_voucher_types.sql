-- Voucher sekarang bisa 2 tipe diskon: persentase (dengan maksimal
-- potongan opsional, mis. "10% maks Rp20.000") atau nominal tetap
-- (mis. "Voucher Ongkir Rp15.000"). Juga nambah valid_from opsional
-- (sebelumnya cuma ada tanggal berakhir, gak ada tanggal mulai).
--
-- discount_percent lama di-backfill ke discount_value baru lalu kolom
-- lamanya dihapus. Migrasi ini gak di-track "sudah jalan apa belum" -
-- dijalankan ulang tiap server start - jadi pakai DO block supaya aman
-- diulang: begitu discount_percent sudah hilang, blok ini otomatis
-- gak ngapa-ngapain lagi di run berikutnya.

ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS discount_type VARCHAR(10) NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent', 'fixed'));
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS discount_value INTEGER;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS max_discount_amount INTEGER;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS valid_from DATE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'discount_percent') THEN
    UPDATE vouchers SET discount_value = discount_percent WHERE discount_value IS NULL;
    ALTER TABLE vouchers ALTER COLUMN discount_value SET NOT NULL;
    ALTER TABLE vouchers DROP COLUMN discount_percent;
  END IF;
END $$;
