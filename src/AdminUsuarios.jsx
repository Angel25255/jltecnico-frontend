import { useEffect, useState } from "react";
import {
  listarUsuarios, crearUsuario, editarUsuario, cambiarEstadoUsuario,
  restablecerPasswordUsuario, regenerar2FAUsuario,
} from "./authApi";

function validarPassword(password) {
  const errores = [];
  if (password.length < 8) errores.push("mínimo 8 caracteres");
  if (!/[A-Z]/.test(password)) errores.push("al menos una letra mayúscula");
  if (!/[0-9]/.test(password)) errores.push("al menos un número");
  if (!/[^A-Za-z0-9]/.test(password)) errores.push("al menos un carácter especial (ej. !@#$%)");
  return errores;
}

function IconoBoton({ titulo, onClick, disabled, color, bg, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={titulo}
      style={{ ...estilos.iconoBoton, color, background: bg, opacity: disabled ? 0.5 : 1 }}
    >
      {children}
    </button>
  );
}

export default function AdminUsuarios({ token }) {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [error, setError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  const [nombreCompleto, setNombreCompleto] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [direccion, setDireccion] = useState("");
  const [rol, setRol] = useState("Vendedor");
  const [creando, setCreando] = useState(false);

  const [qrGenerado, setQrGenerado] = useState(null);

  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [editCorreo, setEditCorreo] = useState("");
  const [editRol, setEditRol] = useState("Vendedor");
  const [editDireccion, setEditDireccion] = useState("");
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  const [usuarioRestableciendo, setUsuarioRestableciendo] = useState(null);
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [mostrarNuevaPassword, setMostrarNuevaPassword] = useState(false);
  const [restableciendo, setRestableciendo] = useState(false);
  const [regenerando2FA, setRegenerando2FA] = useState(null);
  const [cambiandoEstadoId, setCambiandoEstadoId] = useState(null);

  const erroresPassword = password.length > 0 ? validarPassword(password) : [];
  const passwordValida = password.length > 0 && erroresPassword.length === 0;

  const erroresNuevaPassword = nuevaPassword.length > 0 ? validarPassword(nuevaPassword) : [];
  const nuevaPasswordValida = nuevaPassword.length > 0 && erroresNuevaPassword.length === 0;

  function mostrarExito(texto) {
    setMensajeExito(texto);
    setTimeout(() => setMensajeExito(""), 4000);
  }

  async function cargarUsuarios() {
    setCargando(true);
    try {
      const data = await listarUsuarios(token);
      setUsuarios(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargarUsuarios(); }, []);

  function abrirModal() {
    setNombreCompleto(""); setCorreo(""); setPassword(""); setMostrarPassword(false);
    setDireccion(""); setRol("Vendedor"); setError("");
    setMostrarModal(true);
  }

  async function manejarCrear(e) {
    e.preventDefault();
    setError("");

    if (!nombreCompleto.trim()) { setError("Falta escribir el nombre completo."); return; }
    if (!correo.trim()) { setError("Falta escribir el correo."); return; }
    if (!password) { setError("Falta escribir una contraseña."); return; }

    const erroresActuales = validarPassword(password);
    if (erroresActuales.length > 0) {
      setError("La contraseña no cumple los requisitos de seguridad. Revisa la lista de abajo.");
      return;
    }

    setCreando(true);
    try {
      const data = await crearUsuario(token, { nombreCompleto, correo, password, rol, direccion });
      setQrGenerado({ qrBase64: data.qrBase64, otpAuthUri: data.otpAuthUri, correo });
      setMostrarModal(false);
      await cargarUsuarios();
      mostrarExito(`Usuario ${nombreCompleto} creado correctamente.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreando(false);
    }
  }

  function abrirEditar(usuario) {
    setUsuarioEditando(usuario);
    setEditNombre(usuario.nombreCompleto);
    setEditCorreo(usuario.correo);
    setEditRol(usuario.rol);
    setEditDireccion(usuario.direccion || "");
    setError("");
  }

  async function manejarGuardarEdicion(e) {
    e.preventDefault();
    setError("");
    if (!editNombre.trim()) { setError("Falta escribir el nombre completo."); return; }
    if (!editCorreo.trim()) { setError("Falta escribir el correo."); return; }

    setGuardandoEdicion(true);
    try {
      await editarUsuario(token, usuarioEditando.id, {
        nombreCompleto: editNombre, correo: editCorreo, rol: editRol, direccion: editDireccion,
      });
      setUsuarioEditando(null);
      await cargarUsuarios();
      mostrarExito("Usuario actualizado correctamente.");
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardandoEdicion(false);
    }
  }

  async function manejarCambiarEstado(usuario) {
    const nuevoEstado = !usuario.activo;
    const confirmacion = nuevoEstado
      ? `¿Activar a ${usuario.nombreCompleto}?`
      : `¿Desactivar a ${usuario.nombreCompleto}? No podrá iniciar sesión hasta que lo reactives.`;
    if (!confirm(confirmacion)) return;

    setCambiandoEstadoId(usuario.id);
    setError("");
    try {
      await cambiarEstadoUsuario(token, usuario.id, nuevoEstado);
      await cargarUsuarios();
      mostrarExito(nuevoEstado ? `${usuario.nombreCompleto} fue activado.` : `${usuario.nombreCompleto} fue desactivado.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCambiandoEstadoId(null);
    }
  }

  function abrirRestablecerPassword(usuario) {
    setUsuarioRestableciendo(usuario);
    setNuevaPassword(""); setMostrarNuevaPassword(false); setError("");
  }

  async function manejarRestablecerPassword(e) {
    e.preventDefault();
    setError("");
    if (!nuevaPasswordValida) {
      setError("La contraseña nueva no cumple los requisitos de seguridad.");
      return;
    }
    setRestableciendo(true);
    try {
      await restablecerPasswordUsuario(token, usuarioRestableciendo.id, nuevaPassword);
      mostrarExito(`Contraseña restablecida para ${usuarioRestableciendo.nombreCompleto}.`);
      setUsuarioRestableciendo(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setRestableciendo(false);
    }
  }

  async function manejarRegenerar2FA(usuario) {
    if (!confirm(`¿Regenerar el código 2FA de ${usuario.nombreCompleto}? El código actual de su Authenticator dejará de funcionar de inmediato.`)) return;
    setRegenerando2FA(usuario.id);
    setError("");
    try {
      const data = await regenerar2FAUsuario(token, usuario.id);
      setQrGenerado({ qrBase64: data.qrBase64, otpAuthUri: data.otpAuthUri, correo: usuario.correo });
    } catch (err) {
      setError(err.message);
    } finally {
      setRegenerando2FA(null);
    }
  }

  return (
    <div style={estilos.contenedor}>
      <div style={estilos.encabezado}>
        <h3 style={{ margin: 0 }}>Administración de Usuarios</h3>
        <button style={estilos.botonPrimario} onClick={abrirModal}>+ Nuevo usuario</button>
      </div>

      {mensajeExito && <p style={estilos.exito}>✓ {mensajeExito}</p>}
      {error && !mostrarModal && !qrGenerado && !usuarioEditando && !usuarioRestableciendo && (
        <p style={estilos.error}>{error}</p>
      )}

      {cargando ? (
        <p>Cargando usuarios...</p>
      ) : (
        <div style={estilos.contenedorTabla}>
          <table style={estilos.tabla}>
            <thead>
              <tr>
                <th style={estilos.th}>Nombre</th>
                <th style={estilos.th}>Correo</th>
                <th style={estilos.th}>Dirección</th>
                <th style={estilos.th}>Rol</th>
                <th style={estilos.th}>Estado</th>
                <th style={estilos.thAccion}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td style={estilos.td}>{u.nombreCompleto}</td>
                  <td style={estilos.td}>{u.correo}</td>
                  <td style={estilos.td}>{u.direccion || "—"}</td>
                  <td style={estilos.td}>{u.rol}</td>
                  <td style={estilos.td}>
                    <span style={u.activo ? estilos.badgeActivo : estilos.badgeInactivo}>
                      {u.activo ? "Activo" : "Desactivado"}
                    </span>
                  </td>
                  <td style={estilos.td}>
                    <div style={estilos.grupoIconos}>
                      <IconoBoton titulo="Editar usuario" onClick={() => abrirEditar(u)} color="#334155" bg="#f1f5f9">
                        ✏️
                      </IconoBoton>
                      <IconoBoton titulo="Restablecer contraseña" onClick={() => abrirRestablecerPassword(u)} color="#92400e" bg="#fffbeb">
                        🔑
                      </IconoBoton>
                      <IconoBoton
                        titulo="Regenerar código 2FA (si perdió el celular)"
                        onClick={() => manejarRegenerar2FA(u)}
                        disabled={regenerando2FA === u.id}
                        color="#1d4ed8" bg="#eff6ff"
                      >
                        {regenerando2FA === u.id ? "…" : "📱"}
                      </IconoBoton>
                      <IconoBoton
                        titulo={u.activo ? "Desactivar usuario" : "Activar usuario"}
                        onClick={() => manejarCambiarEstado(u)}
                        disabled={cambiandoEstadoId === u.id}
                        color={u.activo ? "#b91c1c" : "#166534"}
                        bg={u.activo ? "#fee2e2" : "#dcfce7"}
                      >
                        {cambiandoEstadoId === u.id ? "…" : u.activo ? "🚫" : "✓"}
                      </IconoBoton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------------- MODAL: Crear nuevo usuario ---------------- */}
      {mostrarModal && (
        <div style={estilos.overlay}>
          <div style={estilos.modal}>
            <div style={estilos.modalEncabezado}>
              <h3 style={{ margin: 0 }}>Nuevo usuario</h3>
              <button style={estilos.botonCerrarModal} onClick={() => setMostrarModal(false)}>✕</button>
            </div>

            <form onSubmit={manejarCrear}>
              <label style={estilos.label}>Nombre completo</label>
              <input value={nombreCompleto} onChange={(e) => setNombreCompleto(e.target.value)} style={estilos.input} placeholder="Ej. Juan Pérez" />

              <label style={estilos.label}>Correo</label>
              <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} style={estilos.input} placeholder="usuario@jltecnico.com" />

              <label style={estilos.label}>Dirección (opcional)</label>
              <input value={direccion} onChange={(e) => setDireccion(e.target.value)} style={estilos.input} placeholder="Ej. Jr. Los Álamos 123, Huancayo" />

              <label style={estilos.label}>Contraseña</label>
              <div style={estilos.filaPassword}>
                <input
                  type={mostrarPassword ? "text" : "password"}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  style={{ ...estilos.input, marginBottom: 0 }} placeholder="Mínimo 8 caracteres"
                />
                <button type="button" onClick={() => setMostrarPassword(!mostrarPassword)} style={estilos.botonOjo}>
                  {mostrarPassword ? "🙈" : "👁️"}
                </button>
              </div>

              {password.length > 0 && (
                <div style={passwordValida ? estilos.passwordOk : estilos.passwordAdvertencia}>
                  {passwordValida ? <span>✓ Contraseña segura</span> : (
                    <>
                      <span>Por favor, la contraseña debe tener:</span>
                      <ul style={estilos.listaRequisitos}>{erroresPassword.map((err) => <li key={err}>{err}</li>)}</ul>
                    </>
                  )}
                </div>
              )}

              <label style={estilos.label}>Rol</label>
              <select value={rol} onChange={(e) => setRol(e.target.value)} style={estilos.input}>
                <option value="Vendedor">Vendedor</option>
                <option value="Tecnico">Técnico</option>
                <option value="Administrador">Administrador</option>
              </select>

              {error && <p style={estilos.error}>{error}</p>}

              <div style={estilos.modalAcciones}>
                <button type="button" onClick={() => setMostrarModal(false)} style={estilos.botonSecundario}>Cancelar</button>
                <button type="submit" disabled={creando || !passwordValida} style={estilos.botonPrimario}>
                  {creando ? "Creando..." : "Crear usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- MODAL: Editar usuario ---------------- */}
      {usuarioEditando && (
        <div style={estilos.overlay}>
          <div style={estilos.modal}>
            <div style={estilos.modalEncabezado}>
              <h3 style={{ margin: 0 }}>Editar usuario</h3>
              <button style={estilos.botonCerrarModal} onClick={() => setUsuarioEditando(null)}>✕</button>
            </div>

            <form onSubmit={manejarGuardarEdicion}>
              <label style={estilos.label}>Nombre completo</label>
              <input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} style={estilos.input} />

              <label style={estilos.label}>Correo</label>
              <input type="email" value={editCorreo} onChange={(e) => setEditCorreo(e.target.value)} style={estilos.input} />

              <label style={estilos.label}>Dirección (opcional)</label>
              <input value={editDireccion} onChange={(e) => setEditDireccion(e.target.value)} style={estilos.input} />

              <label style={estilos.label}>Rol</label>
              <select value={editRol} onChange={(e) => setEditRol(e.target.value)} style={estilos.input}>
                <option value="Vendedor">Vendedor</option>
                <option value="Tecnico">Técnico</option>
                <option value="Administrador">Administrador</option>
              </select>

              {error && <p style={estilos.error}>{error}</p>}

              <div style={estilos.modalAcciones}>
                <button type="button" onClick={() => setUsuarioEditando(null)} style={estilos.botonSecundario}>Cancelar</button>
                <button type="submit" disabled={guardandoEdicion} style={estilos.botonPrimario}>
                  {guardandoEdicion ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- MODAL: Restablecer contraseña ---------------- */}
      {usuarioRestableciendo && (
        <div style={estilos.overlay}>
          <div style={estilos.modal}>
            <div style={estilos.modalEncabezado}>
              <h3 style={{ margin: 0 }}>Restablecer contraseña</h3>
              <button style={estilos.botonCerrarModal} onClick={() => setUsuarioRestableciendo(null)}>✕</button>
            </div>

            <p style={estilos.textoAyuda}>
              Le vas a poner una contraseña nueva a <strong>{usuarioRestableciendo.nombreCompleto}</strong>.
              Si su cuenta estaba bloqueada por intentos fallidos, se desbloquea automáticamente.
            </p>

            <form onSubmit={manejarRestablecerPassword}>
              <label style={estilos.label}>Nueva contraseña</label>
              <div style={estilos.filaPassword}>
                <input
                  type={mostrarNuevaPassword ? "text" : "password"}
                  value={nuevaPassword} onChange={(e) => setNuevaPassword(e.target.value)}
                  style={{ ...estilos.input, marginBottom: 0 }} placeholder="Mínimo 8 caracteres" autoFocus
                />
                <button type="button" onClick={() => setMostrarNuevaPassword(!mostrarNuevaPassword)} style={estilos.botonOjo}>
                  {mostrarNuevaPassword ? "🙈" : "👁️"}
                </button>
              </div>

              {nuevaPassword.length > 0 && (
                <div style={nuevaPasswordValida ? estilos.passwordOk : estilos.passwordAdvertencia}>
                  {nuevaPasswordValida ? <span>✓ Contraseña segura</span> : (
                    <>
                      <span>Por favor, la contraseña debe tener:</span>
                      <ul style={estilos.listaRequisitos}>{erroresNuevaPassword.map((err) => <li key={err}>{err}</li>)}</ul>
                    </>
                  )}
                </div>
              )}

              {error && <p style={estilos.error}>{error}</p>}

              <div style={estilos.modalAcciones}>
                <button type="button" onClick={() => setUsuarioRestableciendo(null)} style={estilos.botonSecundario}>Cancelar</button>
                <button type="submit" disabled={restableciendo || !nuevaPasswordValida} style={estilos.botonPrimario}>
                  {restableciendo ? "Guardando..." : "Restablecer contraseña"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- MODAL: QR generado ---------------- */}
      {qrGenerado && (
        <div style={estilos.overlay}>
          <div style={estilos.modalQr}>
            <div style={estilos.modalEncabezado}>
              <h3 style={{ margin: 0 }}>Usuario: {qrGenerado.correo}</h3>
              <button style={estilos.botonCerrarModal} onClick={() => setQrGenerado(null)}>✕</button>
            </div>
            <p style={estilos.textoAyuda}>
              Pide a esta persona que escanee este código QR con <strong>Google Authenticator</strong> o{" "}
              <strong>Microsoft Authenticator</strong> ahora mismo. Este código <strong>no se volverá a mostrar</strong>.
            </p>
            <div style={{ textAlign: "center" }}>
              <img
                src={`data:image/png;base64,${qrGenerado.qrBase64}`}
                alt="Código QR de configuración 2FA"
                style={{ width: "220px", height: "220px", border: "1px solid #e2e8f0", borderRadius: "8px" }}
              />
            </div>
            <button style={{ ...estilos.botonPrimario, width: "100%", marginTop: "16px" }} onClick={() => setQrGenerado(null)}>
              Ya lo escaneé, cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const estilos = {
  contenedor: { padding: "1.5rem", maxWidth: "1050px" },
  encabezado: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  botonPrimario: { background: "#1d4ed8", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: 600 },
  botonSecundario: { background: "transparent", border: "1px solid #cbd5e1", padding: "10px 16px", borderRadius: "8px", cursor: "pointer" },
  textoAyuda: { fontSize: "0.85rem", color: "#475569" },
  exito: { color: "#166534", background: "#dcfce7", padding: "10px 14px", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "12px" },
  error: { color: "#dc2626", fontSize: "0.85rem" },

  contenedorTabla: { overflowX: "auto" },
  tabla: { width: "100%", borderCollapse: "collapse", minWidth: "700px" },
  th: { textAlign: "left", borderBottom: "2px solid #e2e8f0", padding: "8px", fontSize: "0.85rem", color: "#64748b" },
  thAccion: { textAlign: "center", borderBottom: "2px solid #e2e8f0", padding: "8px", fontSize: "0.85rem", color: "#64748b" },
  td: { borderBottom: "1px solid #f1f5f9", padding: "8px", fontSize: "0.9rem" },
  badgeActivo: { background: "#dcfce7", color: "#166534", padding: "3px 10px", borderRadius: "999px", fontSize: "0.8rem" },
  badgeInactivo: { background: "#fee2e2", color: "#b91c1c", padding: "3px 10px", borderRadius: "999px", fontSize: "0.8rem" },

  grupoIconos: { display: "flex", gap: "6px", justifyContent: "center" },
  iconoBoton: {
    border: "none", borderRadius: "7px", width: "32px", height: "32px",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", fontSize: "0.95rem",
  },

  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px" },
  modal: { background: "#fff", borderRadius: "12px", padding: "24px", width: "420px", maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" },
  modalQr: { background: "#fff", borderRadius: "12px", padding: "24px", width: "380px", maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" },
  modalEncabezado: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", gap: "10px" },
  botonCerrarModal: { background: "transparent", border: "none", fontSize: "1.1rem", cursor: "pointer", color: "#64748b", flexShrink: 0 },
  modalAcciones: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" },
  label: { display: "block", fontSize: "0.85rem", color: "#334155", marginBottom: "4px", marginTop: "12px" },
  input: { width: "100%", padding: "9px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.95rem", boxSizing: "border-box", marginBottom: "8px" },
  filaPassword: { display: "flex", gap: "6px", alignItems: "center" },
  botonOjo: { background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "8px 10px", cursor: "pointer", fontSize: "0.95rem", flexShrink: 0 },
  passwordOk: { marginTop: "8px", fontSize: "0.8rem", color: "#166534", background: "#dcfce7", padding: "8px 10px", borderRadius: "6px" },
  passwordAdvertencia: { marginTop: "8px", fontSize: "0.8rem", color: "#92400e", background: "#fef3c7", padding: "8px 10px", borderRadius: "6px" },
  listaRequisitos: { margin: "4px 0 0 0", paddingLeft: "18px" },
};