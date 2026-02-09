const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/auth/login');
  }
  next();
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.session.userId) {
      return res.redirect('/auth/login');
    }
    if (!allowedRoles.includes(req.session.userRole)) {
      return res.status(403).send('Forbidden');
    }
    next();
  };
};

module.exports = {
  requireAuth,
  requireRole,
};
