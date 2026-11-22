-- HU-34 · historial de reprogramaciones: quién AUTORIZÓ el cambio, separado de quién lo registró (`usuario_id`).
-- `autorizado_por_usuario_id` es opcional en la API; si no se envía, el backend guarda al mismo usuario que registra.
-- Las filas antiguas quedan en NULL (se leen como autorizadas por quien las registró).
-- No toca los triggers de inmutabilidad: solo agrega una columna y su clave foránea.
--
-- Idempotente: MySQL 8 no admite `ADD COLUMN IF NOT EXISTS`, por eso se consulta information_schema.
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_reprogramacion_autorizado_por.sql

SET @agregar_autorizado := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `reprogramaciones_plan` ADD COLUMN `autorizado_por_usuario_id` bigint DEFAULT NULL AFTER `usuario_id`',
    'SELECT ''autorizado_por_usuario_id ya existe'' '
  )
    FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'reprogramaciones_plan'
     AND column_name = 'autorizado_por_usuario_id'
);
PREPARE stmt FROM @agregar_autorizado;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @agregar_fk := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `reprogramaciones_plan` ADD CONSTRAINT `fk_reprog_autorizado_por` FOREIGN KEY (`autorizado_por_usuario_id`) REFERENCES `usuarios` (`id`)',
    'SELECT ''fk_reprog_autorizado_por ya existe'' '
  )
    FROM information_schema.table_constraints
   WHERE table_schema = DATABASE()
     AND table_name = 'reprogramaciones_plan'
     AND constraint_name = 'fk_reprog_autorizado_por'
);
PREPARE stmt FROM @agregar_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
