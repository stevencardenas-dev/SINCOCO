-- Usuarios de prueba: uno por actor DEL SISTEMA (docs/ACTORES_DEL_NEGOCIO.md).
-- El trabajador operativo NO inicia sesión: es actor del negocio, no del sistema.
-- Se conserva su ficha en `trabajadores` porque las entregas y devoluciones de
-- herramientas lo referencian (entregado_a_trabajador_id), pero sin usuario ni rol.
-- Password de todos: "Prueba123!" (bcrypt hash de ejemplo, reemplazar por el hash real del backend)

INSERT INTO roles (nombre, descripcion) VALUES
  ('ADMINISTRADOR', 'Gestión de accesos, proyectos, personal y proveedores'),
  ('GERENTE', 'Monitoreo ejecutivo y reportes'),
  ('MAESTRO_OBRA', 'Ejecución de actividades y avance en obra'),
  ('ENCARGADO_BODEGA', 'Inventario de materiales y herramientas')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

INSERT INTO trabajadores (numero_documento, tipo_documento, nombres, apellidos, email, cargo, especialidad)
VALUES
  ('1000000001', 'CC', 'Admin', 'Prueba', 'admin@sincoco.test', 'Administrador', NULL),
  ('1000000002', 'CC', 'Gerente', 'Prueba', 'gerente@sincoco.test', 'Gerente', NULL),
  ('1000000003', 'CC', 'Maestro', 'Prueba', 'maestro@sincoco.test', 'Maestro de obra', 'Estructuras'),
  ('1000000004', 'CC', 'Bodega', 'Prueba', 'bodega@sincoco.test', 'Encargado de bodega', NULL),
  ('1000000005', 'CC', 'Trabajador', 'Prueba', 'trabajador@sincoco.test', 'Operario', 'Albañilería')
ON DUPLICATE KEY UPDATE nombres = VALUES(nombres);

INSERT INTO usuarios (trabajador_id, username, password_hash, email, rol_id)
SELECT t.id, u.username, '$2b$10$PLACEHOLDER_HASH_REEMPLAZAR', t.email, r.id
FROM (
  SELECT '1000000001' AS documento, 'admin' AS username, 'ADMINISTRADOR' AS rol_nombre
  UNION ALL SELECT '1000000002', 'gerente', 'GERENTE'
  UNION ALL SELECT '1000000003', 'maestro', 'MAESTRO_OBRA'
  UNION ALL SELECT '1000000004', 'bodega', 'ENCARGADO_BODEGA'
) AS u
JOIN trabajadores t ON t.numero_documento = u.documento
JOIN roles r ON r.nombre = u.rol_nombre
ON DUPLICATE KEY UPDATE username = VALUES(username);
