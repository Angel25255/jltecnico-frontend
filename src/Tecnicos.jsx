import { useEffect, useState } from "react";
import { listarTecnicos, actualizarPerfilTecnico } from "./authApi";

const COLOR_ESTADO = {
  Disponible: { bg: "#dcfce7", texto: "#166534" },
  Ocupado: { bg: "#fef3c7", texto: "#92400e" },
  Ausente: { bg: "#fee2e2", texto: "#b91c1c" },
};

function Estrellas({ valor }) {
  if (valor === null || valor === undefined) {
    return <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>Sin calificar</span>;
  }
  const llenas = Math.round(valor);
  return (
    <span style={{ color: "#f59e0b", fontSize: "0.85rem" }}>
      {"★".repeat(llenas)}{"☆".repeat(5 - llenas)}
      <span style={{ color: "#64748b", fontSize: "0.75rem", marginLeft: "4px" }}>({valor.toFixed(1)})</span>
    </span>
  );
}

export default function Tecnicos({ token, esAdmin }) {
  const [tecnicos, setTecnicos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [editando, setEditando] = useState(null);

  const [especialidad, setEspecialidad] = useState("");
  const [estadoDisponibilidad, setEstadoDisponibilidad] = useState("Disponible");
  const [calificacion, setCalificacion] = useState("");
  const [totalServicios, setTotalServicios] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    setCargando(true);
    try {
      setTecnicos(await listarTecnicos(token));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  function abrirEditar(t) {
    setEditando(t);
    setEspecialidad(t.especialidad || "");
    setEstadoDisponibilidad(t.estadoDisponibilidad);
    setCalificacion(t.calificacionPromedio != null ? String(t.calificacionPromedio) : "");
    setTotalServicios(String(t.totalServiciosCompletados));
    setError("");
  }

  async function manejarGuardar(e) {
    e.preventDefault();
    setError("");
    setGuardando(true);
    try {
      await actualizarPerfilTecnico(token, editando.usuarioId, {
        especialidad: especialidad || null,
        estadoDisponibilidad,
        calificacionPromedio: calificacion !== "" ? parseFloat(calificacion) : null,
        totalServiciosCompletados: parseInt(totalServicios || "0", 10),
      });
      setEditando(null);
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  // Cambio rápido de estado directo desde la tabla (sin abrir el modal)
  async function cambiarEstadoRapido(t, nuevoEstado) {
    try {
      await actualizarPerfilTecnico(token, t.usuarioId, {
        especialidad: t.especialidad,
        estadoDisponibilidad: nuevoEstado,
        calificacionPromedio: t.calificacionPromedio,
        totalServiciosCompletados: t.totalServiciosCompletados,
      });
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={estilos.contenedor}>
      <h3 style={{ marginTop: 0 }}>Gestión de Técnicos</h3>
      <p style={estilos.textoAyuda}>
        Especialidad, disponibilidad y desempeño de cada técnico. El contador de "órdenes activas"
        se conectará automáticamente cuando esté listo el módulo de Órdenes de Servicio.
      </p>

      {error && <p style={estilos.error}>{error}</p>}

      {cargando ? (
        <p>Cargando técnicos...</p>
      ) : tecnicos.length === 0 ? (
        <p style={estilos.textoSecundario}>
          Todavía no hay usuarios con rol "Técnico". Créalos desde Administración de Usuarios.
        </p>
      ) : (
        <div style={estilos.gridTarjetas}>
          {tecnicos.map((t) => {
            const color = COLOR_ESTADO[t.estadoDisponibilidad] || COLOR_ESTADO.Disponible;
            return (
              <div key={t.usuarioId} style={estilos.tarjetaTecnico}>
                <div style={estilos.encabezadoTarjeta}>
                  <div style={estilos.avatar}>{t.nombreCompleto.charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={estilos.nombreTecnico}>{t.nombreCompleto}</div>
                    <div style={estilos.correoTecnico}>{t.correo}</div>
                  </div>
                  {!t.activo && <span style={estilos.badgeInactivo}>Cuenta desactivada</span>}
                </div>

                <div style={estilos.filaCampo}>
                  <span style={estilos.labelCampo}>Especialidad</span>
                  <span style={estilos.valorCampo}>{t.especialidad || "No especificada"}</span>
                </div>

                <div style={estilos.filaCampo}>
                  <span style={estilos.labelCampo}>Estado</span>
                  <div style={estilos.selectorEstado}>
                    {["Disponible", "Ocupado", "Ausente"].map((estado) => {
                      const colorBtn = COLOR_ESTADO[estado];
                      const activo = t.estadoDisponibilidad === estado;
                      return (
                        <button
                          key={estado}
                          onClick={() => cambiarEstadoRapido(t, estado)}
                          style={{
                            ...estilos.botonEstado,
                            background: activo ? colorBtn.bg : "transparent",
                            color: activo ? colorBtn.texto : "#94a3b8",
                            border: activo ? `1px solid ${colorBtn.texto}` : "1px solid #e2e8f0",
                          }}
                        >
                          {estado}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={estilos.filaCampo}>
                  <span style={estilos.labelCampo}>Órdenes activas</span>
                  <span style={estilos.badgeOrdenes}>{t.ordenesActivas}</span>
                </div>

                <div style={estilos.filaCampo}>
                  <span style={estilos.labelCampo}>Servicios completados</span>
                  <span style={estilos.valorCampo}>{t.totalServiciosCompletados}</span>
                </div>

                <div style={estilos.filaCampo}>
                  <span style={estilos.labelCampo}>Calificación</span>
                  <Estrellas valor={t.calificacionPromedio} />
                </div>

                {esAdmin && (
                  <button onClick={() => abrirEditar(t)} style={estilos.botonEditarPerfil}>
                    Editar perfil
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de edición completa */}
      {editando && (
        <div style={estilos.overlay} onClick={() => setEditando(null)}>
          <div style={estilos.modal} onClick={(e) => e.stopPropagation()}>
            <div style={estilos.modalEncabezado}>
              <h3 style={{ margin: 0 }}>Editar perfil: {editando.nombreCompleto}</h3>
              <button style={estilos.botonCerrarModal} onClick={() => setEditando(null)}>✕</button>
            </div>

            <form onSubmit={manejarGuardar}>
              <label style={estilos.label}>Especialidad</label>
              <input
                value={especialidad}
                onChange={(e) => setEspecialidad(e.target.value)}
                style={estilos.input}
                placeholder="Ej. Electricidad, Redes, Instalaciones"
              />

              <label style={estilos.label}>Estado de disponibilidad</label>
              <select value={estadoDisponibilidad} onChange={(e) => setEstadoDisponibilidad(e.target.value)} style={estilos.input}>
                <option value="Disponible">Disponible</option>
                <option value="Ocupado">Ocupado</option>
                <option value="Ausente">Ausente</option>
              </select>

              <label style={estilos.label}>Calificación (0.0 a 5.0)</label>
              <input
                type="number" min="0" max="5" step="0.1"
                value={calificacion}
                onChange={(e) => setCalificacion(e.target.value)}
                style={estilos.input}
                placeholder="Ej. 4.5"
              />

              <label style={estilos.label}>Total de servicios completados</label>
              <input
                type="number" min="0"
                value={totalServicios}
                onChange={(e) => setTotalServicios(e.target.value)}
                style={estilos.input}
              />

              {error && <p style={estilos.error}>{error}</p>}

              <div style={estilos.modalAcciones}>
                <button type="button" onClick={() => setEditando(null)} style={estilos.botonSecundario}>
                  Cancelar
                </button>
                <button type="submit" disabled={guardando} style={estilos.botonPrimario}>
                  {guardando ? "Guardando..." : "Guardar cambios"}
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
  contenedor: { padding: "1.5rem 2rem", maxWidth: "1100px" },
  textoAyuda: { fontSize: "0.85rem", color: "#64748b", marginBottom: "20px", maxWidth: "600px" },
  error: { color: "#dc2626", fontSize: "0.85rem", marginBottom: "12px" },
  textoSecundario: { color: "#94a3b8", fontSize: "0.9rem" },

  gridTarjetas: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" },
  tarjetaTecnico: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "18px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  encabezadoTarjeta: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" },
  avatar: {
    width: "40px", height: "40px", borderRadius: "50%", background: "#eff6ff", color: "#1d4ed8",
    display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0,
  },
  nombreTecnico: { fontWeight: 700, fontSize: "0.92rem", color: "#1e293b" },
  correoTecnico: { fontSize: "0.75rem", color: "#94a3b8" },
  badgeInactivo: { background: "#fee2e2", color: "#b91c1c", fontSize: "0.7rem", padding: "3px 8px", borderRadius: "999px", fontWeight: 600, whiteSpace: "nowrap" },

  filaCampo: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #f8fafc" },
  labelCampo: { fontSize: "0.78rem", color: "#64748b" },
  valorCampo: { fontSize: "0.85rem", color: "#334155", fontWeight: 600, textAlign: "right" },

  selectorEstado: { display: "flex", gap: "4px" },
  botonEstado: { padding: "4px 8px", borderRadius: "6px", cursor: "pointer", fontSize: "0.7rem", fontWeight: 600 },

  badgeOrdenes: { background: "#eff6ff", color: "#1d4ed8", padding: "2px 10px", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 700 },

  botonEditarPerfil: {
    width: "100%", marginTop: "12px", background: "#f8fafc", border: "1px solid #cbd5e1",
    padding: "9px", borderRadius: "8px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, color: "#334155",
  },

  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "#fff", borderRadius: "12px", padding: "24px", width: "420px", maxWidth: "90vw", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" },
  modalEncabezado: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  botonCerrarModal: { background: "transparent", border: "none", fontSize: "1.1rem", cursor: "pointer", color: "#64748b" },
  label: { display: "block", fontSize: "0.85rem", color: "#334155", marginBottom: "4px", marginTop: "12px" },
  input: { width: "100%", padding: "9px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.95rem", boxSizing: "border-box" },
  modalAcciones: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" },
  botonPrimario: { background: "#1d4ed8", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: 600 },
  botonSecundario: { background: "transparent", border: "1px solid #cbd5e1", padding: "10px 16px", borderRadius: "8px", cursor: "pointer" },
};