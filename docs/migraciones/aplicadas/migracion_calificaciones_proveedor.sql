-- HU-41 · calificación de desempeño operacional de proveedores.
--
-- Cada servicio externo finalizado (HU-28) o cada entrega recibida de una orden
-- de compra (HU-19) admite una única calificación de puntualidad y calidad en
-- escala de 1 a 5. El comentario es obligatorio cuando algún puntaje es 2 o
-- menor. Las calificaciones no se eliminan: una corrección se guarda en la
-- bitácora de trazabilidad. Los promedios se calculan al consultar el catálogo.
--
-- `fecha_pactada` y `fecha_cumplimiento` son la referencia de la puntualidad.
--
-- Permiso nuevo: `proveedores.calificar` (solo administrador).
-- Es idempotente.
--
-- Uso:
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_calificaciones_proveedor.sql

CREATE TABLE IF NOT EXISTS `calificaciones_proveedor` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `proveedor_id` bigint NOT NULL,
  `servicio_externo_id` bigint DEFAULT NULL,
  `orden_compra_id` bigint DEFAULT NULL,
  `puntualidad` tinyint NOT NULL,
  `calidad` tinyint NOT NULL,
  `comentario` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_pactada` date DEFAULT NULL,
  `fecha_cumplimiento` date DEFAULT NULL,
  `calificado_por_usuario_id` bigint NOT NULL,
  `calificado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_calificacion_servicio` (`servicio_externo_id`),
  UNIQUE KEY `uk_calificacion_orden` (`orden_compra_id`),
  KEY `idx_calificacion_proveedor` (`proveedor_id`),
  KEY `fk_calificacion_usuario` (`calificado_por_usuario_id`),
  CONSTRAINT `fk_calificacion_proveedor` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_calificacion_servicio` FOREIGN KEY (`servicio_externo_id`) REFERENCES `servicios_externos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_calificacion_orden` FOREIGN KEY (`orden_compra_id`) REFERENCES `ordenes_compra` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_calificacion_usuario` FOREIGN KEY (`calificado_por_usuario_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `chk_calificacion_puntualidad` CHECK (`puntualidad` BETWEEN 1 AND 5),
  CONSTRAINT `chk_calificacion_calidad` CHECK (`calidad` BETWEEN 1 AND 5),
  CONSTRAINT `chk_calificacion_una_referencia` CHECK ((`servicio_externo_id` IS NOT NULL) + (`orden_compra_id` IS NOT NULL) = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `permisos` (`nombre`, `descripcion`, `modulo`) VALUES
  ('proveedores.calificar', 'Calificar la puntualidad y la calidad de un proveedor', 'proveedores')
ON DUPLICATE KEY UPDATE
  `descripcion` = VALUES(`descripcion`),
  `modulo` = VALUES(`modulo`);

INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id`
  FROM `roles` r
  JOIN `permisos` p ON p.`nombre` = 'proveedores.calificar'
 WHERE r.`nombre` = 'ADMINISTRADOR';

SELECT COUNT(*) AS tabla_creada FROM information_schema.TABLES
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calificaciones_proveedor';
