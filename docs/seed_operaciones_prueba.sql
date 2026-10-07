-- Datos de prueba FICTICIOS para las tablas operativas: almacenes, proveedores,
-- materiales, herramientas, un proyecto con etapas, actividades y asignaciones.
-- No contiene datos reales de ninguna base de producción.
--
-- Orden de carga: docs/seed_catalogos_prueba.sql -> docs/seed_usuarios_prueba.sql
--   -> docs/seed_permisos_prueba.sql -> docs/seed_proyectos_prueba.sql -> este archivo.
-- Re-ejecutable: las claves únicas evitan duplicados y las etapas/actividades se
-- insertan solo si no existen.
--
-- El existencia_total de los materiales queda en 0: lo mantienen los triggers de
-- entradas y salidas, así que no se siembra stock directamente.
SET NAMES utf8mb4;

-- Almacén central (sin proyecto) y almacén de obra (ligado al proyecto de prueba).
INSERT INTO almacenes (codigo, nombre, ubicacion, proyecto_id, es_central) VALUES
  ('ALM-CEN', 'Bodega central de prueba', 'Sede administrativa (ficticia)', NULL, 1)
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

INSERT INTO almacenes (codigo, nombre, ubicacion, proyecto_id, es_central)
SELECT 'ALM-OBR-01', 'Almacén de obra PRJ-PRUEBA-01', 'Obra de prueba (ficticia)', p.id, 0
FROM proyectos p
WHERE p.codigo = 'PRJ-PRUEBA-01'
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- Proveedores ficticios.
INSERT INTO proveedores (documento_identificacion, razon_social, nombre_contacto, telefono, email, direccion) VALUES
  ('800000001-1', 'Materiales Ficticios S.A.S.', 'Contacto de prueba A', '555-0201', 'ventas@materiales-ficticios.test', 'Calle falsa 123'),
  ('800000002-2', 'Ferretería de Prueba Ltda.', 'Contacto de prueba B', '555-0202', 'compras@ferreteria-prueba.test', 'Avenida ficticia 456')
ON DUPLICATE KEY UPDATE razon_social = VALUES(razon_social);

-- Categorías de materiales.
INSERT INTO categorias_materiales (nombre, descripcion) VALUES
  ('Cemento y agregados', 'Cemento, arena, grava (datos de prueba)'),
  ('Acero de refuerzo', 'Varillas y mallas (datos de prueba)'),
  ('Acabados', 'Pinturas, pisos y revestimientos (datos de prueba)')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

-- Materiales de prueba (stock inicial 0; ver nota en la cabecera).
INSERT INTO materiales (codigo, categoria_id, descripcion, unidad_medida, costo_referencia, nivel_minimo)
SELECT v.codigo, c.id, v.descripcion, v.unidad, v.costo, v.minimo
FROM (
                   SELECT 'MAT-001' AS codigo, 'Cemento y agregados' AS categoria, 'Cemento gris 50 kg (ficticio)' AS descripcion, 'BOLSA' AS unidad, 25000.00 AS costo, 20.00 AS minimo
  UNION ALL SELECT 'MAT-002', 'Cemento y agregados', 'Arena lavada (ficticio)', 'M3', 90000.00, 5.00
  UNION ALL SELECT 'MAT-003', 'Acero de refuerzo', 'Varilla corrugada 3/8" x 6 m (ficticio)', 'UNIDAD', 32000.00, 50.00
  UNION ALL SELECT 'MAT-004', 'Acabados', 'Pintura vinilo blanca 1 galón (ficticio)', 'GALON', 48000.00, 10.00
) AS v
JOIN categorias_materiales c ON c.nombre = v.categoria
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion), costo_referencia = VALUES(costo_referencia);

-- Herramientas de prueba en la bodega central.
INSERT INTO herramientas (codigo_serial, nombre, marca, modelo, almacen_id, estado_operativo, disponibilidad)
SELECT v.serial, v.nombre, v.marca, v.modelo, a.id, v.estado, 'DISPONIBLE'
FROM (
                   SELECT 'HER-PRU-001' AS serial, 'Taladro percutor (ficticio)' AS nombre, 'MarcaPrueba' AS marca, 'TP-100' AS modelo, 'BUENO' AS estado
  UNION ALL SELECT 'HER-PRU-002', 'Nivel de burbuja 60 cm (ficticio)', 'MarcaPrueba', 'NB-60', 'EXCELENTE'
  UNION ALL SELECT 'HER-PRU-003', 'Pulidora angular 4 1/2" (ficticia)', 'MarcaPrueba', 'PA-45', 'REGULAR'
) AS v
JOIN almacenes a ON a.codigo = 'ALM-CEN'
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), estado_operativo = VALUES(estado_operativo);

-- Proyecto de prueba. Usa el cliente de seed_proyectos_prueba.sql, el gerente como
-- creador y el maestro de obra como responsable.
INSERT INTO proyectos (codigo, cliente_id, nombre, descripcion, ubicacion,
                       fecha_inicio_programada, fecha_fin_programada,
                       responsable_id, creado_por_usuario_id, presupuesto_inicial, estado)
SELECT 'PRJ-PRUEBA-01', cl.id, 'Edificio de prueba (ficticio)',
       'Proyecto ficticio para pruebas de flujo completo.', 'Ciudad de prueba',
       '2026-01-15', '2026-12-15',
       t.id, u.id, 500000000.00, 'EN_EJECUCION'
FROM clientes cl
JOIN trabajadores t ON t.numero_documento = '1000000003'
JOIN usuarios u ON u.username = 'admin'
WHERE cl.numero_documento = '900123456-1'
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), estado = VALUES(estado);

-- Etapas del proyecto de prueba (sin clave única: se insertan solo si faltan).
INSERT INTO etapas_proyecto (proyecto_id, nombre, descripcion, orden, fecha_inicio_programada, fecha_fin_programada, estado)
SELECT p.id, v.nombre, v.descripcion, v.orden, v.inicio, v.fin, v.estado
FROM proyectos p
JOIN (
                   SELECT 1 AS orden, 'Cimentación' AS nombre, 'Excavación y zapatas (ficticio)' AS descripcion, '2026-01-15' AS inicio, '2026-03-15' AS fin, 'COMPLETADA' AS estado
  UNION ALL SELECT 2, 'Estructura', 'Columnas, vigas y losas (ficticio)', '2026-03-16', '2026-07-15', 'EN_PROCESO'
  UNION ALL SELECT 3, 'Acabados', 'Pintura y pisos (ficticio)', '2026-07-16', '2026-12-15', 'PENDIENTE'
) AS v
WHERE p.codigo = 'PRJ-PRUEBA-01'
  AND NOT EXISTS (
    SELECT 1 FROM etapas_proyecto e WHERE e.proyecto_id = p.id AND e.orden = v.orden
  );

-- Actividades de la etapa "Estructura" (sin clave única: se insertan solo si faltan).
INSERT INTO actividades (etapa_id, responsable_id, nombre, descripcion, fecha_inicio_programada, fecha_fin_programada, porcentaje_avance, estado)
SELECT e.id, t.id, v.nombre, v.descripcion, v.inicio, v.fin, v.avance, v.estado
FROM etapas_proyecto e
JOIN proyectos p ON p.id = e.proyecto_id AND p.codigo = 'PRJ-PRUEBA-01'
JOIN trabajadores t ON t.numero_documento = '1000000003'
JOIN (
                   SELECT 'Armado de columnas' AS nombre, 'Armado de acero en columnas (ficticio)' AS descripcion, '2026-03-16' AS inicio, '2026-04-30' AS fin, 100.00 AS avance, 'COMPLETADA' AS estado
  UNION ALL SELECT 'Vaciado de losa', 'Vaciado de concreto de losa (ficticio)', '2026-05-01', '2026-06-15', 40.00, 'EN_PROCESO'
) AS v
WHERE e.orden = 2
  AND NOT EXISTS (
    SELECT 1 FROM actividades a WHERE a.etapa_id = e.id AND a.nombre = v.nombre
  );

-- Asignación del maestro de obra y de un trabajador operativo al proyecto de prueba.
INSERT INTO asignaciones_personal (trabajador_id, proyecto_id, actividad_id, fecha_inicio, rol_en_proyecto, estado)
SELECT t.id, p.id, NULL, '2026-01-15', 'Maestro de obra', 'ACTIVO'
FROM trabajadores t
JOIN proyectos p ON p.codigo = 'PRJ-PRUEBA-01'
WHERE t.numero_documento = '1000000003'
  AND NOT EXISTS (
    SELECT 1 FROM asignaciones_personal ap WHERE ap.trabajador_id = t.id AND ap.proyecto_id = p.id
  );

INSERT INTO asignaciones_personal (trabajador_id, proyecto_id, actividad_id, fecha_inicio, rol_en_proyecto, estado)
SELECT t.id, p.id, a.id, '2026-03-16', 'Operario de estructura', 'ACTIVO'
FROM trabajadores t
JOIN proyectos p ON p.codigo = 'PRJ-PRUEBA-01'
JOIN actividades a ON a.nombre = 'Armado de columnas'
WHERE t.numero_documento = '1000000005'
  AND NOT EXISTS (
    SELECT 1 FROM asignaciones_personal ap WHERE ap.trabajador_id = t.id AND ap.proyecto_id = p.id AND ap.actividad_id = a.id
  );
