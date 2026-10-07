-- Personal: «Inactivo» y «Dado de baja» pasan a ser lo mismo (HU-04 · HU-18).
--
-- Antes el estado INACTIVO se elegía a mano en la tabla de Personal y no daba
-- de baja: el trabajador seguía listado y podía asignarse. Ahora retirar a una
-- persona es solo «Dar de baja» (activo = 0, con fecha y usuario), que deja el
-- estado en INACTIVO; los estados que se eligen a mano son Activo, Vacaciones
-- y Licencia. Esta migración alinea los datos existentes:
--
--   1. Quien estaba en INACTIVO pero activo = 1 queda dado de baja.
--   2. Quien estaba dado de baja con otro estado queda en INACTIVO.
--
-- Las cuentas de acceso no se tocan aquí: eso se revisa en Usuarios. Es
-- idempotente: en una base ya alineada no cambia ninguna fila.
--
-- Uso:
--   mysql -u root -p sincoco < docs/migraciones/aplicadas/migracion_personal_baja.sql

UPDATE `trabajadores`
   SET `activo` = 0,
       `fecha_baja` = COALESCE(`fecha_baja`, NOW()),
       `disponible` = 0
 WHERE `estado` = 'INACTIVO' AND `activo` = 1;

UPDATE `trabajadores`
   SET `estado` = 'INACTIVO',
       `disponible` = 0
 WHERE `activo` = 0 AND (`estado` IS NULL OR `estado` <> 'INACTIVO');

SELECT 'trabajadores' tabla, COUNT(*) filas FROM `trabajadores`
UNION ALL SELECT 'trabajadores dados de baja', COUNT(*) FROM `trabajadores` WHERE `activo` = 0;
