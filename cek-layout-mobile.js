// ============================================================
// CEK LAYOUT MOBILE — JavasMedia
// ------------------------------------------------------------
// Tujuan: mendeteksi kalau sebuah revisi diam-diam merusak
// bagian lain yang sudah benar sebelumnya.
//
// Cara pakai (dijalankan oleh Claude via browser, bukan manual):
//   1. Buka halaman, resize ke lebar mobile
//   2. PENTING: pastikan window.innerWidth <= 768 dulu.
//      Tool resize kadang gagal diam-diam dan tetap lapor
//      "berhasil" padahal masih ukuran desktop -> semua
//      pengukuran jadi salah. Sudah pernah kejadian.
//   3. Jalankan script ini SEBELUM revisi -> simpan hasilnya
//   4. Jalankan lagi SESUDAH revisi -> bandingkan
//   5. Angka yang berubah padahal tidak diminta = regresi
// ============================================================

(function () {
  function box(sel) {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      left: Math.round(r.left),
      width: Math.round(r.width),
      height: Math.round(r.height)
    };
  }

  function font(sel) {
    const el = document.querySelector(sel);
    return el ? getComputedStyle(el).fontSize : null;
  }

  const vw = window.innerWidth;
  if (vw > 768) {
    return JSON.stringify({
      ERROR: 'Masih ukuran desktop (' + vw + 'px). Resize ulang ke <=768px dulu, jangan percaya hasil pengukuran apapun sebelum ini benar.'
    });
  }

  const cards = document.querySelectorAll('.sub-card');
  const first = cards.length ? cards[0].getBoundingClientRect() : null;
  const last = cards.length ? cards[cards.length - 1].getBoundingClientRect() : null;
  const bg2 = document.querySelector('.sub-bg');

  const hasil = { viewportWidth: vw };

  // --- SUB CAMPAIGN ---
  if (first && box('.hero-wrap')) {
    hasil.gapHeroKeKartu = Math.round(first.top) - box('.hero-wrap').bottom; // target ~24
    hasil.lebarKartu = Math.round(first.width);                              // target 72
    hasil.marginKiri = Math.round(first.left);                               // harus sama dgn kanan
    hasil.marginKanan = Math.round(vw - last.right);                         // = center
  }

  // --- BG2 tidak boleh terpotong ---
  if (bg2 && bg2.naturalWidth) {
    const asliRasio = (bg2.naturalWidth / bg2.naturalHeight).toFixed(3);
    const tampilRasio = (bg2.getBoundingClientRect().width / bg2.getBoundingClientRect().height).toFixed(3);
    hasil.bg2TidakTerpotong = (asliRasio === tampilRasio);
  }

  // --- ABOUT US straddle bg2 & bg3 ---
  if (box('.sub-bg') && box('.workshop-photo') && box('.about-box')) {
    hasil.jarakBg2KeBg3 = box('.workshop-photo').top - box('.sub-bg').bottom;      // target ~175
    hasil.menindihBg2 = box('.sub-bg').bottom - box('.about-box').top;             // target ~6
    hasil.menindihBg3 = box('.about-box').bottom - box('.workshop-photo').top;     // target ~6
  }

  // --- Ukuran font yang pernah diminta khusus ---
  hasil.fontAboutText = font('.about-text');     // harus sama dgn brand-desc
  hasil.fontBrandDesc = font('.brand-desc');

  // --- Kartu-kartu lain ---
  if (box('.logo-card')) hasil.lebarLogoCard = box('.logo-card').width;
  if (box('.arrival-card')) hasil.lebarArrivalCard = box('.arrival-card').width;
  if (box('.testi-card')) hasil.lebarTestiCard = box('.testi-card').width;
  if (box('.floating-wa')) hasil.lebarTombolWA = box('.floating-wa').width;

  // --- Cek carousel benar-benar berfungsi (bukan cuma tampilannya) ---
  const track = document.getElementById('sliderTrack');
  if (track) {
    const slide = track.querySelector('.slide-img');
    if (slide) {
      const lebarSlide = Math.round(slide.getBoundingClientRect().width);
      hasil.lebarSlide = lebarSlide;
      // scrollLeft harus kelipatan lebar slide (kalau tidak, carousel macet di posisi acak)
      hasil.posisiSlideRapi = (Math.round(track.scrollLeft) % lebarSlide === 0);
    }
  }

  // --- Tidak boleh ada scroll horizontal ---
  hasil.tidakAdaScrollSamping = (document.documentElement.scrollWidth <= vw);

  return JSON.stringify(hasil, null, 1);
})();
