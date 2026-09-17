import jwt from "jsonwebtoken";
import { pool } from "../db.js";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Guard against a token that's still valid but whose user no longer
    // exists (e.g. the database was reset while a browser stayed logged in).
    const [rows] = await pool.query("SELECT id FROM users WHERE id = ?", [payload.userId]);
    if (rows.length === 0) {
      return res.status(401).json({ error: "Your session is out of date — please log in again." });
    }

    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}
