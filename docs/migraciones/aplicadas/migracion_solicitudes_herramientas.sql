-- HU-30 (AYD-42) · solicitud de herramientas.
-- La tabla `solicitudes_herramientas` ya existe en docs/schema.sql, pero no
-- tenía fecha de devolución esperada: se agrega `fecha_estimada_devolucion`.
-- Además se crean los permisos y se asignan a los roles:
--   * crear:    MAESTRO_OBRA y ADMINISTRADOR (solicitan para sus trabajadores).
--   * resolver: ENCARGADO_BODEGA y ADMINISTRADOR (aprueban, rechazan, atienden).
--   * listar:   los tres (quien no resuelve solo ve sus propias solicitudes).
-- Estados: PENDIENTE -> APROBADA | RECHAZADA | CANCELADA; APROBADA -> ENTREGADA
-- («atendida») | CANCELADA. Idempotente.
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_solicitudes_herramientas.sql

DROP PROCEDURE IF EXISTS `sincoco_migrar_solicitudes_herramientas`;
DELIMITER //
CREATE PROCEDURE `sincoco_migrar_solicitudes_herramientas`()
BEGIN
  DECLARE v_existe INT DEFAULT 0;
  SELECT COUNT(*) INTO v_existe FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitudes_herramientas'
     AND COLUMN_NAME = 'fecha_estimada_devolucion';
  IF v_existe = 0 THEN
    ALTER TABLE `solicitudes_herramientas`
      ADD COLUMN `fecha_estimada_devolucion` date DEFAULT NULL AFTER `fecha_requerida`;
  END IF;
END //
DELIMITER ;
CALL `sincoco_migrar_solicitudes_herramientas`();
DROP PROCEDURE `sincoco_migrar_solicitudes_herramientas`;

INSERT INTO `permisos` (`nombre`, `descripcion`, `modulo`) VALUES
  ('solicitudes_herramientas.listar',   'Consultar solicitudes de herramientas',                 'solicitudes_herramientas'),
  ('solicitudes_herramientas.crear',    'Solicitar herramientas para los trabajadores',          'solicitudes_herramientas'),
  ('solicitudes_herramientas.resolver', 'Aprobar, rechazar y atender solicitudes de herramientas', 'solicitudes_herramientas')
ON DUPLICATE KEY UPDATE `descripcion` = VALUES(`descripcion`), `modulo` = VALUES(`modulo`);

INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id` FROM `roles` r JOIN `permisos` p ON p.`modulo` = 'solicitudes_herramientas'
 WHERE r.`nombre` = 'ADMINISTRADOR'
    OR (r.`nombre` = 'MAESTRO_OBRA' AND p.`nombre` IN ('solicitudes_herramientas.listar', 'solicitudes_herramientas.crear'))
    OR (r.`nombre` = 'ENCARGADO_BODEGA' AND p.`nombre` IN ('solicitudes_herramientas.listar', 'solicitudes_herramientas.resolver'));

SELECT COUNT(*) AS permisos_solicitudes FROM `permisos` WHERE `modulo` = 'solicitudes_herramientas';
