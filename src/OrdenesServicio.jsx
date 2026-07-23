import { useEffect, useRef, useState } from "react";
import {
  crearOrdenServicio, listarOrdenesServicio, asignarTecnicoOrden, cambiarEstadoOrden,
  agregarProductoOrden, quitarProductoOrden, listarTecnicos, listarProductos,
  descargarBoletaPdf, listarVentasDisponiblesParaOrden, actualizarUbicacionOrden,
  obtenerOrdenServicio,
} from "./authApi";
import MapaSeleccionUbicacion from "./MapaSeleccionUbicacion";
import MapaSeguimiento from "./MapaSeguimiento";

const COLOR_ESTADO = {
  Pendiente: { bg: "#fef3c7", texto: "#92400e" },
  Asignada: { bg: "#dbeafe", texto: "#1d4ed8" },
  EnCamino: { bg: "#e0e7ff", texto: "#4338ca" },
  EnProceso: { bg: "#fce7f3", texto: "#a21caf" },
  Completada: { bg: "#dcfce7", texto: "#166534" },
  Cancelada: { bg: "#fee2e2", texto: "#b91c1c" },
};

const ETIQUETA_ESTADO = {
  Pendiente: "Pendiente",
  Asignada: "Asignada",
  EnCamino: "En camino",
  EnProceso: "En proceso",
  Completada: "Completada",
  Cancelada: "Cancelada",
};

function obtenerUserIdDesdeToken(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return parseInt(payload.userId, 10);
  } catch {
    return null;
  }
}

export default function OrdenesServicio({ token, usuario }) {
  const usuarioId = obtenerUserIdDesdeToken(token);
  const esGestor = usuario.rol === "Administrador" || usuario.rol === "Vendedor";
  const esTecnico = usuario.rol === "Tecnico";

  const [ordenes, setOrdenes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [ordenDetalle, setOrdenDetalle] = useState(null);

  async function cargar(estado = filtroEstado) {
    setCargando(true);
    try {
      setOrdenes(await listarOrdenesServicio(token, estado));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  function manejarFiltro(estado) {
    setFiltroEstado(estado);
    cargar(estado);
  }

  async function abrirDetalle(orden) {
    setOrdenDetalle(orden);
  }

  async function refrescarTodo() {
    await cargar(filtroEstado);
  }

  return (
    <div style={estilos.contenedor} className="modulo-responsive">
      <div style={estilos.encabezado}>
        <div>
          <h3 style={{ margin: 0 }}>{esTecnico ? "Mis Órdenes de Servicio" : "Órdenes de Servicio"}</h3>
          <p style={estilos.textoAyuda}>
            {esTecnico
              ? "Las órdenes asignadas a ti. Actualiza el avance conforme trabajas."
              : "Crea, asigna y da seguimiento a las órdenes de servicio técnico."}
          </p>
        </div>
        {esGestor && (
          <button onClick={() => setMostrarNueva(true)} style={estilos.botonPrimario}>
            + Nueva orden
          </button>
        )}
      </div>

      <div style={estilos.filtrosEstado}>
        <button onClick={() => manejarFiltro("")} style={filtroEstado === "" ? estilos.filtroActivo : estilos.filtro}>Todas</button>
        {Object.keys(ETIQUETA_ESTADO).map((e) => (
          <button key={e} onClick={() => manejarFiltro(e)} style={filtroEstado === e ? estilos.filtroActivo : estilos.filtro}>
            {ETIQUETA_ESTADO[e]}
          </button>
        ))}
      </div>

      {error && <p style={estilos.error}>{error}</p>}

      {cargando ? (
        <p>Cargando órdenes...</p>
      ) : (
        <>
          {/* ---------------- Vista de TARJETAS - solo en celular ---------------- */}
          <div className="vista-tarjetas-movil">
            {ordenes.length === 0 && (
              <p style={estilos.tdVacioMovil}>No hay órdenes con este filtro.</p>
            )}
            {ordenes.map((o) => {
              const color = COLOR_ESTADO[o.estado] || { bg: "#f1f5f9", texto: "#334155" };
              return (
                <div key={o.id} style={estilos.tarjetaOrden}>
                  <div style={estilos.tarjetaEncabezado}>
                    <div>
                      <strong style={estilos.tarjetaNombre}>Orden #{o.id}</strong>
                      <div style={estilos.tarjetaSub}>{o.nombreCliente}</div>
                    </div>
                    <span style={{ ...estilos.badgeEstado, background: color.bg, color: color.texto }}>
                      {ETIQUETA_ESTADO[o.estado]}
                    </span>
                  </div>
                  <div style={estilos.tarjetaFila}><span>Técnico</span><span>{o.nombreTecnico || "Sin asignar"}</span></div>
                  <div style={estilos.tarjetaFila}><span>Fecha</span><span>{new Date(o.fechaCreacion).toLocaleDateString("es-PE")}</span></div>
                  <p style={estilos.tarjetaDescripcion}>{o.descripcion.length > 70 ? o.descripcion.slice(0, 70) + "..." : o.descripcion}</p>
                  <button onClick={() => abrirDetalle(o)} style={estilos.botonVerDetalleMovil}>Ver detalle</button>
                </div>
              );
            })}
          </div>

          {/* ---------------- Vista de TABLA - solo en pantallas grandes ---------------- */}
          <div style={{ overflowX: "auto" }} className="vista-tabla-escritorio">
            <table style={estilos.tabla}>
              <thead>
                <tr>
                  <th style={estilos.th}>#</th>
                  <th style={estilos.th}>Cliente</th>
                  <th style={estilos.th}>Técnico</th>
                  <th style={estilos.th}>Descripción</th>
                  <th style={estilos.th}>Estado</th>
                  <th style={estilos.th}>Fecha</th>
                  <th style={estilos.th}></th>
                </tr>
              </thead>
              <tbody>
                {ordenes.length === 0 && (
                  <tr><td colSpan={7} style={estilos.tdVacio}>No hay órdenes con este filtro.</td></tr>
                )}
                {ordenes.map((o) => {
                  const color = COLOR_ESTADO[o.estado] || { bg: "#f1f5f9", texto: "#334155" };
                  return (
                    <tr key={o.id}>
                      <td style={estilos.td}>{o.id}</td>
                      <td style={estilos.td}>{o.nombreCliente}</td>
                      <td style={estilos.td}>{o.nombreTecnico || <span style={estilos.textoSecundario}>Sin asignar</span>}</td>
                      <td style={estilos.td}>{o.descripcion.length > 40 ? o.descripcion.slice(0, 40) + "..." : o.descripcion}</td>
                      <td style={estilos.td}>
                        <span style={{ ...estilos.badgeEstado, background: color.bg, color: color.texto }}>
                          {ETIQUETA_ESTADO[o.estado]}
                        </span>
                      </td>
                      <td style={estilos.td}>{new Date(o.fechaCreacion).toLocaleDateString("es-PE")}</td>
                      <td style={estilos.td}>
                        <button onClick={() => abrirDetalle(o)} style={estilos.botonVerDetalle}>Ver detalle</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {mostrarNueva && (
        <ModalNuevaOrden
          token={token}
          onCerrar={() => setMostrarNueva(false)}
          onCreada={async () => { setMostrarNueva(false); await cargar(filtroEstado); }}
        />
      )}

      {ordenDetalle && (
        <ModalDetalleOrden
          token={token}
          orden={ordenDetalle}
          usuarioId={usuarioId}
          esGestor={esGestor}
          esTecnico={esTecnico}
          onCerrar={() => setOrdenDetalle(null)}
          onActualizada={async (ordenActualizada) => {
            setOrdenDetalle(ordenActualizada);
            await cargar(filtroEstado);
          }}
        />
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

// -----------------------------------------------------------------
// Modal: crear nueva orden de servicio
// A propósito NO se cierra al hacer clic afuera - solo con la ✕ o
// "Cancelar", para no perder lo que ya se escribió por accidente.
// -----------------------------------------------------------------
function ModalNuevaOrden({ token, onCerrar, onCreada }) {
  const [ventas, setVentas] = useState([]);
  const [cargandoVentas, setCargandoVentas] = useState(true);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);

  const [tecnicos, setTecnicos] = useState([]);
  const [tecnicoUsuarioId, setTecnicoUsuarioId] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [direccion, setDireccion] = useState("");
  const [fechaProgramada, setFechaProgramada] = useState("");
  const [destino, setDestino] = useState(null); // { lat, lng }
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    listarVentasDisponiblesParaOrden(token)
      .then(setVentas)
      .catch((e) => setError(e.message))
      .finally(() => setCargandoVentas(false));
    listarTecnicos(token).then((data) => setTecnicos(data.filter((t) => t.activo))).catch(() => {});
  }, []);

  async function manejarCrear(e) {
    e.preventDefault();
    setError("");
    if (!ventaSeleccionada) { setError("Selecciona la venta del mostrador que origina esta orden."); return; }
    if (!descripcion.trim()) { setError("Escribe una descripción del trabajo."); return; }

    setGuardando(true);
    try {
      await crearOrdenServicio(token, {
        ventaId: ventaSeleccionada.ventaId,
        tecnicoUsuarioId: tecnicoUsuarioId ? parseInt(tecnicoUsuarioId, 10) : null,
        descripcion,
        direccionInstalacion: direccion || null,
        fechaProgramada: fechaProgramada || null,
        destinoLat: destino?.lat ?? null,
        destinoLng: destino?.lng ?? null,
      });
      onCreada();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div style={estilos.overlay}>
      <div style={estilos.modal}>
        <div style={estilos.modalEncabezado}>
          <h3 style={{ margin: 0 }}>Nueva orden de servicio</h3>
          <button style={estilos.botonCerrarModal} onClick={onCerrar}>✕</button>
        </div>

        <p style={estilos.textoSecundario}>
          Toda orden nace de una venta ya realizada en el mostrador. Si el cliente marcó
          "requiere instalación" al comprar, esa venta ya tiene su orden creada sola — aquí
          solo aparecen las ventas que <strong>todavía no</strong> tienen orden.
        </p>

        <form onSubmit={manejarCrear}>
          <label style={estilos.label}>Venta del mostrador</label>
          {cargandoVentas ? (
            <p style={estilos.textoSecundario}>Cargando ventas disponibles...</p>
          ) : ventas.length === 0 ? (
            <p style={estilos.textoSecundario}>No hay ventas sin orden de servicio pendientes.</p>
          ) : (
            <select
              value={ventaSeleccionada?.ventaId || ""}
              onChange={(e) => setVentaSeleccionada(ventas.find((v) => v.ventaId === parseInt(e.target.value, 10)))}
              style={estilos.input}
            >
              <option value="">Selecciona una venta...</option>
              {ventas.map((v) => (
                <option key={v.ventaId} value={v.ventaId}>
                  Venta #{v.ventaId} — {v.nombreCliente} — S/ {v.total.toFixed(2)} — {new Date(v.fechaVenta).toLocaleDateString("es-PE")}
                </option>
              ))}
            </select>
          )}

          <label style={estilos.label}>Técnico (opcional, se puede asignar después)</label>
          <select value={tecnicoUsuarioId} onChange={(e) => setTecnicoUsuarioId(e.target.value)} style={estilos.input}>
            <option value="">Sin asignar todavía</option>
            {tecnicos.map((t) => (
              <option key={t.usuarioId} value={t.usuarioId}>
                {t.nombreCompleto} {t.especialidad ? `(${t.especialidad})` : ""} — {t.estadoDisponibilidad}
              </option>
            ))}
          </select>

          <label style={estilos.label}>Descripción del trabajo</label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            style={{ ...estilos.input, minHeight: "70px", resize: "vertical" }}
            placeholder="Ej. Instalación de tomacorrientes en sala y cocina"
          />

          <label style={estilos.label}>Dirección de instalación</label>
          <input value={direccion} onChange={(e) => setDireccion(e.target.value)} style={estilos.input} />

          <label style={estilos.label}>Punto exacto en el mapa (para el GPS del cliente)</label>
          <MapaSeleccionUbicacion onCambiar={(lat, lng) => setDestino({ lat, lng })} />

          <label style={estilos.label}>Fecha programada (opcional)</label>
          <input type="datetime-local" value={fechaProgramada} onChange={(e) => setFechaProgramada(e.target.value)} style={estilos.input} />

          {error && <p style={estilos.error}>{error}</p>}

          <div style={estilos.modalAcciones}>
            <button type="button" onClick={onCerrar} style={estilos.botonSecundario}>Cancelar</button>
            <button type="submit" disabled={guardando} style={estilos.botonPrimario}>
              {guardando ? "Creando..." : "Crear orden"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------
// Modal: detalle de la orden + acciones de estado + productos
// A propósito NO se cierra al hacer clic afuera.
// -----------------------------------------------------------------
function ModalDetalleOrden({ token, orden, usuarioId, esGestor, esTecnico, onCerrar, onActualizada }) {
  const [error, setError] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [productoAModal, setProductoAModal] = useState(false);
  const [tecnicoAModal, setTecnicoAModal] = useState(false);
  const [compartiendoUbicacion, setCompartiendoUbicacion] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const watchIdRef = useRef(null);
  const ultimoEnvioRef = useRef(0);

  const esTecnicoAsignado = esTecnico && orden.tecnicoUsuarioId === usuarioId;
  const puedeActuar = esGestor || esTecnicoAsignado;
  const color = COLOR_ESTADO[orden.estado] || { bg: "#f1f5f9", texto: "#334155" };

  const linkSeguimiento = `${window.location.origin}/seguimiento/${orden.tokenSeguimiento}`;
  const puedeCompartirUbicacion = esTecnicoAsignado && (orden.estado === "EnCamino" || orden.estado === "EnProceso");

  const [ubicacionViva, setUbicacionViva] = useState({
    lat: orden.ubicacionTecnicoLat, lng: orden.ubicacionTecnicoLng,
  });

  useEffect(() => {
    if (orden.estado === "Completada" || orden.estado === "Cancelada") return;
    const intervalo = setInterval(async () => {
      try {
        const actualizada = await obtenerOrdenServicio(token, orden.id);
        setUbicacionViva({ lat: actualizada.ubicacionTecnicoLat, lng: actualizada.ubicacionTecnicoLng });
      } catch {
        // si falla un refresco, no pasa nada, se intenta de nuevo en 15s
      }
    }, 15000);
    return () => clearInterval(intervalo);
  }, [orden.id, orden.estado]);

  function iniciarCompartirUbicacion() {
    if (!navigator.geolocation) {
      setError("Tu navegador no soporta geolocalización.");
      return;
    }
    setCompartiendoUbicacion(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (posicion) => {
        const { latitude, longitude } = posicion.coords;
        setUbicacionViva({ lat: latitude, lng: longitude });

        const ahora = Date.now();
        if (ahora - ultimoEnvioRef.current < 15000) return;
        ultimoEnvioRef.current = ahora;
        actualizarUbicacionOrden(token, orden.id, latitude, longitude).catch(() => {});
      },
      () => setError("No se pudo acceder a tu ubicación. Revisa los permisos del navegador."),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );
  }

  function detenerCompartirUbicacion() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setCompartiendoUbicacion(false);
  }

  useEffect(() => {
    return () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, []);

  function copiarLink() {
    navigator.clipboard.writeText(linkSeguimiento);
    setLinkCopiado(true);
    setTimeout(() => setLinkCopiado(false), 2000);
  }

  async function manejarCambiarEstado(nuevoEstado) {
    const confirmaciones = {
      EnCamino: "¿Iniciar el viaje? Esto marca la orden como 'En camino' y empieza a compartir tu ubicación en vivo.",
      EnProceso: "¿Marcar que el técnico ya llegó y empezó el trabajo?",
      Completada: "¿Marcar esta orden como completada? La boleta ya está generada, esto solo cierra la orden.",
      Cancelada: "¿Cancelar esta orden de servicio?",
    };
    if (!confirm(confirmaciones[nuevoEstado] || "¿Confirmar cambio de estado?")) return;

    setProcesando(true);
    setError("");
    try {
      const actualizada = await cambiarEstadoOrden(token, orden.id, nuevoEstado);
      onActualizada(actualizada);

      if (nuevoEstado === "EnCamino" && esTecnicoAsignado) {
        iniciarCompartirUbicacion();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  }

  async function manejarAsignarTecnico(tecnicoUsuarioId) {
    setProcesando(true);
    setError("");
    try {
      await asignarTecnicoOrden(token, orden.id, tecnicoUsuarioId);
      onActualizada({ ...orden, tecnicoUsuarioId, estado: orden.estado === "Pendiente" ? "Asignada" : orden.estado });
    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
      setTecnicoAModal(false);
    }
  }

  async function manejarAgregarProducto(producto) {
    setProcesando(true);
    setError("");
    try {
      const actualizada = await agregarProductoOrden(token, orden.id, producto.id, 1);
      onActualizada(actualizada);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
      setProductoAModal(false);
    }
  }

  async function manejarQuitarProducto(detalleId) {
    setProcesando(true);
    setError("");
    try {
      const actualizada = await quitarProductoOrden(token, orden.id, detalleId);
      onActualizada(actualizada);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  }

  async function manejarDescargarBoleta() {
    try {
      await descargarBoletaPdf(token, orden.ventaId);
    } catch (err) {
      setError(err.message);
    }
  }

  const cerrada = orden.estado === "Completada" || orden.estado === "Cancelada";

  return (
    <div style={estilos.overlay}>
      <div style={estilos.modalDetalle}>
        <div style={estilos.modalEncabezado}>
          <div>
            <h3 style={{ margin: 0 }}>Orden #{orden.id}</h3>
            <span style={{ ...estilos.badgeEstado, background: color.bg, color: color.texto, marginTop: "6px", display: "inline-block" }}>
              {ETIQUETA_ESTADO[orden.estado]}
            </span>
          </div>
          <button style={estilos.botonCerrarModal} onClick={onCerrar}>✕</button>
        </div>

        {error && <p style={estilos.error}>{error}</p>}

        <div style={estilos.bloqueInfo}>
          <div style={estilos.filaInfo}><span>Cliente</span><strong>{orden.nombreCliente}</strong></div>
          <div style={estilos.filaInfo}><span>Dirección</span><span>{orden.direccionInstalacion || "—"}</span></div>
          <div style={estilos.filaInfo}>
            <span>Técnico</span>
            <span>
              {orden.nombreTecnico || "Sin asignar"}
              {esGestor && !cerrada && (
                <button onClick={() => setTecnicoAModal(true)} style={estilos.botonCambiarChico}>
                  {orden.nombreTecnico ? "Reasignar" : "Asignar"}
                </button>
              )}
            </span>
          </div>
          <div style={estilos.filaInfo}><span>Creado por</span><span>{orden.nombreCreadoPor}</span></div>
          <div style={estilos.filaInfo}><span>Fecha creación</span><span>{new Date(orden.fechaCreacion).toLocaleString("es-PE")}</span></div>
          {orden.fechaProgramada && (
            <div style={estilos.filaInfo}><span>Programada</span><span>{new Date(orden.fechaProgramada).toLocaleString("es-PE")}</span></div>
          )}
        </div>

        <div style={estilos.bloqueDescripcion}>
          <span style={estilos.labelBloque}>Descripción del trabajo</span>
          <p style={estilos.textoDescripcion}>{orden.descripcion}</p>
        </div>

        {/* Productos usados */}
        <div style={estilos.bloqueProductos}>
          <div style={estilos.encabezadoConBoton}>
            <span style={estilos.labelBloque}>Productos de la Venta #{orden.ventaId}</span>
            {!cerrada && puedeActuar && (
              <button onClick={() => setProductoAModal(true)} style={estilos.botonAgregarChico}>+ Agregar en campo</button>
            )}
          </div>

          {orden.productos.length === 0 ? (
            <p style={estilos.textoSecundario}>Esta venta no tiene productos (raro, revisa la venta original).</p>
          ) : (
            <>
              {orden.productos.map((p) => (
                <div key={p.id} style={estilos.filaProducto}>
                  <span>
                    {p.cantidad}x {p.nombreProducto}
                    {p.agregadoEnCampo && <span style={estilos.badgeEnCampo}>agregado en campo</span>}
                  </span>
                  <span style={estilos.subtotalProducto}>S/ {p.subtotal.toFixed(2)}</span>
                  {!cerrada && puedeActuar && p.agregadoEnCampo && (
                    <button onClick={() => manejarQuitarProducto(p.id)} style={estilos.botonQuitarChico}>✕</button>
                  )}
                </div>
              ))}
              <div style={estilos.totalProductos}>
                <span>Subtotal / IGV / Total</span>
                <strong>S/ {orden.subTotal.toFixed(2)} + S/ {orden.igv.toFixed(2)} = S/ {orden.total.toFixed(2)}</strong>
              </div>
            </>
          )}
        </div>

        {/* Mapa en vivo (destino + técnico + ruta) */}
        {(orden.destinoLat != null || ubicacionViva.lat != null) && (
          <div style={estilos.bloqueMapaDetalle}>
            <span style={estilos.labelBloque}>🗺️ Mapa en vivo</span>
            <div style={{ marginTop: "8px" }}>
              <MapaSeguimiento
                destinoLat={orden.destinoLat}
                destinoLng={orden.destinoLng}
                tecnicoLat={ubicacionViva.lat}
                tecnicoLng={ubicacionViva.lng}
                altura="260px"
              />
            </div>
          </div>
        )}

        {/* Link de seguimiento GPS para el cliente */}
        <div style={estilos.bloqueSeguimiento}>
          <span style={estilos.labelBloque}>🔗 Link de seguimiento para el cliente</span>
          <div style={estilos.filaLink}>
            <input readOnly value={linkSeguimiento} style={estilos.inputLink} onClick={(e) => e.target.select()} />
            <button onClick={copiarLink} style={estilos.botonCopiarLink}>
              {linkCopiado ? "✓ Copiado" : "Copiar"}
            </button>
          </div>
          <p style={estilos.textoSecundario}>Envíaselo por WhatsApp para que vea el estado y el mapa en vivo.</p>
        </div>

        {puedeCompartirUbicacion && (
          <div style={estilos.bloqueGps}>
            {compartiendoUbicacion ? (
              <button onClick={detenerCompartirUbicacion} style={estilos.botonDetenerGps}>
                🔴 Dejar de compartir mi ubicación
              </button>
            ) : (
              <button onClick={iniciarCompartirUbicacion} style={estilos.botonCompartirGps}>
                📍 Compartir mi ubicación en vivo
              </button>
            )}
            {compartiendoUbicacion && <p style={estilos.avisoCompartiendo}>Se está enviando tu ubicación cada ~15 segundos.</p>}
          </div>
        )}

        <div style={estilos.bloqueVentaGenerada}>
          <span>Boleta: Venta #{orden.ventaId}{orden.estado === "Completada" ? " (servicio completado)" : ""}</span>
          <button onClick={manejarDescargarBoleta} style={estilos.botonDescargarBoleta}>Descargar boleta (PDF)</button>
        </div>

        {/* Botones de acción según estado */}
        {!cerrada && puedeActuar && (
          <div style={estilos.botonesAccion}>
            {orden.estado === "Asignada" && (esTecnicoAsignado || esGestor) && (
              <button onClick={() => manejarCambiarEstado("EnCamino")} disabled={procesando} style={estilos.botonAccionPrimario}>
                🚗 Iniciar viaje
              </button>
            )}
            {orden.estado === "EnCamino" && (esTecnicoAsignado || esGestor) && (
              <button onClick={() => manejarCambiarEstado("EnProceso")} disabled={procesando} style={estilos.botonAccionPrimario}>
                🔧 Marcar "Llegué / Iniciar trabajo"
              </button>
            )}
            {orden.estado === "EnProceso" && (esTecnicoAsignado || esGestor) && (
              <button onClick={() => manejarCambiarEstado("Completada")} disabled={procesando} style={estilos.botonCompletar}>
                ✓ Completar orden
              </button>
            )}
            {esGestor && (
              <button onClick={() => manejarCambiarEstado("Cancelada")} disabled={procesando} style={estilos.botonCancelar}>
                Cancelar orden
              </button>
            )}
          </div>
        )}
      </div>

      {productoAModal && (
        <ModalProductoOrden
          token={token}
          onCerrar={() => setProductoAModal(false)}
          onSeleccionar={manejarAgregarProducto}
        />
      )}

      {tecnicoAModal && (
        <ModalTecnicoOrden
          token={token}
          onCerrar={() => setTecnicoAModal(false)}
          onSeleccionar={(tecnicoId) => manejarAsignarTecnico(tecnicoId)}
        />
      )}
    </div>
  );
}

// -----------------------------------------------------------------
// Modales auxiliares de búsqueda (producto, técnico)
// A propósito NO se cierran al hacer clic afuera.
// -----------------------------------------------------------------
function ModalProductoOrden({ token, onCerrar, onSeleccionar }) {
  const [texto, setTexto] = useState("");
  const [todos, setTodos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    listarProductos(token, "").then((data) => setTodos(data.filter((p) => p.activo))).finally(() => setCargando(false));
  }, []);

  const t = texto.trim().toLowerCase();
  const resultados = t ? todos.filter((p) => p.nombre.toLowerCase().includes(t) || (p.codigo || "").toLowerCase().includes(t)) : todos;

  return (
    <div style={estilos.overlay}>
      <div style={estilos.modalTabla}>
        <div style={estilos.modalEncabezado}>
          <h3 style={{ margin: 0 }}>Agregar producto usado</h3>
          <button style={estilos.botonCerrarModal} onClick={onCerrar}>✕</button>
        </div>
        <input autoFocus value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por nombre o código..." style={{ ...estilos.input, marginBottom: "14px" }} />
        <div style={estilos.contenedorTablaModal}>
          {cargando && <p style={estilos.textoSecundario}>Cargando...</p>}
          {!cargando && resultados.length > 0 && (
            <table style={estilos.tablaModal}>
              <thead><tr><th style={estilos.thModal}>Producto</th><th style={estilos.thModal}>Stock</th><th style={estilos.thModal}>Precio</th><th style={estilos.thModal}></th></tr></thead>
              <tbody>
                {resultados.map((p) => (
                  <tr key={p.id} style={{ opacity: p.stock === 0 ? 0.5 : 1 }}>
                    <td style={estilos.tdModal}>{p.nombre}</td>
                    <td style={estilos.tdModal}>{p.stock}</td>
                    <td style={estilos.tdModal}>S/ {p.precioUnitario.toFixed(2)}</td>
                    <td style={estilos.tdModal}>
                      <button onClick={() => p.stock > 0 && onSeleccionar(p)} disabled={p.stock === 0} style={estilos.botonSeleccionarModal}>Agregar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function ModalTecnicoOrden({ token, onCerrar, onSeleccionar }) {
  const [tecnicos, setTecnicos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    listarTecnicos(token).then((data) => setTecnicos(data.filter((t) => t.activo))).finally(() => setCargando(false));
  }, []);

  return (
    <div style={estilos.overlay}>
      <div style={estilos.modalTabla}>
        <div style={estilos.modalEncabezado}>
          <h3 style={{ margin: 0 }}>Asignar técnico</h3>
          <button style={estilos.botonCerrarModal} onClick={onCerrar}>✕</button>
        </div>
        <div style={estilos.contenedorTablaModal}>
          {cargando && <p style={estilos.textoSecundario}>Cargando...</p>}
          {!cargando && (
            <table style={estilos.tablaModal}>
              <thead><tr><th style={estilos.thModal}>Técnico</th><th style={estilos.thModal}>Especialidad</th><th style={estilos.thModal}>Estado</th><th style={estilos.thModal}></th></tr></thead>
              <tbody>
                {tecnicos.map((t) => (
                  <tr key={t.usuarioId}>
                    <td style={estilos.tdModal}>{t.nombreCompleto}</td>
                    <td style={estilos.tdModal}>{t.especialidad || "—"}</td>
                    <td style={estilos.tdModal}>{t.estadoDisponibilidad}</td>
                    <td style={estilos.tdModal}>
                      <button onClick={() => onSeleccionar(t.usuarioId)} style={estilos.botonSeleccionarModal}>Asignar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

const estilos = {
  contenedor: { padding: "1.5rem 2rem", maxWidth: "1200px" },
  encabezado: { display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" },
  textoAyuda: { fontSize: "0.85rem", color: "#64748b", marginTop: "4px", maxWidth: "500px" },
  botonPrimario: { background: "#1d4ed8", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: 600 },
  botonSecundario: { background: "transparent", border: "1px solid #cbd5e1", padding: "10px 16px", borderRadius: "8px", cursor: "pointer" },

  filtrosEstado: { display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" },
  filtro: { background: "#f8fafc", border: "1px solid #e2e8f0", padding: "7px 14px", borderRadius: "999px", cursor: "pointer", fontSize: "0.8rem", color: "#475569" },
  filtroActivo: { background: "#1d4ed8", border: "1px solid #1d4ed8", padding: "7px 14px", borderRadius: "999px", cursor: "pointer", fontSize: "0.8rem", color: "#fff", fontWeight: 600 },

  error: { color: "#dc2626", fontSize: "0.85rem", marginBottom: "12px" },
  textoSecundario: { color: "#64748b", fontSize: "0.78rem" },

  // ---- Tarjetas (celular) ----
  tdVacioMovil: { padding: "30px", textAlign: "center", color: "#94a3b8" },
  tarjetaOrden: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px" },
  tarjetaEncabezado: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px", gap: "8px" },
  tarjetaNombre: { fontSize: "0.92rem", color: "#1e293b" },
  tarjetaSub: { fontSize: "0.78rem", color: "#64748b", marginTop: "2px" },
  tarjetaFila: { display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "#475569", padding: "4px 0", borderBottom: "1px solid #f8fafc" },
  tarjetaDescripcion: { fontSize: "0.8rem", color: "#64748b", marginTop: "8px", marginBottom: "10px" },
  botonVerDetalleMovil: { width: "100%", background: "#eff6ff", color: "#1d4ed8", border: "none", padding: "10px", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 },

  // ---- Tabla (escritorio) ----
  tabla: { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "10px", overflow: "hidden", minWidth: "800px" },
  th: { textAlign: "left", padding: "10px", fontSize: "0.78rem", color: "#64748b", borderBottom: "2px solid #e2e8f0", background: "#f8fafc" },
  td: { padding: "10px", fontSize: "0.85rem", borderBottom: "1px solid #f1f5f9" },
  tdVacio: { padding: "30px", textAlign: "center", color: "#94a3b8" },
  badgeEstado: { padding: "3px 10px", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 600 },
  botonVerDetalle: { background: "#eff6ff", color: "#1d4ed8", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem" },

  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px" },
  modal: { background: "#fff", borderRadius: "12px", padding: "24px", width: "460px", maxWidth: "100%", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" },
  modalDetalle: { background: "#fff", borderRadius: "14px", padding: "26px", width: "560px", maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.35)" },
  modalEncabezado: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" },
  botonCerrarModal: { background: "transparent", border: "none", fontSize: "1.1rem", cursor: "pointer", color: "#64748b" },
  label: { display: "block", fontSize: "0.85rem", color: "#334155", marginBottom: "4px", marginTop: "12px" },
  input: { width: "100%", padding: "9px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.9rem", boxSizing: "border-box", fontFamily: "inherit" },
  modalAcciones: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" },

  bloqueInfo: { background: "#f8fafc", borderRadius: "10px", padding: "14px 16px", marginBottom: "14px" },
  filaInfo: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", color: "#475569", padding: "5px 0", flexWrap: "wrap", gap: "6px" },
  botonCambiarChico: { marginLeft: "8px", background: "#eff6ff", color: "#1d4ed8", border: "none", padding: "3px 8px", borderRadius: "5px", cursor: "pointer", fontSize: "0.7rem" },

  bloqueDescripcion: { marginBottom: "14px" },
  labelBloque: { fontSize: "0.78rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.3px" },
  textoDescripcion: { fontSize: "0.87rem", color: "#334155", marginTop: "6px", lineHeight: 1.5 },

  bloqueProductos: { background: "#f8fafc", borderRadius: "10px", padding: "14px 16px", marginBottom: "14px" },
  encabezadoConBoton: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "6px" },
  botonAgregarChico: { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #93c5fd", padding: "5px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 },
  filaProducto: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", padding: "6px 0", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap", gap: "6px" },
  subtotalProducto: { fontWeight: 600, marginLeft: "auto", marginRight: "10px" },
  botonQuitarChico: { background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: "5px", width: "22px", height: "22px", cursor: "pointer", fontSize: "0.7rem" },
  totalProductos: { display: "flex", justifyContent: "space-between", paddingTop: "8px", marginTop: "6px", borderTop: "1px solid #e2e8f0", fontSize: "0.9rem", flexWrap: "wrap", gap: "6px" },
  badgeEnCampo: { fontSize: "0.68rem", color: "#a21caf", background: "#fce7f3", padding: "1px 6px", borderRadius: "999px", marginLeft: "8px" },

  bloqueMapaDetalle: { marginBottom: "14px" },

  bloqueVentaGenerada: { display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "space-between", alignItems: "center", background: "#dcfce7", color: "#166534", padding: "10px 14px", borderRadius: "8px", marginBottom: "14px", fontSize: "0.85rem", fontWeight: 600 },
  botonDescargarBoleta: { background: "#166534", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem" },

  bloqueSeguimiento: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px 14px", marginBottom: "14px" },
  filaLink: { display: "flex", gap: "8px", marginTop: "6px", flexWrap: "wrap" },
  inputLink: { flex: 1, minWidth: "180px", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.78rem", color: "#475569", background: "#fff" },
  botonCopiarLink: { background: "#1d4ed8", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600, whiteSpace: "nowrap" },

  bloqueGps: { marginBottom: "14px" },
  botonCompartirGps: { width: "100%", background: "#fffbeb", border: "1px solid #f59e0b", color: "#92400e", padding: "12px", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" },
  botonDetenerGps: { width: "100%", background: "#fee2e2", border: "1px solid #fca5a5", color: "#b91c1c", padding: "12px", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" },
  avisoCompartiendo: { fontSize: "0.75rem", color: "#92400e", textAlign: "center", marginTop: "6px" },

  botonesAccion: { display: "flex", flexDirection: "column", gap: "8px", marginTop: "16px" },
  botonAccionPrimario: { background: "#1d4ed8", color: "#fff", border: "none", padding: "12px", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.88rem" },
  botonCompletar: { background: "#166534", color: "#fff", border: "none", padding: "12px", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "0.88rem" },
  botonCancelar: { background: "transparent", border: "1px solid #fca5a5", color: "#b91c1c", padding: "10px", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem" },

  modalTabla: { background: "#fff", borderRadius: "12px", padding: "24px", width: "600px", maxWidth: "100%", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" },
  contenedorTablaModal: { overflowY: "auto", flex: 1 },
  tablaModal: { width: "100%", borderCollapse: "collapse" },
  thModal: { textAlign: "left", padding: "8px 10px", fontSize: "0.75rem", color: "#64748b", borderBottom: "2px solid #e2e8f0", background: "#f8fafc" },
  tdModal: { padding: "8px 10px", fontSize: "0.85rem", borderBottom: "1px solid #f1f5f9" },
  botonSeleccionarModal: { background: "#1d4ed8", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 },
};