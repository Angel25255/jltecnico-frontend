import { useEffect, useState } from "react";
import { obtenerReporteCompleto, descargarReporteExcel, descargarReportePdf } from "./authApi";

// OJO: no usar toISOString() aquí, porque convierte a UTC y en
// Perú (UTC-5) eso puede adelantar la fecha un día cerca de la
// medianoche. Se arma el string "YYYY-MM-DD" con la fecha LOCAL
// del navegador tal cual, sin pasar por UTC.
function formatearFechaLocal(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function hoyISO() {
  return formatearFechaLocal(new Date());
}
function haceDiasISO(dias) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  return formatearFechaLocal(fecha);
}

export default function Reportes({ token }) {
  const [desde, setDesde] = useState(haceDiasISO(30));
  const [hasta, setHasta] = useState(hoyISO());
  const [reporte, setReporte] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [exportando, setExportando] = useState(false);

  async function cargar(d = desde, h = hasta) {
    setCargando(true);
    setError("");
    try {
      setReporte(await obtenerReporteCompleto(token, d, h));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  function aplicarRangoRapido(dias) {
    const nuevoDesde = haceDiasISO(dias);
    const nuevoHasta = hoyISO();
    setDesde(nuevoDesde);
    setHasta(nuevoHasta);
    cargar(nuevoDesde, nuevoHasta);
  }

  function manejarFiltrar(e) {
    e.preventDefault();
    cargar(desde, hasta);
  }

  async function manejarExportar(tipo) {
    setExportando(true);
    setError("");
    try {
      if (tipo === "excel") await descargarReporteExcel(token, desde, hasta);
      else await descargarReportePdf(token, desde, hasta);
    } catch (err) {
      setError(err.message);
    } finally {
      setExportando(false);
    }
  }

  if (cargando && !reporte) return <div style={estilos.contenedor}><p>Cargando reporte...</p></div>;

  const r = reporte;
  const maxProducto = r?.ventasPorProducto?.length ? Math.max(...r.ventasPorProducto.map((p) => p.totalVendido)) : 1;
  const maxPeriodo = r?.ventasPorPeriodo?.length ? Math.max(...r.ventasPorPeriodo.map((p) => p.total)) : 1;

  return (
    <div style={estilos.contenedor}>
      <div style={estilos.encabezado}>
        <div>
          <h3 style={{ margin: 0 }}>Reportes Comerciales</h3>
          <p style={estilos.textoAyuda}>Ventas, cotizaciones, ranking de clientes/productos y alertas de stock.</p>
        </div>
        <div style={estilos.botonesExportar}>
          <button onClick={() => manejarExportar("excel")} disabled={exportando} style={estilos.botonExcel}>
            📊 Excel
          </button>
          <button onClick={() => manejarExportar("pdf")} disabled={exportando} style={estilos.botonPdf}>
            📄 PDF
          </button>
        </div>
      </div>

      {/* Filtros de fecha */}
      <form onSubmit={manejarFiltrar} style={estilos.filtros}>
        <div style={estilos.campoFiltro}>
          <label style={estilos.label}>Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={estilos.input} />
        </div>
        <div style={estilos.campoFiltro}>
          <label style={estilos.label}>Hasta</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={estilos.input} />
        </div>
        <button type="submit" style={estilos.botonPrimario}>Filtrar</button>
        <div style={estilos.rangosRapidos}>
          <button type="button" onClick={() => aplicarRangoRapido(7)} style={estilos.botonRango}>7 días</button>
          <button type="button" onClick={() => aplicarRangoRapido(30)} style={estilos.botonRango}>30 días</button>
          <button type="button" onClick={() => aplicarRangoRapido(90)} style={estilos.botonRango}>90 días</button>
        </div>
      </form>

      {error && <p style={estilos.error}>{error}</p>}

      {r && (
        <>
          {/* KPIs */}
          <div style={estilos.gridKpis}>
            <TarjetaKpi titulo="Total vendido" valor={`S/ ${r.resumen.totalVendido.toFixed(2)}`} color="#f59e0b" />
            <TarjetaKpi titulo="Total comprado" valor={`S/ ${r.resumen.totalComprado.toFixed(2)}`} color="#7c3aed" />
            <TarjetaKpi titulo="Ganancia" valor={`S/ ${r.resumen.gananciaTotal.toFixed(2)}`} color="#166534" />
            <TarjetaKpi titulo="N° de ventas" valor={r.resumen.cantidadVentas} color="#1d4ed8" />
            <TarjetaKpi titulo="Ticket promedio" valor={`S/ ${r.resumen.ticketPromedio.toFixed(2)}`} color="#0891b2" />
            <TarjetaKpi titulo="Cotiz. pendientes" valor={r.resumen.cotizacionesPendientes} color="#92400e" />
            <TarjetaKpi
              titulo="Stock bajo"
              valor={r.resumen.productosStockBajo}
              color="#b91c1c"
              alerta={r.resumen.productosStockBajo > 0}
            />
          </div>

          <div style={estilos.gridDosColumnas}>
            {/* Ventas por periodo */}
            <div style={estilos.tarjeta}>
              <h4 style={estilos.tituloTarjeta}>Ventas por día</h4>
              {r.ventasPorPeriodo.length === 0 ? (
                <p style={estilos.textoSecundario}>Sin ventas en este periodo.</p>
              ) : (
                <div style={estilos.listaBarras}>
                  {r.ventasPorPeriodo.map((p, i) => (
                    <div key={i} style={estilos.filaBarra}>
                      <span style={estilos.etiquetaBarra}>{p.periodo}</span>
                      <div style={estilos.pistaBarra}>
                        <div style={{ ...estilos.barra, width: `${(p.total / maxPeriodo) * 100}%` }} />
                      </div>
                      <span style={estilos.valorBarra}>S/ {p.total.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ventas por producto */}
            <div style={estilos.tarjeta}>
              <h4 style={estilos.tituloTarjeta}>Top productos más vendidos</h4>
              {r.ventasPorProducto.length === 0 ? (
                <p style={estilos.textoSecundario}>Sin ventas en este periodo.</p>
              ) : (
                <div style={estilos.listaBarras}>
                  {r.ventasPorProducto.map((p, i) => (
                    <div key={i} style={estilos.filaBarra}>
                      <span style={{ ...estilos.etiquetaBarra, width: "140px" }}>{p.nombreProducto}</span>
                      <div style={estilos.pistaBarra}>
                        <div style={{ ...estilos.barraAzul, width: `${(p.totalVendido / maxProducto) * 100}%` }} />
                      </div>
                      <span style={estilos.valorBarra}>S/ {p.totalVendido.toFixed(0)}</span>
                      <span style={estilos.gananciaBarra}>+S/ {p.ganancia.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top clientes */}
          <div style={estilos.tarjeta}>
            <h4 style={estilos.tituloTarjeta}>Top clientes</h4>
            {r.ventasPorCliente.length === 0 ? (
              <p style={estilos.textoSecundario}>Sin compras registradas en este periodo.</p>
            ) : (
              <table style={estilos.tabla}>
                <thead>
                  <tr>
                    <th style={estilos.th}>Cliente</th>
                    <th style={estilos.th}>Documento</th>
                    <th style={estilos.th}>N° compras</th>
                    <th style={estilos.th}>Total comprado</th>
                  </tr>
                </thead>
                <tbody>
                  {r.ventasPorCliente.map((c, i) => (
                    <tr key={i}>
                      <td style={estilos.td}>{c.nombreCliente}</td>
                      <td style={estilos.td}>{c.numeroDocumento}</td>
                      <td style={estilos.td}>{c.cantidadCompras}</td>
                      <td style={estilos.td}>S/ {c.totalComprado.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Stock bajo */}
          <div style={estilos.tarjetaAlerta}>
            <h4 style={estilos.tituloAlerta}>⚠ Productos con stock bajo</h4>
            {r.productosStockBajo.length === 0 ? (
              <p style={estilos.textoSecundario}>Ningún producto con stock bajo. Todo en orden.</p>
            ) : (
              <table style={estilos.tabla}>
                <thead>
                  <tr>
                    <th style={estilos.th}>Producto</th>
                    <th style={estilos.th}>Código</th>
                    <th style={estilos.th}>Categoría</th>
                    <th style={estilos.th}>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {r.productosStockBajo.map((p, i) => (
                    <tr key={i}>
                      <td style={estilos.td}>{p.nombre}</td>
                      <td style={estilos.td}><code style={estilos.codigo}>{p.codigo || "—"}</code></td>
                      <td style={estilos.td}>{p.nombreCategoria || "—"}</td>
                      <td style={estilos.td}><span style={estilos.stockCritico}>{p.stock}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Cotizaciones pendientes */}
          <div style={estilos.tarjeta}>
            <h4 style={estilos.tituloTarjeta}>Cotizaciones pendientes de seguimiento</h4>
            {r.cotizacionesPendientes.length === 0 ? (
              <p style={estilos.textoSecundario}>No hay cotizaciones pendientes o aprobadas sin facturar.</p>
            ) : (
              <table style={estilos.tabla}>
                <thead>
                  <tr>
                    <th style={estilos.th}>N°</th>
                    <th style={estilos.th}>Cliente</th>
                    <th style={estilos.th}>Total</th>
                    <th style={estilos.th}>Válida hasta</th>
                    <th style={estilos.th}>Días restantes</th>
                    <th style={estilos.th}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {r.cotizacionesPendientes.map((c) => (
                    <tr key={c.id}>
                      <td style={estilos.td}>{c.id}</td>
                      <td style={estilos.td}>{c.nombreCliente}</td>
                      <td style={estilos.td}>S/ {c.total.toFixed(2)}</td>
                      <td style={estilos.td}>{new Date(c.fechaValidez).toLocaleDateString("es-PE")}</td>
                      <td style={estilos.td}>
                        <span style={c.diasRestantes <= 3 ? estilos.stockCritico : undefined}>
                          {c.diasRestantes} días
                        </span>
                      </td>
                      <td style={estilos.td}>{c.estado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function TarjetaKpi({ titulo, valor, color, alerta }) {
  return (
    <div style={{ ...estilos.tarjetaKpi, borderTop: `3px solid ${color}` }}>
      <div style={estilos.tituloKpi}>{titulo}</div>
      <div style={{ ...estilos.valorKpi, color: alerta ? "#b91c1c" : "#0f172a" }}>{valor}</div>
    </div>
  );
}

const estilos = {
  contenedor: { padding: "1.5rem 2rem", maxWidth: "1200px" },
  encabezado: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" },
  textoAyuda: { fontSize: "0.85rem", color: "#64748b", marginTop: "4px", maxWidth: "500px" },
  botonesExportar: { display: "flex", gap: "8px" },
  botonExcel: { background: "#166534", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" },
  botonPdf: { background: "#1d4ed8", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" },

  filtros: { display: "flex", gap: "12px", alignItems: "flex-end", background: "#fff", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "20px", flexWrap: "wrap" },
  campoFiltro: { display: "flex", flexDirection: "column" },
  label: { fontSize: "0.75rem", color: "#64748b", marginBottom: "5px", fontWeight: 600 },
  input: { padding: "8px 10px", borderRadius: "7px", border: "1px solid #cbd5e1", fontSize: "0.85rem" },
  botonPrimario: { background: "#1d4ed8", color: "#fff", border: "none", padding: "9px 16px", borderRadius: "7px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 },
  rangosRapidos: { display: "flex", gap: "6px", marginLeft: "10px" },
  botonRango: { background: "#f8fafc", border: "1px solid #cbd5e1", padding: "8px 12px", borderRadius: "7px", cursor: "pointer", fontSize: "0.8rem" },

  error: { color: "#dc2626", fontSize: "0.85rem", marginBottom: "12px" },

  gridKpis: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "14px", marginBottom: "20px" },
  tarjetaKpi: { background: "#fff", borderRadius: "10px", padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  tituloKpi: { fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: "6px" },
  valorKpi: { fontSize: "1.3rem", fontWeight: 800 },

  gridDosColumnas: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" },
  tarjeta: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "18px", marginBottom: "16px" },
  tarjetaAlerta: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", padding: "18px", marginBottom: "16px" },
  tituloTarjeta: { margin: "0 0 12px 0", fontSize: "0.92rem", color: "#1e293b" },
  tituloAlerta: { margin: "0 0 12px 0", fontSize: "0.92rem", color: "#991b1b" },
  textoSecundario: { color: "#64748b", fontSize: "0.85rem" },

  listaBarras: { display: "flex", flexDirection: "column", gap: "8px" },
  filaBarra: { display: "flex", alignItems: "center", gap: "8px" },
  etiquetaBarra: { fontSize: "0.75rem", color: "#475569", width: "50px", flexShrink: 0 },
  pistaBarra: { flex: 1, height: "14px", background: "#f1f5f9", borderRadius: "4px", overflow: "hidden" },
  barra: { height: "100%", background: "#f59e0b", borderRadius: "4px" },
  barraAzul: { height: "100%", background: "#1d4ed8", borderRadius: "4px" },
  valorBarra: { fontSize: "0.75rem", fontWeight: 600, color: "#334155", width: "70px", textAlign: "right", flexShrink: 0 },
  gananciaBarra: { fontSize: "0.72rem", fontWeight: 600, color: "#166534", width: "65px", textAlign: "right", flexShrink: 0 },

  tabla: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "8px", fontSize: "0.75rem", color: "#64748b", borderBottom: "2px solid #e2e8f0" },
  td: { padding: "8px", fontSize: "0.83rem", borderBottom: "1px solid #f1f5f9" },
  codigo: { fontFamily: "monospace", fontSize: "0.78rem", color: "#64748b" },
  stockCritico: { color: "#b91c1c", fontWeight: 700 },
};