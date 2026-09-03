/* ============================================
   CART.JS — state keranjang belanja JavasMedia
   Dipakai bersama semua halaman (localStorage, tidak
   ada backend). Menangani: simpan/baca isi keranjang,
   badge jumlah di ikon keranjang, dropdown mini di
   desktop, dan tombol "+ Keranjang" cepat di katalog.

   Klik ikon keranjang:
   - Desktop (.header-cart)  -> buka dropdown mini
   - Mobile (.mh-icon cart)  -> langsung ke cart.html
   ============================================ */

(function () {
  var CART_KEY = 'jm_cart_v1';
  var WA_NUMBER = '6282143777463';

  function readCart() {
    try {
      var raw = localStorage.getItem(CART_KEY);
      var cart = raw ? JSON.parse(raw) : [];
      return Array.isArray(cart) ? cart : [];
    } catch (e) {
      return [];
    }
  }

  function writeCart(cart) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {}
    renderBadges();
    renderDropdown();
    if (typeof window.onCartChange === 'function') window.onCartChange();
  }

  function cartCount(cart) {
    return cart.reduce(function (sum, item) { return sum + item.qty; }, 0);
  }

  function cartTotal(cart) {
    return cart.reduce(function (sum, item) { return sum + item.price * item.qty; }, 0);
  }

  function formatRupiah(n) {
    return 'Rp ' + Math.round(n).toLocaleString('id-ID');
  }

  function slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function addToCart(item) {
    var cart = readCart();
    var existing = null;
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === item.id && cart[i].variant === item.variant) { existing = cart[i]; break; }
    }
    if (existing) {
      existing.qty += item.qty;
    } else {
      cart.push(item);
    }
    writeCart(cart);
  }

  function removeFromCart(index) {
    var cart = readCart();
    cart.splice(index, 1);
    writeCart(cart);
  }

  function setQty(index, qty) {
    var cart = readCart();
    if (!cart[index]) return;
    qty = parseInt(qty, 10);
    if (!qty || qty < 1) qty = 1;
    cart[index].qty = qty;
    writeCart(cart);
  }

  function quickAddToCart(btnEl) {
    var card = btnEl.closest('.product-card');
    if (!card) return;
    var nameEl = card.querySelector('.product-name');
    var priceEl = card.querySelector('.price-new');
    var imgEl = card.querySelector('.product-img');
    var name = nameEl ? nameEl.textContent.trim() : 'Produk';
    var price = priceEl ? parseInt(priceEl.textContent.replace(/[^0-9]/g, ''), 10) || 0 : 0;
    var emoji = imgEl ? imgEl.textContent.trim() : '🛍️';
    addToCart({ id: slugify(name), name: name, variant: '', price: price, qty: 1, emoji: emoji });

    var original = btnEl.textContent;
    btnEl.textContent = '✓ Ditambahkan';
    btnEl.classList.add('added');
    btnEl.disabled = true;
    setTimeout(function () {
      btnEl.textContent = original;
      btnEl.classList.remove('added');
      btnEl.disabled = false;
    }, 1200);
  }

  window.addToCart = addToCart;
  window.cartRemove = removeFromCart;
  window.cartSetQty = setQty;
  window.quickAddToCart = quickAddToCart;
  window.readCart = readCart;
  window.cartTotal = cartTotal;
  window.cartCount = cartCount;
  window.formatRupiah = formatRupiah;
  window.cartWaNumber = WA_NUMBER;

  /* ---- Badge jumlah item ---- */
  function ensureDesktopBadge() {
    var header = document.querySelector('.header-cart');
    if (!header) return null;
    var container = header.parentElement;
    var badge = container.querySelector(':scope > .cart-badge-desktop');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'cart-badge cart-badge-desktop';
      container.appendChild(badge);
    }
    return badge;
  }

  function ensureMobileBadge(iconEl) {
    var wrap = iconEl.closest('.mh-cart-wrap');
    if (!wrap) {
      wrap = document.createElement('span');
      wrap.className = 'mh-cart-wrap';
      iconEl.parentNode.insertBefore(wrap, iconEl);
      wrap.appendChild(iconEl);
    }
    var badge = wrap.querySelector('.cart-badge-mobile');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'cart-badge cart-badge-mobile';
      wrap.appendChild(badge);
    }
    return badge;
  }

  function renderBadges() {
    var cart = readCart();
    var count = cartCount(cart);
    document.querySelectorAll('.cart-badge').forEach(function (b) {
      if (count > 0) {
        b.textContent = count > 99 ? '99+' : String(count);
        b.style.display = 'flex';
      } else {
        b.style.display = 'none';
      }
    });
  }

  /* ---- Dropdown mini (desktop) ---- */
  var dropdownEl = null;
  var dropdownOpen = false;

  function buildDropdown() {
    if (dropdownEl) return dropdownEl;
    dropdownEl = document.createElement('div');
    dropdownEl.className = 'cart-dropdown';
    document.body.appendChild(dropdownEl);
    dropdownEl.addEventListener('click', function (e) { e.stopPropagation(); });
    return dropdownEl;
  }

  function renderDropdown() {
    if (!dropdownEl) return;
    var cart = readCart();
    if (cart.length === 0) {
      dropdownEl.innerHTML = '<div class="cart-dd-empty">🛒<br>Keranjang masih kosong</div>';
      return;
    }
    var visible = cart.slice(0, 4);
    var html = '<div class="cart-dd-list">';
    visible.forEach(function (item) {
      var realIndex = cart.indexOf(item);
      html += '<div class="cart-dd-item">' +
        '<div class="cart-dd-img">' + (item.emoji || '🛍️') + '</div>' +
        '<div class="cart-dd-info">' +
          '<div class="cart-dd-name">' + item.name + '</div>' +
          (item.variant ? '<div class="cart-dd-variant">' + item.variant + '</div>' : '') +
          '<div class="cart-dd-qty-price">' + item.qty + ' × ' + formatRupiah(item.price) + '</div>' +
        '</div>' +
        '<button class="cart-dd-remove" onclick="cartRemove(' + realIndex + ')" aria-label="Hapus">&times;</button>' +
      '</div>';
    });
    html += '</div>';
    if (cart.length > 4) {
      html += '<div class="cart-dd-more">+' + (cart.length - 4) + ' produk lainnya</div>';
    }
    html += '<div class="cart-dd-total"><span>Subtotal</span><strong>' + formatRupiah(cartTotal(cart)) + '</strong></div>';
    html += '<a href="cart.html" class="cart-dd-viewall">Lihat Semua Keranjang →</a>';
    dropdownEl.innerHTML = html;
  }

  function positionDropdown(anchorEl) {
    var rect = anchorEl.getBoundingClientRect();
    dropdownEl.style.top = (rect.bottom + 10) + 'px';
    var right = window.innerWidth - rect.right - 8;
    dropdownEl.style.right = Math.max(right, 12) + 'px';
  }

  function openDropdown(anchorEl) {
    buildDropdown();
    renderDropdown();
    positionDropdown(anchorEl);
    dropdownEl.classList.add('open');
    dropdownOpen = true;
  }

  function closeDropdown() {
    if (dropdownEl) dropdownEl.classList.remove('open');
    dropdownOpen = false;
  }

  function toggleDropdown(anchorEl) {
    if (dropdownOpen) { closeDropdown(); } else { openDropdown(anchorEl); }
  }

  document.addEventListener('click', function (e) {
    if (dropdownOpen && dropdownEl && !dropdownEl.contains(e.target) && !e.target.closest('.header-cart')) {
      closeDropdown();
    }
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth <= 768) closeDropdown();
    else if (dropdownOpen) positionDropdown(document.querySelector('.header-cart'));
  });

  /* ---- Init: pasang klik di ikon keranjang desktop & mobile ---- */
  function init() {
    var desktopCart = document.querySelector('.header-cart');
    if (desktopCart) {
      desktopCart.removeAttribute('onclick');
      desktopCart.style.cursor = 'pointer';
      ensureDesktopBadge();
      desktopCart.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleDropdown(desktopCart);
      });
    }

    document.querySelectorAll('.mh-icon').forEach(function (icon) {
      if (icon.getAttribute('src') === 'cart.png') {
        icon.removeAttribute('onclick');
        icon.style.cursor = 'pointer';
        ensureMobileBadge(icon);
        icon.addEventListener('click', function () { location.href = 'cart.html'; });
      }
    });

    renderBadges();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
