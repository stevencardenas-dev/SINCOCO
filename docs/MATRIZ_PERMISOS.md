# Matriz operación → permiso (generada del código, 2026-11-09)

Generada leyendo backend/src/server.js (punto de montaje) y backend/src/routes/*.js (middleware requirePermiso/requireRole de cada ruta). La asignación rol → permiso vive en la tabla roles_permisos (docs/seed_permisos_prueba.sql + migraciones) y la entrega GET /api/roles/permisos. La prueba backend/test/rnf05_rutas_protegidas.test.js verifica que toda ruta no pública exige token.

| Ruta | Método | Permiso exigido (basta uno) |
|---|---|---|
| /api/actividades | GET | actividades.listar |
| /api/actividades | POST | actividades.crear |
| /api/actividades/:id | PATCH | actividades.editar |
| /api/actividades/:id/iniciar | PATCH | actividades.editar |
| /api/actividades/:id/finalizar | PATCH | actividades.editar |
| /api/actividades/:id/avance | POST | avance.registrar |
| /api/actividades/:id/avance | GET | avance.listar |
| /api/actividades/:id/criterios | GET | avance.listar |
| /api/actividades/:id/reprogramar | PATCH | actividades.reprogramar |
| /api/actividades/:id/reprogramaciones | GET | actividades.listar |
| /api/actividades/:id/presupuesto-materiales | GET | actividades.listar |
| /api/actividades/:id/presupuesto-materiales | PUT | actividades.editar |
| /api/actividades/:id/baja | PATCH | actividades.dar_baja |
| /api/actividades/:id/reactivar | PATCH | actividades.dar_baja |
| /api/alertas | GET | alertas.listar |
| /api/alertas/:id/atender | PATCH | alertas.atender |
| /api/asignaciones | GET | proyectos.listar |
| /api/asignaciones | POST | proyectos.gestionar_acceso |
| /api/asignaciones/:id | PATCH | proyectos.gestionar_acceso |
| /api/asignaciones/:id/historial | GET | proyectos.gestionar_acceso |
| /api/asignaciones/:id/extender | POST | asignaciones.extender |
| /api/auditoria | GET | auditoria.listar |
| /api/auth/login | POST | PÚBLICA (sin token) |
| /api/auth/logout | POST | solo token: datos propios o alcance por usuario |
| /api/auth/sesion | GET | solo token: datos propios o alcance por usuario |
| /api/auth/permisos | GET | solo token: datos propios o alcance por usuario |
| /api/auth/solicitar-reset | POST | PÚBLICA (sin token) |
| /api/auth/restablecer | POST | PÚBLICA (sin token) |
| /api/catalogos/:tipo | GET | catalogos.listar | catalogos.gestionar | trabajadores.listar |
| /api/catalogos/:tipo/:id | GET | catalogos.listar | catalogos.gestionar | trabajadores.listar |
| /api/catalogos/:tipo | POST | catalogos.gestionar |
| /api/catalogos/:tipo/:id | PATCH | catalogos.gestionar |
| /api/catalogos/:tipo/:id/baja | PATCH | catalogos.gestionar |
| /api/catalogos/:tipo/:id/reactivar | PATCH | catalogos.gestionar |
| /api/clientes | GET | clientes.listar | catalogos.gestionar |
| /api/clientes | POST | clientes.crear | catalogos.gestionar |
| /api/clientes/:id | PATCH | catalogos.gestionar |
| /api/clientes/:id/baja | PATCH | catalogos.gestionar |
| /api/clientes/:id/reactivar | PATCH | catalogos.gestionar |
| /api/consumos-materiales | GET | consumos_materiales.listar |
| /api/consumos-materiales/disponibles | GET | consumos_materiales.crear |
| /api/consumos-materiales/consolidacion | GET | consumos_materiales.listar |
| /api/consumos-materiales | POST | consumos_materiales.crear |
| /api/consumos-materiales/:id/solicitar-anulacion | PATCH | consumos_materiales.crear |
| /api/consumos-materiales/:id/autorizar-anulacion | PATCH | consumos_materiales.autorizar_anulacion |
| /api/consumos-materiales/:id/rechazar-anulacion | PATCH | consumos_materiales.autorizar_anulacion |
| /api/dashboard | GET | solo token: datos propios o alcance por usuario |
| /api/devoluciones-materiales | GET | devoluciones_materiales.listar |
| /api/devoluciones-materiales/opciones | GET | devoluciones_materiales.crear |
| /api/devoluciones-materiales/actividades | GET | devoluciones_materiales.crear |
| /api/devoluciones-materiales/salidas | GET | devoluciones_materiales.crear |
| /api/devoluciones-materiales | POST | devoluciones_materiales.crear |
| /api/entradas-inventario | GET | entradas_inventario.listar |
| /api/entradas-inventario/ordenes-compra | GET | entradas_inventario.listar |
| /api/entradas-inventario/proveedores | GET | entradas_inventario.crear |
| /api/entradas-inventario/:id | GET | entradas_inventario.listar |
| /api/entradas-inventario | POST | entradas_inventario.crear |
| /api/etapas | GET | etapas.listar |
| /api/etapas | POST | etapas.crear |
| /api/etapas/:id | PATCH | etapas.editar |
| /api/etapas/:id/iniciar | PATCH | etapas.editar |
| /api/etapas/:id/reprogramar | PATCH | etapas.reprogramar |
| /api/etapas/:id/reprogramaciones | GET | etapas.listar |
| /api/etapas/:id/baja | PATCH | etapas.dar_baja |
| /api/etapas/:id/reactivar | PATCH | etapas.dar_baja |
| /api/herramientas | GET | herramientas.listar |
| /api/herramientas/almacenes | GET | herramientas.listar |
| /api/herramientas/almacenes | POST | herramientas.crear |
| /api/herramientas/almacenes/:id | PATCH | herramientas.editar |
| /api/herramientas/almacenes/:id/baja | PATCH | herramientas.dar_baja |
| /api/herramientas/almacenes/:id/reactivar | PATCH | herramientas.dar_baja |
| /api/herramientas/:id | GET | herramientas.listar |
| /api/herramientas | POST | herramientas.crear |
| /api/herramientas/:id | PATCH | herramientas.editar |
| /api/herramientas/:id/baja | PATCH | herramientas.dar_baja |
| /api/herramientas/:id/reactivar | PATCH | herramientas.dar_baja |
| /api/herramientas/:id/estado | PATCH | herramientas.cambiar_estado |
| /api/herramientas/:id/reparaciones | GET | herramientas.listar |
| /api/incidencias | GET | incidencias.listar |
| /api/incidencias | POST | incidencias.crear |
| /api/incidencias/afectadas | GET | incidencias.listar |
| /api/incidencias/:id | GET | incidencias.listar |
| /api/incidencias/:id/evidencia/archivo | GET | incidencias.listar |
| /api/incidencias/:id | PATCH | incidencias.editar |
| /api/materiales | GET | materiales.listar |
| /api/materiales/categorias | GET | materiales.listar |
| /api/materiales/unidades | GET | materiales.listar |
| /api/materiales/almacenes | GET | materiales.listar |
| /api/materiales/:id | GET | materiales.listar |
| /api/materiales/:id/existencias | GET | materiales.listar |
| /api/materiales | POST | materiales.crear |
| /api/materiales/:id | PATCH | materiales.editar |
| /api/materiales/:id/baja | PATCH | materiales.dar_baja |
| /api/materiales/:id/reactivar | PATCH | materiales.dar_baja |
| /api/notificaciones | GET | solo token: datos propios o alcance por usuario |
| /api/notificaciones/:id/leida | PATCH | solo token: datos propios o alcance por usuario |
| /api/perfil | GET | solo token: datos propios o alcance por usuario |
| /api/perfil | PATCH | solo token: datos propios o alcance por usuario |
| /api/plantillas-etapas | GET | etapas.aplicar_plantilla |
| /api/plantillas-etapas/aplicar | POST | etapas.aplicar_plantilla |
| /api/prestamos-herramientas | GET | prestamos_herramientas.listar |
| /api/prestamos-herramientas | POST | prestamos_herramientas.crear |
| /api/prestamos-herramientas/:id/reemplazos | GET | prestamos_herramientas.reemplazar |
| /api/prestamos-herramientas/:id/reemplazo | POST | prestamos_herramientas.reemplazar |
| /api/prestamos-herramientas/:id/devolucion | POST | prestamos_herramientas.devolver |
| /api/proveedores | GET | proveedores.listar |
| /api/proveedores | POST | proveedores.crear |
| /api/proveedores/:id | GET | proveedores.listar |
| /api/proveedores/:id | PATCH | proveedores.editar |
| /api/proveedores/:id/baja | PATCH | proveedores.dar_baja |
| /api/proveedores/:id/reactivar | PATCH | proveedores.dar_baja |
| /api/proveedores/:id/documentos | GET | proveedores.listar |
| /api/proveedores/:id/documentos | POST | proveedores.documentos |
| /api/proveedores/:id/documentos/:docId | GET | proveedores.listar |
| /api/proveedores/:id/documentos/:docId | DELETE | proveedores.documentos |
| /api/proyectos | POST | proyectos.registrar |
| /api/proyectos | GET | proyectos.listar |
| /api/proyectos/:id/mi-acceso | GET | proyectos.listar |
| /api/proyectos/:id | PATCH | proyectos.editar |
| /api/proyectos/:id/baja | PATCH | proyectos.dar_baja |
| /api/proyectos/:id/reactivar | PATCH | proyectos.dar_baja |
| /api/roles/permisos | GET | usuarios.listar |
| /api/roles | POST | roles.gestionar |
| /api/roles/:id | PATCH | roles.gestionar |
| /api/roles/:id | DELETE | roles.gestionar |
| /api/roles/:id/permisos | PUT | roles.gestionar |
| /api/salidas-materiales | GET | salidas_materiales.listar |
| /api/salidas-materiales/existencias | GET | salidas_materiales.listar |
| /api/salidas-materiales/:id | GET | salidas_materiales.listar |
| /api/servicios-externos | GET | servicios_externos.listar |
| /api/servicios-externos | POST | servicios_externos.crear |
| /api/solicitudes-herramientas | GET | solicitudes_herramientas.listar |
| /api/solicitudes-herramientas | POST | solicitudes_herramientas.crear |
| /api/solicitudes-herramientas/:id/aprobar | PATCH | solicitudes_herramientas.resolver |
| /api/solicitudes-herramientas/:id/rechazar | PATCH | solicitudes_herramientas.resolver |
| /api/solicitudes-herramientas/:id/atender | PATCH | solicitudes_herramientas.resolver |
| /api/solicitudes-herramientas/:id/cancelar | PATCH | solicitudes_herramientas.listar |
| /api/solicitudes-materiales | GET | solicitudes_materiales.listar |
| /api/solicitudes-materiales/materiales | GET | solicitudes_materiales.crear |
| /api/solicitudes-materiales/trabajadores | GET | solicitudes_materiales.resolver |
| /api/solicitudes-materiales | POST | solicitudes_materiales.crear |
| /api/solicitudes-materiales/:id/aprobar | PATCH | solicitudes_materiales.resolver |
| /api/solicitudes-materiales/:id/rechazar | PATCH | solicitudes_materiales.resolver |
| /api/solicitudes-materiales/:id/despachar | PATCH | solicitudes_materiales.resolver |
| /api/solicitudes-materiales/:id/cancelar | PATCH | solicitudes_materiales.listar |
| /api/solicitudes-materiales/:id/cancelar-saldo | PATCH | solicitudes_materiales.resolver |
| /api/trabajadores | GET | trabajadores.listar |
| /api/trabajadores/:id | GET | trabajadores.listar |
| /api/trabajadores | POST | trabajadores.crear |
| /api/trabajadores/:id | PATCH | trabajadores.editar |
| /api/trabajadores/:id/estado | PATCH | trabajadores.editar |
| /api/trabajadores/:id/baja | PATCH | trabajadores.dar_baja |
| /api/trabajadores/:id/reactivar | PATCH | trabajadores.dar_baja |
| /api/traslados-materiales | GET | traslados_materiales.listar |
| /api/traslados-materiales/opciones | GET | traslados_materiales.crear |
| /api/traslados-materiales/:id | GET | traslados_materiales.listar |
| /api/traslados-materiales | POST | traslados_materiales.crear |
| /api/usuarios | GET | usuarios.listar |
| /api/usuarios/solicitudes-reset | GET | usuarios.listar |
| /api/usuarios/roles | GET | usuarios.crear | usuarios.cambiar_rol |
| /api/usuarios/trabajadores-disponibles | GET | usuarios.crear |
| /api/usuarios | POST | usuarios.crear |
| /api/usuarios/:id | PATCH | usuarios.editar |
| /api/usuarios/:id/estado | PATCH | usuarios.cambiar_estado |
| /api/usuarios/:id/rol | PATCH | usuarios.cambiar_rol |
| /api/usuarios/:id/baja | PATCH | usuarios.cambiar_estado |
| /api/usuarios/:id/reactivar | PATCH | usuarios.cambiar_estado |
