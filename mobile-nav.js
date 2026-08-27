(function () {
  function qs(sel) { return document.querySelector(sel); }

  function initDrawer() {
    var hamburger = qs('.mh-hamburger');
    var drawer = qs('.mobile-nav-drawer');
    var overlay = qs('.mobile-nav-overlay');
    var closeBtn = qs('.mnd-close');
    var searchToggle = qs('.mh-search-toggle');
    var searchBox = qs('.mh-search-box');
    var searchClose = qs('.mh-search-close');

    function openDrawer() {
      if (drawer) drawer.classList.add('open');
      if (overlay) overlay.classList.add('open');
    }
    function closeDrawer() {
      if (drawer) drawer.classList.remove('open');
      if (overlay) overlay.classList.remove('open');
    }
    if (hamburger) hamburger.addEventListener('click', openDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (overlay) overlay.addEventListener('click', closeDrawer);

    if (searchToggle && searchBox) {
      searchToggle.addEventListener('click', function () {
        searchBox.classList.toggle('open');
      });
    }
    if (searchClose && searchBox) {
      searchClose.addEventListener('click', function () {
        searchBox.classList.remove('open');
      });
    }
  }

  function applyScale() {
    var wrap = qs('.mobile-scale-wrap');
    var inner = qs('.mobile-scale-inner');
    if (!wrap || !inner) return;
    if (window.innerWidth <= 768) {
      var scale = window.innerWidth / 1440;
      inner.style.transform = 'scale(' + scale + ')';
      wrap.style.height = Math.ceil(inner.scrollHeight * scale) + 'px';
    } else {
      inner.style.transform = '';
      wrap.style.height = '';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    initDrawer();
    applyScale();
  });
  window.addEventListener('load', applyScale);
  window.addEventListener('resize', applyScale);
  // Re-check after images/fonts settle
  setTimeout(applyScale, 400);
  setTimeout(applyScale, 1200);
})();
