// En tu compu (desarrollo) usa localhost; en producción (Vercel),
// usa la URL real del backend en Render - se configura como
// variable de entorno VITE_API_URL en el panel de Vercel.
const API_URL = import.meta.env.VITE_API_URL || "https://localhost:7029/api";

export async function login(correo, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correo, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "Error al iniciar sesión");
  return data;
}

export async function verificar2FA(preAuthToken, codigo) {
  const res = await fetch(`${API_URL}/auth/verify-2fa`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preAuthToken, codigo }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "Código incorrecto");
  return data;
}

export async function obtenerSesiones(token) {
  const res = await fetch(`${API_URL}/auth/sesiones`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("No se pudieron obtener las sesiones");
  return res.json();
}

export async function cerrarSesion(token, sesionId) {
  const res = await fetch(`${API_URL}/auth/sesiones/${sesionId}/cerrar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("No se pudo cerrar la sesión");
  return res.json();
}

// ---------------- Administración de usuarios (solo Administrador) ----------------

export async function listarUsuarios(token) {
  const res = await fetch(`${API_URL}/usuarios`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("No se pudo obtener la lista de usuarios");
  return res.json();
}

export async function crearUsuario(token, { nombreCompleto, correo, password, rol, direccion }) {
  const res = await fetch(`${API_URL}/usuarios`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ nombreCompleto, correo, password, rol, direccion: direccion || null }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "No se pudo crear el usuario");
  return data;
}

export async function editarUsuario(token, usuarioId, { nombreCompleto, correo, rol, direccion }) {
  const res = await fetch(`${API_URL}/usuarios/${usuarioId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ nombreCompleto, correo, rol, direccion: direccion || null }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "No se pudo editar el usuario");
  return data;
}

export async function restablecerPasswordUsuario(token, usuarioId, nuevaPassword) {
  const res = await fetch(`${API_URL}/usuarios/${usuarioId}/restablecer-password`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ nuevaPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "No se pudo restablecer la contraseña");
  return data;
}

export async function regenerar2FAUsuario(token, usuarioId) {
  const res = await fetch(`${API_URL}/usuarios/${usuarioId}/regenerar-2fa`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "No se pudo regenerar el 2FA");
  return data;
}

export async function cambiarEstadoUsuario(token, usuarioId, activo) {
  const res = await fetch(`${API_URL}/usuarios/${usuarioId}/estado`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ activo }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "No se pudo cambiar el estado");
  return data;
}

// ---------------- Permisos ----------------

export async function obtenerMisPermisos(token) {
  const res = await fetch(`${API_URL}/permisos/mis-permisos`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("No se pudieron obtener los permisos");
  return res.json(); // array de claves, ej. ["VENTAS_VER", "CLIENTES_VER"]
}

export async function obtenerMatrizPermisos(token) {
  const res = await fetch(`${API_URL}/permisos/matriz`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("No se pudo obtener la matriz de permisos");
  return res.json();
}

export async function actualizarPermiso(token, { permisoId, rol, permitido }) {
  const res = await fetch(`${API_URL}/permisos/matriz`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ permisoId, rol, permitido }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "No se pudo actualizar el permiso");
  return data;
}

// ---------------- Auditoría ----------------

export async function obtenerAuditoria(token, { desde, hasta, accion, correo, pagina = 1, tamano = 50 } = {}) {
  const params = new URLSearchParams();
  if (desde) params.set("desde", desde);
  if (hasta) params.set("hasta", hasta);
  if (accion) params.set("accion", accion);
  if (correo) params.set("correo", correo);
  params.set("pagina", pagina);
  params.set("tamano", tamano);

  const res = await fetch(`${API_URL}/auditoria?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("No se pudo obtener el historial de auditoría");
  return res.json();
}

export async function obtenerTiposAccion(token) {
  const res = await fetch(`${API_URL}/auditoria/tipos-accion`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("No se pudieron obtener los tipos de acción");
  return res.json();
}

// ---------------- Clientes ----------------

export async function consultarDocumento(token, tipo, numero) {
  const res = await fetch(`${API_URL}/clientes/consultar-documento/${tipo}/${numero}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data; // { encontrado, nombreORazonSocial, direccion, mensaje }
}

export async function listarClientes(token, busqueda = "") {
  const params = busqueda ? `?busqueda=${encodeURIComponent(busqueda)}` : "";
  const res = await fetch(`${API_URL}/clientes${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("No se pudo obtener la lista de clientes");
  return res.json();
}

export async function crearCliente(token, cliente) {
  const res = await fetch(`${API_URL}/clientes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(cliente),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "No se pudo crear el cliente");
  return data;
}

export async function editarCliente(token, id, cliente) {
  const res = await fetch(`${API_URL}/clientes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(cliente),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "No se pudo editar el cliente");
  return data;
}

export async function cambiarEstadoCliente(token, id, activo) {
  const res = await fetch(`${API_URL}/clientes/${id}/estado`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(activo),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "No se pudo cambiar el estado");
  return data;
}

// ---------------- Productos (catálogo para Ventas) ----------------

export async function listarProductos(token, busqueda = "") {
  const params = busqueda ? `?busqueda=${encodeURIComponent(busqueda)}` : "";
  const res = await fetch(`${API_URL}/productos${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("No se pudo obtener el catálogo de productos");
  return res.json();
}

export async function crearProducto(token, { codigo, nombre, categoriaId, unidadMedida, precioUnitario, stock }) {
  const res = await fetch(`${API_URL}/productos`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ codigo, nombre, categoriaId, unidadMedida, precioUnitario, stock }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "No se pudo crear el producto");
  return data;
}

export async function editarProducto(token, id, { codigo, nombre, categoriaId, unidadMedida, precioUnitario, stock }) {
  const res = await fetch(`${API_URL}/productos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ codigo, nombre, categoriaId, unidadMedida, precioUnitario, stock }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "No se pudo editar el producto");
  return data;
}

export async function cambiarEstadoProducto(token, id, activo) {
  const res = await fetch(`${API_URL}/productos/${id}/estado`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(activo),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "No se pudo cambiar el estado");
  return data;
}

// ---------------- Categorías ----------------

export async function listarCategorias(token) {
  const res = await fetch(`${API_URL}/categorias`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("No se pudo obtener el listado de categorías");
  return res.json();
}

export async function crearCategoria(token, { nombre, descripcion }) {
  const res = await fetch(`${API_URL}/categorias`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ nombre, descripcion }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "No se pudo crear la categoría");
  return data;
}

export async function editarCategoria(token, id, { nombre, descripcion }) {
  const res = await fetch(`${API_URL}/categorias/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ nombre, descripcion }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "No se pudo editar la categoría");
  return data;
}

export async function cambiarEstadoCategoria(token, id, activo) {
  const res = await fetch(`${API_URL}/categorias/${id}/estado`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(activo),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "No se pudo cambiar el estado");
  return data;
}

// ---------------- Ventas ----------------

export async function crearVenta(token, { clienteId, items, requiereOrdenServicio, direccionInstalacion, descripcionServicio }) {
  const res = await fetch(`${API_URL}/ventas`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      clienteId, items,
      requiereOrdenServicio: !!requiereOrdenServicio,
      direccionInstalacion: direccionInstalacion || null,
      descripcionServicio: descripcionServicio || null,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "No se pudo registrar la venta");
  return data;
}

export async function listarVentas(token, limite = 50) {
  const res = await fetch(`${API_URL}/ventas?limite=${limite}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("No se pudo obtener el historial de ventas");
  return res.json();
}

export async function anularVenta(token, id) {
  const res = await fetch(`${API_URL}/ventas/${id}/anular`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "No se pudo anular la venta");
  return data;
}

// ---------------- Comprobantes (PDF) ----------------

export async function descargarBoletaPdf(token, ventaId) {
  const res = await fetch(`${API_URL}/ventas/${ventaId}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("No se pudo generar la boleta en PDF");

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `Boleta-${String(ventaId).padStart(6, "0")}.pdf`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.URL.revokeObjectURL(url);
}

// ---------------- Cotizaciones ----------------

export async function crearCotizacion(token, { clienteId, items }) {
  const res = await fetch(`${API_URL}/cotizaciones`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ clienteId, items }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "No se pudo registrar la cotización");
  return data;
}

export async function listarCotizaciones(token, limite = 50) {
  const res = await fetch(`${API_URL}/cotizaciones?limite=${limite}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("No se pudo obtener el historial de cotizaciones");
  return res.json();
}

export async function cambiarEstadoCotizacion(token, id, estado) {
  const res = await fetch(`${API_URL}/cotizaciones/${id}/estado`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ estado }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "No se pudo cambiar el estado");
  return data;
}

export async function convertirCotizacionAVenta(token, id) {
  const res = await fetch(`${API_URL}/cotizaciones/${id}/convertir-a-venta`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "No se pudo convertir la cotización en venta");
  return data;
}

export async function descargarCotizacionPdf(token, cotizacionId) {
  const res = await fetch(`${API_URL}/cotizaciones/${cotizacionId}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("No se pudo generar el PDF de la cotización");

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `Cotizacion-${String(cotizacionId).padStart(6, "0")}.pdf`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.URL.revokeObjectURL(url);
}

// ---------------- Reportes Comerciales ----------------

export async function obtenerReporteCompleto(token, desde, hasta) {
  const params = new URLSearchParams();
  if (desde) params.set("desde", desde);
  if (hasta) params.set("hasta", hasta);
  const res = await fetch(`${API_URL}/reportes/completo?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("No se pudo obtener el reporte");
  return res.json();
}

async function descargarArchivo(url, token, nombreArchivo) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("No se pudo generar el archivo");
  const blob = await res.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = objectUrl;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.URL.revokeObjectURL(objectUrl);
}

export async function descargarReporteExcel(token, desde, hasta) {
  const params = new URLSearchParams();
  if (desde) params.set("desde", desde);
  if (hasta) params.set("hasta", hasta);
  await descargarArchivo(`${API_URL}/reportes/excel?${params.toString()}`, token, "Reporte-Comercial.xlsx");
}

export async function descargarReportePdf(token, desde, hasta) {
  const params = new URLSearchParams();
  if (desde) params.set("desde", desde);
  if (hasta) params.set("hasta", hasta);
  await descargarArchivo(`${API_URL}/reportes/pdf?${params.toString()}`, token, "Reporte-Comercial.pdf");
}

// ---------------- Proveedores ----------------

export async function listarProveedores(token, busqueda = "") {
  const params = busqueda ? `?busqueda=${encodeURIComponent(busqueda)}` : "";
  const res = await fetch(`${API_URL}/proveedores${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("No se pudo obtener la lista de proveedores");
  return res.json();
}

export async function crearProveedor(token, proveedor) {
  const res = await fetch(`${API_URL}/proveedores`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(proveedor),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "No se pudo crear el proveedor");
  return data;
}

export async function editarProveedor(token, id, proveedor) {
  const res = await fetch(`${API_URL}/proveedores/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(proveedor),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "No se pudo editar el proveedor");
  return data;
}

export async function cambiarEstadoProveedor(token, id, activo) {
  const res = await fetch(`${API_URL}/proveedores/${id}/estado`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(activo),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "No se pudo cambiar el estado");
  return data;
}

// ---------------- Compras ----------------

export async function crearCompra(token, { proveedorId, numeroDocumento, items }) {
  const res = await fetch(`${API_URL}/compras`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ proveedorId, numeroDocumento, items }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "No se pudo registrar la compra");
  return data;
}

export async function listarCompras(token, limite = 50) {
  const res = await fetch(`${API_URL}/compras?limite=${limite}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("No se pudo obtener el historial de compras");
  return res.json();
}

// ---------------- Inventario / Kardex ----------------

export async function obtenerResumenInventario(token) {
  const res = await fetch(`${API_URL}/inventario/resumen-productos`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("No se pudo obtener el resumen de inventario");
  return res.json();
}

export async function obtenerKardexProducto(token, productoId) {
  const res = await fetch(`${API_URL}/inventario/kardex/${productoId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("No se pudo obtener el kardex del producto");
  return res.json();
}

// ---------------- Gestión de Técnicos ----------------

export async function listarTecnicos(token) {
  const res = await fetch(`${API_URL}/tecnicos`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("No se pudo obtener la lista de técnicos");
  return res.json();
}

export async function actualizarPerfilTecnico(token, usuarioId, perfil) {
  const res = await fetch(`${API_URL}/tecnicos/${usuarioId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(perfil),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "No se pudo actualizar el perfil del técnico");
  return data;
}

// ---------------- Órdenes de Servicio ----------------

export async function listarVentasDisponiblesParaOrden(token) {
  const res = await fetch(`${API_URL}/ordenes-servicio/ventas-disponibles`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("No se pudo obtener las ventas disponibles");
  return res.json();
}

export async function crearOrdenServicio(token, orden) {
  const res = await fetch(`${API_URL}/ordenes-servicio`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(orden),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "No se pudo crear la orden de servicio");
  return data;
}

export async function listarOrdenesServicio(token, estado = "") {
  const params = estado ? `?estado=${encodeURIComponent(estado)}` : "";
  const res = await fetch(`${API_URL}/ordenes-servicio${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("No se pudo obtener el listado de órdenes de servicio");
  return res.json();
}

export async function asignarTecnicoOrden(token, id, tecnicoUsuarioId) {
  const res = await fetch(`${API_URL}/ordenes-servicio/${id}/asignar-tecnico`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ tecnicoUsuarioId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "No se pudo asignar el técnico");
  return data;
}

export async function cambiarEstadoOrden(token, id, estado) {
  const res = await fetch(`${API_URL}/ordenes-servicio/${id}/estado`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ estado }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "No se pudo cambiar el estado de la orden");
  return data;
}

export async function agregarProductoOrden(token, id, productoId, cantidad) {
  const res = await fetch(`${API_URL}/ordenes-servicio/${id}/productos`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ productoId, cantidad }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "No se pudo agregar el producto");
  return data;
}

export async function quitarProductoOrden(token, id, detalleId) {
  const res = await fetch(`${API_URL}/ordenes-servicio/${id}/productos/${detalleId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "No se pudo quitar el producto");
  return data;
}

// ---------------- GPS en vivo / Seguimiento público ----------------

export async function obtenerOrdenServicio(token, id) {
  const res = await fetch(`${API_URL}/ordenes-servicio/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("No se pudo obtener la orden");
  return res.json();
}

export async function actualizarUbicacionOrden(token, id, lat, lng) {
  const res = await fetch(`${API_URL}/ordenes-servicio/${id}/ubicacion`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ lat, lng }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "No se pudo actualizar la ubicación");
  return data;
}

// PÚBLICO: sin token de autenticación, para el link que ve el cliente
export async function obtenerSeguimientoPublico(tokenSeguimiento) {
  const res = await fetch(`${API_URL}/ordenes-servicio/seguimiento/${tokenSeguimiento}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "No se pudo obtener el seguimiento");
  return data;
}

// ---------------- Dashboard Gerencial ----------------

export async function obtenerResumenDashboard(token) {
  const res = await fetch(`${API_URL}/dashboard/resumen`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("No se pudo obtener el resumen del dashboard");
  return res.json();
}