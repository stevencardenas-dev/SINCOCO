/**
 * Entity que representa la tabla `trabajadores` (HU-02).
 * `proyectos.responsable_id` referencia esta tabla (no `usuarios`),
 * según las FK del esquema de la entrega.
 */
export class Trabajador {
  constructor({ id, numero_documento, nombres, apellidos, cargo, disponible, estado, activo }) {
    this.id = id
    this.numero_documento = numero_documento
    this.nombres = nombres
    this.apellidos = apellidos
    this.cargo = cargo
    this.disponible = disponible
    this.estado = estado
    this.activo = activo
  }

  static fromRow(row) {
    if (!row) return null
    return new Trabajador(row)
  }
}
