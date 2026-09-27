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
    cargo,
    especialidad,
    disponible,
    estado,
    activo,
  }) {
    this.id = id
    this.numero_documento = numero_documento
    this.tipo_documento = tipo_documento ?? null
    this.nombres = nombres
    this.apellidos = apellidos
    this.email = email ?? null
    this.telefono = telefono ?? null
    this.direccion = direccion ?? null
    this.cargo = cargo
    this.especialidad = especialidad ?? null
    this.disponible = disponible
    this.estado = estado
    this.activo = activo
  }

  static fromRow(row) {
    if (!row) return null
    return new Trabajador(row)
  }
}
