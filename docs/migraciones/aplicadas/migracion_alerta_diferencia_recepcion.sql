-- HU-40 · alerta de diferencia entre lo despachado y lo recibido en obra.
--
-- La columna `alertas.tipo` es un enum: sin incluir DIFERENCIA_RECEPCION el
-- INSERT de la alerta falla con «Data truncated for column 'tipo'» y la firma
-- del acta con diferencias se cae. La lista es la vigente en producción
-- (migracion_solicitudes_materiales.sql agregó SOLICITUD_MATERIAL).
--
-- MODIFY COLUMN es idempotente: volver a ejecutarlo deja el mismo enum.
--
-- Uso:
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_alerta_diferencia_recepcion.sql

ALTER TABLE `alertas`
  MODIFY COLUMN `tipo` enum('STOCK_MINIMO','HERRAMIENTA_PENDIENTE','ACTIVIDAD_ATRASADA','INCIDENCIA_CRITICA','SOLICITUD_MATERIAL','DIFERENCIA_RECEPCION')
    COLLATE utf8mb4_unicode_ci NOT NULL;

SELECT COLUMN_TYPE AS tipos_alerta FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'alertas' AND COLUMN_NAME = 'tipo';
