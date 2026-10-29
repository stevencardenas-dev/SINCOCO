-- HU-35 · reasignación de herramientas por avería.
-- 1. `prestamos_herramientas.prestamo_origen_id`: en el préstamo del reemplazo, el préstamo averiado al que sustituye.
-- 2. `prestamos_herramientas.incidencia_id`: la incidencia que generó la avería en el préstamo que se cierra.
-- 3. Permiso prestamos_herramientas.reemplazar para ADMINISTRADOR y ENCARGADO_BODEGA.
-- Idempotente.
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_reemplazo_herramientas.sql

DROP PROCEDURE IF EXISTS `sincoco_migrar_reemplazo`;
DELIMITER //
CREATE PROCEDURE `sincoco_migrar_reemplazo`()
BEGIN
  DECLARE v_existe INT DEFAULT 0;

  SELECT COUNT(*) INTO v_existe FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prestamos_herramientas' AND COLUMN_NAME = 'prestamo_origen_id';
  IF v_existe = 0 THEN
    ALTER TABLE `prestamos_herramientas`
      ADD COLUMN `prestamo_origen_id` bigint DEFAULT NULL AFTER `solicitud_id`,
      ADD KEY `fk_ptherr_origen` (`prestamo_origen_id`),
      ADD CONSTRAINT `fk_ptherr_origen` FOREIGN KEY (`prestamo_origen_id`) REFERENCES `prestamos_herramientas` (`id`) ON DELETE SET NULL;
  END IF;

  SELECT COUNT(*) INTO v_existe FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prestamos_herramientas' AND COLUMN_NAME = 'incidencia_id';
  IF v_existe = 0 THEN
    ALTER TABLE `prestamos_herramientas`
      ADD COLUMN `incidencia_id` bigint DEFAULT NULL AFTER `prestamo_origen_id`,
      ADD KEY `fk_ptherr_incidencia` (`incidencia_id`),
      ADD CONSTRAINT `fk_ptherr_incidencia` FOREIGN KEY (`incidencia_id`) REFERENCES `incidencias` (`id`) ON DELETE SET NULL;
  END IF;
END //
DELIMITER ;
CALL `sincoco_migrar_reemplazo`();
DROP PROCEDURE `sincoco_migrar_reemplazo`;

INSERT INTO `permisos` (`nombre`, `descripcion`, `modulo`) VALUES
  ('prestamos_herramientas.reemplazar', 'Registrar la avería de una herramienta prestada y entregar su reemplazo', 'prestamos_herramientas')
ON DUPLICATE KEY UPDATE `descripcion` = VALUES(`descripcion`), `modulo` = VALUES(`modulo`);

INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id` FROM `roles` r JOIN `permisos` p ON p.`nombre` = 'prestamos_herramientas.reemplazar'
 WHERE r.`nombre` IN ('ADMINISTRADOR', 'ENCARGADO_BODEGA');

SELECT (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prestamos_herramientas'
         AND COLUMN_NAME IN ('prestamo_origen_id', 'incidencia_id')) AS columnas_creadas;
