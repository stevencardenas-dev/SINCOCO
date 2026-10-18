-- HU-14: registro de incidencias de obra (avería, accidente o retraso).
--
-- 1. Agrega a `incidencias` el `tipo` (AVERIA, ACCIDENTE, RETRASO) y la
--    `evidencia` (enlace o referencia a la foto, el documento o el parte que
--    respalda el hecho). Las incidencias que ya existían quedan como AVERIA.
-- 2. Crea los permisos `incidencias.listar`, `incidencias.crear` e
--    `incidencias.editar`. El maestro de obra registra y da seguimiento; el
--    administrador y el gerente además consultan todas y las cierran. Quién
--    puede operar sobre un proyecto concreto lo decide además el servicio.
--
-- Es idempotente: se puede relanzar.
--
-- Uso:
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_incidencias.sql

DROP PROCEDURE IF EXISTS `sincoco_migrar_incidencias`;
DELIMITER //
CREATE PROCEDURE `sincoco_migrar_incidencias`()
BEGIN
  DECLARE v_existe INT DEFAULT 0;

  SELECT COUNT(*) INTO v_existe FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'incidencias' AND COLUMN_NAME = 'tipo';
  IF v_existe = 0 THEN
    ALTER TABLE `incidencias`
      ADD COLUMN `tipo` enum('AVERIA','ACCIDENTE','RETRASO') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'AVERIA' AFTER `reportado_por_usuario_id`;
  END IF;

  SELECT COUNT(*) INTO v_existe FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'incidencias' AND COLUMN_NAME = 'evidencia';
  IF v_existe = 0 THEN
    ALTER TABLE `incidencias`
      ADD COLUMN `evidencia` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `descripcion`;
  END IF;
END //
DELIMITER ;
CALL `sincoco_migrar_incidencias`();
DROP PROCEDURE `sincoco_migrar_incidencias`;

INSERT INTO `permisos` (`nombre`, `descripcion`, `modulo`) VALUES
  ('incidencias.listar', 'Consultar las incidencias de obra',                       'incidencias'),
  ('incidencias.crear',  'Registrar una incidencia de obra',                        'incidencias'),
  ('incidencias.editar', 'Dar seguimiento a una incidencia y registrar su resolución', 'incidencias')
ON DUPLICATE KEY UPDATE
  `descripcion` = VALUES(`descripcion`),
  `modulo` = VALUES(`modulo`);

INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id`
  FROM `roles` r
  JOIN `permisos` p ON p.`modulo` = 'incidencias'
 WHERE r.`nombre` IN ('ADMINISTRADOR', 'GERENTE', 'MAESTRO_OBRA');

SELECT 'incidencias.tipo' AS elemento, COUNT(*) AS existe FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'incidencias' AND COLUMN_NAME = 'tipo'
UNION ALL SELECT 'incidencias.evidencia', COUNT(*) FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'incidencias' AND COLUMN_NAME = 'evidencia'
UNION ALL SELECT 'permisos incidencias', COUNT(*) FROM `permisos` WHERE `modulo` = 'incidencias';
