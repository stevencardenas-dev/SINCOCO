# HISTORIAS DE USUARIO Y ÉPICAS

---

## ÉPICA 1: Gestión de usuarios y acceso

### HU-01: Control de usuarios y roles
* **Descripción:** Como administrador, quiero registrar usuarios y asignarles un rol, para controlar el acceso al sistema.
* **Criterios de Aceptación:**
  * Se crea el usuario con su respectivo rol asignado.
  * Cada rol visualiza únicamente las funcionalidades acordes a sus permisos.
  * Se permite activar o bloquear un usuario en cualquier momento.

---

## ÉPICA 2: Gestión de proyectos y planificación

### HU-02: Registro de proyectos
* **Descripción:** Como administrador, quiero registrar un proyecto de vivienda, para iniciar su seguimiento en el sistema.
* **Criterios de Aceptación:**
  * Se registran los datos de ubicación, cliente, fechas y estado del proyecto.
  * El proyecto queda disponible para la fase de planificación.

### HU-03: Plan de trabajo (Etapas y Actividades)
* **Descripción:** Como administrador, quiero definir etapas y actividades del plan de trabajo, para organizar la ejecución del proyecto.
* **Criterios de Aceptación:**
  * Cada actividad debe pertenecer a una etapa definida.
  * Cada etapa debe pertenecer a un proyecto existente.

---

## ÉPICA 3: Personal y asignaciones

### HU-04: Registro de personal
* **Descripción:** Como administrador, quiero registrar el personal con su cargo y especialidad, para asignarlo a proyectos.
* **Criterios de Aceptación:**
  * Se registran los datos de contacto, especialidad y fecha de contratación.

### HU-05: Asignación de maestros o responsables
* **Descripción:** Como administrador, quiero asignar un maestro o responsable a un proyecto o actividad, para delegar su ejecución.
* **Criterios de Aceptación:**
  * Se registra la asignación indicando la fecha de inicio.
  * Se define el periodo y fecha fin de la asignación.

### HU-06: Historial de asignaciones de trabajadores
* **Descripción:** Como administrador, quiero consultar el historial de asignaciones de un trabajador, para saber en qué proyectos ha participado y cuándo.
* **Criterios de Aceptación:**
  * Se muestra un listado detallado con el proyecto, fecha de inicio y fecha de finalización.

---

## ÉPICA 4: Inventario de materiales

### HU-07: Catálogo de materiales
* **Descripción:** Como encargado de bodega, quiero registrar materiales en un catálogo, para llevar control de código, categoría, unidad y costo de referencia.
* **Criterios de Aceptación:**
  * El catálogo permite crear, editar y consultar materiales.
  * Se define un nivel mínimo de stock para cada material.

### HU-08: Solicitud de materiales
* **Descripción:** Como maestro de obra, quiero solicitar materiales para mi proyecto, para disponer de ellos en obra.
* **Criterios de Aceptación:**
  * La solicitud queda vinculada al proyecto y al material del catálogo.
  * Se descuenta del inventario únicamente si existe disponibilidad suficiente.

### HU-09: Devolución de materiales sobrantes
* **Descripción:** Como encargado de bodega, quiero registrar la devolución de materiales sobrantes, para actualizar el inventario disponible.
* **Criterios de Aceptación:**
  * La devolución se vincula a una solicitud previa del proyecto.
  * El inventario disponible se actualiza automáticamente.

### HU-19: Ingreso de materiales al inventario
* **Descripción:** Como encargado de bodega, quiero registrar el ingreso de materiales al inventario, para mantener actualizadas las existencias y su costo de referencia.
* **Criterios de Aceptación:**
  * Se registra la cantidad, fecha, proveedor, costo y responsable del ingreso.

### HU-20: Consumo real de materiales
* **Descripción:** Como maestro de obra, quiero registrar el consumo real de materiales por actividad, para reflejar el gasto efectivo del proyecto.
* **Criterios de Aceptación:**
  * El consumo descuenta automáticamente las existencias disponibles.
  * El consumo queda asociado directamente a la actividad y al proyecto.

### HU-26: Salida efectiva de materiales
* **Descripción:** Como encargado de bodega, quiero registrar la salida efectiva de materiales entregados a un proyecto, para llevar control preciso de lo que sale del inventario.
* **Criterios de Aceptación:**
  * La salida queda vinculada a la solicitud previamente aprobada.
  * La salida no puede superar la cantidad solicitada ni las existencias disponibles.

---

## ÉPICA 5: Inventario de herramientas

### HU-10: Catálogo de herramientas
* **Descripción:** Como encargado de bodega, quiero registrar herramientas en un catálogo, para conocer su estado y ubicación.
* **Criterios de Aceptación:**
  * El catálogo permite crear, editar y consultar herramientas con su estado (disponible, en uso, dañada).

### HU-11: Entrega de herramientas a trabajadores
* **Descripción:** Como encargado de bodega, quiero entregar una herramienta a un trabajador, para su uso en un proyecto.
* **Criterios de Aceptación:**
  * La entrega registra el trabajador, la herramienta y la fecha de entrega.
  * La herramienta cambia automáticamente a estado "en uso".

### HU-12: Devolución de herramientas
* **Descripción:** Como encargado de bodega, quiero registrar la devolución de una herramienta, para actualizar su disponibilidad.
* **Criterios de Aceptación:**
  * La herramienta cambia de estado a "disponible".
  * Se registra la fecha exacta de devolución.

### HU-27: Historial de movimientos de herramientas
* **Descripción:** Como encargado de bodega, quiero consultar el historial completo de una herramienta, para conocer todas sus entregas, devoluciones y estados anteriores.
* **Criterios de Aceptación:**
  * Se muestra un listado cronológico de todos los movimientos de la herramienta con sus fechas y responsables.

---

## ÉPICA 6: Proveedores y servicios externos

### HU-13: Registro de proveedores y servicios
* **Descripción:** Como administrador, quiero registrar proveedores y servicios externos, para asociarlos a los proyectos que los requieran.
* **Criterios de Aceptación:**
  * Se registran los datos del proveedor y del encargado de contacto.
  * El servicio se puede asociar a uno o múltiples proyectos.

### HU-28: Detalle de servicios externos contratados
* **Descripción:** Como administrador, quiero registrar el responsable, las fechas y el valor de cada servicio externo contratado, para tener control completo de lo pactado con el proveedor.
* **Criterios de Aceptación:**
  * Se registra el encargado, el proyecto/actividad relacionada, las fechas de inicio y fin, y el valor contratado.

---

## ÉPICA 7: Incidencias de obra

### HU-14: Registro e incidencias de obra
* **Descripción:** Como maestro de obra, quiero registrar una incidencia (avería, accidente o retraso), para dejar constancia y darle seguimiento.
* **Criterios de Aceptación:**
  * La incidencia se vincula directamente al proyecto.
  * Incluye la fecha de ocurrencia, el tipo de incidencia y una descripción detallada.

---

## ÉPICA 8: Costos e indicadores

### HU-15: Consolidación automática de costos
* **Descripción:** Como sistema, quiero consolidar los costos de un proyecto a partir de materiales, herramientas y servicios, para reflejar su costo real.
* **Criterios de Aceptación:**
  * El costo total se calcula de forma automática sin permitir el ingreso manual.

### HU-16: Dashboard de indicadores de proyectos
* **Descripción:** Como gerente, quiero visualizar un dashboard con indicadores de mis proyectos, para hacer seguimiento sin depender de Excel.
* **Criterios de Aceptación:**
  * El dashboard muestra el avance, costo consolidado y las alertas principales por proyecto.

---

## ÉPICA 9: Auditoría y trazabilidad

### HU-17: Registro de auditoría de operaciones
* **Descripción:** Como administrador, quiero consultar quién realizó cada operación crítica y cuándo, para auditar el uso del sistema.
* **Criterios de Aceptación:**
  * Se almacena el usuario, acción, fecha y la entidad afectada para modificaciones en órdenes, planes y asignaciones.

### HU-18: Conservación de historial (Eliminación lógica)
* **Descripción:** Como administrador, quiero que los movimientos no se eliminen físicamente, para conservar el historial completo del proyecto.
* **Criterios de Aceptación:**
  * Los registros eliminados se marcan lógicamente como inactivos y permanecen guardados en la base de datos.

---

## ÉPICA 10: Seguimiento de avance y evidencias

### HU-21: Registro del porcentaje de avance
* **Descripción:** Como maestro de obra, quiero registrar el porcentaje de avance de una actividad, para reflejar el progreso real del proyecto.
* **Criterios de Aceptación:**
  * Se registra el porcentaje de avance con la fecha correspondiente.
  * El porcentaje general del proyecto se recalcula automáticamente en función de sus actividades.

### HU-22: Carga de evidencias de avance
* **Descripción:** Como maestro de obra, quiero adjuntar evidencias (fotos, documentos u observaciones) al avance registrado, para sustentar el progreso reportado.
* **Criterios de Aceptación:**
  * Se permite adjuntar uno o varios archivos/fotografías.
  * Las evidencias quedan asociadas a la actividad y a la fecha de registro.

---

## ÉPICA 11: Alertas del sistema

### HU-23: Alerta de stock mínimo de inventario
* **Descripción:** Como encargado de bodega, quiero recibir una alerta cuando un material llegue a su nivel mínimo, para gestionar oportunamente su reabastecimiento.
* **Criterios de Aceptación:**
  * Se genera una alerta automática cuando las existencias llegan al límite configurado.
  * La alerta se visualiza en el panel principal.

### HU-24: Alerta de actividades atrasadas y herramientas pendientes
* **Descripción:** Como gerente, quiero recibir alertas de actividades atrasadas y herramientas pendientes de devolución, para tomar decisiones oportunas.
* **Criterios de Aceptación:**
  * El sistema detecta y marca automáticamente las actividades vencidas no finalizadas.
  * Se muestra un listado de herramientas que sobrepasaron su tiempo de retorno por trabajador.

---

## ÉPICA 12: Reportes

### HU-25: Generación y exportación de reportes
* **Descripción:** Como gerente, quiero generar reportes filtrados por proyecto, periodo o material, para analizar la información según mis necesidades.
* **Criterios de Aceptación:**
  * Permite aplicar múltiples criterios de filtrado.
  * Los reportes resultantes se pueden exportar a formato PDF o Excel.

---

## ÉPICA 4: Inventario de materiales (continuación)

### HU-29: Traslado de materiales entre almacenes
* **Descripción:** Como encargado de bodega, quiero trasladar materiales entre almacenes (o de un almacén a una obra), para reubicar existencias sin pasar por una compra ni por una salida hacia un proyecto.
* **Criterios de Aceptación:**
  * El traslado descuenta la cantidad del almacén de origen y la suma al almacén de destino.
  * No se puede trasladar más cantidad de la existente en el almacén de origen.
  * El traslado queda registrado con responsable y fecha para trazabilidad.

### HU-30: Solicitud de herramientas
* **Descripción:** Como maestro de obra, quiero solicitar herramientas para mis trabajadores al inventario para gestionar el préstamo más eficientemente
* **Criterios de Aceptación:**
  * La solicitud debe mostrar únicamente herramientas con disponibilidad real en el catálogo.
  * Debe registrar la herramienta, el trabajador destinatario, el proyecto, la fecha de solicitud y la fecha requerida.
  * El estado de la solicitud debe transitar entre pendiente, aprobada, rechazada y atendida.
  * Todo rechazo debe registrar una observación obligatoria que justifique la decisión.
