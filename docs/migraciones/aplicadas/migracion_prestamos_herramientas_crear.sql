-- HU-11 · registrar la entrega de una herramienta a un trabajador.
-- Crea el permiso de escritura y lo asigna a ADMINISTRADOR y ENCARGADO_BODEGA. Idempotente.
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_prestamos_herramientas_crear.sql

INSERT INTO `permisos` (`nombre`, `descripcion`, `modulo`) VALUES
  ('prestamos_herramientas.crear', 'Registrar la entrega de una herramienta a un trabajador', 'prestamos_herramientas')
ON DUPLICATE KEY UPDATE `descripcion` = VALUES(`descripcion`), `modulo` = VALUES(`modulo`);

INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id` FROM `roles` r JOIN `permisos` p ON p.`nombre` = 'prestamos_herramientas.crear'
 WHERE r.`nombre` IN ('ADMINISTRADOR', 'ENCARGADO_BODEGA');

SELECT COUNT(*) AS permisos_prestamos FROM `permisos` WHERE `modulo` = 'prestamos_herramientas';
