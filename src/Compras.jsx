import { useEffect, useState } from "react";
import { listarProveedores, listarProductos, crearCompra, listarCompras } from "./authApi";

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

function IconoProveedor({ tamano = 28 }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="1.6">
      <path d="M3 21V8l9-5 9 5v13" strokeLinejoin="round" />
      <path d="M9 21v-6h6v6" strokeLinejoin="round" />
    </svg>
  );
}

export default function Compras({ token }) {
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
  const [proveedorAModal, setProveedorAModal] = useState(false);
  const [productoAModal, setProductoAModal] = useState(false);

  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [carrito, setCarrito] = useState([]); // {productoId, nombre, cantidad, costoUnitario}
  const [error, setError] = useState("");
  const [registrando, setRegistrando] = useState(false);
  const [compraConfirmada, setCompraConfirmada] = useState(null);

  const [compras, setCompras] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);

  async function cargarHistorial() {
    setCargandoHistorial(true);
    try {
      setCompras(await listarCompras(token, 30));
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
      if (existente) return prev;
      return [
        ...prev,
        {
          productoId: producto.id,
          nombre: producto.nombre,
          cantidad: 1,
          costoUnitario: producto.costoUnitario || 0,
        },
      ];
    });
    setProductoAModal(false);
  }

  function cambiarCantidad(productoId, valor) {
    setCarrito((prev) => prev.map((i) => i.productoId === productoId ? { ...i, cantidad: Math.max(1, valor) } : i));
  }

  function cambiarCosto(productoId, valor) {
    setCarrito((prev) => prev.map((i) => i.productoId === productoId ? { ...i, costoUnitario: Math.max(0, valor) } : i));
  }

  function quitarDelCarrito(productoId) {
    setCarrito((prev) => prev.filter((i) => i.productoId !== productoId));
  }

  const totalCompra = carrito.reduce((acc, item) => acc + item.costoUnitario * item.cantidad, 0);

  async function manejarRegistrarCompra() {
    setError("");
    if (!proveedorSeleccionado) { setError("Selecciona un proveedor antes de continuar."); return; }
    if (carrito.length === 0) { setError("Agrega al menos un producto."); return; }

    setRegistrando(true);
    try {
      const data = await crearCompra(token, {
        proveedorId: proveedorSeleccionado.id,
        numeroDocumento: numeroDocumento || null,
        items: carrito.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad, costoUnitario: i.costoUnitario })),
      });
      setCompraConfirmada(data);
      setCarrito([]);
      setProveedorSeleccionado(null);
      setNumeroDocumento("");
      await cargarHistorial();
    } catch (err) {
      setError(err.message);
    } finally {
      setRegistrando(false);
    }
  }

  return (
    <div style={estilos.contenedor} className="modulo-responsive">
      <h3 style={{ marginTop: 0 }}>Nueva compra (entrada de stock)</h3>
      <p style={estilos.textoAyuda}>
        Registra la mercadería que te llega de un proveedor. El stock del producto sube automáticamente
        y se actualiza su costo vigente (usado para calcular la ganancia en Reportes).
      </p>

      {error && <p style={estilos.error}>{error}</p>}

      <div style={estilos.gridPrincipal} className="grid-2col-responsive">
        <div style={estilos.columnaVenta}>

          <div style={estilos.tarjeta}>
            <h4 style={estilos.tituloTarjeta}>1. Proveedor</h4>
            {proveedorSeleccionado ? (
              <div style={estilos.itemSeleccionado}>
                <IconoProveedor tamano={32} />
                <div style={{ flex: 1 }}>
                  <strong>{proveedorSeleccionado.razonSocial}</strong>
                  <div style={estilos.textoSecundario}>RUC {proveedorSeleccionado.ruc}</div>
                </div>
                <button onClick={() => setProveedorSeleccionado(null)} style={estilos.botonCambiar}>Cambiar</button>
              </div>
            ) : (
              <button onClick={() => setProveedorAModal(true)} style={estilos.botonAgregar}>
                <IconoProveedor tamano={20} /> Buscar proveedor
              </button>
            )}

            <label style={estilos.label}>N° de factura/guía (opcional)</label>
            <input
              value={numeroDocumento}
              onChange={(e) => setNumeroDocumento(e.target.value)}
              style={estilos.input}
              placeholder="Ej. F001-00123"
            />
          </div>

          <div style={estilos.tarjeta}>
            <div style={estilos.encabezadoConBoton}>
              <h4 style={estilos.tituloTarjeta}>2. Productos comprados</h4>
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
                    <IconoProducto tamano={28} />
                    <div style={{ flex: 1 }}>
                      <div style={estilos.nombreCarrito}>{item.nombre}</div>
                    </div>
                    <div style={estilos.grupoCampo}>
                      <span style={estilos.microLabel}>Cant.</span>
                      <input
                        type="number" min="1"
                        value={item.cantidad}
                        onChange={(e) => cambiarCantidad(item.productoId, parseInt(e.target.value, 10) || 1)}
                        style={estilos.inputChico}
                      />
                    </div>
                    <div style={estilos.grupoCampo}>
                      <span style={estilos.microLabel}>Costo c/u</span>
                      <input
                        type="number" min="0" step="0.01"
                        value={item.costoUnitario}
                        onChange={(e) => cambiarCosto(item.productoId, parseFloat(e.target.value) || 0)}
                        style={estilos.inputChico}
                      />
                    </div>
                    <div style={estilos.subtotalLinea}>S/ {(item.costoUnitario * item.cantidad).toFixed(2)}</div>
                    <button onClick={() => quitarDelCarrito(item.productoId)} style={estilos.botonQuitar}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={estilos.columnaResumen}>
          <div style={estilos.tarjetaResumen}>
            <h4 style={estilos.tituloResumen}>Resumen de compra</h4>
            <div style={estilos.filaResumenTotal}>
              <span>TOTAL COMPRA</span>
              <span style={estilos.montoTotal}>S/ {totalCompra.toFixed(2)}</span>
            </div>
            <button
              onClick={manejarRegistrarCompra}
              disabled={registrando || carrito.length === 0 || !proveedorSeleccionado}
              style={estilos.botonRegistrar}
            >
              {registrando ? "Registrando..." : "✓ Registrar compra"}
            </button>
          </div>

        </div>
      </div>

      {/* Historial */}
      <div style={estilos.historial}>
        <h3>Compras recientes</h3>
        {cargandoHistorial ? (
          <p>Cargando...</p>
        ) : (
          <>
            {/* ---------------- Vista de TARJETAS - solo en celular ---------------- */}
            <div className="vista-tarjetas-movil">
              {compras.length === 0 && (
                <p style={estilos.tdVacioMovil}>Aún no hay compras registradas.</p>
              )}
              {compras.map((c) => (
                <div key={c.id} style={estilos.tarjetaCompra}>
                  <div style={estilos.tarjetaEncabezado}>
                    <div>
                      <strong style={estilos.tarjetaNombre}>Compra #{c.id}</strong>
                      <div style={estilos.tarjetaSub}>{c.nombreProveedor}</div>
                    </div>
                    <span style={estilos.montoTarjeta}>S/ {c.total.toFixed(2)}</span>
                  </div>
                  <div style={estilos.tarjetaFila}><span>Fecha</span><span>{new Date(c.fechaCompra).toLocaleString("es-PE")}</span></div>
                  <div style={estilos.tarjetaFila}><span>Registrado por</span><span>{c.nombreUsuario}</span></div>
                  <div style={estilos.tarjetaFila}><span>Documento</span><span>{c.numeroDocumento || "—"}</span></div>
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
                    <th style={estilos.th}>Proveedor</th>
                    <th style={estilos.th}>Registrado por</th>
                    <th style={estilos.th}>Documento</th>
                    <th style={estilos.th}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {compras.length === 0 && (
                    <tr><td colSpan={6} style={estilos.tdVacio}>Aún no hay compras registradas.</td></tr>
                  )}
                  {compras.map((c) => (
                    <tr key={c.id}>
                      <td style={estilos.td}>{c.id}</td>
                      <td style={estilos.td}>{new Date(c.fechaCompra).toLocaleString("es-PE")}</td>
                      <td style={estilos.td}>{c.nombreProveedor}</td>
                      <td style={estilos.td}>{c.nombreUsuario}</td>
                      <td style={estilos.td}>{c.numeroDocumento || "—"}</td>
                      <td style={estilos.td}>S/ {c.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal: compra registrada con éxito */}
      {compraConfirmada && (
        <ModalCompraConfirmada
          compra={compraConfirmada}
          onCerrar={() => setCompraConfirmada(null)}
        />
      )}

      {/* Modal proveedor */}
      {proveedorAModal && (
        <ModalBusquedaTabla
          titulo="Buscar proveedor"
          placeholder="Escribe para filtrar por razón social o RUC..."
          onCerrar={() => setProveedorAModal(false)}
          cargarTodos={async () => {
            const data = await listarProveedores(token, "");
            return data.filter((p) => p.activo);
          }}
          filtrar={(p, t) => p.razonSocial.toLowerCase().includes(t) || p.ruc.includes(t)}
          columnas={[
            { header: "RUC", render: (p) => <code style={estilos.codigoModal}>{p.ruc}</code> },
            { header: "Razón Social", render: (p) => p.razonSocial },
            { header: "Contacto", render: (p) => p.nombreContacto || "—" },
          ]}
          textoBoton="Seleccionar"
          onSeleccionar={(p) => { setProveedorSeleccionado(p); setProveedorAModal(false); }}
          mensajeVacio="No hay proveedores registrados todavía."
        />
      )}

      {/* Modal producto */}
      {productoAModal && (
        <ModalBusquedaTabla
          titulo="Agregar producto a la compra"
          placeholder="Escribe para filtrar por nombre o código..."
          onCerrar={() => setProductoAModal(false)}
          cargarTodos={async () => {
            const data = await listarProductos(token, "");
            return data.filter((p) => p.activo);
          }}
          filtrar={(p, t) => p.nombre.toLowerCase().includes(t) || (p.codigo || "").toLowerCase().includes(t)}
          columnas={[
            { header: "Código", render: (p) => <code style={estilos.codigoModal}>{p.codigo || "—"}</code> },
            { header: "Producto", render: (p) => p.nombre },
            { header: "Stock actual", render: (p) => p.stock },
            { header: "Último costo", render: (p) => `S/ ${(p.costoUnitario || 0).toFixed(2)}` },
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

// Modal de confirmación tras registrar la compra: muestra el
// detalle completo de qué se compró (útil para verificar antes
// de seguir trabajando).
function ModalCompraConfirmada({ compra, onCerrar }) {
  return (
    <div style={estilos.overlay} onClick={onCerrar}>
      <div style={estilos.modalConfirmacion} onClick={(e) => e.stopPropagation()}>
        <div style={estilos.encabezadoConfirmacion}>
          <div style={estilos.iconoConfirmacionGrande}>✓</div>
          <h2 style={estilos.tituloConfirmacionGrande}>¡Compra registrada!</h2>
          <div style={estilos.numeroCompraConfirmacion}>
            Compra N° {String(compra.id).padStart(6, "0")}
          </div>
        </div>

        <div style={estilos.detalleConfirmacion}>
          <div style={estilos.filaDetalleConfirmacion}><span>Proveedor</span><strong>{compra.nombreProveedor}</strong></div>
          <div style={estilos.filaDetalleConfirmacion}><span>Registrado por</span><strong>{compra.nombreUsuario}</strong></div>
          <div style={estilos.filaDetalleConfirmacion}><span>Fecha</span><strong>{new Date(compra.fechaCompra).toLocaleString("es-PE")}</strong></div>
          {compra.numeroDocumento && (
            <div style={estilos.filaDetalleConfirmacion}><span>Documento</span><strong>{compra.numeroDocumento}</strong></div>
          )}

          <div style={estilos.listaProductosConfirmacion}>
            {compra.detalles.map((d, i) => (
              <div key={i} style={estilos.filaProductoConfirmacion}>
                <span>{d.cantidad}x {d.nombreProducto} <span style={estilos.costoUnitarioConfirmacion}>(S/ {d.costoUnitario.toFixed(2)} c/u)</span></span>
                <span>S/ {d.subtotal.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={estilos.totalConfirmacionGrande}>
          <span>TOTAL COMPRA</span>
          <span style={estilos.montoConfirmacionGrande}>S/ {compra.total.toFixed(2)}</span>
        </div>

        <p style={estilos.notaStockActualizado}>✓ El stock de estos productos ya fue actualizado automáticamente.</p>

        <button onClick={onCerrar} style={estilos.botonNuevaCompra}>
          Registrar otra compra
        </button>
      </div>
    </div>
  );
}

function ModalBusquedaTabla({ titulo, placeholder, onCerrar, cargarTodos, filtrar, columnas, textoBoton, onSeleccionar, mensajeVacio }) {
  const [texto, setTexto] = useState("");
  const [todos, setTodos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;
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
            <p style={estilos.textoSecundario}>{todos.length === 0 ? mensajeVacio : "No hay resultados."}</p>
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
                {resultados.map((item) => (
                  <tr key={item.id}>
                    {columnas.map((col) => <td key={col.header} style={estilos.tdModal}>{col.render(item)}</td>)}
                    <td style={estilos.tdModal}>
                      <button onClick={() => onSeleccionar(item)} style={estilos.botonSeleccionarModal}>{textoBoton}</button>
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
  textoAyuda: { fontSize: "0.85rem", color: "#64748b", marginBottom: "16px", maxWidth: "600px" },
  error: { color: "#dc2626", fontSize: "0.85rem", marginBottom: "12px" },
  gridPrincipal: { display: "grid", gridTemplateColumns: "1fr 320px", gap: "20px", alignItems: "start" },
  columnaVenta: { display: "flex", flexDirection: "column", gap: "16px" },
  columnaResumen: { position: "sticky", top: "20px", display: "flex", flexDirection: "column", gap: "16px" },
  tarjeta: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" },
  tituloTarjeta: { margin: "0 0 10px 0", fontSize: "0.9rem", color: "#1e293b" },
  encabezadoConBoton: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" },
  textoSecundario: { color: "#64748b", fontSize: "0.78rem" },
  label: { display: "block", fontSize: "0.8rem", color: "#334155", marginBottom: "4px", marginTop: "12px" },
  input: { width: "100%", padding: "9px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.9rem", boxSizing: "border-box" },

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
  filaCarrito: { display: "flex", alignItems: "center", gap: "10px", padding: "10px", background: "#f8fafc", borderRadius: "8px" },
  nombreCarrito: { fontSize: "0.87rem", fontWeight: 600, color: "#1e293b" },
  grupoCampo: { display: "flex", flexDirection: "column", alignItems: "center" },
  microLabel: { fontSize: "0.65rem", color: "#94a3b8", marginBottom: "2px" },
  inputChico: { width: "70px", padding: "5px", borderRadius: "6px", border: "1px solid #cbd5e1", textAlign: "center" },
  subtotalLinea: { fontWeight: 600, fontSize: "0.87rem", minWidth: "80px", textAlign: "right" },
  botonQuitar: { background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: "6px", width: "26px", height: "26px", cursor: "pointer" },

  tarjetaResumen: { background: "#0f172a", borderRadius: "14px", padding: "22px", color: "#fff" },
  tituloResumen: { margin: "0 0 14px 0", fontSize: "1rem", color: "#fff" },
  filaResumenTotal: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "16px" },
  montoTotal: { fontSize: "1.6rem", fontWeight: 800, color: "#f59e0b" },
  botonRegistrar: { width: "100%", background: "#f59e0b", color: "#0f172a", border: "none", padding: "13px", borderRadius: "10px", cursor: "pointer", fontWeight: 700, fontSize: "0.9rem" },

  // ---- Modal de confirmación de compra (grande, con detalle) ----
  modalConfirmacion: {
    background: "#fff", borderRadius: "16px", padding: "28px", width: "440px", maxWidth: "100%",
    maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.35)",
  },
  encabezadoConfirmacion: { textAlign: "center", marginBottom: "20px" },
  iconoConfirmacionGrande: {
    width: "60px", height: "60px", lineHeight: "60px", borderRadius: "50%",
    background: "#dcfce7", color: "#166534", fontSize: "1.8rem", fontWeight: 700,
    margin: "0 auto 12px auto",
  },
  tituloConfirmacionGrande: { margin: 0, fontSize: "1.25rem", color: "#1e293b" },
  numeroCompraConfirmacion: { color: "#64748b", fontSize: "0.85rem", marginTop: "4px" },
  detalleConfirmacion: { background: "#f8fafc", borderRadius: "10px", padding: "14px 16px", marginBottom: "16px" },
  filaDetalleConfirmacion: { display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#475569", padding: "4px 0" },
  listaProductosConfirmacion: {
    marginTop: "10px", paddingTop: "10px", borderTop: "1px dashed #cbd5e1",
    display: "flex", flexDirection: "column", gap: "6px",
  },
  filaProductoConfirmacion: { display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "#334155" },
  costoUnitarioConfirmacion: { color: "#94a3b8", fontSize: "0.75rem" },
  totalConfirmacionGrande: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    background: "#0f172a", borderRadius: "10px", padding: "14px 18px", marginBottom: "12px",
    color: "#fff", fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px",
  },
  montoConfirmacionGrande: { fontSize: "1.5rem", fontWeight: 800, color: "#f59e0b", textTransform: "none", letterSpacing: 0 },
  notaStockActualizado: { fontSize: "0.78rem", color: "#166534", textAlign: "center", marginBottom: "16px" },
  botonNuevaCompra: {
    width: "100%", background: "transparent", border: "1px solid #cbd5e1", color: "#334155",
    padding: "11px", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600,
  },

  historial: { marginTop: "30px" },

  // ---- Tarjetas del historial (celular) ----
  tdVacioMovil: { padding: "30px", textAlign: "center", color: "#94a3b8" },
  tarjetaCompra: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px" },
  tarjetaEncabezado: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px", gap: "8px" },
  tarjetaNombre: { fontSize: "0.92rem", color: "#1e293b" },
  tarjetaSub: { fontSize: "0.78rem", color: "#64748b", marginTop: "2px" },
  montoTarjeta: { fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" },
  tarjetaFila: { display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "#475569", padding: "4px 0", borderBottom: "1px solid #f8fafc" },

  // ---- Tabla del historial (escritorio) ----
  tabla: { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "10px", overflow: "hidden", minWidth: "700px" },
  th: { textAlign: "left", padding: "10px", fontSize: "0.78rem", color: "#64748b", borderBottom: "2px solid #e2e8f0", background: "#f8fafc" },
  td: { padding: "10px", fontSize: "0.85rem", borderBottom: "1px solid #f1f5f9" },
  tdVacio: { padding: "30px", textAlign: "center", color: "#94a3b8" },

  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px" },
  modalTabla: { background: "#fff", borderRadius: "12px", padding: "24px", width: "680px", maxWidth: "94vw", maxHeight: "82vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" },
  modalEncabezado: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  botonCerrarModal: { background: "transparent", border: "none", fontSize: "1.1rem", cursor: "pointer", color: "#64748b" },
  contenedorTablaModal: { overflowY: "auto", flex: 1 },
  tablaModal: { width: "100%", borderCollapse: "collapse" },
  thModal: { textAlign: "left", padding: "8px 10px", fontSize: "0.75rem", color: "#64748b", borderBottom: "2px solid #e2e8f0", background: "#f8fafc" },
  tdModal: { padding: "8px 10px", fontSize: "0.85rem", borderBottom: "1px solid #f1f5f9" },
  botonSeleccionarModal: { background: "#1d4ed8", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 },
  codigoModal: { fontFamily: "monospace", fontSize: "0.78rem", color: "#64748b" },
};