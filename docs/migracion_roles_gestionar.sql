-- Administración de roles y permisos (HU-01): añade el permiso `roles.gestionar`.
--
-- Necesario para las bases que vienen del esquema anterior: la pantalla Roles y
-- permisos ahora permite crear, editar y eliminar roles y asignarles permisos,
-- y esas rutas exigen este permiso. Es idempotente.
--
-- Uso:
--   mysql -u root -p sincoco < docs/migracion_roles_gestionar.sql

INSERT INTO `permisos` (`nombre`, `descripcion`, `modulo`)
VALUES ('roles.gestionar',
        'Crear, editar y eliminar roles y asignar sus permisos',
        'usuarios')
ON DUPLICATE KEY UPDATE
  `descripcion` = VALUES(`descripcion`),
  `modulo` = VALUES(`modulo`);

-- El administrador administra la matriz: se le concede el permiso nuevo.
INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id`
  FROM `roles` r
  JOIN `permisos` p ON p.`nombre` = 'roles.gestionar'
 WHERE r.`nombre` = 'ADMINISTRADOR';

SELECT 'permisos' tabla, COUNT(*) filas FROM `permisos`
UNION ALL SELECT 'roles_permisos', COUNT(*) FROM `roles_permisos`;
