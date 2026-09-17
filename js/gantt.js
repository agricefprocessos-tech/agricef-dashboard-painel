// Renderiza os cronogramas de projeto usando frappe-gantt (carregado via CDN).
export function renderGantt(containerId, projetos) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  if (!projetos || projetos.length === 0) {
    container.innerHTML = '<p class="empty">Sem projetos cadastrados.</p>';
    return;
  }

  if (typeof Gantt === "undefined") {
    container.innerHTML = '<p class="empty">Biblioteca de Gantt não carregou (verifique a conexão com o CDN).</p>';
    return;
  }

  const tasks = projetos.map((p, idx) => ({
    id: `task-${idx}`,
    name: `${p.nome} (${p.responsavel || "sem responsável"})`,
    start: p.inicio,
    end: p.fim,
    progress: 0,
  }));

  try {
    // eslint-disable-next-line no-undef
    new Gantt(`#${containerId}`, tasks, { view_mode: "Week", language: "pt" });
  } catch (err) {
    container.innerHTML = `<p class="empty" style="color:#f87171">Erro ao renderizar Gantt: ${err.message}</p>`;
  }
}
