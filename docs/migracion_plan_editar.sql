-- Editar el plan de trabajo: añade los permisos `etapas.editar` y
-- `actividades.editar`.
--
-- La pantalla del plan de un proyecto permite editar las propiedades de las
-- etapas y de las actividades; las rutas PATCH /api/etapas/:id y
-- PATCH /api/actividades/:id exigen estos permisos. Es idempotente.
--
-- Uso:
--   mysql -u root -p sincoco < docs/migracion_plan_editar.sql

INSERT INTO `permisos` (`nombre`, `descripcion`, `modulo`)
VALUES ('etapas.editar', 'Editar las propiedades de una etapa', 'planificacion'),
       ('actividades.editar', 'Editar las propiedades de una actividad', 'planificacion')
ON DUPLICATE KEY UPDATE
  `descripcion` = VALUES(`descripcion`),
  `modulo` = VALUES(`modulo`);

-- Quien ya puede definir etapas / actividades también puede editarlas.
INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT rp.`rol_id`, nuevo.`id`
  FROM `roles_permisos` rp
  JOIN `permisos` viejo ON viejo.`id` = rp.`permiso_id` AND viejo.`nombre` = 'etapas.crear'
  JOIN `permisos` nuevo ON nuevo.`nombre` = 'etapas.editar';

INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT rp.`rol_id`, nuevo.`id`
  FROM `roles_permisos` rp
  JOIN `permisos` viejo ON viejo.`id` = rp.`permiso_id` AND viejo.`nombre` = 'actividades.crear'
  JOIN `permisos` nuevo ON nuevo.`nombre` = 'actividades.editar';

SELECT 'permisos' tabla, COUNT(*) filas FROM `permisos`
UNION ALL SELECT 'roles_permisos', COUNT(*) FROM `roles_permisos`;
