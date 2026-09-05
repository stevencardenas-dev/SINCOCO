-- Usuarios de prueba: uno por actor del negocio (docs/ACTORES DEL NEGOCIO.md)
-- Password de todos: "Prueba123!" (bcrypt hash de ejemplo, reemplazar por el hash real del backend)

INSERT INTO roles (nombre, descripcion) VALUES
  ('ADMINISTRADOR', 'Gestión de accesos, proyectos, personal y proveedores'),
  ('GERENTE', 'Monitoreo ejecutivo y reportes'),
  ('MAESTRO_OBRA', 'Ejecución de actividades y avance en obra'),
  ('ENCARGADO_BODEGA', 'Inventario de materiales y herramientas'),
  ('TRABAJADOR', 'Personal operativo asignado a proyectos')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

INSERT INTO trabajadores (numero_documento, tipo_documento, nombres, apellidos, email, cargo, especialidad)
VALUES
  ('1000000001', 'CC', 'Admin', 'Prueba', 'admin@scopi.test', 'Administrador', NULL),
  ('1000000002', 'CC', 'Gerente', 'Prueba', 'gerente@scopi.test', 'Gerente', NULL),
  ('1000000003', 'CC', 'Maestro', 'Prueba', 'maestro@scopi.test', 'Maestro de obra', 'Estructuras'),
  ('1000000004', 'CC', 'Bodega', 'Prueba', 'bodega@scopi.test', 'Encargado de bodega', NULL),
  ('1000000005', 'CC', 'Trabajador', 'Prueba', 'trabajador@scopi.test', 'Operario', 'Albañilería')
ON DUPLICATE KEY UPDATE nombres = VALUES(nombres);

INSERT INTO usuarios (trabajador_id, username, password_hash, email, rol_id)
SELECT t.id, u.username, '$2b$10$PLACEHOLDER_HASH_REEMPLAZAR', t.email, r.id
FROM (
  SELECT '1000000001' AS documento, 'admin' AS username, 'ADMINISTRADOR' AS rol_nombre
  UNION ALL SELECT '1000000002', 'gerente', 'GERENTE'
  UNION ALL SELECT '1000000003', 'maestro', 'MAESTRO_OBRA'
  UNION ALL SELECT '1000000004', 'bodega', 'ENCARGADO_BODEGA'
  UNION ALL SELECT '1000000005', 'trabajador', 'TRABAJADOR'
) AS u
JOIN trabajadores t ON t.numero_documento = u.documento
JOIN roles r ON r.nombre = u.rol_nombre
ON DUPLICATE KEY UPDATE username = VALUES(username);
