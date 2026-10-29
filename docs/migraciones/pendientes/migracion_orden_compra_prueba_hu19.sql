-- HU-19 · datos de prueba para validar el ingreso contra una orden de compra y el ingreso parcial.
-- No hay pantalla que cree órdenes de compra, así que se siembra una: OC-PRUEBA-HU19, APROBADA, del proveedor
-- «PRUEBA Proveedor SAS», para el proyecto SEED-P01, con 10 unidades del material id 1 (TUNGSTENO) a 100.000.
-- Si el proveedor, el proyecto, el usuario `admin` o el material no existen, no inserta nada. Idempotente.
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_orden_compra_prueba_hu19.sql

INSERT IGNORE INTO `ordenes_compra`
  (`codigo`, `proveedor_id`, `proyecto_id`, `solicitado_por_usuario_id`, `aprobado_por_usuario_id`,
   `monto_subtotal`, `monto_total`, `estado`, `observaciones`)
SELECT 'OC-PRUEBA-HU19', pv.`id`, py.`id`, u.`id`, u.`id`, 1000000.00, 1000000.00, 'APROBADA', 'PRUEBA HU-19: orden de compra de prueba'
  FROM `proveedores` pv
  JOIN `proyectos` py ON py.`codigo` = 'SEED-P01'
  JOIN `usuarios` u ON u.`username` = 'admin'
 WHERE pv.`razon_social` = 'PRUEBA Proveedor SAS' AND pv.`activo` = 1
 LIMIT 1;

INSERT INTO `detalles_orden_compra` (`orden_compra_id`, `material_id`, `cantidad_pedida`, `cantidad_recibida`, `precio_unitario`)
SELECT oc.`id`, m.`id`, 10.00, 0.00, 100000.00
  FROM `ordenes_compra` oc
  JOIN `materiales` m ON m.`id` = 1
 WHERE oc.`codigo` = 'OC-PRUEBA-HU19'
   AND NOT EXISTS (SELECT 1 FROM `detalles_orden_compra` d WHERE d.`orden_compra_id` = oc.`id` AND d.`material_id` = m.`id`);

SELECT COUNT(*) AS ordenes_prueba FROM `ordenes_compra` WHERE `codigo` = 'OC-PRUEBA-HU19';
