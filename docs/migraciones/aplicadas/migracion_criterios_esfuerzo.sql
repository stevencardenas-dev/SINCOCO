-- HU-21: avance por criterios de aceptación y peso cualitativo por esfuerzo.
--
-- 1. Crea `criterios_aceptacion`: los criterios (checkbox) que se definen al
--    crear una actividad. Su avance es equitativo: criterios cumplidos / total.
-- 2. Agrega `actividades.esfuerzo` (MUY_ALTO, ALTO, MEDIO, BAJO, MUY_BAJO). El
--    peso interno de cada nivel es 8, 5, 3, 2 y 1, y se guarda en
--    `actividades.peso` para el promedio ponderado de la etapa y del proyecto.
--    Las actividades existentes quedan en MEDIO (peso 3).
-- Es idempotente: se puede relanzar.
--
-- Uso:
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_criterios_esfuerzo.sql

CREATE TABLE IF NOT EXISTS `criterios_aceptacion` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `actividad_id` bigint NOT NULL,
  `descripcion` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cumplido` tinyint(1) NOT NULL DEFAULT '0',
  `fecha_cumplido` datetime DEFAULT NULL,
  `orden` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `idx_criterio_actividad` (`actividad_id`),
  CONSTRAINT `fk_criterio_actividad` FOREIGN KEY (`actividad_id`) REFERENCES `actividades` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP PROCEDURE IF EXISTS `sincoco_migrar_criterios_esfuerzo`;
DELIMITER //
CREATE PROCEDURE `sincoco_migrar_criterios_esfuerzo`()
BEGIN
  DECLARE v_existe INT DEFAULT 0;

  SELECT COUNT(*) INTO v_existe FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'actividades' AND COLUMN_NAME = 'esfuerzo';
  IF v_existe = 0 THEN
    ALTER TABLE `actividades`
      ADD COLUMN `esfuerzo` enum('MUY_ALTO','ALTO','MEDIO','BAJO','MUY_BAJO') NOT NULL DEFAULT 'MEDIO' AFTER `porcentaje_avance`;
    UPDATE `actividades` SET `peso` = 3.00;
  END IF;
END //
DELIMITER ;
CALL `sincoco_migrar_criterios_esfuerzo`();
DROP PROCEDURE `sincoco_migrar_criterios_esfuerzo`;

SELECT 'actividades.esfuerzo' AS elemento, COUNT(*) AS existe FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'actividades' AND COLUMN_NAME = 'esfuerzo';
