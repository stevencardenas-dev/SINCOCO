-- Sesión única por cuenta (RNF05 · seguridad).
--
-- Cada ingreso guarda un identificador de sesión (`sesion_actual`) y cada
-- petición actualiza `sesion_actividad`. Mientras la sesión siga activa, un
-- segundo ingreso con la misma cuenta se rechaza, así que una misma cuenta no
-- puede mantener varias sesiones abiertas a la vez. La cuenta se libera al
-- cerrar sesión o tras unos minutos sin actividad (backend/src/middleware/auth.js).
--
-- `docs/schema.sql` viene del dump de la entrega y no trae estas columnas, así
-- que este archivo se aplica tanto en local como en RDS. Es idempotente:
-- MySQL 8 no admite `ADD COLUMN IF NOT EXISTS`, por eso se consulta
-- information_schema antes de alterar la tabla.
--
-- Uso:
--   mysql -u root -p sincoco < docs/migraciones/aplicadas/migracion_sesion_unica.sql

SET @agregar_sesion := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `usuarios` ADD COLUMN `sesion_actual` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `ultimo_acceso`',
    'SELECT ''sesion_actual ya existe'' '
  )
    FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'usuarios'
     AND column_name = 'sesion_actual'
);
PREPARE stmt FROM @agregar_sesion;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @agregar_inicio := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `usuarios` ADD COLUMN `sesion_iniciada_en` datetime DEFAULT NULL AFTER `sesion_actual`',
    'SELECT ''sesion_iniciada_en ya existe'' '
  )
    FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'usuarios'
     AND column_name = 'sesion_iniciada_en'
);
PREPARE stmt FROM @agregar_inicio;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @agregar_actividad := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `usuarios` ADD COLUMN `sesion_actividad` datetime DEFAULT NULL AFTER `sesion_iniciada_en`',
    'SELECT ''sesion_actividad ya existe'' '
  )
    FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'usuarios'
     AND column_name = 'sesion_actividad'
);
PREPARE stmt FROM @agregar_actividad;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'usuarios' tabla, COUNT(*) filas FROM `usuarios`;
