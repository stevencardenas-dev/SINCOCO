-- Gestión Administrativa: el GERENTE administra los catálogos del sistema.
--
-- HU-04 · RF01 · RF06: la pantalla «Catálogo» pasa a llamarse «Gestión
-- Administrativa» y el gerente (dueño de la constructora) la ve y opera igual
-- que el administrador. La decisión está en la matriz rol -> permiso, no en el
-- código: se asignan a GERENTE los permisos `catalogos.listar` (ver la pantalla)
-- y `catalogos.gestionar` (crear, editar, dar de baja y reactivar cargos,
-- especialidades y clientes).
--
-- Es idempotente y solo AGREGA: si el administrador ya había reasignado estos
-- permisos desde la pantalla Roles y permisos, no los quita.
--
-- Uso:
--   mysql -u root -p sincoco < docs/migracion_catalogo_gerente.sql

INSERT INTO `permisos` (`nombre`, `descripcion`, `modulo`) VALUES
  ('catalogos.listar',    'Consultar los catálogos de cargos, especialidades y clientes', 'catalogos'),
  ('catalogos.gestionar', 'Crear, editar y dar de baja cargos, especialidades y clientes', 'catalogos')
ON DUPLICATE KEY UPDATE
  `descripcion` = VALUES(`descripcion`),
  `modulo` = VALUES(`modulo`);

-- ADMINISTRADOR: los conserva (el CROSS JOIN del seed se los da, pero una base
-- migrada podría no tenerlos si la matriz se editó a mano).
INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id`
  FROM `roles` r
  JOIN `permisos` p ON p.`nombre` IN ('catalogos.listar', 'catalogos.gestionar')
 WHERE r.`nombre` = 'ADMINISTRADOR';

-- GERENTE: ver e interactuar con la Gestión Administrativa.
INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id`
  FROM `roles` r
  JOIN `permisos` p ON p.`nombre` IN ('catalogos.listar', 'catalogos.gestionar')
 WHERE r.`nombre` = 'GERENTE';

SELECT 'permisos' tabla, COUNT(*) filas FROM `permisos`
UNION ALL SELECT 'roles_permisos', COUNT(*) FROM `roles_permisos`;
