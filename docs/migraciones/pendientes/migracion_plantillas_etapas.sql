-- Plantillas de etapas (mejora de HU-03).
--
-- 1. Crea `plantillas_etapas` y `plantillas_etapas_detalle`: el catálogo de
--    plantillas vive en la base, no en el código.
-- 2. Agrega el permiso `etapas.aplicar_plantilla` y lo asigna solo a
--    ADMINISTRADOR (GERENTE y MAESTRO_OBRA tienen `etapas.crear`, pero no
--    pueden aplicar plantillas).
-- 3. Carga las plantillas iniciales: Vivienda, Urbanización, Edificio / Multifamiliar y
--    Remodelación / Adecuación.
--
-- Idempotente: se puede relanzar sin duplicar nada.
--
-- Uso:
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_plantillas_etapas.sql

CREATE TABLE IF NOT EXISTS `plantillas_etapas` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_plantilla_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `plantillas_etapas_detalle` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `plantilla_id` bigint NOT NULL,
  `orden` int NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_plantilla_orden` (`plantilla_id`,`orden`),
  CONSTRAINT `fk_plantilla_detalle` FOREIGN KEY (`plantilla_id`) REFERENCES `plantillas_etapas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Permiso: solo el administrador (recibe el que se asigna aquí).
INSERT INTO `permisos` (`nombre`, `descripcion`, `modulo`)
VALUES ('etapas.aplicar_plantilla', 'Aplicar una plantilla de etapas a un proyecto', 'planificacion')
ON DUPLICATE KEY UPDATE
  `descripcion` = VALUES(`descripcion`),
  `modulo` = VALUES(`modulo`);

INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id`
  FROM `roles` r
  JOIN `permisos` p ON p.`nombre` = 'etapas.aplicar_plantilla'
 WHERE r.`nombre` = 'ADMINISTRADOR';

-- Plantillas iniciales.
INSERT IGNORE INTO `plantillas_etapas` (`nombre`, `descripcion`) VALUES
  ('Vivienda', 'Construcción de vivienda unifamiliar o multifamiliar'),
  ('Urbanización', 'Urbanización con redes, vías y zonas comunes'),
  ('Edificio / Multifamiliar', 'Edificio de vivienda multifamiliar con sótanos, zonas comunes y sistemas especiales'),
  ('Remodelación / Adecuación', 'Remodelación o adecuación de una edificación existente');

INSERT IGNORE INTO `plantillas_etapas_detalle` (`plantilla_id`, `orden`, `nombre`, `descripcion`)
SELECT p.`id`, d.`orden`, d.`nombre`, d.`descripcion`
  FROM `plantillas_etapas` p
  JOIN (
    SELECT 'Vivienda' AS plantilla, 1 AS orden, 'Gestión previa' AS nombre, 'Licencias y permisos' AS descripcion
    UNION ALL SELECT 'Vivienda', 2, 'Preliminares', 'Cerramiento, campamento, descapote, replanteo'
    UNION ALL SELECT 'Vivienda', 3, 'Cimentación', NULL
    UNION ALL SELECT 'Vivienda', 4, 'Estructura', NULL
    UNION ALL SELECT 'Vivienda', 5, 'Mampostería', NULL
    UNION ALL SELECT 'Vivienda', 6, 'Cubierta', NULL
    UNION ALL SELECT 'Vivienda', 7, 'Instalaciones hidrosanitarias y eléctricas', NULL
    UNION ALL SELECT 'Vivienda', 8, 'Acabados', NULL
    UNION ALL SELECT 'Vivienda', 9, 'Obras exteriores', NULL
    UNION ALL SELECT 'Vivienda', 10, 'Entrega y cierre', NULL
    UNION ALL SELECT 'Urbanización', 1, 'Gestión previa', NULL
    UNION ALL SELECT 'Urbanización', 2, 'Preliminares y movimiento de tierras', NULL
    UNION ALL SELECT 'Urbanización', 3, 'Redes de acueducto y alcantarillado', NULL
    UNION ALL SELECT 'Urbanización', 4, 'Redes eléctricas y de alumbrado', NULL
    UNION ALL SELECT 'Urbanización', 5, 'Vías y andenes', NULL
    UNION ALL SELECT 'Urbanización', 6, 'Zonas verdes y mobiliario', NULL
    UNION ALL SELECT 'Urbanización', 7, 'Entrega y cierre', NULL
    UNION ALL SELECT 'Remodelación / Adecuación', 1, 'Gestión previa', NULL
    UNION ALL SELECT 'Remodelación / Adecuación', 2, 'Demolición y preliminares', NULL
    UNION ALL SELECT 'Remodelación / Adecuación', 3, 'Obra gris', NULL
    UNION ALL SELECT 'Remodelación / Adecuación', 4, 'Instalaciones', NULL
    UNION ALL SELECT 'Remodelación / Adecuación', 5, 'Acabados', NULL
    UNION ALL SELECT 'Remodelación / Adecuación', 6, 'Entrega y cierre', NULL
    UNION ALL SELECT 'Edificio / Multifamiliar', 1, 'Gestión previa', 'Licencia de construcción, factibilidad de servicios, permisos ambientales, contratación de supervisión técnica'
    UNION ALL SELECT 'Edificio / Multifamiliar', 2, 'Preliminares', 'Cerramiento, campamento, descapote, replanteo'
    UNION ALL SELECT 'Edificio / Multifamiliar', 3, 'Excavación y movimiento de tierras', NULL
    UNION ALL SELECT 'Edificio / Multifamiliar', 4, 'Cimentación y sótanos / muros de contención', NULL
    UNION ALL SELECT 'Edificio / Multifamiliar', 5, 'Estructura por niveles', 'Columnas, vigas y losas, piso a piso'
    UNION ALL SELECT 'Edificio / Multifamiliar', 6, 'Mampostería y fachadas', NULL
    UNION ALL SELECT 'Edificio / Multifamiliar', 7, 'Cubierta y terraza', NULL
    UNION ALL SELECT 'Edificio / Multifamiliar', 8, 'Instalaciones hidrosanitarias, eléctricas, gas y red contra incendios', NULL
    UNION ALL SELECT 'Edificio / Multifamiliar', 9, 'Sistemas especiales', 'Ascensores, ventilación, citofonía'
    UNION ALL SELECT 'Edificio / Multifamiliar', 10, 'Acabados', 'Pisos, muros, carpintería, aparatos'
    UNION ALL SELECT 'Edificio / Multifamiliar', 11, 'Zonas comunes y obras exteriores', 'Portería, parqueaderos, zonas sociales'
    UNION ALL SELECT 'Edificio / Multifamiliar', 12, 'Pruebas, entrega y cierre', 'Actas de recibo, certificado técnico de ocupación, entrega de zonas comunes'
  ) d ON d.`plantilla` = p.`nombre`;

SELECT 'plantillas' tabla, COUNT(*) filas FROM `plantillas_etapas`
UNION ALL SELECT 'detalle', COUNT(*) FROM `plantillas_etapas_detalle`;
