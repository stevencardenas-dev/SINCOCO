-- HU-15 · consolidación del costo real de un proyecto.
-- Guarda cada consolidación (materiales despachados + servicios externos +
-- órdenes de compra) con el presupuesto vigente y la desviación resultante, de
-- modo que el dashboard y los reportes lean el último corte sin recalcular.
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_consolidacion_costos.sql

CREATE TABLE IF NOT EXISTS `consolidaciones_costo` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `proyecto_id` bigint NOT NULL,
  `costo_materiales` decimal(15,2) NOT NULL DEFAULT '0.00',
  `costo_servicios` decimal(15,2) NOT NULL DEFAULT '0.00',
  `costo_ordenes_compra` decimal(15,2) NOT NULL DEFAULT '0.00',
  `costo_real` decimal(15,2) NOT NULL DEFAULT '0.00',
  `presupuesto_inicial` decimal(15,2) NOT NULL DEFAULT '0.00',
  `desviacion_porcentaje` decimal(7,2) DEFAULT NULL,
  `consolidado_por_usuario_id` bigint DEFAULT NULL,
  `consolidado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_consolidacion_proyecto` (`proyecto_id`, `consolidado_en`),
  KEY `fk_consolidacion_usuario` (`consolidado_por_usuario_id`),
  CONSTRAINT `fk_consolidacion_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_consolidacion_usuario` FOREIGN KEY (`consolidado_por_usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
