# Matriz de Caracterización

**Matriz de Caracterización para la Gestión y Control de Proyectos de
Construcción, Recursos e Inventarios**

Entregable obligatorio del **OE1 (Caracterizar)** según el enunciado oficial
(`CONTROL INTEGRAL DE PROYECTOS DE CONSTRUCCIÓN.docx.odt`, §12). El enunciado
pide 45–55 variables organizadas en 16 dimensiones, documentando por variable:
Código, Dimensión, Variable, Definición, Tipo de dato, Valores permitidos,
Fuente, Periodicidad, Obligatoriedad, Responsable, Regla de validación e
Indicador asociado.

Cada variable de esta matriz está anclada a una **columna real de
`schema.sql`** — no se inventaron campos. La columna *Fuente* nombra la tabla
y el campo que la sustenta.

Relación metodológica que exige el enunciado:
`Caracterización del negocio → variables → reglas de negocio → requerimientos → modelo de datos → transacciones → indicadores → dashboard`

**Total: 52 variables / 16 dimensiones.**

---

## 1. Identificación del proyecto

| Código | Variable | Definición | Tipo | Valores permitidos | Fuente | Period. | Oblig. | Responsable | Regla de validación | Indicador |
|---|---|---|---|---|---|---|---|---|---|---|
| V01 | Código de proyecto | Identificador único de la obra | Texto(20) | Alfanumérico único | `proyectos.codigo` | Al crear | Sí | Administrador | UNIQUE; no editable tras creación | — |
| V02 | Nombre del proyecto | Denominación comercial de la obra | Texto(150) | Libre | `proyectos.nombre` | Al crear | Sí | Administrador | No vacío | — |
| V03 | Ubicación | Dirección física de la obra | Texto(255) | Libre | `proyectos.ubicacion` | Al crear | Sí | Administrador | No vacío | — |
| V04 | Estado del proyecto | Situación actual en su ciclo de vida | Enum | PLANIFICACION, EN_EJECUCION, PAUSADO, FINALIZADO, CANCELADO | `proyectos.estado` | Por evento | Sí | Administrador | Transición válida; no FINALIZADO con actividades pendientes | Proyectos por estado |

## 2. Planeación

| Código | Variable | Definición | Tipo | Valores permitidos | Fuente | Period. | Oblig. | Responsable | Regla de validación | Indicador |
|---|---|---|---|---|---|---|---|---|---|---|
| V05 | Fecha inicio programada | Fecha planeada de arranque | Fecha | ≤ fecha fin programada | `proyectos.fecha_inicio_programada` | Al crear | Sí | Administrador | fin ≥ inicio (RNF06) | Desviación de cronograma |
| V06 | Fecha fin programada | Fecha planeada de cierre | Fecha | ≥ fecha inicio | `proyectos.fecha_fin_programada` | Al crear | Sí | Administrador | fin ≥ inicio | Desviación de cronograma |
| V07 | Fecha inicio real | Fecha efectiva de arranque | Fecha | Nullable | `proyectos.fecha_inicio_real` | Por evento | No | Maestro de obra | ≤ fecha actual | Desviación de cronograma |
| V08 | Fecha fin real | Fecha efectiva de cierre | Fecha | Nullable | `proyectos.fecha_fin_real` | Por evento | No | Administrador | ≥ fecha inicio real | Desviación de cronograma |
| V09 | Presupuesto de referencia | Monto estimado de la obra | Decimal(15,2) | ≥ 0 | `proyectos.presupuesto_referencia` | Al crear | Sí | Gerente | ≥ 0 | Costo real vs. presupuesto |

## 3. Etapas

| Código | Variable | Definición | Tipo | Valores permitidos | Fuente | Period. | Oblig. | Responsable | Regla de validación | Indicador |
|---|---|---|---|---|---|---|---|---|---|---|
| V10 | Nombre de etapa | Fase del plan de trabajo | Texto(100) | Libre | `etapas_proyecto.nombre` | Al planificar | Sí | Administrador | Pertenece a proyecto existente (RN05) | — |
| V11 | Orden de etapa | Secuencia de ejecución | Entero | ≥ 1 | `etapas_proyecto.orden` | Al planificar | Sí | Administrador | Único por proyecto | — |
| V12 | Estado de etapa | Situación de la fase | Enum | PENDIENTE, EN_PROCESO, COMPLETADA | `etapas_proyecto.estado` | Por evento | Sí | Maestro de obra | COMPLETADA solo si todas sus actividades lo están | Etapas completadas |

## 4. Actividades

| Código | Variable | Definición | Tipo | Valores permitidos | Fuente | Period. | Oblig. | Responsable | Regla de validación | Indicador |
|---|---|---|---|---|---|---|---|---|---|---|
| V13 | Nombre de actividad | Tarea concreta dentro de una etapa | Texto(150) | Libre | `actividades.nombre` | Al planificar | Sí | Administrador | Pertenece a etapa válida (RN05) | — |
| V14 | Fecha fin programada actividad | Vencimiento planeado | Fecha | ≥ inicio programado | `actividades.fecha_fin_programada` | Al planificar | Sí | Administrador | fin ≥ inicio | % actividades atrasadas |
| V15 | Estado de actividad | Situación de la tarea | Enum | PENDIENTE, EN_PROCESO, COMPLETADA, ATRASADA, SUSPENDIDA | `actividades.estado` | Por evento | Sí | Maestro de obra | ATRASADA automática si vencida y no COMPLETADA (RN08) | Actividades programadas vs. terminadas |
| V16 | Responsable de actividad | Trabajador a cargo de la tarea | FK | ID trabajador activo | `actividades.responsable_id` | Al asignar | No | Administrador | Trabajador en estado ACTIVO | Utilización de personal |

## 5. Avance

| Código | Variable | Definición | Tipo | Valores permitidos | Fuente | Period. | Oblig. | Responsable | Regla de validación | Indicador |
|---|---|---|---|---|---|---|---|---|---|---|
| V17 | % avance de actividad | Progreso reportado de la tarea | Decimal(5,2) | 0–100 | `actividades.porcentaje_avance` | Periódica | Sí | Maestro de obra | CHECK BETWEEN 0 AND 100 | % avance por proyecto |
| V18 | % avance total del proyecto | Progreso agregado de la obra | Decimal(5,2) | 0–100 | `proyectos.porcentaje_avance_total` | Calculada | Sí | Sistema | Derivado de actividades, nunca manual (RN09) | % avance por proyecto |
| V19 | % anterior del registro | Valor previo al reporte de avance | Decimal(5,2) | 0–100 | `seguimiento_avance.porcentaje_anterior` | Por evento | Sí | Sistema | Igual al último valor registrado | Histórico de avance |
| V20 | % nuevo del registro | Valor reportado en el seguimiento | Decimal(5,2) | 0–100 | `seguimiento_avance.porcentaje_nuevo` | Por evento | Sí | Maestro de obra | CHECK BETWEEN 0 AND 100 | Histórico de avance |
| V21 | Fecha de registro de avance | Momento del reporte | DateTime | ≤ fecha actual | `seguimiento_avance.fecha_registro` | Por evento | Sí | Sistema | Automática | Frecuencia de reporte |

## 6. Personal

| Código | Variable | Definición | Tipo | Valores permitidos | Fuente | Period. | Oblig. | Responsable | Regla de validación | Indicador |
|---|---|---|---|---|---|---|---|---|---|---|
| V22 | Número de documento | Identificación legal del trabajador | Texto(20) | Único | `trabajadores.numero_documento` | Al registrar | Sí | Administrador | UNIQUE (RNF06) | — |
| V23 | Cargo | Función contractual del trabajador | Texto(100) | Libre | `trabajadores.cargo` | Al registrar | Sí | Administrador | No vacío | N.º trabajadores por proyecto |
| V24 | Especialidad | Oficio técnico del trabajador | Texto(100) | Libre / nullable | `trabajadores.especialidad` | Al registrar | No | Administrador | — | Utilización de personal |
| V25 | Estado del trabajador | Situación laboral actual | Enum | ACTIVO, INACTIVO, VACACIONES, LICENCIA | `trabajadores.estado` | Por evento | Sí | Administrador | Solo ACTIVO puede recibir asignaciones | Disponibilidad de personal |
| V26 | Disponibilidad | Indicador de libre para asignar | Booleano | 0 / 1 | `trabajadores.disponible` | Por evento | Sí | Administrador | — | Utilización de personal |

## 7. Asignaciones

| Código | Variable | Definición | Tipo | Valores permitidos | Fuente | Period. | Oblig. | Responsable | Regla de validación | Indicador |
|---|---|---|---|---|---|---|---|---|---|---|
| V27 | Fecha inicio de asignación | Arranque de la participación | Fecha | ≤ fecha fin | `asignaciones_personal.fecha_inicio` | Al asignar | Sí | Administrador | fin ≥ inicio | Historial de asignaciones |
| V28 | Fecha fin real de asignación | Cierre efectivo de la participación | Fecha | Nullable | `asignaciones_personal.fecha_fin_real` | Por evento | No | Administrador | ≥ fecha inicio | Historial de asignaciones |
| V29 | Rol en el proyecto | Papel desempeñado en la obra | Texto(100) | Libre / nullable | `asignaciones_personal.rol_en_proyecto` | Al asignar | No | Administrador | — | — |
| V30 | Estado de asignación | Vigencia del vínculo | Enum | ACTIVO, FINALIZADO, REASIGNADO | `asignaciones_personal.estado` | Por evento | Sí | Administrador | No se elimina físicamente (RN07) | N.º trabajadores por proyecto |

## 8. Materiales

| Código | Variable | Definición | Tipo | Valores permitidos | Fuente | Period. | Oblig. | Responsable | Regla de validación | Indicador |
|---|---|---|---|---|---|---|---|---|---|---|
| V31 | Código de material | Identificador único de catálogo | Texto(30) | Único | `materiales.codigo` | Al crear | Sí | Encargado de bodega | UNIQUE | — |
| V32 | Unidad de medida | Unidad en que se cuantifica | Texto(20) | m3, kg, unidad, bulto, … | `materiales.unidad_medida` | Al crear | Sí | Encargado de bodega | Valor de lista controlada | — |
| V33 | Existencia total | Cantidad disponible en inventario | Decimal(12,2) | ≥ 0 | `materiales.existencia_total` | Calculada | Sí | Sistema | Nunca negativa (RN01) | Materiales con existencia crítica |
| V34 | Costo de referencia | Valor unitario estimado | Decimal(12,2) | ≥ 0 | `materiales.costo_referencia` | Periódica | Sí | Encargado de bodega | ≥ 0 | Costo de materiales por proyecto |
| V35 | Nivel mínimo | Umbral de reabastecimiento | Decimal(12,2) | ≥ 0 | `materiales.nivel_minimo` | Al crear | Sí | Encargado de bodega | ≥ 0; dispara alerta STOCK_MINIMO | Materiales con existencia crítica |

## 9. Movimientos de inventario

| Código | Variable | Definición | Tipo | Valores permitidos | Fuente | Period. | Oblig. | Responsable | Regla de validación | Indicador |
|---|---|---|---|---|---|---|---|---|---|---|
| V36 | Cantidad de entrada | Unidades que ingresan al almacén | Decimal(12,2) | > 0 | `detalles_entrada_inventario` | Por evento | Sí | Encargado de bodega | > 0; suma a existencia | Consumo de materiales por proyecto |
| V37 | Cantidad de salida | Unidades despachadas a obra | Decimal(12,2) | > 0 y ≤ existencia | `detalles_salida_materiales` | Por evento | Sí | Encargado de bodega | No supera existencias (RN01); ligada a proyecto y responsable (RN02) | Consumo de materiales por proyecto |
| V38 | Cantidad devuelta | Unidades sobrantes reintegradas | Decimal(12,2) | > 0 | `devoluciones_materiales` | Por evento | No | Encargado de bodega | Vinculada a salida previa | Materiales devueltos |
| V39 | Cantidad trasladada | Unidades movidas entre almacenes | Decimal(12,2) | > 0 y ≤ existencia origen | `traslados_materiales` | Por evento | No | Encargado de bodega | No supera existencia en origen (RN01) | Movimientos entre bodegas |
| V40 | Almacén | Bodega o punto de acopio | FK | ID almacén activo | `almacenes.id` | Por evento | Sí | Encargado de bodega | Debe existir | Existencias por almacén |

## 10. Herramientas

| Código | Variable | Definición | Tipo | Valores permitidos | Fuente | Period. | Oblig. | Responsable | Regla de validación | Indicador |
|---|---|---|---|---|---|---|---|---|---|---|
| V41 | Código serial | Identificador único de la herramienta | Texto(50) | Único | `herramientas.codigo_serial` | Al crear | Sí | Encargado de bodega | UNIQUE | — |
| V42 | Estado operativo | Condición física del equipo | Enum | EXCELENTE, BUENO, REGULAR, DANIADA, EN_MANTENIMIENTO | `herramientas.estado_operativo` | Por evento | Sí | Encargado de bodega | Se registra en cada devolución (RN04) | Herramientas disponibles |
| V43 | Disponibilidad | Situación de asignación del equipo | Enum | DISPONIBLE, PRESTADA, EN_TRASLADO, BAJA | `herramientas.disponibilidad` | Por evento | Sí | Sistema | PRESTADA no puede figurar como DISPONIBLE (RN03) | Herramientas prestadas |
| V44 | Fecha estimada de devolución | Plazo pactado de retorno | Fecha | ≥ fecha entrega | `prestamos_herramientas` | Al prestar | Sí | Encargado de bodega | Vencida sin devolución → alerta | Herramientas pendientes de devolución |

## 11. Proveedores

| Código | Variable | Definición | Tipo | Valores permitidos | Fuente | Period. | Oblig. | Responsable | Regla de validación | Indicador |
|---|---|---|---|---|---|---|---|---|---|---|
| V45 | Documento del proveedor | NIT o identificación fiscal | Texto | Único | `proveedores` | Al registrar | Sí | Administrador | UNIQUE | — |
| V46 | Razón social | Nombre legal del proveedor | Texto | Libre | `proveedores` | Al registrar | Sí | Administrador | No vacío | — |

## 12. Servicios externos

| Código | Variable | Definición | Tipo | Valores permitidos | Fuente | Period. | Oblig. | Responsable | Regla de validación | Indicador |
|---|---|---|---|---|---|---|---|---|---|---|
| V47 | Responsable externo | Persona/empresa a cargo del servicio | Texto(100) | Libre | `servicios_externos.responsable_externo` | Al contratar | Sí | Administrador | No vacío | — |
| V48 | Valor contratado | Monto pactado del servicio | Decimal(15,2) | ≥ 0 | `servicios_externos.valor_contratado` | Al contratar | Sí | Administrador | ≥ 0; alimenta consolidación de costos | Costo de servicios externos |
| V49 | Estado del servicio | Situación de la contratación | Enum | PROGRAMADO, EN_EJECUCION, FINALIZADO, CANCELADO | `servicios_externos.estado` | Por evento | Sí | Administrador | Transición válida | Servicios pendientes |

## 13. Costos

| Código | Variable | Definición | Tipo | Valores permitidos | Fuente | Period. | Oblig. | Responsable | Regla de validación | Indicador |
|---|---|---|---|---|---|---|---|---|---|---|
| V50 | Costo consolidado del proyecto | Suma de materiales, herramientas y servicios | Decimal(15,2) | ≥ 0 | Derivado (entradas/salidas + `servicios_externos.valor_contratado`) | Calculada | Sí | Sistema | Nunca digitado manualmente (RN10) | Costo por proyecto; costo real vs. presupuesto |

## 14. Incidencias

| Código | Variable | Definición | Tipo | Valores permitidos | Fuente | Period. | Oblig. | Responsable | Regla de validación | Indicador |
|---|---|---|---|---|---|---|---|---|---|---|
| V51 | Severidad de incidencia | Gravedad de la novedad reportada | Enum | BAJA, MEDIA, ALTA, CRITICA | `incidencias.severidad` | Por evento | Sí | Maestro de obra | CRITICA genera alerta automática | Incidencias por proyecto |

## 15. Evidencias

| Código | Variable | Definición | Tipo | Valores permitidos | Fuente | Period. | Oblig. | Responsable | Regla de validación | Indicador |
|---|---|---|---|---|---|---|---|---|---|---|
| V52 | Archivo de evidencia | Soporte documental del avance | Texto(500) | Ruta válida | `evidencias_avance.ruta_archivo` | Por evento | No | Maestro de obra | Tipo y tamaño validados; ligada a un seguimiento | Avances con evidencia |

## 16. Indicadores

Esta dimensión no aporta variables de captura: se **deriva** de las anteriores.
Los indicadores sugeridos por el enunciado (§11.4) se calculan exclusivamente
a partir de información transaccional (RN10), y quedan trazados en la columna
*Indicador asociado* de cada variable:

| Indicador | Variables que lo alimentan |
|---|---|
| % de avance por proyecto | V17, V18 |
| Actividades programadas vs. terminadas | V15 |
| % de actividades atrasadas | V14, V15 |
| Consumo de materiales por proyecto | V36, V37 |
| Costo de materiales por proyecto | V34, V37 |
| Materiales con existencia crítica | V33, V35 |
| Herramientas disponibles | V42, V43 |
| Herramientas prestadas | V43 |
| Herramientas pendientes de devolución | V44 |
| Costo de servicios externos | V48 |
| N.º de trabajadores por proyecto | V23, V30 |
| Utilización de personal | V16, V24 |
| Incidencias por proyecto | V51 |

---

## Trazabilidad y auditoría (soporte transversal)

Toda operación sobre las variables marcadas como *Por evento* o *Calculada*
queda registrada en `bitacora_trazabilidad` (usuario, acción, fecha, entidad
afectada), cumpliendo RNF07 y RN07: los movimientos no se eliminan
físicamente.
