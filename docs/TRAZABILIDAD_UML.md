# Trazabilidad modelo → clases → endpoints → pruebas

Tomada del código (`grep "HU-xx" backend/src`, `backend/src/routes`, `docs/migraciones`) el 2026-11-10.
Rutas relativas a `backend/src/`. Pruebas unitarias en `backend/test/`; pruebas de API en `tests/`.

Diagramas de referencia: Drive, carpeta «Sprint 3 - Diagramas UML» (una subcarpeta por HU con
`4 - secuencia.png`, y `Generales/clases.png`). La columna «Diferencias con el diagrama» queda
se llenó el 2026-11-10 comparando cada `4 - secuencia.png` con el código (sección final).

## Historias pedidas en la evaluación

| HU | Modelo (tablas / migración) | Clases | Endpoints | Pruebas |
|---|---|---|---|---|
| HU-34 Reprogramación | `reprogramaciones_plan` (inmutable por trigger), columnas `fecha_*_original` en etapas, actividades y proyectos (`migracion_reprogramacion_plan.sql`); `autorizado_por_usuario_id` (`migracion_reprogramacion_autorizado_por.sql`, PR #160) | reprogramacionService, reprogramacionRepository, ReprogramarDto, controllers/reprogramacionController, entities Etapa/Actividad/Proyecto | PATCH /api/etapas/:id/reprogramar, GET /api/etapas/:id/reprogramaciones, PATCH /api/actividades/:id/reprogramar, GET /api/actividades/:id/reprogramaciones | hu34_reprogramacion.test.js, hu34_transaccion_reprogramacion.test.js (PR #143), hu34_autorizado_por.test.js (PR #160), tests/test_hu34_reprogramacion.py |
| HU-30 Solicitud de herramientas | `solicitudes_herramientas` (`migracion_solicitudes_herramientas*.sql`) | solicitudHerramientaService, solicitudHerramientaRepository | GET/POST /api/solicitudes-herramientas, PATCH …/:id/aprobar, …/rechazar, …/atender, …/cancelar | hu30_solicitud_herramientas.test.js |
| HU-33 Disponibilidad del personal | `trabajadores.disponible` y `estado`, `asignaciones_personal` (`migracion_categorias_personal.sql`, `migracion_asignacion_cancelada.sql`) | trabajadorService, trabajadorRepository, controllers/trabajadorController; accesoService + asignacionRepository.crearConBloqueo (PR #142) | PATCH /api/trabajadores/:id/estado, GET /api/trabajadores, POST /api/asignaciones | tests/test_hu33_disponibilidad.py, hu05_concurrencia_asignaciones.test.js (PR #142) |
| HU-17 Auditoría | `bitacora_trazabilidad` (inmutable, `migracion_bitacora_inmutable.sql`) | auditoriaService, auditoriaRepository, controllers/auditoriaController, db/bitacora.js | GET /api/auditoria | hu17_auditoria.test.js, tests/test_hu17_auditoria.py, tests/test_ui_hu17_auditoria.py |

## Las 12 historias del Sprint 3 (Jira: Actividades completadas)

| HU (Jira) | Modelo (tablas / migración) | Clases | Endpoints | Pruebas |
|---|---|---|---|---|
| HU-19 Ingreso de materiales (AYD-31) | `entradas_inventario`, `detalles_entrada_inventario`, `ordenes_compra` (`migracion_entradas_inventario.sql`) | entradaInventarioService, entradaInventarioRepository | GET/POST /api/entradas-inventario, GET …/ordenes-compra, …/proveedores, …/:id | hu19_ingreso_materiales.test.js |
| HU-11 Entrega de herramientas (AYD-23) | `prestamos_herramientas`, `herramientas.disponibilidad` (`migracion_prestamos_herramientas*.sql`) | prestamoHerramientaService, prestamoHerramientaRepository.entregar (transacción + FOR UPDATE), herramientaService, entity Herramienta | GET/POST /api/prestamos-herramientas | hu11_entrega_herramientas.test.js |
| HU-09 Devolución de materiales (AYD-21) | `devoluciones_materiales` (`migracion_devoluciones_materiales.sql`) | devolucionMaterialService, devolucionMaterialRepository | GET/POST /api/devoluciones-materiales, GET …/opciones, …/actividades, …/salidas | hu09_devolucion_materiales.test.js |
| HU-12 Devolución de herramientas (AYD-24) | `prestamos_herramientas` (devolución) (`migracion_devolucion_herramientas.sql`) | prestamoHerramientaService, prestamoHerramientaRepository | POST /api/prestamos-herramientas/:id/devolucion | hu12_devolucion_herramienta.test.js |
| HU-08 Solicitud de materiales (AYD-20) | `solicitudes_materiales`, `detalles_solicitud_materiales`, `presupuesto_materiales_actividad` (`migracion_solicitudes_materiales*.sql`) | solicitudMaterialService, solicitudMaterialRepository, presupuestoMaterialService/Repository, controllers/presupuestoMaterialController | GET/POST /api/solicitudes-materiales, GET …/materiales, …/trabajadores, PATCH …/:id/cancelar, GET/PUT /api/actividades/:id/presupuesto-materiales | hu08_solicitud_materiales.test.js, hu08_presupuesto_materiales.test.js, tests/test_e2e_materiales.py (PR #161) |
| HU-20 Consumo real de materiales (AYD-32) | `consumos_materiales` (`migracion_consumos_materiales.sql`) | consumoMaterialService, consumoMaterialRepository | GET/POST /api/consumos-materiales, GET …/disponibles, …/consolidacion, PATCH …/:id/solicitar-anulacion, …/autorizar-anulacion, …/rechazar-anulacion | hu20_consumo_materiales.test.js |
| HU-23 Alerta de stock mínimo (AYD-35) | `alertas`, `materiales.nivel_minimo` + triggers (`migracion_alertas_stock_minimo.sql`) | alertaService, alertaRepository, materialService, dashboardRepository | GET /api/alertas, PATCH /api/alertas/:id/atender | hu23_alerta_stock_minimo.test.js |
| HU-35 Reasignación por avería (AYD-49) | `prestamos_herramientas` (reemplazo), `incidencias` (`migracion_reemplazo_herramientas.sql`) | prestamoHerramientaService, prestamoHerramientaRepository (transacción + FOR UPDATE) | GET /api/prestamos-herramientas/:id/reemplazos, POST …/:id/reemplazo | hu35_reemplazo_herramienta.test.js |
| HU-36 Aprobación parcial (AYD-50) | `detalles_solicitud_materiales.cantidad_aprobada`, saldo cancelado (`migracion_solicitudes_materiales_saldo.sql`) | solicitudMaterialService, solicitudMaterialRepository | PATCH /api/solicitudes-materiales/:id/aprobar, …/rechazar, …/cancelar-saldo | hu08_solicitud_materiales.test.js (casos HU-36), tests/test_e2e_materiales.py (PR #161) |
| HU-29 Traslado entre almacenes (AYD-41) | `traslados_materiales`, `existencias_almacen` (`migracion_traslados_materiales.sql`, `migracion_existencias_almacen.sql`) | trasladoMaterialService, trasladoMaterialRepository (FOR UPDATE) | GET/POST /api/traslados-materiales, GET …/opciones, …/:id | hu29_traslado_materiales.test.js |
| HU-26 Salida de materiales (AYD-38) | `salidas_materiales`, `detalles_salida_materiales`, `existencias_almacen` (`migracion_salidas_materiales.sql`) | salidaMaterialService, salidaMaterialRepository, existenciaAlmacenRepository, solicitudMaterialRepository.despachar (transacción + FOR UPDATE) | PATCH /api/solicitudes-materiales/:id/despachar, GET /api/salidas-materiales, …/existencias, …/:id | hu26_salidas_materiales.test.js, tests/test_e2e_materiales.py (PR #161) |
| HU-37 Mantenimiento y estado de herramientas (AYD-51) | `herramientas.estado_operativo`, historial de reparaciones (`migracion_estado_herramientas.sql`) | herramientaEstadoService, herramientaEstadoRepository (FOR UPDATE), herramientaService, controllers/herramientaController | PATCH /api/herramientas/:id/estado, GET /api/herramientas/:id/reparaciones | hu37_estado_herramientas.test.js |

## Observaciones del lado del código

- HU-36 no tiene archivo de prueba propio: sus casos están dentro de `hu08_solicitud_materiales.test.js`.
- HU-33 no tiene prueba unitaria propia: la cubren `tests/test_hu33_disponibilidad.py` (API) y la prueba de concurrencia de asignaciones.
- Todos los controladores que nombran los diagramas existen en `controllers/` con ese nombre
  (solicitudMaterialController, devolucionMaterialController, prestamoHerramientaController, entradaInventarioController,
  consumoMaterialController, alertaController, trasladoMaterialController, herramientaController).
- Las migraciones de HU-12 y HU-29 siguen en `docs/migraciones/pendientes/` aunque ya se aplicaron en producción:
  falta fusionar el PR automático «Registrar migraciones aplicadas en producción».

## Diferencias entre los diagramas de secuencia (Drive) y el código

Revisados los 12 diagramas `4 - secuencia.png` del Sprint 3. Endpoint, controlador, service, repositorio,
bloqueo `SELECT ... FOR UPDATE` dentro de la transacción y registro en la bitácora después del COMMIT coinciden en todos,
salvo lo siguiente:

| HU | Diagrama | Código | Qué corregir |
|---|---|---|---|
| HU-35 | Rama «sin reemplazo» termina en ROLLBACK | Sin reemplazo también se confirma: cierra el préstamo averiado, crea la incidencia y la reparación y hace COMMIT; solo no se entrega otra herramienta (`repositories/prestamoHerramientaRepository.js`, `reemplazar`) | El diagrama: cambiar ROLLBACK por «cerrar préstamo; INSERT incidencia; INSERT reparación; COMMIT» |
| HU-36 | Participante `:notificacionService`, llamado solo si la aprobación es parcial (opt) | No existe `notificacionService`: la notificación la inserta `solicitudMaterialRepository.aprobar` dentro de la misma transacción, y se envía siempre (parcial o total, con distinto título) (`services/solicitudMaterialService.js`, `aprobarSolicitud`) | El diagrama: quitar `notificacionService`, mover la notificación dentro de `aprobar(...)` y quitar el opt |
| HU-37 | `herramientaRepository.cambiarEstado` | `herramientaEstadoRepository.cambiarEstado`; `herramientaRepository` solo se usa al final para `findById` (`services/herramientaEstadoService.js`) | El diagrama: renombrar el participante a `:herramientaEstadoRepository` |
| HU-08 | Solo la rama «exceso sin confirmar → 409» | Además: exceso confirmado sin observaciones → 400 (justificación obligatoria) (`services/solicitudMaterialService.js`, `crearSolicitud`) | El diagrama: agregar la rama 400 |
| HU-29 | `findAlmacenes() / findMaterial()` en el service antes de `registrar` | El service llama directo a `repo.registrar(...)`; la validación de almacenes y material va dentro de la transacción; después hace `findById` | Diferencia menor: actualizar el diagrama |

Sin diferencias relevantes: HU-09, HU-11, HU-12, HU-19, HU-20, HU-23, HU-26.

No se compararon: el diagrama de clases general (`Generales/clases.png`, demasiado denso para leerlo con fiabilidad) ni los
diagramas de casos de uso, actividad, estados y comunicación de cada HU. HU-34, HU-30, HU-33 y HU-17 no tienen carpeta
en «Sprint 3 - Diagramas UML».
