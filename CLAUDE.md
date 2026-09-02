# Catatan Proyek — Website JavasMedia

File ini dibaca otomatis oleh Claude Code setiap sesi baru,
supaya tidak perlu menjelaskan ulang konteks dari nol.

---

## Tentang proyek ini

Website JavasMedia — "House of Customize", bisnis custom printing & apparel di Surabaya.
Live di https://www.javasmedia.com (hosting Railway, auto-deploy dari branch `main`).

Amir menangani seluruh desain/UI-UX. Dia **bukan programmer** — jangan jawab pakai
istilah teknis tanpa penjelasan, dan jangan minta dia menulis kode.
Bahasa percakapan: **Bahasa Indonesia**, santai, pakai "aku/kamu".

---

## Struktur file

| File | Isi |
|---|---|
| `index.html` | Homepage — CSS desktop ada di dalam (tag `<style>`) |
| `mobile.css` | **Semua CSS mobile, dipakai bersama semua halaman** |
| `mobile-nav.css` / `mobile-nav.js` | Header & drawer menu versi mobile |
| `cek-layout-mobile.js` | Script pengecekan layout (lihat bagian Alur Kerja) |
| `promo.html`, `katalog.html`, `articles.html`, `location.html`, `detail-produk.html`, `detail-artikel.html` | Halaman lain — **versi mobile belum dikerjakan** |
| `login.html`, `daftar.html`, `dashboard.html` | Layout khusus, belum pernah direview |

**Aturan penting:** revisi tampilan mobile dikerjakan di `mobile.css`, JANGAN
dikembalikan menjadi inline di HTML. Pemisahan ini disengaja supaya satu perubahan
berlaku untuk semua halaman sekaligus.

---

## Kondisi homepage mobile (SUDAH FINAL — jangan diubah tanpa diminta)

Angka-angka ini hasil banyak iterasi dan sudah disetujui. Kalau sebuah revisi
mengubah salah satunya tanpa diminta, itu **regresi** dan harus diperbaiki:

| Yang diukur | Nilai |
|---|---|
| Jarak hero → kartu sub-campaign | 24px |
| Lebar kartu sub-campaign | 72px, ter-center (margin kiri = kanan) |
| bg2 terpotong? | TIDAK — pakai aspect-ratio asli 2879/928 |
| Jarak bg2 → bg3 | 175px |
| About Us menindih bg2 & bg3 | 6px di masing-masing sisi |
| Font About Us | 10px (sengaja disamakan dengan `.brand-desc`) |
| Lebar kartu testimoni | 38vw |
| Tombol WhatsApp melayang | 38px |

---

## Alur kerja yang disepakati

1. **Sebelum & sesudah revisi**, jalankan `cek-layout-mobile.js` di browser,
   lalu bandingkan hasilnya. Angka yang berubah padahal tidak diminta = regresi.
2. **Kalau instruksi bersifat relatif** ("perkecil 30%", "geser dikit"),
   konfirmasi angkanya dulu dalam satu baris sebelum mengerjakan.
   Contoh: "sekarang 251px, jadi 175px ya?"
3. **Jangan lapor "sudah aman"** kalau yang dicek baru posisi/tampilan.
   Fungsi interaktif (carousel, accordion, tombol) harus ikut dites.
4. Kalau Amir mengirim revisi bernomor, balas juga per nomor.

---

## Jebakan yang PERNAH terjadi — jangan diulang

- **Properti posisi tidak ter-reset.** `.about-box-wrap` punya `top: 584px` untuk
  desktop. Saat di-override ke layout normal di mobile, `top` tidak ikut di-reset →
  kotak melenceng 584px ke bawah sampai menumpuk section lain.
  → Kalau mereposisi elemen di mobile, reset SEMUA properti posisinya
  (`top`, `left`, `transform`, `position`) sekaligus.

- **Nilai hardcoded ukuran desktop di JavaScript.** Carousel dulu memakai
  `slideWidth = 1200` (lebar desktop), padahal di mobile lebar slide mengikuti layar.
  Akibatnya tombol panah & auto-slide macet di posisi acak.
  → Ukur lebar sebenarnya saat runtime, jangan pakai angka mati.

- **`background` solid menutupi PNG transparan.** Pernah menambahkan
  `background: #fff` di `.sub-card` → foto latar di belakangnya tertutup putih.

- **Salah mengukur karena viewport belum benar-benar mobile.** Tool resize browser
  kadang gagal diam-diam tapi tetap melaporkan "berhasil".
  → Selalu cek `window.innerWidth <= 768` dulu sebelum percaya pengukuran apa pun.

---

## Aset

- `sub-campaign-1.png` … `sub-campaign-4.png` — 801×979px, PNG transparan.
  Berisi bingkai monitor dengan area layar putih yang **sengaja dikosongkan**
  untuk diisi materi campaign nanti. Ini desain asli Amir, bukan placeholder.
- `bg2.jpg` — 2879×928px (rasio 3.102). Jangan sampai terpotong.
- `bg3.jpg` — foto workshop, tinggi 120px di mobile.

---

## Masih menunggu dikerjakan

1. Versi mobile untuk halaman selain homepage
2. Konten dummy yang perlu diganti aslinya: kartu New Arrivals (kosong),
   logo Brand Partner (ACME/Nexus/dst masih contoh), teks About Us (Inggris generik)
3. Review `login.html`, `daftar.html`, `dashboard.html`
4. SEO: title & meta description per halaman, redirect root → www di Cloudflare
