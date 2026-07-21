import { useEffect, useState } from "react";
import { obtenerSeguimientoPublico } from "./authApi";
import MapaSeguimiento from "./MapaSeguimiento";

const ETIQUETA_ESTADO = {
  Pendiente: "Orden registrada",
  Asignada: "Técnico asignado",
  EnCamino: "El técnico va en camino",
  EnProceso: "El técnico está trabajando en el sitio",
  Completada: "Servicio completado",
  Cancelada: "Orden cancelada",
};

export default function SeguimientoPublico({ token }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    try {
      const data = await obtenerSeguimientoPublico(token);
      setDatos(data);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, 15000);
    return () => clearInterval(intervalo);
  }, []);

  if (cargando) {
    return (
      <div style={estilos.contenedorCentrado}>
        <p>Cargando seguimiento...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={estilos.contenedorCentrado}>
        <div style={estilos.tarjetaError}>
          <p>{error}</p>
          <p style={estilos.textoSecundario}>Verifica que el link sea correcto.</p>
        </div>
      </div>
    );
  }

  const tieneUbicacionTecnico = datos.lat != null && datos.lng != null;
  const tieneDestino = datos.destinoLat != null && datos.destinoLng != null;
  const cerrada = datos.estado === "Completada" || datos.estado === "Cancelada";

  return (
    <div style={estilos.pagina}>
      <div style={estilos.encabezado}>
        <div style={estilos.logoIcono}>JL</div>
        <div>
          <div style={estilos.tituloMarca}>JL Técnico EIRL</div>
          <div style={estilos.subtituloMarca}>Seguimiento de tu servicio</div>
        </div>
      </div>

      <div style={estilos.tarjetaEstado}>
        <span style={estilos.estadoTexto}>{ETIQUETA_ESTADO[datos.estado] || datos.estado}</span>
        {datos.nombreTecnico && (
          <div style={estilos.filaInfo}><span>Técnico</span><strong>{datos.nombreTecnico}</strong></div>
        )}
        {datos.direccionInstalacion && (
          <div style={estilos.filaInfo}><span>Dirección</span><span>{datos.direccionInstalacion}</span></div>
        )}
        {datos.fechaUltimaUbicacion && (
          <div style={estilos.filaInfo}>
            <span>Última actualización</span>
            <span>{new Date(datos.fechaUltimaUbicacion).toLocaleTimeString("es-PE")}</span>
          </div>
        )}
      </div>

      {!cerrada && (
        <div style={estilos.contenedorMapa}>
          <MapaSeguimiento
            destinoLat={datos.destinoLat}
            destinoLng={datos.destinoLng}
            tecnicoLat={datos.lat}
            tecnicoLng={datos.lng}
            altura="60vh"
          />
          {!tieneUbicacionTecnico && !tieneDestino && (
            <div style={estilos.avisoSinUbicacion}>Todavía no hay ubicación para mostrar en el mapa.</div>
          )}
        </div>
      )}

      {cerrada && (
        <div style={estilos.avisoCerrado}>
          {datos.estado === "Completada" ? "✓ El servicio ya fue completado." : "Esta orden fue cancelada."}
        </div>
      )}

      <p style={estilos.piePagina}>Esta página se actualiza automáticamente cada 15 segundos.</p>
    </div>
  );
}

const estilos = {
  pagina: { minHeight: "100vh", background: "#f8fafc", padding: "20px", fontFamily: "'Segoe UI', system-ui, sans-serif" },
  contenedorCentrado: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" },
  tarjetaError: { background: "#fff", padding: "24px", borderRadius: "12px", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  textoSecundario: { color: "#64748b", fontSize: "0.85rem" },

  encabezado: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" },
  logoIcono: {
    width: "42px", height: "42px", borderRadius: "10px",
    background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#0f172a",
    display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0,
  },
  tituloMarca: { fontWeight: 700, fontSize: "1rem", color: "#0f172a" },
  subtituloMarca: { fontSize: "0.78rem", color: "#64748b" },

  tarjetaEstado: { background: "#fff", borderRadius: "12px", padding: "16px", marginBottom: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
  estadoTexto: { fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", display: "block", marginBottom: "8px" },
  filaInfo: { display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#475569", padding: "4px 0" },

  contenedorMapa: { position: "relative" },
  avisoSinUbicacion: {
    position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
    background: "rgba(255,255,255,0.95)", padding: "12px 18px", borderRadius: "10px",
    fontSize: "0.85rem", color: "#475569", zIndex: 1000, textAlign: "center",
  },
  avisoCerrado: { background: "#fff", borderRadius: "12px", padding: "30px", textAlign: "center", color: "#334155", fontWeight: 600 },
  piePagina: { textAlign: "center", fontSize: "0.75rem", color: "#94a3b8", marginTop: "14px" },
};