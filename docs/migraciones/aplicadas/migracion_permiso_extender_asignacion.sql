-- HU-31 (AYD-45): permiso `asignaciones.extender`.
--
-- La tarjeta fija como actor al administrador, pero la extensión usaba
-- `proyectos.gestionar_acceso`, que el gerente también tiene. Se separa en un
-- permiso propio que solo recibe el administrador. Es idempotente.
--
-- Uso:
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_permiso_extender_asignacion.sql

INSERT INTO `permisos` (`nombre`, `descripcion`, `modulo`)
VALUES ('asignaciones.extender',
        'Extender la fecha fin de una asignación de personal',
        'proyectos')
ON DUPLICATE KEY UPDATE
  `descripcion` = VALUES(`descripcion`),
  `modulo` = VALUES(`modulo`);

INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id`
  FROM `roles` r
  JOIN `permisos` p ON p.`nombre` = 'asignaciones.extender'
 WHERE r.`nombre` = 'ADMINISTRADOR';

SELECT 'permisos' tabla, COUNT(*) filas FROM `permisos`
UNION ALL SELECT 'roles_permisos', COUNT(*) FROM `roles_permisos`;
