-- Seed de permisos (HU-01 · criterio 4).
--
-- RF01 · RNF05: los permisos del usuario están determinados por los permisos
-- asociados a su rol (roles_permisos); no se asignan de forma individual.
-- Este archivo carga el catálogo de permisos y la matriz rol -> permisos que
-- reproduce el acceso vigente de la aplicación.
--
-- Uso:
--   mysql -u root -p sincoco < docs/seed_permisos_prueba.sql
--
-- Es idempotente: se puede relanzar sin duplicar filas.

INSERT INTO `permisos` (`nombre`, `descripcion`, `modulo`) VALUES
  ('usuarios.listar',          'Listar usuarios del sistema',              'usuarios'),
  ('usuarios.crear',           'Registrar usuarios y asignarles rol',      'usuarios'),
  ('usuarios.cambiar_rol',     'Cambiar el rol de un usuario existente',   'usuarios'),
  ('usuarios.cambiar_estado',  'Bloquear o activar una cuenta',            'usuarios'),
  ('clientes.listar',          'Listar el catálogo de clientes',           'clientes'),
  ('clientes.crear',           'Registrar clientes',                       'clientes'),
  ('proyectos.listar',         'Consultar el listado de proyectos',        'proyectos'),
  ('proyectos.registrar',      'Registrar un proyecto',                    'proyectos'),
  ('proyectos.dar_baja',       'Dar de baja lógica un proyecto',           'proyectos'),
  ('trabajadores.listar',      'Listar el personal',                       'personal'),
  ('trabajadores.crear',       'Registrar personal',                       'personal'),
  ('trabajadores.editar',      'Editar los datos del personal',            'personal'),
  ('trabajadores.dar_baja',    'Dar de baja lógica a un trabajador',       'personal'),
  ('etapas.listar',            'Consultar las etapas del plan de trabajo', 'planificacion'),
  ('etapas.crear',             'Definir etapas del plan de trabajo',       'planificacion'),
  ('etapas.dar_baja',          'Dar de baja lógica una etapa',             'planificacion'),
  ('actividades.listar',       'Consultar las actividades del plan',       'planificacion'),
  ('actividades.crear',        'Definir actividades del plan de trabajo',  'planificacion'),
  ('actividades.dar_baja',     'Dar de baja lógica una actividad',         'planificacion'),
  -- HU-17: la bitácora se consulta con un permiso propio, no con el de usuarios.
  ('auditoria.listar',         'Consultar la bitácora de trazabilidad',    'auditoria')
ON DUPLICATE KEY UPDATE
  `descripcion` = VALUES(`descripcion`),
  `modulo` = VALUES(`modulo`);

-- Matriz rol -> permisos. Se reconstruye completa para que el archivo sea la
-- única fuente de verdad de la asignación.
DELETE FROM `roles_permisos`;

-- ADMINISTRADOR: todos los permisos del sistema.
INSERT INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id`
FROM `roles` r CROSS JOIN `permisos` p
WHERE r.`nombre` = 'ADMINISTRADOR';

-- GERENTE: consulta de proyectos, personal, plan y clientes (sin edición).
INSERT INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id`
FROM `roles` r JOIN `permisos` p
WHERE r.`nombre` = 'GERENTE'
  AND p.`nombre` IN (
    'clientes.listar', 'proyectos.listar',
    'trabajadores.listar', 'etapas.listar', 'actividades.listar'
  );

-- MAESTRO_OBRA: consulta de proyectos y del plan de trabajo.
INSERT INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id`
FROM `roles` r JOIN `permisos` p
WHERE r.`nombre` = 'MAESTRO_OBRA'
  AND p.`nombre` IN ('proyectos.listar', 'etapas.listar', 'actividades.listar');

-- ENCARGADO_BODEGA y TRABAJADOR: sin permisos sobre estos módulos.
--
-- `auditoria.listar` (HU-17) queda solo en el administrador: no aparece en las
-- listas de GERENTE ni MAESTRO_OBRA, y el CROSS JOIN de arriba ya se lo da a
-- ADMINISTRADOR.
