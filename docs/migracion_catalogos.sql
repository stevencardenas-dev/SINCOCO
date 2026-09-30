-- Migración a los catálogos de cargos y especialidades (HU-04).
--
-- Qué hace, en este orden:
--   1. Crea `cargos` y `especialidades` si no existen (bases anteriores).
--   2. Añade `trabajadores.cargo_id` y `trabajadores.especialidad_id`.
--   3. Vuelca los valores de texto que ya existían en `trabajadores.cargo` y
--      `trabajadores.especialidad` (normalizados a "Primera letra mayúscula")
--      dentro de los catálogos, y enlaza cada trabajador con su fila.
--   4. Deja `cargo_id` NOT NULL con clave foránea y elimina las columnas de
--      texto: a partir de aquí el dominio es la única fuente de verdad.
--
-- Es idempotente y no destructiva: si la base ya está migrada, no hace nada;
-- si aparece un cargo sin clasificar, lo conserva como "Sin definir" en vez de
-- perder el dato.
--
-- Uso:
--   mysql -u root -p sincoco < docs/migracion_catalogos.sql
--
-- Las bases nuevas no la necesitan: docs/schema.sql ya trae el modelo nuevo.
-- Esta migración es para las bases que vienen del esquema anterior (local y
-- RDS); deploy/cargar-base.sh la ejecuta siempre por eso.

DROP PROCEDURE IF EXISTS `sincoco_migrar_catalogos`;
DELIMITER //
CREATE PROCEDURE `sincoco_migrar_catalogos`()
BEGIN
  DECLARE v_col_cargo INT DEFAULT 0;
  DECLARE v_col_especialidad INT DEFAULT 0;
  DECLARE v_col_cargo_id INT DEFAULT 0;
  DECLARE v_col_especialidad_id INT DEFAULT 0;
  DECLARE v_fk_cargo INT DEFAULT 0;
  DECLARE v_fk_especialidad INT DEFAULT 0;
  DECLARE v_sin_cargo INT DEFAULT 0;

  -- 1. Tablas de dominio ----------------------------------------------------
  CREATE TABLE IF NOT EXISTS `cargos` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
    `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    `operativo` tinyint(1) NOT NULL DEFAULT '0',
    `estado` enum('ACTIVO','INACTIVO') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVO',
    `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `activo` tinyint(1) NOT NULL DEFAULT '1',
    `fecha_baja` datetime DEFAULT NULL,
    `baja_por_usuario_id` bigint DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `nombre` (`nombre`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  CREATE TABLE IF NOT EXISTS `especialidades` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
    `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    `estado` enum('ACTIVO','INACTIVO') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVO',
    `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `activo` tinyint(1) NOT NULL DEFAULT '1',
    `fecha_baja` datetime DEFAULT NULL,
    `baja_por_usuario_id` bigint DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `nombre` (`nombre`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  -- 2. Columnas de clave foránea en `trabajadores` --------------------------
  SELECT COUNT(*) INTO v_col_cargo_id FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'trabajadores' AND column_name = 'cargo_id';
  IF v_col_cargo_id = 0 THEN
    ALTER TABLE `trabajadores` ADD COLUMN `cargo_id` bigint DEFAULT NULL AFTER `direccion`;
  END IF;

  SELECT COUNT(*) INTO v_col_especialidad_id FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'trabajadores' AND column_name = 'especialidad_id';
  IF v_col_especialidad_id = 0 THEN
    ALTER TABLE `trabajadores` ADD COLUMN `especialidad_id` bigint DEFAULT NULL AFTER `cargo_id`;
  END IF;

  -- 3. Volcar el texto libre anterior dentro de los catálogos ---------------
  -- Solo si las columnas de texto siguen ahí (base antigua). La colación
  -- utf8mb4_unicode_ci no distingue mayúsculas ni tildes, así que los nombres
  -- repetidos se unifican solos con INSERT IGNORE.
  SELECT COUNT(*) INTO v_col_cargo FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'trabajadores' AND column_name = 'cargo';
  SELECT COUNT(*) INTO v_col_especialidad FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'trabajadores' AND column_name = 'especialidad';

  IF v_col_cargo = 1 THEN
    INSERT IGNORE INTO `cargos` (`nombre`, `descripcion`, `operativo`)
    SELECT DISTINCT
           CONCAT(UPPER(LEFT(TRIM(`cargo`), 1)), LOWER(SUBSTRING(TRIM(`cargo`), 2))),
           'Cargo migrado del esquema anterior',
           CASE WHEN UPPER(TRIM(`cargo`)) IN
             ('MAESTRO DE OBRA','MAESTRO_OBRA','OFICIAL','OBRERO','AYUDANTE','OPERARIO','TECNICO','TECNICO DE OBRA')
           THEN 1 ELSE 0 END
      FROM `trabajadores`
     WHERE `cargo` IS NOT NULL AND TRIM(`cargo`) <> '';

    UPDATE `trabajadores` t
      JOIN `cargos` c ON c.`nombre` = TRIM(t.`cargo`)
       SET t.`cargo_id` = c.`id`
     WHERE t.`cargo_id` IS NULL;
  END IF;

  IF v_col_especialidad = 1 THEN
    INSERT IGNORE INTO `especialidades` (`nombre`, `descripcion`)
    SELECT DISTINCT
           CONCAT(UPPER(LEFT(TRIM(`especialidad`), 1)), LOWER(SUBSTRING(TRIM(`especialidad`), 2))),
           'Especialidad migrada del esquema anterior'
      FROM `trabajadores`
     WHERE `especialidad` IS NOT NULL AND TRIM(`especialidad`) <> '';

    UPDATE `trabajadores` t
      JOIN `especialidades` e ON e.`nombre` = TRIM(t.`especialidad`)
       SET t.`especialidad_id` = e.`id`
     WHERE t.`especialidad_id` IS NULL;
  END IF;

  -- Un cargo sin texto no puede quedar sin referencia: se conserva como
  -- "Sin definir" para no perder la ficha del trabajador.
  SELECT COUNT(*) INTO v_sin_cargo FROM `trabajadores` WHERE `cargo_id` IS NULL;
  IF v_sin_cargo > 0 THEN
    INSERT IGNORE INTO `cargos` (`nombre`, `descripcion`, `operativo`)
    VALUES ('Sin definir', 'Cargo pendiente de clasificar por el administrador', 0);
    UPDATE `trabajadores` t
      JOIN `cargos` c ON c.`nombre` = 'Sin definir'
       SET t.`cargo_id` = c.`id`
     WHERE t.`cargo_id` IS NULL;
  END IF;

  -- 4. Claves foráneas y limpieza del texto libre ---------------------------
  SELECT COUNT(*) INTO v_fk_cargo FROM information_schema.table_constraints
   WHERE table_schema = DATABASE() AND table_name = 'trabajadores'
     AND constraint_name = 'fk_trabajador_cargo';
  IF v_fk_cargo = 0 THEN
    ALTER TABLE `trabajadores`
      MODIFY COLUMN `cargo_id` bigint NOT NULL,
      ADD CONSTRAINT `fk_trabajador_cargo` FOREIGN KEY (`cargo_id`)
        REFERENCES `cargos` (`id`) ON DELETE RESTRICT;
  END IF;

  SELECT COUNT(*) INTO v_fk_especialidad FROM information_schema.table_constraints
   WHERE table_schema = DATABASE() AND table_name = 'trabajadores'
     AND constraint_name = 'fk_trabajador_especialidad';
  IF v_fk_especialidad = 0 THEN
    ALTER TABLE `trabajadores`
      ADD CONSTRAINT `fk_trabajador_especialidad` FOREIGN KEY (`especialidad_id`)
        REFERENCES `especialidades` (`id`) ON DELETE SET NULL;
  END IF;

  IF v_col_cargo = 1 THEN
    ALTER TABLE `trabajadores` DROP COLUMN `cargo`;
  END IF;
  IF v_col_especialidad = 1 THEN
    ALTER TABLE `trabajadores` DROP COLUMN `especialidad`;
  END IF;

  -- 5. Resumen -------------------------------------------------------------
  SELECT 'cargos' catalogo, COUNT(*) filas FROM `cargos`
  UNION ALL SELECT 'especialidades', COUNT(*) FROM `especialidades`
  UNION ALL SELECT 'trabajadores', COUNT(*) FROM `trabajadores`
  UNION ALL SELECT 'trabajadores sin especialidad', COUNT(*) FROM `trabajadores` WHERE `especialidad_id` IS NULL;
END //
DELIMITER ;

CALL `sincoco_migrar_catalogos`();
DROP PROCEDURE `sincoco_migrar_catalogos`;
