-- HU-13 (criterios 3 y 4): documentos de soporte del proveedor y permisos de
-- edición, baja y documentos. Solo ADMINISTRADOR. Idempotente.
--
-- Uso:
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_proveedores_documentos.sql

CREATE TABLE IF NOT EXISTS `proveedor_documentos` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `proveedor_id` bigint NOT NULL,
  `tipo` enum('CERTIFICADO','POLIZA','CONTRATO','RUT','OTRO') COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_archivo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_mime` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tamano` int NOT NULL,
  `contenido` longblob NOT NULL,
  `subido_por_usuario_id` bigint DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_proveedor_documentos_proveedor` (`proveedor_id`),
  CONSTRAINT `fk_proveedor_documentos_proveedor` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `permisos` (`nombre`, `descripcion`, `modulo`) VALUES
  ('proveedores.editar',     'Actualizar datos de proveedores',           'proveedores'),
  ('proveedores.dar_baja',   'Dar de baja y reactivar proveedores',       'proveedores'),
  ('proveedores.documentos', 'Adjuntar y eliminar documentos de soporte', 'proveedores')
ON DUPLICATE KEY UPDATE
  `descripcion` = VALUES(`descripcion`),
  `modulo` = VALUES(`modulo`);

INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id`
  FROM `roles` r
  JOIN `permisos` p ON p.`modulo` = 'proveedores'
 WHERE r.`nombre` = 'ADMINISTRADOR';
