# Estado de las migraciones

Las migraciones de esquema viven en dos carpetas:

- `docs/migraciones/aplicadas/`: ya están aplicadas en el RDS de producción (`sincoco-db`, us-east-2).
- `docs/migraciones/pendientes/`: todavía no están aplicadas en AWS. El job `migrar` las aplica en el próximo despliegue.

`docs/schema.sql` refleja el estado **aplicado** en AWS. Las pendientes no están
incluidas en `schema.sql` todavía.

Verificado el 2026-10-07 contra el dump del RDS.

## Aplicadas en AWS (11)

Su efecto está presente en el dump: tablas, columnas, triggers o permisos.

| Migración | Qué aplica | Verificado en AWS |
|---|---|---|
| `migracion_catalogos.sql` | tablas `cargos` y `especialidades`, columna `cargo_id` | tablas y columna presentes |
| `migracion_password_reset.sql` | tabla `restablecimientos_password` | tabla presente |
| `migracion_sesion_unica.sql` | `usuarios.sesion_actual`, `sesion_iniciada_en`, `sesion_actividad` | columnas presentes |
| `migracion_categorias_personal.sql` | columna `categoria` en `cargos` y `especialidades` | columna presente |
| `migracion_personal_baja.sql` | baja de trabajadores (`fecha_baja`) | columna presente |
| `migracion_roles_gestionar.sql` | permiso `roles.gestionar` | presente |
| `migracion_rbac_acceso.sql` | permisos de acceso a proyectos | presentes |
| `migracion_usuarios_editar.sql` | permiso `usuarios.editar` | presente |
| `migracion_catalogo_gerente.sql` | permisos `catalogos.*` del GERENTE | presentes |
| `migracion_permisos_gerente_maestro.sql` | permisos de GERENTE y MAESTRO_OBRA | presentes |
| `migracion_plan_editar.sql` | permisos `etapas.editar`, `actividades.editar` | presentes |

## Pendientes (2)

| Migración | Qué falta en AWS | Motivo |
|---|---|---|
| `migracion_bitacora_inmutable.sql` | triggers `trg_bitacora_no_update` y `trg_bitacora_no_delete` | Los triggers no existen en el dump. La bitácora todavía se puede modificar en producción. |
| `migracion_herramientas.sql` | permisos `herramientas.crear`, `herramientas.dar_baja`, `herramientas.editar` y `herramientas.listar` | Las tablas `herramientas` y `almacenes` sí existen, pero los permisos no. El módulo de herramientas puede responder 403 en producción. |

Al aplicarse cada pendiente en producción, hay que moverla a `aplicadas/`, actualizar
esta tabla y, si cambió la estructura, `docs/schema.sql`.

## Cómo se verificó

Para cada migración se buscaron en el dump los objetos que crea o modifica (tablas,
columnas, triggers y códigos de permiso). Si todos aparecen, se clasifica como aplicada.

Esta verificación no comprueba los datos de las migraciones que hacen `UPDATE`, ni las
asignaciones de permisos a roles (`roles_permisos`). Esa parte requiere revisar la tabla
en AWS.
