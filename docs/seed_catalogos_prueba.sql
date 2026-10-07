-- Catálogos del personal: cargos de la empresa y especialidades (HU-04).
--
-- Antes `trabajadores.cargo` y `trabajadores.especialidad` eran texto libre:
-- el mismo cargo aparecía escrito de mil formas y el backend tenía la lista de
-- cargos "operativos" escrita en el código. Ahora son tablas de dominio y
-- `trabajadores` apunta a ellas por clave foránea (ver docs/schema.sql y
-- docs/migraciones/aplicadas/migracion_catalogos.sql).
--
-- `operativo` decide la regla de HU-04 · criterio 2: para los cargos de obra la
-- especialidad es obligatoria. Como vive en la tabla, el administrador puede
-- cambiarla desde la interfaz sin tocar el código.
--
-- Uso:
--   mysql -u root -p sincoco < docs/seed_catalogos_prueba.sql
--
-- Técnico, Almacenista, Ayudante y Oficial ya no son del catálogo base (eran
-- duplicados o se retiraron); en las bases existentes los da de baja
-- docs/migraciones/aplicadas/migracion_categorias_personal.sql.
--
-- Es idempotente: se puede relanzar sin duplicar filas. La colación de la tabla
-- (utf8mb4_unicode_ci) no distingue mayúsculas ni tildes, así que 'Mamposteria'
-- y 'Mampostería' se consideran el mismo nombre.

-- Los catálogos llevan tildes ('Mampostería'): se fija la conexión en utf8mb4
-- para que el archivo se lea igual en Windows y en Linux.
SET NAMES utf8mb4;

INSERT INTO `cargos` (`nombre`, `descripcion`, `categoria`, `operativo`) VALUES
  -- Cargos de obra: exigen especialidad (criterio 2 de HU-04).
  ('Maestro de obra',          'Dirige la ejecución de la obra en el frente de trabajo', 'Operativo / Obra', 1),
  ('Obrero',                   'Mano de obra de apoyo en obra', 'Operativo / Obra', 1),
  ('Operario',                 'Opera equipos y herramientas de obra', 'Operativo / Obra', 1),
  ('Técnico de obra',          'Soporte técnico especializado del frente de obra', 'Operativo / Obra', 1),
  -- Cargos directivos y administrativos: la especialidad es opcional.
  ('Gerente',                  'Dueño o gerente de la constructora: monitorea los proyectos y aprueba el gasto', 'Directivo / Técnico', 0),
  ('Ingeniero residente',      'Responsable técnico del proyecto ante el cliente', 'Directivo / Técnico', 0),
  ('Arquitecto',               'Diseño y supervisión arquitectónica', 'Directivo / Técnico', 0),
  ('Administrador',            'Administra los proyectos, el personal y los proveedores de la constructora', 'Administrativo', 0),
  ('Encargado de bodega',      'Recibe, despacha y custodia materiales y herramientas', 'Administrativo', 0),
  ('Asistente administrativo', 'Apoyo administrativo y documental', 'Administrativo', 0),
  ('Contador',                 'Contabilidad y costos de la constructora', 'Administrativo', 0),
  ('Asesor comercial',         'Gestión comercial con clientes', 'Administrativo', 0)
ON DUPLICATE KEY UPDATE
  `descripcion` = VALUES(`descripcion`),
  `categoria` = VALUES(`categoria`),
  `operativo` = VALUES(`operativo`);

-- Agrupadas por categoría de obra (la interfaz las muestra con <optgroup>).
-- «Sin especialidad» no es un valor: es dejar el campo vacío, para que un cargo
-- de obra no pueda «cumplir» la regla eligiéndolo.
INSERT INTO `especialidades` (`nombre`, `descripcion`, `categoria`) VALUES
  ('Albañilería',                'Pañetes, revoques y obra de ladrillo en general', 'Obra Negra y Gris (Estructura)'),
  ('Armado de Acero (Fierrero)', 'Corte, figurado y amarre del acero de refuerzo', 'Obra Negra y Gris (Estructura)'),
  ('Estructuras',                'Concreto, acero de refuerzo y formaleta', 'Obra Negra y Gris (Estructura)'),
  ('Mampostería',                'Levante de muros y divisiones', 'Obra Negra y Gris (Estructura)'),
  ('Climatización (HVAC)',       'Ventilación, aire acondicionado y extracción', 'Instalaciones (MEP)'),
  ('Electricidad',               'Instalaciones eléctricas y redes', 'Instalaciones (MEP)'),
  ('Plomería',                   'Redes hidráulicas y sanitarias', 'Instalaciones (MEP)'),
  ('Redes de Gas',               'Instalación y prueba de redes de gas', 'Instalaciones (MEP)'),
  ('Acabados',                   'Enchapes, pisos y cielos rasos', 'Acabados y Detalles'),
  ('Carpintería',                'Madera, formaleta y mobiliario fijo', 'Acabados y Detalles'),
  ('Cerrajería / Aluminio',      'Puertas, ventanas y divisiones metálicas o de aluminio', 'Acabados y Detalles'),
  ('Drywall / Yeso',             'Muros y cielos en drywall, yeso y masillas', 'Acabados y Detalles'),
  ('Pintura',                    'Pintura y estuco de superficies', 'Acabados y Detalles'),
  ('Impermeabilización',         'Cubiertas, tanques, terrazas y sótanos', 'Trabajos Especializados'),
  ('Soldadura',                  'Estructuras metálicas y soldadura', 'Trabajos Especializados'),
  ('Topografía',                 'Localización, niveles y replanteo', 'Trabajos Especializados'),
  ('Maquinaria pesada',          'Operación de equipo pesado', 'Seguridad y Logística'),
  ('Rigger / Señalero',          'Aparejamiento de cargas y señalización de izajes', 'Seguridad y Logística'),
  ('Seguridad industrial',       'SISO: seguridad y salud en el trabajo', 'Seguridad y Logística')
ON DUPLICATE KEY UPDATE
  `descripcion` = VALUES(`descripcion`),
  `categoria` = VALUES(`categoria`);
