-- HU-08 · solicitud de materiales: presupuesto por actividad y notificaciones.
-- 1. `presupuesto_materiales_actividad`: cantidad presupuestada de cada material por actividad.
--    Sirve para detectar que una solicitud excede lo previsto (CU-08 Alt 1).
-- 2. `solicitudes_materiales.excede_presupuesto`: marca las solicitudes confirmadas pese a exceder.
-- 3. `notificaciones`: avisos dirigidos a un usuario (p. ej. al maestro de obra cuando bodega
--    aprueba una cantidad distinta de la solicitada, CU-08 Alt 2). Los avisos a bodega siguen en `alertas`.
-- Idempotente.
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_solicitudes_materiales_presupuesto.sql

CREATE TABLE IF NOT EXISTS `presupuesto_materiales_actividad` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `actividad_id` bigint NOT NULL,
  `material_id` bigint NOT NULL,
  `cantidad_presupuestada` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_presupuesto_actividad_material` (`actividad_id`,`material_id`),
  KEY `fk_presup_material` (`material_id`),
  CONSTRAINT `fk_presup_actividad` FOREIGN KEY (`actividad_id`) REFERENCES `actividades` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_presup_material` FOREIGN KEY (`material_id`) REFERENCES `materiales` (`id`),
  CONSTRAINT `chk_presup_cantidad` CHECK ((`cantidad_presupuestada` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notificaciones` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `usuario_id` bigint NOT NULL,
  `titulo` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mensaje` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `referencia_id` bigint DEFAULT NULL,
  `tabla_referencia` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `leida` tinyint(1) NOT NULL DEFAULT '0',
  `creada_en` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notificaciones_usuario` (`usuario_id`,`leida`),
  CONSTRAINT `fk_notificacion_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP PROCEDURE IF EXISTS `sincoco_migrar_solmat_excede`;
DELIMITER //
CREATE PROCEDURE `sincoco_migrar_solmat_excede`()
BEGIN
  DECLARE v_existe INT DEFAULT 0;
  SELECT COUNT(*) INTO v_existe FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitudes_materiales'
     AND COLUMN_NAME = 'excede_presupuesto';
  IF v_existe = 0 THEN
    ALTER TABLE `solicitudes_materiales`
      ADD COLUMN `excede_presupuesto` tinyint(1) NOT NULL DEFAULT '0' AFTER `observaciones`;
  END IF;
END //
DELIMITER ;
CALL `sincoco_migrar_solmat_excede`();
DROP PROCEDURE `sincoco_migrar_solmat_excede`;

SELECT (SELECT COUNT(*) FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('presupuesto_materiales_actividad', 'notificaciones')) AS tablas_creadas,
       (SELECT COUNT(*) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitudes_materiales' AND COLUMN_NAME = 'excede_presupuesto') AS columna_creada;
