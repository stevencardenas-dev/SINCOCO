-- Datos de prueba: 7 materiales básicos de obra con costos de referencia por unidad (COP, 2026).
-- Crea las categorías si faltan. Idempotente: si el código ya existe, solo actualiza descripción y costo.
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_materiales_prueba.sql

INSERT IGNORE INTO `categorias_materiales` (`nombre`, `descripcion`) VALUES
  ('Cemento y agregados', 'Cemento, arena, grava y concretos'),
  ('Acero de refuerzo', 'Varillas, mallas y alambres para refuerzo'),
  ('Mampostería', 'Ladrillos y bloques'),
  ('Instalaciones', 'Tubería y accesorios hidráulicos y eléctricos');

INSERT INTO `materiales` (`codigo`, `categoria_id`, `descripcion`, `unidad_medida`, `costo_referencia`, `nivel_minimo`)
SELECT v.codigo, c.`id`, v.descripcion, v.unidad, v.costo, v.minimo
FROM (
            SELECT 'CEM-050' AS codigo, 'Cemento y agregados' AS categoria, 'Cemento gris uso general 50 kg' AS descripcion, 'BOLSA' AS unidad, 32000.00 AS costo, 40.00 AS minimo
  UNION ALL SELECT 'ARE-LAV', 'Cemento y agregados', 'Arena lavada de río', 'M3', 95000.00, 6.00
  UNION ALL SELECT 'GRA-34', 'Cemento y agregados', 'Grava triturada 3/4"', 'M3', 110000.00, 6.00
  UNION ALL SELECT 'VAR-12', 'Acero de refuerzo', 'Varilla corrugada 1/2" x 6 m', 'UNIDAD', 38000.00, 100.00
  UNION ALL SELECT 'ALA-18', 'Acero de refuerzo', 'Alambre negro calibre 18 para amarre', 'KG', 9500.00, 20.00
  UNION ALL SELECT 'LAD-N5', 'Mampostería', 'Ladrillo hueco No. 5 (10x20x30 cm)', 'UNIDAD', 1300.00, 1000.00
  UNION ALL SELECT 'PVC-4S', 'Instalaciones', 'Tubo PVC sanitario 4" x 6 m', 'UNIDAD', 85000.00, 10.00
) AS v
JOIN `categorias_materiales` c ON c.`nombre` = v.categoria
ON DUPLICATE KEY UPDATE `descripcion` = VALUES(`descripcion`), `costo_referencia` = VALUES(`costo_referencia`);

SELECT COUNT(*) AS materiales FROM `materiales`;
