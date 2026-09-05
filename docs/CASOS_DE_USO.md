# Casos de uso

Derivados de las historias de usuario del `PRODUCT BACKLOG`. Un caso de uso por HU, mismo ID.

---

## Épica 1: Gestión de usuarios y acceso

### CU-01 (HU-01): Registrar usuario y asignar rol
- **Actor:** Administrador
- **Precondición:** el rol a asignar ya existe.
- **Flujo principal:** el administrador ingresa los datos del usuario, selecciona un rol, el sistema crea la cuenta activa.
- **Flujos alternos:** documento/correo duplicado → error de validación; administrador bloquea o activa un usuario existente.

---

## Épica 2: Gestión de proyectos y planificación

### CU-02 (HU-02): Registrar proyecto
- **Actor:** Administrador
- **Flujo principal:** ingresa ubicación, cliente, fechas y estado inicial; el proyecto queda en estado `PLANIFICACION`.

### CU-03 (HU-03): Definir plan de trabajo (etapas y actividades)
- **Actor:** Administrador
- **Precondición:** el proyecto existe.
- **Flujo principal:** crea etapas ordenadas dentro del proyecto y actividades dentro de cada etapa.
- **Flujo alterno:** intento de crear actividad sin etapa válida → rechazado.

---

## Épica 3: Personal y asignaciones

### CU-04 (HU-04): Registrar personal
- **Actor:** Administrador
- **Flujo principal:** registra datos de contacto, cargo, especialidad y fecha de contratación de un trabajador.

### CU-05 (HU-05): Asignar responsable a proyecto/actividad
- **Actor:** Administrador
- **Flujo principal:** selecciona trabajador, proyecto o actividad y fecha de inicio; el sistema registra la asignación como `ACTIVO`.
- **Flujo alterno:** define fecha fin programada para cerrar el periodo.

### CU-06 (HU-06): Consultar historial de asignaciones
- **Actor:** Administrador
- **Flujo principal:** busca un trabajador y visualiza el listado de proyectos, fechas de inicio y fin.

---

## Épica 4: Inventario de materiales

### CU-07 (HU-07): Mantener catálogo de materiales
- **Actor:** Encargado de bodega
- **Flujo principal:** crea/edita/consulta materiales con código, categoría, unidad, costo de referencia y nivel mínimo.

### CU-08 (HU-08): Solicitar materiales
- **Actor:** Maestro de obra
- **Precondición:** el proyecto y el material existen.
- **Flujo principal:** solicita cantidad de un material para el proyecto.
- **Flujo alterno:** existencia insuficiente → solicitud no se descuenta del inventario.

### CU-09 (HU-09): Devolver materiales sobrantes
- **Actor:** Encargado de bodega
- **Precondición:** existe una solicitud previa del proyecto.
- **Flujo principal:** registra la devolución vinculada a la solicitud; el inventario disponible se actualiza.

### CU-19 (HU-19): Ingresar materiales al inventario
- **Actor:** Encargado de bodega
- **Flujo principal:** registra cantidad, fecha, proveedor, costo y responsable de un ingreso de mercancía.

### CU-20 (HU-20): Registrar consumo real de materiales
- **Actor:** Maestro de obra
- **Flujo principal:** registra el consumo de un material en una actividad; las existencias se descuentan automáticamente.

### CU-26 (HU-26): Registrar salida efectiva de materiales
- **Actor:** Encargado de bodega
- **Precondición:** existe una solicitud aprobada.
- **Flujo principal:** despacha materiales vinculados a la solicitud.
- **Flujo alterno:** cantidad despachada mayor a la solicitada o a existencias → rechazado.

---

## Épica 5: Inventario de herramientas

### CU-10 (HU-10): Mantener catálogo de herramientas
- **Actor:** Encargado de bodega
- **Flujo principal:** crea/edita/consulta herramientas con estado (disponible, en uso, dañada) y ubicación.

### CU-11 (HU-11): Entregar herramienta a trabajador
- **Actor:** Encargado de bodega
- **Flujo principal:** registra trabajador, herramienta y fecha de entrega; la herramienta pasa a estado `en uso`.

### CU-12 (HU-12): Registrar devolución de herramienta
- **Actor:** Encargado de bodega
- **Flujo principal:** registra fecha de devolución; la herramienta vuelve a estado `disponible`.

### CU-27 (HU-27): Consultar historial de movimientos de herramienta
- **Actor:** Encargado de bodega
- **Flujo principal:** consulta el listado cronológico de entregas/devoluciones/estados de una herramienta.

---

## Épica 6: Proveedores y servicios externos

### CU-13 (HU-13): Registrar proveedores y servicios
- **Actor:** Administrador
- **Flujo principal:** registra datos del proveedor y contacto; asocia servicios a uno o más proyectos.

### CU-28 (HU-28): Registrar detalle de servicio externo contratado
- **Actor:** Administrador
- **Flujo principal:** registra encargado, proyecto/actividad, fechas y valor del servicio contratado.

---

## Épica 7: Incidencias de obra

### CU-14 (HU-14): Registrar incidencia de obra
- **Actor:** Maestro de obra
- **Flujo principal:** registra tipo, fecha y descripción de la incidencia vinculada al proyecto.

---

## Épica 8: Costos e indicadores

### CU-15 (HU-15): Consolidar costos del proyecto
- **Actor:** Sistema
- **Flujo principal:** al registrarse movimientos de materiales/herramientas/servicios, el sistema recalcula el costo total del proyecto.
- **Restricción:** no permite edición manual del costo consolidado.

### CU-16 (HU-16): Visualizar dashboard de seguimiento
- **Actor:** Gerente
- **Flujo principal:** consulta avance general, costos consolidados y alertas por proyecto.

---

## Épica 9: Auditoría y trazabilidad

### CU-17 (HU-17): Consultar auditoría de operaciones
- **Actor:** Administrador
- **Flujo principal:** consulta usuario, acción, fecha y entidad afectada de operaciones críticas.

### CU-18 (HU-18): Conservar historial (eliminación lógica)
- **Actor:** Sistema
- **Flujo principal:** al eliminar un registro, se marca como inactivo en vez de borrarse físicamente.

---

## Épica 10: Seguimiento de avance y evidencias

### CU-21 (HU-21): Registrar porcentaje de avance
- **Actor:** Maestro de obra
- **Flujo principal:** registra el nuevo porcentaje de avance de una actividad con fecha; el avance del proyecto se recalcula.

### CU-22 (HU-22): Adjuntar evidencias de avance
- **Actor:** Maestro de obra
- **Precondición:** existe un registro de avance.
- **Flujo principal:** adjunta uno o más archivos asociados a la actividad y fecha de avance.

---

## Épica 11: Alertas del sistema

### CU-23 (HU-23): Alertar stock mínimo
- **Actor:** Sistema → Encargado de bodega
- **Flujo principal:** al llegar la existencia al nivel mínimo, se genera alerta visible en el dashboard.

### CU-24 (HU-24): Alertar actividades atrasadas y herramientas pendientes
- **Actor:** Sistema → Gerente
- **Flujo principal:** detecta actividades vencidas no finalizadas y herramientas fuera de plazo; las lista para el gerente.

---

## Épica 12: Reportes

### CU-25 (HU-25): Generar y exportar reportes
- **Actor:** Gerente
- **Flujo principal:** aplica filtros (proyecto, periodo, material) y exporta el resultado a PDF o Excel.
