-- HU-22 · evidencias de avance.
-- El esquema base solo guardaba la ruta del archivo; para adjuntar la evidencia
-- desde la aplicación se guarda el contenido (base64) igual que en incidencias,
-- con su tamaño y la categoría de la evidencia.
ALTER TABLE `evidencias_avance`
  ADD COLUMN `archivo` MEDIUMTEXT NULL AFTER `ruta_archivo`,
  ADD COLUMN `tamano_bytes` int DEFAULT NULL AFTER `archivo`,
  ADD COLUMN `categoria` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `tipo_archivo`;
