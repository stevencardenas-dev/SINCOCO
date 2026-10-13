-- HU-05 · criterio 3: el estado de la asignación refleja si está vigente,
-- finalizada o cancelada. El esquema solo tenía ACTIVO, FINALIZADO y
-- REASIGNADO; se agrega CANCELADO (asignación anulada antes de cumplirse, sin
-- fecha_fin_real).
--
-- Solo amplía el ENUM: las filas existentes conservan su valor. Es idempotente:
-- se puede relanzar sin efecto.
--
-- Uso:
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_asignacion_cancelada.sql

ALTER TABLE `asignaciones_personal`
  MODIFY COLUMN `estado`
    ENUM('ACTIVO','FINALIZADO','REASIGNADO','CANCELADO')
    COLLATE utf8mb4_unicode_ci DEFAULT 'ACTIVO';

SELECT COLUMN_TYPE AS estado_asignaciones
  FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME = 'asignaciones_personal'
   AND COLUMN_NAME = 'estado';
