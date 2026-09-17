import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { testConnection } from "./db.js";
import authRoutes from "./routes/auth.js";
import conversationRoutes from "./routes/conversations.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/conversations", conversationRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true }));

// Catches errors passed via next(err) from any route (see asyncHandler),
// so a bug in one request returns a clean error instead of crashing the server.
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

const PORT = process.env.PORT || 5000;

testConnection()
  .then(() => {
    console.log("Connected to MySQL");
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("Could not connect to MySQL. Check your .env settings.", err.message);
    process.exit(1);
  });
