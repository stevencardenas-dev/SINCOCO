-- HU-11 (AYD-23) · quién autorizó la solicitud de herramienta.
-- Se agrega `aprobado_por_usuario_id` a `solicitudes_herramientas`; se llena al
-- aprobar. Las solicitudes aprobadas antes de esta migración quedan en NULL
-- (la ficha muestra «—»). Idempotente.
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_solicitudes_herramientas_autoriza.sql

DROP PROCEDURE IF EXISTS `sincoco_migrar_solherr_autoriza`;
DELIMITER //
CREATE PROCEDURE `sincoco_migrar_solherr_autoriza`()
BEGIN
  DECLARE v_existe INT DEFAULT 0;
  SELECT COUNT(*) INTO v_existe FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitudes_herramientas'
     AND COLUMN_NAME = 'aprobado_por_usuario_id';
  IF v_existe = 0 THEN
    ALTER TABLE `solicitudes_herramientas`
      ADD COLUMN `aprobado_por_usuario_id` bigint DEFAULT NULL AFTER `estado`,
      ADD CONSTRAINT `fk_solherr_usuario_aprueba` FOREIGN KEY (`aprobado_por_usuario_id`) REFERENCES `usuarios` (`id`);
  END IF;
END //
DELIMITER ;
CALL `sincoco_migrar_solherr_autoriza`();
DROP PROCEDURE `sincoco_migrar_solherr_autoriza`;

SELECT COUNT(*) AS columna_creada FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitudes_herramientas' AND COLUMN_NAME = 'aprobado_por_usuario_id';
