-- MySQL dump 10.13  Distrib 8.0.38, for Win64 (x86_64)
--
-- Host: localhost    Database: sincoco
-- ------------------------------------------------------
-- Server version	8.0.39

-- Origen: DumpSINCOCO.sql (export mysqldump del equipo).
-- Adoptado sin modificaciones salvo el nombre de la base de datos
-- (scopi -> sincoco) y este encabezado CREATE DATABASE/USE, que el
-- dump no trae por ser un export solo de tablas.
CREATE DATABASE IF NOT EXISTS `sincoco`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
USE `sincoco`;

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `actividades`
--

DROP TABLE IF EXISTS `actividades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `actividades` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `etapa_id` bigint NOT NULL,
  `responsable_id` bigint DEFAULT NULL,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `fecha_inicio_programada` date NOT NULL,
  `fecha_fin_programada` date NOT NULL,
  `fecha_inicio_real` date DEFAULT NULL,
  `fecha_fin_real` date DEFAULT NULL,
  `porcentaje_avance` decimal(5,2) NOT NULL DEFAULT '0.00',
  `estado` enum('PENDIENTE','EN_PROCESO','COMPLETADA','ATRASADA','SUSPENDIDA') COLLATE utf8mb4_unicode_ci DEFAULT 'PENDIENTE',
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_baja` datetime DEFAULT NULL,
  `baja_por_usuario_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_actividad_etapa` (`etapa_id`),
  KEY `fk_actividad_responsable` (`responsable_id`),
  KEY `idx_actividades_fechas` (`fecha_inicio_programada`,`fecha_fin_programada`),
  KEY `idx_actividades_estado` (`estado`),
  CONSTRAINT `fk_actividad_etapa` FOREIGN KEY (`etapa_id`) REFERENCES `etapas_proyecto` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_actividad_responsable` FOREIGN KEY (`responsable_id`) REFERENCES `trabajadores` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_actividad_avance` CHECK ((`porcentaje_avance` between 0 and 100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `alertas`
--

DROP TABLE IF EXISTS `alertas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alertas` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tipo` enum('STOCK_MINIMO','HERRAMIENTA_PENDIENTE','ACTIVIDAD_ATRASADA','INCIDENCIA_CRITICA') COLLATE utf8mb4_unicode_ci NOT NULL,
  `titulo` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `referencia_id` bigint DEFAULT NULL,
  `tabla_referencia` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_generacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `atendida` tinyint(1) DEFAULT '0',
  `fecha_atencion` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `almacenes`
--

DROP TABLE IF EXISTS `almacenes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `almacenes` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ubicacion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `proyecto_id` bigint DEFAULT NULL,
  `es_central` tinyint(1) DEFAULT '0',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_baja` datetime DEFAULT NULL,
  `baja_por_usuario_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `fk_almacen_proyecto` (`proyecto_id`),
  CONSTRAINT `fk_almacen_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `asignaciones_personal`
--

DROP TABLE IF EXISTS `asignaciones_personal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asignaciones_personal` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `trabajador_id` bigint NOT NULL,
  `proyecto_id` bigint NOT NULL,
  `actividad_id` bigint DEFAULT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin_programada` date DEFAULT NULL,
  `fecha_fin_real` date DEFAULT NULL,
  `rol_en_proyecto` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` enum('ACTIVO','FINALIZADO','REASIGNADO') COLLATE utf8mb4_unicode_ci DEFAULT 'ACTIVO',
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `fk_asig_trabajador` (`trabajador_id`),
  KEY `fk_asig_proyecto` (`proyecto_id`),
  KEY `fk_asig_actividad` (`actividad_id`),
  CONSTRAINT `fk_asig_actividad` FOREIGN KEY (`actividad_id`) REFERENCES `actividades` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_asig_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_asig_trabajador` FOREIGN KEY (`trabajador_id`) REFERENCES `trabajadores` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bitacora_trazabilidad`
--

DROP TABLE IF EXISTS `bitacora_trazabilidad`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bitacora_trazabilidad` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `usuario_id` bigint DEFAULT NULL,
  `accion` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tabla_afectada` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `registro_id` bigint DEFAULT NULL,
  `detalles` json DEFAULT NULL,
  `direccion_ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_bit_usuario` (`usuario_id`),
  KEY `idx_bitacora_fecha` (`fecha_registro`),
  CONSTRAINT `fk_bit_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `categorias_materiales`
--

DROP TABLE IF EXISTS `categorias_materiales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categorias_materiales` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `clientes`
--

DROP TABLE IF EXISTS `clientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clientes` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `numero_documento` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_documento` enum('CC','CE','NIT','PASAPORTE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `razon_social_nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_contacto` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direccion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` enum('ACTIVO','INACTIVO') COLLATE utf8mb4_unicode_ci DEFAULT 'ACTIVO',
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_baja` datetime DEFAULT NULL,
  `baja_por_usuario_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `numero_documento` (`numero_documento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `detalles_entrada_inventario`
--

DROP TABLE IF EXISTS `detalles_entrada_inventario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalles_entrada_inventario` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `entrada_id` bigint NOT NULL,
  `material_id` bigint NOT NULL,
  `cantidad` decimal(12,2) NOT NULL,
  `costo_unitario` decimal(12,2) NOT NULL,
  `costo_subtotal` decimal(15,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_dent_entrada` (`entrada_id`),
  KEY `fk_dent_material` (`material_id`),
  CONSTRAINT `fk_dent_entrada` FOREIGN KEY (`entrada_id`) REFERENCES `entradas_inventario` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dent_material` FOREIGN KEY (`material_id`) REFERENCES `materiales` (`id`),
  CONSTRAINT `chk_dent_cantidad` CHECK ((`cantidad` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_entrada_suma_existencia` AFTER INSERT ON `detalles_entrada_inventario` FOR EACH ROW BEGIN
    UPDATE `materiales`
       SET `existencia_total` = `existencia_total` + NEW.`cantidad`
     WHERE `id` = NEW.`material_id`;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `detalles_orden_compra`
--

DROP TABLE IF EXISTS `detalles_orden_compra`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalles_orden_compra` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `orden_compra_id` bigint NOT NULL,
  `material_id` bigint NOT NULL,
  `solicitud_detalle_id` bigint DEFAULT NULL,
  `cantidad_pedida` decimal(12,2) NOT NULL,
  `cantidad_recibida` decimal(12,2) DEFAULT '0.00',
  `precio_unitario` decimal(12,2) NOT NULL,
  `subtotal` decimal(15,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_doc_orden` (`orden_compra_id`),
  KEY `fk_doc_material` (`material_id`),
  KEY `fk_doc_solicitud_det` (`solicitud_detalle_id`),
  CONSTRAINT `fk_doc_material` FOREIGN KEY (`material_id`) REFERENCES `materiales` (`id`),
  CONSTRAINT `fk_doc_orden` FOREIGN KEY (`orden_compra_id`) REFERENCES `ordenes_compra` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_doc_solicitud_det` FOREIGN KEY (`solicitud_detalle_id`) REFERENCES `detalles_solicitud_materiales` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_doc_cantidad` CHECK ((`cantidad_pedida` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `detalles_salida_materiales`
--

DROP TABLE IF EXISTS `detalles_salida_materiales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalles_salida_materiales` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `salida_id` bigint NOT NULL,
  `material_id` bigint NOT NULL,
  `cantidad_despachada` decimal(12,2) NOT NULL,
  `costo_unitario_momento` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_dsal_salida` (`salida_id`),
  KEY `fk_dsal_material` (`material_id`),
  CONSTRAINT `fk_dsal_material` FOREIGN KEY (`material_id`) REFERENCES `materiales` (`id`),
  CONSTRAINT `fk_dsal_salida` FOREIGN KEY (`salida_id`) REFERENCES `salidas_materiales` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_dsal_cantidad` CHECK ((`cantidad_despachada` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_salida_descuenta_existencia` AFTER INSERT ON `detalles_salida_materiales` FOR EACH ROW BEGIN
    UPDATE `materiales`
       SET `existencia_total` = `existencia_total` - NEW.`cantidad_despachada`
     WHERE `id` = NEW.`material_id`;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_salida_descuenta_existencia_y_alerta` AFTER INSERT ON `detalles_salida_materiales` FOR EACH ROW BEGIN
    DECLARE v_existencia_nueva DECIMAL(12,2);
    DECLARE v_nivel_minimo DECIMAL(12,2);
    DECLARE v_descripcion_mat VARCHAR(255);

    -- 1. Descontar la existencia del material (RN06)
    UPDATE `materiales`
       SET `existencia_total` = `existencia_total` - NEW.`cantidad_despachada`
     WHERE `id` = NEW.`material_id`;

    -- 2. Obtener el nuevo saldo y el nivel mínimo configurado
    SELECT `existencia_total`, `nivel_minimo`, `descripcion`
      INTO v_existencia_nueva, v_nivel_minimo, v_descripcion_mat
      FROM `materiales`
     WHERE `id` = NEW.`material_id`;

    -- 3. Verificar si el saldo cayó por debajo o igual al nivel mínimo
    IF v_existencia_nueva <= v_nivel_minimo THEN
        -- Insertar la alerta automática si no existe una alerta pendiente activa
        IF NOT EXISTS (
            SELECT 1 FROM `alertas` 
             WHERE `tipo` = 'STOCK_MINIMO' 
               AND `referencia_id` = NEW.`material_id` 
               AND `atendida` = 0
        ) THEN
            INSERT INTO `alertas` (
                `tipo`, 
                `titulo`, 
                `descripcion`, 
                `referencia_id`, 
                `tabla_referencia`
            ) VALUES (
                'STOCK_MINIMO',
                CONCAT('Stock Crítico: ', v_descripcion_mat),
                CONCAT('El material ', v_descripcion_mat, ' ha llegado a ', v_existencia_nueva, ' unidades (Mínimo configurado: ', v_nivel_minimo, ').'),
                NEW.`material_id`,
                'materiales'
            );
        END IF;
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `detalles_solicitud_materiales`
--

DROP TABLE IF EXISTS `detalles_solicitud_materiales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalles_solicitud_materiales` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `solicitud_id` bigint NOT NULL,
  `material_id` bigint NOT NULL,
  `cantidad_solicitada` decimal(12,2) NOT NULL,
  `cantidad_aprobada` decimal(12,2) DEFAULT '0.00',
  `cantidad_despachada` decimal(12,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `fk_dsol_solicitud` (`solicitud_id`),
  KEY `fk_dsol_material` (`material_id`),
  CONSTRAINT `fk_dsol_material` FOREIGN KEY (`material_id`) REFERENCES `materiales` (`id`),
  CONSTRAINT `fk_dsol_solicitud` FOREIGN KEY (`solicitud_id`) REFERENCES `solicitudes_materiales` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_dsol_cantidad` CHECK ((`cantidad_solicitada` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `devoluciones_materiales`
--

DROP TABLE IF EXISTS `devoluciones_materiales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `devoluciones_materiales` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `almacen_destino_id` bigint NOT NULL,
  `proyecto_id` bigint NOT NULL,
  `actividad_id` bigint DEFAULT NULL,
  `material_id` bigint NOT NULL,
  `devuelto_por_trabajador_id` bigint NOT NULL,
  `recibido_por_usuario_id` bigint NOT NULL,
  `cantidad` decimal(12,2) NOT NULL,
  `fecha_devolucion` datetime DEFAULT CURRENT_TIMESTAMP,
  `motivo` text COLLATE utf8mb4_unicode_ci,
  `salida_origen_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_dev_salida` (`salida_origen_id`),
  KEY `fk_dev_almacen` (`almacen_destino_id`),
  KEY `fk_dev_proyecto` (`proyecto_id`),
  KEY `fk_dev_actividad` (`actividad_id`),
  KEY `fk_dev_material` (`material_id`),
  KEY `fk_dev_trabajador` (`devuelto_por_trabajador_id`),
  KEY `fk_dev_usuario` (`recibido_por_usuario_id`),
  CONSTRAINT `fk_dev_actividad` FOREIGN KEY (`actividad_id`) REFERENCES `actividades` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_dev_almacen` FOREIGN KEY (`almacen_destino_id`) REFERENCES `almacenes` (`id`),
  CONSTRAINT `fk_dev_material` FOREIGN KEY (`material_id`) REFERENCES `materiales` (`id`),
  CONSTRAINT `fk_dev_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`),
  CONSTRAINT `fk_dev_salida` FOREIGN KEY (`salida_origen_id`) REFERENCES `salidas_materiales` (`id`),
  CONSTRAINT `fk_dev_trabajador` FOREIGN KEY (`devuelto_por_trabajador_id`) REFERENCES `trabajadores` (`id`),
  CONSTRAINT `fk_dev_usuario` FOREIGN KEY (`recibido_por_usuario_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `chk_dev_cantidad` CHECK ((`cantidad` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_devolucion_suma_existencia` AFTER INSERT ON `devoluciones_materiales` FOR EACH ROW BEGIN
    UPDATE `materiales`
       SET `existencia_total` = `existencia_total` + NEW.`cantidad`
     WHERE `id` = NEW.`material_id`;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `entradas_inventario`
--

DROP TABLE IF EXISTS `entradas_inventario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `entradas_inventario` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `almacen_id` bigint NOT NULL,
  `proveedor_id` bigint NOT NULL,
  `responsable_usuario_id` bigint NOT NULL,
  `numero_factura_remision` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_entrada` datetime DEFAULT CURRENT_TIMESTAMP,
  `costo_total` decimal(15,2) DEFAULT '0.00',
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `fk_ent_almacen` (`almacen_id`),
  KEY `fk_ent_proveedor` (`proveedor_id`),
  KEY `fk_ent_usuario` (`responsable_usuario_id`),
  CONSTRAINT `fk_ent_almacen` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes` (`id`),
  CONSTRAINT `fk_ent_proveedor` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`),
  CONSTRAINT `fk_ent_usuario` FOREIGN KEY (`responsable_usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `etapas_proyecto`
--

DROP TABLE IF EXISTS `etapas_proyecto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `etapas_proyecto` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `proyecto_id` bigint NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `orden` int DEFAULT '1',
  `fecha_inicio_programada` date DEFAULT NULL,
  `fecha_fin_programada` date DEFAULT NULL,
  `estado` enum('PENDIENTE','EN_PROCESO','COMPLETADA') COLLATE utf8mb4_unicode_ci DEFAULT 'PENDIENTE',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_baja` datetime DEFAULT NULL,
  `baja_por_usuario_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_etapa_proyecto` (`proyecto_id`),
  CONSTRAINT `fk_etapa_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `evidencias_avance`
--

DROP TABLE IF EXISTS `evidencias_avance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `evidencias_avance` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `seguimiento_id` bigint NOT NULL,
  `nombre_archivo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ruta_archivo` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_archivo` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subido_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_evidencia_seguimiento` (`seguimiento_id`),
  CONSTRAINT `fk_evidencia_seguimiento` FOREIGN KEY (`seguimiento_id`) REFERENCES `seguimiento_avance` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `herramientas`
--

DROP TABLE IF EXISTS `herramientas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `herramientas` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `codigo_serial` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `marca` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `modelo` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `almacen_id` bigint NOT NULL,
  `estado_operativo` enum('EXCELENTE','BUENO','REGULAR','DANIADA','EN_MANTENIMIENTO') COLLATE utf8mb4_unicode_ci DEFAULT 'EXCELENTE',
  `disponibilidad` enum('DISPONIBLE','PRESTADA','EN_TRASLADO','BAJA') COLLATE utf8mb4_unicode_ci DEFAULT 'DISPONIBLE',
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_baja` datetime DEFAULT NULL,
  `baja_por_usuario_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo_serial` (`codigo_serial`),
  KEY `fk_herr_almacen` (`almacen_id`),
  KEY `idx_herramientas_serial` (`codigo_serial`),
  CONSTRAINT `fk_herr_almacen` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `incidencias`
--

DROP TABLE IF EXISTS `incidencias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `incidencias` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `proyecto_id` bigint NOT NULL,
  `actividad_id` bigint DEFAULT NULL,
  `reportado_por_usuario_id` bigint NOT NULL,
  `titulo` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `severidad` enum('BAJA','MEDIA','ALTA','CRITICA') COLLATE utf8mb4_unicode_ci DEFAULT 'MEDIA',
  `estado` enum('ABIERTA','EN_REVISION','RESUELTA','CERRADA') COLLATE utf8mb4_unicode_ci DEFAULT 'ABIERTA',
  `fecha_incidencia` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_resolucion` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_inc_proyecto` (`proyecto_id`),
  KEY `fk_inc_actividad` (`actividad_id`),
  KEY `fk_inc_usuario` (`reportado_por_usuario_id`),
  CONSTRAINT `fk_inc_actividad` FOREIGN KEY (`actividad_id`) REFERENCES `actividades` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_inc_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_inc_usuario` FOREIGN KEY (`reportado_por_usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `materiales`
--

DROP TABLE IF EXISTS `materiales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `materiales` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `codigo` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoria_id` bigint NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `unidad_medida` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `existencia_total` decimal(12,2) NOT NULL DEFAULT '0.00',
  `costo_referencia` decimal(12,2) NOT NULL DEFAULT '0.00',
  `nivel_minimo` decimal(12,2) NOT NULL DEFAULT '0.00',
  `estado` enum('ACTIVO','INACTIVO') COLLATE utf8mb4_unicode_ci DEFAULT 'ACTIVO',
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_baja` datetime DEFAULT NULL,
  `baja_por_usuario_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `fk_mat_categoria` (`categoria_id`),
  KEY `idx_materiales_codigo` (`codigo`),
  CONSTRAINT `fk_mat_categoria` FOREIGN KEY (`categoria_id`) REFERENCES `categorias_materiales` (`id`),
  CONSTRAINT `chk_mat_existencia` CHECK ((`existencia_total` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ordenes_compra`
--

DROP TABLE IF EXISTS `ordenes_compra`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ordenes_compra` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `codigo` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `proveedor_id` bigint NOT NULL,
  `proyecto_id` bigint NOT NULL,
  `solicitado_por_usuario_id` bigint NOT NULL,
  `aprobado_por_usuario_id` bigint DEFAULT NULL,
  `fecha_emision` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_entrega_estimada` date DEFAULT NULL,
  `monto_subtotal` decimal(15,2) NOT NULL DEFAULT '0.00',
  `monto_impuestos` decimal(15,2) NOT NULL DEFAULT '0.00',
  `monto_total` decimal(15,2) NOT NULL DEFAULT '0.00',
  `estado` enum('BORRADOR','PENDIENTE_APROBACION','APROBADA','ENVIADA_PROVEEDOR','RECIBIDA_PARCIAL','RECIBIDA_TOTAL','CANCELADA') COLLATE utf8mb4_unicode_ci DEFAULT 'BORRADOR',
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_baja` datetime DEFAULT NULL,
  `baja_por_usuario_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `fk_oc_proveedor` (`proveedor_id`),
  KEY `fk_oc_proyecto` (`proyecto_id`),
  KEY `fk_oc_u_solicita` (`solicitado_por_usuario_id`),
  KEY `fk_oc_u_aprueba` (`aprobado_por_usuario_id`),
  CONSTRAINT `fk_oc_proveedor` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`),
  CONSTRAINT `fk_oc_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`),
  CONSTRAINT `fk_oc_u_aprueba` FOREIGN KEY (`aprobado_por_usuario_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `fk_oc_u_solicita` FOREIGN KEY (`solicitado_por_usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `permisos`
--

DROP TABLE IF EXISTS `permisos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permisos` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `modulo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prestamos_herramientas`
--

DROP TABLE IF EXISTS `prestamos_herramientas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prestamos_herramientas` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `solicitud_id` bigint DEFAULT NULL,
  `herramienta_id` bigint NOT NULL,
  `trabajador_id` bigint NOT NULL,
  `proyecto_id` bigint NOT NULL,
  `entregado_por_usuario_id` bigint NOT NULL,
  `recibido_por_usuario_id` bigint DEFAULT NULL,
  `fecha_prestamo` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_estimada_devolucion` date NOT NULL,
  `fecha_real_devolucion` datetime DEFAULT NULL,
  `estado_entrega` enum('EXCELENTE','BUENO','REGULAR') COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado_devolucion` enum('EXCELENTE','BUENO','REGULAR','DANIADA','PERDIDA') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado_prestamo` enum('ACTIVO','DEVUELTO','ATRASADO','CON_NOVEDAD') COLLATE utf8mb4_unicode_ci DEFAULT 'ACTIVO',
  `observaciones_entrega` text COLLATE utf8mb4_unicode_ci,
  `observaciones_devolucion` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `fk_ptherr_herramienta` (`herramienta_id`),
  KEY `fk_ptherr_trabajador` (`trabajador_id`),
  KEY `fk_ptherr_proyecto` (`proyecto_id`),
  KEY `fk_ptherr_u_entrega` (`entregado_por_usuario_id`),
  KEY `fk_ptherr_u_recibe` (`recibido_por_usuario_id`),
  KEY `idx_prestamos_estado` (`estado_prestamo`),
  KEY `fk_ptherr_solicitud` (`solicitud_id`),
  CONSTRAINT `fk_ptherr_herramienta` FOREIGN KEY (`herramienta_id`) REFERENCES `herramientas` (`id`),
  CONSTRAINT `fk_ptherr_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`),
  CONSTRAINT `fk_ptherr_solicitud` FOREIGN KEY (`solicitud_id`) REFERENCES `solicitudes_herramientas` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ptherr_trabajador` FOREIGN KEY (`trabajador_id`) REFERENCES `trabajadores` (`id`),
  CONSTRAINT `fk_ptherr_u_entrega` FOREIGN KEY (`entregado_por_usuario_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `fk_ptherr_u_recibe` FOREIGN KEY (`recibido_por_usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `proveedores`
--

DROP TABLE IF EXISTS `proveedores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `proveedores` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `documento_identificacion` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `razon_social` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_contacto` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direccion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` enum('ACTIVO','INACTIVO') COLLATE utf8mb4_unicode_ci DEFAULT 'ACTIVO',
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_baja` datetime DEFAULT NULL,
  `baja_por_usuario_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `documento_identificacion` (`documento_identificacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `proyectos`
--

DROP TABLE IF EXISTS `proyectos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `proyectos` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cliente_id` bigint NOT NULL,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `ubicacion` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_inicio_programada` date NOT NULL,
  `fecha_fin_programada` date NOT NULL,
  `fecha_inicio_real` date DEFAULT NULL,
  `fecha_fin_real` date DEFAULT NULL,
  `responsable_id` bigint NOT NULL,
  `creado_por_usuario_id` bigint NOT NULL,
  `presupuesto_inicial` decimal(15,2) NOT NULL DEFAULT '0.00',
  `porcentaje_avance_total` decimal(5,2) NOT NULL DEFAULT '0.00',
  `estado` enum('PLANIFICACION','EN_EJECUCION','PAUSADO','FINALIZADO','CANCELADO') COLLATE utf8mb4_unicode_ci DEFAULT 'PLANIFICACION',
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_baja` datetime DEFAULT NULL,
  `baja_por_usuario_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `fk_proyecto_responsable` (`responsable_id`),
  KEY `idx_proyectos_estado` (`estado`),
  KEY `fk_proyecto_cliente` (`cliente_id`),
  KEY `fk_proyecto_creador` (`creado_por_usuario_id`),
  CONSTRAINT `fk_proyecto_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_proyecto_creador` FOREIGN KEY (`creado_por_usuario_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `fk_proyecto_responsable` FOREIGN KEY (`responsable_id`) REFERENCES `trabajadores` (`id`),
  CONSTRAINT `chk_proyecto_avance` CHECK ((`porcentaje_avance_total` between 0 and 100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `roles_permisos`
--

DROP TABLE IF EXISTS `roles_permisos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles_permisos` (
  `rol_id` bigint NOT NULL,
  `permiso_id` bigint NOT NULL,
  PRIMARY KEY (`rol_id`,`permiso_id`),
  KEY `fk_rp_permiso` (`permiso_id`),
  CONSTRAINT `fk_rp_permiso` FOREIGN KEY (`permiso_id`) REFERENCES `permisos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rp_rol` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `salidas_materiales`
--

DROP TABLE IF EXISTS `salidas_materiales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `salidas_materiales` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `almacen_origen_id` bigint NOT NULL,
  `proyecto_id` bigint NOT NULL,
  `actividad_id` bigint DEFAULT NULL,
  `entregado_a_trabajador_id` bigint NOT NULL,
  `despachado_por_usuario_id` bigint NOT NULL,
  `fecha_salida` datetime DEFAULT CURRENT_TIMESTAMP,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `fk_sal_almacen` (`almacen_origen_id`),
  KEY `fk_sal_actividad` (`actividad_id`),
  KEY `fk_sal_trabajador` (`entregado_a_trabajador_id`),
  KEY `fk_sal_usuario` (`despachado_por_usuario_id`),
  KEY `idx_salidas_proyecto` (`proyecto_id`),
  CONSTRAINT `fk_sal_actividad` FOREIGN KEY (`actividad_id`) REFERENCES `actividades` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sal_almacen` FOREIGN KEY (`almacen_origen_id`) REFERENCES `almacenes` (`id`),
  CONSTRAINT `fk_sal_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`),
  CONSTRAINT `fk_sal_trabajador` FOREIGN KEY (`entregado_a_trabajador_id`) REFERENCES `trabajadores` (`id`),
  CONSTRAINT `fk_sal_usuario` FOREIGN KEY (`despachado_por_usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `seguimiento_avance`
--

DROP TABLE IF EXISTS `seguimiento_avance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `seguimiento_avance` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `actividad_id` bigint NOT NULL,
  `registrado_por_usuario_id` bigint NOT NULL,
  `fecha_registro` datetime DEFAULT CURRENT_TIMESTAMP,
  `porcentaje_anterior` decimal(5,2) NOT NULL,
  `porcentaje_nuevo` decimal(5,2) NOT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `fk_seg_actividad` (`actividad_id`),
  KEY `fk_seg_usuario` (`registrado_por_usuario_id`),
  CONSTRAINT `fk_seg_actividad` FOREIGN KEY (`actividad_id`) REFERENCES `actividades` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_seg_usuario` FOREIGN KEY (`registrado_por_usuario_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `chk_seg_porcentaje` CHECK ((`porcentaje_nuevo` between 0 and 100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `servicios_externos`
--

DROP TABLE IF EXISTS `servicios_externos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `servicios_externos` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `proveedor_id` bigint NOT NULL,
  `proyecto_id` bigint NOT NULL,
  `actividad_id` bigint DEFAULT NULL,
  `nombre_servicio` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `responsable_externo` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date DEFAULT NULL,
  `valor_contratado` decimal(15,2) NOT NULL,
  `estado` enum('PROGRAMADO','EN_EJECUCION','FINALIZADO','CANCELADO') COLLATE utf8mb4_unicode_ci DEFAULT 'PROGRAMADO',
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_serv_proveedor` (`proveedor_id`),
  KEY `fk_serv_actividad` (`actividad_id`),
  KEY `idx_servicios_proyecto` (`proyecto_id`),
  CONSTRAINT `fk_serv_actividad` FOREIGN KEY (`actividad_id`) REFERENCES `actividades` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_serv_proveedor` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`),
  CONSTRAINT `fk_serv_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `solicitudes_herramientas`
--

DROP TABLE IF EXISTS `solicitudes_herramientas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `solicitudes_herramientas` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `codigo` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `herramienta_id` bigint NOT NULL,
  `proyecto_id` bigint NOT NULL,
  `solicitado_por_usuario_id` bigint NOT NULL,
  `para_trabajador_id` bigint NOT NULL,
  `fecha_solicitud` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_requerida` date NOT NULL,
  `estado` enum('PENDIENTE','APROBADA','RECHAZADA','ENTREGADA','CANCELADA') COLLATE utf8mb4_unicode_ci DEFAULT 'PENDIENTE',
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_baja` datetime DEFAULT NULL,
  `baja_por_usuario_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `fk_solherr_herramienta` (`herramienta_id`),
  KEY `fk_solherr_proyecto` (`proyecto_id`),
  KEY `fk_solherr_usuario_solicita` (`solicitado_por_usuario_id`),
  KEY `fk_solherr_trabajador_para` (`para_trabajador_id`),
  CONSTRAINT `fk_solherr_herramienta` FOREIGN KEY (`herramienta_id`) REFERENCES `herramientas` (`id`),
  CONSTRAINT `fk_solherr_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`),
  CONSTRAINT `fk_solherr_trabajador_para` FOREIGN KEY (`para_trabajador_id`) REFERENCES `trabajadores` (`id`),
  CONSTRAINT `fk_solherr_usuario_solicita` FOREIGN KEY (`solicitado_por_usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `solicitudes_materiales`
--

DROP TABLE IF EXISTS `solicitudes_materiales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `solicitudes_materiales` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `codigo` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `proyecto_id` bigint NOT NULL,
  `actividad_id` bigint DEFAULT NULL,
  `solicitado_por_usuario_id` bigint NOT NULL,
  `fecha_solicitud` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_requerida` date DEFAULT NULL,
  `estado` enum('PENDIENTE','APROBADA','RECHAZADA','DESPACHADA_PARCIAL','DESPACHADA_TOTAL','CANCELADA') COLLATE utf8mb4_unicode_ci DEFAULT 'PENDIENTE',
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_baja` datetime DEFAULT NULL,
  `baja_por_usuario_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `fk_sol_proyecto` (`proyecto_id`),
  KEY `fk_sol_actividad` (`actividad_id`),
  KEY `fk_sol_usuario` (`solicitado_por_usuario_id`),
  CONSTRAINT `fk_sol_actividad` FOREIGN KEY (`actividad_id`) REFERENCES `actividades` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sol_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`),
  CONSTRAINT `fk_sol_usuario` FOREIGN KEY (`solicitado_por_usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `trabajadores`
--

DROP TABLE IF EXISTS `trabajadores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trabajadores` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `numero_documento` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_documento` enum('CC','CE','NIT','PASAPORTE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombres` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellidos` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direccion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cargo` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `especialidad` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `disponible` tinyint(1) DEFAULT '1',
  `estado` enum('ACTIVO','INACTIVO','VACACIONES','LICENCIA') COLLATE utf8mb4_unicode_ci DEFAULT 'ACTIVO',
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_baja` datetime DEFAULT NULL,
  `baja_por_usuario_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `numero_documento` (`numero_documento`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `traslados_materiales`
--

DROP TABLE IF EXISTS `traslados_materiales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `traslados_materiales` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `almacen_origen_id` bigint NOT NULL,
  `almacen_destino_id` bigint NOT NULL,
  `material_id` bigint NOT NULL,
  `cantidad` decimal(12,2) NOT NULL,
  `responsable_usuario_id` bigint NOT NULL,
  `fecha_traslado` datetime DEFAULT CURRENT_TIMESTAMP,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `fk_tras_origen` (`almacen_origen_id`),
  KEY `fk_tras_destino` (`almacen_destino_id`),
  KEY `fk_tras_material` (`material_id`),
  KEY `fk_tras_usuario` (`responsable_usuario_id`),
  CONSTRAINT `fk_tras_destino` FOREIGN KEY (`almacen_destino_id`) REFERENCES `almacenes` (`id`),
  CONSTRAINT `fk_tras_material` FOREIGN KEY (`material_id`) REFERENCES `materiales` (`id`),
  CONSTRAINT `fk_tras_origen` FOREIGN KEY (`almacen_origen_id`) REFERENCES `almacenes` (`id`),
  CONSTRAINT `fk_tras_usuario` FOREIGN KEY (`responsable_usuario_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `chk_tras_cantidad` CHECK ((`cantidad` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `trabajador_id` bigint DEFAULT NULL,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rol_id` bigint NOT NULL,
  `estado` enum('ACTIVO','INACTIVO','BLOQUEADO') COLLATE utf8mb4_unicode_ci DEFAULT 'ACTIVO',
  `ultimo_acceso` datetime DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_baja` datetime DEFAULT NULL,
  `baja_por_usuario_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `trabajador_id` (`trabajador_id`),
  KEY `fk_usuario_rol` (`rol_id`),
  CONSTRAINT `fk_usuario_rol` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`),
  CONSTRAINT `fk_usuario_trabajador` FOREIGN KEY (`trabajador_id`) REFERENCES `trabajadores` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping events for database 'sincoco'
--

--
-- Dumping routines for database 'sincoco'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-11 22:52:31
