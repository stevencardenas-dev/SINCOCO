-- Categorías de cargos y especialidades, y ajuste del catálogo base (HU-04).
--
-- Qué hace:
--   1. Añade `categoria` a `cargos` y `especialidades`. La interfaz agrupa los
--      selectores por ella (<optgroup>).
--   2. Solo la PRIMERA vez (cuando la columna no existía):
--      - asigna la categoría a los valores conocidos del catálogo base;
--      - da de baja (HU-18, sin borrar) los cargos que salen del catálogo:
--        Técnico (queda «Técnico de obra»), Almacenista (queda «Encargado de
--        bodega»), Ayudante (queda «Obrero») y Oficial;
--      - corrige las descripciones de Gerente, Administrador y Albañilería, solo
--        si siguen con el texto original (no pisa lo que haya editado el
--        administrador).
--   3. Siempre: agrega las especialidades nuevas si no existen.
--
-- Va en un bloque de «primera vez» porque el pipeline aplica todas las
-- migraciones en cada despliegue: si el administrador reactiva después uno de
-- esos cargos desde Catálogo, la migración no lo vuelve a dar de baja.
--
-- Los cargos y especialidades que no son del catálogo base (por ejemplo los que
-- creó migracion_catalogos.sql a partir del texto libre) quedan sin categoría:
-- la interfaz los muestra en «Otros» y el administrador puede clasificarlos.
--
-- Uso:
--   mysql -u root -p sincoco < docs/migracion_categorias_personal.sql

SET NAMES utf8mb4;

DROP PROCEDURE IF EXISTS `sincoco_migrar_categorias_personal`;
DELIMITER //
CREATE PROCEDURE `sincoco_migrar_categorias_personal`()
BEGIN
  DECLARE v_col_cargo INT DEFAULT 0;
  DECLARE v_col_especialidad INT DEFAULT 0;

  SELECT COUNT(*) INTO v_col_cargo FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'cargos' AND column_name = 'categoria';
  SELECT COUNT(*) INTO v_col_especialidad FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'especialidades' AND column_name = 'categoria';

  -- Cargos -----------------------------------------------------------------
  IF v_col_cargo = 0 THEN
    ALTER TABLE `cargos`
      ADD COLUMN `categoria` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `descripcion`;

    UPDATE `cargos` SET `categoria` = 'Directivo / Técnico'
     WHERE `nombre` IN ('Gerente', 'Arquitecto', 'Ingeniero residente');
    UPDATE `cargos` SET `categoria` = 'Administrativo'
     WHERE `nombre` IN ('Administrador', 'Almacenista', 'Encargado de bodega',
                        'Asistente administrativo', 'Contador', 'Asesor comercial');
    UPDATE `cargos` SET `categoria` = 'Operativo / Obra'
     WHERE `nombre` IN ('Maestro de obra', 'Oficial', 'Obrero', 'Ayudante', 'Operario',
                        'Técnico', 'Técnico de obra');

    -- Duplicados y cargos que salen del catálogo: baja lógica (HU-18).
    UPDATE `cargos` SET `activo` = 0, `fecha_baja` = NOW()
     WHERE `nombre` IN ('Técnico', 'Almacenista', 'Ayudante', 'Oficial') AND `activo` = 1;

    -- Gerente y Administrador describen el puesto (ACTORES_DEL_NEGOCIO.md), no
    -- el rol del sistema.
    UPDATE `cargos`
       SET `descripcion` = 'Dueño o gerente de la constructora: monitorea los proyectos y aprueba el gasto'
     WHERE `nombre` = 'Gerente' AND `descripcion` = 'Monitorea la operación y aprueba el gasto';
    UPDATE `cargos`
       SET `descripcion` = 'Administra los proyectos, el personal y los proveedores de la constructora'
     WHERE `nombre` = 'Administrador' AND `descripcion` = 'Administra el sistema y los accesos';
  END IF;

  -- Especialidades -----------------------------------------------------------
  IF v_col_especialidad = 0 THEN
    ALTER TABLE `especialidades`
      ADD COLUMN `categoria` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `descripcion`;

    UPDATE `especialidades` SET `categoria` = 'Obra Negra y Gris (Estructura)'
     WHERE `nombre` IN ('Albañilería', 'Estructuras', 'Mampostería');
    UPDATE `especialidades` SET `categoria` = 'Instalaciones (MEP)'
     WHERE `nombre` IN ('Electricidad', 'Plomería');
    UPDATE `especialidades` SET `categoria` = 'Acabados y Detalles'
     WHERE `nombre` IN ('Acabados', 'Carpintería', 'Pintura');
    UPDATE `especialidades` SET `categoria` = 'Trabajos Especializados'
     WHERE `nombre` IN ('Soldadura', 'Topografía');
    UPDATE `especialidades` SET `categoria` = 'Seguridad y Logística'
     WHERE `nombre` IN ('Maquinaria pesada', 'Seguridad industrial');

    -- Albañilería ya no incluye la mampostería (tiene su propia especialidad).
    UPDATE `especialidades`
       SET `descripcion` = 'Pañetes, revoques y obra de ladrillo en general'
     WHERE `nombre` = 'Albañilería' AND `descripcion` = 'Mampostería y pañetes con ladrillo o bloque';
  END IF;
END //
DELIMITER ;

CALL `sincoco_migrar_categorias_personal`();
DROP PROCEDURE `sincoco_migrar_categorias_personal`;

-- Especialidades nuevas. INSERT IGNORE: si ya existen (aunque estén dadas de
-- baja o editadas) no se tocan.
INSERT IGNORE INTO `especialidades` (`nombre`, `descripcion`, `categoria`) VALUES
  ('Armado de Acero (Fierrero)', 'Corte, figurado y amarre del acero de refuerzo', 'Obra Negra y Gris (Estructura)'),
  ('Climatización (HVAC)',       'Ventilación, aire acondicionado y extracción',  'Instalaciones (MEP)'),
  ('Redes de Gas',               'Instalación y prueba de redes de gas',          'Instalaciones (MEP)'),
  ('Drywall / Yeso',             'Muros y cielos en drywall, yeso y masillas',    'Acabados y Detalles'),
  ('Cerrajería / Aluminio',      'Puertas, ventanas y divisiones metálicas o de aluminio', 'Acabados y Detalles'),
  ('Impermeabilización',         'Cubiertas, tanques, terrazas y sótanos',        'Trabajos Especializados'),
  ('Rigger / Señalero',          'Aparejamiento de cargas y señalización de izajes', 'Seguridad y Logística');

SELECT 'cargos activos' catalogo, COUNT(*) filas FROM `cargos` WHERE `activo` = 1
UNION ALL SELECT 'cargos sin categoría', COUNT(*) FROM `cargos` WHERE `categoria` IS NULL AND `activo` = 1
UNION ALL SELECT 'especialidades activas', COUNT(*) FROM `especialidades` WHERE `activo` = 1
UNION ALL SELECT 'especialidades sin categoría', COUNT(*) FROM `especialidades` WHERE `categoria` IS NULL AND `activo` = 1;
