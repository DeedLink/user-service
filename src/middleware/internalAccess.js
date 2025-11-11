import dotenv from "dotenv";
dotenv.config();

export function internalAccessMiddleware(req, res, next) {
  const headerKey = req.headers["x-internal-key"];

  if (!headerKey || headerKey !== process.env.INTERNAL_ACCESS_KEY) {
    return res.status(403).json({ message: "Forbidden: Invalid or missing internal key" });
  }

  next();
}
