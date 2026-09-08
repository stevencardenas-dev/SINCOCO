# Reglas de negocio (RN)

**14 reglas**: las 10 del enunciado oficial de la asignatura
(`CONTROL INTEGRAL DE PROYECTOS DE CONSTRUCCIÓN.docx.odt`, §9) **más 4
aportadas por el equipo** en el backlog inicial (`EP-Backlog_Constructora_XYZ`)
que no estaban en el enunciado.

Criterio: no se elimina nada del enunciado ni del trabajo previo del equipo.
Las reglas propias del equipo se conservan cuando son **enforceable** (se
pueden validar en código contra el modelo de datos) y **no redundantes**.

---

## Reglas del enunciado oficial (RN01–RN10)

| RN | Descripción | RF relacionado |
|----|---|---|
| RN01 | Ningún material podrá salir del inventario si la cantidad solicitada supera las existencias disponibles. | RF11 |
| RN02 | Toda salida de material deberá quedar asociada a un proyecto y responsable. | RF11 |
| RN03 | Una herramienta entregada no podrá aparecer simultáneamente como disponible. | RF16 |
| RN04 | Toda devolución deberá registrar el estado de la herramienta. | RF17 |
| RN05 | Las actividades deberán pertenecer a una etapa y proyecto. | RF03 |
| RN06 | Los consumos deberán afectar automáticamente las existencias. | RF12 |
| RN07 | Los movimientos de inventario no deberán eliminarse físicamente; las correcciones deberán mantener trazabilidad. | RF31, RF32 (y RF34 del equipo) |
| RN08 | Las actividades vencidas y no terminadas deberán identificarse como atrasadas. | RF25 |
| RN09 | El avance de un proyecto deberá derivarse de las actividades que lo conforman bajo la regla de cálculo definida por la empresa. | RF04 |
| RN10 | Los indicadores deberán calcularse a partir de información transaccional y no mediante digitación manual de resultados. | RF27 |

## Reglas aportadas por el equipo (RN11–RN14)

Provienen del backlog inicial del equipo. Se conservan porque expresan
restricciones de negocio propias de una constructora que el enunciado no
cubre, y todas son verificables contra `schema.sql`.

| RN | Descripción | RF relacionado | Soporte en el modelo |
|----|---|---|---|
| RN11 | Un proyecto debe tener al menos un maestro/responsable asignado antes de iniciar actividades. | RF02, RF07 | `proyectos.responsable_id` NOT NULL |
| RN12 | No se puede finalizar un proyecto si tiene actividades pendientes o herramientas asignadas sin devolver. | RF02, RF17 | `actividades.estado`, `herramientas.estado` (validación en aplicación) |
| RN13 | Un material solo puede devolverse si fue previamente solicitado/entregado en ese proyecto. | RF13 | `devoluciones_materiales` (FK a la salida previa **no existe** — ver anexo) |
| RN14 | Un proveedor o servicio externo debe estar registrado en el sistema antes de poder asociarse a un proyecto. | RF19, RF20 | `servicios_externos.proveedor_id` (FK) |

---

## Anexo: reglas del backlog previo no incorporadas

Se documentan para dejar explícito que **no se perdieron por descuido**, sino
que se excluyeron con criterio:

| Regla previa | Motivo de exclusión |
|---|---|
| «Un trabajador puede estar asignado a más de un proyecto activo, pero cada asignación debe tener periodo y estado propios (a confirmar con stakeholder)» | No es una restricción, es una descripción del modelo de datos (`asignaciones_personal` ya lo permite por diseño). Además quedó marcada como pendiente de confirmar con el stakeholder. |
| «Toda actividad debe estar asociada a un cargo/responsable habilitado para ejecutarla» | El concepto de «habilitado» no está definido en ninguna parte del enunciado ni del modelo de datos; no es verificable tal como está redactada. La parte verificable («toda actividad debe tener responsable») ya está cubierta por RF03. |

Si el equipo o el stakeholder deciden que alguna de estas dos debe volver,
requieren primero una definición operativa (qué significa «habilitado», y
confirmación del stakeholder sobre la multi-asignación).

---

## Anexo: estado de aplicación en `schema.sql`

Verificado ejecutando `docs/schema.sql` contra **MySQL 8.0.46** (motor
objetivo) y contra MariaDB 10.11 (entorno de desarrollo): 27/27 tablas en
ambos. La BD garantiza reglas mediante restricciones declarativas
(FK, CHECK, UNIQUE, NOT NULL) y tres triggers de inventario. La columna
indica qué parte de cada regla queda garantizada por la base de datos
y qué parte queda a cargo de la capa de aplicación.

| RN | Aplicación en BD | Pendiente en aplicación |
|----|---|---|
| RN01 | **Sí** (corregido en esta revisión): `chk_mat_existencia` (`existencia_total >= 0`) sobre la existencia que mantienen los triggers; un despacho superior a lo disponible falla con error 3819. | Traducir el error a un mensaje de usuario claro. |
| RN02 | Sí: `detalles_salida_materiales` → FK a `salidas_materiales`, con `proyecto_id` y `despachado_por_usuario_id` NOT NULL. | — |
| RN03 | Parcial: `herramientas.estado`/disponibilidad como enum. | Impedir doble préstamo simultáneo de la misma herramienta. |
| RN04 | Parcial: columna de estado en la devolución. | Exigirla como obligatoria al registrar la devolución. |
| RN05 | **Sí**: `actividades.etapa_id` NOT NULL → `etapas_proyecto.proyecto_id` NOT NULL. | — |
| RN06 | **Sí** (corregido en esta revisión): triggers `trg_entrada_suma_existencia`, `trg_salida_descuenta_existencia` y `trg_devolucion_suma_existencia` mantienen `materiales.existencia_total`. | — |
| RN07 | **Sí** (corregido en esta revisión): baja lógica (`activo`, `fecha_baja`, `baja_por_usuario_id`) en las 9 tablas con historial, y `ON DELETE RESTRICT` en las FK hacia entidades históricas. Un `DELETE` de proyecto con etapas es rechazado por el motor (error 1451), comprobado en MySQL 8 y MariaDB. | Usar baja lógica en la aplicación y filtrar `activo = 1` en consultas operativas. |
| RN08 | Parcial: `actividades.fecha_fin_programada`, `estado`. | Cálculo de «atrasada» y generación de la alerta. |
| RN09 | Parcial: `chk_proyecto_avance`, `chk_actividad_avance` (0–100). | Derivación del avance del proyecto desde sus actividades. |
| RN10 | No. | Cálculo de indicadores desde datos transaccionales. |
| RN11 | **Sí**: `proyectos.responsable_id` NOT NULL. | — |
| RN12 | No. | Validación al cerrar proyecto. |
| RN13 | **Sí** (corregido en esta revisión): `devoluciones_materiales.salida_origen_id` con FK a `salidas_materiales`. | Validar además que el material devuelto pertenezca a esa salida. |
| RN14 | **Sí**: `servicios_externos.proveedor_id` FK. | — |

### Corregido en esta revisión

1. **RN07 / RF32 / RNF07.** El esquema declaraba `ON DELETE CASCADE` de
   proyecto hacia etapas, actividades, asignaciones, seguimiento, incidencias
   y servicios: borrar un proyecto destruía su historial, contradiciendo el
   enunciado. Ahora esas FK son `ON DELETE RESTRICT` y las entidades con
   historial tienen baja lógica. Verificado: el `DELETE` es rechazado y el
   historial sobrevive a la baja lógica.
2. **RN13.** El documento afirmaba una FK de `devoluciones_materiales` a la
   salida previa que no existía. Se añadió (`salida_origen_id`).

### Riesgo abierto

**RN10 y RN12 no tienen soporte en la BD ni en la aplicación.** El backend
implementa hoy solo `auth` y `usuarios`, así que el cálculo de indicadores a
partir de información transaccional (RN10) y la validación de cierre de
proyecto (RN12) no están en ninguna capa. No es una contradicción documental,
es trabajo pendiente en los servicios de indicadores y proyectos.

RN03, RN04, RN08 y RN09 quedan parcialmente en la BD y se completan en la
aplicación; RN13 tiene ya la FK, falta validar que el material devuelto
pertenezca a esa salida.
