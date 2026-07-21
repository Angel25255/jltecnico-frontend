import { useState } from "react";
import { login, verificar2FA } from "./authApi";

export default function Login({ onLoginExitoso }) {
  const [paso, setPaso] = useState(1);
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [preAuthToken, setPreAuthToken] = useState("");
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [intentosFallidos, setIntentosFallidos] = useState(0);

  async function manejarLogin(e) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const data = await login(correo, password);
      if (data.requiere2FA) {
        setPreAuthToken(data.preAuthToken);
        setPaso(2);
        setIntentosFallidos(0);
      }
    } catch (err) {
      setError(err.message);
      setIntentosFallidos((prev) => prev + 1);
    } finally {
      setCargando(false);
    }
  }

  async function manejarVerificar2FA(e) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const data = await verificar2FA(preAuthToken, codigo);
      if (data.dispositivoNuevo) {
        console.log("Primer inicio de sesión desde este dispositivo. Se envió un correo de aviso.");
      }
      localStorage.removeItem("token");
      onLoginExitoso(data.token, data.nombreCompleto, data.rol);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  const mostrarAvisoOlvido = intentosFallidos >= 3;

  return (
    <div style={estilos.pagina}>
      {/* ---------------- Panel izquierdo con logo (oculto en celular) ---------------- */}
      <div style={estilos.panelLogo} className="login-panel-logo">
        <div style={estilos.orbeUno} />
        <div style={estilos.orbeDos} />
        <div style={estilos.patronPuntos} />

        <div style={estilos.contenidoLogo}>
          <div style={estilos.marcoLogo}>
            <img src="/logo-jl-tecnico.jpeg" alt="JL Técnico EIRL" style={estilos.imagenLogo} />
          </div>
          <div style={estilos.lineaAcento} />
          <p style={estilos.fraseLogo}>SISTEMA DE GESTION</p>
          <p style={estilos.subFraseLogo}></p>
        </div>
      </div>

      {/* ---------------- Panel derecho con el formulario ---------------- */}
      <div style={estilos.panelFormulario}>
        <div style={estilos.tarjeta}>
          <div style={estilos.barraAcento} />

          <h2 style={estilos.titulo}>Bienvenido al sistema</h2>
          <p style={estilos.subtitulo}>JL Técnico EIRL</p>

          {paso === 1 && (
            <form onSubmit={manejarLogin}>
              <label style={estilos.label}>Correo</label>
              <div style={estilos.grupoInput}>
                <span style={estilos.iconoInput}></span>
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  required
                  style={estilos.input}
                  placeholder="usuario@jltecnico.com"
                />
              </div>

              <label style={estilos.label}>Contraseña</label>
              <div style={estilos.grupoInput}>
                <span style={estilos.iconoInput}></span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={estilos.input}
                />
              </div>

              {error && <p style={estilos.error}>{error}</p>}

              {mostrarAvisoOlvido && (
                <div style={estilos.avisoOlvido}>
                  <span>¿Olvidaste tu contraseña?</span>
                  <p style={estilos.textoAvisoOlvido}>
                    Comunícate con el Administrador del sistema para que te restablezca el acceso.
                    Después de 5 intentos fallidos seguidos, tu cuenta se bloqueará temporalmente por seguridad.
                  </p>
                </div>
              )}

              <button type="submit" disabled={cargando} style={estilos.boton}>
                {cargando ? "Verificando..." : "Ingresar"}
              </button>
            </form>
          )}

          {paso === 2 && (
            <form onSubmit={manejarVerificar2FA}>
              <div style={estilos.badge2FA}>Verificación en dos pasos</div>
              <p style={estilos.textoAyuda}>
                Abre Google Authenticator o Microsoft Authenticator y escribe el código de 6 dígitos.
              </p>

              <label style={estilos.label}>Código de verificación</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                required
                autoFocus
                style={{ ...estilos.input, ...estilos.inputCodigo }}
                placeholder="000000"
              />

              {error && <p style={estilos.error}>{error}</p>}

              <button type="submit" disabled={cargando} style={estilos.boton}>
                {cargando ? "Verificando..." : "Confirmar"}
              </button>

              <button
                type="button"
                onClick={() => { setPaso(1); setCodigo(""); setError(""); }}
                style={estilos.botonSecundario}
              >
                ← Volver
              </button>
            </form>
          )}

          <p style={estilos.piePagina}>© {new Date().getFullYear()} JL Técnico EIRL</p>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .login-panel-logo { display: none !important; }
        }
        @keyframes flotar {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  );
}

const estilos = {
  pagina: {
    minHeight: "100vh",
    display: "flex",
    background: "#0f172a",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },

  // ---- Panel izquierdo ----
  panelLogo: {
    flex: "1 1 50%",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    background: "radial-gradient(circle at 30% 20%, #1e293b 0%, #0f172a 60%)",
  },
  orbeUno: {
    position: "absolute", top: "-10%", left: "-5%", width: "380px", height: "380px",
    borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.18), transparent 70%)",
    filter: "blur(10px)",
  },
  orbeDos: {
    position: "absolute", bottom: "-15%", right: "-10%", width: "420px", height: "420px",
    borderRadius: "50%", background: "radial-gradient(circle, rgba(29,78,216,0.15), transparent 70%)",
    filter: "blur(10px)",
  },
  patronPuntos: {
    position: "absolute", inset: 0,
    backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
    backgroundSize: "26px 26px",
  },
  contenidoLogo: {
    position: "relative", zIndex: 1,
    display: "flex", flexDirection: "column", alignItems: "center", gap: "14px",
    padding: "0 40px", textAlign: "center",
  },
  marcoLogo: {
    padding: "18px",
    borderRadius: "20px",
    background: "linear-gradient(145deg, #1e293b, #0f172a)",
    border: "1px solid rgba(245,158,11,0.25)",
    boxShadow: "0 20px 50px rgba(0,0,0,0.5), 0 0 40px rgba(245,158,11,0.12)",
    animation: "flotar 5s ease-in-out infinite",
  },
  imagenLogo: {
    width: "220px",
    maxWidth: "100%",
    height: "auto",
    display: "block",
    borderRadius: "10px",
  },
  lineaAcento: {
    width: "60px", height: "3px", borderRadius: "999px",
    background: "linear-gradient(90deg, #f59e0b, #d97706)",
    marginTop: "6px",
  },
  fraseLogo: {
    color: "#f1f5f9", fontSize: "1.15rem", fontWeight: 700,
    letterSpacing: "1px", textTransform: "uppercase", margin: 0,
  },
  subFraseLogo: {
    color: "#64748b", fontSize: "0.82rem", margin: 0, letterSpacing: "0.3px",
  },

  // ---- Panel derecho ----
  panelFormulario: {
    flex: "1 1 50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    background: "#f8fafc",
  },
  tarjeta: {
    background: "#ffffff",
    padding: "2.6rem 2.4rem 2rem 2.4rem",
    borderRadius: "18px",
    width: "380px",
    maxWidth: "100%",
    boxShadow: "0 25px 60px rgba(15,23,42,0.12), 0 4px 12px rgba(15,23,42,0.06)",
    position: "relative",
    overflow: "hidden",
  },
  barraAcento: {
    position: "absolute", top: 0, left: 0, right: 0, height: "5px",
    background: "linear-gradient(90deg, #f59e0b, #d97706, #f59e0b)",
  },
  titulo: { margin: "6px 0 0 0", color: "#0f172a", fontSize: "1.45rem", fontWeight: 800 },
  subtitulo: { marginTop: "6px", marginBottom: "26px", color: "#64748b", fontSize: "0.87rem" },

  label: { display: "block", fontSize: "0.8rem", color: "#334155", marginBottom: "6px", marginTop: "16px", fontWeight: 600 },
  grupoInput: { position: "relative", display: "flex", alignItems: "center" },
  iconoInput: { position: "absolute", left: "13px", fontSize: "0.9rem", opacity: 0.6 },
  input: {
    width: "100%",
    padding: "11px 14px 11px 38px",
    borderRadius: "9px",
    border: "1.5px solid #e2e8f0",
    fontSize: "0.95rem",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
    outline: "none",
  },
  inputCodigo: {
    padding: "11px 14px",
    letterSpacing: "8px",
    textAlign: "center",
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "#0f172a",
  },

  boton: {
    width: "100%",
    marginTop: "26px",
    padding: "13px",
    borderRadius: "9px",
    border: "none",
    background: "linear-gradient(135deg, #f59e0b, #d97706)",
    color: "#0f172a",
    fontWeight: 800,
    cursor: "pointer",
    fontSize: "0.98rem",
    boxShadow: "0 8px 20px rgba(245,158,11,0.3)",
  },
  botonSecundario: {
    width: "100%",
    marginTop: "10px",
    padding: "11px",
    borderRadius: "9px",
    border: "1px solid #e2e8f0",
    background: "transparent",
    color: "#334155",
    cursor: "pointer",
    fontSize: "0.88rem",
  },

  error: { color: "#dc2626", fontSize: "0.83rem", marginTop: "12px", fontWeight: 500 },
  textoAyuda: { fontSize: "0.85rem", color: "#475569", lineHeight: 1.5, marginTop: "10px" },
  badge2FA: {
    display: "inline-block", background: "#eff6ff", color: "#1d4ed8", fontSize: "0.75rem",
    fontWeight: 700, padding: "4px 12px", borderRadius: "999px",
  },
  avisoOlvido: {
    background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px",
    padding: "12px 14px", marginTop: "16px", fontSize: "0.85rem", color: "#92400e", fontWeight: 700,
  },
  textoAvisoOlvido: { fontWeight: 400, fontSize: "0.78rem", margin: "5px 0 0 0", lineHeight: 1.5 },
  piePagina: { textAlign: "center", fontSize: "0.72rem", color: "#cbd5e1", marginTop: "24px" },
};