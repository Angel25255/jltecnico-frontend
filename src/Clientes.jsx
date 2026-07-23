import { useEffect, useState } from "react";
import {
  listarClientes, crearCliente, editarCliente, cambiarEstadoCliente, consultarDocumento, validarTelefono,
} from "./authApi";

export default function Clientes({ token }) {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState("");
  const [mostrarModal, setMostrarModal] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null); // null = creando nuevo

  const [tipoDocumento, setTipoDocumento] = useState("DNI");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [nombreORazonSocial, setNombreORazonSocial] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [direccion, setDireccion] = useState("");
  const [buscandoDocumento, setBuscandoDocumento] = useState(false);
  const [mensajeBusqueda, setMensajeBusqueda] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [validandoTelefono, setValidandoTelefono] = useState(false);
  const [resultadoTelefono, setResultadoTelefono] = useState(null);

  async function cargar() {
    setCargando(true);
    try {
      const data = await listarClientes(token, busqueda);
      setClientes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  function manejarBuscar(e) {
    e.preventDefault();
    cargar();
  }

  function abrirModalNuevo() {
    setClienteEditando(null);
    setTipoDocumento("DNI");
    setNumeroDocumento("");
    setNombreORazonSocial("");
    setTelefono("");
    setCorreo("");
    setDireccion("");
    setMensajeBusqueda("");
    setResultadoTelefono(null);
    setError("");
    setMostrarModal(true);
  }

  function abrirModalEditar(cliente) {
    setClienteEditando(cliente);
    setTipoDocumento(cliente.tipoDocumento);
    setNumeroDocumento(cliente.numeroDocumento);
    setNombreORazonSocial(cliente.nombreORazonSocial);
    setTelefono(cliente.telefono || "");
    setCorreo(cliente.correo || "");
    setDireccion(cliente.direccion || "");
    setMensajeBusqueda("");
    setResultadoTelefono(null);
    setError("");
    setMostrarModal(true);
  }

  async function manejarValidarTelefono() {
    setValidandoTelefono(true);
    setResultadoTelefono(null);
    try {
      const resultado = await validarTelefono(token, telefono);
      setResultadoTelefono(resultado);
    } catch (err) {
      setResultadoTelefono({ valido: false, mensaje: err.message });
    } finally {
      setValidandoTelefono(false);
    }
  }

  async function manejarBuscarDocumento() {
    const longitudEsperada = tipoDocumento === "DNI" ? 8 : 11;
    if (numeroDocumento.length !== longitudEsperada) {
      setMensajeBusqueda(`El ${tipoDocumento} debe tener ${longitudEsperada} dígitos.`);
      return;
    }

    setBuscandoDocumento(true);
    setMensajeBusqueda("");
    try {
      const resultado = await consultarDocumento(token, tipoDocumento, numeroDocumento);
      if (resultado.encontrado) {
        setNombreORazonSocial(resultado.nombreORazonSocial || "");
        if (resultado.direccion) setDireccion(resultado.direccion);
        setMensajeBusqueda("✓ Datos encontrados. Puedes editarlos si hace falta.");
      } else {
        setMensajeBusqueda(resultado.mensaje || "No se encontraron datos. Escribe el nombre manualmente.");
      }
    } catch {
      setMensajeBusqueda("No se pudo conectar al servicio de consulta. Escribe el nombre manualmente.");
    } finally {
      setBuscandoDocumento(false);
    }
  }

  async function manejarGuardar(e) {
    e.preventDefault();
    setError("");
    setGuardando(true);
    try {
      if (clienteEditando) {
        await editarCliente(token, clienteEditando.id, { nombreORazonSocial, telefono, correo, direccion });
      } else {
        await crearCliente(token, { tipoDocumento, numeroDocumento, nombreORazonSocial, telefono, correo, direccion });
      }
      setMostrarModal(false);
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function manejarCambiarEstado(cliente) {
    const nuevoEstado = !cliente.activo;
    if (!confirm(nuevoEstado ? `¿Activar a ${cliente.nombreORazonSocial}?` : `¿Desactivar a ${cliente.nombreORazonSocial}?`)) return;
    try {
      await cambiarEstadoCliente(token, cliente.id, nuevoEstado);
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={estilos.contenedor} className="modulo-responsive">
      <div style={estilos.encabezado}>
        <h3 style={{ margin: 0 }}>Clientes</h3>
        <button style={estilos.botonPrimario} onClick={abrirModalNuevo}>+ Nuevo cliente</button>
      </div>

      <form onSubmit={manejarBuscar} style={estilos.barraBusqueda}>
        <input
          type="text"
          placeholder="Buscar por nombre o número de documento..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={estilos.inputBusqueda}
        />
        <button type="submit" style={estilos.botonSecundario}>Buscar</button>
      </form>

      {error && !mostrarModal && <p style={estilos.error}>{error}</p>}

      {cargando ? (
        <p>Cargando clientes...</p>
      ) : (
        <>
          {/* ---------------- Vista de TARJETAS - solo en celular ---------------- */}
          <div className="vista-tarjetas-movil">
            {clientes.length === 0 && (
              <p style={estilos.tdVacioMovil}>No hay clientes registrados.</p>
            )}
            {clientes.map((c) => (
              <div key={c.id} style={estilos.tarjetaCliente}>
                <div style={estilos.tarjetaEncabezado}>
                  <div>
                    <strong style={estilos.tarjetaNombre}>{c.nombreORazonSocial}</strong>
                    <div style={estilos.tarjetaDocumento}>{c.tipoDocumento} {c.numeroDocumento}</div>
                  </div>
                  <span style={c.activo ? estilos.badgeActivo : estilos.badgeInactivo}>
                    {c.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <div style={estilos.tarjetaFila}><span>Teléfono</span><span>{c.telefono || "—"}</span></div>
                <div style={estilos.tarjetaFila}><span>Correo</span><span>{c.correo || "—"}</span></div>
                <div style={estilos.tarjetaBotones}>
                  <button onClick={() => abrirModalEditar(c)} style={estilos.botonEditarMovil}>Editar</button>
                  <button
                    onClick={() => manejarCambiarEstado(c)}
                    style={c.activo ? estilos.botonDesactivarMovil : estilos.botonActivarMovil}
                  >
                    {c.activo ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ---------------- Vista de TABLA - solo en pantallas grandes ---------------- */}
          <div className="vista-tabla-escritorio">
            <table style={estilos.tabla}>
              <thead>
                <tr>
                  <th style={estilos.th}>Documento</th>
                  <th style={estilos.th}>Nombre / Razón Social</th>
                  <th style={estilos.th}>Teléfono</th>
                  <th style={estilos.th}>Correo</th>
                  <th style={estilos.th}>Estado</th>
                  <th style={estilos.th}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientes.length === 0 && (
                  <tr><td colSpan={6} style={estilos.tdVacio}>No hay clientes registrados.</td></tr>
                )}
                {clientes.map((c) => (
                  <tr key={c.id}>
                    <td style={estilos.td}>{c.tipoDocumento} {c.numeroDocumento}</td>
                    <td style={estilos.td}>{c.nombreORazonSocial}</td>
                    <td style={estilos.td}>{c.telefono || "—"}</td>
                    <td style={estilos.td}>{c.correo || "—"}</td>
                    <td style={estilos.td}>
                      <span style={c.activo ? estilos.badgeActivo : estilos.badgeInactivo}>
                        {c.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td style={estilos.td}>
                      <button onClick={() => abrirModalEditar(c)} style={estilos.botonEditar}>Editar</button>
                      <button
                        onClick={() => manejarCambiarEstado(c)}
                        style={c.activo ? estilos.botonDesactivar : estilos.botonActivar}
                      >
                        {c.activo ? "Desactivar" : "Activar"}
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
        <div style={estilos.overlay}>
          <div style={estilos.modal} onClick={(e) => e.stopPropagation()}>
            <div style={estilos.modalEncabezado}>
              <h3 style={{ margin: 0 }}>{clienteEditando ? "Editar cliente" : "Nuevo cliente"}</h3>
              <button style={estilos.botonCerrarModal} onClick={() => setMostrarModal(false)}>✕</button>
            </div>

            <form onSubmit={manejarGuardar}>
              {!clienteEditando && (
                <>
                  <label style={estilos.label}>Tipo de documento</label>
                  <select
                    value={tipoDocumento}
                    onChange={(e) => { setTipoDocumento(e.target.value); setNumeroDocumento(""); setMensajeBusqueda(""); }}
                    style={estilos.input}
                  >
                    <option value="DNI">DNI (persona natural)</option>
                    <option value="RUC">RUC (empresa)</option>
                  </select>

                  <label style={estilos.label}>Número de {tipoDocumento}</label>
                  <div style={estilos.filaBusquedaDocumento}>
                    <input
                      value={numeroDocumento}
                      onChange={(e) => setNumeroDocumento(e.target.value.replace(/\D/g, ""))}
                      maxLength={tipoDocumento === "DNI" ? 8 : 11}
                      required
                      style={{ ...estilos.input, flex: 1 }}
                      placeholder={tipoDocumento === "DNI" ? "Ej. 12345678" : "Ej. 20123456789"}
                    />
                    <button
                      type="button"
                      onClick={manejarBuscarDocumento}
                      disabled={buscandoDocumento}
                      style={estilos.botonBuscarDoc}
                    >
                      {buscandoDocumento ? "Buscando..." : "Buscar"}
                    </button>
                  </div>
                  {mensajeBusqueda && <p style={estilos.mensajeBusqueda}>{mensajeBusqueda}</p>}
                </>
              )}

              <label style={estilos.label}>
                {tipoDocumento === "RUC" ? "Razón social" : "Nombre completo"}
              </label>
              <input
                value={nombreORazonSocial}
                onChange={(e) => setNombreORazonSocial(e.target.value)}
                required
                style={estilos.input}
              />

              <label style={estilos.label}>Teléfono</label>
              <div style={estilos.filaTelefono}>
                <input
                  value={telefono}
                  onChange={(e) => { setTelefono(e.target.value.replace(/\D/g, "")); setResultadoTelefono(null); }}
                  style={{ ...estilos.input, flex: 1 }}
                  maxLength={9}
                  placeholder="Ej. 987654321"
                />
                <button
                  type="button"
                  onClick={manejarValidarTelefono}
                  disabled={validandoTelefono || telefono.length < 9}
                  style={estilos.botonValidarTelefono}
                >
                  {validandoTelefono ? "Verificando..." : "Verificar"}
                </button>
              </div>
              {resultadoTelefono && (
                <p style={resultadoTelefono.valido ? estilos.telefonoValido : estilos.telefonoInvalido}>
                  {resultadoTelefono.valido ? "✓" : "✕"} {resultadoTelefono.mensaje}
                  {resultadoTelefono.operador && ` (${resultadoTelefono.operador})`}
                </p>
              )}

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
                  {guardando ? "Guardando..." : clienteEditando ? "Guardar cambios" : "Crear cliente"}
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
  inputBusqueda: {
    flex: 1, minWidth: "200px", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem",
  },
  botonPrimario: {
    background: "#1d4ed8", color: "#fff", border: "none", padding: "10px 16px",
    borderRadius: "8px", cursor: "pointer", fontWeight: 600,
  },
  botonSecundario: {
    background: "transparent", border: "1px solid #cbd5e1", padding: "10px 16px",
    borderRadius: "8px", cursor: "pointer",
  },
  error: { color: "#dc2626", fontSize: "0.85rem" },

  // ---- Tarjetas (celular) ----
  tdVacioMovil: { padding: "30px", textAlign: "center", color: "#94a3b8" },
  tarjetaCliente: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px" },
  tarjetaEncabezado: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px", gap: "8px" },
  tarjetaNombre: { fontSize: "0.92rem", color: "#1e293b" },
  tarjetaDocumento: { fontSize: "0.78rem", color: "#64748b", marginTop: "2px" },
  tarjetaFila: { display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "#475569", padding: "4px 0", borderBottom: "1px solid #f8fafc" },
  tarjetaBotones: { display: "flex", gap: "8px", marginTop: "10px" },
  botonEditarMovil: { flex: 1, background: "#eff6ff", color: "#1d4ed8", border: "none", padding: "9px", borderRadius: "6px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 },
  botonActivarMovil: { flex: 1, background: "#dcfce7", color: "#166534", border: "none", padding: "9px", borderRadius: "6px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 },
  botonDesactivarMovil: { flex: 1, background: "#fee2e2", color: "#b91c1c", border: "none", padding: "9px", borderRadius: "6px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 },

  // ---- Tabla (escritorio) ----
  tabla: { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "10px", overflow: "hidden" },
  th: { textAlign: "left", padding: "10px", fontSize: "0.8rem", color: "#64748b", borderBottom: "2px solid #e2e8f0", background: "#f8fafc" },
  td: { padding: "10px", fontSize: "0.88rem", borderBottom: "1px solid #f1f5f9" },
  tdVacio: { padding: "30px", textAlign: "center", color: "#94a3b8" },
  badgeActivo: { background: "#dcfce7", color: "#166534", padding: "3px 10px", borderRadius: "999px", fontSize: "0.8rem" },
  badgeInactivo: { background: "#fee2e2", color: "#b91c1c", padding: "3px 10px", borderRadius: "999px", fontSize: "0.8rem" },
  botonEditar: {
    background: "#eff6ff", color: "#1d4ed8", border: "none", padding: "6px 10px",
    borderRadius: "6px", cursor: "pointer", marginRight: "6px", fontSize: "0.8rem",
  },
  botonActivar: { background: "#dcfce7", color: "#166534", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem" },
  botonDesactivar: { background: "#fee2e2", color: "#b91c1c", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem" },

  overlay: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.6)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px",
  },
  modal: {
    background: "#fff", borderRadius: "12px", padding: "24px", width: "440px", maxWidth: "100%",
    maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
  },
  modalEncabezado: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  botonCerrarModal: { background: "transparent", border: "none", fontSize: "1.1rem", cursor: "pointer", color: "#64748b" },
  label: { display: "block", fontSize: "0.85rem", color: "#334155", marginBottom: "4px", marginTop: "12px" },
  input: {
    width: "100%", padding: "9px 10px", borderRadius: "6px", border: "1px solid #cbd5e1",
    fontSize: "0.95rem", boxSizing: "border-box",
  },
  filaTelefono: { display: "flex", gap: "8px" },
  botonValidarTelefono: {
    background: "#f59e0b", color: "#0f172a", border: "none", padding: "0 14px",
    borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem", whiteSpace: "nowrap",
  },
  telefonoValido: { fontSize: "0.8rem", color: "#166534", background: "#dcfce7", padding: "7px 10px", borderRadius: "6px", marginTop: "6px" },
  telefonoInvalido: { fontSize: "0.8rem", color: "#b91c1c", background: "#fee2e2", padding: "7px 10px", borderRadius: "6px", marginTop: "6px" },
  filaBusquedaDocumento: { display: "flex", gap: "8px" },
  botonBuscarDoc: {
    background: "#f59e0b", color: "#0f172a", border: "none", padding: "0 16px",
    borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem",
  },
  mensajeBusqueda: { fontSize: "0.8rem", color: "#475569", marginTop: "6px" },
  modalAcciones: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" },
};