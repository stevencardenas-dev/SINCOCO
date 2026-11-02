-- HU-12 · devolución de herramientas.
-- Permiso prestamos_herramientas.devolver (registrar la devolución de una herramienta prestada) para ADMINISTRADOR y
-- ENCARGADO_BODEGA. La tabla `prestamos_herramientas` ya tiene los campos de la devolución (fecha real, condición,
-- observación y quien recibe), así que no cambia su estructura.
-- Idempotente.
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_devolucion_herramientas.sql

INSERT INTO `permisos` (`nombre`, `descripcion`, `modulo`) VALUES
  ('prestamos_herramientas.devolver', 'Registrar la devolución de una herramienta prestada', 'prestamos_herramientas')
ON DUPLICATE KEY UPDATE `descripcion` = VALUES(`descripcion`), `modulo` = VALUES(`modulo`);

INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id` FROM `roles` r JOIN `permisos` p ON p.`nombre` = 'prestamos_herramientas.devolver'
 WHERE r.`nombre` IN ('ADMINISTRADOR', 'ENCARGADO_BODEGA');

SELECT (SELECT COUNT(*) FROM `permisos` WHERE `nombre` = 'prestamos_herramientas.devolver') AS permiso_devolver;
