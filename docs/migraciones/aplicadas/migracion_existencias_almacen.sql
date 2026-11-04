-- Existencia por almacén (HU-26 · salidas / HU-29 · traslados / HU-19 · entradas / HU-09 · devoluciones).
-- Tabla nexo `existencias_almacen` (almacén, material, cantidad) que guarda el saldo de cada material en cada almacén,
-- en lugar de recalcularlo en cada consulta a partir de los movimientos. La mantienen triggers, igual que
-- `materiales.existencia_total` (que sigue siendo la suma de todos los almacenes):
--   entrada (detalle)      -> suma en el almacén de la entrada
--   salida (detalle)       -> resta en el almacén de origen
--   devolución apta        -> suma en el almacén de destino
--   traslado               -> resta en el origen y suma en el destino
-- El CHECK `cantidad >= 0` impide dejar un almacén en negativo aunque falle una validación de la aplicación.
-- Se siembra con los movimientos existentes. Idempotente: se puede ejecutar de nuevo y recalcula la tabla.
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_existencias_almacen.sql

CREATE TABLE IF NOT EXISTS `existencias_almacen` (
  `almacen_id` bigint NOT NULL,
  `material_id` bigint NOT NULL,
  `cantidad` decimal(12,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`almacen_id`, `material_id`),
  KEY `idx_exa_material` (`material_id`),
  CONSTRAINT `fk_exa_almacen` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes` (`id`),
  CONSTRAINT `fk_exa_material` FOREIGN KEY (`material_id`) REFERENCES `materiales` (`id`),
  CONSTRAINT `chk_exa_cantidad` CHECK (`cantidad` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Siembra desde los movimientos: entradas + devoluciones aptas + traslados que llegan - traslados que salen - salidas.
DELETE FROM `existencias_almacen`;
INSERT INTO `existencias_almacen` (`almacen_id`, `material_id`, `cantidad`)
SELECT x.`almacen_id`, x.`material_id`, x.`cantidad`
  FROM (SELECT a.`id` AS almacen_id, m.`id` AS material_id,
               COALESCE((SELECT SUM(d.`cantidad`) FROM `entradas_inventario` e
                           JOIN `detalles_entrada_inventario` d ON d.`entrada_id` = e.`id`
                          WHERE e.`almacen_id` = a.`id` AND d.`material_id` = m.`id`), 0)
             + COALESCE((SELECT SUM(v.`cantidad`) FROM `devoluciones_materiales` v
                          WHERE v.`almacen_destino_id` = a.`id` AND v.`material_id` = m.`id` AND v.`apto` = 1), 0)
             + COALESCE((SELECT SUM(t.`cantidad`) FROM `traslados_materiales` t
                          WHERE t.`almacen_destino_id` = a.`id` AND t.`material_id` = m.`id`), 0)
             - COALESCE((SELECT SUM(t.`cantidad`) FROM `traslados_materiales` t
                          WHERE t.`almacen_origen_id` = a.`id` AND t.`material_id` = m.`id`), 0)
             - COALESCE((SELECT SUM(ds.`cantidad_despachada`) FROM `salidas_materiales` s
                           JOIN `detalles_salida_materiales` ds ON ds.`salida_id` = s.`id`
                          WHERE s.`almacen_origen_id` = a.`id` AND ds.`material_id` = m.`id`), 0) AS cantidad
          FROM `almacenes` a CROSS JOIN `materiales` m) x
 WHERE x.`cantidad` <> 0;

DROP TRIGGER IF EXISTS `trg_entrada_suma_almacen`;
DROP TRIGGER IF EXISTS `trg_salida_descuenta_almacen`;
DROP TRIGGER IF EXISTS `trg_devolucion_suma_almacen`;
DROP TRIGGER IF EXISTS `trg_traslado_mueve_almacen`;

DELIMITER $$
CREATE TRIGGER `trg_entrada_suma_almacen` AFTER INSERT ON `detalles_entrada_inventario`
FOR EACH ROW
BEGIN
  INSERT INTO `existencias_almacen` (`almacen_id`, `material_id`, `cantidad`)
  SELECT e.`almacen_id`, NEW.`material_id`, NEW.`cantidad` FROM `entradas_inventario` e WHERE e.`id` = NEW.`entrada_id`
  ON DUPLICATE KEY UPDATE `cantidad` = `existencias_almacen`.`cantidad` + NEW.`cantidad`;
END$$

CREATE TRIGGER `trg_salida_descuenta_almacen` AFTER INSERT ON `detalles_salida_materiales`
FOR EACH ROW
BEGIN
  UPDATE `existencias_almacen` ea JOIN `salidas_materiales` s ON s.`id` = NEW.`salida_id`
     SET ea.`cantidad` = ea.`cantidad` - NEW.`cantidad_despachada`
   WHERE ea.`almacen_id` = s.`almacen_origen_id` AND ea.`material_id` = NEW.`material_id`;
END$$

CREATE TRIGGER `trg_devolucion_suma_almacen` AFTER INSERT ON `devoluciones_materiales`
FOR EACH ROW
BEGIN
  IF NEW.`apto` = 1 THEN
    INSERT INTO `existencias_almacen` (`almacen_id`, `material_id`, `cantidad`)
    VALUES (NEW.`almacen_destino_id`, NEW.`material_id`, NEW.`cantidad`)
    ON DUPLICATE KEY UPDATE `cantidad` = `existencias_almacen`.`cantidad` + NEW.`cantidad`;
  END IF;
END$$

CREATE TRIGGER `trg_traslado_mueve_almacen` AFTER INSERT ON `traslados_materiales`
FOR EACH ROW
BEGIN
  UPDATE `existencias_almacen` SET `cantidad` = `cantidad` - NEW.`cantidad`
   WHERE `almacen_id` = NEW.`almacen_origen_id` AND `material_id` = NEW.`material_id`;
  INSERT INTO `existencias_almacen` (`almacen_id`, `material_id`, `cantidad`)
  VALUES (NEW.`almacen_destino_id`, NEW.`material_id`, NEW.`cantidad`)
  ON DUPLICATE KEY UPDATE `cantidad` = `existencias_almacen`.`cantidad` + NEW.`cantidad`;
END$$
DELIMITER ;

SELECT (SELECT COUNT(*) FROM `existencias_almacen`) AS filas,
       (SELECT COUNT(*) FROM `materiales` m
         WHERE m.`existencia_total` <> COALESCE((SELECT SUM(ea.`cantidad`) FROM `existencias_almacen` ea WHERE ea.`material_id` = m.`id`), 0)) AS materiales_descuadrados,
       (SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE() AND TRIGGER_NAME LIKE 'trg\_%\_almacen') AS triggers;
