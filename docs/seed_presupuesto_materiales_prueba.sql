-- Datos de prueba de HU-08: presupuesto de materiales por actividad.
-- Requiere docs/migraciones/pendientes/migracion_solicitudes_materiales_presupuesto.sql,
-- los materiales de docs/seed_operaciones_prueba.sql y el proyecto SEED-P01 (docs/seed_proyectos_prueba.sql).
-- Presupuesta cemento (MAT-001) y arena (MAT-002) en «Excavación y replanteo» y «Armado de acero de zapatas».
-- Idempotente.
--   mysql -u root -p sincoco < docs/seed_presupuesto_materiales_prueba.sql

INSERT INTO presupuesto_materiales_actividad (actividad_id, material_id, cantidad_presupuestada)
SELECT a.id, m.id, v.cantidad
FROM (
                   SELECT 'Excavación y replanteo' AS actividad, 'MAT-001' AS material, 10.00 AS cantidad
  UNION ALL SELECT 'Excavación y replanteo', 'MAT-002', 5.00
  UNION ALL SELECT 'Armado de acero de zapatas', 'MAT-001', 20.00
  UNION ALL SELECT 'Armado de acero de zapatas', 'MAT-003', 100.00
) AS v
JOIN proyectos p ON p.codigo = 'SEED-P01'
JOIN etapas_proyecto e ON e.proyecto_id = p.id
JOIN actividades a ON a.etapa_id = e.id AND a.nombre = v.actividad
JOIN materiales m ON m.codigo = v.material
ON DUPLICATE KEY UPDATE cantidad_presupuestada = VALUES(cantidad_presupuestada);

SELECT COUNT(*) AS lineas_presupuesto FROM presupuesto_materiales_actividad;
