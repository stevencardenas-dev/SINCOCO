# Casos de uso

Transcripción del anexo **«Protocolo de Especificación de Requerimientos
(Casos de Uso)»** de la *Primera Entrega*, que es el documento oficial frente
al cual se evalúa el proyecto: los 30 casos de uso con su actor, flujo
principal y flujos alternativos.

> **Fuente de verdad.** Ante cualquier discrepancia entre este archivo y otros
> documentos del repositorio, prevalece la Primera Entrega.

Un caso de uso por historia de usuario, mismo número (CU-NN ↔ HU-NN) según la
*Matriz de Articulación HU-CU*. Las épicas corresponden a
`HU_CRITERIOS_ACEPTACION.md`.

---


## EP-01: Gestión de usuarios y acceso

### CU-01 (HU-01): Registrar usuario y asignar rol
- **Actor(es):** Administrador
- **Flujo principal (Creación de cuenta):** Dado que el administrador accede al módulo de usuarios y cuenta con los datos del trabajador y el rol a asignar, cuando registra la información y confirma la creación, entonces el sistema crea el usuario en estado activo, lo vincula al trabajador correspondiente y le asigna los permisos definidos para el rol seleccionado.
- **Flujos alternativos:**
  - *Alt 1 (Datos duplicados):* Dado que el nombre de usuario, correo o documento ya se encuentran registrados, cuando el administrador intenta guardar el nuevo usuario, entonces el sistema rechaza la operación y señala el campo en conflicto.
  - *Alt 2 (Cambio de estado):* Dado un usuario existente, cuando el administrador modifica su estado, entonces el sistema habilita o restringe su acceso de forma inmediata y deja constancia del cambio.
  - *Alt 3 (Cambio de rol):* Dado un usuario existente, cuando el administrador le asigna un rol distinto, entonces el sistema actualiza sus permisos según el nuevo rol sin alterar el historial de acciones ya registradas.


## EP-02: Gestión de proyectos y planificación

### CU-02 (HU-02): Registrar proyecto
- **Actor(es):** Administrador
- **Flujo principal (Registro de proyecto):** Dado que el administrador cuenta con la información del cliente y los datos generales del proyecto, cuando registra ubicación, presupuesto inicial y fechas programadas, entonces el sistema crea el proyecto en estado de planificación, asociado al cliente y al responsable indicados.
- **Flujos alternativos:**
  - *Alt 1 (Fechas inconsistentes):* Dado que la fecha de fin programada es anterior o igual a la fecha de inicio programada, cuando se intenta guardar el proyecto, entonces el sistema impide el registro y notifica el error.
  - *Alt 2 (Cliente no registrado):* Dado que el cliente indicado no existe en el sistema, cuando se intenta asociarlo al proyecto, entonces el sistema exige registrarlo antes de continuar.

### CU-03 (HU-03): Definir plan de trabajo (etapas y actividades)
- **Actor(es):** Administrador
- **Flujo principal (Estructuración del plan):** Dado un proyecto registrado, cuando el administrador crea etapas ordenadas secuencialmente y define para cada una sus actividades con fechas programadas y responsables, entonces el sistema construye el cronograma del proyecto (WBS).
- **Flujos alternativos:**
  - *Alt 1 (Actividad huérfana):* Dado que se intenta registrar una actividad sin asociarla a una etapa existente, cuando se guarda, entonces el sistema bloquea la operación.
  - *Alt 2 (Fechas fuera de rango):* Dado que las fechas de una etapa o actividad exceden el rango de fechas del proyecto, cuando se guarda el plan, entonces el sistema advierte la inconsistencia.


## EP-03: Personal y asignaciones

### CU-04 (HU-04): Registrar personal
- **Actor(es):** Administrador
- **Flujo principal (Alta de personal):** Dado el módulo de personal, cuando el administrador registra los datos del trabajador junto con su cargo y especialidad, entonces el sistema lo guarda como disponible y activo.
- **Flujos alternativos:**
  - *Alt 1 (Documento duplicado):* Dado que el número de documento ya existe en el sistema, cuando se intenta registrar el trabajador, entonces el sistema rechaza la operación.
  - *Alt 2 (Especialidad no definida):* Dado un cargo que requiere especialidad técnica, cuando esta no se define al registrar el trabajador, entonces el sistema advierte que no podrá ser filtrado para tareas específicas.

### CU-05 (HU-05): Asignar responsable a proyecto/actividad
- **Actor(es):** Administrador
- **Flujo principal (Asignación):** Dado un proyecto o actividad y un trabajador disponible, cuando el responsable registra la asignación con su fecha de inicio y fecha fin programada, entonces el trabajador cambia a estado asignado y queda vinculado al proyecto o actividad correspondiente.
- **Flujos alternativos:**
  - *Alt 1 (Solapamiento):* Dado que el trabajador ya cuenta con una asignación vigente cuyas fechas se solapan con la nueva, cuando se intenta confirmar la asignación, entonces el sistema advierte la sobreasignación antes de guardar.
  - *Alt 2 (Cierre de asignación):* Dado que se alcanza la fecha fin programada de una asignación sin haberse registrado una extensión, cuando el sistema evalúa su vigencia, entonces la asignación se cierra y el trabajador vuelve a estado disponible.

### CU-06 (HU-06): Consultar historial de asignaciones
- **Actor(es):** Administrador
- **Flujo principal (Consulta de historial):** Dado el perfil de un trabajador, cuando el usuario autorizado consulta su historial de asignaciones, entonces el sistema presenta cronológicamente los proyectos y actividades en los que ha participado, con sus fechas y su rol desempeñado.
- **Flujos alternativos:**
  - *Alt (Sin historial):* Dado un trabajador que no registra asignaciones previas, cuando se consulta su historial, entonces el sistema indica que no existen registros disponibles.


## EP-04: Inventario de materiales

### CU-07 (HU-07): Mantener catálogo de materiales
- **Actor(es):** Encargado de bodega
- **Flujo principal (Alta de material):** Dado el catálogo de materiales, cuando el encargado de bodega registra un nuevo material con su código, categoría, unidad de medida y costo de referencia, entonces el material queda disponible para las operaciones de inventario.
- **Flujos alternativos:**
  - *Alt 1 (Código existente):* Dado que el código ingresado ya existe en el catálogo, cuando se intenta crear el material, entonces el sistema sugiere editar el material existente en lugar de crear uno duplicado.
  - *Alt 2 (Edición de material):* Dado un material ya existente, cuando se actualizan sus datos, entonces el sistema conserva el histórico de movimientos previamente registrados.

### CU-08 (HU-08): Solicitar materiales
- **Actor(es):** Maestro de obra
- **Flujo principal (Solicitud desde obra):** Dado un proyecto y una actividad activos, cuando el maestro de obra registra una solicitud indicando los materiales y las cantidades requeridas, entonces la solicitud queda en estado pendiente para revisión de bodega.
- **Flujos alternativos:**
  - *Alt 1 (Excede lo previsto):* Dado que la cantidad solicitada supera lo presupuestado para la actividad, cuando se registra la solicitud, entonces el sistema genera una alerta y exige confirmación o autorización adicional antes de continuar.
  - *Alt 2 (Aprobación parcial):* Dado que la disponibilidad de inventario es menor a lo solicitado, cuando bodega revisa la solicitud, entonces aprueba una cantidad distinta a la solicitada y notifica al solicitante.

### CU-09 (HU-09): Devolver materiales sobrantes
- **Actor(es):** Encargado de bodega
- **Flujo principal (Retorno de material):** Dado material sobrante proveniente de un proyecto o actividad, cuando el encargado de bodega registra la devolución indicando cantidad y motivo, entonces el sistema aumenta la existencia del almacén de destino y ajusta el costo de la actividad de origen.
- **Flujos alternativos:**
  - *Alt (Material no apto):* Dado que el material devuelto no está en condiciones de reingresar al inventario, cuando bodega lo revisa, entonces registra la devolución con la observación correspondiente sin sumarlo a la existencia disponible.


## EP-05: Inventario de herramientas

### CU-10 (HU-10): Mantener catálogo de herramientas
- **Actor(es):** Encargado de bodega
- **Flujo principal (Alta de herramienta):** Dado el catálogo de herramientas, cuando bodega registra una nueva herramienta con su código serial, marca, modelo y almacén asignado, entonces la herramienta queda registrada según su estado operativo.
- **Flujos alternativos:**
  - *Alt (Serial duplicado):* Dado que el código serial ingresado ya existe en el catálogo, cuando se intenta registrar la herramienta, entonces el sistema rechaza la operación.

### CU-11 (HU-11): Entregar herramienta a trabajador
- **Actor(es):** Encargado de bodega
- **Flujo principal (Entrega):** Dada una solicitud de herramienta aprobada y disponible en bodega, cuando se realiza la entrega física al trabajador, entonces el sistema registra el préstamo, actualiza la disponibilidad de la herramienta y define la fecha estimada de devolución.
- **Flujos alternativos:**
  - *Alt (Herramienta no disponible):* Dado que la herramienta solicitada no se encuentra disponible, cuando bodega intenta registrar la entrega, entonces el sistema impide la operación hasta que cambie su disponibilidad.

### CU-12 (HU-12): Registrar devolución de herramienta
- **Actor(es):** Encargado de bodega
- **Flujo principal (Devolución en buen estado):** Dado un préstamo vigente, cuando el trabajador devuelve la herramienta en condiciones adecuadas, entonces bodega registra la devolución, libera al trabajador de la responsabilidad y la herramienta vuelve a estado disponible.
- **Flujos alternativos:**
  - *Alt (Devolución con daño):* Dado que la herramienta se devuelve en mal estado, cuando bodega la recibe, entonces la registra con el estado de devolución correspondiente y genera una incidencia asociada.


## EP-06: Proveedores y servicios externos

### CU-13 (HU-13): Registrar proveedores y servicios
- **Actor(es):** Administrador
- **Flujo principal (Alta de proveedor):** Dado un proveedor con su documento de identificación y datos de contacto, cuando el administrador lo registra, entonces queda habilitado para asociarle servicios externos o compras.
- **Flujos alternativos:**
  - *Alt (Documento inválido o duplicado):* Dado que el documento ingresado no cumple el formato esperado o ya existe en el sistema, cuando se intenta registrar el proveedor, entonces el sistema rechaza la operación.


## EP-07: Incidencias de obra

### CU-14 (HU-14): Registrar incidencia de obra
- **Actor(es):** Maestro de obra
- **Flujo principal (Registro de incidencia):** Dado un proyecto o actividad en ejecución, cuando el maestro de obra registra una incidencia describiendo el hecho, su severidad y la evidencia asociada, entonces el sistema la almacena y notifica a los interesados.
- **Flujos alternativos:**
  - *Alt (Incidencia crítica):* Dado que la severidad registrada es alta, cuando se guarda la incidencia, entonces el sistema notifica de inmediato al responsable del proyecto y resalta la actividad afectada en el cronograma.


## EP-08: Costos e indicadores

### CU-15 (HU-15): Consolidar costos del proyecto
- **Actor(es):** Sistema
- **Flujo principal (Cálculo de costos):** Dado un proyecto en ejecución, cuando el sistema ejecuta el proceso de consolidación de costos, entonces suma los costos de materiales despachados, servicios externos y demás rubros asociados, actualizando el costo real del proyecto frente a su presupuesto inicial.
- **Flujos alternativos:**
  - *Alt (Desviación de presupuesto):* Dado que el costo consolidado supera el presupuesto inicial del proyecto, cuando se genera la consolidación, entonces el sistema resalta la desviación correspondiente.

### CU-16 (HU-16): Visualizar dashboard de seguimiento
- **Actor(es):** Gerente
- **Flujo principal (Dashboard gerencial):** Dado que el gerente ingresa al dashboard, cuando el sistema carga la información de sus proyectos, entonces se presentan indicadores de avance, costos, alertas activas y estado general mediante gráficos.
- **Flujos alternativos:**
  - *Alt (Información insuficiente):* Dado un proyecto sin datos suficientes para calcular alguno de los indicadores, cuando se carga el dashboard, entonces ese indicador se muestra vacío o con una advertencia, sin afectar el resto de la información.


## EP-09: Auditoría y trazabilidad

### CU-17 (HU-17): Consultar auditoría de operaciones
- **Actor(es):** Administrador
- **Flujo principal (Auditoría):** Dado que el administrador necesita revisar una operación crítica, cuando consulta la bitácora de trazabilidad filtrando por usuario, tabla o fecha, entonces el sistema muestra el detalle de la acción registrada.
- **Flujos alternativos:**
  - *Alt (Sin coincidencias):* Dado que los filtros aplicados no corresponden a ningún registro, cuando se ejecuta la consulta, entonces el sistema indica que no existen resultados para ese criterio.

### CU-18 (HU-18): Conservar historial (eliminación lógica)
- **Actor(es):** Sistema
- **Flujo principal (Baja lógica):** Dado un registro que el usuario intenta eliminar, cuando confirma la baja, entonces el sistema lo marca como inactivo, registra la fecha de baja y el usuario responsable, sin eliminar físicamente la información.
- **Flujos alternativos:**
  - *Alt (Reactivación):* Dado un registro previamente dado de baja, cuando un administrador lo reactiva, entonces el sistema lo marca nuevamente como activo conservando su historial previo.


## EP-04: Inventario de materiales

### CU-19 (HU-19): Ingresar materiales al inventario
- **Actor(es):** Encargado de bodega
- **Flujo principal (Ingreso de mercancía):** Dado un almacén y, cuando aplique, una orden de compra asociada, cuando bodega registra la entrada indicando los materiales, cantidades y costo, entonces el sistema aumenta la existencia y recalcula el costo de referencia del material.
- **Flujos alternativos:**
  - *Alt (Ingreso parcial):* Dado que la cantidad recibida es menor a la pedida en la orden de compra, cuando se registra el ingreso, entonces el sistema deja la orden abierta por la diferencia pendiente.

### CU-20 (HU-20): Registrar consumo real de materiales
- **Actor(es):** Maestro de obra
- **Flujo principal (Registro de consumo):** Dado material previamente despachado hacia una actividad, cuando el maestro de obra registra el consumo efectivo, entonces el sistema refleja el gasto real de material en el costo de la actividad y del proyecto.
- **Flujos alternativos:**
  - *Alt (Anulación de consumo):* Dado un registro de consumo erróneo, cuando se solicita su anulación, entonces solo un administrador puede autorizar la corrección correspondiente.


## EP-10: Seguimiento de avance y evidencias

### CU-21 (HU-21): Registrar porcentaje de avance
- **Actor(es):** Maestro de obra
- **Flujo principal (Avance físico):** Dado que una actividad está en ejecución, cuando el maestro de obra registra un nuevo porcentaje de avance, entonces el sistema conserva el porcentaje anterior y el nuevo, actualiza el avance de la actividad y recalcula el avance de la etapa y del proyecto.
- **Flujos alternativos:**
  - *Alt 1 (Avance al 100%):* Dado que el porcentaje registrado alcanza el 100%, cuando se guarda el avance, entonces la actividad cambia automáticamente a estado completada.
  - *Alt 2 (Valor inválido):* Dado que el porcentaje ingresado está fuera del rango permitido o es inferior al último registrado, cuando se intenta guardar, entonces el sistema rechaza el registro.

### CU-22 (HU-22): Adjuntar evidencias de avance
- **Actor(es):** Maestro de obra
- **Flujo principal (Carga de evidencia):** Dado un registro de seguimiento de avance, cuando el maestro de obra adjunta archivos como fotografías, documentos u observaciones, entonces el sistema los asocia a dicho seguimiento y quedan disponibles para consulta.
- **Flujos alternativos:**
  - *Alt (Formato no soportado):* Dado un archivo que no corresponde a un formato permitido, cuando se intenta adjuntar, entonces el sistema rechaza la carga e indica los formatos válidos.


## EP-11: Alertas del sistema

### CU-23 (HU-23): Alertar stock mínimo
- **Actor(es):** Sistema, Encargado de bodega
- **Flujo principal (Alerta por stock mínimo):** Dado que la existencia de un material desciende como consecuencia de una salida, cuando la existencia resultante es igual o inferior al nivel mínimo configurado, entonces el sistema genera automáticamente una alerta dirigida a bodega.
- **Flujos alternativos:**
  - *Alt (Alerta ya pendiente):* Dado que ya existe una alerta pendiente para ese material, cuando ocurre una nueva salida que mantiene el stock bajo el mínimo, entonces el sistema no genera una alerta adicional hasta que la anterior sea atendida.

### CU-24 (HU-24): Alertar actividades atrasadas y herramientas pendientes
- **Actor(es):** Sistema, Gerente
- **Flujo principal (Alertas gerenciales):** Dado el seguimiento de actividades y de préstamos vigentes, cuando el sistema detecta una actividad cuya fecha fin programada ya venció sin alcanzar el 100% de avance, o un préstamo cuya fecha estimada de devolución ya se cumplió sin registro de devolución, entonces genera una alerta visible para el rol correspondiente.
- **Flujos alternativos:**
  - *Alt (Situación regularizada):* Dado que la actividad alcanza el 100% de avance o la herramienta es devuelta después de generada la alerta, cuando el sistema actualiza el estado, entonces la alerta correspondiente se marca como atendida.


## EP-12: Reportes

### CU-25 (HU-25): Generar y exportar reportes
- **Actor(es):** Gerente
- **Flujo principal (Generación de reporte):** Dado que el gerente define los filtros de un reporte (proyecto, periodo o tipo de recurso), cuando solicita su generación, entonces el sistema consolida la información correspondiente y permite exportarla en el formato solicitado.
- **Flujos alternativos:**
  - *Alt (Sin datos para los filtros):* Dado que los filtros seleccionados no corresponden a ninguna información registrada, cuando se genera el reporte, entonces el sistema indica que no hay datos disponibles para ese criterio.


## EP-04: Inventario de materiales

### CU-26 (HU-26): Registrar salida efectiva de materiales
- **Actor(es):** Encargado de bodega
- **Flujo principal (Salida de bodega):** Dada una solicitud de materiales aprobada, cuando bodega autoriza y registra la salida hacia el proyecto o actividad, entonces el sistema descuenta la existencia del almacén de origen y deja constancia de lo despachado.
- **Flujos alternativos:**
  - *Alt (Stock insuficiente):* Dado que la cantidad a despachar supera la existencia disponible en el almacén de origen, cuando se intenta confirmar la salida, entonces el sistema impide la operación.


## EP-05: Inventario de herramientas

### CU-27 (HU-27): Consultar historial de movimientos de herramienta
- **Actor(es):** Encargado de bodega
- **Flujo principal (Trazabilidad de herramienta):** Dada una herramienta registrada, cuando se consulta su historial, entonces el sistema muestra cronológicamente sus préstamos, devoluciones, cambios de estado y los proyectos en los que ha sido utilizada.
- **Flujos alternativos:**
  - *Alt (Sin movimientos):* Dado que la herramienta no registra préstamos previos, cuando se consulta su historial, entonces el sistema indica que no hay información disponible.


## EP-06: Proveedores y servicios externos

### CU-28 (HU-28): Registrar detalle de servicio externo contratado
- **Actor(es):** Administrador
- **Flujo principal (Registro de servicio contratado):** Dado un proveedor de servicios registrado, cuando el administrador registra un servicio externo indicando actividad, fechas, responsable externo y valor contratado, entonces el sistema lo asocia al presupuesto de la actividad y del proyecto correspondiente.
- **Flujos alternativos:**
  - *Alt (Excede presupuesto de la actividad):* Dado que el valor contratado supera el presupuesto disponible para la actividad, cuando se registra el servicio, entonces el sistema advierte la situación antes de confirmar.


## EP-04: Inventario de materiales

### CU-29 (HU-29): Trasladar materiales entre almacenes
- **Actor(es):** Encargado de bodega
- **Flujo principal (Traslado entre almacenes):** Dados dos almacenes registrados y existencia disponible en el almacén de origen, cuando el encargado de bodega registra un traslado indicando material y cantidad, entonces el sistema descuenta la existencia del almacén de origen y la suma al almacén de destino.
- **Flujos alternativos:**
  - *Alt (Existencia insuficiente):* Dado que la cantidad a trasladar supera la existencia disponible en el almacén de origen, cuando se intenta confirmar el traslado, entonces el sistema impide la operación.


## EP-05: Inventario de herramientas

### CU-30 (HU-30): Solicitar herramientas
- **Actor(es):** Maestro de obra
- **Flujo principal (Solicitud y aprobación):** Dado un trabajador y una herramienta disponible en el catálogo, cuando el maestro de obra registra la solicitud indicando el trabajador destinatario, el proyecto y la fecha requerida, entonces la solicitud queda pendiente de aprobación por bodega.
- **Flujos alternativos:**
  - *Alt 1 (Rechazo de solicitud):* Dado que existe un motivo justificado, como incumplimientos previos del trabajador con devoluciones, cuando bodega rechaza la solicitud, entonces el sistema exige una observación obligatoria y notifica al solicitante.
  - *Alt 2 (Solicitud programada):* Dado que la fecha requerida es posterior a la fecha actual, cuando se registra la solicitud, entonces esta permanece pendiente hasta esa fecha sin bloquear otras operaciones del solicitante.
