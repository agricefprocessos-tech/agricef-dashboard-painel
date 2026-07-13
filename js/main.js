import { fetchStatus, fetchDashboard, refreshDashboard } from "./api.js";
import * as charts from "./charts.js";
import { renderGantt } from "./gantt.js";
import { renderWordCloud } from "./wordcloud.js";

function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
    });
  });
}

function renderStatusBadge(status) {
  const badge = document.getElementById("sourceBadge");
  if (status.dataSource === "mock") {
    badge.textContent = "Modo mock (dados sintéticos)";
    badge.className = "badge mock";
  } else if (status.dataSource === "local") {
    badge.textContent = "Dados reais (CSV local)";
    badge.className = "badge local";
  } else {
    badge.textContent = `Jira: ${status.jiraProjectKeys.join(", ") || "?"}`;
    badge.className = "badge jira";
  }
}

function renderLastUpdated(cache) {
  const el = document.getElementById("lastUpdated");
  if (!cache?.fetchedAt) return;
  const date = new Date(cache.fetchedAt);
  el.textContent = `Atualizado em ${date.toLocaleString("pt-BR")}`;
}

function renderAll(payload) {
  const { indicators, capacity } = payload;

  charts.renderKpis(indicators);
  charts.renderStatusEntrega(indicators);
  charts.renderOrigemTempo(indicators);
  charts.renderConcluidasPorMes(indicators);
  charts.renderConcluidasPorPessoa(indicators);
  charts.renderEstimativaXGasto(indicators);
  charts.renderTempoPorTipo(indicators);
  charts.renderLeadTimeBoxplot(indicators);
  charts.renderComparativo(indicators);
  charts.renderCriadasXIniciadas(indicators);
  charts.renderWip(indicators);
  charts.renderPorRelator(indicators);
  renderWordCloud("chartWordCloud", indicators.wordCloud);

  charts.renderCapacity("chartCapAEM", capacity.demandaXCapacidade);
  charts.renderCapacity("chartCapAEE", capacity.demandaXCapacidade);
  charts.renderCapacity("chartCapAVL", capacity.demandaXCapacidade);
  renderGantt("ganttAEM", capacity.gantt.AEM);
  renderGantt("ganttAEE", capacity.gantt.AEE);
  renderGantt("ganttAVL", capacity.gantt.AVL);

  charts.renderDataQualityTempo(indicators);
  charts.renderDataQualityTipo(indicators);
  charts.renderCycleTime(indicators);
  charts.renderThroughput(indicators);
  charts.renderEstabilidade(indicators);

  renderLastUpdated(payload.cache);
}

async function load({ forceRefresh = false } = {}) {
  const btn = document.getElementById("refreshBtn");
  btn.disabled = true;
  btn.textContent = "Atualizando…";
  try {
    const payload = forceRefresh ? await refreshDashboard() : await fetchDashboard();
    renderAll(payload);
  } catch (err) {
    console.error(err);
    alert(`Erro ao carregar dados: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = "Atualizar dados";
  }
}

const POLL_INTERVAL_MS = 5 * 60 * 1000;

async function init() {
  setupTabs();
  const status = await fetchStatus();
  renderStatusBadge(status);
  document.getElementById("refreshBtn").addEventListener("click", () => load({ forceRefresh: true }));
  await load();
  setInterval(() => load(), POLL_INTERVAL_MS);
}

init();
