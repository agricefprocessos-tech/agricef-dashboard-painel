// Renderiza a nuvem de palavras dos resumos das tarefas usando wordcloud2.js (CDN).
let pendente = null;

// Mesmo problema dos gráficos: enquanto a subpágina está oculta o container não
// tem tamanho, então a nuvem fica guardada e é desenhada ao exibir a página.
export function renderWordCloudIfPending() {
  if (!pendente) return;
  renderWordCloud(pendente.canvasId, pendente.words);
}

export function renderWordCloud(canvasId, words) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (typeof WordCloud === "undefined" || !words || words.length === 0) return;

  // wordcloud2 desenha nas dimensões em pixel do canvas, não nas do CSS: sem
  // isto a nuvem fica esticada pelo navegador em vez de desenhada no tamanho
  // certo.
  const box = canvas.parentElement;
  const largura = box.clientWidth;
  const altura = box.clientHeight;
  if (!largura || !altura) {
    pendente = { canvasId, words };
    return;
  }
  pendente = null;
  canvas.width = largura;
  canvas.height = altura;

  const list = words.map((w) => [w.text, w.count]);
  // Escala relativa à maior contagem: com fator fixo a palavra mais frequente
  // estourava o canvas e só duas ou três cabiam.
  const maxCount = Math.max.apply(null, words.map((w) => w.count));
  const fonteMaxima = Math.min(largura, altura) / 4.5;
  WordCloud(canvas, {
    list,
    gridSize: 6,
    weightFactor: (count) => Math.max(11, (count / maxCount) * fonteMaxima),
    fontFamily: "Barlow Condensed, sans-serif",
    color: () => ["#f0b429", "#38bdf8", "#4ade80", "#a78bfa", "#fb923c", "#67e8f9"][Math.floor(Math.random() * 6)],
    backgroundColor: "transparent",
    rotateRatio: 0.2,
  });
}
