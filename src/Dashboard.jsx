import { useEffect, useState } from "react";
import { obtenerResumenDashboard } from "./authApi";

export default function Dashboard({ token, nombreUsuario }) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  async function cargar() {
    setCargando(true);
    try {
      setDatos(await obtenerResumenDashboard(token));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  if (cargando) return <div style={estilos.contenedor}><p>Cargando panel...</p></div>;
  if (error) return <div style={estilos.contenedor}><p style={estilos.error}>{error}</p></div>;

  const r = datos;
  const maxVentaDia = r.ventasUltimos7Dias.length ? Math.max(...r.ventasUltimos7Dias.map((v) => v.total)) : 1;
  const maxTopProducto = r.topProductosMes.length ? Math.max(...r.topProductosMes.map((p) => p.total)) : 1;
  const totalOrdenesActivas = r.ordenesActivas.pendiente + r.ordenesActivas.asignada + r.ordenesActivas.enCamino + r.ordenesActivas.enProceso;

  return (
    <div style={estilos.contenedor}>
      <h2 style={estilos.saludo}>Hola, {nombreUsuario.split(" ")[0]} 👋</h2>
      <p style={estilos.textoAyuda}>Así está el negocio hoy, {new Date().toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })}.</p>

      {/* KPIs principales */}
      <div style={estilos.gridKpis}>
        <TarjetaKpi titulo="Ventas hoy" valor={`S/ ${r.ventasHoyTotal.toFixed(2)}`} subtitulo={`${r.ventasHoyCantidad} ventas`} color="#f59e0b" />
        <TarjetaKpi titulo="Ventas del mes" valor={`S/ ${r.ventasMesTotal.toFixed(2)}`} subtitulo={`${r.ventasMesCantidad} ventas`} color="#1d4ed8" />
        <TarjetaKpi titulo="Ganancia del mes" valor={`S/ ${r.gananciaMes.toFixed(2)}`} color="#166534" />
        <TarjetaKpi titulo="Cotizaciones pendientes" valor={r.cotizacionesPendientes} subtitulo={`S/ ${r.montoCotizadoPendiente.toFixed(2)} en juego`} color="#92400e" />
      </div>

      <div style={estilos.gridDosColumnas} className="dashboard-grid-2col">
        {/* Órdenes de servicio activas */}
        <div style={estilos.tarjeta}>
          <h4 style={estilos.tituloTarjeta}>🔧 Órdenes de servicio activas ({totalOrdenesActivas})</h4>
          <div style={estilos.listaEstadosOrden}>
            <FilaEstadoOrden etiqueta="Pendientes" cantidad={r.ordenesActivas.pendiente} color="#92400e" bg="#fef3c7" />
            <FilaEstadoOrden etiqueta="Asignadas" cantidad={r.ordenesActivas.asignada} color="#1d4ed8" bg="#dbeafe" />
            <FilaEstadoOrden etiqueta="En camino" cantidad={r.ordenesActivas.enCamino} color="#4338ca" bg="#e0e7ff" />
            <FilaEstadoOrden etiqueta="En proceso" cantidad={r.ordenesActivas.enProceso} color="#a21caf" bg="#fce7f3" />
          </div>
        </div>

        {/* Técnicos */}
        <div style={estilos.tarjeta}>
          <h4 style={estilos.tituloTarjeta}>👷 Técnicos</h4>
          <div style={estilos.bloqueTecnicos}>
            <div style={estilos.circuloTecnicos}>
              <span style={estilos.numeroCirculo}>{r.tecnicosDisponibles}</span>
              <span style={estilos.deCirculo}>de {r.tecnicosTotal}</span>
            </div>
            <p style={estilos.textoTecnicos}>disponibles ahora mismo</p>
          </div>
        </div>
      </div>

      {/* Alerta de stock bajo */}
      {r.productosStockBajo > 0 && (
        <div style={estilos.alertaStock}>
          ⚠ Tienes <strong>{r.productosStockBajo}</strong> producto{r.productosStockBajo !== 1 ? "s" : ""} con stock bajo — revisa el Kardex para reponer.
        </div>
      )}

      <div style={estilos.gridDosColumnas} className="dashboard-grid-2col">
        {/* Ventas últimos 7 días */}
        <div style={estilos.tarjeta}>
          <h4 style={estilos.tituloTarjeta}>Ventas — últimos 7 días</h4>
          {r.ventasUltimos7Dias.length === 0 ? (
            <p style={estilos.textoSecundario}>Sin ventas en este periodo.</p>
          ) : (
            <div style={estilos.listaBarras}>
              {r.ventasUltimos7Dias.map((v, i) => (
                <div key={i} style={estilos.filaBarra}>
                  <span style={estilos.etiquetaBarra}>{v.dia}</span>
                  <div style={estilos.pistaBarra}>
                    <div style={{ ...estilos.barra, width: `${(v.total / maxVentaDia) * 100}%` }} />
                  </div>
                  <span style={estilos.valorBarra}>S/ {v.total.toFixed(0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top productos del mes */}
        <div style={estilos.tarjeta}>
          <h4 style={estilos.tituloTarjeta}>Top productos del mes</h4>
          {r.topProductosMes.length === 0 ? (
            <p style={estilos.textoSecundario}>Sin ventas este mes todavía.</p>
          ) : (
            <div style={estilos.listaBarras}>
              {r.topProductosMes.map((p, i) => (
                <div key={i} style={estilos.filaBarra}>
                  <span style={{ ...estilos.etiquetaBarra, width: "130px" }}>{p.nombre}</span>
                  <div style={estilos.pistaBarra}>
                    <div style={{ ...estilos.barraAzul, width: `${(p.total / maxTopProducto) * 100}%` }} />
                  </div>
                  <span style={estilos.valorBarra}>S/ {p.total.toFixed(0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .dashboard-grid-2col {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

function TarjetaKpi({ titulo, valor, subtitulo, color }) {
  return (
    <div style={{ ...estilos.tarjetaKpi, borderTop: `3px solid ${color}` }}>
      <div style={estilos.tituloKpi}>{titulo}</div>
      <div style={estilos.valorKpi}>{valor}</div>
      {subtitulo && <div style={estilos.subtituloKpi}>{subtitulo}</div>}
    </div>
  );
}

function FilaEstadoOrden({ etiqueta, cantidad, color, bg }) {
  return (
    <div style={estilos.filaEstadoOrden}>
      <span style={{ ...estilos.badgeNumeroOrden, background: bg, color }}>{cantidad}</span>
      <span style={estilos.etiquetaEstadoOrden}>{etiqueta}</span>
    </div>
  );
}

const estilos = {
  contenedor: { padding: "1.5rem 2rem", maxWidth: "1200px" },
  saludo: { margin: 0, fontSize: "1.4rem", color: "#0f172a" },
  textoAyuda: { fontSize: "0.88rem", color: "#64748b", marginTop: "4px", marginBottom: "20px", textTransform: "capitalize" },
  error: { color: "#dc2626" },

  gridKpis: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "18px" },
  tarjetaKpi: { background: "#fff", borderRadius: "10px", padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  tituloKpi: { fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: "6px" },
  valorKpi: { fontSize: "1.4rem", fontWeight: 800, color: "#0f172a" },
  subtituloKpi: { fontSize: "0.75rem", color: "#94a3b8", marginTop: "3px" },

  gridDosColumnas: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" },
  tarjeta: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "18px" },
  tituloTarjeta: { margin: "0 0 14px 0", fontSize: "0.92rem", color: "#1e293b" },
  textoSecundario: { color: "#94a3b8", fontSize: "0.85rem" },

  listaEstadosOrden: { display: "flex", flexDirection: "column", gap: "10px" },
  filaEstadoOrden: { display: "flex", alignItems: "center", gap: "12px" },
  badgeNumeroOrden: { width: "34px", height: "34px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1rem", flexShrink: 0 },
  etiquetaEstadoOrden: { fontSize: "0.88rem", color: "#334155" },

  bloqueTecnicos: { display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 0" },
  circuloTecnicos: {
    width: "100px", height: "100px", borderRadius: "50%", background: "#f0fdf4",
    border: "4px solid #166534", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
  },
  numeroCirculo: { fontSize: "1.8rem", fontWeight: 800, color: "#166534", lineHeight: 1 },
  deCirculo: { fontSize: "0.7rem", color: "#166534" },
  textoTecnicos: { marginTop: "10px", fontSize: "0.82rem", color: "#64748b" },

  alertaStock: { background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "12px 16px", borderRadius: "10px", marginBottom: "16px", fontSize: "0.88rem" },

  listaBarras: { display: "flex", flexDirection: "column", gap: "8px" },
  filaBarra: { display: "flex", alignItems: "center", gap: "8px" },
  etiquetaBarra: { fontSize: "0.75rem", color: "#475569", width: "50px", flexShrink: 0 },
  pistaBarra: { flex: 1, height: "14px", background: "#f1f5f9", borderRadius: "4px", overflow: "hidden" },
  barra: { height: "100%", background: "#f59e0b", borderRadius: "4px" },
  barraAzul: { height: "100%", background: "#1d4ed8", borderRadius: "4px" },
  valorBarra: { fontSize: "0.75rem", fontWeight: 600, color: "#334155", width: "70px", textAlign: "right", flexShrink: 0 },
};