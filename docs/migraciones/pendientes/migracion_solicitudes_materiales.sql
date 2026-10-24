-- HU-08 · solicitud de materiales.
-- 1. Agrega el tipo de alerta SOLICITUD_MATERIAL (aviso a bodega al crear la solicitud).
-- 2. Crea los permisos solicitudes_materiales.listar / .crear / .resolver:
--    listar y crear: ADMINISTRADOR y MAESTRO_OBRA; listar y resolver: ADMINISTRADOR y ENCARGADO_BODEGA.
-- Las tablas `solicitudes_materiales` y `detalles_solicitud_materiales` ya existen en docs/schema.sql. Idempotente.
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_solicitudes_materiales.sql

ALTER TABLE `alertas`
  MODIFY COLUMN `tipo` enum('STOCK_MINIMO','HERRAMIENTA_PENDIENTE','ACTIVIDAD_ATRASADA','INCIDENCIA_CRITICA','SOLICITUD_MATERIAL') COLLATE utf8mb4_unicode_ci NOT NULL;

INSERT INTO `permisos` (`nombre`, `descripcion`, `modulo`) VALUES
  ('solicitudes_materiales.listar',   'Consultar solicitudes de materiales (las propias, o todas con resolver)', 'solicitudes_materiales'),
  ('solicitudes_materiales.crear',    'Solicitar materiales para un proyecto',                                  'solicitudes_materiales'),
  ('solicitudes_materiales.resolver', 'Aprobar, rechazar y despachar solicitudes de materiales',                'solicitudes_materiales')
ON DUPLICATE KEY UPDATE `descripcion` = VALUES(`descripcion`), `modulo` = VALUES(`modulo`);

INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id` FROM `roles` r JOIN `permisos` p ON p.`modulo` = 'solicitudes_materiales'
 WHERE r.`nombre` = 'ADMINISTRADOR'
    OR (r.`nombre` = 'MAESTRO_OBRA' AND p.`nombre` IN ('solicitudes_materiales.listar', 'solicitudes_materiales.crear'))
    OR (r.`nombre` = 'ENCARGADO_BODEGA' AND p.`nombre` IN ('solicitudes_materiales.listar', 'solicitudes_materiales.resolver'));

SELECT COUNT(*) AS permisos_solicitudes_materiales FROM `permisos` WHERE `modulo` = 'solicitudes_materiales';
