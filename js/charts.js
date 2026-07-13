// Renderização de todos os gráficos com Chart.js (carregado globalmente via CDN no index.html).
const COLORS = {
  blue: "#2f6fed",
  green: "#12b76a",
  orange: "#f79009",
  red: "#f04438",
  gray: "#98a2b3",
  purple: "#7a5af8",
  teal: "#06aed4",
  yellow: "#eaaa08",
};

const STATUS_COLORS = {
  "No Prazo": COLORS.green,
  "Fora do Prazo": COLORS.red,
  Pendente: COLORS.orange,
  "Não Estimado": COLORS.gray,
};

const instances = new Map();

function renderChart(canvasId, config) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  if (instances.has(canvasId)) instances.get(canvasId).destroy();
  // Chart.js muta o objeto `options` em memória (injeta escalas resolvidas etc).
  // Como vários gráficos compartilham o mesmo `baseOptions` por referência, sem
  // clonar aqui um gráfico "bar" contaminaria o próximo gráfico "pie" com eixos
  // que ele não deveria ter. Clonar isola cada instância.
  const isolatedConfig = { ...config, options: structuredClone(config.options || {}) };
  const chart = new Chart(canvas, isolatedConfig);
  instances.set(canvasId, chart);
  return chart;
}

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { boxWidth: 12, font: { size: 11 } } } },
};

export function renderKpis(indicators) {
  const el = document.getElementById("kpiRow");
  const m = indicators.melhorias;
  const pctRegistrado = m.dataQuality.tempo.pct_registrado;
  const cards = [
    { label: "Total de Tarefas", value: indicators.totalIssues, sub: null },
    { label: "WIP Atual", value: indicators.wipAtual, sub: "tarefas em andamento" },
    { label: "Lead Time Médio", value: indicators.leadTimeMedioHoras ? `${Math.round(indicators.leadTimeMedioHoras)}h` : "—", sub: "início → resolução" },
    { label: "No Prazo", value: indicators.statusEntregaCounts["No Prazo"], sub: `${pctOf(indicators.statusEntregaCounts, "No Prazo")}% do total` },
    { label: "Fora do Prazo", value: indicators.statusEntregaCounts["Fora do Prazo"], sub: `${pctOf(indicators.statusEntregaCounts, "Fora do Prazo")}% do total` },
    { label: "Dado Real (não estimado)", value: pctRegistrado !== null ? `${Math.round(pctRegistrado * 100)}%` : "—", sub: "tempo apontado vs. calculado" },
    { label: "Taxa de Retrabalho", value: `${Math.round(m.taxaRetrabalho.pct * 100)}%`, sub: `${m.taxaRetrabalho.total_com_retrabalho} tarefas reabertas` },
    { label: "Forecast do WIP", value: m.forecastSemanas ? `~${m.forecastSemanas} sem.` : "—", sub: "no ritmo atual de entrega" },
  ];
  el.innerHTML = cards
    .map(
      (c) => `<div class="kpi-card">
        <div class="kpi-label">${c.label}</div>
        <div class="kpi-value">${c.value}</div>
        ${c.sub ? `<div class="kpi-sub">${c.sub}</div>` : ""}
      </div>`
    )
    .join("");
}

function pctOf(counts, key) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (!total) return 0;
  return Math.round((counts[key] / total) * 100);
}

export function renderStatusEntrega(indicators) {
  const counts = indicators.statusEntregaCounts;
  const labels = Object.keys(counts);
  renderChart("chartStatusEntrega", {
    type: "pie",
    data: {
      labels,
      datasets: [{ data: labels.map((l) => counts[l]), backgroundColor: labels.map((l) => STATUS_COLORS[l]) }],
    },
    options: baseOptions,
  });
}

export function renderOrigemTempo(indicators) {
  const rows = indicators.origemTempoGasto;
  const colorMap = { registrado: COLORS.green, calculado: COLORS.orange, "não calculado": COLORS.gray };
  renderChart("chartOrigemTempo", {
    type: "pie",
    data: {
      labels: rows.map((r) => r.origem),
      datasets: [{ data: rows.map((r) => r.total), backgroundColor: rows.map((r) => colorMap[r.origem] || COLORS.gray) }],
    },
    options: baseOptions,
  });
}

export function renderConcluidasPorMes(indicators) {
  const rows = indicators.concluidasPorMes;
  renderChart("chartConcluidasPorMes", {
    type: "bar",
    data: { labels: rows.map((r) => r.label), datasets: [{ label: "Concluídas", data: rows.map((r) => r.total), backgroundColor: COLORS.blue }] },
    options: baseOptions,
  });
}

export function renderConcluidasPorPessoa(indicators) {
  const rows = indicators.concluidasPorPessoaMesVigente;
  renderChart("chartConcluidasPorPessoa", {
    type: "pie",
    data: {
      labels: rows.map((r) => r.responsavel),
      datasets: [{ data: rows.map((r) => r.total), backgroundColor: palette(rows.length) }],
    },
    options: baseOptions,
  });
}

export function renderEstimativaXGasto(indicators) {
  const rows = indicators.estimativaXGastoPorMes;
  renderChart("chartEstimativaXGasto", {
    type: "line",
    data: {
      labels: rows.map((r) => r.label),
      datasets: [
        { label: "Estimativa (h)", data: rows.map((r) => round1(r.estimativa_original_corrigida)), borderColor: COLORS.blue, backgroundColor: COLORS.blue, tension: 0.25 },
        { label: "Tempo gasto (h)", data: rows.map((r) => round1(r.tempo_gasto_corrigido)), borderColor: COLORS.red, backgroundColor: COLORS.red, tension: 0.25 },
      ],
    },
    options: baseOptions,
  });
}

export function renderTempoPorTipo(indicators) {
  const rows = indicators.tempoPorTipoTarefa;
  renderChart("chartTempoPorTipo", {
    type: "bar",
    data: {
      labels: rows.map((r) => r.tipo_de_tarefa),
      datasets: [{ label: "Horas", data: rows.map((r) => round1(r.tempo_gasto_corrigido)), backgroundColor: COLORS.purple }],
    },
    options: { ...baseOptions, indexAxis: "y" },
  });
}

// Boxplot desenhado com barras flutuantes nativas do Chart.js (sem plugin extra):
// uma barra fina para o range min-max (whiskers) e uma barra grossa para o IQR (q1-q3),
// mais um marcador de mediana.
export function renderLeadTimeBoxplot(indicators) {
  const rows = indicators.leadTimePorTipo.filter((r) => r.stats);
  const labels = rows.map((r) => r.tipo_de_tarefa);
  renderChart("chartLeadTimeBoxplot", {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Min–Max",
          data: rows.map((r) => [r.stats.min, r.stats.max]),
          backgroundColor: "rgba(47,111,237,0.15)",
          barThickness: 6,
        },
        {
          label: "Q1–Q3 (IQR)",
          data: rows.map((r) => [r.stats.q1, r.stats.q3]),
          backgroundColor: "rgba(47,111,237,0.55)",
          barThickness: 24,
        },
        {
          label: "Mediana",
          data: rows.map((r) => [r.stats.median - 0.15, r.stats.median + 0.15]),
          backgroundColor: COLORS.red,
          barThickness: 26,
        },
      ],
    },
    options: {
      ...baseOptions,
      indexAxis: "y",
      scales: { x: { title: { display: true, text: "dias" } } },
    },
  });
}

export function renderComparativo(indicators) {
  const rows = indicators.comparativoPorMes;
  renderChart("chartComparativo", {
    type: "bar",
    data: {
      labels: rows.map((r) => r.label),
      datasets: [
        { label: "Deveria ser entregue", data: rows.map((r) => r.deveria_ser_entregue), backgroundColor: COLORS.gray },
        { label: "No Prazo", data: rows.map((r) => r.no_prazo), backgroundColor: COLORS.green },
        { label: "Fora do Prazo", data: rows.map((r) => r.fora_do_prazo), backgroundColor: COLORS.red },
        { label: "Pendente", data: rows.map((r) => r.pendente), backgroundColor: COLORS.orange },
      ],
    },
    options: baseOptions,
  });
}

export function renderCriadasXIniciadas(indicators) {
  const rows = indicators.criadasXIniciadasPorMes;
  renderChart("chartCriadasXIniciadas", {
    type: "line",
    data: {
      labels: rows.map((r) => r.label),
      datasets: [
        { label: "Criadas", data: rows.map((r) => r.criadas), borderColor: COLORS.blue, tension: 0.25 },
        { label: "Iniciadas", data: rows.map((r) => r.iniciadas), borderColor: COLORS.teal, tension: 0.25 },
      ],
    },
    options: baseOptions,
  });
}

export function renderWip(indicators) {
  const rows = indicators.wipPorMes;
  renderChart("chartWip", {
    type: "line",
    data: { labels: rows.map((r) => r.label), datasets: [{ label: "WIP", data: rows.map((r) => r.wip), borderColor: COLORS.purple, backgroundColor: "rgba(122,90,248,0.15)", fill: true, tension: 0.25 }] },
    options: baseOptions,
  });
}

export function renderPorRelator(indicators) {
  const rows = indicators.porRelator;
  renderChart("chartPorRelator", {
    type: "bar",
    data: { labels: rows.map((r) => r.relator), datasets: [{ label: "Tarefas", data: rows.map((r) => r.total), backgroundColor: COLORS.teal }] },
    options: { ...baseOptions, indexAxis: "y" },
  });
}

export function renderCapacity(canvasId, weeks) {
  const disc = canvasId.replace("chartCap", "").toLowerCase();
  renderChart(canvasId, {
    type: "bar",
    data: {
      labels: weeks.map((w) => `S${w.semana}/${w.ano}`),
      datasets: [
        { label: "Demandado", data: weeks.map((w) => w[`hd_${disc}`]), backgroundColor: COLORS.gray },
        { label: "Capacidade Efetiva", data: weeks.map((w) => w[`hd_${disc}_2`]), backgroundColor: COLORS.blue },
        { label: "Alocado", data: weeks.map((w) => w[`ha_${disc}`]), backgroundColor: COLORS.orange },
      ],
    },
    options: baseOptions,
  });
}

export function renderDataQualityTempo(indicators) {
  const t = indicators.melhorias.dataQuality.tempo;
  renderChart("chartDataQualityTempo", {
    type: "pie",
    data: {
      labels: ["Registrado (real)", "Calculado (rateio)", "Não calculado"],
      datasets: [{ data: [t.registrado, t.calculado, t.nao_calculado], backgroundColor: [COLORS.green, COLORS.orange, COLORS.gray] }],
    },
    options: baseOptions,
  });
}

export function renderDataQualityTipo(indicators) {
  const c = indicators.melhorias.dataQuality.classificacao_tipo;
  renderChart("chartDataQualityTipo", {
    type: "pie",
    data: {
      labels: ["Campo nativo do Jira", "Label do Jira", "Palavra-chave (fallback)", "Não classificado"],
      datasets: [{
        data: [c.campo_nativo, c.label_jira, c.palavra_chave, c.nao_classificado],
        backgroundColor: [COLORS.teal, COLORS.green, COLORS.blue, COLORS.gray],
      }],
    },
    options: baseOptions,
  });
}

export function renderCycleTime(indicators) {
  const rows = indicators.melhorias.cycleTimePorStatus;
  renderChart("chartCycleTime", {
    type: "bar",
    data: { labels: rows.map((r) => r.status), datasets: [{ label: "Média (h)", data: rows.map((r) => round1(r.media_horas)), backgroundColor: COLORS.purple }] },
    options: { ...baseOptions, indexAxis: "y" },
  });
}

export function renderThroughput(indicators) {
  const rows = indicators.melhorias.throughputSemanal;
  const media = indicators.melhorias.throughputMedioSemanal;
  renderChart("chartThroughput", {
    type: "bar",
    data: {
      labels: rows.map((r) => `S${r.semana}`),
      datasets: [
        { label: "Concluídas/semana", data: rows.map((r) => r.concluidas), backgroundColor: COLORS.blue },
        { label: "Média (8 sem.)", data: rows.map(() => round1(media)), type: "line", borderColor: COLORS.red, pointRadius: 0 },
      ],
    },
    options: baseOptions,
  });
}

export function renderEstabilidade(indicators) {
  const rows = indicators.melhorias.estabilidadePorResponsavel;
  renderChart("chartEstabilidade", {
    type: "bar",
    data: {
      labels: rows.map((r) => r.responsavel),
      datasets: [
        { label: "Remarcações de Start date", data: rows.map((r) => r.soma_startdate_changes), backgroundColor: COLORS.blue },
        { label: "Remarcações de Data Limite", data: rows.map((r) => r.soma_duedate_changes), backgroundColor: COLORS.red },
      ],
    },
    options: baseOptions,
  });
}

function palette(n) {
  const base = Object.values(COLORS);
  const out = [];
  for (let i = 0; i < n; i++) out.push(base[i % base.length]);
  return out;
}
function round1(v) {
  return v === null || v === undefined ? null : Math.round(v * 10) / 10;
}
