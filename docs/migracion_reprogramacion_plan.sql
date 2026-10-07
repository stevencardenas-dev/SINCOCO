-- HU-34 · criterio 1: fechas programadas originales del plan de trabajo.
--
-- Cuando una etapa, una actividad o el propio proyecto se reprograma, la
-- columna `fecha_*_programada` pasa a guardar la fecha VIGENTE (la que usan el
-- cronograma y las alertas de atraso, HU-24) y la fecha de la primera
-- programación se conserva en `fecha_*_original`.
--
--   · `fecha_*_original` es NULL mientras el elemento nunca se reprogramó.
--   · Se escribe una sola vez, en la primera reprogramación, y desde entonces
--     es inmutable: los disparadores la restauran ante cualquier UPDATE, incluso
--     con acceso directo a MySQL (mismo criterio que la bitácora, HU-17).
--
-- Es idempotente: se puede relanzar.
--   mysql -u root -p sincoco < docs/migracion_reprogramacion_plan.sql
--
-- Las bases nuevas ya la traen en docs/schema.sql (los disparadores no).

DROP PROCEDURE IF EXISTS `sincoco_migrar_reprogramacion_plan`;
DELIMITER //
CREATE PROCEDURE `sincoco_migrar_reprogramacion_plan`()
BEGIN
  DECLARE v_tabla VARCHAR(64);
  DECLARE v_fin INT DEFAULT 0;
  DECLARE v_existe INT DEFAULT 0;
  DECLARE cur CURSOR FOR
    SELECT 'etapas_proyecto' UNION ALL SELECT 'actividades' UNION ALL SELECT 'proyectos';
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_fin = 1;

  OPEN cur;
  bucle: LOOP
    FETCH cur INTO v_tabla;
    IF v_fin = 1 THEN LEAVE bucle; END IF;

    SELECT COUNT(*) INTO v_existe FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = v_tabla
       AND COLUMN_NAME = 'fecha_inicio_original';
    IF v_existe = 0 THEN
      SET @ddl = CONCAT('ALTER TABLE `', v_tabla,
        '` ADD COLUMN `fecha_inicio_original` date DEFAULT NULL AFTER `fecha_fin_programada`,',
        ' ADD COLUMN `fecha_fin_original` date DEFAULT NULL AFTER `fecha_inicio_original`');
      PREPARE stmt FROM @ddl;
      EXECUTE stmt;
      DEALLOCATE PREPARE stmt;
    END IF;
  END LOOP;
  CLOSE cur;
END//
DELIMITER ;

CALL `sincoco_migrar_reprogramacion_plan`();
DROP PROCEDURE `sincoco_migrar_reprogramacion_plan`;

-- Inmutabilidad: si el original ya estaba fijado, se restaura; si estaba vacío,
-- se admite el valor nuevo (primera reprogramación).
DROP TRIGGER IF EXISTS `trg_etapas_original_inmutable`;
DROP TRIGGER IF EXISTS `trg_actividades_original_inmutable`;
DROP TRIGGER IF EXISTS `trg_proyectos_original_inmutable`;

DELIMITER $$
CREATE TRIGGER `trg_etapas_original_inmutable` BEFORE UPDATE ON `etapas_proyecto`
FOR EACH ROW
BEGIN
  SET NEW.fecha_inicio_original = COALESCE(OLD.fecha_inicio_original, NEW.fecha_inicio_original);
  SET NEW.fecha_fin_original = COALESCE(OLD.fecha_fin_original, NEW.fecha_fin_original);
END$$

CREATE TRIGGER `trg_actividades_original_inmutable` BEFORE UPDATE ON `actividades`
FOR EACH ROW
BEGIN
  SET NEW.fecha_inicio_original = COALESCE(OLD.fecha_inicio_original, NEW.fecha_inicio_original);
  SET NEW.fecha_fin_original = COALESCE(OLD.fecha_fin_original, NEW.fecha_fin_original);
END$$

CREATE TRIGGER `trg_proyectos_original_inmutable` BEFORE UPDATE ON `proyectos`
FOR EACH ROW
BEGIN
  SET NEW.fecha_inicio_original = COALESCE(OLD.fecha_inicio_original, NEW.fecha_inicio_original);
  SET NEW.fecha_fin_original = COALESCE(OLD.fecha_fin_original, NEW.fecha_fin_original);
END$$
DELIMITER ;

SELECT 'etapas_proyecto' tabla, COUNT(*) filas FROM `etapas_proyecto`
UNION ALL SELECT 'actividades', COUNT(*) FROM `actividades`
UNION ALL SELECT 'proyectos', COUNT(*) FROM `proyectos`;
