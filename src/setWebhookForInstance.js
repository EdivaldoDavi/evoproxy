import fetch from "node-fetch";

const EVO_URL = process.env.EVO_URL;
const EVO_TOKEN = process.env.EVO_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
 
export async function setWebhookForInstance(instanceId) {
  if (!instanceId) throw new Error("instanceId ausente");

  try {
    const url = `${EVO_URL.replace(/\/$/, "")}/webhook/set/${encodeURIComponent(instanceId)}`;

  const body = {
  enabled: true,
  url: WEBHOOK_URL,
    "byEvents": true,
    "base64": true,
  events: [
    "APPLICATION_STARTUP",
    "MESSAGES_UPSERT",
    "MESSAGES_UPDATE",
    "CONNECTION_UPDATE",
    "QRCODE_UPDATED"
  ]
};



    console.log("➡️ Enviando para EvolutionAPI:", url);
    console.log("📦 Body:", JSON.stringify(body, null, 2));

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVO_TOKEN
      },
      body: JSON.stringify(body)
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      console.error("❌ Falha ao configurar webhook (detalhes brutos):", data);
      if (data?.response?.message) {
        console.error("📛 Mensagem detalhada EvolutionAPI:", data.response.message);
      }
      throw new Error(data?.error || `Falha ao configurar webhook (HTTP ${res.status})`);
    }

    console.log(`✅ Webhook configurado com sucesso para instância ${instanceId}`);
    return data;
  } catch (err) {
    console.error("🚨 Erro ao configurar webhook:", err.message);
    throw err;
  }
}
