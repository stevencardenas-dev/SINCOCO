-- HU-08 · datos de prueba para validar la alerta por exceso de presupuesto (CU-08 Alt 1).
-- Presupuesta 5 unidades del material id 1 (TUNGSTENO) en «Armado de acero de zapatas» del
-- proyecto SEED-P01. Si el material, la actividad o el proyecto no existen, no inserta nada.
-- El nombre hace que se aplique después de migracion_solicitudes_materiales_presupuesto.sql,
-- que crea la tabla (el despliegue las corre en orden alfabético). Idempotente.
--   mysql -u root -p sincoco < docs/migraciones/pendientes/migracion_solicitudes_materiales_presupuesto_prueba.sql

INSERT INTO `presupuesto_materiales_actividad` (`actividad_id`, `material_id`, `cantidad_presupuestada`)
SELECT a.`id`, m.`id`, 5.00
  FROM `actividades` a
  JOIN `etapas_proyecto` e ON e.`id` = a.`etapa_id`
  JOIN `proyectos` p ON p.`id` = e.`proyecto_id` AND p.`codigo` = 'SEED-P01'
  JOIN `materiales` m ON m.`id` = 1
 WHERE a.`nombre` = 'Armado de acero de zapatas'
ON DUPLICATE KEY UPDATE `cantidad_presupuestada` = VALUES(`cantidad_presupuestada`);

SELECT COUNT(*) AS lineas_presupuesto FROM `presupuesto_materiales_actividad`;
