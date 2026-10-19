-- Presupuesto por actividad (base de HU-28 criterio 4 y HU-32).
--
-- Agrega `actividades.presupuesto` (pesos, NULL = sin presupuesto definido).
-- Con él se valida el valor contratado de los servicios externos; las
-- actividades existentes quedan sin presupuesto y no se validan.
-- Es idempotente: se puede relanzar.
--
-- Uso:
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_presupuesto_actividad.sql

DROP PROCEDURE IF EXISTS `sincoco_migrar_presupuesto_actividad`;
DELIMITER //
CREATE PROCEDURE `sincoco_migrar_presupuesto_actividad`()
BEGIN
  DECLARE v_existe INT DEFAULT 0;
  SELECT COUNT(*) INTO v_existe FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'actividades' AND COLUMN_NAME = 'presupuesto';
  IF v_existe = 0 THEN
    ALTER TABLE `actividades`
      ADD COLUMN `presupuesto` decimal(15,2) DEFAULT NULL AFTER `peso`,
      ADD CONSTRAINT `chk_actividad_presupuesto` CHECK (`presupuesto` IS NULL OR `presupuesto` >= 0);
  END IF;
END //
DELIMITER ;
CALL `sincoco_migrar_presupuesto_actividad`();
DROP PROCEDURE `sincoco_migrar_presupuesto_actividad`;

SELECT 'actividades.presupuesto' AS elemento, COUNT(*) AS existe FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'actividades' AND COLUMN_NAME = 'presupuesto';
