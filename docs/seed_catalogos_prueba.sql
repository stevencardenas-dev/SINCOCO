-- Catálogos del personal: cargos de la empresa y especialidades (HU-04).
--
-- Antes `trabajadores.cargo` y `trabajadores.especialidad` eran texto libre:
-- el mismo cargo aparecía escrito de mil formas y el backend tenía la lista de
-- cargos "operativos" escrita en el código. Ahora son tablas de dominio y
-- `trabajadores` apunta a ellas por clave foránea (ver docs/schema.sql y
-- docs/migracion_catalogos.sql).
--
-- `operativo` decide la regla de HU-04 · criterio 2: para los cargos de obra la
-- especialidad es obligatoria. Como vive en la tabla, el administrador puede
-- cambiarla desde la interfaz sin tocar el código.
--
-- Uso:
--   mysql -u root -p sincoco < docs/seed_catalogos_prueba.sql
--
-- Es idempotente: se puede relanzar sin duplicar filas. La colación de la tabla
-- (utf8mb4_unicode_ci) no distingue mayúsculas ni tildes, así que 'Mamposteria'
-- y 'Mampostería' se consideran el mismo nombre.

-- Los catálogos llevan tildes ('Mampostería'): se fija la conexión en utf8mb4
-- para que el archivo se lea igual en Windows y en Linux.
SET NAMES utf8mb4;

INSERT INTO `cargos` (`nombre`, `descripcion`, `operativo`) VALUES
  -- Cargos de obra: exigen especialidad (criterio 2 de HU-04).
  ('Maestro de obra',          'Dirige la ejecución de la obra en el frente de trabajo', 1),
  ('Oficial',                  'Mano de obra calificada en un oficio', 1),
  ('Obrero',                   'Mano de obra de apoyo en obra', 1),
  ('Ayudante',                 'Apoyo a los oficios en el frente de obra', 1),
  ('Operario',                 'Opera equipos y herramientas de obra', 1),
  ('Técnico',                  'Soporte técnico de obra', 1),
  ('Técnico de obra',          'Soporte técnico especializado del frente de obra', 1),
  -- Cargos administrativos y de mando: la especialidad es opcional.
  ('Administrador',            'Administra el sistema y los accesos', 0),
  ('Gerente',                  'Monitorea la operación y aprueba el gasto', 0),
  ('Asistente administrativo', 'Apoyo administrativo y documental', 0),
  ('Almacenista',              'Controla el inventario del almacén', 0),
  ('Encargado de bodega',      'Recibe, despacha y custodia materiales y herramientas', 0),
  ('Ingeniero residente',      'Responsable técnico del proyecto ante el cliente', 0),
  ('Arquitecto',               'Diseño y supervisión arquitectónica', 0),
  ('Contador',                 'Contabilidad y costos de la constructora', 0),
  ('Asesor comercial',         'Gestión comercial con clientes', 0)
ON DUPLICATE KEY UPDATE
  `descripcion` = VALUES(`descripcion`),
  `operativo` = VALUES(`operativo`);

INSERT INTO `especialidades` (`nombre`, `descripcion`) VALUES
  ('Albañilería',        'Mampostería y pañetes con ladrillo o bloque'),
  ('Mampostería',        'Levante de muros y divisiones'),
  ('Estructuras',        'Concreto, acero de refuerzo y formaleta'),
  ('Acabados',           'Enchapes, pisos y cielos rasos'),
  ('Pintura',            'Pintura y estuco de superficies'),
  ('Electricidad',       'Instalaciones eléctricas y redes'),
  ('Plomería',           'Redes hidráulicas y sanitarias'),
  ('Soldadura',          'Estructuras metálicas y soldadura'),
  ('Carpintería',        'Madera, formaleta y mobiliario fijo'),
  ('Topografía',         'Localización, niveles y replanteo'),
  ('Maquinaria pesada',  'Operación de equipo pesado'),
  ('Seguridad industrial', 'SISO: seguridad y salud en el trabajo')
ON DUPLICATE KEY UPDATE
  `descripcion` = VALUES(`descripcion`);
