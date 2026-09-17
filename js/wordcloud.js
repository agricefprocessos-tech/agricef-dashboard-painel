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
    fontFamily: "Barlow Condensed, sans-serif",
    color: () => ["#f0b429", "#38bdf8", "#4ade80", "#a78bfa", "#fb923c", "#67e8f9"][Math.floor(Math.random() * 6)],
    backgroundColor: "transparent",
    rotateRatio: 0.2,
  });
}
