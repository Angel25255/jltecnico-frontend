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
    <div style={estilos.contenedor} className="modulo-responsive">
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
        <>
          {/* ---------------- Vista de TARJETAS - solo en celular ---------------- */}
          <div className="vista-tarjetas-movil">
            {filtrados.length === 0 && (
              <p style={estilos.tdVacioMovil}>No hay productos que coincidan.</p>
            )}
            {filtrados.map((r) => (
              <div key={r.productoId} style={estilos.tarjetaProd}>
                <div style={estilos.tarjetaEncabezado}>
                  <div>
                    <strong style={estilos.tarjetaNombre}>{r.nombre}</strong>
                    <div style={estilos.tarjetaSub}>{r.codigo || "—"} · {r.nombreCategoria || "Sin categoría"}</div>
                  </div>
                  <span style={r.stockActual <= 5 ? estilos.stockBajoBadge : estilos.stockOkBadge}>
                    Stock: {r.stockActual}
                  </span>
                </div>

                <div style={estilos.tarjetaGridPrecios}>
                  <div style={estilos.tarjetaPrecioBox}>
                    <span style={estilos.tarjetaPrecioLabel}>Compra</span>
                    <span style={estilos.tarjetaPrecioValor}>S/ {r.costoUnitarioActual.toFixed(2)}</span>
                  </div>
                  <div style={estilos.tarjetaPrecioBox}>
                    <span style={estilos.tarjetaPrecioLabel}>Venta</span>
                    <span style={estilos.tarjetaPrecioValor}>S/ {r.precioVentaActual.toFixed(2)}</span>
                  </div>
                  <div style={estilos.tarjetaPrecioBox}>
                    <span style={estilos.tarjetaPrecioLabel}>Margen</span>
                    <span style={estilos.margenUnidad}>
                      {r.costoUnitarioActual > 0
                        ? `${(((r.precioVentaActual - r.costoUnitarioActual) / r.precioVentaActual) * 100).toFixed(0)}%`
                        : "—"}
                    </span>
                  </div>
                </div>

                <div style={estilos.tarjetaFila}><span>Comprado</span><span>{r.cantidadComprada} un. · S/ {r.totalComprado.toFixed(2)}</span></div>
                <div style={estilos.tarjetaFila}><span>Vendido</span><span>{r.cantidadVendida} un. · S/ {r.totalVendido.toFixed(2)}</span></div>
                <div style={estilos.tarjetaFilaGanancia}>
                  <span>Ganancia</span>
                  <span style={r.gananciaTotal >= 0 ? estilos.gananciaPositiva : estilos.gananciaNegativa}>
                    S/ {r.gananciaTotal.toFixed(2)}
                  </span>
                </div>

                <button onClick={() => abrirDetalle(r)} style={estilos.botonVerMovimientosMovil}>
                  Ver movimientos
                </button>
              </div>
            ))}
          </div>

          {/* ---------------- Vista de TABLA - solo en pantallas grandes ---------------- */}
          <div style={{ overflowX: "auto" }} className="vista-tabla-escritorio">
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
          </div>
        </>
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
                  <>
                    {/* Tarjetas de movimientos - celular */}
                    <div className="vista-tarjetas-movimientos-movil">
                      {movimientos.map((m, i) => (
                        <div key={i} style={estilos.tarjetaMovimiento}>
                          <div style={estilos.tarjetaMovEncabezado}>
                            <span style={m.cantidad > 0 ? estilos.badgeEntrada : estilos.badgeSalida}>{m.tipo}</span>
                            <span style={m.cantidad > 0 ? estilos.cantidadPositiva : estilos.cantidadNegativa}>
                              {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
                            </span>
                          </div>
                          <div style={estilos.tarjetaMovFila}>{new Date(m.fecha).toLocaleString("es-PE")}</div>
                          <div style={estilos.tarjetaMovFila}>{m.referencia} {m.nombreTercero ? `· ${m.nombreTercero}` : ""}</div>
                        </div>
                      ))}
                    </div>

                    {/* Tabla de movimientos - escritorio */}
                    <table style={estilos.tablaModal} className="vista-tabla-movimientos-escritorio">
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
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .vista-tarjetas-movil { display: none; }
        .vista-tarjetas-movimientos-movil { display: none; }
        @media (max-width: 640px) {
          .vista-tarjetas-movil { display: flex; flex-direction: column; gap: 12px; }
          .vista-tabla-escritorio { display: none; }
          .vista-tarjetas-movimientos-movil { display: flex; flex-direction: column; gap: 8px; }
          .vista-tabla-movimientos-escritorio { display: none; }
        }
      `}</style>
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

  // ---- Tarjetas de producto (celular) ----
  tdVacioMovil: { padding: "30px", textAlign: "center", color: "#94a3b8" },
  tarjetaProd: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px" },
  tarjetaEncabezado: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px", gap: "8px" },
  tarjetaNombre: { fontSize: "0.92rem", color: "#1e293b" },
  tarjetaSub: { fontSize: "0.75rem", color: "#64748b", marginTop: "2px" },
  stockOkBadge: { background: "#f1f5f9", color: "#475569", fontSize: "0.72rem", padding: "3px 9px", borderRadius: "999px", whiteSpace: "nowrap" },
  stockBajoBadge: { background: "#fee2e2", color: "#b91c1c", fontSize: "0.72rem", padding: "3px 9px", borderRadius: "999px", fontWeight: 700, whiteSpace: "nowrap" },
  tarjetaGridPrecios: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "10px" },
  tarjetaPrecioBox: { background: "#f8fafc", borderRadius: "8px", padding: "8px", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" },
  tarjetaPrecioLabel: { fontSize: "0.68rem", color: "#94a3b8", textTransform: "uppercase" },
  tarjetaPrecioValor: { fontSize: "0.85rem", fontWeight: 700, color: "#1e293b" },
  tarjetaFila: { display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#475569", padding: "5px 0", borderTop: "1px solid #f8fafc" },
  tarjetaFilaGanancia: { display: "flex", justifyContent: "space-between", fontSize: "0.9rem", color: "#1e293b", padding: "8px 0 10px 0", borderTop: "1px solid #f8fafc" },
  botonVerMovimientosMovil: { width: "100%", background: "#eff6ff", color: "#1d4ed8", border: "none", padding: "10px", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 },

  // ---- Tabla de productos (escritorio) ----
  tabla: { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "10px", overflow: "hidden", minWidth: "1100px" },
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

  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px" },
  modal: { background: "#fff", borderRadius: "12px", padding: "24px", width: "700px", maxWidth: "94vw", maxHeight: "82vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" },
  modalEncabezado: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" },
  subtextoModal: { fontSize: "0.8rem", color: "#64748b", margin: "4px 0 0 0" },
  botonCerrarModal: { background: "transparent", border: "none", fontSize: "1.1rem", cursor: "pointer", color: "#64748b" },
  textoSecundario: { color: "#64748b", fontSize: "0.85rem" },
  contenedorTablaModal: { overflowY: "auto", flex: 1 },

  // ---- Tarjetas de movimientos (celular, dentro del modal) ----
  tarjetaMovimiento: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px" },
  tarjetaMovEncabezado: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" },
  tarjetaMovFila: { fontSize: "0.78rem", color: "#475569", padding: "2px 0" },

  // ---- Tabla de movimientos (escritorio, dentro del modal) ----
  tablaModal: { width: "100%", borderCollapse: "collapse" },
  thModal: { textAlign: "left", padding: "8px 10px", fontSize: "0.75rem", color: "#64748b", borderBottom: "2px solid #e2e8f0", background: "#f8fafc", position: "sticky", top: 0 },
  tdModal: { padding: "8px 10px", fontSize: "0.85rem", borderBottom: "1px solid #f1f5f9" },
  badgeEntrada: { background: "#dcfce7", color: "#166534", padding: "3px 10px", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600 },
  badgeSalida: { background: "#fee2e2", color: "#b91c1c", padding: "3px 10px", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600 },
  cantidadPositiva: { color: "#166534", fontWeight: 700 },
  cantidadNegativa: { color: "#b91c1c", fontWeight: 700 },
};