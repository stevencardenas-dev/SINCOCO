-- HU-36 · aprobación parcial o ajuste de solicitudes de materiales (extiende HU-08).
-- 1. Estado APROBADA_PARCIAL: hay líneas aprobadas por debajo de lo solicitado (el resto queda como saldo pendiente).
-- 2. Cancelación del saldo: `saldo_cancelado` (+ observación, quién y cuándo) cierra la solicitud con lo despachado.
-- 3. `detalles_solicitud_materiales.observacion_aprobacion`: observación de la línea (obligatoria si se aprueba en cero).
-- 4. Reajusta las solicitudes existentes a la regla nueva: una solicitud no queda despachada mientras haya saldo
--    (solicitado - despachado) sin cancelar, ni aprobada completa si alguna línea se aprobó por menos.
-- Idempotente.
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_solicitudes_materiales_saldo.sql

ALTER TABLE `solicitudes_materiales`
  MODIFY COLUMN `estado` enum('PENDIENTE','APROBADA','APROBADA_PARCIAL','RECHAZADA','DESPACHADA_PARCIAL','DESPACHADA_TOTAL','CANCELADA')
    COLLATE utf8mb4_unicode_ci DEFAULT 'PENDIENTE';

DROP PROCEDURE IF EXISTS `sincoco_migrar_saldo`;
DELIMITER //
CREATE PROCEDURE `sincoco_migrar_saldo`()
BEGIN
  DECLARE v_existe INT DEFAULT 0;

  SELECT COUNT(*) INTO v_existe FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitudes_materiales' AND COLUMN_NAME = 'saldo_cancelado';
  IF v_existe = 0 THEN
    ALTER TABLE `solicitudes_materiales`
      ADD COLUMN `saldo_cancelado` tinyint(1) NOT NULL DEFAULT '0' AFTER `excede_presupuesto`,
      ADD COLUMN `saldo_cancelado_observacion` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `saldo_cancelado`,
      ADD COLUMN `saldo_cancelado_por_usuario_id` bigint DEFAULT NULL AFTER `saldo_cancelado_observacion`,
      ADD COLUMN `saldo_cancelado_en` datetime DEFAULT NULL AFTER `saldo_cancelado_por_usuario_id`;
  END IF;

  SELECT COUNT(*) INTO v_existe FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'detalles_solicitud_materiales' AND COLUMN_NAME = 'observacion_aprobacion';
  IF v_existe = 0 THEN
    ALTER TABLE `detalles_solicitud_materiales`
      ADD COLUMN `observacion_aprobacion` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `cantidad_despachada`;
  END IF;
END //
DELIMITER ;
CALL `sincoco_migrar_saldo`();
DROP PROCEDURE `sincoco_migrar_saldo`;

UPDATE `solicitudes_materiales` s
   SET s.`estado` = 'DESPACHADA_PARCIAL'
 WHERE s.`estado` = 'DESPACHADA_TOTAL' AND s.`saldo_cancelado` = 0
   AND EXISTS (SELECT 1 FROM `detalles_solicitud_materiales` d
                WHERE d.`solicitud_id` = s.`id` AND d.`cantidad_despachada` < d.`cantidad_solicitada`);

UPDATE `solicitudes_materiales` s
   SET s.`estado` = 'APROBADA_PARCIAL'
 WHERE s.`estado` = 'APROBADA'
   AND EXISTS (SELECT 1 FROM `detalles_solicitud_materiales` d
                WHERE d.`solicitud_id` = s.`id` AND d.`cantidad_aprobada` < d.`cantidad_solicitada`);

SELECT (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitudes_materiales' AND COLUMN_NAME = 'saldo_cancelado') AS columna_saldo,
       (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'detalles_solicitud_materiales' AND COLUMN_NAME = 'observacion_aprobacion') AS columna_observacion;
