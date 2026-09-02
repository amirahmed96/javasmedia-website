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

## ALUR KERJA — baca bagian ini sebelum mulai

Cara kerja di bawah ini lahir dari sesi panjang yang penuh bolak-balik.
Mengikutinya membuat pekerjaan jauh lebih cepat dan minim revisi ulang.

### 1. Jangan kirim ke GitHub tanpa diminta

Push ke `main` = website langsung berubah untuk pengunjung asli.
Kerjakan di lokal dulu, biarkan Amir melihat hasilnya, **baru** push
setelah dia bilang setuju. Kalimat seperti "oke, kirim" atau "push"
adalah izinnya. Kalau ragu, tanya.

### 2. Pahami dulu, baru kerjakan

Kalau instruksinya bisa ditafsirkan lebih dari satu cara, tanya dulu —
satu kalimat singkat sudah cukup. Ini jauh lebih murah daripada
mengerjakan hal yang salah lalu mengulang.

- Instruksi relatif ("perkecil 30%", "geser dikit", "agak ke atas")
  → sebutkan angkanya dulu: "sekarang 251px, jadi 175px ya?"
- Jangan berasumsi soal aset/desain milik Amir. Pernah terjadi: file PNG
  sub-campaign disangka placeholder generik, padahal itu template desain
  buatannya sendiri dengan area layar sengaja dikosongkan.

### 3. Ukur sebelum & sesudah

Jalankan `cek-layout-mobile.js` di browser sebelum revisi, simpan hasilnya,
jalankan lagi sesudahnya, lalu bandingkan.
Angka yang berubah padahal tidak diminta = regresi, perbaiki sebelum lapor.

**Sebelum percaya angka apa pun:** pastikan `window.innerWidth <= 768`.
Tool resize browser kadang gagal diam-diam tapi tetap lapor "berhasil",
dan hasilnya adalah mengukur tampilan desktop sambil mengira itu mobile.
Ini sudah pernah menyebabkan satu putaran laporan yang keliru total.

### 4. "Sudah dicek" harus berarti benar-benar dicek

Jangan bilang aman kalau yang diperiksa baru posisi dan tampilan.
Fungsi interaktif harus ikut dites dengan benar-benar mengklik/menjalankannya:
carousel (tombol panah, titik indikator, auto-slide), accordion footer,
tombol WhatsApp, menu drawer.

Pernah terjadi: layout dilaporkan "aman", padahal carousel-nya macet total
di mobile. Amir yang menemukan, bukan Claude.

### 5. Kalau sudah dipush, verifikasi yang benar

- Tunggu deploy Railway selesai (statusnya SUCCESS, bukan BUILDING)
- Buka dengan penanda versi supaya tidak kena cache: `?v=1`, `?v=2`, dst
- `raw.githubusercontent.com` sering menyajikan versi lama —
  jangan pakai itu untuk mengecek isi file terkini

### 6. Lapor dengan jujur dan spesifik

Sebutkan angka hasil pengukuran, bukan sekadar "sudah rapi".
Kalau ada yang belum sempat dites, katakan. Kalau ada yang salah,
akui langsung — Amir lebih menghargai itu daripada laporan yang terlalu
percaya diri lalu ternyata meleset.

Kalau Amir mengirim revisi bernomor, balas juga per nomor supaya
ketahuan kalau ada yang terlewat.

### 7. Jaga sesi tetap fokus

Idealnya satu sesi = satu halaman. Sesi yang terlalu panjang membuat
respons melambat dan boros kuota.

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

- **Margin dihitung tanpa memperhitungkan elemen yang "straddle".** Kartu
  sub-campaign naik setengah tingginya sendiri, jadi `margin-bottom: 50px`
  hanya menghasilkan jarak visual 6px. Selalu ukur hasil akhirnya, jangan
  percaya hitungan di atas kertas.

- **CSS `order` pada flexbox tidak selalu bisa diandalkan.** Lebih aman
  mengurutkan elemen langsung di HTML daripada mengandalkan `order`.

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
