import { useEffect, useState } from "react";
import { obtenerAuditoria, obtenerTiposAccion } from "./authApi";

const COLOR_ACCION = {
  LOGIN_OK: { bg: "#dcfce7", texto: "#166534" },
  LOGIN_FALLIDO: { bg: "#fee2e2", texto: "#b91c1c" },
  "2FA_FALLIDO": { bg: "#fee2e2", texto: "#b91c1c" },
  CUENTA_BLOQUEADA: { bg: "#fecaca", texto: "#991b1b" },
  USUARIO_DESACTIVADO_INTENTO: { bg: "#fecaca", texto: "#991b1b" },
  DISPOSITIVO_NUEVO: { bg: "#fef3c7", texto: "#92400e" },
  SESION_CERRADA: { bg: "#e2e8f0", texto: "#334155" },
  USUARIO_CREADO: { bg: "#dbeafe", texto: "#1d4ed8" },
  USUARIO_ACTIVADO: { bg: "#dcfce7", texto: "#166534" },
  USUARIO_DESACTIVADO: { bg: "#fee2e2", texto: "#b91c1c" },
  PERMISO_OTORGADO: { bg: "#dcfce7", texto: "#166534" },
  PERMISO_REVOCADO: { bg: "#fee2e2", texto: "#b91c1c" },
};

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function Auditoria({ token }) {
  const [logs, setLogs] = useState([]);
  const [tiposAccion, setTiposAccion] = useState([]);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // Campos del formulario (lo que el usuario está escribiendo)
  const [desde, setDesde] = useState(hoyISO());
  const [hasta, setHasta] = useState(hoyISO());
  const [accion, setAccion] = useState("");
  const [correo, setCorreo] = useState("");

  // Filtros YA APLICADOS (solo cambian al enviar el formulario) + página
  const [filtrosAplicados, setFiltrosAplicados] = useState({
    desde: hoyISO(), hasta: hoyISO(), accion: "", correo: "",
  });
  const [pagina, setPagina] = useState(1);
  const tamanoPagina = 25;

  async function cargar(filtros, paginaActual) {
    setCargando(true);
    setError("");
    try {
      const data = await obtenerAuditoria(token, { ...filtros, pagina: paginaActual, tamano: tamanoPagina });
      setLogs(data.items);
      setTotalRegistros(data.totalRegistros);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    obtenerTiposAccion(token).then(setTiposAccion).catch(() => {});
  }, []);

  useEffect(() => {
    cargar(filtrosAplicados, pagina);
  }, [filtrosAplicados, pagina]);

  function manejarFiltrar(e) {
    e.preventDefault();
    setPagina(1);
    setFiltrosAplicados({ desde, hasta, accion, correo });
  }

  function limpiarFiltros() {
    setDesde("");
    setHasta("");
    setAccion("");
    setCorreo("");
    setPagina(1);
    setFiltrosAplicados({ desde: "", hasta: "", accion: "", correo: "" });
  }

  function mostrarHoy() {
    setDesde(hoyISO());
    setHasta(hoyISO());
    setAccion("");
    setCorreo("");
    setPagina(1);
    setFiltrosAplicados({ desde: hoyISO(), hasta: hoyISO(), accion: "", correo: "" });
  }

  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / tamanoPagina));

  return (
    <div style={estilos.contenedor} className="modulo-responsive">
      <div style={estilos.encabezado}>
        <div>
          <h3 style={{ margin: 0 }}>Auditoría del sistema</h3>
          <p style={estilos.textoAyuda}>
            Historial inmutable de acciones: inicios de sesión, intentos fallidos, cambios de usuarios y permisos.
          </p>
        </div>
        <div style={estilos.resumenTotal}>
          <span style={estilos.resumenNumero}>{totalRegistros}</span>
          <span style={estilos.resumenLabel}>registros</span>
        </div>
      </div>

      <form onSubmit={manejarFiltrar} style={estilos.filtros}>
        <div style={estilos.campoFiltro}>
          <label style={estilos.label}>Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={estilos.input} />
        </div>
        <div style={estilos.campoFiltro}>
          <label style={estilos.label}>Hasta</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={estilos.input} />
        </div>
        <div style={estilos.campoFiltro}>
          <label style={estilos.label}>Tipo de acción</label>
          <select value={accion} onChange={(e) => setAccion(e.target.value)} style={estilos.input}>
            <option value="">Todas</option>
            {tiposAccion.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div style={estilos.campoFiltro}>
          <label style={estilos.label}>Correo</label>
          <input
            type="text"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="Buscar por correo"
            style={estilos.input}
          />
        </div>
        <div style={estilos.botonesFiltro}>
          <button type="submit" style={estilos.botonPrimario}>Filtrar</button>
          <button type="button" onClick={mostrarHoy} style={estilos.botonSecundario}>Hoy</button>
          <button type="button" onClick={limpiarFiltros} style={estilos.botonSecundario}>Ver todo</button>
        </div>
      </form>

      {error && <p style={estilos.error}>{error}</p>}

      <div style={estilos.tarjetaTabla}>
        {cargando ? (
          <p style={estilos.cargandoTexto}>Cargando registros...</p>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={estilos.tabla}>
                <thead>
                  <tr>
                    <th style={estilos.th}>Fecha / Hora</th>
                    <th style={estilos.th}>Acción</th>
                    <th style={estilos.th}>Usuario</th>
                    <th style={estilos.th}>IP</th>
                    <th style={estilos.th}>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 && (
                    <tr><td colSpan={5} style={estilos.tdVacio}>No hay registros con esos filtros.</td></tr>
                  )}
                  {logs.map((log) => {
                    const color = COLOR_ACCION[log.accion] || { bg: "#f1f5f9", texto: "#334155" };
                    return (
                      <tr key={log.id} style={estilos.filaTabla}>
                        <td style={estilos.td}>{new Date(log.fechaHora).toLocaleString("es-PE")}</td>
                        <td style={estilos.td}>
                          <span style={{ ...estilos.badge, background: color.bg, color: color.texto }}>
                            {log.accion}
                          </span>
                        </td>
                        <td style={estilos.td}>{log.nombreUsuario || log.correoIntento || "—"}</td>
                        <td style={estilos.td}><code style={estilos.codigo}>{log.ip || "—"}</code></td>
                        <td style={estilos.td}>{log.detalle || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={estilos.paginacion}>
              <button
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => p - 1)}
                style={{ ...estilos.botonPaginacion, opacity: pagina <= 1 ? 0.4 : 1 }}
              >
                ← Anterior
              </button>
              <span style={estilos.textoPaginacion}>
                Página {pagina} de {totalPaginas}
              </span>
              <button
                disabled={pagina >= totalPaginas}
                onClick={() => setPagina((p) => p + 1)}
                style={{ ...estilos.botonPaginacion, opacity: pagina >= totalPaginas ? 0.4 : 1 }}
              >
                Siguiente →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const estilos = {
  contenedor: { padding: "1.5rem 2rem", maxWidth: "1150px" },
  encabezado: { display: "flex", flexWrap: "wrap", gap: "14px", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" },
  textoAyuda: { fontSize: "0.85rem", color: "#64748b", marginTop: "4px", maxWidth: "480px" },
  resumenTotal: {
    background: "#0f172a", borderRadius: "10px", padding: "10px 20px",
    textAlign: "center", minWidth: "100px",
  },
  resumenNumero: { display: "block", color: "#f59e0b", fontSize: "1.4rem", fontWeight: 700 },
  resumenLabel: { color: "#94a3b8", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.5px" },
  filtros: {
    display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "flex-end",
    background: "#fff", padding: "18px", borderRadius: "12px", border: "1px solid #e2e8f0",
    marginBottom: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  campoFiltro: { display: "flex", flexDirection: "column" },
  label: { fontSize: "0.75rem", color: "#64748b", marginBottom: "5px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.3px" },
  input: {
    padding: "8px 10px", borderRadius: "7px", border: "1px solid #cbd5e1", fontSize: "0.85rem",
    minWidth: "140px",
  },
  botonesFiltro: { display: "flex", gap: "8px", flexWrap: "wrap" },
  botonPrimario: {
    background: "#1d4ed8", color: "#fff", border: "none", padding: "9px 16px",
    borderRadius: "7px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600,
  },
  botonSecundario: {
    background: "#f8fafc", border: "1px solid #cbd5e1", padding: "9px 16px", color: "#334155",
    borderRadius: "7px", cursor: "pointer", fontSize: "0.85rem",
  },
  error: { color: "#dc2626", fontSize: "0.85rem" },
  tarjetaTabla: {
    background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0",
    overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  cargandoTexto: { padding: "30px", textAlign: "center", color: "#94a3b8" },
  tabla: { width: "100%", borderCollapse: "collapse", minWidth: "720px" },
  th: {
    textAlign: "left", padding: "12px 16px", fontSize: "0.75rem", color: "#64748b",
    borderBottom: "1px solid #e2e8f0", background: "#f8fafc",
    textTransform: "uppercase", letterSpacing: "0.3px", fontWeight: 600,
  },
  filaTabla: { transition: "background 0.1s" },
  td: { padding: "12px 16px", fontSize: "0.85rem", borderBottom: "1px solid #f1f5f9", color: "#334155" },
  tdVacio: { padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: "0.9rem" },
  badge: { fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: "999px", display: "inline-block" },
  codigo: { fontFamily: "monospace", fontSize: "0.8rem", color: "#64748b" },
  paginacion: {
    display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "space-between", alignItems: "center",
    padding: "14px 16px", borderTop: "1px solid #e2e8f0", background: "#f8fafc",
  },
  botonPaginacion: {
    background: "#fff", border: "1px solid #cbd5e1", padding: "7px 14px",
    borderRadius: "6px", cursor: "pointer", fontSize: "0.82rem",
  },
  textoPaginacion: { fontSize: "0.82rem", color: "#64748b", fontWeight: 500 },
};