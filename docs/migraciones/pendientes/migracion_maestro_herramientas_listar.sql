-- HU-30: el maestro de obra necesita consultar el catálogo de herramientas
-- (y los almacenes) para elegir qué solicitar. Solo lectura: no recibe
-- herramientas.crear/editar/dar_baja ni prestamos_herramientas.listar, así que
-- la pestaña «Préstamos» sigue siendo solo de bodega y administrador.
-- Idempotente.
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_maestro_herramientas_listar.sql

INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id` FROM `roles` r JOIN `permisos` p ON p.`nombre` = 'herramientas.listar'
 WHERE r.`nombre` = 'MAESTRO_OBRA';

SELECT COUNT(*) AS maestro_herramientas_listar FROM `roles_permisos` rp
  JOIN `roles` r ON r.`id` = rp.`rol_id` JOIN `permisos` p ON p.`id` = rp.`permiso_id`
 WHERE r.`nombre` = 'MAESTRO_OBRA' AND p.`nombre` = 'herramientas.listar';
