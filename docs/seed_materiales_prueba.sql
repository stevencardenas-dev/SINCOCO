-- Catálogo de materiales de construcción y stock inicial para pruebas (HU-07, HU-19, HU-26, HU-29).
--
-- Amplía el catálogo mínimo de seed_operaciones_prueba.sql con materiales de obra de uso habitual
-- (agregados, acero, mampostería, instalaciones, madera, impermeabilización, ferretería y acabados),
-- con unidades y costos de referencia en pesos colombianos. No crea proyectos, solicitudes ni salidas.
-- Los costos son de referencia para pruebas, no una cotización.
--
-- Orden de carga: después de docs/seed_operaciones_prueba.sql y docs/seed_usuarios_prueba.sql.
-- Re-ejecutable: los materiales se actualizan por su código y el stock inicial se registra una sola vez
-- (entradas REM-SEED-CEN / REM-SEED-OBR). El stock sube por el trigger de entradas, no se siembra directo.
--   mysql -u root -p sincoco < docs/seed_materiales_prueba.sql
SET NAMES utf8mb4;

-- Categorías.
INSERT INTO categorias_materiales (nombre, descripcion) VALUES
  ('Cemento y agregados', 'Cemento, arena, triturado y recebo'),
  ('Acero de refuerzo', 'Varillas, mallas y alambre'),
  ('Acabados', 'Pinturas, estucos, pisos y revestimientos'),
  ('Mampostería y bloques', 'Bloques, ladrillos y mortero de pega'),
  ('Instalaciones hidrosanitarias', 'Tubería, accesorios y soldaduras PVC'),
  ('Instalaciones eléctricas', 'Cable, conduit, cajas y aparatos'),
  ('Madera y formaletas', 'Tablas, triplex y madera para formaleta'),
  ('Impermeabilización y cubiertas', 'Mantos y recubrimientos impermeables'),
  ('Ferretería y fijaciones', 'Puntillas, tornillos y consumibles')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

-- Materiales. Los códigos MAT-001 a MAT-004 ya existen en seed_operaciones_prueba.sql: aquí solo se
-- mejora su descripción (sin la marca «ficticio»); su costo y nivel mínimo se conservan.
INSERT INTO materiales (codigo, categoria_id, descripcion, unidad_medida, costo_referencia, nivel_minimo)
SELECT v.codigo, c.id, v.descripcion, v.unidad, v.costo, v.minimo
FROM (
                   SELECT 'MAT-001' AS codigo, 'Cemento y agregados' AS categoria, 'Cemento gris uso general 50 kg' AS descripcion, 'BOLSA' AS unidad, 25000.00 AS costo, 100.00 AS minimo
  UNION ALL SELECT 'MAT-002', 'Cemento y agregados', 'Arena lavada de río', 'M3', 90000.00, 10.00
  UNION ALL SELECT 'MAT-003', 'Acero de refuerzo', 'Varilla corrugada 3/8" x 6 m', 'UNIDAD', 32000.00, 100.00
  UNION ALL SELECT 'MAT-004', 'Acabados', 'Pintura vinilo blanca tipo 1, galón', 'GALON', 48000.00, 20.00
  UNION ALL SELECT 'MAT-005', 'Mampostería y bloques', 'Ladrillo tolete cocido 24 x 12 x 6 cm', 'UNIDAD', 900.00, 1000.00
  UNION ALL SELECT 'MAT-006', 'Acero de refuerzo', 'Alambre negro de amarre calibre 18', 'KG', 5500.00, 30.00
  UNION ALL SELECT 'MAT-007', 'Cemento y agregados', 'Cemento blanco 25 kg', 'BOLSA', 38000.00, 10.00
  UNION ALL SELECT 'MAT-008', 'Acabados', 'Estuco plástico para interiores 25 kg', 'BULTO', 42000.00, 15.00
  UNION ALL SELECT 'MAT-009', 'Instalaciones hidrosanitarias', 'Tubo PVC sanitario 4" x 6 m', 'UNIDAD', 47000.00, 20.00
  UNION ALL SELECT 'MAT-010', 'Acabados', 'Lámina de drywall estándar 1,22 x 2,44 m', 'UNIDAD', 36000.00, 30.00
  UNION ALL SELECT 'MAT-011', 'Cemento y agregados', 'Triturado de 3/4" para concreto', 'M3', 110000.00, 8.00
  UNION ALL SELECT 'MAT-012', 'Cemento y agregados', 'Recebo compactable', 'M3', 62000.00, 10.00
  UNION ALL SELECT 'MAT-013', 'Acero de refuerzo', 'Varilla corrugada 1/2" x 6 m', 'UNIDAD', 58000.00, 60.00
  UNION ALL SELECT 'MAT-014', 'Acero de refuerzo', 'Malla electrosoldada 15 x 15 cm, 4 mm, 2,35 x 6 m', 'UNIDAD', 215000.00, 10.00
  UNION ALL SELECT 'MAT-015', 'Mampostería y bloques', 'Bloque de concreto 12 x 20 x 40 cm', 'UNIDAD', 2800.00, 300.00
  UNION ALL SELECT 'MAT-016', 'Mampostería y bloques', 'Ladrillo prensado a la vista 24 x 12 x 6 cm', 'UNIDAD', 1350.00, 500.00
  UNION ALL SELECT 'MAT-017', 'Mampostería y bloques', 'Mortero de pega predosificado 40 kg', 'BULTO', 19500.00, 40.00
  UNION ALL SELECT 'MAT-018', 'Instalaciones hidrosanitarias', 'Tubo PVC presión 1/2" x 6 m', 'UNIDAD', 14500.00, 30.00
  UNION ALL SELECT 'MAT-019', 'Instalaciones hidrosanitarias', 'Tubo PVC sanitario 2" x 6 m', 'UNIDAD', 28500.00, 20.00
  UNION ALL SELECT 'MAT-020', 'Instalaciones hidrosanitarias', 'Codo PVC sanitario 4" x 90°', 'UNIDAD', 6800.00, 40.00
  UNION ALL SELECT 'MAT-021', 'Instalaciones hidrosanitarias', 'Soldadura líquida PVC 1/4 de galón', 'UNIDAD', 38000.00, 10.00
  UNION ALL SELECT 'MAT-022', 'Instalaciones eléctricas', 'Cable THHN calibre 12 AWG, rollo de 100 m', 'ROLLO', 215000.00, 5.00
  UNION ALL SELECT 'MAT-023', 'Instalaciones eléctricas', 'Tubería conduit PVC 1/2" x 3 m', 'UNIDAD', 4800.00, 80.00
  UNION ALL SELECT 'MAT-024', 'Instalaciones eléctricas', 'Caja eléctrica PVC 5 x 5 cm', 'UNIDAD', 1900.00, 100.00
  UNION ALL SELECT 'MAT-025', 'Instalaciones eléctricas', 'Tomacorriente doble con polo a tierra', 'UNIDAD', 9500.00, 50.00
  UNION ALL SELECT 'MAT-026', 'Madera y formaletas', 'Tabla burra de 3 m para formaleta', 'UNIDAD', 17500.00, 60.00
  UNION ALL SELECT 'MAT-027', 'Madera y formaletas', 'Triplex fenólico 18 mm, 1,22 x 2,44 m', 'UNIDAD', 185000.00, 10.00
  UNION ALL SELECT 'MAT-028', 'Impermeabilización y cubiertas', 'Manto asfáltico 3 mm, rollo de 10 m', 'ROLLO', 168000.00, 5.00
  UNION ALL SELECT 'MAT-029', 'Impermeabilización y cubiertas', 'Impermeabilizante acrílico para terrazas, galón', 'GALON', 52000.00, 10.00
  UNION ALL SELECT 'MAT-030', 'Ferretería y fijaciones', 'Puntilla con cabeza 2 1/2"', 'KG', 8200.00, 20.00
  UNION ALL SELECT 'MAT-031', 'Ferretería y fijaciones', 'Tornillo para drywall 1 1/4", caja de 1.000', 'CAJA', 32000.00, 10.00
  UNION ALL SELECT 'MAT-032', 'Ferretería y fijaciones', 'Disco de corte para amoladora 4 1/2"', 'UNIDAD', 5500.00, 30.00
  UNION ALL SELECT 'MAT-033', 'Acabados', 'Cerámica para piso 45 x 45 cm', 'M2', 38000.00, 50.00
  UNION ALL SELECT 'MAT-034', 'Acabados', 'Pegante cerámico gris 25 kg', 'BULTO', 24000.00, 30.00
) AS v
JOIN categorias_materiales c ON c.nombre = v.categoria
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion), categoria_id = VALUES(categoria_id), unidad_medida = VALUES(unidad_medida);

-- Stock inicial: una entrada por almacén (la bodega central recibe todo; la de obra, lo de uso diario).
-- Cada entrada se crea una sola vez; el trigger de detalles suma la existencia de los materiales.
INSERT INTO entradas_inventario (almacen_id, proveedor_id, responsable_usuario_id, numero_factura_remision, costo_total, observaciones)
SELECT a.id, p.id, u.id, 'REM-SEED-CEN', 0, 'Stock inicial de prueba'
  FROM almacenes a, proveedores p, usuarios u
 WHERE a.codigo = 'ALM-CEN' AND p.documento_identificacion = '800000001-1' AND u.username = 'bodega'
   AND NOT EXISTS (SELECT 1 FROM entradas_inventario WHERE numero_factura_remision = 'REM-SEED-CEN');

INSERT INTO entradas_inventario (almacen_id, proveedor_id, responsable_usuario_id, numero_factura_remision, costo_total, observaciones)
SELECT a.id, p.id, u.id, 'REM-SEED-OBR', 0, 'Stock inicial de prueba'
  FROM almacenes a, proveedores p, usuarios u
 WHERE a.codigo = 'ALM-OBR-01' AND p.documento_identificacion = '800000001-1' AND u.username = 'bodega'
   AND NOT EXISTS (SELECT 1 FROM entradas_inventario WHERE numero_factura_remision = 'REM-SEED-OBR');

-- Las líneas se preparan en una tabla temporal: el trigger actualiza `materiales` y MySQL no permite que el
-- mismo INSERT ... SELECT lea esa tabla (error 1442).
CREATE TEMPORARY TABLE tmp_stock_cen AS
SELECT e.id AS entrada_id, m.id AS material_id, s.cantidad, m.costo_referencia
  FROM entradas_inventario e
  JOIN (
                     SELECT 'MAT-001' AS codigo, 400.00 AS cantidad
    UNION ALL SELECT 'MAT-002', 60.00   UNION ALL SELECT 'MAT-003', 500.00  UNION ALL SELECT 'MAT-004', 80.00
    UNION ALL SELECT 'MAT-005', 6000.00 UNION ALL SELECT 'MAT-006', 150.00  UNION ALL SELECT 'MAT-007', 40.00
    UNION ALL SELECT 'MAT-008', 90.00   UNION ALL SELECT 'MAT-009', 120.00  UNION ALL SELECT 'MAT-010', 200.00
    UNION ALL SELECT 'MAT-011', 40.00   UNION ALL SELECT 'MAT-012', 50.00   UNION ALL SELECT 'MAT-013', 300.00
    UNION ALL SELECT 'MAT-014', 40.00   UNION ALL SELECT 'MAT-015', 1500.00 UNION ALL SELECT 'MAT-016', 2500.00
    UNION ALL SELECT 'MAT-017', 200.00  UNION ALL SELECT 'MAT-018', 150.00  UNION ALL SELECT 'MAT-019', 100.00
    UNION ALL SELECT 'MAT-020', 200.00  UNION ALL SELECT 'MAT-021', 40.00   UNION ALL SELECT 'MAT-022', 15.00
    UNION ALL SELECT 'MAT-023', 400.00  UNION ALL SELECT 'MAT-024', 500.00  UNION ALL SELECT 'MAT-025', 250.00
    UNION ALL SELECT 'MAT-026', 300.00  UNION ALL SELECT 'MAT-027', 50.00   UNION ALL SELECT 'MAT-028', 20.00
    UNION ALL SELECT 'MAT-029', 40.00   UNION ALL SELECT 'MAT-030', 80.00   UNION ALL SELECT 'MAT-031', 40.00
    UNION ALL SELECT 'MAT-032', 150.00  UNION ALL SELECT 'MAT-033', 300.00  UNION ALL SELECT 'MAT-034', 150.00
  ) s
  JOIN materiales m ON m.codigo = s.codigo
 WHERE e.numero_factura_remision = 'REM-SEED-CEN'
   AND NOT EXISTS (SELECT 1 FROM detalles_entrada_inventario d WHERE d.entrada_id = e.id);
INSERT INTO detalles_entrada_inventario (entrada_id, material_id, cantidad, costo_unitario, costo_subtotal)
SELECT entrada_id, material_id, cantidad, costo_referencia, ROUND(cantidad * costo_referencia, 2) FROM tmp_stock_cen;
DROP TEMPORARY TABLE tmp_stock_cen;

CREATE TEMPORARY TABLE tmp_stock_obr AS
SELECT e.id AS entrada_id, m.id AS material_id, s.cantidad, m.costo_referencia
  FROM entradas_inventario e
  JOIN (
                     SELECT 'MAT-001' AS codigo, 120.00 AS cantidad
    UNION ALL SELECT 'MAT-002', 20.00   UNION ALL SELECT 'MAT-003', 150.00  UNION ALL SELECT 'MAT-005', 2000.00
    UNION ALL SELECT 'MAT-006', 50.00   UNION ALL SELECT 'MAT-011', 12.00   UNION ALL SELECT 'MAT-013', 100.00
    UNION ALL SELECT 'MAT-015', 600.00  UNION ALL SELECT 'MAT-017', 80.00   UNION ALL SELECT 'MAT-026', 100.00
    UNION ALL SELECT 'MAT-030', 30.00
  ) s
  JOIN materiales m ON m.codigo = s.codigo
 WHERE e.numero_factura_remision = 'REM-SEED-OBR'
   AND NOT EXISTS (SELECT 1 FROM detalles_entrada_inventario d WHERE d.entrada_id = e.id);
INSERT INTO detalles_entrada_inventario (entrada_id, material_id, cantidad, costo_unitario, costo_subtotal)
SELECT entrada_id, material_id, cantidad, costo_referencia, ROUND(cantidad * costo_referencia, 2) FROM tmp_stock_obr;
DROP TEMPORARY TABLE tmp_stock_obr;

UPDATE entradas_inventario e
   SET costo_total = COALESCE((SELECT SUM(d.costo_subtotal) FROM detalles_entrada_inventario d WHERE d.entrada_id = e.id), 0)
 WHERE e.numero_factura_remision IN ('REM-SEED-CEN', 'REM-SEED-OBR');
