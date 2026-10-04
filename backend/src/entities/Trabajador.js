/**
 * Entity que representa la tabla `trabajadores` (HU-04, HU-02).
 * `proyectos.responsable_id` referencia esta tabla (no `usuarios`),
 * según las FK del esquema de la entrega.
 */
export class Trabajador {
  constructor({
    id,
    numero_documento,
    tipo_documento,
    nombres,
    apellidos,
    email,
    telefono,
    direccion,
    cargo_id,
    cargo,
    cargo_operativo,
    especialidad_id,
    especialidad,
    disponible,
    estado,
    activo,
    fecha_baja,
  }) {
    this.id = id
    this.numero_documento = numero_documento
    this.tipo_documento = tipo_documento ?? null
    this.nombres = nombres
    this.apellidos = apellidos
    this.email = email ?? null
    this.telefono = telefono ?? null
    this.direccion = direccion ?? null
    // HU-04: `cargo` y `especialidad` llegan del catálogo por el JOIN del
    // repositorio; los ids son los que se guardan al registrar o editar.
    this.cargo_id = cargo_id ?? null
    this.cargo = cargo
    this.cargo_operativo = Number(cargo_operativo) === 1
    this.especialidad_id = especialidad_id ?? null
    this.especialidad = especialidad ?? null
    this.disponible = disponible
    this.estado = estado
    this.activo = activo
    // HU-18: fecha de la baja lógica (null mientras esté activo).
    this.fecha_baja = fecha_baja ?? null
  }

  static fromRow(row) {
    if (!row) return null
    return new Trabajador(row)
  }
}
