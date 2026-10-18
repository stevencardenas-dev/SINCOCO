-- HU-14: foto de evidencia subida desde galería o cámara.
-- Guarda el nombre del archivo en disco (la carpeta se define con UPLOADS_DIR en el backend).
-- Idempotente: se puede ejecutar más de una vez.
-- Uso:
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_incidencias_evidencia_archivo.sql

DROP PROCEDURE IF EXISTS `sincoco_migrar_incidencias_foto`;
DELIMITER //
CREATE PROCEDURE `sincoco_migrar_incidencias_foto`()
BEGIN
  DECLARE v_existe INT DEFAULT 0;

  SELECT COUNT(*) INTO v_existe FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'incidencias' AND COLUMN_NAME = 'evidencia_archivo';
  IF v_existe = 0 THEN
    ALTER TABLE `incidencias`
      ADD COLUMN `evidencia_archivo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `evidencia`;
  END IF;
END //
DELIMITER ;
CALL `sincoco_migrar_incidencias_foto`();
DROP PROCEDURE `sincoco_migrar_incidencias_foto`;

SELECT COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'incidencias' AND COLUMN_NAME = 'evidencia_archivo';
