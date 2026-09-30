-- Recuperación de contraseña (HU-01): crea la tabla de códigos de un solo uso.
--
-- Las bases nuevas no la necesitan: docs/schema.sql ya trae la tabla. Este
-- archivo es para las bases que vienen del esquema anterior (local y RDS);
-- deploy/cargar-base.sh lo ejecuta siempre. Es idempotente.
--
-- Uso:
--   mysql -u root -p sincoco < docs/migracion_password_reset.sql

CREATE TABLE IF NOT EXISTS `restablecimientos_password` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `usuario_id` bigint NOT NULL,
  `codigo` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expira_en` datetime NOT NULL,
  `intentos` tinyint NOT NULL DEFAULT '0',
  `usado_en` datetime DEFAULT NULL,
  `solicitado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `direccion_ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_reset_usuario` (`usuario_id`),
  CONSTRAINT `fk_reset_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'restablecimientos_password' tabla, COUNT(*) filas FROM `restablecimientos_password`;
