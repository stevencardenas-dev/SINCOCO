-- HU-34 · criterio 1: fechas programadas originales del plan de trabajo.
--
-- Cuando una etapa, una actividad o el propio proyecto se reprograma, la
-- columna `fecha_*_programada` pasa a guardar la fecha VIGENTE (la que usan el
-- cronograma y las alertas de atraso, HU-24) y la fecha de la primera
-- programación se conserva en `fecha_*_original`.
--
--   · `fecha_*_original` es NULL mientras el elemento nunca se reprogramó.
--   · Se escribe una sola vez, en la primera reprogramación, y desde entonces
--     es inmutable: los disparadores la restauran ante cualquier UPDATE, incluso
--     con acceso directo a MySQL (mismo criterio que la bitácora, HU-17).
--
-- Es idempotente: se puede relanzar.
--   mysql -u root -p sincoco < docs/migracion_reprogramacion_plan.sql
--
-- Las bases nuevas ya la traen en docs/schema.sql (los disparadores no).

DROP PROCEDURE IF EXISTS `sincoco_migrar_reprogramacion_plan`;
DELIMITER //
CREATE PROCEDURE `sincoco_migrar_reprogramacion_plan`()
BEGIN
  DECLARE v_tabla VARCHAR(64);
  DECLARE v_fin INT DEFAULT 0;
  DECLARE v_existe INT DEFAULT 0;
  DECLARE cur CURSOR FOR
    SELECT 'etapas_proyecto' UNION ALL SELECT 'actividades' UNION ALL SELECT 'proyectos';
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_fin = 1;

  OPEN cur;
  bucle: LOOP
    FETCH cur INTO v_tabla;
    IF v_fin = 1 THEN LEAVE bucle; END IF;

    SELECT COUNT(*) INTO v_existe FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = v_tabla
       AND COLUMN_NAME = 'fecha_inicio_original';
    IF v_existe = 0 THEN
      SET @ddl = CONCAT('ALTER TABLE `', v_tabla,
        '` ADD COLUMN `fecha_inicio_original` date DEFAULT NULL AFTER `fecha_fin_programada`,',
        ' ADD COLUMN `fecha_fin_original` date DEFAULT NULL AFTER `fecha_inicio_original`');
      PREPARE stmt FROM @ddl;
      EXECUTE stmt;
      DEALLOCATE PREPARE stmt;
    END IF;
  END LOOP;
  CLOSE cur;
END//
DELIMITER ;

CALL `sincoco_migrar_reprogramacion_plan`();
DROP PROCEDURE `sincoco_migrar_reprogramacion_plan`;

-- Inmutabilidad: si el original ya estaba fijado, se restaura; si estaba vacío,
-- se admite el valor nuevo (primera reprogramación).
DROP TRIGGER IF EXISTS `trg_etapas_original_inmutable`;
DROP TRIGGER IF EXISTS `trg_actividades_original_inmutable`;
DROP TRIGGER IF EXISTS `trg_proyectos_original_inmutable`;

DELIMITER $$
CREATE TRIGGER `trg_etapas_original_inmutable` BEFORE UPDATE ON `etapas_proyecto`
FOR EACH ROW
BEGIN
  SET NEW.fecha_inicio_original = COALESCE(OLD.fecha_inicio_original, NEW.fecha_inicio_original);
  SET NEW.fecha_fin_original = COALESCE(OLD.fecha_fin_original, NEW.fecha_fin_original);
END$$

CREATE TRIGGER `trg_actividades_original_inmutable` BEFORE UPDATE ON `actividades`
FOR EACH ROW
BEGIN
  SET NEW.fecha_inicio_original = COALESCE(OLD.fecha_inicio_original, NEW.fecha_inicio_original);
  SET NEW.fecha_fin_original = COALESCE(OLD.fecha_fin_original, NEW.fecha_fin_original);
END$$

CREATE TRIGGER `trg_proyectos_original_inmutable` BEFORE UPDATE ON `proyectos`
FOR EACH ROW
BEGIN
  SET NEW.fecha_inicio_original = COALESCE(OLD.fecha_inicio_original, NEW.fecha_inicio_original);
  SET NEW.fecha_fin_original = COALESCE(OLD.fecha_fin_original, NEW.fecha_fin_original);
END$$
DELIMITER ;

-- HU-34 · criterio 2: historial de reprogramaciones.
-- Cada reprogramación deja una fila con el motivo (obligatorio), el usuario, la
-- fecha de registro y las fechas anteriores y nuevas. Una reprogramación de
-- etapa que arrastra a las siguientes (criterio 3) o al fin del proyecto
-- (criterio 4) registra una fila por cada elemento movido; `origen` dice cuál
-- fue el cambio pedido y cuáles las consecuencias.
--
-- El historial es de solo lectura: los disparadores impiden modificar o borrar
-- una fila. Borrar el proyecto sí lo limpia (ON DELETE CASCADE no activa
-- disparadores), así que los datos de prueba se pueden retirar con el proyecto.
CREATE TABLE IF NOT EXISTS `reprogramaciones_plan` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `proyecto_id` bigint NOT NULL,
  `entidad_tipo` enum('ETAPA','ACTIVIDAD','PROYECTO') COLLATE utf8mb4_unicode_ci NOT NULL,
  `entidad_id` bigint NOT NULL,
  `origen` enum('DIRECTA','CASCADA','FIN_PROYECTO') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DIRECTA',
  `motivo` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `usuario_id` bigint NOT NULL,
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_inicio_anterior` date DEFAULT NULL,
  `fecha_fin_anterior` date DEFAULT NULL,
  `fecha_inicio_nueva` date DEFAULT NULL,
  `fecha_fin_nueva` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_reprogramaciones_entidad` (`entidad_tipo`,`entidad_id`),
  KEY `fk_reprogramacion_proyecto` (`proyecto_id`),
  KEY `fk_reprogramacion_usuario` (`usuario_id`),
  CONSTRAINT `fk_reprogramacion_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reprogramacion_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TRIGGER IF EXISTS `trg_reprogramaciones_no_update`;
DROP TRIGGER IF EXISTS `trg_reprogramaciones_no_delete`;

DELIMITER $$
CREATE TRIGGER `trg_reprogramaciones_no_update` BEFORE UPDATE ON `reprogramaciones_plan`
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El historial de reprogramaciones es inmutable: no se puede modificar';
END$$

CREATE TRIGGER `trg_reprogramaciones_no_delete` BEFORE DELETE ON `reprogramaciones_plan`
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El historial de reprogramaciones es inmutable: no se puede borrar';
END$$
DELIMITER ;

-- Permisos: solo el administrador reprograma (HU-34).
INSERT INTO `permisos` (`nombre`, `descripcion`, `modulo`)
VALUES ('etapas.reprogramar', 'Reprogramar las fechas de una etapa y de las posteriores', 'planificacion'),
       ('actividades.reprogramar', 'Reprogramar las fechas de una actividad', 'planificacion')
ON DUPLICATE KEY UPDATE
  `descripcion` = VALUES(`descripcion`),
  `modulo` = VALUES(`modulo`);

INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id`
  FROM `roles` r JOIN `permisos` p
 WHERE r.`nombre` = 'ADMINISTRADOR'
   AND p.`nombre` IN ('etapas.reprogramar', 'actividades.reprogramar');

SELECT 'etapas_proyecto' tabla, COUNT(*) filas FROM `etapas_proyecto`
UNION ALL SELECT 'actividades', COUNT(*) FROM `actividades`
UNION ALL SELECT 'proyectos', COUNT(*) FROM `proyectos`
UNION ALL SELECT 'reprogramaciones_plan', COUNT(*) FROM `reprogramaciones_plan`;
