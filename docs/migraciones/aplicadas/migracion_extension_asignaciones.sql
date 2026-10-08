-- HU-31 (AYD-45) · extensión o prórroga de asignación de personal.
-- Cada extensión es un evento propio: conserva la fecha fin anterior, la nueva,
-- el motivo, quién la registró y cuándo. La asignación original no se borra.
-- Idempotente: se puede relanzar.
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_extension_asignaciones.sql

CREATE TABLE IF NOT EXISTS `extensiones_asignacion` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `asignacion_id` bigint NOT NULL,
  `fecha_fin_anterior` date NOT NULL,
  `fecha_fin_nueva` date NOT NULL,
  `motivo` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `usuario_id` bigint DEFAULT NULL,
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_extasig_asignacion` (`asignacion_id`),
  KEY `fk_extasig_usuario` (`usuario_id`),
  CONSTRAINT `fk_extasig_asignacion` FOREIGN KEY (`asignacion_id`) REFERENCES `asignaciones_personal` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_extasig_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_extasig_fechas` CHECK ((`fecha_fin_nueva` > `fecha_fin_anterior`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
