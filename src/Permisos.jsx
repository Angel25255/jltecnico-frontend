import { useEffect, useState } from "react";
import { obtenerMatrizPermisos, actualizarPermiso } from "./authApi";

const INFO_MODULO = {
  Clientes: { nombre: "Clientes", icono: "👥", color: "#1d4ed8" },
  Ventas: { nombre: "Ventas", icono: "💵", color: "#166534" },
  Cotizaciones: { nombre: "Cotizaciones", icono: "📄", color: "#92400e" },
  Reportes: { nombre: "Reportes Comerciales", icono: "📊", color: "#7c3aed" },
  Inventario: { nombre: "Inventario", icono: "📦", color: "#0891b2" },
  OrdenesServicio: { nombre: "Órdenes de Servicio", icono: "🛠️", color: "#a21caf" },
};

function Switch({ activo, cargando, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={cargando}
      style={{
        ...estilos.switchBase,
        background: activo ? "#166534" : "#e2e8f0",
        cursor: cargando ? "default" : "pointer",
        opacity: cargando ? 0.6 : 1,
      }}
      aria-pressed={activo}
    >
      <span style={{ ...estilos.switchBola, transform: activo ? "translateX(18px)" : "translateX(2px)" }} />
    </button>
  );
}

export default function Permisos({ token }) {
  const [permisos, setPermisos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [guardandoId, setGuardandoId] = useState(null);

  async function cargar() {
    setCargando(true);
    try {
      const data = await obtenerMatrizPermisos(token);
      setPermisos(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function alternar(permiso, rol) {
    const clave = rol === "Vendedor" ? "vendedorPermitido" : "tecnicoPermitido";
    const nuevoValor = !permiso[clave];
    const idGuardando = `${permiso.permisoId}-${rol}`;

    setGuardandoId(idGuardando);
    try {
      await actualizarPermiso(token, { permisoId: permiso.permisoId, rol, permitido: nuevoValor });
      setPermisos((prev) =>
        prev.map((p) => (p.permisoId === permiso.permisoId ? { ...p, [clave]: nuevoValor } : p))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardandoId(null);
    }
  }

  if (cargando) return <div style={{ padding: "1.5rem 2rem", color: "#94a3b8" }}>Cargando permisos...</div>;

  const porModulo = permisos.reduce((acc, p) => {
    (acc[p.modulo] = acc[p.modulo] || []).push(p);
    return acc;
  }, {});

  const totalPermisos = permisos.length;
  const totalVendedor = permisos.filter((p) => p.vendedorPermitido).length;
  const totalTecnico = permisos.filter((p) => p.tecnicoPermitido).length;

  return (
    <div style={estilos.contenedor}>
      <div style={estilos.encabezado}>
        <div>
          <h3 style={{ margin: 0 }}>Roles y Permisos</h3>
          <p style={estilos.textoAyuda}>
            El rol <strong>Administrador</strong> siempre tiene acceso completo a todo el sistema, sin excepción
            y sin necesitar configuración — no aparece aquí porque no es delegable. Los módulos de Seguridad
            (Usuarios, Auditoría, esta misma pantalla) y el Panel Gerencial tampoco se muestran porque son
            exclusivos del Administrador por diseño, no se pueden ceder a otros roles.
          </p>
        </div>
      </div>

      {/* Resumen de cuántos permisos tiene activos cada rol */}
      <div style={estilos.gridResumen}>
        <div style={estilos.tarjetaResumen}>
          <span style={estilos.labelResumen}>Vendedor</span>
          <span style={estilos.valorResumen}>{totalVendedor} <small style={estilos.deTotalResumen}>de {totalPermisos}</small></span>
          <div style={estilos.pistaProgreso}>
            <div style={{ ...estilos.barraProgreso, width: `${(totalVendedor / totalPermisos) * 100}%`, background: "#1d4ed8" }} />
          </div>
        </div>
        <div style={estilos.tarjetaResumen}>
          <span style={estilos.labelResumen}>Técnico</span>
          <span style={estilos.valorResumen}>{totalTecnico} <small style={estilos.deTotalResumen}>de {totalPermisos}</small></span>
          <div style={estilos.pistaProgreso}>
            <div style={{ ...estilos.barraProgreso, width: `${(totalTecnico / totalPermisos) * 100}%`, background: "#a21caf" }} />
          </div>
        </div>
      </div>

      {error && <p style={estilos.error}>{error}</p>}

      <div style={estilos.tablaGrande}>
        <div style={estilos.filaEncabezadoTabla}>
          <span>Módulo / Permiso</span>
          <span style={estilos.columnaCentrada}>Vendedor</span>
          <span style={estilos.columnaCentrada}>Técnico</span>
        </div>

        {Object.keys(porModulo).map((modulo) => {
          const info = INFO_MODULO[modulo] || { nombre: modulo, icono: "📁", color: "#64748b" };
          return (
            <div key={modulo} style={estilos.seccionModulo}>
              <div style={estilos.encabezadoModulo}>
                <span style={{ ...estilos.iconoModulo, background: `${info.color}18`, color: info.color }}>{info.icono}</span>
                <span style={estilos.tituloModulo}>{info.nombre}</span>
              </div>

              {porModulo[modulo].map((p) => (
                <div key={p.permisoId} style={estilos.filaPermiso}>
                  <span style={estilos.descripcionPermiso}>{p.descripcion}</span>
                  <span style={estilos.columnaSwitch}>
                    <Switch
                      activo={p.vendedorPermitido}
                      cargando={guardandoId === `${p.permisoId}-Vendedor`}
                      onClick={() => alternar(p, "Vendedor")}
                    />
                  </span>
                  <span style={estilos.columnaSwitch}>
                    <Switch
                      activo={p.tecnicoPermitido}
                      cargando={guardandoId === `${p.permisoId}-Tecnico`}
                      onClick={() => alternar(p, "Tecnico")}
                    />
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const estilos = {
  contenedor: { padding: "1.5rem 2rem", maxWidth: "980px" },
  encabezado: { marginBottom: "18px" },
  textoAyuda: { fontSize: "0.85rem", color: "#64748b", marginTop: "8px", maxWidth: "680px", lineHeight: 1.6 },

  gridResumen: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "20px" },
  tarjetaResumen: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px 16px" },
  labelResumen: { display: "block", fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: "4px" },
  valorResumen: { fontSize: "1.5rem", fontWeight: 800, color: "#0f172a" },
  deTotalResumen: { fontSize: "0.85rem", fontWeight: 500, color: "#94a3b8" },
  pistaProgreso: { height: "6px", background: "#f1f5f9", borderRadius: "999px", marginTop: "8px", overflow: "hidden" },
  barraProgreso: { height: "100%", borderRadius: "999px" },

  error: { color: "#dc2626", fontSize: "0.85rem", marginBottom: "12px" },

  tablaGrande: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden" },
  filaEncabezadoTabla: {
    display: "grid", gridTemplateColumns: "1fr 90px 90px", alignItems: "center",
    padding: "10px 18px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
    fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.4px",
  },
  columnaCentrada: { textAlign: "center" },

  seccionModulo: { borderBottom: "1px solid #f1f5f9" },
  encabezadoModulo: { display: "flex", alignItems: "center", gap: "10px", padding: "14px 18px 8px 18px" },
  iconoModulo: { width: "28px", height: "28px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.95rem" },
  tituloModulo: { fontWeight: 700, fontSize: "0.88rem", color: "#1e293b" },

  filaPermiso: {
    display: "grid", gridTemplateColumns: "1fr 90px 90px", alignItems: "center",
    padding: "9px 18px", borderTop: "1px solid #f8fafc",
  },
  descripcionPermiso: { fontSize: "0.83rem", color: "#475569" },
  columnaSwitch: { display: "flex", justifyContent: "center" },
  switchBase: {
    width: "38px", height: "20px", borderRadius: "999px", border: "none",
    position: "relative", padding: 0, transition: "background 0.15s",
  },
  switchBola: {
    position: "absolute", top: "2px", width: "16px", height: "16px", borderRadius: "50%",
    background: "#fff", transition: "transform 0.15s", boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
  },
};