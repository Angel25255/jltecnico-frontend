import { useEffect, useState } from "react";
import {
  listarClientes, listarProductos, crearVenta, listarVentas, anularVenta,
  descargarBoletaPdf, consultarDocumento, crearCliente,
} from "./authApi";

const TASA_IGV = 0.18;

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

export default function Ventas({ token }) {
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [productoAModal, setProductoAModal] = useState(false);
  const [clienteAModal, setClienteAModal] = useState(false);

  const [carrito, setCarrito] = useState([]);
  const [error, setError] = useState("");
  const [registrando, setRegistrando] = useState(false);
  const [ventaConfirmada, setVentaConfirmada] = useState(null);

  const [requiereOrdenServicio, setRequiereOrdenServicio] = useState(false);
  const [direccionInstalacion, setDireccionInstalacion] = useState("");
  const [descripcionServicio, setDescripcionServicio] = useState("");

  const [ventas, setVentas] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);

  async function cargarHistorial() {
    setCargandoHistorial(true);
    try {
      setVentas(await listarVentas(token, 30));
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
          item.productoId === producto.id && item.cantidad < item.stockDisponible
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          productoId: producto.id,
          nombre: producto.nombre,
          precioUnitario: producto.precioUnitario,
          stockDisponible: producto.stock,
          cantidad: 1,
        },
      ];
    });
    setProductoAModal(false);
  }

  function cambiarCantidad(productoId, nuevaCantidad) {
    setCarrito((prev) =>
      prev.map((item) => {
        if (item.productoId !== productoId) return item;
        const cantidad = Math.max(1, Math.min(nuevaCantidad, item.stockDisponible));
        return { ...item, cantidad };
      })
    );
  }

  function quitarDelCarrito(productoId) {
    setCarrito((prev) => prev.filter((item) => item.productoId !== productoId));
  }

  const totalConIgv = carrito.reduce((acc, item) => acc + item.precioUnitario * item.cantidad, 0);
  const subtotalSinIgv = totalConIgv / (1 + TASA_IGV);
  const igv = totalConIgv - subtotalSinIgv;
  const cantidadItems = carrito.reduce((acc, item) => acc + item.cantidad, 0);

  async function manejarRegistrarVenta() {
    setError("");
    if (!clienteSeleccionado) { setError("Selecciona un cliente antes de continuar."); return; }
    if (carrito.length === 0) { setError("Agrega al menos un producto."); return; }
    if (requiereOrdenServicio && !direccionInstalacion.trim()) {
      setError("Escribe la dirección de instalación para la orden de servicio.");
      return;
    }

    setRegistrando(true);
    try {
      const data = await crearVenta(token, {
        clienteId: clienteSeleccionado.id,
        items: carrito.map((item) => ({ productoId: item.productoId, cantidad: item.cantidad })),
        requiereOrdenServicio,
        direccionInstalacion,
        descripcionServicio,
      });
      setVentaConfirmada(data);
      setCarrito([]);
      setClienteSeleccionado(null);
      setRequiereOrdenServicio(false);
      setDireccionInstalacion("");
      setDescripcionServicio("");
      await cargarHistorial();
    } catch (err) {
      setError(err.message);
    } finally {
      setRegistrando(false);
    }
  }

  async function manejarAnular(venta) {
    if (!confirm(`¿Anular la venta #${venta.id}? Esto devolverá el stock de los productos.`)) return;
    try {
      await anularVenta(token, venta.id);
      await cargarHistorial();
    } catch (err) {
      setError(err.message);
    }
  }

  async function manejarDescargarPdf(ventaId) {
    try {
      await descargarBoletaPdf(token, ventaId);
    } catch (err) {
      setError(err.message);
    }
  }

  function manejarImprimir(venta) {
    const ventana = window.open("", "_blank", "width=420,height=650");
    const filasProductos = venta.detalles.map((d) => `
      <tr>
        <td style="padding:4px 0;">${d.nombreProducto}</td>
        <td style="padding:4px 0;text-align:center;">${d.cantidad}</td>
        <td style="padding:4px 0;text-align:right;">S/ ${d.precioUnitario.toFixed(2)}</td>
        <td style="padding:4px 0;text-align:right;">S/ ${d.subtotal.toFixed(2)}</td>
      </tr>
    `).join("");

    ventana.document.write(`
      <html>
        <head>
          <title>Boleta #${String(venta.id).padStart(6, "0")}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 13px; padding: 20px; color: #111; }
            h2 { margin-bottom: 2px; }
            .muted { color: #555; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th { text-align: left; border-bottom: 1px solid #333; padding-bottom: 4px; font-size: 11px; }
            .totales { margin-top: 14px; width: 100%; }
            .totales td { padding: 2px 0; }
            .total-final { font-weight: bold; font-size: 15px; border-top: 1px solid #333; }
          </style>
        </head>
        <body>
          <h2>JL Técnico EIRL</h2>
          <div class="muted">Boleta de venta N° ${String(venta.id).padStart(6, "0")}</div>
          <hr />
          <div><strong>Cliente:</strong> ${venta.nombreCliente}</div>
          <div><strong>Vendedor:</strong> ${venta.nombreVendedor}</div>
          <div><strong>Fecha:</strong> ${new Date(venta.fechaVenta).toLocaleString("es-PE")}</div>
          <table>
            <thead>
              <tr><th>Producto</th><th style="text-align:center;">Cant.</th><th style="text-align:right;">P.Unit</th><th style="text-align:right;">Subt.</th></tr>
            </thead>
            <tbody>${filasProductos}</tbody>
          </table>
          <table class="totales">
            <tr><td>Subtotal</td><td style="text-align:right;">S/ ${venta.subTotal.toFixed(2)}</td></tr>
            <tr><td>IGV (18%)</td><td style="text-align:right;">S/ ${venta.igv.toFixed(2)}</td></tr>
            <tr class="total-final"><td>TOTAL</td><td style="text-align:right;">S/ ${venta.total.toFixed(2)}</td></tr>
          </table>
          <p class="muted" style="text-align:center;margin-top:20px;">Gracias por su compra</p>
        </body>
      </html>
    `);
    ventana.document.close();
    ventana.focus();
    ventana.print();
  }

  return (
    <div style={estilos.contenedor} className="modulo-responsive">
      <h3 style={{ marginTop: 0 }}>Nueva venta</h3>

      {error && <p style={estilos.error}>{error}</p>}

      <div style={estilos.gridPrincipal} className="grid-2col-responsive">
        <div style={estilos.columnaVenta}>

          {/* Cliente */}
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

          {/* Productos / Carrito */}
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
                      type="number" min="1" max={item.stockDisponible}
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

          <div style={estilos.tarjeta}>
            <label style={estilos.checkboxFila}>
              <input
                type="checkbox"
                checked={requiereOrdenServicio}
                onChange={(e) => setRequiereOrdenServicio(e.target.checked)}
              />
              <span>🔧 Estos productos requieren instalación (crear Orden de Servicio)</span>
            </label>

            {requiereOrdenServicio && (
              <div style={{ marginTop: "10px" }}>
                <label style={estilos.label}>Dirección de instalación</label>
                <input
                  value={direccionInstalacion}
                  onChange={(e) => setDireccionInstalacion(e.target.value)}
                  style={estilos.input}
                  placeholder="Ej. Jr. Los Álamos 123, Huancayo"
                />
                <label style={estilos.label}>Descripción del trabajo (opcional)</label>
                <textarea
                  value={descripcionServicio}
                  onChange={(e) => setDescripcionServicio(e.target.value)}
                  style={{ ...estilos.input, minHeight: "60px", resize: "vertical" }}
                  placeholder="Ej. Instalación de tomacorrientes en sala"
                />
              </div>
            )}
          </div>
        </div>

        {/* ---------------- Resumen ---------------- */}
        <div style={estilos.columnaResumen}>
          <div style={estilos.tarjetaResumen}>
            <div style={estilos.resumenEncabezado}>
              <h4 style={estilos.tituloResumen}>Resumen de venta</h4>
              <span style={estilos.badgeItems}>{cantidadItems} {cantidadItems === 1 ? "item" : "items"}</span>
            </div>

            <div style={estilos.filaResumen}><span>Subtotal</span><span>S/ {subtotalSinIgv.toFixed(2)}</span></div>
            <div style={estilos.filaResumen}><span>IGV (18%)</span><span>S/ {igv.toFixed(2)}</span></div>

            <div style={estilos.divisorResumen} />

            <div style={estilos.filaResumenTotal}>
              <span>TOTAL A PAGAR</span>
              <span style={estilos.montoTotal}>S/ {totalConIgv.toFixed(2)}</span>
            </div>

            <button
              onClick={manejarRegistrarVenta}
              disabled={registrando || carrito.length === 0 || !clienteSeleccionado}
              style={estilos.botonRegistrar}
            >
              {registrando ? "Registrando..." : "✓ Registrar venta"}
            </button>
          </div>

        </div>
      </div>

      {/* ---------------- Historial ---------------- */}
      <div style={estilos.historial}>
        <h3>Ventas recientes</h3>
        {cargandoHistorial ? (
          <p>Cargando...</p>
        ) : (
          <>
            {/* ---------------- Vista de TARJETAS - solo en celular ---------------- */}
            <div className="vista-tarjetas-movil">
              {ventas.length === 0 && (
                <p style={estilos.tdVacioMovil}>Aún no hay ventas registradas.</p>
              )}
              {ventas.map((v) => (
                <div key={v.id} style={estilos.tarjetaVenta}>
                  <div style={estilos.tarjetaEncabezado}>
                    <div>
                      <strong style={estilos.tarjetaNombre}>Venta #{v.id}</strong>
                      <div style={estilos.tarjetaSub}>{v.nombreCliente}</div>
                    </div>
                    <span style={v.estado === "Anulada" ? estilos.badgeAnulada : estilos.badgeCompletada}>
                      {v.estado}
                    </span>
                  </div>
                  <div style={estilos.tarjetaFila}><span>Fecha</span><span>{new Date(v.fechaVenta).toLocaleString("es-PE")}</span></div>
                  <div style={estilos.tarjetaFila}><span>Vendedor</span><span>{v.nombreVendedor}</span></div>
                  <div style={estilos.tarjetaFilaTotal}><span>Total</span><strong>S/ {v.total.toFixed(2)}</strong></div>
                  <div style={estilos.tarjetaBotones}>
                    <button onClick={() => manejarImprimir(v)} style={estilos.botonPdfMovil}>🖨️ Imprimir</button>
                    <button onClick={() => manejarDescargarPdf(v.id)} style={estilos.botonPdfMovil}>⬇️ PDF</button>
                    {v.estado !== "Anulada" && (
                      <button onClick={() => manejarAnular(v)} style={estilos.botonAnularMovil}>Anular</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* ---------------- Vista de TABLA - solo en pantallas grandes ---------------- */}
            <div style={{ overflowX: "auto" }} className="vista-tabla-escritorio">
              <table style={estilos.tabla}>
                <thead>
                  <tr>
                    <th style={estilos.th}>#</th>
                    <th style={estilos.th}>Fecha</th>
                    <th style={estilos.th}>Cliente</th>
                    <th style={estilos.th}>Vendedor</th>
                    <th style={estilos.th}>Total</th>
                    <th style={estilos.th}>Estado</th>
                    <th style={estilos.th}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.length === 0 && (
                    <tr><td colSpan={7} style={estilos.tdVacio}>Aún no hay ventas registradas.</td></tr>
                  )}
                  {ventas.map((v) => (
                    <tr key={v.id}>
                      <td style={estilos.td}>{v.id}</td>
                      <td style={estilos.td}>{new Date(v.fechaVenta).toLocaleString("es-PE")}</td>
                      <td style={estilos.td}>{v.nombreCliente}</td>
                      <td style={estilos.td}>{v.nombreVendedor}</td>
                      <td style={estilos.td}>S/ {v.total.toFixed(2)}</td>
                      <td style={estilos.td}>
                        <span style={v.estado === "Anulada" ? estilos.badgeAnulada : estilos.badgeCompletada}>
                          {v.estado}
                        </span>
                      </td>
                      <td style={estilos.td}>
                        <button onClick={() => manejarImprimir(v)} style={estilos.botonPdf}>Imprimir</button>
                        <button onClick={() => manejarDescargarPdf(v.id)} style={estilos.botonPdf}>PDF</button>
                        {v.estado !== "Anulada" && (
                          <button onClick={() => manejarAnular(v)} style={estilos.botonAnular}>Anular</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ---------------- Modal: venta registrada con éxito ---------------- */}
      {ventaConfirmada && (
        <ModalVentaConfirmada
          venta={ventaConfirmada}
          onImprimir={() => manejarImprimir(ventaConfirmada)}
          onDescargarPdf={() => manejarDescargarPdf(ventaConfirmada.id)}
          onCerrar={() => setVentaConfirmada(null)}
        />
      )}

      {/* ---------------- Modal: buscar/registrar cliente ---------------- */}
      {clienteAModal && (
        <ModalClienteVenta
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
            p.nombre.toLowerCase().includes(t) ||
            (p.codigo || "").toLowerCase().includes(t)
          }
          columnas={[
            { header: "Código", render: (p) => <code style={estilos.codigoModal}>{p.codigo || "—"}</code> },
            { header: "Producto", render: (p) => p.nombre },
            { header: "Categoría", render: (p) => p.nombreCategoria || "—" },
            { header: "Unidad", render: (p) => p.unidadMedida },
            { header: "Precio", render: (p) => `S/ ${p.precioUnitario.toFixed(2)}` },
            { header: "Stock", render: (p) => <span style={p.stock <= 5 ? estilos.stockBajoModal : undefined}>{p.stock}</span> },
          ]}
          textoBoton="Agregar"
          deshabilitarItem={(p) => p.stock === 0}
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

// -----------------------------------------------------------------
// Modal especial de Cliente para Ventas: busca en los clientes ya
// guardados en el sistema, y si escribes un DNI/RUC que no está
// registrado, permite consultarlo en RENIEC/SUNAT y registrarlo
// al vuelo sin salir de la pantalla de venta.
// -----------------------------------------------------------------
function ModalClienteVenta({ token, onCerrar, onSeleccionar }) {
  const [texto, setTexto] = useState("");
  const [todos, setTodos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [buscandoExterno, setBuscandoExterno] = useState(false);
  const [resultadoExterno, setResultadoExterno] = useState(null); // { nombreORazonSocial, direccion }
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
                      <button onClick={() => onSeleccionar(c)} style={estilos.botonSeleccionarModal}>
                        Seleccionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!cargando && textoNormalizado && resultados.length === 0 && !esDniOruc && (
            <p style={estilos.textoSecundario}>No hay resultados. Prueba con el DNI/RUC completo (8 u 11 dígitos).</p>
          )}

          {/* Búsqueda externa RENIEC/SUNAT cuando el documento no está registrado */}
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

// Modal de confirmación tras registrar la venta: muestra un mini
// resumen tipo boleta y las acciones inmediatas de imprimir/descargar.
function ModalVentaConfirmada({ venta, onImprimir, onDescargarPdf, onCerrar }) {
  return (
    <div style={estilos.overlay} onClick={onCerrar}>
      <div style={estilos.modalConfirmacion} onClick={(e) => e.stopPropagation()}>
        <div style={estilos.encabezadoConfirmacion}>
          <div style={estilos.iconoConfirmacionGrande}>✓</div>
          <h2 style={estilos.tituloConfirmacionGrande}>¡Venta registrada!</h2>
          <div style={estilos.numeroVentaConfirmacion}>
            Boleta N° {String(venta.id).padStart(6, "0")}
          </div>
        </div>

        <div style={estilos.detalleConfirmacion}>
          <div style={estilos.filaDetalleConfirmacion}><span>Cliente</span><strong>{venta.nombreCliente}</strong></div>
          <div style={estilos.filaDetalleConfirmacion}><span>Fecha</span><strong>{new Date(venta.fechaVenta).toLocaleString("es-PE")}</strong></div>

          <div style={estilos.listaProductosConfirmacion}>
            {venta.detalles.map((d, i) => (
              <div key={i} style={estilos.filaProductoConfirmacion}>
                <span>{d.cantidad}x {d.nombreProducto}</span>
                <span>S/ {d.subtotal.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div style={estilos.divisorResumen} />
          <div style={estilos.filaDetalleConfirmacion}><span>Subtotal</span><span>S/ {venta.subTotal.toFixed(2)}</span></div>
          <div style={estilos.filaDetalleConfirmacion}><span>IGV (18%)</span><span>S/ {venta.igv.toFixed(2)}</span></div>
        </div>

        <div style={estilos.totalConfirmacionGrande}>
          <span>TOTAL PAGADO</span>
          <span style={estilos.montoConfirmacionGrande}>S/ {venta.total.toFixed(2)}</span>
        </div>

        {venta.ordenServicioId && (
          <div style={estilos.avisoOrdenCreada}>
            🔧 Se creó la Orden de Servicio #{venta.ordenServicioId} — búscala en el módulo de Órdenes de Servicio para asignar técnico.
          </div>
        )}

        <div style={estilos.botonesConfirmacion}>
          <button onClick={onImprimir} style={estilos.botonImprimir}>🖨️ Imprimir</button>
          <button onClick={onDescargarPdf} style={estilos.botonDescargarPdf}>⬇️ Descargar PDF</button>
        </div>

        <button onClick={onCerrar} style={estilos.botonNuevaVenta}>
          Iniciar nueva venta
        </button>
      </div>
    </div>
  );
}

// Componente genérico de modal de búsqueda con resultados en TABLA
// (usado para Productos). Carga todos los registros y filtra en vivo.
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
  const resultados = textoNormalizado
    ? todos.filter((item) => filtrar(item, textoNormalizado))
    : todos;

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
                  {columnas.map((col) => (
                    <th key={col.header} style={estilos.thModal}>{col.header}</th>
                  ))}
                  <th style={estilos.thModal}></th>
                </tr>
              </thead>
              <tbody>
                {resultados.map((item) => {
                  const deshabilitado = deshabilitarItem ? deshabilitarItem(item) : false;
                  return (
                    <tr key={item.id} style={{ opacity: deshabilitado ? 0.45 : 1 }}>
                      {columnas.map((col) => (
                        <td key={col.header} style={estilos.tdModal}>{col.render(item)}</td>
                      ))}
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
  itemSeleccionado: {
    display: "flex", alignItems: "center", gap: "12px",
    background: "#eff6ff", padding: "12px", borderRadius: "8px",
  },
  botonCambiar: { background: "transparent", border: "1px solid #93c5fd", color: "#1d4ed8", padding: "5px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem" },

  listaCarrito: { display: "flex", flexDirection: "column", gap: "8px" },
  filaCarrito: {
    display: "flex", alignItems: "center", gap: "12px",
    padding: "10px", background: "#f8fafc", borderRadius: "8px",
  },
  nombreCarrito: { fontSize: "0.87rem", fontWeight: 600, color: "#1e293b" },
  inputCantidad: { width: "55px", padding: "6px", borderRadius: "6px", border: "1px solid #cbd5e1", textAlign: "center" },
  subtotalLinea: { fontWeight: 600, fontSize: "0.87rem", minWidth: "70px", textAlign: "right" },
  botonQuitar: { background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: "6px", width: "26px", height: "26px", cursor: "pointer" },

  // ---- Resumen (rediseñado, más grande y "premium") ----
  tarjetaResumen: { background: "#0f172a", borderRadius: "14px", padding: "22px", color: "#fff", boxShadow: "0 10px 30px rgba(15,23,42,0.25)" },
  resumenEncabezado: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" },
  tituloResumen: { margin: 0, fontSize: "1rem", color: "#fff" },
  badgeItems: { background: "#1e293b", color: "#f59e0b", fontSize: "0.72rem", padding: "3px 10px", borderRadius: "999px", fontWeight: 600 },
  filaResumen: { display: "flex", justifyContent: "space-between", fontSize: "0.9rem", color: "#94a3b8", padding: "6px 0" },
  divisorResumen: { borderTop: "1px solid #1e293b", margin: "10px 0" },
  filaResumenTotal: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "18px" },
  montoTotal: { fontSize: "1.8rem", fontWeight: 800, color: "#f59e0b" },
  botonRegistrar: { width: "100%", background: "#f59e0b", color: "#0f172a", border: "none", padding: "14px", borderRadius: "10px", cursor: "pointer", fontWeight: 700, fontSize: "0.95rem" },

  // ---- Modal de confirmación de venta (grande, tipo boleta) ----
  modalConfirmacion: {
    background: "#fff", borderRadius: "16px", padding: "28px", width: "440px", maxWidth: "92vw",
    maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.35)",
  },
  encabezadoConfirmacion: { textAlign: "center", marginBottom: "20px" },
  iconoConfirmacionGrande: {
    width: "60px", height: "60px", lineHeight: "60px", borderRadius: "50%",
    background: "#dcfce7", color: "#166534", fontSize: "1.8rem", fontWeight: 700,
    margin: "0 auto 12px auto",
  },
  tituloConfirmacionGrande: { margin: 0, fontSize: "1.25rem", color: "#1e293b" },
  numeroVentaConfirmacion: { color: "#64748b", fontSize: "0.85rem", marginTop: "4px" },
  detalleConfirmacion: {
    background: "#f8fafc", borderRadius: "10px", padding: "14px 16px", marginBottom: "16px",
  },
  filaDetalleConfirmacion: {
    display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#475569", padding: "4px 0",
  },
  listaProductosConfirmacion: {
    marginTop: "10px", paddingTop: "10px", borderTop: "1px dashed #cbd5e1",
    display: "flex", flexDirection: "column", gap: "4px",
  },
  filaProductoConfirmacion: { display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "#334155" },
  totalConfirmacionGrande: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    background: "#0f172a", borderRadius: "10px", padding: "14px 18px", marginBottom: "18px",
    color: "#fff", fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px",
  },
  montoConfirmacionGrande: { fontSize: "1.5rem", fontWeight: 800, color: "#f59e0b", textTransform: "none", letterSpacing: 0 },
  botonesConfirmacion: { display: "flex", gap: "10px", marginBottom: "12px" },
  botonImprimir: { flex: 1, background: "#eff6ff", color: "#1d4ed8", border: "1px solid #93c5fd", padding: "12px", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 },
  botonDescargarPdf: { flex: 1, background: "#1d4ed8", color: "#fff", border: "none", padding: "12px", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 },
  avisoOrdenCreada: { background: "#eff6ff", color: "#1d4ed8", fontSize: "0.8rem", padding: "10px 12px", borderRadius: "8px", marginBottom: "14px", lineHeight: 1.4 },
  botonNuevaVenta: {
    width: "100%", background: "transparent", border: "1px solid #cbd5e1", color: "#334155",
    padding: "11px", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600,
  },

  historial: { marginTop: "30px" },

  // ---- Tarjetas del historial (celular) ----
  tdVacioMovil: { padding: "30px", textAlign: "center", color: "#94a3b8" },
  tarjetaVenta: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px", marginBottom: "0" },
  tarjetaEncabezado: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px", gap: "8px" },
  tarjetaNombre: { fontSize: "0.92rem", color: "#1e293b" },
  tarjetaSub: { fontSize: "0.78rem", color: "#64748b", marginTop: "2px" },
  tarjetaFila: { display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "#475569", padding: "4px 0", borderBottom: "1px solid #f8fafc" },
  tarjetaFilaTotal: { display: "flex", justifyContent: "space-between", fontSize: "0.9rem", color: "#1e293b", padding: "8px 0 4px 0" },
  tarjetaBotones: { display: "flex", gap: "6px", marginTop: "10px", flexWrap: "wrap" },
  botonPdfMovil: { flex: 1, background: "#eff6ff", color: "#1d4ed8", border: "none", padding: "8px", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600, minWidth: "80px" },
  botonAnularMovil: { flex: 1, background: "#fee2e2", color: "#b91c1c", border: "none", padding: "8px", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600, minWidth: "80px" },

  // ---- Tabla del historial (escritorio) ----
  tabla: { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "10px", overflow: "hidden", minWidth: "800px" },
  th: { textAlign: "left", padding: "10px", fontSize: "0.78rem", color: "#64748b", borderBottom: "2px solid #e2e8f0", background: "#f8fafc" },
  td: { padding: "10px", fontSize: "0.85rem", borderBottom: "1px solid #f1f5f9" },
  tdVacio: { padding: "30px", textAlign: "center", color: "#94a3b8" },
  badgeCompletada: { background: "#dcfce7", color: "#166534", padding: "3px 10px", borderRadius: "999px", fontSize: "0.78rem" },
  badgeAnulada: { background: "#fee2e2", color: "#b91c1c", padding: "3px 10px", borderRadius: "999px", fontSize: "0.78rem" },
  botonAnular: { background: "#fee2e2", color: "#b91c1c", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem" },
  botonPdf: { background: "#eff6ff", color: "#1d4ed8", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem", marginRight: "6px" },

  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px" },
  modalTabla: { background: "#fff", borderRadius: "12px", padding: "24px", width: "720px", maxWidth: "94vw", maxHeight: "82vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" },
  modalEncabezado: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  botonCerrarModal: { background: "transparent", border: "none", fontSize: "1.1rem", cursor: "pointer", color: "#64748b" },
  contenedorTablaModal: { overflowY: "auto", flex: 1 },
  tablaModal: { width: "100%", borderCollapse: "collapse" },
  thModal: { textAlign: "left", padding: "8px 10px", fontSize: "0.75rem", color: "#64748b", borderBottom: "2px solid #e2e8f0", background: "#f8fafc", position: "sticky", top: 0 },
  tdModal: { padding: "8px 10px", fontSize: "0.85rem", borderBottom: "1px solid #f1f5f9" },
  botonSeleccionarModal: { background: "#1d4ed8", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600, whiteSpace: "nowrap" },
  codigoModal: { fontFamily: "monospace", fontSize: "0.78rem", color: "#64748b" },
  stockBajoModal: { color: "#b91c1c", fontWeight: 700 },
  input: { width: "100%", padding: "9px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.95rem", boxSizing: "border-box", marginBottom: "8px" },
  label: { display: "block", fontSize: "0.8rem", color: "#334155", marginBottom: "4px", marginTop: "6px" },
  checkboxFila: { display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "#334155", cursor: "pointer" },

  // ---- Panel de búsqueda externa RENIEC/SUNAT dentro del modal de cliente ----
  panelExterno: { marginTop: "14px", paddingTop: "14px", borderTop: "1px dashed #e2e8f0" },
  botonBuscarExterno: {
    width: "100%", background: "#fffbeb", border: "1px dashed #f59e0b", color: "#92400e",
    padding: "12px", borderRadius: "8px", cursor: "pointer", fontSize: "0.83rem", fontWeight: 600,
  },
  mensajeExterno: { fontSize: "0.8rem", color: "#92400e", marginTop: "8px" },
  tarjetaExterno: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px", marginTop: "10px" },
  labelExterno: { display: "block", fontSize: "0.78rem", color: "#334155", marginBottom: "5px", fontWeight: 600 },
  botonRegistrarUsar: {
    width: "100%", marginTop: "10px", background: "#166534", color: "#fff", border: "none",
    padding: "10px", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem",
  },
}; 