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

export async function fetchStatus() {
  return jsonp("status");
}

export async function fetchDashboard() {
  return jsonp("dashboard");
}

export async function refreshDashboard() {
  return jsonp("refresh");
}
