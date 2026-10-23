-- HU-37 · cambio de estado operativo de herramientas (en reparación / de baja).
-- Crea el historial de reparaciones y el permiso `herramientas.cambiar_estado`
-- (ADMINISTRADOR y ENCARGADO_BODEGA). Idempotente.
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_estado_herramientas.sql

CREATE TABLE IF NOT EXISTS `reparaciones_herramientas` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `herramienta_id` bigint NOT NULL,
  `fecha_ingreso` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `descripcion` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado_previo` enum('EXCELENTE','BUENO','REGULAR','DANIADA','EN_MANTENIMIENTO') COLLATE utf8mb4_unicode_ci NOT NULL,
  `ingresado_por_usuario_id` bigint NOT NULL,
  `fecha_salida` datetime DEFAULT NULL,
  `costo` decimal(12,2) DEFAULT NULL,
  `observaciones_salida` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `salida_por_usuario_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_reparaciones_herramienta` (`herramienta_id`, `fecha_salida`),
  CONSTRAINT `fk_repar_herramienta` FOREIGN KEY (`herramienta_id`) REFERENCES `herramientas` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `permisos` (`nombre`, `descripcion`, `modulo`) VALUES
  ('herramientas.cambiar_estado', 'Enviar una herramienta a reparación, devolverla a servicio o darla de baja', 'herramientas')
ON DUPLICATE KEY UPDATE `descripcion` = VALUES(`descripcion`), `modulo` = VALUES(`modulo`);

INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id` FROM `roles` r JOIN `permisos` p ON p.`nombre` = 'herramientas.cambiar_estado'
 WHERE r.`nombre` IN ('ADMINISTRADOR', 'ENCARGADO_BODEGA');

SELECT COUNT(*) AS reparaciones FROM `reparaciones_herramientas`;
