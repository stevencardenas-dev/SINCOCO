-- HU-29 · traslado de materiales entre almacenes.
-- 1. `traslados_materiales.costo_unitario` y `costo_total`: costo del material al momento del traslado. El costo se
--    reasigna del almacén de origen al de destino (cantidad x costo unitario); los traslados anteriores a esta
--    migración quedan con el costo de referencia vigente del material.
-- 2. Restricción: el almacén de origen y el de destino deben ser distintos.
-- 3. Permisos traslados_materiales.listar (consultar) para ADMINISTRADOR, ENCARGADO_BODEGA y GERENTE, y
--    traslados_materiales.crear (registrar) para ADMINISTRADOR y ENCARGADO_BODEGA.
-- Idempotente.
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_traslados_materiales.sql

DROP PROCEDURE IF EXISTS `sincoco_migrar_traslados`;
DELIMITER //
CREATE PROCEDURE `sincoco_migrar_traslados`()
BEGIN
  DECLARE v_existe INT DEFAULT 0;
  SELECT COUNT(*) INTO v_existe FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'traslados_materiales' AND COLUMN_NAME = 'costo_unitario';
  IF v_existe = 0 THEN
    ALTER TABLE `traslados_materiales`
      ADD COLUMN `costo_unitario` decimal(14,2) NOT NULL DEFAULT 0 AFTER `cantidad`,
      ADD COLUMN `costo_total` decimal(14,2) NOT NULL DEFAULT 0 AFTER `costo_unitario`;
    UPDATE `traslados_materiales` t JOIN `materiales` m ON m.`id` = t.`material_id`
       SET t.`costo_unitario` = m.`costo_referencia`, t.`costo_total` = ROUND(t.`cantidad` * m.`costo_referencia`, 2);
  END IF;

  SELECT COUNT(*) INTO v_existe FROM information_schema.TABLE_CONSTRAINTS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'traslados_materiales' AND CONSTRAINT_NAME = 'chk_tras_almacenes';
  IF v_existe = 0 THEN
    ALTER TABLE `traslados_materiales` ADD CONSTRAINT `chk_tras_almacenes` CHECK (`almacen_origen_id` <> `almacen_destino_id`);
  END IF;
END //
DELIMITER ;
CALL `sincoco_migrar_traslados`();
DROP PROCEDURE `sincoco_migrar_traslados`;

INSERT INTO `permisos` (`nombre`, `descripcion`, `modulo`) VALUES
  ('traslados_materiales.listar', 'Consultar los traslados de materiales entre almacenes', 'traslados_materiales'),
  ('traslados_materiales.crear', 'Registrar traslados de materiales entre almacenes', 'traslados_materiales')
ON DUPLICATE KEY UPDATE `descripcion` = VALUES(`descripcion`), `modulo` = VALUES(`modulo`);

INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id` FROM `roles` r JOIN `permisos` p ON p.`nombre` = 'traslados_materiales.listar'
 WHERE r.`nombre` IN ('ADMINISTRADOR', 'ENCARGADO_BODEGA', 'GERENTE');

INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id` FROM `roles` r JOIN `permisos` p ON p.`nombre` = 'traslados_materiales.crear'
 WHERE r.`nombre` IN ('ADMINISTRADOR', 'ENCARGADO_BODEGA');

SELECT (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'traslados_materiales' AND COLUMN_NAME = 'costo_unitario') AS columna_creada,
       (SELECT COUNT(*) FROM `permisos` WHERE `modulo` = 'traslados_materiales') AS permisos_traslados;
