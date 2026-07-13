// Renderiza a nuvem de palavras dos resumos das tarefas usando wordcloud2.js (CDN).
export function renderWordCloud(canvasId, words) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (typeof WordCloud === "undefined" || !words || words.length === 0) return;

  const list = words.map((w) => [w.text, w.count]);
  WordCloud(canvas, {
    list,
    gridSize: 8,
    weightFactor: (size) => 6 + size * 3,
    fontFamily: "Segoe UI, sans-serif",
    color: () => ["#2f6fed", "#7a5af8", "#06aed4", "#12b76a", "#f79009"][Math.floor(Math.random() * 5)],
    backgroundColor: "transparent",
    rotateRatio: 0.2,
  });
}
