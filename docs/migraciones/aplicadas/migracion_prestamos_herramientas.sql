-- HU-11 (solo lectura) · panel de préstamos de herramientas.
-- La tabla `prestamos_herramientas` ya existe en docs/schema.sql. Solo se crea
-- el permiso de consulta y se asigna a ADMINISTRADOR y ENCARGADO_BODEGA: el
-- maestro de obra no ve préstamos, solo sus solicitudes. Idempotente.
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_prestamos_herramientas.sql

INSERT INTO `permisos` (`nombre`, `descripcion`, `modulo`) VALUES
  ('prestamos_herramientas.listar', 'Consultar los préstamos de herramientas', 'prestamos_herramientas')
ON DUPLICATE KEY UPDATE `descripcion` = VALUES(`descripcion`), `modulo` = VALUES(`modulo`);

INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id` FROM `roles` r JOIN `permisos` p ON p.`nombre` = 'prestamos_herramientas.listar'
 WHERE r.`nombre` IN ('ADMINISTRADOR', 'ENCARGADO_BODEGA');

SELECT COUNT(*) AS permisos_prestamos FROM `permisos` WHERE `modulo` = 'prestamos_herramientas';
