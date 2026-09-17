// Renderização de todos os gráficos com Chart.js (carregado globalmente via CDN no index.html).
// Paleta e defaults espelham o "Dashboard de Produção 2.0" da AGRICEF, para os
// dois painéis parecerem o mesmo produto.
const COLORS = {
  amber: "#f0b429",
  blue: "#38bdf8",
  green: "#4ade80",
  red: "#f87171",
  orange: "#fb923c",
  purple: "#a78bfa",
  cyan: "#67e8f9",
  sand: "#fde68a",
  gray: "#8b949e",
};

const PALETTE = [
  "#f0b429", "#38bdf8", "#4ade80", "#f87171", "#a78bfa", "#fb923c", "#67e8f9",
  "#fde68a", "#86efac", "#fdba74", "#c084fc", "#6ee7b7", "#fca5a5", "#93c5fd",
];

const GRID = "#2a3245";

Chart.defaults.color = "#8b949e";
Chart.defaults.borderColor = GRID;
Chart.defaults.font.family = "Barlow, sans-serif";

const STATUS_COLORS = {
  "No Prazo": COLORS.green,
  "Fora do Prazo": COLORS.red,
  Pendente: COLORS.amber,
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

// Só para gráficos com eixo — deixar as escalas fora do baseOptions evita que
// pizza/rosca herdem grid que não deveriam ter.
const axisOptions = {
  ...baseOptions,
  scales: { x: { grid: { color: GRID } }, y: { grid: { color: GRID } } },
};

const donutOptions = {
  ...baseOptions,
  cutout: "55%",
  plugins: { legend: { position: "right", labels: { boxWidth: 12, padding: 10, font: { size: 11 } } } },
};

const KPI_STYLE = [
  { color: COLORS.amber, icon: "📋" },
  { color: COLORS.blue, icon: "⚙️" },
  { color: COLORS.purple, icon: "⏱️" },
  { color: COLORS.green, icon: "✅" },
  { color: COLORS.red, icon: "⚠️" },
  { color: COLORS.cyan, icon: "🎯" },
  { color: COLORS.orange, icon: "🔁" },
  { color: COLORS.sand, icon: "📈" },
];

export function renderKpis(indicators) {
  const el = document.getElementById("kpiRow");
  const m = indicators.melhorias;
  const pctRegistrado = m.dataQuality.tempo.pct_registrado;
  const cards = [
    { label: "Total de Tarefas", value: indicators.totalIssues, sub: "no período" },
    { label: "WIP Atual", value: indicators.wipAtual, sub: "tarefas em andamento" },
    { label: "Lead Time Médio", value: indicators.leadTimeMedioHoras ? `${Math.round(indicators.leadTimeMedioHoras)}h` : "—", sub: "início → resolução" },
    { label: "No Prazo", value: indicators.statusEntregaCounts["No Prazo"], sub: `${pctOf(indicators.statusEntregaCounts, "No Prazo")}% do total` },
    { label: "Fora do Prazo", value: indicators.statusEntregaCounts["Fora do Prazo"], sub: `${pctOf(indicators.statusEntregaCounts, "Fora do Prazo")}% do total` },
    { label: "Dado Real (não estimado)", value: pctRegistrado !== null ? `${Math.round(pctRegistrado * 100)}%` : "—", sub: "tempo apontado vs. calculado" },
    { label: "Taxa de Retrabalho", value: `${Math.round(m.taxaRetrabalho.pct * 100)}%`, sub: `${m.taxaRetrabalho.total_com_retrabalho} tarefas reabertas` },
    { label: "Forecast do WIP", value: m.forecastSemanas ? `~${m.forecastSemanas} sem.` : "—", sub: "no ritmo atual de entrega" },
  ];
  el.innerHTML = cards
    .map((c, i) => {
      const style = KPI_STYLE[i % KPI_STYLE.length];
      return `<div class="kpi" style="--kc:${style.color}">
        <div class="kpi-lbl">${c.label}</div>
        <div class="kpi-val">${c.value}</div>
        ${c.sub ? `<div class="kpi-sub">${c.sub}</div>` : ""}
        <div class="kpi-ico">${style.icon}</div>
      </div>`;
    })
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
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data: labels.map((l) => counts[l]), backgroundColor: labels.map((l) => STATUS_COLORS[l]), borderWidth: 0 }],
    },
    options: donutOptions,
  });
}

export function renderOrigemTempo(indicators) {
  const rows = indicators.origemTempoGasto;
  const colorMap = { registrado: COLORS.green, calculado: COLORS.orange, "não calculado": COLORS.gray };
  renderChart("chartOrigemTempo", {
    type: "doughnut",
    data: {
      labels: rows.map((r) => r.origem),
      datasets: [{ data: rows.map((r) => r.total), backgroundColor: rows.map((r) => colorMap[r.origem] || COLORS.gray), borderWidth: 0 }],
    },
    options: donutOptions,
  });
}

export function renderConcluidasPorMes(indicators) {
  const rows = indicators.concluidasPorMes;
  renderChart("chartConcluidasPorMes", {
    type: "bar",
    data: { labels: rows.map((r) => r.label), datasets: [{ label: "Concluídas", data: rows.map((r) => r.total), backgroundColor: COLORS.amber, borderRadius: 4 }] },
    options: { ...axisOptions, plugins: { legend: { display: false } } },
  });
}

export function renderConcluidasPorPessoa(indicators) {
  const rows = indicators.concluidasPorPessoaMesVigente;
  renderChart("chartConcluidasPorPessoa", {
    type: "doughnut",
    data: {
      labels: rows.map((r) => r.responsavel),
      datasets: [{ data: rows.map((r) => r.total), backgroundColor: palette(rows.length), borderWidth: 0 }],
    },
    options: donutOptions,
  });
}

export function renderEstimativaXGasto(indicators) {
  const rows = indicators.estimativaXGastoPorMes;
  renderChart("chartEstimativaXGasto", {
    type: "line",
    data: {
      labels: rows.map((r) => r.label),
      datasets: [
        { label: "Estimativa (h)", data: rows.map((r) => round1(r.estimativa_original_corrigida)), borderColor: COLORS.blue, backgroundColor: COLORS.blue, tension: 0.25, pointRadius: 2 },
        { label: "Tempo gasto (h)", data: rows.map((r) => round1(r.tempo_gasto_corrigido)), borderColor: COLORS.red, backgroundColor: COLORS.red, tension: 0.25, pointRadius: 2 },
      ],
    },
    options: axisOptions,
  });
}

export function renderTempoPorTipo(indicators) {
  const rows = indicators.tempoPorTipoTarefa;
  renderChart("chartTempoPorTipo", {
    type: "bar",
    data: {
      labels: rows.map((r) => r.tipo_de_tarefa),
      datasets: [{ label: "Horas", data: rows.map((r) => round1(r.tempo_gasto_corrigido)), backgroundColor: rows.map((_, i) => PALETTE[i % PALETTE.length]), borderRadius: 4 }],
    },
    options: { ...axisOptions, indexAxis: "y", plugins: { legend: { display: false } } },
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
          backgroundColor: "rgba(56,189,248,0.18)",
          barThickness: 6,
        },
        {
          label: "Q1–Q3 (IQR)",
          data: rows.map((r) => [r.stats.q1, r.stats.q3]),
          backgroundColor: "rgba(56,189,248,0.55)",
          borderRadius: 3,
          barThickness: 24,
        },
        {
          label: "Mediana",
          data: rows.map((r) => [r.stats.median - 0.15, r.stats.median + 0.15]),
          backgroundColor: COLORS.amber,
          barThickness: 26,
        },
      ],
    },
    options: {
      ...axisOptions,
      indexAxis: "y",
      scales: {
        x: { grid: { color: GRID }, title: { display: true, text: "dias" } },
        y: { grid: { color: GRID } },
      },
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
        { label: "Deveria ser entregue", data: rows.map((r) => r.deveria_ser_entregue), backgroundColor: COLORS.gray, borderRadius: 3 },
        { label: "No Prazo", data: rows.map((r) => r.no_prazo), backgroundColor: COLORS.green, borderRadius: 3 },
        { label: "Fora do Prazo", data: rows.map((r) => r.fora_do_prazo), backgroundColor: COLORS.red, borderRadius: 3 },
        { label: "Pendente", data: rows.map((r) => r.pendente), backgroundColor: COLORS.orange, borderRadius: 3 },
      ],
    },
    options: axisOptions,
  });
}

export function renderCriadasXIniciadas(indicators) {
  const rows = indicators.criadasXIniciadasPorMes;
  renderChart("chartCriadasXIniciadas", {
    type: "line",
    data: {
      labels: rows.map((r) => r.label),
      datasets: [
        { label: "Criadas", data: rows.map((r) => r.criadas), borderColor: COLORS.amber, backgroundColor: COLORS.amber, tension: 0.25, pointRadius: 2 },
        { label: "Iniciadas", data: rows.map((r) => r.iniciadas), borderColor: COLORS.blue, backgroundColor: COLORS.blue, tension: 0.25, pointRadius: 2 },
      ],
    },
    options: axisOptions,
  });
}

export function renderWip(indicators) {
  const rows = indicators.wipPorMes;
  renderChart("chartWip", {
    type: "line",
    data: {
      labels: rows.map((r) => r.label),
      datasets: [{ label: "WIP", data: rows.map((r) => r.wip), borderColor: COLORS.purple, backgroundColor: "rgba(167,139,250,0.18)", fill: true, tension: 0.25, pointRadius: 2 }],
    },
    options: { ...axisOptions, plugins: { legend: { display: false } } },
  });
}

export function renderPorRelator(indicators) {
  const rows = indicators.porRelator;
  renderChart("chartPorRelator", {
    type: "bar",
    data: { labels: rows.map((r) => r.relator), datasets: [{ label: "Tarefas", data: rows.map((r) => r.total), backgroundColor: rows.map((_, i) => PALETTE[i % PALETTE.length]), borderRadius: 4 }] },
    options: { ...axisOptions, indexAxis: "y", plugins: { legend: { display: false } } },
  });
}

export function renderCapacity(canvasId, weeks) {
  const disc = canvasId.replace("chartCap", "").toLowerCase();
  renderChart(canvasId, {
    type: "bar",
    data: {
      labels: weeks.map((w) => `S${w.semana}/${w.ano}`),
      datasets: [
        { label: "Demandado", data: weeks.map((w) => w[`hd_${disc}`]), backgroundColor: COLORS.gray, borderRadius: 3 },
        { label: "Capacidade Efetiva", data: weeks.map((w) => w[`hd_${disc}_2`]), backgroundColor: COLORS.blue, borderRadius: 3 },
        { label: "Alocado", data: weeks.map((w) => w[`ha_${disc}`]), backgroundColor: COLORS.amber, borderRadius: 3 },
      ],
    },
    options: axisOptions,
  });
}

export function renderDataQualityTempo(indicators) {
  const t = indicators.melhorias.dataQuality.tempo;
  renderChart("chartDataQualityTempo", {
    type: "doughnut",
    data: {
      labels: ["Registrado (real)", "Calculado (rateio)", "Não calculado"],
      datasets: [{ data: [t.registrado, t.calculado, t.nao_calculado], backgroundColor: [COLORS.green, COLORS.orange, COLORS.gray], borderWidth: 0 }],
    },
    options: donutOptions,
  });
}

export function renderDataQualityTipo(indicators) {
  const c = indicators.melhorias.dataQuality.classificacao_tipo;
  renderChart("chartDataQualityTipo", {
    type: "doughnut",
    data: {
      labels: ["Campo nativo do Jira", "Label do Jira", "Palavra-chave (fallback)", "Não classificado"],
      datasets: [{
        data: [c.campo_nativo, c.label_jira, c.palavra_chave, c.nao_classificado],
        backgroundColor: [COLORS.cyan, COLORS.green, COLORS.blue, COLORS.gray],
        borderWidth: 0,
      }],
    },
    options: donutOptions,
  });
}

export function renderCycleTime(indicators) {
  const rows = indicators.melhorias.cycleTimePorStatus;
  renderChart("chartCycleTime", {
    type: "bar",
    data: { labels: rows.map((r) => r.status), datasets: [{ label: "Média (h)", data: rows.map((r) => round1(r.media_horas)), backgroundColor: rows.map((_, i) => PALETTE[i % PALETTE.length]), borderRadius: 4 }] },
    options: { ...axisOptions, indexAxis: "y", plugins: { legend: { display: false } } },
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
        { label: "Concluídas/semana", data: rows.map((r) => r.concluidas), backgroundColor: COLORS.blue, borderRadius: 4 },
        { label: "Média (8 sem.)", data: rows.map(() => round1(media)), type: "line", borderColor: COLORS.amber, backgroundColor: COLORS.amber, pointRadius: 0 },
      ],
    },
    options: axisOptions,
  });
}

export function renderEstabilidade(indicators) {
  const rows = indicators.melhorias.estabilidadePorResponsavel;
  renderChart("chartEstabilidade", {
    type: "bar",
    data: {
      labels: rows.map((r) => r.responsavel),
      datasets: [
        { label: "Remarcações de Start date", data: rows.map((r) => r.soma_startdate_changes), backgroundColor: COLORS.blue, borderRadius: 3 },
        { label: "Remarcações de Data Limite", data: rows.map((r) => r.soma_duedate_changes), backgroundColor: COLORS.red, borderRadius: 3 },
      ],
    },
    options: axisOptions,
  });
}

// Gráficos criados dentro de uma subpágina oculta nascem com tamanho 0 — ao
// exibir a página é preciso remedir o container.
export function resizeAll() {
  instances.forEach((chart) => chart.resize());
}

function palette(n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(PALETTE[i % PALETTE.length]);
  return out;
}
function round1(v) {
  return v === null || v === undefined ? null : Math.round(v * 10) / 10;
}
