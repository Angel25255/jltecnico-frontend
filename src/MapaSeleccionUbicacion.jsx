import { useEffect, useRef, useState } from "react";
import { cargarLeaflet } from "./leafletLoader";

const CENTRO_POR_DEFECTO = [-12.0651, -75.2049]; // Huancayo

// Mapa donde el usuario BUSCA una dirección (como Google Maps) o
// hace clic para marcar el punto exacto del destino de instalación.
export default function MapaSeleccionUbicacion({ onCambiar, valorInicial }) {
  const mapaRef = useRef(null);
  const instanciaMapaRef = useRef(null);
  const marcadorRef = useRef(null);
  const [leafletListo, setLeafletListo] = useState(false);
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);

  const [textoBusqueda, setTextoBusqueda] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [buscandoDireccion, setBuscandoDireccion] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState("");

  useEffect(() => {
    cargarLeaflet().then(() => setLeafletListo(true));
  }, []);

  useEffect(() => {
    if (!leafletListo || instanciaMapaRef.current || !mapaRef.current) return;

    const centroInicial = valorInicial ? [valorInicial.lat, valorInicial.lng] : CENTRO_POR_DEFECTO;
    const mapa = window.L.map(mapaRef.current).setView(centroInicial, 14);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(mapa);

    mapa.on("click", (e) => {
      colocarMarcador(e.latlng.lat, e.latlng.lng, mapa);
      onCambiar(e.latlng.lat, e.latlng.lng);
    });

    if (valorInicial) {
      colocarMarcador(valorInicial.lat, valorInicial.lng, mapa);
    }

    instanciaMapaRef.current = mapa;
  }, [leafletListo]);

  function colocarMarcador(lat, lng, mapa) {
    const posicion = [lat, lng];

    // Ícono personalizado a propósito: el ícono POR DEFECTO de Leaflet
    // se rompe cuando se carga desde CDN (busca una imagen que no
    // encuentra) y el marcador queda invisible.
    const iconoDestino = window.L.divIcon({
      className: "",
      html: '<div style="font-size:32px;line-height:32px;transform:translate(-50%,-100%);">📍</div>',
      iconSize: [0, 0], // el tamaño real ya lo define el emoji de adentro
    });

    if (!marcadorRef.current) {
      marcadorRef.current = window.L.marker(posicion, { draggable: true, icon: iconoDestino }).addTo(mapa);
      marcadorRef.current.on("dragend", () => {
        const pos = marcadorRef.current.getLatLng();
        onCambiar(pos.lat, pos.lng);
      });
    } else {
      marcadorRef.current.setLatLng(posicion);
    }
  }

  function usarMiUbicacionActual() {
    if (!navigator.geolocation) return;
    setBuscandoUbicacion(true);
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        const { latitude, longitude } = posicion.coords;
        if (instanciaMapaRef.current) {
          instanciaMapaRef.current.setView([latitude, longitude], 16);
          colocarMarcador(latitude, longitude, instanciaMapaRef.current);
        }
        onCambiar(latitude, longitude);
        setBuscandoUbicacion(false);
      },
      () => setBuscandoUbicacion(false)
    );
  }

  // Busca la dirección escrita usando Nominatim (buscador gratuito
  // de OpenStreetMap), acotado a Perú para resultados más relevantes.
  async function buscarDireccion() {
    if (!textoBusqueda.trim()) return;

    setBuscandoDireccion(true);
    setErrorBusqueda("");
    setResultadosBusqueda([]);

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=pe&limit=5&q=${encodeURIComponent(textoBusqueda)}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.length === 0) {
        setErrorBusqueda("No se encontraron resultados. Intenta con más detalle (ej. agrega la ciudad).");
      } else {
        setResultadosBusqueda(data);
      }
    } catch {
      setErrorBusqueda("No se pudo conectar al buscador de direcciones.");
    } finally {
      setBuscandoDireccion(false);
    }
  }

  function elegirResultado(resultado) {
    const lat = parseFloat(resultado.lat);
    const lng = parseFloat(resultado.lon);

    if (instanciaMapaRef.current) {
      instanciaMapaRef.current.setView([lat, lng], 16);
      colocarMarcador(lat, lng, instanciaMapaRef.current);
    }
    onCambiar(lat, lng);
    setResultadosBusqueda([]);
    setTextoBusqueda(resultado.display_name);
  }

  return (
    <div>
      {/* OJO: esto NO es un <form> a propósito - este componente vive
          dentro del formulario grande de "Nueva orden", y los navegadores
          no permiten formularios anidados (causa recargas raras de página). */}
      <div style={estilos.filaBusqueda}>
        <input
          value={textoBusqueda}
          onChange={(e) => setTextoBusqueda(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              buscarDireccion();
            }
          }}
          placeholder="Busca una dirección o lugar (ej. Universidad Continental, Huancayo)"
          style={estilos.inputBusqueda}
        />
        <button type="button" onClick={buscarDireccion} disabled={buscandoDireccion} style={estilos.botonBuscar}>
          {buscandoDireccion ? "..." : "Buscar"}
        </button>
      </div>

      {errorBusqueda && <p style={estilos.textoError}>{errorBusqueda}</p>}

      {resultadosBusqueda.length > 0 && (
        <div style={estilos.listaResultados}>
          {resultadosBusqueda.map((r, i) => (
            <button key={i} type="button" onClick={() => elegirResultado(r)} style={estilos.itemResultado}>
              {r.display_name}
            </button>
          ))}
        </div>
      )}

      <div style={estilos.filaAyuda}>
        <span style={estilos.textoAyuda}>O haz clic directo en el mapa para ajustar el punto exacto</span>
        <button type="button" onClick={usarMiUbicacionActual} disabled={buscandoUbicacion} style={estilos.botonMiUbicacion}>
          {buscandoUbicacion ? "Buscando..." : "📍 Usar mi ubicación"}
        </button>
      </div>
      <div ref={mapaRef} style={estilos.mapa} />
    </div>
  );
}

const estilos = {
  filaBusqueda: { display: "flex", gap: "6px", marginBottom: "8px" },
  inputBusqueda: { flex: 1, padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" },
  botonBuscar: { background: "#1d4ed8", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 },
  textoError: { fontSize: "0.78rem", color: "#b91c1c", marginBottom: "8px" },
  listaResultados: { display: "flex", flexDirection: "column", gap: "4px", marginBottom: "8px", maxHeight: "140px", overflowY: "auto" },
  itemResultado: { textAlign: "left", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "8px 10px", cursor: "pointer", fontSize: "0.78rem", color: "#334155" },
  filaAyuda: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" },
  textoAyuda: { fontSize: "0.72rem", color: "#64748b" },
  botonMiUbicacion: { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #93c5fd", padding: "5px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600, whiteSpace: "nowrap" },
  mapa: { width: "100%", height: "220px", borderRadius: "8px", overflow: "hidden", background: "#e2e8f0" },
};