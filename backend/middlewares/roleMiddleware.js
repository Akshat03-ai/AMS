function authorizeRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const userRole = req.user.role;

    // Allow passing either a single role string or an array of roles
    if (Array.isArray(requiredRole)) {
      if (!requiredRole.includes(userRole)) {
        return res.status(403).json({ message: "Access denied" });
      }
    } else {
      if (userRole !== requiredRole) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    next();
  };
}

module.exports = authorizeRole;
