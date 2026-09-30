-- Usuarios de prueba: uno por actor DEL SISTEMA (docs/ACTORES_DEL_NEGOCIO.md).
-- El trabajador operativo NO inicia sesión: es actor del negocio, no del sistema.
-- Se conserva su ficha en `trabajadores` porque las entregas y devoluciones de
-- herramientas lo referencian (entregado_a_trabajador_id), pero sin usuario ni rol.
-- Password de todos: "Prueba123!" (bcrypt hash de ejemplo, reemplazar por el hash real del backend)
--
-- Las especialidades llevan tildes ('Albañilería'): conexión en utf8mb4 para
-- que el archivo se lea igual en Windows y en Linux.
SET NAMES utf8mb4;

-- Orden de carga: docs/seed_catalogos_prueba.sql -> este archivo ->
-- docs/seed_permisos_prueba.sql -> docs/seed_proyectos_prueba.sql

INSERT INTO roles (nombre, descripcion) VALUES
  ('ADMINISTRADOR', 'Gestión de accesos, proyectos, personal y proveedores'),
  ('GERENTE', 'Monitoreo ejecutivo y reportes'),
  ('MAESTRO_OBRA', 'Ejecución de actividades y avance en obra'),
  ('ENCARGADO_BODEGA', 'Inventario de materiales y herramientas')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

-- El cargo y la especialidad ya no son texto libre: se toman de los catálogos
-- (docs/seed_catalogos_prueba.sql, que debe cargarse ANTES que este archivo).
INSERT INTO trabajadores (numero_documento, tipo_documento, nombres, apellidos, email, cargo_id, especialidad_id)
SELECT v.documento, 'CC', v.nombres, v.apellidos, v.email, c.id, e.id
FROM (
                   SELECT '1000000001' AS documento, 'Admin' AS nombres, 'Prueba' AS apellidos, 'admin@sincoco.test' AS email, 'Administrador' AS cargo, NULL AS especialidad
  UNION ALL SELECT '1000000002', 'Gerente', 'Prueba', 'gerente@sincoco.test', 'Gerente', NULL
  UNION ALL SELECT '1000000003', 'Maestro', 'Prueba', 'maestro@sincoco.test', 'Maestro de obra', 'Estructuras'
  UNION ALL SELECT '1000000004', 'Bodega', 'Prueba', 'bodega@sincoco.test', 'Encargado de bodega', NULL
  UNION ALL SELECT '1000000005', 'Trabajador', 'Prueba', 'trabajador@sincoco.test', 'Operario', 'Albañilería'
) AS v
JOIN cargos c ON c.nombre = v.cargo
LEFT JOIN especialidades e ON e.nombre = v.especialidad
ON DUPLICATE KEY UPDATE
  nombres = VALUES(nombres),
  cargo_id = VALUES(cargo_id),
  especialidad_id = VALUES(especialidad_id);

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
