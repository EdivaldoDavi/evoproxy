import fetch from "node-fetch";

const EVO_URL = process.env.EVO_URL;
const EVO_TOKEN = process.env.EVO_TOKEN;

/**
 * Configura as preferências padrão de uma instância (como ignorar grupos)
 */
export async function setInstanceSettings(instanceId) {
  if (!instanceId) throw new Error("instanceId ausente");

  const url = `${EVO_URL.replace(/\/$/, "")}/settings/set/${encodeURIComponent(instanceId)}`;

const body = {
    rejectCall: false,
    msgCall: "",
    groupsIgnore: true,
    alwaysOnline: false,
    readMessages: false,
    readStatus: false,
    syncFullHistory: false
  };

  console.log("⚙️ Enviando configurações de instância:", url);
  console.log("📦 Body:", JSON.stringify(body, null, 2));

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVO_TOKEN
      },
      body: JSON.stringify(body)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("❌ Falha ao configurar settings:", data);
      throw new Error(data?.error || `Falha ao configurar settings (HTTP ${res.status})`);
    }

    console.log(`✅ Configurações aplicadas com sucesso na instância ${instanceId}`);
    return data;
  } catch (err) {
    console.error("🚨 Erro ao configurar settings:", err.message);
    throw err;
  }
}
