import { Router } from "express";
import fetch from "node-fetch";

const router = Router();

const EVO_URL = process.env.EVO_URL;
const EVO_TOKEN = process.env.EVO_TOKEN;
const WEBHOOK_PUBLIC_URL = process.env.WEBHOOK_PUBLIC_URL;

// ✅ Memórias locais (RAM)
const qrMemory = {};
const statusMemory = {};

/* ============================================================
   HEADERS EvolutionAPI
============================================================ */
function evoHeaders() {
  return {
    "Content-Type": "application/json",
    apikey: EVO_TOKEN,
  };
}

/* ============================================================
   Resolve instanceId → sempre tenant_<id>
============================================================ */
function resolveTenantInstance(req) {
  const id =
    req.params?.instanceId ||    // ✅ CORRETO AGORA
    req.query?.instanceId ||
    req.body?.instanceId ||
    "";

  if (!id || typeof id !== "string") return null;

  return id.replace(/^tenant_/, "").trim();
}


/* ============================================================
   WEBHOOK — recebe QR e STATUS
============================================================ */
router.post("/webhook", (req, res) => {
  const payload = req.body;
  const instanceId = payload?.instanceId;
  if (!instanceId) return res.sendStatus(200);

  // ✅ QR
  const qr =
    payload?.qr?.base64 ||
    payload?.qrcode?.base64 ||
    payload?.base64 ||
    null;

  if (qr) qrMemory[instanceId] = qr;

  // ✅ STATUS
  if (payload?.status) statusMemory[instanceId] = payload.status;

  return res.sendStatus(200);
});

/* ============================================================
   Obter STATUS da instância
============================================================ */
// evoRoutes.js
async function getInstanceStatus(name) {
  try {
    const r = await fetch(`${EVO_URL}/instance/connectionState/${name}`, {
      headers: evoHeaders(),
    });

    if (!r.ok) return "UNKNOWN";

    const j = await r.json();
    const raw = j?.instance?.state || j?.state || "UNKNOWN";
    const s = String(raw).toLowerCase();

    if (s === "open") return "CONNECTED";
    if (s === "close") return "DISCONNECTED";
    if (s === "openning") return "OPENING";

    return "UNKNOWN";
  } catch {
    return "UNKNOWN";
  }
}

/* ============================================================
 ✅ START — cria 1 instância fixa por tenant
============================================================ */
/* ============================================================
 ✅ START — usa instância existente se já foi criada
============================================================ */
router.post("/start", async (req, res) => {
  const instanceName = resolveTenantInstance(req);

  if (!instanceName) {
    return res.status(400).json({ error: "instanceId não informado" });
  }

  console.log("🟦 [START] Instance =", instanceName);

  try {
    // ✅ 1. Verifica se já existe no EvolutionAPI
    const exists = await fetch(
      `${EVO_URL}/instance/fetchInstances?instanceName=${instanceName}`,
      { headers: evoHeaders() }
    );

    const list = await exists.json();

    if (Array.isArray(list) && list.length > 0) {
      console.log("✅ Instância já existe, usando ela");
      return res.json({
        usedInstanceName: instanceName,
        instanceName,
        exists: true,
      });
    }

    // ✅ 2. Se não existir → cria
    console.log("➕ Criando nova instância:", instanceName);

    const body = {
      instanceName,
      token: "",
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
      pairing: false,
      webhookUrl: WEBHOOK_PUBLIC_URL,
      webhook_by_events: true,
      events: ["QRCODE_UPDATED", "APPLICATION_STARTUP"],
    };

    const resp = await fetch(`${EVO_URL}/instance/create`, {
      method: "POST",
      headers: evoHeaders(),
      body: JSON.stringify(body),
    });

    const data = await resp.json();

    return res.status(resp.status).json({
      ...data,
      usedInstanceName: instanceName,
      exists: false,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/* ============================================================
 ✅ STATUS
============================================================ */
router.get("/status", async (req, res) => {
  const instanceId = resolveTenantInstance(req);
  if (!instanceId)
    return res.status(400).json({ error: "instanceId requerido" });

  const status = await getInstanceStatus(instanceId);
  return res.json({ status });
});

/* ============================================================
 ✅ QR — fallback
============================================================ */
router.get("/qr", async (req, res) => {
  const instanceId = resolveTenantInstance(req);
  if (!instanceId)
    return res.status(400).json({ error: "instanceId requerido" });

  try {
    const r = await fetch(`${EVO_URL}/instance/connect/${instanceId}`, {
      headers: evoHeaders(),
    });

    return res.json(await r.json());
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

/* ============================================================
 ✅ CONNECT manual
============================================================ */
router.get("/instance/connect/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const r = await fetch(`${EVO_URL}/instance/connect/${id}`, {
      headers: evoHeaders(),
    });

    return res.json(await r.json());
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
/* ============================================================
 ✅ DELETE INSTANCE  (rota real que fala com EvolutionAPI)
============================================================ */
/* ============================================================
 ✅ DELETE INSTANCE (rota real da EvolutionAPI)
============================================================ */
// src/evoRoutes.js
router.delete("/instance/delete/:instanceId", async (req, res) => {
  console.log("✅ ROTA DELETE CARREGADA");

  const instanceId =
    req.params?.instanceId ||
    req.query?.instanceId ||
    req.body?.instanceId ||
    "";

  if (!instanceId || typeof instanceId !== "string") {
    return res.status(400).json({ error: "instanceId inválido" });
  }

  try {
    const url = `${EVO_URL}/instance/delete/${instanceId}`;
    console.log("🗑️ DELETE EvolutionAPI →", url);

    const evoRes = await fetch(url, {
      method: "DELETE",
      headers: {
        apikey: EVO_TOKEN,
        "Content-Type": "application/json",
      },
    });

    const payload = await evoRes.json();

    // ✅ limpa memórias locais para não reenviar QR
    try {
      delete qrMemory[instanceId];
      delete statusMemory[instanceId];
    } catch {}

    // devolve exatamente o status da Evolution para facilitar debug
    return res.status(evoRes.status).json(payload);

  } catch (err) {
    console.error("Erro ao deletar sessão:", err);
    return res.status(500).json({ error: err.message || "Erro ao deletar sessão" });
  }
});

/* ============================================================
 ✅ LOGOUT — deletar instância REAL
============================================================ */
router.post("/evo/:instanceId/logout", async (req, res) => {
  const instanceId = resolveTenantInstance(req);

  if (!instanceId) return res.status(400).json({ error: "instanceId inválido" });

  const url = `${EVO_URL}/instance/delete/${instanceId}`;
console.log('url de logout:', url);
  const evoRes = await fetch(url, {
    method: "DELETE",
    headers: {
      apikey: EVO_TOKEN,
      "Content-Type": "application/json",
    },
  });

  return res.json(await evoRes.json());
});

router.get("/evo/instance/exists/:id", (req, res) => {
  const { id } = req.params;
  const exists = qrMemory[id] !== undefined; // ou a lógica que você usa para armazenar instâncias
  return res.status(exists ? 200 : 404).json({ exists });
});

router.get("/evo/instance/info/:id", (req, res) => {
  const { id } = req.params;
  const exists = qrMemory[id] !== undefined;
  if (!exists) return res.status(404).json({ exists: false });
  return res.json({
    exists: true,
    instance: { id, state: "OPEN", phoneConnected: false },
  });
});


/* ============================================================
 ✅ STREAM SSE — STATUS + QR (perfeito, sem loop errado)
============================================================ */
router.get("/stream", async (req, res) => {
  const instanceId = resolveTenantInstance(req);
  if (!instanceId) {
    res.write("event: error\ndata: \"instanceId não informado\"\n\n");
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  console.log("✅ SSE conectado:", instanceId);

  let stopped = false;

  const send = (ev, data) => {
    res.write(`event: ${ev}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  req.on("close", () => {
    stopped = true;
    console.log("🔴 SSE fechado");
  });

  async function loop() {
    if (stopped) return;

  const status = await getInstanceStatus(instanceId);

send("status", { status });

// quando NÃO conectado → envie QR
if (status !== "CONNECTED" && qrMemory[instanceId]) {
  send("qr", { base64: qrMemory[instanceId] });
}

// quando conectar → limpe QR
if (status === "CONNECTED") {
  qrMemory[instanceId] = null;
}

    setTimeout(loop, 1500);
  }

  loop();
});

export default router;
