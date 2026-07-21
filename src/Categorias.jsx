import { useEffect, useState } from "react";
import { listarCategorias, crearCategoria, editarCategoria, cambiarEstadoCategoria } from "./authApi";

export default function Categorias({ token }) {
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editando, setEditando] = useState(null);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    setCargando(true);
    try {
      setCategorias(await listarCategorias(token));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  function abrirNuevo() {
    setEditando(null); setNombre(""); setDescripcion(""); setError("");
    setMostrarModal(true);
  }

  function abrirEditar(c) {
    setEditando(c); setNombre(c.nombre); setDescripcion(c.descripcion || ""); setError("");
    setMostrarModal(true);
  }

  async function manejarGuardar(e) {
    e.preventDefault();
    setError("");
    setGuardando(true);
    try {
      if (editando) {
        await editarCategoria(token, editando.id, { nombre, descripcion });
      } else {
        await crearCategoria(token, { nombre, descripcion });
      }
      setMostrarModal(false);
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function manejarEstado(c) {
    const nuevo = !c.activo;
    if (!confirm(nuevo ? `¿Activar ${c.nombre}?` : `¿Desactivar ${c.nombre}?`)) return;
    try {
      await cambiarEstadoCategoria(token, c.id, nuevo);
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={estilos.contenedor}>
      <div style={estilos.encabezado}>
        <h3 style={{ margin: 0 }}>Categorías</h3>
        <button style={estilos.botonPrimario} onClick={abrirNuevo}>+ Nueva categoría</button>
      </div>

      {error && !mostrarModal && <p style={estilos.error}>{error}</p>}

      {cargando ? (
        <p>Cargando...</p>
      ) : (
        <table style={estilos.tabla}>
          <thead>
            <tr>
              <th style={estilos.th}>Nombre</th>
              <th style={estilos.th}>Descripción</th>
              <th style={estilos.th}>Estado</th>
              <th style={estilos.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {categorias.map((c) => (
              <tr key={c.id}>
                <td style={estilos.td}>{c.nombre}</td>
                <td style={estilos.td}>{c.descripcion || "—"}</td>
                <td style={estilos.td}>
                  <span style={c.activo ? estilos.badgeActivo : estilos.badgeInactivo}>
                    {c.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td style={estilos.td}>
                  <button onClick={() => abrirEditar(c)} style={estilos.botonEditar}>Editar</button>
                  <button
                    onClick={() => manejarEstado(c)}
                    style={c.activo ? estilos.botonDesactivar : estilos.botonActivar}
                  >
                    {c.activo ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {mostrarModal && (
        <div style={estilos.overlay} onClick={() => setMostrarModal(false)}>
          <div style={estilos.modal} onClick={(e) => e.stopPropagation()}>
            <div style={estilos.modalEncabezado}>
              <h3 style={{ margin: 0 }}>{editando ? "Editar categoría" : "Nueva categoría"}</h3>
              <button style={estilos.botonCerrarModal} onClick={() => setMostrarModal(false)}>✕</button>
            </div>
            <form onSubmit={manejarGuardar}>
              <label style={estilos.label}>Nombre</label>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} required style={estilos.input} />

              <label style={estilos.label}>Descripción (opcional)</label>
              <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} style={estilos.input} />

              {error && <p style={estilos.error}>{error}</p>}

              <div style={estilos.modalAcciones}>
                <button type="button" onClick={() => setMostrarModal(false)} style={estilos.botonSecundario}>
                  Cancelar
                </button>
                <button type="submit" disabled={guardando} style={estilos.botonPrimario}>
                  {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear categoría"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const estilos = {
  contenedor: { padding: "1.5rem 2rem", maxWidth: "900px" },
  encabezado: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  botonPrimario: { background: "#1d4ed8", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: 600 },
  botonSecundario: { background: "transparent", border: "1px solid #cbd5e1", padding: "10px 16px", borderRadius: "8px", cursor: "pointer" },
  error: { color: "#dc2626", fontSize: "0.85rem" },
  tabla: { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "10px", overflow: "hidden" },
  th: { textAlign: "left", padding: "10px", fontSize: "0.8rem", color: "#64748b", borderBottom: "2px solid #e2e8f0", background: "#f8fafc" },
  td: { padding: "10px", fontSize: "0.88rem", borderBottom: "1px solid #f1f5f9" },
  badgeActivo: { background: "#dcfce7", color: "#166534", padding: "3px 10px", borderRadius: "999px", fontSize: "0.8rem" },
  badgeInactivo: { background: "#fee2e2", color: "#b91c1c", padding: "3px 10px", borderRadius: "999px", fontSize: "0.8rem" },
  botonEditar: { background: "#eff6ff", color: "#1d4ed8", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", marginRight: "6px", fontSize: "0.8rem" },
  botonActivar: { background: "#dcfce7", color: "#166534", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem" },
  botonDesactivar: { background: "#fee2e2", color: "#b91c1c", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem" },
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "#fff", borderRadius: "12px", padding: "24px", width: "400px", maxWidth: "90vw", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" },
  modalEncabezado: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  botonCerrarModal: { background: "transparent", border: "none", fontSize: "1.1rem", cursor: "pointer", color: "#64748b" },
  label: { display: "block", fontSize: "0.85rem", color: "#334155", marginBottom: "4px", marginTop: "12px" },
  input: { width: "100%", padding: "9px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.95rem", boxSizing: "border-box" },
  modalAcciones: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" },
};