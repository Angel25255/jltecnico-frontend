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
    setEditando(null);
    setNombre("");
    setDescripcion("");
    setError("");
    setMostrarModal(true);
  }

  function abrirEditar(cat) {
    setEditando(cat);
    setNombre(cat.nombre);
    setDescripcion(cat.descripcion || "");
    setError("");
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

  async function manejarCambiarEstado(cat) {
    const nuevo = !cat.activo;
    if (!confirm(nuevo ? `¿Activar la categoría "${cat.nombre}"?` : `¿Desactivar la categoría "${cat.nombre}"?`)) return;
    try {
      await cambiarEstadoCategoria(token, cat.id, nuevo);
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={estilos.contenedor} className="modulo-responsive">
      <div style={estilos.encabezado}>
        <h3 style={{ margin: 0 }}>Categorías</h3>
        <button style={estilos.botonPrimario} onClick={abrirNuevo}>+ Nueva categoría</button>
      </div>

      {error && !mostrarModal && <p style={estilos.error}>{error}</p>}

      {cargando ? (
        <p>Cargando categorías...</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
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
              {categorias.length === 0 && (
                <tr><td colSpan={4} style={estilos.tdVacio}>No hay categorías registradas.</td></tr>
              )}
              {categorias.map((c) => (
                <tr key={c.id}>
                  <td style={estilos.td}>{c.nombre}</td>
                  <td style={estilos.td}>{c.descripcion || "Ninguna"}</td>
                  <td style={estilos.td}>
                    <span style={c.activo ? estilos.badgeActivo : estilos.badgeInactivo}>
                      {c.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td style={estilos.td}>
                    <div style={estilos.grupoBotones}>
                      <button onClick={() => abrirEditar(c)} style={estilos.botonEditar}>Editar</button>
                      <button
                        onClick={() => manejarCambiarEstado(c)}
                        style={c.activo ? estilos.botonDesactivar : estilos.botonActivar}
                      >
                        {c.activo ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* A propósito NO se cierra al hacer clic afuera - solo con la ✕ o "Cancelar" */}
      {mostrarModal && (
        <div style={estilos.overlay}>
          <div style={estilos.modal}>
            <div style={estilos.modalEncabezado}>
              <h3 style={{ margin: 0 }}>{editando ? "Editar categoría" : "Nueva categoría"}</h3>
              <button style={estilos.botonCerrarModal} onClick={() => setMostrarModal(false)}>✕</button>
            </div>

            <form onSubmit={manejarGuardar}>
              <label style={estilos.label}>Nombre</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                style={estilos.input}
                placeholder="Ej. Cables y Conductores"
              />

              <label style={estilos.label}>Descripción (opcional)</label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                style={{ ...estilos.input, minHeight: "70px", resize: "vertical" }}
              />

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
  encabezado: { display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  botonPrimario: { background: "#1d4ed8", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: 600 },
  botonSecundario: { background: "transparent", border: "1px solid #cbd5e1", padding: "10px 16px", borderRadius: "8px", cursor: "pointer" },
  error: { color: "#dc2626", fontSize: "0.85rem" },

  tabla: { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "10px", overflow: "hidden", minWidth: "550px" },
  th: { textAlign: "left", padding: "10px", fontSize: "0.8rem", color: "#64748b", borderBottom: "2px solid #e2e8f0", background: "#f8fafc" },
  td: { padding: "10px", fontSize: "0.88rem", borderBottom: "1px solid #f1f5f9" },
  tdVacio: { padding: "30px", textAlign: "center", color: "#94a3b8" },
  badgeActivo: { background: "#dcfce7", color: "#166534", padding: "3px 10px", borderRadius: "999px", fontSize: "0.8rem" },
  badgeInactivo: { background: "#fee2e2", color: "#b91c1c", padding: "3px 10px", borderRadius: "999px", fontSize: "0.8rem" },
  grupoBotones: { display: "flex", gap: "6px" },
  botonEditar: { background: "#eff6ff", color: "#1d4ed8", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem" },
  botonActivar: { background: "#dcfce7", color: "#166534", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem" },
  botonDesactivar: { background: "#fee2e2", color: "#b91c1c", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem" },

  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px" },
  modal: { background: "#fff", borderRadius: "12px", padding: "24px", width: "420px", maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" },
  modalEncabezado: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  botonCerrarModal: { background: "transparent", border: "none", fontSize: "1.1rem", cursor: "pointer", color: "#64748b" },
  label: { display: "block", fontSize: "0.85rem", color: "#334155", marginBottom: "4px", marginTop: "12px" },
  input: { width: "100%", padding: "9px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.95rem", boxSizing: "border-box" },
  modalAcciones: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" },
};