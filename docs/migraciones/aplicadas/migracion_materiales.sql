-- HU-07: catálogo de materiales.
--
-- 1. Crea los permisos `materiales.*` y los asigna a ADMINISTRADOR y
--    ENCARGADO_BODEGA (el resto de roles no ve el módulo).
-- 2. Siembra las categorías base de materiales: el formulario exige una
--    categoría válida por material (HU-07 · criterio 2) y la tabla
--    `categorias_materiales` aún no tiene pantalla propia.
--
-- La tabla `materiales` ya existe en docs/schema.sql; no se modifica.
-- `existencia_total` nace en 0 y solo la mueven las entradas, salidas,
-- traslados y devoluciones (HU-07 · criterio 4); este módulo no la escribe.
-- Es idempotente: se puede relanzar sin duplicar filas ni quitar permisos.
--
-- Uso:
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_materiales.sql

INSERT INTO `permisos` (`nombre`, `descripcion`, `modulo`) VALUES
  ('materiales.listar',   'Consultar el catálogo de materiales',  'materiales'),
  ('materiales.crear',    'Registrar materiales en el catálogo',  'materiales'),
  ('materiales.editar',   'Editar los datos de un material',      'materiales'),
  ('materiales.dar_baja', 'Dar de baja lógica un material',       'materiales')
ON DUPLICATE KEY UPDATE
  `descripcion` = VALUES(`descripcion`),
  `modulo` = VALUES(`modulo`);

INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id`
  FROM `roles` r
  JOIN `permisos` p ON p.`modulo` = 'materiales'
 WHERE r.`nombre` IN ('ADMINISTRADOR', 'ENCARGADO_BODEGA');

-- Categorías base (nombre UNIQUE: no se duplican al relanzar).
INSERT INTO `categorias_materiales` (`nombre`, `descripcion`) VALUES
  ('Cemento y agregados', 'Cemento, arena, grava y mezclas'),
  ('Acero de refuerzo',   'Varillas, mallas y alambres'),
  ('Acabados',            'Pinturas, pisos y revestimientos'),
  ('Eléctrico',           'Cables, tomas y canalizaciones'),
  ('Hidrosanitario',      'Tuberías, accesorios y sanitarios')
ON DUPLICATE KEY UPDATE `descripcion` = VALUES(`descripcion`);

SELECT 'permisos materiales' AS tabla, COUNT(*) AS filas FROM `permisos` WHERE `modulo` = 'materiales'
UNION ALL SELECT 'categorias_materiales', COUNT(*) FROM `categorias_materiales`;
