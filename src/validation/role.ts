function requireRole(role: "admin" | "registrar") {
  return (req, res, next) => {
    const user = req.user;
    if (!user || ![role, "admin"].includes(user.role)) {
      return res.status(403).send("Forbidden");
    }
    next();
  };
}