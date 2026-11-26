-- HU-40 · acta de recepción de materiales en obra.
--
-- Toda salida de materiales (HU-26) genera un acta en estado PENDIENTE con una
-- línea por material despachado. El maestro de obra confirma con su sesión las
-- cantidades recibidas; la firma guarda usuario, fecha y hora y deja el acta
-- inmutable (los triggers lo impiden también en la base).
--
-- Si la cantidad recibida difiere de la despachada, la observación de esa línea
-- es obligatoria y el servicio genera una alerta para bodega.
--
-- Permisos:
--   actas_recepcion.listar  consultar las actas (administrador, gerente, bodega
--                           y maestro de obra).
--   actas_recepcion.firmar  firmar un acta (maestro de obra y administrador;
--                           el servicio exige además ser el destinatario o el
--                           responsable del proyecto o de la actividad).
--
-- Es idempotente.
--
-- Uso:
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_actas_recepcion.sql

CREATE TABLE IF NOT EXISTS `actas_recepcion` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `salida_id` bigint NOT NULL,
  `estado` enum('PENDIENTE','FIRMADA') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDIENTE',
  `firmada_por_usuario_id` bigint DEFAULT NULL,
  `firmada_en` datetime DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `creada_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `salida_id` (`salida_id`),
  KEY `fk_acta_usuario` (`firmada_por_usuario_id`),
  CONSTRAINT `fk_acta_salida` FOREIGN KEY (`salida_id`) REFERENCES `salidas_materiales` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_acta_usuario` FOREIGN KEY (`firmada_por_usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `actas_recepcion_detalle` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `acta_id` bigint NOT NULL,
  `detalle_salida_id` bigint NOT NULL,
  `material_id` bigint NOT NULL,
  `cantidad_despachada` decimal(12,2) NOT NULL,
  `cantidad_recibida` decimal(12,2) DEFAULT NULL,
  `observacion` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_acta_detalle` (`acta_id`, `detalle_salida_id`),
  KEY `fk_acta_det_material` (`material_id`),
  KEY `fk_acta_det_salida` (`detalle_salida_id`),
  CONSTRAINT `fk_acta_det_acta` FOREIGN KEY (`acta_id`) REFERENCES `actas_recepcion` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_acta_det_material` FOREIGN KEY (`material_id`) REFERENCES `materiales` (`id`),
  CONSTRAINT `fk_acta_det_salida` FOREIGN KEY (`detalle_salida_id`) REFERENCES `detalles_salida_materiales` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Una vez firmada, el acta no se modifica (criterio 5).
DROP TRIGGER IF EXISTS `trg_acta_no_update_firmada`;
DELIMITER //
CREATE TRIGGER `trg_acta_no_update_firmada` BEFORE UPDATE ON `actas_recepcion`
FOR EACH ROW
BEGIN
  IF OLD.`estado` = 'FIRMADA' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El acta de recepción firmada es inmutable';
  END IF;
END //
DELIMITER ;

DROP TRIGGER IF EXISTS `trg_acta_det_no_update_firmada`;
DELIMITER //
CREATE TRIGGER `trg_acta_det_no_update_firmada` BEFORE UPDATE ON `actas_recepcion_detalle`
FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM `actas_recepcion` WHERE `id` = OLD.`acta_id` AND `estado` = 'FIRMADA') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Las líneas de un acta firmada son inmutables';
  END IF;
END //
DELIMITER ;

INSERT INTO `permisos` (`nombre`, `descripcion`, `modulo`) VALUES
  ('actas_recepcion.listar', 'Consultar las actas de recepción de materiales', 'materiales'),
  ('actas_recepcion.firmar', 'Firmar el acta de recepción de materiales en obra', 'materiales')
ON DUPLICATE KEY UPDATE
  `descripcion` = VALUES(`descripcion`),
  `modulo` = VALUES(`modulo`);

INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id`
  FROM `roles` r
  JOIN `permisos` p ON p.`nombre` = 'actas_recepcion.listar'
 WHERE r.`nombre` IN ('ADMINISTRADOR', 'GERENTE', 'ENCARGADO_BODEGA', 'MAESTRO_OBRA');

INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id`
  FROM `roles` r
  JOIN `permisos` p ON p.`nombre` = 'actas_recepcion.firmar'
 WHERE r.`nombre` IN ('ADMINISTRADOR', 'MAESTRO_OBRA');

SELECT COUNT(*) AS tabla_creada FROM information_schema.TABLES
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'actas_recepcion';
