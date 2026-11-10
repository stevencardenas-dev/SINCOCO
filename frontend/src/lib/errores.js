/**
 * Mensajes de error de la API para los formularios.
 *
 * Regla del proyecto: cuando una regla de negocio no se cumple, el usuario debe
 * ver el MENSAJE que devuelve la API (`{ error: '...' }`), nunca el código HTTP
 * ni un objeto técnico. `errorHandler` del backend ya traduce las excepciones a
 * ese formato; aquí solo se elige el texto de respaldo por si la red falla.
 *
 * `campoError` devuelve el campo señalado (CU-02 Alt 1, CU-01 Alt 1) para
 * resaltarlo, o null.
 */
export function mensajeError(error, respaldo = 'Ocurrió un error inesperado. Intente de nuevo.') {
  const mensaje = error?.response?.data?.error
  return mensaje ? traducirMensaje(mensaje) : (error?.message ?? respaldo)
}

/**
 * Nombres legibles de los campos que el backend cita en sus mensajes («proyecto_id es obligatorio»).
 * Los que no están aquí se derivan del propio nombre: `fecha_inicio_programada` -> «Fecha inicio programada».
 */
const NOMBRES_CAMPO = {
  proyecto_id: 'Proyecto', actividad_id: 'Actividad', etapa_id: 'Etapa', cliente_id: 'Cliente', responsable_id: 'Responsable',
  almacen_id: 'Almacén', almacen_origen_id: 'Almacén de origen', almacen_destino_id: 'Almacén de destino',
  material_id: 'Material', categoria_id: 'Categoría', proveedor_id: 'Proveedor', herramienta_id: 'Herramienta',
  solicitud_id: 'Solicitud', prestamo_id: 'Préstamo', salida_origen_id: 'Salida de origen', rol_id: 'Rol',
  trabajador_id: 'Trabajador', entregado_a_trabajador_id: 'Trabajador que recibe', devuelto_por_trabajador_id: 'Trabajador que devuelve',
  para_trabajador_id: 'Trabajador destinatario', herramienta_reemplazo_id: 'Herramienta de reemplazo',
  cantidad: 'Cantidad', observaciones: 'Observaciones', observacion: 'Observación', motivo: 'Motivo', novedad: 'Novedad',
  condicion: 'Condición', estado: 'Estado', tipo: 'Tipo', accion: 'Acción', costo: 'Costo', detalles: 'Materiales',
  unidad_medida: 'Unidad de medida', tipo_documento: 'Tipo de documento', fecha_requerida: 'Fecha requerida',
  fecha_real_devolucion: 'Fecha de devolución', fecha_estimada_devolucion: 'Fecha estimada de devolución',
  fecha_salida: 'Fecha de salida', fecha_inicio: 'Fecha de inicio', fecha_fin: 'Fecha de fin',
}

const nombreCampo = (campo) => {
  if (NOMBRES_CAMPO[campo]) return NOMBRES_CAMPO[campo]
  const texto = campo.replace(/_id$/, '').replace(/_/g, ' ')
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/**
 * El backend nombra el campo tal como se llama en el código. Aquí se pasa a lenguaje de formulario:
 * «proyecto_id es obligatorio» -> «Seleccione «Proyecto».»; «cantidad es obligatorio» -> «Complete el campo «Cantidad».»;
 * y cualquier otro nombre técnico dentro de un mensaje (`almacen_origen_id debe ser…`) se reemplaza por «Almacén de origen».
 */
export function traducirMensaje(mensaje) {
  const obligatorio = /^([a-z][a-z0-9_]*) es (?:obligatori[oa]|requerid[oa])\.?$/.exec(mensaje)
  if (obligatorio) {
    const campo = obligatorio[1]
    return campo.endsWith('_id') ? `Seleccione «${nombreCampo(campo)}».` : `Complete el campo «${nombreCampo(campo)}».`
  }
  // Un nombre técnico solo se reconoce al inicio del mensaje o si lleva guion bajo (p. ej. «proyecto_id»).
  return mensaje
    .replace(/^([a-z][a-z0-9]*) (?=(?:no es|debe ser|debe ser uno|admite|supera|ya existe))/, (_, campo) => `«${nombreCampo(campo)}» `)
    .replace(/\b[a-z]+(?:_[a-z]+)+\b/g, (campo) => `«${nombreCampo(campo)}»`)
}

export function campoError(error) {
  return error?.response?.data?.campo ?? null
}
