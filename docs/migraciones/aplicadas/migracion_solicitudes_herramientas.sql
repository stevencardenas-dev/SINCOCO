-- HU-30 (AYD-42) · solicitud de herramientas.
-- La tabla `solicitudes_herramientas` ya existe en docs/schema.sql; solo se
-- crean los permisos y se asignan a los roles:
--   * crear:    MAESTRO_OBRA y ADMINISTRADOR (solicitan para sus trabajadores).
--   * resolver: ENCARGADO_BODEGA y ADMINISTRADOR (aprueban, rechazan, atienden).
--   * listar:   los tres (quien no resuelve solo ve sus propias solicitudes).
-- Estados: PENDIENTE -> APROBADA | RECHAZADA | CANCELADA; APROBADA -> ENTREGADA
-- («atendida») | CANCELADA. Idempotente.
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_solicitudes_herramientas.sql

INSERT INTO `permisos` (`nombre`, `descripcion`, `modulo`) VALUES
  ('solicitudes_herramientas.listar',   'Consultar solicitudes de herramientas',                 'solicitudes_herramientas'),
  ('solicitudes_herramientas.crear',    'Solicitar herramientas para los trabajadores',          'solicitudes_herramientas'),
  ('solicitudes_herramientas.resolver', 'Aprobar, rechazar y atender solicitudes de herramientas', 'solicitudes_herramientas')
ON DUPLICATE KEY UPDATE `descripcion` = VALUES(`descripcion`), `modulo` = VALUES(`modulo`);

INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id` FROM `roles` r JOIN `permisos` p ON p.`modulo` = 'solicitudes_herramientas'
 WHERE r.`nombre` = 'ADMINISTRADOR'
    OR (r.`nombre` = 'MAESTRO_OBRA' AND p.`nombre` IN ('solicitudes_herramientas.listar', 'solicitudes_herramientas.crear'))
    OR (r.`nombre` = 'ENCARGADO_BODEGA' AND p.`nombre` IN ('solicitudes_herramientas.listar', 'solicitudes_herramientas.resolver'));

SELECT COUNT(*) AS permisos_solicitudes FROM `permisos` WHERE `modulo` = 'solicitudes_herramientas';
