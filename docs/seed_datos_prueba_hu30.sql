-- Ya aplicado en producción (run 38974292281). Vive en docs/ y no en docs/migraciones/
-- porque la CI carga todas las migraciones y estas asignaciones chocan con las pruebas de API.
-- Uso manual: mysql -u root sincoco < docs/seed_datos_prueba_hu30.sql
-- DATOS DE PRUEBA (HU-30 / HU-11): proyectos, plan de trabajo, asignaciones,
-- solicitudes y préstamos de herramientas. NO es una migración de esquema.
--
-- Se aplica con el workflow «Migrar base de datos» como el resto de pendientes.
-- Es idempotente (claves por código) y se adapta a lo que ya existe: toma como
-- maestro de obra al trabajador con usuario MAESTRO_OBRA, y como segundo
-- trabajador al primero activo que no sea ese. Si no hay datos base, no inserta.
--
-- Qué permite verificar:
--   SEED-P01: el maestro es el RESPONSABLE            -> ve el proyecto.
--   SEED-P02: el maestro solo está ASIGNADO           -> ve el proyecto.
--   SEED-P03: el maestro no tiene relación            -> NO debe verlo.

SET @maestro_t = COALESCE(
  (SELECT u.trabajador_id FROM usuarios u JOIN roles r ON r.id = u.rol_id
    WHERE r.nombre = 'MAESTRO_OBRA' AND u.trabajador_id IS NOT NULL ORDER BY u.id LIMIT 1),
  (SELECT MIN(id) FROM trabajadores WHERE activo = 1));
SET @otro_t = (SELECT MIN(id) FROM trabajadores WHERE activo = 1 AND id <> @maestro_t);
SET @admin_u = COALESCE(
  (SELECT u.id FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE r.nombre = 'ADMINISTRADOR' ORDER BY u.id LIMIT 1),
  (SELECT MIN(id) FROM usuarios));
SET @maestro_u = (SELECT MIN(id) FROM usuarios WHERE trabajador_id = @maestro_t);
SET @bodega_u = COALESCE(
  (SELECT u.id FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE r.nombre = 'ENCARGADO_BODEGA' ORDER BY u.id LIMIT 1),
  @admin_u);

INSERT INTO `clientes` (`numero_documento`, `tipo_documento`, `razon_social_nombre`, `nombre_contacto`, `telefono`, `email`)
VALUES ('900555777-3', 'NIT', 'Inversiones Nororiente S.A.S.', 'Oficina de proyectos', '3105550123', 'proyectos@nororiente.test')
ON DUPLICATE KEY UPDATE `razon_social_nombre` = VALUES(`razon_social_nombre`);
SET @cliente = (SELECT id FROM clientes WHERE numero_documento = '900555777-3');

INSERT INTO `proyectos`
  (`codigo`, `cliente_id`, `nombre`, `descripcion`, `ubicacion`, `fecha_inicio_programada`, `fecha_fin_programada`,
   `fecha_inicio_original`, `fecha_fin_original`, `responsable_id`, `creado_por_usuario_id`, `presupuesto_inicial`, `estado`)
SELECT 'SEED-P01', @cliente, 'Edificio Residencial Los Álamos', 'Torre de 8 pisos con 32 apartamentos', 'Cúcuta, Norte de Santander', '2026-09-01', '2027-03-31', '2026-09-01', '2027-03-31',
       @maestro_t, @admin_u, 850000000.00, 'EN_EJECUCION'
 WHERE @cliente IS NOT NULL AND @maestro_t IS NOT NULL AND @admin_u IS NOT NULL
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);

INSERT INTO `etapas_proyecto`
  (`proyecto_id`, `nombre`, `orden`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT p.`id`, 'Cimentación', 1, '2026-09-01', '2026-10-31', '2026-09-01', '2026-10-31' FROM `proyectos` p
 WHERE p.`codigo` = 'SEED-P01'
   AND NOT EXISTS (SELECT 1 FROM `etapas_proyecto` e WHERE e.`proyecto_id` = p.`id` AND e.`nombre` = 'Cimentación');

INSERT INTO `actividades`
  (`etapa_id`, `responsable_id`, `nombre`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT e.`id`, @maestro_t, 'Excavación y replanteo', '2026-09-01', '2026-09-15', '2026-09-01', '2026-09-15' FROM `etapas_proyecto` e
  JOIN `proyectos` p ON p.`id` = e.`proyecto_id`
 WHERE p.`codigo` = 'SEED-P01' AND e.`nombre` = 'Cimentación'
   AND NOT EXISTS (SELECT 1 FROM `actividades` a WHERE a.`etapa_id` = e.`id` AND a.`nombre` = 'Excavación y replanteo');

INSERT INTO `actividades`
  (`etapa_id`, `responsable_id`, `nombre`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT e.`id`, @maestro_t, 'Armado de acero de zapatas', '2026-09-16', '2026-09-30', '2026-09-16', '2026-09-30' FROM `etapas_proyecto` e
  JOIN `proyectos` p ON p.`id` = e.`proyecto_id`
 WHERE p.`codigo` = 'SEED-P01' AND e.`nombre` = 'Cimentación'
   AND NOT EXISTS (SELECT 1 FROM `actividades` a WHERE a.`etapa_id` = e.`id` AND a.`nombre` = 'Armado de acero de zapatas');

INSERT INTO `actividades`
  (`etapa_id`, `responsable_id`, `nombre`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT e.`id`, @maestro_t, 'Vaciado de zapatas', '2026-10-01', '2026-10-15', '2026-10-01', '2026-10-15' FROM `etapas_proyecto` e
  JOIN `proyectos` p ON p.`id` = e.`proyecto_id`
 WHERE p.`codigo` = 'SEED-P01' AND e.`nombre` = 'Cimentación'
   AND NOT EXISTS (SELECT 1 FROM `actividades` a WHERE a.`etapa_id` = e.`id` AND a.`nombre` = 'Vaciado de zapatas');

INSERT INTO `actividades`
  (`etapa_id`, `responsable_id`, `nombre`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT e.`id`, @maestro_t, 'Vigas de cimentación', '2026-10-16', '2026-10-31', '2026-10-16', '2026-10-31' FROM `etapas_proyecto` e
  JOIN `proyectos` p ON p.`id` = e.`proyecto_id`
 WHERE p.`codigo` = 'SEED-P01' AND e.`nombre` = 'Cimentación'
   AND NOT EXISTS (SELECT 1 FROM `actividades` a WHERE a.`etapa_id` = e.`id` AND a.`nombre` = 'Vigas de cimentación');

INSERT INTO `etapas_proyecto`
  (`proyecto_id`, `nombre`, `orden`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT p.`id`, 'Estructura', 2, '2026-11-01', '2027-01-31', '2026-11-01', '2027-01-31' FROM `proyectos` p
 WHERE p.`codigo` = 'SEED-P01'
   AND NOT EXISTS (SELECT 1 FROM `etapas_proyecto` e WHERE e.`proyecto_id` = p.`id` AND e.`nombre` = 'Estructura');

INSERT INTO `actividades`
  (`etapa_id`, `responsable_id`, `nombre`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT e.`id`, @maestro_t, 'Columnas pisos 1-4', '2026-11-01', '2026-11-30', '2026-11-01', '2026-11-30' FROM `etapas_proyecto` e
  JOIN `proyectos` p ON p.`id` = e.`proyecto_id`
 WHERE p.`codigo` = 'SEED-P01' AND e.`nombre` = 'Estructura'
   AND NOT EXISTS (SELECT 1 FROM `actividades` a WHERE a.`etapa_id` = e.`id` AND a.`nombre` = 'Columnas pisos 1-4');

INSERT INTO `actividades`
  (`etapa_id`, `responsable_id`, `nombre`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT e.`id`, @maestro_t, 'Losas pisos 1-4', '2026-12-01', '2026-12-30', '2026-12-01', '2026-12-30' FROM `etapas_proyecto` e
  JOIN `proyectos` p ON p.`id` = e.`proyecto_id`
 WHERE p.`codigo` = 'SEED-P01' AND e.`nombre` = 'Estructura'
   AND NOT EXISTS (SELECT 1 FROM `actividades` a WHERE a.`etapa_id` = e.`id` AND a.`nombre` = 'Losas pisos 1-4');

INSERT INTO `actividades`
  (`etapa_id`, `responsable_id`, `nombre`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT e.`id`, @maestro_t, 'Columnas y losas pisos 5-8', '2026-12-31', '2027-01-31', '2026-12-31', '2027-01-31' FROM `etapas_proyecto` e
  JOIN `proyectos` p ON p.`id` = e.`proyecto_id`
 WHERE p.`codigo` = 'SEED-P01' AND e.`nombre` = 'Estructura'
   AND NOT EXISTS (SELECT 1 FROM `actividades` a WHERE a.`etapa_id` = e.`id` AND a.`nombre` = 'Columnas y losas pisos 5-8');

INSERT INTO `etapas_proyecto`
  (`proyecto_id`, `nombre`, `orden`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT p.`id`, 'Acabados', 3, '2027-02-01', '2027-03-31', '2027-02-01', '2027-03-31' FROM `proyectos` p
 WHERE p.`codigo` = 'SEED-P01'
   AND NOT EXISTS (SELECT 1 FROM `etapas_proyecto` e WHERE e.`proyecto_id` = p.`id` AND e.`nombre` = 'Acabados');

INSERT INTO `actividades`
  (`etapa_id`, `responsable_id`, `nombre`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT e.`id`, @maestro_t, 'Mampostería y pañetes', '2027-02-01', '2027-02-19', '2027-02-01', '2027-02-19' FROM `etapas_proyecto` e
  JOIN `proyectos` p ON p.`id` = e.`proyecto_id`
 WHERE p.`codigo` = 'SEED-P01' AND e.`nombre` = 'Acabados'
   AND NOT EXISTS (SELECT 1 FROM `actividades` a WHERE a.`etapa_id` = e.`id` AND a.`nombre` = 'Mampostería y pañetes');

INSERT INTO `actividades`
  (`etapa_id`, `responsable_id`, `nombre`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT e.`id`, @maestro_t, 'Instalaciones hidrosanitarias', '2027-02-20', '2027-03-10', '2027-02-20', '2027-03-10' FROM `etapas_proyecto` e
  JOIN `proyectos` p ON p.`id` = e.`proyecto_id`
 WHERE p.`codigo` = 'SEED-P01' AND e.`nombre` = 'Acabados'
   AND NOT EXISTS (SELECT 1 FROM `actividades` a WHERE a.`etapa_id` = e.`id` AND a.`nombre` = 'Instalaciones hidrosanitarias');

INSERT INTO `actividades`
  (`etapa_id`, `responsable_id`, `nombre`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT e.`id`, @maestro_t, 'Pintura y carpintería', '2027-03-11', '2027-03-31', '2027-03-11', '2027-03-31' FROM `etapas_proyecto` e
  JOIN `proyectos` p ON p.`id` = e.`proyecto_id`
 WHERE p.`codigo` = 'SEED-P01' AND e.`nombre` = 'Acabados'
   AND NOT EXISTS (SELECT 1 FROM `actividades` a WHERE a.`etapa_id` = e.`id` AND a.`nombre` = 'Pintura y carpintería');

INSERT INTO `proyectos`
  (`codigo`, `cliente_id`, `nombre`, `descripcion`, `ubicacion`, `fecha_inicio_programada`, `fecha_fin_programada`,
   `fecha_inicio_original`, `fecha_fin_original`, `responsable_id`, `creado_por_usuario_id`, `presupuesto_inicial`, `estado`)
SELECT 'SEED-P02', @cliente, 'Centro Comercial Plaza Norte', 'Centro comercial de dos niveles con parqueadero', 'Pamplona, Norte de Santander', '2026-10-01', '2027-06-30', '2026-10-01', '2027-06-30',
       @otro_t, @admin_u, 850000000.00, 'EN_EJECUCION'
 WHERE @cliente IS NOT NULL AND @otro_t IS NOT NULL AND @admin_u IS NOT NULL
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);

INSERT INTO `etapas_proyecto`
  (`proyecto_id`, `nombre`, `orden`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT p.`id`, 'Movimiento de tierras', 1, '2026-10-01', '2026-11-30', '2026-10-01', '2026-11-30' FROM `proyectos` p
 WHERE p.`codigo` = 'SEED-P02'
   AND NOT EXISTS (SELECT 1 FROM `etapas_proyecto` e WHERE e.`proyecto_id` = p.`id` AND e.`nombre` = 'Movimiento de tierras');

INSERT INTO `actividades`
  (`etapa_id`, `responsable_id`, `nombre`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT e.`id`, @otro_t, 'Descapote y nivelación', '2026-10-01', '2026-10-15', '2026-10-01', '2026-10-15' FROM `etapas_proyecto` e
  JOIN `proyectos` p ON p.`id` = e.`proyecto_id`
 WHERE p.`codigo` = 'SEED-P02' AND e.`nombre` = 'Movimiento de tierras'
   AND NOT EXISTS (SELECT 1 FROM `actividades` a WHERE a.`etapa_id` = e.`id` AND a.`nombre` = 'Descapote y nivelación');

INSERT INTO `actividades`
  (`etapa_id`, `responsable_id`, `nombre`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT e.`id`, @otro_t, 'Excavación masiva', '2026-10-16', '2026-10-30', '2026-10-16', '2026-10-30' FROM `etapas_proyecto` e
  JOIN `proyectos` p ON p.`id` = e.`proyecto_id`
 WHERE p.`codigo` = 'SEED-P02' AND e.`nombre` = 'Movimiento de tierras'
   AND NOT EXISTS (SELECT 1 FROM `actividades` a WHERE a.`etapa_id` = e.`id` AND a.`nombre` = 'Excavación masiva');

INSERT INTO `actividades`
  (`etapa_id`, `responsable_id`, `nombre`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT e.`id`, @otro_t, 'Rellenos compactados', '2026-10-31', '2026-11-14', '2026-10-31', '2026-11-14' FROM `etapas_proyecto` e
  JOIN `proyectos` p ON p.`id` = e.`proyecto_id`
 WHERE p.`codigo` = 'SEED-P02' AND e.`nombre` = 'Movimiento de tierras'
   AND NOT EXISTS (SELECT 1 FROM `actividades` a WHERE a.`etapa_id` = e.`id` AND a.`nombre` = 'Rellenos compactados');

INSERT INTO `actividades`
  (`etapa_id`, `responsable_id`, `nombre`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT e.`id`, @otro_t, 'Drenajes perimetrales', '2026-11-15', '2026-11-30', '2026-11-15', '2026-11-30' FROM `etapas_proyecto` e
  JOIN `proyectos` p ON p.`id` = e.`proyecto_id`
 WHERE p.`codigo` = 'SEED-P02' AND e.`nombre` = 'Movimiento de tierras'
   AND NOT EXISTS (SELECT 1 FROM `actividades` a WHERE a.`etapa_id` = e.`id` AND a.`nombre` = 'Drenajes perimetrales');

INSERT INTO `etapas_proyecto`
  (`proyecto_id`, `nombre`, `orden`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT p.`id`, 'Obra gris', 2, '2026-12-01', '2027-03-31', '2026-12-01', '2027-03-31' FROM `proyectos` p
 WHERE p.`codigo` = 'SEED-P02'
   AND NOT EXISTS (SELECT 1 FROM `etapas_proyecto` e WHERE e.`proyecto_id` = p.`id` AND e.`nombre` = 'Obra gris');

INSERT INTO `actividades`
  (`etapa_id`, `responsable_id`, `nombre`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT e.`id`, @otro_t, 'Estructura metálica', '2026-12-01', '2027-01-09', '2026-12-01', '2027-01-09' FROM `etapas_proyecto` e
  JOIN `proyectos` p ON p.`id` = e.`proyecto_id`
 WHERE p.`codigo` = 'SEED-P02' AND e.`nombre` = 'Obra gris'
   AND NOT EXISTS (SELECT 1 FROM `actividades` a WHERE a.`etapa_id` = e.`id` AND a.`nombre` = 'Estructura metálica');

INSERT INTO `actividades`
  (`etapa_id`, `responsable_id`, `nombre`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT e.`id`, @otro_t, 'Placas de entrepiso', '2027-01-10', '2027-02-18', '2027-01-10', '2027-02-18' FROM `etapas_proyecto` e
  JOIN `proyectos` p ON p.`id` = e.`proyecto_id`
 WHERE p.`codigo` = 'SEED-P02' AND e.`nombre` = 'Obra gris'
   AND NOT EXISTS (SELECT 1 FROM `actividades` a WHERE a.`etapa_id` = e.`id` AND a.`nombre` = 'Placas de entrepiso');

INSERT INTO `actividades`
  (`etapa_id`, `responsable_id`, `nombre`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT e.`id`, @otro_t, 'Cubierta', '2027-02-19', '2027-03-31', '2027-02-19', '2027-03-31' FROM `etapas_proyecto` e
  JOIN `proyectos` p ON p.`id` = e.`proyecto_id`
 WHERE p.`codigo` = 'SEED-P02' AND e.`nombre` = 'Obra gris'
   AND NOT EXISTS (SELECT 1 FROM `actividades` a WHERE a.`etapa_id` = e.`id` AND a.`nombre` = 'Cubierta');

INSERT INTO `etapas_proyecto`
  (`proyecto_id`, `nombre`, `orden`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT p.`id`, 'Obra blanca', 3, '2027-04-01', '2027-06-30', '2027-04-01', '2027-06-30' FROM `proyectos` p
 WHERE p.`codigo` = 'SEED-P02'
   AND NOT EXISTS (SELECT 1 FROM `etapas_proyecto` e WHERE e.`proyecto_id` = p.`id` AND e.`nombre` = 'Obra blanca');

INSERT INTO `actividades`
  (`etapa_id`, `responsable_id`, `nombre`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT e.`id`, @otro_t, 'Fachada y vidrios', '2027-04-01', '2027-04-30', '2027-04-01', '2027-04-30' FROM `etapas_proyecto` e
  JOIN `proyectos` p ON p.`id` = e.`proyecto_id`
 WHERE p.`codigo` = 'SEED-P02' AND e.`nombre` = 'Obra blanca'
   AND NOT EXISTS (SELECT 1 FROM `actividades` a WHERE a.`etapa_id` = e.`id` AND a.`nombre` = 'Fachada y vidrios');

INSERT INTO `actividades`
  (`etapa_id`, `responsable_id`, `nombre`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT e.`id`, @otro_t, 'Instalaciones eléctricas', '2027-05-01', '2027-05-30', '2027-05-01', '2027-05-30' FROM `etapas_proyecto` e
  JOIN `proyectos` p ON p.`id` = e.`proyecto_id`
 WHERE p.`codigo` = 'SEED-P02' AND e.`nombre` = 'Obra blanca'
   AND NOT EXISTS (SELECT 1 FROM `actividades` a WHERE a.`etapa_id` = e.`id` AND a.`nombre` = 'Instalaciones eléctricas');

INSERT INTO `actividades`
  (`etapa_id`, `responsable_id`, `nombre`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT e.`id`, @otro_t, 'Señalización y entrega', '2027-05-31', '2027-06-30', '2027-05-31', '2027-06-30' FROM `etapas_proyecto` e
  JOIN `proyectos` p ON p.`id` = e.`proyecto_id`
 WHERE p.`codigo` = 'SEED-P02' AND e.`nombre` = 'Obra blanca'
   AND NOT EXISTS (SELECT 1 FROM `actividades` a WHERE a.`etapa_id` = e.`id` AND a.`nombre` = 'Señalización y entrega');

INSERT INTO `proyectos`
  (`codigo`, `cliente_id`, `nombre`, `descripcion`, `ubicacion`, `fecha_inicio_programada`, `fecha_fin_programada`,
   `fecha_inicio_original`, `fecha_fin_original`, `responsable_id`, `creado_por_usuario_id`, `presupuesto_inicial`, `estado`)
SELECT 'SEED-P03', @cliente, 'Puente Vehicular Río Seco', 'Puente de 60 metros sobre el río Seco', 'Ocaña, Norte de Santander', '2026-11-01', '2027-08-31', '2026-11-01', '2027-08-31',
       @otro_t, @admin_u, 850000000.00, 'PLANIFICACION'
 WHERE @cliente IS NOT NULL AND @otro_t IS NOT NULL AND @admin_u IS NOT NULL
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);

INSERT INTO `etapas_proyecto`
  (`proyecto_id`, `nombre`, `orden`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT p.`id`, 'Estudios y diseño', 1, '2026-11-01', '2026-12-31', '2026-11-01', '2026-12-31' FROM `proyectos` p
 WHERE p.`codigo` = 'SEED-P03'
   AND NOT EXISTS (SELECT 1 FROM `etapas_proyecto` e WHERE e.`proyecto_id` = p.`id` AND e.`nombre` = 'Estudios y diseño');

INSERT INTO `actividades`
  (`etapa_id`, `responsable_id`, `nombre`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT e.`id`, @otro_t, 'Topografía', '2026-11-01', '2026-11-15', '2026-11-01', '2026-11-15' FROM `etapas_proyecto` e
  JOIN `proyectos` p ON p.`id` = e.`proyecto_id`
 WHERE p.`codigo` = 'SEED-P03' AND e.`nombre` = 'Estudios y diseño'
   AND NOT EXISTS (SELECT 1 FROM `actividades` a WHERE a.`etapa_id` = e.`id` AND a.`nombre` = 'Topografía');

INSERT INTO `actividades`
  (`etapa_id`, `responsable_id`, `nombre`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT e.`id`, @otro_t, 'Estudio de suelos', '2026-11-16', '2026-11-30', '2026-11-16', '2026-11-30' FROM `etapas_proyecto` e
  JOIN `proyectos` p ON p.`id` = e.`proyecto_id`
 WHERE p.`codigo` = 'SEED-P03' AND e.`nombre` = 'Estudios y diseño'
   AND NOT EXISTS (SELECT 1 FROM `actividades` a WHERE a.`etapa_id` = e.`id` AND a.`nombre` = 'Estudio de suelos');

INSERT INTO `actividades`
  (`etapa_id`, `responsable_id`, `nombre`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT e.`id`, @otro_t, 'Diseño estructural', '2026-12-01', '2026-12-15', '2026-12-01', '2026-12-15' FROM `etapas_proyecto` e
  JOIN `proyectos` p ON p.`id` = e.`proyecto_id`
 WHERE p.`codigo` = 'SEED-P03' AND e.`nombre` = 'Estudios y diseño'
   AND NOT EXISTS (SELECT 1 FROM `actividades` a WHERE a.`etapa_id` = e.`id` AND a.`nombre` = 'Diseño estructural');

INSERT INTO `actividades`
  (`etapa_id`, `responsable_id`, `nombre`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT e.`id`, @otro_t, 'Licencias y permisos', '2026-12-16', '2026-12-31', '2026-12-16', '2026-12-31' FROM `etapas_proyecto` e
  JOIN `proyectos` p ON p.`id` = e.`proyecto_id`
 WHERE p.`codigo` = 'SEED-P03' AND e.`nombre` = 'Estudios y diseño'
   AND NOT EXISTS (SELECT 1 FROM `actividades` a WHERE a.`etapa_id` = e.`id` AND a.`nombre` = 'Licencias y permisos');

INSERT INTO `etapas_proyecto`
  (`proyecto_id`, `nombre`, `orden`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT p.`id`, 'Subestructura', 2, '2027-01-01', '2027-05-31', '2027-01-01', '2027-05-31' FROM `proyectos` p
 WHERE p.`codigo` = 'SEED-P03'
   AND NOT EXISTS (SELECT 1 FROM `etapas_proyecto` e WHERE e.`proyecto_id` = p.`id` AND e.`nombre` = 'Subestructura');

INSERT INTO `actividades`
  (`etapa_id`, `responsable_id`, `nombre`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT e.`id`, @otro_t, 'Pilotes', '2027-01-01', '2027-02-19', '2027-01-01', '2027-02-19' FROM `etapas_proyecto` e
  JOIN `proyectos` p ON p.`id` = e.`proyecto_id`
 WHERE p.`codigo` = 'SEED-P03' AND e.`nombre` = 'Subestructura'
   AND NOT EXISTS (SELECT 1 FROM `actividades` a WHERE a.`etapa_id` = e.`id` AND a.`nombre` = 'Pilotes');

INSERT INTO `actividades`
  (`etapa_id`, `responsable_id`, `nombre`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT e.`id`, @otro_t, 'Estribos', '2027-02-20', '2027-04-10', '2027-02-20', '2027-04-10' FROM `etapas_proyecto` e
  JOIN `proyectos` p ON p.`id` = e.`proyecto_id`
 WHERE p.`codigo` = 'SEED-P03' AND e.`nombre` = 'Subestructura'
   AND NOT EXISTS (SELECT 1 FROM `actividades` a WHERE a.`etapa_id` = e.`id` AND a.`nombre` = 'Estribos');

INSERT INTO `actividades`
  (`etapa_id`, `responsable_id`, `nombre`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT e.`id`, @otro_t, 'Pilas centrales', '2027-04-11', '2027-05-31', '2027-04-11', '2027-05-31' FROM `etapas_proyecto` e
  JOIN `proyectos` p ON p.`id` = e.`proyecto_id`
 WHERE p.`codigo` = 'SEED-P03' AND e.`nombre` = 'Subestructura'
   AND NOT EXISTS (SELECT 1 FROM `actividades` a WHERE a.`etapa_id` = e.`id` AND a.`nombre` = 'Pilas centrales');

INSERT INTO `etapas_proyecto`
  (`proyecto_id`, `nombre`, `orden`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT p.`id`, 'Superestructura', 3, '2027-06-01', '2027-08-31', '2027-06-01', '2027-08-31' FROM `proyectos` p
 WHERE p.`codigo` = 'SEED-P03'
   AND NOT EXISTS (SELECT 1 FROM `etapas_proyecto` e WHERE e.`proyecto_id` = p.`id` AND e.`nombre` = 'Superestructura');

INSERT INTO `actividades`
  (`etapa_id`, `responsable_id`, `nombre`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT e.`id`, @otro_t, 'Vigas prefabricadas', '2027-06-01', '2027-06-30', '2027-06-01', '2027-06-30' FROM `etapas_proyecto` e
  JOIN `proyectos` p ON p.`id` = e.`proyecto_id`
 WHERE p.`codigo` = 'SEED-P03' AND e.`nombre` = 'Superestructura'
   AND NOT EXISTS (SELECT 1 FROM `actividades` a WHERE a.`etapa_id` = e.`id` AND a.`nombre` = 'Vigas prefabricadas');

INSERT INTO `actividades`
  (`etapa_id`, `responsable_id`, `nombre`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT e.`id`, @otro_t, 'Tablero y barandas', '2027-07-01', '2027-07-30', '2027-07-01', '2027-07-30' FROM `etapas_proyecto` e
  JOIN `proyectos` p ON p.`id` = e.`proyecto_id`
 WHERE p.`codigo` = 'SEED-P03' AND e.`nombre` = 'Superestructura'
   AND NOT EXISTS (SELECT 1 FROM `actividades` a WHERE a.`etapa_id` = e.`id` AND a.`nombre` = 'Tablero y barandas');

INSERT INTO `actividades`
  (`etapa_id`, `responsable_id`, `nombre`, `fecha_inicio_programada`, `fecha_fin_programada`, `fecha_inicio_original`, `fecha_fin_original`)
SELECT e.`id`, @otro_t, 'Pruebas de carga', '2027-07-31', '2027-08-31', '2027-07-31', '2027-08-31' FROM `etapas_proyecto` e
  JOIN `proyectos` p ON p.`id` = e.`proyecto_id`
 WHERE p.`codigo` = 'SEED-P03' AND e.`nombre` = 'Superestructura'
   AND NOT EXISTS (SELECT 1 FROM `actividades` a WHERE a.`etapa_id` = e.`id` AND a.`nombre` = 'Pruebas de carga');

-- Asignaciones: el maestro solo entra a P02 por asignación; el segundo trabajador a P01.
INSERT INTO `asignaciones_personal` (`trabajador_id`, `proyecto_id`, `fecha_inicio`, `fecha_fin_programada`, `rol_en_proyecto`, `estado`)
SELECT x.t, p.`id`, p.`fecha_inicio_programada`, p.`fecha_fin_programada`, x.rol, 'ACTIVO'
  FROM (SELECT @maestro_t AS t, 'SEED-P02' AS cod, 'Maestro de obra' AS rol
        UNION ALL SELECT @otro_t, 'SEED-P01', 'Oficial de obra') x
  JOIN `proyectos` p ON p.`codigo` = x.cod
 WHERE x.t IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM `asignaciones_personal` a
                    WHERE a.`trabajador_id` = x.t AND a.`proyecto_id` = p.`id` AND a.`actividad_id` IS NULL);

-- Herramientas extra para los préstamos (las HR-0001..0003 de HU-10 quedan libres para solicitar).
INSERT INTO `herramientas` (`codigo_serial`, `nombre`, `marca`, `modelo`, `almacen_id`, `estado_operativo`, `disponibilidad`)
SELECT x.serial, x.nombre, x.marca, x.modelo, a.`id`, x.estado, 'PRESTADA'
  FROM (SELECT 'HR-0101' AS serial, 'Rotomartillo' AS nombre, 'Hilti' AS marca, 'TE 30' AS modelo, 'BUENO' AS estado
        UNION ALL SELECT 'HR-0102', 'Compactador de placa', 'Wacker', 'VP1550', 'REGULAR') x
  JOIN `almacenes` a ON a.`codigo` = 'ALM-CENTRAL'
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);

-- Solicitudes del maestro de obra, en cada estado.
INSERT INTO `solicitudes_herramientas`
  (`codigo`, `herramienta_id`, `proyecto_id`, `solicitado_por_usuario_id`, `para_trabajador_id`,
   `fecha_requerida`, `fecha_estimada_devolucion`, `estado`, `observaciones`)
SELECT x.codigo, h.`id`, p.`id`, @maestro_u, @otro_t, x.requerida, x.devolucion, x.estado, x.obs
  FROM (
    SELECT 'SH-S0001' AS codigo, 'HR-0001' AS serial, 'SEED-P01' AS proy, '2026-10-30' AS requerida, '2026-11-13' AS devolucion,
           'PENDIENTE' AS estado, NULL AS obs
    UNION ALL SELECT 'SH-S0002', 'HR-0002', 'SEED-P01', '2026-10-22', '2026-11-05', 'APROBADA', NULL
    UNION ALL SELECT 'SH-S0003', 'HR-0003', 'SEED-P02', '2026-10-20', '2026-10-27', 'RECHAZADA',
           'Rechazada: el trabajador tiene devoluciones pendientes de préstamos anteriores'
    UNION ALL SELECT 'SH-S0004', 'HR-0101', 'SEED-P01', '2026-10-12', '2026-10-26', 'ENTREGADA', NULL
  ) x
  JOIN `herramientas` h ON h.`codigo_serial` = x.serial
  JOIN `proyectos` p ON p.`codigo` = x.proy
 WHERE @maestro_u IS NOT NULL AND @otro_t IS NOT NULL
ON DUPLICATE KEY UPDATE `solicitudes_herramientas`.`observaciones` = `solicitudes_herramientas`.`observaciones`;

-- Préstamos: uno activo (nace de la solicitud entregada) y uno atrasado sin solicitud.
INSERT INTO `prestamos_herramientas`
  (`solicitud_id`, `herramienta_id`, `trabajador_id`, `proyecto_id`, `entregado_por_usuario_id`,
   `fecha_prestamo`, `fecha_estimada_devolucion`, `estado_entrega`, `estado_prestamo`)
SELECT s.`id`, s.`herramienta_id`, s.`para_trabajador_id`, s.`proyecto_id`, @bodega_u,
       '2026-10-12 08:00:00', s.`fecha_estimada_devolucion`, 'BUENO', 'ACTIVO'
  FROM `solicitudes_herramientas` s
 WHERE s.`codigo` = 'SH-S0004' AND @bodega_u IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM `prestamos_herramientas` x WHERE x.`solicitud_id` = s.`id`);

INSERT INTO `prestamos_herramientas`
  (`solicitud_id`, `herramienta_id`, `trabajador_id`, `proyecto_id`, `entregado_por_usuario_id`,
   `fecha_prestamo`, `fecha_estimada_devolucion`, `estado_entrega`, `estado_prestamo`)
SELECT NULL, h.`id`, @otro_t, p.`id`, @bodega_u, '2026-09-20 09:00:00', '2026-10-05', 'REGULAR', 'ATRASADO'
  FROM `herramientas` h JOIN `proyectos` p ON p.`codigo` = 'SEED-P01'
 WHERE h.`codigo_serial` = 'HR-0102' AND @bodega_u IS NOT NULL AND @otro_t IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM `prestamos_herramientas` x WHERE x.`herramienta_id` = h.`id` AND x.`estado_prestamo` <> 'DEVUELTO');

SELECT 'proyectos SEED' AS dato, COUNT(*) AS filas FROM `proyectos` WHERE `codigo` LIKE 'SEED-%'
UNION ALL SELECT 'etapas SEED', COUNT(*) FROM `etapas_proyecto` e JOIN `proyectos` p ON p.`id` = e.`proyecto_id` WHERE p.`codigo` LIKE 'SEED-%'
UNION ALL SELECT 'actividades SEED', COUNT(*) FROM `actividades` a JOIN `etapas_proyecto` e ON e.`id` = a.`etapa_id` JOIN `proyectos` p ON p.`id` = e.`proyecto_id` WHERE p.`codigo` LIKE 'SEED-%'
UNION ALL SELECT 'solicitudes SEED', COUNT(*) FROM `solicitudes_herramientas` WHERE `codigo` LIKE 'SH-S%'
UNION ALL SELECT 'prestamos', COUNT(*) FROM `prestamos_herramientas`;
