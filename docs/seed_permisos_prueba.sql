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
  ('usuarios.editar',          'Editar el usuario y el correo de una cuenta', 'usuarios'),
  ('usuarios.cambiar_rol',     'Cambiar el rol de un usuario existente',   'usuarios'),
  ('usuarios.cambiar_estado',  'Bloquear o activar una cuenta',            'usuarios'),
  -- Administración de la matriz rol -> permiso (crear/editar/eliminar roles y
  -- asignar sus permisos). Solo ADMINISTRADOR.
  ('roles.gestionar',          'Crear, editar y eliminar roles y asignar sus permisos', 'usuarios'),
  ('clientes.listar',          'Listar el catálogo de clientes',           'clientes'),
  ('clientes.crear',           'Registrar clientes',                       'clientes'),
  ('proyectos.listar',         'Consultar el listado de proyectos',        'proyectos'),
  ('proyectos.registrar',      'Registrar un proyecto',                    'proyectos'),
  ('proyectos.editar',         'Editar la información de un proyecto',     'proyectos'),
  ('proyectos.dar_baja',       'Dar de baja lógica un proyecto',           'proyectos'),
  -- Gestión de acceso (RBAC): asignar personal a proyectos y actividades, y
  -- ver todos los proyectos en vez de solo los asignados.
  ('proyectos.gestionar_acceso', 'Asignar personal a proyectos y actividades', 'proyectos'),
  ('proyectos.acceso_total',   'Ver todos los proyectos, no solo los asignados', 'proyectos'),
  ('trabajadores.listar',      'Listar el personal',                       'personal'),
  ('trabajadores.crear',       'Registrar personal',                       'personal'),
  ('trabajadores.editar',      'Editar los datos del personal',            'personal'),
  ('trabajadores.dar_baja',    'Dar de baja lógica a un trabajador',       'personal'),
  ('etapas.listar',            'Consultar las etapas del plan de trabajo', 'planificacion'),
  ('etapas.crear',             'Definir etapas del plan de trabajo',       'planificacion'),
  ('etapas.editar',           'Editar las propiedades de una etapa',      'planificacion'),
  ('etapas.dar_baja',          'Dar de baja lógica una etapa',             'planificacion'),
  ('actividades.listar',       'Consultar las actividades del plan',       'planificacion'),
  ('actividades.crear',        'Definir actividades del plan de trabajo',  'planificacion'),
  ('actividades.editar',      'Editar las propiedades de una actividad',  'planificacion'),
  ('actividades.dar_baja',     'Dar de baja lógica una actividad',         'planificacion'),
  -- HU-17: la bitácora se consulta con un permiso propio, no con el de usuarios.
  ('auditoria.listar',         'Consultar la bitácora de trazabilidad',    'auditoria'),
  -- Catálogos del personal (cargos y especialidades) y de clientes.
  ('catalogos.listar',         'Consultar los catálogos de cargos, especialidades y clientes', 'catalogos'),
  ('catalogos.gestionar',      'Crear, editar y dar de baja cargos, especialidades y clientes', 'catalogos'),
  -- HU-10: catálogo de herramientas (administrador y encargado de bodega).
  ('herramientas.listar',      'Consultar el catálogo de herramientas',    'herramientas'),
  ('herramientas.crear',       'Registrar herramientas en el catálogo',    'herramientas'),
  ('herramientas.editar',      'Editar los datos y el estado de una herramienta', 'herramientas'),
  ('herramientas.dar_baja',    'Dar de baja lógica una herramienta',       'herramientas')
ON DUPLICATE KEY UPDATE
  `descripcion` = VALUES(`descripcion`),
  `modulo` = VALUES(`modulo`);

-- Matriz rol -> permisos. Se reconstruye completa para que el archivo sea la
-- única fuente de verdad de la asignación.
DELETE FROM `roles_permisos`;

-- ADMINISTRADOR: todos los permisos del sistema (incluye gestionar_acceso).
INSERT INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id`
FROM `roles` r CROSS JOIN `permisos` p
WHERE r.`nombre` = 'ADMINISTRADOR';

-- GERENTE (dueño de la constructora): gestiona la operación del negocio —
-- proyectos, clientes, personal, plan de trabajo, asignación de personal y la
-- Gestión Administrativa (catálogos)—. No recibe usuarios, roles ni auditoría:
-- son del administrador.
INSERT INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id`
FROM `roles` r JOIN `permisos` p
WHERE r.`nombre` = 'GERENTE'
  AND p.`nombre` IN (
    'clientes.listar', 'clientes.crear',
    'proyectos.listar', 'proyectos.registrar', 'proyectos.editar', 'proyectos.dar_baja',
    'proyectos.acceso_total', 'proyectos.gestionar_acceso',
    'trabajadores.listar', 'trabajadores.crear', 'trabajadores.editar', 'trabajadores.dar_baja',
    'etapas.listar', 'etapas.crear', 'etapas.editar', 'etapas.dar_baja',
    'actividades.listar', 'actividades.crear', 'actividades.editar', 'actividades.dar_baja',
    'catalogos.listar', 'catalogos.gestionar'
  );

-- MAESTRO_OBRA: gestiona el plan de trabajo (etapas y actividades) y edita sus
-- proyectos; no los crea, no los da de baja ni asigna personal. Su alcance se
-- limita a los proyectos donde está asignado. clientes.listar y
-- trabajadores.listar alimentan los selectores de cliente y de responsable.
INSERT INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id`
FROM `roles` r JOIN `permisos` p
WHERE r.`nombre` = 'MAESTRO_OBRA'
  AND p.`nombre` IN (
    'proyectos.listar', 'proyectos.editar',
    'etapas.listar', 'etapas.crear', 'etapas.editar', 'etapas.dar_baja',
    'actividades.listar', 'actividades.crear', 'actividades.editar', 'actividades.dar_baja',
    'clientes.listar', 'trabajadores.listar'
  );

-- ENCARGADO_BODEGA: catálogo de herramientas (HU-10).
INSERT INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id`
FROM `roles` r JOIN `permisos` p
WHERE r.`nombre` = 'ENCARGADO_BODEGA'
  AND p.`modulo` = 'herramientas';

-- TRABAJADOR: sin permisos sobre estos módulos.
--
-- `auditoria.listar` (HU-17), `roles.gestionar`, `proyectos.gestionar_acceso`,
-- `usuarios.editar` y los de `usuarios` quedan solo en el administrador: no
-- aparecen en las listas de GERENTE ni MAESTRO_OBRA, y el CROSS JOIN de arriba
-- ya se los da a ADMINISTRADOR, que recibe todo el catálogo. No se cuenta aquí el total: ver tests/permisos_core.py.
--
-- Aviso: esta matriz es el punto de partida. La pantalla Roles y permisos
-- permite al administrador cambiarla después (roles.gestionar).
