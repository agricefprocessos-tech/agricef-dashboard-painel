import { fetchStatus, fetchDashboard, refreshDashboard } from "./api.js";
import * as charts from "./charts.js";
import { renderGantt } from "./gantt.js";
import { renderWordCloud } from "./wordcloud.js";

function setupTabs() {
  document.querySelectorAll(".page-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".page-tab").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
      charts.resizeAll();
    });
  });
}

function currentPageIndex(pages) {
  return Array.from(pages).findIndex((p) => p.classList.contains("active"));
}

function setupSubPagination() {
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    const nav = panel.querySelector(".subpag-nav");
    const pages = panel.querySelectorAll(".page-grid");
    if (!nav) return;
    if (pages.length < 2) {
      nav.style.display = "none";
      return;
    }
    const indicator = nav.querySelector(".subpag-ind");
    const showPage = (index) => {
      const target = (index + pages.length) % pages.length;
      pages.forEach((p, i) => p.classList.toggle("active", i === target));
      indicator.textContent = `${target + 1}/${pages.length}`;
      charts.resizeAll();
    };
    nav.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => showPage(currentPageIndex(pages) + Number(btn.dataset.dir)));
    });
    indicator.textContent = `${currentPageIndex(pages) + 1}/${pages.length}`;
  });
}

function renderStatusBadge(status) {
  const badge = document.getElementById("sourceBadge");
  const variants = {
    mock: { cls: "live-badge mock", text: "Modo mock" },
    local: { cls: "live-badge local", text: "CSV local" },
  };
  const v = variants[status.dataSource] || {
    cls: "live-badge",
    text: `Jira: ${status.jiraProjectKeys.join(", ") || "?"}`,
  };
  badge.className = v.cls;
  badge.innerHTML = `<span class="live-dot"></span>${v.text}`;
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
  btn.classList.add("spinning");
  try {
    const payload = forceRefresh ? await refreshDashboard() : await fetchDashboard();
    renderAll(payload);
  } catch (err) {
    console.error(err);
    alert(`Erro ao carregar dados: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.classList.remove("spinning");
  }
}

const POLL_INTERVAL_MS = 5 * 60 * 1000;

async function init() {
  setupTabs();
  setupSubPagination();
  document.getElementById("refreshBtn").addEventListener("click", () => load({ forceRefresh: true }));
  try {
    const status = await fetchStatus();
    renderStatusBadge(status);
    await load();
  } finally {
    // sem isso, uma falha de rede deixaria o overlay travado na tela pra sempre
    document.getElementById("loadingOverlay").classList.add("hidden");
  }
  setInterval(() => load(), POLL_INTERVAL_MS);
}

init();
