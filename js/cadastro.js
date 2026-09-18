// Aba "Cadastro de Pessoas" — espelha o módulo equivalente do painel de
// produção: quadro, afastamentos, calendário e catálogos, com o conceito de
// dado "deduzido" (sublinhado) que a pessoa responsável confirma.
import { fetchCadastro, writeCadastro } from "./api.js";

let state = null;
let subTab = "quadro";

const SITUACOES = ["ativo", "afastado", "desligado"];

export async function loadCadastro() {
  state = await fetchCadastro();
  render();
}

function esc(value) {
  return String(value === null || value === undefined ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function render() {
  if (!state) return;
  renderKpis();
  renderSubTabs();
  const body = document.getElementById("cadastroBody");
  const renderers = {
    quadro: renderQuadro,
    afastamentos: renderAfastamentos,
    projetos: renderProjetos,
    calendario: renderCalendario,
    catalogos: renderCatalogos,
  };
  body.innerHTML = renderers[subTab]();
  wireActions();
}

function renderKpis() {
  const r = state.resumo;
  const deduzidos = state.pessoas.filter((p) => p.origem === "deduzido").length;
  const cards = [
    { label: "Pessoas", value: r.total, sub: "no cadastro", color: "#f0b429", icon: "🗂️" },
    { label: "Ativos", value: r.ativos, sub: "contam na capacidade", color: "#4ade80", icon: "👷" },
    { label: "A Confirmar", value: deduzidos, sub: "dados deduzidos", color: "#fb923c", icon: "❓" },
    { label: "Incompletos", value: r.incompletos, sub: "faltam campos", color: "#f87171", icon: "⚠️" },
    { label: "Afastados Hoje", value: r.afastadosHoje, sub: "fora do denominador", color: "#a78bfa", icon: "🏥" },
  ];
  document.getElementById("cadastroKpis").innerHTML = cards
    .map((c) => `<div class="kpi" style="--kc:${c.color}">
      <div class="kpi-lbl">${c.label}</div>
      <div class="kpi-val">${c.value}</div>
      <div class="kpi-sub">${c.sub}</div>
      <div class="kpi-ico">${c.icon}</div>
    </div>`)
    .join("");
}

function renderSubTabs() {
  const tabs = [
    ["quadro", "👷 Quadro de Pessoas"],
    ["afastamentos", "🏥 Afastamentos"],
    ["projetos", "📐 Projetos"],
    ["calendario", "📆 Calendário"],
    ["catalogos", "📚 Disciplinas & Funções"],
  ];
  document.getElementById("cadastroSubTabs").innerHTML = tabs
    .map(([id, label]) => `<button class="cad-tab${subTab === id ? " active" : ""}" data-subtab="${id}">${label}</button>`)
    .join("");
}

function callout(text) {
  return `<div class="callout">${text}</div>`;
}

function renderQuadro() {
  const rows = state.pessoas.slice().sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));
  const disciplinas = state.disciplinas.map((d) => d.codigo);
  const funcoes = state.funcoes.map((f) => f.nome);

  const linhas = rows.map((p) => {
    const deduzido = p.origem === "deduzido";
    const marca = (v) => (deduzido ? `<span class="inferido" title="Deduzido do Jira, não informado">${esc(v)}</span>` : esc(v));
    return `<tr data-id="${esc(p.id)}">
      <td>
        <div class="cad-nome">${esc(p.nome)}</div>
        <div class="cad-sub">${esc(p.email || "sem e-mail")}</div>
      </td>
      <td>${selectCell(p, "disciplina", disciplinas, marca(p.disciplina))}</td>
      <td>${selectCell(p, "funcao", funcoes, marca(p.funcao))}</td>
      <td>${inputCell(p, "jornadaDiaria", "number", p.jornadaDiaria)}</td>
      <td>${inputCell(p, "admissao", "date", p.admissao)}</td>
      <td>${selectCell(p, "situacao", SITUACOES, esc(p.situacao))}</td>
      <td>
        <div class="cad-acoes">
          ${deduzido
            ? `<button class="cad-btn primary" data-confirm="${esc(p.id)}">Confirmar</button>`
            : `<span class="badge bg">confirmado</span>`}
          <button class="cad-btn" data-remove-pessoa="${esc(p.id)}" title="Remover do cadastro">✕</button>
        </div>
      </td>
    </tr>`;
  }).join("");

  return `
    ${callout("<strong>O que está sublinhado foi deduzido, não informado.</strong> A disciplina veio do projeto onde a pessoa mais atua e a admissão veio da primeira tarefa dela no Jira. Confirmar troca o palpite pelo dado real — e a capacidade calculada muda junto.")}
    <div class="tbl-wrap">
      <table class="cad-tbl">
        <thead><tr>
          <th>Pessoa</th><th>Disciplina</th><th>Função</th><th>Jornada (h)</th><th>Admissão</th><th>Situação</th><th>Cadastro</th>
        </tr></thead>
        <tbody>${linhas || '<tr><td colspan="7" class="empty">Cadastro vazio.</td></tr>'}</tbody>
      </table>
    </div>`;
}

function selectCell(row, field, options, displayWhenReadonly) {
  const opts = ['<option value=""></option>']
    .concat(options.map((o) => `<option value="${esc(o)}"${String(row[field]) === String(o) ? " selected" : ""}>${esc(o)}</option>`))
    .join("");
  return `<select class="cad-input" data-field="${field}" data-id="${esc(row.id)}">${opts}</select>`;
}

function inputCell(row, field, type, value) {
  return `<input class="cad-input" type="${type}" value="${esc(value)}" data-field="${field}" data-id="${esc(row.id)}" />`;
}

function renderAfastamentos() {
  const pessoaPorId = new Map(state.pessoas.map((p) => [String(p.id), p.nome]));
  const tipos = state.tiposAfastamento;
  const linhas = state.afastamentos
    .slice()
    .sort((a, b) => String(b.inicio).localeCompare(String(a.inicio)))
    .map((a) => `<tr>
      <td>${esc(pessoaPorId.get(String(a.pessoaId)) || "(pessoa removida)")}</td>
      <td>${esc(a.tipo)}</td>
      <td>${esc(a.inicio)}</td>
      <td>${esc(a.fim)}</td>
      <td>${esc(a.observacao)}</td>
      <td><button class="cad-btn" data-remove-afastamento="${esc(a.id)}">✕</button></td>
    </tr>`).join("");

  const pessoaOpts = state.pessoas
    .slice()
    .sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"))
    .map((p) => `<option value="${esc(p.id)}">${esc(p.nome)}</option>`).join("");
  const tipoOpts = tipos.map((t) => `<option value="${esc(t.tipo)}">${esc(t.tipo)}${t.removeCapacidade ? "" : " (conta como presença)"}</option>`).join("");

  return `
    ${callout("<strong>Férias, atestado e licença tiram o dia do denominador</strong> — a pessoa deixa de contar como capacidade naquele período. Treinamento e atividade de campo contam como presença: ela está trabalhando, só não está apontando tarefa de projeto.")}
    <form class="cad-form" id="formAfastamento">
      <select name="pessoaId" required><option value="">Pessoa…</option>${pessoaOpts}</select>
      <select name="tipo" required><option value="">Tipo…</option>${tipoOpts}</select>
      <input name="inicio" type="date" required title="Início" />
      <input name="fim" type="date" required title="Fim" />
      <input name="observacao" type="text" placeholder="Observação (opcional)" />
      <button type="submit" class="cad-btn primary">+ Registrar</button>
    </form>
    <div class="tbl-wrap">
      <table class="cad-tbl">
        <thead><tr><th>Pessoa</th><th>Tipo</th><th>Início</th><th>Fim</th><th>Observação</th><th></th></tr></thead>
        <tbody>${linhas || '<tr><td colspan="6" class="empty">Nenhum afastamento registrado. Enquanto não houver registro, todo dia útil no vínculo conta como esperado.</td></tr>'}</tbody>
      </table>
    </div>`;
}

function renderProjetos() {
  const disciplinas = state.disciplinas.map((d) => d.codigo);
  const linhas = state.projetos
    .slice()
    .sort((a, b) => String(a.inicio).localeCompare(String(b.inicio)))
    .map((p) => {
      const pessoas = Number(p.pessoasAlocadas) || 0;
      const horas = Number(p.horasDesejadas) || 0;
      const semanas = pessoas > 0 ? Math.ceil(horas / (pessoas * 40)) : 0;
      return `<tr>
        <td><strong>${esc(p.numero)}</strong><div class="cad-sub">${esc(p.nome)}</div></td>
        <td>${esc(p.disciplina)}</td>
        <td>${esc(p.responsavel)}</td>
        <td>${pessoas}</td>
        <td>${horas}h</td>
        <td>${esc(p.inicio)}</td>
        <td>${semanas ? `${semanas} sem.` : "—"}</td>
        <td>${esc(p.status)}</td>
        <td><button class="cad-btn" data-remove-projeto="${esc(p.id)}">✕</button></td>
      </tr>`;
    }).join("");

  const discOpts = disciplinas.map((d) => `<option value="${esc(d)}">${esc(d)}</option>`).join("");
  const pessoaOpts = state.pessoas
    .slice()
    .sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"))
    .map((p) => `<option value="${esc(p.nome)}">${esc(p.nome)}</option>`).join("");

  return `
    ${callout("É daqui que sai a <strong>demanda</strong> do gráfico de capacidade. As horas desejadas são espalhadas pelas semanas na velocidade que o número de pessoas alocadas permite (pessoas × 40h por semana) — mesma regra do painel original em Power BI.")}
    <form class="cad-form" id="formProjeto">
      <input name="numero" type="text" placeholder="Número" required style="max-width:110px" />
      <input name="nome" type="text" placeholder="Nome do projeto" required />
      <select name="disciplina" required><option value="">Disciplina…</option>${discOpts}</select>
      <select name="responsavel"><option value="">Responsável…</option>${pessoaOpts}</select>
      <input name="pessoasAlocadas" type="number" min="1" step="1" placeholder="Pessoas" required style="max-width:95px" />
      <input name="horasDesejadas" type="number" min="1" step="1" placeholder="Horas" required style="max-width:95px" />
      <input name="inicio" type="date" required title="Início" />
      <select name="status"><option value="Em andamento">Em andamento</option><option value="Planejado">Planejado</option><option value="Concluído">Concluído</option></select>
      <button type="submit" class="cad-btn primary">+ Adicionar projeto</button>
    </form>
    <div class="tbl-wrap">
      <table class="cad-tbl">
        <thead><tr><th>Projeto</th><th>Disciplina</th><th>Responsável</th><th>Pessoas</th><th>Horas</th><th>Início</th><th>Duração</th><th>Status</th><th></th></tr></thead>
        <tbody>${linhas || '<tr><td colspan="9" class="empty">Nenhum projeto cadastrado — por isso a linha "Alocado" do gráfico de capacidade está zerada.</td></tr>'}</tbody>
      </table>
    </div>`;
}

function renderCalendario() {
  const linhas = state.calendario
    .slice()
    .sort((a, b) => String(a.data).localeCompare(String(b.data)))
    .map((c) => `<tr>
      <td>${esc(c.data)}</td>
      <td><span class="badge ${c.tipo === "feriado" ? "by" : c.tipo === "parada" ? "br" : "bb"}">${esc(c.tipo)}</span></td>
      <td>${esc(c.descricao)}</td>
      <td><button class="cad-btn" data-remove-calendario="${esc(c.data)}">✕</button></td>
    </tr>`).join("");

  return `
    ${callout("Sem calendário, todo dia de semana conta como dia útil. <strong>Feriado e parada saem do denominador</strong> da capacidade; <strong>dia útil extra</strong> é o contrário — sábado trabalhado que deve contar.")}
    <form class="cad-form" id="formCalendario">
      <input name="data" type="date" required title="Data" />
      <select name="tipo" required>
        <option value="feriado">Feriado</option>
        <option value="parada">Parada</option>
        <option value="dia-util-extra">Dia útil extra</option>
      </select>
      <input name="descricao" type="text" placeholder="Descrição" />
      <button type="submit" class="cad-btn primary">+ Adicionar dia</button>
    </form>
    <div class="tbl-wrap">
      <table class="cad-tbl">
        <thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th></th></tr></thead>
        <tbody>${linhas || '<tr><td colspan="4" class="empty">Sem dias cadastrados.</td></tr>'}</tbody>
      </table>
    </div>`;
}

function renderCatalogos() {
  const disc = state.disciplinas.map((d) => `<tr>
    <td><strong>${esc(d.codigo)}</strong></td><td>${esc(d.nome)}</td>
    <td>${state.pessoas.filter((p) => p.disciplina === d.codigo && p.situacao === "ativo").length}</td>
    <td><button class="cad-btn" data-remove-disciplina="${esc(d.codigo)}">✕</button></td>
  </tr>`).join("");

  const func = state.funcoes.map((f) => `<tr>
    <td>${esc(f.nome)}</td><td>${esc(f.disciplinaPadrao || "—")}</td>
    <td>${state.pessoas.filter((p) => p.funcao === f.nome && p.situacao === "ativo").length}</td>
    <td><button class="cad-btn" data-remove-funcao="${esc(f.nome)}">✕</button></td>
  </tr>`).join("");

  return `
    ${callout("O catálogo abaixo é ponto de partida — renomeie ou remova o que não existir na engenharia.")}
    <div class="cad-grid2">
      <div>
        <h3 class="cad-h3">Disciplinas</h3>
        <form class="cad-form" id="formDisciplina">
          <input name="codigo" type="text" placeholder="Código" required maxlength="6" style="max-width:90px" />
          <input name="nome" type="text" placeholder="Nome" required />
          <button type="submit" class="cad-btn primary">+ Nova</button>
        </form>
        <table class="cad-tbl">
          <thead><tr><th>Código</th><th>Nome</th><th>Pessoas</th><th></th></tr></thead>
          <tbody>${disc || '<tr><td colspan="4" class="empty">Nenhuma.</td></tr>'}</tbody>
        </table>
      </div>
      <div>
        <h3 class="cad-h3">Funções</h3>
        <form class="cad-form" id="formFuncao">
          <input name="nome" type="text" placeholder="Função" required />
          <input name="disciplinaPadrao" type="text" placeholder="Disciplina" maxlength="6" style="max-width:90px" />
          <button type="submit" class="cad-btn primary">+ Nova</button>
        </form>
        <table class="cad-tbl">
          <thead><tr><th>Função</th><th>Disciplina</th><th>Pessoas</th><th></th></tr></thead>
          <tbody>${func || '<tr><td colspan="4" class="empty">Nenhuma.</td></tr>'}</tbody>
        </table>
      </div>
    </div>`;
}

async function commit(action, payload) {
  const body = document.getElementById("cadastroBody");
  const aviso = document.getElementById("cadastroSaving");
  body.classList.add("saving");
  aviso.classList.add("show");
  try {
    const res = await writeCadastro(action, payload);
    state = res.cadastro;
    render();
  } catch (err) {
    alert(`Erro ao gravar: ${err.message}`);
    body.classList.remove("saving");
  } finally {
    aviso.classList.remove("show");
  }
}

function pessoaById(id) {
  return state.pessoas.find((p) => String(p.id) === String(id));
}

function wireActions() {
  const body = document.getElementById("cadastroBody");

  body.querySelectorAll(".cad-input").forEach((input) => {
    input.addEventListener("change", () => {
      const pessoa = pessoaById(input.dataset.id);
      if (!pessoa) return;
      const row = Object.assign({}, pessoa, { [input.dataset.field]: input.value });
      commit("upsertPessoa", { row });
    });
  });

  body.querySelectorAll("[data-confirm]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pessoa = pessoaById(btn.dataset.confirm);
      if (!pessoa) return;
      commit("upsertPessoa", { row: Object.assign({}, pessoa, { origem: "confirmado" }) });
    });
  });

  const removals = [
    ["data-remove-pessoa", "deletePessoa", "Remover esta pessoa do cadastro?"],
    ["data-remove-afastamento", "deleteAfastamento", "Remover este afastamento?"],
    ["data-remove-calendario", "deleteCalendario", "Remover este dia do calendário?"],
    ["data-remove-disciplina", "deleteDisciplina", "Remover esta disciplina?"],
    ["data-remove-funcao", "deleteFuncao", "Remover esta função?"],
    ["data-remove-projeto", "deleteProjeto", "Remover este projeto?"],
  ];
  removals.forEach(([attr, action, confirmMsg]) => {
    body.querySelectorAll(`[${attr}]`).forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!confirm(confirmMsg)) return;
        commit(action, { chave: btn.getAttribute(attr) });
      });
    });
  });

  const forms = [
    ["formAfastamento", "upsertAfastamento"],
    ["formCalendario", "upsertCalendario"],
    ["formDisciplina", "upsertDisciplina"],
    ["formFuncao", "upsertFuncao"],
    ["formProjeto", "upsertProjeto"],
  ];
  forms.forEach(([id, action]) => {
    const form = document.getElementById(id);
    if (!form) return;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      commit(action, { row: Object.fromEntries(new FormData(form).entries()) });
    });
  });
}

export function setupCadastroTabs() {
  document.getElementById("cadastroSubTabs").addEventListener("click", (event) => {
    const btn = event.target.closest(".cad-tab");
    if (!btn) return;
    subTab = btn.dataset.subtab;
    render();
  });
}
