import "dotenv/config";
import express from "express";
import cors from "cors";
import evoRoutes from "./evoRoutes.js";
import { resolveTenant } from "./auth.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Configurar CORS
const origins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "apikey",  "X-Api-Key",  "ngrok-skip-browser-warning"  ] // ✅ LIBERA O HEADER DO NGROK
  
}));

app.use(express.json());

// Middleware de identificação do tenant
app.use(resolveTenant);

// Healthcheck
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Rotas EvolutionAPI
app.use("/api/evo", evoRoutes);

app.listen(PORT, () => {
  console.log(`✅ evo-proxy rodando em http://localhost:${PORT}`);
});
