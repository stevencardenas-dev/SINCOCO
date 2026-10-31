-- HU-09 · devolución de materiales sobrantes.
-- 1. `devoluciones_materiales.apto`: 1 = el material vuelve al inventario; 0 = no está en condiciones de reingresar
--    (se registra la devolución con su motivo pero NO se suma a la existencia).
-- 2. `devoluciones_materiales.costo_unitario`: costo del material al momento de devolverlo (el de la salida que
--    la originó o, si no hay, el costo de referencia); permite ajustar el costo de la actividad de origen.
-- 3. El trigger `trg_devolucion_suma_existencia` solo suma la cantidad cuando la devolución es apta.
-- 4. Permisos devoluciones_materiales.listar / .crear para ADMINISTRADOR y ENCARGADO_BODEGA.
-- Idempotente.
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_devoluciones_materiales.sql

DROP PROCEDURE IF EXISTS `sincoco_migrar_devoluciones`;
DELIMITER //
CREATE PROCEDURE `sincoco_migrar_devoluciones`()
BEGIN
  DECLARE v_existe INT DEFAULT 0;

  SELECT COUNT(*) INTO v_existe FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'devoluciones_materiales' AND COLUMN_NAME = 'apto';
  IF v_existe = 0 THEN
    ALTER TABLE `devoluciones_materiales` ADD COLUMN `apto` tinyint(1) NOT NULL DEFAULT '1' AFTER `cantidad`;
  END IF;

  SELECT COUNT(*) INTO v_existe FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'devoluciones_materiales' AND COLUMN_NAME = 'costo_unitario';
  IF v_existe = 0 THEN
    ALTER TABLE `devoluciones_materiales` ADD COLUMN `costo_unitario` decimal(12,2) NOT NULL DEFAULT '0.00' AFTER `apto`;
  END IF;
END //
DELIMITER ;
CALL `sincoco_migrar_devoluciones`();
DROP PROCEDURE `sincoco_migrar_devoluciones`;

DROP TRIGGER IF EXISTS `trg_devolucion_suma_existencia`;
DELIMITER $$
CREATE TRIGGER `trg_devolucion_suma_existencia` AFTER INSERT ON `devoluciones_materiales`
FOR EACH ROW
BEGIN
  IF NEW.`apto` = 1 THEN
    UPDATE `materiales`
       SET `existencia_total` = `existencia_total` + NEW.`cantidad`
     WHERE `id` = NEW.`material_id`;
  END IF;
END$$
DELIMITER ;

INSERT INTO `permisos` (`nombre`, `descripcion`, `modulo`) VALUES
  ('devoluciones_materiales.listar', 'Consultar las devoluciones de materiales sobrantes', 'devoluciones_materiales'),
  ('devoluciones_materiales.crear',  'Registrar devoluciones de materiales sobrantes',      'devoluciones_materiales')
ON DUPLICATE KEY UPDATE `descripcion` = VALUES(`descripcion`), `modulo` = VALUES(`modulo`);

INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id` FROM `roles` r JOIN `permisos` p ON p.`modulo` = 'devoluciones_materiales'
 WHERE r.`nombre` IN ('ADMINISTRADOR', 'ENCARGADO_BODEGA');

SELECT (SELECT COUNT(*) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'devoluciones_materiales' AND COLUMN_NAME IN ('apto', 'costo_unitario')) AS columnas,
       (SELECT COUNT(*) FROM `permisos` WHERE `modulo` = 'devoluciones_materiales') AS permisos_devoluciones;
