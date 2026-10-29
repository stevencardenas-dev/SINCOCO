-- HU-23 · alerta de stock mínimo.
-- 1. Quita el trigger antiguo `trg_salida_descuenta_existencia`: el vigente
--    (`trg_salida_descuenta_existencia_y_alerta`) ya descuenta la existencia y
--    genera la alerta, y con los dos cada salida descontaría el stock dos veces.
-- 2. Crea los permisos alertas.listar / alertas.atender para ADMINISTRADOR y
--    ENCARGADO_BODEGA (el GERENTE solo consulta). Idempotente.
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_alertas_stock_minimo.sql

DROP TRIGGER IF EXISTS `trg_salida_descuenta_existencia`;

INSERT INTO `permisos` (`nombre`, `descripcion`, `modulo`) VALUES
  ('alertas.listar',  'Consultar las alertas del sistema',      'alertas'),
  ('alertas.atender', 'Marcar una alerta como atendida',        'alertas')
ON DUPLICATE KEY UPDATE `descripcion` = VALUES(`descripcion`), `modulo` = VALUES(`modulo`);

INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id` FROM `roles` r JOIN `permisos` p ON p.`modulo` = 'alertas'
 WHERE r.`nombre` IN ('ADMINISTRADOR', 'ENCARGADO_BODEGA');

INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id` FROM `roles` r JOIN `permisos` p ON p.`nombre` = 'alertas.listar'
 WHERE r.`nombre` = 'GERENTE';

SELECT COUNT(*) AS permisos_alertas FROM `permisos` WHERE `modulo` = 'alertas';
