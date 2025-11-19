// index.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import evoRoutes from "./evoRoutes.js";
import { resolveTenant } from "./auth.js";

const app = express();
const PORT = process.env.PORT || 3001;

// ==============================
//  CONFIG CORS
// ==============================
const origins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// Se você quiser restringir por domínio, use 'origins'.
// Por enquanto vou deixar liberado para qualquer origem se não tiver env.
const corsOptions = {
  origin: origins.length ? origins : "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "apikey",
    "X-Api-Key",
    "ngrok-skip-browser-warning",
    "Cache-Control",     // 👈 ESSENCIAL para resolver o erro
    "Authorization",     // 👈 útil se você usar token no header
  ],
  exposedHeaders: ["Content-Type"],
};

// Aplica CORS em todas as rotas
app.use(cors(corsOptions));

// Garante que o preflight (OPTIONS) usa a MESMA config
app.options("*", cors(corsOptions));

app.use(express.json());

// Middleware de identificação do tenant
app.use(resolveTenant);

// Healthcheck
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Rotas EvolutionAPI
app.use("/api/evo", evoRoutes);

// --- LISTEN ÚNICO ---
app.listen(PORT, () => {
  console.log(`🚀 evo-proxy rodando na porta ${PORT}`);
});
