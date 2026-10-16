-- «Empezar» etapa: fecha real de inicio (`etapas_proyecto.fecha_inicio_real`).
--
-- Idempotente: MySQL 8 no admite `ADD COLUMN IF NOT EXISTS`, por eso se consulta
-- information_schema antes de alterar la tabla.
--
-- Uso:
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_etapa_inicio_real.sql

SET @agregar_inicio_real := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `etapas_proyecto` ADD COLUMN `fecha_inicio_real` date DEFAULT NULL AFTER `fecha_fin_original`',
    'SELECT ''fecha_inicio_real ya existe'' '
  )
    FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'etapas_proyecto'
     AND column_name = 'fecha_inicio_real'
);
PREPARE stmt FROM @agregar_inicio_real;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
