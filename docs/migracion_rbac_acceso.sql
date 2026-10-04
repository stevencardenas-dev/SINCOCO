-- Gestión de acceso a proyectos y actividades (RBAC).
--
-- Agrega dos permisos a la matriz roles_permisos:
--   - `proyectos.gestionar_acceso`: asignar personal a proyectos y actividades
--     (solo el administrador).
--   - `proyectos.acceso_total`: ver todos los proyectos; sin este permiso, cada
--     persona ve únicamente los proyectos donde está asignada o de los que es
--     responsable (administrador y gerente).
--
-- `docs/schema.sql` no trae permisos (los carga `seed_permisos_prueba.sql`),
-- así que este archivo aplica tanto a bases nuevas como existentes y es
-- idempotente.
--
-- Uso:
--   mysql -u root -p sincoco < docs/migracion_rbac_acceso.sql

INSERT INTO `permisos` (`nombre`, `descripcion`, `modulo`) VALUES
  ('proyectos.gestionar_acceso', 'Asignar personal a proyectos y actividades', 'proyectos'),
  ('proyectos.acceso_total',     'Ver todos los proyectos, no solo los asignados', 'proyectos')
ON DUPLICATE KEY UPDATE
  `descripcion` = VALUES(`descripcion`),
  `modulo` = VALUES(`modulo`);

-- ADMINISTRADOR: administra las asignaciones y ve todos los proyectos.
INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id`
  FROM `roles` r
  JOIN `permisos` p ON p.`nombre` IN ('proyectos.gestionar_acceso', 'proyectos.acceso_total')
 WHERE r.`nombre` = 'ADMINISTRADOR';

-- GERENTE: monitorea todos los proyectos, pero no administra asignaciones.
INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id`
  FROM `roles` r
  JOIN `permisos` p ON p.`nombre` = 'proyectos.acceso_total'
 WHERE r.`nombre` = 'GERENTE';

SELECT 'permisos' tabla, COUNT(*) filas FROM `permisos`
UNION ALL SELECT 'roles_permisos', COUNT(*) FROM `roles_permisos`;
