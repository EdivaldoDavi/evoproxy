import fetch from "node-fetch";

const EVO_URL = process.env.EVO_URL;
const EVO_TOKEN = process.env.EVO_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

export async function setWebhookForInstance(instanceId) {
  if (!instanceId) throw new Error("instanceId ausente");

  try {
    const url = `${EVO_URL.replace(/\/$/, "")}/webhook/set/${encodeURIComponent(instanceId)}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVO_TOKEN,
      },
      body: JSON.stringify({
        url: WEBHOOK_URL, // 🔹 vem do .env
        webhook_by_events: true,
        webhook_base64: true,
        events: [
          "APPLICATION_STARTUP",
          "MESSAGES_UPSERT",
          "MESSAGES_UPDATE",
          "CONNECTION_UPDATE",
          "QR_CODE_UPDATED",
        ],
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("❌ Falha ao configurar webhook:", data);
      throw new Error(data?.error || "Falha ao configurar webhook");
    }

    console.log(`✅ Webhook configurado para instância ${instanceId}`);
    return data;
  } catch (err) {
    console.error("🚨 Erro ao configurar webhook:", err.message);
    throw err;
  }
}
