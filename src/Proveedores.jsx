import { useEffect, useState } from "react";
import {
  listarProveedores, crearProveedor, editarProveedor, cambiarEstadoProveedor, consultarDocumento,
} from "./authApi";

export default function Proveedores({ token }) {
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState("");
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editando, setEditando] = useState(null);

  const [ruc, setRuc] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [nombreContacto, setNombreContacto] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [direccion, setDireccion] = useState("");
  const [buscandoRuc, setBuscandoRuc] = useState(false);
  const [mensajeBusqueda, setMensajeBusqueda] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function cargar(filtro = busqueda) {
    setCargando(true);
    try {
      setProveedores(await listarProveedores(token, filtro));
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
    setRuc(""); setRazonSocial(""); setNombreContacto(""); setTelefono(""); setCorreo(""); setDireccion("");
    setMensajeBusqueda(""); setError("");
    setMostrarModal(true);
  }

  function abrirEditar(p) {
    setEditando(p);
    setRuc(p.ruc); setRazonSocial(p.razonSocial); setNombreContacto(p.nombreContacto || "");
    setTelefono(p.telefono || ""); setCorreo(p.correo || ""); setDireccion(p.direccion || "");
    setMensajeBusqueda(""); setError("");
    setMostrarModal(true);
  }

  async function manejarBuscarRuc() {
    if (ruc.length !== 11) {
      setMensajeBusqueda("El RUC debe tener 11 dígitos.");
      return;
    }
    setBuscandoRuc(true);
    setMensajeBusqueda("");
    try {
      const resultado = await consultarDocumento(token, "RUC", ruc);
      if (resultado.encontrado) {
        setRazonSocial(resultado.nombreORazonSocial || "");
        if (resultado.direccion) setDireccion(resultado.direccion);
        setMensajeBusqueda("✓ Datos encontrados en SUNAT. Puedes editarlos si hace falta.");
      } else {
        setMensajeBusqueda(resultado.mensaje || "No se encontró. Escribe la razón social manualmente.");
      }
    } catch {
      setMensajeBusqueda("No se pudo conectar al servicio de consulta. Escribe manualmente.");
    } finally {
      setBuscandoRuc(false);
    }
  }

  async function manejarGuardar(e) {
    e.preventDefault();
    setError("");
    setGuardando(true);
    try {
      if (editando) {
        await editarProveedor(token, editando.id, { razonSocial, nombreContacto, telefono, correo, direccion });
      } else {
        await crearProveedor(token, { ruc, razonSocial, nombreContacto, telefono, correo, direccion });
      }
      setMostrarModal(false);
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function manejarCambiarEstado(p) {
    const nuevo = !p.activo;
    if (!confirm(nuevo ? `¿Activar a ${p.razonSocial}?` : `¿Desactivar a ${p.razonSocial}?`)) return;
    try {
      await cambiarEstadoProveedor(token, p.id, nuevo);
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={estilos.contenedor} className="modulo-responsive">
      <div style={estilos.encabezado}>
        <h3 style={{ margin: 0 }}>Proveedores</h3>
        <button style={estilos.botonPrimario} onClick={abrirNuevo}>+ Nuevo proveedor</button>
      </div>

      <form onSubmit={manejarBuscar} style={estilos.barraBusqueda}>
        <input
          type="text"
          placeholder="Buscar por razón social o RUC..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={estilos.inputBusqueda}
        />
        <button type="submit" style={estilos.botonSecundario}>Buscar</button>
      </form>

      {error && !mostrarModal && <p style={estilos.error}>{error}</p>}

      {cargando ? (
        <p>Cargando proveedores...</p>
      ) : (
        <>
          {/* ---------------- Vista de TARJETAS - solo en celular ---------------- */}
          <div className="vista-tarjetas-movil">
            {proveedores.length === 0 && (
              <p style={estilos.tdVacioMovil}>No hay proveedores registrados.</p>
            )}
            {proveedores.map((p) => (
              <div key={p.id} style={estilos.tarjetaProveedor}>
                <div style={estilos.tarjetaEncabezado}>
                  <div>
                    <strong style={estilos.tarjetaNombre}>{p.razonSocial}</strong>
                    <div style={estilos.tarjetaSub}><code style={estilos.codigo}>{p.ruc}</code></div>
                  </div>
                  <span style={p.activo ? estilos.badgeActivo : estilos.badgeInactivo}>
                    {p.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <div style={estilos.tarjetaFila}><span>Contacto</span><span>{p.nombreContacto || "—"}</span></div>
                <div style={estilos.tarjetaFila}><span>Teléfono</span><span>{p.telefono || "—"}</span></div>
                <div style={estilos.tarjetaBotones}>
                  <button onClick={() => abrirEditar(p)} style={estilos.botonEditarMovil}>Editar</button>
                  <button
                    onClick={() => manejarCambiarEstado(p)}
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
                  <th style={estilos.th}>RUC</th>
                  <th style={estilos.th}>Razón Social</th>
                  <th style={estilos.th}>Contacto</th>
                  <th style={estilos.th}>Teléfono</th>
                  <th style={estilos.th}>Estado</th>
                  <th style={estilos.th}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {proveedores.length === 0 && (
                  <tr><td colSpan={6} style={estilos.tdVacio}>No hay proveedores registrados.</td></tr>
                )}
                {proveedores.map((p) => (
                  <tr key={p.id}>
                    <td style={estilos.td}><code style={estilos.codigo}>{p.ruc}</code></td>
                    <td style={estilos.td}>{p.razonSocial}</td>
                    <td style={estilos.td}>{p.nombreContacto || "—"}</td>
                    <td style={estilos.td}>{p.telefono || "—"}</td>
                    <td style={estilos.td}>
                      <span style={p.activo ? estilos.badgeActivo : estilos.badgeInactivo}>
                        {p.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td style={estilos.td}>
                      <button onClick={() => abrirEditar(p)} style={estilos.botonEditar}>Editar</button>
                      <button
                        onClick={() => manejarCambiarEstado(p)}
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

      {/* A propósito NO se cierra al hacer clic afuera - solo con la ✕ o "Cancelar" */}
      {mostrarModal && (
        <div style={estilos.overlay}>
          <div style={estilos.modal}>
            <div style={estilos.modalEncabezado}>
              <h3 style={{ margin: 0 }}>{editando ? "Editar proveedor" : "Nuevo proveedor"}</h3>
              <button style={estilos.botonCerrarModal} onClick={() => setMostrarModal(false)}>✕</button>
            </div>

            <form onSubmit={manejarGuardar}>
              {!editando && (
                <>
                  <label style={estilos.label}>RUC</label>
                  <div style={estilos.filaBusquedaRuc}>
                    <input
                      value={ruc}
                      onChange={(e) => setRuc(e.target.value.replace(/\D/g, ""))}
                      maxLength={11}
                      required
                      style={{ ...estilos.input, flex: 1 }}
                      placeholder="Ej. 20123456789"
                    />
                    <button type="button" onClick={manejarBuscarRuc} disabled={buscandoRuc} style={estilos.botonBuscarRuc}>
                      {buscandoRuc ? "Buscando..." : "Buscar en SUNAT"}
                    </button>
                  </div>
                  {mensajeBusqueda && <p style={estilos.mensajeBusqueda}>{mensajeBusqueda}</p>}
                </>
              )}

              <label style={estilos.label}>Razón Social</label>
              <input value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} required style={estilos.input} />

              <label style={estilos.label}>Nombre de contacto (opcional)</label>
              <input
                value={nombreContacto}
                onChange={(e) => setNombreContacto(e.target.value)}
                style={estilos.input}
                placeholder="Ej. Jorge - Vendedor"
              />

              <label style={estilos.label}>Teléfono</label>
              <input value={telefono} onChange={(e) => setTelefono(e.target.value)} style={estilos.input} />

              <label style={estilos.label}>Correo</label>
              <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} style={estilos.input} />

              <label style={estilos.label}>Dirección</label>
              <input value={direccion} onChange={(e) => setDireccion(e.target.value)} style={estilos.input} />

              {error && <p style={estilos.error}>{error}</p>}

              <div style={estilos.modalAcciones}>
                <button type="button" onClick={() => setMostrarModal(false)} style={estilos.botonSecundario}>
                  Cancelar
                </button>
                <button type="submit" disabled={guardando} style={estilos.botonPrimario}>
                  {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear proveedor"}
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
  tarjetaProveedor: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px" },
  tarjetaEncabezado: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px", gap: "8px" },
  tarjetaNombre: { fontSize: "0.9rem", color: "#1e293b" },
  tarjetaSub: { fontSize: "0.78rem", color: "#64748b", marginTop: "2px" },
  tarjetaFila: { display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "#475569", padding: "4px 0", borderBottom: "1px solid #f8fafc" },
  tarjetaBotones: { display: "flex", gap: "8px", marginTop: "10px" },
  botonEditarMovil: { flex: 1, background: "#eff6ff", color: "#1d4ed8", border: "none", padding: "9px", borderRadius: "6px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 },
  botonActivarMovil: { flex: 1, background: "#dcfce7", color: "#166534", border: "none", padding: "9px", borderRadius: "6px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 },
  botonDesactivarMovil: { flex: 1, background: "#fee2e2", color: "#b91c1c", border: "none", padding: "9px", borderRadius: "6px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 },

  // ---- Tabla (escritorio) ----
  tabla: { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "10px", overflow: "hidden", minWidth: "700px" },
  th: { textAlign: "left", padding: "10px", fontSize: "0.8rem", color: "#64748b", borderBottom: "2px solid #e2e8f0", background: "#f8fafc" },
  td: { padding: "10px", fontSize: "0.88rem", borderBottom: "1px solid #f1f5f9" },
  tdVacio: { padding: "30px", textAlign: "center", color: "#94a3b8" },
  codigo: { fontFamily: "monospace", fontSize: "0.82rem", color: "#64748b" },
  badgeActivo: { background: "#dcfce7", color: "#166534", padding: "3px 10px", borderRadius: "999px", fontSize: "0.8rem" },
  badgeInactivo: { background: "#fee2e2", color: "#b91c1c", padding: "3px 10px", borderRadius: "999px", fontSize: "0.8rem" },
  botonEditar: { background: "#eff6ff", color: "#1d4ed8", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", marginRight: "6px", fontSize: "0.8rem" },
  botonActivar: { background: "#dcfce7", color: "#166534", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem" },
  botonDesactivar: { background: "#fee2e2", color: "#b91c1c", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem" },

  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px" },
  modal: { background: "#fff", borderRadius: "12px", padding: "24px", width: "440px", maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" },
  modalEncabezado: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  botonCerrarModal: { background: "transparent", border: "none", fontSize: "1.1rem", cursor: "pointer", color: "#64748b" },
  label: { display: "block", fontSize: "0.85rem", color: "#334155", marginBottom: "4px", marginTop: "12px" },
  input: { width: "100%", padding: "9px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.95rem", boxSizing: "border-box" },
  filaBusquedaRuc: { display: "flex", gap: "8px", flexWrap: "wrap" },
  botonBuscarRuc: { background: "#f59e0b", color: "#0f172a", border: "none", padding: "9px 14px", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem", whiteSpace: "nowrap" },
  mensajeBusqueda: { fontSize: "0.8rem", color: "#475569", marginTop: "6px" },
  modalAcciones: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" },
};