-- HU-32 · notificación y autorización por sobrecosto de un servicio externo.
--
-- Un servicio cuyo valor_contratado supera el presupuesto disponible de su
-- actividad queda PENDIENTE de autorización del gerente y no suma a la
-- consolidación de costos (HU-15) hasta que se autorice. El rechazo devuelve el
-- servicio al administrador para reajustar el monto y reevaluarlo.
--
-- Columnas:
--   autorizacion_estado      NO_REQUIERE (cabe en el presupuesto o la actividad
--                            no tiene presupuesto), PENDIENTE, AUTORIZADA o
--                            RECHAZADA.
--   exceso_presupuesto       monto en pesos que se pasó del presupuesto al
--                            evaluarlo por última vez.
--   autorizado_por_usuario_id / autorizado_en / observacion_autorizacion
--                            decisión del gerente (usuario, fecha y observación;
--                            obligatoria al rechazar).
--
-- Permiso nuevo: `servicios_externos.autorizar` (administrador y gerente).
-- Es idempotente.
--
-- Uso:
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_servicios_externos_autorizacion.sql

DROP PROCEDURE IF EXISTS `sincoco_migrar_servicio_autorizacion`;
DELIMITER //
CREATE PROCEDURE `sincoco_migrar_servicio_autorizacion`()
BEGIN
  DECLARE v_existe INT DEFAULT 0;

  SELECT COUNT(*) INTO v_existe FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'servicios_externos'
     AND COLUMN_NAME = 'autorizacion_estado';
  IF v_existe = 0 THEN
    ALTER TABLE `servicios_externos`
      ADD COLUMN `autorizacion_estado` enum('NO_REQUIERE','PENDIENTE','AUTORIZADA','RECHAZADA')
        COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NO_REQUIERE' AFTER `estado`,
      ADD COLUMN `exceso_presupuesto` decimal(15,2) NOT NULL DEFAULT '0.00' AFTER `autorizacion_estado`,
      ADD COLUMN `autorizado_por_usuario_id` bigint DEFAULT NULL AFTER `exceso_presupuesto`,
      ADD COLUMN `autorizado_en` datetime DEFAULT NULL AFTER `autorizado_por_usuario_id`,
      ADD COLUMN `observacion_autorizacion` text COLLATE utf8mb4_unicode_ci AFTER `autorizado_en`,
      ADD KEY `idx_servicio_autorizacion` (`autorizacion_estado`),
      ADD KEY `fk_servicio_autoriza` (`autorizado_por_usuario_id`),
      ADD CONSTRAINT `fk_servicio_autoriza` FOREIGN KEY (`autorizado_por_usuario_id`)
        REFERENCES `usuarios` (`id`) ON DELETE SET NULL;
  END IF;
END //
DELIMITER ;
CALL `sincoco_migrar_servicio_autorizacion`();
DROP PROCEDURE `sincoco_migrar_servicio_autorizacion`;

INSERT INTO `permisos` (`nombre`, `descripcion`, `modulo`) VALUES
  ('servicios_externos.autorizar', 'Autorizar o rechazar un servicio externo que excede el presupuesto', 'servicios_externos')
ON DUPLICATE KEY UPDATE
  `descripcion` = VALUES(`descripcion`),
  `modulo` = VALUES(`modulo`);

INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id`
  FROM `roles` r
  JOIN `permisos` p ON p.`nombre` = 'servicios_externos.autorizar'
 WHERE r.`nombre` IN ('ADMINISTRADOR', 'GERENTE');

SELECT COUNT(*) AS columna_creada FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'servicios_externos'
   AND COLUMN_NAME = 'autorizacion_estado';
