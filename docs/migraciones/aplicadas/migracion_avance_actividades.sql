-- HU-21: registro del porcentaje de avance de una actividad.
--
-- 1. Agrega `actividades.peso`: el peso de cada actividad en el promedio
--    ponderado con que se calcula el avance de la etapa y del proyecto
--    (HU-21 · criterio 4). Por defecto vale 1, es decir, promedio simple.
-- 2. Crea los permisos `avance.registrar` y `avance.listar` y los asigna a
--    ADMINISTRADOR, GERENTE y MAESTRO_OBRA. Quién puede avanzar una actividad
--    concreta lo decide además el servicio (líder del proyecto, gerente,
--    administrador o quien tenga la actividad asignada).
--
-- La tabla `seguimiento_avance` (porcentaje anterior y nuevo, usuario, fecha y
-- observaciones) ya existe en docs/schema.sql; no se modifica.
-- Es idempotente: se puede relanzar.
--
-- Uso:
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_avance_actividades.sql

DROP PROCEDURE IF EXISTS `sincoco_migrar_avance_actividades`;
DELIMITER //
CREATE PROCEDURE `sincoco_migrar_avance_actividades`()
BEGIN
  DECLARE v_existe INT DEFAULT 0;

  SELECT COUNT(*) INTO v_existe FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'actividades' AND COLUMN_NAME = 'peso';
  IF v_existe = 0 THEN
    ALTER TABLE `actividades`
      ADD COLUMN `peso` decimal(6,2) NOT NULL DEFAULT '1.00' AFTER `porcentaje_avance`,
      ADD CONSTRAINT `chk_actividad_peso` CHECK (`peso` > 0);
  END IF;
END //
DELIMITER ;
CALL `sincoco_migrar_avance_actividades`();
DROP PROCEDURE `sincoco_migrar_avance_actividades`;

INSERT INTO `permisos` (`nombre`, `descripcion`, `modulo`) VALUES
  ('avance.registrar', 'Registrar el porcentaje de avance de una actividad', 'seguimiento'),
  ('avance.listar',    'Consultar el historial de avance de una actividad',  'seguimiento')
ON DUPLICATE KEY UPDATE
  `descripcion` = VALUES(`descripcion`),
  `modulo` = VALUES(`modulo`);

INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id`
  FROM `roles` r
  JOIN `permisos` p ON p.`modulo` = 'seguimiento'
 WHERE r.`nombre` IN ('ADMINISTRADOR', 'GERENTE', 'MAESTRO_OBRA');

SELECT 'actividades.peso' AS elemento, COUNT(*) AS existe FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'actividades' AND COLUMN_NAME = 'peso'
UNION ALL SELECT 'permisos seguimiento', COUNT(*) FROM `permisos` WHERE `modulo` = 'seguimiento';
