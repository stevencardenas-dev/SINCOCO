---
title: "SINCOCO — Historias de Usuario Refinadas y Criterios de Aceptación"
lang: es
---

# Historias de Usuario Refinadas

Transcripción del anexo **«Historias Usuario Refinadas»** de la
*Primera Entrega*, que es el documento oficial frente al cual se evalúa
el proyecto. Cubre las **30 HU** con su épica, narrativa, prioridad,
estimación, sprint planificado y criterios de aceptación. Al final se agregan
las **HU-31 a HU-41**, posteriores a la Primera Entrega.

> **Fuente de verdad.** Ante cualquier discrepancia entre este archivo y otros
> documentos del repositorio, prevalece la Primera Entrega. Las columnas de
> prioridad, estimación y sprint provienen de ella sin modificación.

La priorización ampliada está en `BACKLOG_PRIORIZADO.md`; la cadena
problema→proceso→RF→CU→HU→sprint, en `TRAZABILIDAD.md`.

---


## EP-01: Gestión de usuarios y acceso


### HU-01

* **Historia de Usuario:** Como administrador, quiero registrar usuarios y asignarles un rol, para controlar el acceso al sistema.
* **Prioridad:** Muy Alta
* **Estimación:** 5
* **Sprint:** 1
* **Criterios de Aceptación:**
  * El usuario debe estar vinculado a un trabajador y a un único rol activo (usuarios: trabajador_id, rol_id).
  * El nombre de usuario y el correo deben ser únicos; el sistema valida la unicidad antes de guardar.
  * La contraseña se almacena cifrada (password_hash) y debe cumplir una política mínima de seguridad.
  * Los permisos del usuario están determinados por los permisos asociados a su rol (roles_permisos), no se asignan de forma individual.
  * Un usuario en estado inactivo no puede autenticarse ni ejecutar acciones en el sistema.
  * Toda creación, edición o cambio de estado del usuario queda registrado en la bitácora de trazabilidad.

---

## EP-02: Gestión de proyectos y planificación


### HU-02

* **Historia de Usuario:** Como administrador, quiero registrar un proyecto de vivienda, para iniciar su seguimiento en el sistema.
* **Prioridad:** Muy Alta
* **Estimación:** 3
* **Sprint:** 1
* **Criterios de Aceptación:**
  * El proyecto requiere un cliente_id y un responsable_id válidos y existentes.
  * presupuesto_inicial debe ser numérico y mayor a cero.
  * fecha_inicio_programada debe ser estrictamente anterior a fecha_fin_programada.
  * Al crearse, el proyecto queda en el estado inicial definido para planificación y con porcentaje_avance_total en cero.
  * Un proyecto recién creado debe quedar disponible para asociarle etapas, actividades, personal, materiales, herramientas y proveedores.

### HU-03

* **Historia de Usuario:** Como administrador, quiero definir etapas y actividades del plan de trabajo, para organizar la ejecución del proyecto.
* **Prioridad:** Muy Alta
* **Estimación:** 5
* **Sprint:** 1
* **Criterios de Aceptación:**
  * Toda actividad debe pertenecer a una etapa existente (etapa_id) y toda etapa debe pertenecer a un proyecto existente (proyecto_id).
  * Las etapas deben contar con un campo de orden que permita establecer su secuencia dentro del proyecto.
  * Las fechas programadas de etapas y actividades deben mantenerse dentro del rango de fechas del proyecto.
  * Cada actividad debe permitir definir un responsable, una descripción y un peso porcentual respecto al avance de su etapa.
  * El estado inicial de etapas y actividades corresponde a un estado pendiente o no iniciado.

---

## EP-03: Personal y asignaciones


### HU-04

* **Historia de Usuario:** Como administrador, quiero registrar el personal con su cargo y especialidad, para asignarlo a proyectos.
* **Prioridad:** Muy Alta
* **Estimación:** 3
* **Sprint:** 1
* **Criterios de Aceptación:**
  * numero_documento debe ser único en la tabla trabajadores.
  * cargo es un campo obligatorio; especialidad es obligatoria cuando el cargo corresponde a personal operativo.
  * Al crearse, el trabajador queda con disponible en verdadero y estado activo.
  * Los trabajadores dados de baja lógica (activo = falso, fecha_baja registrada) no pueden ser asignados a nuevos proyectos o actividades.

### HU-05

* **Historia de Usuario:** Como administrador, quiero asignar un maestro o responsable a un proyecto o actividad, para delegar su ejecución.
* **Prioridad:** Intermedia
* **Estimación:** 3
* **Sprint:** 2
* **Criterios de Aceptación:**
  * asignaciones_personal debe registrar trabajador_id, proyecto_id y, cuando aplique, actividad_id, junto con fecha_inicio y fecha_fin_programada.
  * El sistema debe validar el solapamiento de fechas entre asignaciones activas del mismo trabajador antes de confirmar una nueva.
  * El estado de la asignación debe reflejar si está vigente, finalizada o cancelada.
  * Al registrarse la fecha_fin_real de la asignación, el trabajador debe quedar nuevamente disponible.

### HU-06

* **Historia de Usuario:** Como administrador, quiero consultar el historial de asignaciones de un trabajador, para saber en qué proyectos ha participado y cuándo.
* **Prioridad:** Baja
* **Estimación:** 2
* **Sprint:** 3
* **Criterios de Aceptación:**
  * La consulta debe listar cada registro de asignaciones_personal del trabajador ordenado por fecha de inicio.
  * Debe mostrar rol_en_proyecto, fechas programadas y reales, y estado de cada asignación.
  * Debe permitir exportar el historial a un formato de documento (por ejemplo PDF).
  * Los proyectos dados de baja lógica solo deben mostrarse cuando se active explícitamente un filtro que incluya registros inactivos.

---

## EP-04: Inventario de materiales


### HU-07

* **Historia de Usuario:** Como encargado de bodega, quiero registrar materiales en un catálogo, para llevar control de código, categoría, unidad y costo de referencia.
* **Prioridad:** Muy Alta
* **Estimación:** 3
* **Sprint:** 2
* **Criterios de Aceptación:**
  * codigo debe ser único, alfanumérico y obligatorio para cada material.
  * Todo material requiere una categoria_id y una unidad_medida válidas.
  * nivel_minimo es configurable por material y constituye el umbral usado para generar alertas de stock.
  * existencia_total se inicializa en cero y solo puede modificarse mediante los procesos de entrada, salida, traslado o devolución de inventario.

### HU-08

* **Historia de Usuario:** Como maestro de obra, quiero solicitar materiales para mi proyecto, para disponer de ellos en obra.
* **Prioridad:** Muy Alta
* **Estimación:** 5
* **Sprint:** 3
* **Criterios de Aceptación:**
  * Toda solicitud debe asociarse a proyecto_id, actividad_id y al usuario que la solicita.
  * Cada línea de detalle debe registrar cantidad_solicitada y, tras la revisión de bodega, cantidad_aprobada y cantidad_despachada.
  * El estado de la solicitud debe transitar entre pendiente, aprobada (total o parcial), despachada y rechazada.
  * El sistema debe notificar a bodega al momento en que se genera la solicitud.

### HU-09

* **Historia de Usuario:** Como encargado de bodega, quiero registrar la devolución de materiales sobrantes, para actualizar el inventario disponible.
* **Prioridad:** Muy baja
* **Estimación:** 3
* **Sprint:** 4
* **Criterios de Aceptación:**
  * Toda devolución debe referenciar el almacén de destino, el proyecto y la actividad de origen, y cuando aplique, la salida que la originó.
  * Al confirmarse una devolución válida, el trigger trg_devolucion_suma_existencia debe sumar la cantidad devuelta a materiales.existencia_total.
  * El motivo de la devolución es un campo obligatorio.
  * El sistema debe registrar quién entrega y quién recibe el material devuelto.

### HU-19

* **Historia de Usuario:** Como encargado de bodega, quiero registrar el ingreso de materiales al inventario, para mantener actualizadas las existencias y su costo de referencia.
* **Prioridad:** Alta
* **Estimación:** 5
* **Sprint:** 3
* **Criterios de Aceptación:**
  * Toda entrada debe registrar almacén, proveedor, responsable, número de factura o remisión y costo total.
  * Cada línea de detalle debe registrar cantidad y costo unitario por material.
  * El trigger trg_entrada_suma_existencia debe sumar la cantidad ingresada a la existencia total del material.
  * Cuando la entrada proviene de una orden de compra, debe actualizarse la cantidad recibida y el estado de dicha orden.

### HU-20

* **Historia de Usuario:** Como maestro de obra, quiero registrar el consumo real de materiales por actividad, para reflejar el gasto efectivo del proyecto.
* **Prioridad:** Muy baja
* **Estimación:** 5
* **Sprint:** 4
* **Criterios de Aceptación:**
  * El consumo registrado no puede superar la cantidad efectivamente despachada a la actividad.
  * Todo registro de consumo debe asociarse a la actividad y al material correspondientes.
  * La anulación de un consumo ya registrado requiere aprobación de un usuario con rol administrador.
  * El costo del consumo registrado debe reflejarse en la consolidación de costos del proyecto.

### HU-26

* **Historia de Usuario:** Como encargado de bodega, quiero registrar la salida efectiva de materiales entregados a un proyecto, para llevar control preciso de lo que sale del inventario.
* **Prioridad:** Alta
* **Estimación:** 5
* **Sprint:** 4
* **Criterios de Aceptación:**
  * Toda salida debe validar que exista existencia suficiente antes de confirmarse.
  * El registro de salida debe indicar almacén de origen, proyecto, actividad, material, cantidad despachada y costo unitario al momento de la salida.
  * El proceso de descuento de existencia debe reducir la existencia total del material en la cantidad despachada.
  * El sistema debe registrar quién despacha y a quién se entrega el material.

### HU-29

* **Historia de Usuario:** Como encargado de bodega, quiero trasladar materiales entre almacenes, para reubicar existencias sin pasar por una compra ni por una salida hacia un proyecto.
* **Prioridad:** Baja
* **Estimación:** 5
* **Sprint:** 3
* **Criterios de Aceptación:**
  * Todo traslado debe indicar un almacén de origen y uno de destino, obligatorios y distintos entre sí.
  * La operación debe validar existencia suficiente en el almacén de origen antes de confirmarse.
  * El costo del material trasladado se reasigna según el almacén o proyecto de destino.
  * Debe generarse un comprobante o registro consecutivo del traslado, indicando el responsable que lo ejecuta.

---

## EP-05: Inventario de herramientas


### HU-10

* **Historia de Usuario:** Como encargado de bodega, quiero registrar herramientas en un catálogo, para conocer su estado y ubicación.
* **Prioridad:** Alta
* **Estimación:** 3
* **Sprint:** 2
* **Criterios de Aceptación:**
  * codigo_serial debe ser único y obligatorio para cada herramienta.
  * Toda herramienta debe asociarse a un almacén (almacen_id).
  * estado_operativo y disponibilidad deben reflejar si la herramienta puede ser prestada.
  * Las herramientas dadas de baja no deben aparecer como disponibles para préstamo.

### HU-11

* **Historia de Usuario:** Como encargado de bodega, quiero entregar una herramienta a un trabajador, para su uso en un proyecto.
* **Prioridad:** Alta
* **Estimación:** 3
* **Sprint:** 3
* **Criterios de Aceptación:**
  * prestamos_herramientas debe registrar herramienta_id, trabajador_id, proyecto_id, quien entrega y la fecha del préstamo.
  * Al registrarse el préstamo, la disponibilidad de la herramienta cambia a prestada.
  * La fecha estimada de devolución es obligatoria.
  * El sistema debe dejar constancia de las condiciones de entrega (observaciones o comprobante).

### HU-12

* **Historia de Usuario:** Como encargado de bodega, quiero registrar la devolución de una herramienta, para actualizar su disponibilidad.
* **Prioridad:** Intermedia
* **Estimación:** 3
* **Sprint:** 3
* **Criterios de Aceptación:**
  * El registro de devolución debe capturar la condición de entrada (bueno, regular, dañado) y la fecha real de devolución.
  * Cuando la condición registrada es dañada, el sistema exige una observación y genera un registro en incidencias.
  * Al cerrarse el préstamo, la disponibilidad de la herramienta debe actualizarse según el resultado de la devolución (disponible o en reparación).
  * Debe registrarse el usuario que recibe la devolución.

### HU-27

* **Historia de Usuario:** Como encargado de bodega, quiero consultar el historial completo de una herramienta, para conocer todas sus entregas, devoluciones y estados anteriores.
* **Prioridad:** Muy baja
* **Estimación:** 2
* **Sprint:** 4
* **Criterios de Aceptación:**
  * El historial debe construirse a partir de los préstamos asociados a la herramienta.
  * Debe mostrar el trabajador, el proyecto, las fechas de préstamo y devolución, y el estado de entrega y devolución de cada movimiento.
  * Debe reflejar los cambios relevantes en el estado operativo de la herramienta, incluyendo envíos a reparación.
  * La información debe permitir identificar patrones de uso que apoyen decisiones de mantenimiento.

### HU-30

* **Historia de Usuario:** Como maestro de obra, quiero solicitar herramientas para mis trabajadores al inventario para gestionar el préstamo más eficientemente
* **Prioridad:** Alta
* **Estimación:** 5
* **Sprint:** 2
* **Criterios de Aceptación:**
  * La solicitud debe mostrar únicamente herramientas con disponibilidad real en el catálogo.
  * Debe registrar la herramienta, el trabajador destinatario, el proyecto, la fecha de solicitud y la fecha requerida.
  * El estado de la solicitud debe transitar entre pendiente, aprobada, rechazada y atendida.
  * Todo rechazo debe registrar una observación obligatoria que justifique la decisión.

---

## EP-06: Proveedores y servicios externos


### HU-13

* **Historia de Usuario:** Como administrador, quiero registrar proveedores y servicios externos, para asociar los servicios a los proyectos que los requieran y adquirir insumos de los proveedores.
* **Prioridad:** Alta
* **Estimación:** 3
* **Sprint:** 2
* **Criterios de Aceptación:**
  * documento_identificacion debe ser único y validarse en su formato.
  * razon_social y los datos de contacto son campos obligatorios.
  * El proveedor debe permitir adjuntar documentos de soporte (certificados, pólizas, entre otros).
  * Únicamente proveedores en estado activo pueden asociarse a nuevas órdenes de compra o servicios externos.

### HU-28

* **Historia de Usuario:** Como administrador, quiero registrar el responsable, las fechas y el valor de cada servicio externo contratado, para tener control completo de lo pactado con el proveedor.
* **Prioridad:** Baja
* **Estimación:** 3
* **Sprint:** 2
* **Criterios de Aceptación:**
  * Todo servicio externo debe asociarse obligatoriamente a un proveedor, un proyecto y una actividad.
  * Debe registrar fecha de inicio, fecha de fin y valor contratado.
  * El valor del servicio debe sumarse a la consolidación de costos del proyecto.
  * El sistema debe validar el valor contratado frente al presupuesto asignado a la actividad y advertir cuando lo exceda.

---

## EP-07: Incidencias de obra


### HU-14

* **Historia de Usuario:** Como maestro de obra, quiero registrar una incidencia (avería, accidente o retraso), para dejar constancia y darle seguimiento.
* **Prioridad:** Baja
* **Estimación:** 3
* **Sprint:** 2
* **Criterios de Aceptación:**
  * Toda incidencia requiere proyecto_id, título, descripción y severidad.
  * Debe permitir asociar la incidencia a una actividad cuando corresponda.
  * El estado de la incidencia debe permitir seguimiento hasta el registro de su fecha de resolución.
  * Las incidencias de severidad alta deben generar una notificación automática al responsable correspondiente.

---

## EP-08: Costos e indicadores


### HU-15

* **Historia de Usuario:** Como sistema, quiero consolidar los costos de un proyecto a partir de materiales y servicios externos, para reflejar su costo real.
* **Prioridad:** Intermedia
* **Estimación:** 8
* **Sprint:** 4
* **Criterios de Aceptación:**
  * El costo real del proyecto se calcula a partir de los materiales despachados (cantidad y costo unitario al momento), los servicios externos contratados (valor_contratado) y las órdenes de compra asociadas.
  * El sistema debe mostrar el porcentaje de desviación frente al presupuesto_inicial del proyecto.
  * La consolidación debe poder ejecutarse bajo demanda o de forma programada.
  * Los valores consolidados deben quedar disponibles para su uso en el dashboard y en los reportes.

### HU-16

* **Historia de Usuario:** Como gerente, quiero visualizar un dashboard con indicadores de mis proyectos, para hacer seguimiento sin depender de Excel.
* **Prioridad:** Muy baja
* **Estimación:** 8
* **Sprint:** 4
* **Criterios de Aceptación:**
  * El dashboard debe reflejar el porcentaje de avance total y el estado de cada proyecto del usuario.
  * Debe incluir las alertas activas relevantes para el rol que consulta.
  * Debe permitir filtrar la información por proyecto, rango de fechas o estado.
  * El tiempo de carga de los indicadores debe ser adecuado para su uso operativo diario.

---

## EP-09: Auditoría y trazabilidad


### HU-17

* **Historia de Usuario:** Como administrador, quiero consultar quién realizó cada operación crítica y cuándo, para auditar el uso del sistema.
* **Prioridad:** Intermedia
* **Estimación:** 5
* **Sprint:** 2
* **Criterios de Aceptación:**
  * Cada operación crítica debe registrar en la bitácora de trazabilidad el usuario, la acción realizada, la tabla y el registro afectado, y la fecha.
  * El registro de auditoría debe ser de solo lectura e inmutable.
  * El acceso a la auditoría debe restringirse a los roles con permiso específico para ello.
  * La consulta debe permitir filtrar por usuario, tabla afectada y rango de fechas.

### HU-18

* **Historia de Usuario:** Como administrador, quiero que los movimientos no se eliminen físicamente, para conservar el historial completo del proyecto.
* **Prioridad:** Intermedia
* **Estimación:** 3
* **Sprint:** 1
* **Criterios de Aceptación:**
  * Ninguna operación de eliminación sobre entidades de negocio debe ejecutar un borrado físico; debe actualizar el estado de actividad, la fecha de baja y el usuario que la ejecuta.
  * Los registros inactivos no deben aparecer por defecto en listas de selección activa.
  * Las relaciones hacia registros dados de baja deben mantenerse íntegras para preservar la trazabilidad histórica.
  * Debe existir un filtro explícito para consultar los registros inactivos o archivados cuando se requiera.

---

## EP-10: Seguimiento de avance y evidencias


### HU-21

* **Historia de Usuario:** Como maestro de obra, quiero registrar el porcentaje de avance de una actividad, para reflejar el progreso real del proyecto.
* **Prioridad:** Alta
* **Estimación:** 5
* **Sprint:** 2
* **Criterios de Aceptación:**
  * El porcentaje de avance debe estar entre 0 y 100.
  * Cada registro debe conservar el porcentaje anterior y el nuevo para efectos de trazabilidad.
  * Al alcanzar el 100%, el estado de la actividad debe cambiar automáticamente a completada.
  * El avance de la etapa y del proyecto se calcula mediante el promedio ponderado del peso definido para cada actividad.

### HU-22

* **Historia de Usuario:** Como maestro de obra, quiero adjuntar evidencias (fotos, documentos u observaciones) al avance registrado, para sustentar el progreso reportado.
* **Prioridad:** Muy baja
* **Estimación:** 3
* **Sprint:** 3
* **Criterios de Aceptación:**
  * Toda evidencia debe asociarse a un registro de seguimiento de avance existente.
  * Solo deben aceptarse los formatos y tamaños de archivo definidos por el sistema.
  * Las evidencias cargadas deben quedar visibles en el detalle del avance y en el dashboard gerencial.
  * El sistema debe conservar el tipo de archivo y la fecha en que fue cargado.

---

## EP-11: Alertas del sistema


### HU-23

* **Historia de Usuario:** Como encargado de bodega, quiero recibir una alerta cuando un material llegue a su nivel mínimo, para gestionar oportunamente su reabastecimiento.
* **Prioridad:** Baja
* **Estimación:** 3
* **Sprint:** 4
* **Criterios de Aceptación:**
  * El nivel mínimo debe ser configurable de forma independiente para cada material.
  * El proceso de descuento de existencia debe evaluar el stock resultante tras cada salida y generar la alerta correspondiente cuando aplique.
  * La alerta debe registrar tipo, referencia al material afectado y fecha de generación, permaneciendo no atendida hasta su gestión.
  * No deben generarse alertas duplicadas para un mismo material mientras exista una pendiente.

### HU-24

* **Historia de Usuario:** Como gerente, quiero recibir alertas de actividades atrasadas y herramientas pendientes de devolución, para tomar decisiones oportunas.
* **Prioridad:** Baja
* **Estimación:** 5
* **Sprint:** 3
* **Criterios de Aceptación:**
  * Una actividad se considera atrasada cuando su fecha fin programada es anterior a la fecha actual y su porcentaje de avance es menor a 100.
  * Un préstamo se considera vencido cuando su fecha estimada de devolución ya pasó y no existe fecha real de devolución registrada.
  * Las alertas deben distinguir su tipo (actividad atrasada, herramienta vencida) y su nivel de severidad.
  * El sistema debe permitir enviar un recordatorio al responsable directamente desde la alerta.

---

## EP-12: Reportes


### HU-25

* **Historia de Usuario:** Como gerente, quiero generar reportes filtrados por proyecto, periodo o material, para analizar la información según mis necesidades.
* **Prioridad:** Muy baja
* **Estimación:** 8
* **Sprint:** 4
* **Criterios de Aceptación:**
  * El reporte debe permitir filtrar por rango de fechas, proyecto y tipo de recurso (materiales, herramientas, personal o servicios).
  * Debe soportar la exportación a formatos estándar como Excel y PDF.
  * El reporte generado debe incluir un encabezado con los filtros aplicados y la fecha de generación.
  * La información del reporte debe ser consistente con los datos consolidados en el sistema al momento de generarse.

---

# Ampliación posterior a la Primera Entrega (HU-31 a HU-41)

Historias agregadas al backlog **después** de la Primera Entrega. No forman
parte del anexo oficial; amplían o completan funcionalidad de las HU-01 a HU-30.
Prioridad, estimación y sprint son **propuestos** y están pendientes de
validación del equipo; el reparto por sprint y responsable está en
`ASIGNACIONES_SPRINTS.md`. Las HU-35 y HU-36 se documentan como extensión de
HU-12 y HU-08: sus criterios cubren solo lo nuevo.

---

## EP-03: Personal y asignaciones

### HU-31

* **Historia de Usuario:** Como administrador, quiero extender la fecha fin de asignación de un trabajador en una actividad, para mantenerlo vinculado cuando el trabajo requiera más tiempo sin romper el historial.
* **Prioridad:** Intermedia
* **Estimación:** 3
* **Sprint:** 2
* **Criterios de Aceptación:**
  * Solo se puede extender una asignación vigente; las asignaciones finalizadas o canceladas no admiten extensión (se debe crear una nueva asignación, HU-05).
  * La nueva fecha_fin_programada debe ser posterior a la vigente y quedar dentro del rango de fechas de la actividad y del proyecto.
  * La extensión se registra como un evento propio (fecha fin anterior, fecha fin nueva, motivo obligatorio, usuario y fecha de registro) sin sobrescribir ni eliminar la asignación original.
  * El sistema valida el solapamiento con otras asignaciones activas del trabajador para el periodo extendido, con la misma regla de HU-05.
  * El historial de asignaciones (HU-06) debe mostrar la fecha fin original y cada extensión aplicada.
  * Toda extensión queda registrada en la bitácora de trazabilidad.

### HU-33

* **Historia de Usuario:** Como administrador, quiero filtrar trabajadores por especialidad y estado de disponibilidad en tiempo real, para asignar rápidamente al personal calificado que esté libre.
* **Prioridad:** Alta
* **Estimación:** 3
* **Sprint:** 2
* **Criterios de Aceptación:**
  * La consulta debe permitir filtrar por especialidad y por estado de disponibilidad (disponible o asignado).
  * La disponibilidad se calcula en el momento de la consulta a partir de las asignaciones vigentes, no de un valor almacenado desactualizado.
  * Opcionalmente se puede indicar un rango de fechas para listar solo a los trabajadores sin asignaciones solapadas en ese periodo.
  * Los trabajadores dados de baja lógica no aparecen en el resultado.
  * Los trabajadores sin especialidad definida no aparecen al filtrar por especialidad, según la advertencia de CU-04.
  * Desde el resultado se puede iniciar la asignación del trabajador seleccionado (HU-05).

---

## EP-06: Proveedores y servicios externos

### HU-32

* **Historia de Usuario:** Como gerente, quiero recibir una notificación cuando la contratación de un servicio externo exceda el presupuesto de la actividad, para autorizar o reajustar el monto antes de confirmar.
* **Prioridad:** Alta
* **Estimación:** 3
* **Sprint:** 3
* **Criterios de Aceptación:**
  * Cuando el valor_contratado de un servicio externo (HU-28) supera el presupuesto de la actividad, el servicio queda en estado pendiente de autorización y no se suma a la consolidación de costos (HU-15) hasta ser autorizado.
  * El sistema genera una notificación al gerente con el servicio, el proveedor, la actividad, el presupuesto disponible, el valor contratado y el exceso.
  * El gerente puede autorizar el servicio o rechazarlo para que se reajuste el monto; la decisión registra usuario, fecha y observación, obligatoria en caso de rechazo.
  * Al reajustarse el monto, el sistema vuelve a evaluarlo contra el presupuesto de la actividad.
  * Este criterio sustituye la simple advertencia de HU-28 cuando existe exceso.

### HU-41

* **Historia de Usuario:** Como administrador, quiero calificar la puntualidad y calidad de cada servicio o entrega contratada, para generar una métrica histórica que ayude a elegir mejores proveedores en futuros proyectos.
* **Prioridad:** Muy baja
* **Estimación:** 3
* **Sprint:** 3
* **Criterios de Aceptación:**
  * Solo se puede calificar un servicio externo finalizado (HU-28) o una entrega recibida de una orden de compra (HU-19); cada uno admite una única calificación.
  * La calificación incluye puntualidad y calidad en una escala de 1 a 5, y un comentario opcional que es obligatorio cuando algún puntaje es 2 o menor.
  * Las calificaciones no se eliminan; una corrección queda registrada en la bitácora de trazabilidad.
  * El proveedor debe mostrar su promedio histórico por criterio y el número de calificaciones en el catálogo de proveedores (HU-13) y al seleccionarlo para nuevas órdenes o servicios.
  * La calificación de puntualidad muestra como referencia la fecha pactada y la fecha real de cumplimiento.

---

## EP-02: Gestión de proyectos y planificación

### HU-34

* **Historia de Usuario:** Como administrador, quiero reajustar las fechas programadas de una etapa o actividad ante imprevistos, para recalcular el cronograma total del proyecto sin perder las fechas originales.
* **Prioridad:** Alta
* **Estimación:** 5
* **Sprint:** 2
* **Criterios de Aceptación:**
  * Las fechas programadas originales se conservan de forma inmutable desde la primera reprogramación; el cronograma vigente usa las fechas reprogramadas.
  * Cada reprogramación registra motivo obligatorio, usuario, fecha de registro, fechas anteriores y fechas nuevas.
  * Al reprogramar una etapa, el sistema recalcula las etapas posteriores manteniendo su orden y sin solapamientos, según las reglas de HU-03.
  * Si el recálculo excede la fecha fin programada del proyecto, el sistema advierte y exige confirmación explícita; al confirmar, la fecha fin del proyecto también se reprograma conservando la original.
  * No se pueden reprogramar etapas o actividades ya completadas.
  * El sistema lista las asignaciones de personal que quedan fuera de las nuevas fechas de la actividad sin modificarlas automáticamente (la extensión se gestiona con HU-31).
  * Las alertas de atraso (HU-24) se evalúan contra las fechas vigentes.

### HU-38

* **Historia de Usuario:** Como gerente, quiero congelar un proyecto pausado o finalizar uno concluido, para restringir la asignación de personal, salidas de inventario y nuevos costos asociados.
* **Prioridad:** Intermedia
* **Estimación:** 5
* **Sprint:** 4
* **Criterios de Aceptación:**
  * El proyecto transita entre los estados planificación, en ejecución, congelado y finalizado. Se puede congelar desde en ejecución, reanudar desde congelado y finalizar desde en ejecución o congelado.
  * Todo cambio de estado exige motivo y registra usuario y fecha en la bitácora de trazabilidad.
  * Un proyecto congelado o finalizado no admite nuevas asignaciones de personal, solicitudes ni salidas de materiales, préstamos de herramientas, servicios externos ni consumos; sí admite consulta.
  * Finalizar es irreversible y exige que no existan préstamos de herramientas vigentes ni solicitudes pendientes.
  * Si el avance total es menor a 100%, el sistema advierte y exige confirmación antes de finalizar.
  * Al finalizar, el sistema cierra las asignaciones vigentes registrando su fecha_fin_real y ejecuta una consolidación final de costos (HU-15).

---

## EP-05: Inventario de herramientas

### HU-35

* **Historia de Usuario:** Como encargado de bodega, quiero reemplazar una herramienta prestada que sufrió una avería por otra operativa, para que el trabajador continúe la labor registrando la novedad.
* **Prioridad:** Intermedia
* **Estimación:** 3
* **Sprint:** 3
* **Criterios de Aceptación:**
  * Extiende HU-12 y HU-11. Solo aplica a un préstamo vigente.
  * La herramienta de reemplazo debe estar activa y con disponibilidad real en el catálogo.
  * La novedad es obligatoria (descripción de la avería) y genera una incidencia asociada, como en HU-12.
  * La herramienta averiada cierra su préstamo con condición dañada y pasa a estado en reparación (HU-37).
  * El reemplazo queda prestado al mismo trabajador y proyecto, hereda la fecha estimada de devolución y se vincula al préstamo original.
  * El historial de la herramienta (HU-27) muestra el vínculo entre ambos préstamos.
  * Debe registrarse quién entrega el reemplazo y quién recibe la herramienta averiada.

### HU-37

* **Historia de Usuario:** Como encargado de bodega, quiero cambiar el estado operativo de una herramienta a "En reparación" o "De baja", para evitar que sea prestada mientras no esté en condiciones óptimas.
* **Prioridad:** Alta
* **Estimación:** 3
* **Sprint:** 3
* **Criterios de Aceptación:**
  * Los cambios permitidos son disponible → en reparación, en reparación → disponible, y cualquiera → de baja. Todo cambio exige un motivo.
  * No se puede cambiar el estado de una herramienta con préstamo vigente; primero debe registrarse su devolución (HU-12).
  * Una herramienta en reparación o de baja no aparece como disponible en la entrega ni en la solicitud de herramientas (HU-11, HU-30).
  * Cada ingreso a reparación registra fecha de ingreso, descripción y, al salir, fecha de salida y costo opcional.
  * De baja es definitivo y se aplica como baja lógica (fecha de baja y usuario), conforme a HU-18.
  * Cada cambio de estado queda en el historial de la herramienta (HU-27) y en la bitácora de trazabilidad.

---

## EP-04: Inventario de materiales

### HU-36

* **Historia de Usuario:** Como encargado de bodega, quiero modificar las cantidades aprobadas en una solicitud de materiales según el stock real disponible, para despachar solo lo existente y dejar el saldo pendiente.
* **Prioridad:** Alta
* **Estimación:** 5
* **Sprint:** 4
* **Criterios de Aceptación:**
  * Extiende HU-08. La cantidad_aprobada de cada línea no puede superar la cantidad_solicitada ni la existencia disponible al momento de la revisión.
  * La diferencia entre lo solicitado y lo despachado queda como saldo pendiente, visible en la solicitud, que queda en estado aprobada parcial.
  * El saldo pendiente puede despacharse después mediante nuevas salidas (HU-26) sin crear otra solicitud, o cancelarse con una observación obligatoria.
  * Una línea con cantidad aprobada igual a cero exige observación.
  * La solicitud no pasa a despachada hasta que el saldo sea cero o esté cancelado.
  * El sistema notifica al solicitante las cantidades aprobadas y el saldo pendiente.

### HU-40

* **Historia de Usuario:** Como maestro de obra, quiero firmar o validar digitalmente la recepción del material entregado en el frente de trabajo, para dejar constancia de conformidad e impedir reclamos por insumos no entregados.
* **Prioridad:** Baja
* **Estimación:** 3
* **Sprint:** 4
* **Criterios de Aceptación:**
  * Toda salida de materiales (HU-26) genera un acta de recepción en estado pendiente de recepción.
  * Solo el destinatario de la salida o el maestro responsable del proyecto o actividad puede firmar el acta.
  * El maestro valida cada línea indicando cantidad recibida; si difiere de la despachada, la observación es obligatoria.
  * La firma es una confirmación autenticada con la sesión del usuario y registra usuario, fecha y hora; no incluye imagen de firma.
  * Una vez firmada, el acta es inmutable y queda consultable por bodega.
  * Las diferencias entre lo despachado y lo recibido generan una alerta a bodega.

---

## EP-08: Costos e indicadores

### HU-39

* **Historia de Usuario:** Como gerente, quiero ver indicadores gráficos de desviación porcentual entre costo real y presupuesto inicial, para tomar decisiones financieras preventivas antes del cierre.
* **Prioridad:** Baja
* **Estimación:** 5
* **Sprint:** 4
* **Criterios de Aceptación:**
  * Complementa HU-16 y depende de HU-15. La desviación se calcula como (costo real − presupuesto inicial) / presupuesto inicial × 100 por proyecto.
  * Debe mostrarse el desglose del costo real por materiales, servicios externos y órdenes de compra.
  * Un indicador de semáforo con umbrales configurables señala la gravedad de la desviación.
  * Los datos se actualizan en cada consolidación de costos (HU-15) y se muestra la fecha y hora de la última consolidación.
  * Debe permitir filtrar por proyecto y estado, y solo muestra los proyectos del gerente que consulta.
  * Un proyecto sin costos consolidados muestra el indicador vacío con una advertencia, sin afectar el resto.

---
