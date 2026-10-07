-- HU-17 (AYD-29) · criterio 2: el registro de auditoría es de solo lectura e
-- inmutable. El backend ya no expone rutas de escritura sobre la bitácora; estos
-- disparadores lo garantizan también en la base: una fila de
-- `bitacora_trazabilidad` no se puede modificar ni borrar, ni siquiera con
-- acceso directo a MySQL. Solo se pueden agregar filas nuevas.
--
-- Nota: la acción referencial `ON DELETE SET NULL` de `usuario_id` no activa
-- disparadores en InnoDB; los usuarios nunca se borran (baja lógica, HU-18).
--
-- Idempotente: se puede relanzar.
--   mysql -u root -p sincoco < docs/migracion_bitacora_inmutable.sql

DROP TRIGGER IF EXISTS `trg_bitacora_no_update`;
DROP TRIGGER IF EXISTS `trg_bitacora_no_delete`;

DELIMITER $$
CREATE TRIGGER `trg_bitacora_no_update` BEFORE UPDATE ON `bitacora_trazabilidad`
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La bitácora de trazabilidad es inmutable: no se puede modificar';
END$$

CREATE TRIGGER `trg_bitacora_no_delete` BEFORE DELETE ON `bitacora_trazabilidad`
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La bitácora de trazabilidad es inmutable: no se puede borrar';
END$$
DELIMITER ;
