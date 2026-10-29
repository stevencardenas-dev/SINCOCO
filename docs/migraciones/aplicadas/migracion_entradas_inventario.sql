-- HU-19 · ingreso de materiales al inventario.
-- 1. Agrega `entradas_inventario.orden_compra_id` (entrada que proviene de una orden de compra).
-- 2. Crea los permisos entradas_inventario.listar / .crear para ADMINISTRADOR y ENCARGADO_BODEGA.
-- Idempotente.
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_entradas_inventario.sql

SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'entradas_inventario' AND COLUMN_NAME = 'orden_compra_id');
SET @sql := IF(@existe = 0,
  'ALTER TABLE `entradas_inventario` ADD COLUMN `orden_compra_id` bigint DEFAULT NULL, ADD KEY `fk_ent_orden` (`orden_compra_id`), ADD CONSTRAINT `fk_ent_orden` FOREIGN KEY (`orden_compra_id`) REFERENCES `ordenes_compra` (`id`)',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT INTO `permisos` (`nombre`, `descripcion`, `modulo`) VALUES
  ('entradas_inventario.listar', 'Consultar los ingresos de materiales al inventario', 'entradas_inventario'),
  ('entradas_inventario.crear',  'Registrar ingresos de materiales al inventario',      'entradas_inventario')
ON DUPLICATE KEY UPDATE `descripcion` = VALUES(`descripcion`), `modulo` = VALUES(`modulo`);

INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id` FROM `roles` r JOIN `permisos` p ON p.`modulo` = 'entradas_inventario'
 WHERE r.`nombre` IN ('ADMINISTRADOR', 'ENCARGADO_BODEGA');

SELECT COUNT(*) AS permisos_entradas FROM `permisos` WHERE `modulo` = 'entradas_inventario';
