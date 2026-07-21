import { useEffect, useState } from "react";
import { obtenerSesiones, cerrarSesion } from "./authApi";

export default function SesionesActivas({ token }) {
  const [sesiones, setSesiones] = useState([]);
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    setCargando(true);
    const data = await obtenerSesiones(token);
    setSesiones(data);
    setCargando(false);
  }

  useEffect(() => { cargar(); }, []);

  async function manejarCerrar(id) {
    if (!confirm("¿Cerrar esta sesión?")) return;
    await cerrarSesion(token, id);
    cargar();
  }

  if (cargando) return <p>Cargando sesiones...</p>;

  return (
    <div style={{ padding: "1.5rem" }}>
      <h3>Sesiones activas</h3>
      {sesiones.length === 0 && <p>No hay sesiones activas.</p>}

      {sesiones.map((s) => (
        <div key={s.id} style={estilos.fila}>
          <div>
            <strong>{s.ip}</strong>{s.esSesionActual && <span style={estilos.badge}> Esta sesión</span>}
            <div style={estilos.detalle}>{s.userAgent}</div>
            <div style={estilos.detalle}>
              Inicio: {new Date(s.fechaInicio).toLocaleString()} · Última actividad: {new Date(s.fechaUltimoUso).toLocaleString()}
            </div>
          </div>
          {!s.esSesionActual && (
            <button onClick={() => manejarCerrar(s.id)} style={estilos.botonCerrar}>
              Cerrar sesión
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

const estilos = {
  fila: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    marginBottom: "10px",
  },
  detalle: { fontSize: "0.8rem", color: "#64748b", marginTop: "4px" },
  badge: {
    marginLeft: "8px",
    fontSize: "0.7rem",
    background: "#dcfce7",
    color: "#166534",
    padding: "2px 8px",
    borderRadius: "999px",
  },
  botonCerrar: {
    background: "#fee2e2",
    color: "#b91c1c",
    border: "none",
    padding: "8px 14px",
    borderRadius: "6px",
    cursor: "pointer",
  },
};
