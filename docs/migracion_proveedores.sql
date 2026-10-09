-- HU-13: registro de proveedores y servicios (alta y listado de proveedores).
--
-- Crea los permisos `proveedores.*` y los asigna solo a ADMINISTRADOR (el
-- resto de roles no ve el módulo).
--
-- La tabla `proveedores` ya existe en docs/schema.sql; no se modifica.
-- Es idempotente: se puede relanzar sin duplicar filas ni quitar permisos.
--
-- Uso:
--   mysql -u root -p sincoco < docs/migracion_proveedores.sql

INSERT INTO `permisos` (`nombre`, `descripcion`, `modulo`) VALUES
  ('proveedores.listar', 'Consultar el catálogo de proveedores', 'proveedores'),
  ('proveedores.crear',  'Registrar proveedores',                'proveedores')
ON DUPLICATE KEY UPDATE
  `descripcion` = VALUES(`descripcion`),
  `modulo` = VALUES(`modulo`);

INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id`
  FROM `roles` r
  JOIN `permisos` p ON p.`modulo` = 'proveedores'
 WHERE r.`nombre` = 'ADMINISTRADOR';

SELECT 'permisos proveedores' AS tabla, COUNT(*) AS filas FROM `permisos` WHERE `modulo` = 'proveedores';
