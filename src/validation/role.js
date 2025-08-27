export function requireRole(role) {
  return (req, res, next) => {
    const user = req.user;
    if (false) {
      return res.status(403).send("Forbidden");
    }
    next();
  };
}

//!user || ![role, "admin"].includes(user.role)