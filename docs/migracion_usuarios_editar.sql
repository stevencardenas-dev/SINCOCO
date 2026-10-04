-- Editar usuarios (HU-01): añade el permiso `usuarios.editar`.
--
-- La pantalla Usuarios ahora permite editar el nombre de usuario y el correo de
-- una cuenta; la ruta PATCH /api/usuarios/:id exige este permiso. Es idempotente.
--
-- Uso:
--   mysql -u root -p sincoco < docs/migracion_usuarios_editar.sql

INSERT INTO `permisos` (`nombre`, `descripcion`, `modulo`)
VALUES ('usuarios.editar',
        'Editar el usuario y el correo de una cuenta',
        'usuarios')
ON DUPLICATE KEY UPDATE
  `descripcion` = VALUES(`descripcion`),
  `modulo` = VALUES(`modulo`);

-- Solo el administrador edita cuentas.
INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.`id`, p.`id`
  FROM `roles` r
  JOIN `permisos` p ON p.`nombre` = 'usuarios.editar'
 WHERE r.`nombre` = 'ADMINISTRADOR';

SELECT 'permisos' tabla, COUNT(*) filas FROM `permisos`
UNION ALL SELECT 'roles_permisos', COUNT(*) FROM `roles_permisos`;
