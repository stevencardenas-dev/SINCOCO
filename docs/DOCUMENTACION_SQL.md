# MÓDULO 1: PERSONAL, USUARIOS Y SEGURIDAD

# Tabla: roles

Almacena los distintos roles que pueden asignarse a los usuarios del sistema (ej. Administrador, Gerente, Encargado de Bodega, Maestro de Obra) para garantizar la asignación y restricción de funciones.

# Tabla: permisos

Registra los permisos o privilegios individuales del sistema agrupados por módulos operativos.

# Tabla: roles_permisos

Tabla intermedia que vincula los roles con sus respectivos permisos para permitir un control de acceso granular según el rol asignado.

# Tabla: trabajadores

Almacena el expediente del personal (operativos, maestros de obra, técnicos), incluyendo tipo/número de documento, nombres, contacto, cargo, especialidad y estado de contratación.

# Tabla: usuarios

Gestiona las credenciales de acceso (usuario, contraseña encriptada, correo), asociándolas a un trabajador registrado y asignándoles un rol operativo y un estado de cuenta (activo, inactivo, bloqueado).

# Tabla: proveedores

Guarda el directorio comercial de empresas y contratistas externos que suministran materiales o ejecutan servicios, registrando razón social, identificación fiscal y datos de contacto.

# MÓDULO 2: GESTIÓN DE PROYECTOS, ESTRUCTURA Y AVANCES

# Tabla: proyectos

Es la ficha principal de los proyectos de vivienda. Registra el código único, nombre, ubicación, fechas planificadas/reales, cliente, presupuesto de referencia, porcentaje de avance consolidado y estado operativo.

# Tabla: etapas_proyecto

Define las fases o hitos principales que componen el plan de trabajo de cada proyecto (ej. Cimentación, Estructura, Acabados) y su secuencia.

# Tabla: actividades

Desglosa las tareas específicas contenidas en cada etapa, definiendo sus fechas programadas/reales, el trabajador o maestro responsable, su estado y porcentaje de avance.

# Tabla: asignaciones_personal

Mantiene la trazabilidad e historial de la asignación de trabajadores a un proyecto o actividad específica, definiendo periodos de inicio/fin y roles en la obra.

# Tabla: seguimiento_avance

Registra cada actualización o reporte periódico de avance de una actividad, guardando la fecha, el usuario que realiza el reporte, y los porcentajes de avance anterior y nuevo.

# Tabla: evidencias_avance

Guarda la referencia y ruta de los archivos adjuntos (fotografías, documentos u observaciones) subidos como respaldo documental del avance de una actividad.

# Tabla: incidencias

Registra novedades u contratiempos ocurridos en la obra (averías, accidentes, retrasos), clasificando su nivel de severidad y dando seguimiento a su proceso de resolución.

# MÓDULO 3: INVENTARIO DE MATERIALES, HERRAMIENTAS Y SERVICIOS

# Tabla: categorias_materiales

Clasifica los materiales del catálogo en grupos para facilitar su organización y filtrado (ej. Agregados, Aceros, Tuberías).

# Tabla: materiales

Mantiene el catálogo central de materiales, registrando código, unidad de medida, existencia total, costo de referencia y nivel mínimo de stock requerido.

# Tabla: almacenes

Modela los puntos físicos de almacenamiento (ya sean bodegas centrales o almacenes específicos en la obra de cada proyecto).

# Tabla: entradas_inventario

Encabezado del registro de recepción e ingreso de mercancía/materiales comprados a proveedores, vinculando factura, fecha, usuario responsable y costo total.

# Tabla: detalles_entrada_inventario

Desglose de cada material ingresado en una entrada de inventario, especificando cantidad y costo unitario pactado.

# Tabla: salidas_materiales

Encabezado del despacho y salida de materiales desde la bodega hacia un proyecto, actividad o trabajador específico.

# Tabla: detalles_salida_materiales

Detalla los renglones de materiales despachados en una salida, descontando existencias e imputando el costo unitario del momento al proyecto o actividad.

# Tabla: devoluciones_materiales

Reintegra al inventario disponible del almacén los materiales no consumidos o sobrantes en obra.

# Tabla: traslados_materiales

Registra las transferencias directas de materiales entre distintas bodegas o de un proyecto a otro sin pasar por compras.

# Tabla: herramientas

Registra el catálogo de herramientas y equipos individuales con su código/serial, marca, modelo, estado de conservación y condición actual (disponible, prestada, baja).

# Tabla: prestamos_herramientas

Controla las entregas y devoluciones de herramientas a los trabajadores en los proyectos, registrando responsables, fechas pactadas/reales y estado de la herramienta al recibirla/entregarla.

# Tabla: servicios_externos

Registra la contratación de servicios o subcontratos ligados a proyectos/actividades, almacenando proveedor, responsable externo, período de ejecución y valor total contratado.

# MÓDULO 4: ALERTAS, AUDITORÍA Y TRAZABILIDAD

# Tabla: alertas

Registra y gestiona las notificaciones automáticas generadas por el sistema (ej. materiales por debajo del stock mínimo, herramientas con fecha vencida de devolución, actividades atrasadas e incidencias críticas).

# Tabla: bitacora_trazabilidad

Almacena el historial unificado de auditoría (logs), registrando la acción realizada (crear, editar, borrar), usuario responsable, IP, fecha y cambios efectuados (valores anteriores y nuevos) para garantizar la trazabilidad.