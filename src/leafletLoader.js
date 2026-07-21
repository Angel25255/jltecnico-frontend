// Carga Leaflet (CSS + JS) desde su CDN si todavía no está en la
// página. Se comparte entre el mapa de selección (al crear una
// orden) y el mapa de seguimiento público (que ve el cliente).
export function cargarLeaflet() {
  return new Promise((resolve) => {
    if (window.L) { resolve(window.L); return; }

    if (!document.querySelector('link[data-leaflet]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.setAttribute("data-leaflet", "true");
      document.head.appendChild(link);
    }

    const scriptExistente = document.querySelector('script[data-leaflet]');
    if (scriptExistente) {
      scriptExistente.addEventListener("load", () => resolve(window.L));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.setAttribute("data-leaflet", "true");
    script.onload = () => resolve(window.L);
    document.body.appendChild(script);
  });
}