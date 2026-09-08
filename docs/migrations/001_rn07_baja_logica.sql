-- =============================================================================
-- Migración 001 — RN07: no eliminación física / RF32: consulta histórica
-- =============================================================================
-- Aplica sobre una base `scopi` ya creada con el esquema anterior, sin perder
-- datos. Equivale a lo que `schema.sql` ya trae para instalaciones nuevas.
--
-- Cambios:
--   1. Baja lógica (`activo`, `fecha_baja`, `baja_por_usuario_id`) en las 9
--      tablas que conservan historial.
--   2. FK hacia entidades históricas: ON DELETE CASCADE -> ON DELETE RESTRICT,
--      para que el motor impida destruir el historial de un proyecto.
--   3. `devoluciones_materiales.salida_origen_id` (RN13): la devolución debe
--      referirse a una salida previa.
--
-- Se conservan a propósito los CASCADE de composición (roles_permisos,
-- detalles_*→cabecera, evidencias_avance→seguimiento): el hijo no tiene
-- significado sin el padre y forman un solo registro lógico.
--
-- Reversión: ver 001_rn07_baja_logica_rollback.sql
-- =============================================================================

USE scopi;

START TRANSACTION;

-- 1. Baja lógica -------------------------------------------------------------
ALTER TABLE `trabajadores`
    ADD COLUMN `activo` TINYINT(1) NOT NULL DEFAULT 1,
    ADD COLUMN `fecha_baja` DATETIME DEFAULT NULL,
    ADD COLUMN `baja_por_usuario_id` BIGINT DEFAULT NULL;

ALTER TABLE `usuarios`
    ADD COLUMN `activo` TINYINT(1) NOT NULL DEFAULT 1,
    ADD COLUMN `fecha_baja` DATETIME DEFAULT NULL,
    ADD COLUMN `baja_por_usuario_id` BIGINT DEFAULT NULL;

ALTER TABLE `proveedores`
    ADD COLUMN `activo` TINYINT(1) NOT NULL DEFAULT 1,
    ADD COLUMN `fecha_baja` DATETIME DEFAULT NULL,
    ADD COLUMN `baja_por_usuario_id` BIGINT DEFAULT NULL;

ALTER TABLE `proyectos`
    ADD COLUMN `activo` TINYINT(1) NOT NULL DEFAULT 1,
    ADD COLUMN `fecha_baja` DATETIME DEFAULT NULL,
    ADD COLUMN `baja_por_usuario_id` BIGINT DEFAULT NULL;

ALTER TABLE `etapas_proyecto`
    ADD COLUMN `activo` TINYINT(1) NOT NULL DEFAULT 1,
    ADD COLUMN `fecha_baja` DATETIME DEFAULT NULL,
    ADD COLUMN `baja_por_usuario_id` BIGINT DEFAULT NULL;

ALTER TABLE `actividades`
    ADD COLUMN `activo` TINYINT(1) NOT NULL DEFAULT 1,
    ADD COLUMN `fecha_baja` DATETIME DEFAULT NULL,
    ADD COLUMN `baja_por_usuario_id` BIGINT DEFAULT NULL;

ALTER TABLE `materiales`
    ADD COLUMN `activo` TINYINT(1) NOT NULL DEFAULT 1,
    ADD COLUMN `fecha_baja` DATETIME DEFAULT NULL,
    ADD COLUMN `baja_por_usuario_id` BIGINT DEFAULT NULL;

ALTER TABLE `almacenes`
    ADD COLUMN `activo` TINYINT(1) NOT NULL DEFAULT 1,
    ADD COLUMN `fecha_baja` DATETIME DEFAULT NULL,
    ADD COLUMN `baja_por_usuario_id` BIGINT DEFAULT NULL;

ALTER TABLE `herramientas`
    ADD COLUMN `activo` TINYINT(1) NOT NULL DEFAULT 1,
    ADD COLUMN `fecha_baja` DATETIME DEFAULT NULL,
    ADD COLUMN `baja_por_usuario_id` BIGINT DEFAULT NULL;

-- 2. CASCADE -> RESTRICT en FK históricas ------------------------------------
ALTER TABLE `etapas_proyecto` DROP FOREIGN KEY `fk_etapa_proyecto`;
ALTER TABLE `etapas_proyecto` ADD CONSTRAINT `fk_etapa_proyecto` FOREIGN KEY (`proyecto_id`)
    REFERENCES `proyectos` (`id`) ON DELETE RESTRICT;

ALTER TABLE `actividades` DROP FOREIGN KEY `fk_actividad_etapa`;
ALTER TABLE `actividades` ADD CONSTRAINT `fk_actividad_etapa` FOREIGN KEY (`etapa_id`)
    REFERENCES `etapas_proyecto` (`id`) ON DELETE RESTRICT;

ALTER TABLE `asignaciones_personal` DROP FOREIGN KEY `fk_asig_proyecto`;
ALTER TABLE `asignaciones_personal` ADD CONSTRAINT `fk_asig_proyecto` FOREIGN KEY (`proyecto_id`)
    REFERENCES `proyectos` (`id`) ON DELETE RESTRICT;

ALTER TABLE `seguimiento_avance` DROP FOREIGN KEY `fk_seg_actividad`;
ALTER TABLE `seguimiento_avance` ADD CONSTRAINT `fk_seg_actividad` FOREIGN KEY (`actividad_id`)
    REFERENCES `actividades` (`id`) ON DELETE RESTRICT;

ALTER TABLE `incidencias` DROP FOREIGN KEY `fk_inc_proyecto`;
ALTER TABLE `incidencias` ADD CONSTRAINT `fk_inc_proyecto` FOREIGN KEY (`proyecto_id`)
    REFERENCES `proyectos` (`id`) ON DELETE RESTRICT;

ALTER TABLE `servicios_externos` DROP FOREIGN KEY `fk_serv_proyecto`;
ALTER TABLE `servicios_externos` ADD CONSTRAINT `fk_serv_proyecto` FOREIGN KEY (`proyecto_id`)
    REFERENCES `proyectos` (`id`) ON DELETE RESTRICT;

-- 3. RN13: devolución referida a una salida previa ----------------------------
ALTER TABLE `devoluciones_materiales`
    ADD COLUMN `salida_origen_id` BIGINT DEFAULT NULL,
    ADD CONSTRAINT `fk_dev_salida` FOREIGN KEY (`salida_origen_id`)
        REFERENCES `salidas_materiales` (`id`);

COMMIT;
