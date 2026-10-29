-- HU-20 · consumo real de materiales por actividad.
-- 1. `consumos_materiales`: cantidad que el maestro de obra consumió de un material en una actividad, con el costo
--    unitario ponderado de lo despachado a esa actividad y el costo total (se refleja en el costo de la actividad y
--    del proyecto). La anulación pasa por solicitud del maestro y autorización de un administrador.
-- 2. Permisos: listar y crear (ADMINISTRADOR y MAESTRO_OBRA; GERENTE solo listar), ver_todos (ADMINISTRADOR y GERENTE;
--    el maestro ve los suyos) y autorizar_anulacion (solo ADMINISTRADOR).
-- Idempotente.
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_consumos_materiales.sql

CREATE TABLE IF NOT EXISTS `consumos_materiales` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `actividad_id` bigint NOT NULL,
  `material_id` bigint NOT NULL,
  `cantidad` decimal(12,2) NOT NULL,
  `costo_unitario` decimal(12,2) NOT NULL,
  `costo_total` decimal(15,2) NOT NULL,
  `fecha_consumo` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `registrado_por_usuario_id` bigint NOT NULL,
  `observaciones` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` enum('REGISTRADO','ANULACION_SOLICITADA','ANULADO') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'REGISTRADO',
  `anulacion_motivo` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `anulacion_solicitada_por_usuario_id` bigint DEFAULT NULL,
  `anulacion_solicitada_en` datetime DEFAULT NULL,
  `anulacion_resuelta_por_usuario_id` bigint DEFAULT NULL,
  `anulacion_resuelta_en` datetime DEFAULT NULL,
  `anulacion_observacion` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_consumo_actividad_material` (`actividad_id`, `material_id`, `estado`),
  KEY `fk_consumo_material` (`material_id`),
  KEY `fk_consumo_registra` (`registrado_por_usuario_id`),
  CONSTRAINT `fk_consumo_actividad` FOREIGN KEY (`actividad_id`) REFERENCES `actividades` (`id`),
  CONSTRAINT `fk_consumo_material` FOREIGN KEY (`material_id`) REFERENCES `materiales` (`id`),
  CONSTRAINT `fk_consumo_registra` FOREIGN KEY (`registrado_por_usuario_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `chk_consumo_cantidad` CHECK ((`cantidad` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `permisos` (`nombre`, `descripcion`, `modulo`) VALUES
  ('consumos_materiales.listar',             'Consultar los consumos de materiales y la consolidación de costos', 'consumos_materiales'),
  ('consumos_materiales.crear',              'Registrar consumos de materiales y solicitar su anulación',        'consumos_materiales'),
  ('consumos_materiales.ver_todos',          'Ver los consumos de todos los usuarios (no solo los propios)',     'consumos_materiales'),
  ('consumos_materiales.autorizar_anulacion','Autorizar o rechazar la anulación de un consumo registrado',       'consumos_materiales')
ON DUPLICATE KEY UPDATE `descripcion` = VALUES(`descripcion`), `modulo` = VALUES(`modulo`);

INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id` FROM `roles` r JOIN `permisos` p ON p.`modulo` = 'consumos_materiales'
 WHERE r.`nombre` = 'ADMINISTRADOR'
    OR (r.`nombre` = 'MAESTRO_OBRA' AND p.`nombre` IN ('consumos_materiales.listar', 'consumos_materiales.crear'))
    OR (r.`nombre` = 'GERENTE' AND p.`nombre` IN ('consumos_materiales.listar', 'consumos_materiales.ver_todos'));

SELECT (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'consumos_materiales') AS tabla_creada,
       (SELECT COUNT(*) FROM `permisos` WHERE `modulo` = 'consumos_materiales') AS permisos_consumos;
