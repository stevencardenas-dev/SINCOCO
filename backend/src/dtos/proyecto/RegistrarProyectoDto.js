import { AppError } from '../../utils/AppError.js'

/**
 * DTO para el registro de un proyecto (HU-02).
 * Responsabilidad: validar que el body tenga la forma y los tipos
 * correctos. Las reglas de NEGOCIO (presupuesto > 0, fechas coherentes,
 * existencia de cliente/responsable, etc.) se validan en el service,
 * no aquí — igual que en la implementación de referencia del remoto.
 */
export class RegistrarProyectoDto {
  constructor({
    codigo,
    cliente_id,
    nombre,
    descripcion,
    ubicacion,
    fecha_inicio_programada,
    fecha_fin_programada,
    responsable_id,
    presupuesto_inicial,
    observaciones,
  }) {
    this.codigo = codigo
    this.cliente_id = cliente_id
    this.nombre = nombre
    this.descripcion = descripcion
    this.ubicacion = ubicacion
    this.fecha_inicio_programada = fecha_inicio_programada
    this.fecha_fin_programada = fecha_fin_programada
    this.responsable_id = responsable_id
    this.presupuesto_inicial = presupuesto_inicial
    this.observaciones = observaciones
  }

  /**
   * Construye y valida el DTO a partir del body del request.
   * Lanza AppError(400) si faltan campos obligatorios o los tipos no
   * son válidos.
   */
  static fromRequestBody(body = {}) {
    const camposObligatorios = [
      'codigo',
      'cliente_id',
      'nombre',
      'ubicacion',
      'fecha_inicio_programada',
      'fecha_fin_programada',
      'responsable_id',
      'presupuesto_inicial',
    ]

    const faltantes = camposObligatorios.filter(
      (campo) => body[campo] === undefined || body[campo] === null || body[campo] === '',
    )

    if (faltantes.length > 0) {
      throw new AppError(`Faltan campos obligatorios: ${faltantes.join(', ')}`, 400)
    }

    if (typeof body.codigo !== 'string' || body.codigo.trim().length === 0) {
      throw new AppError('El código del proyecto debe ser un texto válido', 400)
    }

    if (typeof body.nombre !== 'string' || body.nombre.trim().length === 0) {
      throw new AppError('El nombre del proyecto debe ser un texto válido', 400)
    }

    if (typeof body.ubicacion !== 'string' || body.ubicacion.trim().length === 0) {
      throw new AppError('La ubicación del proyecto debe ser un texto válido', 400)
    }

    if (Number.isNaN(Number(body.cliente_id))) {
      throw new AppError('cliente_id debe ser numérico', 400)
    }

    if (Number.isNaN(Number(body.responsable_id))) {
      throw new AppError('responsable_id debe ser numérico', 400)
    }

    if (Number.isNaN(Number(body.presupuesto_inicial))) {
      throw new AppError('presupuesto_inicial debe ser numérico', 400)
    }

    if (Number.isNaN(Date.parse(body.fecha_inicio_programada))) {
      throw new AppError('fecha_inicio_programada debe ser una fecha válida', 400)
    }

    if (Number.isNaN(Date.parse(body.fecha_fin_programada))) {
      throw new AppError('fecha_fin_programada debe ser una fecha válida', 400)
    }

    return new RegistrarProyectoDto({
      codigo: body.codigo.trim(),
      cliente_id: Number(body.cliente_id),
      nombre: body.nombre.trim(),
      descripcion: body.descripcion ? String(body.descripcion).trim() : null,
      ubicacion: body.ubicacion.trim(),
      fecha_inicio_programada: body.fecha_inicio_programada,
      fecha_fin_programada: body.fecha_fin_programada,
      responsable_id: Number(body.responsable_id),
      presupuesto_inicial: Number(body.presupuesto_inicial),
      observaciones: body.observaciones ? String(body.observaciones).trim() : null,
    })
  }
}
