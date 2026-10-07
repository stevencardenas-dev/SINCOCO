-- Reacomodo de permisos de GERENTE y MAESTRO_OBRA.
--
-- El GERENTE (dueño de la constructora) pasa de solo consultar a gestionar la
-- operación del negocio: proyectos, clientes, personal, plan de trabajo y
-- asignación de personal. NO recibe nada de usuarios, roles, catálogos ni
-- auditoría: la administración técnica sigue siendo del ADMINISTRADOR, que
-- conserva todos los permisos.
--
-- El MAESTRO_OBRA pasa a gestionar el plan de trabajo (etapas y actividades) y a
-- editar sus proyectos, sin poder crearlos, darlos de baja ni asignar personal.
-- Su alcance sigue limitado a los proyectos donde está asignado (el backend
-- comprueba el acceso al proyecto en cada operación).
--
-- Agrega el permiso `proyectos.editar`: hasta ahora editar un proyecto exigía
-- `proyectos.registrar`, de modo que quien podía corregir también podía crear.
--
-- Es idempotente y solo AGREGA permisos; no quita ninguno ya asignado.
--
-- Uso:
--   mysql -u root -p sincoco < docs/migraciones/aplicadas/migracion_permisos_gerente_maestro.sql

INSERT INTO `permisos` (`nombre`, `descripcion`, `modulo`)
VALUES ('proyectos.editar', 'Editar la información de un proyecto', 'proyectos')
ON DUPLICATE KEY UPDATE
  `descripcion` = VALUES(`descripcion`),
  `modulo` = VALUES(`modulo`);

-- ADMINISTRADOR: conserva todo, incluido el permiso nuevo.
INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id`
  FROM `roles` r
  JOIN `permisos` p ON p.`nombre` = 'proyectos.editar'
 WHERE r.`nombre` = 'ADMINISTRADOR';

-- GERENTE
INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id`
  FROM `roles` r
  JOIN `permisos` p ON p.`nombre` IN (
    'clientes.crear',
    'proyectos.registrar', 'proyectos.editar', 'proyectos.dar_baja',
    'proyectos.gestionar_acceso',
    'trabajadores.crear', 'trabajadores.editar', 'trabajadores.dar_baja',
    'etapas.crear', 'etapas.dar_baja',
    'actividades.crear', 'actividades.dar_baja'
  )
 WHERE r.`nombre` = 'GERENTE';

-- MAESTRO_OBRA: clientes.listar y trabajadores.listar alimentan los selectores
-- del formulario de proyecto y de responsable de actividad.
INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id`
  FROM `roles` r
  JOIN `permisos` p ON p.`nombre` IN (
    'proyectos.editar',
    'etapas.crear', 'etapas.dar_baja',
    'actividades.crear', 'actividades.dar_baja',
    'clientes.listar', 'trabajadores.listar'
  )
 WHERE r.`nombre` = 'MAESTRO_OBRA';

SELECT 'permisos' tabla, COUNT(*) filas FROM `permisos`
UNION ALL SELECT 'roles_permisos', COUNT(*) FROM `roles_permisos`;
