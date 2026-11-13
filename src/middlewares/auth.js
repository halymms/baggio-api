const checkRole = (roles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({ error: 'Acesso negado: permissão insuficiente.' });
    }
    next();
  };
};

module.exports = { checkRole };
