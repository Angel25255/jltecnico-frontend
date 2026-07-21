import { useEffect, useState } from "react";
import { obtenerResumenInventario, obtenerKardexProducto } from "./authApi";

export default function Kardex({ token }) {
  const [resumen, setResumen] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const [productoDetalle, setProductoDetalle] = useState(null); // producto seleccionado para ver movimientos
  const [movimientos, setMovimientos] = useState([]);
  const [cargandoMovimientos, setCargandoMovimientos] = useState(false);

  async function cargar() {
    setCargando(true);
    try {
      setResumen(await obtenerResumenInventario(token));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function abrirDetalle(producto) {
    setProductoDetalle(producto);
    setCargandoMovimientos(true);
    try {
      setMovimientos(await obtenerKardexProducto(token, producto.productoId));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargandoMovimientos(false);
    }
  }

  const filtrados = busqueda
    ? resumen.filter((r) =>
        r.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (r.codigo || "").toLowerCase().includes(busqueda.toLowerCase())
      )
    : resumen;

  // Totales generales (suma de todas las filas visibles)
  const totalCompradoGeneral = filtrados.reduce((acc, r) => acc + r.totalComprado, 0);
  const totalVendidoGeneral = filtrados.reduce((acc, r) => acc + r.totalVendido, 0);
  const gananciaGeneral = filtrados.reduce((acc, r) => acc + r.gananciaTotal, 0);

  return (
    <div style={estilos.contenedor}>
      <h3 style={{ marginTop: 0 }}>Kardex — Inventario por producto</h3>
      <p style={estilos.textoAyuda}>
        Totales acumulados de siempre (no depende de un rango de fechas). Para reportes por periodo,
        usa el módulo de Reportes Comerciales.
      </p>

      {/* Totales generales arriba */}
      <div style={estilos.gridTotales}>
        <div style={estilos.tarjetaTotal}>
          <span style={estilos.labelTotal}>Total comprado (histórico)</span>
          <span style={{ ...estilos.valorTotal, color: "#7c3aed" }}>S/ {totalCompradoGeneral.toFixed(2)}</span>
        </div>
        <div style={estilos.tarjetaTotal}>
          <span style={estilos.labelTotal}>Total vendido (histórico)</span>
          <span style={{ ...estilos.valorTotal, color: "#1d4ed8" }}>S/ {totalVendidoGeneral.toFixed(2)}</span>
        </div>
        <div style={estilos.tarjetaTotal}>
          <span style={estilos.labelTotal}>Ganancia total</span>
          <span style={{ ...estilos.valorTotal, color: "#166534" }}>S/ {gananciaGeneral.toFixed(2)}</span>
        </div>
      </div>

      <input
        type="text"
        placeholder="Buscar producto por nombre o código..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        style={estilos.inputBusqueda}
      />

      {error && <p style={estilos.error}>{error}</p>}

      {cargando ? (
        <p>Cargando...</p>
      ) : (
        <table style={estilos.tabla}>
          <thead>
            <tr>
              <th style={estilos.th}>Producto</th>
              <th style={estilos.th}>Stock</th>
              <th style={estilos.th}>Precio compra</th>
              <th style={estilos.th}>Precio venta</th>
              <th style={estilos.th}>Margen/unidad</th>
              <th style={estilos.th}>Cant. comprada</th>
              <th style={estilos.th}>Total comprado</th>
              <th style={estilos.th}>Cant. vendida</th>
              <th style={estilos.th}>Total vendido</th>
              <th style={estilos.th}>Ganancia</th>
              <th style={estilos.th}></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr><td colSpan={11} style={estilos.tdVacio}>No hay productos que coincidan.</td></tr>
            )}
            {filtrados.map((r) => (
              <tr key={r.productoId}>
                <td style={estilos.td}>
                  <div style={estilos.nombreProducto}>{r.nombre}</div>
                  <div style={estilos.subtextoCodigo}>{r.codigo || "—"} · {r.nombreCategoria || "Sin categoría"}</div>
                </td>
                <td style={estilos.td}>
                  <span style={r.stockActual <= 5 ? estilos.stockBajo : undefined}>{r.stockActual}</span>
                </td>
                <td style={estilos.td}>S/ {r.costoUnitarioActual.toFixed(2)}</td>
                <td style={estilos.td}>S/ {r.precioVentaActual.toFixed(2)}</td>
                <td style={estilos.td}>
                  {r.costoUnitarioActual > 0 ? (
                    <span style={estilos.margenUnidad}>
                      S/ {(r.precioVentaActual - r.costoUnitarioActual).toFixed(2)}
                      {" "}({(((r.precioVentaActual - r.costoUnitarioActual) / r.precioVentaActual) * 100).toFixed(0)}%)
                    </span>
                  ) : "—"}
                </td>
                <td style={estilos.td}>{r.cantidadComprada}</td>
                <td style={estilos.td}>S/ {r.totalComprado.toFixed(2)}</td>
                <td style={estilos.td}>{r.cantidadVendida}</td>
                <td style={estilos.td}>S/ {r.totalVendido.toFixed(2)}</td>
                <td style={estilos.td}>
                  <span style={r.gananciaTotal >= 0 ? estilos.gananciaPositiva : estilos.gananciaNegativa}>
                    S/ {r.gananciaTotal.toFixed(2)}
                  </span>
                </td>
                <td style={estilos.td}>
                  <button onClick={() => abrirDetalle(r)} style={estilos.botonVerMovimientos}>
                    Ver movimientos
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal: kardex detallado de un producto */}
      {productoDetalle && (
        <div style={estilos.overlay} onClick={() => setProductoDetalle(null)}>
          <div style={estilos.modal} onClick={(e) => e.stopPropagation()}>
            <div style={estilos.modalEncabezado}>
              <div>
                <h3 style={{ margin: 0 }}>{productoDetalle.nombre}</h3>
                <p style={estilos.subtextoModal}>{productoDetalle.codigo || "—"} · Stock actual: {productoDetalle.stockActual}</p>
              </div>
              <button style={estilos.botonCerrarModal} onClick={() => setProductoDetalle(null)}>✕</button>
            </div>

            {cargandoMovimientos ? (
              <p>Cargando movimientos...</p>
            ) : (
              <div style={estilos.contenedorTablaModal}>
                {movimientos.length === 0 ? (
                  <p style={estilos.textoSecundario}>Este producto todavía no tiene movimientos registrados.</p>
                ) : (
                  <table style={estilos.tablaModal}>
                    <thead>
                      <tr>
                        <th style={estilos.thModal}>Fecha</th>
                        <th style={estilos.thModal}>Tipo</th>
                        <th style={estilos.thModal}>Cantidad</th>
                        <th style={estilos.thModal}>Referencia</th>
                        <th style={estilos.thModal}>Tercero</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimientos.map((m, i) => (
                        <tr key={i}>
                          <td style={estilos.tdModal}>{new Date(m.fecha).toLocaleString("es-PE")}</td>
                          <td style={estilos.tdModal}>
                            <span style={m.cantidad > 0 ? estilos.badgeEntrada : estilos.badgeSalida}>
                              {m.tipo}
                            </span>
                          </td>
                          <td style={estilos.tdModal}>
                            <span style={m.cantidad > 0 ? estilos.cantidadPositiva : estilos.cantidadNegativa}>
                              {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
                            </span>
                          </td>
                          <td style={estilos.tdModal}>{m.referencia}</td>
                          <td style={estilos.tdModal}>{m.nombreTercero || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const estilos = {
  contenedor: { padding: "1.5rem 2rem", maxWidth: "1200px" },
  textoAyuda: { fontSize: "0.85rem", color: "#64748b", marginBottom: "16px", maxWidth: "600px" },
  gridTotales: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "18px" },
  tarjetaTotal: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "6px" },
  labelTotal: { fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.3px" },
  valorTotal: { fontSize: "1.4rem", fontWeight: 800 },
  inputBusqueda: { width: "100%", maxWidth: "400px", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.88rem", marginBottom: "16px" },
  error: { color: "#dc2626", fontSize: "0.85rem" },
  tabla: { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "10px", overflow: "hidden" },
  th: { textAlign: "left", padding: "10px", fontSize: "0.75rem", color: "#64748b", borderBottom: "2px solid #e2e8f0", background: "#f8fafc" },
  td: { padding: "10px", fontSize: "0.85rem", borderBottom: "1px solid #f1f5f9" },
  tdVacio: { padding: "30px", textAlign: "center", color: "#94a3b8" },
  nombreProducto: { fontWeight: 600, color: "#1e293b" },
  subtextoCodigo: { fontSize: "0.72rem", color: "#94a3b8", marginTop: "2px" },
  stockBajo: { color: "#b91c1c", fontWeight: 700 },
  gananciaPositiva: { color: "#166534", fontWeight: 700 },
  gananciaNegativa: { color: "#b91c1c", fontWeight: 700 },
  margenUnidad: { color: "#0891b2", fontWeight: 600, fontSize: "0.8rem" },
  botonVerMovimientos: { background: "#eff6ff", color: "#1d4ed8", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem", whiteSpace: "nowrap" },

  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "#fff", borderRadius: "12px", padding: "24px", width: "700px", maxWidth: "94vw", maxHeight: "82vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" },
  modalEncabezado: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" },
  subtextoModal: { fontSize: "0.8rem", color: "#64748b", margin: "4px 0 0 0" },
  botonCerrarModal: { background: "transparent", border: "none", fontSize: "1.1rem", cursor: "pointer", color: "#64748b" },
  textoSecundario: { color: "#64748b", fontSize: "0.85rem" },
  contenedorTablaModal: { overflowY: "auto", flex: 1 },
  tablaModal: { width: "100%", borderCollapse: "collapse" },
  thModal: { textAlign: "left", padding: "8px 10px", fontSize: "0.75rem", color: "#64748b", borderBottom: "2px solid #e2e8f0", background: "#f8fafc", position: "sticky", top: 0 },
  tdModal: { padding: "8px 10px", fontSize: "0.85rem", borderBottom: "1px solid #f1f5f9" },
  badgeEntrada: { background: "#dcfce7", color: "#166534", padding: "3px 10px", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600 },
  badgeSalida: { background: "#fee2e2", color: "#b91c1c", padding: "3px 10px", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600 },
  cantidadPositiva: { color: "#166534", fontWeight: 700 },
  cantidadNegativa: { color: "#b91c1c", fontWeight: 700 },
};