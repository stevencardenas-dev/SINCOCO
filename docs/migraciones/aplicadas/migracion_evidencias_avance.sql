-- HU-22 · evidencias de avance.
-- El esquema base solo guardaba la ruta del archivo; para adjuntar la evidencia
-- desde la aplicación se guarda el contenido (base64) igual que en incidencias,
-- con su tamaño y la categoría de la evidencia.
--
-- Idempotente: la migración se aplicó a mano en el RDS antes de registrarse en
-- esta carpeta y, al volver a ejecutarse durante un despliegue, el ALTER TABLE
-- directo fallaba con «Duplicate column name 'archivo'» y frenaba la cola.
-- Ahora cada columna se agrega solo si falta.

DROP PROCEDURE IF EXISTS `sincoco_migrar_evidencias_avance`;
DELIMITER //
CREATE PROCEDURE `sincoco_migrar_evidencias_avance`()
BEGIN
  DECLARE v_existe INT DEFAULT 0;

  SELECT COUNT(*) INTO v_existe FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'evidencias_avance'
     AND COLUMN_NAME = 'archivo';
  IF v_existe = 0 THEN
    ALTER TABLE `evidencias_avance`
      ADD COLUMN `archivo` MEDIUMTEXT NULL AFTER `ruta_archivo`;
  END IF;

  SELECT COUNT(*) INTO v_existe FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'evidencias_avance'
     AND COLUMN_NAME = 'tamano_bytes';
  IF v_existe = 0 THEN
    ALTER TABLE `evidencias_avance`
      ADD COLUMN `tamano_bytes` int DEFAULT NULL AFTER `archivo`;
  END IF;

  SELECT COUNT(*) INTO v_existe FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'evidencias_avance'
     AND COLUMN_NAME = 'categoria';
  IF v_existe = 0 THEN
    ALTER TABLE `evidencias_avance`
      ADD COLUMN `categoria` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `tipo_archivo`;
  END IF;
END //
DELIMITER ;
CALL `sincoco_migrar_evidencias_avance`();
DROP PROCEDURE `sincoco_migrar_evidencias_avance`;

SELECT COUNT(*) AS columnas_evidencias FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'evidencias_avance'
   AND COLUMN_NAME IN ('archivo', 'tamano_bytes', 'categoria');
