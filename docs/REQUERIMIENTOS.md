# Requerimientos funcionales y no funcionales

**Fuente autoritativa:** el enunciado oficial
(`CONTROL INTEGRAL DE PROYECTOS DE CONSTRUCCIÓN.docx`, §8 y §10) define
**RF01–RF32** y **RNF01–RNF15**. Su numeración y su redacción son
canónicas y no se renumeran aquí.

Los requerimientos añadidos por el equipo continúan la numeración a partir de
**RF33** y **RNF16**, y quedan marcados como tales. La columna «Soporte en el
modelo» anota dónde se implementa cada RF en `schema.sql`; es anotación, no
fuente de numeración.

> **Corrección de esta revisión:** una versión anterior de este documento
> numeró los RF a partir de los comentarios `-- RFxx` de `schema.sql`, lo que
> produjo (a) RF27–RF30 y RF33–RF35 duplicando requerimientos del enunciado
> que ya existían (RF23–RF30), y (b) una serie RNF01–RNF17 incompatible con la
> del enunciado. Ambas series se han alineado con el enunciado.

---

## Requerimientos funcionales del enunciado (RF01–RF32)

### Módulo 1: Personal y usuarios

| RF | Descripción | CU | Soporte en el modelo |
|----|---|---|---|
| RF01 | Gestión de usuarios: crear usuarios, autenticar el acceso, administrar roles, permisos y estados de las cuentas. | CU-01 | `usuarios`, `roles`, `permisos` |
| RF06 | Gestión de personal: registrar trabajadores y maestros con datos de contacto, especialidad, cargo, disponibilidad y estado. | CU-04 | `trabajadores` |
| RF07 | Asignación de personal: asignar trabajadores y maestros a proyectos o actividades determinadas. | CU-05 | `asignaciones_personal` |
| RF08 | Historial de asignaciones: consultar históricamente qué trabajadores participaron en cada proyecto y durante qué periodo. | CU-06 | `asignaciones_personal` (periodo) |

### Módulo 2: Proyectos, estructura y avance

| RF | Descripción | CU | Soporte en el modelo |
|----|---|---|---|
| RF02 | Gestión de proyectos: registrar proyectos con información general, ubicación, fechas, responsable, presupuesto de referencia, estado y observaciones. | CU-02 | `proyectos` |
| RF03 | Estructura del proyecto: dividir cada proyecto en etapas y actividades, estableciendo responsables, fechas programadas y estado. | CU-03 | `etapas_proyecto`, `actividades` |
| RF04 | Seguimiento del avance: registrar periódicamente el porcentaje de avance de actividades y proyectos. | CU-21 | `seguimiento_avance` |
| RF05 | Evidencias de avance: adjuntar fotografías, documentos u observaciones como evidencia del avance realizado. | CU-22 | `evidencias_avance` |
| RF22 | Incidencias: registrar novedades presentadas durante la ejecución del proyecto. | CU-14 | `incidencias` |

### Módulo 3: Inventario, materiales y herramientas

| RF | Descripción | CU | Soporte en el modelo |
|----|---|---|---|
| RF09 | Gestión de materiales: registrar materiales mediante código, descripción, categoría, unidad de medida, existencia, costo de referencia y nivel mínimo. | CU-07 | `materiales` |
| RF10 | Entradas de inventario: registrar ingreso de materiales indicando cantidad, fecha, proveedor, costo y responsable. | CU-19 | `entradas_inventario`, `detalles_entrada_inventario` |
| RF11 | Salidas de materiales: registrar materiales entregados a un proyecto, actividad o responsable. | CU-08, CU-26 | `salidas_materiales`, `detalles_salida_materiales` |
| RF12 | Consumo de materiales: registrar el consumo efectivo de materiales por proyecto y actividad. | CU-20 | `detalles_salida_materiales` (consumo) |
| RF13 | Devoluciones: registrar materiales no utilizados que regresan al inventario. | CU-09 | `devoluciones_materiales` |
| RF14 | Traslados: trasladar materiales entre almacenes, proyectos u obras cuando corresponda. | CU-29 | `traslados_materiales` |
| RF15 | Control de herramientas: registrar herramientas individualmente y controlar estado, ubicación y disponibilidad. | CU-10 | `herramientas` |
| RF16 | Préstamo de herramientas: registrar entrega de herramientas indicando trabajador, proyecto, fecha y estado de entrega. | CU-11 | `prestamos_herramientas` |
| RF17 | Devolución de herramientas: registrar fecha y condición en que una herramienta es devuelta. | CU-12 | `prestamos_herramientas` (devolución) |
| RF18 | Historial de herramientas: consultar la trazabilidad completa de cada herramienta. | CU-27 | `prestamos_herramientas`, `bitacora_trazabilidad` |

### Módulo 4: Terceros y servicios externos

| RF | Descripción | CU | Soporte en el modelo |
|----|---|---|---|
| RF19 | Gestión de proveedores: registrar proveedores de materiales y servicios. | CU-13 | `proveedores` |
| RF20 | Servicios externos: registrar servicios contratados (transporte, alquiler de maquinaria, electricidad, plomería u otros). | CU-13 | `servicios_externos` |
| RF21 | Responsable externo: relacionar cada servicio con empresa/persona responsable, proyecto, actividad, fechas y valor. | CU-28 | `servicios_externos` |

### Módulo 5: Alertas

| RF | Descripción | CU | Soporte en el modelo |
|----|---|---|---|
| RF23 | Alertas de inventario: generar alertas cuando un material alcance el nivel mínimo establecido. | CU-23 | `alertas`, `materiales.nivel_minimo` |
| RF24 | Alertas de herramientas: generar alertas sobre herramientas pendientes de devolución o que presenten novedades. | CU-24 | `alertas`, `prestamos_herramientas` |
| RF25 | Alertas de actividades: identificar actividades atrasadas respecto a su fecha programada. | CU-24 | `alertas`, `actividades.fecha_fin_programada` |

### Módulo 6: Costos, indicadores y reportes

| RF | Descripción | CU | Soporte en el modelo |
|----|---|---|---|
| RF26 | Control de costos operacionales: consolidar costos registrados de materiales y servicios externos asociados con cada proyecto. | CU-15 | consolidación sobre `detalles_salida_materiales`, `servicios_externos` |
| RF27 | Indicadores: calcular automáticamente indicadores de proyectos, inventarios, herramientas, personal y servicios. | CU-16 | vistas de indicadores |
| RF28 | Dashboard: presentar gráficamente los principales indicadores de la empresa. | CU-16 | — (capa de presentación) |
| RF29 | Reportes: generar reportes filtrados por proyecto, periodo, trabajador, material, proveedor o servicio. | CU-25 | — (capa de aplicación) |
| RF30 | Exportación: exportar determinados reportes a formatos apropiados, como PDF o Excel. | CU-25 | — (capa de aplicación) |

### Módulo 7: Trazabilidad y auditoría

| RF | Descripción | CU | Soporte en el modelo |
|----|---|---|---|
| RF31 | Trazabilidad: mantener registro de las principales operaciones realizadas por los usuarios. | CU-17 | `bitacora_trazabilidad` |
| RF32 | Consulta histórica: permitir reconstruir el historial operacional de cada proyecto. | CU-18 | `bitacora_trazabilidad` |

---

## Requerimientos funcionales adicionales del equipo (RF33–RF36)

No provienen del enunciado. Se numeran a continuación de RF32 y coinciden con
la numeración del documento de análisis de negocio
(`Analisis_Negocio_Problema_Constructora_XYZ`, §6.2).

| RF | Descripción | Origen | CU |
|----|---|---|---|
| RF33 *(equipo)* | Notificaciones del sistema: notificar eventos relevantes (asignaciones, incidencias, plazos) a los usuarios interesados. | Backlog del equipo | — |
| RF34 *(equipo)* | Conservación de historial: no eliminar físicamente los movimientos (asignaciones, solicitudes, entregas); deben conservarse para historial. Eleva RN07 a requerimiento. | Backlog del equipo | CU-18 |
| RF35 *(equipo)* | Trazabilidad de movimientos de material: reconstruir el recorrido completo de un material (entrada, salida, traslado, consumo, devolución) con responsable y fecha en cada paso. | Reunión Ing. Civil | CU-19, CU-20, CU-29 |
| RF36 *(equipo)* | Gestión de alertas atendidas: marcar una alerta como atendida, registrando quién la atendió y cuándo. | Implementación (`alertas.atendida`) | CU-23, CU-24 |

---

## Requerimientos no funcionales del enunciado (RNF01–RNF15)

Redacción y numeración canónicas del enunciado (§10). La columna «Criterio
verificable» es la concreción que adopta el equipo para poder validarlos; no
sustituye el enunciado.

| RNF | Categoría | Descripción | Criterio verificable del equipo |
|-----|---|---|---|
| RNF01 | Usabilidad | La interfaz deberá ser intuitiva, consistente y comprensible para usuarios con conocimientos informáticos básicos. | Estados relevantes modelados con enum controlado, no texto libre. |
| RNF02 | Diseño responsivo | La aplicación deberá adaptarse a computadores, tabletas y teléfonos móviles, ya que parte de la información se registra desde las obras. | Registro de avance y evidencias operable desde móvil en campo. |
| RNF03 | Rendimiento | Las operaciones comunes deberán proporcionar tiempos de respuesta adecuados bajo la carga prevista para una microempresa. | Dashboard y reportes filtrados < 3 s con hasta 50 proyectos activos. |
| RNF04 | Seguridad | Las contraseñas deberán almacenarse utilizando mecanismos criptográficos seguros. | Hash de contraseña; nunca texto plano. |
| RNF05 | Autorización | El sistema deberá aplicar control de acceso basado en roles y permisos. | RBAC verificado por rol del usuario autenticado. |
| RNF06 | Integridad | La base de datos deberá implementar restricciones que eviten inconsistencias en proyectos, inventarios y movimientos. | Unicidad en campos clave; validaciones de stock, cantidad positiva y rango 0–100 % antes de confirmar. |
| RNF07 | Trazabilidad | Las operaciones críticas deberán registrar usuario, fecha, hora, operación y entidad afectada. | Bitácora inmutable; sin borrado físico. |
| RNF08 | Disponibilidad | El sistema deberá encontrarse disponible para los usuarios autorizados durante los periodos normales de operación. | 99 % en jornada diurna de obra. |
| RNF09 | Compatibilidad | La aplicación deberá funcionar correctamente en las versiones recientes de navegadores web de uso extendido. | — |
| RNF10 | Mantenibilidad | El código deberá organizarse utilizando una arquitectura modular que facilite mantenimiento y evolución. | Separación backend/frontend por capas (rutas, controladores, datos). |
| RNF11 | Escalabilidad | La arquitectura deberá permitir incorporar posteriormente nuevos proyectos, usuarios, bodegas o funcionalidades. | Múltiples almacenes/obras simultáneos sin degradar inventario. |
| RNF12 | Respaldo | Deberá establecerse un procedimiento para realizar copias de seguridad de la información. | Procedimiento de copia periódica documentado. |
| RNF13 | Recuperación | Deberá documentarse el procedimiento básico de restauración de la base de datos. | Procedimiento de restauración documentado. |
| RNF14 | Calidad | La evaluación de calidad deberá considerar seguridad, confiabilidad, eficiencia, mantenibilidad y usabilidad. | Características explícitas de aceptación. |
| RNF15 | Documentación | La solución deberá contar con documentación técnica, modelo de datos, documentación de API cuando aplique y manual de usuario. | — |

## Requerimientos no funcionales adicionales del equipo (RNF16)

| RNF | Categoría | Descripción | Origen |
|-----|---|---|---|
| RNF16 *(equipo)* | Portabilidad | Los reportes deben poder exportarse en formatos estándar (PDF, Excel) legibles fuera del sistema. | Equipo; complementa RF30. |

---

## Anexo: gap cerrado durante esta revisión

`schema.sql` incluía la tabla `traslados_materiales` (RF14) sin HU ni CU
asociado. Se creó **HU-29 / CU-29: Trasladar materiales entre almacenes**
(`PRODUCT_BACKLOG.md`, `CASOS_DE_USO.md` y su diagrama en
`casos_de_uso/puml/CU-29.puml`) para que RF14 quede trazable de extremo a
extremo.
