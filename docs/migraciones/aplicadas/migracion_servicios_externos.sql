-- HU-28: detalle de servicios externos contratados.
--
-- 1. Agrega `actividades.presupuesto`: monto asignado a la actividad, contra el
--    que se valida el valor contratado de un servicio externo (criterio 4).
--    NULL = sin presupuesto definido: no hay contra qué comparar.
-- 2. Crea los permisos `servicios_externos.listar` y `servicios_externos.crear`
--    (el administrador registra y consulta; el gerente solo consulta).
--
-- La tabla `servicios_externos` ya existe en docs/schema.sql. Es idempotente.
--
-- Uso:
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_servicios_externos.sql

DROP PROCEDURE IF EXISTS `sincoco_migrar_servicios_externos`;
DELIMITER //
CREATE PROCEDURE `sincoco_migrar_servicios_externos`()
BEGIN
  DECLARE v_existe INT DEFAULT 0;

  SELECT COUNT(*) INTO v_existe FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'actividades' AND COLUMN_NAME = 'presupuesto';
  IF v_existe = 0 THEN
    ALTER TABLE `actividades`
      ADD COLUMN `presupuesto` decimal(15,2) DEFAULT NULL AFTER `peso`;
  END IF;
END //
DELIMITER ;
CALL `sincoco_migrar_servicios_externos`();
DROP PROCEDURE `sincoco_migrar_servicios_externos`;

INSERT INTO `permisos` (`nombre`, `descripcion`, `modulo`) VALUES
  ('servicios_externos.listar', 'Consultar los servicios externos contratados', 'servicios_externos'),
  ('servicios_externos.crear',  'Registrar un servicio externo contratado',     'servicios_externos')
ON DUPLICATE KEY UPDATE
  `descripcion` = VALUES(`descripcion`),
  `modulo` = VALUES(`modulo`);

INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id`
  FROM `roles` r
  JOIN `permisos` p ON p.`modulo` = 'servicios_externos'
 WHERE r.`nombre` = 'ADMINISTRADOR';

INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id`
  FROM `roles` r
  JOIN `permisos` p ON p.`nombre` = 'servicios_externos.listar'
 WHERE r.`nombre` = 'GERENTE';
