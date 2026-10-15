-- HU-10: catálogo de herramientas.
--
-- 1. Crea los permisos `herramientas.*` y los asigna a ADMINISTRADOR y
--    ENCARGADO_BODEGA (el resto de roles no ve el módulo).
-- 2. Siembra dos almacenes y unas herramientas de prueba: la tabla
--    `almacenes` aún no tiene pantalla propia y el formulario necesita al
--    menos un almacén donde ubicar cada herramienta (HU-10 · criterio 2).
--
-- La tabla `herramientas` ya existe en docs/schema.sql; no se modifica.
-- Es idempotente: se puede relanzar sin duplicar filas ni quitar permisos.
--
-- Uso:
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_herramientas.sql

INSERT INTO `permisos` (`nombre`, `descripcion`, `modulo`) VALUES
  ('herramientas.listar',   'Consultar el catálogo de herramientas',        'herramientas'),
  ('herramientas.crear',    'Registrar herramientas en el catálogo',        'herramientas'),
  ('herramientas.editar',   'Editar los datos y el estado de una herramienta', 'herramientas'),
  ('herramientas.dar_baja', 'Dar de baja lógica una herramienta',           'herramientas')
ON DUPLICATE KEY UPDATE
  `descripcion` = VALUES(`descripcion`),
  `modulo` = VALUES(`modulo`);

INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id`
  FROM `roles` r
  JOIN `permisos` p ON p.`modulo` = 'herramientas'
 WHERE r.`nombre` IN ('ADMINISTRADOR', 'ENCARGADO_BODEGA');

-- Almacenes de prueba (código UNIQUE: no se duplican al relanzar).
INSERT INTO `almacenes` (`codigo`, `nombre`, `ubicacion`, `es_central`) VALUES
  ('ALM-CENTRAL', 'Bodega central',   'Sede principal de la constructora', 1),
  ('ALM-OBRA-01', 'Bodega de obra 1', 'Frente de obra', 0)
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);

-- Herramientas de prueba (codigo_serial UNIQUE).
INSERT INTO `herramientas`
  (`codigo_serial`, `nombre`, `marca`, `modelo`, `almacen_id`, `estado_operativo`, `disponibilidad`)
SELECT x.serial, x.nombre, x.marca, x.modelo, a.`id`, x.estado, 'DISPONIBLE'
  FROM (
    SELECT 'HR-0001' AS serial, 'Taladro percutor' AS nombre, 'Bosch' AS marca, 'GSB 13 RE' AS modelo,
           'ALM-CENTRAL' AS almacen, 'EXCELENTE' AS estado
    UNION ALL SELECT 'HR-0002', 'Pulidora angular',  'DeWalt', 'DWE402',   'ALM-CENTRAL', 'BUENO'
    UNION ALL SELECT 'HR-0003', 'Mezcladora',        'Truper', 'MEZ-1/2',  'ALM-OBRA-01', 'REGULAR'
    UNION ALL SELECT 'HR-0004', 'Sierra circular',   'Makita', '5007MG',   'ALM-OBRA-01', 'DANIADA'
    UNION ALL SELECT 'HR-0005', 'Nivel láser',       'Bosch',  'GLL 3-80', 'ALM-CENTRAL', 'EN_MANTENIMIENTO'
  ) x
  JOIN `almacenes` a ON a.`codigo` = x.almacen
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);

SELECT 'permisos herramientas' AS tabla, COUNT(*) AS filas FROM `permisos` WHERE `modulo` = 'herramientas'
UNION ALL SELECT 'almacenes', COUNT(*) FROM `almacenes`
UNION ALL SELECT 'herramientas', COUNT(*) FROM `herramientas`;
