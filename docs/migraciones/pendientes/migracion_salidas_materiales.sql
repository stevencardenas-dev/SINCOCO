-- HU-26 · salida efectiva de materiales.
-- 1. `salidas_materiales.solicitud_id`: la solicitud de materiales aprobada que originó la salida (las salidas anteriores
--    a esta migración quedan en NULL).
-- 2. Permiso salidas_materiales.listar (consultar las salidas y la existencia por almacén) para ADMINISTRADOR,
--    ENCARGADO_BODEGA y GERENTE.
-- Idempotente.
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_salidas_materiales.sql

DROP PROCEDURE IF EXISTS `sincoco_migrar_salidas`;
DELIMITER //
CREATE PROCEDURE `sincoco_migrar_salidas`()
BEGIN
  DECLARE v_existe INT DEFAULT 0;
  SELECT COUNT(*) INTO v_existe FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'salidas_materiales' AND COLUMN_NAME = 'solicitud_id';
  IF v_existe = 0 THEN
    ALTER TABLE `salidas_materiales`
      ADD COLUMN `solicitud_id` bigint DEFAULT NULL AFTER `proyecto_id`,
      ADD KEY `fk_sal_solicitud` (`solicitud_id`),
      ADD CONSTRAINT `fk_sal_solicitud` FOREIGN KEY (`solicitud_id`) REFERENCES `solicitudes_materiales` (`id`);
  END IF;
END //
DELIMITER ;
CALL `sincoco_migrar_salidas`();
DROP PROCEDURE `sincoco_migrar_salidas`;

INSERT INTO `permisos` (`nombre`, `descripcion`, `modulo`) VALUES
  ('salidas_materiales.listar', 'Consultar las salidas de materiales y la existencia por almacén', 'salidas_materiales')
ON DUPLICATE KEY UPDATE `descripcion` = VALUES(`descripcion`), `modulo` = VALUES(`modulo`);

INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id` FROM `roles` r JOIN `permisos` p ON p.`nombre` = 'salidas_materiales.listar'
 WHERE r.`nombre` IN ('ADMINISTRADOR', 'ENCARGADO_BODEGA', 'GERENTE');

SELECT (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'salidas_materiales' AND COLUMN_NAME = 'solicitud_id') AS columna_creada,
       (SELECT COUNT(*) FROM `permisos` WHERE `modulo` = 'salidas_materiales') AS permisos_salidas;
