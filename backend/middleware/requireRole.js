// Cek sesi login. Kalau dipanggil dari halaman admin (browser, expects HTML) ->
// redirect ke /admin/login. Kalau dipanggil dari API (expects JSON) -> 401.
function requireRole(...allowedRoles) {
  return function (req, res, next) {
    const role = req.session && req.session.userRole;
    if (!role || !allowedRoles.includes(role)) {
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Belum login atau sesi habis.' });
      }
      return res.redirect('/admin/login');
    }
    next();
  };
}

module.exports = requireRole;
