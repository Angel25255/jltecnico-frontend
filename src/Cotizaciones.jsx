import { useEffect, useState } from "react";
import {
  listarClientes, listarProductos, crearCotizacion, listarCotizaciones,
  cambiarEstadoCotizacion, convertirCotizacionAVenta, descargarCotizacionPdf,
  consultarDocumento, crearCliente,
} from "./authApi";

const TASA_IGV = 0.18;

const COLOR_ESTADO = {
  Pendiente: { bg: "#fef3c7", texto: "#92400e" },
  Aprobada: { bg: "#dbeafe", texto: "#1d4ed8" },
  Facturada: { bg: "#dcfce7", texto: "#166534" },
  Anulada: { bg: "#fee2e2", texto: "#b91c1c" },
};

function IconoProducto({ tamano = 28 }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="1.6">
      <path d="M21 8l-9-5-9 5 9 5 9-5z" strokeLinejoin="round" />
      <path d="M3 8v8l9 5 9-5V8" strokeLinejoin="round" />
      <path d="M12 13v8" />
      <path d="M21 8L12 13 3 8" strokeLinejoin="round" />
    </svg>
  );
}

function IconoCliente({ tamano = 28 }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="1.6">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.3-4.2 4.2-6.5 8-6.5s6.7 2.3 8 6.5" strokeLinecap="round" />
    </svg>
  );
}

export default function Cotizaciones({ token }) {
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [productoAModal, setProductoAModal] = useState(false);
  const [clienteAModal, setClienteAModal] = useState(false);

  const [carrito, setCarrito] = useState([]);
  const [error, setError] = useState("");
  const [registrando, setRegistrando] = useState(false);
  const [cotizacionConfirmada, setCotizacionConfirmada] = useState(null);

  const [cotizaciones, setCotizaciones] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);

  async function cargarHistorial() {
    setCargandoHistorial(true);
    try {
      setCotizaciones(await listarCotizaciones(token, 30));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargandoHistorial(false);
    }
  }

  useEffect(() => { cargarHistorial(); }, []);

  function agregarAlCarrito(producto) {
    setCarrito((prev) => {
      const existente = prev.find((item) => item.productoId === producto.id);
      if (existente) {
        return prev.map((item) =>
          item.productoId === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [
        ...prev,
        { productoId: producto.id, nombre: producto.nombre, precioUnitario: producto.precioUnitario, cantidad: 1 },
      ];
    });
    setProductoAModal(false);
  }

  function cambiarCantidad(productoId, nuevaCantidad) {
    setCarrito((prev) =>
      prev.map((item) =>
        item.productoId === productoId ? { ...item, cantidad: Math.max(1, nuevaCantidad) } : item
      )
    );
  }

  function quitarDelCarrito(productoId) {
    setCarrito((prev) => prev.filter((item) => item.productoId !== productoId));
  }

  const totalConIgv = carrito.reduce((acc, item) => acc + item.precioUnitario * item.cantidad, 0);
  const subtotalSinIgv = totalConIgv / (1 + TASA_IGV);
  const igv = totalConIgv - subtotalSinIgv;
  const cantidadItems = carrito.reduce((acc, item) => acc + item.cantidad, 0);

  async function manejarRegistrarCotizacion() {
    setError("");
    if (!clienteSeleccionado) { setError("Selecciona un cliente antes de continuar."); return; }
    if (carrito.length === 0) { setError("Agrega al menos un producto."); return; }

    setRegistrando(true);
    try {
      const data = await crearCotizacion(token, {
        clienteId: clienteSeleccionado.id,
        items: carrito.map((item) => ({ productoId: item.productoId, cantidad: item.cantidad })),
      });
      setCotizacionConfirmada(data);
      setCarrito([]);
      setClienteSeleccionado(null);
      await cargarHistorial();
    } catch (err) {
      setError(err.message);
    } finally {
      setRegistrando(false);
    }
  }

  async function manejarCambiarEstado(cot, nuevoEstado) {
    const confirmaciones = {
      Aprobada: `¿Marcar la cotización #${cot.id} como Aprobada?`,
      Anulada: `¿Anular la cotización #${cot.id}?`,
    };
    if (!confirm(confirmaciones[nuevoEstado])) return;
    try {
      await cambiarEstadoCotizacion(token, cot.id, nuevoEstado);
      await cargarHistorial();
    } catch (err) {
      setError(err.message);
    }
  }

  async function manejarConvertirAVenta(cot) {
    if (!confirm(`¿Convertir la cotización #${cot.id} en una venta real? Esto descontará stock.`)) return;
    try {
      await convertirCotizacionAVenta(token, cot.id);
      await cargarHistorial();
    } catch (err) {
      setError(err.message);
    }
  }

  async function manejarDescargarPdf(id) {
    try {
      await descargarCotizacionPdf(token, id);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={estilos.contenedor} className="modulo-responsive">
      <h3 style={{ marginTop: 0 }}>Nueva cotización</h3>

      {error && <p style={estilos.error}>{error}</p>}

      <div style={estilos.gridPrincipal} className="grid-2col-responsive">
        <div style={estilos.columnaVenta}>

          <div style={estilos.tarjeta}>
            <h4 style={estilos.tituloTarjeta}>1. Cliente</h4>
            {clienteSeleccionado ? (
              <div style={estilos.itemSeleccionado}>
                <IconoCliente tamano={32} />
                <div style={{ flex: 1 }}>
                  <strong>{clienteSeleccionado.nombreORazonSocial}</strong>
                  <div style={estilos.textoSecundario}>{clienteSeleccionado.tipoDocumento} {clienteSeleccionado.numeroDocumento}</div>
                </div>
                <button onClick={() => setClienteSeleccionado(null)} style={estilos.botonCambiar}>Cambiar</button>
              </div>
            ) : (
              <button onClick={() => setClienteAModal(true)} style={estilos.botonAgregar}>
                <IconoCliente tamano={20} /> Buscar cliente
              </button>
            )}
          </div>

          <div style={estilos.tarjeta}>
            <div style={estilos.encabezadoConBoton}>
              <h4 style={estilos.tituloTarjeta}>2. Productos</h4>
              <button onClick={() => setProductoAModal(true)} style={estilos.botonAgregarChico}>
                + Agregar producto
              </button>
            </div>

            {carrito.length === 0 ? (
              <p style={estilos.textoSecundario}>Aún no agregaste productos.</p>
            ) : (
              <div style={estilos.listaCarrito}>
                {carrito.map((item) => (
                  <div key={item.productoId} style={estilos.filaCarrito}>
                    <IconoProducto tamano={30} />
                    <div style={{ flex: 1 }}>
                      <div style={estilos.nombreCarrito}>{item.nombre}</div>
                      <div style={estilos.textoSecundario}>S/ {item.precioUnitario.toFixed(2)} c/u</div>
                    </div>
                    <input
                      type="number" min="1"
                      value={item.cantidad}
                      onChange={(e) => cambiarCantidad(item.productoId, parseInt(e.target.value, 10) || 1)}
                      style={estilos.inputCantidad}
                    />
                    <div style={estilos.subtotalLinea}>S/ {(item.precioUnitario * item.cantidad).toFixed(2)}</div>
                    <button onClick={() => quitarDelCarrito(item.productoId)} style={estilos.botonQuitar}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={estilos.columnaResumen}>
          <div style={estilos.tarjetaResumen}>
            <div style={estilos.resumenEncabezado}>
              <h4 style={estilos.tituloResumen}>Resumen de cotización</h4>
              <span style={estilos.badgeItems}>{cantidadItems} {cantidadItems === 1 ? "item" : "items"}</span>
            </div>

            <div style={estilos.filaResumen}><span>Subtotal</span><span>S/ {subtotalSinIgv.toFixed(2)}</span></div>
            <div style={estilos.filaResumen}><span>IGV (18%)</span><span>S/ {igv.toFixed(2)}</span></div>

            <div style={estilos.divisorResumen} />

            <div style={estilos.filaResumenTotal}>
              <span>TOTAL COTIZADO</span>
              <span style={estilos.montoTotal}>S/ {totalConIgv.toFixed(2)}</span>
            </div>

            <p style={estilos.notaValidez}>Válida por 15 días desde su emisión.</p>

            <button
              onClick={manejarRegistrarCotizacion}
              disabled={registrando || carrito.length === 0 || !clienteSeleccionado}
              style={estilos.botonRegistrar}
            >
              {registrando ? "Generando..." : "📄 Generar cotización"}
            </button>
          </div>
        </div>
      </div>

      {/* ---------------- Historial ---------------- */}
      <div style={estilos.historial}>
        <h3>Cotizaciones recientes</h3>
        {cargandoHistorial ? (
          <p>Cargando...</p>
        ) : (
          <>
            {/* ---------------- Vista de TARJETAS - solo en celular ---------------- */}
            <div className="vista-tarjetas-movil">
              {cotizaciones.length === 0 && (
                <p style={estilos.tdVacioMovil}>Aún no hay cotizaciones registradas.</p>
              )}
              {cotizaciones.map((c) => {
                const color = COLOR_ESTADO[c.estado] || { bg: "#f1f5f9", texto: "#334155" };
                return (
                  <div key={c.id} style={estilos.tarjetaCot}>
                    <div style={estilos.tarjetaEncabezado}>
                      <div>
                        <strong style={estilos.tarjetaNombre}>Cotización #{c.id}</strong>
                        <div style={estilos.tarjetaSub}>{c.nombreCliente}</div>
                      </div>
                      <span style={{ ...estilos.badgeEstado, background: color.bg, color: color.texto }}>
                        {c.estado}
                      </span>
                    </div>
                    <div style={estilos.tarjetaFila}><span>Fecha</span><span>{new Date(c.fechaCotizacion).toLocaleDateString("es-PE")}</span></div>
                    <div style={estilos.tarjetaFila}><span>Válida hasta</span><span>{new Date(c.fechaValidez).toLocaleDateString("es-PE")}</span></div>
                    <div style={estilos.tarjetaFilaTotal}><span>Total</span><strong>S/ {c.total.toFixed(2)}</strong></div>

                    <div style={estilos.accionesFilaMovil}>
                      <button onClick={() => manejarDescargarPdf(c.id)} style={estilos.botonAccionMovil}>PDF</button>
                      {c.estado === "Pendiente" && (
                        <>
                          <button onClick={() => manejarCambiarEstado(c, "Aprobada")} style={estilos.botonAprobarMovil}>Aprobar</button>
                          <button onClick={() => manejarCambiarEstado(c, "Anulada")} style={estilos.botonAnularMovil}>Anular</button>
                        </>
                      )}
                      {c.estado === "Aprobada" && (
                        <>
                          <button onClick={() => manejarConvertirAVenta(c)} style={estilos.botonConvertirMovil}>Convertir en venta</button>
                          <button onClick={() => manejarCambiarEstado(c, "Anulada")} style={estilos.botonAnularMovil}>Anular</button>
                        </>
                      )}
                      {c.estado === "Facturada" && c.ventaId && (
                        <span style={estilos.textoSecundario}>→ Venta #{c.ventaId}</span>
                      )}
                    </div>
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
                    <th style={estilos.th}>Fecha</th>
                    <th style={estilos.th}>Cliente</th>
                    <th style={estilos.th}>Válida hasta</th>
                    <th style={estilos.th}>Total</th>
                    <th style={estilos.th}>Estado</th>
                    <th style={estilos.th}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cotizaciones.length === 0 && (
                    <tr><td colSpan={7} style={estilos.tdVacio}>Aún no hay cotizaciones registradas.</td></tr>
                  )}
                  {cotizaciones.map((c) => {
                    const color = COLOR_ESTADO[c.estado] || { bg: "#f1f5f9", texto: "#334155" };
                    return (
                      <tr key={c.id}>
                        <td style={estilos.td}>{c.id}</td>
                        <td style={estilos.td}>{new Date(c.fechaCotizacion).toLocaleDateString("es-PE")}</td>
                        <td style={estilos.td}>{c.nombreCliente}</td>
                        <td style={estilos.td}>{new Date(c.fechaValidez).toLocaleDateString("es-PE")}</td>
                        <td style={estilos.td}>S/ {c.total.toFixed(2)}</td>
                        <td style={estilos.td}>
                          <span style={{ ...estilos.badgeEstado, background: color.bg, color: color.texto }}>
                            {c.estado}
                          </span>
                        </td>
                        <td style={estilos.td}>
                          <div style={estilos.accionesFila}>
                            <button onClick={() => manejarDescargarPdf(c.id)} style={estilos.botonAccionChico}>PDF</button>
                            {c.estado === "Pendiente" && (
                              <>
                                <button onClick={() => manejarCambiarEstado(c, "Aprobada")} style={estilos.botonAprobar}>Aprobar</button>
                                <button onClick={() => manejarCambiarEstado(c, "Anulada")} style={estilos.botonAnular}>Anular</button>
                              </>
                            )}
                            {c.estado === "Aprobada" && (
                              <>
                                <button onClick={() => manejarConvertirAVenta(c)} style={estilos.botonConvertir}>Convertir en venta</button>
                                <button onClick={() => manejarCambiarEstado(c, "Anulada")} style={estilos.botonAnular}>Anular</button>
                              </>
                            )}
                            {c.estado === "Facturada" && c.ventaId && (
                              <span style={estilos.textoSecundario}>→ Venta #{c.ventaId}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ---------------- Modal: cotización generada ---------------- */}
      {cotizacionConfirmada && (
        <div style={estilos.overlay} onClick={() => setCotizacionConfirmada(null)}>
          <div style={estilos.modalConfirmacion} onClick={(e) => e.stopPropagation()}>
            <div style={estilos.encabezadoConfirmacion}>
              <div style={estilos.iconoConfirmacionGrande}>📄</div>
              <h2 style={estilos.tituloConfirmacionGrande}>¡Cotización generada!</h2>
              <div style={estilos.numeroVentaConfirmacion}>
                N° {String(cotizacionConfirmada.id).padStart(6, "0")} · Válida hasta {new Date(cotizacionConfirmada.fechaValidez).toLocaleDateString("es-PE")}
              </div>
            </div>

            <div style={estilos.detalleConfirmacion}>
              <div style={estilos.filaDetalleConfirmacion}><span>Cliente</span><strong>{cotizacionConfirmada.nombreCliente}</strong></div>
              <div style={estilos.listaProductosConfirmacion}>
                {cotizacionConfirmada.detalles.map((d, i) => (
                  <div key={i} style={estilos.filaProductoConfirmacion}>
                    <span>{d.cantidad}x {d.nombreProducto}</span>
                    <span>S/ {d.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={estilos.totalConfirmacionGrande}>
              <span>TOTAL COTIZADO</span>
              <span style={estilos.montoConfirmacionGrande}>S/ {cotizacionConfirmada.total.toFixed(2)}</span>
            </div>

            <button
              onClick={() => manejarDescargarPdf(cotizacionConfirmada.id)}
              style={estilos.botonDescargarPdfGrande}
            >
              ⬇️ Descargar PDF para el cliente
            </button>

            <button onClick={() => setCotizacionConfirmada(null)} style={estilos.botonNuevaVenta}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* ---------------- Modal: buscar/registrar cliente ---------------- */}
      {clienteAModal && (
        <ModalClienteCotizacion
          token={token}
          onCerrar={() => setClienteAModal(false)}
          onSeleccionar={(c) => {
            setClienteSeleccionado(c);
            setClienteAModal(false);
          }}
        />
      )}

      {/* ---------------- Modal: buscar producto ---------------- */}
      {productoAModal && (
        <ModalBusquedaTabla
          titulo="Agregar producto"
          placeholder="Escribe para filtrar por nombre o código..."
          onCerrar={() => setProductoAModal(false)}
          cargarTodos={async () => {
            const data = await listarProductos(token, "");
            return data.filter((p) => p.activo);
          }}
          filtrar={(p, t) =>
            p.nombre.toLowerCase().includes(t) || (p.codigo || "").toLowerCase().includes(t)
          }
          columnas={[
            { header: "Código", render: (p) => <code style={estilos.codigoModal}>{p.codigo || "—"}</code> },
            { header: "Producto", render: (p) => p.nombre },
            { header: "Categoría", render: (p) => p.nombreCategoria || "—" },
            { header: "Precio", render: (p) => `S/ ${p.precioUnitario.toFixed(2)}` },
          ]}
          textoBoton="Agregar"
          onSeleccionar={(p) => agregarAlCarrito(p)}
          mensajeVacio="No hay productos registrados todavía."
        />
      )}

      <style>{`
        @media (max-width: 900px) {
          .grid-2col-responsive {
            display: block !important;
          }
          .grid-2col-responsive > * {
            margin-bottom: 16px;
          }
        }
        .vista-tarjetas-movil { display: none; }
        @media (max-width: 640px) {
          .vista-tarjetas-movil { display: flex; flex-direction: column; gap: 12px; }
          .vista-tabla-escritorio { display: none; }
        }
      `}</style>
    </div>
  );
}

// Modal de cliente con búsqueda interna + RENIEC/SUNAT (igual que en Ventas)
function ModalClienteCotizacion({ token, onCerrar, onSeleccionar }) {
  const [texto, setTexto] = useState("");
  const [todos, setTodos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [buscandoExterno, setBuscandoExterno] = useState(false);
  const [resultadoExterno, setResultadoExterno] = useState(null);
  const [mensajeExterno, setMensajeExterno] = useState("");
  const [nombreEditable, setNombreEditable] = useState("");
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);

  useEffect(() => {
    let activo = true;
    listarClientes(token, "")
      .then((data) => { if (activo) setTodos(data.filter((c) => c.activo)); })
      .catch((err) => { if (activo) setError(err.message); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, []);

  const textoNormalizado = texto.trim();
  const soloDigitos = /^\d+$/.test(textoNormalizado);
  const esDniOruc = soloDigitos && (textoNormalizado.length === 8 || textoNormalizado.length === 11);

  const resultados = textoNormalizado
    ? todos.filter((c) =>
        c.nombreORazonSocial.toLowerCase().includes(textoNormalizado.toLowerCase()) ||
        c.numeroDocumento.includes(textoNormalizado)
      )
    : todos;

  const yaExisteEnSistema = resultados.some((c) => c.numeroDocumento === textoNormalizado);

  async function buscarEnReniec() {
    setBuscandoExterno(true);
    setMensajeExterno("");
    setResultadoExterno(null);
    const tipo = textoNormalizado.length === 8 ? "DNI" : "RUC";
    try {
      const resultado = await consultarDocumento(token, tipo, textoNormalizado);
      if (resultado.encontrado) {
        setResultadoExterno({ ...resultado, tipo });
        setNombreEditable(resultado.nombreORazonSocial || "");
      } else {
        setMensajeExterno(resultado.mensaje || "No se encontró. Puedes escribir el nombre manualmente.");
        setResultadoExterno({ tipo, nombreORazonSocial: "" });
        setNombreEditable("");
      }
    } catch {
      setMensajeExterno("No se pudo conectar al servicio de consulta.");
      setResultadoExterno({ tipo, nombreORazonSocial: "" });
    } finally {
      setBuscandoExterno(false);
    }
  }

  async function registrarYUsar() {
    if (!nombreEditable.trim()) return;
    setGuardandoNuevo(true);
    try {
      const nuevoCliente = await crearCliente(token, {
        tipoDocumento: resultadoExterno.tipo,
        numeroDocumento: textoNormalizado,
        nombreORazonSocial: nombreEditable,
        telefono: null,
        correo: null,
        direccion: resultadoExterno.direccion || null,
      });
      onSeleccionar(nuevoCliente);
    } catch (err) {
      setMensajeExterno(err.message);
    } finally {
      setGuardandoNuevo(false);
    }
  }

  return (
    <div style={estilos.overlay} onClick={onCerrar}>
      <div style={estilos.modalTabla} onClick={(e) => e.stopPropagation()}>
        <div style={estilos.modalEncabezado}>
          <h3 style={{ margin: 0 }}>Buscar cliente</h3>
          <button style={estilos.botonCerrarModal} onClick={onCerrar}>✕</button>
        </div>

        <input
          autoFocus
          value={texto}
          onChange={(e) => { setTexto(e.target.value); setResultadoExterno(null); setMensajeExterno(""); }}
          placeholder="Nombre, o DNI/RUC (funciona con clientes nuevos también)..."
          style={{ ...estilos.input, marginBottom: "14px" }}
        />

        <div style={estilos.contenedorTablaModal}>
          {cargando && <p style={estilos.textoSecundario}>Cargando...</p>}
          {error && <p style={estilos.error}>{error}</p>}

          {!cargando && resultados.length > 0 && (
            <table style={estilos.tablaModal}>
              <thead>
                <tr>
                  <th style={estilos.thModal}>Documento</th>
                  <th style={estilos.thModal}>Nombre / Razón Social</th>
                  <th style={estilos.thModal}>Teléfono</th>
                  <th style={estilos.thModal}></th>
                </tr>
              </thead>
              <tbody>
                {resultados.map((c) => (
                  <tr key={c.id}>
                    <td style={estilos.tdModal}>{c.tipoDocumento} {c.numeroDocumento}</td>
                    <td style={estilos.tdModal}>{c.nombreORazonSocial}</td>
                    <td style={estilos.tdModal}>{c.telefono || "—"}</td>
                    <td style={estilos.tdModal}>
                      <button onClick={() => onSeleccionar(c)} style={estilos.botonSeleccionarModal}>Seleccionar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!cargando && textoNormalizado && resultados.length === 0 && !esDniOruc && (
            <p style={estilos.textoSecundario}>No hay resultados. Prueba con el DNI/RUC completo (8 u 11 dígitos).</p>
          )}

          {esDniOruc && !yaExisteEnSistema && (
            <div style={estilos.panelExterno}>
              {!resultadoExterno && (
                <button onClick={buscarEnReniec} disabled={buscandoExterno} style={estilos.botonBuscarExterno}>
                  {buscandoExterno ? "Consultando..." : `🔎 Este documento no está registrado — buscar en ${textoNormalizado.length === 8 ? "RENIEC" : "SUNAT"}`}
                </button>
              )}

              {mensajeExterno && <p style={estilos.mensajeExterno}>{mensajeExterno}</p>}

              {resultadoExterno && (
                <div style={estilos.tarjetaExterno}>
                  <label style={estilos.labelExterno}>
                    {resultadoExterno.tipo === "RUC" ? "Razón social" : "Nombre completo"}
                  </label>
                  <input
                    value={nombreEditable}
                    onChange={(e) => setNombreEditable(e.target.value)}
                    style={estilos.input}
                    placeholder="Escribe el nombre si no se autocompletó"
                  />
                  <button
                    onClick={registrarYUsar}
                    disabled={guardandoNuevo || !nombreEditable.trim()}
                    style={estilos.botonRegistrarUsar}
                  >
                    {guardandoNuevo ? "Guardando..." : "✓ Registrar y usar este cliente"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModalBusquedaTabla({ titulo, placeholder, onCerrar, cargarTodos, filtrar, columnas, textoBoton, onSeleccionar, deshabilitarItem, mensajeVacio }) {
  const [texto, setTexto] = useState("");
  const [todos, setTodos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;
    setCargando(true);
    cargarTodos()
      .then((data) => { if (activo) setTodos(data); })
      .catch((err) => { if (activo) setError(err.message); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, []);

  const textoNormalizado = texto.trim().toLowerCase();
  const resultados = textoNormalizado ? todos.filter((item) => filtrar(item, textoNormalizado)) : todos;

  return (
    <div style={estilos.overlay} onClick={onCerrar}>
      <div style={estilos.modalTabla} onClick={(e) => e.stopPropagation()}>
        <div style={estilos.modalEncabezado}>
          <h3 style={{ margin: 0 }}>{titulo}</h3>
          <button style={estilos.botonCerrarModal} onClick={onCerrar}>✕</button>
        </div>

        <input
          autoFocus
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={placeholder}
          style={{ ...estilos.input, marginBottom: "14px" }}
        />

        <div style={estilos.contenedorTablaModal}>
          {cargando && <p style={estilos.textoSecundario}>Cargando...</p>}
          {error && <p style={estilos.error}>{error}</p>}
          {!cargando && !error && resultados.length === 0 && (
            <p style={estilos.textoSecundario}>{todos.length === 0 ? mensajeVacio : "No hay resultados para esa búsqueda."}</p>
          )}
          {!cargando && resultados.length > 0 && (
            <table style={estilos.tablaModal}>
              <thead>
                <tr>
                  {columnas.map((col) => <th key={col.header} style={estilos.thModal}>{col.header}</th>)}
                  <th style={estilos.thModal}></th>
                </tr>
              </thead>
              <tbody>
                {resultados.map((item) => {
                  const deshabilitado = deshabilitarItem ? deshabilitarItem(item) : false;
                  return (
                    <tr key={item.id} style={{ opacity: deshabilitado ? 0.45 : 1 }}>
                      {columnas.map((col) => <td key={col.header} style={estilos.tdModal}>{col.render(item)}</td>)}
                      <td style={estilos.tdModal}>
                        <button
                          onClick={() => !deshabilitado && onSeleccionar(item)}
                          disabled={deshabilitado}
                          style={estilos.botonSeleccionarModal}
                        >
                          {textoBoton}
                        </button>
                      </td>
                    </tr>
                  );
                })}
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
  error: { color: "#dc2626", fontSize: "0.85rem", marginBottom: "12px" },
  gridPrincipal: { display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px", alignItems: "start" },
  columnaVenta: { display: "flex", flexDirection: "column", gap: "16px" },
  columnaResumen: { position: "sticky", top: "20px", display: "flex", flexDirection: "column", gap: "16px" },
  tarjeta: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" },
  tituloTarjeta: { margin: 0, fontSize: "0.9rem", color: "#1e293b" },
  encabezadoConBoton: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" },
  textoSecundario: { color: "#64748b", fontSize: "0.78rem" },

  botonAgregar: {
    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
    background: "#eff6ff", border: "1px dashed #93c5fd", color: "#1d4ed8",
    padding: "14px", borderRadius: "8px", cursor: "pointer", fontSize: "0.88rem", fontWeight: 600,
  },
  botonAgregarChico: {
    background: "#eff6ff", border: "1px solid #93c5fd", color: "#1d4ed8",
    padding: "7px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600,
  },
  itemSeleccionado: { display: "flex", alignItems: "center", gap: "12px", background: "#eff6ff", padding: "12px", borderRadius: "8px" },
  botonCambiar: { background: "transparent", border: "1px solid #93c5fd", color: "#1d4ed8", padding: "5px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem" },

  listaCarrito: { display: "flex", flexDirection: "column", gap: "8px" },
  filaCarrito: { display: "flex", alignItems: "center", gap: "12px", padding: "10px", background: "#f8fafc", borderRadius: "8px" },
  nombreCarrito: { fontSize: "0.87rem", fontWeight: 600, color: "#1e293b" },
  inputCantidad: { width: "55px", padding: "6px", borderRadius: "6px", border: "1px solid #cbd5e1", textAlign: "center" },
  subtotalLinea: { fontWeight: 600, fontSize: "0.87rem", minWidth: "70px", textAlign: "right" },
  botonQuitar: { background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: "6px", width: "26px", height: "26px", cursor: "pointer" },

  tarjetaResumen: { background: "#0f172a", borderRadius: "14px", padding: "22px", color: "#fff", boxShadow: "0 10px 30px rgba(15,23,42,0.25)" },
  resumenEncabezado: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" },
  tituloResumen: { margin: 0, fontSize: "1rem", color: "#fff" },
  badgeItems: { background: "#1e293b", color: "#f59e0b", fontSize: "0.72rem", padding: "3px 10px", borderRadius: "999px", fontWeight: 600 },
  filaResumen: { display: "flex", justifyContent: "space-between", fontSize: "0.9rem", color: "#94a3b8", padding: "6px 0" },
  divisorResumen: { borderTop: "1px solid #1e293b", margin: "10px 0" },
  filaResumenTotal: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" },
  montoTotal: { fontSize: "1.8rem", fontWeight: 800, color: "#f59e0b" },
  notaValidez: { fontSize: "0.72rem", color: "#64748b", marginBottom: "14px" },
  botonRegistrar: { width: "100%", background: "#f59e0b", color: "#0f172a", border: "none", padding: "14px", borderRadius: "10px", cursor: "pointer", fontWeight: 700, fontSize: "0.95rem" },

  historial: { marginTop: "30px" },

  // ---- Tarjetas del historial (celular) ----
  tdVacioMovil: { padding: "30px", textAlign: "center", color: "#94a3b8" },
  tarjetaCot: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px" },
  tarjetaEncabezado: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px", gap: "8px" },
  tarjetaNombre: { fontSize: "0.92rem", color: "#1e293b" },
  tarjetaSub: { fontSize: "0.78rem", color: "#64748b", marginTop: "2px" },
  tarjetaFila: { display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "#475569", padding: "4px 0", borderBottom: "1px solid #f8fafc" },
  tarjetaFilaTotal: { display: "flex", justifyContent: "space-between", fontSize: "0.9rem", color: "#1e293b", padding: "8px 0 4px 0" },
  accionesFilaMovil: { display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", marginTop: "10px" },
  botonAccionMovil: { background: "#eff6ff", color: "#1d4ed8", border: "none", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem", flex: 1 },
  botonAprobarMovil: { background: "#dbeafe", color: "#1d4ed8", border: "none", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem", flex: 1 },
  botonAnularMovil: { background: "#fee2e2", color: "#b91c1c", border: "none", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem", flex: 1 },
  botonConvertirMovil: { background: "#166534", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600, flex: 1, minWidth: "140px" },

  // ---- Tabla del historial (escritorio) ----
  tabla: { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "10px", overflow: "hidden", minWidth: "820px" },
  th: { textAlign: "left", padding: "10px", fontSize: "0.78rem", color: "#64748b", borderBottom: "2px solid #e2e8f0", background: "#f8fafc" },
  td: { padding: "10px", fontSize: "0.85rem", borderBottom: "1px solid #f1f5f9" },
  tdVacio: { padding: "30px", textAlign: "center", color: "#94a3b8" },
  badgeEstado: { padding: "3px 10px", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 600 },
  accionesFila: { display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" },
  botonAccionChico: { background: "#eff6ff", color: "#1d4ed8", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem" },
  botonAprobar: { background: "#dbeafe", color: "#1d4ed8", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem" },
  botonAnular: { background: "#fee2e2", color: "#b91c1c", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem" },
  botonConvertir: { background: "#166534", color: "#fff", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 },

  // Modal confirmación
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px" },
  modalConfirmacion: { background: "#fff", borderRadius: "16px", padding: "28px", width: "440px", maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.35)" },
  encabezadoConfirmacion: { textAlign: "center", marginBottom: "20px" },
  iconoConfirmacionGrande: { width: "60px", height: "60px", lineHeight: "60px", borderRadius: "50%", background: "#dbeafe", fontSize: "1.8rem", margin: "0 auto 12px auto" },
  tituloConfirmacionGrande: { margin: 0, fontSize: "1.25rem", color: "#1e293b" },
  numeroVentaConfirmacion: { color: "#64748b", fontSize: "0.85rem", marginTop: "4px" },
  detalleConfirmacion: { background: "#f8fafc", borderRadius: "10px", padding: "14px 16px", marginBottom: "16px" },
  filaDetalleConfirmacion: { display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#475569", padding: "4px 0" },
  listaProductosConfirmacion: { marginTop: "10px", paddingTop: "10px", borderTop: "1px dashed #cbd5e1", display: "flex", flexDirection: "column", gap: "4px" },
  filaProductoConfirmacion: { display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "#334155" },
  totalConfirmacionGrande: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0f172a", borderRadius: "10px", padding: "14px 18px", marginBottom: "14px", color: "#fff", fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" },
  montoConfirmacionGrande: { fontSize: "1.5rem", fontWeight: 800, color: "#f59e0b", textTransform: "none", letterSpacing: 0 },
  botonDescargarPdfGrande: { width: "100%", background: "#1d4ed8", color: "#fff", border: "none", padding: "12px", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.88rem", marginBottom: "10px" },
  botonNuevaVenta: { width: "100%", background: "transparent", border: "1px solid #cbd5e1", color: "#334155", padding: "11px", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 },

  // Modal genérico de búsqueda
  modalTabla: { background: "#fff", borderRadius: "12px", padding: "24px", width: "720px", maxWidth: "94vw", maxHeight: "82vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" },
  modalEncabezado: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  botonCerrarModal: { background: "transparent", border: "none", fontSize: "1.1rem", cursor: "pointer", color: "#64748b" },
  contenedorTablaModal: { overflowY: "auto", flex: 1 },
  tablaModal: { width: "100%", borderCollapse: "collapse" },
  thModal: { textAlign: "left", padding: "8px 10px", fontSize: "0.75rem", color: "#64748b", borderBottom: "2px solid #e2e8f0", background: "#f8fafc", position: "sticky", top: 0 },
  tdModal: { padding: "8px 10px", fontSize: "0.85rem", borderBottom: "1px solid #f1f5f9" },
  botonSeleccionarModal: { background: "#1d4ed8", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600, whiteSpace: "nowrap" },
  codigoModal: { fontFamily: "monospace", fontSize: "0.78rem", color: "#64748b" },
  input: { width: "100%", padding: "9px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.95rem", boxSizing: "border-box" },

  panelExterno: { marginTop: "14px", paddingTop: "14px", borderTop: "1px dashed #e2e8f0" },
  botonBuscarExterno: { width: "100%", background: "#fffbeb", border: "1px dashed #f59e0b", color: "#92400e", padding: "12px", borderRadius: "8px", cursor: "pointer", fontSize: "0.83rem", fontWeight: 600 },
  mensajeExterno: { fontSize: "0.8rem", color: "#92400e", marginTop: "8px" },
  tarjetaExterno: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px", marginTop: "10px" },
  labelExterno: { display: "block", fontSize: "0.78rem", color: "#334155", marginBottom: "5px", fontWeight: 600 },
  botonRegistrarUsar: { width: "100%", marginTop: "10px", background: "#166534", color: "#fff", border: "none", padding: "10px", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" },
};