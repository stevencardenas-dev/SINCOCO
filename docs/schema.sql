-- =============================================================================
-- BASE DE DATOS DE GESTIÓN DE PROYECTOS, INVENTARIO Y PERSONAL
-- Motor objetivo: MySQL 8.0+ | Engine: InnoDB | Charset: utf8mb4
-- Verificado ejecutando este archivo en MySQL 8.0.46 (27/27 tablas) y también
-- en MariaDB 10.11, que es lo que corre el equipo de desarrollo.
--
-- RN07 (no eliminación física): las tablas con historial llevan baja lógica
-- (`activo`, `fecha_baja`, `baja_por_usuario_id`) y las FK hacia entidades
-- históricas son ON DELETE RESTRICT, de modo que el motor impide destruir el
-- historial de un proyecto. Los CASCADE que se conservan son de composición
-- (detalle→cabecera, evidencia→seguimiento, rol→permiso): el hijo no tiene
-- significado sin el padre y forman un solo registro lógico.
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `scopi` 
  DEFAULT CHARACTER SET utf8mb4 
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE scopi;

-- Desactivar restricciones de llaves foráneas temporalmente para la creación
SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================================
-- MÓDULO 1: PERSONAL Y USUARIOS
-- =============================================================================

-- RF01: Roles de usuario
CREATE TABLE `roles` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `nombre` VARCHAR(50) NOT NULL UNIQUE,
    `descripcion` TEXT,
    `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- RF01: Permisos del sistema
CREATE TABLE `permisos` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `nombre` VARCHAR(100) NOT NULL UNIQUE,
    `descripcion` TEXT,
    `modulo` VARCHAR(50) NOT NULL
) ENGINE=InnoDB;

-- RF01: Relación Roles - Permisos
CREATE TABLE `roles_permisos` (
    `rol_id` BIGINT NOT NULL,
    `permiso_id` BIGINT NOT NULL,
    PRIMARY KEY (`rol_id`, `permiso_id`),
    CONSTRAINT `fk_rp_rol` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_rp_permiso` FOREIGN KEY (`permiso_id`) REFERENCES `permisos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- RF06: Trabajadores y maestros de obra
CREATE TABLE `trabajadores` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `numero_documento` VARCHAR(20) NOT NULL UNIQUE,
    `tipo_documento` ENUM('CC', 'CE', 'NIT', 'PASAPORTE') NOT NULL,
    `nombres` VARCHAR(100) NOT NULL,
    `apellidos` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) UNIQUE,
    `telefono` VARCHAR(20),
    `direccion` VARCHAR(255),
    `cargo` VARCHAR(100) NOT NULL,
    `especialidad` VARCHAR(100),
    `disponible` TINYINT(1) DEFAULT 1,
    `estado` ENUM('ACTIVO', 'INACTIVO', 'VACACIONES', 'LICENCIA') DEFAULT 'ACTIVO',
    `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `actualizado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `activo` TINYINT(1) NOT NULL DEFAULT 1, -- RN07/RF32: baja lógica, nunca DELETE físico
    `fecha_baja` DATETIME DEFAULT NULL,
    `baja_por_usuario_id` BIGINT DEFAULT NULL
) ENGINE=InnoDB;

-- RF01: Autenticación y acceso
CREATE TABLE `usuarios` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `trabajador_id` BIGINT UNIQUE,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `rol_id` BIGINT NOT NULL,
    `estado` ENUM('ACTIVO', 'INACTIVO', 'BLOQUEADO') DEFAULT 'ACTIVO',
    `ultimo_acceso` DATETIME,
    `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `actualizado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `activo` TINYINT(1) NOT NULL DEFAULT 1, -- RN07/RF32: baja lógica, nunca DELETE físico
    `fecha_baja` DATETIME DEFAULT NULL,
    `baja_por_usuario_id` BIGINT DEFAULT NULL,
    CONSTRAINT `fk_usuario_trabajador` FOREIGN KEY (`trabajador_id`) REFERENCES `trabajadores` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_usuario_rol` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB;

-- RF19: Proveedores de materiales y servicios
CREATE TABLE `proveedores` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `documento_identificacion` VARCHAR(20) NOT NULL UNIQUE,
    `razon_social` VARCHAR(150) NOT NULL,
    `nombre_contacto` VARCHAR(100),
    `telefono` VARCHAR(20),
    `email` VARCHAR(150),
    `direccion` VARCHAR(255),
    `estado` ENUM('ACTIVO', 'INACTIVO') DEFAULT 'ACTIVO',
    `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `activo` TINYINT(1) NOT NULL DEFAULT 1, -- RN07/RF32: baja lógica, nunca DELETE físico
    `fecha_baja` DATETIME DEFAULT NULL,
    `baja_por_usuario_id` BIGINT DEFAULT NULL
) ENGINE=InnoDB;

-- =============================================================================
-- MÓDULO 2: PROYECTOS, ESTRUCTURA Y AVANCE
-- =============================================================================

-- RF02: Ficha principal del proyecto
CREATE TABLE `proyectos` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `codigo` VARCHAR(20) NOT NULL UNIQUE,
    `nombre` VARCHAR(150) NOT NULL,
    `descripcion` TEXT,
    `ubicacion` VARCHAR(255) NOT NULL,
    `fecha_inicio_programada` DATE NOT NULL,
    `fecha_fin_programada` DATE NOT NULL,
    `fecha_inicio_real` DATE,
    `fecha_fin_real` DATE,
    `responsable_id` BIGINT NOT NULL,
    `presupuesto_referencia` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `porcentaje_avance_total` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    `estado` ENUM('PLANIFICACION', 'EN_EJECUCION', 'PAUSADO', 'FINALIZADO', 'CANCELADO') DEFAULT 'PLANIFICACION',
    `observaciones` TEXT,
    `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `actualizado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `activo` TINYINT(1) NOT NULL DEFAULT 1, -- RN07/RF32: baja lógica, nunca DELETE físico
    `fecha_baja` DATETIME DEFAULT NULL,
    `baja_por_usuario_id` BIGINT DEFAULT NULL,
    CONSTRAINT `fk_proyecto_responsable` FOREIGN KEY (`responsable_id`) REFERENCES `trabajadores` (`id`),
    CONSTRAINT `chk_proyecto_avance` CHECK (`porcentaje_avance_total` BETWEEN 0 AND 100)
) ENGINE=InnoDB;

-- RF03: Etapas del proyecto
CREATE TABLE `etapas_proyecto` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `proyecto_id` BIGINT NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `descripcion` TEXT,
    `orden` INT DEFAULT 1,
    `fecha_inicio_programada` DATE,
    `fecha_fin_programada` DATE,
    `estado` ENUM('PENDIENTE', 'EN_PROCESO', 'COMPLETADA') DEFAULT 'PENDIENTE',
    `activo` TINYINT(1) NOT NULL DEFAULT 1, -- RN07/RF32: baja lógica, nunca DELETE físico
    `fecha_baja` DATETIME DEFAULT NULL,
    `baja_por_usuario_id` BIGINT DEFAULT NULL,
    CONSTRAINT `fk_etapa_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- RF03, RF25: Actividades de cada etapa
CREATE TABLE `actividades` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `etapa_id` BIGINT NOT NULL,
    `responsable_id` BIGINT,
    `nombre` VARCHAR(150) NOT NULL,
    `descripcion` TEXT,
    `fecha_inicio_programada` DATE NOT NULL,
    `fecha_fin_programada` DATE NOT NULL,
    `fecha_inicio_real` DATE,
    `fecha_fin_real` DATE,
    `porcentaje_avance` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    `estado` ENUM('PENDIENTE', 'EN_PROCESO', 'COMPLETADA', 'ATRASADA', 'SUSPENDIDA') DEFAULT 'PENDIENTE',
    `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `actualizado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `activo` TINYINT(1) NOT NULL DEFAULT 1, -- RN07/RF32: baja lógica, nunca DELETE físico
    `fecha_baja` DATETIME DEFAULT NULL,
    `baja_por_usuario_id` BIGINT DEFAULT NULL,
    CONSTRAINT `fk_actividad_etapa` FOREIGN KEY (`etapa_id`) REFERENCES `etapas_proyecto` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_actividad_responsable` FOREIGN KEY (`responsable_id`) REFERENCES `trabajadores` (`id`) ON DELETE SET NULL,
    CONSTRAINT `chk_actividad_avance` CHECK (`porcentaje_avance` BETWEEN 0 AND 100)
) ENGINE=InnoDB;

-- RF07, RF08: Asignación e historial de personal
CREATE TABLE `asignaciones_personal` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `trabajador_id` BIGINT NOT NULL,
    `proyecto_id` BIGINT NOT NULL,
    `actividad_id` BIGINT,
    `fecha_inicio` DATE NOT NULL,
    `fecha_fin_programada` DATE,
    `fecha_fin_real` DATE,
    `rol_en_proyecto` VARCHAR(100),
    `estado` ENUM('ACTIVO', 'FINALIZADO', 'REASIGNADO') DEFAULT 'ACTIVO',
    `observaciones` TEXT,
    CONSTRAINT `fk_asig_trabajador` FOREIGN KEY (`trabajador_id`) REFERENCES `trabajadores` (`id`),
    CONSTRAINT `fk_asig_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_asig_actividad` FOREIGN KEY (`actividad_id`) REFERENCES `actividades` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- RF04, RF32: Histórico de seguimiento del avance
CREATE TABLE `seguimiento_avance` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `actividad_id` BIGINT NOT NULL,
    `registrado_por_usuario_id` BIGINT NOT NULL,
    `fecha_registro` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `porcentaje_anterior` DECIMAL(5,2) NOT NULL,
    `porcentaje_nuevo` DECIMAL(5,2) NOT NULL,
    `observaciones` TEXT,
    CONSTRAINT `fk_seg_actividad` FOREIGN KEY (`actividad_id`) REFERENCES `actividades` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_seg_usuario` FOREIGN KEY (`registrado_por_usuario_id`) REFERENCES `usuarios` (`id`),
    CONSTRAINT `chk_seg_porcentaje` CHECK (`porcentaje_nuevo` BETWEEN 0 AND 100)
) ENGINE=InnoDB;

-- RF05: Evidencias adjuntas al avance
CREATE TABLE `evidencias_avance` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `seguimiento_id` BIGINT NOT NULL,
    `nombre_archivo` VARCHAR(255) NOT NULL,
    `ruta_archivo` VARCHAR(500) NOT NULL,
    `tipo_archivo` VARCHAR(50),
    `subido_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_evidencia_seguimiento` FOREIGN KEY (`seguimiento_id`) REFERENCES `seguimiento_avance` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- RF22: Registro de incidencias y novedades
CREATE TABLE `incidencias` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `proyecto_id` BIGINT NOT NULL,
    `actividad_id` BIGINT,
    `reportado_por_usuario_id` BIGINT NOT NULL,
    `titulo` VARCHAR(150) NOT NULL,
    `descripcion` TEXT NOT NULL,
    `severidad` ENUM('BAJA', 'MEDIA', 'ALTA', 'CRITICA') DEFAULT 'MEDIA',
    `estado` ENUM('ABIERTA', 'EN_REVISION', 'RESUELTA', 'CERRADA') DEFAULT 'ABIERTA',
    `fecha_incidencia` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `fecha_resolucion` DATETIME,
    CONSTRAINT `fk_inc_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_inc_actividad` FOREIGN KEY (`actividad_id`) REFERENCES `actividades` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_inc_usuario` FOREIGN KEY (`reportado_por_usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB;

-- =============================================================================
-- MÓDULO 3: INVENTARIO, MATERIALES, HERRAMIENTAS Y SERVICIOS
-- =============================================================================

-- RF09: Categorías de materiales
CREATE TABLE `categorias_materiales` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `nombre` VARCHAR(100) NOT NULL UNIQUE,
    `descripcion` TEXT
) ENGINE=InnoDB;

-- RF09, RF23: Catálogo general de materiales
CREATE TABLE `materiales` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `codigo` VARCHAR(30) NOT NULL UNIQUE,
    `categoria_id` BIGINT NOT NULL,
    `descripcion` VARCHAR(255) NOT NULL,
    `unidad_medida` VARCHAR(20) NOT NULL, -- Ej: m3, kg, unidad, bulto
    `existencia_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `costo_referencia` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `nivel_minimo` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `estado` ENUM('ACTIVO', 'INACTIVO') DEFAULT 'ACTIVO',
    `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `activo` TINYINT(1) NOT NULL DEFAULT 1, -- RN07/RF32: baja lógica, nunca DELETE físico
    `fecha_baja` DATETIME DEFAULT NULL,
    `baja_por_usuario_id` BIGINT DEFAULT NULL,
    CONSTRAINT `fk_mat_categoria` FOREIGN KEY (`categoria_id`) REFERENCES `categorias_materiales` (`id`)
) ENGINE=InnoDB;

-- RF10, RF14: Almacenes o bodegas
CREATE TABLE `almacenes` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `codigo` VARCHAR(20) NOT NULL UNIQUE,
    `nombre` VARCHAR(100) NOT NULL,
    `ubicacion` VARCHAR(255),
    `proyecto_id` BIGINT NULL, -- Puede ser un almacén general o específico de obra
    `es_central` TINYINT(1) DEFAULT 0,
    `activo` TINYINT(1) NOT NULL DEFAULT 1, -- RN07/RF32: baja lógica, nunca DELETE físico
    `fecha_baja` DATETIME DEFAULT NULL,
    `baja_por_usuario_id` BIGINT DEFAULT NULL,
    CONSTRAINT `fk_almacen_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- RF10: Encabezado de Entradas de Inventario
CREATE TABLE `entradas_inventario` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `almacen_id` BIGINT NOT NULL,
    `proveedor_id` BIGINT NOT NULL,
    `responsable_usuario_id` BIGINT NOT NULL,
    `numero_factura_remision` VARCHAR(50),
    `fecha_entrada` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `costo_total` DECIMAL(15,2) DEFAULT 0.00,
    `observaciones` TEXT,
    CONSTRAINT `fk_ent_almacen` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes` (`id`),
    CONSTRAINT `fk_ent_proveedor` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`),
    CONSTRAINT `fk_ent_usuario` FOREIGN KEY (`responsable_usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB;

-- RF10: Detalle de Entradas
CREATE TABLE `detalles_entrada_inventario` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `entrada_id` BIGINT NOT NULL,
    `material_id` BIGINT NOT NULL,
    `cantidad` DECIMAL(12,2) NOT NULL,
    `costo_unitario` DECIMAL(12,2) NOT NULL,
    `costo_subtotal` DECIMAL(15,2) NOT NULL,
    CONSTRAINT `fk_dent_entrada` FOREIGN KEY (`entrada_id`) REFERENCES `entradas_inventario` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_dent_material` FOREIGN KEY (`material_id`) REFERENCES `materiales` (`id`),
    CONSTRAINT `chk_dent_cantidad` CHECK (`cantidad` > 0)
) ENGINE=InnoDB;

-- RF11, RF12: Encabezado de Salidas de Materiales
CREATE TABLE `salidas_materiales` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `almacen_origen_id` BIGINT NOT NULL,
    `proyecto_id` BIGINT NOT NULL,
    `actividad_id` BIGINT,
    `entregado_a_trabajador_id` BIGINT NOT NULL,
    `despachado_por_usuario_id` BIGINT NOT NULL,
    `fecha_salida` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `observaciones` TEXT,
    CONSTRAINT `fk_sal_almacen` FOREIGN KEY (`almacen_origen_id`) REFERENCES `almacenes` (`id`),
    CONSTRAINT `fk_sal_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`),
    CONSTRAINT `fk_sal_actividad` FOREIGN KEY (`actividad_id`) REFERENCES `actividades` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_sal_trabajador` FOREIGN KEY (`entregado_a_trabajador_id`) REFERENCES `trabajadores` (`id`),
    CONSTRAINT `fk_sal_usuario` FOREIGN KEY (`despachado_por_usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB;

-- RF11, RF12: Detalle de Salidas y Consumo
CREATE TABLE `detalles_salida_materiales` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `salida_id` BIGINT NOT NULL,
    `material_id` BIGINT NOT NULL,
    `cantidad_despachada` DECIMAL(12,2) NOT NULL,
    `costo_unitario_momento` DECIMAL(12,2) NOT NULL,
    CONSTRAINT `fk_dsal_salida` FOREIGN KEY (`salida_id`) REFERENCES `salidas_materiales` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_dsal_material` FOREIGN KEY (`material_id`) REFERENCES `materiales` (`id`),
    CONSTRAINT `chk_dsal_cantidad` CHECK (`cantidad_despachada` > 0)
) ENGINE=InnoDB;

-- RF13: Devoluciones de materiales no utilizados
CREATE TABLE `devoluciones_materiales` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `almacen_destino_id` BIGINT NOT NULL,
    `proyecto_id` BIGINT NOT NULL,
    `actividad_id` BIGINT,
    `material_id` BIGINT NOT NULL,
    `devuelto_por_trabajador_id` BIGINT NOT NULL,
    `recibido_por_usuario_id` BIGINT NOT NULL,
    `cantidad` DECIMAL(12,2) NOT NULL,
    `fecha_devolucion` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `motivo` TEXT,
    `salida_origen_id` BIGINT, -- RN13: la devolución debe referirse a una salida previa
    CONSTRAINT `fk_dev_salida` FOREIGN KEY (`salida_origen_id`) REFERENCES `salidas_materiales` (`id`),
    CONSTRAINT `fk_dev_almacen` FOREIGN KEY (`almacen_destino_id`) REFERENCES `almacenes` (`id`),
    CONSTRAINT `fk_dev_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`),
    CONSTRAINT `fk_dev_actividad` FOREIGN KEY (`actividad_id`) REFERENCES `actividades` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_dev_material` FOREIGN KEY (`material_id`) REFERENCES `materiales` (`id`),
    CONSTRAINT `fk_dev_trabajador` FOREIGN KEY (`devuelto_por_trabajador_id`) REFERENCES `trabajadores` (`id`),
    CONSTRAINT `fk_dev_usuario` FOREIGN KEY (`recibido_por_usuario_id`) REFERENCES `usuarios` (`id`),
    CONSTRAINT `chk_dev_cantidad` CHECK (`cantidad` > 0)
) ENGINE=InnoDB;

-- RF14: Traslados de materiales entre almacenes/proyectos
CREATE TABLE `traslados_materiales` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `almacen_origen_id` BIGINT NOT NULL,
    `almacen_destino_id` BIGINT NOT NULL,
    `material_id` BIGINT NOT NULL,
    `cantidad` DECIMAL(12,2) NOT NULL,
    `responsable_usuario_id` BIGINT NOT NULL,
    `fecha_traslado` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `observaciones` TEXT,
    CONSTRAINT `fk_tras_origen` FOREIGN KEY (`almacen_origen_id`) REFERENCES `almacenes` (`id`),
    CONSTRAINT `fk_tras_destino` FOREIGN KEY (`almacen_destino_id`) REFERENCES `almacenes` (`id`),
    CONSTRAINT `fk_tras_material` FOREIGN KEY (`material_id`) REFERENCES `materiales` (`id`),
    CONSTRAINT `fk_tras_usuario` FOREIGN KEY (`responsable_usuario_id`) REFERENCES `usuarios` (`id`),
    CONSTRAINT `chk_tras_cantidad` CHECK (`cantidad` > 0)
) ENGINE=InnoDB;

-- RF15, RF18, RF24: Control individual de herramientas
CREATE TABLE `herramientas` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `codigo_serial` VARCHAR(50) NOT NULL UNIQUE,
    `nombre` VARCHAR(100) NOT NULL,
    `marca` VARCHAR(50),
    `modelo` VARCHAR(50),
    `almacen_id` BIGINT NOT NULL,
    `estado_operativo` ENUM('EXCELENTE', 'BUENO', 'REGULAR', 'DANIADA', 'EN_MANTENIMIENTO') DEFAULT 'EXCELENTE',
    `disponibilidad` ENUM('DISPONIBLE', 'PRESTADA', 'EN_TRASLADO', 'BAJA') DEFAULT 'DISPONIBLE',
    `observaciones` TEXT,
    `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `activo` TINYINT(1) NOT NULL DEFAULT 1, -- RN07/RF32: baja lógica, nunca DELETE físico
    `fecha_baja` DATETIME DEFAULT NULL,
    `baja_por_usuario_id` BIGINT DEFAULT NULL,
    CONSTRAINT `fk_herr_almacen` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes` (`id`)
) ENGINE=InnoDB;

-- RF16, RF17, RF18, RF24: Préstamos y devoluciones de herramientas
CREATE TABLE `prestamos_herramientas` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `herramienta_id` BIGINT NOT NULL,
    `trabajador_id` BIGINT NOT NULL,
    `proyecto_id` BIGINT NOT NULL,
    `entregado_por_usuario_id` BIGINT NOT NULL,
    `recibido_por_usuario_id` BIGINT,
    `fecha_prestamo` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `fecha_estimada_devolucion` DATE NOT NULL,
    `fecha_real_devolucion` DATETIME,
    `estado_entrega` ENUM('EXCELENTE', 'BUENO', 'REGULAR') NOT NULL,
    `estado_devolucion` ENUM('EXCELENTE', 'BUENO', 'REGULAR', 'DANIADA', 'PERDIDA'),
    `estado_prestamo` ENUM('ACTIVO', 'DEVUELTO', 'ATRASADO', 'CON_NOVEDAD') DEFAULT 'ACTIVO',
    `observaciones_entrega` TEXT,
    `observaciones_devolucion` TEXT,
    CONSTRAINT `fk_ptherr_herramienta` FOREIGN KEY (`herramienta_id`) REFERENCES `herramientas` (`id`),
    CONSTRAINT `fk_ptherr_trabajador` FOREIGN KEY (`trabajador_id`) REFERENCES `trabajadores` (`id`),
    CONSTRAINT `fk_ptherr_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`),
    CONSTRAINT `fk_ptherr_u_entrega` FOREIGN KEY (`entregado_por_usuario_id`) REFERENCES `usuarios` (`id`),
    CONSTRAINT `fk_ptherr_u_recibe` FOREIGN KEY (`recibido_por_usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB;

-- RF20, RF21, RF26: Servicios externos contratados
CREATE TABLE `servicios_externos` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `proveedor_id` BIGINT NOT NULL,
    `proyecto_id` BIGINT NOT NULL,
    `actividad_id` BIGINT,
    `nombre_servicio` VARCHAR(150) NOT NULL,
    `descripcion` TEXT,
    `responsable_externo` VARCHAR(100) NOT NULL, -- Persona/empresa a cargo
    `fecha_inicio` DATE NOT NULL,
    `fecha_fin` DATE,
    `valor_contratado` DECIMAL(15,2) NOT NULL,
    `estado` ENUM('PROGRAMADO', 'EN_EJECUCION', 'FINALIZADO', 'CANCELADO') DEFAULT 'PROGRAMADO',
    `observaciones` TEXT,
    `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_serv_proveedor` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`),
    CONSTRAINT `fk_serv_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_serv_actividad` FOREIGN KEY (`actividad_id`) REFERENCES `actividades` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =============================================================================
-- MÓDULO 4: ALERTAS Y AUDITORÍA DE TRACABILIDAD
-- =============================================================================

-- RF23, RF24, RF25: Alertas del sistema
CREATE TABLE `alertas` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `tipo` ENUM('STOCK_MINIMO', 'HERRAMIENTA_PENDIENTE', 'ACTIVIDAD_ATRASADA', 'INCIDENCIA_CRITICA') NOT NULL,
    `titulo` VARCHAR(150) NOT NULL,
    `descripcion` TEXT NOT NULL,
    `referencia_id` BIGINT, -- ID del material, herramienta o actividad que genera la alerta
    `tabla_referencia` VARCHAR(50), -- Nombre de la tabla asociada
    `fecha_generacion` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `atendida` TINYINT(1) DEFAULT 0,
    `fecha_atencion` DATETIME
) ENGINE=InnoDB;

-- RF31, RF32: Bitácora de trazabilidad operacional (Audit Log)
CREATE TABLE `bitacora_trazabilidad` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `usuario_id` BIGINT,
    `accion` VARCHAR(100) NOT NULL, -- Ej: CREAR, ACTUALIZAR, ELIMINAR, AUTENTICAR
    `tabla_afectada` VARCHAR(50),
    `registro_id` BIGINT,
    `detalles` JSON, -- Almacena el valor anterior y nuevo en formato JSON
    `direccion_ip` VARCHAR(45),
    `fecha_registro` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_bit_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Reestablecer la verificación de llaves foráneas
SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- ÍNDICES RECOMENDADOS PARA OPTIMIZACIÓN DE CONSULTAS Y REPORTES
-- =============================================================================

CREATE INDEX `idx_proyectos_estado` ON `proyectos` (`estado`);
CREATE INDEX `idx_actividades_fechas` ON `actividades` (`fecha_inicio_programada`, `fecha_fin_programada`);
CREATE INDEX `idx_actividades_estado` ON `actividades` (`estado`);
CREATE INDEX `idx_materiales_codigo` ON `materiales` (`codigo`);
CREATE INDEX `idx_herramientas_serial` ON `herramientas` (`codigo_serial`);
CREATE INDEX `idx_prestamos_estado` ON `prestamos_herramientas` (`estado_prestamo`);
CREATE INDEX `idx_salidas_proyecto` ON `salidas_materiales` (`proyecto_id`);
CREATE INDEX `idx_servicios_proyecto` ON `servicios_externos` (`proyecto_id`);
CREATE INDEX `idx_bitacora_fecha` ON `bitacora_trazabilidad` (`fecha_registro`);