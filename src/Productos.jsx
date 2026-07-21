import { useEffect, useState } from "react";
import { listarProductos, crearProducto, editarProducto, cambiarEstadoProducto, listarCategorias } from "./authApi";

const UNIDADES = ["Unidad", "Rollo", "Caja", "Metro", "Kg", "Litro", "Par", "Juego"];

export default function Productos({ token }) {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState("");
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editando, setEditando] = useState(null);

  const [codigo, setCodigo] = useState("");
  const [costoUnitario, setCostoUnitario] = useState("");
  const [nombre, setNombre] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [unidadMedida, setUnidadMedida] = useState("Unidad");
  const [precioUnitario, setPrecioUnitario] = useState("");
  const [stock, setStock] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function cargar(filtroBusqueda = busqueda) {
    setCargando(true);
    try {
      const [prods, cats] = await Promise.all([
        listarProductos(token, filtroBusqueda),
        categorias.length === 0 ? listarCategorias(token) : Promise.resolve(categorias),
      ]);
      setProductos(prods);
      if (categorias.length === 0) setCategorias(cats);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  function manejarBuscar(e) {
    e.preventDefault();
    cargar(busqueda);
  }

  function abrirNuevo() {
    setEditando(null);
    setCodigo(""); setNombre(""); setCategoriaId(""); setUnidadMedida("Unidad");
    setPrecioUnitario(""); setCostoUnitario(""); setStock(""); setError("");
    setMostrarModal(true);
  }

  function abrirEditar(p) {
    setEditando(p);
    setCodigo(p.codigo || ""); setNombre(p.nombre); setCategoriaId(p.categoriaId || "");
    setUnidadMedida(p.unidadMedida); setPrecioUnitario(String(p.precioUnitario));
    setCostoUnitario(String(p.costoUnitario || 0)); setStock(String(p.stock));
    setError("");
    setMostrarModal(true);
  }

  async function manejarGuardar(e) {
    e.preventDefault();
    setError("");
    setGuardando(true);
    try {
      const datos = {
        codigo: codigo || null,
        nombre,
        categoriaId: categoriaId ? parseInt(categoriaId, 10) : null,
        unidadMedida,
        precioUnitario: parseFloat(precioUnitario),
        costoUnitario: parseFloat(costoUnitario || 0),
        stock: parseInt(stock, 10),
      };
      if (editando) {
        await editarProducto(token, editando.id, datos);
      } else {
        await crearProducto(token, datos);
      }
      setMostrarModal(false);
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function manejarEstado(p) {
    const nuevo = !p.activo;
    if (!confirm(nuevo ? `¿Activar ${p.nombre}?` : `¿Desactivar ${p.nombre}?`)) return;
    try {
      await cambiarEstadoProducto(token, p.id, nuevo);
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={estilos.contenedor} className="modulo-responsive">
      <div style={estilos.encabezado}>
        <h3 style={{ margin: 0 }}>Productos</h3>
        <button style={estilos.botonPrimario} onClick={abrirNuevo}>+ Nuevo producto</button>
      </div>

      <form onSubmit={manejarBuscar} style={estilos.barraBusqueda}>
        <input
          type="text"
          placeholder="Buscar por nombre o código..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={estilos.inputBusqueda}
        />
        <button type="submit" style={estilos.botonSecundario}>Buscar</button>
      </form>

      {error && !mostrarModal && <p style={estilos.error}>{error}</p>}

      {cargando ? (
        <p>Cargando...</p>
      ) : (
        <>
          {/* ---------------- Vista de TARJETAS - solo en celular ---------------- */}
          <div className="vista-tarjetas-movil">
            {productos.length === 0 && (
              <p style={estilos.tdVacioMovil}>No hay productos con esa búsqueda.</p>
            )}
            {productos.map((p) => (
              <div key={p.id} style={estilos.tarjetaProducto}>
                <div style={estilos.tarjetaEncabezado}>
                  <div>
                    <strong style={estilos.tarjetaNombre}>{p.nombre}</strong>
                    <div style={estilos.tarjetaSub}>
                      <code style={estilos.codigo}>{p.codigo || "sin código"}</code>
                      {" · "}{p.nombreCategoria || "Sin categoría"} · {p.unidadMedida}
                    </div>
                  </div>
                  <span style={p.activo ? estilos.badgeActivo : estilos.badgeInactivo}>
                    {p.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>

                <div style={estilos.tarjetaGridPrecios}>
                  <div style={estilos.tarjetaPrecioBox}>
                    <span style={estilos.tarjetaPrecioLabel}>Costo</span>
                    <span style={estilos.tarjetaPrecioValor}>S/ {(p.costoUnitario || 0).toFixed(2)}</span>
                  </div>
                  <div style={estilos.tarjetaPrecioBox}>
                    <span style={estilos.tarjetaPrecioLabel}>Precio</span>
                    <span style={estilos.tarjetaPrecioValor}>S/ {p.precioUnitario.toFixed(2)}</span>
                  </div>
                  <div style={estilos.tarjetaPrecioBox}>
                    <span style={estilos.tarjetaPrecioLabel}>Margen</span>
                    <span style={estilos.margenPositivo}>
                      {p.costoUnitario > 0 ? `${(((p.precioUnitario - p.costoUnitario) / p.precioUnitario) * 100).toFixed(0)}%` : "—"}
                    </span>
                  </div>
                </div>

                <div style={estilos.tarjetaFila}>
                  <span>Stock</span>
                  <span style={p.stock <= 5 ? estilos.stockBajo : undefined}>{p.stock}</span>
                </div>

                <div style={estilos.tarjetaBotones}>
                  <button onClick={() => abrirEditar(p)} style={estilos.botonEditarMovil}>Editar</button>
                  <button
                    onClick={() => manejarEstado(p)}
                    style={p.activo ? estilos.botonDesactivarMovil : estilos.botonActivarMovil}
                  >
                    {p.activo ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ---------------- Vista de TABLA - solo en pantallas grandes ---------------- */}
          <div style={{ overflowX: "auto" }} className="vista-tabla-escritorio">
            <table style={estilos.tabla}>
              <thead>
                <tr>
                  <th style={estilos.th}>Código</th>
                  <th style={estilos.th}>Producto</th>
                  <th style={estilos.th}>Categoría</th>
                  <th style={estilos.th}>Unidad</th>
                  <th style={estilos.th}>Costo</th>
                  <th style={estilos.th}>Precio (incl. IGV)</th>
                  <th style={estilos.th}>Margen</th>
                  <th style={estilos.th}>Stock</th>
                  <th style={estilos.th}>Estado</th>
                  <th style={estilos.th}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productos.length === 0 && (
                  <tr><td colSpan={10} style={estilos.tdVacio}>No hay productos con esa búsqueda.</td></tr>
                )}
                {productos.map((p) => (
                  <tr key={p.id}>
                    <td style={estilos.td}><code style={estilos.codigo}>{p.codigo || "—"}</code></td>
                    <td style={estilos.td}>{p.nombre}</td>
                    <td style={estilos.td}>{p.nombreCategoria || "—"}</td>
                    <td style={estilos.td}>{p.unidadMedida}</td>
                    <td style={estilos.td}>S/ {(p.costoUnitario || 0).toFixed(2)}</td>
                    <td style={estilos.td}>S/ {p.precioUnitario.toFixed(2)}</td>
                    <td style={estilos.td}>
                      {p.costoUnitario > 0
                        ? <span style={estilos.margenPositivo}>{(((p.precioUnitario - p.costoUnitario) / p.precioUnitario) * 100).toFixed(0)}%</span>
                        : "—"}
                    </td>
                    <td style={estilos.td}>
                      <span style={p.stock <= 5 ? estilos.stockBajo : undefined}>{p.stock}</span>
                    </td>
                    <td style={estilos.td}>
                      <span style={p.activo ? estilos.badgeActivo : estilos.badgeInactivo}>
                        {p.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td style={estilos.td}>
                      <button onClick={() => abrirEditar(p)} style={estilos.botonEditar}>Editar</button>
                      <button
                        onClick={() => manejarEstado(p)}
                        style={p.activo ? estilos.botonDesactivar : estilos.botonActivar}
                      >
                        {p.activo ? "Desactivar" : "Activar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {mostrarModal && (
        <div style={estilos.overlay} onClick={() => setMostrarModal(false)}>
          <div style={estilos.modal} onClick={(e) => e.stopPropagation()}>
            <div style={estilos.modalEncabezado}>
              <h3 style={{ margin: 0 }}>{editando ? "Editar producto" : "Nuevo producto"}</h3>
              <button style={estilos.botonCerrarModal} onClick={() => setMostrarModal(false)}>✕</button>
            </div>
            <form onSubmit={manejarGuardar}>
              <label style={estilos.label}>Código (opcional)</label>
              <input value={codigo} onChange={(e) => setCodigo(e.target.value)} style={estilos.input} placeholder="Ej. CAB-001" />

              <label style={estilos.label}>Nombre del producto</label>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} required style={estilos.input} />

              <label style={estilos.label}>Categoría</label>
              <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} style={estilos.input}>
                <option value="">Sin categoría</option>
                {categorias.filter((c) => c.activo).map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>

              <label style={estilos.label}>Unidad de medida</label>
              <select value={unidadMedida} onChange={(e) => setUnidadMedida(e.target.value)} style={estilos.input}>
                {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>

              <label style={estilos.label}>Costo unitario (S/, lo que te cuesta comprarlo)</label>
              <input
                type="number" step="0.01" min="0"
                value={costoUnitario} onChange={(e) => setCostoUnitario(e.target.value)}
                style={estilos.input}
                placeholder="0.00 (se actualiza solo con cada compra)"
              />

              <label style={estilos.label}>Precio unitario (S/, ya incluye IGV)</label>
              <input
                type="number" step="0.01" min="0"
                value={precioUnitario} onChange={(e) => setPrecioUnitario(e.target.value)}
                required style={estilos.input}
              />

              <label style={estilos.label}>Stock</label>
              <input
                type="number" min="0"
                value={stock} onChange={(e) => setStock(e.target.value)}
                required style={estilos.input}
              />

              {error && <p style={estilos.error}>{error}</p>}

              <div style={estilos.modalAcciones}>
                <button type="button" onClick={() => setMostrarModal(false)} style={estilos.botonSecundario}>
                  Cancelar
                </button>
                <button type="submit" disabled={guardando} style={estilos.botonPrimario}>
                  {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .vista-tarjetas-movil { display: none; }
        @media (max-width: 640px) {
          .vista-tarjetas-movil { display: flex; flex-direction: column; gap: 12px; }
          .vista-tabla-escritorio { display: none; }
        }
      `}</style>
    </div>
  );
}

const estilos = {
  contenedor: { padding: "1.5rem 2rem", maxWidth: "1100px" },
  encabezado: { display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  barraBusqueda: { display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" },
  inputBusqueda: { flex: 1, minWidth: "200px", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem" },
  botonPrimario: { background: "#1d4ed8", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: 600 },
  botonSecundario: { background: "transparent", border: "1px solid #cbd5e1", padding: "10px 16px", borderRadius: "8px", cursor: "pointer" },
  error: { color: "#dc2626", fontSize: "0.85rem" },

  // ---- Tarjetas (celular) ----
  tdVacioMovil: { padding: "30px", textAlign: "center", color: "#94a3b8" },
  tarjetaProducto: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px" },
  tarjetaEncabezado: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", gap: "8px" },
  tarjetaNombre: { fontSize: "0.92rem", color: "#1e293b" },
  tarjetaSub: { fontSize: "0.75rem", color: "#64748b", marginTop: "3px" },
  tarjetaGridPrecios: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "10px" },
  tarjetaPrecioBox: { background: "#f8fafc", borderRadius: "8px", padding: "8px", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" },
  tarjetaPrecioLabel: { fontSize: "0.68rem", color: "#94a3b8", textTransform: "uppercase" },
  tarjetaPrecioValor: { fontSize: "0.85rem", fontWeight: 700, color: "#1e293b" },
  tarjetaFila: { display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "#475569", padding: "6px 0", borderTop: "1px solid #f8fafc" },
  tarjetaBotones: { display: "flex", gap: "8px", marginTop: "10px" },
  botonEditarMovil: { flex: 1, background: "#eff6ff", color: "#1d4ed8", border: "none", padding: "9px", borderRadius: "6px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 },
  botonActivarMovil: { flex: 1, background: "#dcfce7", color: "#166534", border: "none", padding: "9px", borderRadius: "6px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 },
  botonDesactivarMovil: { flex: 1, background: "#fee2e2", color: "#b91c1c", border: "none", padding: "9px", borderRadius: "6px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 },

  // ---- Tabla (escritorio) ----
  tabla: { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "10px", overflow: "hidden", minWidth: "1000px" },
  th: { textAlign: "left", padding: "10px", fontSize: "0.78rem", color: "#64748b", borderBottom: "2px solid #e2e8f0", background: "#f8fafc" },
  td: { padding: "10px", fontSize: "0.85rem", borderBottom: "1px solid #f1f5f9" },
  tdVacio: { padding: "30px", textAlign: "center", color: "#94a3b8" },
  codigo: { fontFamily: "monospace", fontSize: "0.8rem", color: "#64748b" },
  stockBajo: { color: "#b91c1c", fontWeight: 700 },
  margenPositivo: { color: "#166534", fontWeight: 700, fontSize: "0.8rem" },
  badgeActivo: { background: "#dcfce7", color: "#166534", padding: "3px 10px", borderRadius: "999px", fontSize: "0.8rem" },
  badgeInactivo: { background: "#fee2e2", color: "#b91c1c", padding: "3px 10px", borderRadius: "999px", fontSize: "0.8rem" },
  botonEditar: { background: "#eff6ff", color: "#1d4ed8", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", marginRight: "6px", fontSize: "0.8rem" },
  botonActivar: { background: "#dcfce7", color: "#166534", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem" },
  botonDesactivar: { background: "#fee2e2", color: "#b91c1c", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem" },

  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px" },
  modal: { background: "#fff", borderRadius: "12px", padding: "24px", width: "400px", maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" },
  modalEncabezado: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  botonCerrarModal: { background: "transparent", border: "none", fontSize: "1.1rem", cursor: "pointer", color: "#64748b" },
  label: { display: "block", fontSize: "0.85rem", color: "#334155", marginBottom: "4px", marginTop: "12px" },
  input: { width: "100%", padding: "9px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.95rem", boxSizing: "border-box" },
  modalAcciones: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" },
};