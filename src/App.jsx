import { useState, useEffect } from "react";
import Login from "./Login";
import SesionesActivas from "./SesionesActivas";
import AdminUsuarios from "./AdminUsuarios";
import Permisos from "./Permisos";
import Auditoria from "./Auditoria";
import Clientes from "./Clientes";
import Productos from "./Productos";
import Categorias from "./Categorias";
import Ventas from "./Ventas";
import Cotizaciones from "./Cotizaciones";
import Reportes from "./Reportes";
import Proveedores from "./Proveedores";
import Compras from "./Compras";
import Kardex from "./Kardex";
import Tecnicos from "./Tecnicos";
import OrdenesServicio from "./OrdenesServicio";
import Dashboard from "./Dashboard";
import { cerrarSesion, obtenerSesiones, obtenerMisPermisos } from "./authApi";
import { useInactividad } from "./useInactividad";

function App() {
  const [token, setToken] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [pantalla, setPantalla] = useState("sesiones");
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [gruposAbiertos, setGruposAbiertos] = useState({ sprint1: true, sprint2: true, sprint3: true, sprint4: true });
  const [misPermisos, setMisPermisos] = useState([]);
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);

  // Carga los permisos reales del rol logueado, para filtrar el menú
  // (el backend ya bloqueaba cada acción, pero el menú mostraba todo
  // igual sin importar los permisos - esto lo corrige)
  useEffect(() => {
    if (!token) return;
    obtenerMisPermisos(token).then(setMisPermisos).catch(() => setMisPermisos([]));
  }, [token]);

  function tienePermiso(clave) {
    return misPermisos.includes(clave);
  }

  async function cerrarSesionInterno() {
    if (!token) return;
    setCerrandoSesion(true);
    try {
      const sesiones = await obtenerSesiones(token);
      const actual = sesiones.find((s) => s.esSesionActual);
      if (actual) await cerrarSesion(token, actual.id);
    } catch {
      // si falla la llamada al servidor, igual cerramos localmente
    } finally {
      setToken(null);
      setUsuario(null);
      setCerrandoSesion(false);
    }
  }

  async function manejarCerrarSesion() {
    if (!confirm("¿Cerrar tu sesión?")) return;
    await cerrarSesionInterno();
  }

  const { mostrarAdvertencia, segundosRestantes, seguirConectado } = useInactividad(cerrarSesionInterno);

  if (!token) {
    return (
      <Login
        onLoginExitoso={(t, nombre, rol) => {
          setToken(t);
          setUsuario({ nombre, rol });
          // El Administrador entra directo al Panel Gerencial (Sprint 4);
          // los demás roles siguen viendo Sesiones activas como antes.
          if (rol === "Administrador") setPantalla("dashboard");
        }}
      />
    );
  }

  const esAdmin = usuario.rol === "Administrador";

  // Cada módulo se muestra solo si el usuario tiene el permiso real
  // detrás (Administrador siempre tiene todos). "Sesiones activas"
  // no necesita permiso, es tu propia cuenta.
  const grupos = [
    {
      id: "sprint1",
      titulo: "Sprint 1 · Seguridad",
      modulos: [
        { id: "sesiones", label: "Sesiones activas", icon: IconoSesiones, visible: true },
        { id: "usuarios", label: "Administración de Usuarios", icon: IconoUsuarios, visible: esAdmin },
        { id: "permisos", label: "Roles y Permisos", icon: IconoPermisos, visible: esAdmin },
        { id: "auditoria", label: "Auditoría", icon: IconoAuditoria, visible: esAdmin },
      ],
    },
    {
      id: "sprint2",
      titulo: "Sprint 2 · Comercial",
      modulos: [
        { id: "clientes", label: "Clientes", icon: IconoClientes, visible: tienePermiso("CLIENTES_VER") },
        { id: "categorias", label: "Categorías", icon: IconoCategorias, visible: tienePermiso("VENTAS_VER") },
        { id: "productos", label: "Productos", icon: IconoProductos, visible: tienePermiso("VENTAS_VER") },
        { id: "ventas", label: "Ventas", icon: IconoVentas, visible: tienePermiso("VENTAS_VER") },
        { id: "cotizaciones", label: "Cotizaciones", icon: IconoCotizaciones, visible: tienePermiso("COTIZACIONES_VER") },
        { id: "reportes", label: "Reportes Comerciales", icon: IconoReportes, visible: tienePermiso("REPORTES_VER") },
      ],
    },
    {
      id: "sprint3",
      titulo: "Sprint 3 · Inventario",
      modulos: [
        { id: "proveedores", label: "Proveedores", icon: IconoProveedores, visible: tienePermiso("INVENTARIO_VER") },
        { id: "compras", label: "Compras", icon: IconoCompras, visible: tienePermiso("INVENTARIO_VER") },
        { id: "kardex", label: "Kardex", icon: IconoKardex, visible: tienePermiso("INVENTARIO_VER") },
        { id: "tecnicos", label: "Gestión de Técnicos", icon: IconoTecnicos, visible: tienePermiso("OS_VER") },
        { id: "ordenes-servicio", label: "Órdenes de Servicio", icon: IconoOrdenes, visible: tienePermiso("OS_VER") },
      ],
    },
    {
      id: "sprint4",
      titulo: "Sprint 4 · Panel Gerencial",
      modulos: [
        { id: "dashboard", label: "Panel de Control", icon: IconoDashboard, visible: esAdmin },
      ],
    },
  ];

  function alternarGrupo(id) {
    setGruposAbiertos((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function irAModulo(id) {
    setPantalla(id);
    setMenuMovilAbierto(false);
  }

  async function manejarCerrarSesionMovil() {
    setMenuMovilAbierto(false);
    await manejarCerrarSesion();
  }

  return (
    <div style={estilos.layout}>
      <aside style={estilos.sidebar} className="sidebar-escritorio">
        <div style={estilos.logoBox}>
          <div style={estilos.logoIcono}>JL</div>
          <div>
            <div style={estilos.logoTitulo}>JL Técnico</div>
            <div style={estilos.logoSubtitulo}>EIRL · Sistema de Gestión</div>
          </div>
        </div>

        <nav style={estilos.nav}>
          {grupos.map((grupo) => {
            const modulosVisibles = grupo.modulos.filter((m) => m.visible);
            if (modulosVisibles.length === 0) return null;
            const abierto = gruposAbiertos[grupo.id];

            return (
              <div key={grupo.id} style={estilos.grupoContenedor}>
                <button onClick={() => alternarGrupo(grupo.id)} style={estilos.grupoEncabezado}>
                  <span>{grupo.titulo}</span>
                  <span style={{ transform: abierto ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
                    ›
                  </span>
                </button>

                {abierto && (
                  <div style={estilos.grupoItems}>
                    {modulosVisibles.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setPantalla(m.id)}
                        style={pantalla === m.id ? estilos.navItemActivo : estilos.navItem}
                      >
                        <m.icon activo={pantalla === m.id} />
                        <span>{m.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div style={estilos.sidebarFooter}>
          <div style={estilos.usuarioBox}>
            <div style={estilos.avatar}>{usuario.nombre.charAt(0).toUpperCase()}</div>
            <div style={{ overflow: "hidden" }}>
              <div style={estilos.usuarioNombre}>{usuario.nombre}</div>
              <div style={estilos.usuarioRol}>{usuario.rol}</div>
            </div>
          </div>
          <button
            onClick={manejarCerrarSesion}
            disabled={cerrandoSesion}
            style={estilos.botonLogout}
          >
            <IconoLogout />
            <span>{cerrandoSesion ? "Cerrando..." : "Cerrar sesión"}</span>
          </button>
        </div>
      </aside>

      <main style={estilos.contenido} className="contenido-app">
        {pantalla === "sesiones" && <SesionesActivas token={token} />}
        {pantalla === "usuarios" && esAdmin && <AdminUsuarios token={token} />}
        {pantalla === "permisos" && esAdmin && <Permisos token={token} />}
        {pantalla === "auditoria" && esAdmin && <Auditoria token={token} />}
        {pantalla === "clientes" && <Clientes token={token} />}
        {pantalla === "categorias" && <Categorias token={token} />}
        {pantalla === "productos" && <Productos token={token} />}
        {pantalla === "ventas" && <Ventas token={token} />}
        {pantalla === "cotizaciones" && <Cotizaciones token={token} />}
        {pantalla === "reportes" && <Reportes token={token} />}
        {pantalla === "proveedores" && <Proveedores token={token} />}
        {pantalla === "compras" && <Compras token={token} />}
        {pantalla === "kardex" && <Kardex token={token} />}
        {pantalla === "tecnicos" && <Tecnicos token={token} esAdmin={esAdmin} />}
        {pantalla === "ordenes-servicio" && <OrdenesServicio token={token} usuario={usuario} />}
        {pantalla === "dashboard" && esAdmin && <Dashboard token={token} nombreUsuario={usuario.nombre} />}
      </main>

      {mostrarAdvertencia && (
        <div style={estilos.overlayInactividad}>
          <div style={estilos.modalInactividad}>
            <div style={estilos.iconoAlerta}>⏱️</div>
            <h3 style={{ margin: "0 0 8px 0" }}>Tu sesión está por cerrarse</h3>
            <p style={estilos.textoInactividad}>
              No detectamos actividad. Por seguridad, tu sesión se cerrará en{" "}
              <strong>{segundosRestantes}</strong> segundos.
            </p>
            <button onClick={seguirConectado} style={estilos.botonSeguirConectado}>
              Seguir conectado
            </button>
          </div>
        </div>
      )}

      {/* ---------------- Barra inferior (SOLO CELULAR) ---------------- */}
      <nav style={estilos.barraMovil} className="barra-movil">
        <button style={estilos.botonInicioMovil} onClick={() => setMenuMovilAbierto(true)}>
          <span style={estilos.iconoInicioMovil}>☰</span>
          <span>Inicio</span>
        </button>
      </nav>

      {/* ---------------- Menú de pantalla completa (SOLO CELULAR) ---------------- */}
      {menuMovilAbierto && (
        <div style={estilos.menuMovilOverlay} className="menu-movil-pantalla">
          <div style={estilos.menuMovilPanel}>
            <div style={estilos.menuMovilEncabezado}>
              <div style={estilos.logoBox}>
                <div style={estilos.logoIcono}>JL</div>
                <div>
                  <div style={estilos.logoTitulo}>JL Técnico</div>
                  <div style={estilos.logoSubtitulo}>EIRL · Sistema de Gestión</div>
                </div>
              </div>
              <button style={estilos.botonCerrarMenuMovil} onClick={() => setMenuMovilAbierto(false)}>✕</button>
            </div>

            <div style={estilos.menuMovilScroll}>
              {grupos.map((grupo) => {
                const modulosVisibles = grupo.modulos.filter((m) => m.visible);
                if (modulosVisibles.length === 0) return null;
                return (
                  <div key={grupo.id} style={estilos.grupoMovilContenedor}>
                    <span style={estilos.grupoMovilTitulo}>{grupo.titulo}</span>
                    <div style={estilos.gridIconosMovil}>
                      {modulosVisibles.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => irAModulo(m.id)}
                          style={pantalla === m.id ? estilos.iconoModuloMovilActivo : estilos.iconoModuloMovil}
                        >
                          <m.icon activo={pantalla === m.id} />
                          <span style={estilos.labelIconoMovil}>{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={estilos.menuMovilFooter}>
              <div style={estilos.usuarioBox}>
                <div style={estilos.avatar}>{usuario.nombre.charAt(0).toUpperCase()}</div>
                <div style={{ overflow: "hidden" }}>
                  <div style={estilos.usuarioNombre}>{usuario.nombre}</div>
                  <div style={estilos.usuarioRol}>{usuario.rol}</div>
                </div>
              </div>
              <button
                onClick={manejarCerrarSesionMovil}
                disabled={cerrandoSesion}
                style={estilos.botonLogout}
              >
                <IconoLogout />
                <span>{cerrandoSesion ? "Cerrando..." : "Cerrar sesión"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .barra-movil { display: none; }
        .menu-movil-pantalla { display: none; }

        @media (max-width: 900px) {
          .sidebar-escritorio { display: none !important; }
          .barra-movil { display: flex !important; }
          .menu-movil-pantalla { display: flex !important; }
          .contenido-app { padding-bottom: 76px !important; }
        }
      `}</style>
    </div>
  );
}

function IconoSesiones({ activo }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activo ? "#f59e0b" : "#94a3b8"} strokeWidth="2">
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M3 9h18" strokeLinecap="round" />
      <circle cx="7" cy="6.5" r="0.6" fill={activo ? "#f59e0b" : "#94a3b8"} />
    </svg>
  );
}

function IconoUsuarios({ activo }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activo ? "#f59e0b" : "#94a3b8"} strokeWidth="2">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c1-3.2 3.3-5 5.5-5s4.5 1.8 5.5 5" strokeLinecap="round" />
      <path d="M16 4.5c1.6.4 2.8 1.8 2.8 3.5s-1.2 3.1-2.8 3.5" strokeLinecap="round" />
      <path d="M19 14c1.6.6 2.7 2.2 3.2 5" strokeLinecap="round" />
    </svg>
  );
}

function IconoPermisos({ activo }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activo ? "#f59e0b" : "#94a3b8"} strokeWidth="2">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconoAuditoria({ activo }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activo ? "#f59e0b" : "#94a3b8"} strokeWidth="2">
      <path d="M6 4h9l5 5v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" strokeLinejoin="round" />
      <path d="M9 12h6M9 16h6M9 8h3" strokeLinecap="round" />
    </svg>
  );
}

function IconoClientes({ activo }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activo ? "#f59e0b" : "#94a3b8"} strokeWidth="2">
      <circle cx="8" cy="8" r="3" />
      <circle cx="16" cy="9" r="2.4" />
      <path d="M2.5 20c0.8-3.6 3-5.5 5.5-5.5s4.7 1.9 5.5 5.5" strokeLinecap="round" />
      <path d="M14.5 15c2 0.2 3.6 1.8 4.2 5" strokeLinecap="round" />
    </svg>
  );
}

function IconoProductos({ activo }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activo ? "#f59e0b" : "#94a3b8"} strokeWidth="2">
      <path d="M21 8l-9-5-9 5 9 5 9-5z" strokeLinejoin="round" />
      <path d="M3 8v8l9 5 9-5V8" strokeLinejoin="round" />
      <path d="M12 13v8" />
    </svg>
  );
}

function IconoCategorias({ activo }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activo ? "#f59e0b" : "#94a3b8"} strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}


function IconoVentas({ activo }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activo ? "#f59e0b" : "#94a3b8"} strokeWidth="2">
      <circle cx="9" cy="20" r="1.3" fill={activo ? "#f59e0b" : "#94a3b8"} stroke="none" />
      <circle cx="17" cy="20" r="1.3" fill={activo ? "#f59e0b" : "#94a3b8"} stroke="none" />
      <path d="M2 3h2l2.4 12.2a1.5 1.5 0 0 0 1.5 1.3h9.2a1.5 1.5 0 0 0 1.5-1.2L21 7H6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}


function IconoCotizaciones({ activo }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activo ? "#f59e0b" : "#94a3b8"} strokeWidth="2">
      <path d="M7 3h8l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" strokeLinejoin="round" />
      <path d="M9 10h6M9 14h6M9 18h3" strokeLinecap="round" />
    </svg>
  );
}


function IconoReportes({ activo }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activo ? "#f59e0b" : "#94a3b8"} strokeWidth="2">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}


function IconoProveedores({ activo }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activo ? "#f59e0b" : "#94a3b8"} strokeWidth="2">
      <path d="M3 21V8l9-5 9 5v13" strokeLinejoin="round" />
      <path d="M9 21v-6h6v6" strokeLinejoin="round" />
      <path d="M3 8l9 5 9-5" strokeLinejoin="round" />
    </svg>
  );
}


function IconoCompras({ activo }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activo ? "#f59e0b" : "#94a3b8"} strokeWidth="2">
      <path d="M6 2l1.5 4h9L18 2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 6h17l-1.5 12a2 2 0 0 1-2 1.8H7a2 2 0 0 1-2-1.8L3.5 6z" strokeLinejoin="round" />
      <path d="M9 10v4M15 10v4" strokeLinecap="round" />
    </svg>
  );
}


function IconoKardex({ activo }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activo ? "#f59e0b" : "#94a3b8"} strokeWidth="2">
      <path d="M6 4h9l5 5v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" strokeLinejoin="round" />
      <path d="M9 12h6M9 16h6M9 8h3" strokeLinecap="round" />
      <path d="M4 9l2 2 2-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}


function IconoTecnicos({ activo }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activo ? "#f59e0b" : "#94a3b8"} strokeWidth="2">
      <circle cx="12" cy="7" r="3.5" />
      <path d="M4.5 20c1.2-4 4-6.2 7.5-6.2s6.3 2.2 7.5 6.2" strokeLinecap="round" />
      <path d="M16.5 5.5a2.5 2.5 0 1 1 0 5" strokeLinecap="round" />
    </svg>
  );
}


function IconoOrdenes({ activo }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activo ? "#f59e0b" : "#94a3b8"} strokeWidth="2">
      <rect x="3" y="4" width="18" height="17" rx="2" strokeLinejoin="round" />
      <path d="M3 9h18" strokeLinecap="round" />
      <path d="M8 13l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}


function IconoDashboard({ activo }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activo ? "#f59e0b" : "#94a3b8"} strokeWidth="2">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" />
      <rect x="13" y="10" width="8" height="11" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}

function IconoLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
      <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" strokeLinecap="round" />
      <path d="M16 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12H9" strokeLinecap="round" />
    </svg>
  );
}

const SIDEBAR_ANCHO = "260px";

const estilos = {
  layout: {
    display: "flex",
    minHeight: "100vh",
    background: "#f8fafc",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  sidebar: {
    width: SIDEBAR_ANCHO,
    minWidth: SIDEBAR_ANCHO,
    background: "#0f172a",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    height: "100vh",
  },
  logoBox: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "24px 20px",
    borderBottom: "1px solid #1e293b",
  },
  logoIcono: {
    width: "40px",
    height: "40px",
    borderRadius: "8px",
    background: "linear-gradient(135deg, #f59e0b, #d97706)",
    color: "#0f172a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: "0.95rem",
    flexShrink: 0,
  },
  logoTitulo: { color: "#fff", fontWeight: 700, fontSize: "0.95rem", lineHeight: 1.2 },
  logoSubtitulo: { color: "#64748b", fontSize: "0.72rem", marginTop: "2px" },
  nav: {
    flex: 1,
    padding: "16px 10px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    overflowY: "auto",
  },
  grupoContenedor: { display: "flex", flexDirection: "column" },
  grupoEncabezado: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "transparent",
    border: "none",
    color: "#64748b",
    fontSize: "0.72rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    padding: "8px 10px",
    cursor: "pointer",
  },
  grupoItems: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    marginBottom: "4px",
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "none",
    background: "transparent",
    color: "#94a3b8",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "0.85rem",
  },
  navItemActivo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 14px",
    borderRadius: "8px",
    borderTop: "none",
    borderRight: "none",
    borderBottom: "none",
    borderLeft: "3px solid #f59e0b",
    background: "#1e293b",
    color: "#f8fafc",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: 600,
  },
  sidebarFooter: {
    padding: "16px",
    borderTop: "1px solid #1e293b",
  },
  usuarioBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "12px",
  },
  avatar: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    background: "#1e293b",
    color: "#f59e0b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "0.9rem",
    flexShrink: 0,
  },
  usuarioNombre: {
    color: "#e2e8f0",
    fontSize: "0.85rem",
    fontWeight: 600,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  usuarioRol: { color: "#64748b", fontSize: "0.72rem" },
  botonLogout: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "9px",
    borderRadius: "8px",
    border: "1px solid #3f1d1d",
    background: "#1c1010",
    color: "#f87171",
    cursor: "pointer",
    fontSize: "0.82rem",
  },
  contenido: {
    flex: 1,
    padding: "0",
  },

  // ---------------- Barra inferior móvil ----------------
  barraMovil: {
    position: "fixed", bottom: 0, left: 0, right: 0, height: "68px",
    background: "#0f172a", borderTop: "1px solid #1e293b",
    alignItems: "center", justifyContent: "center", zIndex: 500,
    boxShadow: "0 -4px 20px rgba(0,0,0,0.25)",
  },
  botonInicioMovil: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: "3px",
    background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#0f172a",
    border: "none", borderRadius: "16px", padding: "8px 28px",
    cursor: "pointer", fontWeight: 700, fontSize: "0.7rem",
    boxShadow: "0 6px 16px rgba(245,158,11,0.35)",
    transform: "translateY(-8px)",
  },
  iconoInicioMovil: { fontSize: "1.2rem", lineHeight: 1 },

  // ---------------- Menú de pantalla completa móvil ----------------
  menuMovilOverlay: {
    position: "fixed", inset: 0, background: "#0f172a", zIndex: 900,
    flexDirection: "column",
  },
  menuMovilPanel: { display: "flex", flexDirection: "column", height: "100%" },
  menuMovilEncabezado: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "20px", borderBottom: "1px solid #1e293b",
  },
  botonCerrarMenuMovil: {
    background: "#1e293b", border: "none", color: "#f8fafc", fontSize: "1.1rem",
    width: "36px", height: "36px", borderRadius: "10px", cursor: "pointer", flexShrink: 0,
  },
  menuMovilScroll: { flex: 1, overflowY: "auto", padding: "16px 20px" },
  grupoMovilContenedor: { marginBottom: "22px" },
  grupoMovilTitulo: {
    display: "block", fontSize: "0.72rem", color: "#64748b", fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px",
  },
  gridIconosMovil: {
    display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px",
  },
  iconoModuloMovil: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
    background: "#1e293b", border: "1px solid #263145", borderRadius: "14px",
    padding: "16px 8px", cursor: "pointer", color: "#cbd5e1", fontSize: "0.72rem",
    textAlign: "center",
  },
  iconoModuloMovilActivo: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
    background: "#2a2416", border: "1px solid #f59e0b", borderRadius: "14px",
    padding: "16px 8px", cursor: "pointer", color: "#fef3c7", fontSize: "0.72rem",
    fontWeight: 700, textAlign: "center",
  },
  labelIconoMovil: { lineHeight: 1.25 },
  menuMovilFooter: {
    padding: "16px 20px", borderTop: "1px solid #1e293b",
  },
  overlayInactividad: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(15, 23, 42, 0.75)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 2000,
  },
  modalInactividad: {
    background: "#fff", borderRadius: "14px", padding: "32px", width: "380px",
    maxWidth: "90vw", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
  },
  iconoAlerta: { fontSize: "2rem", marginBottom: "8px" },
  textoInactividad: { fontSize: "0.9rem", color: "#475569", lineHeight: 1.5, marginBottom: "20px" },
  botonSeguirConectado: {
    background: "#1d4ed8", color: "#fff", border: "none", padding: "11px 24px",
    borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem", width: "100%",
  },
};

export default App;