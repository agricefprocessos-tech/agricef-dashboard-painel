// Backend real: Google Apps Script Web App (mantém as credenciais do Jira
// server-side). Chamado via JSONP porque o CORS de Web Apps do Apps Script
// não é confiável com fetch() a partir de um domínio externo (GitHub Pages).
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwu74vT-BJ-9dMWe528qx5Sob1pk8I0RV3BrO3LpN_G5QN4Z22F4Z_cNMFjWZrB9CY/exec";

const JSONP_TIMEOUT_MS = 120000;
let jsonpCounter = 0;

function jsonp(action) {
  return new Promise((resolve, reject) => {
    const callbackName = `__dashboardJsonp${Date.now()}_${jsonpCounter++}`;
    const script = document.createElement("script");

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("Tempo esgotado ao contatar o servidor"));
    }, JSONP_TIMEOUT_MS);

    function cleanup() {
      clearTimeout(timeoutId);
      delete window[callbackName];
      script.remove();
    }

    window[callbackName] = (data) => {
      cleanup();
      if (data && data.error) reject(new Error(data.error));
      else resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Falha ao carregar dados do servidor"));
    };

    script.src = `${APPS_SCRIPT_URL}?action=${encodeURIComponent(action)}&callback=${callbackName}`;
    document.head.appendChild(script);
  });
}

// O Web App do Apps Script devolve esporadicamente uma página de erro do Google
// em vez da resposta (visto na prática: um 404 transitório entre duas chamadas
// idênticas). Uma segunda tentativa resolve, e sem ela o painel fica vazio.
async function withRetry(action) {
  try {
    return await jsonp(action);
  } catch {
    return jsonp(action);
  }
}

export async function fetchStatus() {
  return withRetry("status");
}

export async function fetchDashboard() {
  return withRetry("dashboard");
}

export async function refreshDashboard() {
  return withRetry("refresh");
}

export async function fetchCadastro() {
  return withRetry("cadastro");
}

// Escrita vai por POST. Content-Type text/plain mantém a requisição "simples"
// no CORS — com application/json o browser dispara preflight OPTIONS, que o
// Apps Script não responde.
export async function writeCadastro(action, payload) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(Object.assign({ action }, payload)),
  });
  if (!res.ok) throw new Error(`Falha ao gravar (HTTP ${res.status})`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}
