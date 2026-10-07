/** Estados en los que una herramienta puede salir a préstamo (HU-10 · criterio 3). */
export const ESTADOS_PRESTABLES = ['EXCELENTE', 'BUENO', 'REGULAR']

/**
 * Entity que representa la tabla `herramientas` (HU-10).
 * `prestable` no es columna: se deriva de la disponibilidad, el estado
 * operativo y la baja lógica, y es lo que consultará el préstamo (HU-11).
 */
export class Herramienta {
  constructor({
    id,
    codigo_serial,
    nombre,
    marca,
    modelo,
    almacen_id,
    almacen,
    almacen_codigo,
    estado_operativo,
    disponibilidad,
    observaciones,
    activo,
    fecha_baja,
  }) {
    this.id = id
    this.codigo_serial = codigo_serial
    this.nombre = nombre
    this.marca = marca ?? null
    this.modelo = modelo ?? null
    this.almacen_id = almacen_id
    this.almacen = almacen ?? null
    this.almacen_codigo = almacen_codigo ?? null
    this.estado_operativo = estado_operativo
    this.disponibilidad = disponibilidad
    this.observaciones = observaciones ?? null
    this.activo = activo
    this.fecha_baja = fecha_baja ?? null
    this.prestable =
      Number(activo) === 1 &&
      disponibilidad === 'DISPONIBLE' &&
      ESTADOS_PRESTABLES.includes(estado_operativo)
  }

  static fromRow(row) {
    if (!row) return null
    return new Herramienta(row)
  }
}
