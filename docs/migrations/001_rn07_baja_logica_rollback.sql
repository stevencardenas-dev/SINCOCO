-- Reversión de la migración 001. Devuelve el esquema al estado anterior.
-- Nota: restaura los CASCADE, que es justamente lo que RN07 prohíbe; usar solo
-- si la migración 001 debe deshacerse.
USE scopi;
START TRANSACTION;

ALTER TABLE `devoluciones_materiales`
    DROP FOREIGN KEY `fk_dev_salida`,
    DROP COLUMN `salida_origen_id`;

ALTER TABLE `servicios_externos` DROP FOREIGN KEY `fk_serv_proyecto`;
ALTER TABLE `servicios_externos` ADD CONSTRAINT `fk_serv_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE;
ALTER TABLE `incidencias` DROP FOREIGN KEY `fk_inc_proyecto`;
ALTER TABLE `incidencias` ADD CONSTRAINT `fk_inc_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE;
ALTER TABLE `seguimiento_avance` DROP FOREIGN KEY `fk_seg_actividad`;
ALTER TABLE `seguimiento_avance` ADD CONSTRAINT `fk_seg_actividad` FOREIGN KEY (`actividad_id`) REFERENCES `actividades` (`id`) ON DELETE CASCADE;
ALTER TABLE `asignaciones_personal` DROP FOREIGN KEY `fk_asig_proyecto`;
ALTER TABLE `asignaciones_personal` ADD CONSTRAINT `fk_asig_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE;
ALTER TABLE `actividades` DROP FOREIGN KEY `fk_actividad_etapa`;
ALTER TABLE `actividades` ADD CONSTRAINT `fk_actividad_etapa` FOREIGN KEY (`etapa_id`) REFERENCES `etapas_proyecto` (`id`) ON DELETE CASCADE;
ALTER TABLE `etapas_proyecto` DROP FOREIGN KEY `fk_etapa_proyecto`;
ALTER TABLE `etapas_proyecto` ADD CONSTRAINT `fk_etapa_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE;

ALTER TABLE `herramientas`   DROP COLUMN `activo`, DROP COLUMN `fecha_baja`, DROP COLUMN `baja_por_usuario_id`;
ALTER TABLE `almacenes`      DROP COLUMN `activo`, DROP COLUMN `fecha_baja`, DROP COLUMN `baja_por_usuario_id`;
ALTER TABLE `materiales`     DROP COLUMN `activo`, DROP COLUMN `fecha_baja`, DROP COLUMN `baja_por_usuario_id`;
ALTER TABLE `actividades`    DROP COLUMN `activo`, DROP COLUMN `fecha_baja`, DROP COLUMN `baja_por_usuario_id`;
ALTER TABLE `etapas_proyecto` DROP COLUMN `activo`, DROP COLUMN `fecha_baja`, DROP COLUMN `baja_por_usuario_id`;
ALTER TABLE `proyectos`      DROP COLUMN `activo`, DROP COLUMN `fecha_baja`, DROP COLUMN `baja_por_usuario_id`;
ALTER TABLE `proveedores`    DROP COLUMN `activo`, DROP COLUMN `fecha_baja`, DROP COLUMN `baja_por_usuario_id`;
ALTER TABLE `usuarios`       DROP COLUMN `activo`, DROP COLUMN `fecha_baja`, DROP COLUMN `baja_por_usuario_id`;
ALTER TABLE `trabajadores`   DROP COLUMN `activo`, DROP COLUMN `fecha_baja`, DROP COLUMN `baja_por_usuario_id`;

COMMIT;
